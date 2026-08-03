# PeopleHub: Security Architecture

This document describes the security controls, authentication mechanisms, authorization matrix, and data protection strategies implemented across PeopleHub.

## 1. Authentication & Session Security

### Password Hashing
- **Algorithm:** Passwords are never stored in plain text. The application uses the `werkzeug.security` utility, applying standard secure salted hashes.
- **Enforcement:** On initial login, default passwords like `"Welcome_PeopleHub"` are detected, forcing a redirection to change passwords before granting operational access tokens.

### JSON Web Tokens (JWT)
- **Sign Algorithm:** JWT tokens are encoded using the **HS256** algorithm, signed using a secure key configured in the environment (`JWT_SECRET_KEY`).
- **Token Validity:** Access tokens expire in 24 hours. Refresh tokens are valid for 30 days to facilitate session restoration without frequent logins.
- **Context Security:** To prevent token leaks or thread pollution in multi-threaded Uvicorn scopes, token contexts are stored in thread-safe Python `contextvars`.

---

## 2. Authorization Tiers & RBAC Matrix

PeopleHub enforces authorization using three tiers of checks:
1. **`auth_required`:** Verifies the request carries a valid, non-expired JWT, and that the database state of the user is flagged as `is_active`.
2. **`access_level_required`:** Checks the `access_level` attribute (`standard`, `manager`, `admin`) stored on the User model.
3. **`role_required`:** Matches the role name (e.g. `"Employee"`, `"Manager"`, `"HR Admin"`) against whitelist tables.

### Role-Based Access Control (RBAC) Matrix

| Feature / Resource | Endpoint Prefix | Employee (Standard) | Manager | HR / Admin |
| :--- | :--- | :---: | :---: | :---: |
| **Login / Reset Pass** | `/api/auth` | ✔ | ✔ | ✔ |
| **Directory Search** | `/api/employees` | Read-Only | Read-Only | Read / Write |
| **Daily Clock Punches** | `/api/attendance` | Check-in/out | Check-in/out | Check-in/out |
| **Regularize Punches** | `/api/attendance` | Apply | Approve/Reject | View All |
| **Apply for Leave** | `/api/leaves/apply` | Apply | Apply | Apply |
| **Leave Approvals** | `/api/leaves` | ✘ | Approve/Reject | View All |
| **Download Payslips** | `/api/payroll` | Own Payslip | Own Payslip | Generate / View All |
| **Manage Rooms** | `/api/meeting-rooms` | Book Rooms | Book Rooms | Create Rooms |
| **System Diagnostics** | `/api/admin/db` | ✘ | ✘ | Full Access |
| **Announcements** | `/api/communications`| Read-Only | Read-Only | Write / Broadcast |

---

## 3. External Synchronization Security (CMS Webhook)
When syncing data between PeopleHub and the external CMS service, transport security controls prevent unauthorized requests:
- **Shared Secret Verification:** The CMS backend validates the incoming POST request by checking the `X-Sync-Secret` header. This value is configured via `SYNC_API_SECRET` environment variables.
- **Payload Scrambling:** To protect system integrity, employee password hashes are never synchronized during deletion events, and sensitive data is stripped where applicable.

---

## 4. Web & API Security Best Practices
- **CORS Configuration:** `CORSMiddleware` in `app.py` filters incoming requests. Only requests coming from domains registered in `CORS_ORIGINS` environment variables are processed.
- **File Upload Limits:** Nginx (`nginx.conf`) restricts maximum request payload sizes using the `client_max_body_size 50M;` directive to prevent denial-of-service (DoS) attempts via large files.
- **SQL Injection Prevention:** Database interactions are mediated through SQLAlchemy ORM object mappings and parameterized queries, neutralizing SQL injection vectors.
- **Cross-Site Scripting (XSS) Mitigation:** React automatically escapes variables in JSX bindings before rendering, preventing script injection on client interfaces.
