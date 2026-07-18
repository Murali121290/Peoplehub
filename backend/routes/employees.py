# pyrefly: ignore [missing-import]
from utils.compat import Blueprint, request, jsonify, Response
from models.database import db
from models.employee import Employee
from datetime import datetime
import traceback
import base64
from models.user import User
from middleware.auth import auth_required
from datetime import date, timedelta
from models.attendance import Attendance
from models.user import Role, Team
from services.leave_balance_service import update_leave_balance
from models.leave import LeaveRequest
from models.user import User, Role, Team

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
            designation=data.get("designation"),
            role=data.get("role"),

            profile_image=image_data,

            reporting_manager=data.get("reporting_manager"),

            joining_date=joining_date,
            shift_timing=data.get("shift_timing"),

            salary=float(data.get("salary", 0)),

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

    employees = Employee.query.all()

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

            "role": emp.role,
            "access_level": user.access_level if user else None,
            "role_id": role_id,
            "team_id": team_id,

            "reporting_manager":
                emp.reporting_manager,

            "shift_timing":
                emp.shift_timing,

            "status":
                attendance.status
                if attendance
                else "Absent",

            "salary":
                emp.salary,

            "sick_leave":
                emp.sick_leave,

            "casual_leave":
                emp.casual_leave,

            "privilege_leave":
                emp.privilege_leave
        })

    return jsonify(result)

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

    return jsonify({
    "id": employee.id,
    "employee_id": employee.employee_id,

    "first_name": employee.first_name,
    "last_name": employee.last_name,

    "email": employee.email,
    "phone": employee.phone,
    "alternate_phone": employee.alternate_phone,

    "department": employee.department,
    "designation": employee.designation,
    "role": employee.role,

    "profile_image": (
    True
    if employee.profile_image
    else False
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

# Experience
"previous_company": employee.previous_company,

"current_ctc": employee.current_ctc,
"expected_ctc": employee.expected_ctc,

"notice_period": employee.notice_period,

# Work Details
"employee_type": employee.employee_type,
"work_location": employee.work_location,
"shift_timing": employee.shift_timing,

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
    "privilege_leave": employee.privilege_leave
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
def update_employee_profile(employee_id):
    try:
        employee = Employee.query.get(employee_id)

        if not employee:
            return jsonify({
                "error": "Employee not found"
            }), 404

        user = User.query.get(employee.user_id)

        data = request.form

        # Basic Employee Information (from directory edit)
        if data.get("employee_id"):
            employee.employee_id = data.get("employee_id")

        if data.get("first_name"):
            employee.first_name = data.get("first_name")

        if data.get("last_name"):
            employee.last_name = data.get("last_name")

        if data.get("email"):
            employee.email = data.get("email")

        if data.get("phone"):
            employee.phone = data.get("phone")

        if data.get("joining_date"):
            employee.joining_date = datetime.strptime(
                data["joining_date"],
                "%Y-%m-%d"
            ).date()

        if data.get("salary"):
            employee.salary = float(data.get("salary"))

        if data.get("team_id"):
            employee.team_id = data.get("team_id")

        if data.get("department"):
            employee.department = data.get("department")

        if data.get("designation"):
            employee.designation = data.get("designation")

        if data.get("role"):
            employee.role = data.get("role")

        if data.get("reporting_manager"):
            employee.reporting_manager = data.get("reporting_manager")

        if data.get("status"):
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
        if user:
            first = data.get("first_name", employee.first_name)
            last = data.get("last_name", employee.last_name)

            user.full_name = f"{first} {last}".strip()

            if data.get("email"):
                user.email = data.get("email")
                user.company_email = data.get("email")


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
                "role": employee.role,
                "shift": employee.shift_timing or "General Shift",
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
    employees = Employee.query.all()

    return jsonify([
        {
            "id": emp.id,
            "employee_id": emp.employee_id,
            "name": f"{emp.first_name} {emp.last_name}",
            "department": emp.department,
            "designation": emp.designation,
            "role": emp.role
        }
        for emp in employees
    ])
    
@employees_bp.route('/test')
def test():
    return jsonify({"message":"working"})

print("Employees Blueprint Loaded")


@employees_bp.route("/birthdays/today", methods=["GET"])
def today_birthdays():

    today = date.today()

    employees = Employee.query.filter(
        db.extract("month", Employee.dob) == today.month,
        db.extract("day", Employee.dob) == today.day
    ).all()

    return jsonify([
        {
    "id": e.id,
    "first_name": e.first_name,
    "last_name": e.last_name,
    "user_id": e.user_id,
    "department": e.department,
    "designation": e.designation
}
        for e in employees
    ])

@employees_bp.route("/team-overview", methods=["GET"])
@auth_required
def get_team_overview():

    teams = Team.query.all()

    result = []

    for team in teams:

        employees = Employee.query.filter_by(
            team_id=team.id
        ).all()

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

            employee_list.append({
                "id": emp.id,
                "name": f"{emp.first_name} {emp.last_name or ''}".strip(),
                "role": role_name,
                "reporting_manager": emp.reporting_manager,
                "salary": float(emp.salary or 0),
                "department": emp.department,
                "team_id": emp.team_id,
                "employee_id": emp.employee_id,
                "profile_image": emp.profile_image is not None
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
                "role": employee.role,
                "department": employee.department,
                "designation": employee.designation,
                "salary": employee.salary,
                "reporting_manager": employee.reporting_manager,
                "status": employee.status,
                "sick_leave": employee.sick_leave,
                "casual_leave": employee.casual_leave,
                "privilege_leave": employee.privilege_leave
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

        all_employees = Employee.query.all()
        result = []

        for emp in all_employees:
            if not emp.reporting_manager:
                continue
            if emp.reporting_manager.strip().lower() != manager_name:
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
                LeaveRequest.from_date <= today,
                LeaveRequest.to_date >= today
            ).first()

            if attendance and attendance.check_in:
                if attendance.check_out:
                    att_status = "Checked Out"
                else:
                    att_status = "Present"
                check_in = attendance.check_in.strftime("%I:%M %p")
                check_out = attendance.check_out.strftime("%I:%M %p") if attendance.check_out else None
                working_hours = attendance.total_hours or 0
                if not attendance.check_out:
                    elapsed = (datetime.now() - attendance.check_in).total_seconds()
                    break_secs = (attendance.total_break_minutes or 0) * 60
                    working_hours = round(max(elapsed - break_secs, 0) / 3600, 2)
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
                "role": emp.role,
                "designation": emp.designation,
                "department": emp.department,
                "profile_image": base64.b64encode(emp.profile_image).decode("utf-8") if emp.profile_image else None,
                "attendance_status": att_status,
                "check_in": check_in,
                "check_out": check_out,
                "working_hours": working_hours,
                "lunch_minutes": attendance.lunch_minutes if attendance else 0,
                "tea_minutes": attendance.tea_minutes if attendance else 0,
                "shift": emp.shift_timing or "General Shift",
                "manager_status": attendance.manager_status if (attendance and attendance.manager_status) else "Pending",
            })

        return jsonify(result)

    except Exception as e:
        print("TEAM ATTENDANCE ERROR:", str(e))
        return jsonify({"error": str(e)}), 500


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

        yesterday = (
            date.today() - timedelta(days=1)
        )

        reporting_employees = Employee.query.all()

        result = []

        for employee in reporting_employees:

            if not employee.reporting_manager:
                continue

            employee_manager = (
                employee.reporting_manager
                .strip()
                .lower()
            )

            if employee_manager != manager_name:
                continue

            if employee.user_id == user_id:
                continue

            attendance = Attendance.query.filter_by(
                user_id=employee.user_id,
                attendance_date=yesterday
            ).first()

            if attendance and attendance.manager_status in ["Approved", "Rejected"]:
                continue

            from models.leave import LeaveRequest
            leave = LeaveRequest.query.filter(
                LeaveRequest.employee_id == str(employee.id),
                LeaveRequest.status == "Approved",
                LeaveRequest.from_date <= yesterday,
                LeaveRequest.to_date >= yesterday
            ).first()

            status = "Absent"
            if attendance:
                status = attendance.status
            elif leave:
                status = "Leave"

            result.append({

                "employee_id":
                    employee.id,

                "employee_name":
                    f"{employee.first_name} {employee.last_name}",

                "designation":
                    employee.designation,

                "profile_image":
                    base64.b64encode(
                        employee.profile_image
                    ).decode("utf-8")
                    if employee.profile_image
                    else None,

                "status":
                    status,

                "check_in":
                    attendance.check_in.strftime("%I:%M %p")
                    if attendance and attendance.check_in
                    else "-",

                "check_out":
                    attendance.check_out.strftime("%I:%M %p")
                    if attendance and attendance.check_out
                    else "-",

                "working_hours":
                    attendance.total_hours
                    if attendance and attendance.total_hours
                    else 0,

                "lunch_minutes":
                    attendance.lunch_minutes
                    if attendance and attendance.lunch_minutes
                    else 0,

                "tea_minutes":
                    attendance.tea_minutes
                    if attendance and attendance.tea_minutes
                    else 0,

                "total_break_minutes":
                    attendance.total_break_minutes
                    if attendance and attendance.total_break_minutes
                    else 0

            })

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
                # Based on the user's logic, "Checked In" / "Checked Out" is preferred for peers if present
                if attendance.check_out:
                    status = "Checked Out"
                else:
                    status = "Checked In"
            elif leave:
                status = "Leave"

            result.append({
                "employee_id": peer.id,
                "user_id": peer.user_id,
                "first_name": peer.first_name,
                "last_name": peer.last_name,
                "role": peer.role,
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

        result = []
        for emp in team_employees:
            attendance = Attendance.query.filter_by(
                user_id=emp.user_id,
                attendance_date=today
            ).first()

            from models.leave import LeaveRequest
            leave = LeaveRequest.query.filter(
                LeaveRequest.employee_id == str(emp.id),
                LeaveRequest.status == "Approved",
                LeaveRequest.from_date <= today,
                LeaveRequest.to_date >= today
            ).first()

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
                "role": emp.role,
                "profile_image": base64.b64encode(emp.profile_image).decode("utf-8") if emp.profile_image else None,
                "status": status,
                "check_in": attendance.check_in.strftime("%I:%M %p") if attendance and attendance.check_in else "-",
                "check_out": attendance.check_out.strftime("%I:%M %p") if attendance and attendance.check_out else "-"
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
            "joining_date": str(employee.joining_date),
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