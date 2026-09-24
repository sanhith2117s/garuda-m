from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel
from typing import Optional, List
from db.database import get_db
from db.models import User, UserRole, College, Department
from api.deps import RoleChecker
from core.security import get_password_hash

router = APIRouter()

class UserCreateSchema(BaseModel):
    username: str
    full_name: str
    password: str
    role: str  # "admin" or "hod"
    college_id: Optional[int] = None
    department_id: Optional[int] = None

class UserUpdateSchema(BaseModel):
    full_name: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None
    college_id: Optional[int] = None
    is_active: Optional[bool] = None

@router.get("", response_model=List[dict])
async def list_users(
    college_id: Optional[int] = None,
    role: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(["super_admin", "admin"]))
):
    user_role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    query = select(User).order_by(User.id)
    if user_role_str != "super_admin":
        query = query.where(User.college_id == current_user.college_id)
    elif college_id is not None and college_id > 0:
        query = query.where(User.college_id == college_id)

    if role:
        query = query.where(User.role == role)

    res = await db.execute(query)
    users = res.scalars().all()

    # Pre-fetch colleges and departments for clean names
    col_res = await db.execute(select(College))
    col_map = {c.id: f"{c.name} ({c.code})" for c in col_res.scalars().all()}

    dept_res = await db.execute(select(Department))
    depts = dept_res.scalars().all()
    # Map user_id to assigned departments
    user_dept_map = {}
    for d in depts:
        if d.hod1_id:
            user_dept_map[d.hod1_id] = d.name
        if d.hod2_id:
            user_dept_map[d.hod2_id] = d.name

    output = []
    for u in users:
        role_str = u.role.value if hasattr(u.role, "value") else str(u.role)
        dept_name = user_dept_map.get(u.id)
        output.append({
            "id": u.id,
            "username": u.username,
            "full_name": u.full_name,
            "role": role_str,
            "college_id": u.college_id,
            "college_name": col_map.get(u.college_id) if u.college_id else "Global Super Admin",
            "department_name": dept_name,
            "is_active": u.is_active,
            "created_at": u.created_at.isoformat() if u.created_at else None
        })
    return output


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_user(
    payload: UserCreateSchema,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(["super_admin", "admin"]))
):
    user_role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)

    # Check duplicate username
    res = await db.execute(select(User).where(User.username == payload.username.strip()))
    if res.scalars().first():
        raise HTTPException(status_code=400, detail="Username already exists")

    role_val = payload.role.strip().lower()
    if role_val not in ["admin", "hod", "mentor", "gate_admin", "security"]:
        raise HTTPException(status_code=400, detail="Role must be 'admin', 'hod', 'mentor', or 'security'")

    if role_val in ["admin", "gate_admin"]:
        target_role = UserRole.admin
    elif role_val == "security":
        target_role = UserRole.security
    elif role_val == "mentor":
        target_role = UserRole.mentor
    else:
        target_role = UserRole.hod

    effective_col_id = payload.college_id if (payload.college_id and payload.college_id > 0) else None
    if user_role_str != "super_admin":
        effective_col_id = current_user.college_id

    new_user = User(
        username=payload.username.strip(),
        full_name=payload.full_name.strip(),
        hashed_password=get_password_hash(payload.password),
        role=target_role,
        college_id=effective_col_id,
        is_active=True
    )
    db.add(new_user)
    await db.flush()

    if target_role == UserRole.hod and payload.department_id:
        dept_res = await db.execute(select(Department).where(Department.id == payload.department_id))
        dept = dept_res.scalars().first()
        if dept:
            if not dept.hod1_id:
                dept.hod1_id = new_user.id
            elif not dept.hod2_id:
                dept.hod2_id = new_user.id
            else:
                dept.hod1_id = new_user.id

    await db.commit()
    await db.refresh(new_user)
    return {"id": new_user.id, "username": new_user.username, "message": "User created successfully"}


@router.put("/{user_id}")
async def update_user(
    user_id: int,
    payload: UserUpdateSchema,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(["super_admin", "admin"]))
):
    user_role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    res = await db.execute(select(User).where(User.id == user_id))
    user = res.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user_role_str != "super_admin" and user.college_id != current_user.college_id:
        raise HTTPException(status_code=403, detail="Not authorized to edit users outside your college")

    if payload.full_name is not None:
        user.full_name = payload.full_name.strip()
    if payload.password:
        user.hashed_password = get_password_hash(payload.password)
    if payload.college_id is not None:
        user.college_id = payload.college_id
    if payload.is_active is not None:
        user.is_active = payload.is_active
    if payload.role:
        r_val = payload.role.strip().lower()
        if r_val == "admin":
            user.role = UserRole.admin
        elif r_val == "hod":
            user.role = UserRole.hod
        elif r_val == "mentor":
            user.role = UserRole.mentor
        elif r_val == "security":
            user.role = UserRole.security

    await db.commit()
    return {"message": "User updated successfully"}


@router.delete("/{user_id}")
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(["super_admin", "admin"]))
):
    res = await db.execute(select(User).where(User.id == user_id))
    user = res.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")

    await db.delete(user)
    await db.commit()
    return {"message": "User deleted successfully"}
