from utils.compat import Response

def make_html_response(title, message, is_success):
    bg_color = "#ECFDF5" if is_success else "#FEF2F2"
    border_color = "#10B981" if is_success else "#EF4444"
    text_color = "#065F46" if is_success else "#991B1B"
    icon = "✅" if is_success else "⚠️"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>{title}</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            body {{
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                background-color: #f3f4f6;
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100vh;
                margin: 0;
            }}
            .card {{
                background: white;
                padding: 40px;
                border-radius: 16px;
                box-shadow: 0 10px 25px rgba(0,0,0,0.05);
                text-align: center;
                max-width: 450px;
                width: 90%;
                border-top: 6px solid {border_color};
            }}
            .icon {{
                font-size: 48px;
                margin-bottom: 20px;
            }}
            h2 {{
                color: #111827;
                margin-top: 0;
                margin-bottom: 10px;
                font-size: 24px;
            }}
            .message-box {{
                background-color: {bg_color};
                color: {text_color};
                padding: 15px 20px;
                border-radius: 8px;
                font-size: 15px;
                line-height: 1.5;
                margin: 20px 0;
                font-weight: 500;
            }}
            .footer {{
                color: #9ca3af;
                font-size: 12px;
                margin-top: 30px;
            }}
        </style>
    </head>
    <body>
        <div class="card">
            <div class="icon">{icon}</div>
            <h2>{title}</h2>
            <div class="message-box">{message}</div>
            <div class="footer">
                This is an automated system response. You can safely close this window.
            </div>
        </div>
    </body>
    </html>
    """
    return Response(html_content, mimetype="text/html")

def make_rejection_form(title, token):
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>{title}</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            body {{
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                background-color: #f3f4f6;
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100vh;
                margin: 0;
            }}
            .card {{
                background: white;
                padding: 40px;
                border-radius: 16px;
                box-shadow: 0 10px 25px rgba(0,0,0,0.05);
                max-width: 450px;
                width: 90%;
                border-top: 6px solid #EF4444;
            }}
            h2 {{
                color: #111827;
                margin-top: 0;
                margin-bottom: 20px;
                font-size: 24px;
                text-align: center;
            }}
            textarea {{
                width: 100%;
                height: 100px;
                padding: 10px;
                margin-bottom: 20px;
                border: 1px solid #d1d5db;
                border-radius: 8px;
                font-family: inherit;
                box-sizing: border-box;
            }}
            button {{
                width: 100%;
                padding: 12px;
                background-color: #EF4444;
                color: white;
                border: none;
                border-radius: 8px;
                font-weight: bold;
                font-size: 16px;
                cursor: pointer;
            }}
            button:hover {{
                background-color: #DC2626;
            }}
        </style>
    </head>
    <body>
        <div class="card">
            <h2>Rejection Reason</h2>
            <form method="POST" action="/api/requests/email-action">
                <input type="hidden" name="token" value="{token}">
                <label for="reason" style="display:block; margin-bottom:10px; font-weight:500; color:#374151;">Please provide a reason for rejection:</label>
                <textarea name="reason" id="reason" required placeholder="Enter your reason here..."></textarea>
                <button type="submit">Submit</button>
            </form>
        </div>
    </body>
    </html>
    """
    return Response(html_content, mimetype="text/html")
