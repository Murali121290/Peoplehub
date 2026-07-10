import emailjs
import os
from config.config import Config

def init_emailjs():
    emailjs.init(Config.EMAILJS_PUBLIC_KEY)

def send_email(to_email, subject, template, **kwargs):
    """Send email using EmailJS"""
    try:
        # Initialize EmailJS
        init_emailjs()
        
        # Prepare template parameters
        template_params = {
            'to_email': to_email,
            'subject': subject,
            'project_name': kwargs.get('project', {}).project_title if 'project' in kwargs else '',
            'project_code': kwargs.get('project', {}).project_code if 'project' in kwargs else '',
            'workflow_stage': kwargs.get('workflow_stage', ''),
            'assigned_user': kwargs.get('assigned_user', {}).full_name if 'assigned_user' in kwargs else '',
            'previous_user': kwargs.get('previous_user', {}).full_name if 'previous_user' in kwargs else '',
            'deadline': kwargs.get('deadline', ''),
            'chapter_name': kwargs.get('chapter_name', ''),
            'completion_details': kwargs.get('completion_details', ''),
            'comments': kwargs.get('comments', '')
        }
        
        # Send email
        response = emailjs.send(
            Config.EMAILJS_SERVICE_ID,
            Config.EMAILJS_TEMPLATE_ID,
            template_params
        )
        
        return response.status_code == 200
    except Exception as e:
        print(f"Email sending failed: {str(e)}")
        return False

def send_project_assigned_email(to_user, project, workflow_stage):
    """Send email when project is assigned"""
    subject = f"New Project Assigned: {project.project_title}"
    
    html_content = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #000; border-bottom: 2px solid #000; padding-bottom: 10px;">
                    Project Assignment Notification
                </h2>
                <p>Dear <strong>{to_user.full_name}</strong>,</p>
                <p>A new project has been assigned to you:</p>
                <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                    <tr style="background-color: #f5f5f5;">
                        <td style="padding: 10px; border: 1px solid #ddd;"><strong>Project Code</strong></td>
                        <td style="padding: 10px; border: 1px solid #ddd;">{project.project_code}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border: 1px solid #ddd;"><strong>Project Title</strong></td>
                        <td style="padding: 10px; border: 1px solid #ddd;">{project.project_title}</td>
                    </tr>
                    <tr style="background-color: #f5f5f5;">
                        <td style="padding: 10px; border: 1px solid #ddd;"><strong>Workflow Stage</strong></td>
                        <td style="padding: 10px; border: 1px solid #ddd;">{workflow_stage.name}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border: 1px solid #ddd;"><strong>Priority</strong></td>
                        <td style="padding: 10px; border: 1px solid #ddd;">{project.priority.upper()}</td>
                    </tr>
                </table>
                <p>Please log in to the system to access your assigned task.</p>
                <p style="margin-top: 30px; color: #666;">
                    Best regards,<br>
                    Workflow Management System
                </p>
            </div>
        </body>
    </html>
    """
    
    return send_email(to_email=to_user.email, subject=subject, template='project_assigned',
                     project=project, assigned_user=to_user, workflow_stage=workflow_stage.name)