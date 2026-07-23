import sys
from models.database import db_session
from models.user import User
from models.employee import Employee
from models.communication import Communication

def inspect_users_seen_status():
    print("\n" + "="*60)
    print("   DATABASE SEEN ANNOUNCEMENT RECORDS PER USER")
    print("="*60)
    users = db_session.query(User).order_by(User.id).all()
    for u in users:
        print(f"User ID: {u.id:<3} | Email: {u.email:<35} | Seen: {u.seen_announcement_ids}")
    print("="*60 + "\n")

def inspect_announcements():
    print("\n" + "="*60)
    print("   ALL DATABASE ANNOUNCEMENTS")
    print("="*60)
    comms = db_session.query(Communication).filter_by(message_type="announcement").order_by(Communication.id).all()
    for c in comms:
        print(f"ID: {c.id:<3} | Title: {c.title:<15} | Message: {c.message:<20} | Target: {c.target_role}")
    print("="*60 + "\n")

def inspect_user_profile(email):
    print("\n" + "="*60)
    print(f"   DETAILED PROFILE INFO FOR: {email}")
    print("="*60)
    user = db_session.query(User).filter_by(email=email).first()
    if not user:
        # Try checking by name or company email
        user = db_session.query(User).filter(User.company_email == email).first()
        
    if not user:
        print(f"No user found matching email: {email}")
        print("="*60 + "\n")
        return

    emp = db_session.query(Employee).filter_by(user_id=user.id).first()
    
    print(f"User ID:        {user.id}")
    print(f"Full Name:      {user.full_name}")
    print(f"Email:          {user.email}")
    print(f"Company Email:  {user.company_email}")
    print(f"Access Level:   {user.access_level}")
    print(f"Role ID:        {user.role_id} ({user.role.name if user.role else 'No Role'})")
    
    if emp:
        print(f"Employee ID:    {emp.id}")
        print(f"Department:     {emp.department}")
        print(f"Manager:        {emp.reporting_manager}")
        print(f"First Name:     {emp.first_name}")
        print(f"Last Name:      {emp.last_name}")
    else:
        print("Employee details: None found linked to User ID")
        
    print("="*60 + "\n")

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
        # Run all three as default
        inspect_users_seen_status()
        inspect_announcements()
        inspect_user_profile("muraliba@s4carlisle.com")
