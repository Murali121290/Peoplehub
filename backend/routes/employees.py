from flask import Blueprint, request, jsonify, Response
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

employees_bp = Blueprint("employees", __name__)


# ======================================
# HR CREATE EMPLOYEE
# ======================================

print("Creating employee...")

@employees_bp.route("/", methods=["POST"])
def create_employee():
    try:
        data = request.form

        print("========== CREATE EMPLOYEE ==========")
        print("FORM DATA:", request.form)
        print("FILES:", request.files)

        # -----------------------------
        # Profile Image
        # -----------------------------
        image = request.files.get("profile_image")

        image_data = None
        if image:
            image_data = image.read()

        # -----------------------------
        # USER ID
        # -----------------------------
        user_id = data.get("user_id")

        if user_id == "":
            user_id = None

        print("USER ID =", repr(user_id))
        print("TEAM ID =", repr(data.get("team_id")))
        print("DEPARTMENT =", data.get("department"))
        print("DESIGNATION =", data.get("designation"))
        print("ROLE =", data.get("role"))

        # -----------------------------
        # Joining Date
        # -----------------------------
        joining_date = None

        if data.get("joining_date"):
            joining_date = datetime.strptime(
                data["joining_date"],
                "%Y-%m-%d"
            ).date()

        # -----------------------------
        # Create Employee
        # -----------------------------
        employee = Employee(

            user_id=user_id,

            employee_id=data.get("employee_id"),

            first_name=data.get("first_name"),
            last_name=data.get("last_name"),

            email=data.get("email"),
            phone=data.get("phone"),

            department=data.get("department"),
            designation=data.get("designation"),
            role=data.get("role"),

            profile_image=image_data,

            reporting_manager=data.get(
                "reporting_manager"
            ),

            joining_date=joining_date,

            salary=float(
                data.get("salary", 0)
            ),

            pf_number=data.get(
                "pf_number"
            ),

            uan_number=data.get(
                "uan_number"
            ),

            esi_number=data.get(
                "esi_number"
            ),

            profile_completed=False,

            is_first_login=True,

            status="Active"
        )

        db.session.add(employee)
        db.session.commit()

        print("Employee saved successfully.")
        print("Database ID:", employee.id)

        return jsonify({
            "success": True,
            "message": "Employee Created Successfully",
            "employee_id": employee.employee_id,
            "id": employee.id
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

        result.append({

            "id": emp.id,
            "user_id": emp.user_id,
            "employee_id": emp.employee_id,

            "first_name": emp.first_name,
            "last_name": emp.last_name,

            "email": emp.email,

            "department": emp.department,
            "designation": emp.designation,

            "role": emp.role,

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

            "earned_leave":
                emp.earned_leave
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
"earned_leave": employee.earned_leave
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

        data = request.form

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

        db.session.commit()

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

        result.append({
            "team_id": team.id,
            "team_name": team.name,
            "member_count": len(employees),
            "total_salary": sum(
                float(emp.salary or 0)
                for emp in employees
            ),
            "employees": [
                {
                    "id": emp.id,
                    "name": f"{emp.first_name} {emp.last_name}",
                    "role": (
                        emp.user.role.name
                        if emp.user and emp.user.role
                        else ""
                    ),
                    "reporting_manager": emp.reporting_manager,
                    "salary": emp.salary
                }
                for emp in employees
            ]
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
                "status": employee.status
            })

    return jsonify(result)


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

            attendance = Attendance.query.filter_by(
                user_id=employee.user_id,
                attendance_date=yesterday
            ).first()

            if not attendance:
                continue

            if attendance.manager_status == "Approved":
                continue

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
                    attendance.status
                    if attendance
                    else "Absent",

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

                "earned_leave":
                    employee.earned_leave,

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