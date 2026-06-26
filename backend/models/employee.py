from models.database import db
from models.user import Role, Team

class Employee(db.Model):
    __tablename__ = "employees"

    id = db.Column(db.Integer, primary_key=True)

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id")
    )

    profile_image = db.Column(
        db.LargeBinary,
        nullable=True
    )

    employee_id = db.Column(db.String(50))

    first_name = db.Column(db.String(100))
    last_name = db.Column(db.String(100))

    email = db.Column(db.String(150))
    phone = db.Column(db.String(20))
    alternate_phone = db.Column(db.String(20))

    dob = db.Column(db.Date)
    gender = db.Column(db.String(20))
    marital_status = db.Column(db.String(30))
    blood_group = db.Column(db.String(10))

    address = db.Column(db.Text)
    city = db.Column(db.String(100))
    state = db.Column(db.String(100))
    country = db.Column(db.String(100))
    pincode = db.Column(db.String(20))

    department = db.Column(db.String(100))
    designation = db.Column(db.String(100))
    role = db.Column(db.String(100))

    joining_date = db.Column(db.Date)

    reporting_manager = db.Column(db.String(100))

    salary = db.Column(db.Float)

    # Leave Balance
    sick_leave = db.Column(db.Float, default=1.5)
    casual_leave = db.Column(db.Float, default=1.5)
    earned_leave = db.Column(db.Float, default=0)

    last_leave_reset_month = db.Column(
    db.String(10),
    nullable=True
    )

    last_leave_reset_year = db.Column(
    db.Integer,
    nullable=True
    )

    # Banking
    bank_name = db.Column(db.String(150))
    account_number = db.Column(db.String(50))
    ifsc_code = db.Column(db.String(20))

    # Identity
    pan_number = db.Column(db.String(20))
    aadhaar_number = db.Column(db.String(20))

    # Existing Education
    qualification = db.Column(db.String(200))
    college = db.Column(db.String(200))
    passing_year = db.Column(db.String(10))
    percentage = db.Column(db.String(20))

    # 10th Education
    tenth_school = db.Column(db.String(200))
    tenth_percentage = db.Column(db.String(20))

    # 12th Education
    twelfth_school = db.Column(db.String(200))
    twelfth_percentage = db.Column(db.String(20))

    # UG Education
    ug_degree = db.Column(db.String(200))
    ug_college = db.Column(db.String(200))
    ug_percentage = db.Column(db.String(20))

    # PG Education
    pg_degree = db.Column(db.String(200))
    pg_college = db.Column(db.String(200))
    pg_percentage = db.Column(db.String(20))

    # PF / ESI Details
    pf_number = db.Column(db.String(50))
    
    uan_number = db.Column(db.String(50))
    esi_number = db.Column(db.String(50))

    
    # Education Boards
    tenth_board = db.Column(db.String(50))
    twelfth_board = db.Column(db.String(50))
    
    # Universities
    ug_university = db.Column(db.String(200))
    pg_university = db.Column(db.String(200))
    # Experience
    total_experience = db.Column(db.String(50))
    previous_company = db.Column(db.String(200))

    current_ctc = db.Column(db.Float)
    expected_ctc = db.Column(db.Float)

    notice_period = db.Column(db.String(50))

    # Skills
    skills = db.Column(db.Text)

    # Work Details
    employee_type = db.Column(db.String(50))
    work_location = db.Column(db.String(100))
    shift_timing = db.Column(db.String(100))

    probation_end_date = db.Column(db.Date)

    # Documents
    resume_file = db.Column(db.LargeBinary)
    aadhaar_file = db.Column(db.LargeBinary)
    pan_file = db.Column(db.LargeBinary)
    degree_certificate = db.Column(db.LargeBinary)

    # Emergency Contact
    emergency_contact_name = db.Column(db.String(150))
    emergency_contact_number = db.Column(db.String(20))
    emergency_contact_relation = db.Column(db.String(50))

    # Employee Status
    status = db.Column(db.String(20))

    profile_completed = db.Column(
        db.Boolean,
        default=False
    )

    is_first_login = db.Column(
        db.Boolean,
        default=True
    )

    team_id = db.Column(
    db.Integer,
    db.ForeignKey("teams.id"),
    nullable=True
)
    team = db.relationship(
    "Team",
    backref="employees",
    lazy=True
)
    salary_paid = db.Column(
    db.Boolean,
    default=False
)
    salary_paid_date = db.Column(
    db.DateTime,
    nullable=True
)
    
    # Payroll Fields

branch_code = db.Column(
    db.String(50),
    nullable=True
)

earned_basic = db.Column(
    db.Float,
    nullable=True
)

earned_hra = db.Column(
    db.Float,
    nullable=True
)

earned_lta = db.Column(
    db.Float,
    nullable=True
)

earned_other_allowance = db.Column(
    db.Float,
    nullable=True
)

earned_actual_gross = db.Column(
    db.Float,
    nullable=True
)

attendance_bonus = db.Column(
    db.Float,
    nullable=True
)

odw = db.Column(
    db.Float,
    nullable=True
)

internet_charges = db.Column(
    db.Float,
    nullable=True
)

salary_advance = db.Column(
    db.Float,
    nullable=True
)

pf_wage = db.Column(
    db.Float,
    nullable=True
)

earned_pf_wage = db.Column(
    db.Float,
    nullable=True
)

pf_ded_employee = db.Column(
    db.Float,
    nullable=True
)

pf_ded_employer = db.Column(
    db.Float,
    nullable=True
)

vpf = db.Column(
    db.Float,
    nullable=True
)

pf_vpf_employee = db.Column(
    db.Float,
    nullable=True
)

esi_ded_employee = db.Column(
    db.Float,
    nullable=True
)

esi_ded_employer = db.Column(
    db.Float,
    nullable=True
)

tds = db.Column(
    db.Float,
    nullable=True
)

pt = db.Column(
    db.Float,
    nullable=True
)

lwf = db.Column(
    db.Float,
    nullable=True
)

other_deduction = db.Column(
    db.Float,
    nullable=True
)

total_deduction = db.Column(
    db.Float,
    nullable=True
)

eps_wage = db.Column(
    db.Float,
    nullable=True
)

pf_833 = db.Column(
    db.Float,
    nullable=True
)

pf_367 = db.Column(
    db.Float,
    nullable=True
)

esi_050 = db.Column(
    db.Float,
    nullable=True
)

esi_050_employer = db.Column(
    db.Float,
    nullable=True
)

edli_001 = db.Column(
    db.Float,
    nullable=True
)

bonus = db.Column(
    db.Float,
    nullable=True
)