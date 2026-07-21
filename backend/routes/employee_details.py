# routes/employee_details.py

from utils.compat import Blueprint, jsonify

from datetime import date
from calendar import monthrange

from models.employee import Employee
from models.attendance import Attendance
from models.leave import LeaveRequest

employee_details_bp = Blueprint(
    "employee_details_bp",
    __name__
)

@employee_details_bp.route(
    "/employee-details/<int:user_id>",
    methods=["GET"]
)
def get_employee_details(user_id):
    try:
        employee = Employee.query.filter_by(
            user_id=user_id
        ).first()

        if not employee:
            return jsonify({
                "success": False,
                "message": "Employee not found"
            }), 404

        today = date.today()

        first_day = date(
            today.year,
            today.month,
            1
        )

        last_day = date(
            today.year,
            today.month,
            monthrange(
                today.year,
                today.month
            )[1]
        )

        # Attendance Records
        attendance_records = Attendance.query.filter(
            Attendance.user_id == user_id,
            Attendance.attendance_date >= first_day,
            Attendance.attendance_date <= last_day
        ).all() or []

        present_days = len([
            a for a in attendance_records
            if a.status == "Present"
        ])

        total_attendance_days = len(
            attendance_records
        )

        # Leave Summary
        leave_requests = LeaveRequest.query.filter(
            LeaveRequest.employee_id == employee.employee_id
        ).all()
        
        # Calculate approved leave days in the current month up to today
        approved_leave_days_this_month = 0
        from datetime import timedelta
        for leave in leave_requests:
            if leave.status == "Approved" and leave.from_date and leave.to_date:
                # Count days that fall within this month up to today
                current_d = leave.from_date
                while current_d <= leave.to_date and current_d <= today:
                    if current_d.month == today.month and current_d.year == today.year:
                        approved_leave_days_this_month += 1
                    current_d += timedelta(days=1)

        absent_days = max(
            0,
            today.day - present_days - approved_leave_days_this_month
        )

        total_hours = sum(
            [
                a.total_hours or 0
                for a in attendance_records
            ]
        )

        approved_leaves = len([
            l for l in leave_requests
            if l.status == "Approved"
        ])

        rejected_leaves = len([
            l for l in leave_requests
            if l.status == "Rejected"
        ])

        leave_days = sum([
            l.total_days or 0
            for l in leave_requests
            if l.status == "Approved"
        ])

        recent_attendance = []

        recent_records = Attendance.query.filter_by(
            user_id=user_id
        ).order_by(
            Attendance.attendance_date.desc()
        ).limit(10).all() or []

        for record in recent_records:
            recent_attendance.append({
                "date":
                record.attendance_date.strftime(
                    "%d-%m-%Y"
                ) if record.attendance_date else "-",

                "check_in":
                record.check_in.strftime(
                    "%I:%M %p"
                )
                if record.check_in
                else "-",

                "check_out":
                record.check_out.strftime(
                    "%I:%M %p"
                )
                if record.check_out
                else "-",

                "status":
                record.status
            })

        return jsonify({
            "success": True,
            "employee": {
                "employee_id":
                employee.employee_id,

                "name":
                f"{employee.first_name} "
                f"{employee.last_name}",

                "role":
                employee.designation,

                "designation":
                employee.designation,

                "department":
                employee.department,

                "reporting_manager":
                employee.reporting_manager,

                "shift":
                employee.shift_timing,

                "present_days":
                present_days,

                "absent_days":
                absent_days,

                "leave_days":
                leave_days,

                "approved_leaves":
                approved_leaves,

                "rejected_leaves":
                rejected_leaves,

                "total_hours":
                round(total_hours, 2),

                "recent_attendance":
                recent_attendance
            }
        })
    except Exception as e:
        import traceback
        print(f"Error in get_employee_details: {str(e)}")
        traceback.print_exc()
        return jsonify({
            "success": False,
            "message": f"Error fetching employee details: {str(e)}"
        }), 500