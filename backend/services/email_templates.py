def get_manager_request_email_html(req_label, emp_name, emp_code, reason, details_html, approve_url, reject_url):
    return f"""
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
                <p>A <strong>{req_label}</strong> has been submitted and is awaiting your approval.</p>
                <p>Please find the request details below for your review.</p>

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
                        <td style="padding:10px; border:1px solid #ddd; background-color: #f8fafc; font-weight: bold;">Request Reason</td>
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

def get_employee_status_email_html(employee_first_name, employee_last_name, req_label, status, status_color, details_html, reason, manager_comment_html):
    return f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f9f9f9; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                <div style="border-bottom: 3px solid {status_color}; padding-bottom: 15px; margin-bottom: 20px;">
                    <h2 style="color: #1E3A8A; margin: 0; font-size: 20px;">PeopleHub Request Status Update</h2>
                </div>

                <p>Dear {employee_first_name} {employee_last_name},</p>

                <p>Your <strong>{req_label}</strong> has been <strong style="color: {status_color};">{status.upper()}</strong> by your reporting head.</p>

                <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid {status_color}; font-size: 14px;">
                    {details_html}
                    <p style="margin-bottom: 0;"><strong>Request Reason:</strong> {reason}</p>
                    {manager_comment_html}
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
