import asyncio
import csv
import os
from sqlalchemy import delete
from sqlalchemy.future import select
from db.database import AsyncSessionLocal
from db.models import Student, College, Department, Semester, LeaveRequest, LunchPass, LunchScan, LateComer, CustomPassAssignment, CustomPassScan


async def seed_from_kmec_and_ngit():
    async with AsyncSessionLocal() as db:
        print("[Manual Seed] Starting CSV Seed for KMEC & NGIT...")

        # 1. Ensure Colleges exist
        colleges_def = [
            {"name": "Keshav Memorial Engineering College", "code": "KMEC", "address": "Hyderabad"},
            {"name": "Neil Gogte Institute of Technology", "code": "NGIT", "address": "Hyderabad"}
        ]
        college_objs = {}
        for c in colleges_def:
            res = await db.execute(select(College).where(College.code == c["code"]))
            col = res.scalars().first()
            if not col:
                col = College(name=c["name"], code=c["code"], address=c["address"])
                db.add(col)
                await db.flush()
                print(f"[Manual Seed] Created College: {c['name']} ({c['code']})")
            college_objs[c["code"]] = col
        await db.commit()

        kmec = college_objs["KMEC"]
        ngit = college_objs["NGIT"]

        # 2. Ensure Departments exist
        depts_data = [
            {"college_id": kmec.id, "name": "Humanities & Sciences", "code": "H&S", "is_hs": True},
            {"college_id": kmec.id, "name": "Computer Science & Engineering", "code": "CSE", "is_hs": False},
            {"college_id": kmec.id, "name": "CSE (AI & ML)", "code": "CSM", "is_hs": False},
            {"college_id": ngit.id, "name": "Humanities & Sciences", "code": "H&S", "is_hs": True},
            {"college_id": ngit.id, "name": "Computer Science & Engineering", "code": "CSE", "is_hs": False},
            {"college_id": ngit.id, "name": "CSE (AI & ML)", "code": "CSM", "is_hs": False},
        ]
        dept_objs = {}
        for d in depts_data:
            res = await db.execute(select(Department).where(Department.college_id == d["college_id"], Department.code == d["code"]))
            dept = res.scalars().first()
            if not dept:
                dept = Department(college_id=d["college_id"], name=d["name"], code=d["code"], is_hs=d["is_hs"])
                db.add(dept)
                await db.flush()
            dept_objs[(d["college_id"], d["code"])] = dept
        await db.commit()

        # 3. Ensure Semesters 1..8 exist
        for col_id in [kmec.id, ngit.id]:
            for sem_num in range(1, 9):
                res = await db.execute(select(Semester).where(Semester.college_id == col_id, Semester.semester_number == sem_num))
                if not res.scalars().first():
                    db.add(Semester(
                        college_id=col_id,
                        semester_number=sem_num,
                        is_active=(sem_num in [1, 3, 5, 7]),
                        late_comer_limit=5,
                        late_comer_cutoff="11:00",
                        lunch_out_start="12:30",
                        lunch_out_end="13:00",
                        lunch_in_start="13:00",
                        lunch_in_end="13:30"
                    ))
        await db.commit()

        # 4. Clear existing Student records and pass history (leaving Admin/HOD/Security intact)
        print("[Manual Seed] Clearing old student records and pass history...")
        await db.execute(delete(CustomPassScan))
        await db.execute(delete(CustomPassAssignment))
        await db.execute(delete(LateComer))
        await db.execute(delete(LunchScan))
        await db.execute(delete(LunchPass))
        await db.execute(delete(LeaveRequest))
        await db.execute(delete(Student))
        await db.commit()

        csv_files = [
            ("kmec.csv", kmec),
            ("ngit.csv", ngit)
        ]

        total_seeded = 0
        seen_rolls = set()
        seen_admns = set()

        for filename, col in csv_files:
            candidate_paths = [
                os.path.join(os.path.dirname(__file__), "data", filename),
                os.path.join(os.path.dirname(__file__), filename),
                os.path.join(os.path.dirname(os.path.dirname(__file__)), "sample_data", filename),
            ]
            filepath = next((p for p in candidate_paths if os.path.exists(p)), None)
            if not filepath:
                print(f"[Manual Seed] Warning: {filename} not found in {[os.path.basename(p) for p in candidate_paths]}")
                continue

            print(f"[Manual Seed] Processing {filename} for {col.code}...")
            student_records = []

            with open(filepath, newline="", encoding="utf-8-sig") as f:
                reader = csv.DictReader(f)
                for raw_row in reader:
                    row = {k.strip(): (v.strip() if v else "") for k, v in raw_row.items() if k}
                    roll = row.get("roll_number", "").strip()
                    if not roll or roll.lower() in seen_rolls:
                        continue
                    seen_rolls.add(roll.lower())

                    raw_admn = row.get("admn_no", "").strip()
                    if raw_admn and raw_admn.lower() not in seen_admns:
                        admn_no = raw_admn
                        seen_admns.add(raw_admn.lower())
                    else:
                        admn_no = None

                    full_name = row.get("full_name", roll).strip()
                    branch = row.get("branch", "CSE").strip().upper()
                    section = row.get("section", "A").strip().upper()
                    try:
                        semester_num = int(row.get("semester", 1))
                    except ValueError:
                        semester_num = 1

                    # Resolve department: Semester 1 -> H&S; Semester 2+ -> CSE or CSM
                    if semester_num == 1:
                        dept = dept_objs.get((col.id, "H&S"))
                    elif branch == "CSM":
                        dept = dept_objs.get((col.id, "CSM"))
                    else:
                        dept = dept_objs.get((col.id, "CSE"))

                    dept_id = dept.id if dept else None

                    st = Student(
                        college_id=col.id,
                        department_id=dept_id,
                        admn_no=admn_no,
                        roll_number=roll,
                        full_name=full_name,
                        branch=branch,
                        section=section,
                        semester=semester_num,
                        status="active"
                    )
                    student_records.append(st)

            db.add_all(student_records)
            await db.commit()
            print(f"[Manual Seed] Successfully loaded {len(student_records)} students from {filename}!")
            total_seeded += len(student_records)

        print(f"[Manual Seed] Done! Total {total_seeded} students seeded into the database.")


if __name__ == "__main__":
    asyncio.run(seed_from_kmec_and_ngit())
