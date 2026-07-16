from flask import Blueprint, jsonify
from datetime import date
from models.employee import Employee
from sqlalchemy import extract


work_anniversary_bp = Blueprint(
    "work_anniversary",
    __name__,
    url_prefix="/api/work-anniversary"
)


@work_anniversary_bp.route("/today", methods=["GET"])
def get_today_work_anniversaries():
    today = date.today()

    employees = Employee.query.filter(
    extract("month", Employee.joining_date) == today.month,
    extract("day", Employee.joining_date) == today.day
    ).all()

    anniversaries = []

    for employee in employees:

        joining_date = employee.joining_date

        if (
            joining_date.month == today.month
            and
            joining_date.day == today.day
        ):

            years_completed = today.year - joining_date.year

            anniversaries.append({
                "id": employee.id,
                "employee_id": employee.employee_id,
                "first_name": employee.first_name,
                "last_name": employee.last_name,
                "full_name": f"{employee.first_name} {employee.last_name or ''}".strip(),
                "designation": employee.designation,
                "department": employee.department,
                "joining_date": joining_date.strftime("%d %b %Y"),
                "years_completed": years_completed,
                "profile_image": employee.profile_image is not None
            })

    return jsonify({
        "success": True,
        "count": len(anniversaries),
        "employees": anniversaries
    }), 200