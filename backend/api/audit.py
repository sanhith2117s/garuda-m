from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import Optional

from db.database import get_db
from db.models import User, AuditLog
from api.deps import RoleChecker

router = APIRouter()


@router.get("/audit-logs")
async def get_audit_logs(
    college_id: Optional[int] = Query(None),
    role: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    limit: int = Query(100, le=500),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(["super_admin", "admin"]))
):
    user_role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    query = select(AuditLog).order_by(AuditLog.created_at.desc())

    effective_college = college_id if user_role_str == "super_admin" else current_user.college_id
    if effective_college:
        query = query.where(AuditLog.college_id == effective_college)

    if role:
        query = query.where(AuditLog.user_role == role)

    if action:
        query = query.where(AuditLog.action.ilike(f"%{action}%"))

    query = query.limit(limit)

    res = await db.execute(query)
    logs = res.scalars().all()

    return [
        {
            "id": log.id,
            "college_id": log.college_id,
            "user_id": log.user_id,
            "username": log.username,
            "user_role": log.user_role,
            "action": log.action,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "details": log.details or "",
            "created_at": log.created_at.isoformat() if log.created_at else None
        }
        for log in logs
    ]
