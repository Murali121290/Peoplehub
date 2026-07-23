from utils.compat import Blueprint, request, jsonify
from models.database import db
from models.attendance import Attendance
from datetime import datetime
from models.employee import Employee
from models.user import User
from datetime import date
from sqlalchemy import extract
from datetime import timedelta
from openpyxl.styles import Font
from openpyxl.styles import PatternFill
from utils.compat import send_file
from zoneinfo import ZoneInfo
from models.leave import LeaveRequest, LeaveLedger
from io import BytesIO


from openpyxl import Workbook
from openpyxl.styles import (
    Font,
    PatternFill,
    Border,
    Side,
    Alignment
)
from openpyxl.utils import get_column_letter


attendance_bp = Blueprint(
    "attendance",
    __name__
)


def get_ist_now():
    return datetime.now(ZoneInfo("Asia/Kolkata")).replace(tzinfo=None)


def get_ist_today():
    return datetime.now(ZoneInfo("Asia/Kolkata")).date()


@attendance_bp.route("/checkin", methods=["POST"])
def check_in():

    try:

        data = request.json

        user_id = data.get("user_id")

        if not user_id:
            return jsonify({
                "success": False,
                "message": "User ID is required"
            }), 400

        employee = Employee.query.filter_by(
            user_id=user_id
        ).first()

        if not employee:
            return jsonify({
                "success": False,
                "message": "Employee not found"
            }), 404

        # =====================================
        # SHIFT VALIDATION
        # =====================================
        from models.shift_request import ShiftRequest
        from sqlalchemy import or_
        today_date = get_ist_today()

        # Check if there is an approved shift request for today
        approved_request = ShiftRequest.query.filter(
            or_(
                ShiftRequest.employee_id == employee.id,
                ShiftRequest.employee_id == employee.user_id
            ),
            ShiftRequest.status == "Approved",
            ShiftRequest.from_date <= today_date,
            ShiftRequest.to_date >= today_date
        ).first()

        if approved_request:
            shift_name = (approved_request.requested_shift or "").strip().lower()
            print("================================")
            print("Approved requested shift active today:", shift_name)
            print("================================")
        else:
            shift_name = (
                employee.shift_timing or ""
            ).strip().lower()

        # Use IST time for shift validation (not server UTC)
        current_time = datetime.now(ZoneInfo("Asia/Kolkata")).time()

        # First Shift (06:00 AM - 02:00 PM)
        if shift_name == "first shift":
            print("================================")
            print("USER ID:", user_id)
            print("EMPLOYEE:", employee.first_name)
            print("SHIFT LOWER:", shift_name)
            print("CURRENT TIME:", current_time)
            print("================================")

            allowed_time = datetime.strptime(
                "06:00",
                "%H:%M"
            ).time()

            if current_time < allowed_time:

                return jsonify({
                    "success": False,
                    "message":
                    "First Shift check-in allowed only after 06:00 AM"
                }), 400

        # General Shift (09:00 AM - 06:00 PM)
        elif shift_name == "general shift":

            allowed_time = datetime.strptime(
                "09:00",
                "%H:%M"
            ).time()

            # if current_time < allowed_time:

            #     return jsonify({
            #         "success": False,
            #         "message":
            #         "General Shift check-in allowed only after 09:00 AM"
            #     }), 400

        # Second Shift (02:00 PM - 10:00 PM)
        elif shift_name == "second shift":

            allowed_time = datetime.strptime(
                "14:00",
                "%H:%M"
            ).time()

            if current_time < allowed_time:

                return jsonify({
                    "success": False,
                    "message":
                    "Second Shift check-in allowed only after 02:00 PM"
                }), 400

        # Night Shift (10:00 PM - 06:00 AM)
        elif shift_name == "night shift":

            allowed_time = datetime.strptime(
                "22:00",
                "%H:%M"
            ).time()

            if current_time < allowed_time:

                return jsonify({
                    "success": False,
                    "message":
                    "You have a night shift"
                }), 400

        # =====================================
        # APPROVED LEAVE CHECK — block check-in on approved leave days
        # =====================================
        from models.leave import LeaveRequest
        from sqlalchemy import or_ as sql_or

        approved_leave_today = LeaveRequest.query.filter(
            sql_or(
                LeaveRequest.employee_id == str(employee.id),
                LeaveRequest.employee_id == str(user_id)
            ),
            LeaveRequest.status == "Approved",
            LeaveRequest.request_type == "Leave",
            LeaveRequest.from_date <= today_date,
            LeaveRequest.to_date >= today_date
        ).first()

        if approved_leave_today:
            leave_type = approved_leave_today.leave_type or "Leave"
            return jsonify({
                "success": False,
                "message": f"You are on approved {leave_type} today. Check-in is not allowed on leave days.",
                "on_leave": True
            }), 403

        # =====================================
        # CHECK ALREADY CHECKED IN
        # =====================================

        today = get_ist_today()

        attendance = Attendance.query.filter_by(
            user_id=user_id,
            attendance_date=today
        ).first()

        if attendance:
            if not attendance.check_out:
                return jsonify({
                    "success": False,
                    "message": "You are already checked in."
                }), 400

            return jsonify({
                "success": False,
                "message": "You have already checked out for today. You cannot check in again."
            }), 400
        else:
            # =====================================
            # CREATE ATTENDANCE
            # =====================================
            attendance = Attendance(
                user_id=user_id,
                attendance_date=today,
                check_in=get_ist_now(),
                status="Present"
            )
            db.session.add(attendance)

        db.session.add(attendance)

        # Update and resolve related notifications
        try:
            from models.notification import Notification
            from extensions import socketio

            # 1. Look up manager's employee details to locate their socket room
            manager_name = employee.reporting_manager.strip().lower() if employee.reporting_manager else ""
            manager_emp = None
            for e in Employee.query.all():
                full_name = f"{e.first_name} {e.last_name}".strip().lower()
                is_match = (full_name == manager_name) or (len(manager_name.split()) == 1 and full_name.split()[0] == manager_name) or (len(full_name.split()) == 1 and manager_name.split()[0] == full_name)
                if is_match:
                    manager_emp = e
                    break

            # 3. Mark the reminder notification for employee as completed/resolved
            reminder_notifs = Notification.query.filter(
                Notification.title == "🔔 Check-In Reminder",
                Notification.related_id == employee.id,
                Notification.resolved == False
            ).all()

            for r in reminder_notifs:
                r.resolved = True
                r.status = "Completed"
                r.resolved_at = datetime.utcnow()
                socketio.emit(
                    "manager_notification_resolved",
                    {"notification_id": r.id, "status": "Completed"},
                    to=str(employee.id)
                )


        except Exception as delete_err:
            print("Failed to process check-in notifications update:", str(delete_err))

        db.session.commit()

        # Emit attendance_update socket event for real-time dashboard updates
        try:
            from extensions import socketio
            from datetime import timedelta
            
            # Calculate virtual check_in time for frontend timer to ignore gaps
            if attendance.check_in:
                virtual_check_in = attendance.check_in + timedelta(minutes=(attendance.total_gap_minutes or 0))
                check_in_str = virtual_check_in.strftime("%I:%M %p")
            else:
                check_in_str = None
                
            payload = {
                "id": employee.id,
                "user_id": employee.user_id,
                "attendance_status": "Present",
                "check_in": check_in_str,
                "check_out": None,
                "working_hours": 0.0,
                "lunch_minutes": attendance.lunch_minutes or 0,
                "tea_minutes": attendance.tea_minutes or 0,
                "shift": employee.shift_timing or "General Shift",
                "manager_status": attendance.manager_status or "Pending",
                "checked_in": True,
                "lunch_break": False,
                "tea_break": False
            }
            socketio.emit("attendance_update", payload)
        except Exception as socket_err:
            print("Failed to emit check-in socket:", str(socket_err))

        return jsonify({
            "success": True,
            "message":
            "Checked In Successfully"
        })

    except Exception as e:

        db.session.rollback()

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@attendance_bp.route("/checkout", methods=["POST"])
def check_out():

    try:

        data = request.json

        user_id = data.get("user_id")

        if not user_id:
            return jsonify({
                "success": False,
                "error": "User ID is required"
            }), 400

        print("CHECKOUT USER ID:", user_id)

        attendance = Attendance.query.filter(
            Attendance.user_id == user_id,
            Attendance.check_in.isnot(None),
            Attendance.check_out.is_(None)
        ).order_by(
            Attendance.id.desc()
        ).first()

        print("ATTENDANCE FOUND:", attendance)

        if not attendance:
            return jsonify({
                "success": False,
                "error": "No active check-in found"
            }), 404

        if not attendance.check_in:
            return jsonify({
                "success": False,
                "error": "Check-in time missing"
            }), 400

        attendance.check_out = get_ist_now()

        total_seconds = (
            attendance.check_out -
            attendance.check_in
        ).total_seconds()

        break_minutes = (
            attendance.total_break_minutes or 0
        )
        
        gap_minutes = (
            attendance.total_gap_minutes or 0
        )

        total_seconds -= break_minutes * 60
        total_seconds -= gap_minutes * 60

        attendance.total_hours = round(
            total_seconds / 3600,
            2
        )

        if attendance.total_hours >= 8.0:
            attendance.status = "Present"
        elif attendance.total_hours >= 4.0:
            attendance.status = "Half Day"
        else:
            attendance.status = "Absent"

        db.session.commit()

        # Emit attendance_update socket event for real-time dashboard updates
        try:
            from models.employee import Employee
            from extensions import socketio
            employee = Employee.query.filter_by(user_id=user_id).first()
            if employee:
                payload = {
                    "id": employee.id,
                    "user_id": employee.user_id,
                    "attendance_status": "Checked Out",
                    "check_in": attendance.check_in.strftime("%I:%M %p") if attendance.check_in else None,
                    "check_out": attendance.check_out.strftime("%I:%M %p") if attendance.check_out else None,
                    "working_hours": attendance.total_hours or 0.0,
                    "lunch_minutes": attendance.lunch_minutes or 0,
                    "tea_minutes": attendance.tea_minutes or 0,
                    "shift": employee.shift_timing or "General Shift",
                    "manager_status": attendance.manager_status or "Pending",
                    "checked_in": False,
                    "lunch_break": False,
                    "tea_break": False
                }
                socketio.emit("attendance_update", payload)
        except Exception as socket_err:
            print("Failed to emit checkout socket:", str(socket_err))

        return jsonify({
            "success": True,
            "message": "Checked Out Successfully",
            "check_in": attendance.check_in.strftime("%Y-%m-%d %H:%M:%S"),
            "check_out": attendance.check_out.strftime("%Y-%m-%d %H:%M:%S"),
            "total_hours": attendance.total_hours
        }), 200

    except Exception as e:

        db.session.rollback()

        print("CHECKOUT ERROR:", str(e))

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@attendance_bp.route("/sync-logs", methods=["POST"])
def sync_card_logs():
    try:
        data = request.json
        logs = data.get("logs", [])
        
        if not logs:
            return jsonify({
                "success": True,
                "message": "No logs provided"
            }), 200

        print(f"Syncing {len(logs)} card logs...")
        processed_count = 0
        batch_attendance = {}

        for log in logs:
            emp_code = str(log.get("employee_code", "")).strip()
            log_time_str = log.get("log_time")
            direction = str(log.get("direction", "")).strip().lower()

            if not emp_code or not log_time_str:
                continue

            # Parse log time
            try:
                # Support various formats, standard is %Y-%m-%d %H:%M:%S
                if "T" in log_time_str:
                    log_dt = datetime.fromisoformat(log_time_str.replace("Z", ""))
                else:
                    log_dt = datetime.strptime(log_time_str, "%Y-%m-%d %H:%M:%S")
            except Exception as pe:
                print(f"Failed to parse log time '{log_time_str}': {pe}")
                continue

            # Find employee by employee_id (Postgres)
            employee = Employee.query.filter_by(employee_id=emp_code).first()
            if not employee:
                print(f"Sync skip: Employee code '{emp_code}' not found in Peoplehub database")
                continue

            att_date = log_dt.date()
            cache_key = (employee.user_id, att_date)

            # Find or create Attendance for that employee and date
            if cache_key in batch_attendance:
                attendance = batch_attendance[cache_key]
            else:
                attendance = Attendance.query.filter_by(
                    user_id=employee.user_id,
                    attendance_date=att_date
                ).first()

                if not attendance:
                    attendance = Attendance(
                        user_id=employee.user_id,
                        attendance_date=att_date,
                        status="Present",
                        shift_timing=employee.shift_timing or "General Shift"
                    )
                    db.session.add(attendance)
                batch_attendance[cache_key] = attendance

            # Update Card Punch times
            if direction == "in":
                if not attendance.card_check_in:
                    attendance.card_check_in = log_dt
                else:
                    # Keep earliest punch for check-in
                    attendance.card_check_in = min(attendance.card_check_in, log_dt)
            elif direction == "out":
                if not attendance.card_check_out:
                    attendance.card_check_out = log_dt
                else:
                    # Keep latest punch for check-out
                    attendance.card_check_out = max(attendance.card_check_out, log_dt)
            else:
                # If direction is not specified, auto-determine based on order of punches
                if not attendance.card_check_in:
                    attendance.card_check_in = log_dt
                else:
                    # Compare and set as check-in or check-out
                    if log_dt < attendance.card_check_in:
                        attendance.card_check_out = attendance.card_check_in
                        attendance.card_check_in = log_dt
                    else:
                        if not attendance.card_check_out:
                            attendance.card_check_out = log_dt
                        else:
                            attendance.card_check_out = max(attendance.card_check_out, log_dt)

            # Calculate card working hours
            if attendance.card_check_in and attendance.card_check_out:
                total_seconds = (attendance.card_check_out - attendance.card_check_in).total_seconds()
                attendance.card_working_hours = round(max(total_seconds, 0) / 3600, 2)
            else:
                attendance.card_working_hours = 0.0

            # Recalculate status
            web_hrs = attendance.total_hours or 0.0
            card_hrs = attendance.card_working_hours or 0.0
            max_hrs = max(web_hrs, card_hrs)

            if max_hrs >= 8.0:
                attendance.status = "Present"
            elif max_hrs >= 4.0:
                attendance.status = "Half Day"
            elif attendance.check_in or attendance.card_check_in:
                attendance.status = "Present"
            else:
                attendance.status = "Absent"

            processed_count += 1

            # Emit dashboard update
            try:
                from extensions import socketio
                
                web_in_str = attendance.check_in.strftime("%I:%M %p") if attendance.check_in else None
                web_out_str = attendance.check_out.strftime("%I:%M %p") if attendance.check_out else None
                card_in_str = attendance.card_check_in.strftime("%I:%M %p") if attendance.card_check_in else None
                card_out_str = attendance.card_check_out.strftime("%I:%M %p") if attendance.card_check_out else None

                payload = {
                    "id": employee.id,
                    "user_id": employee.user_id,
                    "attendance_status": attendance.status,
                    "check_in": web_in_str,
                    "check_out": web_out_str,
                    "working_hours": attendance.total_hours or 0.0,
                    "card_check_in": card_in_str,
                    "card_check_out": card_out_str,
                    "card_working_hours": attendance.card_working_hours or 0.0,
                    "shift": employee.shift_timing or "General Shift",
                    "manager_status": attendance.manager_status or "Pending",
                    "checked_in": (attendance.check_in is not None and attendance.check_out is None),
                    "card_checked_in": (attendance.card_check_in is not None and attendance.card_check_out is None),
                }
                socketio.emit("attendance_update", payload)
            except Exception as se:
                print("Socket emit error during card sync:", se)

        db.session.commit()
        return jsonify({
            "success": True,
            "message": f"Successfully processed {processed_count} logs"
        }), 200

    except Exception as e:
        db.session.rollback()
        print("SYNC ERROR:", str(e))
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@attendance_bp.route("/status/<int:user_id>")
def attendance_status(user_id):

    attendance = Attendance.query.filter_by(
        user_id=user_id,
        check_out=None
    ).order_by(
        Attendance.id.desc()
    ).first()

    if not attendance:
        return jsonify({
            "checked_in": False
        })

    return jsonify({
    "checked_in": True,

    "check_in":
        attendance.check_in.isoformat(),

    "lunch_break":
        attendance.lunch_break,

    "tea_break":
        attendance.tea_break,

    "lunch_start":
        attendance.lunch_start.isoformat()
        if attendance.lunch_start
        else None,

    "tea_start":
        attendance.tea_start.isoformat()
        if attendance.tea_start
        else None,

    "lunch_minutes":
        attendance.lunch_minutes or 0,

    "tea_minutes":
        attendance.tea_minutes or 0,

    "total_break_minutes":
        attendance.total_break_minutes or 0
})




@attendance_bp.route(
    "/lunch-break",
    methods=["POST", "PUT"]
)
def lunch_break():

    try:

        data = request.json

        attendance = Attendance.query.filter_by(
            user_id=data["user_id"],
            check_out=None
        ).order_by(
            Attendance.id.desc()
        ).first()

        if not attendance:
            return jsonify({
                "success": False,
                "error": "Attendance not found"
            }), 404

        action = data.get("action")

        if action == "start":

            attendance.lunch_break = True

            attendance.lunch_start = get_ist_now()

        elif action == "stop":

            attendance.lunch_break = False

            attendance.lunch_end = get_ist_now()

        if (
             attendance.lunch_start and
             attendance.lunch_end
            ):
                attendance.lunch_minutes = int(
        (
            attendance.lunch_end -
            attendance.lunch_start
        ).total_seconds() / 60
    )

        attendance.total_break_minutes = (
            (attendance.lunch_minutes or 0) +
            (attendance.tea_minutes or 0)
        )

        db.session.commit()

        # Emit attendance_update socket event for real-time dashboard updates
        try:
            from models.employee import Employee
            from extensions import socketio
            employee = Employee.query.filter_by(user_id=data["user_id"]).first()
            if employee:
                payload = {
                    "id": employee.id,
                    "user_id": employee.user_id,
                    "attendance_status": "Present" if not attendance.check_out else "Checked Out",
                    "check_in": attendance.check_in.strftime("%I:%M %p") if attendance.check_in else None,
                    "check_out": attendance.check_out.strftime("%I:%M %p") if attendance.check_out else None,
                    "working_hours": attendance.total_hours or 0.0,
                    "lunch_minutes": attendance.lunch_minutes or 0,
                    "tea_minutes": attendance.tea_minutes or 0,
                    "shift": employee.shift_timing or "General Shift",
                    "manager_status": attendance.manager_status or "Pending",
                    "checked_in": True if not attendance.check_out else False,
                    "lunch_break": attendance.lunch_break or False,
                    "tea_break": attendance.tea_break or False,
                    "lunch_start": attendance.lunch_start.isoformat() if attendance.lunch_start else None,
                    "lunch_end": attendance.lunch_end.isoformat() if attendance.lunch_end else None
                }
                socketio.emit("attendance_update", payload)
        except Exception as socket_err:
            print("Failed to emit lunch socket:", str(socket_err))

        return jsonify({
            "success": True
        })

    except Exception as e:

        print("LUNCH BREAK ERROR:", str(e))

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@attendance_bp.route(
    "/tea-break",
    methods=["POST", "PUT"]
)
def tea_break():

    try:

        data = request.json

        attendance = Attendance.query.filter_by(
            user_id=data["user_id"],
            check_out=None
        ).order_by(
            Attendance.id.desc()
        ).first()

        if not attendance:
            return jsonify({
                "success": False,
                "error": "Attendance not found"
            }), 404

        action = data.get("action")

        if action == "start":

            attendance.tea_break = True

            attendance.tea_start = get_ist_now()

        elif action == "stop":
            attendance.tea_break = False

            attendance.tea_end = get_ist_now()
        if (
            attendance.tea_start and
            attendance.tea_end
            ):
              attendance.tea_minutes = int(
        (
            attendance.tea_end -
            attendance.tea_start
        ).total_seconds() / 60
    )

        attendance.total_break_minutes = (
            (attendance.lunch_minutes or 0) +
            (attendance.tea_minutes or 0)
        )

        db.session.commit()

        # Emit attendance_update socket event for real-time dashboard updates
        try:
            from models.employee import Employee
            from extensions import socketio
            employee = Employee.query.filter_by(user_id=data["user_id"]).first()
            if employee:
                payload = {
                    "id": employee.id,
                    "user_id": employee.user_id,
                    "attendance_status": "Present" if not attendance.check_out else "Checked Out",
                    "check_in": attendance.check_in.strftime("%I:%M %p") if attendance.check_in else None,
                    "check_out": attendance.check_out.strftime("%I:%M %p") if attendance.check_out else None,
                    "working_hours": attendance.total_hours or 0.0,
                    "lunch_minutes": attendance.lunch_minutes or 0,
                    "tea_minutes": attendance.tea_minutes or 0,
                    "shift": employee.shift_timing or "General Shift",
                    "manager_status": attendance.manager_status or "Pending",
                    "checked_in": True if not attendance.check_out else False,
                    "lunch_break": attendance.lunch_break or False,
                    "tea_break": attendance.tea_break or False,
                    "tea_start": attendance.tea_start.isoformat() if attendance.tea_start else None,
                    "tea_end": attendance.tea_end.isoformat() if attendance.tea_end else None
                }
                socketio.emit("attendance_update", payload)
        except Exception as socket_err:
            print("Failed to emit tea socket:", str(socket_err))

        return jsonify({
            "success": True
        })

    except Exception as e:

        print("TEA BREAK ERROR:", str(e))

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@attendance_bp.route("/history/<int:user_id>")
def attendance_history(user_id):

    employee = Employee.query.filter_by(user_id=user_id).first()
    if not employee:
        return jsonify([])

    today = get_ist_today()
    joining = employee.joining_date
    result = []

    for i in range(30):
        current_date = today - timedelta(days=i)
        
        # Do not go before joining date if set
        if joining and current_date < joining:
            break

        record = Attendance.query.filter_by(
            user_id=user_id,
            attendance_date=current_date
        ).first()

        if record:
            if record.check_out:
                working_hours = record.total_hours
                check_out_str = record.check_out.strftime("%I:%M %p")
            else:
                # Active check-in: compute live working hours
                now = get_ist_now()
                elapsed_seconds = (now - record.check_in).total_seconds()
                break_seconds = (record.total_break_minutes or 0) * 60
                working_hours = round(max(elapsed_seconds - break_seconds, 0) / 3600, 2)
                check_out_str = "-"

            result.append({
                "id": record.id,
                "date": record.attendance_date.strftime("%Y-%m-%d"),
                "checkIn": record.check_in.strftime("%I:%M %p") if record.check_in else "-",
                "checkOut": check_out_str,
                "workingHours": working_hours,
                "lunchMinutes": record.lunch_minutes,
                "teaMinutes": record.tea_minutes,
                "totalBreak": record.total_break_minutes,
                "status": record.status or "Present"
            })
        else:
            # Check for approved leaves on this day
            from models.leave import LeaveRequest
            leave = LeaveRequest.query.filter(
                LeaveRequest.employee_id == str(employee.id),
                LeaveRequest.status == "Approved",
                LeaveRequest.from_date <= current_date,
                LeaveRequest.to_date >= current_date
            ).first()

            status = "Leave" if leave else "Absent"

            result.append({
                "id": f"virtual-{current_date.strftime('%Y-%m-%d')}",
                "date": current_date.strftime("%Y-%m-%d"),
                "checkIn": "-",
                "checkOut": "-",
                "workingHours": 0.0,
                "lunchMinutes": 0,
                "teaMinutes": 0,
                "totalBreak": 0,
                "status": status
            })

    return jsonify(result)


@attendance_bp.route("/", methods=["GET"])
def get_attendance():

    today = get_ist_today()

    employees = Employee.query.all()

    attendance_list = []

    for employee in employees:

        attendance = Attendance.query.filter_by(
            user_id=employee.user_id,
            attendance_date=today
        ).first()

        if attendance:

            status = attendance.status or "Present"

            check_in = (
                attendance.check_in.strftime("%H:%M:%S")
                if attendance.check_in
                else "-"
            )

            check_out = (
                attendance.check_out.strftime("%H:%M:%S")
                if attendance.check_out
                else "-"
            )

            total_hours = attendance.total_hours

        else:
            status = "Absent"
            check_in = "-"
            check_out = "-"
            total_hours = 0

        if status == "Absent":
            from models.leave import LeaveRequest
            leave = LeaveRequest.query.filter(
                LeaveRequest.employee_id == str(employee.id),
                LeaveRequest.status == "Approved",
                LeaveRequest.from_date <= today,
                LeaveRequest.to_date >= today
            ).first()
            if leave:
                status = "Leave"

        attendance_list.append({
            "user_id": employee.user_id,
            "employee_name": f"{employee.first_name} {employee.last_name}",
            "department": employee.department,
            "designation": employee.designation,
            "check_in": check_in,
            "check_out": check_out,
            "total_hours": total_hours,
            "attendance_date": str(today),
            "status": status,

            "shift_timing": (
                attendance.shift_timing
                if attendance and attendance.shift_timing
                else employee.shift_timing or "General Shift"
            )
        })

    return jsonify(attendance_list)

@attendance_bp.route("/generate-daily-attendance")
def generate_daily_attendance():

    today = date.today()

    users = User.query.filter_by(
        is_active=True
    ).all()

    count = 0

    for user in users:

        existing = Attendance.query.filter_by(
            user_id=user.id,
            attendance_date=today
        ).first()

        if not existing:

            attendance = Attendance(
                user_id=user.id,
                attendance_date=today,
                status="Absent"
            )

            db.session.add(attendance)
            count += 1

    db.session.commit()

    return jsonify({
        "success": True,
        "records_created": count
    })



@attendance_bp.route(
    "/weekly",
    methods=["GET"]
)
def get_weekly_attendance():

    try:

        result = []

        employees = Employee.query.all()

        # Today first
        for i in range(7):

            current_date = (
                date.today() - timedelta(days=i)
            )

            for employee in employees:

                attendance = Attendance.query.filter_by(
                    user_id=employee.user_id,
                    attendance_date=current_date
                ).first()

                if attendance:
                    status = attendance.status or "Present"
                else:
                    status = "Absent"

                if status == "Absent":
                    from models.leave import LeaveRequest
                    leave = LeaveRequest.query.filter(
                        LeaveRequest.employee_id == str(employee.id),
                        LeaveRequest.status == "Approved",
                        LeaveRequest.from_date <= current_date,
                        LeaveRequest.to_date >= current_date
                    ).first()
                    if leave:
                        status = "Leave"

                result.append({

                    "employee_name":
                        f"{employee.first_name} {employee.last_name}",

                    "team":
                        employee.department
                        if employee.department
                        else "-",

                    "date":
                        current_date.strftime("%d-%m-%Y"),

                    "check_in":
                        attendance.check_in.strftime("%I:%M %p")
                        if attendance and attendance.check_in
                        else "-",

                    "check_out":
                        attendance.check_out.strftime("%I:%M %p")
                        if attendance and attendance.check_out
                        else "-",

                    "total_hours":
                        attendance.total_hours
                        if attendance
                        else "-",

                    "status": status,

                    "shift_timing":
                        attendance.shift_timing
                        if attendance and attendance.shift_timing
                        else (
                            employee.shift_timing
                            or "General Shift"
                        )
                })

        return jsonify(result)

    except Exception as e:

        return jsonify({
            "error": str(e)
        }), 500


@attendance_bp.route(
    "/monthly",
    methods=["GET"]
)
def get_monthly_attendance():

    try:

        result = []

        employees = Employee.query.all()

        # Last 30 days - newest first
        for i in range(30):

            current_date = (
                date.today() - timedelta(days=i)
            )

            for employee in employees:

                attendance = Attendance.query.filter_by(
                    user_id=employee.user_id,
                    attendance_date=current_date
                ).first()

                if attendance:
                    status = attendance.status or "Present"
                else:
                    status = "Absent"

                if status == "Absent":
                    from models.leave import LeaveRequest
                    leave = LeaveRequest.query.filter(
                        LeaveRequest.employee_id == str(employee.id),
                        LeaveRequest.status == "Approved",
                        LeaveRequest.from_date <= current_date,
                        LeaveRequest.to_date >= current_date
                    ).first()
                    if leave:
                        status = "Leave"

                result.append({

                    "employee_name":
                        f"{employee.first_name} {employee.last_name}",

                    "team":
                        employee.department
                        if employee.department
                        else "-",

                    "date":
                        current_date.strftime("%d-%m-%Y"),

                    "check_in":
                        attendance.check_in.strftime("%I:%M %p")
                        if attendance and attendance.check_in
                        else "-",

                    "check_out":
                        attendance.check_out.strftime("%I:%M %p")
                        if attendance and attendance.check_out
                        else "-",

                    "total_hours":
                        attendance.total_hours
                        if attendance
                        else "-",

                    "status": status,

                    "shift_timing":
                        attendance.shift_timing
                        if attendance and attendance.shift_timing
                        else (
                            employee.shift_timing
                            or "General Shift"
                        )
                })

        return jsonify(result)

    except Exception as e:

        return jsonify({
            "error": str(e)
        }), 500
    
@attendance_bp.route(
    "/export-monthly",
    methods=["GET"]
)
def export_monthly_attendance():

    try:

        wb = Workbook()

        ws = wb.active

        ws.title = "Attendance Report"

        today = date.today()

        if today.month == 1:

           start_date = date(
           today.year - 1,
           12,
           25
        )

        else:

           start_date = date(
           today.year,
           today.month - 1,
           25
        )

        end_date = date(
        today.year,
        today.month,
        24
        )

        # =====================================
        # STYLES
        # =====================================

        purple_fill = PatternFill(
            fill_type="solid",
            fgColor="B58CE5"
        )

        yellow_fill = PatternFill(
            fill_type="solid",
            fgColor="F7F1A0"
        )

        white_font = Font(
            bold=True,
            color="FFFFFF",
            size=12
        )

        bold_font = Font(
            bold=True,
            size=12
        )

        thin_border = Border(
            left=Side(style="thin"),
            right=Side(style="thin"),
            top=Side(style="thin"),
            bottom=Side(style="thin")
        )

        # =====================================
        # TITLE
        # =====================================

        ws.merge_cells("A1:K1")

        ws["A1"] = "ATTENDANCE REPORT"

        ws["A1"].fill = purple_fill

        ws["A1"].font = Font(
            bold=True,
            size=16,
            color="FFFFFF"
        )

        ws["A1"].alignment = Alignment(
            horizontal="center",
            vertical="center"
        )

        # =====================================
        # MONTH HEADER
        # =====================================

        ws.merge_cells("A2:K2")

        ws["A2"] = (
            f"Attendance Summary "
            f"{date.today().strftime('%B %Y')}"
        )

        ws["A2"].fill = purple_fill

        ws["A2"].font = white_font

        ws["A2"].alignment = Alignment(
            horizontal="center"
        )

        # =====================================
        # DATE RANGE
        # =====================================


        ws.merge_cells("A3:K3")

        ws["A3"] = (
    f"Attendance Cycle : "
    f"{start_date.strftime('%d-%b-%Y')} "
    f"to "
    f"{end_date.strftime('%d-%b-%Y')}"
)

        ws["A3"].fill = yellow_fill

        ws["A3"].font = bold_font

        ws["A3"].alignment = Alignment(
            horizontal="center"
        )

        # =====================================
        # COLUMN HEADERS
        # =====================================

        headers = [
    "S.No",
    "Emp Code",
    "Emp Name",
    "D.O.J",
    "Department",
    "Total Days In Cycle",
    "Days Payable",
    "Total Days Worked",
    "Total Leaves Taken",
    "Date Of Leave",
    "Remarks"
]

        for col_num, header in enumerate(
            headers,
            start=1
        ):

            cell = ws.cell(
                row=5,
                column=col_num
            )

            cell.value = header

            cell.fill = purple_fill

            cell.font = white_font

            cell.border = thin_border

            cell.alignment = Alignment(
                horizontal="center"
            )

        # =====================================
        # EMPLOYEE DATA
        # =====================================

        employees = Employee.query.all()

        row = 6

        for index, employee in enumerate(
            employees,
            start=1
        ):

            attendance_records = Attendance.query.filter(
            Attendance.user_id == employee.user_id,
            Attendance.attendance_date >= start_date,
            Attendance.attendance_date <= end_date
            ).all()

            leave_requests = LeaveRequest.query.filter(
                LeaveRequest.employee_id == employee.employee_id,
                LeaveRequest.status == "Approved"
            ).all()

            days_worked = len([
                a
                for a in attendance_records
                if a.status == "Present" 
            ])

            total_leaves = 0

            leave_dates_list = []

            for leave in leave_requests:

                total_leaves += (
                    leave.total_days or 0
                )

                if leave.from_date and leave.to_date:

                    leave_dates_list.append(
                    f"{leave.from_date.strftime('%d-%b-%Y')} "
                    f"to "
                    f"{leave.to_date.strftime('%d-%b-%Y')}"
                )

            leave_dates = ", ".join(
            leave_dates_list
        )
            remarks = ""

            total_days_cycle = (
            end_date - start_date
        ).days + 1

            days_payable = (
            total_days_cycle -
            total_leaves
)

            ws.cell(
                row=row,
                column=1
            ).value = index

            ws.cell(
                row=row,
                column=2
            ).value = (
                employee.employee_id
                if hasattr(employee, "employee_id")
                else employee.user_id
            )

            ws.cell(
                row=row,
                column=3
            ).value = (
                f"{employee.first_name} "
                f"{employee.last_name}"
            )

            ws.cell(
                row=row,
                column=4
            ).value = (
                str(employee.joining_date)
                if hasattr(employee, "joining_date")
                and employee.joining_date
                else ""
            )

            ws.cell(
                row=row,
                column=5
            ).value = (
                employee.department
                if employee.department
                else "-"
            )
            ws.cell(
              row=row,
              column=6
            ).value = total_days_cycle

            ws.cell(
               row=row,
               column=7
            ).value = days_payable

            ws.cell(
               row=row,
               column=8
            ).value = days_worked

            ws.cell(
            row=row,
            column=9
            ).value = total_leaves

            ws.cell(
            row=row,
            column=10
            ).value = leave_dates

            ws.cell(
            row=row,
            column=11
            ).value = ""

            for col in range(1, 12):

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

        # =====================================
        # AUTO WIDTH
        # =====================================

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
            ws.column_dimensions["A"].width = 6

        # =====================================
        # FILTER
        # =====================================

        ws.auto_filter.ref = (
            f"A5:K{row}"
        )

        # =====================================
        # SAVE FILE
        # =====================================

        output = BytesIO()

        wb.save(output)

        output.seek(0)

        return send_file(
            output,
            as_attachment=True,
            download_name="Attendance_Report.xlsx",
            mimetype=(
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            )
        )

    except Exception as e:

        return jsonify({
            "success": False,
            "message": str(e)
        }), 500
    

@attendance_bp.route(
    "/credit-monthly-leaves",
    methods=["POST"]
)
def credit_monthly_leaves():

    try:

        current_month = datetime.now().strftime("%B")
        current_year = datetime.now().year

        employees = Employee.query.all()

        for employee in employees:

            existing = LeaveLedger.query.filter_by(
                employee_id=employee.employee_id,
                month=current_month,
                year=current_year
            ).first()

            if existing:
                continue

            opening_cl = employee.casual_leave or 0
            opening_sl = employee.sick_leave or 0
            opening_pl = employee.privilege_leave or 0

            credit_cl = 6
            credit_sl = 6
            credit_pl = 15

            closing_cl = opening_cl + credit_cl
            closing_sl = opening_sl + credit_sl
            closing_pl = opening_pl + credit_pl

            employee.casual_leave = closing_cl
            employee.sick_leave = closing_sl
            employee.privilege_leave = closing_pl

            ledger = LeaveLedger(

                employee_id=employee.employee_id,

                month=current_month,
                year=current_year,

                opening_cl=opening_cl,
                opening_sl=opening_sl,
                opening_pl=opening_pl,

                credit_cl=credit_cl,
                credit_sl=credit_sl,
                credit_pl=credit_pl,

                closing_cl=closing_cl,
                closing_sl=closing_sl,
                closing_pl=closing_pl
            )

            db.session.add(ledger)

        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Leave credited successfully"
        })

    except Exception as e:

        db.session.rollback()

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500
    
@attendance_bp.route(
    "/export-paysheet",
    methods=["GET"]
)
def export_paysheet():

    try:

        wb = Workbook()

        ws = wb.active

        ws.title = "Paysheet"

        today = date.today()

        if today.month == 1:

            start_date = date(
                today.year - 1,
                12,
                25
            )

        else:

            start_date = date(
                today.year,
                today.month - 1,
                25
            )

        end_date = date(
            today.year,
            today.month,
            24
        )

        header_fill = PatternFill(
            fill_type="solid",
            fgColor="D9A066"
        )

        header_font = Font(
            bold=True
        )

        thin_border = Border(
            left=Side(style="thin"),
            right=Side(style="thin"),
            top=Side(style="thin"),
            bottom=Side(style="thin")
        )

        ws.merge_cells("A1:BE1")

        ws["A1"] = "PAYSHEET REPORT"

        ws["A1"].font = Font(
            bold=True,
            size=16
        )

        ws["A1"].alignment = Alignment(
            horizontal="center"
        )

        headers = [
    "S.No",
    "EMP NO",
    "Gender",
    "PF No",
    "UAN No",
    "ESI No",
    "Employee Name",
    "Department",
    "Designation",
    "Mail ID",
    "DOJ",
    "No Of Days In Month",
    "Days Payable",
    "Basic",
    "HRA",
    "LTA",
    "Other Allowance",
    "Gross Salary",

    "Earned Basic",
    "Earned HRA",
    "Earned LTA",
    "Earned Other Allowance",
    "Earned Actual Gross",

    "Attendance Bonus",
    "ODW",
    "Total",

    "Internet Charges",

    "Gross Earned Salary",
    "Earned PF Wages",

    "PF Ded Employee",
    "PF Ded Employer",

    "VPF",

    "PF & VPF Ded Employee",

    "ESI Ded Employee",
    "ESI Ded Employer",

    "Salary Advance",

    "TDS",
    "LWF",
    "PT",

    "Other Deduction",

    "Total Deduction",

    "Net Transfer",

    "Account No",
    "IFSC Code",
    "Branch Code",

    "PF Wage",
    "PF",

    "EPS Wage",

    "8.33 %",
    "3.67 %",
    "0.50 %",
    "0.50 % Employer",
    "0.01 %",

    "Bonus",

    "Actual Month CTC",
    "Earned Month CTC",

    "Remarks"
]

        for col_num, header in enumerate(
            headers,
            start=1
        ):

            cell = ws.cell(
                row=3,
                column=col_num
            )

            cell.value = header

            cell.fill = header_fill

            cell.font = header_font

            cell.border = thin_border

        employees = Employee.query.all()

        row = 4

        for index, employee in enumerate(
            employees,
            start=1
        ):

            attendance_records = Attendance.query.filter(
                Attendance.user_id == employee.user_id,
                Attendance.attendance_date >= start_date,
                Attendance.attendance_date <= end_date
            ).all()

            leave_requests = LeaveRequest.query.filter(
                LeaveRequest.employee_id == employee.employee_id,
                LeaveRequest.status == "Approved"
            ).all()

            total_leaves = sum(
                leave.total_days or 0
                for leave in leave_requests
            )

            total_days_cycle = (
                end_date - start_date
            ).days + 1

            days_payable = (
                total_days_cycle -
                total_leaves
            )

            salary = (
                employee.salary or 0
            )

            hra = 0
            lta = 0
            other_allowance = 0

            pf_deduction = 0
            esi_deduction = 0
            tds = 0
            pt = 0
            lwf = 0

            bonus = 0

            internet_charges = 0

            salary_advance = 0

            actual_ctc = salary

            earned_ctc = round(
                (
                    salary /
                    total_days_cycle
                ) *
                days_payable,
                2
            )

            net_transfer = round(
                earned_ctc -
                (
                    pf_deduction +
                    esi_deduction +
                    tds +
                    pt +
                    lwf +
                    salary_advance
                ),
                2
            )

            data = [
    index,
    employee.employee_id,
    employee.gender,
    employee.pf_number,
    employee.uan_number,
    employee.esi_number,

    f"{employee.first_name} {employee.last_name}",

    employee.department,
    employee.designation,
    employee.email,
    str(employee.joining_date),

    total_days_cycle,
    days_payable,

    salary,
    hra,
    lta,
    other_allowance,
    salary,

    "",  # Earned Basic
    "",  # Earned HRA
    "",  # Earned LTA
    "",  # Earned Other Allowance
    "",  # Earned Actual Gross

    "",  # Attendance Bonus
    "",  # ODW
    "",  # Total

    internet_charges,

    earned_ctc,

    "",  # Earned PF Wages

    pf_deduction,
    "",  # PF Ded Employer

    "",  # VPF

    "",  # PF & VPF Ded Employee

    esi_deduction,
    "",  # ESI Ded Employer

    salary_advance,

    tds,
    lwf,
    pt,

    "",  # Other Deduction

    "",  # Total Deduction

    net_transfer,

    employee.account_number,
    employee.ifsc_code,
    "",  # Branch Code

    "",  # PF Wage
    "",  # PF

    "",  # EPS Wage

    "",  # 8.33%
    "",  # 3.67%
    "",  # 0.50%
    "",  # 0.50% Employer
    "",  # 0.01%

    bonus,

    actual_ctc,
    earned_ctc,

    ""
]

            for col_num, value in enumerate(
                data,
                start=1
            ):

                cell = ws.cell(
                    row=row,
                    column=col_num,
                    value=value
                )

                cell.border = thin_border
                if value is not None and value != "":
                    if isinstance(value, (int, float, date, datetime)) or (isinstance(value, str) and (value.isdigit() or value.startswith("EMP"))):
                        cell.alignment = Alignment(horizontal="center")

            row += 1

        for column_cells in ws.columns:

            try:

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

            except:
                pass

        output = BytesIO()

        wb.save(output)

        output.seek(0)

        return send_file(
            output,
            as_attachment=True,
            download_name="Paysheet_Report.xlsx",
            mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )

    except Exception as e:

        return jsonify({
            "success": False,
            "message": str(e)
        }), 500


@attendance_bp.route(
    "/approve/<int:employee_id>",
    methods=["PUT"]
)
def approve_attendance(employee_id):

    try:
        target_date_str = request.args.get("date")
        if target_date_str:
            target_date = datetime.strptime(target_date_str, "%Y-%m-%d").date()
        else:
            target_date = date.today() - timedelta(days=1)

        from models.employee import Employee
        emp = Employee.query.get(employee_id)
        if not emp:
            return jsonify({"success": False, "error": "Employee not found"}), 404
        target_user_id = emp.user_id

        attendance = Attendance.query.filter_by(
            user_id=target_user_id,
            attendance_date=target_date
        ).first()

        from datetime import time
        default_in = datetime.combine(target_date, time(9, 0))
        default_out = datetime.combine(target_date, time(18, 0))

        if not attendance:
            attendance = Attendance(
                user_id=target_user_id,
                attendance_date=target_date,
                status="Present",
                manager_status="Approved",
                check_in=default_in,
                check_out=default_out,
                total_hours=9.0
            )
            db.session.add(attendance)
        else:
            attendance.status = "Present"
            attendance.manager_status = "Approved"
            attendance.total_hours = 9.0
            if not attendance.check_in:
                attendance.check_in = default_in
            if not attendance.check_out:
                attendance.check_out = default_out

        db.session.commit()

        # Emit attendance_update socket event for real-time dashboard updates
        try:
            from extensions import socketio
            if emp:
                payload = {
                    "id": emp.id,
                    "user_id": emp.user_id,
                    "attendance_status": attendance.status or "Present",
                    "check_in": attendance.check_in.strftime("%I:%M %p") if (attendance and attendance.check_in) else None,
                    "check_out": attendance.check_out.strftime("%I:%M %p") if (attendance and attendance.check_out) else None,
                    "working_hours": attendance.total_hours or 0.0,
                    "lunch_minutes": attendance.lunch_minutes or 0,
                    "tea_minutes": attendance.tea_minutes or 0,
                    "shift": emp.shift_timing or "General Shift",
                    "manager_status": attendance.manager_status or "Pending",
                    "checked_in": (attendance and attendance.check_in is not None and attendance.check_out is None),
                    "lunch_break": attendance.lunch_break or False,
                    "tea_break": attendance.tea_break or False
                }
                socketio.emit("attendance_update", payload)
        except Exception as socket_err:
            print("Failed to emit approve socket:", str(socket_err))

        return jsonify({
            "success": True,
            "message": "Attendance Approved"
        })

    except Exception as e:

        db.session.rollback()

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@attendance_bp.route(
    "/reject/<int:employee_id>",
    methods=["PUT"]
)
def reject_attendance(employee_id):

    try:
        target_date_str = request.args.get("date")
        if target_date_str:
            target_date = datetime.strptime(target_date_str, "%Y-%m-%d").date()
        else:
            target_date = date.today() - timedelta(days=1)

        from models.employee import Employee
        emp = Employee.query.get(employee_id)
        if not emp:
            return jsonify({"success": False, "error": "Employee not found"}), 404
        target_user_id = emp.user_id

        attendance = Attendance.query.filter_by(
            user_id=target_user_id,
            attendance_date=target_date
        ).first()

        if not attendance:
            attendance = Attendance(
                user_id=target_user_id,
                attendance_date=target_date,
                status="Absent",
                manager_status="Rejected",
                total_hours=0.0
            )
            db.session.add(attendance)
        else:
            attendance.status = "Absent"
            attendance.manager_status = "Rejected"
            attendance.total_hours = 0.0

        db.session.commit()

        # Emit attendance_update socket event for real-time dashboard updates
        try:
            from extensions import socketio
            if emp:
                payload = {
                    "id": emp.id,
                    "user_id": emp.user_id,
                    "attendance_status": attendance.status or "Absent",
                    "check_in": attendance.check_in.strftime("%I:%M %p") if (attendance and attendance.check_in) else None,
                    "check_out": attendance.check_out.strftime("%I:%M %p") if (attendance and attendance.check_out) else None,
                    "working_hours": attendance.total_hours or 0.0,
                    "lunch_minutes": attendance.lunch_minutes or 0,
                    "tea_minutes": attendance.tea_minutes or 0,
                    "shift": emp.shift_timing or "General Shift",
                    "manager_status": attendance.manager_status or "Pending",
                    "checked_in": (attendance and attendance.check_in is not None and attendance.check_out is None),
                    "lunch_break": attendance.lunch_break or False,
                    "tea_break": attendance.tea_break or False
                }
                socketio.emit("attendance_update", payload)
        except Exception as socket_err:
            print("Failed to emit reject socket:", str(socket_err))

        return jsonify({
            "success": True,
            "message": "Attendance Rejected and marked as Absent"
        })

    except Exception as e:

        db.session.rollback()

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@attendance_bp.route(
    "/approve-all",
    methods=["PUT"]
)
def approve_all_attendance():

    try:
        manager_id = request.args.get("manager_id")
        yesterday = date.today() - timedelta(days=1)

        from datetime import time
        default_in = datetime.combine(yesterday, time(9, 0))
        default_out = datetime.combine(yesterday, time(18, 0))

        if manager_id:
            from models.employee import Employee
            manager = Employee.query.filter_by(user_id=int(manager_id)).first()
            if manager:
                manager_name = f"{manager.first_name} {manager.last_name}".strip().lower()
                reporting_employees = Employee.query.all()
                for employee in reporting_employees:
                    if not employee.reporting_manager:
                        continue
                    e_mgr = employee.reporting_manager.strip().lower()
                    is_match = (e_mgr == manager_name) or (len(e_mgr.split()) == 1 and manager_name.split()[0] == e_mgr) or (len(manager_name.split()) == 1 and e_mgr.split()[0] == manager_name)
                    if is_match:
                        attendance = Attendance.query.filter_by(
                            user_id=employee.user_id,
                            attendance_date=yesterday
                        ).first()
                        if not attendance:
                            attendance = Attendance(
                                user_id=employee.user_id,
                                attendance_date=yesterday,
                                status="Present",
                                manager_status="Approved",
                                check_in=default_in,
                                check_out=default_out,
                                total_hours=9.0
                            )
                            db.session.add(attendance)
                        else:
                            attendance.status = "Present"
                            attendance.manager_status = "Approved"
                            attendance.total_hours = 9.0
                            if not attendance.check_in:
                                attendance.check_in = default_in
                            if not attendance.check_out:
                                attendance.check_out = default_out
        else:
            attendances = Attendance.query.filter_by(
                attendance_date=yesterday
            ).all()
            for attendance in attendances:
                attendance.status = "Present"
                attendance.manager_status = "Approved"
                attendance.total_hours = 9.0
                if not attendance.check_in:
                    attendance.check_in = default_in
                if not attendance.check_out:
                    attendance.check_out = default_out

        db.session.commit()

        # Emit attendance_approved_all socket event for real-time dashboard updates
        try:
            from extensions import socketio
            socketio.emit("attendance_approved_all", {"status": "Approved"})
        except Exception as socket_err:
            print("Failed to emit approve-all socket:", str(socket_err))

        return jsonify({
            "success": True,
            "message": "All attendance approved"
        })

    except Exception as e:

        db.session.rollback()

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500