from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from db.database import get_db
from db.models import User, Student, College
from schemas.user import UserLogin, Token, PasswordChange
from core.security import verify_password, create_access_token, get_password_hash
from datetime import timedelta
from core.config import settings
from api.deps import get_current_user

router = APIRouter()

@router.post("/login", response_model=Token)
async def login(user_data: UserLogin, db: AsyncSession = Depends(get_db)):
    identifier_clean = user_data.identifier.strip().lower()
    
    # 1. Direct User table lookup (admin, staff, or direct user accounts)
    user_result = await db.execute(
        select(User).where(func.lower(User.username) == identifier_clean)
    )
    user = user_result.scalars().first()

    # 2. Fallback: Student roll_number lookup
    if not user:
        student_result = await db.execute(
            select(Student).where(func.lower(Student.roll_number) == identifier_clean)
        )
        student = student_result.scalars().first()
        if student:
            user_result = await db.execute(select(User).where(User.id == student.user_id))
            user = user_result.scalars().first()

    if not user or not verify_password(user_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user account")

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    role_str = user.role.value if hasattr(user.role, "value") else str(user.role)
    access_token = create_access_token(
        subject=user.username, role=role_str, expires_delta=access_token_expires
    )

    col_name = None
    col_code = None
    if user.college_id:
        col_res = await db.execute(select(College).where(College.id == user.college_id))
        col = col_res.scalars().first()
        if col:
            col_name = col.name
            col_code = col.code

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": role_str,
        "college_id": user.college_id,
        "college_name": col_name,
        "college_code": col_code,
        "username": user.username,
        "full_name": user.full_name
    }
 
@router.post("/change-password")
async def change_password(
    data: PasswordChange, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if data.old_password and not verify_password(data.old_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    if data.confirm_password and data.new_password != data.confirm_password:
        raise HTTPException(status_code=400, detail="New password and confirm password do not match")
    
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    
    current_user.hashed_password = get_password_hash(data.new_password)
    db.add(current_user)
    await db.commit()
    return {"message": "Password updated successfully"}
