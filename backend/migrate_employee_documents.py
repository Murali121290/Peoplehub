import os
from models.database import db_session
from models.employee import Employee

# Create uploads/employees folder structure if not exist
os.makedirs(os.path.join("/opt/uploads", "employees"), exist_ok=True)

print("Starting employee documents migration...")
employees = Employee.query.all()
migrated_count = 0
moved_count = 0
skipped_count = 0

doc_types = ["resume_file", "aadhaar_file", "pan_file", "degree_certificate"]

for emp in employees:
    emp_id = emp.employee_id or str(emp.id)
    emp_dir = os.path.join("/opt/uploads", "employees", emp_id)
    
    # 1. Clean up and move any previously migrated documents from old 'documents/' subfolder
    old_dir = os.path.join(emp_dir, "documents")
    if os.path.exists(old_dir):
        for f_name in os.listdir(old_dir):
            old_path = os.path.join(old_dir, f_name)
            new_path = os.path.join(emp_dir, f_name)
            try:
                if os.path.exists(old_path):
                    os.rename(old_path, new_path)
                    moved_count += 1
                    print(f"Moved existing file to flat structure: {old_path} -> {new_path}")
            except Exception as e:
                print(f"Failed to move {f_name} to flat structure: {e}")
        try:
            os.rmdir(old_dir)
        except Exception:
            pass
            
    # 2. Check and migrate database records that are still raw binary
    for doc_type in doc_types:
        raw_data = getattr(emp, doc_type, None)
        if not raw_data:
            continue
            
        # Check if already a path string
        is_path = False
        try:
            if isinstance(raw_data, bytes):
                decoded = raw_data.decode('utf-8')
            else:
                decoded = str(raw_data)
            # If it points to employees/ but contains "/documents/", it needs updating to the new flat reference path
            if decoded.startswith("employees/"):
                if "/documents/" in decoded:
                    # Update reference path in DB to flat version
                    new_ref = decoded.replace("/documents/", "/")
                    setattr(emp, doc_type, new_ref.encode('utf-8'))
                    migrated_count += 1
                    print(f"Updated DB path reference to flat structure for Emp ID {emp_id} ({doc_type}) -> {new_ref}")
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
                    print(f"Recovered document from old path for Emp ID {emp_id} ({doc_type})")
            skipped_count += 1
            continue
            
        # It's raw binary document data, migrate it to disk in the flat directory
        os.makedirs(emp_dir, exist_ok=True)
        
        # Detect magic bytes/extension
        filename = f"{doc_type}.pdf"
        if raw_data.startswith(b"%PDF"):
            filename = f"{doc_type}.pdf"
        elif raw_data.startswith(b"\x89PNG\r\n\x1a\n"):
            filename = f"{doc_type}.png"
        elif raw_data.startswith(b"\xff\xd8"):
            filename = f"{doc_type}.jpg"
            
        file_path = os.path.join(emp_dir, filename)
        
        try:
            with open(file_path, "wb") as f:
                f.write(raw_data)
                
            db_path = f"employees/{emp_id}/{filename}"
            setattr(emp, doc_type, db_path.encode('utf-8'))
            migrated_count += 1
            print(f"Migrated: Employee ID {emp_id} ({doc_type}) -> {file_path}")
        except Exception as e:
            print(f"Failed to migrate {doc_type} for Employee ID {emp_id}: {e}")

if migrated_count > 0 or moved_count > 0:
    db_session.commit()
    print(f"Successfully committed changes to database.")
    
print(f"Migration finished. Total Migrated/Updated: {migrated_count}, Moved on disk: {moved_count}, Skipped: {skipped_count}")
