from fastapi import APIRouter, Depends, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import Optional
import csv
import io
from db.database import get_db
from db.models import LeaveRequest, LateComer, Student, User
from api.deps import RoleChecker, role_str

router = APIRouter()

@router.get("/gate-passes")
async def export_gate_passes(
    college_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(["super_admin", "admin", "hod"]))
):
    query = select(LeaveRequest, Student).join(Student, LeaveRequest.student_id == Student.id)
    if role_str(current_user) != "super_admin":
        if current_user.college_id:
            query = query.where(Student.college_id == current_user.college_id)
    elif college_id:
        query = query.where(Student.college_id == college_id)

    res = await db.execute(query)
    rows = res.all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Pass ID", "Student Name", "Roll Number", "Admission No", "Reason", "Approved At"])

    for req, stud in rows:
        writer.writerow([
            req.id,
            stud.full_name,
            stud.roll_number,
            stud.admn_no or "",
            req.reason,
            req.approved_at.isoformat() if req.approved_at else ""
        ])

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=gate_passes_log.csv"}
    )


@router.get("/latecomers")
async def export_latecomers(
    college_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(["super_admin", "admin", "hod"]))
):
    query = select(LateComer, Student).join(Student, LateComer.student_id == Student.id)
    if role_str(current_user) != "super_admin":
        if current_user.college_id:
            query = query.where(Student.college_id == current_user.college_id)
    elif college_id:
        query = query.where(Student.college_id == college_id)

    res = await db.execute(query)
    rows = res.all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Log ID", "Student Name", "Roll Number", "Branch", "Section", "Scanned At"])

    for lc, stud in rows:
        writer.writerow([
            lc.id,
            stud.full_name,
            stud.roll_number,
            stud.branch or "",
            stud.section or "",
            lc.scanned_at.isoformat() if lc.scanned_at else ""
        ])

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=latecomers_log.csv"}
    )
