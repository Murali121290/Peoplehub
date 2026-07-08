from flask_socketio import (
emit,
join_room
)

from models.database import db
from models.communication import Communication

def register_socket_events(socketio):


# =====================================
# JOIN EMPLOYEE ROOM
# =====================================

  @socketio.on("join")
  def join(data):

    employee_id = str(
        data["employee_id"]
    )

    join_room(employee_id)

    print(
        f"Employee {employee_id} joined room"
    )

    try:
        from models.employee import Employee
        from models.user import User
        emp = Employee.query.get(int(employee_id))
        if emp:
            user = User.query.get(emp.user_id)
            if user:
                access_level = (user.access_level or "").lower()
                role_name = (user.role.name or "").lower() if user.role else ""
                
                if access_level == "manager" or "manager" in role_name or "lead" in role_name:
                    join_room("managers")
                    print(f"Employee {employee_id} (Manager) joined 'managers' room")
                else:
                    join_room("employees")
                    print(f"Employee {employee_id} (Employee) joined 'employees' room")
    except Exception as e:
        print("Error joining role-based room:", str(e))

# =====================================
# JOIN MANAGER ROOM
# =====================================

  @socketio.on("join_manager")
  def join_manager(data):

    manager_name = data.get(
        "manager_name"
    )

    join_room(
        f"manager_{manager_name}"
    )

    print(
        f"Manager {manager_name} joined room"
    )


# =====================================
# JOIN EMPLOYEES ROOM
# =====================================

  @socketio.on("join_employee")
  def join_employee(data):

    join_room("employees")

    print(
        "Employee joined employees room"
    )


# =====================================
# JOIN MANAGERS ROOM
# =====================================

  @socketio.on("join_managers")
  def join_managers(data):

    join_room("managers")

    print(
        "Manager joined managers room"
    )
# =====================================
# SEND PRIVATE MESSAGE
# =====================================

  @socketio.on("send_message")
  def send_message(data):

    try:

        sender_id = data.get(
            "sender_id"
        )

        receiver_id = data.get(
            "receiver_id"
        )

        sender_name = data.get(
            "sender_name"
        )

        message_text = data.get(
            "message"
        )

        communication = Communication(

            employee_id=
                sender_id,

            receiver_id=
                receiver_id,

            employee_name=
                sender_name,

            message_type=
                "employee",

            message=
                message_text,

            created_by=
                sender_name
        )

        db.session.add(
            communication
        )

        db.session.commit()

        response = {

            "id":
                communication.id,

            "employee_id":
                sender_id,

            "receiver_id":
                receiver_id,

            "employee_name":
                sender_name,

            "message":
                message_text,

            "message_type":
                "employee",

            "created_by":
                sender_name,

            "created_at":
                str(
                    communication.created_at
                )
        }

        emit(
            "receive_message",
            response,
            room=str(
                receiver_id
            )
        )

        emit(
            "message_sent",
            response
        )

    except Exception as e:

        db.session.rollback()

        emit(
            "message_error",
            {
                "error":
                    str(e)
            }
        )

# =====================================
# SEND MANAGER NOTIFICATION
# =====================================

  @socketio.on("send_notification")
  def send_notification(data):

    try:

        manager_name = data.get(
            "manager_name"
        )

        title = data.get(
            "title"
        )

        message = data.get(
            "message"
        )

        emit(

            "new_notification",

            {
                "title":
                    title,

                "message":
                    message
            },

            room=
                f"manager_{manager_name}"
        )

    except Exception as e:

        emit(
            "message_error",
            {
                "error":
                    str(e)
            }
        )
# =====================================
# HR / ADMIN BROADCAST MESSAGE
# =====================================

  # =====================================
# HR / ADMIN ANNOUNCEMENT
# =====================================

  @socketio.on("send_announcement")
  def send_announcement(data):

    try:

        sender_name = data.get(
            "sender_name"
        )

        title = data.get(
            "title"
        )

        target_role = data.get(
            "target_role"
        )

        message_text = data.get(
            "message"
        )

        communication = Communication(

            employee_id=None,

            receiver_id=None,

            employee_name=sender_name,

            message_type="announcement",

            title=title,

            target_role=target_role,

            message=message_text,

            created_by=sender_name
        )

        db.session.add(
            communication
        )

        db.session.commit()

        response = communication.to_dict()

        if target_role == "employee":

            emit(
                "receive_announcement",
                response,
                room="employees"
            )

        elif target_role == "manager":

            emit(
                "receive_announcement",
                response,
                room="managers"
            )

        else:

            emit(
                "receive_announcement",
                response,
                broadcast=True
            )

    except Exception as e:

        db.session.rollback()

        emit(
            "message_error",
            {
                "error": str(e)
            }
        )