export interface Employee {
  id?: number;
  user_id?: number;
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  department?: string;
  designation?: string;
  role?: string;
  reporting_manager?: string;
  joining_date?: string;
  salary?: string | number;
  status?: string;
  sick_leave?: number;
  casual_leave?: number;
  earned_leave?: number;
  shift_timing?: string;
}

export interface LeaveRequest {
  id: number;
  empId: string;
  empName: string;
  av: string;
  type: string;
  from: string;
  to: string;
  days: number;
  reason: string;
  status: string;
  reporting_manager?: string;
}

export interface AttendanceRecord {
  id?: number;
  user_id?: number;
  employee_name?: string;
  department?: string;
  check_in?: string;
  check_out?: string;
  total_hours?: string;
  status?: string;
  attendance_date?: string;
}

export interface NewEmployee {
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  department: string;
  designation: string;
  role: string;
  reporting_manager: string;
  joining_date: string;
  salary: string;
  status: string;
}

export interface ProfileData {
  dob: string;
  gender: string;
  marital_status: string;
  blood_group: string;
  address: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  pan_number: string;
  aadhaar_number: string;
  bank_name: string;
  account_number: string;
  ifsc_code: string;
  qualification: string;
  college: string;
  passing_year: string;
  skills: string;
  emergency_contact_name: string;
  emergency_contact_number: string;
}