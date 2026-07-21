# routes/shift_request.py

# pyrefly: ignore [missing-import]
from utils.compat import Blueprint, request, jsonify

from datetime import datetime
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

        shift_request = ShiftRequest(
            employee_id=data["employee_id"],
            employee_name=data["employee_name"],
            current_shift=data["current_shift"],
            requested_shift=data["requested_shift"],

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
def get_shift_requests():

    shift_requests = ShiftRequest.query\
        .order_by(
            ShiftRequest.id.desc()
        ).all()

    return jsonify([
        item.to_dict()
        for item in shift_requests
    ])


# ==========================================
# GET EMPLOYEE REQUESTS
# ==========================================
@shift_bp.route(
    "/employee/<int:employee_id>",
    methods=["GET"]
)
def get_employee_requests(
    employee_id
):

    shift_requests = ShiftRequest.query.filter_by(
        employee_id=employee_id
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

    shifts = ShiftRequest.query.filter(
        ShiftRequest.status == "Pending"
    ).order_by(
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

        # Resolve user_id dynamically
        employee = Employee.query.get(shift.employee_id)
        resolved_user_id = employee.user_id if employee else shift.employee_id

        from datetime import timedelta
        from models.attendance import Attendance

        start_date = shift.from_date or shift.shift_date
        end_date = shift.to_date or start_date

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

        shift.status = "Approved"
        shift.approved_by = "Website Manager"
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

        employee = Employee.query.get(shift.employee_id)

        shift.status = "Rejected"
        shift.rejected_by = "Website Manager"
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