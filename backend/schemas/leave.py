from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class LeaveRequestCreate(BaseModel):
    reason: str
    notes: Optional[str] = None

class LeaveRequestResponse(BaseModel):
    id: int
    student_id: int
    reason: str
    notes: Optional[str] = None
    status: Optional[str] = "approved"
    requested_at: Optional[datetime] = None
    approved_at: Optional[datetime] = None
    remarks: Optional[str] = None

    class Config:
        from_attributes = True

class LeaveApproval(BaseModel):
    status: str # "approved" or "rejected"
    remarks: Optional[str] = None
    parent_called: bool = False

class QRValidation(BaseModel):
    qr_token: str
