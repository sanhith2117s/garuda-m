from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
import asyncio
from contextlib import asynccontextmanager

from core.config import settings
from db.database import engine, Base, AsyncSessionLocal
from sqlalchemy.future import select
import db.models  # noqa: F401
from db.models import User

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Create tables if they do not exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # 2. Run section migration and data normalization
    try:
        from db.migrations import run_startup_migrations
        await run_startup_migrations()
    except Exception as e:
        print(f"[Startup] Migration error: {e}")

    # 3. Check if DB has users. If completely empty, perform initial seed
    async with AsyncSessionLocal() as db:
        existing_user = (await db.execute(select(User))).scalars().first()
        has_data = existing_user is not None

    if not has_data:
        print("[Startup] Empty database detected. Auto-seeding baseline users and student CSV data...")
        try:
            from seed import seed_db
            await seed_db()
            from seed_csv import seed_from_kmec_and_ngit
            await seed_from_kmec_and_ngit()
        except Exception as e:
            print(f"[Startup] Error during initial auto-seeding: {e}")
    else:
        print("[Startup] Database already initialized with existing data.")

    # 4. Start background tasks
    from core.tasks import auto_terminate_passes, auto_promote_semesters
    task1 = asyncio.create_task(auto_terminate_passes())
    task2 = asyncio.create_task(auto_promote_semesters())
    
    yield
    
    task1.cancel()
    task2.cancel()

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url="/api/openapi.json",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "environment": settings.ENVIRONMENT}

from api import auth, gate, semester, lunch, latecomers, bulk, onboarding, custom_pass, directory, colleges, departments, exports, users, sections, mentors, hod, announcements, audit, hod_assignments, student

app.include_router(auth.router,             prefix="/api/auth",                   tags=["Auth"])
app.include_router(student.router,          prefix="/api/student",                tags=["Student Operations"])
app.include_router(gate.router,             prefix="/api/gate",                   tags=["Gate Operations"])
app.include_router(semester.router,         prefix="/api/admin",                  tags=["Semester Management"])
app.include_router(lunch.router,            prefix="/api/admin/lunch",            tags=["Lunch Pass"])
app.include_router(latecomers.router,       prefix="/api/admin/latecomers",       tags=["Late Comers"])
app.include_router(bulk.router,             prefix="/api/bulk",                   tags=["Bulk Passes"])
app.include_router(onboarding.router,       prefix="/api/admin",                  tags=["Onboarding"])
app.include_router(custom_pass.router,      prefix="/api/admin/custom-passes",    tags=["Custom Passes"])
app.include_router(directory.router,        prefix="/api/admin/directory",        tags=["Student Directory"])
app.include_router(colleges.router,         prefix="/api/admin/colleges",         tags=["Colleges"])
app.include_router(departments.router,      prefix="/api/admin/departments",      tags=["Departments"])
app.include_router(exports.router,          prefix="/api/admin/exports",          tags=["Exports"])
app.include_router(users.router,            prefix="/api/admin/users",            tags=["Users"])
app.include_router(sections.router,         prefix="/api/admin/sections",         tags=["Sections"])
app.include_router(mentors.router,          prefix="/api/admin/mentors",          tags=["Mentors"])
app.include_router(mentors.router,          prefix="/api/admin",                  tags=["Mentors"])
app.include_router(hod.router,              prefix="/api/hod",                    tags=["HOD Operations"])
app.include_router(hod_assignments.router)
app.include_router(announcements.router,   prefix="/api",                        tags=["Announcements & Notifications"])
app.include_router(audit.router,           prefix="/api/admin",                  tags=["Audit Logs"])

# Serve static files (student photos)
os.makedirs("static/photos", exist_ok=True)
app.mount("/api/static", StaticFiles(directory="static"), name="static")
