export const HR_LETTERS = [
  "Experience Letter",
  "Bonafide Certificate",
  "NOC",
  "Employment Contract",
  "Salary Certificate",
  "Relieving Letter",
];

export const NAV = [
  { id: "dashboard", label: "Dashboard" },
  { id: "directory", label: "Staff Directory" },
  { id: "attendance", label: "Attendance" },
  { id: "shift", label: "Shift Requests" },
  { id: "holiday", label: "Holiday Calendar" },
  { id: "payroll",label: "Payroll" },
  { id: "performance", label: "Performance" },
  { id: "documents", label: "Documents" },
  { id: "settings", label: "Settings" },
];

export const theme = {
  bg: "#F8FAFF",
  surface: "#FFFFFF",
  surface2: "#F0F4FF",
  border: "#DCDEF5",
  text: "#1E293B",
  textMuted: "#64748B",
  accent: "#1F7A8c",
  green: "#10B981",
  amber: "#F59E0B",
  red: "#EF4444",
  blue: "#3B82F6",
};

export const DEFAULT_NEW_EMP = {
  id: "",              // <-- ADD THIS
  user_id: "",
  employee_id: "",
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  role_id: "",          // add
  access_level: "",  
  company_email: "",
  password: "", // add

  team_id: "",
  department: "",
  designation: "",
  role: "",
  reporting_manager: "",
  joining_date: "",
  salary: "",
  shift_timing: "", 
  status: "Active",
};

export const DEFAULT_PROFILE_DATA = {
  dob: "",
  gender: "",
  marital_status: "",
  blood_group: "",
  address: "",
  city: "",
  state: "",
  country: "",
  pincode: "",
  pan_number: "",
  aadhaar_number: "",
  bank_name: "",
  account_number: "",
  ifsc_code: "",
  qualification: "",
  college: "",
  passing_year: "",
  skills: "",
  emergency_contact_name: "",
  emergency_contact_number: "",
};