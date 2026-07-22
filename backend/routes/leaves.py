from utils.compat import Blueprint, request, jsonify
from models.database import db
from models.leave import LeaveRequest
from datetime import datetime
from models.employee import Employee
from openpyxl import Workbook
from utils.compat import send_file
from io import BytesIO
from utils.jwt_helper import jwt_required, get_jwt_identity
from models.user import User

from services.leave_balance_service import (
    update_all_employee_leave_balances
)

leave_bp = Blueprint(
    "leave",
    __name__
)

def serialize_leave(leave):
    return {
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
        "cancelled_at": leave.cancelled_at.isoformat() if hasattr(leave, "cancelled_at") and leave.cancelled_at else None,
        "cancelled_by": leave.cancelled_by if hasattr(leave, "cancelled_by") else None,
        "cancellation_reason": leave.cancellation_reason if hasattr(leave, "cancellation_reason") else None,
    }

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

        # Send manager notification email
        try:
            from services.request_email_service import send_manager_request_email
            send_manager_request_email(leave, request_type)
        except Exception as email_err:
            print("Failed to send manager request email:", str(email_err))

        # Emit leave_update socket event for real-time dashboard updates
        try:
            from extensions import socketio
            socketio.emit("leave_update", serialize_leave(leave))
        except Exception as socket_err:
            print("Failed to emit leave socket:", str(socket_err))

        return jsonify({
            "success": True,
            "message": f"{request_type} Applied Successfully"
        }), 200

    except Exception as e:

        import traceback
        traceback.print_exc()
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
@jwt_required()
def approve_leave(leave_id):

    try:

        leave = LeaveRequest.query.get(leave_id)

        if not leave:
            return jsonify({
                "success": False,
                "error": "Leave not found"
            }), 404

        # Prevent double approval/rejection
        if leave.status != "Pending":
            return jsonify({
                "success": False,
                "error": f"Leave already {leave.status.lower()}"
            }), 400

        print("Leave Employee ID:", leave.employee_id)

        employee = Employee.query.filter(
            (Employee.id == int(leave.employee_id)) | (Employee.employee_id == str(leave.employee_id))
        ).first()

        print("Employee Found:", employee)

        if not employee:
            return jsonify({
                "success": False,
                "error": "Employee not found"
            }), 404

        # ===========================
        # PERMISSION REQUEST
        # ===========================
        
        user_id = get_jwt_identity()
        approver = User.query.get(int(user_id)) if user_id else None
        approver_name = approver.full_name if approver else "Manager"
        
        if leave.request_type == "Permission":
            leave.status = "Approved"
            leave.approved_by = approver_name
            leave.approved_at = datetime.utcnow()

            db.session.commit()

            # Emit leave_update socket event for real-time dashboard updates
            try:
                from extensions import socketio
                socketio.emit("leave_update", serialize_leave(leave))
            except Exception as socket_err:
                print("Failed to emit leave socket:", str(socket_err))

            # Send employee status email
            try:
                from services.request_email_service import send_employee_status_email
                send_employee_status_email(leave, employee, "Approved", leave.request_type)
            except Exception as email_err:
                print("Failed to send employee status email:", str(email_err))

            return jsonify({
                "success": True,
                "message": "Permission Approved Successfully"
            }), 200

        # ===========================
        # LEAVE REQUEST
        # ===========================

        leave.status = "Approved"
        leave.approved_by = approver_name
        leave.approved_at = datetime.utcnow()

        leave_type = (leave.leave_type or "").strip().lower()
        leave_days = leave.total_days or 0

        # Try to find corresponding EmployeeLeaveBalance
        from models.leave import EmployeeLeaveBalance
        from sqlalchemy import func
        balance = EmployeeLeaveBalance.query.filter(
            EmployeeLeaveBalance.employee_id == employee.id,
            func.lower(EmployeeLeaveBalance.leave_type) == leave_type
        ).first()

        if balance:
            balance.available = max(0.0, (balance.available or 0) - leave_days)

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
        elif leave_type in ["earned leave", "privilege leave"]:
            employee.privilege_leave = max(
                0,
                (employee.privilege_leave or 0) - leave_days
            )
        else:
            # For dynamic custom leave categories, check if we found a balance record
            if not balance:
                return jsonify({
                    "success": False,
                    "error": f"Invalid leave type or no balance record found: {leave.leave_type}"
                }), 400

        db.session.commit()

        # Emit leave_update socket event for real-time dashboard updates
        try:
            from extensions import socketio
            socketio.emit("leave_update", serialize_leave(leave))
        except Exception as socket_err:
            print("Failed to emit leave socket:", str(socket_err))

        return jsonify({
            "success": True,
            "message": "Leave Approved Successfully",
            "leave_balance": {
                "sick_leave": employee.sick_leave,
                "casual_leave": employee.casual_leave,
                "privilege_leave": employee.privilege_leave,
                "total_balance":
                    (employee.sick_leave or 0) +
                    (employee.casual_leave or 0) +
                    (employee.privilege_leave or 0)
            }
        }), 200

    except Exception as e:

        import traceback
        traceback.print_exc()
        db.session.rollback()

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@leave_bp.route(
    "/reject/<int:leave_id>",
    methods=["PUT"]
)
@jwt_required()
def reject_leave(leave_id):

    leave = LeaveRequest.query.get(leave_id)

    if not leave:
        return jsonify({
            "error": "Leave not found"
        }), 404

    # Prevent double approval/rejection
    if leave.status != "Pending":
        return jsonify({
            "success": False,
            "error": f"Leave already {leave.status.lower()}"
        }), 400

    employee = Employee.query.filter(
        (Employee.id == int(leave.employee_id)) | (Employee.employee_id == str(leave.employee_id))
    ).first()

    leave.status = "Rejected"
    
    user_id = get_jwt_identity()
    rejecter = User.query.get(int(user_id)) if user_id else None
    
    leave.rejected_by = rejecter.full_name if rejecter else "Manager"
    leave.rejected_at = datetime.utcnow()

    db.session.commit()

    # Send employee status email
    if employee:
        try:
            from services.request_email_service import send_employee_status_email
            send_employee_status_email(leave, employee, "Rejected", leave.request_type)
        except Exception as email_err:
            print("Failed to send employee status email:", str(email_err))

    # Emit leave_update socket event for real-time dashboard updates
    try:
        from extensions import socketio
        socketio.emit("leave_update", serialize_leave(leave))
    except Exception as socket_err:
        print("Failed to emit leave socket:", str(socket_err))

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

        # Emit leave_update socket event for real-time dashboard updates
        try:
            from extensions import socketio
            socketio.emit("leave_update", serialize_leave(leave))
        except Exception as socket_err:
            print("Failed to emit leave socket:", str(socket_err))

        return jsonify({
            "success": True,
            "message": "Leave Cancelled Successfully"
        })

    except Exception as e:

        import traceback
        traceback.print_exc()
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
        import traceback
        traceback.print_exc()
        db.session.rollback()
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500
@leave_bp.route(
    "/<int:leave_id>/cancel",
    methods=["POST"]
)
def cancel_approved_leave(leave_id):
    try:
        from zoneinfo import ZoneInfo
        from models.notification import Notification
        from models.leave import LeaveAuditLog

        leave = LeaveRequest.query.get(leave_id)
        if not leave:
            return jsonify({
                "success": False,
                "message": "Leave request not found"
            }), 404

        data = request.get_json() or {}
        employee_id = data.get("employee_id")

        # 1. Validate employee ownership
        if not employee_id:
            return jsonify({
                "success": False,
                "message": "employee_id is required to validate ownership"
            }), 400

        if str(leave.employee_id) != str(employee_id):
            return jsonify({
                "success": False,
                "message": "You do not own this leave request."
            }), 403

        # 2. Validate leave status is Approved
        if leave.status != "Approved":
            return jsonify({
                "success": False,
                "message": "Only approved leave requests can be cancelled."
            }), 400

        # 3. Validate current date is before leave start date
        today = datetime.now(ZoneInfo("Asia/Kolkata")).date()
        start_date = leave.permission_date if leave.request_type == "Permission" else leave.from_date

        if not start_date:
            return jsonify({
                "success": False,
                "message": "Leave start date is missing."
            }), 400

        if today >= start_date:
            return jsonify({
                "success": False,
                "message": "Leave cannot be cancelled once the leave start date has begun."
            }), 400

        # 4. Start database transaction (SQLAlchemy transaction auto-managed, committed below)
        previous_status = leave.status
        leave.status = "Cancelled"
        leave.cancelled_by = "Employee"
        leave.cancelled_at = datetime.now(ZoneInfo("Asia/Kolkata"))
        leave.cancellation_reason = data.get("cancellation_reason", "")

        # 5. Restore leave balance
        if leave.request_type == "Leave":
            if leave.employee_id and str(leave.employee_id).isdigit():
                employee = Employee.query.filter(
                    (Employee.id == int(leave.employee_id)) | (Employee.employee_id == str(leave.employee_id))
                ).first()
            else:
                employee = Employee.query.filter(
                    Employee.employee_id == str(leave.employee_id)
                ).first()

            if not employee:
                return jsonify({
                    "success": False,
                    "message": "Employee record not found to restore leave balance."
                }), 404

            leave_type = (leave.leave_type or "").strip().lower()
            leave_days = leave.total_days or 0

            if leave_type == "sick leave":
                employee.sick_leave = (employee.sick_leave or 0) + leave_days
            elif leave_type == "casual leave":
                employee.casual_leave = (employee.casual_leave or 0) + leave_days
            elif leave_type in ["earned leave", "privilege leave"]:
                employee.privilege_leave = (employee.privilege_leave or 0) + leave_days
            else:
                return jsonify({
                    "success": False,
                    "message": f"Invalid leave type for balance restoration: {leave.leave_type}"
                }), 400

        # 6. Create manager notification
        if leave.request_type == "Permission":
            date_str = str(leave.permission_date)
            msg = f"{leave.employee_name} has cancelled the approved permission scheduled for {date_str}."
        else:
            from_date_str = str(leave.from_date)
            to_date_str = str(leave.to_date)
            msg = f"{leave.employee_name} has cancelled the approved leave scheduled from {from_date_str} to {to_date_str}."

        notification = Notification(
            receiver_name=leave.reporting_manager,
            title="Leave Cancelled",
            message=msg,
            related_id=leave.id,
            related_type="Leave",
            notification_type="Leave Cancellation",
            status="Pending",
            action_required=False
        )
        db.session.add(notification)

        # 7. Create audit log
        audit_msg = f"Employee {leave.employee_name} cancelled Leave Request #{leave.id}."
        audit_log = LeaveAuditLog(
            leave_id=leave.id,
            employee_name=leave.employee_name,
            action=audit_msg,
            previous_status=previous_status,
            new_status="Cancelled",
            cancelled_at=datetime.now(ZoneInfo("Asia/Kolkata")),
            cancelled_by="Employee"
        )
        db.session.add(audit_log)

        db.session.commit()

        # Emit leave_update socket event for real-time dashboard updates
        try:
            from extensions import socketio
            socketio.emit("leave_update", serialize_leave(leave))
        except Exception as socket_err:
            print("Failed to emit leave socket:", str(socket_err))

        return jsonify({
            "success": True,
            "message": "Your leave has been cancelled successfully."
        }), 200

    except Exception as e:
        import traceback
        traceback.print_exc()
        db.session.rollback()
        import traceback
        traceback.print_exc()
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500


@leave_bp.route(
    "/export-leave-report",
    methods=["GET"]
)
def export_leave_report():

    try:

        from io import BytesIO

        from openpyxl import Workbook
        from datetime import date

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
            "Opening PL",

            "CL Credit",
            "SL Credit",
            "PL Credit",

            "CL Taken",
            "SL Taken",
            "PL Taken",

            "Total Deducted",

            "Closing CL",
            "Closing SL",
            "Closing PL",

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
            pl_taken = 0

            approved_leaves = LeaveRequest.query.filter(
                LeaveRequest.employee_id == employee.employee_id,
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

                elif leave_type in ["earned leave", "privilege leave"]:
                    pl_taken += leave_days

            current_cl = employee.casual_leave or 0
            current_sl = employee.sick_leave or 0
            current_pl = employee.privilege_leave or 0

            credit_cl = 6.0
            credit_sl = 6.0
            credit_pl = 15.0

            opening_cl = current_cl + cl_taken
            opening_sl = current_sl + sl_taken
            opening_pl = current_pl + pl_taken

            closing_cl = current_cl
            closing_sl = current_sl
            closing_pl = current_pl

            total_deducted = (
                cl_taken +
                sl_taken +
                pl_taken
            )

            total_balance = (
                closing_cl +
                closing_sl +
                closing_pl
            )

            ws.cell(row=row, column=1, value=employee.employee_id)
            ws.cell(row=row, column=2, value=f"{employee.first_name} {employee.last_name}")
            ws.cell(row=row, column=3, value=employee.department)
            ws.cell(row=row, column=4, value=employee.designation)
            ws.cell(row=row, column=5, value=str(employee.joining_date))

            ws.cell(row=row, column=6, value=opening_cl)
            ws.cell(row=row, column=7, value=opening_sl)
            ws.cell(row=row, column=8, value=opening_pl)

            ws.cell(row=row, column=9, value=credit_cl)
            ws.cell(row=row, column=10, value=credit_sl)
            ws.cell(row=row, column=11, value=credit_pl)

            ws.cell(row=row, column=12, value=cl_taken)
            ws.cell(row=row, column=13, value=sl_taken)
            ws.cell(row=row, column=14, value=pl_taken)

            ws.cell(row=row, column=15, value=total_deducted)

            ws.cell(row=row, column=16, value=closing_cl)
            ws.cell(row=row, column=17, value=closing_sl)
            ws.cell(row=row, column=18, value=closing_pl)

            ws.cell(row=row, column=19, value=total_balance)

            ws.cell(row=row, column=20, value="")

            for col in range(1, 21):

                c = ws.cell(
                    row=row,
                    column=col
                )
                c.border = thin_border
                val = c.value
                if val is not None and val != "":
                    if isinstance(val, (int, float, date, datetime)) or (isinstance(val, str) and (val.isdigit() or val.startswith("EMP"))):
                        c.alignment = Alignment(horizontal="center")

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

        import traceback
        traceback.print_exc()
        db.session.rollback()

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@leave_bp.route("/policies", methods=["GET"])
def get_leave_policies():
    try:
        from models.leave import LeavePolicy
        policies = LeavePolicy.query.all()
        return jsonify([
            {
                "id": p.id,
                "leave_type": p.leave_type,
                "yearly_limit": p.yearly_limit,
                "applicable_gender": p.applicable_gender
            }
            for p in policies
        ]), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@leave_bp.route("/policies", methods=["POST"])
def create_leave_policy():
    try:
        data = request.get_json() or {}
        leave_type = data.get("leave_type")
        yearly_limit = float(data.get("yearly_limit", 0.0))
        applicable_gender = data.get("applicable_gender", "All")

        if not leave_type:
            return jsonify({"success": False, "error": "Leave type is required"}), 400

        from models.leave import LeavePolicy, EmployeeLeaveBalance
        from models.employee import Employee

        exists = LeavePolicy.query.filter_by(leave_type=leave_type).first()
        if exists:
            return jsonify({"success": False, "error": "Leave policy already exists"}), 400

        policy = LeavePolicy(leave_type=leave_type, yearly_limit=yearly_limit, applicable_gender=applicable_gender)
        db.session.add(policy)
        db.session.commit()

        employees = Employee.query.all()
        for emp in employees:
            emp_gender = (emp.gender or "").strip().lower()
            pol_gender = applicable_gender.strip().lower()
            is_applicable = (pol_gender == "all") or (emp_gender == pol_gender)

            if is_applicable:
                balance = EmployeeLeaveBalance(
                    employee_id=emp.id,
                    leave_type=leave_type,
                    available=yearly_limit
                )
                db.session.add(balance)
        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Leave category created successfully",
            "policy": {
                "id": policy.id,
                "leave_type": policy.leave_type,
                "yearly_limit": policy.yearly_limit,
                "applicable_gender": policy.applicable_gender
            }
        }), 201
    except Exception as e:
        import traceback
        traceback.print_exc()
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 500

@leave_bp.route("/policies", methods=["PUT"])
def update_leave_policies():
    try:
        data = request.get_json() or {}
        if not isinstance(data, list):
            return jsonify({"success": False, "error": "Invalid format, list of policies expected"}), 400

        from models.leave import LeavePolicy, EmployeeLeaveBalance
        for item in data:
            policy_id = item.get("id")
            new_limit = float(item.get("yearly_limit", 0.0))
            policy = LeavePolicy.query.get(policy_id)
            if policy:
                old_limit = policy.yearly_limit
                diff = new_limit - old_limit
                policy.yearly_limit = new_limit

                # Adjust each employee's available balance by the difference
                if diff != 0:
                    balances = EmployeeLeaveBalance.query.filter_by(leave_type=policy.leave_type).all()
                    for bal in balances:
                        bal.available = max(0.0, (bal.available or 0.0) + diff)

        db.session.commit()
        return jsonify({"success": True, "message": "Leave policies updated successfully"}), 200
    except Exception as e:
        import traceback
        traceback.print_exc()
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 500

@leave_bp.route("/policies/<int:policy_id>", methods=["DELETE"])
def delete_leave_policy(policy_id):
    try:
        from models.leave import LeavePolicy, EmployeeLeaveBalance
        policy = LeavePolicy.query.get(policy_id)
        if not policy:
            return jsonify({"success": False, "error": "Policy not found"}), 404

        db.session.delete(policy)
        EmployeeLeaveBalance.query.filter_by(leave_type=policy.leave_type).delete()
        db.session.commit()

        return jsonify({"success": True, "message": "Leave category deleted successfully"}), 200
    except Exception as e:
        import traceback
        traceback.print_exc()
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 500

@leave_bp.route("/balances/<int:employee_id>", methods=["GET"])
def get_employee_balances(employee_id):
    try:
        from models.leave import EmployeeLeaveBalance
        balances = EmployeeLeaveBalance.query.filter_by(employee_id=employee_id).all()
        
        if not balances:
            from models.leave import LeavePolicy
            from models.employee import Employee
            emp = Employee.query.get(employee_id)
            if emp:
                policies = LeavePolicy.query.all()
                for pol in policies:
                    avail = pol.yearly_limit
                    if pol.leave_type == "Sick Leave" and emp.sick_leave is not None:
                        avail = emp.sick_leave
                    elif pol.leave_type == "Casual Leave" and emp.casual_leave is not None:
                        avail = emp.casual_leave
                    elif pol.leave_type == "Privilege Leave" and emp.privilege_leave is not None:
                        avail = emp.privilege_leave
                    
                    bal = EmployeeLeaveBalance(
                        employee_id=emp.id,
                        leave_type=pol.leave_type,
                        available=avail
                    )
                    db.session.add(bal)
                db.session.commit()
                balances = EmployeeLeaveBalance.query.filter_by(employee_id=employee_id).all()

        return jsonify([
            {
                "id": b.id,
                "leave_type": b.leave_type,
                "available": b.available
            }
            for b in balances
        ]), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500