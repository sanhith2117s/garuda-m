from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone

from db.database import get_db
from db.models import User, MentorAssignment, Student, LeaveRequest, LeaveStatus, Section, Department
from api.deps import (
    RoleChecker, get_mentor_student_ids, log_audit_event,
)

router = APIRouter()


class MentorAssignmentCreate(BaseModel):
    mentor_id: int
    department_id: Optional[int] = None
    section_id: Optional[int] = None
    student_id: Optional[int] = None


class MentorPassRequestCreate(BaseModel):
    student_id: int
    reason: str
    notes: Optional[str] = None
    is_emergency: Optional[bool] = False
    emergency_reason: Optional[str] = None


@router.get("/assignments")
async def list_mentor_assignments(
    college_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(["super_admin", "admin"]))
):
    user_role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    query = select(MentorAssignment)
    effective_college = college_id if user_role_str == "super_admin" else current_user.college_id

    if effective_college:
        query = query.where(MentorAssignment.college_id == effective_college)

    res = await db.execute(query)
    assignments = res.scalars().all()

    result = []
    for a in assignments:
        mentor_user = await db.get(User, a.mentor_id)
        dept = await db.get(Department, a.department_id) if a.department_id else None
        sec = await db.get(Section, a.section_id) if a.section_id else None
        stud = await db.get(Student, a.student_id) if a.student_id else None

        result.append({
            "id": a.id,
            "mentor_id": a.mentor_id,
            "mentor_name": mentor_user.full_name if mentor_user else "N/A",
            "mentor_username": mentor_user.username if mentor_user else "N/A",
            "department_id": a.department_id,
            "department_name": dept.name if dept else None,
            "section_id": a.section_id,
            "section_name": sec.name if sec else None,
            "student_id": a.student_id,
            "student_name": stud.full_name if stud else None,
            "student_roll": stud.roll_number if stud else None,
            "created_at": a.created_at.isoformat() if a.created_at else None
        })

    return result


@router.post("/assignments")
@router.post("/faculty-allotments")
async def create_mentor_assignment(
    body: MentorAssignmentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(["super_admin", "admin"]))
):
    mentor = await db.get(User, body.mentor_id)
    if not mentor or (hasattr(mentor.role, "value") and mentor.role.value != "mentor" and str(mentor.role) != "mentor"):
        raise HTTPException(status_code=400, detail="Target user must be an active Mentor user.")

    assignment = MentorAssignment(
        mentor_id=body.mentor_id,
        college_id=mentor.college_id or current_user.college_id,
        department_id=body.department_id,
        section_id=body.section_id,
        student_id=body.student_id
    )
    db.add(assignment)
    await db.commit()
    await db.refresh(assignment)

    await log_audit_event(
        db, current_user, "CREATE_MENTOR_ASSIGNMENT", "MentorAssignment", assignment.id,
        f"Assigned Mentor {mentor.username} to Section/Student Scope"
    )

    return {"message": "Mentor assignment created successfully.", "id": assignment.id}


@router.delete("/assignments/{assignment_id}")
async def delete_mentor_assignment(
    assignment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(["super_admin", "admin"]))
):
    assignment = await db.get(MentorAssignment, assignment_id)
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    await db.delete(assignment)
    await db.commit()

    await log_audit_event(
        db, current_user, "DELETE_MENTOR_ASSIGNMENT", "MentorAssignment", assignment_id,
        f"Removed mentor assignment ID {assignment_id}"
    )

    return {"message": "Assignment deleted successfully."}


@router.get("/students")
async def get_mentor_assigned_students(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(["mentor"]))
):
    student_ids = await get_mentor_student_ids(current_user, db)
    if not student_ids:
        return []

    res = await db.execute(select(Student).where(Student.id.in_(student_ids)))
    students = res.scalars().all()

    return [
        {
            "id": s.id,
            "full_name": s.full_name,
            "roll_number": s.roll_number,
            "admn_no": s.admn_no or "",
            "branch": s.branch or "",
            "section": s.section or "",
            "semester": s.semester or 1,
            "status": s.status or "active",
            "photo_url": f"/api/static/photos/{s.roll_number}.jpg"
        }
        for s in students
    ]


@router.post("/requests")
async def raise_mentor_pass_request(
    body: MentorPassRequestCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(["mentor"]))
):
    """
    Mentor raises a pass request to Admin (e.g. when HOD is unavailable or for emergency exceptions).
    """
    student_ids = await get_mentor_student_ids(current_user, db)
    if body.student_id not in student_ids:
        raise HTTPException(status_code=403, detail="Student is outside your assigned mentor scope.")

    student = await db.get(Student, body.student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    leave_req = LeaveRequest(
        college_id=student.college_id,
        student_id=student.id,
        reason=body.reason,
        notes=f"Raised by Mentor {current_user.full_name} ({current_user.username}). {body.notes or ''}".strip(),
        status=LeaveStatus.pending,
        semester=student.semester or 1,
        requested_at=datetime.now(timezone.utc),
        gate_activated=False,
        is_emergency=body.is_emergency or False,
        emergency_reason=body.emergency_reason
    )
    db.add(leave_req)
    await db.commit()
    await db.refresh(leave_req)

    await log_audit_event(
        db, current_user, "MENTOR_RAISE_PASS_REQUEST", "LeaveRequest", leave_req.id,
        f"Raised pass request for student {student.roll_number} (Emergency: {body.is_emergency})"
    )

    return {
        "message": "Pass request raised successfully for Admin review.",
        "request_id": leave_req.id
    }
