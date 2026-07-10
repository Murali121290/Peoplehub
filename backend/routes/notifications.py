from flask import Blueprint, jsonify

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

    # Automatically prune "Missed Check In" alerts from previous days
    try:
        from models.database import db
        start_of_today = datetime.combine(today, datetime.min.time())
        Notification.query.filter(
            Notification.title == "Missed Check In",
            Notification.created_at < start_of_today
        ).delete(synchronize_session=False)
        db.session.commit()
    except Exception as prune_err:
        print("Failed to prune old Missed Check In alerts:", str(prune_err))

    notifications = Notification.query.filter_by(
        receiver_name=manager_name
    ).order_by(
        Notification.created_at.desc()
    ).all()

    # Return filtered list (making sure no old missed check in alerts bypass)
    filtered = []
    for n in notifications:
        if n.title == "Missed Check In":
            if n.created_at.date() != today:
                continue
        filtered.append(n)

    return jsonify([
        {
            "id": n.id,
            "title": n.title,
            "message": n.message,
            "is_read": n.is_read,
            "created_at": (
                n.created_at.isoformat()
            )
        }
        for n in filtered
    ])


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