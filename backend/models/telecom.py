# models/telecom.py

from models.database import db
from datetime import datetime


class TelecomDirectory(db.Model):

    __tablename__ = "telecom_directory"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    department_name = db.Column(
        db.String(100),
        nullable=False
    )

    team_name = db.Column(
        db.String(100),
        nullable=False
    )

    employee_name = db.Column(
        db.String(150),
        nullable=False
    )

    designation = db.Column(
        db.String(100),
        nullable=False
    )

    extension_number = db.Column(
        db.String(20),
        nullable=False,
        unique=True
    )

    status = db.Column(
        db.String(20),
        default="Active"
    )

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )
    direct_number = db.Column(
      db.String(20),
    nullable=True
    )

    location = db.Column(
    db.String(100),
    nullable=True
    )

    def to_dict(self):
        return {
            "id": self.id,
            "department_name": self.department_name,
            "team_name": self.team_name,
            "employee_name": self.employee_name,
            "designation": self.designation,
            "extension_number": self.extension_number,
            "direct_number": self.direct_number,
            "location": self.location,
            "status": self.status
        }