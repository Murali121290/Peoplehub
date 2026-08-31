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

        # Map employee IDs to full names for any legacy integer likes
        from utils.employee_cache import get_all_employees_cached
        all_emps = get_all_employees_cached()
        emp_map = {e.id: f"{e.first_name} {e.last_name}".strip() for e in all_emps}
        # Also map user_id if employee.id differs
        for e in all_emps:
            if e.user_id and e.user_id not in emp_map:
                emp_map[e.user_id] = f"{e.first_name} {e.last_name}".strip()

        formatted_announcements = []
        for ann in announcements:
            d = ann.to_dict()
            likes = d.get("likes", [])
            normalized_likes = []
            for l in likes:
                if isinstance(l, dict):
                    normalized_likes.append(l)
                elif isinstance(l, int):
                    name = emp_map.get(l, f"Employee #{l}")
                    normalized_likes.append({
                        "employee_id": l,
                        "name": name,
                        "reaction": "👍"
                    })
            d["likes"] = normalized_likes
            formatted_announcements.append(d)

        return jsonify({
            "success": True,
            "count": len(formatted_announcements),
            "announcements": formatted_announcements
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

            image_url=data.get("image_url"),

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

# ==========================================
# TOGGLE LIKE
# ==========================================

@communication_bp.route(
    "/<int:message_id>/like",
    methods=["POST"]
)
def toggle_like(message_id):
    try:
        data = request.json
        employee_id = data.get("employee_id")
        reaction_emoji = data.get("reaction", "👍")
        employee_name = data.get("employee_name", "")

        if not employee_id:
            return jsonify({"success": False, "error": "employee_id required"}), 400

        message = Communication.query.get(message_id)
        if not message:
            return jsonify({"success": False, "error": "Message Not Found"}), 404

        # Normalize likes JSON column into list of reaction dict objects
        raw_likes = list(message.likes) if message.likes else []
        reactions_list = []

        for item in raw_likes:
            if isinstance(item, dict):
                reactions_list.append(item)
            elif isinstance(item, int):
                # Legacy compatibility: fallback integer ID to standard dict
                reactions_list.append({
                    "employee_id": item,
                    "name": f"Employee #{item}",
                    "reaction": "👍"
                })

        # Fetch employee details if name was not provided
        if not employee_name:
            from models.employee import Employee
            from sqlalchemy import or_
            emp = Employee.query.filter(
                or_(
                    Employee.id == employee_id,
                    Employee.user_id == employee_id,
                    Employee.employee_id == str(employee_id)
                )
            ).first()
            if emp:
                employee_name = f"{emp.first_name} {emp.last_name}".strip()
            else:
                employee_name = f"User #{employee_id}"

        # Check if this user already reacted with the exact same emoji
        existing_idx = -1
        for idx, item in enumerate(reactions_list):
            if item.get("employee_id") == employee_id:
                existing_idx = idx
                break

        if existing_idx != -1:
            prev_reaction = reactions_list[existing_idx].get("reaction")
            if prev_reaction == reaction_emoji:
                # Remove reaction if clicking the same emoji again
                reactions_list.pop(existing_idx)
            else:
                # Update emoji reaction
                reactions_list[existing_idx] = {
                    "employee_id": employee_id,
                    "name": employee_name,
                    "reaction": reaction_emoji
                }
        else:
            # Add new reaction
            reactions_list.append({
                "employee_id": employee_id,
                "name": employee_name,
                "reaction": reaction_emoji
            })

        message.likes = reactions_list
        
        # This tells SQLAlchemy that the JSON column changed
        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(message, "likes")
        
        db.session.commit()

        return jsonify({"success": True, "likes": reactions_list})
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 500


# ==========================================
# SEEN ANNOUNCEMENT TRACKING
# ==========================================

@communication_bp.route(
    "/seen",
    methods=["POST"]
)
def mark_announcements_seen():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": "Request body missing"}), 400
            
        user_id = data.get("user_id")
        announcement_ids = data.get("announcement_ids", [])
        if not user_id:
            return jsonify({"success": False, "error": "user_id is required"}), 400

        from models.user import User
        user = User.query.get(user_id)
        if not user:
            return jsonify({"success": False, "error": "User not found"}), 404

        # Merge new announcement IDs
        current_seen = list(user.seen_announcement_ids) if getattr(user, 'seen_announcement_ids', None) else []
        
        # Ensure unique integer/string values
        merged = list(set(current_seen + [int(aid) for aid in announcement_ids]))
        user.seen_announcement_ids = merged
        
        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(user, "seen_announcement_ids")
        db.session.commit()

        # Emit update to all active socket connections of this user
        from models.employee import Employee
        employee = Employee.query.filter_by(user_id=user.id).first()
        if employee:
            socketio.emit(
                "announcements_seen_update",
                {"seen_announcement_ids": merged},
                room=str(employee.id)
            )

        return jsonify({"success": True, "seen_announcement_ids": merged})
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 500


@communication_bp.route(
    "/seen/<int:user_id>",
    methods=["GET"]
)
def get_seen_announcements(user_id):
    try:
        from models.user import User
        user = User.query.get(user_id)
        if not user:
            return jsonify({"success": False, "error": "User not found"}), 404

        seen = list(user.seen_announcement_ids) if getattr(user, 'seen_announcement_ids', None) else []
        return jsonify({"success": True, "seen_announcement_ids": seen})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ==========================================
# UPLOAD ANNOUNCEMENT IMAGE
# ==========================================

@communication_bp.route(
    "/upload-image",
    methods=["POST"]
)
def upload_announcement_image():
    try:
        content_type = request.headers.get("content-type")
        if not content_type or "multipart/form-data" not in content_type:
            return jsonify({
                "success": False,
                "error": "Request must be multipart/form-data"
            }), 400

        file = request.files.get("image")
        if not file or not file.filename:
            return jsonify({
                "success": False,
                "error": "No image file uploaded"
            }), 400

        import os
        filename = file.filename
        ext = os.path.splitext(filename)[1].lower()
        if ext not in [".jpg", ".jpeg", ".png", ".gif", ".webp"]:
            return jsonify({
                "success": False,
                "error": "Unsupported file format. Please upload an image."
            }), 400

        # Check file size (3MB limit)
        file.file.seek(0, os.SEEK_END)
        file_size = file.file.tell()
        file.file.seek(0)

        if file_size > 3 * 1024 * 1024:
            return jsonify({
                "success": False,
                "error": "Image size exceeds the 3MB maximum limit."
            }), 400

        from utils.uploads import ensure_upload_dir
        from datetime import datetime

        target_dir = ensure_upload_dir("announcements")
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        target_filename = f"announcement_{timestamp}{ext}"
        target_path = os.path.join(target_dir, target_filename)
        
        file.save(target_path)
        
        image_url = f"/uploads/announcements/{target_filename}"

        return jsonify({
            "success": True,
            "image_url": image_url
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# ==========================================
# JOB OPENINGS ENDPOINTS
# ==========================================

@communication_bp.route(
    "/job-openings",
    methods=["POST"]
)
def create_job_opening():
    try:
        data = request.json
        job = Communication(
            employee_id=None,
            receiver_id=None,
            employee_name="HR Admin",
            message_type="job_opening",
            title=data.get("title"),
            target_role="all",
            message=data.get("message"),
            image_url=data.get("image_url"),
            created_by=data.get("created_by")
        )
        db.session.add(job)
        db.session.commit()
        return jsonify({
            "success": True,
            "message": "Job Opening Posted Successfully",
            "job_opening": job.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@communication_bp.route(
    "/job-openings",
    methods=["GET"]
)
def get_job_openings():
    try:
        jobs = Communication.query.filter_by(
            message_type="job_opening"
        ).order_by(
            Communication.created_at.desc()
        ).all()
        return jsonify({
            "success": True,
            "count": len(jobs),
            "job_openings": [j.to_dict() for j in jobs]
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@communication_bp.route(
    "/job-openings/<int:job_id>",
    methods=["PUT"]
)
def update_job_opening(job_id):
    try:
        data = request.json
        job = Communication.query.get(job_id)
        if not job or job.message_type != "job_opening":
            return jsonify({
                "success": False,
                "error": "Job Opening Not Found"
            }), 404
        
        job.title = data.get("title", job.title)
        job.message = data.get("message", job.message)
        job.image_url = data.get("image_url", job.image_url)
        db.session.commit()
        
        return jsonify({
            "success": True,
            "message": "Job Opening Updated Successfully",
            "job_opening": job.to_dict()
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500
