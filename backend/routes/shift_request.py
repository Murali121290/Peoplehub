# routes/shift_request.py

from flask import Blueprint
from flask import request
from flask import jsonify

from datetime import datetime
from models.attendance import Attendance

from models.database import db
from models.shift_request import ShiftRequest
from models.employee import Employee

shift_bp = Blueprint(
    "shift_bp",
    __name__
)


# ==========================================
# APPLY SHIFT REQUEST
# ==========================================
@shift_bp.route(
    "/",
    methods=["POST"]
)
def apply_shift():

    try:

        data = request.json


        shift_request = ShiftRequest(
     employee_id=data["employee_id"],
    employee_name=data["employee_name"],
    current_shift=data["current_shift"],
    requested_shift=data["requested_shift"],

    shift_date=datetime.strptime(
        data["shift_date"],
        "%Y-%m-%d"
    ).date(),

    reason=data["reason"],
    reporting_manager=data["reporting_manager"]
)

        db.session.add(
            shift_request
        )

        db.session.commit()

        return jsonify({
            "success": True,
            "message":
            "Shift Request Submitted Successfully"
        }), 201

    except Exception as e:

        db.session.rollback()

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
@shift_bp.route(
    "/approvals",
    methods=["GET"]
)
def get_shift_approvals():

    shifts = ShiftRequest.query.order_by(
        ShiftRequest.id.desc()
    ).all()

    return jsonify([
        {
            "id": shift.id,
            "employee_id": shift.employee_id,
            "employee_name": shift.employee_name,
            "current_shift": shift.current_shift,
            "requested_shift": shift.requested_shift,
            "reason": shift.reason,
            "status": shift.status
        }
        for shift in shifts
    ])
# ==========================================
# APPROVE SHIFT REQUEST
# ==========================================
@shift_bp.route(
    "/approve/<int:id>",
    methods=["PUT"]
)
def approve_shift(id):

    try:

        shift = ShiftRequest.query.get(id)

        if not shift:

            return jsonify({
                "success": False,
                "message": "Shift Request Not Found"
            }), 404

        attendance = Attendance.query.filter_by(
            user_id=shift.employee_id,
            attendance_date=shift.shift_date
        ).first()

        if attendance:

            attendance.shift_timing = (
                shift.requested_shift
            )

        else:

            attendance = Attendance(
                user_id=shift.employee_id,
                attendance_date=shift.shift_date,
                shift_timing=shift.requested_shift,
                status="Absent"
            )

            db.session.add(attendance)

        shift.status = "Approved"

        shift.approved_at = (
            datetime.utcnow()
        )

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

        shift.rejected_at = (
            datetime.utcnow()
        )

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
    

