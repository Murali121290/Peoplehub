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
        nullable=True
    )

    requested_shift = db.Column(
        db.String(100),
        nullable=True
    )

    current_work_mode = db.Column(
        db.String(50),
        nullable=True
    )

    requested_work_mode = db.Column(
        db.String(50),
        nullable=True
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

    request_type = db.Column(
    db.String(50),
    default="Shift"
    )

    approved_by = db.Column(
        db.String(200),
        nullable=True
    )

    rejected_by = db.Column(
        db.String(200),
        nullable=True
    )

    from_date = db.Column(
        db.Date,
        nullable=True
    )

    to_date = db.Column(
        db.Date,
        nullable=True
    ) 

    shift_date = db.Column(
    db.Date,
    nullable=False
)
    



    def to_dict(self):
        emp_string_id = self.employee_id
        try:
            from models.employee import Employee
            if emp_string_id:
                emp = Employee.query.get(int(emp_string_id))
                if emp and emp.employee_id:
                    emp_string_id = emp.employee_id
        except:
            pass

        return {
            "id": self.id,
            "employee_id": emp_string_id,
            "employee_name": self.employee_name,
            "current_shift": self.current_shift,
            "requested_shift": self.requested_shift,
            "current_work_mode": self.current_work_mode,
            "requested_work_mode": self.requested_work_mode,
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
            "approved_by": self.approved_by,
            "rejected_by": self.rejected_by,
            "shift_date": (
    self.shift_date.isoformat()
    if self.shift_date
    else None
),
            "rejected_at": (
                self.rejected_at.isoformat()
                if self.rejected_at
                else None
            ),

"request_type": self.request_type,

"from_date": (
    self.from_date.isoformat()
    if self.from_date
    else None
),

"to_date": (
    self.to_date.isoformat()
    if self.to_date
    else None
),
        }