from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, and_
from sqlalchemy.orm import selectinload
from db.database import get_db
from db.models import User, Student, Semester, LunchPass, LunchScan
from api.deps import RoleChecker
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel
from typing import Optional

router = APIRouter()


class LunchIssueBody(BaseModel):
    admn_no: str      # search by admn_no
    semester_id: Optional[int] = None


def _fmt(dt) -> Optional[str]:
    return dt.isoformat() if dt else None


# ── List issued passes ────────────────────────────────────────────────────────

@router.get("/passes")
async def list_passes(
    semester_id: Optional[int] = Query(default=None),
    college_id: Optional[int] = Query(default=None),
    htno: str = Query(default=""),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(["super_admin", "admin", "hod", "security"]))
):
    user_role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    target_college_id = college_id or current_user.college_id

    filters = [LunchPass.is_active == True]
    if target_college_id:
        filters.append(Student.college_id == target_college_id)
    if semester_id:
        filters.append(Semester.semester_number == semester_id)

    q = (
        select(LunchPass)
        .join(Student, LunchPass.student_id == Student.id)
        .join(Semester, LunchPass.semester_id == Semester.id)
        .where(and_(*filters))
        .options(selectinload(LunchPass.student), selectinload(LunchPass.semester))
        .order_by(LunchPass.issued_at.desc())
    )
    if htno.strip():
        q = q.where(Student.admn_no.ilike(f"%{htno}%") | Student.roll_number.ilike(f"%{htno}%"))

    result = await db.execute(q)
    passes = result.scalars().all()
    return [
        {
            "id": lp.id,
            "student_name": lp.student.full_name,
            "admn_no": lp.student.admn_no,
            "roll_number": lp.student.roll_number,
            "semester": lp.semester.semester_number,
            "issued_at": _fmt(lp.issued_at),
            "is_active": lp.is_active,
        }
        for lp in passes
    ]


# ── Search students for lunch pass issue suggestions ──────────────────────────

@router.get("/students-search")
async def search_students_for_lunch(
    q: str = Query(default=""),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(["super_admin", "admin", "hod"]))
):
    if not q.strip() or len(q.strip()) < 2:
        return []
    user_role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    query = select(Student).where(
        (Student.roll_number.ilike(f"%{q}%")) | (Student.admn_no.ilike(f"%{q}%")) | (Student.full_name.ilike(f"%{q}%"))
    )
    if user_role_str != "super_admin" and current_user.college_id:
        query = query.where(Student.college_id == current_user.college_id)
    if user_role_str == "hod":
        from api.deps import get_hod_department_ids
        hod_dept_ids = await get_hod_department_ids(current_user, db)
        if hod_dept_ids:
            query = query.where(Student.department_id.in_(hod_dept_ids))

    res = await db.execute(query.limit(10))
    students = res.scalars().all()
    return [
        {
            "id": s.id,
            "full_name": s.full_name,
            "roll_number": s.roll_number,
            "admn_no": s.admn_no,
            "branch": s.branch,
            "section": s.section,
            "semester": s.semester,
        }
        for s in students
    ]


# ── Issue pass ────────────────────────────────────────────────────────────────

@router.post("/issue")
async def issue_pass(
    body: LunchIssueBody,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(["super_admin", "admin", "hod"]))
):
    user_role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)

    # Find student by admn_no or roll_number (case-insensitive lookup)
    stud_res = await db.execute(
        select(Student).where(
            (func.lower(Student.admn_no) == func.lower(body.admn_no.strip())) |
            (func.lower(Student.roll_number) == func.lower(body.admn_no.strip()))
        )
    )
    student = stud_res.scalars().first()
    if not student:
        raise HTTPException(status_code=404, detail=f"Student with ID '{body.admn_no}' not found")

    if user_role_str != "super_admin" and current_user.college_id and student.college_id != current_user.college_id:
        raise HTTPException(status_code=403, detail="Not authorized to issue pass for students outside your college")

    if user_role_str == "hod":
        from api.deps import get_hod_department_ids
        hod_dept_ids = await get_hod_department_ids(current_user, db)
        if hod_dept_ids and student.department_id not in hod_dept_ids:
            raise HTTPException(status_code=403, detail="Not authorized to issue pass for students outside your department")

    semester_id = body.semester_id
    if not semester_id:
        # Fetch the Semester that matches this student's current semester number and college
        sem_res = await db.execute(
            select(Semester).where(
                Semester.semester_number == (student.semester or 1),
                Semester.college_id == student.college_id
            )
        )
        semester = sem_res.scalars().first()
        if not semester:
            semester = Semester(
                college_id=student.college_id,
                semester_number=student.semester or 1,
                academic_year="2026-2027",
                is_active=True
            )
            db.add(semester)
            await db.flush()
        semester_id = semester.id
    else:
        # Check semester exists
        sem_res = await db.execute(select(Semester).where(Semester.id == semester_id))
        semester = sem_res.scalars().first()
        if not semester:
            raise HTTPException(status_code=404, detail="Semester not found")

    # Check duplicate
    dup = (await db.execute(
        select(LunchPass).where(
            LunchPass.student_id == student.id,
            LunchPass.semester_id == semester_id,
            LunchPass.is_active == True
        )
    )).scalars().first()
    if dup:
        raise HTTPException(status_code=400, detail="Student already has an active lunch pass for this semester")

    lp = LunchPass(
        college_id=student.college_id,
        student_id=student.id,
        semester_id=semester_id,
        issued_by=current_user.id,
        is_active=True
    )
    db.add(lp)
    await db.commit()
    await db.refresh(lp)
    return {
        "message": f"Lunch pass issued to {student.full_name} ({student.roll_number}) for Semester {semester.semester_number}",
        "student": {
            "id": student.id,
            "full_name": student.full_name,
            "roll_number": student.roll_number,
            "admn_no": student.admn_no,
            "branch": student.branch,
            "section": student.section,
            "semester": semester.semester_number,
            "photo_url": f"/api/students/{student.id}/photo"
        }
    }


# ── Revoke pass ───────────────────────────────────────────────────────────────

@router.delete("/revoke/{pass_id}")
async def revoke_pass(
    pass_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(["super_admin", "admin", "hod"]))
):
    lp = (await db.execute(select(LunchPass).where(LunchPass.id == pass_id))).scalars().first()
    if not lp:
        raise HTTPException(status_code=404, detail="Lunch pass not found")
    lp.is_active = False
    await db.commit()
    return {"message": "Lunch pass revoked"}


# ── Issue history ─────────────────────────────────────────────────────────────

@router.get("/issue-history")
async def issue_history(
    semester_id: Optional[int] = Query(default=None),
    college_id: Optional[int] = Query(default=None),
    htno: str = Query(default=""),
    date_from: str = Query(default=""),
    date_to: str = Query(default=""),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(["super_admin", "admin", "hod", "security"]))
):
    user_role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    target_college_id = college_id if user_role_str == "super_admin" else current_user.college_id

    filters = []
    if target_college_id:
        filters.append(Student.college_id == target_college_id)
    if semester_id:
        filters.append(LunchPass.semester_id == semester_id)
    if date_from.strip():
        try:
            dt = datetime.strptime(date_from.strip(), "%Y-%m-%d").replace(tzinfo=timezone.utc)
            filters.append(LunchPass.issued_at >= dt)
        except ValueError: pass
    if date_to.strip():
        try:
            dt = datetime.strptime(date_to.strip(), "%Y-%m-%d").replace(tzinfo=timezone.utc) + timedelta(days=1)
            filters.append(LunchPass.issued_at < dt)
        except ValueError: pass

    q = (
        select(LunchPass)
        .join(Student, LunchPass.student_id == Student.id)
        .options(selectinload(LunchPass.student), selectinload(LunchPass.semester))
        .order_by(LunchPass.issued_at.desc())
        .limit(200)
    )
    if filters:
        q = q.where(and_(*filters))
    if htno.strip():
        q = q.where(Student.admn_no.ilike(f"%{htno}%") | Student.roll_number.ilike(f"%{htno}%"))

    passes = (await db.execute(q)).scalars().all()
    return [
        {
            "id": lp.id,
            "student_name": lp.student.full_name,
            "admn_no": lp.student.admn_no,
            "roll_number": lp.student.roll_number,
            "semester": lp.semester.semester_number,
            "issued_at": _fmt(lp.issued_at),
            "is_active": lp.is_active,
        }
        for lp in passes
    ]


# ── Scan history ──────────────────────────────────────────────────────────────

@router.get("/scan-history")
async def scan_history(
    semester_id: Optional[int] = Query(default=None),
    college_id: Optional[int] = Query(default=None),
    htno: str = Query(default=""),
    date_from: str = Query(default=""),
    date_to: str = Query(default=""),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(["super_admin", "admin", "hod", "security"]))
):
    user_role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    target_college_id = college_id if user_role_str == "super_admin" else current_user.college_id

    filters = []
    if target_college_id:
        filters.append(Student.college_id == target_college_id)
    if date_from.strip():
        try:
            dt = datetime.strptime(date_from.strip(), "%Y-%m-%d").replace(tzinfo=timezone.utc)
            filters.append(LunchScan.scanned_at >= dt)
        except ValueError: pass
    if date_to.strip():
        try:
            dt = datetime.strptime(date_to.strip(), "%Y-%m-%d").replace(tzinfo=timezone.utc) + timedelta(days=1)
            filters.append(LunchScan.scanned_at < dt)
        except ValueError: pass
    if semester_id:
        filters.append(LunchPass.semester_id == semester_id)

    q = (
        select(LunchScan)
        .join(LunchPass)
        .join(Student, LunchScan.student_id == Student.id)
        .options(selectinload(LunchScan.student), selectinload(LunchScan.lunch_pass).selectinload(LunchPass.semester))
        .order_by(LunchScan.scanned_at.desc())
        .limit(500)
    )
    if filters:
        q = q.where(and_(*filters))
    if htno.strip():
        q = q.where(Student.admn_no.ilike(f"%{htno}%") | Student.roll_number.ilike(f"%{htno}%"))

    scans = (await db.execute(q)).scalars().all()
    return [
        {
            "id": s.id,
            "student_name": s.student.full_name,
            "admn_no": s.student.admn_no,
            "roll_number": s.student.roll_number,
            "scan_type": s.scan_type,
            "scanned_at": _fmt(s.scanned_at),
            "semester": s.lunch_pass.semester.semester_number,
        }
        for s in scans
    ]
