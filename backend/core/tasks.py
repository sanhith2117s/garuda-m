import asyncio
from datetime import datetime, timezone, timedelta
from sqlalchemy.future import select
from sqlalchemy import and_
from db.database import AsyncSessionLocal
from db.models import LeaveRequest, LeaveStatus

async def auto_terminate_passes():
    """
    Background task loop to automatically terminate passes from previous calendar days
    or un-exited passes past 4:30 PM (16:30 IST).
    """
    IST = timezone(timedelta(hours=5, minutes=30))
    while True:
        try:
            now_ist = datetime.now(IST)
            today_start_ist = now_ist.replace(hour=0, minute=0, second=0, microsecond=0)
            
            async with AsyncSessionLocal() as db:
                # Auto-expire passes from previous calendar days at midnight IST
                previous_days_condition = and_(
                    LeaveRequest.approved_at < today_start_ist,
                    LeaveRequest.status.in_([LeaveStatus.approved, LeaveStatus.pending])
                )
                
                result = await db.execute(select(LeaveRequest).where(previous_days_condition))
                requests = result.scalars().all()
                count = 0
                for req in requests:
                    req.status = LeaveStatus.expired
                    req.gate_activated = False
                    count += 1
                
                if count > 0:
                    await db.commit()
                    print(f"[{now_ist.strftime('%Y-%m-%d %H:%M')}] Cleaned up {count} previous day pass requests at midnight.", flush=True)
        except Exception as e:
            print(f"Error in auto_terminate_passes loop: {e}")
        
        # Wait 60 seconds before next check
        await asyncio.sleep(60)


async def auto_promote_semesters():
    """
    Background task loop to automatically promote students of active semesters
    whose end_date is today or in the past (end_date <= today).
    Runs daily at 4:00 PM (16:00) IST.
    """
    from datetime import datetime, timezone, timedelta
    from sqlalchemy.future import select
    from db.database import AsyncSessionLocal
    from db.models import Semester, Student, User, LunchPass

    IST = timezone(timedelta(hours=5, minutes=30))
    last_run_date = None

    while True:
        try:
            now_ist = datetime.now(IST)
            # Check if it's 4:00 PM (hour == 16) and we haven't run today
            if now_ist.hour == 16 and last_run_date != now_ist.date():
                today = now_ist.date()
                print(f"[{now_ist.strftime('%Y-%m-%d %H:%M')}] Starting scheduled semester auto-promotion check...", flush=True)

                async with AsyncSessionLocal() as db:
                    # Query all active semesters with an end_date set
                    result = await db.execute(
                        select(Semester).where(
                            Semester.is_active == True,
                            Semester.end_date != None
                        )
                    )
                    active_semesters = result.scalars().all()
                    
                    promoted_any = False
                    for sem in active_semesters:
                        # end_date is today or past
                        if sem.end_date and sem.end_date <= today:
                            sem_num = sem.semester_number
                            next_num = sem_num + 1
                            print(f"[{now_ist.strftime('%Y-%m-%d %H:%M')}] Auto-promoting Semester {sem_num} (end_date: {sem.end_date})...", flush=True)

                            # Fetch all students in this semester
                            students_res = await db.execute(
                                select(Student).where(Student.semester == sem_num)
                            )
                            students = students_res.scalars().all()
                            count = len(students)

                            for student in students:
                                if next_num <= 8:
                                    student.semester = next_num
                                else:
                                    # Graduated — deactivate user account
                                    user_res = await db.execute(
                                        select(User).where(User.id == student.user_id)
                                    )
                                    u = user_res.scalars().first()
                                    if u:
                                        u.is_active = False
                                    student.status = "graduated"

                                # Deactivate lunch passes for old semester
                                passes_res = await db.execute(
                                    select(LunchPass).where(
                                        LunchPass.student_id == student.id,
                                        LunchPass.semester_id == sem.id
                                    )
                                )
                                for lp in passes_res.scalars().all():
                                    lp.is_active = False

                            # Deactivate old semester
                            sem.is_active = False

                            # Activate or create next semester
                            if next_num <= 8:
                                next_sem_res = await db.execute(
                                    select(Semester).where(Semester.semester_number == next_num)
                                )
                                next_sem = next_sem_res.scalars().first()
                                if next_sem:
                                    next_sem.is_active = True
                                else:
                                    db.add(Semester(
                                        semester_number=next_num,
                                        is_active=True,
                                        late_comer_limit=sem.late_comer_limit,
                                        late_comer_cutoff=sem.late_comer_cutoff,
                                        lunch_out_start=sem.lunch_out_start,
                                        lunch_out_end=sem.lunch_out_end,
                                        lunch_in_start=sem.lunch_in_start,
                                        lunch_in_end=sem.lunch_in_end,
                                    ))
                            
                            print(f"[{now_ist.strftime('%Y-%m-%d %H:%M')}] Successfully auto-promoted {count} students from Semester {sem_num} to {next_num}.", flush=True)
                            promoted_any = True

                    if promoted_any:
                        await db.commit()
                
                # Mark as run for today
                last_run_date = today

        except Exception as e:
            print(f"Error in auto_promote_semesters loop: {e}", flush=True)

        # Check every 60 seconds
        await asyncio.sleep(60)

