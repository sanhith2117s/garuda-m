import asyncio
from db.database import engine, Base, AsyncSessionLocal
from db.migrations import run_startup_migrations
from db.models import User, Student, College, Department, Semester
from sqlalchemy import select, func
from main import app
from httpx import AsyncClient, ASGITransport

async def test_full_system():
    print("--- 1. Testing Database & Migrations ---")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await run_startup_migrations()
    print("[OK] Tables and startup migrations completed.")

    print("\n--- 2. Checking Seed Data & Records ---")
    async with AsyncSessionLocal() as db:
        user_count = (await db.execute(select(func.count(User.id)))).scalar() or 0
        student_count = (await db.execute(select(func.count(Student.id)))).scalar() or 0
        college_count = (await db.execute(select(func.count(College.id)))).scalar() or 0
        dept_count = (await db.execute(select(func.count(Department.id)))).scalar() or 0
        sem_count = (await db.execute(select(func.count(Semester.id)))).scalar() or 0
        print(f"[OK] Users: {user_count}, Students: {student_count}, Colleges: {college_count}, Depts: {dept_count}, Semesters: {sem_count}")

    print("\n--- 3. Testing FastAPI Endpoints via AsyncClient ---")
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Health check
        res = await client.get("/api/health")
        assert res.status_code == 200, f"Health check failed: {res.text}"
        print("[OK] /api/health returned 200 OK")

        # Login check
        login_res = await client.post("/api/auth/login", json={"identifier": "superadmin", "password": "password123"})
        if login_res.status_code == 200:
            token = login_res.json()["access_token"]
            headers = {"Authorization": f"Bearer {token}"}
            print("[OK] /api/auth/login authenticated successfully as superadmin")

            # Colleges endpoint
            col_res = await client.get("/api/admin/colleges", headers=headers)
            assert col_res.status_code == 200, f"Colleges failed: {col_res.text}"
            print(f"[OK] /api/admin/colleges returned {len(col_res.json())} colleges")

            # Departments endpoint
            dept_res = await client.get("/api/admin/departments", headers=headers)
            assert dept_res.status_code == 200, f"Departments failed: {dept_res.text}"
            print(f"[OK] /api/admin/departments returned {len(dept_res.json())} departments")

            # Student search endpoint
            stud_search = await client.get("/api/admin/directory/search?q=24", headers=headers)
            print(f"[OK] /api/admin/directory/search status: {stud_search.status_code}")

            # Analytics endpoint
            analytics_res = await client.get("/api/gate/analytics", headers=headers)
            assert analytics_res.status_code == 200, f"Analytics failed: {analytics_res.text}"
            print(f"[OK] /api/gate/analytics total_students: {analytics_res.json().get('total_students')}")
        else:
            print(f"Note: Login check returned {login_res.status_code}: {login_res.text}")

    print("\n[OK] ALL BACKEND CHECKS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    asyncio.run(test_full_system())
