# pyrefly: ignore [missing-import]
from utils.compat import Blueprint, jsonify

from models.notification import Notification

notification_bp = Blueprint(
    "notifications",
    __name__
)


from datetime import datetime, date

@notification_bp.route(
    "/<manager_name>",
    methods=["GET"]
)
def get_notifications(manager_name):

    today = date.today()

    notifications = Notification.query.filter_by(
        receiver_name=manager_name
    ).order_by(
        Notification.created_at.desc()
    ).all()

    from models.birthday_wish import BirthdayWish
    from models.employee import Employee

    # Batch fetch all employees and birthday wishes to prevent N+1 queries
    all_employees = Employee.query.all()
    employee_map = {emp.id: emp for emp in all_employees}

    all_wishes = BirthdayWish.query.all()
    wish_map = {wish.id: wish for wish in all_wishes}

    result = []
    for n in notifications:
      thanked = False
      sender_employee_id = None
      sender_name = "System"
      if n.related_type and n.related_id:
          if n.related_type in ('birthday_wish', 'birthday_thanks'):
              wish = wish_map.get(n.related_id)
              if wish:
                  thanked = wish.thanked
                  if n.related_type == 'birthday_wish':
                      sender_employee_id = wish.sender_id
                      emp = employee_map.get(wish.sender_id)
                      if emp:
                          sender_name = f"{emp.first_name} {emp.last_name}"
                  elif n.related_type == 'birthday_thanks':
                      sender_employee_id = wish.receiver_id
                      emp = employee_map.get(wish.receiver_id)
                      if emp:
                          sender_name = f"{emp.first_name} {emp.last_name}"
          elif n.related_type in ('checkin_reminder',):
              sender_employee_id = n.related_id
              emp = employee_map.get(n.related_id)
              if emp:
                  sender_name = f"{emp.first_name} {emp.last_name}"

      result.append({
          "id": n.id,
          "title": n.title,
          "message": n.message,
          "is_read": n.is_read,
          "created_at": n.created_at.isoformat() if n.created_at else None,
          "related_id": n.related_id,
          "related_type": n.related_type,
          "thanked": thanked,
          "sender_employee_id": sender_employee_id,
          "sender_name": sender_name,
          "notification_type": n.notification_type,
          "status": n.status,
          "action_required": n.action_required,
          "resolved": n.resolved,
          "resolved_at": n.resolved_at.isoformat() if n.resolved_at else None
      })

    return jsonify(result)


@notification_bp.route(
    "/<int:id>",
    methods=["DELETE"]
)
def delete_notification(id):
    try:
        notification = Notification.query.get(id)
        if not notification:
            return jsonify({
                "success": False,
                "error": "Notification not found"
            }), 404

        from models.database import db
        db.session.delete(notification)
        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Notification deleted successfully"
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

