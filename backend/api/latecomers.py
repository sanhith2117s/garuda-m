from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, and_
from sqlalchemy.orm import selectinload
from db.database import get_db
from db.models import User, Student, Semester, LateComer
from api.deps import RoleChecker
from datetime import datetime, timezone, timedelta
from typing import Optional

router = APIRouter()


@router.get("/summary")
async def latecomer_summary(
    semester_id: Optional[int] = Query(default=None),
    college_id: Optional[int] = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(["super_admin", "admin", "hod", "security"]))
):
    """Per-student late comer count for an active semester."""
    user_role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    target_college_id = college_id if user_role_str == "super_admin" else current_user.college_id

    filters = []
    if target_college_id:
        filters.append(Student.college_id == target_college_id)
    if semester_id:
        filters.append(LateComer.semester_id == semester_id)

    q = (
        select(
            Student,
            Semester,
            func.count(LateComer.id).label("count")
        )
        .join(Student, LateComer.student_id == Student.id)
        .join(Semester, LateComer.semester_id == Semester.id)
    )
    if filters:
        q = q.where(and_(*filters))
    q = q.group_by(Student.id, Semester.id)

    res = await db.execute(q)
    rows = res.all()
    result = []
    for stud, sem, count in rows:
        limit = sem.late_comer_limit or 5
        status = "exceeded" if count >= limit else ("warning" if count == limit - 1 else "ok")
        result.append({
            "student_id": stud.id,
            "student_name": stud.full_name,
            "admn_no": stud.admn_no,
            "roll_number": stud.roll_number,
            "semester": sem.semester_number,
            "semester_id": sem.id,
            "count": count,
            "limit": limit,
            "status": status,
            "photo_url": f"/api/static/photos/{stud.roll_number}.jpg",
        })

    result.sort(key=lambda x: (-x["count"], x["student_name"]))
    return result


@router.get("/log")
async def latecomer_log(
    semester_id: Optional[int] = Query(default=None),
    college_id: Optional[int] = Query(default=None),
    htno: str = Query(default=""),
    date_from: str = Query(default=""),
    date_to: str = Query(default=""),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(["super_admin", "admin", "hod", "security"]))
):
    """Detailed log of individual late-comer scans."""
    user_role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    target_college_id = college_id if user_role_str == "super_admin" else current_user.college_id

    filters = []
    if target_college_id:
        filters.append(Student.college_id == target_college_id)
    if semester_id:
        filters.append(LateComer.semester_id == semester_id)
    if date_from.strip():
        try:
            dt = datetime.strptime(date_from.strip(), "%Y-%m-%d").replace(tzinfo=timezone.utc)
            filters.append(LateComer.scanned_at >= dt)
        except ValueError: pass
    if date_to.strip():
        try:
            dt = datetime.strptime(date_to.strip(), "%Y-%m-%d").replace(tzinfo=timezone.utc) + timedelta(days=1)
            filters.append(LateComer.scanned_at < dt)
        except ValueError: pass

    q = (
        select(LateComer)
        .join(Student, LateComer.student_id == Student.id)
        .options(selectinload(LateComer.student), selectinload(LateComer.semester))
        .order_by(LateComer.scanned_at.desc())
        .limit(500)
    )
    if filters:
        q = q.where(and_(*filters))
    if htno.strip():
        q = q.where(Student.admn_no.ilike(f"%{htno}%") | Student.roll_number.ilike(f"%{htno}%"))

    records = (await db.execute(q)).scalars().all()
    return [
        {
            "id": r.id,
            "student_name": r.student.full_name,
            "admn_no": r.student.admn_no,
            "roll_number": r.student.roll_number,
            "semester": r.semester.semester_number,
            "scanned_at": r.scanned_at.isoformat() if r.scanned_at else None,
            "photo_url": f"/api/static/photos/{r.student.roll_number}.jpg",
        }
        for r in records
    ]
