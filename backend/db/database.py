from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from core.config import settings

# Configure database engine based on DB_TYPE setting ('sqlite' or 'postgres')
db_type = getattr(settings, "DB_TYPE", "sqlite").lower()

if db_type == "sqlite":
    db_name = getattr(settings, "SQLITE_DB_NAME", "gate_pass.db")
    db_url = f"sqlite+aiosqlite:///./{db_name}"
    engine = create_async_engine(
        db_url,
        connect_args={"check_same_thread": False},
        echo=False
    )
else:
    db_url = settings.DATABASE_URL
    if db_url.startswith("postgresql://"):
        db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    engine = create_async_engine(db_url, echo=False)

AsyncSessionLocal = async_sessionmaker(
    bind=engine, class_=AsyncSession, expire_on_commit=False
)

Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
