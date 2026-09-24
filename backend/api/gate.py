from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, and_, update, or_
from sqlalchemy.orm import selectinload
from db.database import get_db
from db.models import User, Student, Semester, LateComer, LunchPass, LunchScan, LeaveRequest, LeaveStatus, CustomPassType, CustomPassAssignment, CustomPassScan, College
from api.deps import RoleChecker, get_current_user
from datetime import datetime, timezone, timedelta
from typing import Optional

IST = timezone(timedelta(hours=5, minutes=30))

router = APIRouter()


def _time_in_window(now_time: str, start: str, end: str) -> bool:
    """Check if now_time (HH:MM) is within [start, end]."""
    try:
        def to_mins(t):
            h, m = t.split(":")
            return int(h) * 60 + int(m)
        now_m = to_mins(now_time)
        return to_mins(start) <= now_m <= to_mins(end)
    except Exception:
        return False


# ── Instant pass scan (updated to use admn_no) ───────────────────────────────

@router.post("/scan")
async def scan_student_qr(payload: dict, db: AsyncSession = Depends(get_db)):
    """Security Flutter app scans physical ID card QR containing admn_no (htno)."""
    scan_mode = (
        str(payload.get("scan_type") or payload.get("type") or payload.get("mode") or payload.get("action") or payload.get("reason") or "").lower()
    )
    if any(k in scan_mode for k in ["late", "latecomer", "late_comer", "latecomers"]):
        return await _process_latecomer_scan(payload, db)

    admn_no = (
        payload.get("admn_no") or 
        payload.get("admnNo") or 
        payload.get("admission_no") or 
        payload.get("roll_number") or 
        payload.get("rollNo") or 
        payload.get("roll_no") or 
        payload.get("htno") or 
        payload.get("ht_no") or 
        payload.get("qr_code") or 
        payload.get("code") or 
        payload.get("student_id")
    )
    if not admn_no:
        raise HTTPException(status_code=400, detail="admn_no / roll_number required")

    admn_str = str(admn_no).strip()

    # Lookup by admn_no first, fallback to roll_number
    stud_res = await db.execute(
        select(Student).options(selectinload(Student.college)).where(func.lower(Student.admn_no) == func.lower(admn_str))
    )
    student = stud_res.scalars().first()
    if not student:
        stud_res2 = await db.execute(
            select(Student).options(selectinload(Student.college)).where(func.lower(Student.roll_number) == func.lower(admn_str))
        )
        student = stud_res2.scalars().first()
    if not student:
        return {
            "valid": False,
            "found": False,
            "name": admn_str,
            "student_name": admn_str,
            "roll_number": admn_str,
            "admn_no": admn_str,
            "college_name": "N/A",
            "title": "GATE SCAN",
            "reason": "GATE PASS",
            "message": f"Student '{admn_str}' not found."
        }

    college_name = student.college.name if student.college else "GARUDA"

    req_res = await db.execute(
        select(LeaveRequest).where(
            LeaveRequest.student_id == student.id,
            LeaveRequest.status == LeaveStatus.approved,
            LeaveRequest.gate_activated == True
        )
    )
    active_req = req_res.scalars().first()

    if active_req and active_req.valid_until:
        vu = active_req.valid_until if active_req.valid_until.tzinfo else active_req.valid_until.replace(tzinfo=IST)
        if datetime.now(IST) > vu:
            active_req.status = LeaveStatus.expired
            active_req.gate_activated = False
            await db.commit()
            active_req = None

    if not active_req:
        return {
            "valid": False,
            "found": True,
            "name": student.full_name,
            "student_name": student.full_name,
            "roll_number": student.roll_number,
            "admn_no": student.admn_no,
            "branch": student.branch,
            "section": student.section,
            "semester": student.semester,
            "college_name": college_name,
            "title": "PASS EXPIRED / NO PASS",
            "reason": "GATE PASS",
            "photo_url": f"/api/static/photos/{student.roll_number}.jpg",
            "message": f"Pass expired (3-hour exit window exceeded) or no active gate pass found for this student ({college_name})."
        }

    active_req.status = LeaveStatus.exited
    active_req.gate_activated = False
    await db.commit()

    return {
        "valid": True,
        "found": True,
        "name": student.full_name,
        "student_name": student.full_name,
        "roll_number": student.roll_number,
        "admn_no": student.admn_no,
        "branch": student.branch,
        "section": student.section,
        "semester": student.semester,
        "college_name": college_name,
        "reason": active_req.reason,
        "title": active_req.reason,
        "message": f"Valid pass for {college_name}. Exit allowed.",
        "photo_url": f"/api/static/photos/{student.roll_number}.jpg"
    }


# ── Lunch pass scan ───────────────────────────────────────────────────────────

@router.post("/lunch-scan")
async def lunch_scan(payload: dict, db: AsyncSession = Depends(get_db)):
    """
    Flutter lunch scanner.
    Payload: { "admn_no": "...", "action": "out" | "in" }
    """
    admn_no = payload.get("admn_no") or payload.get("roll_number")
    action = payload.get("action", "").lower()

    if not admn_no:
        raise HTTPException(status_code=400, detail="admn_no required")
    if action not in ("out", "in"):
        raise HTTPException(status_code=400, detail="action must be 'out' or 'in'")

    # Find student
    stud_res = await db.execute(select(Student).where(func.lower(Student.admn_no) == func.lower(admn_no)))
    student = stud_res.scalars().first()
    if not student:
        stud_res2 = await db.execute(select(Student).where(func.lower(Student.roll_number) == func.lower(admn_no)))
        student = stud_res2.scalars().first()
    if not student:
        return {"valid": False, "message": "Student not found.", "student_name": admn_no}

    # Find active semester for this student's semester and college
    sem_res = await db.execute(
        select(Semester).where(
            Semester.college_id == student.college_id,
            Semester.semester_number == student.semester,
            Semester.is_active == True
        )
    )
    semester = sem_res.scalars().first()
    if not semester:
        return {"valid": False, "student_name": student.full_name, "message": "No active semester found for this student."}

    # Find active lunch pass
    lp_res = await db.execute(
        select(LunchPass).where(
            LunchPass.student_id == student.id,
            LunchPass.semester_id == semester.id,
            LunchPass.is_active == True
        )
    )
    lunch_pass = lp_res.scalars().first()
    if not lunch_pass:
        return {"valid": False, "student_name": student.full_name, "message": "No active lunch pass for this semester."}

    # Check timing & duplicate scans
    IST = timezone(timedelta(hours=5, minutes=30))
    today_start = datetime.now(IST).replace(hour=0, minute=0, second=0, microsecond=0)
    now_ist = datetime.now(IST)
    now_time = now_ist.strftime("%H:%M")

    if action == "out":
        if not _time_in_window(now_time, semester.lunch_out_start, semester.lunch_out_end):
            return {
                "valid": False,
                "student_name": student.full_name,
                "message": f"Outside lunch-out window ({semester.lunch_out_start}–{semester.lunch_out_end}). Current time: {now_time}"
            }
        # Anti-loophole: Check if already scanned OUT today
        out_res = await db.execute(
            select(LunchScan).where(
                LunchScan.lunch_pass_id == lunch_pass.id,
                LunchScan.scan_type == "out",
                LunchScan.scanned_at >= today_start
            )
        )
        if out_res.scalars().first():
            return {
                "valid": False,
                "student_name": student.full_name,
                "message": "Lunch OUT scan already recorded today. Multiple OUT scans prohibited."
            }
    else:
        if not _time_in_window(now_time, semester.lunch_in_start, semester.lunch_in_end):
            return {
                "valid": False,
                "student_name": student.full_name,
                "message": f"Outside lunch-in window ({semester.lunch_in_start}–{semester.lunch_in_end}). Current time: {now_time}"
            }
        # Check they scanned OUT today first
        out_res = await db.execute(
            select(LunchScan).where(
                LunchScan.lunch_pass_id == lunch_pass.id,
                LunchScan.scan_type == "out",
                LunchScan.scanned_at >= today_start
            )
        )
        if not out_res.scalars().first():
            return {
                "valid": False,
                "student_name": student.full_name,
                "message": "No exit scan recorded today. Cannot allow lunch re-entry."
            }
        # Anti-loophole: Check if already scanned IN today
        in_res = await db.execute(
            select(LunchScan).where(
                LunchScan.lunch_pass_id == lunch_pass.id,
                LunchScan.scan_type == "in",
                LunchScan.scanned_at >= today_start
            )
        )
        if in_res.scalars().first():
            return {
                "valid": False,
                "student_name": student.full_name,
                "message": "Lunch IN scan already recorded today. Multiple IN scans prohibited."
            }

    # Record scan
    db.add(LunchScan(
        student_id=student.id,
        lunch_pass_id=lunch_pass.id,
        scan_type=action
    ))
    await db.commit()

    return {
        "valid": True,
        "student_name": student.full_name,
        "admn_no": student.admn_no,
        "roll_number": student.roll_number,
        "action": action,
        "message": f"Lunch {'Exit' if action == 'out' else 'Re-entry'} allowed."
    }


async def _process_latecomer_scan(payload: dict, db: AsyncSession):
    admn_no = (
        payload.get("admn_no") or 
        payload.get("roll_number") or 
        payload.get("htno") or 
        payload.get("qr_code") or 
        payload.get("code") or 
        payload.get("student_id") or
        payload.get("id") or
        payload.get("rollNo") or
        payload.get("admnNo") or
        payload.get("ht_no")
    )
    if not admn_no:
        return {
            "success": False,
            "valid": False,
            "found": False,
            "ok": False,
            "name": "Unknown",
            "student_name": "Unknown",
            "full_name": "Unknown",
            "roll_number": "N/A",
            "admn_no": "N/A",
            "title": "LATECOMER SCAN",
            "message": "Student Roll Number / Admission No required for scanning."
        }

    admn_str = str(admn_no).strip()

    stud_res = await db.execute(select(Student).where(func.lower(Student.admn_no) == func.lower(admn_str)))
    student = stud_res.scalars().first()
    if not student:
        stud_res2 = await db.execute(select(Student).where(func.lower(Student.roll_number) == func.lower(admn_str)))
        student = stud_res2.scalars().first()
    if not student:
        return {
            "success": False,
            "valid": False,
            "found": False,
            "ok": False,
            "name": admn_str,
            "student_name": admn_str,
            "full_name": admn_str,
            "roll_number": admn_str,
            "admn_no": admn_str,
            "htno": admn_str,
            "title": "LATECOMER SCAN",
            "pass_type": "LATECOMER",
            "scan_type": "latecomer",
            "reason": "LATECOMER",
            "action": "latecomer",
            "status": "error",
            "message": f"Student '{admn_str}' not found in directory.",
            "msg": f"Student '{admn_str}' not found in directory.",
            "student": {
                "id": 0,
                "name": admn_str,
                "full_name": admn_str,
                "student_name": admn_str,
                "roll_number": admn_str,
                "admn_no": admn_str,
                "htno": admn_str
            }
        }

    # Find active semester for student's semester number and college
    sem_res = await db.execute(
        select(Semester).where(
            Semester.college_id == student.college_id,
            Semester.semester_number == student.semester,
            Semester.is_active == True
        )
    )
    semester = sem_res.scalars().first()
    if not semester:
        sem_res2 = await db.execute(
            select(Semester).where(
                Semester.college_id == student.college_id,
                Semester.semester_number == student.semester
            )
        )
        semester = sem_res2.scalars().first()

    sem_id = semester.id if semester else 1
    limit_val = semester.late_comer_limit if (semester and semester.late_comer_limit) else 5
    cutoff_val = semester.late_comer_cutoff if (semester and semester.late_comer_cutoff) else "11:00"

    student_obj = {
        "id": student.id,
        "name": student.full_name,
        "full_name": student.full_name,
        "student_name": student.full_name,
        "roll_number": student.roll_number,
        "admn_no": student.admn_no,
        "htno": student.roll_number,
        "branch": student.branch,
        "section": student.section,
        "semester": student.semester,
        "photo_url": f"/api/static/photos/{student.roll_number}.jpg"
    }

    now_ist = datetime.now(timezone(timedelta(hours=5, minutes=30)))
    now_time = now_ist.strftime("%H:%M")
    
    # Check cutoff time
    if cutoff_val and now_time > cutoff_val:
        msg = f"Late entry scanning closed for today. Cutoff was {cutoff_val}."
        return {
            "success": False,
            "valid": False,
            "found": True,
            "ok": False,
            "name": student.full_name,
            "student_name": student.full_name,
            "full_name": student.full_name,
            "roll_number": student.roll_number,
            "admn_no": student.admn_no,
            "htno": student.roll_number,
            "title": "LATECOMER SCAN",
            "pass_type": "LATECOMER",
            "scan_type": "latecomer",
            "reason": "LATECOMER",
            "action": "latecomer",
            "status": "closed",
            "photo_url": f"/api/static/photos/{student.roll_number}.jpg",
            "message": msg,
            "msg": msg,
            "detail": msg,
            "student": student_obj
        }

    now_ist = datetime.now(IST)
    today_start_ist = now_ist.replace(hour=0, minute=0, second=0, microsecond=0)

    # Check for duplicate same-day scan
    dup_res = await db.execute(
        select(LateComer).where(
            LateComer.student_id == student.id,
            LateComer.semester_id == sem_id,
            LateComer.scanned_at >= today_start_ist
        )
    )
    if dup_res.scalars().first():
        count_val = (await db.execute(select(func.count()).select_from(LateComer).where(LateComer.student_id == student.id, LateComer.semester_id == sem_id))).scalar() or 0
        msg = f"Already scanned late entry today. Count: {count_val}/{limit_val}"
        return {
            "success": False,
            "valid": False,
            "found": True,
            "ok": False,
            "name": student.full_name,
            "student_name": student.full_name,
            "full_name": student.full_name,
            "roll_number": student.roll_number,
            "admn_no": student.admn_no,
            "htno": student.roll_number,
            "title": "LATECOMER SCAN",
            "pass_type": "LATECOMER",
            "scan_type": "latecomer",
            "reason": "LATECOMER",
            "action": "latecomer",
            "semester": student.semester,
            "count": count_val,
            "limit": limit_val,
            "status": "warning",
            "photo_url": f"/api/static/photos/{student.roll_number}.jpg",
            "message": msg,
            "msg": msg,
            "detail": msg,
            "student": student_obj
        }

    # Record late entry
    db.add(LateComer(student_id=student.id, semester_id=sem_id))
    await db.commit()

    # Count total for this semester
    count_res = await db.execute(
        select(func.count()).select_from(LateComer).where(
            LateComer.student_id == student.id,
            LateComer.semester_id == sem_id
        )
    )
    count = count_res.scalar() or 0

    if count >= limit_val:
        status = "exceeded"
    elif count == limit_val - 1:
        status = "warning"
    else:
        status = "ok"

    msg_str = {
        "ok": f"Recorded. Late count: {count}/{limit_val}",
        "warning": f"Warning! {count}/{limit_val} — approaching limit.",
        "exceeded": f"EXCEEDED! {count}/{limit_val} — over limit this semester.",
    }[status]

    return {
        "success": True,
        "valid": True,
        "found": True,
        "ok": True,
        "name": student.full_name,
        "student_name": student.full_name,
        "full_name": student.full_name,
        "roll_number": student.roll_number,
        "admn_no": student.admn_no,
        "htno": student.roll_number,
        "title": "LATECOMER SCAN",
        "pass_type": "LATECOMER",
        "scan_type": "latecomer",
        "reason": "LATECOMER",
        "action": "latecomer",
        "semester": student.semester,
        "count": count,
        "limit": limit_val,
        "status": status,
        "photo_url": f"/api/static/photos/{student.roll_number}.jpg",
        "message": msg_str,
        "msg": msg_str,
        "detail": msg_str,
        "student": student_obj
    }


@router.api_route("/latecomer-scan", methods=["POST", "GET"])
@router.api_route("/latecomer-scan/", methods=["POST", "GET"])
@router.api_route("/late-comer", methods=["POST", "GET"])
@router.api_route("/late-comer/", methods=["POST", "GET"])
@router.api_route("/late-comers", methods=["POST", "GET"])
@router.api_route("/late-comers/", methods=["POST", "GET"])
@router.api_route("/late-scan", methods=["POST", "GET"])
@router.api_route("/late-scan/", methods=["POST", "GET"])
@router.api_route("/late-comer-scan", methods=["POST", "GET"])
@router.api_route("/late-comer-scan/", methods=["POST", "GET"])
@router.api_route("/latecomers-scan", methods=["POST", "GET"])
@router.api_route("/latecomers-scan/", methods=["POST", "GET"])
@router.api_route("/latecomer", methods=["POST", "GET"])
@router.api_route("/latecomer/", methods=["POST", "GET"])
@router.api_route("/latecomers", methods=["POST", "GET"])
@router.api_route("/latecomers/", methods=["POST", "GET"])
@router.api_route("/latecomers/scan", methods=["POST", "GET"])
@router.api_route("/latecomers/scan/", methods=["POST", "GET"])
@router.api_route("/latecomer/scan", methods=["POST", "GET"])
@router.api_route("/latecomer/scan/", methods=["POST", "GET"])
@router.api_route("/late-comer/scan", methods=["POST", "GET"])
@router.api_route("/late-comer/scan/", methods=["POST", "GET"])
@router.api_route("/scan/latecomer", methods=["POST", "GET"])
@router.api_route("/scan/latecomer/", methods=["POST", "GET"])
@router.api_route("/scan/late-comer", methods=["POST", "GET"])
@router.api_route("/scan/late-comer/", methods=["POST", "GET"])
@router.api_route("/scan/late", methods=["POST", "GET"])
@router.api_route("/scan/late/", methods=["POST", "GET"])
@router.api_route("/late", methods=["POST", "GET"])
@router.api_route("/late/", methods=["POST", "GET"])
async def latecomer_scan(request: Request, db: AsyncSession = Depends(get_db)):
    """
    Flutter late-comer scanner supporting all HTTP methods, query params & body JSON.
    """
    body = {}
    try:
        body = await request.json()
    except Exception:
        pass

    query_params = dict(request.query_params)
    payload = {**query_params, **body}
    return await _process_latecomer_scan(payload, db)


# ── Custom pass scan ──────────────────────────────────────────────────────────

@router.get("/pass-types")
async def get_public_pass_types(db: AsyncSession = Depends(get_db)):
    """Public endpoint for Flutter scanners to load active custom pass types."""
    res = await db.execute(
        select(CustomPassType).where(CustomPassType.is_active == True).order_by(CustomPassType.name)
    )
    types = res.scalars().all()
    return [
        {
            "id": t.id,
            "name": t.name,
            "out_time": t.out_time,
            "in_time": t.in_time,
            "description": t.description,
        }
        for t in types
    ]


@router.post("/custom-pass-scan")
async def custom_pass_scan(payload: dict, db: AsyncSession = Depends(get_db)):
    """
    Flutter app: scan QR for a custom pass (Namaz, Club, Alumni, etc.).
    Payload: { "admn_no": "...", "pass_type_id": 3, "action": "out" | "in" }
    
    Validates:
      - Student has an active CustomPassAssignment for this pass type
      - Assignment is within valid_from / valid_to date range (if set)
      - Current time is within the pass type's out_time / in_time window
    """
    admn_no = payload.get("admn_no") or payload.get("roll_number")
    pass_type_id = payload.get("pass_type_id")
    action = (payload.get("action") or "out").lower()

    if not admn_no:
        raise HTTPException(status_code=400, detail="admn_no required")
    if not pass_type_id:
        raise HTTPException(status_code=400, detail="pass_type_id required")
    if action not in ("out", "in"):
        raise HTTPException(status_code=400, detail="action must be 'out' or 'in'")

    # Find student
    stud_res = await db.execute(select(Student).where(func.lower(Student.admn_no) == func.lower(admn_no)))
    student = stud_res.scalars().first()
    if not student:
        stud_res2 = await db.execute(select(Student).where(func.lower(Student.roll_number) == func.lower(admn_no)))
        student = stud_res2.scalars().first()
    if not student:
        return {"valid": False, "message": "Student not found.", "student_name": admn_no}

    # Find the pass type
    pt_res = await db.execute(
        select(CustomPassType).where(
            CustomPassType.id == int(pass_type_id),
            CustomPassType.is_active == True
        )
    )
    pass_type = pt_res.scalars().first()
    if not pass_type:
        return {
            "valid": False,
            "student_name": student.full_name,
            "message": "Pass type not found or has been deleted."
        }

    # Dynamic auto-deactivation of expired assignments based on IST date
    today = datetime.now(timezone(timedelta(hours=5, minutes=30))).date()
    await db.execute(
        update(CustomPassAssignment)
        .where(
            CustomPassAssignment.is_active == True,
            CustomPassAssignment.valid_to != None,
            CustomPassAssignment.valid_to < today
        )
        .values(is_active=False)
    )
    await db.commit()

    # Check active assignment for this student
    assign_res = await db.execute(
        select(CustomPassAssignment).where(
            CustomPassAssignment.student_id == student.id,
            CustomPassAssignment.pass_type_id == pass_type.id,
            CustomPassAssignment.is_active == True,
        )
    )
    assignment = assign_res.scalars().first()
    if not assignment:
        return {
            "valid": False,
            "student_name": student.full_name,
            "admn_no": student.admn_no,
            "message": f"No active '{pass_type.name}' assigned to this student."
        }

    # Date range check
    if assignment.valid_from and today < assignment.valid_from:
        return {
            "valid": False,
            "student_name": student.full_name,
            "message": f"'{pass_type.name}' is not yet valid. Valid from: {assignment.valid_from}"
        }
    if assignment.valid_to and today > assignment.valid_to:
        return {
            "valid": False,
            "student_name": student.full_name,
            "message": f"'{pass_type.name}' has expired. Was valid until: {assignment.valid_to}"
        }

    # Time window check
    now_ist = datetime.now(timezone(timedelta(hours=5, minutes=30)))
    now_time = now_ist.strftime("%H:%M")
    if action == "out":
        if not _time_in_window(now_time, pass_type.out_time, pass_type.in_time):
            return {
                "valid": False,
                "student_name": student.full_name,
                "message": f"Outside '{pass_type.name}' window ({pass_type.out_time}–{pass_type.in_time}). Now: {now_time}"
            }

    # Duplicate scan check & order validation for today
    today_start = now_ist.replace(hour=0, minute=0, second=0, microsecond=0)
    if action == "out":
        sc_res = await db.execute(
            select(CustomPassScan).where(
                CustomPassScan.custom_pass_assignment_id == assignment.id,
                CustomPassScan.scan_type == "out",
                CustomPassScan.scanned_at >= today_start
            )
        )
        if sc_res.scalars().first():
            return {
                "valid": False,
                "student_name": student.full_name,
                "message": f"Already scanned OUT for '{pass_type.name}' today."
            }
    elif action == "in":
        # Must scan out first
        out_res = await db.execute(
            select(CustomPassScan).where(
                CustomPassScan.custom_pass_assignment_id == assignment.id,
                CustomPassScan.scan_type == "out",
                CustomPassScan.scanned_at >= today_start
            )
        )
        if not out_res.scalars().first():
            return {
                "valid": False,
                "student_name": student.full_name,
                "message": "Cannot scan IN without scanning OUT first."
            }
        
        # Check if already scanned in today
        in_res = await db.execute(
            select(CustomPassScan).where(
                CustomPassScan.custom_pass_assignment_id == assignment.id,
                CustomPassScan.scan_type == "in",
                CustomPassScan.scanned_at >= today_start
            )
        )
        if in_res.scalars().first():
            return {
                "valid": False,
                "student_name": student.full_name,
                "message": f"Already scanned IN for '{pass_type.name}' today."
            }

    # Record the scan in database
    scan = CustomPassScan(
        student_id=student.id,
        custom_pass_assignment_id=assignment.id,
        scan_type=action,
        scanned_at=now_ist
    )
    col_code = "NGIT" if (student.roll_number and len(student.roll_number) >= 4 and student.roll_number[2:4] == "53") else "KMEC"
    if student.college_id:
        col_res = await db.execute(select(College).where(College.id == student.college_id))
        col_obj = col_res.scalars().first()
        if col_obj:
            col_code = col_obj.code.upper()

    return {
        "valid": True,
        "student_name": student.full_name,
        "admn_no": student.admn_no,
        "roll_number": student.roll_number,
        "college_code": col_code,
        "college_name": col_code,
        "pass_name": pass_type.name,
        "action": action,
        "message": f"Valid {pass_type.name} Pass • {'Exit' if action == 'out' else 'Entry'} Allowed",
        "photo_url": f"/api/static/photos/{student.roll_number}.jpg",
        "valid_until": str(assignment.valid_to) if assignment.valid_to else "No expiry",
    }


# ── Admin endpoints (pass generation, analytics, active passes) ────────────────

@router.post("/generate-pass")
async def generate_gate_pass(
    payload: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Direct Admin/HOD Pass Generator.
    Payload: { "student_id": int, "reason": str, "notes": Optional[str] }
    or { "roll_number": str, "reason": str, "notes": Optional[str] }
    """
    user_role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)

    IST = timezone(timedelta(hours=5, minutes=30))
    now_ist = datetime.now(IST)

    student_id = payload.get("student_id")
    roll_number = payload.get("roll_number") or payload.get("admn_no")
    reason = payload.get("reason", "Outing / Official Pass").strip()
    notes = payload.get("notes", "").strip()

    if not student_id and not roll_number:
        raise HTTPException(status_code=400, detail="student_id or roll_number required")

    query = select(Student)
    if current_user.college_id and user_role_str != "super_admin":
        query = query.where(Student.college_id == current_user.college_id)

    if student_id:
        query = query.where(Student.id == int(student_id))
    else:
        query = query.where(
            (func.lower(Student.roll_number) == func.lower(roll_number)) |
            (func.lower(Student.admn_no) == func.lower(roll_number))
        )

    stud_res = await db.execute(query)
    student = stud_res.scalars().first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    # Check HOD permissions
    if user_role_str == "hod":
        from api.deps import get_hod_department_ids
        hod_dept_ids = await get_hod_department_ids(current_user, db)

        # Check if student's department matches HOD's department
        if student.department_id not in hod_dept_ids:
            raise HTTPException(status_code=403, detail="HOD is not authorized for this student's department.")

    # Semester pass limit & Emergency Pass override logic
    is_emergency = bool(payload.get("is_emergency") or payload.get("is_emergency_pass"))
    emergency_reason = payload.get("emergency_reason") or notes or "Emergency Override Approved"

    # Restrict Admins from issuing normal passes (Authority belongs strictly to HOD)
    if user_role_str in ["admin", "super_admin"] and not is_emergency:
        raise HTTPException(
            status_code=403,
            detail="Normal gate passes can only be issued by the respective Department HOD. Admins can only issue Emergency Pass Overrides or process Mentor Fallback Approvals."
        )

    # 1 Pass Per Student Per Day Limit
    today_start = datetime.now(IST).replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)
    today_pass_res = await db.execute(
        select(func.count(LeaveRequest.id)).where(
            LeaveRequest.student_id == student.id,
            or_(
                and_(LeaveRequest.created_at >= today_start, LeaveRequest.created_at < today_end),
                and_(LeaveRequest.approved_at >= today_start, LeaveRequest.approved_at < today_end),
                and_(LeaveRequest.requested_at >= today_start, LeaveRequest.requested_at < today_end)
            ),
            LeaveRequest.status.in_([LeaveStatus.approved, LeaveStatus.exited, LeaveStatus.returned, LeaveStatus.pending])
        )
    )
    passes_today = today_pass_res.scalar() or 0
    if passes_today > 0 and not is_emergency:
        raise HTTPException(
            status_code=400,
            detail=f"Student {student.full_name} ({student.roll_number}) already has a gate pass issued today. Only 1 pass per day is permitted."
        )

    sem_res = await db.execute(
        select(Semester).where(Semester.college_id == student.college_id, Semester.is_active == True)
    )
    active_sem = sem_res.scalars().first()
    max_normal_passes = active_sem.max_normal_passes if active_sem else 5

    used_normal_res = await db.execute(
        select(func.count(LeaveRequest.id)).where(
            LeaveRequest.student_id == student.id,
            LeaveRequest.semester == student.semester,
            LeaveRequest.status.in_([LeaveStatus.approved, LeaveStatus.exited, LeaveStatus.returned]),
            LeaveRequest.is_emergency == False
        )
    )
    used_normal_passes = used_normal_res.scalar() or 0

    if used_normal_passes >= max_normal_passes and not is_emergency:
        raise HTTPException(
            status_code=400,
            detail=f"Student {student.full_name} has reached the semester pass limit ({used_normal_passes}/{max_normal_passes}). Please check 'Issue Emergency Pass' to override."
        )

    # Cancel any existing un-exited active passes for this student to prevent duplicate active passes
    await db.execute(
        update(LeaveRequest)
        .where(
            LeaveRequest.student_id == student.id,
            LeaveRequest.status == LeaveStatus.approved,
            LeaveRequest.gate_activated == True
        )
        .values(status=LeaveStatus.expired, gate_activated=False)
    )

    now_time = datetime.now(IST)
    valid_until_time = now_time + timedelta(hours=3)

    new_pass = LeaveRequest(
        college_id=student.college_id,
        student_id=student.id,
        reason=reason,
        notes=notes,
        status=LeaveStatus.approved,
        gate_activated=True,
        semester=student.semester,
        is_emergency=is_emergency,
        remarks=emergency_reason if is_emergency else None,
        approved_by=current_user.id if current_user else None,
        approved_at=now_time,
        valid_until=valid_until_time,
        issued_by_role=user_role_str,
        requested_by_id=current_user.id if current_user else None
    )
    db.add(new_pass)
    await db.commit()
    await db.refresh(new_pass)

    return {
        "success": True,
        "message": f"Gate pass generated and activated for {student.full_name} ({student.roll_number}).",
        "pass_id": new_pass.id,
        "student_name": student.full_name,
        "roll_number": student.roll_number,
        "reason": new_pass.reason,
        "photo_url": f"/api/static/photos/{student.roll_number}.jpg",
    }


@router.get("/student-pass-summary/{student_id}")
async def get_student_pass_summary(
    student_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Return student pass usage summary and limit status."""
    student = await db.get(Student, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    today_start = datetime.now(IST).replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)
    today_pass_res = await db.execute(
        select(func.count(LeaveRequest.id)).where(
            LeaveRequest.student_id == student.id,
            or_(
                and_(LeaveRequest.created_at >= today_start, LeaveRequest.created_at < today_end),
                and_(LeaveRequest.approved_at >= today_start, LeaveRequest.approved_at < today_end),
                and_(LeaveRequest.requested_at >= today_start, LeaveRequest.requested_at < today_end)
            ),
            LeaveRequest.status.in_([LeaveStatus.approved, LeaveStatus.exited, LeaveStatus.returned, LeaveStatus.pending])
        )
    )
    passes_today = today_pass_res.scalar() or 0

    sem_res = await db.execute(
        select(Semester).where(Semester.college_id == student.college_id, Semester.is_active == True)
    )
    active_sem = sem_res.scalars().first()
    max_normal_passes = active_sem.max_normal_passes if active_sem else 5

    used_normal_res = await db.execute(
        select(func.count(LeaveRequest.id)).where(
            LeaveRequest.student_id == student.id,
            LeaveRequest.semester == student.semester,
            LeaveRequest.status.in_([LeaveStatus.approved, LeaveStatus.exited, LeaveStatus.returned]),
            LeaveRequest.is_emergency == False
        )
    )
    used_normal_passes = used_normal_res.scalar() or 0

    used_emergency_res = await db.execute(
        select(func.count(LeaveRequest.id)).where(
            LeaveRequest.student_id == student.id,
            LeaveRequest.semester == student.semester,
            LeaveRequest.status.in_([LeaveStatus.approved, LeaveStatus.exited, LeaveStatus.returned]),
            LeaveRequest.is_emergency == True
        )
    )
    used_emergency_passes = used_emergency_res.scalar() or 0

    return {
        "student_id": student.id,
        "semester": student.semester,
        "max_normal_passes": max_normal_passes,
        "used_normal_passes": used_normal_passes,
        "used_emergency_passes": used_emergency_passes,
        "passes_today": passes_today,
        "has_pass_today": passes_today > 0,
        "limit_reached": used_normal_passes >= max_normal_passes or passes_today > 0,
    }


@router.get("/analytics")
async def get_analytics(
    college_id: Optional[int] = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    user_role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    target_college_id = college_id if user_role_str == "super_admin" else current_user.college_id

    IST = timezone(timedelta(hours=5, minutes=30))
    now_ist = datetime.now(IST)
    today_start_ist = now_ist.replace(hour=0, minute=0, second=0, microsecond=0)
    today_start_utc = today_start_ist.astimezone(timezone.utc)

    # Fetch KMEC (id=1) & NGIT (id=2) IDs
    from db.models import College
    kmec_col = (await db.execute(select(College).where(College.code == "KMEC"))).scalars().first()
    ngit_col = (await db.execute(select(College).where(College.code == "NGIT"))).scalars().first()
    kmec_id = kmec_col.id if kmec_col else 1
    ngit_id = ngit_col.id if ngit_col else 2

    hod_dept_ids = []
    if user_role_str == "hod":
        from api.deps import get_hod_department_ids
        hod_dept_ids = await get_hod_department_ids(current_user, db)

    # Helper function for querying counts
    async def get_count(model, date_field, extra_conditions=None, col_id=None):
        stmt = select(func.count()).select_from(model).join(Student, model.student_id == Student.id)
        conds = []
        if date_field:
            conds.append(date_field >= today_start_utc)
        if extra_conditions:
            conds.extend(extra_conditions)
        if col_id:
            conds.append(Student.college_id == col_id)
        if user_role_str == "hod" and hod_dept_ids:
            conds.append(Student.department_id.in_(hod_dept_ids))
        if conds:
            stmt = stmt.where(*conds)
        res = await db.execute(stmt)
        return res.scalar() or 0

    # 1. Issued today
    issued_cond = [or_(LeaveRequest.requested_at >= today_start_utc, LeaveRequest.approved_at >= today_start_utc)]
    issued_today = await get_count(LeaveRequest, None, issued_cond, target_college_id)
    issued_kmec = await get_count(LeaveRequest, None, issued_cond, kmec_id)
    issued_ngit = await get_count(LeaveRequest, None, issued_cond, ngit_id)

    # 2. Active passes
    active_cond = [LeaveRequest.status.in_([LeaveStatus.approved, LeaveStatus.exited]), LeaveRequest.gate_activated == True]
    active_passes = await get_count(LeaveRequest, None, active_cond, target_college_id)
    active_kmec = await get_count(LeaveRequest, None, active_cond, kmec_id)
    active_ngit = await get_count(LeaveRequest, None, active_cond, ngit_id)

    # 3. Exited Today (combines standard leave pass exits and custom pass exits)
    exited_cond = [LeaveRequest.status == LeaveStatus.exited]
    exited_today_leave = await get_count(LeaveRequest, None, exited_cond, target_college_id)
    exited_kmec_leave = await get_count(LeaveRequest, None, exited_cond, kmec_id)
    exited_ngit_leave = await get_count(LeaveRequest, None, exited_cond, ngit_id)

    custom_out_cond = [CustomPassScan.scan_type == "out"]
    exited_custom_today = await get_count(CustomPassScan, CustomPassScan.scanned_at, custom_out_cond, target_college_id)
    exited_custom_kmec = await get_count(CustomPassScan, CustomPassScan.scanned_at, custom_out_cond, kmec_id)
    exited_custom_ngit = await get_count(CustomPassScan, CustomPassScan.scanned_at, custom_out_cond, ngit_id)

    exited_today = exited_today_leave + exited_custom_today
    exited_kmec = exited_kmec_leave + exited_custom_kmec
    exited_ngit = exited_ngit_leave + exited_custom_ngit

    # 4. Lunch Out Today
    lunch_cond = [LunchScan.scan_type == "out"]
    lunch_out_today = await get_count(LunchScan, LunchScan.scanned_at, lunch_cond, target_college_id)
    lunch_kmec = await get_count(LunchScan, LunchScan.scanned_at, lunch_cond, kmec_id)
    lunch_ngit = await get_count(LunchScan, LunchScan.scanned_at, lunch_cond, ngit_id)

    # 5. Late Comers Today
    latecomers_today = await get_count(LateComer, LateComer.scanned_at, None, target_college_id)
    latecomers_kmec = await get_count(LateComer, LateComer.scanned_at, None, kmec_id)
    latecomers_ngit = await get_count(LateComer, LateComer.scanned_at, None, ngit_id)

    # 6. Total Students Breakdown
    kmec_count = (await db.execute(select(func.count()).select_from(Student).where(Student.status == "active", Student.college_id == kmec_id))).scalar() or 0
    ngit_count = (await db.execute(select(func.count()).select_from(Student).where(Student.status == "active", Student.college_id == ngit_id))).scalar() or 0

    user_college_code = ""
    user_dept_label = ""
    user_dept_count = 0
    hod_dept_ids = []

    if current_user.college_id:
        col_code_res = await db.execute(select(College.code).where(College.id == current_user.college_id))
        user_college_code = col_code_res.scalar() or ""

    if user_role_str == "hod":
        from api.deps import get_hod_department_ids
        from db.models import Department
        hod_dept_ids = await get_hod_department_ids(current_user, db)
        if hod_dept_ids:
            dept_res = await db.execute(select(Department.code).where(Department.id.in_(hod_dept_ids)))
            codes = dept_res.scalars().all()
            user_dept_label = "/".join(codes) if codes else "Dept"

            stud_dept_res = await db.execute(
                select(func.count()).select_from(Student)
                .where(Student.status == "active", Student.department_id.in_(hod_dept_ids))
            )
            user_dept_count = stud_dept_res.scalar() or 0

    q_stud = select(func.count()).select_from(Student).where(Student.status == "active")
    if target_college_id:
        q_stud = q_stud.where(Student.college_id == target_college_id)
    if user_role_str == "hod" and hod_dept_ids:
        q_stud = q_stud.where(Student.department_id.in_(hod_dept_ids))

    total_students = (await db.execute(q_stud)).scalar() or 0

    return {
        "issued_today": issued_today,
        "issued_kmec": issued_kmec,
        "issued_ngit": issued_ngit,

        "active_passes": active_passes,
        "active_kmec": active_kmec,
        "active_ngit": active_ngit,

        "exited_today": exited_today,
        "exited_kmec": exited_kmec,
        "exited_ngit": exited_ngit,

        "lunch_out_today": lunch_out_today,
        "lunch_kmec": lunch_kmec,
        "lunch_ngit": lunch_ngit,

        "latecomers_today": latecomers_today,
        "latecomers_kmec": latecomers_kmec,
        "latecomers_ngit": latecomers_ngit,

        "total_students": total_students,
        "kmec_count": kmec_count,
        "ngit_count": ngit_count,

        "user_college_code": user_college_code,
        "user_dept_label": user_dept_label,
        "user_dept_count": user_dept_count,
        "user_role": user_role_str,
        "today": {"total": issued_today, "exited": exited_today, "pending": active_passes},
        "live": {"awaiting_activation": 0, "active_passes": active_passes, "lunch_out_today": lunch_out_today, "latecomers_today": latecomers_today}
    }


@router.get("/approved-leaves")
async def get_approved_leaves(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(["admin", "security", "super_admin"]))
):
    result = await db.execute(
        select(LeaveRequest).where(LeaveRequest.status == LeaveStatus.approved, LeaveRequest.gate_activated == False)
        .options(selectinload(LeaveRequest.student)).order_by(LeaveRequest.approved_at.desc())
    )
    return [{"id": r.id, "student_name": r.student.full_name, "roll_number": r.student.roll_number,
             "admn_no": r.student.admn_no, "reason": r.reason, "notes": r.notes,
             "photo_url": f"/api/static/photos/{r.student.roll_number}.jpg",
             "approved_at": r.approved_at.isoformat() if r.approved_at else None,
             "gate_activated": r.gate_activated,
             "parent_called": r.parent_called,
             "remarks": r.remarks,
             "parent_phone": r.student.parent_phone,
             "secondary_phone": r.student.secondary_phone}
            for r in result.scalars().all()]


@router.get("/active-passes")
async def get_active_passes(
    college_id: Optional[int] = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(["super_admin", "admin", "hod", "security"]))
):
    user_role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    target_college_id = college_id or current_user.college_id

    query = select(LeaveRequest).join(Student, LeaveRequest.student_id == Student.id).where(
        LeaveRequest.status.in_([LeaveStatus.approved, LeaveStatus.exited]),
        LeaveRequest.gate_activated == True
    )
    if target_college_id:
        query = query.where(Student.college_id == target_college_id)

    if user_role_str == "hod":
        from api.deps import get_hod_department_ids
        hod_dept_ids = await get_hod_department_ids(current_user, db)
        if hod_dept_ids:
            query = query.where(Student.department_id.in_(hod_dept_ids))

    query = query.options(selectinload(LeaveRequest.student)).order_by(LeaveRequest.approved_at.desc())
    result = await db.execute(query)
    passes = result.scalars().all()

    out = []
    for r in passes:
        if not r.student:
            continue
        out.append({
            "id": r.id,
            "student_name": r.student.full_name,
            "roll_number": r.student.roll_number,
            "admn_no": r.student.admn_no,
            "reason": r.reason,
            "notes": r.notes,
            "photo_url": f"/api/static/photos/{r.student.roll_number}.jpg",
            "approved_at": r.approved_at.isoformat() if r.approved_at else None,
            "requested_at": r.requested_at.isoformat() if r.requested_at else None,
            "gate_activated": r.gate_activated,
            "status": r.status.value if hasattr(r.status, "value") else str(r.status),
            "parent_called": r.parent_called,
            "remarks": r.remarks,
            "parent_phone": getattr(r.student, "parent_phone", None),
            "secondary_phone": getattr(r.student, "secondary_phone", None),
            "branch": getattr(r.student, "branch", None),
            "section": getattr(r.student, "section", None),
            "department_id": getattr(r.student, "department_id", None)
        })
    return out


@router.post("/{request_id}/activate")
async def activate_gate_pass(
    request_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(["super_admin", "admin", "hod"]))
):
    r = (await db.execute(select(LeaveRequest).where(LeaveRequest.id == request_id))).scalars().first()
    if not r: raise HTTPException(404, "Not found")
    if r.status != LeaveStatus.approved: raise HTTPException(400, "Not approved")
    r.gate_activated = True
    await db.commit()
    return {"message": "Gate pass activated."}


@router.post("/{request_id}/deactivate")
async def deactivate_gate_pass(
    request_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(["super_admin", "admin", "hod"]))
):
    r = (await db.execute(select(LeaveRequest).where(LeaveRequest.id == request_id))).scalars().first()
    if not r: raise HTTPException(404, "Not found")
    r.gate_activated = False
    r.status = LeaveStatus.expired
    await db.commit()
    return {"message": "Gate pass revoked."}


@router.post("/revoke-batch/{batch_note}")
async def deactivate_batch_gate_passes(
    batch_note: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(["super_admin", "admin", "hod"]))
):
    await db.execute(
        update(LeaveRequest)
        .where(
            LeaveRequest.notes.ilike(f"%{batch_note}%"),
            LeaveRequest.status == LeaveStatus.approved,
            LeaveRequest.gate_activated == True
        )
        .values(status=LeaveStatus.expired, gate_activated=False)
    )
    await db.commit()
    return {"message": f"All active passes for batch '{batch_note}' have been revoked."}


@router.get("/history")
async def gate_history(
    htno: str = Query(default=""),
    date_from: str = Query(default=""),
    date_to: str = Query(default=""),
    college_id: Optional[int] = Query(default=None),
    limit: Optional[int] = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(["super_admin", "admin", "hod", "security"]))
):
    user_role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    target_college_id = college_id or current_user.college_id

    query = select(LeaveRequest).join(Student, LeaveRequest.student_id == Student.id)
    if target_college_id:
        query = query.where(Student.college_id == target_college_id)

    if user_role_str == "hod":
        from api.deps import get_hod_department_ids
        hod_dept_ids = await get_hod_department_ids(current_user, db)
        if hod_dept_ids:
            query = query.where(Student.department_id.in_(hod_dept_ids))

    if htno.strip():
        query = query.where((Student.admn_no.ilike(f"%{htno}%")) | (Student.roll_number.ilike(f"%{htno}%")))
    if date_from.strip():
        try:
            query = query.where(LeaveRequest.requested_at >= datetime.strptime(date_from, "%Y-%m-%d").replace(tzinfo=timezone.utc))
        except ValueError: pass
    if date_to.strip():
        try:
            query = query.where(LeaveRequest.requested_at < datetime.strptime(date_to, "%Y-%m-%d").replace(tzinfo=timezone.utc) + timedelta(days=1))
        except ValueError: pass

    query = query.options(selectinload(LeaveRequest.student)).order_by(LeaveRequest.requested_at.desc())
    if limit and limit > 0:
        query = query.limit(limit)

    result = await db.execute(query)
    passes = result.scalars().all()

    return [{
        "id": r.id,
        "student_name": r.student.full_name,
        "roll_number": r.student.roll_number,
        "admn_no": r.student.admn_no,
        "reason": r.reason,
        "notes": r.notes,
        "status": r.status.value if hasattr(r.status, "value") else str(r.status),
        "photo_url": f"/api/static/photos/{r.student.roll_number}.jpg",
        "gate_activated": r.gate_activated,
        "requested_at": r.requested_at.isoformat() if r.requested_at else None,
        "approved_at": r.approved_at.isoformat() if r.approved_at else None
    } for r in passes]


@router.get("/lunch-monitoring")
async def get_lunch_monitoring(
    date_from: Optional[str] = Query(default=None),
    date_to: Optional[str] = Query(default=None),
    college_id: Optional[int] = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(["super_admin", "admin", "hod", "security"]))
):
    """
    Get live lunch pass scanning logs for today or a specific date range.
    Calculates who has exited, returned, or failed to return before the window closed.
    """
    user_role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    target_college_id = college_id if user_role_str == "super_admin" else current_user.college_id

    IST = timezone(timedelta(hours=5, minutes=30))
    now_ist = datetime.now(IST)
    
    start_time = None
    end_time = None

    if date_from:
        try:
            dt_from = datetime.strptime(date_from, "%Y-%m-%d")
            start_time = datetime.combine(dt_from.date(), datetime.min.time()).replace(tzinfo=IST)
        except ValueError:
            pass

    if date_to:
        try:
            dt_to = datetime.strptime(date_to, "%Y-%m-%d")
            end_time = datetime.combine(dt_to.date(), datetime.max.time()).replace(tzinfo=IST)
        except ValueError:
            pass
    elif start_time:
        end_time = datetime.combine(start_time.date(), datetime.max.time()).replace(tzinfo=IST)

    if not start_time:
        start_time = now_ist.replace(hour=0, minute=0, second=0, microsecond=0)
    
    if not end_time:
        end_time = now_ist.replace(hour=23, minute=59, second=59, microsecond=59)

    # Fetch all scans in range
    scan_query = (
        select(LunchScan)
        .join(Student, LunchScan.student_id == Student.id)
        .where(LunchScan.scanned_at >= start_time, LunchScan.scanned_at <= end_time)
    )
    if target_college_id:
        scan_query = scan_query.where(Student.college_id == target_college_id)

    scan_query = scan_query.options(selectinload(LunchScan.student)).order_by(LunchScan.scanned_at.asc())
    result = await db.execute(scan_query)
    scans = result.scalars().all()

    # Fetch active semesters
    sem_res = await db.execute(select(Semester).where(Semester.is_active == True))
    active_semesters = {s.semester_number: s for s in sem_res.scalars().all()}

    student_lunch_data = {}
    for scan in scans:
        sid = scan.student_id
        if sid not in student_lunch_data:
            student_lunch_data[sid] = {
                "student_id": sid,
                "student_name": scan.student.full_name,
                "roll_number": scan.student.roll_number,
                "admn_no": scan.student.admn_no,
                "branch": scan.student.branch,
                "section": scan.student.section,
                "semester": scan.student.semester,
                "out_time": None,
                "in_time": None,
                "parent_phone": scan.student.parent_phone,
            }
        
        if scan.scan_type == "out":
            student_lunch_data[sid]["out_time"] = scan.scanned_at.isoformat()
        elif scan.scan_type == "in":
            student_lunch_data[sid]["in_time"] = scan.scanned_at.isoformat()

    is_today = start_time.date() == now_ist.date()
    now_time = now_ist.strftime("%H:%M")

    for sid, data in student_lunch_data.items():
        sem = active_semesters.get(data["semester"])
        if not sem:
            data["status"] = "returned" if data["in_time"] else "away"
            data["lunch_end"] = None
            continue
        
        data["lunch_end"] = sem.lunch_in_end
        
        if data["in_time"]:
            data["status"] = "returned"
        else:
            if not is_today or now_time > sem.lunch_in_end:
                data["status"] = "missing"
            else:
                data["status"] = "away"

    return list(student_lunch_data.values())
