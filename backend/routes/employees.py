# pyrefly: ignore [missing-import]
from utils.compat import Blueprint, request, jsonify, Response
from models.database import db
from models.employee import Employee
from datetime import date, timedelta, datetime
from zoneinfo import ZoneInfo
import traceback
import base64
import json
import os
from models.user import User
from middleware.auth import auth_required
from models.attendance import Attendance
from models.user import Role, Team
from services.leave_balance_service import update_leave_balance
from models.leave import LeaveRequest
from models.user import User, Role, Team
from sqlalchemy import extract, or_
from sqlalchemy.exc import IntegrityError
from datetime import time
from utils.employee_cache import get_all_employees_cached, invalidate_employee_cache

def _get_redis():
    """Return a Redis client, or None if Redis is unavailable."""
    try:
        import redis
        url = os.environ.get("REDIS_URL", "redis://redis:6379/0")
        return redis.from_url(url, decode_responses=True, socket_connect_timeout=1)
    except Exception:
        return None

employees_bp = Blueprint("employees", __name__)

import os

def is_image_path(val):
    if not val:
        return False
    try:
        if isinstance(val, bytes):
            decoded = val.decode('utf-8')
        else:
            decoded = str(val)
        return decoded.startswith("employees/")
    except Exception:
        return False

def get_profile_image_url(emp):
    if not emp or not emp.profile_image:
        return None
    try:
        if isinstance(emp.profile_image, bytes):
            decoded = emp.profile_image.decode('utf-8')
        else:
            decoded = str(emp.profile_image)
        if decoded.startswith("employees/"):
            return f"/uploads/{decoded}"
    except Exception:
        pass
    return f"/api/employees/image/{emp.id}"

def save_profile_image_data(employee_id, filename, image_data):
    ext = os.path.splitext(filename or "profile.jpg")[1].lower() or ".jpg"
    if ext not in [".jpg", ".jpeg", ".png", ".gif", ".webp"]:
        ext = ".jpg"
    
    target_dir = os.path.join("/opt/uploads", "employees", str(employee_id))
    os.makedirs(target_dir, exist_ok=True)
    
    target_filename = f"profile{ext}"
    target_path = os.path.join(target_dir, target_filename)
    
    with open(target_path, "wb") as f:
        f.write(image_data)
        
    db_path = f"employees/{employee_id}/{target_filename}"
    return db_path.encode('utf-8')

def is_document_path(val):
    if not val:
        return False
    try:
        if isinstance(val, bytes):
            decoded = val.decode('utf-8')
        else:
            decoded = str(val)
        return decoded.startswith("employees/") and not "profile." in decoded
    except Exception:
        return False

def save_employee_document_data(employee_id, doc_type, filename, file_data):
    ext = os.path.splitext(filename or "document.pdf")[1].lower() or ".pdf"
    
    target_dir = os.path.join("/opt/uploads", "employees", str(employee_id))
    os.makedirs(target_dir, exist_ok=True)
    
    target_filename = f"{doc_type}{ext}"
    target_path = os.path.join(target_dir, target_filename)
    
    with open(target_path, "wb") as f:
        f.write(file_data)
        
    db_path = f"employees/{employee_id}/{target_filename}"
    return db_path.encode('utf-8')

def _parse_time(t_val):
    if not t_val:
        return None
    if isinstance(t_val, time):
        return t_val
    if isinstance(t_val, datetime):
        return t_val.time()
    if isinstance(t_val, str):
        t_clean = t_val.strip()
        for fmt in ("%H:%M:%S", "%H:%M", "%I:%M %p", "%I:%M%p"):
            try:
                return datetime.strptime(t_clean, fmt).time()
            except ValueError:
                continue
    return None

@employees_bp.route("/", methods=["POST"])
def create_employee():
    try:
        data = request.form


        # ---------------------------------
        # Profile Image
        # ---------------------------------
        image = request.files.get("profile_image")

        image_data = None
        if image:
            image_bytes = image.read()
            if len(image_bytes) > 50 * 1024:
                return jsonify({"success": False, "error": "Profile photo must be less than 50KB"}), 400
            
            emp_id = data.get("employee_id")
            if emp_id:
                image_data = save_profile_image_data(emp_id, image.filename, image_bytes)

        # ---------------------------------
        # Joining Date
        # ---------------------------------
        joining_date = None

        if data.get("joining_date"):
            joining_date = datetime.strptime(
                data["joining_date"],
                "%Y-%m-%d"
            ).date()

        # ---------------------------------
        # Create User Automatically
        # ---------------------------------
        role_id = data.get("role_id")
        team_id = data.get("team_id")

        if not role_id:
            return jsonify({
                "success": False,
                "error": "Role is required"
            }), 400

        if not team_id:
            return jsonify({
                "success": False,
                "error": "Team is required"
            }), 400

        # Check Company Email
        existing_user = User.query.filter_by(
            company_email=data.get("company_email")
        ).first()

        if existing_user:
            return jsonify({
                "success": False,
                "error": "Company Email already exists."
            }), 400

        user = User(
            full_name=f"{data.get('first_name')} {data.get('last_name')}".strip(),
            email=data.get("email"),
            company_email=data.get("company_email"),
            role_id=int(role_id),
            team_id=int(team_id),
            access_level=data.get("access_level"),
            status="active"
        )

        # Hash Password
        user.set_password(data.get("password"))

        db.session.add(user)
        db.session.flush()   # Get user.id without committing

        # ---------------------------------
        # Create Employee
        # ---------------------------------
        employee = Employee(

            user_id=user.id,

            employee_id=data.get("employee_id"),

            first_name=data.get("first_name"),
            last_name=data.get("last_name"),

            email=data.get("email"),
            phone=data.get("phone"),

            team_id=int(team_id),

            department=data.get("department"),
            designation=data.get("designation") or data.get("role"),

            profile_image=image_data,

            reporting_manager=data.get("reporting_manager"),

            joining_date=joining_date,
            shift_timing=data.get("shift_timing"),
            work_mode=data.get("work_mode", "Office"),

            salary=float(data.get("salary") or 0),

            pf_number=data.get("pf_number"),
            uan_number=data.get("uan_number"),
            esi_number=data.get("esi_number"),

            profile_completed=False,

            is_first_login=True,

            status="Active"
        )

        db.session.add(employee)

        db.session.commit()
        invalidate_employee_cache()

        print("User Created :", user.id)
        print("Employee Created :", employee.id)

        return jsonify({
            "success": True,
            "message": "Employee & User Created Successfully",
            "employee_id": employee.employee_id,
            "user_id": user.id,
            "employee_db_id": employee.id
        }), 201

    except IntegrityError as e:
        db.session.rollback()
        error_msg = str(e.orig)
        message = "A record with this information already exists."
        
        if "users_email_key" in error_msg:
            message = "This email address is already registered."
        elif "employee_id" in error_msg:
            message = "This Employee ID is already in use."
        elif "company_email" in error_msg:
            message = "This company email is already registered."
            
        return jsonify({
            "success": False,
            "message": message,
            "error": error_msg
        }), 400
    except Exception as e:
        traceback.print_exc()
        db.session.rollback()

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

# ======================================
# GET ALL EMPLOYEES
# FOR ADMIN DROPDOWN
# ======================================
@employees_bp.route("/", methods=["GET"])
def get_employees():

    employees = [e for e in get_all_employees_cached() if (e.status or "").lower() != "inactive"]

    today = date.today()

    result = []

    for emp in employees:

        attendance = Attendance.query.filter_by(
            user_id=emp.user_id,
            attendance_date=today
        ).first()

        user = User.query.get(emp.user_id) if emp.user_id else None
        role_id = user.role_id if user else None
        team_id = emp.team_id or (user.team_id if user else None)

        result.append({

            "id": emp.id,
            "user_id": emp.user_id,
            "employee_id": emp.employee_id,

            "first_name": emp.first_name,
            "last_name": emp.last_name,

            "email": emp.email,
            "phone": emp.phone,

            "department": emp.department,
            "designation": emp.designation,
            "access_level": user.access_level if user else None,
            "role_id": role_id,
            "team_id": team_id,

            "reporting_manager":
                emp.reporting_manager,

            "shift_timing":
                emp.shift_timing,

            "work_mode":
                emp.work_mode,

            "status":
                attendance.status
                if attendance
                 else ("Leave" if LeaveRequest.query.filter(
                     or_(
                         LeaveRequest.employee_id == str(emp.id),
                         LeaveRequest.employee_id == emp.employee_id
                     ),
                     LeaveRequest.status == "Approved",
                     LeaveRequest.from_date <= today,
                     LeaveRequest.to_date >= today
                 ).first() else "Absent"),

            "salary":
                emp.salary,

            "sick_leave":
                emp.sick_leave,

            "casual_leave":
                emp.casual_leave,

             "privilege_leave":
                emp.privilege_leave,
            "earned_leave":
                emp.privilege_leave,
            "joining_date":
                emp.joining_date.isoformat() if emp.joining_date else None,
            "is_active":
                emp.is_active if hasattr(emp, "is_active") and emp.is_active is not None else True,
            "deactivation_reason":
                emp.deactivation_reason if hasattr(emp, "deactivation_reason") else None,
            "last_working_date":
                emp.last_working_date.isoformat() if hasattr(emp, "last_working_date") and emp.last_working_date else None,
            "profile_image":
                get_profile_image_url(emp)
        })

    return jsonify(result)

# ======================================
# DOWNLOAD EMPLOYEE DOCUMENT
# ======================================
@employees_bp.route("/<int:employee_id>/document/<string:doc_type>", methods=["GET"])
def download_employee_document(employee_id, doc_type):
    try:
        employee = Employee.query.get(employee_id)
        if not employee:
            return jsonify({"error": "Employee not found"}), 404
            
        file_data = None
        file_name = None
        
        if doc_type == "resume_file":
            file_data = employee.resume_file
            file_name = f"Resume_{employee.first_name}_{employee.last_name}.pdf"
        elif doc_type == "aadhaar_file":
            file_data = employee.aadhaar_file
            file_name = f"Aadhaar_{employee.first_name}_{employee.last_name}.pdf"
        elif doc_type == "pan_file":
            file_data = employee.pan_file
            file_name = f"PAN_{employee.first_name}_{employee.last_name}.pdf"
        elif doc_type == "degree_certificate":
            file_data = employee.degree_certificate
            file_name = f"Degree_{employee.first_name}_{employee.last_name}.pdf"
            
        if not file_data:
            return jsonify({"error": f"{doc_type} not found or not uploaded"}), 404

        if is_document_path(file_data):
            decoded_path = file_data.decode('utf-8') if isinstance(file_data, bytes) else str(file_data)
            full_path = os.path.join("/opt/uploads", decoded_path)
            if os.path.exists(full_path):
                with open(full_path, "rb") as f:
                    file_data = f.read()
                orig_ext = os.path.splitext(full_path)[1]
                if orig_ext:
                    file_name = file_name.rsplit(".", 1)[0] + orig_ext
            else:
                return jsonify({"error": f"{doc_type} file not found on disk"}), 404
            
        mimetype = "application/octet-stream"
        if file_data.startswith(b"%PDF"):
            mimetype = "application/pdf"
            if not file_name.endswith(".pdf"):
                file_name += ".pdf"
        elif file_data.startswith(b"\x89PNG"):
            mimetype = "image/png"
            if not (file_name.endswith(".png") or file_name.endswith(".pdf")):
                file_name = file_name.rsplit(".", 1)[0] + ".png"
        elif file_data.startswith(b"\xff\xd8"):
            mimetype = "image/jpeg"
            if not (file_name.endswith(".jpg") or file_name.endswith(".jpeg") or file_name.endswith(".pdf")):
                file_name = file_name.rsplit(".", 1)[0] + ".jpg"
        
        return Response(
            file_data,
            mimetype=mimetype,
            headers={
                "Content-Disposition": f"attachment; filename={file_name}"
            }
        )
    except Exception as e:
        print("Download error:", traceback.format_exc())
        return jsonify({"error": str(e)}), 500

# ======================================
# GET SINGLE EMPLOYEE
# ======================================
@employees_bp.route("/<int:employee_id>", methods=["GET"])
def get_employee(employee_id):

    employee = Employee.query.get(employee_id)

    if not employee:
        return jsonify({
            "error": "Employee not found"
        }), 404

    user = User.query.get(employee.user_id) if employee.user_id else None
    user_email = user.email if (user and user.email) else employee.email

    return jsonify({
    "id": employee.id,
    "employee_id": employee.employee_id,

    "first_name": employee.first_name,
    "last_name": employee.last_name,

    "email": user_email,
    "phone": employee.phone,
    "alternate_phone": employee.alternate_phone,

    "department": employee.department,
    "designation": employee.designation,
    "role": employee.designation,

    "profile_image": get_profile_image_url(employee),

    "joining_date": (
        employee.joining_date.isoformat()
        if employee.joining_date else None
    ),

    "reporting_manager": employee.reporting_manager,

    "salary": employee.salary,

    "dob": (
        employee.dob.isoformat()
        if employee.dob else None
    ),

    "gender": employee.gender,
    "marital_status": employee.marital_status,
    "blood_group": employee.blood_group,

    "pf_number": employee.pf_number,
    "uan_number": employee.uan_number,
    "esi_number": employee.esi_number,


"tenth_board": employee.tenth_board,
"twelfth_board": employee.twelfth_board,

"ug_university": employee.ug_university,
"pg_university": employee.pg_university,

    "address": employee.address,
    "city": employee.city,
    "state": employee.state,
    "country": employee.country,
    "pincode": employee.pincode,

    "bank_name": employee.bank_name,
    "account_number": employee.account_number,
    "ifsc_code": employee.ifsc_code,

    "pan_number": employee.pan_number,
    "aadhaar_number": employee.aadhaar_number,

    "qualification": employee.qualification,
    "college": employee.college,
    "passing_year": employee.passing_year,
    "percentage": employee.percentage,
    # 10th
"tenth_school": employee.tenth_school,
"tenth_percentage": employee.tenth_percentage,

# 12th
"twelfth_school": employee.twelfth_school,
"twelfth_percentage": employee.twelfth_percentage,

# UG
"ug_degree": employee.ug_degree,
"ug_college": employee.ug_college,
"ug_percentage": employee.ug_percentage,

# PG
"pg_degree": employee.pg_degree,
"pg_college": employee.pg_college,
"pg_percentage": employee.pg_percentage,
"additional_education": employee.additional_education,

# Experience
"previous_company": employee.previous_company,

"current_ctc": employee.current_ctc,
"expected_ctc": employee.expected_ctc,

"notice_period": employee.notice_period,

# Work Details
"employee_type": employee.employee_type,
"work_location": employee.work_location,
"shift_timing": employee.shift_timing,
"work_mode": employee.work_mode,

"probation_end_date": (
    employee.probation_end_date.isoformat()
    if employee.probation_end_date
    else None
),

# Emergency Contact
"emergency_contact_relation":
    employee.emergency_contact_relation,

    "total_experience": employee.total_experience,
    "skills": employee.skills,

    "emergency_contact_name": employee.emergency_contact_name,
    "emergency_contact_number": employee.emergency_contact_number,

    "status": employee.status,

    "profile_completed": employee.profile_completed,
    "is_first_login": employee.is_first_login,

    "user_id": employee.user_id,
    "sick_leave": employee.sick_leave,
    "casual_leave": employee.casual_leave,
    "privilege_leave": employee.privilege_leave,
    "earned_leave": employee.privilege_leave,

    "has_resume": employee.resume_file is not None,
    "has_aadhaar": employee.aadhaar_file is not None,
    "has_pan": employee.pan_file is not None,
    "has_degree": employee.degree_certificate is not None,

    # User account fields needed for edit modal
    "company_email": (
        User.query.get(employee.user_id).company_email
        if employee.user_id else employee.email
    ),
    "access_level": (
        User.query.get(employee.user_id).access_level
        if employee.user_id else None
    ),
    "team_id": employee.team_id,
    "role_id": (
        User.query.get(employee.user_id).role_id
        if employee.user_id else None
    ),
})



@employees_bp.route(
    "/image/<string:employee_id>",
    methods=["GET"]
)
def get_employee_image(employee_id):
    result = db.session.query(Employee.profile_image).filter_by(id=employee_id).first()

    employee = None
    try:
        emp_id_int = int(employee_id)
        employee = Employee.query.get(emp_id_int)
    except (ValueError, TypeError):
        pass

    if not employee:
        employee = Employee.query.filter_by(employee_id=str(employee_id)).first()

    if not employee:
        return jsonify({
            "error": "Employee not found"
        }), 404

    if not result or not result[0]:
        return jsonify({
            "error": "Image not found"
        }), 404

    if is_image_path(employee.profile_image):
        decoded_path = employee.profile_image.decode('utf-8') if isinstance(employee.profile_image, bytes) else str(employee.profile_image)
        full_path = os.path.join("/opt/uploads", decoded_path)
        if os.path.exists(full_path):
            from utils.compat import send_file
            ext = os.path.splitext(full_path)[1].lower()
            mimetype = "image/png" if ext == ".png" else "image/jpeg"
            return send_file(full_path, mimetype=mimetype)
        return jsonify({
            "error": "Image file not found on disk"
        }), 404

    resp = Response(
        result[0],
        mimetype="image/jpeg"
    )
    resp.headers["Cache-Control"] = "public, max-age=86400, immutable"
    return resp

# ======================================
# EMPLOYEE PROFILE UPDATE
# ======================================
@employees_bp.route("/<int:employee_id>", methods=["PATCH"])
@auth_required
def update_employee_profile(employee_id):
    try:
        from utils.jwt_helper import get_jwt_identity
        current_user_id = get_jwt_identity()
        current_user = User.query.get(int(current_user_id))

        if not current_user:
            return jsonify({
                "error": "Current user not found"
            }), 404

        is_hr_or_admin = current_user.access_level.lower() in ["admin", "hr"]

        if not is_hr_or_admin:
            employee = Employee.query.filter_by(user_id=current_user.id).first()
        else:
            employee = Employee.query.get(employee_id)

        if not employee:
            return jsonify({
                "error": "Employee not found"
            }), 404

        is_self = current_user.id == employee.user_id

        if not (is_hr_or_admin or is_self):
            return jsonify({
                "error": "Insufficient permissions to update this profile"
            }), 403

        user = User.query.get(employee.user_id)

        data = request.form

        # Basic Employee Information (from directory edit)
        if data.get("employee_id") and is_hr_or_admin:
            employee.employee_id = data.get("employee_id")

        if data.get("first_name") and is_hr_or_admin:
            employee.first_name = data.get("first_name")

        if data.get("last_name") and is_hr_or_admin:
            employee.last_name = data.get("last_name")

        if data.get("email"):
            employee.email = data.get("email")
            if user:
                user.email = data.get("email")

        if data.get("phone"):
            employee.phone = data.get("phone")

        if data.get("joining_date") and is_hr_or_admin:
            employee.joining_date = datetime.strptime(
                data["joining_date"],
                "%Y-%m-%d"
            ).date()

        if data.get("salary") and is_hr_or_admin:
            employee.salary = float(data.get("salary") or 0)

        if data.get("team_id") and is_hr_or_admin:
            employee.team_id = data.get("team_id")

        if data.get("department") and is_hr_or_admin:
            employee.department = data.get("department")

        if data.get("designation") and is_hr_or_admin:
            employee.designation = data.get("designation")

        if data.get("role") and is_hr_or_admin:
            employee.designation = data.get("role")

        if data.get("reporting_manager") and is_hr_or_admin:
            employee.reporting_manager = data.get("reporting_manager")

        if data.get("status") and is_hr_or_admin:
            employee.status = data.get("status")

        # Profile image
        profile_image = request.files.get("profile_image")
        if profile_image:
            image_bytes = profile_image.read()
            if len(image_bytes) > 50 * 1024:
                return jsonify({"success": False, "error": "Profile photo must be less than 50KB"}), 400
            emp_id = employee.employee_id or str(employee.id)
            employee.profile_image = save_profile_image_data(emp_id, profile_image.filename, image_bytes)


        resume = request.files.get("resume_file")
        aadhaar = request.files.get("aadhaar_file")
        pan = request.files.get("pan_file")
        degree = request.files.get("degree_certificate")

        # Personal Details
        if data.get("dob"):
            employee.dob = datetime.strptime(
                data["dob"],
                "%Y-%m-%d"
            ).date()

        employee.gender = data.get(
            "gender",
            employee.gender
        )

        employee.marital_status = data.get(
            "marital_status",
            employee.marital_status
        )

        employee.blood_group = data.get(
            "blood_group",
            employee.blood_group
        )

        # PF
        employee.pf_number = data.get(
            "pf_number",
            employee.pf_number
        )

        employee.uan_number = data.get(
            "uan_number",
            employee.uan_number
        )

        employee.esi_number = data.get(
            "esi_number",
            employee.esi_number
        )

        # Boards
        employee.tenth_board = data.get(
            "tenth_board",
            employee.tenth_board
        )

        employee.twelfth_board = data.get(
            "twelfth_board",
            employee.twelfth_board
        )

        # Universities
        employee.ug_university = data.get(
            "ug_university",
            employee.ug_university
        )

        employee.pg_university = data.get(
            "pg_university",
            employee.pg_university
        )

        # Address
        employee.address = data.get(
            "address",
            employee.address
        )

        employee.city = data.get(
            "city",
            employee.city
        )

        employee.state = data.get(
            "state",
            employee.state
        )

        employee.country = data.get(
            "country",
            employee.country
        )

        employee.pincode = data.get(
            "pincode",
            employee.pincode
        )

        # Banking
        employee.bank_name = data.get(
            "bank_name",
            employee.bank_name
        )

        employee.account_number = data.get(
            "account_number",
            employee.account_number
        )

        employee.ifsc_code = data.get(
            "ifsc_code",
            employee.ifsc_code
        )

        # Identity
        employee.pan_number = data.get(
            "pan_number",
            employee.pan_number
        )

        employee.aadhaar_number = data.get(
            "aadhaar_number",
            employee.aadhaar_number
        )

        # Existing Education
        employee.qualification = data.get(
            "qualification",
            employee.qualification
        )

        employee.college = data.get(
            "college",
            employee.college
        )

        employee.passing_year = data.get(
            "passing_year",
            employee.passing_year
        )

        employee.percentage = data.get(
            "percentage",
            employee.percentage
        )

        # 10th
        employee.tenth_school = data.get(
            "tenth_school",
            employee.tenth_school
        )

        employee.tenth_percentage = data.get(
            "tenth_percentage",
            employee.tenth_percentage
        )

        # 12th
        employee.twelfth_school = data.get(
            "twelfth_school",
            employee.twelfth_school
        )

        employee.twelfth_percentage = data.get(
            "twelfth_percentage",
            employee.twelfth_percentage
        )

        # UG
        employee.ug_degree = data.get(
            "ug_degree",
            employee.ug_degree
        )

        employee.ug_college = data.get(
            "ug_college",
            employee.ug_college
        )

        employee.ug_percentage = data.get(
            "ug_percentage",
            employee.ug_percentage
        )

        # PG
        employee.pg_degree = data.get(
            "pg_degree",
            employee.pg_degree
        )

        employee.pg_college = data.get(
            "pg_college",
            employee.pg_college
        )

        employee.pg_percentage = data.get(
            "pg_percentage",
            employee.pg_percentage
        )

        employee.additional_education = data.get(
            "additional_education",
            employee.additional_education
        )

        # Experience
        employee.total_experience = data.get(
            "total_experience",
            employee.total_experience
        )

        employee.previous_company = data.get(
            "previous_company",
            employee.previous_company
        )

        employee.current_ctc = (
            float(data["current_ctc"])
            if data.get("current_ctc")
            else None
        )

        employee.expected_ctc = (
            float(data["expected_ctc"])
            if data.get("expected_ctc")
            else None
        )

        employee.notice_period = data.get(
            "notice_period",
            employee.notice_period
        )

        # Skills
        employee.skills = data.get(
            "skills",
            employee.skills
        )

        # Work Details
        employee.employee_type = data.get(
            "employee_type",
            employee.employee_type
        )

        employee.work_location = data.get(
            "work_location",
            employee.work_location
        )

        employee.shift_timing = data.get(
            "shift_timing",
            employee.shift_timing
        )

        employee.work_mode = data.get(
            "work_mode",
            employee.work_mode
        )

        if data.get("probation_end_date"):
            employee.probation_end_date = datetime.strptime(
                data["probation_end_date"],
                "%Y-%m-%d"
            ).date()

        # Emergency Contact
        employee.emergency_contact_name = data.get(
            "emergency_contact_name",
            employee.emergency_contact_name
        )

        employee.emergency_contact_number = data.get(
            "emergency_contact_number",
            employee.emergency_contact_number
        )

        employee.emergency_contact_relation = data.get(
            "emergency_contact_relation",
            employee.emergency_contact_relation
        )

        # Profile Status
        employee.profile_completed = True

        # Documents
        emp_id = employee.employee_id or str(employee.id)
        if resume:
            resume_bytes = resume.read()
            employee.resume_file = save_employee_document_data(emp_id, "resume_file", resume.filename, resume_bytes)

        if aadhaar:
            aadhaar_bytes = aadhaar.read()
            employee.aadhaar_file = save_employee_document_data(emp_id, "aadhaar_file", aadhaar.filename, aadhaar_bytes)

        if pan:
            pan_bytes = pan.read()
            employee.pan_file = save_employee_document_data(emp_id, "pan_file", pan.filename, pan_bytes)

        if degree:
            degree_bytes = degree.read()
            employee.degree_certificate = save_employee_document_data(emp_id, "degree_certificate", degree.filename, degree_bytes)

        employee.is_first_login = False

        # Sync corresponding User record
        if user and is_hr_or_admin:
            first = data.get("first_name", employee.first_name)
            last = data.get("last_name", employee.last_name)

            user.full_name = f"{first} {last}".strip()

            if data.get("email"):
                user.email = data.get("email")


            if data.get("access_level"):
                user.access_level = data.get("access_level")

            if data.get("team_id"):
                user.team_id = int(data.get("team_id"))

            if data.get("role_id"):
                user.role_id = int(data.get("role_id"))

            if data.get("status"):
                user.status = data.get("status")

        db.session.commit()
        invalidate_employee_cache()

        # Emit employee_profile_update socket event for real-time dashboard updates
        try:
            from extensions import socketio
            socketio.emit("employee_profile_update", {
                "id": employee.id,
                "user_id": employee.user_id,
                "first_name": employee.first_name,
                "last_name": employee.last_name,
                "email": employee.email,
                "phone": employee.phone,
                "designation": employee.designation,
                "department": employee.department,
                "shift": employee.shift_timing or "General Shift",
                "work_mode": employee.work_mode,
                "status": employee.status
            })
        except Exception as socket_err:
            print("Failed to emit profile socket:", str(socket_err))

        return jsonify({
            "success": True,
            "message": "Profile Updated Successfully"
        })

    except Exception as e:
        traceback.print_exc()
        db.session.rollback()

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500 
@employees_bp.route('/list', methods=['GET'])
def get_employees_list():
    employees = [e for e in get_all_employees_cached() if (e.status or "").lower() != "inactive"]

    return jsonify([
        {
            "id": emp.id,
            "employee_id": emp.employee_id,
            "name": f"{emp.first_name} {emp.last_name}",
            "department": emp.department,
            "designation": emp.designation,
            "role": emp.designation,
            "work_mode": emp.work_mode
        }
        for emp in employees
    ])
    
@employees_bp.route('/test')
def test():
    return jsonify({"message":"working"})

print("Employees Blueprint Loaded")


@employees_bp.route("/birthdays/today", methods=["GET"])
def today_birthdays():
    try:
        today = date.today()
        sender_id = request.args.get("sender_id")

        employees = Employee.query.filter(
            Employee.dob.isnot(None),
            extract("month", Employee.dob) == today.month,
            extract("day", Employee.dob) == today.day,
            Employee.is_active != False
        ).all()

        already_wished_ids = []
        if sender_id:
            from models.birthday_wish import BirthdayWish
            today_start = datetime.combine(today, datetime.min.time())
            wishes = BirthdayWish.query.filter(
                BirthdayWish.sender_id == sender_id,
                BirthdayWish.created_at >= today_start
            ).all()
            already_wished_ids = [w.receiver_id for w in wishes]

        return jsonify([
            {
                "id": e.id,
                "first_name": e.first_name,
                "last_name": e.last_name,
                "user_id": e.user_id,
                "department": e.department,
                "designation": e.designation,
                "profile_image": get_profile_image_url(e)
            }
            for e in employees if e.id not in already_wished_ids
        ])
    except Exception as err:
        print("ERROR IN TODAY BIRTHDAYS:", str(err))
        return jsonify([]), 500


@employees_bp.route("/anniversaries/today", methods=["GET"])
def today_anniversaries():
    try:
        today = date.today()

        employees = Employee.query.filter(
            Employee.joining_date.isnot(None),
            extract("month", Employee.joining_date) == today.month,
            extract("day", Employee.joining_date) == today.day,
            extract("year", Employee.joining_date) < today.year,
            Employee.is_active != False
        ).all()

        return jsonify([
            {
                "id": e.id,
                "first_name": e.first_name,
                "last_name": e.last_name,
                "user_id": e.user_id,
                "department": e.department,
                "designation": e.designation,
                "years": today.year - e.joining_date.year,
                "profile_image": get_profile_image_url(e)
            }
            for e in employees
        ])
    except Exception as err:
        print("ERROR IN TODAY ANNIVERSARIES:", str(err))
        return jsonify([]), 500


@employees_bp.route("/team-overview", methods=["GET"])
@auth_required
def get_team_overview():

    teams = Team.query.order_by(Team.name.asc()).all()

    result = []

    for team in teams:

        employees = [e for e in Employee.query.filter_by(
            team_id=team.id
        ).all() if e.is_active != False]

        employee_list = []

        for emp in employees:

            # Get User
            user = User.query.get(emp.user_id)

            # Default Role
            role_name = ""

            if user:
                role = Role.query.get(user.role_id)

                if role:
                    role_name = role.name

            # Resolve today's work mode
            from models.shift_request import ShiftRequest
            from datetime import date
            today = date.today()
            emp_ids = [emp.employee_id] if emp.employee_id else []

            wfh_request = ShiftRequest.query.filter(
                ShiftRequest.employee_id.in_(emp_ids),
                ShiftRequest.status == "Approved",
                ShiftRequest.from_date <= today,
                ShiftRequest.to_date >= today
            ).order_by(ShiftRequest.id.desc()).first()

            is_wfh = False
            if wfh_request:
                if wfh_request.requested_work_mode:
                    is_wfh = (wfh_request.requested_work_mode == "WFH")
                elif wfh_request.request_type == "WFH" or wfh_request.requested_shift == "WFH":
                    is_wfh = True
            else:
                is_wfh = (emp.work_mode == "WFH")

            employee_list.append({
                "id": emp.id,
                "name": f"{emp.first_name} {emp.last_name or ''}".strip(),
                "role": role_name,
                "designation": emp.designation,
                "reporting_manager": emp.reporting_manager,
                "salary": float(emp.salary or 0),
                "department": emp.department,
                "team_id": emp.team_id,
                "employee_id": emp.employee_id,
                "profile_image": get_profile_image_url(emp),
                "work_mode": emp.work_mode,
                "is_wfh": is_wfh
            })

        result.append({
            "team_id": team.id,
            "team_name": team.name,
            "member_count": len(employees),
            "total_salary": sum(
                float(emp.salary or 0)
                for emp in employees
            ),
            "employees": employee_list
        })

    return jsonify(result), 200

@employees_bp.route("/my-team/<int:user_id>", methods=["GET"])
def get_my_team(user_id):

    user = User.query.get(user_id)

    if not user:
        return jsonify([])

    team_id = user.team_id

    team_users = User.query.filter_by(
        team_id=team_id
    ).all()

    result = []
    all_employees = [e for e in get_all_employees_cached() if e.is_active != False]

    for team_user in team_users:

        employee = Employee.query.filter_by(
            user_id=team_user.id
        ).first()

        if employee:
            update_leave_balance(employee)

            emp_full_name = f"{employee.first_name} {employee.last_name}".strip().lower()
            is_reporting_manager = False
            for other in all_employees:
                if not other.reporting_manager:
                    continue
                o_mgr = other.reporting_manager.strip().lower()
                if (o_mgr == emp_full_name) or (len(o_mgr.split()) == 1 and emp_full_name.split()[0] == o_mgr) or (len(emp_full_name.split()) == 1 and o_mgr.split()[0] == emp_full_name):
                    is_reporting_manager = True
                    break

            result.append({
                "id": employee.id,
                "name": f"{employee.first_name} {employee.last_name}",
                "email": employee.email,
                "role": employee.designation or "Employee",
                "department": employee.department,
                "designation": employee.designation or "Employee",
                "salary": employee.salary,
                "reporting_manager": employee.reporting_manager,
                "status": employee.status,
                "sick_leave": employee.sick_leave,
                "casual_leave": employee.casual_leave,
                "privilege_leave": employee.privilege_leave,
                "earned_leave": employee.privilege_leave,
                "is_reporting_manager": is_reporting_manager
            })

    return jsonify(result)


def is_manager_match(e_mgr, manager_name):
    if not e_mgr or not manager_name:
        return False
    e_mgr = e_mgr.strip().lower()
    mgr = manager_name.strip().lower()
    if e_mgr == mgr:
        return True
    e_words = e_mgr.split()
    m_words = mgr.split()
    if len(e_words) == 1 and m_words and m_words[0] == e_mgr:
        return True
    if len(m_words) == 1 and e_words and e_words[0] == mgr:
        return True
    return False


def get_all_reporting_employees_recursive(manager_name, all_employees, visited=None):
    if visited is None:
        visited = set()
    reports = []
    for emp in all_employees:
        if emp.id in visited:
            continue
        if is_manager_match(emp.reporting_manager, manager_name):
            visited.add(emp.id)
            reports.append(emp)
            
    recursive_reports = list(reports)
    for r in reports:
        r_name = f"{r.first_name} {r.last_name}"
        sub = get_all_reporting_employees_recursive(r_name, all_employees, visited)
        recursive_reports.extend(sub)
    return recursive_reports


@employees_bp.route("/team-attendance/<int:user_id>", methods=["GET"])
def get_team_attendance(user_id):
    """Return all employees reporting to this manager with today's attendance status."""
    try:
        manager = Employee.query.filter_by(user_id=user_id).first()
        user = User.query.get(user_id)
        is_admin = False
        if user:
            role_name = (user.role.name or "").lower() if user.role else ""
            access_level = (user.access_level or "").lower()
            if "admin" in role_name or "admin" in access_level:
                is_admin = True

        today = date.today()
        # Filter with database, not in Python
        all_employees = Employee.query.filter(Employee.is_active != False).all()
        result = []

        if is_admin:
            reporting_list = [e for e in all_employees if e.user_id != user_id]
        else:
            if not manager:
                return jsonify([])
            manager_full_name = f"{manager.first_name} {manager.last_name}".strip()
            reporting_list = [e for e in all_employees if is_manager_match(e.reporting_manager, manager_full_name)]

        # Get list of reporting employee IDs and user IDs for batch queries
        reporting_emp_ids = [str(e.id) for e in reporting_list] + [e.employee_id for e in reporting_list if e.employee_id]
        reporting_user_ids = [e.user_id for e in reporting_list]

        # BATCH FETCH: Permissions
        permissions = LeaveRequest.query.filter(
            LeaveRequest.request_type == "Permission",
            LeaveRequest.status == "Approved",
            LeaveRequest.permission_date == today,
            LeaveRequest.employee_id.in_(reporting_emp_ids)
        ).all()

        permission_by_employee = {}
        for p in permissions:
            permission_by_employee[str(p.employee_id)] = p

        # BATCH FETCH: All attendance for reporting employees today
        attendances = Attendance.query.filter(
            Attendance.user_id.in_(reporting_user_ids),
            Attendance.attendance_date == today
        ).all()
        attendance_by_user = {a.user_id: a for a in attendances}

        # BATCH FETCH: All leave requests for reporting employees today
        leave_requests_batch = LeaveRequest.query.filter(
            LeaveRequest.employee_id.in_(reporting_emp_ids),
            LeaveRequest.status == "Approved",
            LeaveRequest.request_type == "Leave",
            LeaveRequest.from_date <= today,
            LeaveRequest.to_date >= today
        ).order_by(LeaveRequest.created_at.desc()).all()

        leave_by_employee = {}
        for lr in leave_requests_batch:
            emp_key = str(lr.employee_id)
            if emp_key not in leave_by_employee:
                leave_by_employee[emp_key] = lr

        # BATCH FETCH: All shift requests for reporting employees today
        from models.shift_request import ShiftRequest
        shift_requests_batch = ShiftRequest.query.filter(
            ShiftRequest.employee_id.in_(reporting_emp_ids),
            ShiftRequest.status == "Approved",
            ShiftRequest.from_date <= today,
            ShiftRequest.to_date >= today
        ).order_by(ShiftRequest.created_at.desc()).all()

        # Keep all approved requests per employee (not just the latest) so
        # WFH-type and Shift-type requests active on the same day aren't
        # dropped when looked up below.
        shifts_by_employee = {}
        for sr in shift_requests_batch:
            emp_key = str(sr.employee_id)
            shifts_by_employee.setdefault(emp_key, []).append(sr)

        # Build manager lookup: manager_name -> list of employees who report to them
        manager_lookup = {}
        for emp in all_employees:
            if emp.reporting_manager:
                mgr_name = emp.reporting_manager.strip().lower()
                if mgr_name not in manager_lookup:
                    manager_lookup[mgr_name] = []
                manager_lookup[mgr_name].append(emp)

        for emp in reporting_list:

            # Get pre-fetched attendance (no query!)
            attendance = attendance_by_user.get(emp.user_id)

            # Check if Permission is active now
            emp_permission = (
                permission_by_employee.get(str(emp.id)) or 
                permission_by_employee.get(emp.employee_id) or
                permission_by_employee.get(str(emp.employee_id))
            )
            has_permission_today = emp_permission is not None
            is_permission_active = False

            f_time = _parse_time(emp_permission.from_time) if has_permission_today else None
            t_time = _parse_time(emp_permission.to_time) if has_permission_today else None

            if has_permission_today and f_time and t_time:
                now_ist_time = datetime.now(ZoneInfo("Asia/Kolkata")).time()
                if f_time <= now_ist_time <= t_time:
                    is_permission_active = True

            permission_from = f_time.strftime("%I:%M %p") if f_time else None
            permission_to = t_time.strftime("%I:%M %p") if t_time else None

            permission_hours = 0.0
            if has_permission_today and f_time and t_time:
                f_sec = f_time.hour * 3600 + f_time.minute * 60 + f_time.second
                t_sec = t_time.hour * 3600 + t_time.minute * 60 + t_time.second
                permission_hours = max(t_sec - f_sec, 0) / 3600.0

            # Latest leave request takes precedence (pre-fetched, no query!)
            on_leave = (
                leave_by_employee.get(str(emp.id)) or
                leave_by_employee.get(emp.employee_id) or
                leave_by_employee.get(str(emp.employee_id))
            )

            # Pre-fetched approved shift/WFH requests for today (no query!)
            emp_requests_today = (
                shifts_by_employee.get(str(emp.id)) or
                shifts_by_employee.get(emp.employee_id) or
                shifts_by_employee.get(str(emp.employee_id)) or
                []
            )

            # The latest request takes precedence
            latest_request = emp_requests_today[0] if emp_requests_today else None

            wfh_today = next((r for r in emp_requests_today if r.request_type == "WFH"), None)
            shift_change_today = next((r for r in emp_requests_today if r.request_type == "Shift"), None)

            if attendance:
                if attendance.check_in or attendance.card_check_in:
                    if attendance.check_in and not attendance.check_out:
                        att_status = "Present"
                    elif attendance.check_out or attendance.card_check_out:
                        is_today = (attendance.attendance_date == today)
                        if is_today and attendance.card_check_out and not attendance.check_out:
                            punch_out_hour = attendance.card_check_out.hour
                            working_hrs = attendance.card_working_hours or 0.0
                            if punch_out_hour >= 15 or working_hrs >= 4.0:
                                att_status = "Checked Out"
                            else:
                                att_status = "Present"
                        else:
                            att_status = "Checked Out"
                    else:
                        att_status = "Present"
                else:
                    att_status = "Absent"

                # Web Entry: only show from web columns, do not fallback
                check_in = attendance.check_in.strftime("%I:%M %p") if attendance.check_in else None
                check_out = attendance.check_out.strftime("%I:%M %p") if attendance.check_out else None
                working_hours = attendance.total_hours or 0.0
                if attendance.check_in and not attendance.check_out:
                    now_ist = datetime.now(ZoneInfo("Asia/Kolkata")).replace(tzinfo=None)
                    elapsed = (now_ist - attendance.check_in).total_seconds()
                    break_secs = (attendance.total_break_minutes or 0) * 60
                    hours_decimal = max(elapsed - break_secs, 0) / 3600
                    working_hours = int(hours_decimal * 100) / 100

                # Add permission hours if checked in
                if attendance.check_in and permission_hours > 0:
                    working_hours += permission_hours
                    working_hours = int(working_hours * 100) / 100

                # Override to Half Day if working hours < 4
                if att_status not in ("Absent", "On Leave") and working_hours > 0 and working_hours < 4.0:
                    att_status = "Half Day"
            elif on_leave:
                att_status = "On Leave"
                check_in = None
                check_out = None
                working_hours = 0
            else:
                att_status = "Absent"
                check_in = None
                check_out = None
                working_hours = 0

            # Check if this employee is a reporting manager using pre-built lookup
            emp_full_name = f"{emp.first_name} {emp.last_name}".strip().lower()
            is_reporting_manager = False
            report_count = 0
            if emp_full_name in manager_lookup:
                is_reporting_manager = True
                report_count = len(manager_lookup[emp_full_name])

            result.append({
                "id": emp.id,
                "user_id": emp.user_id,
                "name": f"{emp.first_name} {emp.last_name}",
                "employee_id": emp.employee_id,
                "email": emp.email,
                "role": emp.designation or "Employee",
                "designation": emp.designation or "Employee",
                "department": emp.department,
                "profile_image": get_profile_image_url(emp),
                "attendance_status": att_status,
                "check_in": check_in,
                "check_out": check_out,
                "check_in_ip": attendance.check_in_ip if attendance else None,
                "check_out_ip": attendance.check_out_ip if attendance else None,
                "working_hours": working_hours,
                "card_check_in": attendance.card_check_in.strftime("%I:%M %p") if (attendance and attendance.card_check_in) else None,
                "card_check_out": attendance.card_check_out.strftime("%I:%M %p") if (attendance and attendance.card_check_out) else None,
                "card_working_hours": attendance.card_working_hours if (attendance and attendance.card_working_hours) else 0.0,
                "lunch_minutes": attendance.lunch_minutes if attendance else 0,
                "tea_minutes": attendance.tea_minutes if attendance else 0,
                "shift": (
                    shift_change_today.requested_shift
                    if shift_change_today
                    else (
                        attendance.shift_timing
                        if (attendance and attendance.shift_timing)
                        else emp.shift_timing or "General Shift"
                    )
                ),
                "work_mode": (
                    latest_request.requested_work_mode
                    if (latest_request and latest_request.requested_work_mode)
                    else (
                        emp.work_mode or "Office"
                    )
                ),
                "manager_status": attendance.manager_status if (attendance and attendance.manager_status) else "Pending",
                "is_wfh": (
                    (latest_request.request_type == "WFH") if latest_request
                    else ((emp.work_mode or "Office") == "WFH")
                ),
                "is_permanent_wfh": (emp.work_mode == "WFH"),
                "is_shift_changed": bool(shift_change_today),
                "is_reporting_manager": is_reporting_manager,
                "report_count": report_count,
                "reporting_manager": emp.reporting_manager,
                "is_permission": is_permission_active,
                "permission_from": permission_from,
                "permission_to": permission_to,
                "permission_hours": permission_hours,
            })

        return jsonify(result)

    except Exception as e:
        import traceback
        tb_str = traceback.format_exc()
        print("TEAM ATTENDANCE ERROR:", tb_str)
        return jsonify({"error": str(e), "traceback": tb_str}), 500


def check_is_non_working_day(check_date):
    try:
        from models.holiday import Holiday, HolidayOverride
        override = HolidayOverride.query.filter_by(date=check_date).first()
        if override:
            if override.override_type == "Working Day":
                return False
            elif override.override_type in ["Holiday", "Weekly Off"]:
                return True

        holiday = Holiday.query.filter_by(date=check_date, is_published=True).first()
        if holiday:
            return True
    except Exception:
        pass

    day_name = check_date.strftime("%A")
    if day_name == "Sunday":
        return True
    elif day_name == "Saturday":
        import calendar
        weeks = calendar.monthcalendar(check_date.year, check_date.month)
        sat_count = 0
        for week in weeks:
            sat = week[5]
            if sat != 0:
                sat_count += 1
                if sat == check_date.day:
                    break
        if sat_count in [2, 4]:
            return True
        return False

    return False


def get_last_working_day(ref_date=None):
    if ref_date is None:
        ref_date = date.today() - timedelta(days=1)

    target_date = ref_date
    max_steps = 14
    steps = 0
    while check_is_non_working_day(target_date) and steps < max_steps:
        target_date -= timedelta(days=1)
        steps += 1
    return target_date



@employees_bp.route(
    "/reporting-employees/<int:user_id>",
    methods=["GET"]
)
def get_reporting_employees(user_id):

    try:

        manager = Employee.query.filter_by(
            user_id=user_id
        ).first()

        if not manager:
            return jsonify([])

        manager_name = (
            f"{manager.first_name} {manager.last_name}"
        ).strip().lower()

        print("Manager Name:", manager_name)

        target_date = get_last_working_day()

        all_employees = [e for e in get_all_employees_cached() if e.is_active != False]

        def _get_last_msg(history_list, role_name):
            if not isinstance(history_list, list):
                return None
            for item in reversed(history_list):
                if isinstance(item, dict) and item.get("sender_role") == role_name:
                    return item.get("comment")
            return None

        user = User.query.get(user_id)
        is_admin = False
        if user:
            role_name = (user.role.name or "").lower() if user.role else ""
            access_level = (user.access_level or "").lower()
            if "admin" in role_name or "admin" in access_level:
                is_admin = True

        result = []

        if is_admin:
            reporting_list = [e for e in all_employees if e.user_id != user_id]
        else:
            if not manager:
                return jsonify([])
            manager_full_name = f"{manager.first_name} {manager.last_name}".strip()
            reporting_list = [e for e in all_employees if e.user_id != user_id and is_manager_match(e.reporting_manager, manager_full_name)]

        has_any_updates = False
        today_date = date.today()

        # Find any non-working days (weekends/holidays) between target_date and today_date
        non_working_dates = []
        chk_d = target_date + timedelta(days=1)
        while chk_d < today_date:
            non_working_dates.append(chk_d)
            chk_d += timedelta(days=1)

        def serialize_attendance(employee, date_to_check, is_one_day_wages=False):
            nonlocal has_any_updates
            attendance = Attendance.query.filter_by(
                user_id=employee.user_id,
                attendance_date=date_to_check
            ).first()

            if attendance and (attendance.manager_status or "").strip().lower() == "approved":
                return None

            if attendance:
                from routes.attendance import sync_biometric_to_web_entry
                if sync_biometric_to_web_entry(attendance):
                    has_any_updates = True

            from models.leave import LeaveRequest
            from sqlalchemy import or_ as sql_or
            leave = LeaveRequest.query.filter(
                sql_or(
                    LeaveRequest.employee_id == str(employee.id),
                    LeaveRequest.employee_id == employee.employee_id
                ),
                LeaveRequest.status == "Approved",
                LeaveRequest.from_date <= date_to_check,
                LeaveRequest.to_date >= date_to_check
            ).first()

            # Determine status and employee_category
            status = "Absent"
            employee_category = "absent"  # "present" | "absent" | "leave"

            if attendance:
                status = attendance.status
                total_hours_val = attendance.total_hours or 0.0
                if attendance.check_out and total_hours_val > 0 and total_hours_val < 4.0 and status not in ("Absent", "Leave"):
                    status = "Half Day"
                if status in ("Present", "Half Day"):
                    employee_category = "present"
                elif status == "Leave":
                    employee_category = "leave"
                else:
                    employee_category = "absent"
            elif leave:
                status = "Leave"
                employee_category = "leave"

            # For LEAVE employees (no attendance row yet), include leave info
            leave_type_val = None
            if attendance and attendance.leave_type:
                leave_type_val = attendance.leave_type
            elif leave:
                leave_type_val = leave.leave_type

            yesterday_permission = LeaveRequest.query.filter(
                LeaveRequest.request_type == "Permission",
                LeaveRequest.status == "Approved",
                LeaveRequest.permission_date == date_to_check,
                sql_or(
                    LeaveRequest.employee_id == str(employee.id),
                    LeaveRequest.employee_id == employee.employee_id
                )
            ).first()

            permission_time_val = None
            permission_hours = 0.0
            if yesterday_permission:
                f_time = _parse_time(yesterday_permission.from_time)
                t_time = _parse_time(yesterday_permission.to_time)
                if f_time and t_time:
                    permission_time_val = f"{f_time.strftime('%I:%M %p')} - {t_time.strftime('%I:%M %p')}"
                    f_sec = f_time.hour * 3600 + f_time.minute * 60 + f_time.second
                    t_sec = t_time.hour * 3600 + t_time.minute * 60 + t_time.second
                    permission_hours = max(t_sec - f_sec, 0) / 3600.0

            working_hours_val = 0.0
            if attendance and attendance.total_hours is not None:
                working_hours_val = float(attendance.total_hours)
                if attendance.check_in and permission_hours > 0:
                    working_hours_val += permission_hours
            working_hours_val = int(working_hours_val * 100) / 100

            hist = (attendance.clarification_history if (attendance and isinstance(attendance.clarification_history, list)) else [])

            # Check if there is an approved or pending one day wages request for this date
            from models.shift_request import ShiftRequest
            wages_req = ShiftRequest.query.filter(
                ShiftRequest.employee_id.in_([employee.id, employee.employee_id]),
                ShiftRequest.request_type == "One Day Wages",
                ShiftRequest.from_date <= date_to_check,
                ShiftRequest.to_date >= date_to_check
            ).first()
            wages_status = wages_req.status if wages_req else None
            is_one_day_wages_final = (wages_req is not None and wages_req.status == "Approved") or \
                                     (is_one_day_wages and wages_status != "Rejected" and wages_status != "Pending" and attendance is not None and (attendance.check_in or attendance.card_check_in) and attendance.manager_status == "Approved" and attendance.status != "Leave")

            return {
                "summary_date":
                    date_to_check.strftime("%Y-%m-%d"),

                "summary_date_formatted":
                    date_to_check.strftime("%A, %b %d, %Y"),

                "employee_id":
                    employee.id,

                "employee_code":
                    employee.employee_id,

                "employee_name":
                    f"{employee.first_name} {employee.last_name}",

                "designation":
                    employee.designation,

                "department":
                    employee.department or "General",

                "profile_image":
                    get_profile_image_url(employee),

                "status":
                    status,

                "employee_category":
                    employee_category,

                "check_in":
                    attendance.check_in.strftime("%I:%M %p")
                    if (attendance and attendance.check_in)
                    else None,

                "check_out":
                    attendance.check_out.strftime("%I:%M %p")
                    if (attendance and attendance.check_out)
                    else None,

                "working_hours":
                    working_hours_val,

                "permission_time":
                    permission_time_val,

                "permission_hours":
                    permission_hours,

                "card_check_in":
                    attendance.card_check_in.strftime("%I:%M %p")
                    if attendance and attendance.card_check_in
                    else "-",

                "card_check_out":
                    attendance.card_check_out.strftime("%I:%M %p")
                    if attendance and attendance.card_check_out
                    else "-",

                "card_working_hours":
                    attendance.card_working_hours
                    if attendance and attendance.card_working_hours is not None
                    else 0.0,

                "rejection_reason":
                    _get_last_msg(hist, "manager"),

                "lunch_minutes":
                    attendance.lunch_minutes
                    if (attendance and attendance.lunch_minutes is not None)
                    else 0,

                "tea_minutes":
                    attendance.tea_minutes
                    if (attendance and attendance.tea_minutes is not None)
                    else 0,

                "total_break_minutes":
                    (attendance.lunch_minutes or 0) + (attendance.tea_minutes or 0)
                    if attendance
                    else 0,

                "manager_status":
                    attendance.manager_status
                    if (attendance and attendance.manager_status)
                    else "Pending",

                "decision":
                    attendance.manager_status
                    if (attendance and attendance.manager_status)
                    else "Pending",

                "is_regularization":
                    bool(attendance.is_regularization)
                    if attendance
                    else False,

                "is_lop":
                    bool(attendance.is_lop)
                    if attendance
                    else False,

                "leave_type":
                    leave_type_val,

                "clarification_comment":
                    _get_last_msg(hist, "manager"),

                "employee_reply":
                    _get_last_msg(hist, "employee"),

                "clarification_history":
                    hist,

                "is_one_day_wages":
                    is_one_day_wages_final,

                "wages_status":
                    wages_status
            }

        for employee in reporting_list:
            # 1. Regular check for last working day
            regular_data = serialize_attendance(employee, target_date, is_one_day_wages=False)
            if regular_data:
                result.append(regular_data)

            # 2. Check for non-working days (weekends/holidays)
            for w_date in non_working_dates:
                w_attendance = Attendance.query.filter_by(
                    user_id=employee.user_id,
                    attendance_date=w_date
                ).first()

                from models.shift_request import ShiftRequest
                wages_req = ShiftRequest.query.filter(
                    ShiftRequest.employee_id.in_([employee.id, employee.employee_id]),
                    ShiftRequest.request_type == "One Day Wages",
                    ShiftRequest.from_date <= w_date,
                    ShiftRequest.to_date >= w_date
                ).first()

                if (w_attendance and (w_attendance.check_in is not None or w_attendance.card_check_in is not None)) or wages_req:
                    weekend_data = serialize_attendance(employee, w_date, is_one_day_wages=True)
                    if weekend_data:
                        result.append(weekend_data)

        if has_any_updates:
            try:
                db.session.commit()
            except Exception as commit_err:
                db.session.rollback()
                print("Error committing copied attendance entries:", commit_err)

        result = sorted(result, key=lambda x: (x.get("employee_name") or "").lower())


        print(
            "Reporting Employees Found:",
            len(result)
        )

        return jsonify(result)

    except Exception as e:

        print(
            "Reporting Employees Error:",
            str(e)
        )

        return jsonify({
            "error": str(e)
        }), 500
    
@employees_bp.route(

    "/peers-attendance/<int:user_id>",
    methods=["GET"]
)
def get_peers_attendance(user_id):
    """Return all employees reporting to the same manager as this user with today's attendance status."""
    try:
        user_emp = Employee.query.filter_by(user_id=user_id).first()
        if not user_emp or not user_emp.reporting_manager:
            return jsonify([])

        manager_name = user_emp.reporting_manager.strip().lower()
        today = date.today()
        
        # Get all employees with same reporting manager
        peers = Employee.query.filter(
            Employee.user_id != user_id
        ).all()
        
        peers = [p for p in peers if p.reporting_manager and p.reporting_manager.strip().lower() == manager_name]

        # Extract peer IDs for batch fetching
        peer_user_ids = [p.user_id for p in peers]
        peer_employee_ids = [str(p.id) for p in peers]

        # Batch fetch attendances
        attendances = Attendance.query.filter(
            Attendance.user_id.in_(peer_user_ids),
            Attendance.attendance_date == today
        ).all()
        attendance_by_user = {a.user_id: a for a in attendances}

        # Batch fetch approved leaves
        from models.leave import LeaveRequest
        leaves = LeaveRequest.query.filter(
            LeaveRequest.employee_id.in_(peer_employee_ids),
            LeaveRequest.status == "Approved",
            LeaveRequest.from_date <= today,
            LeaveRequest.to_date >= today
        ).all()
        leave_by_employee = {str(l.employee_id): l for l in leaves}

        result = []
        for peer in peers:
            # Pre-fetched attendance/leave (no query!)
            attendance = attendance_by_user.get(peer.user_id)
            leave = (
                leave_by_employee.get(str(peer.id)) or
                leave_by_employee.get(peer.employee_id) or
                leave_by_employee.get(str(peer.employee_id))
            )

            status = "Absent"
            if attendance:
                if attendance.check_in or attendance.card_check_in:
                    if attendance.check_in and not attendance.check_out:
                        status = "Checked In"
                    elif attendance.check_out or attendance.card_check_out:
                        is_today = (attendance.attendance_date == today)
                        if is_today and attendance.card_check_out and not attendance.check_out:
                            punch_out_hour = attendance.card_check_out.hour
                            working_hrs = attendance.card_working_hours or 0.0
                            if punch_out_hour >= 15 or working_hrs >= 4.0:
                                status = "Checked Out"
                            else:
                                status = "Checked In"
                        else:
                            status = "Checked Out"
                    else:
                        status = "Checked In"
                else:
                    status = "Absent"
            elif leave:
                status = "Leave"

            result.append({
                "employee_id": peer.id,
                "user_id": peer.user_id,
                "first_name": peer.first_name,
                "last_name": peer.last_name,
                "role": peer.designation,
                "profile_image": get_profile_image_url(peer),
                "status": status,
                "check_in": attendance.check_in.strftime("%I:%M %p") if attendance and attendance.check_in else "-",
                "check_out": attendance.check_out.strftime("%I:%M %p") if attendance and attendance.check_out else "-"
            })

        return jsonify(result)
    except Exception as e:
        print("PEERS ATTENDANCE ERROR:", str(e))
        return jsonify({"error": str(e)}), 500

@employees_bp.route(
    "/by-team/<int:team_id>",
    methods=["GET"]
)
def get_team_attendance_by_id(team_id):
    """Return all employees belonging to a specific team_id with today's attendance status."""
    CACHE_TTL = 30  # seconds

    # Try Redis cache first
    r = _get_redis()
    cache_key = f"team_attendance:{team_id}:{date.today()}"
    if r:
        try:
            cached = r.get(cache_key)
            if cached:
                return jsonify(json.loads(cached))
        except Exception:
            pass

    try:
        from models.user import User
        # Find all users in this team
        users_in_team = User.query.filter_by(team_id=team_id).all()
        user_ids = [u.id for u in users_in_team]

        if not user_ids:
            return jsonify([])

        today = date.today()

        # Get all employee records for these users (excluding inactive)
        team_employees = Employee.query.filter(
            Employee.user_id.in_(user_ids),
            Employee.is_active != False
        ).all()
        # Batch fetch attendance for all team users today
        attendances = Attendance.query.filter(
            Attendance.user_id.in_(user_ids),
            Attendance.attendance_date == today
        ).all()
        attendance_by_user = {a.user_id: a for a in attendances}
        employee_ids = [str(emp.id) for emp in team_employees] + [emp.employee_id for emp in team_employees if emp.employee_id]

        # Batch fetch approved leaves for all team employees today
        from models.leave import LeaveRequest
        leaves = LeaveRequest.query.filter(
            LeaveRequest.employee_id.in_(employee_ids),
            LeaveRequest.status.in_(["Approved", "Pending"]),
            LeaveRequest.from_date <= today,
            LeaveRequest.to_date >= today
        ).all()
        leave_by_employee = {str(l.employee_id): l for l in leaves}

        # Batch fetch ALL approved shift requests (Shift, WFH, Office) for TEAM employees today
        # Latest request (by created_at) takes precedence
        from models.shift_request import ShiftRequest
        all_shift_requests = ShiftRequest.query.filter(
            ShiftRequest.employee_id.in_(employee_ids),
            ShiftRequest.status == "Approved",
            ShiftRequest.from_date <= today,
            ShiftRequest.to_date >= today
        ).all()

        # Group by employee and keep only the latest request per employee
        latest_by_employee = {}
        for sr in all_shift_requests:
            emp_id = str(sr.employee_id)
            if emp_id not in latest_by_employee or sr.created_at > latest_by_employee[emp_id].created_at:
                latest_by_employee[emp_id] = sr

        # Also maintain separate dicts for backwards compatibility
        shift_by_employee = {emp_id: sr for emp_id, sr in latest_by_employee.items() if sr.request_type == "Shift"}
        wfh_by_employee = {emp_id: sr for emp_id, sr in latest_by_employee.items() if sr.request_type == "WFH"}
        office_by_employee = {emp_id: sr for emp_id, sr in latest_by_employee.items() if sr.request_type == "Office"}

        # Batch fetch approved permissions for all team employees today
        permissions = LeaveRequest.query.filter(
            LeaveRequest.employee_id.in_(employee_ids),
            LeaveRequest.status == "Approved",
            LeaveRequest.request_type == "Permission",
            LeaveRequest.permission_date == today
        ).all()
        permission_by_employee = {}
        for p in permissions:
            permission_by_employee[str(p.employee_id)] = p

        result = []
        for emp in team_employees:
            attendance = attendance_by_user.get(emp.user_id)
            leave = leave_by_employee.get(str(emp.id)) or leave_by_employee.get(emp.employee_id)

            # Check if this employee has an approved shift request for today
            emp_shift_request = (
                shift_by_employee.get(str(emp.id)) or
                shift_by_employee.get(emp.employee_id) or
                shift_by_employee.get(str(emp.employee_id))
            )
            is_shift_changed = emp_shift_request is not None
            approved_shift = emp_shift_request.requested_shift if is_shift_changed else None

            # Check if WFH - use latest request if available
            emp_latest_request = (
                latest_by_employee.get(str(emp.id)) or
                latest_by_employee.get(emp.employee_id) or
                latest_by_employee.get(str(emp.employee_id))
            )
            is_permanent_wfh = (emp.work_mode == "WFH")

            # Latest request takes precedence; if no request, fall back to permanent WFH
            if emp_latest_request:
                if emp_latest_request.request_type == "WFH":
                    is_wfh = True
                elif emp_latest_request.request_type == "Office":
                    is_wfh = False
                elif emp_latest_request.requested_work_mode == "WFH":
                    is_wfh = True
                else:
                    is_wfh = is_permanent_wfh
            else:
                is_wfh = is_permanent_wfh

            # Check if Permission is active now
            emp_permission = (
                permission_by_employee.get(str(emp.id)) or
                permission_by_employee.get(emp.employee_id) or
                permission_by_employee.get(str(emp.employee_id))
            )
            has_permission_today = emp_permission is not None
            is_permission_active = False

            f_time = _parse_time(emp_permission.from_time) if has_permission_today else None
            t_time = _parse_time(emp_permission.to_time) if has_permission_today else None

            if has_permission_today and f_time and t_time:
                now_ist_time = datetime.now(ZoneInfo("Asia/Kolkata")).time()
                if f_time <= now_ist_time <= t_time:
                    is_permission_active = True

            permission_from = f_time.strftime("%I:%M %p") if f_time else None
            permission_to = t_time.strftime("%I:%M %p") if t_time else None

            # Calculate working and total hours
            working_hours = 0.0
            total_hours = 0.0
            if attendance:
                if attendance.check_out:
                    working_hours = attendance.total_hours or 0.0
                    break_mins = attendance.total_break_minutes or 0.0
                    gap_mins = attendance.total_gap_minutes or 0.0
                    total_hours = working_hours + (break_mins + gap_mins) / 60
                else:
                    # Still checked in
                    now_ist = datetime.now(ZoneInfo("Asia/Kolkata")).replace(tzinfo=None)
                    if attendance.check_in:
                        elapsed = (now_ist - attendance.check_in).total_seconds()
                        break_secs = (attendance.total_break_minutes or 0) * 60
                        working_hours = max(elapsed - break_secs, 0) / 3600
                        total_hours = elapsed / 3600
                    else:
                        working_hours = 0.0
                        total_hours = 0.0

            permission_hours = 0.0
            if has_permission_today and f_time and t_time:
                f_sec = f_time.hour * 3600 + f_time.minute * 60 + f_time.second
                t_sec = t_time.hour * 3600 + t_time.minute * 60 + t_time.second
                permission_hours = max(t_sec - f_sec, 0) / 3600.0

            if attendance and attendance.check_in and permission_hours > 0:
                working_hours = working_hours + permission_hours
                total_hours = total_hours + permission_hours

            working_hours = int(working_hours * 100) / 100
            total_hours = int(total_hours * 100) / 100

            is_half_day_leave = leave and leave.total_days is not None and float(leave.total_days) <= 0.5

            status = "Absent"
            if attendance:
                if attendance.check_out:
                    if is_half_day_leave:
                        status = "Leave"
                    else:
                        status = "Checked Out"
                else:
                    status = "Checked In"
            elif leave:
                status = "Leave"

            leave_duration = None
            if leave:
                leave_duration = "Full Day"
                if leave.total_days and float(leave.total_days) <= 0.5:
                    if leave.reason and " (First Half)" in leave.reason:
                        leave_duration = "First Half"
                    elif leave.reason and " (Second Half)" in leave.reason:
                        leave_duration = "Second Half"
                    else:
                        leave_duration = "First Half"

            result.append({
                "employee_id": emp.id,
                "user_id": emp.user_id,
                "first_name": emp.first_name,
                "last_name": emp.last_name,
                "role": emp.designation,
                "designation": emp.designation,
                "profile_image": f"/api/employees/image/{emp.id}" if emp.profile_image else None,
                "status": status,
                "check_in": attendance.check_in.strftime("%I:%M %p") if attendance and attendance.check_in else "-",
                "check_out": attendance.check_out.strftime("%I:%M %p") if attendance and attendance.check_out else "-",
                "check_in_ip": attendance.check_in_ip if attendance else None,
                "check_out_ip": attendance.check_out_ip if attendance else None,
                "lunch_break": attendance.lunch_break if attendance else False,
                "tea_break": attendance.tea_break if attendance else False,
                "is_shift_changed": is_shift_changed,
                "approved_shift": approved_shift,
                "is_wfh": is_wfh,
                "is_permanent_wfh": is_permanent_wfh,
                "is_permission": is_permission_active,
                "permission_from": permission_from,
                "permission_to": permission_to,
                "permission_hours": permission_hours,
                "working_hours": working_hours,
                "total_hours": total_hours,
                "leave_type": leave.leave_type if leave else None,
                "total_days": float(leave.total_days) if leave and leave.total_days is not None else None,
                "leave_duration": leave_duration,
            })

        # Store in Redis for next 30 seconds
        if r:
            try:
                r.setex(cache_key, CACHE_TTL, json.dumps(result))
            except Exception:
                pass

        return jsonify(result)
    except Exception as e:
        print("TEAM ATTENDANCE BY ID ERROR:", str(e))
        return jsonify({"error": str(e)}), 500


        employee_ids = [str(emp.id) for emp in team_employees] + [emp.employee_id for emp in team_employees if emp.employee_id]

        # Batch fetch approved leaves for all team employees today
        from models.leave import LeaveRequest
        leaves = LeaveRequest.query.filter(
            LeaveRequest.employee_id.in_(employee_ids),
            LeaveRequest.status.in_(["Approved", "Pending"]),
            LeaveRequest.from_date <= today,
            LeaveRequest.to_date >= today
        ).all()
        leave_by_employee = {str(l.employee_id): l for l in leaves}

        # Batch fetch ALL approved shift requests (Shift, WFH, Office) for TEAM employees today
        # Latest request (by created_at) takes precedence
        from models.shift_request import ShiftRequest
        all_shift_requests = ShiftRequest.query.filter(
            ShiftRequest.employee_id.in_(employee_ids),
            ShiftRequest.status == "Approved",
            ShiftRequest.from_date <= today,
            ShiftRequest.to_date >= today
        ).all()

        # Group by employee and keep only the latest request per employee
        latest_by_employee = {}
        for sr in all_shift_requests:
            emp_id = str(sr.employee_id)
            if emp_id not in latest_by_employee or sr.created_at > latest_by_employee[emp_id].created_at:
                latest_by_employee[emp_id] = sr

        # Also maintain separate dicts for backwards compatibility
        shift_by_employee = {emp_id: sr for emp_id, sr in latest_by_employee.items() if sr.request_type == "Shift"}
        wfh_by_employee = {emp_id: sr for emp_id, sr in latest_by_employee.items() if sr.request_type == "WFH"}
        office_by_employee = {emp_id: sr for emp_id, sr in latest_by_employee.items() if sr.request_type == "Office"}

        # Batch fetch approved permissions for all team employees today
        permissions = LeaveRequest.query.filter(
            LeaveRequest.employee_id.in_(employee_ids),
            LeaveRequest.status == "Approved",
            LeaveRequest.request_type == "Permission",
            LeaveRequest.permission_date == today
        ).all()
        permission_by_employee = {}
        for p in permissions:
            permission_by_employee[str(p.employee_id)] = p

        result = []
        for emp in team_employees:
            attendance = attendance_by_user.get(emp.user_id)
            leave = leave_by_employee.get(str(emp.id)) or leave_by_employee.get(emp.employee_id)

            # Check if this employee has an approved shift request for today
            emp_shift_request = (
                shift_by_employee.get(str(emp.id)) or 
                shift_by_employee.get(emp.employee_id) or
                shift_by_employee.get(str(emp.employee_id))
            )
            is_shift_changed = emp_shift_request is not None
            approved_shift = emp_shift_request.requested_shift if is_shift_changed else None

            # Check if WFH - use latest request if available
            emp_latest_request = (
                latest_by_employee.get(str(emp.id)) or
                latest_by_employee.get(emp.employee_id) or
                latest_by_employee.get(str(emp.employee_id))
            )
            is_permanent_wfh = (emp.work_mode == "WFH")

            # Latest request takes precedence; if no request, fall back to permanent WFH
            if emp_latest_request:
                if emp_latest_request.request_type == "WFH":
                    is_wfh = True
                elif emp_latest_request.request_type == "Office":
                    is_wfh = False
                elif emp_latest_request.requested_work_mode == "WFH":
                    is_wfh = True
                else:
                    is_wfh = is_permanent_wfh
            else:
                is_wfh = is_permanent_wfh

            # Check if Permission is active now
            emp_permission = (
                permission_by_employee.get(str(emp.id)) or 
                permission_by_employee.get(emp.employee_id) or
                permission_by_employee.get(str(emp.employee_id))
            )
            has_permission_today = emp_permission is not None
            is_permission_active = False

            f_time = _parse_time(emp_permission.from_time) if has_permission_today else None
            t_time = _parse_time(emp_permission.to_time) if has_permission_today else None

            if has_permission_today and f_time and t_time:
                now_ist_time = datetime.now(ZoneInfo("Asia/Kolkata")).time()
                if f_time <= now_ist_time <= t_time:
                    is_permission_active = True

            permission_from = f_time.strftime("%I:%M %p") if f_time else None
            permission_to = t_time.strftime("%I:%M %p") if t_time else None

            # Calculate working and total hours
            working_hours = 0.0
            total_hours = 0.0
            if attendance:
                if attendance.check_out:
                    working_hours = attendance.total_hours or 0.0
                    break_mins = attendance.total_break_minutes or 0.0
                    gap_mins = attendance.total_gap_minutes or 0.0
                    total_hours = working_hours + (break_mins + gap_mins) / 60
                else:
                    # Still checked in
                    now_ist = datetime.now(ZoneInfo("Asia/Kolkata")).replace(tzinfo=None)
                    if attendance.check_in:
                        elapsed = (now_ist - attendance.check_in).total_seconds()
                        break_secs = (attendance.total_break_minutes or 0) * 60
                        working_hours = max(elapsed - break_secs, 0) / 3600
                        total_hours = elapsed / 3600
                    else:
                        working_hours = 0.0
                        total_hours = 0.0
                    
            permission_hours = 0.0
            if has_permission_today and f_time and t_time:
                f_sec = f_time.hour * 3600 + f_time.minute * 60 + f_time.second
                t_sec = t_time.hour * 3600 + t_time.minute * 60 + t_time.second
                permission_hours = max(t_sec - f_sec, 0) / 3600.0

            if attendance and attendance.check_in and permission_hours > 0:
                working_hours = working_hours + permission_hours
                total_hours = total_hours + permission_hours

            working_hours = int(working_hours * 100) / 100
            total_hours = int(total_hours * 100) / 100

            is_half_day_leave = leave and leave.total_days is not None and float(leave.total_days) <= 0.5

            status = "Absent"
            if attendance:
                if attendance.check_out:
                    if is_half_day_leave:
                        status = "Leave"
                    else:
                        status = "Checked Out"
                else:
                    status = "Checked In"
            elif leave:
                status = "Leave"

            leave_duration = None
            if leave:
                leave_duration = "Full Day"
                if leave.total_days and float(leave.total_days) <= 0.5:
                    if leave.reason and " (First Half)" in leave.reason:
                        leave_duration = "First Half"
                    elif leave.reason and " (Second Half)" in leave.reason:
                        leave_duration = "Second Half"
                    else:
                        leave_duration = "First Half"

            result.append({
                "employee_id": emp.id,
                "user_id": emp.user_id,
                "first_name": emp.first_name,
                "last_name": emp.last_name,
                "role": emp.designation,
                "designation": emp.designation,
                "profile_image": get_profile_image_url(emp),
                "status": status,
                "check_in": attendance.check_in.strftime("%I:%M %p") if attendance and attendance.check_in else "-",
                "check_out": attendance.check_out.strftime("%I:%M %p") if attendance and attendance.check_out else "-",
                "check_in_ip": attendance.check_in_ip if attendance else None,
                "check_out_ip": attendance.check_out_ip if attendance else None,
                "lunch_break": attendance.lunch_break if attendance else False,
                "tea_break": attendance.tea_break if attendance else False,
                "is_shift_changed": is_shift_changed,
                "approved_shift": approved_shift,
                "is_wfh": is_wfh,
                "is_permanent_wfh": is_permanent_wfh,
                "is_permission": is_permission_active,
                "permission_from": permission_from,
                "permission_to": permission_to,
                "permission_hours": permission_hours,
                "working_hours": working_hours,
                "total_hours": total_hours,
                "leave_type": leave.leave_type if leave else None,
                "total_days": float(leave.total_days) if leave and leave.total_days is not None else None,
                "leave_duration": leave_duration,
            })

        return jsonify(result)
    except Exception as e:
        print("TEAM ATTENDANCE BY ID ERROR:", str(e))
        return jsonify({"error": str(e)}), 500

@employees_bp.route(

    "/roles/<int:team_id>",
    methods=["GET"]
)
def get_roles_by_team(team_id):

    roles = Role.query.filter_by(
        team_id=team_id
    ).all()

    return jsonify([
        {
            "id": role.id,
            "name": role.name
        }
        for role in roles
    ])

@employees_bp.route(
    "/profile/<int:user_id>",
    methods=["GET"]
)
def get_employee_profile(user_id):

    employee = Employee.query.filter_by(
        user_id=user_id
    ).first()

    if not employee:
        return jsonify({
            "success": False,
            "message": "Employee not found"
        }), 404

    return jsonify({
        "success": True,
        "data": {
            "id": employee.id,
            "employee_id": employee.employee_id,
            "first_name": employee.first_name,
            "last_name": employee.last_name,
            "email": employee.email,
            "phone": employee.phone,
            "department": employee.department,
            "designation": employee.designation,
            "joining_date": str(employee.joining_date) if employee.joining_date else None,
            "reporting_manager": employee.reporting_manager
        }
    })

@employees_bp.route(
    "/employee-details/<int:employee_id>",
    methods=["GET"]
)
def get_employee_details(employee_id):

    try:

        employee = Employee.query.get(employee_id)

        if not employee:
            return jsonify({
                "success": False,
                "message": "Employee not found"
            }), 404

        # Payroll Cycle
        today = date.today()

        if today.day >= 25:

            start_date = date(
                today.year,
                today.month,
                25
            )

            if today.month == 12:

                end_date = date(
                    today.year + 1,
                    1,
                    24
                )

            else:

                end_date = date(
                    today.year,
                    today.month + 1,
                    24
                )

        else:

            if today.month == 1:

                start_date = date(
                    today.year - 1,
                    12,
                    25
                )

            else:

                start_date = date(
                    today.year,
                    today.month - 1,
                    25
                )

            end_date = date(
                today.year,
                today.month,
                24
            )

        attendance_records = Attendance.query.filter(
            Attendance.user_id == employee.user_id,
            Attendance.attendance_date >= start_date,
            Attendance.attendance_date <= end_date
        ).all()

        present_days = len([
            a for a in attendance_records
            if a.status == "Present"
        ])

        absent_days = len([
            a for a in attendance_records
            if a.status == "Absent"
        ])

        absent_dates = [
            str(a.attendance_date)
            for a in attendance_records
            if a.status == "Absent"
        ]

        leave_requests = LeaveRequest.query.filter(
            or_(
                LeaveRequest.employee_id == str(employee.id),
                LeaveRequest.employee_id == employee.employee_id
            ),
            LeaveRequest.status == "Approved",
            LeaveRequest.from_date >= start_date,
            LeaveRequest.to_date <= end_date
        ).all()

        total_leave_days = sum(
            leave.total_days or 0
            for leave in leave_requests
        )

        leave_history = []

        for leave in leave_requests:

            leave_history.append({
                "leave_type": leave.leave_type,
                "from_date": str(leave.from_date),
                "to_date": str(leave.to_date),
                "total_days": leave.total_days,
                "status": leave.status,
                "reason": leave.reason
            })

        return jsonify({
            "success": True,
            "employee": {

                "id": employee.id,

                "employee_id":
                    employee.employee_id,

                "name":
                    f"{employee.first_name} {employee.last_name}",

                "email":
                    employee.email,

                "phone":
                    employee.phone,

                "department":
                    employee.department,

                "designation":
                    employee.designation,

                "reporting_manager":
                    employee.reporting_manager,

                "salary":
                    employee.salary,

                "shift_timing":
                    employee.shift_timing,

                "work_mode":
                    employee.work_mode,

                "joining_date":
                    str(employee.joining_date),

                "present_days":
                    present_days,

                "leave_days":
                    total_leave_days,

                "absent_days":
                    absent_days,

                "absent_dates":
                    absent_dates,

                "sick_leave":
                    employee.sick_leave,

                "casual_leave":
                    employee.casual_leave,

                "privilege_leave":
                    employee.privilege_leave,
                "earned_leave":
                    employee.privilege_leave,

                "attendance_history": [
                    {
                        "date":
                            str(att.attendance_date),

                        "status":
                            att.status,

                        "check_in":
                            att.check_in.strftime(
                                "%I:%M %p"
                            )
                            if att.check_in
                            else None,

                        "check_out":
                            att.check_out.strftime(
                                "%I:%M %p"
                            )
                            if att.check_out
                            else None,

                        "working_hours":
                            att.total_hours
                    }
                    for att in attendance_records
                ],

                "leave_history":
                    leave_history
            }
        })

    except Exception as e:

        return jsonify({
            "success": False,
            "message": str(e)
        }), 500

@employees_bp.route("/<int:employee_id>/status", methods=["POST"])
def update_employee_status(employee_id):
    try:
        employee = Employee.query.get(employee_id)
        if not employee:
            return jsonify({
                "success": False,
                "message": "Employee not found"
            }), 404

        data = request.get_json() or {}
        is_active = data.get("is_active", True)

        employee.is_active = is_active
        if not is_active:
            employee.deactivation_reason = data.get("deactivation_reason")
            lwd_str = data.get("last_working_date")
            if lwd_str:
                employee.last_working_date = datetime.strptime(lwd_str, "%Y-%m-%d").date()
        else:
            employee.deactivation_reason = None
            employee.last_working_date = None

        # Disable/enable linked User portal access
        user = User.query.get(employee.user_id)
        if user:
            user.is_active = is_active
            user.status = "active" if is_active else "inactive"

        db.session.commit()
        invalidate_employee_cache()
        return jsonify({
            "success": True,
            "message": "Employee status updated successfully"
        })
    except Exception as err:
        db.session.rollback()
        return jsonify({
            "success": False,
            "error": str(err)
        }), 500