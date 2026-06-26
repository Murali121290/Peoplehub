from models.database import db
from datetime import datetime


class ShiftRequest(db.Model):
    __tablename__ = "shift_requests"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    employee_id = db.Column(
        db.Integer,
        nullable=False
    )

    employee_name = db.Column(
        db.String(200),
        nullable=False
    )

    current_shift = db.Column(
        db.String(100),
        nullable=False
    )

    requested_shift = db.Column(
        db.String(100),
        nullable=False
    )
    shift_date = db.Column(
    db.Date,
    nullable=False
)

    reason = db.Column(
        db.Text,
        nullable=False
    )

    reporting_manager = db.Column(
        db.String(200),
        nullable=False
    )

    status = db.Column(
        db.String(30),
        default="Pending"
    )

    manager_comment = db.Column(
        db.Text,
        nullable=True
    )

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )

    approved_at = db.Column(
        db.DateTime,
        nullable=True
    )

    rejected_at = db.Column(
        db.DateTime,
        nullable=True
    )



    def to_dict(self):
        return {
            "id": self.id,
            "employee_id": self.employee_id,
            "employee_name": self.employee_name,
            "current_shift": self.current_shift,
            "requested_shift": self.requested_shift,
            "reason": self.reason,
            "reporting_manager": self.reporting_manager,
            "status": self.status,
            "manager_comment": self.manager_comment,
            "created_at": (
                self.created_at.isoformat()
                if self.created_at
                else None
            ),
            "approved_at": (
                self.approved_at.isoformat()
                if self.approved_at
                else None
            ),
            "rejected_at": (
                self.rejected_at.isoformat()
                if self.rejected_at
                else None
            ),
"shift_date": (
    self.shift_date.isoformat()
    if self.shift_date
    else None
),
        }