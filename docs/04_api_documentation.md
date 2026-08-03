# PeopleHub: API Documentation

This document describes the primary RESTful HTTP API and WebSocket endpoints exposed by the PeopleHub backend.

## 1. Authentication & Security Headers

### JWT Authentication
Almost all endpoints (except public authentication routes) require a JWT access token in the `Authorization` header:
```http
Authorization: Bearer <JWT_ACCESS_TOKEN>
```
The token contains the user's ID, access level, and role constraints as payloads.

---

## 2. Authentication Endpoints (`/api/auth`)

### Login
* **Method:** `POST`
* **Path:** `/api/auth/login`
* **Content-Type:** `application/json`
* **Request Body:**
  ```json
  {
    "email": "employee_id_or_company_email",
    "password": "user_password"
  }
  ```
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "access_token": "eyJhbG...",
    "refresh_token": "eyJhbG...",
    "user": {
      "id": 1,
      "full_name": "Muraliba",
      "email": "muraliba@s4carlisle.com",
      "company_email": "muraliba@s4carlisle.com",
      "role_id": 2,
      "role_name": "Employee",
      "access_level": "standard"
    }
  }
  ```
* **Default Password Trigger:** If the password is `"Welcome_PeopleHub"`, returns `require_password_change: true` to trigger password reset UI.

### Reset Password Request
* **Method:** `POST`
* **Path:** `/api/auth/reset-password-request`
* **Request Body:**
  ```json
  {
    "email": "user@example.com"
  }
  ```
* **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "OTP sent to your email address"
  }
  ```

---

## 3. Employee Directory (`/api/employees`)

### List All Employees
* **Method:** `GET`
* **Path:** `/api/employees`
* **Success Response (200 OK):**
  ```json
  [
    {
      "id": 1,
      "employee_id": "PH001",
      "first_name": "John",
      "last_name": "Doe",
      "email": "john.doe@example.com",
      "department": "Engineering",
      "designation": "Software Developer",
      "profile_completed": true
    }
  ]
  ```

### Get Single Employee Profile
* **Method:** `GET`
* **Path:** `/api/employees/<id>`
* **Success Response (200 OK):** Detailed employee record containing personal details, educational qualifications, bank name, account number, IFSC, UAN, and basic/HRA salary figures.

---

## 4. Attendance & Punches (`/api/attendance`)

### Check-In
* **Method:** `POST`
* **Path:** `/api/attendance/check-in`
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Check-in successful",
    "check_in": "2026-07-31T09:00:00"
  }
  ```

### Break Controller
* **Method:** `POST`
* **Path:** `/api/attendance/lunch-break` or `/api/attendance/tea-break`
* **Request Body:**
  ```json
  {
    "action": "start" // or "end"
  }
  ```
* **Success Response (200 OK):** Returns updated break states and cumulative break minutes.

### Regularize Attendance
* **Method:** `POST`
* **Path:** `/api/attendance/regularize`
* **Request Body:**
  ```json
  {
    "attendance_id": 12,
    "check_in": "2026-07-31T09:00:00",
    "check_out": "2026-07-31T18:00:00",
    "reason": "Forget to check out"
  }
  ```

---

## 5. Leave Management (`/api/leaves`)

### Get Leave Balances
* **Method:** `GET`
* **Path:** `/api/leaves/balances`
* **Success Response (200 OK):**
  ```json
  [
    {
      "leave_type": "Sick Leave",
      "available": 12.0
    },
    {
      "leave_type": "Casual Leave",
      "available": 8.0
    }
  ]
  ```

### Apply for Leave
* **Method:** `POST`
* **Path:** `/api/leaves/apply`
* **Request Body:**
  ```json
  {
    "leave_type": "Casual Leave",
    "from_date": "2026-08-10",
    "to_date": "2026-08-12",
    "reason": "Personal work",
    "handover_to": "Bob Smith",
    "emergency_contact": "9876543210"
  }
  ```

---

## 6. Payroll Operations (`/api/payroll`)

### Get Payroll Sheet (Admin only)
* **Method:** `GET`
* **Path:** `/api/payroll/employees`
* **Response (200 OK):** Returns detailed structure of salary values, PF deductions, TDS, and net paid flags for each employee in the database.

### Process Monthly Payout
* **Method:** `POST`
* **Path:** `/api/payroll/process`
* **Request Body:**
  ```json
  {
    "month": "July",
    "year": 2026
  }
  ```
* **Response (200 OK):** Marks all active employees as having salaries processed and triggers database balances updates.

---

## 7. Socket.IO Events

Clients communicate asynchronously using the following Socket.IO protocol payload frames:

| Event Name | Emit/Listen | Payload Schema | Action / Trigger |
| :--- | :--- | :--- | :--- |
| `join` | Emit (Client) | `{ "employee_id": "1" }` | Places client session in individual and role-based rooms (`managers`/`employees`). |
| `send_message` | Emit (Client) | `{ "sender_id": 1, "receiver_id": 2, "sender_name": "Alice", "message": "Hi" }` | Emits private chat message. Persists text in SQL. |
| `receive_message`| Listen (Client) | `{ "id": 15, "employee_id": 1, "message": "Hi", "created_at": "..." }` | Triggers UI chat message component refresh on receiver. |
| `send_announcement`| Emit (Admin) | `{ "sender_name": "HR", "title": "Holiday", "message": "Tomorrow is holiday", "target_role": "employee" }` | Broadcasts announcement to target groups. |
