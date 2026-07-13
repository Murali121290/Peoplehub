from datetime import date
from models.database import db
from models.user import User
from models.employee import Employee


def seed_employees():

    users = User.query.all()

    for user in users:

        # Skip if employee already exists
        existing = Employee.query.filter_by(
            user_id=user.id
        ).first()

        if existing:
            continue

        # Department & Designation
        role_name = user.role.name if user.role else ""
        user_team_name = user.team.name if user.team else None

        if user.access_level == "admin":
            department = user_team_name or "Administration"
            designation = role_name
            reporting_manager = ""

        elif user.access_level == "hr":
            department = user_team_name or "Human Resources"
            designation = role_name
            reporting_manager = "Admin"

        elif user.access_level == "manager":
            department = user_team_name or "Editorial Team"
            designation = role_name
            reporting_manager = "Admin"

        else:
            department = user_team_name or "Editorial Team"
            designation = role_name
            reporting_manager = "Team Lead - Editorial"

        # Split full name
        names = user.full_name.split()

        first_name = names[0]

        last_name = ""

        if len(names) > 1:
            last_name = " ".join(names[1:])

        employee = Employee(
            user_id=user.id,
            employee_id=f"EMP{user.id:03d}",
            first_name=first_name,
            last_name=last_name,
            email=user.email,

            department=department,
            designation=designation,
            role=role_name,

            joining_date=date.today(),
            reporting_manager=reporting_manager,

            salary=25000,
            shift_timing="General Shift",
            status="Active",

            profile_completed=False,
            is_first_login=True,

            sick_leave=6.0,
            casual_leave=6.0,
            privilege_leave=15.0
        )

        db.session.add(employee)

    db.session.commit()

    print("✅ Employees seeded successfully.")