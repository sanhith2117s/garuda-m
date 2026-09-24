from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Student Leave Management API"
    ENVIRONMENT: str = "development"
    DB_TYPE: str = "sqlite"
    SQLITE_DB_NAME: str = "gate_pass.db"
    DATABASE_URL: str = "postgresql://user:password@db:5432/student_leave_db"
    REDIS_URL: str = ""
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    QR_TOKEN_EXPIRE_HOURS: int = 12

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
