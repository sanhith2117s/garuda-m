from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel
from typing import Optional, List
from db.database import get_db
from db.models import College, User
from api.deps import get_current_user, RoleChecker, role_str

router = APIRouter()

class CollegeCreateSchema(BaseModel):
    name: str
    code: str
    address: Optional[str] = None

class CollegeUpdateSchema(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    address: Optional[str] = None
    is_active: Optional[bool] = None

@router.get("", response_model=List[dict])
async def list_colleges(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = select(College)
    if role_str(current_user) != "super_admin":
        if current_user.college_id:
            query = query.where(College.id == current_user.college_id)

    res = await db.execute(query)
    colleges = res.scalars().all()
    return [
        {
            "id": c.id,
            "name": c.name,
            "code": c.code,
            "address": c.address,
            "is_active": c.is_active,
            "created_at": c.created_at.isoformat() if c.created_at else None
        }
        for c in colleges
    ]

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_college(
    payload: CollegeCreateSchema,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(["super_admin"]))
):
    res = await db.execute(select(College).where(College.code == payload.code.strip().upper()))
    if res.scalars().first():
        raise HTTPException(status_code=400, detail="College code already exists")

    new_college = College(
        name=payload.name.strip(),
        code=payload.code.strip().upper(),
        address=payload.address.strip() if payload.address else None
    )
    db.add(new_college)
    await db.commit()
    await db.refresh(new_college)
    return {"id": new_college.id, "name": new_college.name, "code": new_college.code}
