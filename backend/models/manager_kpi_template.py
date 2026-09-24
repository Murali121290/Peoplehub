from datetime import datetime
from models.database import db

class ManagerKpiTemplate(db.Model):
    __tablename__ = "manager_kpi_templates"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    manager_id = db.Column(db.String(100), nullable=False, index=True)
    manager_name = db.Column(db.String(255), nullable=True)
    template_key = db.Column(db.String(50), nullable=False, default="form_1", index=True)
    template_name = db.Column(db.String(255), nullable=False, default="Form 1")
    team_id = db.Column(db.String(100), nullable=True)
    team_name = db.Column(db.String(255), nullable=True)
    categories = db.Column(db.JSON, nullable=True)
    is_default = db.Column(db.Boolean, nullable=True, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "manager_id": self.manager_id,
            "manager_name": self.manager_name,
            "template_key": self.template_key,
            "template_name": self.template_name,
            "team_id": self.team_id,
            "team_name": self.team_name,
            "categories": self.categories or [],
            "is_default": bool(self.is_default),
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }
