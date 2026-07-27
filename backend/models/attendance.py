from models.database import db
from datetime import datetime
from zoneinfo import ZoneInfo


def get_ist_now():
    return datetime.now(ZoneInfo("Asia/Kolkata")).replace(tzinfo=None)


def get_ist_today():
    return datetime.now(ZoneInfo("Asia/Kolkata")).date()


class Attendance(db.Model):

    __tablename__ = "attendance"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    user_id = db.Column(
        db.Integer,
        nullable=False
    )

    # Check In / Check Out

    check_in = db.Column(
        db.DateTime,
        default=get_ist_now
    )

    check_out = db.Column(
        db.DateTime,
        nullable=True
    )

    # Lunch Break Status

    lunch_break = db.Column(
        db.Boolean,
        default=False
    )

    lunch_start = db.Column(
        db.DateTime,
        nullable=True
    )

    lunch_end = db.Column(
        db.DateTime,
        nullable=True
    )

    lunch_minutes = db.Column(
        db.Integer,
        default=0
    )

    # Tea Break Status

    tea_break = db.Column(
        db.Boolean,
        default=False
    )

    tea_start = db.Column(
        db.DateTime,
        nullable=True
    )

    tea_end = db.Column(
        db.DateTime,
        nullable=True
    )

    tea_minutes = db.Column(
        db.Integer,
        default=0
    )

    # Total Break Minutes

    total_break_minutes = db.Column(
        db.Integer,
        default=0
    )

    # Total Gap Minutes

    total_gap_minutes = db.Column(
        db.Integer,
        default=0
    )

    # Total Working Hours

    total_hours = db.Column(
        db.Float,
        default=0
    )

    # Attendance Date

    attendance_date = db.Column(
        db.Date,
        default=get_ist_today
    )

    status = db.Column(
    db.String(20),
    default="Absent"
)
    shift_timing = db.Column(
    db.String(50),
    default="General Shift"
)
    
    manager_status = db.Column(
    db.String(20),
    default="Pending"
)

    card_check_in = db.Column(
        db.DateTime,
        nullable=True
    )

    card_check_out = db.Column(
        db.DateTime,
        nullable=True
    )

    card_working_hours = db.Column(
        db.Float,
        default=0.0
    )

    rejection_reason = db.Column(
        db.String(255),
        nullable=True
    )

    employee_reply = db.Column(
        db.String(255),
        nullable=True
    )