from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from pydantic import BaseModel
from typing import Optional, List
from db.database import get_db
from db.models import Department, User, College, Student
from api.deps import get_current_user, RoleChecker, log_audit_event, role_str

router = APIRouter()

class DepartmentCreateSchema(BaseModel):
    college_id: int
    name: str
    code: str
    is_hs: Optional[bool] = False
    hod1_id: Optional[int] = None
    hod2_id: Optional[int] = None

@router.get("", response_model=List[dict])
async def list_departments(
    college_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = select(Department)
    if role_str(current_user) != "super_admin":
        if current_user.college_id:
            query = query.where(Department.college_id == current_user.college_id)
    elif college_id:
        query = query.where(Department.college_id == college_id)

    res = await db.execute(query)
    depts = res.scalars().all()

    user_res = await db.execute(select(User))
    user_map = {u.id: u.full_name or u.username for u in user_res.scalars().all()}

    col_res = await db.execute(select(College))
    col_map = {c.id: c.name for c in col_res.scalars().all()}

    result = []
    for d in depts:
        # Count enrolled students for this department
        stud_count_res = await db.execute(
            select(func.count(Student.id)).where(Student.department_id == d.id)
        )
        student_count = stud_count_res.scalar() or 0

        result.append({
            "id": d.id,
            "college_id": d.college_id,
            "college_name": col_map.get(d.college_id),
            "name": d.name,
            "code": d.code,
            "is_hs": d.is_hs,
            "hod1_id": d.hod1_id,
            "hod1_name": user_map.get(d.hod1_id),
            "hod2_id": d.hod2_id,
            "hod2_name": user_map.get(d.hod2_id),
            "student_count": student_count,
            "is_active": d.is_active,
            "created_at": d.created_at.isoformat() if d.created_at else None
        })

    return result

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_department(
    payload: DepartmentCreateSchema,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(["super_admin", "admin"]))
):
    new_dept = Department(
        college_id=payload.college_id,
        name=payload.name.strip(),
        code=payload.code.strip().upper(),
        is_hs=payload.is_hs,
        hod1_id=payload.hod1_id,
        hod2_id=payload.hod2_id
    )
    db.add(new_dept)
    await db.commit()
    await db.refresh(new_dept)

    await log_audit_event(
        db, current_user, "DEPARTMENT_CREATED", "Department", new_dept.id,
        f"Created department {new_dept.name} ({new_dept.code})"
    )

    return {"id": new_dept.id, "name": new_dept.name, "code": new_dept.code}


class DepartmentUpdateSchema(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    is_hs: Optional[bool] = None
    hod1_id: Optional[int] = None
    hod2_id: Optional[int] = None

@router.put("/{dept_id}")
async def update_department(
    dept_id: int,
    payload: DepartmentUpdateSchema,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(["super_admin", "admin"]))
):
    dept = await db.get(Department, dept_id)
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found.")

    if payload.name is not None:
        dept.name = payload.name.strip()
    if payload.code is not None:
        dept.code = payload.code.strip().upper()
    if payload.is_hs is not None:
        dept.is_hs = payload.is_hs
    if payload.hod1_id is not None:
        dept.hod1_id = payload.hod1_id if payload.hod1_id > 0 else None
    if payload.hod2_id is not None:
        dept.hod2_id = payload.hod2_id if payload.hod2_id > 0 else None

    await db.commit()
    await db.refresh(dept)

    # Sync HODAssignment table if hod1_id is assigned
    if dept.hod1_id:
        from db.models import HODAssignment
        existing_assign = (await db.execute(
            select(HODAssignment).where(
                HODAssignment.hod_id == dept.hod1_id,
                HODAssignment.department_id == dept.id
            )
        )).scalars().first()

        if not existing_assign:
            new_assign = HODAssignment(
                hod_id=dept.hod1_id,
                college_id=dept.college_id,
                department_id=dept.id,
                is_active=True
            )
            db.add(new_assign)
            await db.commit()

    await log_audit_event(
        db, current_user, "DEPARTMENT_UPDATED", "Department", dept.id,
        f"Updated department {dept.name} ({dept.code}) HOD1={dept.hod1_id} HOD2={dept.hod2_id}"
    )

    return {"detail": "Department updated successfully", "id": dept.id}


@router.delete("/{dept_id}")
async def delete_department(
    dept_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(["super_admin", "admin"]))
):
    dept = await db.get(Department, dept_id)
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found.")

    # Guard check: Ensure zero students are enrolled before allowing deletion
    stud_count_res = await db.execute(
        select(func.count(Student.id)).where(Student.department_id == dept_id)
    )
    student_count = stud_count_res.scalar() or 0
    if student_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete department '{dept.name}' because {student_count} students are currently enrolled in it."
        )

    await db.delete(dept)
    await db.commit()

    await log_audit_event(
        db, current_user, "DEPARTMENT_DELETED", "Department", dept_id,
        f"Deleted empty department {dept.name}"
    )

    return {"detail": "Department deleted successfully."}
