from .database import db
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash

class Role(db.Model):
    __tablename__ = "roles"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    name = db.Column(
        db.String(100),
        nullable=False
    )

    description = db.Column(
        db.Text,
        nullable=True
    )

    team_id = db.Column(
        db.Integer,
        db.ForeignKey("teams.id"),
        nullable=False
    )

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,

            "team_id": self.team_id,
            "team_name": self.team.name if self.team else None,

            "created_at": (
                self.created_at.isoformat()
                if self.created_at
                else None
            )
        }

class Team(db.Model):
    __tablename__ = "teams"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    name = db.Column(
        db.String(100),
        unique=True,
        nullable=False
    )

    description = db.Column(
        db.Text
    )

    workflow_stage = db.Column(
        db.String(50)
    )

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )

    # Relationships
    users = db.relationship(
        "User",
        backref="team",
        lazy=True
    )

    roles = db.relationship(
        "Role",
        backref="team",
        lazy=True
    )

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "workflow_stage": self.workflow_stage,

            "created_at": (
                self.created_at.isoformat()
                if self.created_at
                else None
            ),

            "roles_count": len(self.roles),
            "users_count": len(self.users)
        }

class Permission(db.Model):
    __tablename__ = 'permissions'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)
    description = db.Column(db.Text)
    resource = db.Column(db.String(50))
    action = db.Column(db.String(50))

class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)

    full_name = db.Column(
        db.String(200),
        nullable=False
    )

    email = db.Column(
        db.String(300),
        unique=True,
        nullable=False
    )

    company_email = db.Column(
        db.String(300),
        unique=True,
        nullable=False
    )

    password_hash = db.Column(
        db.String(500),
        nullable=False
    )

    role_id = db.Column(
        db.Integer,
        db.ForeignKey('roles.id'),
        nullable=False
    )

    team_id = db.Column(
        db.Integer,
        db.ForeignKey('teams.id')
    )

    # Relationship with Role
    role = db.relationship(
        'Role',
        backref='users'
    )

    access_level = db.Column(
        db.String(50),
        default='standard'
    )

    status = db.Column(
        db.String(20),
        default='active'
    )

    is_active = db.Column(
        db.Boolean,
        default=True
    )

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )

    updated_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )

    last_login = db.Column(
        db.DateTime
    )

    # Relationships
    projects_assigned = db.relationship(
        'ProjectAssignment',
        foreign_keys='ProjectAssignment.assigned_user_id',
        backref='assigned_user',
        lazy=True
    )

    projects_created = db.relationship(
        'Project',
        backref='creator',
        lazy=True
    )

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            "id": self.id,
            "full_name": self.full_name,
            "email": self.email,
            "company_email": self.company_email,

            "role_id": self.role_id,
            "role_name": self.role.name if self.role else None,

            "team_id": self.team_id,
            "team_name": self.team.name if self.team else None,
            "workflow_stage": self.team.workflow_stage if self.team else None,

            "access_level": self.access_level,
            "status": self.status,
            "is_active": self.is_active,

            "created_at": (
                self.created_at.isoformat()
                if self.created_at else None
            ),

            "updated_at": (
                self.updated_at.isoformat()
                if self.updated_at else None
            ),

            "last_login": (
                self.last_login.isoformat()
                if self.last_login else None
            )
        }