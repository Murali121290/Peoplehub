from .database import db
from datetime import datetime

class Project(db.Model):
    __tablename__ = 'projects'

    id = db.Column(db.Integer, primary_key=True)

    # Project Information
    project_code = db.Column(db.String(100), unique=True, nullable=False)
    customer = db.Column(db.String(200))
    customer_name = db.Column(db.String(200))
    customer_contact = db.Column(db.String(100))
    division_code = db.Column(db.String(50))
    billing_location = db.Column(db.String(200))
    category = db.Column(db.String(100))
    sales_person = db.Column(db.String(200))
    project_title = db.Column(db.String(300), nullable=False)
    priority = db.Column(db.String(20), default='medium')
    complexity = db.Column(db.String(20), default='normal')

    # Book Details
    edition = db.Column(db.String(50))
    color = db.Column(db.String(20))
    trim_size = db.Column(db.String(50))
    copyright_year = db.Column(db.String(10))
    manuscript_pages = db.Column(db.Integer)
    estimated_pages = db.Column(db.Integer)
    actual_pages = db.Column(db.Integer)
    isbn_number = db.Column(db.String(20))
    xml_standard = db.Column(db.String(50))

    # Workflow
    workflow_id = db.Column(db.Integer, db.ForeignKey('workflows.id'))
    current_stage = db.Column(db.String(50))
    status = db.Column(db.String(20), default='draft')

    # Active / Deactive
    is_active = db.Column(db.Boolean, default=False)

    # Timing
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )
    activated_at = db.Column(db.DateTime)
    completed_at = db.Column(db.DateTime)

    # Relationships
    creator_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    client_id = db.Column(db.Integer, db.ForeignKey('clients.id'))

    chapters = db.relationship(
        'ProjectChapter',
        backref='project',
        lazy=True
    )

    assignments = db.relationship(
        'ProjectAssignment',
        backref='project',
        lazy=True
    )

    workflow_history = db.relationship(
        'WorkflowHistory',
        backref='project',
        lazy=True
    )

    sla_tracking = db.relationship(
        'SLATracking',
        backref='project',
        lazy=True
    )

    def to_dict(self):
        return {
            'id': self.id,
            'project_code': self.project_code,
            'customer': self.customer,
            'customer_name': self.customer_name,
            'project_title': self.project_title,
            'priority': self.priority,
            'complexity': self.complexity,
            'current_stage': self.current_stage,
            'status': self.status,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat(),
            'activated_at': self.activated_at.isoformat() if self.activated_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None
        }


class ProjectChapter(db.Model):
    __tablename__ = 'project_chapters'

    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(
        db.Integer,
        db.ForeignKey('projects.id'),
        nullable=False
    )

    chapter_number = db.Column(db.Integer)
    chapter_title = db.Column(db.String(300))
    file_name = db.Column(db.String(300))
    file_path = db.Column(db.String(1000))
    file_size = db.Column(db.Integer)

    status = db.Column(db.String(20), default='pending')
    version = db.Column(db.Integer, default=1)

    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime)

    def to_dict(self):
        return {
            'id': self.id,
            'chapter_number': self.chapter_number,
            'chapter_title': self.chapter_title,
            'file_name': self.file_name,
            'file_path': self.file_path,
            'status': self.status,
            'uploaded_at': self.uploaded_at.isoformat()
        }


class ProjectAssignment(db.Model):
    __tablename__ = 'project_assignments'

    id = db.Column(db.Integer, primary_key=True)

    project_id = db.Column(
        db.Integer,
        db.ForeignKey('projects.id'),
        nullable=False
    )

    assigned_user_id = db.Column(
        db.Integer,
        db.ForeignKey('users.id'),
        nullable=False
    )

    workflow_stage = db.Column(
        db.String(50),
        nullable=False
    )

    chapter_id = db.Column(
        db.Integer,
        db.ForeignKey('project_chapters.id')
    )

    status = db.Column(
        db.String(20),
        default='assigned'
    )

    priority = db.Column(
        db.String(20),
        default='normal'
    )

    assigned_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )

    started_at = db.Column(db.DateTime)
    completed_at = db.Column(db.DateTime)

    comments = db.Column(db.Text)

    def to_dict(self):
        return {
            'id': self.id,
            'project_id': self.project_id,
            'assigned_user_id': self.assigned_user_id,
            'workflow_stage': self.workflow_stage,
            'status': self.status,
            'assigned_at': self.assigned_at.isoformat(),
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None
        }