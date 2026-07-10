from flask import Blueprint, jsonify, send_file
from datetime import date, datetime
from io import BytesIO

from models.database import db
from models.employee import Employee
from models.attendance import Attendance
from models.leave import LeaveRequest

payroll_bp = Blueprint(
    "payroll",
    __name__
)


@payroll_bp.route(
    "/summary",
    methods=["GET"]
)
def payroll_summary():

    try:

        employees = Employee.query.all()

        payroll_data = []

        today = date.today()

        total_days = 31

        for employee in employees:

            attendance_count = Attendance.query.filter(
                Attendance.user_id == employee.user_id
            ).count()

            approved_leaves = LeaveRequest.query.filter(
                LeaveRequest.employee_id == str(employee.id),
                LeaveRequest.status == "Approved"
            ).all()

            leave_data = []

            for leave in approved_leaves:
                leave_data.append([
                leave.leave_type,
                str(leave.from_date),
                str(leave.to_date),
                leave.total_days
            ])

            leave_days = sum(
                leave.total_days or 0
                for leave in approved_leaves
            )

            current_month = date.today().month
            current_year = date.today().year

            attendance_days = Attendance.query.filter(
                Attendance.user_id == employee.user_id,
                Attendance.status == "Present",
                db.extract("month", Attendance.attendance_date) == current_month,
                db.extract("year", Attendance.attendance_date) == current_year
            ).count()

            days_payable = max(
                total_days - leave_days,
                0
            )

            salary = employee.salary or 0

            monthly_salary = round(
                (salary / total_days) * days_payable,
                2
            )

            payroll_data.append({

                "id": employee.id,


                "employee_id":
                    employee.employee_id,

                "employee_name":
                    f"{employee.first_name} {employee.last_name}",

                "department":
                    employee.department,

                "designation":
                    employee.designation,
                
                "account_number":
                    employee.account_number,

                "salary":
                    salary,

                "working_days":
                    attendance_count,

                "leave_days":
                    leave_days,

                "days_payable":
                    days_payable,

                "monthly_salary":
                    monthly_salary,

                "payment_status":
                    "Paid"
                    if employee.salary_paid
                    else "Pending",

                "paid_date":
                    employee.salary_paid_date.strftime(
                        "%d-%m-%Y %I:%M %p"
                    )
                    if employee.salary_paid_date
                    else None
})

        return jsonify({
            "success": True,
            "data": payroll_data
        })

    except Exception as e:

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500
    
@payroll_bp.route(
    "/mark-paid/<int:employee_id>",
    methods=["PUT"]
)
def mark_salary_paid(employee_id):

    try:

        employee = Employee.query.get(employee_id)

        if not employee:

            return jsonify({
                "success": False,
                "error": "Employee not found"
            }), 404

        employee.salary_paid = True

        employee.salary_paid_date = datetime.now()

        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Salary marked as paid"
        })

    except Exception as e:

        db.session.rollback()

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500
    
@payroll_bp.route(
    "/payslip/<int:employee_id>",
    methods=["GET"]
)
def download_payslip(employee_id):

    try:

        from reportlab.platypus import (
            SimpleDocTemplate,
            Table,
            TableStyle,
            Spacer,
            Paragraph,
            Image
        )

        from reportlab.lib import colors
        from reportlab.lib.styles import getSampleStyleSheet

        employee = Employee.query.get(employee_id)

        if not employee:

            return jsonify({
                "success": False,
                "error": "Employee not found"
            }), 404

        import calendar

        today = date.today()

        total_days = calendar.monthrange(
            today.year,
            today.month
        )[1]

        approved_leaves = LeaveRequest.query.filter(
            LeaveRequest.employee_id == str(employee.id),
            LeaveRequest.status == "Approved"
        ).all()

        attendance_days = Attendance.query.filter(
            Attendance.user_id == employee.user_id,
            Attendance.status == "Present"
        ).count()

        leave_days = sum(
            leave.total_days or 0
            for leave in approved_leaves
        )

        days_payable = max(
            total_days - leave_days,
            0
        )

        salary = employee.salary or 0

        basic = round(
            salary * 0.50,
            2
        )

        hra = round(
            salary * 0.25,
            2
        )

        lta = round(
            salary * 0.05,
            2
        )

        other_allowance = round(
            salary * 0.20,
            2
        )

        earned_basic = round(
            (basic / total_days) *
            days_payable,
            2
        )

        earned_hra = round(
            (hra / total_days) *
            days_payable,
            2
        )

        earned_lta = round(
            (lta / total_days) *
            days_payable,
            2
        )

        earned_other = round(
            (other_allowance / total_days) *
            days_payable,
            2
        )

        earned_salary = round(
            earned_basic +
            earned_hra +
            earned_lta +
            earned_other,
            2
        )

        pf = round(
            earned_basic * 0.12,
            2
        )

        esi = round(
            earned_salary * 0.0075,
            2
        )

        total_deduction = pf + esi

        net_salary = round(
            earned_salary -
            total_deduction,
            2
        )

        leave_data = [
            [
                leave.leave_type,
                str(leave.from_date),
                str(leave.to_date),
                str(leave.total_days or 0)
            ]
            for leave in approved_leaves
        ]

        buffer = BytesIO()

        doc = SimpleDocTemplate(
            buffer,
            rightMargin=20,
            leftMargin=20,
            topMargin=20,
            bottomMargin=20
        )

        styles = getSampleStyleSheet()
        styles["Title"].alignment = 1
        styles["Heading2"].alignment = 1
        styles["Normal"].alignment = 1

        elements = []

        logo = Image(
            "uploads/s.png",
            width=180,
            height=180
        )

        logo.hAlign = "CENTER"

        elements.append(logo)

        elements.append(
            Spacer(1, 10)
        )

        elements.append(
            Paragraph(
                "<b>S4 CARLISLE PUBLISHING SERVICES</b>",
                styles["Title"]
            )
        )

        elements.append(
            Paragraph(
                "60, Industrial Estate, Perungudi, Chennai - 600096",
                styles["Normal"]
            )
        )

        elements.append(
            Spacer(1, 10)
        )

        elements.append(
            Paragraph(
                f"<b>PAYSLIP FOR MONTH OF {date.today().strftime('%B %Y').upper()}</b>",
                styles["Heading2"]
            )
        )

        elements.append(
            Spacer(1, 15)
        )

        employee_table = Table(
            [
                [
                    f"EMP NO: {employee.employee_id}",
                    f"NAME: {employee.first_name} {employee.last_name}"
                ],
                [
                    f"PF NO: {employee.pf_number or 'NA'}",
                    f"ESI NO: {employee.esi_number or 'NA'}"
                ],
                [
                    f"DESIGNATION: {employee.designation}",
                    f"PAYABLE DAYS: {days_payable}"
                ],
                [
                    f"TOTAL DAYS: {total_days}",
                    f"PRESENT DAYS: {attendance_days}"
                ],
                [
    f"LEAVE DAYS: {leave_days}",
    f"PHONE: {employee.phone or 'NA'}"
],
                [
                    f"DOJ: {employee.joining_date}",
                    f"BANK A/C: {employee.account_number or 'NA'}"
                ],
                [
                    f"UAN NO: {employee.uan_number or 'NA'}",
                    f"PAYABLE DAYS: {days_payable}"
                ],
                [
                    f"TOTAL DAYS: {total_days}",
                    f"PRESENT DAYS: {attendance_days}"
                ],
            ],
            colWidths=[260, 260]
        )

        employee_table.setStyle(
            TableStyle([
                ("GRID", (0, 0), (-1, -1), 1, colors.black),
                ("FONTNAME", (0, 0), (-1, -1), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 9)
            ])
        )

        elements.append(employee_table)

        elements.append(
            Spacer(1, 10)
        )

        actual_salary = Table([
            ["ACTUAL SALARY", ""],
            ["Basic", basic],
            ["HRA", hra],
            ["LTA", lta],
            ["Other Allow.", other_allowance],
            ["GROSS", salary]
        ])

        earned_salary_table = Table([
            ["EARNED SALARY", ""],
            ["Basic", earned_basic],
            ["HRA", earned_hra],
            ["LTA", earned_lta],
            ["Other Allow.", earned_other],
            ["TOTAL", earned_salary]
        ])

        other_payment = Table([
            ["OTHER PAYMENTS", ""],
            ["Arrears", "0.00"],
            ["Bonus", "0.00"],
            ["Att Bonus", "0.00"],
            ["Overtime", "0.00"],
            ["TOTAL", "0.00"]
        ])

        deductions = Table([
            ["DEDUCTIONS", ""],
            ["P.F", pf],
            ["E.S.I", esi],
            ["Prof Tax", "0.00"],
            ["Other Ded", "0.00"],
            ["TOTAL", total_deduction]
        ])

        for tbl in [
            actual_salary,
            earned_salary_table,
            other_payment,
            deductions
        ]:

            tbl.setStyle(
                TableStyle([
                    ("GRID", (0, 0), (-1, -1), 1, colors.black),
                    ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, -1), 8)
                ])
            )

        salary_layout = Table(
            [
                [
                    actual_salary,
                    "",
                    earned_salary_table,
                    "",
                    other_payment,
                    "",
                    deductions
                ]
            ],
            colWidths=[
                115,
                15,
                115,
                15,
                115,
                15,
                115
            ]
        )

        salary_layout.setStyle(
            TableStyle([
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10)
            ])
        )

        elements.append(
            salary_layout
        )

        elements.append(
            Spacer(1, 15)
        )

        net_table = Table(
            [
                [
                    f"NET AMOUNT : ₹ {net_salary:.2f}"
                ]
            ],
            colWidths=[520]
        )

        net_table.setStyle(
            TableStyle([
                ("GRID", (0, 0), (-1, -1), 1, colors.black),
                ("FONTNAME", (0, 0), (-1, -1), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 12)
            ])
        )

        elements.append(net_table)

        elements.append(
            Spacer(1, 20)
        )

        elements.append(
            Paragraph(
                "<b>LEAVE DETAILS</b>",
                styles["Heading3"]
            )
        )

        if leave_data:

            leave_table = Table(
                [
                    [
                        "Leave Type",
                        "From Date",
                        "To Date",
                        "Days"
                    ]
                ] + leave_data,
                colWidths=[120, 120, 120, 80]
            )

            leave_table.setStyle(
                TableStyle([
                    ("GRID", (0, 0), (-1, -1), 1, colors.black),
                    ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, -1), 8)
                ])
            )

            elements.append(leave_table)

        else:

            elements.append(
                Paragraph(
                    "No Leave Records",
                    styles["Normal"]
                )
            )

        elements.append(
            Spacer(1, 50)
        )

        sign_table = Table(
            [
                [
                    "SIGN OF EMPLOYEE",
                    "SIGN OF EMPLOYER"
                ]
            ],
            colWidths=[260, 260]
        )

        elements.append(sign_table)

        doc.build(elements)

        buffer.seek(0)

        return send_file(
            buffer,
            as_attachment=True,
            download_name=f"{employee.first_name}_{employee.last_name}_Payslip.pdf",
            mimetype="application/pdf"
        )

    except Exception as e:

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500