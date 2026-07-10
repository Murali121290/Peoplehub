# routes/shift_request.py

# pyrefly: ignore [missing-import]
from flask import Blueprint
# pyrefly: ignore [missing-import]
from flask import request
# pyrefly: ignore [missing-import]
from flask import jsonify

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
        func.lower(func.trim(ShiftRequest.reporting_manager)) == normalized_manager,
        ShiftRequest.status == "Pending"
    ).order_by(
        ShiftRequest.id.desc()
    ).all()

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

        # Resolve user_id dynamically
        employee = Employee.query.get(shift.employee_id)
        resolved_user_id = employee.user_id if employee else shift.employee_id

        from datetime import timedelta, time

        start_date = shift.from_date or shift.shift_date
        end_date = shift.to_date or start_date

        if start_date:
            current_date = start_date
            while current_date <= end_date:
                check_in_time = datetime.combine(current_date, time(9, 0))
                check_out_time = datetime.combine(current_date, time(14, 30))

                attendance = Attendance.query.filter_by(
                    user_id=resolved_user_id,
                    attendance_date=current_date
                ).first()

                if attendance:
                    attendance.shift_timing = shift.requested_shift
                    attendance.status = "Present"
                    attendance.total_hours = 5.5
                    attendance.check_in = check_in_time
                    attendance.check_out = check_out_time
                else:
                    attendance = Attendance(
                        user_id=resolved_user_id,
                        attendance_date=current_date,
                        shift_timing=shift.requested_shift,
                        status="Present",
                        total_hours=5.5,
                        check_in=check_in_time,
                        check_out=check_out_time
                    )
                    db.session.add(attendance)
                
                current_date += timedelta(days=1)

        shift.status = "Approved"
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
            title="Shift Request Approved",
            message="Your shift request has been approved.",
            is_read=False
        )

        db.session.add(notification)
        db.session.commit()

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
                "message":
                "Shift Request Not Found"
            }), 404

        shift.status = "Rejected"
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

        return jsonify({
            "success": True,
            "message":
            "Shift Rejected Successfully"
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

        return jsonify({
            "success": True,
            "message":
            "Shift Request Deleted Successfully"
        })

    except Exception as e:

        db.session.rollback()

        return jsonify({
            "success": False,
            "message": str(e)
        }), 500