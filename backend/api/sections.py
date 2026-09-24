from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from pydantic import BaseModel
from typing import Optional, List
import csv
import io

from db.database import get_db
from db.models import User, Section, Department, Student
from api.deps import RoleChecker, get_current_user, log_audit_event

router = APIRouter()


class SectionCreate(BaseModel):
    department_id: int
    name: str  # e.g., "A", "B", "C"


class SectionUpdate(BaseModel):
    name: Optional[str] = None
    is_active: Optional[bool] = None


class BulkSectionValidateRow(BaseModel):
    admn_no: str
    new_section: str


ROMAN_YEARS = {1: "I", 2: "II", 3: "III", 4: "IV"}


def format_section_name(year: int, dept_code: str, sec_name: str) -> str:
    r_yr = ROMAN_YEARS.get(year or 1, "I")
    sec = (sec_name or "").strip()
    dept = (dept_code or "").strip()

    if not sec:
        return f"{r_yr} {dept}".strip()
    if any(sec.startswith(prefix) for prefix in ("I ", "II ", "III ", "IV ", "I-", "II-", "III-", "IV-")):
        return sec
    if dept and dept.upper() in sec.upper():
        return f"{r_yr} {sec}".strip()
    return f"{r_yr} {dept} {sec}".strip()


@router.get("")
async def list_sections(
    department_id: Optional[int] = Query(None),
    college_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    user_role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    query = select(Section).where(Section.is_active == True)

    effective_college = college_id if user_role_str == "super_admin" else current_user.college_id
    if effective_college:
        query = query.where(Section.college_id == effective_college)

    if department_id:
        query = query.where(Section.department_id == department_id)

    res = await db.execute(query)
    sections = res.scalars().all()

    dept_res = await db.execute(select(Department))
    dept_map = {d.id: d.code for d in dept_res.scalars().all()}

    out = []
    for s in sections:
        yr = getattr(s, "year", 1) or 1
        r_yr = ROMAN_YEARS.get(yr, "I")
        d_code = dept_map.get(s.department_id) or ""
        fmt_name = format_section_name(yr, d_code, s.name)
        out.append({
            "id": s.id,
            "college_id": s.college_id,
            "department_id": s.department_id,
            "year": yr,
            "year_roman": r_yr,
            "name": s.name,
            "display_name": fmt_name,
            "formatted_name": fmt_name,
            "is_active": s.is_active,
            "created_at": s.created_at.isoformat() if s.created_at else None
        })
    return out


@router.post("")
async def create_section(
    body: SectionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(["super_admin", "admin"]))
):
    dept = await db.get(Department, body.department_id)
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    sec_name = body.name.strip().upper()
    existing_res = await db.execute(
        select(Section).where(
            Section.college_id == dept.college_id,
            Section.department_id == body.department_id,
            func.upper(Section.name) == sec_name
        )
    )
    if existing_res.scalars().first():
        raise HTTPException(status_code=400, detail=f"Section '{sec_name}' already exists in this department.")

    section = Section(
        college_id=dept.college_id,
        department_id=body.department_id,
        name=sec_name,
        is_active=True
    )
    db.add(section)
    await db.commit()
    await db.refresh(section)

    await log_audit_event(
        db, current_user, "CREATE_SECTION", "Section", section.id,
        f"Created Section {sec_name} for Department {dept.code}"
    )

    return {
        "id": section.id,
        "college_id": section.college_id,
        "department_id": section.department_id,
        "name": section.name,
        "is_active": section.is_active
    }


@router.post("/bulk-validate")
@router.post("/validate-shuffle")
async def bulk_validate_section_csv(
    csv_file: Optional[UploadFile] = File(None),
    file: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(["super_admin", "admin"]))
):
    """
    Step 1 of Bulk Section Update: Validate CSV rows (admn_no, new_section)
    Returns preview report with valid and error counters. Does NOT mutate DB.
    """
    upload_file = csv_file or file
    if not upload_file:
        raise HTTPException(status_code=400, detail="No CSV file provided.")

    user_role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    csv_bytes = await upload_file.read()
    try:
        csv_text = csv_bytes.decode("utf-8-sig")
    except Exception:
        raise HTTPException(status_code=400, detail="CSV file must be UTF-8 encoded.")

    reader = csv.DictReader(io.StringIO(csv_text))
    if not reader.fieldnames:
        raise HTTPException(status_code=400, detail="CSV is empty or missing headers.")

    valid_rows = []
    error_rows = []

    for i, raw_row in enumerate(reader, start=2):
        row = {k.strip().lower(): (v or "").strip() for k, v in raw_row.items() if k}
        admn = row.get("admn_no") or row.get("admn") or row.get("roll_number") or row.get("roll")
        new_sec_name = row.get("new_section") or row.get("section")

        if not admn or not new_sec_name:
            error_rows.append({"row": i, "admn": admn or "N/A", "reason": "Missing admn_no or new_section"})
            continue

        # Find student
        stud_query = select(Student).where(
            (func.lower(Student.admn_no) == admn.lower()) | (func.lower(Student.roll_number) == admn.lower())
        )
        if user_role_str != "super_admin" and current_user.college_id:
            stud_query = stud_query.where(Student.college_id == current_user.college_id)

        stud_res = await db.execute(stud_query)
        student = stud_res.scalars().first()

        if not student:
            error_rows.append({"row": i, "admn": admn, "reason": "Student not found in authorized college scope"})
            continue

        sec_name = new_sec_name.strip().upper()
        # Find section entity or verify if it exists
        sec_res = await db.execute(
            select(Section).where(
                Section.college_id == student.college_id,
                Section.department_id == student.department_id,
                (func.upper(Section.name) == sec_name) | (Section.name.ilike(f"%{sec_name}%"))
            )
        )
        section_obj = sec_res.scalars().first()
        if not section_obj:
            # Auto-create section record for this student's department if it does not exist
            section_obj = Section(
                college_id=student.college_id,
                department_id=student.department_id,
                name=sec_name,
                is_active=True
            )
            db.add(section_obj)
            await db.commit()
            await db.refresh(section_obj)

        valid_rows.append({
            "student_id": student.id,
            "full_name": student.full_name,
            "roll_number": student.roll_number,
            "admn_no": student.admn_no,
            "old_section": student.section or "N/A",
            "new_section": sec_name,
            "new_section_id": section_obj.id
        })

    return {
        "total_records": len(valid_rows) + len(error_rows),
        "valid_count": len(valid_rows),
        "error_count": len(error_rows),
        "valid_rows": valid_rows,
        "error_rows": error_rows
    }


@router.post("/bulk-commit")
@router.post("/commit-shuffle")
async def bulk_commit_section_update(
    payload: dict | List[dict],
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(["super_admin", "admin"]))
):
    """
    Step 2 of Bulk Section Update: Commit validated section changes after Admin confirmation.
    """
    items = []
    if isinstance(payload, dict):
        items = payload.get("updates", [])
    elif isinstance(payload, list):
        items = payload

    updated_count = 0
    for item in items:
        student_id = item.get("student_id")
        new_section = item.get("new_section")
        new_section_id = item.get("new_section_id")

        if not student_id:
            continue

        student = await db.get(Student, student_id)
        if student:
            if new_section:
                student.section = new_section
            if new_section_id:
                student.section_id = new_section_id
                sec_obj = await db.get(Section, new_section_id)
                if sec_obj and not new_section:
                    student.section = sec_obj.name
            updated_count += 1

    await db.commit()

    await log_audit_event(
        db, current_user, "BULK_SECTION_UPDATE", "Student", None,
        f"Committed bulk section update for {updated_count} students."
    )
    return {"status": "success", "updated_count": updated_count}

class InteractiveTransferSchema(BaseModel):
    student_ids: List[int]
    target_section: str
    target_section_id: Optional[int] = None

@router.post("/interactive-transfer")
async def interactive_transfer_sections(
    payload: InteractiveTransferSchema,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(["super_admin", "admin"]))
):
    target_sec_name = payload.target_section.strip().upper()
    updated_count = 0

    for sid in payload.student_ids:
        student = await db.get(Student, sid)
        if student:
            student.section = target_sec_name
            if payload.target_section_id:
                student.section_id = payload.target_section_id
            updated_count += 1

    await db.commit()
    await log_audit_event(
        db, current_user, "INTERACTIVE_SECTION_TRANSFER", "Student", None,
        f"Transferred {updated_count} students to Section {target_sec_name}"
    )
    return {"message": f"Successfully transferred {updated_count} students to Section {target_sec_name}."}
