from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Date, ForeignKey, Text, Enum, UniqueConstraint
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from db.database import Base
import enum


class UserRole(str, enum.Enum):
    super_admin = "super_admin"
    admin = "admin"
    hod = "hod"
    mentor = "mentor"
    security = "security"
    student = "student"
    # Legacy alias
    gate_admin = "admin"


class LeaveStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    exited = "exited"
    returned = "returned"
    expired = "expired"


class College(Base):
    __tablename__ = "colleges"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), unique=True, nullable=False)
    code = Column(String(20), unique=True, index=True, nullable=False)   # e.g., "KMEC", "NGIT"
    address = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    departments = relationship("Department", back_populates="college")
    users = relationship("User", back_populates="college")
    students = relationship("Student", back_populates="college")


class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    college_id = Column(Integer, ForeignKey("colleges.id"), nullable=False)
    name = Column(String(100), nullable=False)                         # e.g., "Humanities & Sciences"
    code = Column(String(20), nullable=False)                          # e.g., "H&S", "CSE"
    is_hs = Column(Boolean, default=False)                              # True for 1st year H&S department
    hod1_id = Column(Integer, ForeignKey("users.id"), nullable=True)   # Primary HOD
    hod2_id = Column(Integer, ForeignKey("users.id"), nullable=True)   # Secondary HOD
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    college = relationship("College", back_populates="departments")
    hod1 = relationship("User", foreign_keys=[hod1_id])
    hod2 = relationship("User", foreign_keys=[hod2_id])
    sections = relationship("Section", back_populates="department")


class Section(Base):
    __tablename__ = "sections"

    id = Column(Integer, primary_key=True, index=True)
    college_id = Column(Integer, ForeignKey("colleges.id"), nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    year = Column(Integer, default=1)                                  # 1=Year I, 2=Year II, 3=Year III, 4=Year IV
    name = Column(String(50), nullable=False)                          # e.g., "A", "B", "C"
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    college = relationship("College")
    department = relationship("Department", back_populates="sections")

    __table_args__ = (
        UniqueConstraint("college_id", "department_id", "name", name="uq_section_college_dept_name"),
    )


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    college_id = Column(Integer, ForeignKey("colleges.id"), nullable=True)  # Null for super_admin
    username = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=True)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(UserRole, name="user_role", values_callable=lambda obj: [e.value for e in obj]), nullable=False)
    is_active = Column(Boolean, default=True)
    is_unavailable = Column(Boolean, default=False)
    unavailable_reason = Column(Text, nullable=True)
    absence_start = Column(DateTime(timezone=True), nullable=True)
    absence_end = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    college = relationship("College", back_populates="users")


class HODAssignment(Base):
    __tablename__ = "hod_assignments"

    id = Column(Integer, primary_key=True, index=True)
    hod_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    college_id = Column(Integer, ForeignKey("colleges.id"), nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    year = Column(Integer, nullable=True)                              # 1, 2, 3, 4, or None for all years
    years = Column(String(50), nullable=True)                          # e.g., "1", "2,3", "4", "all"
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    hod = relationship("User", foreign_keys=[hod_id])
    college = relationship("College")
    department = relationship("Department")


class MentorAssignment(Base):
    __tablename__ = "mentor_assignments"

    id = Column(Integer, primary_key=True, index=True)
    mentor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    college_id = Column(Integer, ForeignKey("colleges.id"), nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    section_id = Column(Integer, ForeignKey("sections.id"), nullable=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=True)
    year = Column(Integer, nullable=True)                              # 1, 2, 3, 4, or None
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    mentor = relationship("User", foreign_keys=[mentor_id])
    college = relationship("College")
    department = relationship("Department")
    section = relationship("Section")
    student = relationship("Student")


class Semester(Base):
    __tablename__ = "semesters"

    id = Column(Integer, primary_key=True, index=True)
    college_id = Column(Integer, ForeignKey("colleges.id"), nullable=True)
    semester_number = Column(Integer, nullable=False)
    is_active = Column(Boolean, default=True)
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    max_normal_passes = Column(Integer, default=5)
    max_late_entries = Column(Integer, default=3)
    late_comer_limit = Column(Integer, default=5)
    late_comer_cutoff = Column(String, default="11:00")
    lunch_out_start = Column(String, default="12:30")
    lunch_out_end   = Column(String, default="13:00")
    lunch_in_start  = Column(String, default="13:00")
    lunch_in_end    = Column(String, default="13:30")
    both_approvals_required = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    college = relationship("College")


class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    college_id = Column(Integer, ForeignKey("colleges.id"), nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    section_id = Column(Integer, ForeignKey("sections.id"), nullable=True)
    admn_no = Column(String, unique=True, index=True, nullable=True)   # from QR / htno
    roll_number = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    branch = Column(String, nullable=True)                             # e.g., CSE, CSM
    section = Column(String, nullable=True)                            # e.g., A, B
    semester = Column(Integer, default=1)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    parent_phone = Column(String(20), nullable=True)
    secondary_phone = Column(String(20), nullable=True)
    status = Column(String, default="active")                          # active, rusticated, blacklisted, tc_taken, left_college
    status_notes = Column(Text, nullable=True)

    college = relationship("College", back_populates="students")
    department = relationship("Department")
    section_rel = relationship("Section")
    user = relationship("User")
    lunch_passes = relationship("LunchPass", back_populates="student")
    late_comers = relationship("LateComer", back_populates="student")


class LeaveRequest(Base):
    __tablename__ = "leave_requests"

    id = Column(Integer, primary_key=True, index=True)
    college_id = Column(Integer, ForeignKey("colleges.id"), nullable=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    reason = Column(String, nullable=False)
    notes = Column(Text, nullable=True)
    status = Column(Enum(LeaveStatus, name="leave_status", values_callable=lambda obj: [e.value for e in obj]), default=LeaveStatus.approved, nullable=True)
    semester = Column(Integer, nullable=True)
    requested_at = Column(DateTime(timezone=True), nullable=True)
    approved_at = Column(DateTime(timezone=True), server_default=func.now())
    approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    remarks = Column(Text, nullable=True)
    parent_called = Column(Boolean, default=False)
    gate_activated = Column(Boolean, default=True)
    is_emergency = Column(Boolean, default=False)
    emergency_reason = Column(Text, nullable=True)
    is_fallback_approval = Column(Boolean, default=False)
    fallback_reason = Column(Text, nullable=True)
    valid_until = Column(DateTime(timezone=True), nullable=True)
    issued_by_role = Column(String(20), nullable=True)                 # "hod", "mentor", "admin"
    delegated_hod_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    requested_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    college = relationship("College")
    student = relationship("Student")
    approver = relationship("User", foreign_keys=[approved_by])
    delegated_hod = relationship("User", foreign_keys=[delegated_hod_id])
    requester = relationship("User", foreign_keys=[requested_by_id])


class LunchPass(Base):
    __tablename__ = "lunch_passes"

    id = Column(Integer, primary_key=True, index=True)
    college_id = Column(Integer, ForeignKey("colleges.id"), nullable=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    semester_id = Column(Integer, ForeignKey("semesters.id"), nullable=False)
    issued_at = Column(DateTime(timezone=True), server_default=func.now())
    issued_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    is_active = Column(Boolean, default=True)

    __table_args__ = (UniqueConstraint("student_id", "semester_id", name="uq_lunch_pass_student_sem"),)

    college = relationship("College")
    student = relationship("Student", back_populates="lunch_passes")
    semester = relationship("Semester")
    issued_by_user = relationship("User", foreign_keys=[issued_by])
    scans = relationship("LunchScan", back_populates="lunch_pass")


class LunchScan(Base):
    __tablename__ = "lunch_scans"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    lunch_pass_id = Column(Integer, ForeignKey("lunch_passes.id"), nullable=False)
    scan_type = Column(String(3), nullable=False)   # "out" or "in"
    scanned_at = Column(DateTime(timezone=True), server_default=func.now())

    student = relationship("Student")
    lunch_pass = relationship("LunchPass", back_populates="scans")


class LateComer(Base):
    __tablename__ = "late_comers"

    id = Column(Integer, primary_key=True, index=True)
    college_id = Column(Integer, ForeignKey("colleges.id"), nullable=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    semester_id = Column(Integer, ForeignKey("semesters.id"), nullable=False)
    scanned_at = Column(DateTime(timezone=True), server_default=func.now())
    is_exception = Column(Boolean, default=False)
    approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    exception_reason = Column(Text, nullable=True)

    college = relationship("College")
    student = relationship("Student", back_populates="late_comers")
    semester = relationship("Semester")
    approver = relationship("User", foreign_keys=[approved_by])


class CustomPassType(Base):
    __tablename__ = "custom_pass_types"

    id          = Column(Integer, primary_key=True, index=True)
    college_id  = Column(Integer, ForeignKey("colleges.id"), nullable=True)
    name        = Column(String(100), nullable=False)
    out_time    = Column(String(8), nullable=False)
    in_time     = Column(String(8), nullable=False)
    description = Column(Text, nullable=True)
    is_active   = Column(Boolean, default=True)
    created_by  = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())

    college     = relationship("College")
    creator     = relationship("User", foreign_keys=[created_by])
    assignments = relationship("CustomPassAssignment", back_populates="pass_type")


class CustomPassAssignment(Base):
    __tablename__ = "custom_pass_assignments"

    id           = Column(Integer, primary_key=True, index=True)
    student_id   = Column(Integer, ForeignKey("students.id"), nullable=False)
    pass_type_id = Column(Integer, ForeignKey("custom_pass_types.id"), nullable=False)
    assigned_by  = Column(Integer, ForeignKey("users.id"), nullable=True)
    out_time     = Column(String(8), nullable=True)
    in_time      = Column(String(8), nullable=True)
    valid_from   = Column(Date, nullable=True)
    valid_to     = Column(Date, nullable=True)
    is_active    = Column(Boolean, default=True)
    assigned_at  = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("student_id", "pass_type_id", name="uq_custom_pass_student_type"),
    )

    student    = relationship("Student")
    pass_type  = relationship("CustomPassType", back_populates="assignments")
    assigner   = relationship("User", foreign_keys=[assigned_by])
    scans      = relationship("CustomPassScan", back_populates="assignment")


class CustomPassScan(Base):
    __tablename__ = "custom_pass_scans"

    id                        = Column(Integer, primary_key=True, index=True)
    student_id                = Column(Integer, ForeignKey("students.id"), nullable=False)
    custom_pass_assignment_id = Column(Integer, ForeignKey("custom_pass_assignments.id"), nullable=False)
    scan_type                 = Column(String(3), nullable=False)
    scanned_at                = Column(DateTime(timezone=True), server_default=func.now())

    student    = relationship("Student")
    assignment = relationship("CustomPassAssignment", back_populates="scans")


class Announcement(Base):
    __tablename__ = "announcements"

    id          = Column(Integer, primary_key=True, index=True)
    college_id  = Column(Integer, ForeignKey("colleges.id"), nullable=True)  # Null for all colleges
    target_role = Column(String(50), nullable=True)                          # Null for all roles
    title       = Column(String(255), nullable=False)
    content     = Column(Text, nullable=False)
    created_by  = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())
    expires_at  = Column(DateTime(timezone=True), nullable=True)

    college = relationship("College")
    creator = relationship("User", foreign_keys=[created_by])


class Notification(Base):
    __tablename__ = "notifications"

    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id"), nullable=False)
    title      = Column(String(255), nullable=False)
    message    = Column(Text, nullable=False)
    type       = Column(String(50), default="info")                               # info, warning, success, alert
    is_read    = Column(Boolean, default=False)
    link       = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id          = Column(Integer, primary_key=True, index=True)
    college_id  = Column(Integer, ForeignKey("colleges.id"), nullable=True)
    user_id     = Column(Integer, ForeignKey("users.id"), nullable=True)
    username    = Column(String(100), nullable=False)
    user_role   = Column(String(50), nullable=False)
    action      = Column(String(100), nullable=False)
    entity_type = Column(String(100), nullable=False)
    entity_id   = Column(String(100), nullable=True)
    details     = Column(Text, nullable=True)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())

    college = relationship("College")
    user    = relationship("User")
