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
        if user.access_level == "admin":
            department = "Administration"
            designation = "Administrator"
            reporting_manager = ""

        elif user.access_level == "hr":
            department = "Human Resources"
            designation = "HR Manager"
            reporting_manager = "Admin"

        elif user.access_level == "manager":
            department = "Production"
            designation = "Project Manager"
            reporting_manager = "Admin"

        else:
            department = "Production"
            designation = "Employee"
            reporting_manager = "Project Manager"

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
            role=user.access_level.title(),

            joining_date=date.today(),

            reporting_manager=reporting_manager,

            salary=25000,

            shift_timing="General Shift",

            status="Active",

            profile_completed=False,
            is_first_login=True,

            sick_leave=1.5,
            casual_leave=1.5,
            earned_leave=0
        )

        db.session.add(employee)

    db.session.commit()

    print("✅ Employees seeded successfully.")