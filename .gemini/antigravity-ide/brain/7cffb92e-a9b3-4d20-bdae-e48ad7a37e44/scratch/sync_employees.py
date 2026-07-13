import sys
import os

# Set DATABASE_URL to target the Docker database exposed on port 5433
os.environ["DATABASE_URL"] = "postgresql://postgres:$vBr%402150@localhost:5433/wms_db"

# Append backend directory to python path
sys.path.append(r"c:\Users\selvabharathp\Desktop\Peoplehub-Selva\backend")

from app import create_app
from models.database import db
from models.employee import Employee
from models.user import User

app, _ = create_app()

with app.app_context():
    print("Starting database sync (department & team_id) on port 5433...")
    updated_count = 0
    for emp in Employee.query.all():
        user = User.query.get(emp.user_id) if emp.user_id else None
        if user:
            needs_update = False
            
            # Sync department with user's team name
            if user.team and emp.department != user.team.name:
                emp.department = user.team.name
                needs_update = True
                
            # Sync team_id with user's team_id
            if user.team_id and emp.team_id != user.team_id:
                emp.team_id = user.team_id
                needs_update = True
                
            if needs_update:
                updated_count += 1
                print(f"Updated {emp.first_name} {emp.last_name}: dept='{emp.department}', team_id={emp.team_id}")
                
    if updated_count > 0:
        db.session.commit()
        print(f"Successfully synced {updated_count} employees in the database on port 5433.")
    else:
        print("All employees were already in sync on port 5433.")
