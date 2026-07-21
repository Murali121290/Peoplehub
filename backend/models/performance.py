from models.database import db
from datetime import datetime

class EmployeePerformance(db.Model):
    __tablename__ = "employee_performance"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    department = db.Column(db.String(200), nullable=False)
    designation = db.Column(db.String(200), nullable=False)
    review_period = db.Column(db.String(100), nullable=False)
    efficiency = db.Column(db.Integer, default=0)
    quality = db.Column(db.Integer, default=0)
    productivity = db.Column(db.Integer, default=0)
    attendance = db.Column(db.Integer, default=0)
    rating = db.Column(db.String(50), default="Good")
    goals = db.Column(db.Text, nullable=True)
    feedback = db.Column(db.Text, nullable=True)
    reviewer = db.Column(db.String(200), nullable=True)
    review_date = db.Column(db.String(50), nullable=True) # Storing as string since frontend sends YYYY-MM-DD
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "department": self.department,
            "designation": self.designation,
            "reviewPeriod": self.review_period,
            "efficiency": self.efficiency,
            "quality": self.quality,
            "productivity": self.productivity,
            "attendance": self.attendance,
            "rating": self.rating,
            "goals": self.goals,
            "feedback": self.feedback,
            "reviewer": self.reviewer,
            "reviewDate": self.review_date
        }
