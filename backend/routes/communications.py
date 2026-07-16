from utils.compat import Blueprint, request, jsonify

from sqlalchemy import or_
from extensions import socketio
from models.database import db
from models.communication import Communication

communication_bp = Blueprint(
    "communication",
    __name__
)


# ==========================================
# SEND MESSAGE
# ==========================================

@communication_bp.route(
    "/",
    methods=["POST"]
)
def send_message():

    try:

        data = request.json

        communication = Communication(

            employee_id=data.get(
                "employee_id"
            ),

            receiver_id=data.get(
                "receiver_id"
            ),

            employee_name=data.get(
                "employee_name"
            ),

            message_type=data.get(
                "message_type",
                "employee"
            ),

            message=data.get(
                "message"
            ),

            created_by=data.get(
                "created_by"
            )
        )

        db.session.add(
            communication
        )

        db.session.commit()

        socketio.emit(
            "receive_office_message",
            {
                "id": communication.id,
                "employee_id": communication.employee_id,
                "receiver_id": communication.receiver_id,
                "employee_name": communication.employee_name,
                "message": communication.message,
                "message_type": communication.message_type,
                "created_by": communication.created_by,
                "created_at": str(
                    communication.created_at
                )
            }
        )

        return jsonify({
            "success": True,
            "message": "Message Sent Successfully"
        })

    except Exception as e:

        db.session.rollback()

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# ==========================================
# PRIVATE CHAT
# ==========================================

@communication_bp.route(
    "/employee/<int:employee_id>",
    methods=["GET"]
)
def get_employee_messages(employee_id):

    try:

        messages = Communication.query.filter(
            Communication.message_type == "employee",
            or_(
                Communication.employee_id == employee_id,
                Communication.receiver_id == employee_id
            )
        ).order_by(
            Communication.created_at.asc()
        ).all()

        return jsonify(
            [msg.to_dict() for msg in messages]
        )

    except Exception as e:

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

# ==========================================
# BIRTHDAY WISHES
# ==========================================

@communication_bp.route(
    "/birthday",
    methods=["GET"]
)
def get_birthday_messages():

    try:

        messages = Communication.query.filter_by(
            message_type="birthday"
        ).order_by(
            Communication.created_at.desc()
        ).all()

        return jsonify([
            msg.to_dict()
            for msg in messages
        ])

    except Exception as e:

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# ==========================================
# HR ANNOUNCEMENTS
# ==========================================

@communication_bp.route(
    "/announcements",
    methods=["GET"]
)
def get_announcements():

    try:

        role = request.args.get("role", "").strip().lower()

        if role:
            # If the user is admin or hr, show all announcements
            if role in ["admin", "hr"]:
                announcements = Communication.query.filter_by(
                    message_type="announcement"
                ).order_by(
                    Communication.created_at.desc()
                ).all()
            # If manager, show both 'all' and 'manager' targeted announcements
            elif "manager" in role or "lead" in role:
                announcements = Communication.query.filter(
                    Communication.message_type == "announcement",
                    Communication.target_role.in_(["all", "manager"])
                ).order_by(
                    Communication.created_at.desc()
                ).all()
            # Else (employee/user/standard), show 'all' and 'employee' targeted announcements
            else:
                announcements = Communication.query.filter(
                    Communication.message_type == "announcement",
                    Communication.target_role.in_(["all", "employee"])
                ).order_by(
                    Communication.created_at.desc()
                ).all()
        else:
            announcements = Communication.query.filter_by(
                message_type="announcement"
            ).order_by(
                Communication.created_at.desc()
            ).all()

        return jsonify({
            "success": True,
            "count": len(announcements),
            "announcements": [
                announcement.to_dict()
                for announcement in announcements
            ]
        })

    except Exception as e:

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# ==========================================
# DELETE MESSAGE
# ==========================================

@communication_bp.route(
    "/<int:message_id>",
    methods=["DELETE"]
)
def delete_message(
    message_id
):

    try:

        message = Communication.query.get(
            message_id
        )

        if not message:

            return jsonify({
                "success": False,
                "error": "Message Not Found"
            }), 404

        db.session.delete(
            message
        )

        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Deleted Successfully"
        })

    except Exception as e:

        db.session.rollback()

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500
    
@communication_bp.route(
    "/announcements",
    methods=["POST"]
)
def create_announcement():

    try:

        data = request.json

        announcement = Communication(

            employee_id=None,

            receiver_id=None,

            employee_name="HR Admin",

            message_type="announcement",

            title=data.get("title"),

            target_role=data.get("target_role"),

            message=data.get("message"),

            created_by=data.get("created_by")
        )

        db.session.add(
            announcement
        )

        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Announcement Sent Successfully",
            "announcement": announcement.to_dict()
        }), 201

    except Exception as e:

        db.session.rollback()

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500
    
@communication_bp.route(
    "/conversations/<int:user_id>",
    methods=["GET"]
)
def get_conversations(user_id):

    messages = Communication.query.filter(
        or_(
            Communication.employee_id == user_id,
            Communication.receiver_id == user_id
        )
    ).all()

    users = {}

    for msg in messages:

        other_user = (
            msg.receiver_id
            if msg.employee_id == user_id
            else msg.employee_id
        )

        users[other_user] = True

    return jsonify(
        list(users.keys())
    )

# ==========================================
# CHAT BETWEEN TWO USERS
# ==========================================

@communication_bp.route(
    "/chat/<int:user1>/<int:user2>",
    methods=["GET"]
)
def get_chat_messages(
    user1,
    user2
):

    try:

        messages = Communication.query.filter(

            Communication.message_type == "employee",

            or_(

                db.and_(
                    Communication.employee_id == user1,
                    Communication.receiver_id == user2
                ),

                db.and_(
                    Communication.employee_id == user2,
                    Communication.receiver_id == user1
                )

            )

        ).order_by(
            Communication.created_at.asc()
        ).all()

        return jsonify([
            msg.to_dict()
            for msg in messages
        ])

    except Exception as e:

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500
