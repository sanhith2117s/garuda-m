from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import or_, and_
from jose import jwt, JWTError
from db.database import get_db
from db.models import User, Department, Student, MentorAssignment, HODAssignment, AuditLog, Section
from core.config import settings
from typing import Optional, List, Dict, Set
from datetime import datetime, timezone

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

def role_str(user: User) -> str:
    value = user.role.value if hasattr(user.role, "value") else str(user.role)
    if value == "gate_admin":
        return "admin"
    return value


async def get_current_user(token: Optional[str] = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)) -> User:
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username: str = payload.get("sub")
        if not username:
            raise HTTPException(status_code=401, detail="Invalid token payload")
        
        result = await db.execute(select(User).where(User.username == username))
        user = result.scalars().first()
        if not user or not user.is_active:
            raise HTTPException(status_code=401, detail="User account is inactive or not found")
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")


def RoleChecker(allowed_roles: List[str]):
    async def role_checker(user: User = Depends(get_current_user)):
        user_role_str = role_str(user)
        if user_role_str not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"User role '{user_role_str}' is not authorized to access this resource"
            )
        return user
    return role_checker


def academic_year_from_semester(semester: Optional[int]) -> int:
    if not semester:
        return 1
    return max(1, min(4, ((int(semester) - 1) // 2) + 1))


def academic_year_sql_clause(years: Set[int]):
    """Match students whose semester maps to one of the given academic years (1-4)."""
    ranges = []
    for year in years:
        if not year:
            continue
        lo = (int(year) - 1) * 2 + 1
        hi = int(year) * 2
        ranges.append(and_(Student.semester >= lo, Student.semester <= hi))
    if not ranges:
        return None
    return or_(*ranges)


def _parse_assignment_years(assignment: HODAssignment) -> Optional[Set[int]]:
    """None means all years. Otherwise a set of year numbers."""
    raw_years = getattr(assignment, "years", None)
    if raw_years and str(raw_years).strip():
        text = str(raw_years).strip().lower()
        if text in ("all", "*", "1,2,3,4"):
            return None
        parsed = {int(part) for part in text.split(",") if part.strip().isdigit()}
        return parsed or None
    if assignment.year:
        return {int(assignment.year)}
    return None


async def get_hod_scope(user: User, db: AsyncSession) -> Dict[int, Optional[Set[int]]]:
    """
    Map department_id -> years (None = all years) for this HOD.
    Combines HODAssignment rows and legacy Department.hod1_id / hod2_id.
    """
    scope: Dict[int, Optional[Set[int]]] = {}

    assign_res = await db.execute(
        select(HODAssignment).where(HODAssignment.hod_id == user.id, HODAssignment.is_active == True)
    )
    for assignment in assign_res.scalars().all():
        years = _parse_assignment_years(assignment)
        dept_id = assignment.department_id
        if dept_id not in scope or years is None or scope[dept_id] is None:
            if dept_id in scope and scope[dept_id] is not None and years is not None:
                scope[dept_id] = scope[dept_id] | years
            else:
                scope[dept_id] = years
        else:
            scope[dept_id] = scope[dept_id] | years

    res = await db.execute(
        select(Department).where(
            or_(Department.hod1_id == user.id, Department.hod2_id == user.id)
        )
    )
    for dept in res.scalars().all():
        if dept.id not in scope:
            # H&S is year 1 by convention; other depts default to all years
            scope[dept.id] = {1} if dept.is_hs else None

    return scope


async def get_hod_department_ids(user: User, db: AsyncSession) -> List[int]:
    """Return department IDs assigned to this HOD. Does not fall back to the whole college."""
    scope = await get_hod_scope(user, db)
    return list(scope.keys())


async def hod_student_filter_clause(user: User, db: AsyncSession):
    scope = await get_hod_scope(user, db)
    if not scope:
        return None
    clauses = []
    for dept_id, years in scope.items():
        if not years:
            clauses.append(Student.department_id == dept_id)
        else:
            year_clause = academic_year_sql_clause(years)
            if year_clause is None:
                clauses.append(Student.department_id == dept_id)
            else:
                clauses.append(and_(Student.department_id == dept_id, year_clause))
    return or_(*clauses) if clauses else None


async def student_in_hod_scope(user: User, student: Student, db: AsyncSession) -> bool:
    scope = await get_hod_scope(user, db)
    if not scope:
        return False
    if student.department_id not in scope:
        return False
    years = scope[student.department_id]
    if not years:
        return True
    return academic_year_from_semester(student.semester) in years


async def get_hod_scope_assignments(user: User, db: AsyncSession):
    """Return list of HODAssignment records for this HOD user."""
    res = await db.execute(select(HODAssignment).where(HODAssignment.hod_id == user.id, HODAssignment.is_active == True))
    return res.scalars().all()


async def get_mentor_student_ids(user: User, db: AsyncSession) -> List[int]:
    """Return student IDs assigned to this mentor via student, section, department, and year."""
    res = await db.execute(
        select(MentorAssignment).where(MentorAssignment.mentor_id == user.id)
    )
    assignments = res.scalars().all()
    if not assignments:
        return []

    student_ids: Set[int] = set()

    for assignment in assignments:
        year = getattr(assignment, "year", None)
        year_clause = academic_year_sql_clause({int(year)}) if year else None

        if assignment.student_id:
            student_ids.add(assignment.student_id)
            continue

        if assignment.section_id:
            section = await db.get(Section, assignment.section_id)
            if section:
                q = select(Student.id).where(
                    or_(
                        Student.section_id == assignment.section_id,
                        and_(
                            Student.department_id == section.department_id,
                            Student.section.ilike(section.name),
                        ),
                    )
                )
            else:
                q = select(Student.id).where(Student.section_id == assignment.section_id)
            if year_clause is not None:
                q = q.where(year_clause)
            sec_res = await db.execute(q)
            student_ids.update([row[0] for row in sec_res.all()])
            continue

        if assignment.department_id:
            q = select(Student.id).where(Student.department_id == assignment.department_id)
            if year_clause is not None:
                q = q.where(year_clause)
            dept_res = await db.execute(q)
            student_ids.update([row[0] for row in dept_res.all()])

    return list(student_ids)


async def apply_student_role_scope(query, user: User, db: AsyncSession):
    """Restrict a Student-joined query to the caller's HOD/mentor allotment."""
    current_role = role_str(user)
    if current_role == "hod":
        clause = await hod_student_filter_clause(user, db)
        if clause is None:
            return query.where(Student.id == -1)
        return query.where(clause)
    if current_role == "mentor":
        ids = await get_mentor_student_ids(user, db)
        if not ids:
            return query.where(Student.id == -1)
        return query.where(Student.id.in_(ids))
    return query


async def assert_student_in_role_scope(user: User, student: Student, db: AsyncSession):
    current_role = role_str(user)
    if current_role == "hod" and not await student_in_hod_scope(user, student, db):
        raise HTTPException(status_code=403, detail="Student is outside your authorized HOD year/department scope.")
    if current_role == "mentor":
        ids = await get_mentor_student_ids(user, db)
        if student.id not in ids:
            raise HTTPException(status_code=403, detail="Student is outside your assigned mentor scope.")


def is_user_currently_unavailable(user: User) -> bool:
    if not user or not user.is_unavailable:
        return False
    now = datetime.now(timezone.utc)
    start = user.absence_start
    end = user.absence_end
    if start and start.tzinfo is None:
        start = start.replace(tzinfo=timezone.utc)
    if end and end.tzinfo is None:
        end = end.replace(tzinfo=timezone.utc)
    if start and now < start:
        return False
    if end and now > end:
        return False
    return True


async def get_hods_for_mentor(mentor: User, db: AsyncSession) -> List[User]:
    """HODs covering this mentor's assigned departments/sections/students."""
    res = await db.execute(select(MentorAssignment).where(MentorAssignment.mentor_id == mentor.id))
    assignments = res.scalars().all()
    dept_ids: Set[int] = set()

    for assignment in assignments:
        if assignment.department_id:
            dept_ids.add(assignment.department_id)
        if assignment.section_id:
            section = await db.get(Section, assignment.section_id)
            if section:
                dept_ids.add(section.department_id)
        if assignment.student_id:
            student = await db.get(Student, assignment.student_id)
            if student and student.department_id:
                dept_ids.add(student.department_id)

    if not dept_ids and mentor.college_id:
        dept_res = await db.execute(select(Department.id).where(Department.college_id == mentor.college_id))
        dept_ids.update([row[0] for row in dept_res.all()])

    if not dept_ids:
        return []

    hod_ids: Set[int] = set()
    dept_res = await db.execute(select(Department).where(Department.id.in_(list(dept_ids))))
    for dept in dept_res.scalars().all():
        if dept.hod1_id:
            hod_ids.add(dept.hod1_id)
        if dept.hod2_id:
            hod_ids.add(dept.hod2_id)

    assign_res = await db.execute(
        select(HODAssignment).where(
            HODAssignment.department_id.in_(list(dept_ids)),
            HODAssignment.is_active == True,
        )
    )
    for assignment in assign_res.scalars().all():
        hod_ids.add(assignment.hod_id)

    if not hod_ids:
        return []

    users_res = await db.execute(select(User).where(User.id.in_(list(hod_ids)), User.is_active == True))
    return users_res.scalars().all()


async def mentor_hod_absence_status(mentor: User, db: AsyncSession) -> dict:
    hods = await get_hods_for_mentor(mentor, db)
    unavailable = [hod for hod in hods if is_user_currently_unavailable(hod)]
    if not unavailable:
        return {
            "is_unavailable": False,
            "unavailable_reason": "",
            "absence_start": None,
            "absence_end": None,
            "hod_names": [hod.full_name or hod.username for hod in hods],
        }
    primary = unavailable[0]
    return {
        "is_unavailable": True,
        "unavailable_reason": primary.unavailable_reason or "HOD is out of office",
        "absence_start": primary.absence_start.isoformat() if primary.absence_start else None,
        "absence_end": primary.absence_end.isoformat() if primary.absence_end else None,
        "hod_names": [hod.full_name or hod.username for hod in unavailable],
    }


async def log_audit_event(
    db: AsyncSession,
    user: User,
    action: str,
    entity_type: str,
    entity_id: Optional[str] = None,
    details: Optional[str] = None
):
    """Log an administrative action to the AuditLog table."""
    user_role_str = role_str(user)
    audit = AuditLog(
        college_id=user.college_id,
        user_id=user.id,
        username=user.username,
        user_role=user_role_str,
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id) if entity_id is not None else None,
        details=details
    )
    db.add(audit)
    await db.commit()
