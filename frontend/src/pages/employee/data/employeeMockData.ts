import { Employee, Task, LeaveRequest, Performance, Notification } from '../../../types/employee.types';

export const employeeData: Employee = {
  name: "John Smith",
  employeeId: "EMP-2024-001",
  role: "Senior Pre-Editor",
  department: "Pre-Editing",
  email: "john.smith@company.com",
  phone: "+1 (555) 123-4567",
  manager: "Sarah Johnson",
  joiningDate: "2022-03-15",
  avatar: "JS"
};

export const tasksData: Task[] = [
  { id: 1, taskId: "TSK-001", projectName: "Website Redesign", complexity: "sample", assignedDate: "2026-05-20", dueDate: "2026-06-05", priority: "High", status: "In Progress", description: "Content preprocessing and formatting" },
  { id: 2, taskId: "TSK-002", projectName: "Mobile App Launch", complexity: "sample", assignedDate: "2026-05-22", dueDate: "2026-06-10", priority: "Medium", status: "Pending", description: "Text extraction and cleanup" },
  { id: 3, taskId: "TSK-003", projectName: "Content Strategy", complexity: "sample", assignedDate: "2026-05-15", dueDate: "2026-05-30", priority: "High", status: "Completed", description: "Document formatting and styling" },
  { id: 4, taskId: "TSK-004", projectName: "SEO Optimization", complexity: "sample", assignedDate: "2026-05-25", dueDate: "2026-06-15", priority: "Low", status: "Pending", description: "Metadata preparation" },
  { id: 5, taskId: "TSK-005", projectName: "Brand Guidelines", complexity: "sample", assignedDate: "2026-05-18", dueDate: "2026-06-08", priority: "Medium", status: "On Hold", description: "Style guide preprocessing" },
  { id: 6, taskId: "TSK-006", projectName: "E-commerce Platform", complexity: "sample", assignedDate: "2026-05-28", dueDate: "2026-06-20", priority: "High", status: "In Progress", description: "Product description editing" },
];

export const leaveRequestsData: LeaveRequest[] = [
  { id: 1, leaveType: "Sick Leave", fromDate: "2026-06-04", toDate: "2026-06-06", days: 3, reason: "Medical rest required", emergencyContact: "+1 (555) 987-6543", status: "Pending", submittedAt: "2026-05-28" },
  { id: 2, leaveType: "Casual Leave", fromDate: "2026-06-10", toDate: "2026-06-11", days: 2, reason: "Personal work", emergencyContact: "+1 (555) 987-6543", status: "Approved", managerApproval: "2026-06-01", hrApproval: "2026-06-01", submittedAt: "2026-05-25" },
  { id: 3, leaveType: "Earned Leave", fromDate: "2026-06-15", toDate: "2026-06-20", days: 6, reason: "Family vacation", emergencyContact: "+1 (555) 987-6543", status: "Approved", managerApproval: "2026-05-20", hrApproval: "2026-05-21", submittedAt: "2026-05-15" },
  { id: 4, leaveType: "Sick Leave", fromDate: "2026-05-01", toDate: "2026-05-02", days: 2, reason: "Flu symptoms", emergencyContact: "+1 (555) 987-6543", status: "Rejected", managerApproval: "2026-04-28", submittedAt: "2026-04-28" },
];

export const performanceData: Performance = {
  efficiencyScore: 87,
  qualityScore: 92,
  tasksCompleted: 28,
  productivity: 94,
  monthlyTrend: [
    { month: "Jan", score: 78 },
    { month: "Feb", score: 82 },
    { month: "Mar", score: 85 },
    { month: "Apr", score: 88 },
    { month: "May", score: 91 },
    { month: "Jun", score: 87 },
  ]
};

export const notificationsData: Notification[] = [
  { id: 1, type: "announcement", title: "New Project Assigned", message: "You've been assigned to Website Redesign project", time: "2 hours ago", read: false },
  { id: 2, type: "reminder", title: "Task Deadline Tomorrow", message: "TSK-001 is due tomorrow", time: "4 hours ago", read: false },
  { id: 3, type: "info", title: "Team Meeting", message: "Weekly team meeting at 3 PM today", time: "6 hours ago", read: true },
  { id: 4, type: "alert", title: "Leave Request Approved", message: "Your casual leave has been approved", time: "1 day ago", read: true },
];

export const activityData = [
  { id: 1, action: "Completed task", details: "TSK-003 - Content Strategy", time: "2 hours ago" },
  { id: 2, action: "Started task", details: "TSK-001 - Website Redesign", time: "5 hours ago" },
  { id: 3, action: "Submitted leave request", details: "Sick Leave (3 days)", time: "1 day ago" },
  { id: 4, action: "Updated profile", details: "Changed phone number", time: "2 days ago" },
];

export const upcomingDeadlines = [
  { id: 1, taskId: "TSK-001", projectName: "Website Redesign", dueDate: "2026-06-05", priority: "High" },
  { id: 2, taskId: "TSK-002", projectName: "Mobile App Launch", dueDate: "2026-06-10", priority: "Medium" },
  { id: 3, taskId: "TSK-005", projectName: "Brand Guidelines", dueDate: "2026-06-08", priority: "Medium" },
];

export const teamRanking = [
  { rank: 1, name: "David Miller", department: "QA", score: 96, avatar: "DM" },
  { rank: 2, name: "Emma Wilson", department: "Copywriting", score: 93, avatar: "EW" },
  { rank: 3, name: "John Smith", department: "Pre-Editing", score: 87, avatar: "JS" },
  { rank: 4, name: "Lisa Anderson", department: "QA", score: 85, avatar: "LA" },
];

export const leaveReasons: Record<string, string[]> = {
  "Sick Leave": ["Fever", "Headache", "Cold", "Food Poisoning", "Medical Checkup", "Hospital Visit"],
  "Casual Leave": ["Personal Work", "Family Function", "Marriage", "Bank Work", "Travel"],
  "Earned Leave": ["Vacation", "Family Trip", "Festival", "Personal Time"],
  "Unpaid Leave": ["Emergency", "Personal Reasons", "Extended Vacation"],
};