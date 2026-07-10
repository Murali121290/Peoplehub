# pyrefly: ignore [missing-import]
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

    from models.birthday_wish import BirthdayWish
    from models.employee import Employee

    result = []
    for n in filtered:
      thanked = False
      sender_employee_id = None
      sender_name = "System"
      if n.related_type and n.related_id:
          if n.related_type in ('birthday_wish', 'birthday_thanks'):
              wish = BirthdayWish.query.get(n.related_id)
              if wish:
                  thanked = wish.thanked
                  if n.related_type == 'birthday_wish':
                      sender_employee_id = wish.sender_id
                      emp = Employee.query.get(wish.sender_id)
                      if emp:
                          sender_name = f"{emp.first_name} {emp.last_name}"
                  elif n.related_type == 'birthday_thanks':
                      sender_employee_id = wish.receiver_id
                      emp = Employee.query.get(wish.receiver_id)
                      if emp:
                          sender_name = f"{emp.first_name} {emp.last_name}"
          elif n.related_type in ('missed_checkin', 'checkin_reminder', 'employee_checked_in'):
              sender_employee_id = n.related_id
              emp = Employee.query.get(n.related_id)
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


@notification_bp.route("/remind-checkin", methods=["POST"])
def remind_checkin():
    try:
        from flask import request
        from models.database import db
        from extensions import socketio
        from models.employee import Employee

        data = request.get_json() or {}
        notification_id = data.get("notification_id")
        if not notification_id:
            return jsonify({"success": False, "error": "notification_id is required"}), 400

        # Find the missed check-in notification
        missed_notif = Notification.query.get(notification_id)
        if not missed_notif:
            return jsonify({"success": False, "error": "Notification not found"}), 404

        # Verify status is Pending
        if missed_notif.status != "Pending":
            return jsonify({"success": False, "error": "Reminder has already been sent or resolved"}), 400

        # Mark missed checkin notification as "Reminder Sent"
        missed_notif.status = "Reminder Sent"
        db.session.commit()

        # Let's find the employee who missed check-in
        employee = Employee.query.get(missed_notif.related_id)
        if not employee:
            return jsonify({"success": False, "error": "Employee not found"}), 404

        # Let's find the manager employee details
        manager_name = employee.reporting_manager.strip().lower() if employee.reporting_manager else ""
        manager_emp = None
        for e in Employee.query.all():
            full_name = f"{e.first_name} {e.last_name}".strip().lower()
            if full_name == manager_name:
                manager_emp = e
                break

        if manager_emp:
            # Emit status update event to manager so UI updates instantly
            socketio.emit(
                "manager_notification_resolved",
                {"notification_id": missed_notif.id, "status": "Reminder Sent"},
                to=str(manager_emp.id)
            )

        # Create a new reminder notification for the employee
        reminder_notif = Notification(
            receiver_name=f"{employee.first_name} {employee.last_name}",
            title="🔔 Check-In Reminder",
            message="Your manager noticed that you have not completed today's attendance check-in. Please complete your check-in now.",
            related_id=employee.id,
            related_type="checkin_reminder",
            notification_type="checkin_reminder",
            status="Pending",
            action_required=True,
            resolved=False
        )
        db.session.add(reminder_notif)
        db.session.flush()

        # Emit checkin_reminder_sent socket event to the employee
        reminder_dict = {
            "id": reminder_notif.id,
            "title": reminder_notif.title,
            "message": reminder_notif.message,
            "is_read": False,
            "created_at": reminder_notif.created_at.isoformat() if reminder_notif.created_at else None,
            "related_id": reminder_notif.related_id,
            "related_type": reminder_notif.related_type,
            "thanked": False,
            "sender_employee_id": manager_emp.id if manager_emp else None,
            "sender_name": f"{manager_emp.first_name} {manager_emp.last_name}" if manager_emp else "System",
            "notification_type": reminder_notif.notification_type,
            "status": reminder_notif.status,
            "action_required": reminder_notif.action_required,
            "resolved": reminder_notif.resolved,
            "resolved_at": None
        }
        socketio.emit("checkin_reminder_sent", reminder_dict, to=str(employee.id))
        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Check-in reminder sent successfully!"
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 500