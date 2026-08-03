# PeopleHub: Product Requirements & Module Specifications

## 1. Comprehensive Module List & Specifications

### Module 1: Employee Management & Onboarding
* **Purpose:** Serves as the database of record for all employee profiles.
* **Key Features:**
  - **Employee Directory:** Searchable dashboard displaying all registered staff.
  - **Profile Completion Workflow:** Multi-step wizard collecting personal details, banking/salary info, educational history, previous experience, and document attachments.
  - **Reporting Relationships:** Hierarchical structure identifying designations and reporting managers.
  - **Profile Completeness Tracker:** Frontend percentage calculator indicating missing profile fields.

### Module 2: Attendance & Break Tracking
* **Purpose:** Captures daily work durations, break times, and supports shift assignments.
* **Key Features:**
  - **Daily Punching:** Real-time Check-In and Check-Out timestamps.
  - **Break Management:** Dedicated timers for Lunch and Tea breaks. Total break minutes automatically deducted from overall hours.
  - **Regularization Workflow:** Request submission for missing punches or date overrides, sent to the manager for validation.
  - **Card Check-In Sync:** Simulated biometric card reader logs to reconcile system punches.
  - **Loss of Pay (LOP):** Marks absences automatically, calculating LOP states based on attendance records.

### Module 3: Leave Management
* **Purpose:** Configures company leave allowances and automates application/approval cycles.
* **Key Features:**
  - **Leave Policies:** Admin definition of Yearly limits, Leave Types (Sick, Casual, Privilege), and Gender applicability.
  - **Employee Leave Balances:** Tracks available days per leave type for each employee.
  - **Approval Workflow:** Employee submits leaves with handovers and emergency contacts; managers receive notification to Approve, Reject, or Cancel.
  - **Leave Ledger:** Monthly credit/debit records tracking opening, credited, taken, and closing balances for audits.

### Module 4: Payroll Processing
* **Purpose:** Handles salary structures, deductions, and monthly payouts.
* **Key Features:**
  - **Salary Breakdown:** Detailed tracking of Basic, HRA, LTA, and Other allowances.
  - **Statutory Deductions:** Employee/Employer PF (Provident Fund), ESI, TDS, Professional Tax (PT), and Labour Welfare Fund (LWF).
  - **Payment Processing:** Toggle state to mark monthly salary as paid.
  - **Payslip Generation:** Dynamic creation and download of payslips in PDF format (generated via ReportLab).

### Module 5: Appraisal & Performance
* **Purpose:** Administers cyclical performance reviews.
* **Key Features:**
  - **Appraisal Cycles:** Management of annual or quarterly cycle templates.
  - **Questionnaires:** Configurable templates with appraisal questions.
  - **Requests & Submissions:** Assignment of cycles to employees. Employee fills out self-evaluations; managers submit responses.

### Module 6: Meeting Room Booking
* **Purpose:** Optimizes shared corporate spaces.
* **Key Features:**
  - **Room Directory:** List of booking-eligible office rooms.
  - **Scheduler:** Booking slots mapped to dates, start times, and durations.
  - **Booking Log:** History of bookings per user.

### Module 7: Telecom Directory
* **Purpose:** Office contacts utility.
* **Key Features:**
  - **Contact Cards:** Searchable list of mobile numbers, emails, reporting manager names, and departments.
  - **Click-to-Email/Phone:** Native integration for contacting colleagues quickly.

### Module 8: Communications & Broadcasts
* **Purpose:** Real-time notification and direct chat.
* **Key Features:**
  - **Real-Time Messaging:** Direct chat between users powered by Socket.IO, with message persistence in SQL.
  - **System Announcements:** Broad notifications sent by HR/Admins targeting roles (Employees or Managers).

---

## 2. Functional Requirements Checklist

| Module | Requirement ID | Description | Role / Target |
| :--- | :--- | :--- | :--- |
| **Auth** | FR-01 | Users must authenticate via Email and Password to receive JWT. | All |
| **Auth** | FR-02 | System must allow password reset via OTP token. | All |
| **Employee** | FR-03 | Employees must fill banking details (Bank name, Account, IFSC). | Employee |
| **Employee** | FR-04 | Users must be able to upload Resume, PAN, Aadhaar, and Degree. | Employee |
| **Attendance** | FR-05 | System must calculate total daily work hours excluding breaks. | Employee |
| **Attendance** | FR-06 | Employees can submit regularization reasons for manager approval. | Employee |
| **Leaves** | FR-07 | System must prevent applying for leaves exceeding current balance. | Employee |
| **Leaves** | FR-08 | Managers must receive real-time Socket.IO alerts for leave requests. | Manager |
| **Payroll** | FR-09 | HR Admins can process monthly salary payouts, updating payment status. | Admin / HR |
| **Payroll** | FR-10 | Employees must be able to download their PDF payslips. | Employee |
| **Appraisals**| FR-11 | Admins can create appraisal cycles and assign questions to employees. | Admin |
| **Rooms** | FR-12 | System must prevent double-booking of a room for overlapping slots. | All |
| **Comms** | FR-13 | System must broadcast announcements in real-time to active sessions. | Admin / HR |

---

## 3. Non-Functional Requirements

### Security & Compliance
- **NFR-01: Encrypted Storage:** All passwords must be stored using cryptographically secure hashing functions (Bcrypt).
- **NFR-02: Transport Layer Security:** All API communications must enforce HTTPS/WSS in production.
- **NFR-03: Sensitive Information Masking:** Banking, Aadhaar, and PAN numbers must be masked for read-only database connections.

### Performance & Scalability
- **NFR-04: API Response Time:** Standard database search and read queries must resolve in `<200ms` under nominal loads.
- **NFR-05: Real-Time Event Latency:** Socket.IO notification delivery must occur within `<1.5 seconds` from the trigger event.
- **NFR-06: File Size Limits:** Profile attachment uploads must be capped at `5MB` per document to optimize database size.

### Availability & Reliability
- **NFR-07: Backup Objective:** Relational data must undergo automated logical backups daily, supporting a Recovery Point Objective (RPO) of 24 hours.
- **NFR-08: Graceful Degradation:** The backend must handle synchronization failures with the CMS system gracefully (fire-and-forget daemon threads) without impacting primary HRMS operations.
