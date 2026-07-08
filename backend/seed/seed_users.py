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
        full_name="Manager",
        email="manager@wms.com",
        company_email="manager@wms.com",
        password="Manager@12345",
        role_name="Project Manager",
        team_name="Project Management Team",
        access_level="manager"
    )

    create_user(
        full_name="User",
        email="user@wms.com",
        company_email="user@wms.com",
        password="User@12345",
        role_name="Copyeditor",
        team_name="Editorial Team",
        access_level="user"
    )

    create_user(
        full_name="Umasangeetha P",
        email="Umasangeetha",
        company_email="Umasangeetha",
        password="Umasangeetha@12345",
        role_name="Editorial Manager",
        team_name="Editorial Team",
        access_level="manager"
    )

    create_user(
        full_name="Aravind K",
        email="Aravind",
        company_email="Aravind",
        password="Aravind@12345",
        role_name="Editorial Manager",
        team_name="Editorial Team",
        access_level="manager"
    )

    create_user(
        full_name="Murali B",
        email="Murali",
        company_email="Murali",
        password="Murali@12345",
        role_name="Editorial Manager",
        team_name="Editorial Team",
        access_level="manager"
    )

    create_user(
        full_name="Annapurna B",
        email="Annapurna",
        company_email="Annapurna",
        password="Annapurna@12345",
        role_name="Team Lead - Editorial",
        team_name="Editorial Team",
        access_level="manager"
    )

    create_user(
        full_name="Lavanya V",
        email="Lavanya",
        company_email="Lavanya",
        password="Lavanya@12345",
        role_name="Team Lead - Editorial",
        team_name="Editorial Team",
        access_level="manager"
    )

    create_user(
        full_name="Muthukumar S",
        email="Muthukumar",
        company_email="Muthukumar",
        password="Muthukumar@12345",
        role_name="Editorial Manager",
        team_name="Editorial Team",
        access_level="manager"
    )

    create_user(
        full_name="Madhu Malini N S",
        email="Madhu",
        company_email="Madhu",
        password="Madhu@12345",
        role_name="Editorial Manager",
        team_name="Editorial Team",
        access_level="manager"
    )

    create_user(
        full_name="Priyavarthini M",
        email="Priyavarthini",
        company_email="Priyavarthini",
        password="Priyavarthini@12345",
        role_name="Team Lead - Editorial",
        team_name="Editorial Team",
        access_level="manager"
    )

    create_user(
        full_name="Mahalakshmi G",
        email="Mahalakshmi",
        company_email="Mahalakshmi",
        password="Mahalakshmi@12345",
        role_name="Editorial Manager",
        team_name="Editorial Team",
        access_level="manager"
    )

    create_user(
        full_name="Anand Jayaram",
        email="Anand",
        company_email="Anand",
        password="Anand@12345",
        role_name="Technical Editor",
        team_name="Editorial Team",
        access_level="user"
    )

    create_user(
        full_name="Chirumavilla Janardhan",
        email="Chirumavilla",
        company_email="Chirumavilla",
        password="Chirumavilla@12345",
        role_name="Team Lead - Editorial",
        team_name="Editorial Team",
        access_level="manager"
    )

    create_user(
        full_name="Srinivasan R",
        email="Srinivasan",
        company_email="Srinivasan",
        password="Srinivasan@12345",
        role_name="Editorial Manager",
        team_name="Editorial Team",
        access_level="manager"
    )

    create_user(
        full_name="Rajavalli Selvaraj",
        email="Rajavalli",
        company_email="Rajavalli",
        password="Rajavalli@12345",
        role_name="Technical Editor",
        team_name="Editorial Team",
        access_level="user"
    )

    create_user(
        full_name="Shalini Bakthavatchalam",
        email="Shalini",
        company_email="Shalini",
        password="Shalini@12345",
        role_name="Team Lead - Editorial",
        team_name="Editorial Team",
        access_level="manager"
    )

    create_user(
        full_name="Gowsalya M",
        email="Gowsalya",
        company_email="Gowsalya",
        password="Gowsalya@12345",
        role_name="Technical Editor",
        team_name="Editorial Team",
        access_level="user"
    )

    create_user(
        full_name="Gurunathan R",
        email="Gurunathan",
        company_email="Gurunathan",
        password="Gurunathan@12345",
        role_name="Editorial Manager",
        team_name="Editorial Team",
        access_level="manager"
    )

    create_user(
        full_name="Sujatha S",
        email="Sujatha",
        company_email="Sujatha",
        password="Sujatha@12345",
        role_name="Editorial Manager",
        team_name="Editorial Team",
        access_level="manager"
    )

    create_user(
        full_name="Gopalakrishnan S",
        email="Gopalakrishnan",
        company_email="Gopalakrishnan",
        password="Gopalakrishnan@12345",
        role_name="Editorial Manager",
        team_name="Editorial Team",
        access_level="manager"
    )

    create_user(
        full_name="Chandra Kumar C",
        email="Chandra",
        company_email="Chandra",
        password="Chandra@12345",
        role_name="Technical Editor",
        team_name="Editorial Team",
        access_level="user"
    )

    create_user(
        full_name="Sangeetha A",
        email="Sangeetha",
        company_email="Sangeetha",
        password="Sangeetha@12345",
        role_name="Team Lead - Editorial",
        team_name="Editorial Team",
        access_level="manager"
    )

    create_user(
        full_name="Anbarasan K",
        email="Anbarasan",
        company_email="Anbarasan",
        password="Anbarasan@12345",
        role_name="Technical Editor",
        team_name="Editorial Team",
        access_level="user"
    )

    create_user(
        full_name="Saranya Kamaraj",
        email="Saranya",
        company_email="Saranya",
        password="Saranya@12345",
        role_name="Technical Editor",
        team_name="Editorial Team",
        access_level="user"
    )

    create_user(
        full_name="Shalom Kumar Sigworth",
        email="Shalom",
        company_email="Shalom",
        password="Shalom@12345",
        role_name="Editorial Manager",
        team_name="Editorial Team",
        access_level="manager"
    )

    create_user(
        full_name="Prakash B",
        email="Prakash",
        company_email="Prakash",
        password="Prakash@12345",
        role_name="Copyeditor",
        team_name="Editorial Team",
        access_level="user"
    )

    create_user(
        full_name="Supriya Subramanian",
        email="Supriya",
        company_email="Supriya",
        password="Supriya@12345",
        role_name="Editorial Manager",
        team_name="Editorial Team",
        access_level="manager"
    )

    create_user(
        full_name="J JUDE RAEYMOND",
        email="J",
        company_email="J",
        password="J@12345",
        role_name="Copyeditor",
        team_name="Editorial Team",
        access_level="user"
    )

    create_user(
        full_name="Sumathi R",
        email="Sumathi",
        company_email="Sumathi",
        password="Sumathi@12345",
        role_name="Editorial Manager",
        team_name="Editorial Team",
        access_level="manager"
    )

    create_user(
        full_name="Vigneshwar amoorthy S",
        email="Vigneshwar",
        company_email="Vigneshwar",
        password="Vigneshwar@12345",
        role_name="Team Lead - Editorial",
        team_name="Editorial Team",
        access_level="manager"
    )

    create_user(
        full_name="Manikaraj T",
        email="Manikaraj",
        company_email="Manikaraj",
        password="Manikaraj@12345",
        role_name="Technical Editor",
        team_name="Editorial Team",
        access_level="user"
    )

    create_user(
        full_name="Nivetha M",
        email="Nivetha",
        company_email="Nivetha",
        password="Nivetha@12345",
        role_name="Technical Editor",
        team_name="Editorial Team",
        access_level="user"
    )

    create_user(
        full_name="Patrick Nithyan",
        email="Patrick",
        company_email="Patrick",
        password="Patrick@12345",
        role_name="Technical Editor",
        team_name="Editorial Team",
        access_level="user"
    )

    create_user(
        full_name="Hemamalini",
        email="Hemamalini",
        company_email="Hemamalini",
        password="Hemamalini@12345",
        role_name="Copyeditor",
        team_name="Editorial Team",
        access_level="user"
    )

    create_user(
        full_name="Selva Bharath P",
        email="Selva",
        company_email="Selva",
        password="Selva@12345",
        role_name="Copyeditor",
        team_name="Editorial Team",
        access_level="user"
    )

    create_user(
        full_name="Nirmal Kumar",
        email="Nirmal",
        company_email="Nirmal",
        password="Nirmal@12345",
        role_name="Technical Editor",
        team_name="Editorial Team",
        access_level="user"
    )

    create_user(
        full_name="Saranya",
        email="Saranya",
        company_email="Saranya",
        password="Saranya@12345",
        role_name="Team Lead - Editorial",
        team_name="Editorial Team",
        access_level="manager"
    )

    create_user(
        full_name="Viswanathan K",
        email="Viswanathan",
        company_email="Viswanathan",
        password="Viswanathan@12345",
        role_name="Technical Editor",
        team_name="Editorial Team",
        access_level="user"
    )

    db.session.commit()

    print("✅ Default users seeded successfully.")