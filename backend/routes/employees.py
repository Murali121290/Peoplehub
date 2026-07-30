# pyrefly: ignore [missing-import]
from utils.compat import Blueprint, request, jsonify, Response
from models.database import db
from models.employee import Employee
from datetime import date, timedelta, datetime
from zoneinfo import ZoneInfo
import traceback
import base64
from models.user import User
from middleware.auth import auth_required
from models.attendance import Attendance
from models.user import Role, Team
from services.leave_balance_service import update_leave_balance
from models.leave import LeaveRequest
from models.user import User, Role, Team
from sqlalchemy import extract
from sqlalchemy.exc import IntegrityError

employees_bp = Blueprint("employees", __name__)

@employees_bp.route("/", methods=["POST"])
def create_employee():
    try:
        data = request.form

        print("========== CREATE EMPLOYEE ==========")
        print("FORM DATA:", request.form)
        print("FILES:", request.files)

        # ---------------------------------
        # Profile Image
        # ---------------------------------
        image = request.files.get("profile_image")

        image_data = None
        if image:
            image_data = image.read()

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

    employees = [e for e in Employee.query.all() if (e.status or "").lower() != "inactive"]

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
                    LeaveRequest.employee_id == str(emp.id),
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
                emp.privilege_leave
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

    "profile_image": (
        base64.b64encode(employee.profile_image).decode("utf-8")
        if employee.profile_image
        else None
    ),

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
    "/image/<int:employee_id>",
    methods=["GET"]
)
def get_employee_image(employee_id):

    employee = Employee.query.get(
        employee_id
    )

    if not employee:
        return jsonify({
            "error": "Employee not found"
        }), 404

    if not employee.profile_image:
        return jsonify({
            "error": "No image found"
        }), 404

    return Response(
        employee.profile_image,
        mimetype="image/jpeg"
    )
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

        employee = Employee.query.get(employee_id)

        if not employee:
            return jsonify({
                "error": "Employee not found"
            }), 404

        if not current_user:
            return jsonify({
                "error": "Current user not found"
            }), 404

        is_hr_or_admin = current_user.access_level.lower() in ["admin", "hr"]
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
            employee.profile_image = profile_image.read()

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
        if resume:
            employee.resume_file = resume.read()

        if aadhaar:
            employee.aadhaar_file = aadhaar.read()

        if pan:
            employee.pan_file = pan.read()

        if degree:
            employee.degree_certificate = degree.read()

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
    employees = [e for e in Employee.query.all() if (e.status or "").lower() != "inactive"]

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

        employees = Employee.query.filter(
            Employee.dob.isnot(None),
            extract("month", Employee.dob) == today.month,
            extract("day", Employee.dob) == today.day
        ).all()

        return jsonify([
            {
                "id": e.id,
                "first_name": e.first_name,
                "last_name": e.last_name,
                "user_id": e.user_id,
                "department": e.department,
                "designation": e.designation,
                "profile_image": base64.b64encode(e.profile_image).decode("utf-8") if e.profile_image else None
            }
            for e in employees
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
            extract("year", Employee.joining_date) < today.year
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
                "profile_image": base64.b64encode(e.profile_image).decode("utf-8") if e.profile_image else None
            }
            for e in employees
        ])
    except Exception as err:
        print("ERROR IN TODAY ANNIVERSARIES:", str(err))
        return jsonify([]), 500


@employees_bp.route("/team-overview", methods=["GET"])
@auth_required
def get_team_overview():

    teams = Team.query.all()

    result = []

    for team in teams:

        employees = [e for e in Employee.query.filter_by(
            team_id=team.id
        ).all() if (e.status or '').lower() != 'inactive']

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
            emp_ids = [emp.id]
            if emp.employee_id:
                try:
                    emp_ids.append(int(emp.employee_id))
                except ValueError:
                    pass

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
                "profile_image": emp.profile_image is not None,
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

    for team_user in team_users:

        employee = Employee.query.filter_by(
            user_id=team_user.id
        ).first()

        if employee:
            update_leave_balance(employee)


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
                "earned_leave": employee.privilege_leave
            })

    return jsonify(result)



@employees_bp.route("/team-attendance/<int:user_id>", methods=["GET"])
def get_team_attendance(user_id):
    """Return all employees reporting to this manager with today's attendance status."""
    try:
        manager = Employee.query.filter_by(user_id=user_id).first()
        if not manager:
            return jsonify([])

        manager_name = f"{manager.first_name} {manager.last_name}".strip().lower()
        today = date.today()

        all_employees = [e for e in Employee.query.all() if (e.status or "").lower() != "inactive"]
        result = []

        for emp in all_employees:
            if not emp.reporting_manager:
                continue
            e_mgr = emp.reporting_manager.strip().lower()
            if e_mgr != manager_name and not (len(e_mgr.split()) == 1 and manager_name.split()[0] == e_mgr) and not (len(manager_name.split()) == 1 and e_mgr.split()[0] == manager_name):
                continue

            # Today's attendance
            attendance = Attendance.query.filter_by(
                user_id=emp.user_id,
                attendance_date=today
            ).first()

            # Check leave for today
            on_leave = LeaveRequest.query.filter(
                LeaveRequest.employee_id == str(emp.id),
                LeaveRequest.status == "Approved",
                LeaveRequest.request_type == "Leave",
                LeaveRequest.from_date <= today,
                LeaveRequest.to_date >= today
            ).first()

            # Check WFH and Shift Change for today
            from models.shift_request import ShiftRequest
            emp_ids = [emp.id]
            if emp.employee_id:
                try:
                    emp_ids.append(int(emp.employee_id))
                except ValueError:
                    pass

            wfh_today = ShiftRequest.query.filter(
                ShiftRequest.employee_id.in_(emp_ids),
                ShiftRequest.status == "Approved",
                ShiftRequest.request_type == "WFH",
                ShiftRequest.from_date <= today,
                ShiftRequest.to_date >= today
            ).first()

            shift_change_today = ShiftRequest.query.filter(
                ShiftRequest.employee_id.in_(emp_ids),
                ShiftRequest.status == "Approved",
                ShiftRequest.request_type == "Shift",
                ShiftRequest.from_date <= today,
                ShiftRequest.to_date >= today
            ).first()

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

            result.append({
                "id": emp.id,
                "user_id": emp.user_id,
                "name": f"{emp.first_name} {emp.last_name}",
                "employee_id": emp.employee_id,
                "email": emp.email,
                "role": emp.designation or "Employee",
                "designation": emp.designation or "Employee",
                "department": emp.department,
                "profile_image": base64.b64encode(emp.profile_image).decode("utf-8") if emp.profile_image else None,
                "attendance_status": att_status,
                "check_in": check_in,
                "check_out": check_out,
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
                    shift_change_today.requested_work_mode
                    if (shift_change_today and shift_change_today.requested_work_mode)
                    else (
                        emp.work_mode or "Office"
                    )
                ),
                "manager_status": attendance.manager_status if (attendance and attendance.manager_status) else "Pending",
                "is_wfh": (
                    (shift_change_today.requested_work_mode == "WFH") if (shift_change_today and shift_change_today.requested_work_mode)
                    else (wfh_today is not None or (emp.work_mode or "Office") == "WFH")
                ),
                "is_permanent_wfh": (emp.work_mode == "WFH"),
                "is_shift_changed": bool(shift_change_today),
            })

        return jsonify(result)

    except Exception as e:
        print("TEAM ATTENDANCE ERROR:", str(e))
        return jsonify({"error": str(e)}), 500


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

        reporting_employees = [e for e in Employee.query.all() if (e.status or "").lower() != "inactive"]

        def _get_last_msg(history_list, role_name):
            if not isinstance(history_list, list):
                return None
            for item in reversed(history_list):
                if isinstance(item, dict) and item.get("sender_role") == role_name:
                    return item.get("comment")
            return None

        result = []

        for employee in reporting_employees:

            if not employee.reporting_manager:
                continue

            e_mgr = employee.reporting_manager.strip().lower()
            is_match = (e_mgr == manager_name) or (len(e_mgr.split()) == 1 and manager_name.split()[0] == e_mgr) or (len(manager_name.split()) == 1 and e_mgr.split()[0] == manager_name)
            if not is_match:
                continue

            if employee.user_id == user_id:
                continue

            attendance = Attendance.query.filter_by(
                user_id=employee.user_id,
                attendance_date=target_date
            ).first()

            if attendance and (attendance.manager_status or "").strip().lower() == "approved":
                continue

            from models.leave import LeaveRequest
            from sqlalchemy import or_ as sql_or
            leave = LeaveRequest.query.filter(
                sql_or(
                    LeaveRequest.employee_id == str(employee.id),
                    LeaveRequest.employee_id == employee.employee_id
                ),
                LeaveRequest.status == "Approved",
                LeaveRequest.from_date <= target_date,
                LeaveRequest.to_date >= target_date
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

            hist = (attendance.clarification_history if (attendance and isinstance(attendance.clarification_history, list)) else [])

            result.append({

                "summary_date":
                    target_date.strftime("%Y-%m-%d"),

                "summary_date_formatted":
                    target_date.strftime("%A, %b %d, %Y"),

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
                    base64.b64encode(
                        employee.profile_image
                    ).decode("utf-8")
                    if employee.profile_image
                    else None,

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
                    attendance.total_hours
                    if (attendance and attendance.total_hours is not None)
                    else 0.0,

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
                    if (attendance and attendance.card_working_hours is not None)
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
                    hist

            })

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

        result = []
        for peer in peers:
            attendance = Attendance.query.filter_by(
                user_id=peer.user_id,
                attendance_date=today
            ).first()

            from models.leave import LeaveRequest
            leave = LeaveRequest.query.filter(
                LeaveRequest.employee_id == str(peer.id),
                LeaveRequest.status == "Approved",
                LeaveRequest.from_date <= today,
                LeaveRequest.to_date >= today
            ).first()

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
                "profile_image": base64.b64encode(peer.profile_image).decode("utf-8") if peer.profile_image else None,
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
    try:
        from models.user import User
        # Find all users in this team
        users_in_team = User.query.filter_by(team_id=team_id).all()
        user_ids = [u.id for u in users_in_team]
        
        if not user_ids:
            return jsonify([])

        today = date.today()
        
        # Get all employee records for these users
        team_employees = Employee.query.filter(Employee.user_id.in_(user_ids)).all()
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

        # Batch fetch approved shift requests for all team employees today
        from models.shift_request import ShiftRequest
        shift_requests = ShiftRequest.query.filter(
            ShiftRequest.status == "Approved",
            ShiftRequest.request_type == "Shift",
            ShiftRequest.from_date <= today,
            ShiftRequest.to_date >= today
        ).all()
        shift_by_employee = {}
        for sr in shift_requests:
            shift_by_employee[str(sr.employee_id)] = sr

        # Batch fetch approved WFH requests for all team employees today
        wfh_requests = ShiftRequest.query.filter(
            ShiftRequest.status == "Approved",
            ShiftRequest.request_type == "WFH",
            ShiftRequest.from_date <= today,
            ShiftRequest.to_date >= today
        ).all()
        wfh_by_employee = {}
        for w in wfh_requests:
            wfh_by_employee[str(w.employee_id)] = w

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

            # Check if WFH (permanent via shift_timing OR approved WFH request for today)
            # Permanent WFH is suppressed if the employee has a shift change today (coming to office)
            emp_wfh_request = (
                wfh_by_employee.get(str(emp.id)) or 
                wfh_by_employee.get(emp.employee_id) or
                wfh_by_employee.get(str(emp.employee_id))
            )
            is_permanent_wfh = (emp.work_mode == "WFH")
            is_wfh = (
                (emp_shift_request.requested_work_mode == "WFH" if (emp_shift_request and emp_shift_request.requested_work_mode) else False) or
                (emp_wfh_request is not None) or
                (emp.work_mode == "WFH")
            )

            # Check if Permission is active now
            emp_permission = (
                permission_by_employee.get(str(emp.id)) or 
                permission_by_employee.get(emp.employee_id) or
                permission_by_employee.get(str(emp.employee_id))
            )
            has_permission_today = emp_permission is not None
            is_permission_active = False

            if has_permission_today and emp_permission.from_time and emp_permission.to_time:
                from datetime import datetime
                from zoneinfo import ZoneInfo
                now_ist_time = datetime.now(ZoneInfo("Asia/Kolkata")).time()
                if emp_permission.from_time <= now_ist_time <= emp_permission.to_time:
                    is_permission_active = True

            permission_from = emp_permission.from_time.strftime("%I:%M %p") if (has_permission_today and emp_permission.from_time) else None
            permission_to = emp_permission.to_time.strftime("%I:%M %p") if (has_permission_today and emp_permission.to_time) else None

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
                    from datetime import datetime
                    from zoneinfo import ZoneInfo
                    now_ist = datetime.now(ZoneInfo("Asia/Kolkata")).replace(tzinfo=None)
                    elapsed = (now_ist - attendance.check_in).total_seconds()
                    break_secs = (attendance.total_break_minutes or 0) * 60
                    working_hours = max(elapsed - break_secs, 0) / 3600
                    total_hours = elapsed / 3600
                    
            working_hours = int(working_hours * 100) / 100
            total_hours = int(total_hours * 100) / 100

            status = "Absent"
            if attendance:
                if attendance.check_out:
                    status = "Checked Out"
                else:
                    status = "Checked In"
            elif leave:
                status = "Leave"

            result.append({
                "employee_id": emp.id,
                "user_id": emp.user_id,
                "first_name": emp.first_name,
                "last_name": emp.last_name,
                "role": emp.designation,
                "designation": emp.designation,
                "profile_image": base64.b64encode(emp.profile_image).decode("utf-8") if emp.profile_image else None,
                "status": status,
                "check_in": attendance.check_in.strftime("%I:%M %p") if attendance and attendance.check_in else "-",
                "check_out": attendance.check_out.strftime("%I:%M %p") if attendance and attendance.check_out else "-",
                "lunch_break": attendance.lunch_break if attendance else False,
                "tea_break": attendance.tea_break if attendance else False,
                "is_shift_changed": is_shift_changed,
                "approved_shift": approved_shift,
                "is_wfh": is_wfh,
                "is_permanent_wfh": is_permanent_wfh,
                "is_permission": is_permission_active,
                "permission_from": permission_from,
                "permission_to": permission_to,
                "working_hours": working_hours,
                "total_hours": total_hours,
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
            LeaveRequest.employee_id == str(employee.id),
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