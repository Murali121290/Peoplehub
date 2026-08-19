from decimal import Decimal, ROUND_HALF_UP, ROUND_UP, ROUND_DOWN

def excel_round(val, decimals=0):
    if val is None:
        return 0.0
    try:
        d = Decimal(str(val))
        q = Decimal('10') ** -decimals if decimals > 0 else Decimal('1')
        return float(d.quantize(q, rounding=ROUND_HALF_UP))
    except Exception:
        return 0.0

def excel_roundup(val, decimals=0):
    if val is None:
        return 0.0
    try:
        d = Decimal(str(val))
        q = Decimal('10') ** -decimals if decimals > 0 else Decimal('1')
        return float(d.quantize(q, rounding=ROUND_UP))
    except Exception:
        return 0.0

def excel_rounddown(val, decimals=0):
    if val is None:
        return 0.0
    try:
        d = Decimal(str(val))
        q = Decimal('10') ** -decimals if decimals > 0 else Decimal('1')
        return float(d.quantize(q, rounding=ROUND_DOWN))
    except Exception:
        return 0.0

def calculate_payroll(inputs, overrides=None):
    """
    Accepts dictionary of inputs and overrides, evaluates the payroll formula dependency graph.
    Returns a dictionary of:
    {
       field_name: {
          "calculated_value": X,
          "manual_value": Y,
          "is_overridden": bool,
          "final_value": Z
       }
    }
    """
    res = {}
    
    def resolve_field(name, calculated_val):
        manual_val = 0.0
        is_overridden = False
        if overrides and name in overrides:
            o = overrides[name]
            is_overridden = o.get("is_overridden", False)
            manual_val = float(o.get("manual_value", 0.0))
            
        final_val = manual_val if is_overridden else calculated_val
        res[name] = {
            "calculated_value": calculated_val,
            "manual_value": manual_val,
            "is_overridden": is_overridden,
            "final_value": final_val
        }
        return final_val

    # 1. Base inputs
    basic_val = resolve_field("basic", float(inputs.get("basic", 0.0)))
    hra_val = resolve_field("hra", float(inputs.get("hra", 0.0)))
    lta_val = resolve_field("lta", float(inputs.get("lta", 0.0)))
    other_allowance_val = resolve_field("other_allowance", float(inputs.get("other_allowance", 0.0)))
    
    no_of_days_val = resolve_field("no_of_days", int(inputs.get("no_of_days", 31)))
    days_payable_val = resolve_field("days_payable", int(inputs.get("days_payable", no_of_days_val)))
    
    # 2. Gross Salary
    calc_gross = basic_val + hra_val + lta_val + other_allowance_val
    gross_salary_val = resolve_field("gross_salary", calc_gross)
    
    # 3. Earned Salary components
    if no_of_days_val > 0:
        calc_earned_basic = excel_round((basic_val / no_of_days_val) * days_payable_val)
        calc_earned_hra = excel_round((hra_val / no_of_days_val) * days_payable_val)
        calc_earned_lta = excel_round((lta_val / no_of_days_val) * days_payable_val)
        calc_earned_other_allowance = excel_round((other_allowance_val / no_of_days_val) * days_payable_val)
    else:
        calc_earned_basic = 0.0
        calc_earned_hra = 0.0
        calc_earned_lta = 0.0
        calc_earned_other_allowance = 0.0
        
    earned_basic_val = resolve_field("earned_basic", calc_earned_basic)
    earned_hra_val = resolve_field("earned_hra", calc_earned_hra)
    earned_lta_val = resolve_field("earned_lta", calc_earned_lta)
    earned_other_allowance_val = resolve_field("earned_other_allowance", calc_earned_other_allowance)
    
    calc_earned_actual_gross = earned_basic_val + earned_hra_val + earned_lta_val + earned_other_allowance_val
    earned_actual_gross_val = resolve_field("earned_actual_gross", calc_earned_actual_gross)
    
    # Attendance bonus, ODW, total
    attendance_bonus_val = resolve_field("attendance_bonus", float(inputs.get("attendance_bonus", 0.0)))
    odw_val = resolve_field("odw", float(inputs.get("odw", 0.0)))
    
    calc_total = attendance_bonus_val + odw_val
    total_val = resolve_field("total", calc_total)
    
    # Internet Charges
    internet_charges_val = resolve_field("internet_charges", float(inputs.get("internet_charges", 0.0)))
    
    # Gross Earned Salary
    calc_gross_earned = earned_actual_gross_val + total_val
    gross_earned_salary_val = resolve_field("gross_earned_salary", calc_gross_earned)
    
    # Earned PF Wages
    calc_earned_pf_wages = gross_earned_salary_val - earned_hra_val
    earned_pf_wages_val = resolve_field("earned_pf_wages", calc_earned_pf_wages)
    
    # PF Calculation Wage
    calc_pf_calc_wage = earned_basic_val + earned_lta_val + earned_other_allowance_val
    pf_calculation_wage_val = resolve_field("pf_calculation_wage", calc_pf_calc_wage)
    
    # Employee PF Deduction
    if pf_calculation_wage_val > 15000.0:
        calc_pf_ded_employee = 1800.0
    else:
        calc_pf_ded_employee = excel_round(pf_calculation_wage_val * 0.12)
    pf_ded_employee_val = resolve_field("pf_ded_employee", calc_pf_ded_employee)
    
    # VPF
    vpf_val = resolve_field("vpf", float(inputs.get("vpf", 0.0)))
    
    # PF & VPF DED Employee
    calc_pf_vpf_ded = pf_ded_employee_val + vpf_val
    pf_vpf_ded_employee_val = resolve_field("pf_vpf_ded_employee", calc_pf_vpf_ded)
    
    # ESI DED Employee
    if gross_salary_val <= 21000.0:
        calc_esi_ded_employee = excel_roundup(gross_earned_salary_val * 0.0075)
    else:
        calc_esi_ded_employee = 0.0
    esi_ded_employee_val = resolve_field("esi_ded_employee", calc_esi_ded_employee)
    
    # Other Employee Deductions
    salary_advance_val = resolve_field("salary_advance", float(inputs.get("salary_advance", 0.0)))
    tds_val = resolve_field("tds", float(inputs.get("tds", 0.0)))
    lwf_val = resolve_field("lwf", float(inputs.get("lwf", 0.0)))
    pt_val = resolve_field("pt", float(inputs.get("pt", 0.0)))
    other_deduction_val = resolve_field("other_deduction", float(inputs.get("other_deduction", 0.0)))
    
    # Total Deduction
    calc_total_deduction = (
        pf_vpf_ded_employee_val
        + esi_ded_employee_val
        + salary_advance_val
        + tds_val
        + lwf_val
        + pt_val
        + other_deduction_val
    )
    total_deduction_val = resolve_field("total_deduction", calc_total_deduction)
    
    # Net Transfer
    calc_net_transfer = gross_earned_salary_val - total_deduction_val + internet_charges_val
    net_transfer_val = resolve_field("net_transfer", calc_net_transfer)
    
    # Employer PF calculations
    calc_pf_wage = gross_earned_salary_val - earned_hra_val
    pf_wage_val = resolve_field("pf_wage", calc_pf_wage)
    
    # pf = pf_ded_employee (per rule 1: pf = pf_ded_employee)
    calc_pf = pf_ded_employee_val
    pf_val = resolve_field("pf", calc_pf)
    
    calc_eps_wage = min(pf_calculation_wage_val, 15000.0)
    eps_wage_val = resolve_field("eps_wage", calc_eps_wage)
    
    calc_pf_8_33 = min(excel_roundup(eps_wage_val * 0.0833), 1250.0)
    pf_8_33_val = resolve_field("pf_8_33", calc_pf_8_33)
    
    calc_pf_3_67 = min(excel_rounddown(eps_wage_val * 0.0367), 550.0)
    pf_3_67_val = resolve_field("pf_3_67", calc_pf_3_67)
    
    calc_pf_0_50_pf_wage = excel_roundup(pf_wage_val * 0.005)
    pf_0_50_pf_wage_val = resolve_field("pf_0_50_pf_wage", calc_pf_0_50_pf_wage)
    
    calc_pf_0_50_eps_wage = excel_roundup(eps_wage_val * 0.005)
    pf_0_50_eps_wage_val = resolve_field("pf_0_50_eps_wage", calc_pf_0_50_eps_wage)
    
    pf_0_01_val = resolve_field("pf_0_01", float(inputs.get("pf_0_01", 0.0)))
    
    # Employer ESI
    if gross_salary_val <= 21000.0:
        calc_esi_ded_employer = excel_roundup(gross_earned_salary_val * 0.0325)
    else:
        calc_esi_ded_employer = 0.0
    esi_ded_employer_val = resolve_field("esi_ded_employer", calc_esi_ded_employer)
    
    # Bonus
    calc_bonus = excel_round(basic_val * 0.0833)
    bonus_val = resolve_field("bonus", calc_bonus)
    
    # CTC
    calc_actual_ctc = gross_salary_val + pf_val + esi_ded_employer_val + bonus_val
    actual_monthly_ctc_val = resolve_field("actual_monthly_ctc", calc_actual_ctc)
    
    calc_earned_ctc = gross_earned_salary_val + pf_8_33_val + pf_3_67_val + esi_ded_employer_val + bonus_val
    earned_monthly_ctc_val = resolve_field("earned_monthly_ctc", calc_earned_ctc)
    
    return res
