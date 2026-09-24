"""
Custom Pass API
===============
Allows admins to:
  - Create named pass types with in/out timings (Namaz Pass, Club Pass, etc.)
  - Assign a pass type to specific students (with optional date range)
  - Revoke individual assignments
  - Delete a pass type entirely (soft-delete: marks is_active=False)
  - List all types and all assignments (filterable by roll number)
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import update, func
from sqlalchemy.orm import selectinload
from typing import Optional
from datetime import date, datetime, timezone, timedelta
from pydantic import BaseModel

from db.database import get_db
from db.models import CustomPassType, CustomPassAssignment, Student, User, CustomPassScan, College
from api.auth import get_current_user

router = APIRouter()


from api.deps import RoleChecker, get_current_user

# ── Auth helper ───────────────────────────────────────────────────────────────

async def require_admin(current_user: User = Depends(get_current_user)):
    user_role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    if user_role_str not in ("super_admin", "admin", "hod"):
        raise HTTPException(status_code=403, detail="Admin or HOD access required")
    return current_user


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class PassTypeCreate(BaseModel):
    name: str
    out_time: str          # "HH:MM"
    in_time: str           # "HH:MM"
    description: Optional[str] = None
    college_id: Optional[int] = None

class AssignPassRequest(BaseModel):
    roll_number: str
    pass_type_id: int
    out_time: Optional[str] = None      # "HH:MM" custom override
    in_time:  Optional[str] = None      # "HH:MM" custom override
    valid_from: Optional[str] = None   # "YYYY-MM-DD"
    valid_to:   Optional[str] = None   # "YYYY-MM-DD"


# ── Pass Type CRUD ────────────────────────────────────────────────────────────

@router.get("/types")
async def list_pass_types(
    college_id: Optional[int] = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Return all active custom pass types for the target college."""
    target_college_id = college_id or current_user.college_id

    query = select(CustomPassType).where(CustomPassType.is_active == True)
    if target_college_id:
        query = query.where(CustomPassType.college_id == target_college_id)

    res = await db.execute(query.order_by(CustomPassType.name))
    types = res.scalars().all()

    if not types:
        # Auto-seed default Lunch Pass with 12:30 -> 13:00 timings
        default_pt = CustomPassType(
            college_id=target_college_id or 1,
            name="Default Lunch Pass",
            out_time="12:30",
            in_time="13:00",
            description="Default lunch hours pass (12:30 PM to 1:00 PM)",
            created_by=current_user.id
        )
        db.add(default_pt)
        await db.commit()
        await db.refresh(default_pt)
        types = [default_pt]

    col_res = await db.execute(select(College))
    col_map = {c.id: c.code for c in col_res.scalars().all()}

    return [
        {
            "id": t.id,
            "college_id": t.college_id,
            "college_code": col_map.get(t.college_id) or ("KMEC" if t.college_id == 1 else "NGIT"),
            "name": t.name,
            "out_time": t.out_time,
            "in_time": t.in_time,
            "description": t.description,
            "created_at": t.created_at.isoformat() if t.created_at else None
        }
        for t in types
    ]


@router.post("/types", status_code=201)
async def create_pass_type(
    body: PassTypeCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(["super_admin", "admin", "hod"]))
):
    """Create a new custom pass type."""
    target_college_id = body.college_id or current_user.college_id or 1

    # Check for duplicate name (case-insensitive) within college
    existing = (await db.execute(
        select(CustomPassType).where(
            CustomPassType.college_id == target_college_id,
            CustomPassType.name.ilike(body.name.strip())
        )
    )).scalars().first()
    if existing and existing.is_active:
        raise HTTPException(status_code=400, detail=f"Pass type '{body.name}' already exists")

    # Reactivate if previously soft-deleted
    if existing and not existing.is_active:
        existing.is_active = True
        existing.out_time = body.out_time
        existing.in_time = body.in_time
        existing.description = body.description
        await db.commit()
        return {"message": f"Pass type '{body.name}' restored", "id": existing.id}

    pt = CustomPassType(
        college_id=target_college_id,
        name=body.name.strip(),
        out_time=body.out_time,
        in_time=body.in_time,
        description=body.description,
        created_by=current_user.id,
    )
    db.add(pt)
    await db.commit()
    await db.refresh(pt)
    return {"message": f"Pass type '{pt.name}' created", "id": pt.id}


@router.delete("/types/{type_id}")
async def delete_pass_type(
    type_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """
    Soft-delete a pass type.
    All active assignments for this type are also deactivated.
    """
    pt = (await db.execute(
        select(CustomPassType).where(CustomPassType.id == type_id)
    )).scalars().first()
    if not pt:
        raise HTTPException(status_code=404, detail="Pass type not found")

    # Deactivate all assignments
    assignments = (await db.execute(
        select(CustomPassAssignment).where(
            CustomPassAssignment.pass_type_id == type_id,
            CustomPassAssignment.is_active == True
        )
    )).scalars().all()
    for a in assignments:
        a.is_active = False

    pt.is_active = False
    await db.commit()
    return {"message": f"Pass type '{pt.name}' deleted. {len(assignments)} assignment(s) revoked."}


# ── Assignments ───────────────────────────────────────────────────────────────

@router.get("/assignments")
async def list_assignments(
    college_id: Optional[int] = Query(default=None),
    roll_number: Optional[str] = None,
    pass_type_id: Optional[int] = None,
    active_only: bool = Query(default=True),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """List all assignments, filtered by college."""
    user_role_str = admin.role.value if hasattr(admin.role, "value") else str(admin.role)
    target_college_id = college_id if user_role_str == "super_admin" else (college_id or admin.college_id)

    # Dynamic auto-deactivation of expired assignments based on IST date
    today = datetime.now(timezone(timedelta(hours=5, minutes=30))).date()
    await db.execute(
        update(CustomPassAssignment)
        .where(
            CustomPassAssignment.is_active == True,
            CustomPassAssignment.valid_to != None,
            CustomPassAssignment.valid_to < today
        )
        .values(is_active=False)
    )
    await db.commit()

    stmt = (
        select(CustomPassAssignment, Student, CustomPassType)
        .join(Student, Student.id == CustomPassAssignment.student_id)
        .join(CustomPassType, CustomPassType.id == CustomPassAssignment.pass_type_id)
    )
    if target_college_id:
        stmt = stmt.where(Student.college_id == target_college_id)
    if active_only:
        stmt = stmt.where(CustomPassAssignment.is_active == True)
    if roll_number:
        stmt = stmt.where(Student.roll_number.ilike(f"%{roll_number}%"))
    if pass_type_id:
        stmt = stmt.where(CustomPassAssignment.pass_type_id == pass_type_id)

    stmt = stmt.order_by(CustomPassAssignment.assigned_at.desc())
    res = await db.execute(stmt)
    out = []
    col_res = await db.execute(select(College))
    col_map = {c.id: c.code for c in col_res.scalars().all()}
    for assignment, student, pt in res.all():
        out.append({
            "id": assignment.id,
            "student_name": student.full_name,
            "roll_number": student.roll_number,
            "college_id": student.college_id,
            "college_code": col_map.get(student.college_id) or ("KMEC" if student.college_id == 1 else "NGIT"),
            "branch": student.branch,
            "section": student.section,
            "semester": student.semester,
            "pass_type_id": pt.id,
            "pass_name": pt.name,
            "out_time": assignment.out_time or pt.out_time,
            "in_time": assignment.in_time or pt.in_time,
            "valid_from": str(assignment.valid_from) if assignment.valid_from else None,
            "valid_to": str(assignment.valid_to) if assignment.valid_to else None,
            "assigned_at": assignment.assigned_at,
        })
    return out


@router.post("/assignments", status_code=201)
async def assign_pass(
    body: AssignPassRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Assign a custom pass type to a student."""
    # Resolve student
    student = (await db.execute(
        select(Student).where(Student.roll_number.ilike(body.roll_number.strip()))
    )).scalars().first()
    if not student:
        raise HTTPException(status_code=404, detail=f"Student '{body.roll_number}' not found")

    # Verify pass type exists
    pt = (await db.execute(
        select(CustomPassType).where(
            CustomPassType.id == body.pass_type_id,
            CustomPassType.is_active == True
        )
    )).scalars().first()
    if not pt:
        raise HTTPException(status_code=404, detail="Pass type not found or inactive")

    # Dynamic auto-deactivation of expired assignments based on IST date
    today = datetime.now(timezone(timedelta(hours=5, minutes=30))).date()
    await db.execute(
        update(CustomPassAssignment)
        .where(
            CustomPassAssignment.is_active == True,
            CustomPassAssignment.valid_to != None,
            CustomPassAssignment.valid_to < today
        )
        .values(is_active=False)
    )
    await db.commit()

    # Determine default dates (1 day validity by default: valid_from = today, valid_to = today)
    v_from = date.fromisoformat(body.valid_from) if body.valid_from else today
    v_to = date.fromisoformat(body.valid_to) if body.valid_to else v_from

    final_out = body.out_time.strip() if body.out_time and body.out_time.strip() else pt.out_time
    final_in = body.in_time.strip() if body.in_time and body.in_time.strip() else pt.in_time

    # Check for duplicate assignment (active or inactive)
    existing = (await db.execute(
        select(CustomPassAssignment).where(
            CustomPassAssignment.student_id == student.id,
            CustomPassAssignment.pass_type_id == body.pass_type_id,
        )
    )).scalars().first()

    if existing:
        if existing.is_active:
            raise HTTPException(
                status_code=400,
                detail=f"Student already has an active '{pt.name}'"
            )
        else:
            # Reactivate and update existing assignment
            existing.is_active = True
            existing.assigned_by = admin.id
            existing.assigned_at = func.now()
            existing.out_time = final_out
            existing.in_time = final_in
            existing.valid_from = v_from
            existing.valid_to = v_to
            await db.commit()
            return {"message": f"'{pt.name}' assigned to {student.full_name}"}

    assignment = CustomPassAssignment(
        student_id=student.id,
        pass_type_id=body.pass_type_id,
        assigned_by=admin.id,
        out_time=final_out,
        in_time=final_in,
        valid_from=v_from,
        valid_to=v_to,
    )
    db.add(assignment)

    # Sync with LeaveRequest so pass immediately reflects under Active Passes and Gate Scanners
    from db.models import LeaveRequest, LeaveStatus
    existing_lr = (await db.execute(
        select(LeaveRequest).where(
            LeaveRequest.student_id == student.id,
            LeaveRequest.reason == pt.name,
            LeaveRequest.gate_activated == True
        )
    )).scalars().first()

    if not existing_lr:
        lr = LeaveRequest(
            student_id=student.id,
            college_id=student.college_id,
            reason=pt.name,
            remarks=f"Custom Pass: {pt.name} ({final_out} - {final_in})",
            status=LeaveStatus.approved,
            approved_by=admin.id,
            approved_at=func.now(),
            gate_activated=True
        )
        db.add(lr)

    await db.commit()
    return {"message": f"'{pt.name}' assigned to {student.full_name}"}


@router.delete("/assignments/{assignment_id}")
async def revoke_assignment(
    assignment_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Revoke a specific pass assignment."""
    a = (await db.execute(
        select(CustomPassAssignment).where(CustomPassAssignment.id == assignment_id)
    )).scalars().first()
    if not a:
        raise HTTPException(status_code=404, detail="Assignment not found")

    a.is_active = False

    # Deactivate corresponding LeaveRequest
    pt = await db.get(CustomPassType, a.pass_type_id)
    if pt:
        from db.models import LeaveRequest
        lrs = (await db.execute(
            select(LeaveRequest).where(
                LeaveRequest.student_id == a.student_id,
                LeaveRequest.reason == pt.name,
                LeaveRequest.gate_activated == True
            )
        )).scalars().all()
        for lr in lrs:
            lr.gate_activated = False

    await db.commit()
    return {"message": "Pass assignment revoked"}


@router.get("/monitoring")
async def get_custom_pass_monitoring(
    date_from: Optional[str] = Query(default=None),
    date_to: Optional[str] = Query(default=None),
    pass_type_id: Optional[int] = Query(default=None),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """
    Get custom pass scanning logs for a date range.
    Groups scan data to display who is currently out, returned, returned late, or failed to return.
    """
    IST = timezone(timedelta(hours=5, minutes=30))
    now_ist = datetime.now(IST)
    
    start_time = None
    end_time = None

    if date_from:
        try:
            dt_from = datetime.strptime(date_from, "%Y-%m-%d")
            start_time = datetime.combine(dt_from.date(), datetime.min.time()).replace(tzinfo=IST)
        except ValueError:
            pass

    if date_to:
        try:
            dt_to = datetime.strptime(date_to, "%Y-%m-%d")
            end_time = datetime.combine(dt_to.date(), datetime.max.time()).replace(tzinfo=IST)
        except ValueError:
            pass
    elif start_time:
        end_time = datetime.combine(start_time.date(), datetime.max.time()).replace(tzinfo=IST)

    if not start_time:
        start_time = now_ist.replace(hour=0, minute=0, second=0, microsecond=0)
    
    if not end_time:
        end_time = now_ist.replace(hour=23, minute=59, second=59, microsecond=59)

    # Fetch all scans in range
    stmt = (
        select(CustomPassScan)
        .where(CustomPassScan.scanned_at >= start_time, CustomPassScan.scanned_at <= end_time)
        .options(
            selectinload(CustomPassScan.student),
            selectinload(CustomPassScan.assignment).selectinload(CustomPassAssignment.pass_type)
        )
    )
    if pass_type_id:
        stmt = stmt.join(CustomPassAssignment, CustomPassAssignment.id == CustomPassScan.custom_pass_assignment_id)
        stmt = stmt.where(CustomPassAssignment.pass_type_id == pass_type_id)
        
    stmt = stmt.order_by(CustomPassScan.scanned_at.asc())
    
    result = await db.execute(stmt)
    scans = result.scalars().all()

    student_pass_data = {}
    for scan in scans:
        student = scan.student
        assignment = scan.assignment
        pass_type = assignment.pass_type if assignment else None
        if not student or not pass_type:
            continue
            
        # Group by student_id, pass_type_id, and IST date of scanned_at
        scan_date_str = scan.scanned_at.astimezone(IST).strftime("%Y-%m-%d")
        key = (student.id, pass_type.id, scan_date_str)
        
        if key not in student_pass_data:
            student_pass_data[key] = {
                "student_name": student.full_name,
                "roll_number": student.roll_number,
                "branch": student.branch,
                "section": student.section,
                "semester": student.semester,
                "pass_name": pass_type.name,
                "pass_type_id": pass_type.id,
                "date": scan_date_str,
                "out_time": None,
                "in_time": None,
                "window_out": pass_type.out_time,
                "window_in": pass_type.in_time,
                "status": "Awaiting Out"
            }
            
        data = student_pass_data[key]
        if scan.scan_type == "out":
            data["out_time"] = scan.scanned_at.astimezone(IST).isoformat()
        elif scan.scan_type == "in":
            data["in_time"] = scan.scanned_at.astimezone(IST).isoformat()

    # Determine status
    today_str = now_ist.strftime("%Y-%m-%d")
    now_time_str = now_ist.strftime("%H:%M")
    
    for key, data in student_pass_data.items():
        out_time = data["out_time"]
        in_time = data["in_time"]
        window_in = data["window_in"]
        scan_date_str = data["date"]
        
        if out_time and not in_time:
            # Check if expired (either past date, or today and past the return window)
            is_today = (scan_date_str == today_str)
            if not is_today or now_time_str > window_in:
                data["status"] = "Not Returned"
            else:
                data["status"] = "Out"
        elif out_time and in_time:
            # Scanned in - check if returned late
            in_dt = datetime.fromisoformat(in_time).astimezone(IST)
            in_time_str = in_dt.strftime("%H:%M")
            if in_time_str > window_in:
                data["status"] = "Returned Late"
            else:
                data["status"] = "Returned"
        elif in_time and not out_time:
            data["status"] = "Returned"
            
    return list(student_pass_data.values())


@router.get("/scan-history")
async def get_scan_history(
    roll_number: Optional[str] = Query(default=None),
    pass_type_id: Optional[int] = Query(default=None),
    date_from: Optional[str] = Query(default=None),
    date_to: Optional[str] = Query(default=None),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Return list of all custom pass scans, filterable."""
    IST = timezone(timedelta(hours=5, minutes=30))
    stmt = (
        select(CustomPassScan, Student, CustomPassType)
        .join(Student, Student.id == CustomPassScan.student_id)
        .join(CustomPassAssignment, CustomPassAssignment.id == CustomPassScan.custom_pass_assignment_id)
        .join(CustomPassType, CustomPassType.id == CustomPassAssignment.pass_type_id)
    )
    if roll_number:
        stmt = stmt.where(Student.roll_number.ilike(f"%{roll_number}%"))
    if pass_type_id:
        stmt = stmt.where(CustomPassAssignment.pass_type_id == pass_type_id)
        
    if date_from:
        try:
            dt_from = datetime.strptime(date_from, "%Y-%m-%d")
            start_time = datetime.combine(dt_from.date(), datetime.min.time()).replace(tzinfo=IST)
            stmt = stmt.where(CustomPassScan.scanned_at >= start_time)
        except ValueError:
            pass
            
    if date_to:
        try:
            dt_to = datetime.strptime(date_to, "%Y-%m-%d")
            end_time = datetime.combine(dt_to.date(), datetime.max.time()).replace(tzinfo=IST)
            stmt = stmt.where(CustomPassScan.scanned_at <= end_time)
        except ValueError:
            pass

    stmt = stmt.order_by(CustomPassScan.scanned_at.desc())
    res = await db.execute(stmt)
    out = []
    for scan, student, pt in res.all():
        out.append({
            "id": scan.id,
            "student_name": student.full_name,
            "roll_number": student.roll_number,
            "branch": student.branch,
            "section": student.section,
            "semester": student.semester,
            "pass_name": pt.name,
            "scan_type": scan.scan_type,
            "scanned_at": scan.scanned_at.astimezone(IST).isoformat(),
        })
    return out
