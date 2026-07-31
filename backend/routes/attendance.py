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
import os
import pymysql



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
        emp_ids = [employee.id]
        if employee.employee_id:
            try:
                emp_ids.append(int(employee.employee_id))
            except ValueError:
                pass

        approved_request = ShiftRequest.query.filter(
            ShiftRequest.employee_id.in_(emp_ids),
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
            for e in [e for e in Employee.query.all() if (e.status or "").lower() != "inactive"]:
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
                hours_decimal = max(total_seconds, 0) / 3600
                attendance.card_working_hours = int(hours_decimal * 100) / 100
            else:
                attendance.card_working_hours = 0.0

            # Recalculate status
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
        attendance_date=get_ist_today(),
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
            attendance_date=get_ist_today(),
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
def tea_break():

    try:

        data = request.json

        attendance = Attendance.query.filter_by(
            user_id=data["user_id"],
            attendance_date=get_ist_today(),
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
    
    holiday_dict = {h.date: h.name for h in holidays}
    override_dict = {o.date: (o.override_type, o.name) for o in overrides}

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

                # Derive display status: override to Half Day if < 4 working hours
                base_status = record.status or "Present"
                if base_status not in ("Absent", "Leave") and working_hours < 4.0 and working_hours > 0:
                    display_status = "Half Day"
                else:
                    display_status = base_status

                result.append({
                    "id": record.id,
                    "date": record.attendance_date.strftime("%Y-%m-%d"),
                    "attendance_date": record.attendance_date.strftime("%Y-%m-%d"),
                    "attendance_date_formatted": record.attendance_date.strftime("%d %b %Y"),
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
                    "clarification_history": record.clarification_history or [],
                    "last_manager_comment": (record.clarification_history[-1]["comment"] if record.clarification_history and record.clarification_history[-1].get("sender_role") == "manager" else "") or ""
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
                            LeaveRequest.employee_id == str(employee.id),
                            LeaveRequest.status == "Approved",
                            LeaveRequest.from_date <= current_date,
                            LeaveRequest.to_date >= current_date
                        ).first()
                        status = "Leave" if leave else "Absent"
                else:
                    # 2. Check Holiday table
                    if current_date in holiday_dict:
                        status = "Holiday"
                    # 3. Check weekend (Saturday=5, Sunday=6)
                    elif current_date.weekday() in (5, 6):
                        status = "Week Off"
                    # 4. Check approved leaves
                    else:
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
                    "attendance_date": current_date.strftime("%Y-%m-%d"),
                    "attendance_date_formatted": current_date.strftime("%d %b %Y"),
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
                    "last_manager_comment": ""
                })

    return jsonify(result)


@attendance_bp.route("/", methods=["GET"])
def get_attendance():

    today = get_ist_today()

    employees = [e for e in Employee.query.all() if (e.status or "").lower() != "inactive"]

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

            total_hours = attendance.total_hours or 0.0

            # Override to Half Day if checked out with < 4 working hours
            if attendance.check_out and total_hours < 4.0 and status not in ("Absent", "Leave"):
                status = "Half Day"

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

        from models.shift_request import ShiftRequest
        emp_ids = [employee.id]
        if employee.employee_id:
            try:
                emp_ids.append(int(employee.employee_id))
            except ValueError:
                pass

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
            "total_hours": total_hours,
            "attendance_date": str(today),
            "status": status,
            "is_wfh": bool(wfh_today),
            "is_shift_changed": bool(shift_change_today),

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



@attendance_bp.route(
    "/weekly",
    methods=["GET"]
)
def get_weekly_attendance():

    try:

        result = []

        employees = [e for e in Employee.query.all() if (e.status or "").lower() != "inactive"]

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
                    # Override to Half Day if checked out with < 4 working hours
                    total_hours_weekly = attendance.total_hours or 0.0
                    if attendance.check_out and total_hours_weekly < 4.0 and status not in ("Absent", "Leave"):
                        status = "Half Day"
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

                from models.shift_request import ShiftRequest
                emp_ids = [employee.id]
                if employee.employee_id:
                    try:
                        emp_ids.append(int(employee.employee_id))
                    except ValueError:
                        pass

                wfh_today = ShiftRequest.query.filter(
                    ShiftRequest.employee_id.in_(emp_ids),
                    ShiftRequest.status == "Approved",
                    ShiftRequest.request_type == "WFH",
                    ShiftRequest.from_date <= current_date,
                    ShiftRequest.to_date >= current_date
                ).first()

                shift_change_today = ShiftRequest.query.filter(
                    ShiftRequest.employee_id.in_(emp_ids),
                    ShiftRequest.status == "Approved",
                    ShiftRequest.request_type == "Shift",
                    ShiftRequest.from_date <= current_date,
                    ShiftRequest.to_date >= current_date
                ).first()

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

        employees = [e for e in Employee.query.all() if (e.status or "").lower() != "inactive"]

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
                    # Override to Half Day if checked out with < 4 working hours
                    total_hours_monthly = attendance.total_hours or 0.0
                    if attendance.check_out and total_hours_monthly < 4.0 and status not in ("Absent", "Leave"):
                        status = "Half Day"
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

                from models.shift_request import ShiftRequest
                emp_ids = [employee.id]
                if employee.employee_id:
                    try:
                        emp_ids.append(int(employee.employee_id))
                    except ValueError:
                        pass

                wfh_today = ShiftRequest.query.filter(
                    ShiftRequest.employee_id.in_(emp_ids),
                    ShiftRequest.status == "Approved",
                    ShiftRequest.request_type == "WFH",
                    ShiftRequest.from_date <= current_date,
                    ShiftRequest.to_date >= current_date
                ).first()

                shift_change_today = ShiftRequest.query.filter(
                    ShiftRequest.employee_id.in_(emp_ids),
                    ShiftRequest.status == "Approved",
                    ShiftRequest.request_type == "Shift",
                    ShiftRequest.from_date <= current_date,
                    ShiftRequest.to_date >= current_date
                ).first()

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

        employees = [e for e in Employee.query.all() if (e.status or "").lower() != "inactive"]

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

        employees = [e for e in Employee.query.all() if (e.status or "").lower() != "inactive"]

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
                # Employee submitted regularization times — calculate hours now
                if attendance.check_in and attendance.check_out:
                    total_seconds = (attendance.check_out - attendance.check_in).total_seconds()
                    break_minutes = attendance.total_break_minutes or 0
                    gap_minutes = attendance.total_gap_minutes or 0
                    total_seconds -= (break_minutes + gap_minutes) * 60
                    hours_decimal = max(total_seconds, 0) / 3600
                    attendance.total_hours = int(hours_decimal * 100) / 100
                attendance.status = "Present"
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
                # Normal present record — just flip manager_status, do NOT recalculate hours
                attendance.status = "Present"

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
        emp = Employee.query.filter_by(user_id=employee_id).first()
        if not emp:
            emp = Employee.query.get(employee_id)
        if not emp:
            return jsonify({"success": False, "error": "Employee not found"}), 404

        # Parse check_in / check_out as full datetime on that date
        check_in_dt = datetime.combine(target_date, datetime.strptime(check_in_str, "%H:%M").time())
        check_out_dt = datetime.combine(target_date, datetime.strptime(check_out_str, "%H:%M").time())

        attendance = Attendance.query.filter_by(
            user_id=emp.user_id,
            attendance_date=target_date
        ).first()

        msg_entry = {
            "id": f"msg_{int(datetime.now().timestamp())}",
            "sender_role": "employee",
            "sender_name": f"{emp.first_name} {emp.last_name}",
            "comment": f"Regularization request: {check_in_str} – {check_out_str}. {reason}",
            "timestamp": datetime.now().isoformat()
        }

        # Calculate hours decimal based on check-in and check-out
        total_seconds = (check_out_dt - check_in_dt).total_seconds()
        hours_decimal = max(total_seconds, 0) / 3600
        calculated_total_hours = int(hours_decimal * 100) / 100

        if not attendance:
            attendance = Attendance(
                user_id=emp.user_id,
                attendance_date=target_date,
                status="Present",
                manager_status="Need Clarification",
                is_regularization=True,
                regularization_reason=reason,
                regularization_submitted_at=datetime.now(),
                check_in=check_in_dt,
                check_out=check_out_dt,
                total_hours=calculated_total_hours,
                clarification_history=[msg_entry]
            )
            db.session.add(attendance)
        else:
            attendance.status = "Present"
            attendance.manager_status = "Need Clarification"
            attendance.is_regularization = True
            attendance.regularization_reason = reason
            attendance.regularization_submitted_at = datetime.now()
            attendance.check_in = check_in_dt
            attendance.check_out = check_out_dt
            attendance.total_hours = calculated_total_hours
            history = list(attendance.clarification_history or [])
            history.append(msg_entry)
            attendance.clarification_history = history

        db.session.commit()
        return jsonify({"success": True, "message": "Regularization submitted. Awaiting manager approval."})

    except Exception as e:
        db.session.rollback()
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
        emp = Employee.query.filter_by(user_id=employee_id).first()
        if not emp:
            emp = Employee.query.get(employee_id)
        if not emp:
            return jsonify({"success": False, "error": "Employee not found"}), 404

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
            user_id=emp.user_id,
            attendance_date=target_date
        ).first()

        if not attendance:
            attendance = Attendance(
                user_id=emp.user_id,
                attendance_date=target_date,
                status="Leave",
                leave_type=leave_type,
                manager_status="Need Clarification",
                check_in=None,
                check_out=None,
                total_hours=0.0,
                clarification_history=[msg_entry]
            )
            db.session.add(attendance)
        else:
            attendance.status = "Leave"
            attendance.leave_type = leave_type
            attendance.manager_status = "Need Clarification"
            attendance.check_in = None
            attendance.check_out = None
            attendance.total_hours = 0.0
            history = list(attendance.clarification_history or [])
            history.append(msg_entry)
            attendance.clarification_history = history

        db.session.commit()
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
        emp = Employee.query.filter_by(user_id=employee_id).first()
        if not emp:
            emp = Employee.query.get(employee_id)
        if not emp:
            return jsonify({"success": False, "error": "Employee not found"}), 404

        msg_entry = {
            "id": f"msg_{int(datetime.now().timestamp())}",
            "sender_role": "employee",
            "sender_name": f"{emp.first_name} {emp.last_name}",
            "comment": "Accepted Loss of Pay (LOP) for this absent day.",
            "timestamp": datetime.now().isoformat()
        }

        attendance = Attendance.query.filter_by(
            user_id=emp.user_id,
            attendance_date=target_date
        ).first()

        if not attendance:
            attendance = Attendance(
                user_id=emp.user_id,
                attendance_date=target_date,
                status="Absent",
                manager_status="Need Clarification",
                is_lop=True,
                check_in=None,
                check_out=None,
                total_hours=0.0,
                clarification_history=[msg_entry]
            )
            db.session.add(attendance)
        else:
            attendance.status = "Absent"
            attendance.manager_status = "Need Clarification"
            attendance.is_lop = True
            attendance.check_in = None
            attendance.check_out = None
            history = list(attendance.clarification_history or [])
            history.append(msg_entry)
            attendance.clarification_history = history

        db.session.commit()
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
                manager_status="Need Clarification",
                clarification_history=[msg_entry],
                check_in=None,
                check_out=None,
                total_hours=0.0
            )
            db.session.add(attendance)
        else:
            for att in attendances:
                att.manager_status = "Need Clarification"
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
                    "manager_status": attendance.manager_status or "Need Clarification",
                    "reason": reason,
                    "clarification_history": attendance.clarification_history or [],
                    "checked_in": (attendance and attendance.check_in is not None and attendance.check_out is None),
                    "lunch_break": attendance.lunch_break or False,
                    "tea_break": attendance.tea_break or False
                }
                socketio.emit("attendance_update", payload)
        except Exception as socket_err:
            print("Failed to emit reject socket:", str(socket_err))

        return jsonify({
            "success": True,
            "message": "Clarification requested",
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
        emp = Employee.query.filter_by(user_id=employee_id).first()
        if not emp:
            emp = Employee.query.get(employee_id)
        if not emp:
            return jsonify({"success": False, "error": "Employee not found"}), 404

        attendances = Attendance.query.filter_by(
            user_id=emp.user_id,
            attendance_date=target_date
        ).all()

        if not attendances:
            return jsonify({"success": False, "error": "Attendance record not found"}), 404

        msg_entry = {
            "id": f"msg_{int(datetime.now().timestamp())}",
            "sender_role": "employee",
            "sender_name": f"{emp.first_name} {emp.last_name}".strip(),
            "comment": reply_text,
            "timestamp": datetime.now().isoformat()
        }

        for att in attendances:
            att.manager_status = "Clarification Provided"
            history = list(att.clarification_history or [])
            history.append(msg_entry)
            att.clarification_history = history

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
        attendances = Attendance.query.filter_by(
            user_id=user_id,
            manager_status="Need Clarification"
        ).all()

        results = []
        for att in attendances:
            history = att.clarification_history or []
            
            # If employee has already replied, do not show in pending clarifications for employee
            if history:
                last_msg = history[-1]
                if isinstance(last_msg, dict) and last_msg.get("sender_role") == "employee":
                    continue

            last_manager_msg = next((m["comment"] for m in reversed(history) if isinstance(m, dict) and m.get("sender_role") == "manager"), "")

            # Web Site Entry
            web_in_str = att.check_in.strftime("%I:%M %p") if att.check_in else "—"
            web_out_str = att.check_out.strftime("%I:%M %p") if att.check_out else "—"
            web_break_str = f"{att.total_break_minutes} min" if (att.total_break_minutes is not None and att.total_break_minutes > 0) else "0 min"

            web_hours = att.total_hours or 0.0
            if web_hours > 0:
                h_int = int(web_hours)
                m_int = int(round((web_hours - h_int) * 60))
                if m_int == 60:
                    h_int += 1
                    m_int = 0
                web_hours_str = f"{h_int} h {m_int} m" if m_int > 0 else f"{h_int} h 0 m"
            else:
                web_hours_str = "—"

            # Biometric Card Entry
            card_in = getattr(att, "card_check_in", None)
            card_out = getattr(att, "card_check_out", None)
            card_in_str = card_in.strftime("%I:%M %p") if card_in else "-"
            card_out_str = card_out.strftime("%I:%M %p") if card_out else "-"

            card_hours = getattr(att, "card_working_hours", 0.0) or 0.0
            if card_hours > 0:
                ch_int = int(card_hours)
                cm_int = int(round((card_hours - ch_int) * 60))
                if cm_int == 60:
                    ch_int += 1
                    cm_int = 0
                card_hours_str = f"{ch_int} h {cm_int} m" if cm_int > 0 else f"{ch_int} h 0 m"
            else:
                card_hours_str = "—"

            results.append({
                "id": att.id,
                "attendance_date": att.attendance_date.strftime("%Y-%m-%d"),
                "attendance_date_formatted": att.attendance_date.strftime("%A, %b %d, %Y"),
                "check_in": web_in_str,
                "check_out": web_out_str,
                "total_break_minutes": att.total_break_minutes or 0,
                "break_str": web_break_str,
                "total_hours": web_hours_str,
                "card_check_in": card_in_str,
                "card_check_out": card_out_str,
                "card_working_hours": card_hours_str,
                "manager_status": att.manager_status,
                "status": att.status or "Absent",
                "is_regularization": bool(att.is_regularization),
                "is_lop": bool(att.is_lop),
                "leave_type": att.leave_type,
                "last_manager_comment": last_manager_msg,
                "clarification_history": history
            })

        return jsonify(results)
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
                reporting_employees = [e for e in Employee.query.all() if (e.status or "").lower() != "inactive"]
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
                reporting_employees = [e for e in Employee.query.all() if (e.status or "").lower() != "inactive"]
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


@attendance_bp.route("/trigger-db-sync", methods=["POST"])
def trigger_db_sync():
    try:
        mysql_host = os.environ.get("MYSQL_BIOMETRIC_HOST", "10.1.6.157")
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
            if max_hrs >= 8.0:
                attendance.status = "Present"
            elif max_hrs >= 4.0:
                attendance.status = "Half Day"
            elif attendance.check_in or attendance.card_check_in:
                attendance.status = "Present"
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