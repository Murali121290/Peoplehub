from models.database import db
from datetime import datetime


class FAQCustomItem(db.Model):
    __tablename__ = "faq_custom_items"

    id = db.Column(db.Integer, primary_key=True)

    question = db.Column(db.String(500), nullable=False)

    answer = db.Column(db.Text, nullable=False)

    category = db.Column(
        db.String(50),
        nullable=False,
        default="support"
    )

    created_by = db.Column(db.String(200), nullable=True)  # HR employee name

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    is_active = db.Column(db.Boolean, default=True)
