# routes/ai_routes.py

import os
import json
import urllib.request
import urllib.error
from utils.compat import Blueprint, request, jsonify
from middleware.auth import auth_required

ai_bp = Blueprint(
    "ai_bp",
    __name__
)

SYSTEM_PROMPT = """You are the PeopleHub AI Assistant, a real-time conversational AI helper for S4Carlisle Publishing Services.
Your job is to assist employees with portal guidelines, policies, attendance, leaves, shift requests, and troubleshooting.

Here is the official PeopleHub Knowledge Base you MUST use to answer employee questions:

1. Daily Attendance:
- Check-in/out: Done via the Employee Dashboard by clicking "Check In" or "Check Out". Confirm shift timing and work mode (Office or WFH).
- Double Check-in: Only one check-in is permitted per day. For accidental check-outs, submit a Regularization request.
- Break Timers: Lunch & Tea breaks can be started/stopped. They pause working hours and are automatically subtracted from total hours.
- Session Inactivity: Inactivity of 15 minutes on the site automatically logs out the user for security.
- Timings: General Shift is 09:00 AM to 06:00 PM. Minimum 8 hours required. Core hours: 10:00 AM to 05:00 PM. WFH is fully supported.
- Grace Period: A 15-minute grace period is allowed for General Shift check-ins (up to 09:15 AM).
- Missing Check-out: Triggers a "Provide Clarification" prompt the next day to insert actual hours for manager approval.

2. Leaves & Regularization:
- Apply Leave: Done in Attendance tab -> Leave section -> "Apply Leave". Select dates, type (Casual, Sick, LOP, etc.), manager, and reason.
- Sandwich Leave Rule: If Casual/LOP leaves are applied preceding and following a weekend or public holiday, intermediate non-working days will also count as deductions.
- Clarification/Regularization: Used for forgotten punches. Sent to manager for approval.
- Calendar Colors: Green = Present, Yellow/Light Green = Half Day, Red = Absent, Blue = Week Off/Holiday, Yellow outline = Pending approval.
- One Day Wages (ODW): For working on weekends/holidays. Prompts on check-in. Once manager approves, overtime is credited.
- Approval SLA: Managers/HR review requests within 24-48 business hours.
- Permissions: Late Entry or Early Exit requests, adjust hours. Auto-refresh: Permission hours auto-reset back to 2.0 hours for all employees on the 25th of every month at 00:01 AM.
- Shift Change: Done in Requests tab -> "Apply Shift/Work Mode".
- Absent Leave Application: Apply for a leave with the past absent date to clear the "Absent" status.
- Payroll Date Cycle: Monthly payroll calculations compute attendance confirming days between the 25th of the previous month and the 24th of the current month.

3. Office Tools:
- Intercom: Find colleagues in the "Intercom Directory" tab by name/department.
- Meeting Rooms: Book rooms via the "Meeting Rooms" page.
- Announcements: View official updates in the "Announcements" section.

4. Profile & Performance:
- Appraisals: Submit self-evaluations under the "Appraisal" page. Submitted forms cannot be edited unless sent back by the manager.
- Edit profile: Avatar menu -> "Edit Details". Sensitive changes (e.g. Bank Details) require HR approval.
- Payslips: Download PDF under Profile tab -> Payslip/Salary section.
- Settings: Change password or configure account preferences.

5. Troubleshooting & Errors:
- 'Checkout Failed' or 'Check-in Failed': Try performing a hard refresh (Ctrl + Shift + R) or logging out/in. If it persists, take a screenshot and contact your manager to regularize the timing.
- Biometric Mismatch: Biometric punches sync automatically. Mismatches can be overridden by submitting a Regularization request.

Keep your tone helpful, professional, polite, and conversational. Refer to the guidelines above to provide accurate answers. If the answer is not in the guidelines, instruct them to contact HR at hr.chennai@s4carlisle.com. Do not make up facts or policies.
"""

@ai_bp.route("/chat", methods=["POST"])
@auth_required
def chat():
    try:
        data = request.json or {}
        message = data.get("message", "").strip()
        if not message:
            return jsonify({"success": False, "error": "Message is empty"}), 400

        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            return jsonify({
                "success": False, 
                "error": "api_key_missing", 
                "message": "AI Key is missing. Set GEMINI_API_KEY in the .env file to enable real-time Gemini AI."
            })

        # Call Gemini API
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
        payload = {
            "contents": [
                {
                    "parts": [{"text": message}]
                }
            ],
            "systemInstruction": {
                "parts": [{"text": SYSTEM_PROMPT}]
            }
        }

        req_data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=req_data,
            headers={"Content-Type": "application/json"},
            method="POST"
        )

        try:
            with urllib.request.urlopen(req, timeout=10) as response:
                status_code = response.getcode()
                res_bytes = response.read()
                res_json = json.loads(res_bytes.decode("utf-8"))
        except urllib.error.HTTPError as he:
            status_code = he.code
            res_json = {}
            error_details = he.read().decode("utf-8")
            print("GEMINI API HTTPError:", status_code, error_details)
            return jsonify({
                "success": False,
                "error": f"API returned status {status_code}",
                "details": error_details
            }), status_code

        try:
            ai_text = res_json['candidates'][0]['content']['parts'][0]['text']
        except (KeyError, IndexError):
            ai_text = "I received a response from the AI engine, but could not parse the text output format."

        return jsonify({
            "success": True,
            "response": ai_text
        })

    except Exception as e:
        print("GEMINI API Exception:", str(e))
        return jsonify({"success": False, "error": str(e)}), 500
