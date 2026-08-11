from models.database import db
from datetime import datetime
from zoneinfo import ZoneInfo



class Notification(db.Model):
    __tablename__ = "employee_notifications"

    id = db.Column(
        db.Integer,
        primary_key=True
    )   

    receiver_name = db.Column(
        db.String(200),
        nullable=False
    )

    title = db.Column(
        db.String(200),
        nullable=False
    )

    message = db.Column(
        db.Text,
        nullable=False
    )

    is_read = db.Column(
        db.Boolean,
        default=False
    )

    created_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(ZoneInfo("Asia/Kolkata"))
    )

    related_id = db.Column(
        db.Integer,
        nullable=True
    )

    related_type = db.Column(
        db.String(50),
        nullable=True
    )

    notification_type = db.Column(
        db.String(50),
        nullable=True
    )

    status = db.Column(
        db.String(50),
        nullable=True,
        default="Pending"
    )

    action_required = db.Column(
        db.Boolean,
        default=False
    )

    resolved = db.Column(
        db.Boolean,
        default=False
    )

    resolved_at = db.Column(
        db.DateTime,
        nullable=True
    )

    __table_args__ = (
        db.Index("ix_notifications_receiver_read", "receiver_name", "is_read"),
        db.Index("ix_notifications_related", "related_id", "related_type"),
    )


    def to_dict(self):
        return {
            "id": self.id,
            "receiver_name": self.receiver_name,
            "title": self.title,
            "message": self.message,
            "is_read": self.is_read,
            "created_at": (
                self.created_at.isoformat()
                if self.created_at
                else None
            ),
            "related_id": self.related_id,
            "related_type": self.related_type,
            "notification_type": self.notification_type,
            "status": self.status,
            "action_required": self.action_required,
            "resolved": self.resolved,
            "resolved_at": (
                self.resolved_at.isoformat()
                if self.resolved_at
                else None
            ),
        }