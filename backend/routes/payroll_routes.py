from utils.compat import Blueprint, jsonify, send_file, request
from datetime import date, datetime
from io import BytesIO

from models.database import db
from models.employee import Employee
from models.attendance import Attendance
from models.leave import LeaveRequest
from models.payment_details import PaymentDetails
from services.payroll_service import calculate_payroll, excel_round, excel_roundup, excel_rounddown
from middleware.auth import auth_required, access_level_required
from utils.jwt_helper import get_jwt_identity
from utils.employee_cache import get_all_employees_cached, invalidate_employee_cache

payroll_bp = Blueprint(
    "payroll",
    __name__
)


@payroll_bp.route(
    "/summary",
    methods=["GET"]
)
@auth_required
@access_level_required("admin", "hr")
def payroll_summary():
    """
    Returns a legacy list of all active employees and their on-the-fly payroll cycle details.
    Kept for backwards compatibility and general views.
    """
    try:
        employees = [e for e in get_all_employees_cached() if e.is_active != False]
        payroll_data = []
        today = date.today()
        total_days = 31

        for employee in employees:
            attendance_count = Attendance.query.filter(
                Attendance.user_id == employee.user_id
            ).count()

            approved_leaves = LeaveRequest.query.filter(
                LeaveRequest.employee_id == str(employee.id),
                LeaveRequest.status == "Approved"
            ).all()

            leave_days = sum(
                leave.total_days or 0
                for leave in approved_leaves
            )

            current_month = today.month
            current_year = today.year

            days_payable = max(
                total_days - leave_days,
                0
            )

            salary = employee.salary or 0

            monthly_salary = round(
                (salary / total_days) * days_payable,
                2
            )

            payroll_data.append({
                "id": employee.id,
                "employee_id": employee.employee_id,
                "employee_name": f"{employee.first_name} {employee.last_name}",
                "department": employee.department,
                "designation": employee.designation,
                "account_number": employee.account_number,
                "salary": salary,
                "working_days": attendance_count,
                "leave_days": leave_days,
                "days_payable": days_payable,
                "monthly_salary": monthly_salary,
                "payment_status": "Paid" if employee.salary_paid else "Pending",
                "paid_date": employee.salary_paid_date.strftime("%d-%m-%Y %I:%M %p") if employee.salary_paid_date else None
            })

        return jsonify({
            "success": True,
            "data": payroll_data
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@payroll_bp.route(
    "/mark-paid/<int:employee_id>",
    methods=["PUT"]
)
@auth_required
@access_level_required("admin", "hr")
def mark_salary_paid(employee_id):
    try:
        employee = Employee.query.get(employee_id)
        if not employee:
            return jsonify({
                "success": False,
                "error": "Employee not found"
            }), 404

        employee.salary_paid = True
        employee.salary_paid_date = datetime.now()
        db.session.commit()

        # Update latest PaymentDetails record if exists for this employee
        latest_pay = PaymentDetails.query.filter_by(employee_id=employee.employee_id).order_by(PaymentDetails.created_at.desc()).first()
        if latest_pay:
            latest_pay.payment_status = "Paid"
            latest_pay.updated_by = get_jwt_identity()
            latest_pay.updated_at = datetime.utcnow()
            db.session.commit()

        return jsonify({
            "success": True,
            "message": "Salary marked as paid"
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@payroll_bp.route(
    "/status/<int:employee_id>",
    methods=["GET"]
)
@auth_required
def get_payroll_status(employee_id):
    try:
        month = request.args.get("month", type=int, default=date.today().month)
        year = request.args.get("year", type=int, default=date.today().year)

        import calendar
        month_name = calendar.month_name[month]
        month_label = f"{month_name} {year}"

        employee = Employee.query.get(employee_id)
        if not employee:
            return jsonify({
                "success": False,
                "status": "Not Found",
                "message": f"Payroll has not been generated for {month_label}. Please contact the HR department."
            }), 404

        # Check PaymentDetails first
        pay_rec = PaymentDetails.query.filter_by(
            employee_id=employee_id,
            payroll_month=month,
            payroll_year=year
        ).first()

        if pay_rec:
            if pay_rec.payment_status == "Paid":
                paid_date = pay_rec.updated_at.strftime("%d-%m-%Y %I:%M %p") if pay_rec.updated_at else None
                return jsonify({
                    "success": True,
                    "status": "Paid",
                    "month": month_label,
                    "paid_date": paid_date
                }), 200
            else:
                return jsonify({
                    "success": False,
                    "status": "Pending",
                    "month": month_label,
                    "message": (
                        f"Your salary for {month_label} has not been processed yet. "
                        f"Please wait until the payroll is completed by HR. "
                        f"Once your salary has been marked as Paid, you will be able to download your payslip."
                    )
                }), 200

        # Fallback to employee salary_paid flag (legacy behavior)
        if employee.salary_paid:
            paid_date = (
                employee.salary_paid_date.strftime("%d-%m-%Y %I:%M %p")
                if employee.salary_paid_date else None
            )
            return jsonify({
                "success": True,
                "status": "Paid",
                "month": month_label,
                "paid_date": paid_date
            }), 200
        else:
            return jsonify({
                "success": False,
                "status": "Pending",
                "month": month_label,
                "message": (
                    f"Your salary for {month_label} has not been processed yet. "
                    f"Please wait until the payroll is completed by HR. "
                    f"Once your salary has been marked as Paid, you will be able to download your payslip."
                )
            }), 200

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# =========================================================================
# DIAGNOSTIC ROUTE
# =========================================================================

@payroll_bp.route("/diagnose", methods=["GET"])
@auth_required
def diagnose_db():
    try:
        from sqlalchemy import text
        from models.database import engine
        with engine.connect() as conn:
            # Run regularization query dynamically
            conn.execute(text("""
                UPDATE payment_details
                SET employee_id = e.employee_id
                FROM employees e
                WHERE payment_details.employee_id ~ '^[0-9]+$' AND payment_details.employee_id::integer = e.id
            """))
            conn.commit()
            
            pds = conn.execute(text("SELECT id, employee_id, payroll_period_start FROM payment_details")).fetchall()
            emps = conn.execute(text("SELECT id, employee_id, first_name FROM employees")).fetchall()
        return jsonify({
            "payment_details": [dict(id=r[0], employee_id=r[1], period_start=str(r[2])) for r in pds],
            "employees": [dict(id=r[0], employee_id=r[1], name=r[2]) for r in emps]
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# =========================================================================
# NEW PAYROLL SYSTEM CRUD & CALCULATION ROUTES
# =========================================================================

@payroll_bp.route(
    "",
    methods=["GET"]
)
@auth_required
@access_level_required("admin", "hr")
def get_payrolls():
    try:
        month = request.args.get("month", type=int)
        year = request.args.get("year", type=int)

        query = PaymentDetails.query
        if month:
            query = query.filter_by(payroll_month=month)
        if year:
            query = query.filter_by(payroll_year=year)

        records = query.order_by(PaymentDetails.created_at.desc()).all()
        data = []
        for r in records:
            # PaymentDetails.employee_id stores the alphanumeric employee_id string
            # Lookup the employee via the alphanumeric field to get the integer PK
            emp = Employee.query.filter_by(employee_id=r.employee_id).first()
            data.append({
                "id": r.id,
                "employee_id": emp.employee_id if emp else r.employee_id,
                "employee_name": f"{emp.first_name} {emp.last_name}" if emp else "Unknown",
                "payroll_period": f"{r.payroll_period_start.strftime('%d-%b-%Y')} to {r.payroll_period_end.strftime('%d-%b-%Y')}",
                "payroll_month": r.payroll_month,
                "payroll_year": r.payroll_year,
                "gross_salary": r.gross_salary,
                "gross_earned_salary": r.gross_earned_salary,
                "total_deduction": r.total_deduction,
                "net_transfer": r.net_transfer,
                "actual_monthly_ctc": r.actual_monthly_ctc,
                "earned_monthly_ctc": r.earned_monthly_ctc,
                "payment_status": r.payment_status,
                # real_employee_id is the integer PK used for mark-paid and payslip endpoints
                "real_employee_id": emp.id if emp else None
            })
        return jsonify({"success": True, "data": data})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@payroll_bp.route(
    "/record/<int:record_id>",
    methods=["GET"]
)
@auth_required
@access_level_required("admin", "hr")
def get_payroll_record(record_id):
    try:
        record = PaymentDetails.query.get(record_id)
        if not record:
            return jsonify({"success": False, "error": "Payroll record not found"}), 404

        emp = Employee.query.filter_by(employee_id=record.employee_id).first()
        employee_data = {
            "id": emp.id,
            "employee_id": emp.employee_id,
            "name": f"{emp.first_name} {emp.last_name}",
            "department": emp.department,
            "designation": emp.designation,
            "joining_date": emp.joining_date.isoformat() if emp.joining_date else None,
            "account_number": emp.account_number,
            "ifsc_code": emp.ifsc_code,
            "branch_code": emp.branch_code
        } if emp else None

        return jsonify({
            "success": True,
            "record": record.to_dict(),
            "employee": employee_data
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@payroll_bp.route(
    "/employee/<int:employee_pk>/attendance",
    methods=["GET"]
)
@auth_required
@access_level_required("admin", "hr")
def get_employee_attendance_payroll(employee_pk):
    try:
        today = date.today()
        month = request.args.get("month", type=int, default=today.month)
        year = request.args.get("year", type=int, default=today.year)

        # Accept integer primary key (from dropdown e.id or from edit pencil via real_employee_id)
        employee = Employee.query.get(employee_pk)
        if not employee:
            return jsonify({"success": False, "error": "Employee not found"}), 404

        # Calculate start and end date of payroll period (25th of previous month to 24th of current month)
        if month == 1:
            start_date = date(year - 1, 12, 25)
        else:
            start_date = date(year, month - 1, 25)
        end_date = date(year, month, 24)

        no_of_days = (end_date - start_date).days + 1

        # Calculate leaves overlapping with this period
        leave_requests = LeaveRequest.query.filter(
            LeaveRequest.employee_id == str(employee.id),
            LeaveRequest.status == "Approved"
        ).all()

        total_leaves = 0
        for leave in leave_requests:
            overlap_start = max(leave.from_date, start_date)
            overlap_end = min(leave.to_date, end_date)
            if overlap_start <= overlap_end:
                total_leaves += (overlap_end - overlap_start).days + 1

        # Adjust for joining and exit dates
        effective_start = start_date
        if employee.joining_date and employee.joining_date > start_date:
            effective_start = employee.joining_date

        effective_end = end_date
        if employee.last_working_date and employee.last_working_date < end_date:
            effective_end = employee.last_working_date

        if effective_start > effective_end:
            no_of_days_effective = 0
        else:
            no_of_days_effective = (effective_end - effective_start).days + 1

        days_payable = max(no_of_days_effective - total_leaves, 0)

        # Check if record already exists
        pay_rec = PaymentDetails.query.filter_by(
            employee_id=employee.employee_id,
            payroll_period_start=start_date,
            payroll_period_end=end_date
        ).first()

        if pay_rec:
            return jsonify({
                "success": True,
                "exists": True,
                "record": pay_rec.to_dict(),
                "no_of_days": no_of_days,
                "days_payable": days_payable,
                "period_start": start_date.isoformat(),
                "period_end": end_date.isoformat(),
                "employee": {
                    "id": employee.id,
                    "employee_id": employee.employee_id,
                    "name": f"{employee.first_name} {employee.last_name}",
                    "department": employee.department,
                    "designation": employee.designation,
                    "joining_date": employee.joining_date.isoformat() if employee.joining_date else None,
                    "account_number": employee.account_number,
                    "ifsc_code": employee.ifsc_code,
                    "branch_code": employee.branch_code
                }
            })

        # Calculations defaults - prioritize custom setup on employee profile first
        if employee.basic is not None and employee.hra is not None and employee.lta is not None and employee.other_allowance is not None:
            basic = employee.basic
            hra = employee.hra
            lta = employee.lta
            other_allowance = employee.other_allowance
            
            # For VPF, pf_0_01, check latest saved payroll
            prev_rec = PaymentDetails.query.filter_by(employee_id=employee.employee_id).order_by(PaymentDetails.created_at.desc()).first()
            vpf = prev_rec.vpf or 0.0 if prev_rec else 0.0
            pf_0_01 = prev_rec.pf_0_01 or 0.0 if prev_rec else 0.0
            account_number = employee.account_number
            ifsc_code = employee.ifsc_code
            branch_code = employee.branch_code
        else:
            # Fallback 1: check latest saved payroll as default salary structure
            prev_rec = PaymentDetails.query.filter_by(employee_id=employee.employee_id).order_by(PaymentDetails.created_at.desc()).first()
            if prev_rec:
                basic = prev_rec.basic
                hra = prev_rec.hra
                lta = prev_rec.lta
                other_allowance = prev_rec.other_allowance
                vpf = prev_rec.vpf or 0.0
                pf_0_01 = prev_rec.pf_0_01 or 0.0
                account_number = employee.account_number or prev_rec.account_number
                ifsc_code = employee.ifsc_code or prev_rec.ifsc_code
                branch_code = employee.branch_code or prev_rec.branch_code
            else:
                # Fallback 2: default percentage breakdown of employee.salary
                salary = employee.salary or 0.0
                basic = excel_round(salary * 0.50)
                hra = excel_round(salary * 0.25)
                lta = excel_round(salary * 0.05)
                other_allowance = excel_round(salary * 0.20)
                vpf = 0.0
                pf_0_01 = 0.0
                account_number = employee.account_number
                ifsc_code = employee.ifsc_code
                branch_code = employee.branch_code

        inputs = {
            "basic": basic,
            "hra": hra,
            "lta": lta,
            "other_allowance": other_allowance,
            "no_of_days": no_of_days,
            "days_payable": days_payable,
            "attendance_bonus": 0.0,
            "odw": 0.0,
            "internet_charges": 0.0,
            "vpf": vpf,
            "salary_advance": 0.0,
            "tds": 0.0,
            "lwf": 0.0,
            "pt": 0.0,
            "other_deduction": 0.0,
            "pf_0_01": pf_0_01
        }

        calc_result = calculate_payroll(inputs, overrides=None)
        formatted_calc = {}
        for k, v in calc_result.items():
            formatted_calc[k] = v["final_value"]

        return jsonify({
            "success": True,
            "exists": False,
            "no_of_days": no_of_days,
            "days_payable": days_payable,
            "period_start": start_date.isoformat(),
            "period_end": end_date.isoformat(),
            "employee": {
                "id": employee.id,
                "employee_id": employee.employee_id,
                "name": f"{employee.first_name} {employee.last_name}",
                "department": employee.department,
                "designation": employee.designation,
                "joining_date": employee.joining_date.isoformat() if employee.joining_date else None,
                "account_number": account_number,
                "ifsc_code": ifsc_code,
                "branch_code": branch_code
            },
            "calculations": formatted_calc
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


@payroll_bp.route(
    "",
    methods=["POST"]
)
@auth_required
@access_level_required("admin", "hr")
def create_payroll_record():
    try:
        data = request.get_json()
        # employee_id from frontend is the integer PK (from dropdown option value={e.id})
        employee_pk = data.get("employee_id")
        payroll_period_start_str = data.get("payroll_period_start")
        payroll_period_end_str = data.get("payroll_period_end")

        if not employee_pk or not payroll_period_start_str or not payroll_period_end_str:
            return jsonify({"success": False, "error": "Missing required fields"}), 400

        # Resolve the employee by integer PK to get the alphanumeric employee_id string
        employee = Employee.query.get(int(employee_pk))
        if not employee:
            return jsonify({"success": False, "error": "Employee not found"}), 404
        employee_id = employee.employee_id  # alphanumeric string stored in PaymentDetails

        payroll_period_start = datetime.strptime(payroll_period_start_str, "%Y-%m-%d").date()
        payroll_period_end = datetime.strptime(payroll_period_end_str, "%Y-%m-%d").date()

        # Check duplicate
        exists = PaymentDetails.query.filter_by(
            employee_id=employee_id,
            payroll_period_start=payroll_period_start,
            payroll_period_end=payroll_period_end
        ).first()
        if exists:
            return jsonify({"success": False, "error": "Payroll record already exists for this period"}), 400

        inputs = data.get("inputs", {})
        overrides = data.get("overrides", {})

        calc_results = calculate_payroll(inputs, overrides)

        record = PaymentDetails(
            employee_id=employee_id,  # store alphanumeric string
            payroll_period_start=payroll_period_start,
            payroll_period_end=payroll_period_end,
            payroll_month=data.get("payroll_month"),
            payroll_year=data.get("payroll_year"),
            no_of_days=int(inputs.get("no_of_days", 31)),
            days_payable=int(inputs.get("days_payable", 31)),
            account_number=data.get("account_number"),
            ifsc_code=data.get("ifsc_code"),
            branch_code=data.get("branch_code"),
            payment_status=data.get("payment_status", "Pending"),
            overrides=overrides,
            created_by=get_jwt_identity(),
            created_at=datetime.utcnow()
        )

        for field, details in calc_results.items():
            if hasattr(record, field):
                setattr(record, field, details["final_value"])

        # Also update the employee's core profile bank details
        employee.account_number = data.get("account_number")
        employee.ifsc_code = data.get("ifsc_code")
        employee.branch_code = data.get("branch_code")
        
        db.session.add(record)
        db.session.commit()
        invalidate_employee_cache()

        return jsonify({"success": True, "record": record.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


@payroll_bp.route(
    "/<int:record_id>",
    methods=["PUT"]
)
@auth_required
@access_level_required("admin", "hr")
def update_payroll_record(record_id):
    try:
        record = PaymentDetails.query.get(record_id)
        if not record:
            return jsonify({"success": False, "error": "Payroll record not found"}), 404

        data = request.get_json()
        inputs = data.get("inputs", {})
        overrides = data.get("overrides", {})

        calc_results = calculate_payroll(inputs, overrides)

        record.no_of_days = int(inputs.get("no_of_days", record.no_of_days))
        record.days_payable = int(inputs.get("days_payable", record.days_payable))
        record.account_number = data.get("account_number", record.account_number)
        record.ifsc_code = data.get("ifsc_code", record.ifsc_code)
        record.branch_code = data.get("branch_code", record.branch_code)
        record.payment_status = data.get("payment_status", record.payment_status)
        record.overrides = overrides
        record.updated_by = get_jwt_identity()
        record.updated_at = datetime.utcnow()

        for field, details in calc_results.items():
            if hasattr(record, field):
                setattr(record, field, details["final_value"])

        # Also update the employee's core profile bank details
        employee = Employee.query.filter_by(employee_id=record.employee_id).first()
        if employee:
            employee.account_number = data.get("account_number", employee.account_number)
            employee.ifsc_code = data.get("ifsc_code", employee.ifsc_code)
            employee.branch_code = data.get("branch_code", employee.branch_code)

        db.session.commit()
        invalidate_employee_cache()
        return jsonify({"success": True, "record": record.to_dict()})
    except Exception as e:
        db.session.rollback()
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


@payroll_bp.route(
    "/<int:record_id>",
    methods=["DELETE"]
)
@auth_required
@access_level_required("admin", "hr")
def delete_payroll_record(record_id):
    try:
        record = PaymentDetails.query.get(record_id)
        if not record:
            return jsonify({"success": False, "error": "Payroll record not found"}), 404

        db.session.delete(record)
        db.session.commit()
        return jsonify({"success": True, "message": "Payroll record deleted successfully"})
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 500


# =========================================================================
# PAYSLIP GENERATION ROUTE (USES DATABASE RECORD)
# =========================================================================

@payroll_bp.route(
    "/payslip/<int:employee_id>",
    methods=["GET"]
)
@auth_required
def generate_payslip_pdf_helper(employee, month, year):
    from reportlab.platypus import (
        SimpleDocTemplate,
        Table,
        TableStyle,
        Spacer,
        Paragraph,
        Image
    )
    from reportlab.lib import colors
    from reportlab.lib.styles import getSampleStyleSheet

    # Read period query params or default to current month
    today = date.today()

    import calendar
    month_name = calendar.month_name[month]
    month_label = f"{month_name} {year}"

    # Fetch saved PaymentDetails record
    pay_rec = PaymentDetails.query.filter_by(
        employee_id=employee.employee_id,
        payroll_month=month,
        payroll_year=year
    ).first()

    # Guard: check if payment_status is Paid or employee.salary_paid flag (fallback)
    is_paid = False
    if pay_rec:
        is_paid = (pay_rec.payment_status == "Paid")
    else:
        is_paid = employee.salary_paid

    if not is_paid:
        return jsonify({
            "success": False,
            "status": "Pending",
            "message": f"Payroll is still being processed for {month_label}. Payslip cannot be downloaded yet."
        }), 403

    # Populate calculations from saved DB record, or fallback to on-the-fly
    if pay_rec:
        # Data from database
        total_days = pay_rec.no_of_days
        days_payable = pay_rec.days_payable
        basic = pay_rec.basic
        hra = pay_rec.hra
        lta = pay_rec.lta
        other_allowance = pay_rec.other_allowance
        gross_salary = pay_rec.gross_salary

        earned_basic = pay_rec.earned_basic
        earned_hra = pay_rec.earned_hra
        earned_lta = pay_rec.earned_lta
        earned_other = pay_rec.earned_other_allowance
        earned_salary = pay_rec.earned_actual_gross

        attendance_bonus = pay_rec.attendance_bonus
        odw = pay_rec.odw
        total = pay_rec.total
        bonus = pay_rec.bonus
        internet_charges = pay_rec.internet_charges

        pf = pay_rec.pf_vpf_ded_employee
        esi = pay_rec.esi_ded_employee
        salary_advance = pay_rec.salary_advance
        tds = pay_rec.tds
        pt = pay_rec.pt
        lwf = pay_rec.lwf
        other_deduction = pay_rec.other_deduction
        total_deduction = pay_rec.total_deduction
        net_salary = pay_rec.net_transfer

        account_num = pay_rec.account_number or employee.account_number or "NA"
    else:
        # Legacy fallback
        total_days = calendar.monthrange(today.year, today.month)[1]
        approved_leaves = LeaveRequest.query.filter(
            LeaveRequest.employee_id == str(employee.id),
            LeaveRequest.status == "Approved"
        ).all()
        leave_days = sum(leave.total_days or 0 for leave in approved_leaves)
        days_payable = max(total_days - leave_days, 0)

        salary = employee.salary or 0
        basic = round(salary * 0.50, 2)
        hra = round(salary * 0.25, 2)
        lta = round(salary * 0.05, 2)
        other_allowance = round(salary * 0.20, 2)
        gross_salary = salary

        earned_basic = round((basic / total_days) * days_payable, 2)
        earned_hra = round((hra / total_days) * days_payable, 2)
        earned_lta = round((lta / total_days) * days_payable, 2)
        earned_other = round((other_allowance / total_days) * days_payable, 2)
        earned_salary = round(earned_basic + earned_hra + earned_lta + earned_other, 2)

        attendance_bonus = 0.0
        odw = 0.0
        total = 0.0
        bonus = 0.0
        internet_charges = 0.0

        pf = round(earned_basic * 0.12, 2)
        esi = round(earned_salary * 0.0075, 2)
        salary_advance = 0.0
        tds = 0.0
        pt = 0.0
        lwf = 0.0
        other_deduction = 0.0
        total_deduction = pf + esi
        net_salary = round(earned_salary - total_deduction, 2)

        account_num = employee.account_number or "NA"

    # Calculate leave history overlapping the payroll period
    if pay_rec:
        start_dt = pay_rec.payroll_period_start
        end_dt = pay_rec.payroll_period_end
    else:
        if month == 1:
            start_dt = date(year - 1, 12, 25)
        else:
            start_dt = date(year, month - 1, 25)
        end_dt = date(year, month, 24)

    all_leaves = LeaveRequest.query.filter(
        LeaveRequest.employee_id == str(employee.id),
        LeaveRequest.status == "Approved"
    ).all()

    leave_data = []
    leave_days_count = 0
    for leave in all_leaves:
        overlap_start = max(leave.from_date, start_dt)
        overlap_end = min(leave.to_date, end_dt)
        if overlap_start <= overlap_end:
            days = (overlap_end - overlap_start).days + 1
            leave_days_count += days
            leave_data.append([
                leave.leave_type,
                str(leave.from_date),
                str(leave.to_date),
                str(days)
            ])

    attendance_days = Attendance.query.filter(
        Attendance.user_id == employee.user_id,
        Attendance.status == "Present",
        Attendance.attendance_date >= start_dt,
        Attendance.attendance_date <= end_dt
    ).count()

    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        rightMargin=20,
        leftMargin=20,
        topMargin=20,
        bottomMargin=20
    )

    styles = getSampleStyleSheet()
    styles["Title"].alignment = 1
    styles["Heading2"].alignment = 1
    styles["Normal"].alignment = 1

    elements = []

    import os
    logo_path = "uploads/s.png"
    if os.path.exists(logo_path):
        try:
            logo = Image(logo_path, width=180, height=180)
            logo.hAlign = "CENTER"
            elements.append(logo)
            elements.append(Spacer(1, 10))
        except Exception:
            pass

    elements.append(Paragraph("<b>S4 CARLISLE PUBLISHING SERVICES</b>", styles["Title"]))
    elements.append(Paragraph("60, Industrial Estate, Perungudi, Chennai - 600096", styles["Normal"]))
    elements.append(Spacer(1, 10))
    elements.append(Paragraph(f"<b>PAYSLIP FOR MONTH OF {month_label.upper()}</b>", styles["Heading2"]))
    elements.append(Spacer(1, 15))

    employee_table = Table(
        [
            [
                f"EMP NO: {employee.employee_id}",
                f"NAME: {employee.first_name} {employee.last_name}"
            ],
            [
                f"PF NO: {employee.pf_number or 'NA'}",
                f"ESI NO: {employee.esi_number or 'NA'}"
            ],
            [
                f"DESIGNATION: {employee.designation}",
                f"PAYABLE DAYS: {days_payable}"
            ],
            [
                f"TOTAL DAYS: {total_days}",
                f"PRESENT DAYS: {attendance_days}"
            ],
            [
                f"LEAVE DAYS: {leave_days_count}",
                f"PHONE: {employee.phone or 'NA'}"
            ],
            [
                f"DOJ: {employee.joining_date}",
                f"BANK A/C: {account_num}"
            ],
            [
                f"UAN NO: {employee.uan_number or 'NA'}",
                f"BRANCH CODE: {employee.branch_code or 'NA'}"
            ]
        ],
        colWidths=[260, 260]
    )

    employee_table.setStyle(
        TableStyle([
            ("GRID", (0, 0), (-1, -1), 1, colors.black),
            ("FONTNAME", (0, 0), (-1, -1), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 9)
        ])
    )

    elements.append(employee_table)
    elements.append(Spacer(1, 10))

    actual_salary = Table([
        ["ACTUAL SALARY", ""],
        ["Basic", f"{basic:.2f}"],
        ["HRA", f"{hra:.2f}"],
        ["LTA", f"{lta:.2f}"],
        ["Other Allow.", f"{other_allowance:.2f}"],
        ["GROSS", f"{gross_salary:.2f}"]
    ])

    earned_salary_table = Table([
        ["EARNED SALARY", ""],
        ["Basic", f"{earned_basic:.2f}"],
        ["HRA", f"{earned_hra:.2f}"],
        ["LTA", f"{earned_lta:.2f}"],
        ["Other Allow.", f"{earned_other:.2f}"],
        ["TOTAL", f"{earned_salary:.2f}"]
    ])

    # Sum other additions: attendance bonus + odw + internet + bonus
    total_additions = total + internet_charges + bonus
    other_payment = Table([
        ["OTHER PAYMENTS", ""],
        ["Att Bonus", f"{attendance_bonus:.2f}"],
        ["ODW", f"{odw:.2f}"],
        ["Internet Chg", f"{internet_charges:.2f}"],
        ["Bonus", f"{bonus:.2f}"],
        ["TOTAL", f"{total_additions:.2f}"]
    ])

    # Show actual employee deductions
    deductions = Table([
        ["DEDUCTIONS", ""],
        ["P.F / V.P.F", f"{pf:.2f}"],
        ["E.S.I", f"{esi:.2f}"],
        ["Salary Adv", f"{salary_advance:.2f}"],
        ["TDS", f"{tds:.2f}"],
        ["Prof Tax", f"{pt:.2f}"],
        ["LWF", f"{lwf:.2f}"],
        ["Other Ded", f"{other_deduction:.2f}"],
        ["TOTAL", f"{total_deduction:.2f}"]
    ])

    for tbl in [
        actual_salary,
        earned_salary_table,
        other_payment,
        deductions
    ]:
        tbl.setStyle(
            TableStyle([
                ("GRID", (0, 0), (-1, -1), 1, colors.black),
                ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 8)
            ])
        )

    salary_layout = Table(
        [
            [
                actual_salary,
                "",
                earned_salary_table,
                "",
                other_payment,
                "",
                deductions
            ]
        ],
        colWidths=[
            115,
            15,
            115,
            15,
            115,
            15,
            115
        ]
    )

    salary_layout.setStyle(
        TableStyle([
            ("LEFTPADDING", (0, 0), (-1, -1), 2),
            ("RIGHTPADDING", (0, 0), (-1, -1), 2)
        ])
    )

    elements.append(salary_layout)
    elements.append(Spacer(1, 15))

    net_table = Table(
        [
            [
                f"NET AMOUNT : ₹ {net_salary:.2f}"
            ]
        ],
        colWidths=[520]
    )

    net_table.setStyle(
        TableStyle([
            ("GRID", (0, 0), (-1, -1), 1, colors.black),
            ("FONTNAME", (0, 0), (-1, -1), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 12)
        ])
    )

    elements.append(net_table)
    elements.append(Spacer(1, 20))
    elements.append(Paragraph("<b>LEAVE DETAILS</b>", styles["Heading3"]))

    if leave_data:
        leave_table = Table(
            [
                [
                    "Leave Type",
                    "From Date",
                    "To Date",
                    "Days"
                ]
            ] + leave_data,
            colWidths=[120, 120, 120, 80]
        )

        leave_table.setStyle(
            TableStyle([
                ("GRID", (0, 0), (-1, -1), 1, colors.black),
                ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 8)
            ])
        )

        elements.append(leave_table)
    else:
        elements.append(Paragraph("No Leave Records", styles["Normal"]))

    elements.append(Spacer(1, 50))

    sign_table = Table(
        [
            [
                "SIGN OF EMPLOYEE",
                "SIGN OF EMPLOYER"
            ]
        ],
        colWidths=[260, 260]
    )

    elements.append(sign_table)
    doc.build(elements)

    buffer.seek(0)
    return send_file(
        buffer,
        as_attachment=True,
        download_name=f"{employee.first_name}_{employee.last_name}_Payslip_{month_label.replace(' ', '_')}.pdf",
        mimetype="application/pdf"
    )


@payroll_bp.route(
    "/payslip/<int:employee_id>",
    methods=["GET"]
)
@auth_required
def download_payslip(employee_id):
    try:
        employee = Employee.query.get(employee_id)
        if not employee:
            return jsonify({
                "success": False,
                "error": "Employee not found"
            }), 404

        today = date.today()
        month = request.args.get("month", type=int, default=today.month)
        year = request.args.get("year", type=int, default=today.year)

        return generate_payslip_pdf_helper(employee, month, year)

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@payroll_bp.route(
    "/my",
    methods=["GET"]
)
@auth_required
def get_my_payroll():
    try:
        user_id = get_jwt_identity()
        employee = Employee.query.filter_by(user_id=user_id).first()
        if not employee:
            return jsonify({"success": False, "error": "Employee profile not found"}), 404

        records = PaymentDetails.query.filter_by(
            employee_id=employee.employee_id
        ).order_by(PaymentDetails.payroll_period_start.desc()).all()

        data = [r.to_dict() for r in records]
        return jsonify({
            "success": True,
            "data": data,
            "employee": {
                "id": employee.id,
                "employee_id": employee.employee_id,
                "first_name": employee.first_name,
                "last_name": employee.last_name,
                "department": employee.department,
                "designation": employee.designation,
                "account_number": employee.account_number,
                "ifsc_code": employee.ifsc_code,
                "branch_code": employee.branch_code
            }
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@payroll_bp.route(
    "/my/<int:record_id>/payslip",
    methods=["GET"]
)
@auth_required
def download_my_payslip(record_id):
    try:
        user_id = get_jwt_identity()
        employee = Employee.query.filter_by(user_id=user_id).first()
        if not employee:
            return jsonify({"success": False, "error": "Employee profile not found"}), 404

        record = PaymentDetails.query.get(record_id)
        if not record:
            return jsonify({"success": False, "error": "Payroll record not found"}), 404

        if record.employee_id != employee.employee_id:
            return jsonify({"success": False, "error": "Forbidden"}), 403

        if record.payment_status != "Paid":
            return jsonify({"success": False, "error": "Payslip not available for unpaid payroll"}), 400

        return generate_payslip_pdf_helper(employee, record.payroll_month, record.payroll_year)

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500