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

    cancelled_by = db.Column(
        db.String(200),
        nullable=True
    )

    cancelled_at = db.Column(
        db.DateTime,
        nullable=True
    )

    cancellation_reason = db.Column(
        db.Text,
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


class LeaveAuditLog(db.Model):
    __tablename__ = "leave_audit_logs"

    id = db.Column(db.Integer, primary_key=True)
    leave_id = db.Column(db.Integer, nullable=False)
    employee_name = db.Column(db.String(200), nullable=False)
    action = db.Column(db.String(250), nullable=False)
    previous_status = db.Column(db.String(50))
    new_status = db.Column(db.String(50))
    cancelled_at = db.Column(db.DateTime, default=datetime.utcnow)
    cancelled_by = db.Column(db.String(100))


class LeavePolicy(db.Model):
    __tablename__ = "leave_policies"
    id = db.Column(db.Integer, primary_key=True)
    leave_type = db.Column(db.String(100), unique=True, nullable=False)
    yearly_limit = db.Column(db.Float, nullable=False, default=0.0)
    applicable_gender = db.Column(db.String(20), nullable=False, default="All")


class EmployeeLeaveBalance(db.Model):
    __tablename__ = "employee_leave_balances"
    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.Integer, db.ForeignKey("employees.id"), nullable=False)
    leave_type = db.Column(db.String(100), nullable=False)
    available = db.Column(db.Float, nullable=False, default=0.0)

