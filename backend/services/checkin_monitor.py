from datetime import datetime, timedelta

from models.user import User
from models.employee import Employee
from models.attendance import Attendance
from models.notification import Notification
from models.database import db
from extensions import socketio
from zoneinfo import ZoneInfo
from utils.employee_cache import get_all_employees_cached



def check_missed_checkins():
    try:
        now = datetime.now(ZoneInfo("Asia/Kolkata"))
        today = now.date()

        # Check if there are any pending missed check-in notifications to resolve
        pending_notifs = Notification.query.filter(
            Notification.title.in_(["Missed Check In", "⏰ Missed Check In"])
        ).all()

        if pending_notifs:
            active_employees = [e for e in get_all_employees_cached() if (e.status or "").lower() != "inactive"]
            manager_by_name = {}
            for e in active_employees:
                full_name = " ".join(f"{e.first_name or ''} {e.last_name or ''}".lower().split())
                manager_by_name.setdefault(full_name, e)

            emp_ids = list({n.related_id for n in pending_notifs if n.related_id})
            employees = Employee.query.filter(Employee.id.in_(emp_ids)).all() if emp_ids else []
            emp_by_id = {e.id: e for e in employees}
            user_ids = [e.user_id for e in employees if e.user_id]

            attendances = Attendance.query.filter(
                Attendance.user_id.in_(user_ids),
                Attendance.attendance_date == today
            ).all() if user_ids else []
            checked_in_users = {a.user_id for a in attendances}

            resolved_any = False
            for n in pending_notifs:
                emp = emp_by_id.get(n.related_id)
                if emp and emp.user_id in checked_in_users:
                    db.session.delete(n)
                    resolved_any = True
                    manager_name = " ".join((emp.reporting_manager or "").lower().split())
                    manager_emp = manager_by_name.get(manager_name)
                    if manager_emp:
                        socketio.emit(
                            "manager_notification_resolved",
                            {"notification_id": n.id, "status": "Resolved"},
                            to=str(manager_emp.id)
                        )

            if resolved_any:
                db.session.commit()
                print("[CheckinMonitor] Resolved checked-in employee missed checkin notifications")

    except Exception as e:
        print(f"❌ CHECK-IN MONITOR ERROR: {str(e)}")
        try:
            db.session.rollback()
        except:
            pass
    finally:
        try:
            db.session.remove()
        except:
            pass


def generate_daily_notifications():
    print("\n========== DAILY NOTIFICATIONS GENERATOR RUNNING ==========")
    now = datetime.now(ZoneInfo("Asia/Kolkata"))
    today = now.date()

    try:
        # 1. Fetch all active employees
        employees = [e for e in get_all_employees_cached() if (e.status or "").lower() != "inactive"]
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
                            message=f"Wishing you a very Happy Birthday, {celebrator_name}! May your day be filled with joy and success!",
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
                                    message=f"Today is {celebrator_name}'s birthday! Join us in wishing them a fantastic day and a great year ahead!",
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
                        year_ord = get_year_ordinal(years)
                        print(f"🎉 Today marks {celebrator_name}'s {year_ord} Work Anniversary!")

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
                                message=f"Congratulations on completing your {year_ord} work anniversary with us, {celebrator_name}! Wishing you continued success!",
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
                                        message=f"Today marks {celebrator_name}'s {year_ord} work anniversary! Join us in congratulating them on this wonderful milestone!",
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

        # Reformat existing notification messages in DB so UI updates immediately
        try:
            import re
            existing_notifs = Notification.query.filter(
                Notification.related_type.in_(["anniversary_reminder", "anniversary_self", "birthday_reminder", "birthday_self"])
            ).all()
            for n in existing_notifs:
                msg = n.message or ""
                m_ann = re.search(r"Today is (.+?)'s (\d+)-year work anniversary\. ", msg)
                if m_ann:
                    c_name = m_ann.group(1)
                    yrs = int(m_ann.group(2))
                    n.message = f"Today marks {c_name}'s {get_year_ordinal(yrs)} work anniversary! Join us in congratulating them on this wonderful milestone!"
                m_bday = re.search(r"Today is (.+?)'s birthday\. Wish them!", msg)
                if m_bday:
                    c_name = m_bday.group(1)
                    n.message = f"Today is {c_name}'s birthday! Join us in wishing them a fantastic day and a great year ahead!"
        except Exception as update_err:
            print("Notice: Existing notifications reformat error:", str(update_err))

        db.session.commit()
        
    except Exception as e:
        db.session.rollback()
        print("Failed to generate daily notifications:", str(e))
        import traceback
        traceback.print_exc()
    finally:
        try:
            db.session.remove()
        except Exception as dbe:
            print(f"Error removing db session: {dbe}")