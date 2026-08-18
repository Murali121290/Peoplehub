from models.database import db
from datetime import datetime
from sqlalchemy import UniqueConstraint

class PaymentDetails(db.Model):
    __tablename__ = "payment_details"

    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.String(50), nullable=False, index=True)
    
    payroll_period_start = db.Column(db.Date, nullable=False)
    payroll_period_end = db.Column(db.Date, nullable=False)
    payroll_month = db.Column(db.Integer, nullable=False)
    payroll_year = db.Column(db.Integer, nullable=False)
    
    no_of_days = db.Column(db.Integer, nullable=False)
    days_payable = db.Column(db.Integer, nullable=False)
    
    # Section 2: Salary Structure
    basic = db.Column(db.Float, nullable=False)
    hra = db.Column(db.Float, nullable=False)
    lta = db.Column(db.Float, nullable=False)
    other_allowance = db.Column(db.Float, nullable=False)
    gross_salary = db.Column(db.Float, nullable=False)
    
    # Section 3: Earned Salary
    earned_basic = db.Column(db.Float, nullable=False)
    earned_hra = db.Column(db.Float, nullable=False)
    earned_lta = db.Column(db.Float, nullable=False)
    earned_other_allowance = db.Column(db.Float, nullable=False)
    earned_actual_gross = db.Column(db.Float, nullable=False)
    attendance_bonus = db.Column(db.Float, default=0.0)
    odw = db.Column(db.Float, default=0.0)
    total = db.Column(db.Float, default=0.0)
    internet_charges = db.Column(db.Float, default=0.0)
    gross_earned_salary = db.Column(db.Float, nullable=False)
    
    # Section 4: Employee Deductions
    earned_pf_wages = db.Column(db.Float, nullable=False)
    pf_ded_employee = db.Column(db.Float, nullable=False)
    vpf = db.Column(db.Float, default=0.0)
    pf_vpf_ded_employee = db.Column(db.Float, nullable=False)
    esi_ded_employee = db.Column(db.Float, nullable=False)
    salary_advance = db.Column(db.Float, default=0.0)
    tds = db.Column(db.Float, default=0.0)
    lwf = db.Column(db.Float, default=0.0)
    pt = db.Column(db.Float, default=0.0)
    other_deduction = db.Column(db.Float, default=0.0)
    total_deduction = db.Column(db.Float, nullable=False)
    net_transfer = db.Column(db.Float, nullable=False)
    
    # Section 5: Employer Contributions
    pf_wage = db.Column(db.Float, nullable=False)
    pf = db.Column(db.Float, nullable=False)
    eps_wage = db.Column(db.Float, nullable=False)
    pf_8_33 = db.Column(db.Float, nullable=False)
    pf_3_67 = db.Column(db.Float, nullable=False)
    pf_0_50_pf_wage = db.Column(db.Float, nullable=False)
    pf_0_50_eps_wage = db.Column(db.Float, nullable=False)
    pf_0_01 = db.Column(db.Float, default=0.0)
    esi_ded_employer = db.Column(db.Float, nullable=False)
    
    # Section 6: CTC
    bonus = db.Column(db.Float, nullable=False)
    actual_monthly_ctc = db.Column(db.Float, nullable=False)
    earned_monthly_ctc = db.Column(db.Float, nullable=False)
    
    # Section 7: Bank Details
    account_number = db.Column(db.String(50), nullable=True)
    ifsc_code = db.Column(db.String(20), nullable=True)
    branch_code = db.Column(db.String(50), nullable=True)
    
    # Payment Status
    payment_status = db.Column(db.String(20), default="Pending", nullable=False)
    
    # Audit info
    created_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    updated_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Overrides structure for manual value tracking
    overrides = db.Column(db.JSON, default=dict)
    
    # Unique constraint
    __table_args__ = (
        UniqueConstraint('employee_id', 'payroll_period_start', 'payroll_period_end', name='uq_employee_payroll_period'),
    )

    employee = db.relationship("Employee", primaryjoin="foreign(PaymentDetails.employee_id) == remote(Employee.employee_id)", backref="payment_details_records", lazy=True)
    creator = db.relationship("User", backref="created_payrolls", lazy=True, foreign_keys=[created_by])
    updater = db.relationship("User", backref="updated_payrolls", lazy=True, foreign_keys=[updated_by])

    def to_dict(self):
        return {
            "id": self.id,
            "employee_id": self.employee_id,
            "payroll_period_start": self.payroll_period_start.isoformat() if self.payroll_period_start else None,
            "payroll_period_end": self.payroll_period_end.isoformat() if self.payroll_period_end else None,
            "payroll_month": self.payroll_month,
            "payroll_year": self.payroll_year,
            "no_of_days": self.no_of_days,
            "days_payable": self.days_payable,
            
            # Salary structure
            "basic": self.basic,
            "hra": self.hra,
            "lta": self.lta,
            "other_allowance": self.other_allowance,
            "gross_salary": self.gross_salary,
            
            # Earned salary
            "earned_basic": self.earned_basic,
            "earned_hra": self.earned_hra,
            "earned_lta": self.earned_lta,
            "earned_other_allowance": self.earned_other_allowance,
            "earned_actual_gross": self.earned_actual_gross,
            "attendance_bonus": self.attendance_bonus,
            "odw": self.odw,
            "total": self.total,
            "internet_charges": self.internet_charges,
            "gross_earned_salary": self.gross_earned_salary,
            
            # Deductions
            "earned_pf_wages": self.earned_pf_wages,
            "pf_ded_employee": self.pf_ded_employee,
            "vpf": self.vpf,
            "pf_vpf_ded_employee": self.pf_vpf_ded_employee,
            "esi_ded_employee": self.esi_ded_employee,
            "salary_advance": self.salary_advance,
            "tds": self.tds,
            "lwf": self.lwf,
            "pt": self.pt,
            "other_deduction": self.other_deduction,
            "total_deduction": self.total_deduction,
            "net_transfer": self.net_transfer,
            
            # Employer contributions
            "pf_wage": self.pf_wage,
            "pf": self.pf,
            "eps_wage": self.eps_wage,
            "pf_8_33": self.pf_8_33,
            "pf_3_67": self.pf_3_67,
            "pf_0_50_pf_wage": self.pf_0_50_pf_wage,
            "pf_0_50_eps_wage": self.pf_0_50_eps_wage,
            "pf_0_01": self.pf_0_01,
            "esi_ded_employer": self.esi_ded_employer,
            
            # CTC & Bonus
            "bonus": self.bonus,
            "actual_monthly_ctc": self.actual_monthly_ctc,
            "earned_monthly_ctc": self.earned_monthly_ctc,
            
            # Bank Details
            "account_number": self.account_number,
            "ifsc_code": self.ifsc_code,
            "branch_code": self.branch_code,
            
            # Payment Status
            "payment_status": self.payment_status,
            
            # Overrides
            "overrides": self.overrides,
            "created_by": self.created_by,
            "updated_by": self.updated_by,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }
