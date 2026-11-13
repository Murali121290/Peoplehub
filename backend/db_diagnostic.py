import sys
from models.database import db_session
from models.user import User
from models.employee import Employee
from models.communication import Communication

def inspect_users_seen_status():
    try:
        users = db_session.query(User).order_by(User.id).all()
        return users
    except Exception as e:
        print(f"Error inspecting users seen status: {e}")
        return []

def inspect_announcements():
    try:
        comms = db_session.query(Communication).filter_by(message_type="announcement").order_by(Communication.id).all()
        return comms
    except Exception as e:
        print(f"Error inspecting announcements: {e}")
        return []

def inspect_user_profile(email):
    try:
        user = db_session.query(User).filter_by(email=email).first()
        if not user:
            user = db_session.query(User).filter(User.company_email == email).first()

        if not user:
            print(f"Error: No user found matching email: {email}")
            return None

        emp = db_session.query(Employee).filter_by(user_id=user.id).first()
        if not emp:
            print(f"Error: No employee details found linked to User ID {user.id}")

        return {"user": user, "employee": emp}
    except Exception as e:
        print(f"Error inspecting user profile for {email}: {e}")
        return None

if __name__ == "__main__":
    if len(sys.argv) > 1:
        arg = sys.argv[1].strip()
        if arg == "announcements":
            inspect_announcements()
        elif arg == "users":
            inspect_users_seen_status()
        elif "@" in arg:
            inspect_user_profile(arg)
        else:
            print("Usage:")
            print("  python db_diagnostic.py users          - Show all users and seen announcement list")
            print("  python db_diagnostic.py announcements  - Show all announcements")
            print("  python db_diagnostic.py [email]        - Show detailed profile details for the user")
    else:
        inspect_users_seen_status()
        inspect_announcements()
        inspect_user_profile("muraliba@s4carlisle.com")
