from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, delete
from db.database import get_db
from db.models import User, Semester, Student, LunchPass, LateComer
from api.deps import RoleChecker
from api.auth import get_current_user
from datetime import date, datetime
from pydantic import BaseModel
from typing import Optional

router = APIRouter()


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class SemesterCreate(BaseModel):
    semester_number: int
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    late_comer_limit: int = 5
    late_comer_cutoff: str = "11:00"
    max_normal_passes: int = 5
    lunch_out_start: str = "12:30"
    lunch_out_end: str   = "13:00"
    lunch_in_start: str  = "13:00"
    lunch_in_end: str    = "13:30"
    both_approvals_required: bool = False

class SemesterUpdate(BaseModel):
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    late_comer_limit: Optional[int] = None
    late_comer_cutoff: Optional[str] = None
    max_normal_passes: Optional[int] = None
    is_active: Optional[bool] = None
    lunch_out_start: Optional[str] = None
    lunch_out_end: Optional[str]   = None
    lunch_in_start: Optional[str]  = None
    lunch_in_end: Optional[str]    = None
    both_approvals_required: Optional[bool] = None


# ── Semester endpoints ────────────────────────────────────────────────────────

@router.get("/semesters")
async def list_active_semesters(
    college_id: Optional[int] = Query(default=None),
    active_only: bool = Query(default=True),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    user_role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    target_college_id = college_id if user_role_str == "super_admin" else current_user.college_id

    # If target_college_id is None for super_admin, pick the first college
    if not target_college_id:
        from db.models import College
        col_res = await db.execute(select(College.id).order_by(College.id))
        first_col_id = col_res.scalars().first()
        target_college_id = first_col_id

    q = select(Semester).order_by(Semester.semester_number)
    if target_college_id:
        q = q.where(Semester.college_id == target_college_id)
    if active_only:
        q = q.where(Semester.is_active == True)
    result = await db.execute(q)
    semesters = result.scalars().all()

    # For each semester, count students strictly for this college
    out = []
    for sem in semesters:
        count_res = await db.execute(
            select(func.count()).select_from(Student).where(
                Student.semester == sem.semester_number,
                Student.college_id == sem.college_id,
                Student.status == "active"
            )
        )
        out.append({
            "id": sem.id,
            "semester_number": sem.semester_number,
            "is_active": sem.is_active,
            "start_date": str(sem.start_date) if sem.start_date else None,
            "end_date": str(sem.end_date) if sem.end_date else None,
            "late_comer_limit": sem.late_comer_limit,
            "late_comer_cutoff": sem.late_comer_cutoff,
            "max_normal_passes": getattr(sem, "max_normal_passes", 5) or 5,
            "lunch_out_start": sem.lunch_out_start,
            "lunch_out_end": sem.lunch_out_end,
            "lunch_in_start": sem.lunch_in_start,
            "lunch_in_end": sem.lunch_in_end,
            "both_approvals_required": sem.both_approvals_required,
            "student_count": count_res.scalar() or 0,
        })

    # When fetching all semesters (management view), fill in the 8 slots
    # so the admin can see and activate missing ones
    if not active_only:
        existing_nums = {s["semester_number"] for s in out}
        for n in range(1, 9):
            if n not in existing_nums:
                out.append({
                    "id": None,
                    "semester_number": n,
                    "is_active": False,
                    "start_date": None, "end_date": None,
                    "late_comer_limit": 5,
                    "late_comer_cutoff": "11:00",
                    "max_normal_passes": 5,
                    "lunch_out_start": "12:30", "lunch_out_end": "13:00",
                    "lunch_in_start": "13:00", "lunch_in_end": "13:30",
                    "both_approvals_required": True if n in (1, 2) else False,
                    "student_count": 0,
                })
        out.sort(key=lambda s: s["semester_number"])
    return out



@router.post("/semesters")
async def create_semester(
    body: SemesterCreate,
    college_id: Optional[int] = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(["super_admin", "admin"]))
):
    user_role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    target_college_id = college_id if user_role_str == "super_admin" else current_user.college_id

    if not target_college_id:
        from db.models import College
        col_res = await db.execute(select(College.id).order_by(College.id))
        target_college_id = col_res.scalars().first()

    existing = (await db.execute(
        select(Semester).where(Semester.semester_number == body.semester_number, Semester.college_id == target_college_id)
    )).scalars().first()

    if existing:
        existing.is_active = True
        existing.start_date = date.fromisoformat(body.start_date) if body.start_date else None
        existing.end_date = date.fromisoformat(body.end_date) if body.end_date else None
        existing.late_comer_limit = body.late_comer_limit
        existing.max_late_entries = body.late_comer_limit
        existing.late_comer_cutoff = body.late_comer_cutoff
        existing.max_normal_passes = body.max_normal_passes
        existing.lunch_out_start = body.lunch_out_start
        existing.lunch_out_end = body.lunch_out_end
        existing.lunch_in_start = body.lunch_in_start
        existing.lunch_in_end = body.lunch_in_end
        existing.both_approvals_required = body.both_approvals_required
    else:
        sem = Semester(
            college_id=target_college_id,
            semester_number=body.semester_number,
            is_active=True,
            start_date=date.fromisoformat(body.start_date) if body.start_date else None,
            end_date=date.fromisoformat(body.end_date) if body.end_date else None,
            late_comer_limit=body.late_comer_limit,
            max_late_entries=body.late_comer_limit,
            late_comer_cutoff=body.late_comer_cutoff,
            max_normal_passes=body.max_normal_passes,
            lunch_out_start=body.lunch_out_start,
            lunch_out_end=body.lunch_out_end,
            lunch_in_start=body.lunch_in_start,
            lunch_in_end=body.lunch_in_end,
            both_approvals_required=body.both_approvals_required
        )
        db.add(sem)
    await db.commit()
    return {"message": f"Semester {body.semester_number} created"}


@router.patch("/semesters/{sem_id}")
async def update_semester(
    sem_id: int,
    body: SemesterUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(["super_admin", "admin"]))
):
    result = await db.execute(select(Semester).where(Semester.id == sem_id))
    sem = result.scalars().first()
    if not sem:
        raise HTTPException(status_code=404, detail="Semester not found")

    user_role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    if user_role_str != "super_admin" and sem.college_id != current_user.college_id:
        raise HTTPException(status_code=403, detail="Not authorized for this college's semester")

    if body.start_date is not None:
        sem.start_date = date.fromisoformat(body.start_date) if body.start_date else None
    if body.end_date is not None:
        sem.end_date = date.fromisoformat(body.end_date) if body.end_date else None
    if body.late_comer_limit is not None:
        sem.late_comer_limit = body.late_comer_limit
        sem.max_late_entries = body.late_comer_limit
    if body.late_comer_cutoff is not None:
        sem.late_comer_cutoff = body.late_comer_cutoff
    if body.max_normal_passes is not None:
        sem.max_normal_passes = body.max_normal_passes
    if body.is_active is not None:
        sem.is_active = body.is_active
    if body.lunch_out_start is not None:
        sem.lunch_out_start = body.lunch_out_start
    if body.lunch_out_end is not None:
        sem.lunch_out_end = body.lunch_out_end
    if body.lunch_in_start is not None:
        sem.lunch_in_start = body.lunch_in_start
    if body.lunch_in_end is not None:
        sem.lunch_in_end = body.lunch_in_end
    if body.both_approvals_required is not None:
        sem.both_approvals_required = body.both_approvals_required

    await db.commit()
    return {"message": "Semester updated"}


class SemesterPromotePayload(BaseModel):
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    late_comer_limit: Optional[int] = None
    late_comer_cutoff: Optional[str] = None
    lunch_out_start: Optional[str] = None
    lunch_out_end: Optional[str] = None
    lunch_in_start: Optional[str] = None
    lunch_in_end: Optional[str] = None
    both_approvals_required: Optional[bool] = None


@router.post("/semesters/{sem_id}/promote")
async def promote_semester(
    sem_id: int,
    body: Optional[SemesterPromotePayload] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(["super_admin", "admin"]))
):
    """
    Promote all students in semester N to semester N+1 for this specific college
    and update target semester configuration.
    """
    result = await db.execute(select(Semester).where(Semester.id == sem_id))
    sem = result.scalars().first()
    if not sem:
        raise HTTPException(status_code=404, detail="Semester not found")

    user_role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    if user_role_str != "super_admin" and sem.college_id != current_user.college_id:
        raise HTTPException(status_code=403, detail="Not authorized for this college's semester")

    sem_num = sem.semester_number
    next_num = sem_num + 1

    # Get all students in this semester strictly for this college
    students_res = await db.execute(
        select(Student).where(Student.semester == sem_num, Student.college_id == sem.college_id)
    )
    students = students_res.scalars().all()
    count = len(students)

    for student in students:
        if next_num <= 8:
            student.semester = next_num
        else:
            # Graduated — purge student data & user account so roll/admn numbers can be reused cleanly
            if student.user_id:
                user_res = await db.execute(select(User).where(User.id == student.user_id))
                u = user_res.scalars().first()
                if u:
                    await db.delete(u)
            await db.execute(delete(LunchPass).where(LunchPass.student_id == student.id))
            await db.execute(delete(LateComer).where(LateComer.student_id == student.id))
            await db.delete(student)

        # Deactivate lunch passes for old semester
        passes_res = await db.execute(
            select(LunchPass).where(
                LunchPass.student_id == student.id,
                LunchPass.semester_id == sem_id
            )
        )
        for lp in passes_res.scalars().all():
            lp.is_active = False

    # Automatically deactivate the old semester now that all students have been promoted
    sem.is_active = False

    # Ensure next semester exists and is active for this college
    if next_num <= 8:
        next_sem_res = await db.execute(
            select(Semester).where(Semester.semester_number == next_num, Semester.college_id == sem.college_id)
        )
        next_sem = next_sem_res.scalars().first()
        
        start_d = None
        end_d = None
        if body and body.start_date:
            try:
                start_d = datetime.strptime(body.start_date, "%Y-%m-%d").date()
            except Exception:
                pass
        if body and body.end_date:
            try:
                end_d = datetime.strptime(body.end_date, "%Y-%m-%d").date()
            except Exception:
                pass

        if next_sem:
            next_sem.is_active = True
            if body:
                if start_d is not None: next_sem.start_date = start_d
                if end_d is not None: next_sem.end_date = end_d
                if body.late_comer_limit is not None: next_sem.late_comer_limit = body.late_comer_limit
                if body.late_comer_cutoff is not None: next_sem.late_comer_cutoff = body.late_comer_cutoff
                if body.lunch_out_start is not None: next_sem.lunch_out_start = body.lunch_out_start
                if body.lunch_out_end is not None: next_sem.lunch_out_end = body.lunch_out_end
                if body.lunch_in_start is not None: next_sem.lunch_in_start = body.lunch_in_start
                if body.lunch_in_end is not None: next_sem.lunch_in_end = body.lunch_in_end
                if body.both_approvals_required is not None: next_sem.both_approvals_required = body.both_approvals_required
        else:
            db.add(Semester(
                college_id=sem.college_id,
                semester_number=next_num,
                is_active=True,
                start_date=start_d,
                end_date=end_d,
                late_comer_limit=body.late_comer_limit if (body and body.late_comer_limit is not None) else sem.late_comer_limit,
                late_comer_cutoff=body.late_comer_cutoff if (body and body.late_comer_cutoff is not None) else sem.late_comer_cutoff,
                lunch_out_start=body.lunch_out_start if (body and body.lunch_out_start is not None) else sem.lunch_out_start,
                lunch_out_end=body.lunch_out_end if (body and body.lunch_out_end is not None) else sem.lunch_out_end,
                lunch_in_start=body.lunch_in_start if (body and body.lunch_in_start is not None) else sem.lunch_in_start,
                lunch_in_end=body.lunch_in_end if (body and body.lunch_in_end is not None) else sem.lunch_in_end,
                both_approvals_required=body.both_approvals_required if (body and body.both_approvals_required is not None) else sem.both_approvals_required
            ))

    await db.commit()
    return {"message": f"Promoted {count} students from Semester {sem_num} to {next_num}."}


@router.post("/semesters/check-auto-promote")
async def check_auto_promote(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(["super_admin", "admin"]))
):
    """Check if any active semester has reached its end_date and auto-promote."""
    today = date.today()
    result = await db.execute(
        select(Semester).where(Semester.is_active == True, Semester.end_date != None)
    )
    promoted = []
    for sem in result.scalars().all():
        if sem.end_date and sem.end_date <= today:
            sem_num = sem.semester_number
            next_num = sem_num + 1

            students_res = await db.execute(
                select(Student).where(Student.semester == sem_num, Student.college_id == sem.college_id)
            )
            students = students_res.scalars().all()

            for student in students:
                if next_num <= 8:
                    student.semester = next_num
                else:
                    if student.user_id:
                        user_res = await db.execute(select(User).where(User.id == student.user_id))
                        u = user_res.scalars().first()
                        if u:
                            u.is_active = False
                    student.status = "graduated"

                passes_res = await db.execute(
                    select(LunchPass).where(
                        LunchPass.student_id == student.id,
                        LunchPass.semester_id == sem.id
                    )
                )
                for lp in passes_res.scalars().all():
                    lp.is_active = False

            sem.is_active = False

            if next_num <= 8:
                next_sem_res = await db.execute(
                    select(Semester).where(Semester.semester_number == next_num, Semester.college_id == sem.college_id)
                )
                next_sem = next_sem_res.scalars().first()
                if next_sem:
                    next_sem.is_active = True
                else:
                    db.add(Semester(
                        college_id=sem.college_id,
                        semester_number=next_num,
                        is_active=True,
                        late_comer_limit=sem.late_comer_limit,
                        late_comer_cutoff=sem.late_comer_cutoff,
                        lunch_out_start=sem.lunch_out_start,
                        lunch_out_end=sem.lunch_out_end,
                        lunch_in_start=sem.lunch_in_start,
                        lunch_in_end=sem.lunch_in_end,
                        both_approvals_required=sem.both_approvals_required
                    ))

            promoted.append(sem_num)

    await db.commit()
    return {"auto_promoted": promoted}
