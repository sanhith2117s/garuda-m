from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone, timedelta

from db.database import get_db
from db.models import User, Student, Semester, LeaveRequest, LeaveStatus, LateComer
from api.deps import (
    RoleChecker, log_audit_event,
    apply_student_role_scope, role_str, mentor_hod_absence_status, assert_student_in_role_scope,
)

router = APIRouter()


class HODAbsencePayload(BaseModel):
    is_unavailable: bool
    unavailable_reason: Optional[str] = None
    absence_start: Optional[str] = None  # ISO format string
    absence_end: Optional[str] = None    # ISO format string


class HODPassDecision(BaseModel):
    decision: str  # "approve" or "reject"
    remarks: Optional[str] = None
    is_emergency_pass: Optional[bool] = False
    emergency_reason: Optional[str] = None


class HODLateExceptionDecision(BaseModel):
    decision: str  # "approve" or "reject"
    reason: Optional[str] = None


@router.get("/absence")
async def get_hod_absence_status(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(["hod", "mentor", "admin", "super_admin"]))
):
    if role_str(current_user) == "mentor":
        return await mentor_hod_absence_status(current_user, db)
    return {
        "is_unavailable": current_user.is_unavailable,
        "unavailable_reason": current_user.unavailable_reason or "",
        "absence_start": current_user.absence_start.isoformat() if current_user.absence_start else None,
        "absence_end": current_user.absence_end.isoformat() if current_user.absence_end else None
    }


@router.post("/absence")
async def update_hod_absence_status(
    body: HODAbsencePayload,
    target_user_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(["hod", "admin", "super_admin"]))
):
    user_role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    target_user = current_user

    if target_user_id and user_role_str in ("super_admin", "admin"):
        target_user = await db.get(User, target_user_id)
        if not target_user:
            raise HTTPException(status_code=404, detail="Target user not found")

    target_user.is_unavailable = body.is_unavailable
    target_user.unavailable_reason = body.unavailable_reason if body.is_unavailable else None

    if body.absence_start:
        try:
            target_user.absence_start = datetime.fromisoformat(body.absence_start.replace("Z", "+00:00"))
        except Exception:
            pass
    else:
        target_user.absence_start = None

    if body.absence_end:
        try:
            target_user.absence_end = datetime.fromisoformat(body.absence_end.replace("Z", "+00:00"))
        except Exception:
            pass
    else:
        target_user.absence_end = None

    await db.commit()

    await log_audit_event(
        db, current_user, "UPDATE_HOD_ABSENCE", "User", target_user.id,
        f"Set HOD absence: unavailable={body.is_unavailable}, reason={body.unavailable_reason}"
    )

    return {"message": "HOD availability status updated successfully."}


@router.get("/scan-lookup")
async def hod_scan_lookup(
    q: str = Query(..., min_length=2),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(["hod", "admin", "super_admin"]))
):
    """
    Lookup student by Roll No or Admission No for HOD Mobile Scanner view.
    Renders photo, stats, pass limits, late entries, and active/pending request.
    """
    q_clean = q.strip().lower()

    query = select(Student).options(
        selectinload(Student.department),
        selectinload(Student.section_rel)
    ).where(
        (func.lower(Student.roll_number) == q_clean) |
        (func.lower(Student.admn_no) == q_clean) |
        (Student.roll_number.ilike(f"%{q_clean}%")) |
        (Student.admn_no.ilike(f"%{q_clean}%"))
    )
    query = await apply_student_role_scope(query, current_user, db)

    res = await db.execute(query)
    student = res.scalars().first()

    if not student:
        raise HTTPException(status_code=404, detail="Student not found within authorized department scope.")

    # Fetch active semester config
    sem_res = await db.execute(
        select(Semester).where(Semester.college_id == student.college_id, Semester.is_active == True)
    )
    active_sem = sem_res.scalars().first()
    max_normal_passes = active_sem.max_normal_passes if active_sem else 5
    max_late_entries = (active_sem.late_comer_limit if (active_sem and active_sem.late_comer_limit) else (active_sem.max_late_entries if active_sem else 3))

    # Calculate pass count in active semester
    passes_count_res = await db.execute(
        select(func.count(LeaveRequest.id)).where(
            LeaveRequest.student_id == student.id,
            LeaveRequest.semester == student.semester,
            LeaveRequest.status.in_([LeaveStatus.approved, LeaveStatus.exited, LeaveStatus.returned]),
            LeaveRequest.is_emergency == False
        )
    )
    used_normal_passes = passes_count_res.scalar() or 0

    emergency_passes_res = await db.execute(
        select(func.count(LeaveRequest.id)).where(
            LeaveRequest.student_id == student.id,
            LeaveRequest.semester == student.semester,
            LeaveRequest.status.in_([LeaveStatus.approved, LeaveStatus.exited, LeaveStatus.returned]),
            LeaveRequest.is_emergency == True
        )
    )
    used_emergency_passes = emergency_passes_res.scalar() or 0

    # Calculate late entries count
    late_res = await db.execute(
        select(func.count(LateComer.id)).where(
            LateComer.student_id == student.id,
            LateComer.semester_id == (active_sem.id if active_sem else 1)
        )
    )
    late_count = late_res.scalar() or 0

    # Fetch pending or active leave request
    req_res = await db.execute(
        select(LeaveRequest).where(
            LeaveRequest.student_id == student.id,
            LeaveRequest.status.in_([LeaveStatus.pending, LeaveStatus.approved])
        ).order_by(LeaveRequest.approved_at.desc())
    )
    current_request = req_res.scalars().first()

    req_data = None
    if current_request:
        req_data = {
            "id": current_request.id,
            "reason": current_request.reason,
            "notes": current_request.notes or "",
            "status": current_request.status.value,
            "gate_activated": current_request.gate_activated,
            "is_emergency": current_request.is_emergency,
            "requested_at": current_request.requested_at.isoformat() if current_request.requested_at else None
        }

    return {
        "student": {
            "id": student.id,
            "full_name": student.full_name,
            "roll_number": student.roll_number,
            "admn_no": student.admn_no or "",
            "department_name": student.department.name if student.department else "N/A",
            "section_name": student.section or (student.section_rel.name if student.section_rel else "N/A"),
            "branch": student.branch or "",
            "semester": student.semester or 1,
            "status": student.status or "active",
            "photo_url": f"/api/static/photos/{student.roll_number}.jpg"
        },
        "pass_summary": {
            "max_normal_passes": max_normal_passes,
            "used_normal_passes": used_normal_passes,
            "used_emergency_passes": used_emergency_passes,
            "limit_reached": (used_normal_passes >= max_normal_passes)
        },
        "late_summary": {
            "max_late_entries": max_late_entries,
            "late_count": late_count,
            "limit_exceeded": (late_count >= max_late_entries)
        },
        "current_request": req_data
    }


@router.post("/passes/{request_id}/approve")
async def hod_approve_pass(
    request_id: int,
    body: HODPassDecision,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(["hod", "admin", "super_admin"]))
):
    leave_req = await db.get(LeaveRequest, request_id)
    if not leave_req:
        raise HTTPException(status_code=404, detail="Leave request not found")

    student = await db.get(Student, leave_req.student_id)
    if student:
        await assert_student_in_role_scope(current_user, student, db)

    user_role_str = role_str(current_user)
    now = datetime.now(timezone.utc)

    if body.decision == "approve":
        leave_req.status = LeaveStatus.approved
        leave_req.approved_by = current_user.id
        leave_req.approved_at = now
        leave_req.gate_activated = True
        leave_req.valid_until = now + timedelta(hours=3)
        leave_req.remarks = body.remarks or "Approved by HOD"
        if body.is_emergency_pass:
            leave_req.is_emergency = True
            leave_req.emergency_reason = body.emergency_reason or "Emergency pass exception approved by HOD"

        if user_role_str in ("admin", "super_admin") or leave_req.issued_by_role == "mentor":
            leave_req.is_fallback_approval = True
            leave_req.fallback_reason = leave_req.fallback_reason or "Approved as mentor/HOD fallback."
    else:
        leave_req.status = LeaveStatus.rejected
        leave_req.remarks = body.remarks or "Rejected by HOD"
        leave_req.gate_activated = False

    await db.commit()

    await log_audit_event(
        db, current_user, f"PASS_{body.decision.upper()}", "LeaveRequest", leave_req.id,
        f"Decision: {body.decision}, Emergency: {body.is_emergency_pass}, Fallback: {leave_req.is_fallback_approval}"
    )

    return {"message": f"Pass request {body.decision}d successfully.", "status": leave_req.status.value}
