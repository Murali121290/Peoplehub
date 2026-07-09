from datetime import datetime, timedelta

from models.user import User
from models.employee import Employee
from models.attendance import Attendance
from models.notification import Notification
from models.database import db


def check_missed_checkins():

    print("\n========== CHECK-IN MONITOR RUNNING ==========")

    now = datetime.utcnow()
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
        today = datetime.now().date()

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

            deleted = Notification.query.filter(
              Notification.title == "Missed Check In",
              Notification.message.like(
                f"%{employee.employee_id}%"
              )
            ).delete(
                synchronize_session=False
            )

            db.session.commit()

            print(
                f"Removed {deleted} notification(s) for "
                f"{employee.employee_id}"
            )

            continue

        # Check duplicate notification
        already_sent = Notification.query.filter(
            Notification.title ==
            "Missed Check In",

            Notification.message.like(
                f"%{employee.employee_id}%"
            )
        ).first()

        if already_sent:

            print(
                f"Notification already sent for "
                f"{employee.employee_id}"
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

            receiver_name=
                employee.reporting_manager,

            title=
                "Missed Check In",

            message=
                f"Employee ID: "
                f"{employee.employee_id} - "
                f"{employee.first_name} "
                f"{employee.last_name} "
                f"logged in but has not "
                f"checked in within 1 minute."
        )

        db.session.add(
            notification
        )

        print(
            f"Notification Created For: "
            f"{employee.reporting_manager}"
        )

    try:

        db.session.commit()

        print(
            "Notifications Saved Successfully"
        )

    except Exception as e:

        db.session.rollback()

        print(
            f"Database Error: {str(e)}"
        )

    print(
        "========== CHECK-IN MONITOR COMPLETED ==========\n"
    )