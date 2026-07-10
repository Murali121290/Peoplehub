export interface Task {
  id: number;
  taskId: string;
  projectName: string;
  complexity: string;
  assignedDate: string;
  dueDate: string;
  priority: 'High' | 'Medium' | 'Low';
  status: 'Pending' | 'In Progress' | 'Completed' | 'On Hold';
  description: string;
}

export interface LeaveRequest {
  id: number;
  leaveType: string;
  fromDate: string;
  toDate: string;
  days: number;
  reason: string;
  emergencyContact: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  managerApproval?: string;
  hrApproval?: string;
  submittedAt: string;
}

export interface Attendance {
  id: number;
  date: string;
  checkIn: string;
  checkOut: string;
  workingHours: number;
  status: 'Present' | 'Absent' | 'Leave';
}

export interface Performance {
  efficiencyScore: number;
  qualityScore: number;
  tasksCompleted: number;
  productivity: number;
  monthlyTrend: { month: string; score: number }[];
}

export interface Notification {
  id: number;
  type: 'announcement' | 'reminder' | 'alert' | 'info';
  title: string;
  message: string;
  time: string;
  read: boolean;
}

export interface Employee {
  name: string;
  employeeId: string;
  role: string;
  department: string;
  email: string;
  phone: string;
  manager: string;
  joiningDate: string;
  avatar: string;
}

export interface LeaveForm {
  leaveType: string;
  leaveDuration: string;
  fromDate: string;
  toDate: string;
  totalDays: number;
  reason: string;
  emergencyContact: string;
  reportingManager: string;
  handoverTo: string;
  attachment: null;
}