from models.database import db
from models.user import User, Role, Team


def create_user(
    full_name,
    email,
    company_email,
    password,
    role_name,
    team_name,
    access_level
):
    """Create user only if it does not already exist."""

    user = User.query.filter_by(email=email).first()

    if user:
        return

    role = Role.query.filter_by(name=role_name).first()
    team = Team.query.filter_by(name=team_name).first()

    if not role:
        print(f"❌ Role '{role_name}' not found.")
        return

    if not team:
        print(f"❌ Team '{team_name}' not found.")
        return

    user = User(
        full_name=full_name,
        email=email,
        company_email=company_email,
        role_id=role.id,
        team_id=team.id,
        access_level=access_level,
        status="active",
        is_active=True
    )

    user.set_password(password)

    db.session.add(user)


def seed_users():
    """Seed default login users."""

    create_user(
        full_name="Admin",
        email="admin@wms.com",
        company_email="admin@wms.com",
        password="Admin@12345",
        role_name="Asst General Manager",
        team_name="Project Management Team",
        access_level="admin"
    )

    create_user(
        full_name="HR Manager",
        email="hr@wms.com",
        company_email="hr@wms.com",
        password="Hr@12345",
        role_name="Editorial Manager",
        team_name="Editorial Team",
        access_level="hr"
    )

    create_user(
        full_name="Project Manager",
        email="manager@wms.com",
        company_email="manager@wms.com",
        password="Manager@12345",
        role_name="Project Manager",
        team_name="Project Management Team",
        access_level="manager"
    )

    create_user(
        full_name="Employee User",
        email="user@wms.com",
        company_email="user@wms.com",
        password="User@12345",
        role_name="Copyeditor",
        team_name="Editorial Team",
        access_level="user"
    )

    db.session.commit()

    print("✅ Default users seeded successfully.")