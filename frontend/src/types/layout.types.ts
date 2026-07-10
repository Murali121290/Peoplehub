export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface Employee {
  id: number;
  user_id?: number;
  first_name: string;
  last_name: string;
  designation?: string;
  profile_image?: string;
}

export interface Notification {
  id: number;
  type?: "success" | "warning" | "error" | "info";
  title?: string;
  message: string;
  timestamp?: string;
}

export interface ReportingEmployee {
  employee_id: string;
  employee_name: string;
  designation?: string;
  profile_image?: string;
  status: "Present" | "Absent" | "Late";
  check_in?: string;
  check_out?: string;
  working_hours?: string;
}

export interface AttendanceDetail {
  employee_id: string;
  employee_name: string;
  designation?: string;
  check_in?: string;
  check_out?: string;
  lunch_minutes?: number;
  tea_minutes?: number;
  total_break_minutes?: number;
  working_hours?: string;
}

export interface ChatMessage {
  id: number;
  employee_id: number;
  receiver_id?: number;
  message: string;
  message_type?: string;
  created_by?: string;
  created_at?: string;
}