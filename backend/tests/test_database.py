import pytest
from sqlalchemy import select, func
from sqlalchemy.exc import IntegrityError
from db.models import User, Student, College, UserRole

@pytest.mark.unit
async def test_user_unique_username_constraint(db_session):
    # Attempting to create user with duplicate username
    u1 = User(
        username="duplicate_user",
        hashed_password="pw",
        role=UserRole.student,
        college_id=1,
    )
    db_session.add(u1)
    await db_session.commit()

    u2 = User(
        username="duplicate_user",
        hashed_password="pw",
        role=UserRole.student,
        college_id=1,
    )
    db_session.add(u2)
    with pytest.raises(IntegrityError):
        await db_session.commit()
    await db_session.rollback()

@pytest.mark.unit
async def test_student_unique_roll_number(db_session):
    # Attempting to add duplicate roll number
    s = Student(
        college_id=1,
        roll_number="24TEST001",
        full_name="Duplicate Student",
        department_id=1,
        semester=1,
        section_id=1,
    )
    db_session.add(s)
    with pytest.raises(IntegrityError):
        await db_session.commit()
    await db_session.rollback()

@pytest.mark.unit
async def test_database_counts(db_session):
    res = await db_session.execute(select(func.count(College.id)))
    count = res.scalar()
    assert count >= 1
