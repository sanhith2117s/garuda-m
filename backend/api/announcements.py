from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import or_
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone

from db.database import get_db
from db.models import User, Announcement, Notification
from api.deps import RoleChecker, get_current_user, log_audit_event

router = APIRouter()


class AnnouncementCreate(BaseModel):
    title: str
    content: str
    college_id: Optional[int] = None
    target_role: Optional[str] = None
    expires_at: Optional[str] = None  # ISO format


@router.get("/announcements")
async def list_announcements(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    user_role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    
    query = select(Announcement).where(
        or_(Announcement.college_id.is_(None), Announcement.college_id == current_user.college_id),
        or_(Announcement.target_role.is_(None), Announcement.target_role == user_role_str)
    ).order_by(Announcement.created_at.desc())

    res = await db.execute(query)
    announcements = res.scalars().all()

    return [
        {
            "id": a.id,
            "title": a.title,
            "content": a.content,
            "college_id": a.college_id,
            "target_role": a.target_role,
            "created_at": a.created_at.isoformat() if a.created_at else None,
            "expires_at": a.expires_at.isoformat() if a.expires_at else None
        }
        for a in announcements
    ]


@router.post("/announcements")
async def create_announcement(
    body: AnnouncementCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(["super_admin", "admin"]))
):
    user_role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    target_college = body.college_id if user_role_str == "super_admin" else current_user.college_id

    expires_dt = None
    if body.expires_at:
        try:
            expires_dt = datetime.fromisoformat(body.expires_at.replace("Z", "+00:00"))
        except Exception:
            pass

    announcement = Announcement(
        college_id=target_college,
        target_role=body.target_role,
        title=body.title,
        content=body.content,
        created_by=current_user.id,
        created_at=datetime.now(timezone.utc),
        expires_at=expires_dt
    )
    db.add(announcement)
    await db.commit()
    await db.refresh(announcement)

    await log_audit_event(
        db, current_user, "CREATE_ANNOUNCEMENT", "Announcement", announcement.id,
        f"Posted announcement: {body.title} (Target Role: {body.target_role})"
    )

    return {"message": "Announcement created successfully.", "id": announcement.id}


@router.get("/notifications")
async def get_user_notifications(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    res = await db.execute(
        select(Notification).where(Notification.user_id == current_user.id).order_by(Notification.created_at.desc()).limit(20)
    )
    notifications = res.scalars().all()

    return [
        {
            "id": n.id,
            "title": n.title,
            "message": n.message,
            "type": n.type,
            "is_read": n.is_read,
            "link": n.link,
            "created_at": n.created_at.isoformat() if n.created_at else None
        }
        for n in notifications
    ]


@router.post("/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    notification = await db.get(Notification, notification_id)
    if not notification or notification.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Notification not found")

    notification.is_read = True
    await db.commit()

    return {"message": "Marked as read"}
