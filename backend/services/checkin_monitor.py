from datetime import datetime, timedelta

from models.user import User
from models.employee import Employee
from models.attendance import Attendance
from models.notification import Notification
from models.database import db
from extensions import socketio
from zoneinfo import ZoneInfo



def check_missed_checkins():

    print("\n========== CHECK-IN MONITOR RUNNING ==========")

    now = datetime.now(ZoneInfo("Asia/Kolkata"))
    start_of_today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    one_minute_ago = now - timedelta(minutes=1)

    users = User.query.filter(
        User.last_login.isnot(None),
        User.last_login >= start_of_today,
        User.last_login <= one_minute_ago
    ).all()

    print(
        f"Users Found: {len(users)}"
    )

    for user in users:

        print(
            f"Checking User: {user.full_name}"
        )

        employee = Employee.query.filter_by(
            user_id=user.id
        ).first()

        if not employee:

            print(
                f"No Employee Record for User ID {user.id}"
            )

            continue

        print(
            f"Employee Found: {employee.employee_id}"
        )

        # Check today's attendance
        today = datetime.now(ZoneInfo("Asia/Kolkata")).date()

        today_attendance = Attendance.query.filter(
        Attendance.user_id == user.id,
        Attendance.attendance_date == today
        ).first()
        print(
            f"User={user.id}",
            f"Attendance={today_attendance}"
        )

        
        if today_attendance:
            print(
                f"{employee.employee_id} already has attendance today"
            )

            # Clean up and resolve any active missed check-in notifications
            manager_name = employee.reporting_manager.strip().lower()
            manager_emp = None
            for e in Employee.query.all():
                full_name = f"{e.first_name} {e.last_name}".strip().lower()
                if full_name == manager_name:
                    manager_emp = e
                    break

            pending_notifs = Notification.query.filter(
                Notification.title.in_(["Missed Check In", "⏰ Missed Check In"]),
                Notification.related_id == employee.id
            ).all()

            for n in pending_notifs:
                db.session.delete(n)
                if manager_emp:
                    socketio.emit(
                        "manager_notification_resolved",
                        {"notification_id": n.id, "status": "Resolved"},
                        to=str(manager_emp.id)
                    )

            db.session.commit()
            continue

        # Check duplicate notification
        already_sent = Notification.query.filter(
            Notification.title == "⏰ Missed Check In",
            Notification.related_id == employee.id
        ).first()

        if already_sent:
            print(
                f"Notification already sent for {employee.employee_id}"
            )
            continue

        # Check reporting manager
        if not employee.reporting_manager:
            print(
                f"{employee.employee_id} has no reporting manager"
            )
            continue

        # Create notification
        notification = Notification(
            receiver_name=employee.reporting_manager,
            title="⏰ Missed Check In",
            message=f"Employee {employee.employee_id} - {employee.first_name} {employee.last_name} logged into the system but has not checked in within the allowed time.",
            related_id=employee.id,
            related_type="missed_checkin",
            notification_type="missed_checkin",
            status="Pending",
            action_required=True,
            resolved=False
        )

        db.session.add(notification)
        db.session.flush() # Flush to populate ID before emitting

        # Lookup reporting manager employee ID
        manager_name = employee.reporting_manager.strip().lower()
        manager_emp = None
        for e in Employee.query.all():
            full_name = f"{e.first_name} {e.last_name}".strip().lower()
            if full_name == manager_name:
                manager_emp = e
                break

        if manager_emp:
            notif_dict = {
                "id": notification.id,
                "title": notification.title,
                "message": notification.message,
                "is_read": False,
                "created_at": notification.created_at.isoformat() if notification.created_at else None,
                "related_id": notification.related_id,
                "related_type": notification.related_type,
                "thanked": False,
                "sender_employee_id": employee.id,
                "sender_name": f"{employee.first_name} {employee.last_name}",
                "notification_type": notification.notification_type,
                "status": notification.status,
                "action_required": notification.action_required,
                "resolved": notification.resolved,
                "resolved_at": None
            }
            socketio.emit(
                "missed_checkin_created",
                notif_dict,
                to=str(manager_emp.id)
            )

        print(
            f"Notification Created For: {employee.reporting_manager}"
        )

    try:
        db.session.commit()
        print("Notifications Saved Successfully")
    except Exception as e:
        db.session.rollback()
        print(f"Database Error: {str(e)}")

    print("========== CHECK-IN MONITOR COMPLETED ==========\n")


def generate_daily_notifications():
    print("\n========== DAILY NOTIFICATIONS GENERATOR RUNNING ==========")
    now = datetime.now(ZoneInfo("Asia/Kolkata"))
    today = now.date()

    try:
        # 1. Fetch all active employees
        employees = Employee.query.all()
        print(f"Checking birthdays and anniversaries for {len(employees)} employees...")

        for emp in employees:
            # 2. Check Birthday
            if emp.dob:
                if emp.dob.month == today.month and emp.dob.day == today.day:
                    celebrator_name = f"{emp.first_name} {emp.last_name or ''}".strip()
                    print(f"🎂 Today is {celebrator_name}'s Birthday!")

                    # Check if notification already exists to avoid duplication
                    existing = Notification.query.filter_by(
                        receiver_name=celebrator_name,
                        title="🎂 Happy Birthday!",
                        related_id=emp.id,
                        related_type="birthday_self"
                    ).first()

                    if not existing:
                        # A. Congratulatory notification to the celebrating employee
                        notif_self = Notification(
                            receiver_name=celebrator_name,
                            title="🎂 Happy Birthday!",
                            message=f"Happy Birthday, {celebrator_name}! Have a wonderful day ahead.",
                            is_read=False,
                            related_id=emp.id,
                            related_type="birthday_self"
                        )
                        db.session.add(notif_self)
                        db.session.flush()

                        # Emit real-time socket event to celebrating employee
                        socketio.emit("general_notification_created", {
                            "id": notif_self.id,
                            "title": notif_self.title,
                            "message": notif_self.message,
                            "is_read": False,
                            "created_at": notif_self.created_at.isoformat() if notif_self.created_at else datetime.utcnow().isoformat(),
                            "related_id": emp.id,
                            "related_type": "birthday_self",
                            "celebrator_name": celebrator_name
                        }, to=str(emp.id))

                        # B. Notification to all other employees
                        for other_emp in employees:
                            if other_emp.id != emp.id:
                                other_name = f"{other_emp.first_name} {other_emp.last_name or ''}".strip()
                                notif_other = Notification(
                                    receiver_name=other_name,
                                    title="🎂 Birthday Reminder",
                                    message=f"Today is {celebrator_name}'s birthday. Wish them!",
                                    is_read=False,
                                    related_id=emp.id,
                                    related_type="birthday_reminder"
                                )
                                db.session.add(notif_other)
                                db.session.flush()

                                # Emit real-time socket event to other employees
                                socketio.emit("general_notification_created", {
                                    "id": notif_other.id,
                                    "title": notif_other.title,
                                    "message": notif_other.message,
                                    "is_read": False,
                                    "created_at": notif_other.created_at.isoformat() if notif_other.created_at else datetime.utcnow().isoformat(),
                                    "related_id": emp.id,
                                    "related_type": "birthday_reminder",
                                    "celebrator_name": celebrator_name
                                }, to=str(other_emp.id))

            # 3. Check Work Anniversary
            if emp.joining_date:
                if emp.joining_date.month == today.month and emp.joining_date.day == today.day:
                    years = today.year - emp.joining_date.year
                    if years > 0:
                        celebrator_name = f"{emp.first_name} {emp.last_name or ''}".strip()
                        print(f"🎉 Today is {celebrator_name}'s {years}-year Work Anniversary!")

                        # Check if notification already exists to avoid duplication
                        existing = Notification.query.filter_by(
                            receiver_name=celebrator_name,
                            title="🎉 Work Anniversary!",
                            related_id=emp.id,
                            related_type="anniversary_self"
                        ).first()

                        if not existing:
                            # A. Congratulatory notification to the celebrating employee
                            notif_self = Notification(
                                receiver_name=celebrator_name,
                                title="🎉 Work Anniversary!",
                                message=f"Congratulations on completing {years} year{'s' if years > 1 else ''} with us, {celebrator_name}!",
                                is_read=False,
                                related_id=emp.id,
                                related_type="anniversary_self"
                            )
                            db.session.add(notif_self)
                            db.session.flush()

                            # Emit real-time socket event to celebrating employee
                            socketio.emit("general_notification_created", {
                                "id": notif_self.id,
                                "title": notif_self.title,
                                "message": notif_self.message,
                                "is_read": False,
                                "created_at": notif_self.created_at.isoformat() if notif_self.created_at else datetime.utcnow().isoformat(),
                                "related_id": emp.id,
                                "related_type": "anniversary_self",
                                "celebrator_name": celebrator_name
                            }, to=str(emp.id))

                            # B. Notification to all other employees
                            for other_emp in employees:
                                if other_emp.id != emp.id:
                                    other_name = f"{other_emp.first_name} {other_emp.last_name or ''}".strip()
                                    notif_other = Notification(
                                        receiver_name=other_name,
                                        title="🎉 Anniversary Reminder",
                                        message=f"Today is {celebrator_name}'s {years}-year work anniversary. Congratulate them!",
                                        is_read=False,
                                        related_id=emp.id,
                                        related_type="anniversary_reminder"
                                    )
                                    db.session.add(notif_other)
                                    db.session.flush()

                                    # Emit real-time socket event to other employees
                                    socketio.emit("general_notification_created", {
                                        "id": notif_other.id,
                                        "title": notif_other.title,
                                        "message": notif_other.message,
                                        "is_read": False,
                                        "created_at": notif_other.created_at.isoformat() if notif_other.created_at else datetime.utcnow().isoformat(),
                                        "related_id": emp.id,
                                        "related_type": "anniversary_reminder",
                                        "celebrator_name": celebrator_name
                                    }, to=str(other_emp.id))

        db.session.commit()
        print("========== DAILY NOTIFICATIONS GENERATOR COMPLETED ==========\n")
    except Exception as e:
        db.session.rollback()
        print("Failed to generate daily notifications:", str(e))
        import traceback
        traceback.print_exc()