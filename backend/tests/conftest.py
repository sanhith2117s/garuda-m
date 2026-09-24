import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import StaticPool

from main import app
from db.database import Base, get_db
from db.models import User, Student, College, Department, Semester, Section, UserRole
from core.security import get_password_hash, create_access_token

# Dedicated isolated in-memory test database for test runs
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestAsyncSessionLocal = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

# Precomputed bcrypt hash of 'password123'
PRECOMPUTED_HASH = get_password_hash("password123")

@pytest_asyncio.fixture(scope="function")
async def db_session():
    """Create a fresh database session for each test function."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestAsyncSessionLocal() as session:
        # Seed core fixtures
        college = College(id=1, name="Test College", code="TEST_COLLEGE")
        dept = Department(id=1, name="Computer Science", code="CSE", college_id=1, hod1_id=3)
        sem = Semester(id=1, college_id=1, semester_number=3, is_active=True)
        sec = Section(id=1, college_id=1, department_id=1, year=2, name="A")
        
        # Super Admin
        super_admin = User(
            id=1,
            username="superadmin",
            full_name="Super Admin",
            hashed_password=PRECOMPUTED_HASH,
            role=UserRole.super_admin,
            college_id=None,
            is_active=True,
        )
        # Admin
        admin = User(
            id=2,
            username="admin",
            full_name="College Admin",
            hashed_password=PRECOMPUTED_HASH,
            role=UserRole.admin,
            college_id=1,
            is_active=True,
        )
        # HOD
        hod = User(
            id=3,
            username="hod_cse",
            full_name="HOD CSE",
            hashed_password=PRECOMPUTED_HASH,
            role=UserRole.hod,
            college_id=1,
            is_active=True,
        )
        # Mentor
        mentor = User(
            id=4,
            username="mentor_cse",
            full_name="Mentor CSE",
            hashed_password=PRECOMPUTED_HASH,
            role=UserRole.mentor,
            college_id=1,
            is_active=True,
        )
        # Security
        security_user = User(
            id=5,
            username="security_main",
            full_name="Main Gate Security",
            hashed_password=PRECOMPUTED_HASH,
            role=UserRole.security,
            college_id=1,
            is_active=True,
        )
        # Student User
        student_user = User(
            id=6,
            username="24TEST001",
            full_name="John Doe",
            hashed_password=PRECOMPUTED_HASH,
            role=UserRole.student,
            college_id=1,
            is_active=True,
        )
        # Student Profile
        student = Student(
            id=1,
            user_id=6,
            college_id=1,
            roll_number="24TEST001",
            full_name="John Doe",
            department_id=1,
            semester=1,
            section_id=1,
            status="active",
            parent_phone="9876543210",
        )

        session.add_all([college, dept, sem, sec, super_admin, admin, hod, mentor, security_user, student_user, student])
        await session.commit()
        yield session

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest_asyncio.fixture(scope="function")
async def client(db_session):
    """Async HTTP test client with database dependency override."""
    async def override_get_db():
        async with TestAsyncSessionLocal() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()

@pytest.fixture
def auth_tokens():
    """Generate valid JWT tokens for test roles."""
    return {
        "super_admin": create_access_token(subject="superadmin", role="super_admin"),
        "admin": create_access_token(subject="admin", role="admin"),
        "hod": create_access_token(subject="hod_cse", role="hod"),
        "mentor": create_access_token(subject="mentor_cse", role="mentor"),
        "security": create_access_token(subject="security_main", role="security"),
        "student": create_access_token(subject="24TEST001", role="student"),
    }
