from datetime import datetime

from models.database import db
from models.employee import Employee
from models.leave import EmployeeLeaveBalance
from sqlalchemy import func


# Names that are considered the combined CL/SL pool
CL_SL_NAMES = ["cl/sl", "cl / sl", "sl/cl", "sl / cl", "casual leave", "sick leave"]

# Names that are considered PL pool
PL_NAMES = ["pl", "privilege leave", "privileged leave", "earned leave"]


def _find_balance(employee_id: int, name_list: list) -> "EmployeeLeaveBalance | None":
    """Return the first matching EmployeeLeaveBalance row for this employee."""
    return EmployeeLeaveBalance.query.filter(
        EmployeeLeaveBalance.employee_id == employee_id,
        func.lower(EmployeeLeaveBalance.leave_type).in_(name_list)
    ).first()


def update_leave_balance(employee):
    """
    Credit leave balances for one employee.
    Runs only on or after the 25th of the month.
    Prevents double-crediting using last_leave_reset_month / last_leave_reset_year.

    Monthly credit:
      - CL/SL combined pool  → +1 day
    Annual credit (January only):
      - PL pool              → +15 days
    """
    if not employee:
        return False

    today = datetime.today()
    # today = datetime(2026, 10, 25)

    # ── Check if employee has completed 6 months since joining ───────────────
    if employee.joining_date:
        y = employee.joining_date.year
        m = employee.joining_date.month
        d = employee.joining_date.day

        new_m = m + 6
        new_y = y
        if new_m > 12:
            new_y += (new_m - 1) // 12
            new_m = (new_m - 1) % 12 + 1

        import calendar
        _, last_day = calendar.monthrange(new_y, new_m)
        new_d = min(d, last_day)

        from datetime import date
        eligible_date = date(new_y, new_m, new_d)

        if today.date() < eligible_date:
            return False

    # Only run on or after the 25th
    if today.day < 25:
        return False

    current_month = today.month
    current_year  = today.year

    # Prevent duplicate credit for the same month
    if (
        employee.last_leave_reset_month == str(current_month)
        and employee.last_leave_reset_year == current_year
    ):
        return False

    # ── CL/SL combined balance (+1 every month) ──────────────────────────────
    cl_sl_balance = _find_balance(employee.id, CL_SL_NAMES)
    if cl_sl_balance:
        cl_sl_balance.available = (cl_sl_balance.available or 0) + 1
    # If no CL/SL balance row exists yet, skip silently
    # (it will be created when a leave policy is assigned)

    # ── PL balance (+15 every January) ───────────────────────────────────────
    if current_month == 1:
        pl_balance = _find_balance(employee.id, PL_NAMES)
        if pl_balance:
            pl_balance.available = (pl_balance.available or 0) + 15

    # Mark this month as credited
    employee.last_leave_reset_month = str(current_month)
    employee.last_leave_reset_year  = current_year

    return True


def update_all_employee_leave_balances():
    """Credit leaves for all active employees and commit once."""
    employees = [
        e for e in Employee.query.all()
        if (e.status or "").lower() != "inactive"
    ]

    updated_count = 0
    for employee in employees:
        updated = update_leave_balance(employee)
        if updated:
            updated_count += 1

    db.session.commit()

    return {
        "success": True,
        "employees_updated": updated_count
    }


def update_single_employee_leave_balance(employee_id):
    """Credit leaves for a single employee and commit."""
    employee = Employee.query.get(employee_id)

    if not employee:
        return {
            "success": False,
            "message": "Employee not found"
        }

    updated = update_leave_balance(employee)

    if updated:
        db.session.commit()
        cl_sl = _find_balance(employee.id, CL_SL_NAMES)
        pl    = _find_balance(employee.id, PL_NAMES)
        return {
            "success": True,
            "message": "Leave balance updated",
            "cl_sl_available": cl_sl.available if cl_sl else 0,
            "pl_available":    pl.available    if pl    else 0,
        }

    return {
        "success": False,
        "message": "Already credited this month or before 25th"
    }