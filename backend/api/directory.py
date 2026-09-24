from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from db.database import get_db
from db.models import Student, User
from api.deps import RoleChecker, get_current_user, apply_student_role_scope, assert_student_in_role_scope, role_str
from schemas.student import StudentUpdate, StudentResponse
from typing import Optional
import re
import csv
import io

router = APIRouter()

@router.get("")
@router.get("/")
async def list_students(
    college_id: Optional[int] = Query(default=None),
    search: Optional[str] = Query(default=""),
    semester: Optional[int] = Query(default=None),
    branch: Optional[str] = Query(default=None),
    section: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: Optional[int] = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List or search active/all students with multi-field filters & full pagination."""
    user_role_str = role_str(current_user)
    target_college_id = college_id if user_role_str == "super_admin" else current_user.college_id

    query = select(Student)
    if target_college_id:
        query = query.where(Student.college_id == target_college_id)

    query = await apply_student_role_scope(query, current_user, db)

    if status and status.strip() and status.lower() != "all":
        query = query.where(func.lower(Student.status) == status.strip().lower())
    else:
        # Default to active if status is not explicitly requested as 'all' or empty
        if not status:
            query = query.where(Student.status == "active")

    if semester:
        query = query.where(Student.semester == semester)

    if branch and branch.strip():
        query = query.where(func.lower(Student.branch) == branch.strip().lower())

    if section and section.strip():
        query = query.where(func.lower(Student.section) == section.strip().lower())

    if search and search.strip():
        q = search.strip().lower()
        query = query.where(
            (func.lower(Student.roll_number).like(f"%{q}%")) |
            (func.lower(Student.admn_no).like(f"%{q}%")) |
            (func.lower(Student.full_name).like(f"%{q}%"))
        )

    # Count total matching students
    total_res = await db.execute(select(func.count()).select_from(query.subquery()))
    total_count = total_res.scalar() or 0

    query = query.order_by(Student.roll_number.asc())
    if limit and limit > 0:
        query = query.offset((page - 1) * limit).limit(limit)

    result = await db.execute(query)
    students = result.scalars().all()
    
    items = [
        {
            "id": s.id,
            "college_id": s.college_id,
            "full_name": s.full_name,
            "roll_number": s.roll_number,
            "admn_no": s.admn_no or "",
            "semester": s.semester,
            "branch": s.branch or "",
            "section": s.section or "",
            "status": s.status or "active",
            "status_notes": s.status_notes or "",
            "photo_url": f"/api/static/photos/{s.roll_number}.jpg",
        }
        for s in students
    ]
    return {
        "items": items,
        "total": total_count,
        "page": page,
        "limit": limit or total_count,
        "pages": (total_count + (limit - 1)) // limit if limit and limit > 0 else 1
    }


@router.get("/search", response_model=StudentResponse)
async def search_student(
    q: str = Query(..., min_length=2),
    db: AsyncSession = Depends(get_db),
    _ = Depends(RoleChecker(["super_admin", "admin", "hod", "security"]))
):
    """Search for a student by exact or partial roll number or admission number."""
    q_clean = q.strip().lower()
    query = select(Student).where(
        (func.lower(Student.roll_number) == q_clean) |
        (func.lower(Student.admn_no) == q_clean) |
        (Student.roll_number.ilike(f"%{q_clean}%")) |
        (Student.admn_no.ilike(f"%{q_clean}%"))
    )
    result = await db.execute(query)
    student = result.scalars().first()
    
    if not student:
        raise HTTPException(status_code=404, detail="Student not found with the provided Roll/Admission Number.")
        
    is_graduated = (student.status == "graduated" or (student.semester is not None and student.semester > 8))
    graduation_year = None
    if student.roll_number and len(student.roll_number) >= 4:
        match = re.match(r"^(\d{2})", student.roll_number)
        if match:
            try:
                yy = int(match.group(1))
                graduation_year = 2000 + yy + 4
            except Exception:
                pass

    return StudentResponse(
        id=student.id,
        full_name=student.full_name,
        roll_number=student.roll_number,
        admn_no=student.admn_no or "",
        semester=student.semester or 1,
        branch=student.branch or "",
        section=student.section or "",
        photo_url=f"/api/static/photos/{student.roll_number}.jpg",
        is_graduated=is_graduated,
        graduation_year=graduation_year,
        status=student.status or "active",
        status_notes=student.status_notes or ""
    )


@router.get("/restricted")
async def list_restricted_students(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List rusticated / blacklisted / restricted students."""
    user_role_str = role_str(current_user)
    query = select(Student).where(Student.status.in_(["rusticated", "blacklisted", "tc_taken"]))
    if user_role_str != "super_admin" and current_user.college_id:
        query = query.where(Student.college_id == current_user.college_id)
    query = await apply_student_role_scope(query, current_user, db)
    res = await db.execute(query)
    students = res.scalars().all()
    return [
        {
            "id": s.id,
            "full_name": s.full_name,
            "roll_number": s.roll_number,
            "status": s.status,
            "status_notes": s.status_notes or ""
        }
        for s in students
    ]


@router.put("/{student_id}", response_model=StudentResponse)
@router.patch("/{student_id}", response_model=StudentResponse)
async def update_student(
    student_id: int,
    payload: StudentUpdate,
    db: AsyncSession = Depends(get_db),
    _ = Depends(RoleChecker(["super_admin", "admin", "hod"]))
):
    """Update student directory details."""
    result = await db.execute(select(Student).where(Student.id == student_id))
    student = result.scalars().first()
    
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")
        
    update_data = payload.dict(exclude_unset=True)

    if payload.admn_no:
        clean_admn = payload.admn_no.strip()
        existing_admn = (await db.execute(
            select(Student).where(
                Student.admn_no == clean_admn,
                Student.college_id == student.college_id,
                Student.id != student_id
            )
        )).scalars().first()
        if existing_admn:
            raise HTTPException(
                status_code=400,
                detail=f"Admission number '{clean_admn}' is already assigned to student '{existing_admn.full_name}' ({existing_admn.roll_number})."
            )

    old_status = student.status or "active"
    new_status = update_data.get("status")

    # Update other fields
    for key, value in update_data.items():
        if value is not None:
            setattr(student, key, value)
        
    if new_status is not None and new_status != old_status:
        # Status has changed!
        user_obj = await db.get(User, student.user_id) if student.user_id else None
        if new_status != "active":
            if user_obj:
                user_obj.is_active = False
            
            from db.models import LunchPass, LeaveRequest, LeaveStatus
            from sqlalchemy import or_
            
            lp_res = await db.execute(
                select(LunchPass).where(LunchPass.student_id == student.id, LunchPass.is_active == True)
            )
            for lp in lp_res.scalars().all():
                lp.is_active = False
                
            lr_res = await db.execute(
                select(LeaveRequest).where(
                    LeaveRequest.student_id == student.id,
                    or_(
                        LeaveRequest.status == LeaveStatus.pending,
                        LeaveRequest.status == LeaveStatus.approved
                    )
                )
            )
            for lr in lr_res.scalars().all():
                lr.status = LeaveStatus.expired
                lr.gate_activated = False
        else:
            if user_obj:
                user_obj.is_active = True
        
    await db.commit()
    await db.refresh(student)
    
    is_graduated = (student.status == "graduated" or (student.semester and student.semester > 8))
    
    graduation_year = None
    if student.roll_number and len(student.roll_number) == 10:
        match = re.match(r"^(\d{2})([a-zA-Z]{2})(\d)([a-zA-Z])(.*)$", student.roll_number)
        if match:
            try:
                yy = int(match.group(1))
                entry_type = match.group(3)
                duration = 3 if entry_type == "5" else 4
                graduation_year = 2000 + yy + duration
            except Exception:
                pass

    return StudentResponse(
        id=student.id,
        full_name=student.full_name,
        roll_number=student.roll_number,
        admn_no=student.admn_no or "",
        semester=student.semester or 1,
        branch=student.branch or "",
        section=student.section or "",
        photo_url=f"/api/static/photos/{student.roll_number}.jpg",
        is_graduated=is_graduated,
        graduation_year=graduation_year,
        status=student.status or "active",
        status_notes=student.status_notes or ""
    )


@router.delete("/{student_id}")
async def delete_student(
    student_id: int,
    db: AsyncSession = Depends(get_db),
    _ = Depends(RoleChecker(["super_admin", "admin"]))
):
    student = await db.get(Student, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    await db.delete(student)
    await db.commit()
    return {"message": f"Student '{student.full_name}' ({student.roll_number}) deleted successfully."}


@router.post("/bulk-update-csv")
async def bulk_update_students_csv(
    csv_file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Bulk update student information (section, branch, semester, name, phone, status) via CSV upload."""
    user_role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    if user_role_str not in ("super_admin", "admin", "hod"):
        raise HTTPException(status_code=403, detail="Permission denied for bulk student updates.")

    csv_bytes = await csv_file.read()
    try:
        csv_text = csv_bytes.decode("utf-8-sig")
    except Exception:
        raise HTTPException(status_code=400, detail="CSV file must be UTF-8 encoded.")

    reader = csv.DictReader(io.StringIO(csv_text))
    if not reader.fieldnames:
        raise HTTPException(status_code=400, detail="CSV appears empty or has no header.")

    updated_count = 0
    failed_rows = []

    for i, raw_row in enumerate(reader, start=2):
        row = {k.strip().lower(): (v or "").strip() for k, v in raw_row.items() if k}
        roll = row.get("roll_number") or row.get("roll_no") or row.get("roll")
        if not roll:
            failed_rows.append({"row": i, "reason": "Missing roll_number"})
            continue

        res = await db.execute(select(Student).where(func.lower(Student.roll_number) == roll.lower()))
        student = res.scalars().first()
        if not student:
            failed_rows.append({"row": i, "roll": roll, "reason": f"Student with roll number '{roll}' not found"})
            continue

        try:
            await assert_student_in_role_scope(current_user, student, db)
        except HTTPException:
            failed_rows.append({"row": i, "roll": roll, "reason": "Student outside your authorized scope"})
            continue

        # Dynamic Field Updates
        if "section" in row and row["section"]:
            student.section = row["section"].upper()
        if "branch" in row and row["branch"]:
            student.branch = row["branch"].upper()
        if "semester" in row and row["semester"]:
            try:
                student.semester = int(row["semester"])
            except ValueError:
                pass
        if "full_name" in row and row["full_name"]:
            student.full_name = row["full_name"]
        if "name" in row and row["name"] and "full_name" not in row:
            student.full_name = row["name"]
        if "parent_phone" in row and row["parent_phone"] and hasattr(student, "parent_phone"):
            setattr(student, "parent_phone", row["parent_phone"])
        if "secondary_phone" in row and row["secondary_phone"] and hasattr(student, "secondary_phone"):
            setattr(student, "secondary_phone", row["secondary_phone"])
        if "status" in row and row["status"]:
            student.status = row["status"].lower()
        if "status_notes" in row and row["status_notes"]:
            student.status_notes = row["status_notes"]

        updated_count += 1

    await db.commit()

    return {
        "status": "success",
        "message": f"Successfully bulk updated {updated_count} student records.",
        "updated_count": updated_count,
        "failed_count": len(failed_rows),
        "failed_details": failed_rows
    }


@router.get("/student-history/{identifier}")
async def get_student_history(
    identifier: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get full student history timeline (LeaveRequests, LateComers, CustomPasses) by Roll Number or Admission Number.
    """
    from db.models import LeaveRequest, LateComer, CustomPassAssignment, CustomPassType, Semester, LeaveStatus
    from sqlalchemy.orm import selectinload

    ident = identifier.strip().lower()
    stmt = (
        select(Student)
        .options(selectinload(Student.college), selectinload(Student.department))
        .where(
            (func.lower(Student.roll_number) == ident) |
            (func.lower(Student.admn_no) == ident) |
            (Student.roll_number.ilike(f"%{ident}%")) |
            (Student.admn_no.ilike(f"%{ident}%"))
        )
    )
    res = await db.execute(stmt)
    student = res.scalars().first()

    if not student:
        raise HTTPException(status_code=404, detail=f"Student '{identifier}' not found.")

    await assert_student_in_role_scope(current_user, student, db)

    # 1. Semester config limits
    sem_res = await db.execute(
        select(Semester).where(Semester.college_id == student.college_id, Semester.is_active == True)
    )
    active_sem = sem_res.scalars().first()
    max_normal_passes = active_sem.max_normal_passes if active_sem else 5
    max_late_entries = (active_sem.late_comer_limit if (active_sem and active_sem.late_comer_limit) else (active_sem.max_late_entries if active_sem else 3))

    # 2. Pass summary
    used_normal_res = await db.execute(
        select(func.count(LeaveRequest.id)).where(
            LeaveRequest.student_id == student.id,
            LeaveRequest.semester == student.semester,
            LeaveRequest.status.in_([LeaveStatus.approved, LeaveStatus.exited, LeaveStatus.returned]),
            LeaveRequest.is_emergency == False
        )
    )
    used_normal_passes = used_normal_res.scalar() or 0

    used_emergency_res = await db.execute(
        select(func.count(LeaveRequest.id)).where(
            LeaveRequest.student_id == student.id,
            LeaveRequest.semester == student.semester,
            LeaveRequest.status.in_([LeaveStatus.approved, LeaveStatus.exited, LeaveStatus.returned]),
            LeaveRequest.is_emergency == True
        )
    )
    used_emergency_passes = used_emergency_res.scalar() or 0

    # 3. Late summary
    late_count_res = await db.execute(
        select(func.count(LateComer.id)).where(
            LateComer.student_id == student.id,
            LateComer.semester_id == (active_sem.id if active_sem else None)
        )
    )
    late_count = late_count_res.scalar() or 0

    # 4. Outpass history timeline
    lrs = (await db.execute(
        select(LeaveRequest)
        .where(LeaveRequest.student_id == student.id)
        .order_by(LeaveRequest.approved_at.desc(), LeaveRequest.requested_at.desc())
    )).scalars().all()

    # 5. Latecomers history timeline
    lates = (await db.execute(
        select(LateComer)
        .where(LateComer.student_id == student.id)
        .order_by(LateComer.scanned_at.desc())
    )).scalars().all()

    # 6. Custom pass assignments
    cps = (await db.execute(
        select(CustomPassAssignment, CustomPassType)
        .join(CustomPassType, CustomPassType.id == CustomPassAssignment.pass_type_id)
        .where(CustomPassAssignment.student_id == student.id)
        .order_by(CustomPassAssignment.assigned_at.desc())
    )).all()

    # Section display format e.g. III CSE Elite A1 or III CSE A
    r_yrs = {1: "I", 2: "II", 3: "III", 4: "IV"}
    yr_num = ((student.semester - 1) // 2) + 1 if student.semester else 1
    yr_num = max(1, min(4, yr_num))
    r_yr = r_yrs.get(yr_num, "I")
    sec_str = (student.section or "").strip()
    branch_str = (student.branch or "").strip()

    if sec_str.startswith(("I ", "II ", "III ", "IV ")):
        section_display = sec_str
    elif branch_str and branch_str.upper() in sec_str.upper():
        section_display = f"{r_yr} {sec_str}".strip()
    else:
        section_display = f"{r_yr} {branch_str} {sec_str}".strip()

    return {
        "student": {
            "id": student.id,
            "full_name": student.full_name,
            "roll_number": student.roll_number,
            "admn_no": student.admn_no,
            "college_id": student.college_id,
            "college_name": student.college.name if student.college else "",
            "college_code": student.college.code if student.college else "",
            "department_id": student.department_id,
            "department_name": student.department.name if student.department else "",
            "branch": student.branch,
            "section": student.section,
            "section_display": section_display,
            "semester": student.semester,
            "year": yr_num,
            "year_roman": r_yr,
            "photo_url": getattr(student, "photo_url", None) or f"/api/static/photos/{student.roll_number}.jpg",
            "status": student.status,
            "parent_phone": getattr(student, "parent_phone", None) or getattr(student, "guardian_phone", None) or "N/A",
        },
        "pass_summary": {
            "max_normal_passes": max_normal_passes,
            "used_normal_passes": used_normal_passes,
            "used_emergency_passes": used_emergency_passes,
            "limit_reached": used_normal_passes >= max_normal_passes
        },
        "late_summary": {
            "max_late_entries": max_late_entries,
            "late_count": late_count,
            "limit_exceeded": late_count >= max_late_entries
        },
        "leave_requests": [
            {
                "id": lr.id,
                "reason": lr.reason,
                "out_time": getattr(lr, "out_time", None),
                "in_time": getattr(lr, "in_time", None),
                "status": lr.status.value if hasattr(lr.status, "value") else str(lr.status),
                "is_emergency": lr.is_emergency,
                "remarks": lr.remarks,
                "gate_activated": lr.gate_activated,
                "exit_scanned_at": getattr(lr, "exit_scanned_at", None).isoformat() if getattr(lr, "exit_scanned_at", None) else None,
                "entry_scanned_at": getattr(lr, "entry_scanned_at", None).isoformat() if getattr(lr, "entry_scanned_at", None) else None,
                "created_at": (lr.approved_at or lr.requested_at).isoformat() if (lr.approved_at or lr.requested_at) else None,
            }
            for lr in lrs
        ],
        "late_entries": [
            {
                "id": lt.id,
                "timestamp": lt.scanned_at.isoformat() if lt.scanned_at else None,
                "semester": getattr(lt.semester, "semester_number", None) if getattr(lt, "semester", None) else None,
                "is_excused": getattr(lt, "is_excused", False),
                "excuse_reason": getattr(lt, "excuse_reason", None)
            }
            for lt in lates
        ],
        "custom_passes": [
            {
                "id": cp.CustomPassAssignment.id,
                "pass_name": cp.CustomPassType.name,
                "out_time": cp.CustomPassAssignment.out_time or cp.CustomPassType.out_time,
                "in_time": cp.CustomPassAssignment.in_time or cp.CustomPassType.in_time,
                "valid_from": str(cp.CustomPassAssignment.valid_from) if cp.CustomPassAssignment.valid_from else None,
                "valid_to": str(cp.CustomPassAssignment.valid_to) if cp.CustomPassAssignment.valid_to else None,
                "is_active": cp.CustomPassAssignment.is_active,
                "assigned_at": cp.CustomPassAssignment.assigned_at.isoformat() if cp.CustomPassAssignment.assigned_at else None
            }
            for cp in cps
        ]
    }
