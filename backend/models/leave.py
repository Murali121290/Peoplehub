from models.database import db
from datetime import datetime

class LeaveRequest(db.Model):
    __tablename__ = "leave_requests"

    id = db.Column(db.Integer, primary_key=True)

    employee_id = db.Column(db.String(50))
    employee_name = db.Column(db.String(200))

    leave_type = db.Column(db.String(100))

    from_date = db.Column(db.Date)
    to_date = db.Column(db.Date)

    total_days = db.Column(db.Integer)

    reporting_manager = db.Column(db.String(200))
    handover_to = db.Column(db.String(200))

    emergency_contact = db.Column(db.String(20))
    reason = db.Column(db.Text)

    status = db.Column(
        db.String(50),
        default="Pending"
    )

    request_type = db.Column(
        db.String(30),
        default="Leave"
    )

    approved_by = db.Column(
        db.String(200),
        nullable=True
    )

    approved_at = db.Column(
        db.DateTime,
        nullable=True
    )

    rejected_by = db.Column(
        db.String(200),
        nullable=True
    )

    rejected_at = db.Column(
        db.DateTime,
        nullable=True
    )

    permission_date = db.Column(
        db.Date,
        nullable=True
    )

    from_time = db.Column(
        db.Time,
        nullable=True
    )

    to_time = db.Column(
        db.Time,
        nullable=True
    )



# =====================================
# LEAVE LEDGER TABLE
# =====================================

class LeaveLedger(db.Model):

    __tablename__ = "leave_ledger"

    id = db.Column(db.Integer, primary_key=True)

    employee_id = db.Column(db.String(50))

    month = db.Column(db.String(20))

    year = db.Column(db.Integer)

    opening_cl = db.Column(db.Float, default=0)
    opening_sl = db.Column(db.Float, default=0)
    opening_pl = db.Column(db.Float, default=0)

    credit_cl = db.Column(db.Float, default=5)
    credit_sl = db.Column(db.Float, default=5)
    credit_pl = db.Column(db.Float, default=5)

    taken_cl = db.Column(db.Float, default=0)
    taken_sl = db.Column(db.Float, default=0)
    taken_pl = db.Column(db.Float, default=0)

    closing_cl = db.Column(db.Float, default=0)
    closing_sl = db.Column(db.Float, default=0)
    closing_pl = db.Column(db.Float, default=0)

