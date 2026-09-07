# pyrefly: ignore [missing-import]
from utils.compat import Blueprint, request, jsonify
from datetime import datetime, date
from models.database import db
from models.birthday_wish import BirthdayWish
from models.notification import Notification
from models.employee import Employee
from extensions import socketio

birthday_wishes_bp = Blueprint("birthday_wishes", __name__)

@birthday_wishes_bp.route("/", methods=["POST"])
def send_birthday_wish():
    try:
        data = request.json
        sender_id = data.get("sender_id")
        receiver_id = data.get("receiver_id")
        message = data.get("message")

        if not sender_id or not receiver_id or not message:
            return jsonify({"success": False, "error": "Missing required fields"}), 400

        # One employee can send only one birthday wish per birthday (checked by date today)
        today_start = datetime.combine(date.today(), datetime.min.time())
        existing = BirthdayWish.query.filter(
            BirthdayWish.sender_id == sender_id,
            BirthdayWish.receiver_id == receiver_id,
            BirthdayWish.created_at >= today_start
        ).first()

        if existing:
            return jsonify({"success": False, "error": "You have already sent birthday wishes today."}), 400

        wish = BirthdayWish(
            sender_id=sender_id,
            receiver_id=receiver_id,
            message=message,
            status="Sent",
            thanked=False
        )
        db.session.add(wish)
        db.session.flush() # populated wish.id

        # Fetch sender and receiver employee records
        sender = Employee.query.get(sender_id)
        receiver = Employee.query.get(receiver_id)

        if not sender or not receiver:
            return jsonify({"success": False, "error": "Sender or Receiver not found"}), 404

        sender_full_name = f"{sender.first_name} {sender.last_name or ''}".strip()
        receiver_full_name = f"{receiver.first_name} {receiver.last_name or ''}".strip()

        # Create notification for receiver
        notification = Notification(
            receiver_name=receiver_full_name,
            title="🎂 Birthday Wishes",
            message=f"{sender_full_name} wished you: \"{message}\"",
            is_read=False,
            related_id=wish.id,
            related_type="birthday_wish"
        )
        db.session.add(notification)
        db.session.commit()

        # Build notification dictionary payload
        notif_dict = {
            "id": notification.id,
            "title": notification.title,
            "message": notification.message,
            "is_read": notification.is_read,
            "created_at": notification.created_at.isoformat() if notification.created_at else None,
            "related_id": wish.id,
            "related_type": "birthday_wish",
            "thanked": False,
            "sender_employee_id": sender_id
        }

        # Emit birthday_wish_sent to receiver's socket room
        socketio.emit(
            "birthday_wish_sent",
            notif_dict,
            to=str(receiver_id)
        )

        return jsonify({
            "success": True,
            "message": "Birthday wish sent successfully!",
            "wish": wish.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 500

@birthday_wishes_bp.route("/thank/<int:wish_id>", methods=["POST"])
def send_thanks(wish_id):
    try:
        wish = BirthdayWish.query.get(wish_id)
        if not wish:
            return jsonify({"success": False, "error": "Birthday wish not found"}), 404

        if wish.thanked:
            return jsonify({"success": False, "error": "You have already thanked this sender."}), 400

        wish.thanked = True
        wish.thanked_at = datetime.utcnow()

        # Fetch sender and receiver employees
        sender = Employee.query.get(wish.sender_id)
        receiver = Employee.query.get(wish.receiver_id)

        if not sender or not receiver:
            return jsonify({"success": False, "error": "Sender or Receiver not found"}), 404

        receiver_full_name = f"{receiver.first_name} {receiver.last_name or ''}".strip()
        sender_full_name = f"{sender.first_name} {sender.last_name or ''}".strip()

        # Create notification for the sender of the wish
        notification = Notification(
            receiver_name=sender_full_name,
            title="🎉 Thank You",
            message=f"{receiver_full_name} thanked you for your birthday wishes.",
            is_read=False,
            related_id=wish_id,
            related_type="birthday_thanks"
        )
        db.session.add(notification)
        db.session.commit()

        # Build notification dictionary payload
        notif_dict = {
            "id": notification.id,
            "title": notification.title,
            "message": notification.message,
            "is_read": notification.is_read,
            "created_at": notification.created_at.isoformat() if notification.created_at else None,
            "related_id": wish_id,
            "related_type": "birthday_thanks",
            "thanked": True,
            "sender_employee_id": wish.receiver_id # sender of thanks is receiver of wish
        }

        # Emit birthday_thanks_sent to sender's socket room
        socketio.emit(
            "birthday_thanks_sent",
            notif_dict,
            to=str(wish.sender_id)
        )

        return jsonify({
            "success": True,
            "message": "Thanks sent successfully!",
            "wish": wish.to_dict()
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 500
