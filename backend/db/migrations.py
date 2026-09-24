"""
Database Startup Migrations & Normalization Helper
===================================================
1. Adds missing columns to existing SQLite/Postgres tables safely (schema evolution).
2. Automatically extracts existing unique (college_id, department_id, section) combinations
   from the `students` table, populates missing `Section` entities, and links `students.section_id`.
3. Auto-syncs Department.hod1_id and hod2_id assignments into `HODAssignment` records.
"""

from sqlalchemy.future import select
from sqlalchemy import text
from db.database import AsyncSessionLocal
from db.models import Student, Section, Department, HODAssignment, User


async def add_missing_columns(db):
    """Safely execute ALTER TABLE ADD COLUMN if the column does not exist."""
    alter_statements = [
        # User columns
        ("users", "is_unavailable", "BOOLEAN DEFAULT FALSE"),
        ("users", "unavailable_reason", "TEXT"),
        ("users", "absence_start", "TIMESTAMP"),
        ("users", "absence_end", "TIMESTAMP"),
        # Student columns
        ("students", "section_id", "INTEGER"),
        ("students", "user_id", "INTEGER"),
        ("students", "parent_phone", "VARCHAR(20)"),
        ("students", "secondary_phone", "VARCHAR(20)"),
        # Section columns
        ("sections", "year", "INTEGER DEFAULT 1"),
        # Semester columns
        ("semesters", "max_normal_passes", "INTEGER DEFAULT 5"),
        ("semesters", "max_late_entries", "INTEGER DEFAULT 3"),
        # LeaveRequest columns
        ("leave_requests", "is_emergency", "BOOLEAN DEFAULT FALSE"),
        ("leave_requests", "emergency_reason", "TEXT"),
        ("leave_requests", "is_fallback_approval", "BOOLEAN DEFAULT FALSE"),
        ("leave_requests", "fallback_reason", "TEXT"),
        ("leave_requests", "valid_until", "TIMESTAMP"),
        ("leave_requests", "issued_by_role", "VARCHAR(50)"),
        ("leave_requests", "delegated_hod_id", "INTEGER"),
        ("leave_requests", "requested_by_id", "INTEGER"),
        ("leave_requests", "created_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP"),
        # LateComer columns
        ("late_comers", "is_exception", "BOOLEAN DEFAULT FALSE"),
        ("late_comers", "approved_by", "INTEGER"),
        ("late_comers", "exception_reason", "TEXT"),
        # HODAssignment columns
        ("hod_assignments", "years", "VARCHAR(50)"),
        # MentorAssignment columns
        ("mentor_assignments", "year", "INTEGER"),
    ]

    for table, col, col_def in alter_statements:
        try:
            await db.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {col_def}"))
            await db.commit()
        except Exception:
            # Column likely already exists
            await db.rollback()


async def sync_hod_department_allotments(db):
    """Auto-sync Department.hod1_id and hod2_id into HODAssignment table."""
    try:
        dept_res = await db.execute(select(Department))
        departments = dept_res.scalars().all()

        hod_assign_res = await db.execute(select(HODAssignment))
        existing_assigns = hod_assign_res.scalars().all()

        existing_keys = {
            (a.hod_id, a.department_id, a.year) for a in existing_assigns if a.is_active
        }

        created_count = 0
        for dept in departments:
            hod_ids = [h_id for h_id in [dept.hod1_id, dept.hod2_id] if h_id]
            target_year = 1 if dept.is_hs else None

            for h_id in hod_ids:
                # Check if this HOD is already mapped to this department
                has_mapping = any(a.hod_id == h_id and a.department_id == dept.id for a in existing_assigns if a.is_active)
                if not has_mapping:
                    # Check user exists
                    usr = await db.get(User, h_id)
                    if usr:
                        new_a = HODAssignment(
                            hod_id=h_id,
                            college_id=dept.college_id,
                            department_id=dept.id,
                            year=target_year,
                            is_active=True
                        )
                        db.add(new_a)
                        created_count += 1

        if created_count > 0:
            await db.commit()
            print(f"[Migration] Auto-synced {created_count} pre-assigned Department HODs into HODAssignment table.")
    except Exception as e:
        print(f"[Migration] Warning during HOD assignment sync: {e}")
        await db.rollback()


async def run_startup_migrations():
    async with AsyncSessionLocal() as db:
        # Step 1: Ensure new columns exist on existing tables
        await add_missing_columns(db)

        # Step 2: Sync department-level HODs into HODAssignment table
        await sync_hod_department_allotments(db)

        # Step 3: Auto-create Section entities and map student section_ids
        try:
            res = await db.execute(
                select(Student).where(
                    Student.section.isnot(None),
                    Student.section != "",
                    Student.college_id.isnot(None),
                    Student.department_id.isnot(None)
                )
            )
            students = res.scalars().all()

            if not students:
                return

            sec_res = await db.execute(select(Section))
            existing_sections = sec_res.scalars().all()
            
            section_map = {
                (s.college_id, s.department_id, s.name.upper()): s.id
                for s in existing_sections
            }

            created_count = 0
            updated_count = 0

            for student in students:
                sec_name = student.section.strip().upper()
                if not sec_name:
                    continue

                key = (student.college_id, student.department_id, sec_name)
                
                if key not in section_map:
                    new_sec = Section(
                        college_id=student.college_id,
                        department_id=student.department_id,
                        name=sec_name,
                        is_active=True
                    )
                    db.add(new_sec)
                    await db.flush()
                    section_map[key] = new_sec.id
                    created_count += 1

                if student.section_id != section_map[key]:
                    student.section_id = section_map[key]
                    updated_count += 1

            await db.commit()
            if created_count > 0 or updated_count > 0:
                print(f"[Migration] Auto-created {created_count} Section entities and mapped {updated_count} student section_ids.")

        except Exception as e:
            print(f"[Migration] Warning during section normalization: {e}")
            await db.rollback()
