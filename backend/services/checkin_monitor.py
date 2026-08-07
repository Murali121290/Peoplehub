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
    print("\n========== CHECK-IN MONITOR RUNNING ==========")

    try:
        now = datetime.now(ZoneInfo("Asia/Kolkata"))
        start_of_today = now.replace(hour=0, minute=0, second=0, microsecond=0)
        one_minute_ago = now - timedelta(minutes=1)

        users = User.query.filter(
            User.last_login.isnot(None),
            User.last_login >= start_of_today,
            User.last_login <= one_minute_ago
        ).all()

        print(f"Users Found: {len(users)}")

        # Loaded once per run (instead of once per already-checked-in user
        # below) since this job fires every minute, all day.
        active_employees = [e for e in get_all_employees_cached() if (e.status or "").lower() != "inactive"]
        manager_by_name = {}
        for e in active_employees:
            full_name = f"{e.first_name} {e.last_name}".strip().lower()
            manager_by_name.setdefault(full_name, e)

        for user in users:
            print(f"Checking User: {user.full_name}")

            employee = Employee.query.filter_by(user_id=user.id).first()

            if not employee:
                print(f"No Employee Record for User ID {user.id}")
                continue

            print(f"Employee Found: {employee.employee_id}")

            today = datetime.now(ZoneInfo("Asia/Kolkata")).date()
            today_attendance = Attendance.query.filter(
                Attendance.user_id == user.id,
                Attendance.attendance_date == today
            ).first()

            print(f"User={user.id}, Attendance={today_attendance}")

            if today_attendance:
                print(f"{employee.employee_id} already has attendance today")

                manager_name = employee.reporting_manager.strip().lower()
                manager_emp = manager_by_name.get(manager_name)

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

        db.session.commit()
        print("Notifications Saved Successfully")

        # ========================================================
        # AUTO BREAK-END & AUTO CHECK-OUT LOGIC
        # ========================================================
        active_attendances = Attendance.query.filter(
            Attendance.check_out.is_(None),
            Attendance.check_in.isnot(None)
        ).all()

        for attendance in active_attendances:
            now_ist = datetime.now(ZoneInfo("Asia/Kolkata")).replace(tzinfo=None)
            break_ended = False

            gap_minutes = attendance.total_gap_minutes or 0
            break_minutes = attendance.total_break_minutes or 0
            
            elapsed_seconds = (now_ist - attendance.check_in).total_seconds()
            total_seconds = elapsed_seconds - (gap_minutes * 60) - (break_minutes * 60)
            
            working_hours = total_seconds / 3600
            elapsed_hours = elapsed_seconds / 3600
            
            # Manual check-out enforced (auto check-out disabled)
            if break_ended:
                # If not checked out but a break ended, emit update to sync UI
                employee = Employee.query.filter_by(user_id=attendance.user_id).first()
                if employee:
                    try:
                        payload = {
                            "id": employee.id,
                            "user_id": employee.user_id,
                            "attendance_status": "Checked In",
                            "check_in": attendance.check_in.strftime("%I:%M %p") if attendance.check_in else None,
                            "check_out": None,
                            "working_hours": round(working_hours, 2),
                            "lunch_minutes": attendance.lunch_minutes or 0,
                            "tea_minutes": attendance.tea_minutes or 0,
                            "shift": employee.shift_timing or "General Shift",
                            "manager_status": attendance.manager_status or "Pending",
                            "checked_in": True,
                            "lunch_break": attendance.lunch_break or False,
                            "tea_break": attendance.tea_break or False
                        }
                        socketio.emit("attendance_update", payload)
                    except Exception as e:
                        print(f"Failed to emit break-end socket: {str(e)}")

        db.session.commit()
        print("========== CHECK-IN MONITOR COMPLETED ==========\n")

    except Exception as e:
        print(f"❌ CHECK-IN MONITOR ERROR: {str(e)}")
        try:
            db.session.rollback()
        except:
            pass
        print("========== CHECK-IN MONITOR FAILED ==========\n")
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
    finally:
        try:
            db.session.remove()
        except Exception as dbe:
            print(f"Error removing db session: {dbe}")