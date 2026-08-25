from datetime import datetime
import calendar
from datetime import date
import json

from models.database import db
from models.employee import Employee
from models.leave import EmployeeLeaveBalance, LeaveCreditHistory
from sqlalchemy import func

CL_SL_NAMES = ["cl/sl", "cl / sl", "sl/cl", "sl / cl", "casual leave", "sick leave"]
PL_NAMES = ["pl", "privilege leave", "privileged leave", "earned leave"]
PERMISSION_NAMES = ["permission", "permissions"]

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
      - CL/SL combined pool  → +1 day (credited to casual_leave)
    """
    if not employee:
        return False

    today = datetime.today()

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

        _, last_day = calendar.monthrange(new_y, new_m)
        new_d = min(d, last_day)

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

    # ── CL/SL combined balance (+1 every month to CL) ───────────────────────
    employee.casual_leave = (employee.casual_leave or 0.0) + 1.0
    cl_sl_balance = _find_balance(employee.id, CL_SL_NAMES)
    if cl_sl_balance:
        cl_sl_balance.available = (cl_sl_balance.available or 0.0) + 1.0

    # Mark this month as credited
    employee.last_leave_reset_month = str(current_month)
    employee.last_leave_reset_year  = current_year

    return True


def update_all_employee_leave_balances():
    """Credit monthly CL/SL leaves for all active employees and commit once."""
    employees = [
        e for e in Employee.query.all()
        if (e.status or "").lower() == "active"
    ]

    updated_count = 0
    updated_details = []
    
    current_date = datetime.today()
    current_month = current_date.month
    current_year = current_date.year
    
    for employee in employees:
        cl_sl_bal = _find_balance(employee.id, CL_SL_NAMES)
        prev_cl_sl = cl_sl_bal.available if cl_sl_bal else 0.0
        
        updated = update_leave_balance(employee)
        if updated:
            updated_count += 1
            
            # Re-fetch or calculate new since they were updated in memory
            current_cl_sl = cl_sl_bal.available if cl_sl_bal else (prev_cl_sl + 1.0)
            
            doj = str(employee.joining_date) if employee.joining_date else "N/A"
            name = f"{employee.first_name} {employee.last_name}".strip() or str(employee.employee_id)
            
            updated_details.append({
                "name": name,
                "doj": doj,
                "previous_leave": f"CL/SL: {prev_cl_sl}",
                "current_leave": f"CL/SL: {current_cl_sl}"
            })

    if updated_count > 0:
        history = LeaveCreditHistory(
            month=current_month,
            year=current_year,
            credit_type="month",
            employees_updated=updated_count,
            employee_details_json=json.dumps(updated_details)
        )
        db.session.add(history)

    db.session.commit()

    return {
        "success": True,
        "employees_updated": updated_count,
        "updated_details": updated_details
    }


def update_all_employee_pl_balances():
    """Credit yearly PL leaves for all active employees and commit once."""
    today = datetime.today()
    
    # Optional: ensure it's January (unless overridden for testing)
    # If we want to allow triggering it manually any time, we shouldn't strictly enforce month=1
    # But usually this runs on Jan 1st.
    current_year = today.year
    current_month = today.month

    # As requested, do not run for the current year (2026)
    if current_year <= 2026:
        return {
            "success": False,
            "message": "Yearly PL credit is configured to only start from the coming year (2027 onwards)."
        }

    # Check if yearly PL has already run this year in LeaveCreditHistory
    # to prevent double runs
    existing_run = LeaveCreditHistory.query.filter_by(
        year=current_year, 
        credit_type="year"
    ).first()

    if existing_run:
        return {
            "success": False,
            "message": f"Yearly PL already credited for {current_year}"
        }

    employees = [
        e for e in Employee.query.all()
        if (e.status or "").lower() == "active"
    ]

    updated_count = 0
    updated_details = []

    for employee in employees:
        is_eligible_for_pl = True
        if employee.joining_date:
            y = employee.joining_date.year
            m = employee.joining_date.month
            d = employee.joining_date.day
            
            new_y = y + 1
            _, last_day = calendar.monthrange(new_y, m)
            new_d = min(d, last_day)
            
            eligible_date_pl = date(new_y, m, new_d)
            if today.date() < eligible_date_pl:
                is_eligible_for_pl = False
                
        if is_eligible_for_pl:
            pl_bal = _find_balance(employee.id, PL_NAMES)
            prev_pl = pl_bal.available if pl_bal else 0.0

            # Add 15 days
            new_pl_val = (employee.privilege_leave or 0.0) + 15.0
            # Cap at 30 days
            if new_pl_val > 30.0:
                new_pl_val = 30.0

            employee.privilege_leave = new_pl_val

            if pl_bal:
                new_pl_bal = (pl_bal.available or 0.0) + 15.0
                if new_pl_bal > 30.0:
                    new_pl_bal = 30.0
                pl_bal.available = new_pl_bal
            else:
                new_pl_bal = new_pl_val

            updated_count += 1
            
            doj = str(employee.joining_date) if employee.joining_date else "N/A"
            name = f"{employee.first_name} {employee.last_name}".strip() or str(employee.employee_id)
            
            updated_details.append({
                "name": name,
                "doj": doj,
                "previous_leave": f"PL: {prev_pl}",
                "current_leave": f"PL: {new_pl_bal}"
            })

    if updated_count > 0:
        history = LeaveCreditHistory(
            month=current_month,
            year=current_year,
            credit_type="year",
            employees_updated=updated_count,
            employee_details_json=json.dumps(updated_details)
        )
        db.session.add(history)

    db.session.commit()

    return {
        "success": True,
        "employees_updated": updated_count,
        "updated_details": updated_details
    }


def update_all_employee_permission_balances():
    """Reset Permission leaves to 2 hours for all active employees and commit once."""
    today = datetime.today()
    current_year = today.year
    current_month = today.month

    # Check if monthly permission has already run this month in LeaveCreditHistory
    # to prevent double runs
    existing_run = LeaveCreditHistory.query.filter_by(
        month=current_month,
        year=current_year,
        credit_type="permission"
    ).first()

    if existing_run:
        return {
            "success": False,
            "message": f"Monthly Permission reset already completed for {current_month}/{current_year}"
        }

    employees = [
        e for e in Employee.query.all()
        if (e.status or "").lower() == "active"
    ]

    updated_count = 0
    updated_details = []

    for employee in employees:
        perm_bal = _find_balance(employee.id, PERMISSION_NAMES)
        prev_perm = perm_bal.available if perm_bal else 0.0

        if perm_bal:
            perm_bal.available = 2.0
        else:
            new_perm_bal = EmployeeLeaveBalance(
                employee_id=employee.id,
                leave_type="Permission",
                available=2.0
            )
            db.session.add(new_perm_bal)

        updated_count += 1
        
        doj = str(employee.joining_date) if employee.joining_date else "N/A"
        name = f"{employee.first_name} {employee.last_name}".strip() or str(employee.employee_id)
        
        updated_details.append({
            "name": name,
            "doj": doj,
            "previous_leave": f"Permission: {prev_perm}",
            "current_leave": f"Permission: 2.0"
        })

    if updated_count > 0:
        history = LeaveCreditHistory(
            month=current_month,
            year=current_year,
            credit_type="permission",
            employees_updated=updated_count,
            employee_details_json=json.dumps(updated_details)
        )
        db.session.add(history)

    db.session.commit()

    return {
        "success": True,
        "employees_updated": updated_count,
        "updated_details": updated_details
    }



def update_single_employee_leave_balance(employee_id):
    """Credit CL/SL leaves for a single employee and commit."""
    employee = Employee.query.get(employee_id)

    if not employee:
        return {
            "success": False,
            "message": "Employee not found"
        }

    updated = update_leave_balance(employee)

    if updated:
        db.session.commit()
        return {
            "success": True,
            "message": "Leave balance updated",
            "casual_leave_available": employee.casual_leave,
        }

    return {
        "success": False,
        "message": "Already credited this month or before 25th"
    }