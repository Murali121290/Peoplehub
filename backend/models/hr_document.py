from models.database import db
from datetime import datetime

class HRDocument(db.Model):
    __tablename__ = "hr_documents"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    category = db.Column(db.String(100), default="Policy")
    filename = db.Column(db.String(255), nullable=False)
    file_path = db.Column(db.String(500), nullable=False)
    file_size = db.Column(db.String(50), nullable=True)
    uploaded_by = db.Column(db.String(100), default="HR Department")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "category": self.category,
            "filename": self.filename,
            "file_path": self.file_path,
            "file_size": self.file_size,
            "uploaded_by": self.uploaded_by,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
