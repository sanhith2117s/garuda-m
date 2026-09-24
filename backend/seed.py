import asyncio
from sqlalchemy.future import select
from sqlalchemy import delete
from db.database import AsyncSessionLocal
from db.models import User, Student, UserRole, College, Department, Semester
from core.security import get_password_hash

async def seed_db():
    async with AsyncSessionLocal() as db:
        # 1. Create Colleges: KMEC and NGIT
        colleges_def = [
            {"name": "Keshav Memorial Engineering College", "code": "KMEC", "address": "Hyderabad"},
            {"name": "Neil Gogte Institute of Technology", "code": "NGIT", "address": "Hyderabad"}
        ]
        college_objs = {}
        for c in colleges_def:
            res = await db.execute(select(College).where(College.code == c["code"]))
            existing = res.scalars().first()
            if not existing:
                col = College(name=c["name"], code=c["code"], address=c["address"])
                db.add(col)
                await db.flush()
                college_objs[c["code"]] = col
                print(f"[Seed] Created College: {c['name']} ({c['code']})")
            else:
                college_objs[c["code"]] = existing

        await db.commit()

        kmec = college_objs.get("KMEC")
        ngit = college_objs.get("NGIT")

        # 2. Create Users: superadmin, admins, security, and HODs for ALL departments
        users_def = [
            {"username": "superadmin", "full_name": "Super Admin", "role": UserRole.super_admin, "college_id": None},
            {"username": "adminkmec", "full_name": "KMEC Admin", "role": UserRole.admin, "college_id": kmec.id if kmec else None},
            {"username": "adminngit", "full_name": "NGIT Admin", "role": UserRole.admin, "college_id": ngit.id if ngit else None},
            {"username": "security", "full_name": "Gate Security", "role": UserRole.security, "college_id": None},
            # KMEC HODs
            {"username": "hod_hs_kmec", "full_name": "H&S HOD KMEC", "role": UserRole.hod, "college_id": kmec.id if kmec else None},
            {"username": "hod_cse_kmec", "full_name": "CSE HOD KMEC", "role": UserRole.hod, "college_id": kmec.id if kmec else None},
            {"username": "hod_csm_kmec", "full_name": "CSM HOD KMEC", "role": UserRole.hod, "college_id": kmec.id if kmec else None},
            # NGIT HODs
            {"username": "hod_hs_ngit", "full_name": "H&S HOD NGIT", "role": UserRole.hod, "college_id": ngit.id if ngit else None},
            {"username": "hod_cse_ngit", "full_name": "CSE HOD NGIT", "role": UserRole.hod, "college_id": ngit.id if ngit else None},
            {"username": "hod_csm_ngit", "full_name": "CSM HOD NGIT", "role": UserRole.hod, "college_id": ngit.id if ngit else None},
            # Mentors
            {"username": "mentorkmec", "full_name": "KMEC Faculty Mentor", "role": UserRole.mentor, "college_id": kmec.id if kmec else None},
            {"username": "mentorngit", "full_name": "NGIT Faculty Mentor", "role": UserRole.mentor, "college_id": ngit.id if ngit else None},
        ]

        user_objs = {}
        for u in users_def:
            res = await db.execute(select(User).where(User.username == u["username"]))
            existing = res.scalars().first()
            if not existing:
                usr = User(
                    username=u["username"],
                    full_name=u["full_name"],
                    hashed_password=get_password_hash("password123"),
                    role=u["role"],
                    college_id=u["college_id"]
                )
                db.add(usr)
                await db.flush()
                user_objs[u["username"]] = usr
                print(f"[Seed] Created User: {u['username']} ({u['role']})")
            else:
                user_objs[u["username"]] = existing

        await db.commit()

        # 3. Create Departments for KMEC and NGIT with assigned HODs
        dept_objs = {}
        if kmec and ngit:
            depts_data = [
                {"college_id": kmec.id, "name": "Humanities & Sciences", "code": "H&S", "is_hs": True, "hod_user": "hod_hs_kmec"},
                {"college_id": kmec.id, "name": "Computer Science & Engineering", "code": "CSE", "is_hs": False, "hod_user": "hod_cse_kmec"},
                {"college_id": kmec.id, "name": "CSE (AI & ML)", "code": "CSM", "is_hs": False, "hod_user": "hod_csm_kmec"},
                {"college_id": ngit.id, "name": "Humanities & Sciences", "code": "H&S", "is_hs": True, "hod_user": "hod_hs_ngit"},
                {"college_id": ngit.id, "name": "Computer Science & Engineering", "code": "CSE", "is_hs": False, "hod_user": "hod_cse_ngit"},
                {"college_id": ngit.id, "name": "CSE (AI & ML)", "code": "CSM", "is_hs": False, "hod_user": "hod_csm_ngit"},
            ]
            for d in depts_data:
                res = await db.execute(
                    select(Department).where(Department.college_id == d["college_id"], Department.code == d["code"])
                )
                dept_obj = res.scalars().first()
                hod_usr = user_objs.get(d["hod_user"])
                hod_id = hod_usr.id if hod_usr else None

                if not dept_obj:
                    dept_obj = Department(
                        college_id=d["college_id"],
                        name=d["name"],
                        code=d["code"],
                        is_hs=d.get("is_hs", False),
                        hod1_id=hod_id
                    )
                    db.add(dept_obj)
                    await db.flush()
                    print(f"[Seed] Created Department: {d['code']} for College ID {d['college_id']}")
                else:
                    if hod_id and not dept_obj.hod1_id:
                        dept_obj.hod1_id = hod_id
                
                dept_objs[(d["college_id"], d["code"])] = dept_obj

            await db.commit()

        # 4. Activate Semesters 1, 3, 5, 7
        active_sems_default = [1, 3, 5, 7]
        for col in [kmec, ngit]:
            if not col: continue
            for sem_num in range(1, 9):
                res = await db.execute(
                    select(Semester).where(Semester.college_id == col.id, Semester.semester_number == sem_num)
                )
                existing_sem = res.scalars().first()
                if not existing_sem:
                    sem = Semester(
                        college_id=col.id,
                        semester_number=sem_num,
                        is_active=(sem_num in active_sems_default),
                        late_comer_limit=5,
                        late_comer_cutoff="11:00",
                        lunch_out_start="12:30",
                        lunch_out_end="13:00",
                        lunch_in_start="13:00",
                        lunch_in_end="13:30"
                    )
                    db.add(sem)
                    print(f"[Seed] Created Semester {sem_num} for College {col.code}")
                else:
                    existing_sem.is_active = (sem_num in active_sems_default)

        await db.commit()

        # 5. Seed Students for ALL active semesters & departments (Semesters 1, 3, 5, 7)
        print("[Seed] Seeding students for KMEC and NGIT across Semesters 1, 3, 5, 7...")
        # Clear existing student records if any
        await db.execute(delete(Student))
        await db.commit()

        first_names = ["AARAV", "VIVAAN", "ADITYA", "VIHRAN", "ARJUN", "SAI", "KAVYA", "ANANYA", "DIYA", "RHEA", "PRANAY", "ROHAN", "SANJANA", "ISHA", "NEHA", "VARUN", "KIRAN", "TEJA", "HARSH", "MANISH"]
        last_names = ["SHARMA", "VERMA", "REDDY", "RAO", "KUMAR", "GUPTA", "SINGH", "CHOWDHURY", "PATEL", "JOSHI"]
        admn_counter = 1001

        col_configs = [
            (kmec, "55"),
            (ngit, "53")
        ]

        new_students = []

        for col, col_num in col_configs:
            hs_dept = dept_objs.get((col.id, "H&S"))
            cse_dept = dept_objs.get((col.id, "CSE"))
            csm_dept = dept_objs.get((col.id, "CSM"))

            for sem in active_sems_default:
                year_prefix = str(25 - (sem // 2))

                # 1st Year (Sem 1) -> H&S department ID; 2nd-4th Year -> CSE / CSM department ID
                cse_did = hs_dept.id if sem == 1 and hs_dept else (cse_dept.id if cse_dept else None)
                csm_did = hs_dept.id if sem == 1 and hs_dept else (csm_dept.id if csm_dept else None)

                branches = [
                    ("CSE", cse_did, ["A", "B", "C", "D", "E"], "05"),
                    ("CSM", csm_did, ["A", "B"], "66")
                ]

                for branch, dept_id, sections, code_prefix in branches:
                    for sec in sections:
                        for i in range(1, 3):
                            admn_no = str(admn_counter)
                            admn_counter += 1

                            roll_num = f"{year_prefix}{col_num}1A{code_prefix}{sec}{sem}{i:02d}"

                            fn = first_names[(admn_counter + i) % len(first_names)]
                            ln = last_names[(admn_counter + i) % len(last_names)]
                            full_name = f"{fn} {ln}"

                            new_students.append(Student(
                                college_id=col.id,
                                department_id=dept_id,
                                admn_no=admn_no,
                                roll_number=roll_num,
                                full_name=full_name,
                                branch=branch,
                                section=sec,
                                semester=sem,
                                status="active"
                            ))

        db.add_all(new_students)
        await db.commit()
        print(f"[Seed] Successfully seeded {len(new_students)} students across Semesters 1, 3, 5, 7 for KMEC and NGIT!")

        print("[Seed] Full database setup completed successfully.")

if __name__ == "__main__":
    asyncio.run(seed_db())
