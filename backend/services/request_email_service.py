import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
# pyrefly: ignore [missing-import]
from itsdangerous import URLSafeTimedSerializer
from pathlib import Path
# pyrefly: ignore [missing-import]
from flask import current_app

def get_serializer():
    return URLSafeTimedSerializer(current_app.config.get("SECRET_KEY", "wms-enterprise-secret-key-2024"))

def generate_request_token(req_id, req_type, action):
    serializer = get_serializer()
    # Token contains request ID, request type, and the action to perform
    return serializer.dumps({
        "req_id": req_id,
        "req_type": req_type,
        "action": action,
        "created_at": datetime.utcnow().isoformat()
    })

def verify_request_token(token, max_age=86400):  # time-limited: 24 hours (86400 seconds)
    serializer = get_serializer()
    try:
        data = serializer.loads(token, max_age=max_age)
        return data
    except Exception as e:
        print(f"Token verification failed or expired: {str(e)}")
        return None

def send_email_via_smtp(to_email, subject, html_content):
    # Get config values
    mail_server = current_app.config.get("MAIL_SERVER", "smtp.gmail.com")
    mail_port = current_app.config.get("MAIL_PORT", 587)
    mail_use_tls = current_app.config.get("MAIL_USE_TLS", True)
    mail_username = current_app.config.get("MAIL_USERNAME")
    mail_password = current_app.config.get("MAIL_PASSWORD")
    mail_sender = current_app.config.get("MAIL_DEFAULT_SENDER", "wms@publishing.com")

    print("========== SMTP DEBUGGING ==========")
    print(f"SMTP Configured values:")
    print(f"  - MAIL_SERVER: {mail_server}")
    print(f"  - MAIL_PORT: {mail_port}")
    print(f"  - MAIL_USE_TLS: {mail_use_tls}")
    print(f"  - MAIL_USERNAME: {mail_username}")
    print(f"  - MAIL_DEFAULT_SENDER: {mail_sender}")
    print(f"  - Recipient (to_email): {to_email}")
    print(f"  - Password present: {bool(mail_password)}")

    # Always log and save to a debug file for easy local validation
    try:
        debug_dir = os.path.join(current_app.root_path, "debug_emails")
        os.makedirs(debug_dir, exist_ok=True)
        safe_subject = "".join(x for x in subject if x.isalnum() or x in " -_").strip()
        filename = f"email_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{safe_subject}.html"
        filepath = os.path.join(debug_dir, filename)
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(html_content)
        print(f"[DEBUG EMAIL] Saved email template to local file: {filepath}")
    except Exception as debug_err:
        print(f"Failed to write debug email file: {str(debug_err)}")

    if not mail_username or not mail_password:
        print("[SMTP] Mail username or password is not configured in the environment. Skipping actual SMTP mail dispatch.")
        print("====================================")
        return True

    try:
        from email.mime.image import MIMEImage

        msg = MIMEMultipart("related")
        msg["From"] = mail_sender
        msg["To"] = to_email
        msg["Subject"] = subject

        alternative = MIMEMultipart("alternative")
        alternative.attach(MIMEText(html_content, "html"))
        msg.attach(alternative)

        logo_path = Path(current_app.root_path) / "uploads" / "s.png"

        if logo_path.exists():
            with open(logo_path, "rb") as f:
                logo = MIMEImage(f.read())
                logo.add_header("Content-ID", "<company_logo>")
                logo.add_header("Content-Disposition", "inline", filename="s.png")
                msg.attach(logo)
        else:
            print(f"Logo not found: {logo_path}")

        # Connect
        print(f"[SMTP] Step 1: Connecting to {mail_server}:{mail_port}...")
        server = smtplib.SMTP(mail_server, int(mail_port), timeout=15)
        print(f"[SMTP] Connected successfully to {mail_server}")

        # Ehlo check
        print(f"[SMTP] Sending EHLO/HELO...")
        server.ehlo()

        # TLS
        if mail_use_tls:
            print("[SMTP] Step 2: Starting TLS (starttls)...")
            server.starttls()
            print("[SMTP] TLS started successfully. Sending EHLO again...")
            server.ehlo()

        # Login
        print(f"[SMTP] Step 3: Logging in with username {mail_username}...")
        server.login(mail_username, mail_password)
        print("[SMTP] Logged in successfully!")

        # Sendmail
        print(f"[SMTP] Step 4: Sending email to {to_email}...")
        server.sendmail(mail_sender, to_email, msg.as_string())
        print(f"[SMTP] Email successfully sent to {to_email}")

        # Quit
        server.quit()
        print("====================================")
        return True
    except smtplib.SMTPAuthenticationError as auth_err:
        print(f"[SMTP AUTH ERROR] Authentication failed for user '{mail_username}'. Code: {auth_err.smtp_code}, Message: {auth_err.smtp_error.decode('utf-8', errors='ignore') if isinstance(auth_err.smtp_error, bytes) else auth_err.smtp_error}")
        print("====================================")
        return False
    except smtplib.SMTPConnectError as conn_err:
        print(f"[SMTP CONNECT ERROR] Connection failed to {mail_server}:{mail_port}. Code: {conn_err.smtp_code}, Message: {conn_err.smtp_error}")
        print("====================================")
        return False
    except Exception as smtp_err:
        import traceback
        print(f"[SMTP EXCEPTION] Failed to send email to {to_email}.")
        print(f"Exception Type: {type(smtp_err)}")
        print(f"Exception Message: {str(smtp_err)}")
        traceback.print_exc()
        print("====================================")
        return False

def send_manager_request_email(request_obj, request_type):
    from models.employee import Employee

    # Get employee details
    emp_id = request_obj.employee_id
    employee = Employee.query.filter(
        (Employee.id == int(emp_id)) | (Employee.employee_id == str(emp_id))
    ).first()

    if not employee:
        print(f"Employee details not found for ID/Code: {emp_id}")
        return

    emp_name = f"{employee.first_name} {employee.last_name}"
    emp_code = employee.employee_id
    reason = request_obj.reason

    # Determine request-specific details
    if request_type == "Leave":
        req_label = "Leave Request"
        details_html = f"""
        <tr>
            <td style="padding:10px; border:1px solid #ddd; background-color: #f8fafc; font-weight: bold; width: 35%;">Leave Type</td>
            <td style="padding:10px; border:1px solid #ddd;">{request_obj.leave_type}</td>
        </tr>
        <tr>
            <td style="padding:10px; border:1px solid #ddd; background-color: #f8fafc; font-weight: bold;">Date Range</td>
            <td style="padding:10px; border:1px solid #ddd;">{request_obj.from_date} to {request_obj.to_date}</td>
        </tr>
        <tr>
            <td style="padding:10px; border:1px solid #ddd; background-color: #f8fafc; font-weight: bold;">Total Days</td>
            <td style="padding:10px; border:1px solid #ddd;">{request_obj.total_days}</td>
        </tr>
        """
    elif request_type == "Permission":
        req_label = "Permission Request"
        from_time_str = request_obj.from_time.strftime("%I:%M %p") if request_obj.from_time else ""
        to_time_str = request_obj.to_time.strftime("%I:%M %p") if request_obj.to_time else ""
        details_html = f"""
        <tr>
            <td style="padding:10px; border:1px solid #ddd; background-color: #f8fafc; font-weight: bold; width: 35%;">Date</td>
            <td style="padding:10px; border:1px solid #ddd;">{request_obj.permission_date}</td>
        </tr>
        <tr>
            <td style="padding:10px; border:1px solid #ddd; background-color: #f8fafc; font-weight: bold;">Time Slot</td>
            <td style="padding:10px; border:1px solid #ddd;">{from_time_str} to {to_time_str}</td>
        </tr>
        """
    elif request_type == "Shift":
        req_label = "Shift Change Request"
        details_html = f"""
        <tr>
            <td style="padding:10px; border:1px solid #ddd; background-color: #f8fafc; font-weight: bold; width: 35%;">Current Shift</td>
            <td style="padding:10px; border:1px solid #ddd;">{request_obj.current_shift}</td>
        </tr>
        <tr>
            <td style="padding:10px; border:1px solid #ddd; background-color: #f8fafc; font-weight: bold;">Requested Shift</td>
            <td style="padding:10px; border:1px solid #ddd;">{request_obj.requested_shift}</td>
        </tr>
        <tr>
            <td style="padding:10px; border:1px solid #ddd; background-color: #f8fafc; font-weight: bold;">Date Range</td>
            <td style="padding:10px; border:1px solid #ddd;">{request_obj.from_date} to {request_obj.to_date}</td>
        </tr>
        """
    elif request_type == "WFH":
        req_label = "Work From Home (WFH) Request"
        details_html = f"""
        <tr>
            <td style="padding:10px; border:1px solid #ddd; background-color: #f8fafc; font-weight: bold; width: 35%;">Date Range</td>
            <td style="padding:10px; border:1px solid #ddd;">{request_obj.from_date} to {request_obj.to_date}</td>
        </tr>
        """
    else:
        req_label = f"{request_type} Request"
        details_html = ""

    # Generate unique, time-limited secure tokens
    approve_token = generate_request_token(request_obj.id, request_type, "approve")
    reject_token = generate_request_token(request_obj.id, request_type, "reject")

    # Base URL of the backend server
    api_base = os.environ.get("BACKEND_URL", "http://localhost:5001")
    approve_url = f"{api_base}/api/requests/email-action?token={approve_token}"
    reject_url = f"{api_base}/api/requests/email-action?token={reject_token}"

    subject = f"[PENDING] New {req_label} from {emp_name}"

    # Manager's email (currently hardcoded as requested)
    manager_email = "selvabharath@s4carlisle.com"

    html_content = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f9f9f9; padding: 20px;">
      
            <div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
              <div style="text-align:center;margin-bottom:25px;">
    <img
        src="cid:company_logo"
        alt="S4Carlisle"
        width="220"
        style="display:block;margin:auto;"
    >
</div>
                <div style="border-bottom: 3px solid #4F46E5; padding-bottom: 15px; margin-bottom: 20px;">
                    <h2 style="color: #1E3A8A; margin: 0; font-size: 20px;">PeopleHub Request Notification</h2>
                    <span style="font-size: 11px; color: #64748B; text-transform: uppercase; font-weight: bold; letter-spacing: 1px;">{req_label}</span>
                </div>

                <p>Hello,</p>
                <p>A new <strong>{req_label}</strong> has been submitted and is awaiting your decision.</p>

                <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
                    <tr>
                        <td style="padding:10px; border:1px solid #ddd; background-color: #f8fafc; font-weight: bold; width: 35%;">Employee Name</td>
                        <td style="padding:10px; border:1px solid #ddd;">{emp_name}</td>
                    </tr>
                    <tr>
                        <td style="padding:10px; border:1px solid #ddd; background-color: #f8fafc; font-weight: bold;">Employee ID</td>
                        <td style="padding:10px; border:1px solid #ddd;">{emp_code}</td>
                    </tr>
                    {details_html}
                    <tr>
                        <td style="padding:10px; border:1px solid #ddd; background-color: #f8fafc; font-weight: bold;">Reason</td>
                        <td style="padding:10px; border:1px solid #ddd;">{reason}</td>
                    </tr>
                    <tr>
                        <td style="padding:10px; border:1px solid #ddd; background-color: #f8fafc; font-weight: bold;">Status</td>
                        <td style="padding:10px; border:1px solid #ddd;"><span style="background-color: #FEF3C7; color: #D97706; padding: 4px 10px; border-radius: 9999px; font-weight: bold; font-size: 12px;">Pending</span></td>
                    </tr>
                </table>

                <div style="margin: 30px 0; text-align: center;">
                    <a href="{approve_url}" style="display: inline-block; padding: 12px 24px; margin-right: 15px; background-color: #10B981; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; box-shadow: 0 2px 4px rgba(16, 185, 129, 0.25);">✅ Approve Request</a>
                    <a href="{reject_url}" style="display: inline-block; padding: 12px 24px; background-color: #EF4444; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; box-shadow: 0 2px 4px rgba(239, 68, 68, 0.25);">❌ Reject Request</a>
                </div>

                <p style="font-size: 12px; color: #94A3B8; border-top: 1px solid #e2e8f0; padding-top: 15px; margin-top: 25px;">
                    This is an automated request from the PeopleHub HRMS application. You can approve or reject directly using the links above or by logging into the employee portal.
                </p>
            </div>
        </body>
    </html>
    """

    send_email_via_smtp(manager_email, subject, html_content)

def send_employee_status_email(request_obj, employee, status, request_type):
    to_email = employee.email
    if not to_email:
        print(f"No email configured for employee {employee.first_name}, skipping status update email.")
        return

    req_label = request_type
    if request_type == "Leave":
        req_label = "Leave Request"
        details_html = f"<p><strong>Period:</strong> {request_obj.from_date} to {request_obj.to_date}</p>"
    elif request_type == "Permission":
        req_label = "Permission Request"
        from_time_str = request_obj.from_time.strftime("%I:%M %p") if request_obj.from_time else ""
        to_time_str = request_obj.to_time.strftime("%I:%M %p") if request_obj.to_time else ""
        details_html = f"<p><strong>Date:</strong> {request_obj.permission_date}</p><p><strong>Time Slot:</strong> {from_time_str} to {to_time_str}</p>"
    elif request_type == "Shift":
        req_label = "Shift Change Request"
        details_html = f"<p><strong>New Shift:</strong> {request_obj.requested_shift}</p><p><strong>Period:</strong> {request_obj.from_date} to {request_obj.to_date}</p>"
    elif request_type == "WFH":
        req_label = "Work From Home (WFH) Request"
        details_html = f"<p><strong>Period:</strong> {request_obj.from_date} to {request_obj.to_date}</p>"
    else:
        details_html = ""

    status_color = "#10B981" if status == "Approved" else "#EF4444"
    status_icon = "✅" if status == "Approved" else "❌"

    subject = f"Your {req_label} has been {status}"

    html_content = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f9f9f9; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                <div style="border-bottom: 3px solid {status_color}; padding-bottom: 15px; margin-bottom: 20px;">
                    <h2 style="color: #1E3A8A; margin: 0; font-size: 20px;">PeopleHub Request Status Update</h2>
                </div>

                <p>Dear {employee.first_name} {employee.last_name},</p>

                <p>Your <strong>{req_label}</strong> has been <strong style="color: {status_color};">{status.upper()}</strong> by your manager.</p>

                <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid {status_color}; font-size: 14px;">
                    {details_html}
                    <p style="margin-bottom: 0;"><strong>Reason:</strong> {request_obj.reason}</p>
                </div>

                <p>The status change is updated in the system and will display immediately on your portal dashboard.</p>

                <p style="margin-top: 30px; color: #64748B; font-size: 13px;">
                    Best regards,<br>
                    PeopleHub HR Team
                </p>
            </div>
        </body>
    </html>
    """

    send_email_via_smtp(to_email, subject, html_content)