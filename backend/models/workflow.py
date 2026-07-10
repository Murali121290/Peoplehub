from .database import db
from datetime import datetime


class Workflow(db.Model):
    __tablename__ = 'workflows'

    id = db.Column(db.Integer, primary_key=True)

    name = db.Column(
        db.String(100),
        unique=True,
        nullable=False
    )

    description = db.Column(db.Text)

    is_active = db.Column(
        db.Boolean,
        default=True
    )

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )

    stages = db.relationship(
        'WorkflowStage',
        backref='workflow',
        lazy=True,
        order_by='WorkflowStage.order'
    )

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat()
            if self.created_at else None
        }


class WorkflowStage(db.Model):
    __tablename__ = 'workflow_stages'

    id = db.Column(db.Integer, primary_key=True)

    workflow_id = db.Column(
        db.Integer,
        db.ForeignKey('workflows.id'),
        nullable=False
    )

    name = db.Column(
        db.String(100),
        nullable=False
    )

    order = db.Column(
        db.Integer,
        nullable=False
    )

    description = db.Column(db.Text)

    sla_hours = db.Column(db.Integer)

    required_role_id = db.Column(
        db.Integer,
        db.ForeignKey('roles.id')
    )

    is_active = db.Column(
        db.Boolean,
        default=True
    )

    def to_dict(self):
        return {
            'id': self.id,
            'workflow_id': self.workflow_id,
            'name': self.name,
            'order': self.order,
            'description': self.description,
            'sla_hours': self.sla_hours,
            'required_role_id': self.required_role_id,
            'is_active': self.is_active
        }


class WorkflowHistory(db.Model):
    __tablename__ = 'workflow_history'

    id = db.Column(db.Integer, primary_key=True)

    project_id = db.Column(
        db.Integer,
        db.ForeignKey('projects.id'),
        nullable=False
    )

    from_stage = db.Column(db.String(50))

    to_stage = db.Column(
        db.String(50),
        nullable=False
    )

    changed_by_user_id = db.Column(
        db.Integer,
        db.ForeignKey('users.id')
    )

    started_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )

    completed_at = db.Column(db.DateTime)

    duration_hours = db.Column(db.Float)

    comments = db.Column(db.Text)

    def to_dict(self):
        return {
            'id': self.id,
            'project_id': self.project_id,
            'from_stage': self.from_stage,
            'to_stage': self.to_stage,
            'changed_by_user_id': self.changed_by_user_id,
            'started_at': self.started_at.isoformat()
            if self.started_at else None,
            'completed_at': self.completed_at.isoformat()
            if self.completed_at else None,
            'duration_hours': self.duration_hours,
            'comments': self.comments
        }