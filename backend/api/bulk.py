from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import distinct, update, func
from typing import List, Optional
from pydantic import BaseModel

from db.database import get_db
from db.models import Student, User, LeaveRequest, LeaveStatus, Department
from api.deps import get_current_user
from datetime import datetime, timezone

router = APIRouter()

class DepartmentItem(BaseModel):
    id: int
    name: str
    code: str

class BulkFilterResponse(BaseModel):
    departments: List[DepartmentItem]
    branches: List[str]
    semesters: List[int]
    sections: List[str]

class BulkPassRequest(BaseModel):
    department_id: Optional[int] = None
    department_code: Optional[str] = None
    branch: Optional[str] = None
    semester: Optional[int] = None
    section: Optional[str] = None
    reason: str = "Section Bulk Outing"
    notes: Optional[str] = None

@router.get("/filters", response_model=BulkFilterResponse)
async def get_bulk_filters(
    college_id: Optional[int] = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    user_role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    target_college_id = college_id or current_user.college_id

    dept_query = select(Department).where(Department.is_active == True)
    if target_college_id:
        dept_query = dept_query.where(Department.college_id == target_college_id)
    depts_res = await db.execute(dept_query)
    depts = [{"id": d.id, "name": d.name, "code": d.code} for d in depts_res.scalars().all()]

    b_query = select(distinct(Student.branch)).where(Student.branch.isnot(None))
    sem_query = select(distinct(Student.semester)).where(Student.semester.isnot(None))
    sec_query = select(distinct(Student.section)).where(Student.section.isnot(None))
    
    if target_college_id:
        b_query = b_query.where(Student.college_id == target_college_id)
        sem_query = sem_query.where(Student.college_id == target_college_id)
        sec_query = sec_query.where(Student.college_id == target_college_id)

    branches_res = await db.execute(b_query)
    semesters_res = await db.execute(sem_query)
    sections_res = await db.execute(sec_query)

    fetched_branches = sorted([b for b, in branches_res.all() if b])
    fetched_semesters = sorted([s for s, in semesters_res.all() if s])
    fetched_sections = sorted([s for s, in sections_res.all() if s])

    # Ensure departments list is always rich and non-empty
    existing_codes = set(d["code"].upper() for d in depts)
    for idx, br in enumerate(fetched_branches):
        if br.upper() not in existing_codes:
            depts.append({"id": 1000 + idx, "name": f"Department of {br}", "code": br})

    return {
        "departments": depts,
        "branches": fetched_branches,
        "semesters": fetched_semesters if fetched_semesters else [1, 2, 3, 4, 5, 6, 7, 8],
        "sections": fetched_sections if fetched_sections else ["A", "B", "C", "D"],
    }

@router.post("/generate-passes")
async def bulk_generate_passes(
    req: BulkPassRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generates and activates gate passes for all matching active students in a section/branch/semester."""
    user_role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    if user_role_str == "super_admin":
        raise HTTPException(status_code=403, detail="Super Admin is forbidden from issuing passes.")

    conditions = [Student.status == "active", Student.college_id == current_user.college_id]
    if req.department_id and req.department_id < 1000:
        conditions.append(Student.department_id == req.department_id)
    elif req.department_code:
        conditions.append(func.lower(Student.branch) == req.department_code.lower())
    elif req.branch:
        conditions.append(func.lower(Student.branch) == req.branch.lower())
    if req.semester:
        conditions.append(Student.semester == req.semester)
    if req.section:
        conditions.append(func.lower(Student.section) == req.section.lower())

    res = await db.execute(select(Student).where(*conditions))
    students = res.scalars().all()

    if not students:
        raise HTTPException(status_code=404, detail="No active students found matching the selected branch/semester/section.")

    now = datetime.now(timezone.utc)
    today_start_utc = now.replace(hour=0, minute=0, second=0, microsecond=0)
    count = 0

    for stud in students:
        # Anti-loophole: Skip student if they have ALREADY EXITED campus today
        existing_exited = await db.execute(
            select(LeaveRequest).where(
                LeaveRequest.student_id == stud.id,
                LeaveRequest.approved_at >= today_start_utc,
                LeaveRequest.status.in_([LeaveStatus.exited, LeaveStatus.returned])
            )
        )
        if existing_exited.scalars().first():
            continue

        # Cancel any active pass first
        await db.execute(
            update(LeaveRequest)
            .where(
                LeaveRequest.student_id == stud.id,
                LeaveRequest.status == LeaveStatus.approved,
                LeaveRequest.gate_activated == True
            )
            .values(status=LeaveStatus.expired, gate_activated=False)
        )

        db.add(LeaveRequest(
            student_id=stud.id,
            reason=req.reason,
            notes=req.notes or f"Bulk section pass for {req.branch or ''} {req.semester or ''} {req.section or ''}".strip(),
            status=LeaveStatus.approved,
            gate_activated=True,
            semester=stud.semester,
            approved_by=current_user.id if current_user else None,
            approved_at=now
        ))
        count += 1

    await db.commit()
    return {
        "status": "success",
        "count": count,
        "message": f"Successfully generated & activated gate passes for {count} students."
    }

