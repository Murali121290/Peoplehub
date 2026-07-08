from flask import Blueprint, request, jsonify
from models.database import db
from models.leave import LeaveRequest
from datetime import datetime
from models.employee import Employee
from openpyxl import Workbook
from flask import send_file
from io import BytesIO

from services.leave_balance_service import (
    update_all_employee_leave_balances
)

leave_bp = Blueprint(
    "leave",
    __name__
)

@leave_bp.route("/", methods=["POST"])
def apply_leave():

    try:

        data = request.get_json()

        request_type = data.get("request_type", "Leave")

        leave = LeaveRequest(
            employee_id=data.get("employee_id"),
            employee_name=data.get("employee_name"),
            request_type=request_type,
            leave_type=data.get("leave_type"),
            reporting_manager=data.get("reporting_manager"),
            handover_to=data.get("handover_to"),
            emergency_contact=data.get("emergency_contact"),
            reason=data.get("reason")
        )

        # ===========================
        # LEAVE REQUEST
        # ===========================
        if request_type == "Leave":

            leave.from_date = datetime.strptime(
                data.get("from_date"),
                "%Y-%m-%d"
            ).date()

            leave.to_date = datetime.strptime(
                data.get("to_date"),
                "%Y-%m-%d"
            ).date()

            leave.total_days = int(data.get("total_days", 0))

        # ===========================
        # PERMISSION REQUEST
        # ===========================
        elif request_type == "Permission":

            leave.permission_date = datetime.strptime(
                data.get("permission_date"),
                "%Y-%m-%d"
            ).date()

            leave.from_time = datetime.strptime(
                data.get("from_time"),
                "%H:%M"
            ).time()

            leave.to_time = datetime.strptime(
                data.get("to_time"),
                "%H:%M"
            ).time()

            leave.total_days = 0

        db.session.add(leave)
        db.session.commit()

        return jsonify({
            "success": True,
            "message": f"{request_type} Applied Successfully"
        }), 200

    except Exception as e:

        db.session.rollback()

        import traceback
        traceback.print_exc()

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500
    
@leave_bp.route("/", methods=["GET"])
def get_leaves():

    try:

        leaves = LeaveRequest.query.order_by(
            LeaveRequest.id.desc()
        ).all()

        print("========== LEAVE REQUESTS ==========")
        print(f"Total Leaves: {len(leaves)}")

        for leave in leaves:
            print(
                f"ID: {leave.id}, "
                f"Employee ID: {leave.employee_id}, "
                f"Employee: {leave.employee_name}, "
                f"Status: {leave.status}"
            )

        return jsonify([
            {
                "id": leave.id,
                "employee_id": leave.employee_id,
                "employee_name": leave.employee_name,
                "leave_type": leave.leave_type,
                "from_date": str(leave.from_date) if leave.from_date else None,
                "to_date": str(leave.to_date) if leave.to_date else None,
                "total_days": leave.total_days,
                "reporting_manager": leave.reporting_manager,
                "handover_to": leave.handover_to,
                "emergency_contact": leave.emergency_contact,
                "reason": leave.reason,
                "status": leave.status,
                "request_type": leave.request_type,
                "permission_date": str(leave.permission_date) if leave.permission_date else None,
                "from_time": str(leave.from_time) if leave.from_time else None,
                "to_time": str(leave.to_time) if leave.to_time else None,
            }
            for leave in leaves
        ]), 200

    except Exception as e:
        import traceback
        traceback.print_exc()

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500
    

@leave_bp.route(
    "/approve/<int:leave_id>",
    methods=["PUT"]
)
def approve_leave(leave_id):

    try:

        leave = LeaveRequest.query.get(leave_id)

        if not leave:
            return jsonify({
                "success": False,
                "error": "Leave not found"
            }), 404

        # Prevent double approval
        if leave.status == "Approved":
            return jsonify({
                "success": False,
                "error": "Leave already approved"
            }), 400

        print("Leave Employee ID:", leave.employee_id)

        employee = Employee.query.get(int(leave.employee_id))

        print("Employee Found:", employee)

        if not employee:
            return jsonify({
                "success": False,
                "error": "Employee not found"
            }), 404

        # ===========================
        # PERMISSION REQUEST
        # ===========================
        if leave.request_type == "Permission":

            leave.status = "Approved"

            db.session.commit()

            return jsonify({
                "success": True,
                "message": "Permission Approved Successfully"
            }), 200

        # ===========================
        # LEAVE REQUEST
        # ===========================

        leave.status = "Approved"

        leave_type = (leave.leave_type or "").strip().lower()

        leave_days = leave.total_days or 0

        if leave_type == "sick leave":

            employee.sick_leave = max(
                0,
                (employee.sick_leave or 0) - leave_days
            )

        elif leave_type == "casual leave":

            employee.casual_leave = max(
                0,
                (employee.casual_leave or 0) - leave_days
            )

        elif leave_type == "earned leave":

            employee.earned_leave = max(
                0,
                (employee.earned_leave or 0) - leave_days
            )

        else:

            return jsonify({
                "success": False,
                "error": f"Invalid leave type: {leave.leave_type}"
            }), 400

        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Leave Approved Successfully",
            "leave_balance": {
                "sick_leave": employee.sick_leave,
                "casual_leave": employee.casual_leave,
                "earned_leave": employee.earned_leave,
                "total_balance":
                    (employee.sick_leave or 0) +
                    (employee.casual_leave or 0) +
                    (employee.earned_leave or 0)
            }
        }), 200

    except Exception as e:

        db.session.rollback()

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@leave_bp.route(
    "/reject/<int:leave_id>",
    methods=["PUT"]
)
def reject_leave(leave_id):

    leave = LeaveRequest.query.get(
        leave_id
    )

    if not leave:

        return jsonify({
            "error": "Leave not found"
        }), 404

    leave.status = "Rejected"

    db.session.commit()

    return jsonify({
        "success": True,
        "message": "Leave Rejected"
    })


@leave_bp.route(
    "/cancel/<int:leave_id>",
    methods=["PUT"]
)
def cancel_leave(leave_id):

    try:

        leave = LeaveRequest.query.get(
            leave_id
        )

        if not leave:
            return jsonify({
                "success": False,
                "error": "Leave not found"
            }), 404

        if leave.status == "Cancelled":
            return jsonify({
                "success": False,
                "error": "Already cancelled"
            }), 400

        leave.status = "Cancelled"

        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Leave Cancelled Successfully"
        })

    except Exception as e:

        db.session.rollback()

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500
    
@leave_bp.route(
    "/update/<int:leave_id>",
    methods=["PUT"]
)
def update_leave(leave_id):

    try:

        leave = LeaveRequest.query.get(leave_id)

        if not leave:
            return jsonify({
                "success": False,
                "error": "Request not found"
            }), 404

        data = request.get_json()

        # Common fields
        leave.reason = data.get("reason", leave.reason)
        leave.emergency_contact = data.get(
            "emergency_contact",
            leave.emergency_contact
        )
        leave.handover_to = data.get(
            "handover_to",
            leave.handover_to
        )

        # ===========================
        # UPDATE LEAVE
        # ===========================
        if leave.request_type == "Leave":

            leave.leave_type = data.get("leave_type")

            leave.from_date = datetime.strptime(
                data.get("from_date"),
                "%Y-%m-%d"
            ).date()

            leave.to_date = datetime.strptime(
                data.get("to_date"),
                "%Y-%m-%d"
            ).date()

            leave.total_days = float(
                data.get("total_days", 0)
            )

            # Clear permission fields
            leave.permission_date = None
            leave.from_time = None
            leave.to_time = None

        # ===========================
        # UPDATE PERMISSION
        # ===========================
        elif leave.request_type == "Permission":

            leave.permission_date = datetime.strptime(
                data.get("permission_date"),
                "%Y-%m-%d"
            ).date()

            leave.from_time = datetime.strptime(
                data.get("from_time"),
                "%H:%M"
            ).time()

            leave.to_time = datetime.strptime(
                data.get("to_time"),
                "%H:%M"
            ).time()

            # Clear leave fields
            leave.leave_type = None
            leave.from_date = None
            leave.to_date = None
            leave.total_days = 0

        db.session.commit()

        return jsonify({
            "success": True,
            "message": f"{leave.request_type} Updated Successfully"
        }), 200

    except Exception as e:

        db.session.rollback()

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500
    
     
@leave_bp.route(
    "/export-leave-report",
    methods=["GET"]
)
def export_leave_report():

    try:

        from io import BytesIO

        from openpyxl import Workbook

        from openpyxl.styles import (
            PatternFill,
            Font,
            Border,
            Side,
            Alignment
        )

        from openpyxl.utils import (
            get_column_letter
        )

        wb = Workbook()

        ws = wb.active

        ws.title = "Leave Working Update"

        # =========================
        # STYLES
        # =========================

        blue_fill = PatternFill(
            "solid",
            fgColor="4F81BD"
        )

        green_fill = PatternFill(
            "solid",
            fgColor="00E5C3"
        )

        yellow_fill = PatternFill(
            "solid",
            fgColor="FFD966"
        )

        black_fill = PatternFill(
            "solid",
            fgColor="000000"
        )

        orange_fill = PatternFill(
            "solid",
            fgColor="F4B183"
        )

        white_font = Font(
            bold=True,
            color="FFFFFF"
        )

        bold_font = Font(
            bold=True
        )

        thin_border = Border(
            left=Side(style="thin"),
            right=Side(style="thin"),
            top=Side(style="thin"),
            bottom=Side(style="thin")
        )

        # =========================
        # TITLE
        # =========================

        ws.merge_cells("A1:T1")

        ws["A1"] = "LEAVE WORKING UPDATE"

        ws["A1"].font = Font(
            bold=True,
            size=16
        )

        ws["A1"].alignment = Alignment(
            horizontal="center"
        )

        # =========================
        # GROUP HEADERS
        # =========================

        ws.merge_cells("F3:H3")
        ws["F3"] = "Opening Balance"

        ws.merge_cells("I3:K3")
        ws["I3"] = "Monthly Credit"

        ws.merge_cells("L3:N3")
        ws["L3"] = "Leaves Deducted"

        ws.merge_cells("P3:R3")
        ws["P3"] = "Closing Balance"

        for cell in [
            "F3",
            "I3",
            "L3",
            "P3"
        ]:

            ws[cell].fill = black_fill
            ws[cell].font = white_font
            ws[cell].alignment = Alignment(
                horizontal="center"
            )

        # =========================
        # COLUMN HEADERS
        # =========================

        headers = [

            "Employee ID",
            "Employee Name",
            "Department",
            "Designation",
            "DOJ",

            "Opening CL",
            "Opening SL",
            "Opening EL",

            "CL Credit",
            "SL Credit",
            "EL Credit",

            "CL Taken",
            "SL Taken",
            "EL Taken",

            "Total Deducted",

            "Closing CL",
            "Closing SL",
            "Closing EL",

            "Total Balance",

            "Remarks"
        ]

        for col_num, header in enumerate(
            headers,
            start=1
        ):

            cell = ws.cell(
                row=4,
                column=col_num
            )

            cell.value = header
            cell.font = bold_font
            cell.border = thin_border
            cell.alignment = Alignment(
                horizontal="center"
            )

            if col_num <= 5:
                cell.fill = blue_fill

            elif 6 <= col_num <= 8:
                cell.fill = yellow_fill

            elif 9 <= col_num <= 11:
                cell.fill = green_fill

            elif 12 <= col_num <= 15:
                cell.fill = orange_fill

            elif 16 <= col_num <= 19:
                cell.fill = yellow_fill

        # =========================
        # EMPLOYEE DATA
        # =========================

        employees = Employee.query.order_by(
            Employee.first_name
        ).all()

        row = 5

        for employee in employees:

            cl_taken = 0
            sl_taken = 0
            el_taken = 0

            approved_leaves = LeaveRequest.query.filter(
                LeaveRequest.employee_id == employee.id,
                LeaveRequest.status == "Approved",
                LeaveRequest.request_type == "Leave"
).all()

            for leave in approved_leaves:

                leave_type = (
                    leave.leave_type or ""
                ).strip().lower()

                leave_days = (
                    leave.total_days or 0
                )

                if leave_type == "casual leave":
                    cl_taken += leave_days

                elif leave_type == "sick leave":
                    sl_taken += leave_days

                elif leave_type == "earned leave":
                    el_taken += leave_days

            current_cl = employee.casual_leave or 0
            current_sl = employee.sick_leave or 0
            current_el = employee.earned_leave or 0

            credit_cl = 1.5
            credit_sl = 1.5
            credit_el = 2

            opening_cl = current_cl + credit_cl
            opening_sl = current_sl + credit_sl
            opening_el = current_el + credit_el

            closing_cl = opening_cl - cl_taken
            closing_sl = opening_sl - sl_taken
            closing_el = opening_el - el_taken

            total_deducted = (
                cl_taken +
                sl_taken +
                el_taken
            )

            total_balance = (
                closing_cl +
                closing_sl +
                closing_el
            )

            ws.cell(row=row, column=1, value=employee.employee_id)
            ws.cell(row=row, column=2, value=f"{employee.first_name} {employee.last_name}")
            ws.cell(row=row, column=3, value=employee.department)
            ws.cell(row=row, column=4, value=employee.designation)
            ws.cell(row=row, column=5, value=str(employee.joining_date))

            ws.cell(row=row, column=6, value=opening_cl)
            ws.cell(row=row, column=7, value=opening_sl)
            ws.cell(row=row, column=8, value=opening_el)

            ws.cell(row=row, column=9, value=credit_cl)
            ws.cell(row=row, column=10, value=credit_sl)
            ws.cell(row=row, column=11, value=credit_el)

            ws.cell(row=row, column=12, value=cl_taken)
            ws.cell(row=row, column=13, value=sl_taken)
            ws.cell(row=row, column=14, value=el_taken)

            ws.cell(row=row, column=15, value=total_deducted)

            ws.cell(row=row, column=16, value=closing_cl)
            ws.cell(row=row, column=17, value=closing_sl)
            ws.cell(row=row, column=18, value=closing_el)

            ws.cell(row=row, column=19, value=total_balance)

            ws.cell(row=row, column=20, value="")

            for col in range(1, 21):

                ws.cell(
                    row=row,
                    column=col
                ).border = thin_border

            row += 1

        # =========================
        # AUTO WIDTH
        # =========================

        for column_cells in ws.columns:

            length = max(
                len(str(cell.value))
                if cell.value
                else 0
                for cell in column_cells
            )

            ws.column_dimensions[
                get_column_letter(
                    column_cells[0].column
                )
            ].width = length + 5

        # =========================
        # FILTER
        # =========================

        ws.auto_filter.ref = f"A4:T{row}"

        # =========================
        # DOWNLOAD
        # =========================

        excel_file = BytesIO()

        wb.save(excel_file)

        excel_file.seek(0)

        return send_file(
            excel_file,
            as_attachment=True,
            download_name="Leave_Working_Update.xlsx",
            mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )

    except Exception as e:

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@leave_bp.route(
    "/credit-monthly-leaves",
    methods=["POST"]
)
def credit_monthly_leaves():

    try:

        result = (
            update_all_employee_leave_balances()
        )

        return jsonify(result)

    except Exception as e:

        db.session.rollback()

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500