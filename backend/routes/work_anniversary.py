from utils.compat import Blueprint, request, jsonify
from datetime import date, datetime
from models.database import db
from models.employee import Employee
from models.work_anniversary_wish import WorkAnniversaryWish
from models.notification import Notification
from sqlalchemy import extract
from extensions import socketio


work_anniversary_bp = Blueprint(
    "work_anniversary",
    __name__,
    url_prefix="/api/work-anniversary"
)


@work_anniversary_bp.route("/today", methods=["GET"])
def get_today_work_anniversaries():
    today = date.today()
    sender_id_str = request.args.get("sender_id")
    sender_id = int(sender_id_str) if sender_id_str and sender_id_str.isdigit() else None

    employees = Employee.query.filter(
        extract("month", Employee.joining_date) == today.month,
        extract("day", Employee.joining_date) == today.day,
        Employee.is_active != False
    ).all()

    today_start = datetime.combine(today, datetime.min.time())
    wished_receiver_ids = set()
    if sender_id:
        existing_wishes = WorkAnniversaryWish.query.filter(
            WorkAnniversaryWish.sender_id == sender_id,
            WorkAnniversaryWish.created_at >= today_start
        ).all()
        wished_receiver_ids = {w.receiver_id for w in existing_wishes}

    anniversaries = []

    for employee in employees:
        joining_date = employee.joining_date
        if (
            joining_date and
            joining_date.month == today.month and
            joining_date.day == today.day
        ):
            years_completed = today.year - joining_date.year
            # Exclude self and employees who have already been wished today
            if (sender_id and employee.id == sender_id) or (employee.id in wished_receiver_ids):
                continue

            anniversaries.append({
                "id": employee.id,
                "user_id": employee.user_id,
                "employee_id": employee.employee_id,
                "first_name": employee.first_name,
                "last_name": employee.last_name,
                "full_name": f"{employee.first_name} {employee.last_name or ''}".strip(),
                "designation": employee.designation,
                "department": employee.department,
                "joining_date": joining_date.strftime("%d %b %Y"),
                "years_completed": years_completed,
                "profile_image": employee.profile_image is not None,
                "wished": False
            })

    return jsonify({
        "success": True,
        "count": len(anniversaries),
        "employees": anniversaries
    }), 200


@work_anniversary_bp.route("/wish", methods=["POST"])
@work_anniversary_bp.route("/", methods=["POST"])
def send_work_anniversary_wish():
    try:
        data = request.json or {}
        sender_id = data.get("sender_id")
        receiver_id = data.get("receiver_id")
        message = data.get("message")

        if not sender_id or not receiver_id or not message:
            return jsonify({"success": False, "error": "Missing required fields"}), 400

        today_start = datetime.combine(date.today(), datetime.min.time())
        existing = WorkAnniversaryWish.query.filter(
            WorkAnniversaryWish.sender_id == sender_id,
            WorkAnniversaryWish.receiver_id == receiver_id,
            WorkAnniversaryWish.created_at >= today_start
        ).first()

        if existing:
            return jsonify({"success": False, "error": "You have already sent anniversary wishes today."}), 400

        wish = WorkAnniversaryWish(
            sender_id=sender_id,
            receiver_id=receiver_id,
            message=message,
            status="Sent",
            thanked=False
        )
        db.session.add(wish)
        db.session.flush()

        sender = Employee.query.get(sender_id)
        receiver = Employee.query.get(receiver_id)

        if not sender or not receiver:
            return jsonify({"success": False, "error": "Sender or Receiver not found"}), 404

        sender_full_name = f"{sender.first_name} {sender.last_name}".strip()
        receiver_full_name = f"{receiver.first_name} {receiver.last_name}".strip()

        notification = Notification(
            receiver_name=receiver_full_name,
            title="🎗️ Work Anniversary Wishes",
            message=f"{sender_full_name} wished you: \"{message}\"",
            is_read=False,
            related_id=wish.id,
            related_type="anniversary_wish"
        )
        db.session.add(notification)
        db.session.commit()

        notif_dict = {
            "id": notification.id,
            "title": notification.title,
            "message": notification.message,
            "is_read": notification.is_read,
            "created_at": notification.created_at.isoformat() if notification.created_at else None,
            "related_id": wish.id,
            "related_type": "anniversary_wish",
            "thanked": False,
            "sender_employee_id": sender_id
        }

        try:
            socketio.emit(
                "anniversary_wish_sent",
                notif_dict,
                to=str(receiver_id)
            )
        except Exception as se:
            print("Socket emit anniversary_wish_sent failed:", se)

        return jsonify({
            "success": True,
            "message": "Work anniversary wish sent successfully!",
            "wish": wish.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 500


@work_anniversary_bp.route("/thank/<int:wish_id>", methods=["POST"])
def send_anniversary_thanks(wish_id):
    try:
        wish = WorkAnniversaryWish.query.get(wish_id)
        if not wish:
            return jsonify({"success": False, "error": "Work anniversary wish not found"}), 404

        if wish.thanked:
            return jsonify({"success": False, "error": "You have already thanked this sender."}), 400

        wish.thanked = True
        wish.thanked_at = datetime.utcnow()

        sender = Employee.query.get(wish.sender_id)
        receiver = Employee.query.get(wish.receiver_id)

        if not sender or not receiver:
            return jsonify({"success": False, "error": "Sender or Receiver not found"}), 404

        receiver_full_name = f"{receiver.first_name} {receiver.last_name}".strip()
        sender_full_name = f"{sender.first_name} {sender.last_name}".strip()

        notification = Notification(
            receiver_name=sender_full_name,
            title="🎉 Thank You",
            message=f"{receiver_full_name} thanked you for your work anniversary wishes.",
            is_read=False,
            related_id=wish_id,
            related_type="anniversary_thanks"
        )
        db.session.add(notification)
        db.session.commit()

        notif_dict = {
            "id": notification.id,
            "title": notification.title,
            "message": notification.message,
            "is_read": notification.is_read,
            "created_at": notification.created_at.isoformat() if notification.created_at else None,
            "related_id": wish_id,
            "related_type": "anniversary_thanks",
            "thanked": True,
            "sender_employee_id": wish.receiver_id
        }

        try:
            socketio.emit(
                "anniversary_thanks_sent",
                notif_dict,
                to=str(wish.sender_id)
            )
        except Exception as se:
            print("Socket emit anniversary_thanks_sent failed:", se)

        return jsonify({
            "success": True,
            "message": "Thanks sent successfully!",
            "wish": wish.to_dict()
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 500