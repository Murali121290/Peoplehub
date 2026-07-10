# from datetime import datetime
# from models.database import db


# def update_leave_balance(employee):

#     if not employee:
#         return

#     today = datetime.today()

#     if today.day < 25:
#         return

#     current_month = today.month
#     current_year = today.year

#     if (
#         employee.last_leave_reset_month == str(current_month)
#         and
#         employee.last_leave_reset_year == current_year
#     ):
#         return

#     employee.casual_leave += 1.5
#     employee.sick_leave += 1.5
#     employee.earned_leave += 2.5

#     employee.last_leave_reset_month = str(current_month)
#     employee.last_leave_reset_year = current_year

#     db.session.commit()

from datetime import datetime

from models.database import db
from models.employee import Employee


def update_leave_balance(employee):

    if not employee:
        return False

    today = datetime.today()

    # Run only on or after 25th
    if today.day < 25:
        return False

    current_month = today.month
    current_year = today.year

    # Prevent duplicate credit for same month
    if (
        employee.last_leave_reset_month == str(current_month)
        and
        employee.last_leave_reset_year == current_year
    ):
        return False

    # Monthly Leave Credit
    employee.casual_leave = (
        employee.casual_leave or 0
    ) + 1.5

    employee.sick_leave = (
        employee.sick_leave or 0
    ) + 1.5

    employee.earned_leave = (
        employee.earned_leave or 0
    ) + 2

    employee.last_leave_reset_month = str(
        current_month
    )

    employee.last_leave_reset_year = (
        current_year
    )

    return True


def update_all_employee_leave_balances():

    employees = Employee.query.all()

    updated_count = 0

    for employee in employees:

        updated = update_leave_balance(
            employee
        )

        if updated:
            updated_count += 1

    db.session.commit()

    return {
        "success": True,
        "employees_updated": updated_count
    }


def update_single_employee_leave_balance(
    employee_id
):

    employee = Employee.query.get(
        employee_id
    )

    if not employee:
        return {
            "success": False,
            "message": "Employee not found"
        }

    updated = update_leave_balance(
        employee
    )

    if updated:
        db.session.commit()

        return {
            "success": True,
            "message":
            "Leave balance updated",
            "casual_leave":
            employee.casual_leave,
            "sick_leave":
            employee.sick_leave,
            "earned_leave":
            employee.earned_leave
        }

    return {
        "success": False,
        "message":
        "Already credited this month or before 25th"
    }