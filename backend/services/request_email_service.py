import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
# pyrefly: ignore [missing-import]
from itsdangerous import URLSafeTimedSerializer
from pathlib import Path
# pyrefly: ignore [missing-import]
from utils.compat import current_app

def get_serializer():
    return URLSafeTimedSerializer(current_app.config.get("SECRET_KEY"))

def generate_request_token(req_id, req_type, action, manager_email=None):
    serializer = get_serializer()
    # Token contains request ID, request type, action to perform, and manager email
    return serializer.dumps({
        "req_id": req_id,
        "req_type": req_type,
        "action": action,
        "manager_email": manager_email,
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
    mail_sender = current_app.config.get("MAIL_DEFAULT_SENDER", "peoplehub@s4carlisle.com")



    # 1. Always log and save a debug file first (so we can view HTML locally)
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

    # 2. Localhost Email Interception
    # If running locally, route all emails to MAIL_USERNAME to avoid spamming real people
    app_env = os.environ.get("APP_ENV", "local").lower()
    if app_env == "local":
        if mail_username:
            print(f"[TEST ENV] Intercepting email to {to_email}. Sending to {mail_username} instead.")
            to_email = mail_username
        else:
            print(f"[TEST ENV] MAIL_USERNAME not configured. Skipping email dispatch.")
            return True

    if not mail_username or not mail_password:
        print("[SMTP] Mail username or password is not configured in the environment. Skipping actual SMTP mail dispatch.")

        return True

    try:
        msg = MIMEMultipart("related")
        msg["From"] = mail_sender
        msg["To"] = to_email
        msg["Subject"] = subject

        alternative = MIMEMultipart("alternative")
        alternative.attach(MIMEText(html_content, "html"))
        msg.attach(alternative)


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

        return True
    except smtplib.SMTPAuthenticationError as auth_err:
        print(f"[SMTP AUTH ERROR] Authentication failed for user '{mail_username}'. Code: {auth_err.smtp_code}, Message: {auth_err.smtp_error.decode('utf-8', errors='ignore') if isinstance(auth_err.smtp_error, bytes) else auth_err.smtp_error}")

        return False
    except smtplib.SMTPConnectError as conn_err:
        print(f"[SMTP CONNECT ERROR] Connection failed to {mail_server}:{mail_port}. Code: {conn_err.smtp_code}, Message: {conn_err.smtp_error}")

        return False
    except Exception as smtp_err:
        import traceback
        print(f"[SMTP EXCEPTION] Failed to send email to {to_email}.")
        print(f"Exception Type: {type(smtp_err)}")
        print(f"Exception Message: {str(smtp_err)}")
        traceback.print_exc()

        return False

def send_manager_request_email(request_obj, request_type):
    from models.employee import Employee

    # Get employee details
    emp_id = request_obj.employee_id
    
    # Try exact match on string employee_id
    employee = Employee.query.filter_by(employee_id=str(emp_id)).first()

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
    elif request_type in ("WFH", "Office"):
        req_label = "Work From Home (WFH) Request" if request_type == "WFH" else "Work From Office Request"
        details_html = f"""
        <tr>
            <td style="padding:10px; border:1px solid #ddd; background-color: #f8fafc; font-weight: bold; width: 35%;">Date Range</td>
            <td style="padding:10px; border:1px solid #ddd;">{request_obj.from_date} to {request_obj.to_date}</td>
        </tr>
        """
    else:
        req_label = f"{request_type} Request"
        details_html = ""

    # Determine manager's email
    manager_email = None
    if employee.reporting_manager:
        search_name = employee.reporting_manager.strip().lower()
        from utils.employee_cache import get_all_employees_cached
        all_emps = [e for e in get_all_employees_cached() if (e.status or "").lower() != "inactive"]
        matching_manager = None
        for emp in all_emps:
            emp_full_name = f"{emp.first_name or ''} {emp.last_name or ''}".strip().lower()
            emp_first_name = (emp.first_name or "").strip().lower()
            if emp_full_name == search_name or emp_first_name == search_name:
                matching_manager = emp
                break
        if matching_manager:
            from models.user import User
            manager_user = User.query.get(matching_manager.user_id) if matching_manager.user_id else None
            
            if manager_user and manager_user.company_email:
                manager_email = manager_user.company_email
            elif matching_manager.email:
                manager_email = matching_manager.email

    if not manager_email:
        print(f"No manager email found for {emp_name}. Skipping manager notification email.")
        return

    # Generate unique, time-limited secure tokens
    approve_token = generate_request_token(request_obj.id, request_type, "approve", manager_email)
    reject_token = generate_request_token(request_obj.id, request_type, "reject", manager_email)

    # Base URL of the backend server
    api_base = os.environ.get("BACKEND_URL", "https://peoplehub.s4carlisle.com")
    approve_url = f"{api_base}/api/requests/email-action?token={approve_token}"
    reject_url = f"{api_base}/api/requests/email-action?token={reject_token}"

    subject = f"[PENDING] {req_label} from {emp_name}"

    from services.email_templates import get_manager_request_email_html
    html_content = get_manager_request_email_html(
        req_label=req_label,
        emp_name=emp_name,
        emp_code=emp_code,
        reason=reason,
        details_html=details_html,
        approve_url=approve_url,
        reject_url=reject_url
    )

    print(f"[EMAIL DEBUG] Preparing to send '{req_label}' email TO: {manager_email}")
    send_email_via_smtp(manager_email, subject, html_content)

def send_employee_status_email(request_obj, employee, status, request_type):
    from models.user import User
    user = User.query.get(employee.user_id)
    to_email = user.company_email
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

    manager_comment_html = ""
    if hasattr(request_obj, 'manager_comment') and request_obj.manager_comment:
        label = "Rejection Reason" if status == "Rejected" else "Manager Comment"
        manager_comment_html = f'<p style="margin-top: 10px; margin-bottom: 0; color: #EF4444;"><strong>{label}:</strong> {request_obj.manager_comment}</p>'

    subject = f"Your {req_label} has been {status}"

    from services.email_templates import get_employee_status_email_html
    html_content = get_employee_status_email_html(
        employee_first_name=employee.first_name,
        employee_last_name=employee.last_name,
        req_label=req_label,
        status=status,
        status_color=status_color,
        details_html=details_html,
        reason=request_obj.reason,
        manager_comment_html=manager_comment_html
    )

    print(f"[EMAIL DEBUG] Preparing to send '{req_label} {status}' email TO: {to_email}")
    send_email_via_smtp(to_email, subject, html_content)