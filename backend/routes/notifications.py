# pyrefly: ignore [missing-import]
from utils.compat import Blueprint, jsonify

from models.notification import Notification

notification_bp = Blueprint(
    "notifications",
    __name__
)


from datetime import datetime, date
import json, os

def _get_redis():
    """Return a Redis client if REDIS_URL is set, else None."""
    try:
        import redis
        url = os.environ.get("REDIS_URL", "redis://redis:6379/0")
        return redis.from_url(url, decode_responses=True, socket_connect_timeout=1)
    except Exception:
        return None

@notification_bp.route(
    "/<manager_name>",
    methods=["GET"]
)
def get_notifications(manager_name):
    CACHE_TTL = 15  # seconds

    # Try Redis cache first
    r = _get_redis()
    cache_key = f"notifications:{manager_name}"
    if r:
        try:
            cached = r.get(cache_key)
            if cached:
                return jsonify(json.loads(cached))
        except Exception:
            pass

    today = date.today()

    notifications = Notification.query.filter_by(
        receiver_name=manager_name
    ).order_by(
        Notification.created_at.desc()
    ).all()

    from models.birthday_wish import BirthdayWish
    from utils.employee_cache import get_all_employees_cached

    # Batch fetch all employees and birthday wishes to prevent N+1 queries (exclude inactive)
    all_employees = [e for e in get_all_employees_cached() if e.is_active != False]
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

    # Store in Redis cache
    if r:
        try:
            r.setex(cache_key, CACHE_TTL, json.dumps(result))
        except Exception:
            pass

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
        receiver_name = notification.receiver_name
        db.session.delete(notification)
        db.session.commit()

        # Invalidate Redis cache for this receiver
        r = _get_redis()
        if r:
            try:
                r.delete(f"notifications:{receiver_name}")
            except Exception:
                pass

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
