"""
Student Onboarding API
======================
Handles bulk student registration for:
  - New Students  → Semester 1
  - Lateral Entry → Semester 3

Upload Requirements:
  - students.csv  : CSV file with student data
  - photos.zip    : ZIP file where each photo is named {roll_number}.jpg / .jpeg / .png

CSV columns (header required):
  admn_no, roll_number, full_name, password, parent_phone, mentor_id, hod_id, branch, section

Response includes a full report of:
  ✅ added          – Data + photo present, student created
  ⚠️ added_no_photo – Data present, photo missing (student created, photo not saved)
  ⚠️ photo_no_data  – Photo present in ZIP, no matching CSV row
  ❌ duplicate      – roll_number or admn_no already exists in DB
  ❌ invalid_row    – Missing required fields in CSV row
  ❌ photo_error    – Photo extraction failed for a specific file
"""

import io
import os
import csv
import zipfile
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from db.database import get_db
from db.models import Student, User
from api.auth import get_current_user

from pydantic import BaseModel
from db.models import College

router = APIRouter()

PHOTOS_DIR = "static/photos"
REQUIRED_CSV_FIELDS = {"admn_no", "roll_number", "full_name"}

VALID_IMAGE_EXTS = {".jpg", ".jpeg", ".png"}


def validate_roll_number(roll_number: str, college_code: Optional[str] = None) -> tuple[bool, str, Optional[str]]:
    """
    Validates student roll number pattern:
    - Must be exactly 12 characters.
    - 3rd & 4th digits (indices 2:4) denote college:
        - "53" -> NGIT (e.g. 245324733255)
        - "55" -> KMEC (e.g. 245525733187)
    Returns: (is_valid, error_message, detected_college_code)
    """
    roll = roll_number.strip().upper()
    if len(roll) != 12:
        return False, f"Roll number '{roll_number}' must be exactly 12 characters (found {len(roll)} chars).", None

    code_digits = roll[2:4]
    detected_code = None
    if code_digits == "53":
        detected_code = "NGIT"
    elif code_digits == "55":
        detected_code = "KMEC"
    else:
        return False, f"Roll number '{roll_number}' has invalid college code '{code_digits}' at digits 3-4. Expected '53' (NGIT) or '55' (KMEC).", None

    if college_code:
        expected = college_code.strip().upper()
        if expected == "NGIT" and code_digits != "53":
            return False, f"Roll number '{roll_number}' is invalid for NGIT. Digits 3-4 must be '53' (e.g. 245324733255).", detected_code
        elif expected == "KMEC" and code_digits != "55":
            return False, f"Roll number '{roll_number}' is invalid for KMEC. Digits 3-4 must be '55' (e.g. 245525733187).", detected_code

    return True, "", detected_code


class SingleStudentRequest(BaseModel):
    college_id: Optional[int] = None
    roll_number: str
    admn_no: Optional[str] = None
    full_name: str
    semester: int = 1
    branch: Optional[str] = "CSE"
    section: Optional[str] = "A"
    status: Optional[str] = "active"


async def get_admin_user(current_user: User = Depends(get_current_user)):
    user_role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    if user_role_str not in ("super_admin", "admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


def _resolve_user_id(db_users: dict, identifier: str) -> Optional[int]:
    """Resolve a username or numeric ID string to a user DB id."""
    if not identifier:
        return None
    if identifier.isdigit():
        uid = int(identifier)
        return uid if uid in db_users.values() else None
    # Look up by username
    return db_users.get(identifier.strip())


@router.post("/students/single")
async def add_single_student(
    body: SingleStudentRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    roll = body.roll_number.strip().upper()
    admn = (body.admn_no or roll).strip()

    user_role_str = admin.role.value if hasattr(admin.role, "value") else str(admin.role)
    target_college_id = body.college_id if user_role_str == "super_admin" else admin.college_id

    if not target_college_id:
        col_res = await db.execute(select(College.id).order_by(College.id))
        target_college_id = col_res.scalars().first()

    target_col = (await db.execute(select(College).where(College.id == target_college_id))).scalars().first()
    target_code = target_col.code if target_col else None

    # Roll number validation
    is_valid, err_msg, detected_code = validate_roll_number(roll, target_code)
    if not is_valid:
        raise HTTPException(status_code=400, detail=err_msg)

    # Duplicate checks
    existing_roll = (await db.execute(select(Student).where(Student.roll_number == roll))).scalars().first()
    if existing_roll:
        raise HTTPException(status_code=400, detail=f"Roll number '{roll}' already exists.")

    existing_admn = (await db.execute(select(Student).where(Student.admn_no == admn, Student.college_id == target_college_id))).scalars().first()
    if existing_admn:
        raise HTTPException(
            status_code=400,
            detail=f"Admission number '{admn}' is already assigned to student '{existing_admn.full_name}' ({existing_admn.roll_number})."
        )

    new_st = Student(
        college_id=target_college_id,
        roll_number=roll,
        admn_no=admn,
        full_name=body.full_name.strip(),
        semester=body.semester,
        branch=(body.branch or "CSE").upper(),
        section=(body.section or "A").upper(),
        status=body.status or "active"
    )
    db.add(new_st)
    await db.commit()
    return {"message": f"Student '{roll}' ({body.full_name}) created successfully."}


@router.post("/students/onboard")
async def onboard_students(
    entry_type: str = Form(...),          # "new" (Sem 1) | "lateral" (Sem 3)
    college_id: Optional[int] = Form(None),
    csv_file: UploadFile = File(...),
    photos_zip: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """
    Bulk-register students from a CSV + optional photos ZIP.
    entry_type: "new" → semester 1, "lateral" → semester 3
    """
    if entry_type not in ("new", "lateral"):
        raise HTTPException(status_code=400, detail="entry_type must be 'new' (Regular) or 'lateral' (Lateral Entry)")

    target_semester = 1 if entry_type == "new" else 3

    user_role_str = admin.role.value if hasattr(admin.role, "value") else str(admin.role)
    target_college_id = college_id if user_role_str == "super_admin" else admin.college_id

    if not target_college_id:
        col_res = await db.execute(select(College.id).order_by(College.id))
        target_college_id = col_res.scalars().first()

    target_college = (await db.execute(select(College).where(College.id == target_college_id))).scalars().first()
    target_college_code = target_college.code if target_college else None

    # ── 1. Pre-load all existing usernames / roll_numbers / admn_nos ──────────
    existing_usernames: set = set()
    existing_roll_numbers: set = set()
    existing_admn_nos: set = set()

    users_res = await db.execute(select(User.username, User.id))
    db_users_by_username: dict = {row[0]: row[1] for row in users_res.all()}

    students_res = await db.execute(select(Student.roll_number, Student.admn_no))
    for roll, admn in students_res.all():
        if roll:
            existing_roll_numbers.add(roll.lower())
        if admn:
            existing_admn_nos.add(str(admn).lower())

    existing_usernames = set(db_users_by_username.keys())

    # ── 2. Parse CSV ──────────────────────────────────────────────────────────
    csv_bytes = await csv_file.read()
    try:
        csv_text = csv_bytes.decode("utf-8-sig")   # handles BOM
    except Exception:
        raise HTTPException(status_code=400, detail="CSV file must be UTF-8 encoded")

    reader = csv.DictReader(io.StringIO(csv_text))
    if not reader.fieldnames:
        raise HTTPException(status_code=400, detail="CSV appears empty or has no header")

    # Normalise header names
    header = {h.strip().lower() for h in reader.fieldnames}
    missing_cols = REQUIRED_CSV_FIELDS - header
    if missing_cols:
        raise HTTPException(
            status_code=400,
            detail=f"CSV missing required columns: {', '.join(sorted(missing_cols))}"
        )

    csv_rows: list[dict] = []
    invalid_rows: list[dict] = []
    duplicate_rows: list[dict] = []

    for i, raw_row in enumerate(reader, start=2):    # row 1 = header
        row = {k.strip().lower(): (v or "").strip() for k, v in raw_row.items() if k}

        # Validate required fields
        missing = [f for f in REQUIRED_CSV_FIELDS if not row.get(f)]
        if missing:
            invalid_rows.append({
                "row": i,
                "roll_number": row.get("roll_number", ""),
                "reason": f"Missing fields: {', '.join(missing)}"
            })
            continue

        raw_roll = row["roll_number"]
        admn = row["admn_no"].lower()

        # Pattern validation (53 for NGIT, 55 for KMEC)
        is_valid_roll, roll_err, detected_code = validate_roll_number(raw_roll, target_college_code)
        if not is_valid_roll:
            invalid_rows.append({
                "row": i,
                "roll_number": raw_roll,
                "reason": roll_err
            })
            continue

        roll = raw_roll.lower()
        admn = row["admn_no"].lower()

        # Duplicate check
        if roll in existing_roll_numbers:
            duplicate_rows.append({
                "row": i,
                "roll_number": row["roll_number"],
                "reason": "roll_number already exists"
            })
            continue
        if admn in existing_admn_nos:
            duplicate_rows.append({
                "row": i,
                "roll_number": row["roll_number"],
                "reason": "admn_no already exists"
            })
            continue
        if roll in existing_usernames:
            duplicate_rows.append({
                "row": i,
                "roll_number": row["roll_number"],
                "reason": "username (roll_number) already taken"
            })
            continue

        # Track to prevent in-batch duplicates
        existing_roll_numbers.add(roll)
        existing_admn_nos.add(admn)
        existing_usernames.add(roll)
        csv_rows.append(row)

    # ── 3. Parse ZIP photos ───────────────────────────────────────────────────
    photos_by_roll: dict[str, bytes] = {}   # roll_number_lower → raw bytes
    photo_no_data: list[str] = []
    photo_errors: list[dict] = []

    if photos_zip:
        zip_bytes = await photos_zip.read()
        try:
            with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
                for name in zf.namelist():
                    basename = os.path.basename(name)
                    if not basename:   # skip directories
                        continue
                    stem, ext = os.path.splitext(basename)
                    if ext.lower() not in VALID_IMAGE_EXTS:
                        continue
                    roll_key = stem.lower()
                    try:
                        photos_by_roll[roll_key] = zf.read(name)
                    except Exception as e:
                        photo_errors.append({"file": basename, "reason": str(e)})
        except zipfile.BadZipFile:
            raise HTTPException(status_code=400, detail="photos_zip is not a valid ZIP file")

    # ── 4. Insert students ────────────────────────────────────────────────────
    os.makedirs(PHOTOS_DIR, exist_ok=True)

    added: list[dict] = []
    added_no_photo: list[dict] = []

    for row in csv_rows:
        roll = row["roll_number"]
        roll_key = roll.lower()

        branch = row.get("branch", "").strip().upper() or "CSE"
        section = row.get("section", "").strip().upper() or "A"
        

        row_sem = row.get("semester", "").strip()
        if row_sem and row_sem.isdigit():
            sem_val = int(row_sem)
        else:
            sem_val = target_semester

        # Create Student profile directly
        new_student = Student(
            college_id=target_college_id,
            full_name=row["full_name"],
            admn_no=row["admn_no"],
            roll_number=roll,
            branch=branch,
            section=section,
            semester=sem_val,
            status="active"
        )
        db.add(new_student)

        # Handle photo
        photo_data = photos_by_roll.pop(roll_key, None)
        if photo_data:
            photo_path = os.path.join(PHOTOS_DIR, f"{roll}.jpg")
            try:
                with open(photo_path, "wb") as f:
                    f.write(photo_data)
                added.append({"roll_number": roll, "name": row["full_name"]})
            except Exception as e:
                photo_errors.append({"file": f"{roll}.jpg", "reason": str(e)})
                added_no_photo.append({"roll_number": roll, "name": row["full_name"], "note": "photo write failed"})
        else:
            added_no_photo.append({"roll_number": roll, "name": row["full_name"], "note": "photo not in ZIP"})

    await db.commit()

    # Photos in ZIP that had no matching CSV row
    for roll_key in photos_by_roll:
        photo_no_data.append(roll_key)

    # ── 5. Build report ───────────────────────────────────────────────────────
    total_processed = len(csv_rows)
    return {
        "summary": {
            "entry_type": entry_type,
            "target_semester": target_semester,
            "total_csv_rows": total_processed + len(invalid_rows) + len(duplicate_rows),
            "added": len(added),
            "added_no_photo": len(added_no_photo),
            "duplicates_skipped": len(duplicate_rows),
            "invalid_rows": len(invalid_rows),
            "photos_without_data": len(photo_no_data),
            "photo_errors": len(photo_errors),
        },
        "details": {
            "added": added,
            "added_no_photo": added_no_photo,
            "duplicates": duplicate_rows,
            "invalid_rows": invalid_rows,
            "photos_without_data": photo_no_data,
            "photo_errors": photo_errors,
        }
    }
