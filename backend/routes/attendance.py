from utils.compat import Blueprint, request, jsonify, get_client_ip
from utils.jwt_helper import jwt_required, get_jwt_identity
from utils.employee_cache import get_all_employees_cached
from models.database import db
from models.attendance import Attendance
from datetime import datetime
from models.employee import Employee
from models.user import User
from datetime import date
from sqlalchemy import extract, or_
from sqlalchemy import extract
from sqlalchemy.orm.attributes import flag_modified
from datetime import timedelta
from openpyxl.styles import Font
from openpyxl.styles import PatternFill
from utils.compat import send_file
from zoneinfo import ZoneInfo
from models.leave import LeaveRequest, LeaveLedger
from io import BytesIO
import os
import pymysql
from middleware.auth import auth_required
from utils.jwt_helper import get_jwt_identity



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


@attendance_bp.route("/debug-attendance", methods=["GET"])
def debug_attendance():
    try:
        from models.attendance import Attendance
        from models.employee import Employee
        import datetime
        emp = Employee.query.filter(Employee.first_name.like("%Sangeetha%")).first()
        if emp:
            start_date = datetime.date(2026, 7, 25)
            end_date = datetime.date(2026, 8, 24)
            records = Attendance.query.filter(
                Attendance.user_id == emp.user_id,
                Attendance.attendance_date >= start_date,
                Attendance.attendance_date <= end_date
            ).all()
            details = []
            for r in records:
                details.append({
                    "date": str(r.attendance_date),
                    "type": str(type(r.attendance_date)),
                    "status": r.status
                })
            return jsonify({
                "success": True,
                "employee": f"{emp.first_name} {emp.last_name}",
                "user_id": emp.user_id,
                "employee_id": emp.employee_id,
                "records": details
            })
        return jsonify({"success": False, "error": "Employee not found"})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})


@attendance_bp.route("/checkin", methods=["POST"])
@jwt_required()
def check_in():

    try:

        data = request.json

        user_id = data.get("user_id")

        if not user_id:
            return jsonify({
                "success": False,
                "message": "User ID is required"
            }), 400

        if str(get_jwt_identity()) != str(user_id):
            return jsonify({
                "success": False,
                "message": "Unauthorized"
            }), 403

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
        emp_ids = [employee.employee_id] if employee.employee_id else []

        approved_request = ShiftRequest.query.filter(
            ShiftRequest.employee_id.in_(emp_ids),
            ShiftRequest.status == "Approved",
            ShiftRequest.from_date <= today_date,
            ShiftRequest.to_date >= today_date
        ).first()

        if approved_request:
            shift_name = (approved_request.requested_shift or "").strip().lower()

        else:
            shift_name = (
                employee.shift_timing or ""
            ).strip().lower()

        # Use IST time for shift validation (not server UTC)
        current_time = datetime.now(ZoneInfo("Asia/Kolkata")).time()

        # First Shift (07:00 AM - 04:00 PM)
        if shift_name == "first shift":


            allowed_time = datetime.strptime(
                "07:00",
                "%H:%M"
            ).time()

            if current_time < allowed_time:

                return jsonify({
                    "success": False,
                    "message":
                    "First Shift check-in allowed only after 07:00 AM"
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

        # Second Shift (12:00 PM - 09:00 PM)
        elif shift_name == "second shift":

            allowed_time = datetime.strptime(
                "12:00",
                "%H:%M"
            ).time()

            if current_time < allowed_time:

                return jsonify({
                    "success": False,
                    "message":
                    "Second Shift check-in allowed only after 12:00 PM"
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
                LeaveRequest.employee_id == employee.employee_id,
                LeaveRequest.employee_id == str(employee.id)
            ),
            LeaveRequest.status == "Approved",
            LeaveRequest.request_type == "Leave",
            LeaveRequest.from_date <= today_date,
            LeaveRequest.to_date >= today_date
        ).first()

        if approved_leave_today and (approved_leave_today.total_days is None or approved_leave_today.total_days > 0.5):
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

        if attendance and attendance.check_in:
            if not attendance.check_out:
                return jsonify({
                    "success": False,
                    "message": "You are already checked in."
                }), 400

            return jsonify({
                "success": False,
                "message": "You have already checked out for today. You cannot check in again."
            }), 400
        elif attendance:
            # =====================================
            # UPDATE EXISTING PLACEHOLDER ROW
            # =====================================
            attendance.check_in = get_ist_now()
            attendance.check_in_ip = get_client_ip()
            attendance.status = "Half Day"
        else:
            # =====================================
            # CREATE ATTENDANCE
            # =====================================
            attendance = Attendance(
                user_id=user_id,
                attendance_date=today,
                check_in=get_ist_now(),
                check_in_ip=get_client_ip(),
                status="Half Day"
            )

        db.session.add(attendance)

        # Update and resolve related notifications
        try:
            from models.notification import Notification
            from extensions import socketio

            # 1. Look up manager's employee details to locate their socket room
            manager_name = employee.reporting_manager.strip().lower() if employee.reporting_manager else ""
            manager_emp = None
            for e in [e for e in get_all_employees_cached() if (e.status or "").lower() != "inactive"]:
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
@jwt_required()
def check_out():

    try:

        data = request.json

        user_id = data.get("user_id")

        if not user_id:
            return jsonify({
                "success": False,
                "error": "User ID is required"
            }), 400

        if str(get_jwt_identity()) != str(user_id):
            return jsonify({
                "success": False,
                "error": "Unauthorized"
            }), 403

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

        checkout_ip = get_client_ip()
        attendance.check_out_ip = checkout_ip

        # IP Mismatch check (Option B)
        check_in_ip = attendance.check_in_ip
        if check_in_ip and check_in_ip != checkout_ip:
            attendance.manager_status = "Need Clarification"
            history = list(attendance.clarification_history or [])
            msg_entry = {
                "sender_id": "system",
                "sender_name": "System",
                "sender_role": "system",
                "comment": f"IP address mismatch detected (Checked in from {check_in_ip}, Checked out from {checkout_ip}).",
                "timestamp": get_ist_now().isoformat()
            }
            history.append(msg_entry)
            attendance.clarification_history = history
            flag_modified(attendance, "clarification_history")

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

        hours_decimal = total_seconds / 3600
        attendance.total_hours = int(hours_decimal * 100) / 100

        if attendance.total_hours >= 4.0:
            attendance.status = "Present"
        else:
            attendance.status = "Half Day"

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

        is_mismatch = check_in_ip and check_in_ip != checkout_ip
        message = "Checked Out Successfully (IP mismatch detected, clarification required)" if is_mismatch else "Checked Out Successfully"
        return jsonify({
            "success": True,
            "message": message,
            "check_in": attendance.check_in.strftime("%Y-%m-%d %H:%M:%S"),
            "check_out": attendance.check_out.strftime("%Y-%m-%d %H:%M:%S"),
            "total_hours": attendance.total_hours,
            "ip_mismatch": bool(is_mismatch)
        }), 200

    except Exception as e:

        db.session.rollback()

        print("CHECKOUT ERROR:", str(e))

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

def sync_biometric_to_web_entry(attendance):
    """
    Sync biometric card punch times to web punch times if they are missing,
    recalculate total hours & status, and return True if any changes were made.
    """
    updated = False
    if attendance.card_check_in and not attendance.check_in:
        attendance.check_in = attendance.card_check_in
        updated = True
    if attendance.card_check_out and not attendance.check_out:
        attendance.check_out = attendance.card_check_out
        updated = True

    if updated:
        if attendance.check_in and attendance.check_out:
            total_seconds = (attendance.check_out - attendance.check_in).total_seconds()
            break_minutes = attendance.total_break_minutes or 0
            gap_minutes = attendance.total_gap_minutes or 0
            total_seconds -= (break_minutes + gap_minutes) * 60
            hours_decimal = max(total_seconds, 0) / 3600
            attendance.total_hours = int(hours_decimal * 100) / 100

        # Recalculate status
        web_hrs = attendance.total_hours or 0.0
        card_hrs = attendance.card_working_hours or 0.0
        max_hrs = max(web_hrs, card_hrs)

        active_hrs = max_hrs
        if not (attendance.check_out or attendance.card_check_out):
            effective_in = attendance.check_in or attendance.card_check_in
            if effective_in:
                now = get_ist_now()
                if attendance.attendance_date == now.date():
                    elapsed_seconds = (now - effective_in).total_seconds()
                    break_seconds = (attendance.total_break_minutes or 0) * 60
                    hours_decimal = max(elapsed_seconds - break_seconds, 0) / 3600
                    active_hrs = max(hours_decimal, max_hrs)

        if active_hrs >= 4.0:
            attendance.status = "Present"
        elif attendance.check_in or attendance.card_check_in:
            attendance.status = "Half Day"
        else:
            attendance.status = "Absent"

    return updated


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
                hours_decimal = max(total_seconds, 0) / 3600
                attendance.card_working_hours = int(hours_decimal * 100) / 100
            else:
                attendance.card_working_hours = 0.0

            # Sync to web check_in / check_out columns if they are NULL
            sync_biometric_to_web_entry(attendance)

            # Recalculate status
            web_hrs = attendance.total_hours or 0.0
            card_hrs = attendance.card_working_hours or 0.0
            max_hrs = max(web_hrs, card_hrs)

            active_hrs = max_hrs
            if not (attendance.check_out or attendance.card_check_out):
                effective_in = attendance.check_in or attendance.card_check_in
                if effective_in:
                    now = get_ist_now()
                    if attendance.attendance_date == now.date():
                        elapsed_seconds = (now - effective_in).total_seconds()
                        break_seconds = (attendance.total_break_minutes or 0) * 60
                        hours_decimal = max(elapsed_seconds - break_seconds, 0) / 3600
                        active_hrs = max(hours_decimal, max_hrs)

            if active_hrs >= 4.0:
                attendance.status = "Present"
            elif attendance.check_in or attendance.card_check_in:
                attendance.status = "Half Day"
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
        attendance_date=get_ist_today()
    ).order_by(
        Attendance.id.desc()
    ).first()

    if not attendance:
        return jsonify({
            "checked_in": False
        })

    # User is checked in if they have check_in/card_check_in and haven't checked out on those channels
    web_active = (attendance.check_in is not None) and (attendance.check_out is None)
    card_active = (attendance.card_check_in is not None) and (attendance.card_check_out is None)
    is_checked_in = web_active or card_active

    if not is_checked_in:
        return jsonify({
            "checked_in": False
        })

    effective_check_in = attendance.check_in or attendance.card_check_in

    return jsonify({
        "checked_in": True,
        "check_in": effective_check_in.isoformat() if effective_check_in else None,
        "lunch_break": attendance.lunch_break,
        "tea_break": attendance.tea_break,
        "lunch_start": attendance.lunch_start.isoformat() if attendance.lunch_start else None,
        "tea_start": attendance.tea_start.isoformat() if attendance.tea_start else None,
        "lunch_minutes": attendance.lunch_minutes or 0,
        "tea_minutes": attendance.tea_minutes or 0,
        "total_break_minutes": attendance.total_break_minutes or 0
    })




@attendance_bp.route(
    "/lunch-break",
    methods=["POST", "PUT"]
)
@jwt_required()
def lunch_break():

    try:

        data = request.json

        if str(get_jwt_identity()) != str(data.get("user_id")):
            return jsonify({
                "success": False,
                "error": "Unauthorized"
            }), 403

        attendance = Attendance.query.filter_by(
            user_id=data["user_id"],
            attendance_date=get_ist_today()
        ).order_by(
            Attendance.id.desc()
        ).first()

        if not attendance:
            return jsonify({
                "success": False,
                "error": "Attendance not found"
            }), 404

        # Verify they are currently checked in (web active or card active)
        web_active = (attendance.check_in is not None) and (attendance.check_out is None)
        card_active = (attendance.card_check_in is not None) and (attendance.card_check_out is None)
        if not (web_active or card_active):
            return jsonify({
                "success": False,
                "error": "User is not checked in or has already checked out."
            }), 400

        action = data.get("action")

        if action == "start":
            # Lunch is allowed only once per day — check existing lunch_minutes (no new column needed)
            if (attendance.lunch_minutes or 0) > 0 or attendance.lunch_break:
                return jsonify({
                    "success": False,
                    "error": "Lunch break is allowed only once per day."
                }), 400

            attendance.lunch_break = True
            attendance.lunch_start = get_ist_now()

        elif action == "stop":
            attendance.lunch_break = False
            attendance.lunch_end = get_ist_now()

            if attendance.lunch_start and attendance.lunch_end:
                added_mins = int((attendance.lunch_end - attendance.lunch_start).total_seconds() / 60)
                attendance.lunch_minutes = (attendance.lunch_minutes or 0) + added_mins
                attendance.lunch_start = None
                attendance.lunch_end = None

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
@jwt_required()
def tea_break():

    try:

        data = request.json

        if str(get_jwt_identity()) != str(data.get("user_id")):
            return jsonify({
                "success": False,
                "error": "Unauthorized"
            }), 403

        attendance = Attendance.query.filter_by(
            user_id=data["user_id"],
            attendance_date=get_ist_today()
        ).order_by(
            Attendance.id.desc()
        ).first()

        if not attendance:
            return jsonify({
                "success": False,
                "error": "Attendance not found"
            }), 404

        # Verify they are currently checked in (web active or card active)
        web_active = (attendance.check_in is not None) and (attendance.check_out is None)
        card_active = (attendance.card_check_in is not None) and (attendance.card_check_out is None)
        if not (web_active or card_active):
            return jsonify({
                "success": False,
                "error": "User is not checked in or has already checked out."
            }), 400

        action = data.get("action")

        if action == "start":
            # Tea is allowed twice per day — read count via raw SQL (column exists in DB, not in ORM model)
            from sqlalchemy import text as sql_text
            tea_count_row = db.session.execute(
                sql_text("SELECT tea_count FROM attendance WHERE id = :id"),
                {"id": attendance.id}
            ).fetchone()
            tea_count = (tea_count_row[0] or 0) if tea_count_row else 0

            if tea_count >= 2:
                return jsonify({
                    "success": False,
                    "error": "Tea break is allowed only twice per day."
                }), 400

            attendance.tea_break = True
            attendance.tea_start = get_ist_now()
            # Increment tea_count via raw SQL
            db.session.execute(
                sql_text("UPDATE attendance SET tea_count = :count WHERE id = :id"),
                {"count": tea_count + 1, "id": attendance.id}
            )

        elif action == "stop":
            attendance.tea_break = False
            attendance.tea_end = get_ist_now()

            if attendance.tea_start and attendance.tea_end:
                added_mins = int((attendance.tea_end - attendance.tea_start).total_seconds() / 60)
                attendance.tea_minutes = (attendance.tea_minutes or 0) + added_mins
                attendance.tea_start = None
                attendance.tea_end = None

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

def is_date_week_off(d):
    """
    S4Carlisle week-off rules:
    - Sundays (weekday == 6) are week-offs
    - 2nd and 4th Saturdays of the month are week-offs
    - 1st, 3rd, and 5th Saturdays are working days
    """
    if d.weekday() == 6:
        return True
    if d.weekday() == 5:
        # Calculate which Saturday of the month it is
        sat_count = 0
        for day_num in range(1, d.day + 1):
            from datetime import date
            if date(d.year, d.month, day_num).weekday() == 5:
                sat_count += 1
        if sat_count in (2, 4):
            return True
    return False

@attendance_bp.route("/check-holiday-or-weekoff", methods=["GET"])
@jwt_required()
def check_holiday_or_weekoff():
    try:
        from models.employee import Employee
        user_id = get_jwt_identity()
        employee = Employee.query.filter_by(user_id=int(user_id)).first()
        if not employee:
            return jsonify({"success": False, "message": "Employee not found"}), 404
            
        today = get_ist_today()
        
        # Check holiday override
        from models.holiday import Holiday, HolidayOverride
        override = HolidayOverride.query.filter_by(date=today).first()
        is_holiday = False
        is_week_off = False
        holiday_name = None
        
        if override:
            if override.override_type == "Holiday":
                is_holiday = True
                holiday_name = override.name or "Holiday"
            elif override.override_type == "Weekly Off":
                is_week_off = True
                holiday_name = override.name or "Weekly Off"
        else:
            holiday = Holiday.query.filter_by(date=today).first()
            if holiday:
                is_holiday = True
                holiday_name = holiday.name
            elif is_date_week_off(today):
                is_week_off = True
                
        # Check if already has a pending or approved one day wages request for today
        from models.shift_request import ShiftRequest
        existing_wages = ShiftRequest.query.filter(
            ShiftRequest.employee_id.in_([employee.id, employee.employee_id]),
            ShiftRequest.request_type == "One Day Wages",
            ShiftRequest.status.in_(["Pending", "Approved"]),
            ShiftRequest.from_date <= today,
            ShiftRequest.to_date >= today
        ).first()
        
        return jsonify({
            "success": True,
            "is_holiday_or_weekoff": is_holiday or is_week_off,
            "reason": holiday_name or ("Weekend Weekoff" if is_week_off else None),
            "already_requested": existing_wages is not None
        }), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@attendance_bp.route("/history/<int:user_id>")
def attendance_history(user_id):

    employee = Employee.query.filter_by(user_id=user_id).first()
    if not employee:
        return jsonify([])

    today = get_ist_today()
    joining = employee.joining_date
    result = []

    # Read start_date from query parameters (format: YYYY-MM-DD)
    start_date_param = request.args.get("start_date")
    start_date_val = None
    if start_date_param:
        try:
            start_date_val = datetime.strptime(start_date_param, "%Y-%m-%d").date()
        except ValueError:
            start_date_val = None

    if not start_date_val:
        # Default to current cycle start date
        if today.day >= 25:
            start_date_val = date(today.year, today.month, 25)
        else:
            if today.month == 1:
                start_date_val = date(today.year - 1, 12, 25)
            else:
                start_date_val = date(today.year, today.month - 1, 25)

    # Cycle runs from start_date_val to 24th of next month
    if start_date_val.month == 12:
        end_date_limit = date(start_date_val.year + 1, 1, 24)
    else:
        end_date_limit = date(start_date_val.year, start_date_val.month + 1, 24)

    # Limit end_date to today
    end_date = min(today, end_date_limit)

    # Fetch holidays and overrides within range
    from models.holiday import Holiday, HolidayOverride
    holidays = Holiday.query.filter(Holiday.date >= start_date_val, Holiday.date <= end_date).all()
    overrides = HolidayOverride.query.filter(HolidayOverride.date >= start_date_val, HolidayOverride.date <= end_date).all()
    
    holiday_dict = {
        (h.date.date() if hasattr(h.date, "date") else h.date): h.name
        for h in holidays
    }
    override_dict = {
        (o.date.date() if hasattr(o.date, "date") else o.date): (o.override_type, o.name)
        for o in overrides
    }

    if end_date >= start_date_val:
        num_days = (end_date - start_date_val).days + 1
        for i in range(num_days):
            current_date = end_date - timedelta(days=i)

            # Do not go before joining date if set
            if joining and current_date < joining:
                break

            record = Attendance.query.filter_by(
                user_id=user_id,
                attendance_date=current_date
            ).first()

            # Check for One Day Wages request on this date
            from models.shift_request import ShiftRequest
            wages_req = ShiftRequest.query.filter(
                ShiftRequest.employee_id.in_([employee.id, employee.employee_id]),
                ShiftRequest.request_type == "One Day Wages",
                ShiftRequest.from_date <= current_date,
                ShiftRequest.to_date >= current_date
            ).first()
            wages_status = wages_req.status if wages_req else None
            is_weekend_or_holiday = is_date_week_off(current_date) or (current_date in holiday_dict)
            is_one_day_wages = (wages_req is not None and wages_req.status == "Approved") or \
                               (is_weekend_or_holiday and wages_status != "Rejected" and wages_status != "Pending" and record is not None and (record.check_in or record.card_check_in) and record.manager_status == "Approved" and record.status != "Leave")

            # Determine the effective shift for this date:
            # Priority: approved ShiftRequest covering date > record.shift_timing > employee.shift_timing
            approved_shift_req = ShiftRequest.query.filter(
                ShiftRequest.employee_id.in_([employee.id, employee.employee_id]),
                ShiftRequest.request_type == "Shift",
                ShiftRequest.status == "Approved",
                ShiftRequest.from_date <= current_date,
                ShiftRequest.to_date >= current_date
            ).order_by(ShiftRequest.created_at.desc()).first()
            effective_shift = (
                (approved_shift_req.requested_shift if approved_shift_req and approved_shift_req.requested_shift else None)
                or (record.shift_timing if record else None)
                or employee.shift_timing
                or "General Shift"
            )

            if record:
                is_today = (record.attendance_date == today)
                
                if record.check_out:
                    working_hours = record.total_hours or 0.0
                    check_out_str = record.check_out.strftime("%I:%M %p")
                elif is_today and record.check_in:
                    # Active check-in today: compute live working hours
                    now = get_ist_now()
                    elapsed_seconds = (now - record.check_in).total_seconds()
                    break_seconds = (record.total_break_minutes or 0) * 60
                    hours_decimal = max(elapsed_seconds - break_seconds, 0) / 3600
                    working_hours = int(hours_decimal * 100) / 100
                    check_out_str = "-"
                else:
                    # Past date with missing checkout
                    working_hours = record.total_hours or 0.0
                    check_out_str = "-"

                # Derive display status: override to Half Day if < 4 working hours and checked in
                base_status = record.status or "Present"
                has_checkin = bool(record.check_in or record.card_check_in)
                if has_checkin and base_status not in ("Absent", "Leave") and working_hours < 4.0:
                    display_status = "Half Day"
                else:
                    display_status = base_status

                # Override: if the day is a weekend or holiday and no check-in exists,
                # show the correct label instead of a stale "Absent" stored in DB.
                if not record.check_in:
                    override = override_dict.get(current_date)
                    if override:
                        if override[0] == "Holiday":
                            display_status = "Holiday"
                        # If override is "Working Day", keep whatever was computed
                    elif current_date in holiday_dict:
                        display_status = "Holiday"
                    elif is_date_week_off(current_date):
                        display_status = "Week Off"

                # Check for approved Permission on this date
                from models.leave import LeaveRequest as LR
                perm_req = LR.query.filter(
                    or_(
                        LR.employee_id == str(employee.id),
                        LR.employee_id == employee.employee_id
                    ),
                    LR.request_type == "Permission",
                    LR.status == "Approved",
                    LR.permission_date == current_date
                ).first()

                has_permission = False
                permission_label = ""
                actual_working_hours = working_hours
                if perm_req and perm_req.from_time and perm_req.to_time:
                    has_permission = True
                    ft = perm_req.from_time
                    tt = perm_req.to_time
                    perm_seconds = (tt.hour * 3600 + tt.minute * 60) - (ft.hour * 3600 + ft.minute * 60)
                    perm_hours = max(perm_seconds, 0) / 3600
                    virtual_working_hours = actual_working_hours + perm_hours

                    def _fmt(t):
                        h = t.hour; ampm = "AM" if h < 12 else "PM"; h12 = h % 12 or 12
                        return f"{h12:02d}:{t.minute:02d} {ampm}"

                    permission_label = f"{_fmt(ft)} – {_fmt(tt)}"

                    # Re-evaluate display_status after crediting permission hours
                    if display_status in ("Absent", "Half Day") and virtual_working_hours >= 8.0:
                        display_status = "Present"
                    elif display_status == "Absent" and virtual_working_hours >= 4.0:
                        display_status = "Half Day"


                result.append({
                    "id": record.id,
                    "date": record.attendance_date.strftime("%Y-%m-%d"),
                    "attendance_date": record.attendance_date.strftime("%Y-%m-%d"),
                    "attendance_date_formatted": record.attendance_date.strftime("%d %b %Y"),
                    "shift": effective_shift,
                    "checkIn": record.check_in.strftime("%I:%M %p") if record.check_in else "-",
                    "check_in": record.check_in.strftime("%I:%M %p") if record.check_in else "-",
                    "checkOut": check_out_str,
                    "check_out": check_out_str,
                    "workingHours": working_hours,
                    "working_hours": working_hours,
                    "total_hours": working_hours,
                    "cardCheckIn": record.card_check_in.strftime("%I:%M %p") if record.card_check_in else "-",
                    "card_check_in": record.card_check_in.strftime("%I:%M %p") if record.card_check_in else "-",
                    "cardCheckOut": record.card_check_out.strftime("%I:%M %p") if record.card_check_out else "-",
                    "card_check_out": record.card_check_out.strftime("%I:%M %p") if record.card_check_out else "-",
                    "cardWorkingHours": record.card_working_hours or 0.0,
                    "card_working_hours": record.card_working_hours or 0.0,
                    "lunchMinutes": record.lunch_minutes,
                    "lunch_minutes": record.lunch_minutes,
                    "teaMinutes": record.tea_minutes,
                    "tea_minutes": record.tea_minutes,
                    "totalBreak": record.total_break_minutes,
                    "total_break_minutes": record.total_break_minutes,
                    "status": display_status,
                    "manager_status": record.manager_status or "Pending",
                    "reporting_manager": employee.reporting_manager or "",
                    "check_in_ip": record.check_in_ip,
                    "check_out_ip": record.check_out_ip,
                    "clarification_history": record.clarification_history or [],
                    "last_manager_comment": (record.clarification_history[-1]["comment"] if record.clarification_history and record.clarification_history[-1].get("sender_role") == "manager" else "") or "",
                    "is_one_day_wages": is_one_day_wages,
                    "wages_status": wages_status,
                    "has_permission": has_permission,
                    "permission_label": permission_label,
                    "is_regularization": bool(record.is_regularization),
                    "regularization_reason": record.regularization_reason or "",
                    "regularization_check_in": record.regularization_check_in.strftime("%I:%M %p") if record.regularization_check_in else "-",
                    "regularization_check_out": record.regularization_check_out.strftime("%I:%M %p") if record.regularization_check_out else "-",
                    "regularization_total_hours": record.regularization_total_hours or 0.0,
                })

            else:
                # Check normal calendar rules for virtual status
                status = "Absent"
                
                # 1. Check HolidayOverride first
                override = override_dict.get(current_date)
                if override:
                    if override[0] == "Holiday":
                        status = "Holiday"
                    else:
                        # override is "Working Day" -> check approved leaves or mark Absent
                        from models.leave import LeaveRequest
                        leave = LeaveRequest.query.filter(
                            or_(
                                LeaveRequest.employee_id == str(employee.id),
                                LeaveRequest.employee_id == employee.employee_id
                            ),
                            LeaveRequest.status == "Approved",
                            LeaveRequest.from_date <= current_date,
                            LeaveRequest.to_date >= current_date
                        ).first()
                        status = ("Half Day" if (leave.total_days is not None and leave.total_days <= 0.5) else "Leave") if leave else "Absent"
                else:
                    # 2. Check Holiday table
                    if current_date in holiday_dict:
                        status = "Holiday"
                    # 3. Check Saturday/Sunday week-off logic
                    elif is_date_week_off(current_date):
                        status = "Week Off"
                    # 4. Check approved leaves
                    else:
                        from models.leave import LeaveRequest
                        leave = LeaveRequest.query.filter(
                            or_(
                                LeaveRequest.employee_id == str(employee.id),
                                LeaveRequest.employee_id == employee.employee_id
                            ),
                            LeaveRequest.status == "Approved",
                            LeaveRequest.from_date <= current_date,
                            LeaveRequest.to_date >= current_date
                        ).first()
                        status = ("Half Day" if (leave.total_days is not None and leave.total_days <= 0.5) else "Leave") if leave else "Absent"

                result.append({
                    "id": f"virtual-{current_date.strftime('%Y-%m-%d')}",
                    "date": current_date.strftime("%Y-%m-%d"),
                    "attendance_date": current_date.strftime("%Y-%m-%d"),
                    "attendance_date_formatted": current_date.strftime("%d %b %Y"),
                    "shift": employee.shift_timing or "General Shift",
                    "checkIn": "-",
                    "check_in": "-",
                    "checkOut": "-",
                    "check_out": "-",
                    "workingHours": 0.0,
                    "working_hours": 0.0,
                    "total_hours": 0.0,
                    "cardCheckIn": "-",
                    "card_check_in": "-",
                    "cardCheckOut": "-",
                    "card_check_out": "-",
                    "cardWorkingHours": 0.0,
                    "card_working_hours": 0.0,
                    "lunchMinutes": 0,
                    "lunch_minutes": 0,
                    "teaMinutes": 0,
                    "tea_minutes": 0,
                    "totalBreak": 0,
                    "total_break_minutes": 0,
                    "status": status,
                    "manager_status": "Pending",
                    "reporting_manager": employee.reporting_manager or "",
                    "clarification_history": [],
                    "last_manager_comment": "",
                    "is_one_day_wages": is_one_day_wages,
                    "wages_status": wages_status,
                    "regularization_check_in": "-",
                    "regularization_check_out": "-",
                    "regularization_total_hours": 0.0
                })

    return jsonify(result)


@attendance_bp.route("/", methods=["GET"])
def get_attendance():

    # Allow HR/Managers to query a specific date via ?date=YYYY-MM-DD
    date_param = request.args.get("date")
    if date_param:
        try:
            today = datetime.strptime(date_param, "%Y-%m-%d").date()
        except ValueError:
            today = get_ist_today()
    else:
        today = get_ist_today()

    employees = [e for e in get_all_employees_cached() if (e.status or "").lower() != "inactive"]

    attendance_list = []

    for employee in employees:

        attendance = Attendance.query.filter_by(
            user_id=employee.user_id,
            attendance_date=today
        ).first()

        if attendance:

            # Recalculate status from actual data (stored status can be stale for past dates)
            web_hrs = attendance.total_hours or 0.0
            card_hrs = attendance.card_working_hours or 0.0
            max_hrs = max(web_hrs, card_hrs)
            has_checkin = bool(attendance.check_in or attendance.card_check_in)

            if attendance.status in ("Leave", "LOP", "Holiday", "Week Off", "Half Day"):
                # Keep manually-set or leave-driven statuses
                status = attendance.status
            elif has_checkin:
                active_hrs = max_hrs
                if not (attendance.check_out or attendance.card_check_out):
                    effective_in = attendance.check_in or attendance.card_check_in
                    if effective_in:
                        now = get_ist_now()
                        if attendance.attendance_date == now.date():
                            elapsed_seconds = (now - effective_in).total_seconds()
                            break_seconds = (attendance.total_break_minutes or 0) * 60
                            hours_decimal = max(elapsed_seconds - break_seconds, 0) / 3600
                            active_hrs = max(hours_decimal, max_hrs)
                
                if active_hrs >= 4.0:
                    status = "Present"
                else:
                    status = "Half Day"
            else:
                status = attendance.status or "Absent"

            # Override to Half Day if checked out with < 4 working hours
            if attendance.check_out and web_hrs < 4.0 and status not in ("Absent", "Leave", "LOP", "Holiday", "Week Off"):
                status = "Half Day"

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

            card_check_in = (
                attendance.card_check_in.strftime("%H:%M:%S")
                if attendance.card_check_in
                else "-"
            )

            card_check_out = (
                attendance.card_check_out.strftime("%H:%M:%S")
                if attendance.card_check_out
                else "-"
            )

            total_hours = attendance.total_hours or 0.0

        else:
            status = "Absent"
            check_in = "-"
            check_out = "-"
            card_check_in = "-"
            card_check_out = "-"
            total_hours = 0

        if status == "Absent":
            from models.leave import LeaveRequest
            leave = LeaveRequest.query.filter(
                or_(
                    LeaveRequest.employee_id == str(employee.id),
                    LeaveRequest.employee_id == employee.employee_id
                ),
                LeaveRequest.status == "Approved",
                LeaveRequest.from_date <= today,
                LeaveRequest.to_date >= today
            ).first()
            if leave:
                status = "Half Day" if (leave.total_days is not None and leave.total_days <= 0.5) else "Leave"

        # Check for an approved Permission on this date and credit its hours
        from models.leave import LeaveRequest as LR
        from datetime import time as dtime
        permission_req = LR.query.filter(
            or_(
                LR.employee_id == str(employee.id),
                LR.employee_id == employee.employee_id
            ),
            LR.request_type == "Permission",
            LR.status == "Approved",
            LR.permission_date == today
        ).first()

        has_permission = False
        permission_label = ""
        actual_hours = total_hours or 0.0
        if permission_req and permission_req.from_time and permission_req.to_time:
            has_permission = True
            # Calculate permission duration in hours
            ft = permission_req.from_time
            tt = permission_req.to_time
            perm_seconds = (tt.hour * 3600 + tt.minute * 60) - (ft.hour * 3600 + ft.minute * 60)
            perm_hours = max(perm_seconds, 0) / 3600
            virtual_total_hours = actual_hours + perm_hours

            def fmt_time(t):
                h = t.hour
                ampm = "AM" if h < 12 else "PM"
                h12 = h % 12 or 12
                return f"{h12:02d}:{t.minute:02d} {ampm}"

            permission_label = f"{fmt_time(ft)} – {fmt_time(tt)}"

            # Re-evaluate status now that hours include permission credit virtually
            if status in ("Absent", "Half Day") and has_permission:
                if virtual_total_hours >= 4.0:
                    status = "Present"
                else:
                    status = "Half Day"


        from models.shift_request import ShiftRequest
        emp_ids = [employee.employee_id] if employee.employee_id else []

        wfh_today = ShiftRequest.query.filter(
            ShiftRequest.employee_id.in_(emp_ids),
            ShiftRequest.status == "Approved",
            ShiftRequest.request_type == "WFH",
            ShiftRequest.from_date <= today,
            ShiftRequest.to_date >= today
        ).first()

        shift_change_today = ShiftRequest.query.filter(
            ShiftRequest.employee_id.in_(emp_ids),
            ShiftRequest.status == "Approved",
            ShiftRequest.request_type == "Shift",
            ShiftRequest.from_date <= today,
            ShiftRequest.to_date >= today
        ).first()

        attendance_list.append({
            "user_id": employee.user_id,
            "employee_name": f"{employee.first_name} {employee.last_name}",
            "department": employee.department,
            "designation": employee.designation,
            "check_in": check_in,
            "check_out": check_out,
            "card_check_in": card_check_in,
            "card_check_out": card_check_out,
            "lunch_minutes": attendance.lunch_minutes if attendance else 0,
            "tea_minutes": attendance.tea_minutes if attendance else 0,
            "total_hours": total_hours,
            "attendance_date": str(today),
            "status": status,
            "is_wfh": bool(wfh_today),
            "is_shift_changed": bool(shift_change_today),
            "check_in_ip": attendance.check_in_ip if attendance else None,
            "check_out_ip": attendance.check_out_ip if attendance else None,
            "has_permission": has_permission,
            "permission_label": permission_label,
            "regularization_check_in": (
                attendance.regularization_check_in.strftime("%H:%M:%S")
                if (attendance and attendance.regularization_check_in)
                else "-"
            ),
            "regularization_check_out": (
                attendance.regularization_check_out.strftime("%H:%M:%S")
                if (attendance and attendance.regularization_check_out)
                else "-"
            ),
            "regularization_total_hours": (
                attendance.regularization_total_hours
                if attendance
                else 0.0
            ),
            "shift_timing": (
                shift_change_today.requested_shift
                if shift_change_today
                else (
                    attendance.shift_timing
                    if attendance and attendance.shift_timing
                    else employee.shift_timing or "General Shift"
                )
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



def _get_period_attendance_records(days_count, include_card_fields=False):
    """Shared by /weekly and /monthly. Batches attendance/leave/shift-request
    lookups for the whole date range up front (instead of one query per
    employee per day) and looks them up from in-memory dicts inside the loop.
    """
    from models.leave import LeaveRequest
    from models.shift_request import ShiftRequest

    result = []

    employees = [e for e in get_all_employees_cached() if (e.status or "").lower() != "inactive"]

    end_date = date.today()
    start_date = end_date - timedelta(days=days_count - 1)

    user_ids = [e.user_id for e in employees]
    leave_emp_ids = list({str(e.id) for e in employees} | {e.employee_id for e in employees if e.employee_id})
    shift_emp_ids = [e.employee_id for e in employees if e.employee_id]

    # BATCH FETCH: attendance across the whole date range
    attendances = Attendance.query.filter(
        Attendance.user_id.in_(user_ids),
        Attendance.attendance_date >= start_date,
        Attendance.attendance_date <= end_date
    ).all()
    attendance_by_key = {(a.user_id, a.attendance_date): a for a in attendances}

    # BATCH FETCH: approved leave requests overlapping the range
    leaves_by_employee = {}
    if leave_emp_ids:
        leaves = LeaveRequest.query.filter(
            LeaveRequest.employee_id.in_(leave_emp_ids),
            LeaveRequest.status == "Approved",
            LeaveRequest.from_date <= end_date,
            LeaveRequest.to_date >= start_date
        ).all()
        for lr in leaves:
            leaves_by_employee.setdefault(str(lr.employee_id), []).append(lr)

    # BATCH FETCH: approved WFH/Shift requests overlapping the range
    shift_requests_by_employee = {}
    if shift_emp_ids:
        shift_requests = ShiftRequest.query.filter(
            ShiftRequest.employee_id.in_(shift_emp_ids),
            ShiftRequest.status == "Approved",
            ShiftRequest.request_type.in_(["WFH", "Shift"]),
            ShiftRequest.from_date <= end_date,
            ShiftRequest.to_date >= start_date
        ).all()
        for sr in shift_requests:
            shift_requests_by_employee.setdefault(str(sr.employee_id), []).append(sr)

    for i in range(days_count):

        current_date = end_date - timedelta(days=i)

        for employee in employees:

            attendance = attendance_by_key.get((employee.user_id, current_date))

            if attendance:
                status = attendance.status or "Present"
                # Override to Half Day if checked out with < 4 working hours
                total_hours_period = attendance.total_hours or 0.0
                if attendance.check_out and total_hours_period < 4.0 and status not in ("Absent", "Leave"):
                    status = "Half Day"

                card_check_in = (
                    attendance.card_check_in.strftime("%I:%M %p")
                    if attendance.card_check_in
                    else "-"
                )
                card_check_out = (
                    attendance.card_check_out.strftime("%I:%M %p")
                    if attendance.card_check_out
                    else "-"
                )
            else:
                status = "Absent"
                card_check_in = "-"
                card_check_out = "-"

            if status == "Absent":
                leave = None
                for k in [k for k in (str(employee.id), employee.employee_id) if k]:
                    leave = next(
                        (lr for lr in leaves_by_employee.get(k, []) if lr.from_date <= current_date <= lr.to_date),
                        None
                    )
                    if leave:
                        break
                if leave:
                    status = "Half Day" if (leave.total_days is not None and leave.total_days <= 0.5) else "Leave"

            emp_shift_requests = shift_requests_by_employee.get(employee.employee_id, []) if employee.employee_id else []

            wfh_today = next(
                (sr for sr in emp_shift_requests if sr.request_type == "WFH" and sr.from_date <= current_date <= sr.to_date),
                None
            )
            shift_change_today = next(
                (sr for sr in emp_shift_requests if sr.request_type == "Shift" and sr.from_date <= current_date <= sr.to_date),
                None
            )

            record = {

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
                "is_wfh": bool(wfh_today),
                "is_shift_changed": bool(shift_change_today),

                "shift_timing":
                    shift_change_today.requested_shift
                    if shift_change_today
                    else (
                        attendance.shift_timing
                        if attendance and attendance.shift_timing
                        else (
                            employee.shift_timing
                            or "General Shift"
                        )
                    )
            }

            if include_card_fields:
                record["card_check_in"] = card_check_in
                record["card_check_out"] = card_check_out

            result.append(record)

    return result


@attendance_bp.route(
    "/weekly",
    methods=["GET"]
)
def get_weekly_attendance():

    try:
        result = _get_period_attendance_records(7, include_card_fields=True)
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
        result = _get_period_attendance_records(30, include_card_fields=False)
        return jsonify(result)

    except Exception as e:

        return jsonify({
            "error": str(e)
        }), 500
    
@attendance_bp.route(
    "/available-months",
    methods=["GET"]
)
@auth_required
def get_available_months():
    try:
        # Get all distinct attendance dates in the database
        dates = db.session.query(Attendance.attendance_date).distinct().all()
        
        cycles = set()
        for d_tuple in dates:
            d = d_tuple[0]
            if not d:
                continue
            # Determine cycle month and year: day >= 25 is next month
            if d.day >= 25:
                if d.month == 12:
                    cycles.add((d.year + 1, 1))
                else:
                    cycles.add((d.year, d.month + 1))
            else:
                cycles.add((d.year, d.month))
                
        # Sort descending
        sorted_cycles = sorted(list(cycles), key=lambda x: (x[0], x[1]), reverse=True)
        
        results = []
        for y, m in sorted_cycles:
            dt = date(y, m, 1)
            results.append({
                "year": y,
                "month": m,
                "label": dt.strftime("%B %Y")
            })
            
        if not results:
            today = date.today()
            results.append({
                "year": today.year,
                "month": today.month,
                "label": today.strftime("%B %Y")
            })
            
        return jsonify(results)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@attendance_bp.route(
    "/export-monthly",
    methods=["GET"]
)
@auth_required
def export_monthly_attendance():

    try:

        wb = Workbook()

        ws = wb.active

        ws.title = "Attendance Report"

        month_param = request.args.get("month")
        year_param = request.args.get("year")
        
        if month_param and year_param:
            try:
                m = int(month_param)
                y = int(year_param)
                if m == 1:
                    start_date = date(y - 1, 12, 25)
                else:
                    start_date = date(y, m - 1, 25)
                end_date = date(y, m, 24)
            except ValueError:
                today = date.today()
                if today.month == 1:
                    start_date = date(today.year - 1, 12, 25)
                else:
                    start_date = date(today.year, today.month - 1, 25)
                end_date = date(today.year, today.month, 24)
        else:
            today = date.today()
            if today.month == 1:
                start_date = date(today.year - 1, 12, 25)
            else:
                start_date = date(today.year, today.month - 1, 25)
            end_date = date(today.year, today.month, 24)

        def get_ordinal_suffix(day):
            if 11 <= day <= 13:
                return "th"
            return {1: "st", 2: "nd", 3: "rd"}.get(day % 10, "th")

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

        start_day_suff = f"{start_date.day}{get_ordinal_suffix(start_date.day)}"
        end_day_suff = f"{end_date.day}{get_ordinal_suffix(end_date.day)}"
        leaves_taken_header = (
            f"No of Leaves Taken (From "
            f"{start_day_suff} {start_date.strftime('%b')} "
            f"to "
            f"{end_day_suff} {end_date.strftime('%b')} "
            f"{end_date.strftime('%y')})"
        )
        days_in_month_header = f"No of Days in {end_date.strftime('%B %Y')}"

        # =====================================
        # TITLE
        # =====================================

        ws.merge_cells("A1:L1")

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

        ws.merge_cells("A2:L2")

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


        ws.merge_cells("A3:L3")

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
            "Designation",
            "DEPARTMENT",
            days_in_month_header,
            "Total No of Days worked",
            leaves_taken_header,
            "Absent dates",
            "Oneday Wages Days (No of Days to be Paid)",
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
        from routes.employees import is_manager_match

        manager_id = request.args.get("manager_id")
        current_user_id = get_jwt_identity()
        current_user = User.query.get(int(current_user_id)) if current_user_id else None
        is_hr_or_admin = current_user and current_user.access_level.lower() in ["admin", "hr"]

        if manager_id:
            manager_emp = Employee.query.filter_by(user_id=int(manager_id)).first()
            if manager_emp:
                manager_full_name = f"{manager_emp.first_name} {manager_emp.last_name}".strip()
                employees = [
                    e for e in get_all_employees_cached()
                    if (e.status or "").lower() != "inactive"
                    and is_manager_match(e.reporting_manager, manager_full_name)
                ]
            else:
                employees = []
        elif not is_hr_or_admin:
            if current_user:
                caller_emp = Employee.query.filter_by(user_id=current_user.id).first()
                if caller_emp:
                    manager_full_name = f"{caller_emp.first_name} {caller_emp.last_name}".strip()
                    employees = [
                        e for e in get_all_employees_cached()
                        if (e.status or "").lower() != "inactive"
                        and is_manager_match(e.reporting_manager, manager_full_name)
                    ]
                else:
                    employees = []
            else:
                employees = []
        else:
            employees = [e for e in get_all_employees_cached() if (e.status or "").lower() != "inactive"]

        # Sort employees by employee code in ascending order
        def get_emp_code_val(e):
            code = getattr(e, "employee_id", None) or getattr(e, "user_id", "")
            try:
                return int(code)
            except (ValueError, TypeError):
                return 999999
        employees = sorted(employees, key=get_emp_code_val)

        # Fetch holidays and overrides within range
        from models.holiday import Holiday, HolidayOverride
        holidays = Holiday.query.filter(Holiday.date >= start_date, Holiday.date <= end_date).all()
        overrides = HolidayOverride.query.filter(HolidayOverride.date >= start_date, HolidayOverride.date <= end_date).all()
        
        holiday_dict = {h.date: h.name for h in holidays}
        override_dict = {o.date: (o.override_type, o.name) for o in overrides}

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

            # Map attendance records by date
            attendance_by_date = {a.attendance_date: a for a in attendance_records}

            # Map approved leaves covering the dates
            emp_leaves = LeaveRequest.query.filter(
                LeaveRequest.employee_id.in_([employee.employee_id, str(employee.id)]),
                LeaveRequest.status == "Approved",
                LeaveRequest.request_type == "Leave",
                LeaveRequest.from_date <= end_date,
                LeaveRequest.to_date >= start_date
            ).all()

            total_working_days = 0.0
            total_weekoffs = 0.0
            total_holidays = 0.0
            total_paid_leaves = 0.0
            total_leaves_taken = 0.0
            total_lop_days = 0.0
            total_odw_days = 0.0

            from models.shift_request import ShiftRequest
            emp_wages = ShiftRequest.query.filter(
                ShiftRequest.employee_id.in_([employee.employee_id, str(employee.id)]),
                ShiftRequest.request_type == "One Day Wages",
                ShiftRequest.status == "Approved",
                ShiftRequest.from_date <= end_date,
                ShiftRequest.to_date >= start_date
            ).all()

            yesterday = get_ist_today() - timedelta(days=1)
            effective_end_date = min(end_date, yesterday)
            if start_date > yesterday:
                num_days_to_calculate = 0
            else:
                num_days_to_calculate = (effective_end_date - start_date).days + 1

            absent_days_data = []
            odw_days_list = []
            for i in range(num_days_to_calculate):
                d = start_date + timedelta(days=i)
                
                # Check holiday/weekoff status
                is_holiday = False
                is_week_off = False
                override = override_dict.get(d)
                if override:
                    if override[0] == "Holiday":
                        is_holiday = True
                else:
                    if d in holiday_dict:
                        is_holiday = True
                    elif is_date_week_off(d):
                        is_week_off = True

                # Check if there is an approved leave request on this date
                day_leaves = [l for l in emp_leaves if l.from_date <= d and l.to_date >= d]
                leave_val = 0.0
                is_lop_leave = False
                if day_leaves:
                    first_leave = day_leaves[0]
                    leave_type_lower = (first_leave.leave_type or "").lower()
                    is_lop_leave = "loss of pay" in leave_type_lower or "lop" in leave_type_lower or "unpaid" in leave_type_lower
                    if first_leave.total_days is not None and first_leave.total_days <= 0.5:
                        leave_val = 0.5
                    else:
                        leave_val = 1.0

                # Check if there is an approved one day wages request covering this date
                day_wages = [w for w in emp_wages if w.from_date <= d and w.to_date >= d]
                is_odw = len(day_wages) > 0
                if is_odw:
                    total_odw_days += 1.0
                    odw_days_list.append(d)

                att = attendance_by_date.get(d)
                lop_val = 0.0

                if is_odw:
                    # ODW: base holiday/weekoff if falls on one
                    if is_holiday:
                        total_holidays += 1.0
                    elif is_week_off:
                        total_weekoffs += 1.0
                elif is_holiday:
                    # Holiday:
                    if att and att.status == "Present":
                        total_working_days += 1.0
                    else:
                        total_holidays += 1.0
                elif is_week_off:
                    # Weekoff:
                    if att and att.status == "Present":
                        total_working_days += 1.0
                    else:
                        total_weekoffs += 1.0
                else:
                    # Normal Weekday:
                    effective_status = att.status if att else None
                    if att and att.status == "Leave":
                        web_hrs = att.total_hours or 0.0
                        card_hrs = att.card_working_hours or 0.0
                        max_hrs = max(web_hrs, card_hrs)
                        if max_hrs >= 4.0:
                            effective_status = "Present"
                        elif max_hrs > 0.0:
                            effective_status = "Half Day"

                    if att and effective_status == "Present":
                        total_working_days += 1.0
                    elif att and effective_status == "Half Day":
                        total_working_days += 0.5
                        if leave_val > 0.0:
                            total_leaves_taken += min(leave_val, 0.5)
                            if not is_lop_leave:
                                total_paid_leaves += min(leave_val, 0.5)
                            else:
                                total_lop_days += min(leave_val, 0.5)
                                lop_val = min(leave_val, 0.5)
                            if leave_val < 0.5:
                                total_lop_days += (0.5 - leave_val)
                                lop_val += (0.5 - leave_val)
                        else:
                            total_lop_days += 0.5
                            lop_val = 0.5
                    elif leave_val > 0.0:
                        # Approved leave overrides biometric Absent status
                        total_leaves_taken += leave_val
                        if not is_lop_leave:
                            total_paid_leaves += leave_val
                        else:
                            total_lop_days += leave_val
                            lop_val = leave_val
                        if leave_val < 1.0:
                            total_lop_days += (1.0 - leave_val)
                            lop_val += (1.0 - leave_val)
                    else:
                        total_lop_days += 1.0
                        lop_val = 1.0

                if lop_val > 0.0:
                    absent_days_data.append((d, lop_val))

            total_days_worked = total_working_days + total_weekoffs + total_holidays + total_paid_leaves
            total_days_cycle = num_days_to_calculate

            # Group absent dates by month
            from collections import defaultdict
            grouped_by_month = defaultdict(list)
            for dt, val in absent_days_data:
                month_name = dt.strftime("%b")
                day_str = str(dt.day)
                if val == 0.5:
                    day_str += "(Half)"
                grouped_by_month[month_name].append(day_str)

            seen_months = []
            for dt, val in absent_days_data:
                month_name = dt.strftime("%b")
                if month_name not in seen_months:
                    seen_months.append(month_name)

            month_parts = []
            for m_name in seen_months:
                days_list = grouped_by_month[m_name]
                month_parts.append(f"{m_name}({', '.join(days_list)})")

            absent_remarks = ", ".join(month_parts)

            # Format leave remarks
            remarks_list = []
            for leave in emp_leaves:
                if leave.from_date and leave.to_date:
                    cl_start = max(leave.from_date, start_date)
                    cl_end = min(leave.to_date, end_date)
                    
                    is_half_day = leave.total_days is not None and leave.total_days <= 0.5
                    half_day_suffix = ""
                    if is_half_day:
                        reason_text = (leave.reason or "").lower()
                        if "first half" in reason_text:
                            half_day_suffix = " (First half)"
                        elif "second half" in reason_text:
                            half_day_suffix = " (Second half)"
                        else:
                            half_day_suffix = " (Half day)"

                    if cl_start == cl_end:
                        day_suff = f"{cl_start.day}{get_ordinal_suffix(cl_start.day)}"
                        month_name = cl_start.strftime("%b")
                        remarks_list.append(f"leave on {day_suff} {month_name}{half_day_suffix}")
                    elif (cl_end - cl_start).days == 1:
                        s_suff = f"{cl_start.day}{get_ordinal_suffix(cl_start.day)}"
                        e_suff = f"{cl_end.day}{get_ordinal_suffix(cl_end.day)}"
                        if cl_start.month == cl_end.month:
                            month_name = cl_start.strftime("%b")
                            remarks_list.append(f"leave on {s_suff} and {e_suff} {month_name}")
                        else:
                            s_month = cl_start.strftime("%b")
                            e_month = cl_end.strftime("%b")
                            remarks_list.append(f"leave on {s_suff} {s_month} and {e_suff} {e_month}")
                    else:
                        s_suff = f"{cl_start.day}{get_ordinal_suffix(cl_start.day)}"
                        e_suff = f"{cl_end.day}{get_ordinal_suffix(cl_end.day)}"
                        if cl_start.month == cl_end.month:
                            month_name = cl_start.strftime("%b")
                            remarks_list.append(f"leave from {s_suff} to {e_suff} {month_name}")
                        else:
                            s_month = cl_start.strftime("%b")
                            e_month = cl_end.strftime("%b")
                            remarks_list.append(f"leave from {s_suff} {s_month} to {e_suff} {e_month}")
            leave_remarks = ", ".join(remarks_list)

            # Format ODW dates list
            odw_formatted_list = []
            for dt in odw_days_list:
                day_suff = f"{dt.day}{get_ordinal_suffix(dt.day)}"
                month_name = dt.strftime("%b")
                odw_formatted_list.append(f"{day_suff} {month_name}")
            
            if total_odw_days > 0:
                odw_count_str = str(int(total_odw_days)) if total_odw_days == int(total_odw_days) else str(total_odw_days)
                oneday_wages_val = f"{odw_count_str} ({', '.join(odw_formatted_list)})"
            else:
                oneday_wages_val = ""

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
                employee.joining_date.strftime("%d-%m-%Y")
                if hasattr(employee, "joining_date")
                and employee.joining_date
                else ""
            )

            ws.cell(
                row=row,
                column=5
            ).value = employee.designation or "-"

            ws.cell(
                row=row,
                column=6
            ).value = employee.department or "-"

            ws.cell(
               row=row,
               column=7
            ).value = total_days_cycle

            ws.cell(
               row=row,
               column=8
            ).value = total_days_worked

            ws.cell(
                row=row,
                column=9
            ).value = total_lop_days

            ws.cell(
                row=row,
                column=10
            ).value = absent_remarks

            ws.cell(
                row=row,
                column=11
            ).value = oneday_wages_val

            ws.cell(
                row=row,
                column=12
            ).value = ""

            for col in range(1, 13):

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
            f"A5:L{row}"
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

        employees = [e for e in Employee.query.all() if (e.status or "").lower() != "inactive"]

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

        employees = [e for e in get_all_employees_cached() if (e.status or "").lower() != "inactive"]

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
    employee.joining_date.strftime("%d-%m-%Y") if employee.joining_date else "",

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


def check_is_non_working_day(check_date):
    try:
        from models.holiday import Holiday, HolidayOverride
        override = HolidayOverride.query.filter_by(date=check_date).first()
        if override:
            if override.override_type == "Working Day":
                return False
            elif override.override_type in ["Holiday", "Weekly Off"]:
                return True

        holiday = Holiday.query.filter_by(date=check_date, is_published=True).first()
        if holiday:
            return True
    except Exception:
        pass

    day_name = check_date.strftime("%A")
    if day_name == "Sunday":
        return True
    elif day_name == "Saturday":
        import calendar
        weeks = calendar.monthcalendar(check_date.year, check_date.month)
        sat_count = 0
        for week in weeks:
            sat = week[5]
            if sat != 0:
                sat_count += 1
                if sat == check_date.day:
                    break
        if sat_count in [2, 4]:
            return True
        return False

    return False


def get_last_working_day(ref_date=None):
    if ref_date is None:
        ref_date = date.today() - timedelta(days=1)

    target_date = ref_date
    max_steps = 14
    steps = 0
    while check_is_non_working_day(target_date) and steps < max_steps:
        target_date -= timedelta(days=1)
        steps += 1
    return target_date


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

        if not attendance:
            # No attendance row — check if employee has approved or pending leave for this day
            from models.leave import LeaveRequest
            from sqlalchemy import or_ as sql_or
            leave = LeaveRequest.query.filter(
                sql_or(
                    LeaveRequest.employee_id == str(emp.id),
                    LeaveRequest.employee_id == emp.employee_id
                ),
                LeaveRequest.from_date <= target_date,
                LeaveRequest.to_date >= target_date
            ).filter(LeaveRequest.status.in_(["Pending", "Approved"])).first()

            if leave:
                # Confirm leave, create Leave attendance row
                attendance = Attendance(
                    user_id=target_user_id,
                    attendance_date=target_date,
                    status="Leave",
                    leave_type=leave.leave_type or "Leave",
                    manager_status="Approved",
                    check_in=None,
                    check_out=None,
                    total_hours=0.0
                )
                db.session.add(attendance)
                if leave.status == "Pending":
                    leave.status = "Approved"
                    leave.approved_by = emp.reporting_manager or "Manager"
                    leave.approved_at = datetime.now()
            else:
                # ABSENT employee who submitted regularization or leave via employee portal
                # This path should not normally be reached — employee must submit first.
                # Fallback: create a basic Absent/LOP record
                attendance = Attendance(
                    user_id=target_user_id,
                    attendance_date=target_date,
                    status="Absent",
                    manager_status="Approved",
                    is_lop=True,
                    check_in=None,
                    check_out=None,
                    total_hours=0.0
                )
                db.session.add(attendance)

        else:
            # Attendance row exists
            attendance.manager_status = "Approved"

            if attendance.is_regularization:
                # Employee submitted regularization times — apply them now
                attendance.check_in = attendance.regularization_check_in
                attendance.check_out = attendance.regularization_check_out
                attendance.total_hours = attendance.regularization_total_hours or 0.0
                
                if (attendance.total_hours or 0.0) >= 4.0:
                    attendance.status = "Present"
                else:
                    attendance.status = "Half Day"
                
                # Clear regularization fields
                attendance.is_regularization = False
                attendance.regularization_check_in = None
                attendance.regularization_check_out = None
                attendance.regularization_total_hours = 0.0
            elif attendance.status in ("Leave", "Absent"):
                # Leave confirmation — find the pending LeaveRequest and approve it
                from models.leave import LeaveRequest
                from sqlalchemy import or_ as sql_or
                leave_req = LeaveRequest.query.filter(
                    sql_or(
                        LeaveRequest.employee_id == str(emp.id),
                        LeaveRequest.employee_id == emp.employee_id
                    ),
                    LeaveRequest.from_date <= target_date,
                    LeaveRequest.to_date >= target_date,
                    LeaveRequest.status == "Pending"
                ).first()
                if leave_req:
                    attendance.status = "Leave"
                    attendance.leave_type = leave_req.leave_type
                    leave_req.status = "Approved"
                    leave_req.approved_by = emp.reporting_manager or "Manager"
                    leave_req.approved_at = datetime.now()
            else:
                # Normal present record — just flip manager_status
                # If they forgot portal punches but card punches exist, populate them
                if not attendance.check_in and attendance.card_check_in:
                    attendance.check_in = attendance.card_check_in
                if not attendance.check_out and attendance.card_check_out:
                    attendance.check_out = attendance.card_check_out
                
                # Recalculate hours if we now have check-in and check-out
                if attendance.check_in and attendance.check_out:
                    total_seconds = (attendance.check_out - attendance.check_in).total_seconds()
                    break_minutes = attendance.total_break_minutes or 0
                    if not break_minutes:
                        break_minutes = (attendance.lunch_minutes or 0) + (attendance.tea_minutes or 0)
                    gap_minutes = attendance.total_gap_minutes or 0
                    total_seconds -= (break_minutes + gap_minutes) * 60
                    hours_decimal = max(total_seconds, 0) / 3600
                    attendance.total_hours = int(hours_decimal * 100) / 100

                # Determine correct status
                web_hrs = attendance.total_hours or 0.0
                card_hrs = attendance.card_working_hours or 0.0
                max_hrs = max(web_hrs, card_hrs)

                active_hrs = max_hrs
                if not (attendance.check_out or attendance.card_check_out):
                    effective_in = attendance.check_in or attendance.card_check_in
                    if effective_in:
                        now = get_ist_now()
                        if attendance.attendance_date == now.date():
                            elapsed_seconds = (now - effective_in).total_seconds()
                            break_seconds = (attendance.total_break_minutes or 0) * 60
                            hours_decimal = max(elapsed_seconds - break_seconds, 0) / 3600
                            active_hrs = max(hours_decimal, max_hrs)

                if active_hrs >= 4.0:
                    attendance.status = "Present"
                elif attendance.check_in or attendance.card_check_in:
                    attendance.status = "Half Day"
                else:
                    attendance.status = "Absent"

        db.session.commit()

        # Emit real-time update
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
                    "manager_status": attendance.manager_status or "Approved",
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
        return jsonify({"success": False, "error": str(e)}), 500


# ─────────────────────────────────────────────────────────────────────────────
# Employee Resolution Endpoints (called from Employee Dashboard)
# ─────────────────────────────────────────────────────────────────────────────

@attendance_bp.route(
    "/submit-regularization/<int:employee_id>",
    methods=["PUT"]
)
def submit_regularization(employee_id):
    """Employee submits check-in/check-out times for an absent day (regularization request)."""
    try:
        data = request.get_json(silent=True) or {}
        target_date_str = data.get("date") or request.args.get("date")
        check_in_str = data.get("check_in")   # e.g. "09:15"
        check_out_str = data.get("check_out") # e.g. "18:30"
        reason = (data.get("reason") or "").strip()

        if not target_date_str or not check_in_str or not check_out_str:
            return jsonify({"success": False, "error": "date, check_in, and check_out are required"}), 400

        target_date = datetime.strptime(target_date_str, "%Y-%m-%d").date()

        from models.employee import Employee
        emp = Employee.query.get(employee_id)
        if not emp:
            emp = Employee.query.filter_by(employee_id=str(employee_id)).first()
        if not emp:
            emp = Employee.query.filter_by(user_id=employee_id).first()
        if not emp:
            return jsonify({"success": False, "error": "Employee not found"}), 404

        # Parse check_in / check_out as full datetime on that date
        check_in_dt = datetime.combine(target_date, datetime.strptime(check_in_str, "%H:%M").time())
        check_out_dt = datetime.combine(target_date, datetime.strptime(check_out_str, "%H:%M").time())

        target_user_id = emp.user_id if (emp and emp.user_id) else employee_id

        attendance = Attendance.query.filter_by(
            user_id=target_user_id,
            attendance_date=target_date
        ).first()

        msg_entry = {
            "id": f"msg_{int(datetime.now().timestamp())}",
            "sender_role": "employee",
            "sender_name": f"{emp.first_name} {emp.last_name}",
            "comment": f"Regularization request: {check_in_str} – {check_out_str}. {reason}",
            "timestamp": datetime.now().isoformat()
        }

        # Calculate hours decimal based on check-in and check-out (minus breaks if any)
        total_seconds = (check_out_dt - check_in_dt).total_seconds()
        break_mins = 0
        if attendance:
            break_mins = attendance.total_break_minutes or 0
            if not break_mins:
                break_mins = (attendance.lunch_minutes or 0) + (attendance.tea_minutes or 0)
        total_seconds -= break_mins * 60
        hours_decimal = max(total_seconds, 0) / 3600
        calculated_total_hours = int(hours_decimal * 100) / 100

        if not attendance:
            attendance = Attendance(
                user_id=target_user_id,
                attendance_date=target_date,
                status="Absent",
                manager_status="Clarification Provided",
                is_regularization=True,
                regularization_reason=reason,
                regularization_submitted_at=datetime.now(),
                regularization_check_in=check_in_dt,
                regularization_check_out=check_out_dt,
                regularization_total_hours=calculated_total_hours,
                check_in=None,
                check_out=None,
                total_hours=0.0,
                clarification_history=[msg_entry]
            )
            db.session.add(attendance)
        else:
            attendance.manager_status = "Clarification Provided"
            attendance.is_regularization = True
            attendance.regularization_reason = reason
            attendance.regularization_submitted_at = datetime.now()
            attendance.regularization_check_in = check_in_dt
            attendance.regularization_check_out = check_out_dt
            attendance.regularization_total_hours = calculated_total_hours
            history = list(attendance.clarification_history or [])
            history.append(msg_entry)
            attendance.clarification_history = history

        flag_modified(attendance, "clarification_history")
        flag_modified(attendance, "manager_status")
        flag_modified(attendance, "is_regularization")

        db.session.commit()

        try:
            from extensions import socketio
            socketio.emit("attendance_update", {"user_id": target_user_id, "manager_status": "Clarification Provided"})
        except Exception as socket_err:
            print("Failed to emit regularization socket:", str(socket_err))

        return jsonify({"success": True, "message": "Regularization submitted. Awaiting manager approval."})

    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 500


@attendance_bp.route(
    "/pending-regularizations/<int:manager_user_id>",
    methods=["GET"]
)
def get_pending_regularizations(manager_user_id):
    try:
        from models.employee import Employee
        from models.attendance import Attendance
        from models.user import User

        # Find manager employee record
        manager = Employee.query.filter_by(user_id=manager_user_id).first()
        
        # Check if the manager is Admin
        user = User.query.get(manager_user_id)
        is_admin = False
        if user:
            role_name = (user.role.name or "").lower() if user.role else ""
            access_level = (user.access_level or "").lower()
            if "admin" in role_name or "admin" in access_level:
                is_admin = True

        from routes.employees import get_all_employees_cached, is_manager_match

        all_employees = [e for e in get_all_employees_cached() if e.is_active != False]

        if is_admin:
            reporting_employees = all_employees
        else:
            if not manager:
                return jsonify([])
            manager_full_name = f"{manager.first_name} {manager.last_name}".strip()
            reporting_employees = [e for e in all_employees if is_manager_match(e.reporting_manager, manager_full_name)]

        reporting_user_ids = [e.user_id for e in reporting_employees if e.user_id]
        if not reporting_user_ids:
            return jsonify([])

        # Query Attendance table for pending regularizations
        pending_records = Attendance.query.filter(
            Attendance.user_id.in_(reporting_user_ids),
            Attendance.is_regularization == True
        ).order_by(Attendance.attendance_date.desc()).all()

        # Auto-fix any stuck records: is_regularization=True but already Rejected
        # These have the regularization times still saved; revert them to card times
        needs_commit = False
        for rec in pending_records:
            if rec.manager_status == "Rejected":
                rec.is_regularization = False
                rec.regularization_check_in = None
                rec.regularization_check_out = None
                rec.regularization_total_hours = 0.0
                needs_commit = True
        if needs_commit:
            db.session.commit()
            # Reload only unrejected records
            pending_records = Attendance.query.filter(
                Attendance.user_id.in_(reporting_user_ids),
                Attendance.is_regularization == True
            ).order_by(Attendance.attendance_date.desc()).all()

        results = []
        # Build lookup for employee details
        emp_lookup = {e.user_id: e for e in reporting_employees if e.user_id}

        for record in pending_records:
            emp = emp_lookup.get(record.user_id)
            emp_name = f"{emp.first_name} {emp.last_name}".strip() if emp else "Employee"
            emp_code = emp.employee_id if emp else "-"
            
            results.append({
                "id": record.id,
                "employee_id": emp.id if emp else record.user_id,
                "employee_code": emp_code,
                "employee_name": emp_name,
                "date": record.attendance_date.strftime("%Y-%m-%d"),
                "attendance_date_formatted": record.attendance_date.strftime("%d %b %Y"),
                "check_in": record.regularization_check_in.strftime("%I:%M %p") if record.regularization_check_in else "-",
                "check_out": record.regularization_check_out.strftime("%I:%M %p") if record.regularization_check_out else "-",
                "reason": record.regularization_reason or "",
                "status": record.status or "Absent",
                "manager_status": record.manager_status
            })

        return jsonify(results)
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500



@attendance_bp.route(
    "/apply-leave/<int:employee_id>",
    methods=["PUT"]
)
def apply_leave_for_absent_day(employee_id):
    """Employee applies leave for an absent day flagged by manager as Need Clarification."""
    try:
        data = request.get_json(silent=True) or {}
        target_date_str = data.get("date") or request.args.get("date")
        leave_type = (data.get("leave_type") or "Casual Leave").strip()

        if not target_date_str:
            return jsonify({"success": False, "error": "date is required"}), 400

        target_date = datetime.strptime(target_date_str, "%Y-%m-%d").date()

        from models.employee import Employee
        emp = Employee.query.get(employee_id)
        if not emp:
            emp = Employee.query.filter_by(employee_id=str(employee_id)).first()
        if not emp:
            emp = Employee.query.filter_by(user_id=employee_id).first()
        if not emp:
            return jsonify({"success": False, "error": "Employee not found"}), 404

        target_user_id = emp.user_id if (emp and emp.user_id) else employee_id

        # Deduct leave balance from employee_leave_balances table
        from models.leave import EmployeeLeaveBalance
        from sqlalchemy import func

        balance = EmployeeLeaveBalance.query.filter(
            EmployeeLeaveBalance.employee_id == emp.id,
            func.lower(EmployeeLeaveBalance.leave_type) == leave_type.lower()
        ).first()

        if not balance or balance.available < 1:
            return jsonify({"success": False, "error": f"Insufficient {leave_type} balance. Please choose LOP instead."}), 400

        balance.available -= 1

        reason = (data.get("reason") or "").strip()
        msg_entry = {
            "id": f"msg_{int(datetime.now().timestamp())}",
            "sender_role": "employee",
            "sender_name": f"{emp.first_name} {emp.last_name}",
            "comment": f"Applied {leave_type} for this absent day. Reason: {reason}",
            "timestamp": datetime.now().isoformat()
        }

        # Create corresponding LeaveRequest row so it appears in leave history
        from models.leave import LeaveRequest
        leave_req = LeaveRequest(
            employee_id=emp.employee_id,
            employee_name=f"{emp.first_name} {emp.last_name}",
            request_type="Leave",
            leave_type=leave_type,
            reporting_manager=emp.reporting_manager,
            reason=reason or f"Applied {leave_type} via clarification reply.",
            from_date=target_date,
            to_date=target_date,
            total_days=1,
            status="Pending"
        )
        db.session.add(leave_req)

        attendance = Attendance.query.filter_by(
            user_id=target_user_id,
            attendance_date=target_date
        ).first()

        if not attendance:
            attendance = Attendance(
                user_id=target_user_id,
                attendance_date=target_date,
                status="Leave",
                leave_type=leave_type,
                manager_status="Clarification Provided",
                check_in=None,
                check_out=None,
                total_hours=0.0,
                clarification_history=[msg_entry]
            )
            db.session.add(attendance)
        else:
            attendance.status = "Leave"
            attendance.leave_type = leave_type
            attendance.manager_status = "Clarification Provided"
            attendance.check_in = None
            attendance.check_out = None
            attendance.total_hours = 0.0
            history = list(attendance.clarification_history or [])
            history.append(msg_entry)
            attendance.clarification_history = history

        flag_modified(attendance, "clarification_history")
        flag_modified(attendance, "manager_status")
        flag_modified(attendance, "leave_type")

        db.session.commit()

        try:
            from extensions import socketio
            socketio.emit("attendance_update", {"user_id": target_user_id, "manager_status": "Clarification Provided"})
        except Exception as socket_err:
            print("Failed to emit leave socket:", str(socket_err))

        return jsonify({"success": True, "message": f"{leave_type} applied. Awaiting manager approval."})

    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 500


@attendance_bp.route(
    "/accept-lop/<int:employee_id>",
    methods=["PUT"]
)
def accept_lop(employee_id):
    """Employee accepts Loss of Pay for an absent day."""
    try:
        data = request.get_json(silent=True) or {}
        target_date_str = data.get("date") or request.args.get("date")

        if not target_date_str:
            return jsonify({"success": False, "error": "date is required"}), 400

        target_date = datetime.strptime(target_date_str, "%Y-%m-%d").date()

        from models.employee import Employee
        emp = Employee.query.get(employee_id)
        if not emp:
            emp = Employee.query.filter_by(user_id=employee_id).first()
        if not emp:
            return jsonify({"success": False, "error": "Employee not found"}), 404

        target_user_id = emp.user_id if (emp and emp.user_id) else employee_id

        msg_entry = {
            "id": f"msg_{int(datetime.now().timestamp())}",
            "sender_role": "employee",
            "sender_name": f"{emp.first_name} {emp.last_name}",
            "comment": "Accepted Loss of Pay (LOP) for this absent day.",
            "timestamp": datetime.now().isoformat()
        }

        attendance = Attendance.query.filter_by(
            user_id=target_user_id,
            attendance_date=target_date
        ).first()

        if not attendance:
            attendance = Attendance(
                user_id=target_user_id,
                attendance_date=target_date,
                status="Absent",
                manager_status="Clarification Provided",
                is_lop=True,
                check_in=None,
                check_out=None,
                total_hours=0.0,
                clarification_history=[msg_entry]
            )
            db.session.add(attendance)
        else:
            attendance.status = "Absent"
            attendance.manager_status = "Clarification Provided"
            attendance.is_lop = True
            attendance.check_in = None
            attendance.check_out = None
            history = list(attendance.clarification_history or [])
            history.append(msg_entry)
            attendance.clarification_history = history
            flag_modified(attendance, "clarification_history")
            flag_modified(attendance, "manager_status")
            flag_modified(attendance, "is_lop")

        db.session.commit()

        try:
            from extensions import socketio
            socketio.emit("attendance_update", {"user_id": target_user_id, "manager_status": "Clarification Provided"})
        except Exception as socket_err:
            print("Failed to emit LOP socket:", str(socket_err))

        return jsonify({"success": True, "message": "LOP accepted. Awaiting manager approval."})

    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 500




@attendance_bp.route(
    "/reject/<int:employee_id>",
    methods=["PUT"]
)
@attendance_bp.route(
    "/need-clarification/<int:employee_id>",
    methods=["PUT"]
)
def reject_attendance(employee_id):

    try:

        is_clarification = "need-clarification" in request.url.path
        target_status = "Need Clarification" if is_clarification else "Rejected"
        
        target_date_str = request.args.get("date")
        data = request.get_json(silent=True) or {}
        reason = data.get("reason") or request.args.get("reason") or ""
        
        if target_date_str:
            target_date = datetime.strptime(target_date_str, "%Y-%m-%d").date()
        else:
            target_date = get_last_working_day()

        from models.employee import Employee
        emp = Employee.query.get(employee_id)
        if not emp:
            emp = Employee.query.filter_by(user_id=employee_id).first()
        if not emp:
            return jsonify({"success": False, "error": "Employee not found"}), 404
        target_user_id = emp.user_id

        attendances = Attendance.query.filter_by(
            user_id=target_user_id,
            attendance_date=target_date
        ).all()

        msg_entry = {
            "id": f"msg_{int(datetime.now().timestamp())}",
            "sender_role": "manager",
            "sender_name": "Manager",
            "comment": reason,
            "timestamp": datetime.now().isoformat()
        }

        if not attendances:
            attendance = Attendance(
                user_id=target_user_id,
                attendance_date=target_date,
                status="Absent",
                manager_status=target_status,
                is_regularization=False,
                clarification_history=[msg_entry],
                check_in=None,
                check_out=None,
                total_hours=0.0
            )
            # Check if this day is a non-working day
            if check_is_non_working_day(target_date):
                is_weekend = target_date.weekday() in (5, 6)
                attendance.status = "Weekly Off" if is_weekend else "Holiday"
            db.session.add(attendance)
        else:
            for att in attendances:
                if not is_clarification:
                    att.check_in = att.card_check_in
                    att.check_out = att.card_check_out
                    
                    # Recalculate hours based on card check-in/out if present
                    if att.check_in and att.check_out:
                        total_seconds = (att.check_out - att.check_in).total_seconds()
                        break_minutes = att.total_break_minutes or 0
                        if not break_minutes:
                            break_minutes = (att.lunch_minutes or 0) + (att.tea_minutes or 0)
                        gap_minutes = att.total_gap_minutes or 0
                        total_seconds -= (break_minutes + gap_minutes) * 60
                        hours_decimal = max(total_seconds, 0) / 3600
                        att.total_hours = int(hours_decimal * 100) / 100
                        att.status = "Present"
                    else:
                        att.total_hours = 0.0
                        if check_is_non_working_day(target_date):
                            is_weekend = target_date.weekday() in (5, 6)
                            att.status = "Weekly Off" if is_weekend else "Holiday"
                        else:
                            att.status = "Absent"

                att.manager_status = target_status
                if not is_clarification:
                    att.is_regularization = False
                    att.regularization_check_in = None
                    att.regularization_check_out = None
                    att.regularization_total_hours = 0.0
                history = list(att.clarification_history or [])
                history.append(msg_entry)
                att.clarification_history = history
            attendance = attendances[0]

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
                    "manager_status": target_status,
                    "reason": reason,
                    "clarification_history": attendance.clarification_history or [],
                    "checked_in": (attendance and attendance.check_in is not None and attendance.check_out is None),
                    "lunch_break": attendance.lunch_break or False,
                    "tea_break": attendance.tea_break or False
                }
                socketio.emit("attendance_update", payload)
        except Exception as socket_err:
            print("Failed to emit socket:", str(socket_err))

        msg = "Need Clarification request sent successfully" if is_clarification else "Regularization request rejected successfully"
        return jsonify({
            "success": True,
            "message": msg,
            "reason": reason
        })

    except Exception as e:

        db.session.rollback()

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@attendance_bp.route(
    "/reply-clarification/<int:employee_id>",
    methods=["PUT"]
)
def reply_clarification(employee_id):
    try:
        data = request.get_json(silent=True) or {}
        reply_text = (data.get("reply") or "").strip()
        target_date_str = data.get("date") or request.args.get("date")

        if target_date_str:
            target_date = datetime.strptime(target_date_str, "%Y-%m-%d").date()
        else:
            target_date = get_last_working_day()

        from models.employee import Employee
        emp = Employee.query.get(employee_id)
        if not emp:
            emp = Employee.query.filter_by(user_id=employee_id).first()
        if not emp:
            return jsonify({"success": False, "error": "Employee not found"}), 404

        target_user_id = emp.user_id if (emp and emp.user_id) else employee_id

        attendances = Attendance.query.filter_by(
            user_id=target_user_id,
            attendance_date=target_date
        ).all()

        if not attendances:
            # If no attendance record exists for an absent day query, create the record
            att = Attendance(
                user_id=target_user_id,
                attendance_date=target_date,
                status="Absent",
                manager_status="Clarification Provided",
                clarification_history=[]
            )
            db.session.add(att)
            attendances = [att]

        msg_entry = {
            "id": f"msg_{int(datetime.now().timestamp())}",
            "sender_role": "employee",
            "sender_name": f"{emp.first_name} {emp.last_name}".strip(),
            "comment": reply_text,
            "timestamp": datetime.now().isoformat()
        }

        from sqlalchemy.orm.attributes import flag_modified

        for att in attendances:
            att.manager_status = "Clarification Provided"
            history = list(att.clarification_history or [])
            history.append(msg_entry)
            att.clarification_history = history
            flag_modified(att, "clarification_history")
            flag_modified(att, "manager_status")

        db.session.commit()

        try:
            from extensions import socketio
            socketio.emit("attendance_update", {"user_id": emp.user_id, "manager_status": "Clarification Provided"})
        except Exception as socket_err:
            print("Failed to emit reply socket:", str(socket_err))

        return jsonify({
            "success": True,
            "message": "Clarification reply submitted successfully"
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 500


@attendance_bp.route(
    "/pending-clarifications/<int:user_id>",
    methods=["GET"]
)
def get_pending_clarifications(user_id):
    try:
        from models.attendance import Attendance
        
        # Clean up any remaining 'Need Clarification' records in the database
        # by converting them to 'Rejected' and reverting the times
        need_clarif_records = Attendance.query.filter_by(
            user_id=user_id,
            manager_status="Need Clarification"
        ).order_by(Attendance.attendance_date.desc()).all()
        
        result = []
        for rec in need_clarif_records:
            check_in_time = (
                rec.check_in.strftime("%I:%M %p")
                if rec.check_in else "-"
            )
            check_out_time = (
                rec.check_out.strftime("%I:%M %p")
                if rec.check_out else "-"
            )
            card_check_in_time = (
                rec.card_check_in.strftime("%I:%M %p")
                if rec.card_check_in else "-"
            )
            card_check_out_time = (
                rec.card_check_out.strftime("%I:%M %p")
                if rec.card_check_out else "-"
            )
            break_str = f"{rec.total_break_minutes} min" if rec.total_break_minutes else "0 min"

            result.append({
                "attendance_date": rec.attendance_date.strftime("%Y-%m-%d"),
                "check_in": check_in_time,
                "check_out": check_out_time,
                "card_check_in": card_check_in_time,
                "card_check_out": card_check_out_time,
                "total_hours": rec.total_hours,
                "card_working_hours": rec.card_working_hours,
                "break_str": break_str,
                "total_break_minutes": rec.total_break_minutes or 0,
                "status": rec.status,
                "clarification_history": rec.clarification_history or []
            })

        return jsonify(result)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@attendance_bp.route(
    "/approve-all",
    methods=["PUT"]
)
def approve_all_attendance():

    try:
        manager_id = request.args.get("manager_id")
        target_date_str = request.args.get("date")
        if target_date_str:
            yesterday = datetime.strptime(target_date_str, "%Y-%m-%d").date()
        else:
            yesterday = get_last_working_day()

        if manager_id:
            from models.employee import Employee
            manager = Employee.query.filter_by(user_id=int(manager_id)).first()
            if manager:
                manager_name = f"{manager.first_name} {manager.last_name}".strip().lower()
                reporting_employees = [e for e in get_all_employees_cached() if (e.status or "").lower() != "inactive"]
                for employee in reporting_employees:
                    if not employee.reporting_manager:
                        continue
                    e_mgr = employee.reporting_manager.strip().lower()
                    is_match = (e_mgr == manager_name) or (len(e_mgr.split()) == 1 and manager_name.split()[0] == e_mgr) or (len(manager_name.split()) == 1 and e_mgr.split()[0] == manager_name)
                    if is_match:
                        attendances = Attendance.query.filter_by(
                            user_id=employee.user_id,
                            attendance_date=yesterday
                        ).all()
                        if not attendances:
                            attendance = Attendance(
                                user_id=employee.user_id,
                                attendance_date=yesterday,
                                status="Absent",
                                manager_status="Approved",
                                check_in=None,
                                check_out=None,
                                total_hours=0.0
                            )
                            db.session.add(attendance)
                        else:
                            for att in attendances:
                                if att.manager_status != "Need Clarification":
                                    att.manager_status = "Approved"
        else:
            attendances = Attendance.query.filter_by(
                attendance_date=yesterday
            ).all()
            for attendance in attendances:
                if attendance.manager_status != "Need Clarification":
                    attendance.manager_status = "Approved"

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


@attendance_bp.route(
    "/reject-all",
    methods=["PUT"]
)
def reject_all_attendance():

    try:
        manager_id = request.args.get("manager_id")
        target_date_str = request.args.get("date")
        data = request.get_json(silent=True) or {}
        reason = data.get("reason") or request.args.get("reason") or ""

        if target_date_str:
            yesterday = datetime.strptime(target_date_str, "%Y-%m-%d").date()
        else:
            yesterday = get_last_working_day()

        if manager_id:
            from models.employee import Employee
            manager = Employee.query.filter_by(user_id=int(manager_id)).first()
            if manager:
                manager_name = f"{manager.first_name} {manager.last_name}".strip().lower()
                reporting_employees = [e for e in get_all_employees_cached() if (e.status or "").lower() != "inactive"]
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
                                status="Absent",
                                manager_status="Rejected",
                                rejection_reason=reason,
                                check_in=None,
                                check_out=None,
                                total_hours=0.0
                            )
                            db.session.add(attendance)
                        else:
                            attendance.manager_status = "Rejected"
                            attendance.rejection_reason = reason
        else:
            attendances = Attendance.query.filter_by(
                attendance_date=yesterday
            ).all()
            for attendance in attendances:
                attendance.manager_status = "Rejected"
                attendance.rejection_reason = reason

        db.session.commit()

        try:
            from extensions import socketio
            socketio.emit("attendance_approved_all", {"status": "Rejected", "reason": reason})
        except Exception as socket_err:
            print("Failed to emit reject-all socket:", str(socket_err))

        return jsonify({
            "success": True,
            "message": "All attendance rejected",
            "reason": reason
        })

    except Exception as e:

        db.session.rollback()

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@attendance_bp.route("/upload-excel", methods=["POST"])
def upload_attendance_excel():
    try:
        import xlrd
        from datetime import time
        
        if "file" not in request.files:
            return jsonify({"success": False, "error": "No file uploaded"}), 400
            
        file = request.files["file"]
        if not file or not file.filename.endswith((".xls", ".xlsx")):
            return jsonify({"success": False, "error": "Invalid file format. Please upload an .xls or .xlsx file"}), 400

        # Read Excel content directly in memory
        file_contents = file.read()
        
        # Check if legacy XLS
        if file.filename.endswith(".xls"):
            workbook = xlrd.open_workbook(file_contents=file_contents)
            sheet = workbook.sheet_by_index(0)
            
            # Read Attendance Date from Row index 6, Column index 4
            att_date_raw = sheet.cell_value(6, 4)
            if not att_date_raw:
                return jsonify({"success": False, "error": "Could not locate report date in Excel sheet"}), 400
                
            att_date_str = str(att_date_raw).strip()
            try:
                parsed_date = datetime.strptime(att_date_str, "%d-%b-%Y").date()
            except Exception as de:
                return jsonify({"success": False, "error": f"Failed to parse report date '{att_date_str}': {str(de)}"}), 400

            print("Standardized Excel Upload Date:", parsed_date)
            
            # Loop starting from Row index 10 (11th row)
            r = 10
            processed_count = 0
            batch_attendance = {}
            
            while r < sheet.nrows:
                sno_val = sheet.cell_value(r, 1) # Column 2
                e_code_val = sheet.cell_value(r, 2) # Column 3
                
                # Stop if both columns are empty
                if not sno_val and not e_code_val:
                    break
                    
                # Convert E. Code to string
                if isinstance(e_code_val, float):
                    e_code = str(int(e_code_val))
                else:
                    e_code = str(e_code_val).strip()
                    
                sno_str = str(sno_val).strip()
                
                # Skip header/duplicates/non-records
                if not e_code or e_code == "E. Code" or not sno_str.replace(".0", "").isdigit():
                    r += 1
                    continue
                    
                status = str(sheet.cell_value(r, 13)).strip() # Column 14 (Status)
                if status == "Absent":
                    r += 1
                    continue
                    
                in_time_val = sheet.cell_value(r, 7) # Column 8 (InTime)
                out_time_val = sheet.cell_value(r, 8) # Column 9 (OutTime)
                
                # Convert In/Out values to string time representation
                def get_time_str(cell_val):
                    if not cell_val:
                        return ""
                    val_str = str(cell_val).strip()
                    if val_str == "--:--" or val_str == "0.0" or val_str == "0":
                        return ""
                    if isinstance(cell_val, float) and 0.0 < cell_val < 1.0:
                        total_minutes = int(cell_val * 24 * 60)
                        hours = total_minutes // 60
                        minutes = total_minutes % 60
                        return f"{hours:02d}:{minutes:02d}"
                    return val_str
                    
                in_time_str = get_time_str(in_time_val)
                out_time_str = get_time_str(out_time_val)
                
                # Skip if no punches
                if not in_time_str and not out_time_str:
                    r += 1
                    continue
                    
                # Find employee
                from models.employee import Employee
                employee = Employee.query.filter_by(employee_id=e_code).first()
                if not employee:
                    print(f"Excel skip: Employee '{e_code}' not found")
                    r += 1
                    continue
                    
                cache_key = (employee.user_id, parsed_date)
                if cache_key in batch_attendance:
                    attendance = batch_attendance[cache_key]
                else:
                    attendance = Attendance.query.filter_by(
                        user_id=employee.user_id,
                        attendance_date=parsed_date
                    ).first()
                    
                    if not attendance:
                        attendance = Attendance(
                            user_id=employee.user_id,
                            attendance_date=parsed_date,
                            status="Present",
                            shift_timing=employee.shift_timing or "General Shift"
                        )
                        db.session.add(attendance)
                    batch_attendance[cache_key] = attendance
                    
                # Parse log datetime
                if in_time_str:
                    time_parts = list(map(int, in_time_str.split(":")))
                    card_in_dt = datetime.combine(parsed_date, time(time_parts[0], time_parts[1]))
                    if not attendance.card_check_in:
                        attendance.card_check_in = card_in_dt
                    else:
                        attendance.card_check_in = min(attendance.card_check_in, card_in_dt)
                        
                if out_time_str:
                    time_parts = list(map(int, out_time_str.split(":")))
                    card_out_dt = datetime.combine(parsed_date, time(time_parts[0], time_parts[1]))
                    if not attendance.card_check_out:
                        attendance.card_check_out = card_out_dt
                    else:
                        attendance.card_check_out = max(attendance.card_check_out, card_out_dt)
                        
                # Calculate hours
                if attendance.card_check_in and attendance.card_check_out:
                    total_seconds = (attendance.card_check_out - attendance.card_check_in).total_seconds()
                    hours_decimal = max(total_seconds, 0) / 3600
                    attendance.card_working_hours = int(hours_decimal * 100) / 100
                else:
                    attendance.card_working_hours = 0.0
                    
                # Recalculate Status
                web_hrs = attendance.total_hours or 0.0
                card_hrs = attendance.card_working_hours or 0.0
                max_hrs = max(web_hrs, card_hrs)
                
                if max_hrs >= 4.0:
                    attendance.status = "Present"
                elif max_hrs > 0.0 or attendance.check_in or attendance.card_check_in:
                    attendance.status = "Half Day"
                else:
                    attendance.status = "Absent"
                    
                processed_count += 1
                
                # Emit socket event
                try:
                    from extensions import socketio
                    web_in = attendance.check_in.strftime("%I:%M %p") if attendance.check_in else None
                    web_out = attendance.check_out.strftime("%I:%M %p") if attendance.check_out else None
                    card_in = attendance.card_check_in.strftime("%I:%M %p") if attendance.card_check_in else None
                    card_out = attendance.card_check_out.strftime("%I:%M %p") if attendance.card_check_out else None
                    
                    payload = {
                        "id": employee.id,
                        "user_id": employee.user_id,
                        "attendance_status": attendance.status,
                        "check_in": web_in,
                        "check_out": web_out,
                        "working_hours": attendance.total_hours or 0.0,
                        "card_check_in": card_in,
                        "card_check_out": card_out,
                        "card_working_hours": attendance.card_working_hours or 0.0,
                        "shift": employee.shift_timing or "General Shift",
                        "manager_status": attendance.manager_status or "Pending",
                        "checked_in": (attendance.check_in is not None and attendance.check_out is None),
                        "card_checked_in": (attendance.card_check_in is not None and attendance.card_check_out is None),
                    }
                    socketio.emit("attendance_update", payload)
                except Exception as se:
                    print("Socket emit error during Excel upload:", se)
                    
                r += 1
                
            db.session.commit()
            return jsonify({"success": True, "message": f"Successfully processed {processed_count} employee records"}), 200
        else:
            return jsonify({"success": False, "error": "Only .xls legacy format is currently supported"}), 400
            
    except Exception as e:
        db.session.rollback()
        print("EXCEL UPLOAD ERROR:", str(e))
        return jsonify({"success": False, "error": str(e)}), 500
@attendance_bp.route("/update-attendance-record", methods=["POST"])
@jwt_required()
def update_attendance_record():
    try:
        from models.attendance import Attendance
        from models.employee import Employee
        from models.user import User
        
        current_user_id = get_jwt_identity()
        current_user = User.query.get(int(current_user_id))
        
        # Verify if caller is manager/admin/hr
        if not current_user or current_user.access_level.lower() not in ["manager", "admin", "hr"]:
            return jsonify({"success": False, "error": "Access denied"}), 403
            
        data = request.json
        employee_id = data.get("employee_id") # can be int id
        attendance_date_str = data.get("attendance_date") # YYYY-MM-DD
        status = data.get("status")
        
        check_in_str = data.get("check_in") # HH:MM AM/PM or None
        check_out_str = data.get("check_out") # HH:MM AM/PM or None
        card_check_in_str = data.get("card_check_in") # HH:MM AM/PM or None
        card_check_out_str = data.get("card_check_out") # HH:MM AM/PM or None
        
        emp = None
        try:
            emp = Employee.query.get(int(employee_id))
        except Exception:
            pass
        if not emp:
            emp = Employee.query.filter_by(employee_id=str(employee_id)).first()
        if not emp:
            return jsonify({"success": False, "error": f"Employee not found for ID: {employee_id}"}), 404
            
        att_date = datetime.strptime(attendance_date_str, "%Y-%m-%d").date()
        
        # Query attendance record for this date
        attendance = Attendance.query.filter_by(
            user_id=emp.user_id,
            attendance_date=att_date
        ).first()
        
        # Parse helper for check-in/out times (HH:MM AM/PM to datetime)
        def parse_time_str(time_str, base_date):
            if not time_str or time_str == "-":
                return None
            try:
                # Expecting format like "09:00 AM"
                t = datetime.strptime(time_str.strip(), "%I:%M %p").time()
                return datetime.combine(base_date, t)
            except ValueError:
                try:
                    # Fallback to "09:00:00" format
                    t = datetime.strptime(time_str.strip(), "%H:%M:%S").time()
                    return datetime.combine(base_date, t)
                except ValueError:
                    try:
                        # Fallback to "09:00" format
                        t = datetime.strptime(time_str.strip(), "%H:%M").time()
                        return datetime.combine(base_date, t)
                    except ValueError:
                        return None

        parsed_check_in = parse_time_str(check_in_str, att_date)
        parsed_check_out = parse_time_str(check_out_str, att_date)
        parsed_card_check_in = parse_time_str(card_check_in_str, att_date)
        parsed_card_check_out = parse_time_str(card_check_out_str, att_date)
        
        lunch_minutes = int(data.get("lunch_minutes") or 0)
        tea_minutes = int(data.get("tea_minutes") or 0)

        if not attendance:
            # Create a new attendance record if it doesn't exist
            attendance = Attendance(
                user_id=emp.user_id,
                attendance_date=att_date,
                status=status,
                check_in=parsed_check_in,
                check_out=parsed_check_out,
                card_check_in=parsed_card_check_in,
                card_check_out=parsed_card_check_out,
                lunch_minutes=lunch_minutes,
                tea_minutes=tea_minutes,
                total_break_minutes=lunch_minutes + tea_minutes,
                manager_status="Approved"
            )
            db.session.add(attendance)
        else:
            # Update existing record
            attendance.status = status
            attendance.check_in = parsed_check_in
            attendance.check_out = parsed_check_out
            attendance.card_check_in = parsed_card_check_in
            attendance.card_check_out = parsed_card_check_out
            attendance.lunch_minutes = lunch_minutes
            attendance.tea_minutes = tea_minutes
            attendance.total_break_minutes = lunch_minutes + tea_minutes
            attendance.manager_status = "Approved"

        # Calculate working hours if both check-in and check-out are present
        if attendance.check_in and attendance.check_out:
            diff_seconds = (attendance.check_out - attendance.check_in).total_seconds()
            break_minutes = attendance.total_break_minutes or 0
            gap_minutes = attendance.total_gap_minutes or 0
            diff_seconds -= (break_minutes + gap_minutes) * 60
            attendance.total_hours = max(0.0, int((diff_seconds / 3600.0) * 100) / 100)
        else:
            attendance.total_hours = 0.0

        if attendance.card_check_in and attendance.card_check_out:
            diff_seconds = (attendance.card_check_out - attendance.card_check_in).total_seconds()
            attendance.card_working_hours = max(0.0, round(diff_seconds / 3600.0, 2))
        else:
            attendance.card_working_hours = 0.0
            
        db.session.commit()
        return jsonify({"success": True, "message": "Attendance record updated successfully"})
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 500


@attendance_bp.route("/trigger-db-sync", methods=["POST"])
def trigger_db_sync():
    try:
        mysql_host = os.environ.get("MYSQL_BIOMETRIC_HOST", "10.1.8.49")
        mysql_port = int(os.environ.get("MYSQL_BIOMETRIC_PORT", 3306))
        mysql_user = os.environ.get("MYSQL_BIOMETRIC_USER", "Muralibalu")
        mysql_password = os.environ.get("MYSQL_BIOMETRIC_PASSWORD", "Murali@12")
        mysql_db = os.environ.get("MYSQL_BIOMETRIC_DB", "TimeTrack")

        if not mysql_password:
            return jsonify({
                "success": False,
                "error": "MYSQL_BIOMETRIC_PASSWORD is not set in environment (.env)"
            }), 400

        # 1. Connect to MySQL database
        connection = pymysql.connect(
            host=mysql_host,
            port=mysql_port,
            user=mysql_user,
            password=mysql_password,
            database=mysql_db,
            cursorclass=pymysql.cursors.DictCursor
        )
        
        # 2. Query absolute MIN and MAX punch times per employee per day for the last 30 days
        with connection.cursor() as cursor:
            sql = """
                SELECT 
                    EmployeeCode,
                    MIN(LogDateTime) AS FirstPunch,
                    MAX(LogDateTime) AS LastPunch
                FROM AttendanceLogs
                WHERE LogDate >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
                  AND LogDate < CURDATE()
                GROUP BY EmployeeCode, LogDate
            """
            cursor.execute(sql)
            rows = cursor.fetchall()
            
        connection.close()
        
        if not rows:
            return jsonify({
                "success": True,
                "message": "No biometric logs found in MySQL for the last 30 days"
            }), 200

        # 3. Process logs directly per employee per day
        processed_count = 0
        
        for row in rows:
            emp_code = str(row["EmployeeCode"]).strip()
            first_punch = row["FirstPunch"]
            last_punch = row["LastPunch"]

            if not first_punch:
                continue

            employee = Employee.query.filter_by(employee_id=emp_code).first()
            if not employee:
                continue

            att_date = first_punch.date()

            # Ignore same day (today) entries
            if att_date == get_ist_today():
                continue

            # Find existing or create new attendance
            attendance = Attendance.query.filter_by(
                user_id=employee.user_id,
                attendance_date=att_date
            ).first()

            # Determine target values
            target_check_in = first_punch
            target_check_out = last_punch if last_punch != first_punch else None

            # Skip if we already have the exact same biometric details in the DB
            # (No need to update same date details if already synced and identical)
            if attendance:
                if attendance.card_check_in == target_check_in and attendance.card_check_out == target_check_out:
                    continue

            if not attendance:
                attendance = Attendance(
                    user_id=employee.user_id,
                    attendance_date=att_date,
                    status="Present",
                    shift_timing=employee.shift_timing or "General Shift"
                )
                db.session.add(attendance)

            # Update biometric check-in and check-out
            attendance.card_check_in = target_check_in
            attendance.card_check_out = target_check_out

            # Recalculate card working hours
            if attendance.card_check_in and attendance.card_check_out:
                total_seconds = (attendance.card_check_out - attendance.card_check_in).total_seconds()
                hours_decimal = max(total_seconds, 0) / 3600
                attendance.card_working_hours = int(hours_decimal * 100) / 100
            else:
                attendance.card_working_hours = 0.0

            # Recalculate status
            web_hrs = attendance.total_hours or 0.0
            card_hrs = attendance.card_working_hours or 0.0
            max_hrs = max(web_hrs, card_hrs)

            active_hrs = max_hrs
            if not (attendance.check_out or attendance.card_check_out):
                effective_in = attendance.check_in or attendance.card_check_in
                if effective_in:
                    now = get_ist_now()
                    if attendance.attendance_date == now.date():
                        elapsed_seconds = (now - effective_in).total_seconds()
                        break_seconds = (attendance.total_break_minutes or 0) * 60
                        hours_decimal = max(elapsed_seconds - break_seconds, 0) / 3600
                        active_hrs = max(hours_decimal, max_hrs)

            if active_hrs >= 4.0:
                attendance.status = "Present"
            elif attendance.check_in or attendance.card_check_in:
                attendance.status = "Half Day"
            else:
                attendance.status = "Absent"

            processed_count += 1

            # Emit Socket.IO updates for live dashboard
            try:
                from extensions import socketio
                web_in_str = attendance.check_in.strftime("%I:%M %p") if attendance.check_in else None
                web_out_str = attendance.check_out.strftime("%I:%M %p") if attendance.check_out else None
                card_in_str = attendance.card_check_in.strftime("%I:%M %p") if attendance.card_check_in else None
                card_out_str = attendance.card_check_out.strftime("%I:%M %p") if attendance.card_check_out else None

                # Determine UI status
                ui_status = "Absent"
                if attendance.check_in or attendance.card_check_in:
                    if attendance.check_in and not attendance.check_out:
                        ui_status = "Present"
                    elif attendance.check_out or attendance.card_check_out:
                        from datetime import date
                        is_today = (attendance.attendance_date == date.today())
                        if is_today and attendance.card_check_out and not attendance.check_out:
                            punch_out_hour = attendance.card_check_out.hour
                            working_hrs = attendance.card_working_hours or 0.0
                            if punch_out_hour >= 15 or working_hrs >= 4.0:
                                ui_status = "Checked Out"
                            else:
                                ui_status = "Present"
                        else:
                            ui_status = "Checked Out"
                    else:
                        ui_status = "Present"
                else:
                    ui_status = "Absent"

                payload = {
                    "id": employee.id,
                    "user_id": employee.user_id,
                    "attendance_status": ui_status,
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
                print("Socket emit error during db sync:", se)

        db.session.commit()
        return jsonify({
            "success": True,
            "message": f"Successfully synced {processed_count} logs from Biometric DB"
        }), 200

    except Exception as e:
        db.session.rollback()
        print("DB SYNC TRIGGER ERROR:", str(e))
        return jsonify({
            "success": False,
            "error": f"Failed to sync database: {str(e)}"
        }), 500


@attendance_bp.route("/db-check", methods=["GET"])
def db_check_temp():
    try:
        from models.employee import Employee
        from models.attendance import Attendance
        employees = Employee.query.all()
        emp_list = []
        for emp in employees:
            emp_list.append({
                "id": emp.id,
                "user_id": emp.user_id,
                "name": f"{emp.first_name} {emp.last_name}",
                "manager": emp.reporting_manager,
                "employee_id": emp.employee_id
            })
        
        regs = Attendance.query.filter((Attendance.is_regularization == True) | (Attendance.manager_status == "Clarification Provided")).all()
        reg_list = []
        for rec in regs:
            reg_list.append({
                "id": rec.id,
                "user_id": rec.user_id,
                "date": str(rec.attendance_date),
                "check_in": str(rec.check_in),
                "check_out": str(rec.check_out),
                "manager_status": rec.manager_status,
                "is_regularization": rec.is_regularization,
                "reason": rec.regularization_reason
            })
            
        return jsonify({
            "employees": emp_list,
            "regularizations": reg_list
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500