from models.database import db
from datetime import datetime


class Communication(db.Model):
    __tablename__ = "communications"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    employee_id = db.Column(
        db.Integer,
        nullable=True
    )

    receiver_id = db.Column(
        db.Integer,
        nullable=True
    )

    employee_name = db.Column(
        db.String(200),
        nullable=True
    )

    # employee
    # announcement
    # birthday
    message_type = db.Column(
        db.String(50),
        nullable=False
    )

    # NEW
    title = db.Column(
        db.String(255),
        nullable=True
    )

    # employee
    # manager
    # all
    target_role = db.Column(
        db.String(50),
        nullable=True
    )

    message = db.Column(
        db.Text,
        nullable=False
    )

    created_by = db.Column(
        db.String(200),
        nullable=True
    )

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )

    def to_dict(self):

        return {
            "id": self.id,
            "employee_id": self.employee_id,
            "receiver_id": self.receiver_id,
            "employee_name": self.employee_name,
            "message_type": self.message_type,
            "title": self.title,
            "target_role": self.target_role,
            "message": self.message,
            "created_by": self.created_by,
            "created_at": (
                self.created_at.isoformat()
                if self.created_at
                else None
            )
        }