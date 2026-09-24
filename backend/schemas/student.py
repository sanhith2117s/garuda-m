from pydantic import BaseModel
from typing import Optional

class StudentUpdate(BaseModel):
    full_name: Optional[str] = None
    roll_number: Optional[str] = None
    admn_no: Optional[str] = None
    semester: Optional[int] = None
    branch: Optional[str] = None
    section: Optional[str] = None
    status: Optional[str] = None
    status_notes: Optional[str] = None

class StudentResponse(BaseModel):
    id: int
    full_name: str
    roll_number: str
    admn_no: Optional[str] = ""
    semester: Optional[int] = 1
    branch: Optional[str] = ""
    section: Optional[str] = ""
    photo_url: Optional[str] = ""
    is_graduated: bool = False
    graduation_year: Optional[int] = None
    status: Optional[str] = "active"
    status_notes: Optional[str] = ""

    class Config:
        from_attributes = True
