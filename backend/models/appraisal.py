from datetime import datetime
from models.database import db

# ==========================
# Appraisal Cycle
# ==========================

class AppraisalCycle(db.Model):
    __tablename__ = "appraisal_cycles"

    id = db.Column(db.Integer, primary_key=True)

    title = db.Column(db.String(100), nullable=False)

    appraisal_year = db.Column(db.Integer, nullable=False)

    start_date = db.Column(db.Date, nullable=False)

    end_date = db.Column(db.Date, nullable=False)

    status = db.Column(
        db.String(20),
        default="Open"
    )

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )


# ==========================
# Questions
# ==========================

class AppraisalQuestion(db.Model):
    __tablename__ = "appraisal_questions"

    id = db.Column(db.Integer, primary_key=True)

    appraisal_year = db.Column(db.Integer, nullable=False)

    role_name = db.Column(db.String(100), nullable=False)

    question = db.Column(db.Text, nullable=False)

    is_active = db.Column(
        db.Boolean,
        default=True
    )

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )


# ==========================
# Employee Answers
# ==========================

class AppraisalAnswer(db.Model):
    __tablename__ = "appraisal_answers"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    request_id = db.Column(
        db.Integer,
        db.ForeignKey("appraisal_requests.id"),
        nullable=False
    )

    question_id = db.Column(
        db.Integer,
        db.ForeignKey("appraisal_questions.id"),
        nullable=False
    )

    answer = db.Column(
        db.Text,
        nullable=False
    )

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )

    question = db.relationship(
        "AppraisalQuestion",
        backref="answers",
        lazy=True
    )
# ==========================
# Manager Review
# ==========================

class AppraisalRequest(db.Model):
    __tablename__ = "appraisal_requests"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    cycle_id = db.Column(
        db.Integer,
        db.ForeignKey("appraisal_cycles.id"),
        nullable=False
    )

    employee_id = db.Column(
        db.String(50),
        nullable=False
    )

    employee_name = db.Column(
        db.String(200),
        nullable=False
    )

    role = db.Column(
        db.String(100),
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

    rating = db.Column(
        db.String(30),
        nullable=True
    )

    score = db.Column(
        db.Integer,
        nullable=True
    )

    manager_comment = db.Column(
        db.Text,
        nullable=True
    )

    submitted_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )

    reviewed_at = db.Column(
        db.DateTime,
        nullable=True
    )
    answers = db.relationship(
        "AppraisalAnswer",
        backref="request",
        lazy=True,
        cascade="all, delete-orphan"
    )