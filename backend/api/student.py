from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select, or_
from db.database import get_db
from db.models import User, Student, LeaveRequest, LeaveStatus, LateComer, Semester, CustomPassAssignment, CustomPassType
from schemas.leave import LeaveRequestCreate, LeaveRequestResponse
from api.deps import RoleChecker
from datetime import date, datetime, timedelta, time

import asyncio
from collections import defaultdict

_student_locks = defaultdict(asyncio.Lock)

router = APIRouter()

@router.post("/leave", response_model=LeaveRequestResponse)
async def request_leave(
    leave_in: LeaveRequestCreate, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(["student"]))
):
    result = await db.execute(
        select(Student).where(
            (Student.user_id == current_user.id) |
            (func.lower(Student.roll_number) == current_user.username.lower())
        )
    )
    student = result.scalars().first()
    
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    async with _student_locks[student.id]:
        # Custom cycle: Reset at 16:30 IST (4:30 PM)
        from datetime import timezone as tz, timedelta
        IST = tz(timedelta(hours=5, minutes=30))
        now_ist = datetime.now(IST)
        
        if now_ist.time() < time(16, 30):
            # Current cycle started 16:30 IST yesterday
            cycle_start = datetime.combine(now_ist.date() - timedelta(days=1), time(16, 30)).replace(tzinfo=IST)
        else:
            # Current cycle started 16:30 IST today
            cycle_start = datetime.combine(now_ist.date(), time(16, 30)).replace(tzinfo=IST)

        cycle_start_utc = cycle_start.astimezone(tz.utc)

        existing_cycle = await db.execute(
            select(LeaveRequest).where(
                LeaveRequest.student_id == student.id,
                or_(
                    LeaveRequest.requested_at >= cycle_start,
                    LeaveRequest.requested_at >= cycle_start_utc
                )
            )
        )
        if existing_cycle.scalars().first():
            raise HTTPException(status_code=400, detail="You have already submitted a request in this cycle. Next application window opens at 4:30 PM.")

        new_request = LeaveRequest(
            college_id=student.college_id,
            student_id=student.id,
            reason=leave_in.reason,
            notes=leave_in.notes,
            semester=student.semester,
            requested_at=now_ist
        )
        db.add(new_request)
        await db.commit()
        await db.refresh(new_request)
        
        return new_request

@router.get("/dashboard")
async def student_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(["student"]))
):
    result = await db.execute(
        select(Student).where(
            (Student.user_id == current_user.id) |
            (func.lower(Student.roll_number) == current_user.username.lower())
        )
    )
    student = result.scalars().first()
    
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    
    # Calculate Stats
    # 1. Active Pass (Approved and Gate Activated)
    active_res = await db.execute(
        select(func.count(LeaveRequest.id)).where(
            LeaveRequest.student_id == student.id,
            LeaveRequest.status == LeaveStatus.approved,
            LeaveRequest.gate_activated == True
        )
    )
    active_count = active_res.scalar() or 0
    
    # 2. Pending Requests
    pending_res = await db.execute(
        select(func.count(LeaveRequest.id)).where(
            LeaveRequest.student_id == student.id,
            LeaveRequest.status == LeaveStatus.pending
        )
    )
    pending_count = pending_res.scalar() or 0
    
    # 3. Late Entries (Current Active Semester)
    late_count = 0
    sem_res = await db.execute(
        select(Semester).where(Semester.semester_number == student.semester, Semester.is_active == True)
    )
    active_sem = sem_res.scalars().first()
    if active_sem:
        lc_res = await db.execute(
            select(func.count(LateComer.id)).where(
                LateComer.student_id == student.id,
                LateComer.semester_id == active_sem.id
            )
        )
        late_count = lc_res.scalar() or 0
        
        lc_list = await db.execute(
            select(LateComer).where(
                LateComer.student_id == student.id,
                LateComer.semester_id == active_sem.id
            ).order_by(LateComer.scanned_at.desc())
        )
        late_history = lc_list.scalars().all()
    else:
        late_history = []

    # Fetch Active Custom Pass Assignments
    today = date.today()
    cp_stmt = (
        select(CustomPassAssignment, CustomPassType)
        .join(CustomPassType, CustomPassType.id == CustomPassAssignment.pass_type_id)
        .where(
            CustomPassAssignment.student_id == student.id,
            CustomPassAssignment.is_active == True,
            or_(
                CustomPassAssignment.valid_to == None,
                CustomPassAssignment.valid_to >= today
            )
        )
    )
    cp_res = await db.execute(cp_stmt)
    custom_passes = cp_res.all()

    requests_result = await db.execute(
        select(LeaveRequest)
        .where(
            LeaveRequest.student_id == student.id,
            LeaveRequest.semester == student.semester
        )
        .order_by(LeaveRequest.requested_at.desc())
        .limit(10)
    )
    history = requests_result.scalars().all()

    # Find today's request for UI blocking (based on 16:30 IST cycle)
    from datetime import timezone as tz
    IST = tz(timedelta(hours=5, minutes=30))
    now_ist = datetime.now(IST)
    
    if now_ist.time() < time(16, 30):
        cycle_start = datetime.combine(now_ist.date() - timedelta(days=1), time(16, 30)).replace(tzinfo=IST)
    else:
        cycle_start = datetime.combine(now_ist.date(), time(16, 30)).replace(tzinfo=IST)

    def _is_in_cycle(r: LeaveRequest) -> bool:
        if not r.requested_at:
            return False
        r_dt = r.requested_at if r.requested_at.tzinfo else r.requested_at.replace(tzinfo=IST)
        return r_dt >= cycle_start

    today_req = next((r for r in history if _is_in_cycle(r)), None)

    def enrich_leave(r: LeaveRequest) -> dict:
        return {
            "id": r.id,
            "reason": r.reason,
            "notes": r.notes,
            "status": r.status.value,
            "gate_activated": r.gate_activated,
            "requested_at": r.requested_at,
            "hod_absent": False,
            "remarks": r.remarks,
        }

    return {
        "profile": {
            "full_name": student.full_name, 
            "roll_number": student.roll_number, 
            "semester": student.semester,
            "photo_url": f"/api/static/photos/{student.roll_number}.jpg"
        },
        "stats": {
            "active_passes": active_count,
            "pending_requests": pending_count,
            "late_entries": late_count
        },
        "today_request": {
            "id": today_req.id,
            "status": today_req.status.value,
            "reason": today_req.reason,
            "notes": today_req.notes,
            "requested_at": today_req.requested_at,
            "remarks": today_req.remarks,
            "hod_absent": False
        } if today_req else None,
        "late_history": [
            {
                "id": lc.id,
                "scanned_at": lc.scanned_at
            }
            for lc in late_history
        ],
        "custom_passes": [
            {
                "id": assignment.id,
                "pass_type_name": pass_type.name,
                "out_time": pass_type.out_time,
                "in_time": pass_type.in_time,
                "valid_from": assignment.valid_from.isoformat() if assignment.valid_from else None,
                "valid_to": assignment.valid_to.isoformat() if assignment.valid_to else None
            }
            for assignment, pass_type in custom_passes
        ],
        "history": [enrich_leave(r) for r in history]
    }
