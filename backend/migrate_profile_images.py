import os
from models.database import db_session
from models.employee import Employee

# Create uploads/employees folder structure if not exist
os.makedirs(os.path.join("/opt/uploads", "employees"), exist_ok=True)

print("Starting profile images migration...")
employees = Employee.query.filter(Employee.profile_image.isnot(None)).all()
migrated_count = 0
skipped_count = 0

for emp in employees:
    raw_data = emp.profile_image
    
    # Check if already a path string (starts with b'employees/' or decoded 'employees/')
    is_path = False
    try:
        if isinstance(raw_data, bytes):
            decoded = raw_data.decode('utf-8')
        else:
            decoded = str(raw_data)
        if decoded.startswith("employees/"):
            is_path = True
    except Exception:
        pass
        
    if is_path:
        decoded_path = raw_data.decode('utf-8') if isinstance(raw_data, bytes) else str(raw_data)
        new_path = os.path.join("/opt/uploads", decoded_path)
        if not os.path.exists(new_path):
            old_path = os.path.join("uploads", decoded_path)
            if os.path.exists(old_path):
                os.makedirs(os.path.dirname(new_path), exist_ok=True)
                import shutil
                shutil.copy(old_path, new_path)
                print(f"Recovered profile image from old path for Emp ID {emp.employee_id or emp.id}")
        skipped_count += 1
        continue
        
    # It's raw binary image data (BYTEA)
    emp_id = emp.employee_id or str(emp.id)
    target_dir = os.path.join("/opt/uploads", "employees", emp_id)
    os.makedirs(target_dir, exist_ok=True)
    
    # Detect magic bytes for PNG vs JPG
    filename = "profile.jpg"
    if raw_data.startswith(b'\x89PNG\r\n\x1a\n'):
        filename = "profile.png"
        
    file_path = os.path.join(target_dir, filename)
    
    try:
        with open(file_path, "wb") as f:
            f.write(raw_data)
            
        # Update the database path reference (stored as bytes)
        db_path = f"employees/{emp_id}/{filename}"
        emp.profile_image = db_path.encode('utf-8')
        
        migrated_count += 1
        print(f"Migrated: Employee ID {emp_id} -> {file_path}")
    except Exception as e:
        print(f"Failed to migrate Employee ID {emp_id}: {e}")
    
if migrated_count > 0:
    db_session.commit()
    print(f"Successfully committed changes to database.")
    
print(f"Migration finished. Total Migrated: {migrated_count}, Skipped: {skipped_count}")
