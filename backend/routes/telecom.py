# routes/telecom.py

from flask import Blueprint, request, jsonify

from models.database import db
from models.telecom import TelecomDirectory

telecom_bp = Blueprint(
    "telecom_bp",
    __name__
)

@telecom_bp.route("/", methods=["POST"])
def add_telecom():

    try:

        data = request.json

        print("DATA RECEIVED:", data)

        telecom = TelecomDirectory(
        department_name=data["department_name"],
        team_name=data["team_name"],
        employee_name=data["employee_name"],
        designation=data["designation"],
        extension_number=data["extension_number"],
        direct_number=data.get("direct_number"),
        location=data.get("location"),
        status=data.get("status", "Active")
    )

        db.session.add(telecom)
        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Telecom Added"
        })

    except Exception as e:

        db.session.rollback()

        print("POST ERROR:", str(e))

        return jsonify({
            "success": False,
            "message": str(e)
        }), 500
    
@telecom_bp.route("/", methods=["GET"])
def get_telecoms():

    try:

        telecoms = TelecomDirectory.query.all()

        return jsonify([
            item.to_dict()
            for item in telecoms
        ])

    except Exception as e:

        print("TELECOM ERROR:", e)

        return jsonify({
            "success": False,
            "message": str(e)
        }), 500

@telecom_bp.route("/<int:id>", methods=["PUT"])
def update_telecom(id):

    try:

        telecom = TelecomDirectory.query.get(id)

        if not telecom:
            return jsonify({
                "success": False,
                "message": "Telecom entry not found"
            }), 404

        data = request.json

        # Check duplicate extension
        existing = TelecomDirectory.query.filter(
            TelecomDirectory.extension_number == data["extension_number"],
            TelecomDirectory.id != id
        ).first()

        if existing:
            return jsonify({
                "success": False,
                "message": "Extension number already exists"
            }), 400

        telecom.department_name = data["department_name"]
        telecom.team_name = data["team_name"]
        telecom.employee_name = data["employee_name"]
        telecom.designation = data["designation"]
        telecom.extension_number = data["extension_number"]
        telecom.direct_number = data["direct_number"]
        telecom.location = data["location"]
        telecom.status = data["status"]

        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Extension updated successfully"
        })

    except Exception as e:

        db.session.rollback()

        return jsonify({
            "success": False,
            "message": str(e)
        }), 500

@telecom_bp.route(
    "/<int:id>",
    methods=["DELETE"]
)
def delete_telecom(id):

    telecom = TelecomDirectory.query.get(id)

    if not telecom:
        return jsonify({
            "message": "Not Found"
        }), 404

    db.session.delete(
        telecom
    )

    db.session.commit()

    return jsonify({
        "success": True
    })

@telecom_bp.route(
    "/status/<int:id>",
    methods=["PUT"]
)
def toggle_status(id):

    telecom = TelecomDirectory.query.get(id)

    if not telecom:
        return jsonify({
            "success": False,
            "message": "Not Found"
        }), 404

    telecom.status = (
        "Inactive"
        if telecom.status == "Active"
        else "Active"
    )

    db.session.commit()

    return jsonify({
        "success": True,
        "status": telecom.status
    })