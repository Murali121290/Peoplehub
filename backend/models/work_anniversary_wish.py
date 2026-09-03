from models.database import db
from datetime import datetime

class WorkAnniversaryWish(db.Model):
    __tablename__ = "work_anniversary_wishes"

    id = db.Column(db.Integer, primary_key=True)
    sender_id = db.Column(db.Integer, db.ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    receiver_id = db.Column(db.Integer, db.ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    message = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    status = db.Column(db.String(50), default="Sent")
    thanked = db.Column(db.Boolean, default=False)
    thanked_at = db.Column(db.DateTime, nullable=True)

    sender = db.relationship("Employee", foreign_keys=[sender_id])
    receiver = db.relationship("Employee", foreign_keys=[receiver_id])

    def to_dict(self):
        return {
            "id": self.id,
            "sender_id": self.sender_id,
            "receiver_id": self.receiver_id,
            "sender_name": f"{self.sender.first_name} {self.sender.last_name}" if self.sender else "Unknown",
            "receiver_name": f"{self.receiver.first_name} {self.receiver.last_name}" if self.receiver else "Unknown",
            "message": self.message,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "status": self.status,
            "thanked": self.thanked,
            "thanked_at": self.thanked_at.isoformat() if self.thanked_at else None
        }
