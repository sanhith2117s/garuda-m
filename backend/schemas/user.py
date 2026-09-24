from pydantic import BaseModel
from typing import Optional

class UserLogin(BaseModel):
    identifier: str
    password: str
    role_type: str = "student"

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    college_id: Optional[int] = None
    college_name: Optional[str] = None
    college_code: Optional[str] = None
    username: Optional[str] = None
    full_name: Optional[str] = None

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None

class PasswordChange(BaseModel):
    old_password: Optional[str] = None
    new_password: str
    confirm_password: Optional[str] = None
