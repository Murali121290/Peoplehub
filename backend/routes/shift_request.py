
# routes/shift_request.py

# pyrefly: ignore [missing-import]
from utils.compat import Blueprint, request, jsonify
from utils.jwt_helper import jwt_required, get_jwt_identity
from models.user import User

from datetime import datetime, timedelta
# pyrefly: ignore [missing-import]
from models.attendance import Attendance
# pyrefly: ignore [missing-import]
from models.database import db
# pyrefly: ignore [missing-import]
from models.shift_request import ShiftRequest
# pyrefly: ignore [missing-import]
from models.employee import Employee
# pyrefly: ignore [missing-import]
from models.notification import Notification
# pyrefly: ignore [missing-import]
from sqlalchemy import func

shift_bp = Blueprint(
    "shift_bp",
    __name__
)


# ==========================================
# APPLY SHIFT REQUEST
# ==========================================
@shift_bp.route("/", methods=["POST"])
def apply_shift():
    try:
        data = request.get_json()

        print("SHIFT DATA:", data)

        # Check if user has an approved leave request that overlaps with the shift request dates
        from models.leave import LeaveRequest
        from sqlalchemy import or_

        req_from = datetime.strptime(data["from_date"], "%Y-%m-%d").date()
        req_to = datetime.strptime(data["to_date"], "%Y-%m-%d").date()

        # Check if requested shift timing is in the past
        from zoneinfo import ZoneInfo
        ist_now = datetime.now(ZoneInfo("Asia/Kolkata"))
        ist_today = ist_now.date()

        if req_from < ist_today and data.get("request_type") != "One Day Wages":
            return jsonify({
                "success": False,
                "message": "Cannot apply for a shift change for a past date."
            }), 400

        employee = Employee.query.filter(
            or_(
                Employee.id == data["employee_id"],
                Employee.employee_id == str(data["employee_id"])
            )
        ).first()

        if req_from == ist_today and data.get("request_type") != "One Day Wages":
            # Check if employee already checked in today
            resolved_user_id = employee.user_id if employee else data["employee_id"]
            attendance = Attendance.query.filter_by(
                user_id=resolved_user_id,
                attendance_date=ist_today
            ).first()

            if attendance and (attendance.check_in is not None or attendance.card_check_in is not None):
                return jsonify({
                    "success": False,
                    "message": "Cannot apply for today's shift/WFH request because you have already checked in today."
                }), 400

        if employee:
            emp_ids = [employee.employee_id]

            overlapping_leave = LeaveRequest.query.filter(
                LeaveRequest.employee_id.in_(emp_ids),
                LeaveRequest.status == "Approved",
                LeaveRequest.request_type == "Leave",
                LeaveRequest.from_date <= req_to,
                LeaveRequest.to_date >= req_from
            ).first()
            
            if overlapping_leave:
                return jsonify({
                    "success": False,
                    "message": f"Cannot apply for shift change/WFH. You have an approved leave from {overlapping_leave.from_date} to {overlapping_leave.to_date}."
                }), 400

            # Check for existing approved Shift/WFH/Office requests in the date range
            if data.get("request_type") != "One Day Wages":
                existing_approved_request = ShiftRequest.query.filter(
                    ShiftRequest.employee_id == employee.employee_id,
                    ShiftRequest.status == "Approved",
                    ShiftRequest.from_date <= req_to,
                    ShiftRequest.to_date >= req_from
                ).first()

                if existing_approved_request:
                    req_label = existing_approved_request.request_type or "Shift/WFH"
                    return jsonify({
                        "success": False,
                        "message": f"An approved {req_label} request already exists from {existing_approved_request.from_date} to {existing_approved_request.to_date}. Please cancel the active approved request first before applying for a new shift, WFH, or office mode."
                    }), 400

        shift_request = ShiftRequest(
            employee_id=data["employee_id"],
            employee_name=data["employee_name"],
            current_shift=data.get("current_shift"),
            requested_shift=data.get("requested_shift"),
            current_work_mode=data.get("current_work_mode"),
            requested_work_mode=data.get("requested_work_mode"),

            # Required because your DB has shift_date NOT NULL
            shift_date=datetime.strptime(
                data["from_date"],
                "%Y-%m-%d"
            ).date(),

            request_type=data.get("request_type", "Shift"),

            from_date=datetime.strptime(
                data["from_date"],
                "%Y-%m-%d"
            ).date(),

            to_date=datetime.strptime(
                data["to_date"],
                "%Y-%m-%d"
            ).date(),

            reason=data["reason"],
            reporting_manager=data["reporting_manager"],

            status="Pending"
        )

        db.session.add(shift_request)
        db.session.flush()

        notification = Notification(
            receiver_name=shift_request.reporting_manager,
            title="New Shift Request",
            message=f"{shift_request.employee_name} submitted a shift request.",
            is_read=False
    )

        db.session.add(notification)
        db.session.commit()

        # Send manager notification email
        try:
            from services.request_email_service import send_manager_request_email
            send_manager_request_email(shift_request, shift_request.request_type)
        except Exception as email_err:
            print("Failed to send manager request email:", str(email_err))

        # Emit shift_update socket event for real-time dashboard updates
        try:
            from extensions import socketio
            socketio.emit("shift_update", shift_request.to_dict())
        except Exception as socket_err:
            print("Failed to emit shift socket:", str(socket_err))

        return jsonify({
            "success": True,
            "message": "Shift Request Submitted Successfully"
        }), 201

    except Exception as e:
        db.session.rollback()

        import traceback
        traceback.print_exc()

        return jsonify({
            "success": False,
            "message": str(e)
        }), 500


# ==========================================
# GET ALL SHIFT REQUESTS
# ==========================================
@shift_bp.route(
    "/",
    methods=["GET"]
)
@jwt_required()
def get_shift_requests():
    try:
        user_id = get_jwt_identity()
        current_user = User.query.get(int(user_id))
        if not current_user:
            return jsonify({"success": False, "message": "User not found"}), 404

        role_name = (current_user.role.name or "").lower() if current_user.role else ""
        access_level = (current_user.access_level or "").lower()
        is_admin_or_hr = "admin" in role_name or "admin" in access_level or "hr" in role_name or "hr" in access_level

        shift_requests = ShiftRequest.query.order_by(ShiftRequest.id.desc()).all()

        if not is_admin_or_hr:
            caller_emp = Employee.query.filter_by(user_id=current_user.id).first()
            if caller_emp:
                manager_full_name = f"{caller_emp.first_name} {caller_emp.last_name}".strip().lower()

                def matches_manager(rep_mgr):
                    if not rep_mgr:
                        return False
                    rep_mgr_clean = rep_mgr.strip().lower()
                    if rep_mgr_clean == manager_full_name:
                        return True
                    rep_words = rep_mgr_clean.split()
                    mgr_words = manager_full_name.split()
                    if len(rep_words) == 1 and mgr_words and mgr_words[0] == rep_mgr_clean:
                        return True
                    if len(mgr_words) == 1 and rep_words and rep_words[0] == manager_full_name:
                        return True
                    return False

                shift_requests = [s for s in shift_requests if matches_manager(s.reporting_manager)]
            else:
                shift_requests = []

        return jsonify([
            item.to_dict()
            for item in shift_requests
        ])
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


# ==========================================
# GET EMPLOYEE REQUESTS
# ==========================================
@shift_bp.route(
    "/employee/<employee_id>",
    methods=["GET"]
)
def get_employee_requests(
    employee_id
):
    from models.employee import Employee
    from sqlalchemy import or_

    emp = None
    try:
        # Try finding by integer id first, or string employee_id
        emp = Employee.query.filter(
            or_(
                Employee.id == int(employee_id),
                Employee.employee_id == str(employee_id)
            )
        ).first()
    except ValueError:
        # If employee_id is a non-integer string, search by employee_id only
        emp = Employee.query.filter_by(employee_id=str(employee_id)).first()

    if not emp:
        return jsonify([])

    shift_requests = ShiftRequest.query.filter(
        or_(
            ShiftRequest.employee_id == emp.id,
            ShiftRequest.employee_id == str(emp.id),
            ShiftRequest.employee_id == emp.employee_id,
            ShiftRequest.employee_id == str(emp.employee_id)
        )
    ).order_by(
        ShiftRequest.id.desc()
    ).all()

    return jsonify([
        item.to_dict()
        for item in shift_requests
    ])


# ==========================================
# GET MANAGER APPROVAL REQUESTS
# ==========================================
@shift_bp.route("/approvals/<manager_name>", methods=["GET"])
def get_shift_approvals(manager_name):

    normalized_manager = manager_name.strip().lower()

    shifts = ShiftRequest.query.order_by(
        ShiftRequest.id.desc()
    ).all()

    # Filter by manager match in Python to handle name variations
    shifts = [
        s for s in shifts
        if s.reporting_manager and (
            (s.reporting_manager.strip().lower() == normalized_manager) or
            (len(s.reporting_manager.strip().split()) == 1 and normalized_manager.split()[0] == s.reporting_manager.strip().lower()) or
            (len(normalized_manager.split()) == 1 and s.reporting_manager.strip().lower().split()[0] == normalized_manager)
        )
    ]

    return jsonify([
    {
        "id": shift.id,
        "employee_id": shift.employee_id,
        "employee_name": shift.employee_name,
        "reporting_manager": shift.reporting_manager,
        "current_shift": shift.current_shift,
        "requested_shift": shift.requested_shift,
        "request_type": shift.request_type,
        "from_date": shift.from_date.isoformat() if shift.from_date else None,
        "to_date": shift.to_date.isoformat() if shift.to_date else None,
        "reason": shift.reason,
        "status": shift.status
    }
    for shift in shifts
])


# ==========================================
# APPROVE SHIFT REQUEST
# ==========================================
@shift_bp.route("/approve/<int:id>", methods=["PUT"])
def approve_shift(id):
    try:
        shift = ShiftRequest.query.get(id)

        if not shift:
            return jsonify({
                "success": False,
                "message": "Shift Request Not Found"
            }), 404

        # Prevent double approval/rejection
        if shift.status != "Pending":
            return jsonify({
                "success": False,
                "message": f"Shift Request already {shift.status.lower()}"
            }), 400

        # Check 3-day cutoff limit for One Day Wages requests
        if shift.request_type == "One Day Wages":
            if shift.created_at:
                delta = datetime.utcnow() - shift.created_at
                if delta.days > 3:
                    return jsonify({
                        "success": False,
                        "message": "This One Day Wages request is Out of Date (older than 3 days) and cannot be approved."
                    }), 400

        # Resolve user_id dynamically
        employee = Employee.query.get(shift.employee_id)
        resolved_user_id = employee.user_id if employee else shift.employee_id

        from datetime import timedelta
        from models.attendance import Attendance

        start_date = shift.from_date or shift.shift_date
        end_date = shift.to_date or start_date

        if shift.request_type == "One Day Wages":
            if start_date:
                current_date = start_date
                while current_date <= end_date:
                    attendance = Attendance.query.filter_by(
                        user_id=resolved_user_id,
                        attendance_date=current_date
                    ).first()

                    # Calculate total hours and parse times
                    try:
                        from datetime import time
                        from_hour, from_minute = map(int, (shift.current_shift or "09:00").split(":"))
                        to_hour, to_minute = map(int, (shift.requested_shift or "18:00").split(":"))
                        
                        check_in_dt = datetime.combine(current_date, time(from_hour, from_minute))
                        check_out_dt = datetime.combine(current_date, time(to_hour, to_minute))
                        
                        tdelta = check_out_dt - check_in_dt
                        total_hrs = max(0.0, tdelta.total_seconds() / 3600.0)
                    except Exception as parse_err:
                        print("Error parsing One Day Wages times:", str(parse_err))
                        from datetime import time
                        check_in_dt = datetime.combine(current_date, time(9, 0))
                        check_out_dt = datetime.combine(current_date, time(18, 0))
                        total_hrs = 9.0

                    if not attendance:
                        attendance = Attendance(
                            user_id=resolved_user_id,
                            attendance_date=current_date,
                            shift_timing=employee.shift_timing if employee else "General Shift"
                        )
                        db.session.add(attendance)

                    attendance.check_in = check_in_dt
                    attendance.check_out = check_out_dt
                    attendance.total_hours = total_hrs
                    if total_hrs >= 6.0:
                        attendance.status = "Present"
                    else:
                        attendance.status = "Half Day"
                    attendance.manager_status = "Approved"

                    current_date += timedelta(days=1)
        else:
            if start_date:
                current_date = start_date
                while current_date <= end_date:
                    attendance = Attendance.query.filter_by(
                        user_id=resolved_user_id,
                        attendance_date=current_date
                    ).first()

                    # Only update shift_timing on records where the employee
                    # actually checked in. Never create phantom attendance rows
                    # with hardcoded times.
                    if attendance and attendance.check_in is not None:
                        attendance.shift_timing = shift.requested_shift

                    current_date += timedelta(days=1)

            if employee:
                if shift.requested_shift:
                    employee.shift_timing = shift.requested_shift
                if shift.requested_work_mode:
                    employee.work_mode = shift.requested_work_mode

        shift.status = "Approved"
        shift.approved_by = shift.reporting_manager or "Manager"
        shift.approved_at = datetime.utcnow()

        # Delete any pending "New Shift Request" notifications for this shift
        try:
            Notification.query.filter(
                Notification.title == "New Shift Request",
                Notification.message.like(f"%{shift.employee_name} submitted a shift request.%")
            ).delete(synchronize_session=False)
        except Exception as delete_err:
            print("Failed to delete new shift request notification:", str(delete_err))

        notification = Notification(
            receiver_name=shift.employee_name,
            title=f"Shift Request Approved",
            message="Your shift request has been approved.",
            is_read=False
        )

        db.session.add(notification)
        db.session.commit()

        # Send Notification Email to Employee
        if employee:
            try:
                from services.request_email_service import send_employee_status_email
                send_employee_status_email(shift, employee, "Approved", shift.request_type)
            except Exception as email_err:
                print("Failed to send employee status email:", str(email_err))

        # Emit shift_update socket event for real-time dashboard updates
        try:
            from extensions import socketio
            socketio.emit("shift_update", shift.to_dict())
        except Exception as socket_err:
            print("Failed to emit shift socket:", str(socket_err))

        return jsonify({
            "success": True,
            "message": "Shift Approved Successfully"
        })

    except Exception as e:
        db.session.rollback()

        return jsonify({
            "success": False,
            "message": str(e)
        }), 500


# ==========================================
# REJECT SHIFT REQUEST
# ==========================================
@shift_bp.route(
    "/reject/<int:id>",
    methods=["PUT"]
)
def reject_shift(id):

    try:

        shift = ShiftRequest.query.get(id)

        if not shift:
            return jsonify({
                "success": False,
                "message": "Shift Request Not Found"
            }), 404

        # Prevent double approval/rejection
        if shift.status != "Pending":
            return jsonify({
                "success": False,
                "message": f"Shift Request already {shift.status.lower()}"
            }), 400

        # Check 3-day cutoff limit for One Day Wages requests
        if shift.request_type == "One Day Wages":
            if shift.created_at:
                delta = datetime.utcnow() - shift.created_at
                if delta.days > 3:
                    return jsonify({
                        "success": False,
                        "message": "This One Day Wages request is Out of Date (older than 3 days) and cannot be rejected."
                    }), 400

        employee = Employee.query.get(shift.employee_id)

        shift.status = "Rejected"
        shift.rejected_by = shift.reporting_manager or "Manager"
        shift.rejected_at = datetime.utcnow()

        # Delete any pending "New Shift Request" notifications for this shift
        try:
            Notification.query.filter(
                Notification.title == "New Shift Request",
                Notification.message.like(f"%{shift.employee_name} submitted a shift request.%")
            ).delete(synchronize_session=False)
        except Exception as delete_err:
            print("Failed to delete new shift request notification:", str(delete_err))

        notification = Notification(
            receiver_name=shift.employee_name,
            title="Shift Request Rejected",
            message="Your shift request has been rejected.",
            is_read=False
        )

        db.session.add(notification)
        db.session.commit()

        # Send Notification Email to Employee
        if employee:
            try:
                from services.request_email_service import send_employee_status_email
                send_employee_status_email(shift, employee, "Rejected", shift.request_type)
            except Exception as email_err:
                print("Failed to send employee status email:", str(email_err))

        # Emit shift_update socket event for real-time dashboard updates
        try:
            from extensions import socketio
            socketio.emit("shift_update", shift.to_dict())
        except Exception as socket_err:
            print("Failed to emit shift socket:", str(socket_err))

        return jsonify({
            "success": True,
            "message": "Shift Rejected Successfully"
        })

    except Exception as e:

        db.session.rollback()

        return jsonify({
            "success": False,
            "message": str(e)
        }), 500


# ==========================================
# GET SINGLE REQUEST
# ==========================================
@shift_bp.route(
    "/<int:id>",
    methods=["GET"]
)
def get_single_request(id):

    shift = ShiftRequest.query.get(id)

    if not shift:

        return jsonify({
            "success": False,
            "message":
            "Shift Request Not Found"
        }), 404

    return jsonify(
        shift.to_dict()
    )


# ==========================================
# CANCEL REQUEST
# ==========================================
@shift_bp.route(
    "/cancel/<int:id>",
    methods=["PUT"]
)
def cancel_request(id):
    try:
        shift = ShiftRequest.query.get(id)
        if not shift:
            return jsonify({
                "success": False,
                "message": "Shift Request Not Found"
            }), 404
            
        from zoneinfo import ZoneInfo
        from datetime import datetime
        


        shift.status = "Cancelled"
        db.session.commit()

        try:
            from extensions import socketio
            socketio.emit("shift_update", shift.to_dict())
        except Exception as socket_err:
            print("Failed to emit shift socket:", str(socket_err))

        return jsonify({
            "success": True,
            "message": "Shift Cancelled Successfully"
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500

# ==========================================
# DELETE REQUEST
# ==========================================
@shift_bp.route(
    "/delete/<int:id>",
    methods=["DELETE"]
)
def delete_request(id):

    try:

        shift = ShiftRequest.query.get(id)

        if not shift:

            return jsonify({
                "success": False,
                "message":
                "Shift Request Not Found"
            }), 404

        db.session.delete(
            shift
        )

        db.session.commit()

        # Emit shift_update socket event for real-time dashboard updates
        try:
            from extensions import socketio
            socketio.emit("shift_update", {"id": id, "action": "delete"})
        except Exception as socket_err:
            print("Failed to emit shift socket:", str(socket_err))

        return jsonify({
            "success": True,
            "message": "Shift Request Deleted Successfully"
        })

    except Exception as e:

        db.session.rollback()

        return jsonify({
            "success": False,
            "message": str(e)
        }), 500


# ==========================================
# GET SHIFT OPTIONS
# ==========================================
@shift_bp.route("/options", methods=["GET"])
def get_shift_options():
    try:
        # Standard shifts
        default_shifts = ["General Shift", "First Shift", "Second Shift", "Night Shift"]
        shifts_set = set(default_shifts)

        # Pull distinct shift_timing from Employee table
        emp_shifts = db.session.query(Employee.shift_timing).distinct().all()
        for s in emp_shifts:
            if s[0] and s[0].strip():
                shifts_set.add(s[0].strip())

        # Pull distinct requested_shift from ShiftRequest table
        req_shifts = db.session.query(ShiftRequest.requested_shift).distinct().all()
        for s in req_shifts:
            if s[0] and s[0].strip():
                shifts_set.add(s[0].strip())

        return jsonify(sorted(list(shifts_set)))
    except Exception as e:
        return jsonify(["General Shift", "First Shift", "Second Shift", "Night Shift"])


# ==========================================
# EFFECTIVE SHIFT FOR TODAY (Sidebar use)
# ==========================================
@shift_bp.route("/effective-today/<int:employee_id>", methods=["GET"])
def get_effective_shift_today(employee_id):
    """
    Return the employee's effective shift for today.
    Priority: approved ShiftRequest covering today > permanent shift_timing.
    Also returns is_wfh and is_permanent_wfh flags.
    """
    try:
        from datetime import date
        from zoneinfo import ZoneInfo
        today = datetime.now(ZoneInfo("Asia/Kolkata")).date()

        emp = Employee.query.get(employee_id)
        if not emp:
            return jsonify({"error": "Employee not found"}), 404

        permanent_shift = (emp.shift_timing or "General Shift").strip()
        is_permanent_wfh = (emp.work_mode == "WFH")

        # Look for an approved shift request (Shift or WFH) covering today
        # Latest request (by created_at) takes precedence
        approved_request = ShiftRequest.query.filter(
            ShiftRequest.employee_id == employee_id,
            ShiftRequest.status == "Approved",
            ShiftRequest.from_date <= today,
            ShiftRequest.to_date >= today
        ).order_by(ShiftRequest.created_at.desc()).first()

        if approved_request:
            effective_shift = approved_request.requested_shift or permanent_shift
            if approved_request.requested_work_mode:
                is_wfh = (approved_request.requested_work_mode == "WFH")
            elif (approved_request.request_type or "").strip().upper() == "WFH":
                is_wfh = True
            else:
                is_wfh = is_permanent_wfh
            is_shift_changed = True
        else:
            effective_shift = permanent_shift
            is_wfh = is_permanent_wfh
            is_shift_changed = False

        effective_work_mode = "WFH" if is_wfh else "Office"

        return jsonify({
            "effective_shift": effective_shift,
            "permanent_shift": permanent_shift,
            "is_wfh": is_wfh,
            "is_permanent_wfh": is_permanent_wfh,
            "is_shift_changed": is_shift_changed,
            "effective_work_mode": effective_work_mode,
            "permanent_work_mode": emp.work_mode or "Office"
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ==========================================
# MANAGER DIRECT SUBMIT & AUTO-APPROVE (Retrospective/Direct Request)
# ==========================================
@shift_bp.route("/manager-submit", methods=["POST"])
def manager_submit_shift():
    """
    Manager directly applies and auto-approves a Shift, WFH, or Office mode request
    on behalf of an employee (supports backdated dates for missed entries).
    """
    try:
        data = request.get_json() or {}
        employee_id = data.get("employee_id")
        from_date_str = data.get("from_date")
        to_date_str = data.get("to_date")
        requested_shift = data.get("requested_shift")
        requested_work_mode = data.get("requested_work_mode") or "WFH"
        request_type = data.get("request_type") or "WFH"
        reason = (data.get("reason") or "Direct manager entry").strip()
        manager_name = (data.get("manager_name") or "Manager").strip()

        if not employee_id or not from_date_str or not to_date_str:
            return jsonify({"success": False, "message": "employee_id, from_date, and to_date are required."}), 400

        from models.employee import Employee
        from sqlalchemy import or_

        employee = Employee.query.filter(
            or_(
                Employee.id == employee_id,
                Employee.employee_id == str(employee_id)
            )
        ).first()

        if not employee:
            return jsonify({"success": False, "message": "Employee not found."}), 404

        from_date = datetime.strptime(from_date_str, "%Y-%m-%d").date()
        to_date = datetime.strptime(to_date_str, "%Y-%m-%d").date()

        # Check for existing approved Shift/WFH/Office request in the date range
        existing_approved_request = ShiftRequest.query.filter(
            ShiftRequest.employee_id == employee.employee_id,
            ShiftRequest.status == "Approved",
            ShiftRequest.from_date <= to_date,
            ShiftRequest.to_date >= from_date
        ).first()

        if existing_approved_request:
            req_label = existing_approved_request.request_type or "Shift/WFH"
            return jsonify({
                "success": False,
                "message": f"An approved {req_label} request already exists from {existing_approved_request.from_date} to {existing_approved_request.to_date}. Please cancel the active approved request first before applying for a new shift, WFH, or office mode."
            }), 400

        current_shift = (employee.shift_timing or "General Shift").strip()
        current_work_mode = employee.work_mode or "Office"

        # Create auto-approved ShiftRequest record
        now = datetime.utcnow()
        shift_request = ShiftRequest(
            employee_id=employee.employee_id,
            employee_name=f"{employee.first_name} {employee.last_name}".strip(),
            current_shift=current_shift,
            requested_shift=requested_shift or current_shift,
            current_work_mode=current_work_mode,
            requested_work_mode=requested_work_mode,
            reason=f"[Manager Logged] {reason}",
            reporting_manager=employee.reporting_manager or manager_name,
            status="Approved",
            request_type=request_type,
            approved_by=manager_name,
            approved_at=now,
            from_date=from_date,
            to_date=to_date,
            shift_date=from_date,
            manager_comment=f"Directly created and approved by manager ({manager_name})"
        )
        db.session.add(shift_request)

        # Update Attendance records for the specified date range if attendance rows exist
        curr_date = from_date
        while curr_date <= to_date:
            attendance = Attendance.query.filter_by(
                user_id=employee.user_id,
                attendance_date=curr_date
            ).first()

            if attendance:
                if requested_shift:
                    attendance.shift_timing = requested_shift
                if requested_work_mode:
                    attendance.work_mode = requested_work_mode
                    if requested_work_mode == "WFH" and attendance.status == "Absent":
                        attendance.status = "Present"
            curr_date += timedelta(days=1)

        db.session.commit()

        # Emit socket notification
        try:
            from extensions import socketio
            socketio.emit("attendance_update", {"user_id": employee.user_id, "manager_status": "Approved"})
        except Exception as socket_err:
            print("Failed to emit manager-submit socket:", str(socket_err))

        return jsonify({
            "success": True,
            "message": f"Successfully logged and approved {request_type} request for {employee.first_name} {employee.last_name}."
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500