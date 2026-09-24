"""
HOD Year Allotments API Router
==============================
CRUD endpoints for assigning HOD users to specific Colleges, Departments, and Academic Years (1-4).
Supports single or multi-year check selections and syncs with Department.hod1_id.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel
from typing import Optional, List
from db.database import get_db
from db.models import User, UserRole, HODAssignment, Department, College
from api.deps import RoleChecker, log_audit_event

router = APIRouter(prefix="/api/admin/hod-assignments", tags=["HOD Assignments"])


class HODAssignmentCreate(BaseModel):
    hod_id: int
    department_id: int
    year: Optional[int] = None           # Single year or None for all years
    years: Optional[List[int]] = None    # Multi-year selection e.g. [2, 3]


class HODAssignmentResponse(BaseModel):
    id: int
    hod_id: int
    hod_name: str
    hod_username: str
    college_id: int
    college_name: str
    department_id: int
    department_name: str
    year: Optional[int] = None
    created_at: Optional[str] = None


@router.get("", response_model=List[HODAssignmentResponse])
async def list_hod_assignments(
    college_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(["super_admin", "admin"]))
):
    # 1. Fetch active HODAssignment records
    query = select(HODAssignment).where(HODAssignment.is_active == True)
    if college_id:
        query = query.where(HODAssignment.college_id == college_id)
    elif current_user.college_id:
        query = query.where(HODAssignment.college_id == current_user.college_id)

    res = await db.execute(query)
    assignments = list(res.scalars().all())

    # 2. Check for pre-assigned Department.hod1_id or hod2_id that might not be in HODAssignment
    dept_query = select(Department)
    if college_id:
        dept_query = dept_query.where(Department.college_id == college_id)
    elif current_user.college_id:
        dept_query = dept_query.where(Department.college_id == current_user.college_id)

    dept_res = await db.execute(dept_query)
    departments = dept_res.scalars().all()

    existing_pairs = {(a.hod_id, a.department_id) for a in assignments}
    synced_any = False

    for dept in departments:
        hod_ids = [h_id for h_id in [dept.hod1_id, dept.hod2_id] if h_id]
        target_year = 1 if dept.is_hs else None

        for h_id in hod_ids:
            if (h_id, dept.id) not in existing_pairs:
                hod_usr = await db.get(User, h_id)
                if hod_usr:
                    new_a = HODAssignment(
                        hod_id=h_id,
                        college_id=dept.college_id,
                        department_id=dept.id,
                        year=target_year,
                        is_active=True
                    )
                    db.add(new_a)
                    assignments.append(new_a)
                    existing_pairs.add((h_id, dept.id))
                    synced_any = True

    if synced_any:
        await db.commit()

    result = []
    for a in assignments:
        hod_usr = await db.get(User, a.hod_id)
        col = await db.get(College, a.college_id)
        dept = await db.get(Department, a.department_id)

        result.append(HODAssignmentResponse(
            id=a.id,
            hod_id=a.hod_id,
            hod_name=hod_usr.full_name if hod_usr else "Unknown",
            hod_username=hod_usr.username if hod_usr else "",
            college_id=a.college_id,
            college_name=col.name if col else "",
            department_id=a.department_id,
            department_name=dept.name if dept else "",
            year=a.year,
            created_at=a.created_at.isoformat() if a.created_at else None
        ))

    return result


@router.post("", response_model=List[HODAssignmentResponse])
async def create_hod_assignment(
    payload: HODAssignmentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(["super_admin", "admin"]))
):
    hod_usr = await db.get(User, payload.hod_id)
    if not hod_usr or hod_usr.role != UserRole.hod:
        raise HTTPException(status_code=400, detail="User specified is not an active HOD user.")

    dept = await db.get(Department, payload.department_id)
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found.")

    target_college_id = dept.college_id
    col = await db.get(College, target_college_id)

    # Sync Department.hod1_id if unassigned
    if not dept.hod1_id:
        dept.hod1_id = payload.hod_id
    elif dept.hod1_id != payload.hod_id and not dept.hod2_id:
        dept.hod2_id = payload.hod_id

    # Determine list of years to assign
    target_years = payload.years if (payload.years and len(payload.years) > 0) else [payload.year]

    created_assignments = []
    for yr in target_years:
        assignment = HODAssignment(
            hod_id=payload.hod_id,
            college_id=target_college_id,
            department_id=payload.department_id,
            year=yr,
            is_active=True
        )
        db.add(assignment)
        await db.commit()
        await db.refresh(assignment)

        created_assignments.append(HODAssignmentResponse(
            id=assignment.id,
            hod_id=assignment.hod_id,
            hod_name=hod_usr.full_name,
            hod_username=hod_usr.username,
            college_id=target_college_id,
            college_name=col.name if col else "",
            department_id=dept.id,
            department_name=dept.name,
            year=assignment.year,
            created_at=assignment.created_at.isoformat() if assignment.created_at else None
        ))

        await log_audit_event(
            db, current_user, "HOD_ASSIGNMENT_CREATED", "HODAssignment", assignment.id,
            f"Assigned HOD {hod_usr.username} to Dept {dept.code} (Year: {yr or 'All'})"
        )

    return created_assignments


@router.delete("/{assignment_id}")
async def delete_hod_assignment(
    assignment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(["super_admin", "admin"]))
):
    assignment = await db.get(HODAssignment, assignment_id)
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found.")

    # Also clear Department.hod1_id or hod2_id if mapped
    dept = await db.get(Department, assignment.department_id)
    if dept:
        if dept.hod1_id == assignment.hod_id:
            dept.hod1_id = None
        elif dept.hod2_id == assignment.hod_id:
            dept.hod2_id = None

    await db.delete(assignment)
    await db.commit()

    await log_audit_event(
        db, current_user, "HOD_ASSIGNMENT_DELETED", "HODAssignment", assignment_id,
        "Removed HOD Year Assignment"
    )

    return {"detail": "Assignment removed successfully"}
