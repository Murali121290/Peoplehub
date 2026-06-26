import React, { useState, useEffect, useMemo } from "react";
import { apiService } from "../../services/api";
import {
  HomeIcon,
  UserGroupIcon,
  ClockIcon,
  BuildingOfficeIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
  PlusIcon,
  CurrencyDollarIcon,
} from "@heroicons/react/24/outline";

import Btn from "./components/Btn";
import Avatar from "./components/Avatar";
import DashboardTab from "./tabs/DashboardTab";
import DirectoryTab from "./tabs/DirectoryTab";
import AttendanceTab from "./tabs/AttendanceTab";
import LeaveTab from "./tabs/LeaveTab";
import PayrollPage from "./tabs/PayrollPage";
import PerformanceTab from "./tabs/PerformanceTab";
import DocumentsTab from "./tabs/DocumentsTab";
import SettingsTab from "./tabs/SettingsTab";
import AddEmployeeModal from "./modals/AddEmployeeModal";
import ProfileCompleteModal from "./modals/ProfileCompleteModal";
import {
  theme,
  NAV,
  DEFAULT_NEW_EMP,
  DEFAULT_PROFILE_DATA,
} from "./data/hrMockData";

const NAV_ICONS: Record<string, React.ElementType> = {
  dashboard: HomeIcon,
  directory: UserGroupIcon,
  attendance: ClockIcon,
  leave: CalendarDaysIcon,
  payroll: CurrencyDollarIcon,
  performance: ChartBarIcon,
  documents: DocumentTextIcon,
  settings: Cog6ToothIcon,
};

const BASE_URL = "http://localhost:5000/api";

export default function HRAdminDashboard() {
  const [nav, setNav] = useState("dashboard");
  const [search, setSearch] = useState("");
  const [leaves, setLeaves] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [addEmpOpen, setAddEmpOpen] = useState(false);
  const [profileCompleteOpen, setProfileCompleteOpen] = useState(false);
  const [currentEmployee, setCurrentEmployee] = useState<any>(null);
  const [profileImage, setProfileImage] = useState<any>(null);
  const [newEmp, setNewEmp] = useState(DEFAULT_NEW_EMP);
  const [profileData, setProfileData] = useState(DEFAULT_PROFILE_DATA);

  // --- API Calls ---
  const fetchEmployees = async () => {
    try {
      const response = await fetch(`${BASE_URL}/employees/`);
      const data = await response.json();
      setEmployees(data || []);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchAttendance = async () => {
    try {
      const response = await fetch(`${BASE_URL}/attendance/`);
      const data = await response.json();
      setAttendance(data || []);
    } catch (error) {
      console.error("Attendance Error:", error);
    }
  };

  const fetchLeaveRequests = async () => {
    try {
      const response = await fetch(`${BASE_URL}/leaves/`);
      const data = await response.json();
      const formatted = data.map((leave: any) => ({
        id: leave.id,
        empId: leave.employee_id,
        empName: leave.employee_name,
        av: leave.employee_name
          ?.split(" ")
          ?.map((n: string) => n[0])
          ?.join("")
          ?.toUpperCase(),
        type: leave.leave_type,
        from: leave.from_date,
        to: leave.to_date,
        days: leave.total_days,
        reason: leave.reason,
        status: leave.status?.toLowerCase(),
        reporting_manager: leave.reporting_manager,
      }));
      setLeaves(formatted);
    } catch (error) {
      console.error("Leave Fetch Error:", error);
    }
  };

  const fetchTeams = async () => {
    try {
      const res = await apiService.getTeams();
      setTeams(res.data.teams || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await apiService.getRoles();
      setRoles(res.data.roles || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchEmployees();
    fetchAttendance();
    fetchLeaveRequests();
    fetchTeams();
    fetchRoles();
  }, []);

  // --- Counts ---
  const counts = useMemo(() => {
    const employeeUsers = employees.filter((emp) => {
      const role = emp.role?.toLowerCase() || "";
      return !["hr", "admin", "manager", "project manager"].includes(role);
    });
    const today = new Date().toISOString().split("T")[0];
    const presentEmployeeIds = [
      ...new Set(
        attendance
          .filter((att) => att.attendance_date === today)
          .map((att) => att.user_id),
      ),
    ];
    const activeEmployees = employeeUsers.filter((emp) =>
      presentEmployeeIds.includes(emp.user_id),
    ).length;
    const onLeaveEmployees = employeeUsers.length - activeEmployees;
    return {
      total: employeeUsers.length,
      active: activeEmployees,
      onLeave: onLeaveEmployees > 0 ? onLeaveEmployees : 0,
      pendingLeaves: leaves.filter((leave) => leave.status === "pending")
        .length,
    };
  }, [employees, attendance, leaves]);

  const filteredEmps = employees.filter(
    (e) =>
      `${e.first_name || ""} ${e.last_name || ""}`
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      (e.department || "").toLowerCase().includes(search.toLowerCase()) ||
      (e.role || "").toLowerCase().includes(search.toLowerCase()) ||
      (e.reporting_manager || "")
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      (e.designation || "").toLowerCase().includes(search.toLowerCase()),
  );

  // --- Handlers ---
  const handleApproveLeave = async (id: number) => {
    try {
      const response = await fetch(`${BASE_URL}/leaves/approve/${id}`, {
        method: "PUT",
      });
      const data = await response.json();
      if (data.success) fetchLeaveRequests();
    } catch (error) {
      console.error(error);
    }
  };

  const handleRejectLeave = async (id: number) => {
    try {
      const response = await fetch(`${BASE_URL}/leaves/reject/${id}`, {
        method: "PUT",
      });
      const data = await response.json();
      if (data.success) fetchLeaveRequests();
    } catch (error) {
      console.error(error);
    }
  };

  const handleAddEmployee = async (e: any) => {
    e.preventDefault();

    try {
      console.log("HANDLE ADD EMPLOYEE CALLED");
      console.log(newEmp);

      const formData = new FormData();

      formData.append("employee_id", newEmp.employee_id);
      formData.append("first_name", newEmp.first_name);
      formData.append("last_name", newEmp.last_name);
      formData.append("email", newEmp.email);
      formData.append("phone", newEmp.phone);
      formData.append("joining_date", newEmp.joining_date);
      formData.append("salary", newEmp.salary);

      formData.append("team_id", newEmp.team_id);
      formData.append("department", newEmp.department || "");

      formData.append("designation", newEmp.designation || "");
      formData.append("role", newEmp.role);
      formData.append("reporting_manager", newEmp.reporting_manager);

      formData.append("status", newEmp.status);

      if (profileImage) {
        formData.append("profile_image", profileImage);
      }
const response = await fetch(`${BASE_URL}/employees/`, {
  method: "POST",
  body: formData,
});

console.log("STATUS:", response.status);
console.log("OK:", response.ok);

const text = await response.text();
console.log("RAW RESPONSE:", text);

let data = {};
try {
  data = JSON.parse(text);
} catch (e) {
  console.log("Not JSON");
}

      console.log("SERVER RESPONSE:", data);

      if (!response.ok) {
        throw new Error(data.message || "Failed to add employee");
      }

      alert("Employee Added Successfully");

      await fetchEmployees();

      setAddEmpOpen(false);

      setNewEmp(DEFAULT_NEW_EMP);
    } catch (error: any) {
      console.error(error);

      alert(error.message || "Error adding employee");
    }
  };

  const handleProfileComplete = async () => {
    if (!currentEmployee) return;
    try {
      const response = await fetch(
        `${BASE_URL}/employees/${currentEmployee.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(profileData),
        },
      );
      const data = await response.json();
      alert(data.message || "Profile Completed Successfully");
      setProfileCompleteOpen(false);
      setProfileData(DEFAULT_PROFILE_DATA);
    } catch (error) {
      console.error(error);
      alert("Error completing profile");
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: theme.bg,
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Header */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 40,
          background: theme.surface,
          borderBottom: `1px solid ${theme.border}`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 24px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: "#1F748C",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <BuildingOfficeIcon
                style={{ width: 22, height: 22, color: "#fff" }}
              />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800 }}>
                HR Admin Dashboard
              </div>
              <div style={{ fontSize: 11, color: theme.textMuted }}>
                Full Access • All Features • Manage Everything
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div
          style={{
            display: "flex",
            gap: 4,
            padding: "0 24px 10px",
            overflowX: "auto",
          }}
        >
          {NAV.map((item) => {
            const Icon = NAV_ICONS[item.id];
            const isActive = nav === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setNav(item.id)}
                style={{
                  border: "none",
                  background: isActive ? `${theme.accent}18` : "transparent",
                  color: isActive ? theme.accent : theme.textMuted,
                  padding: "8px 14px",
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 13,
                  fontWeight: isActive ? 700 : 500,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {Icon && <Icon style={{ width: 16, height: 16 }} />}
                {item.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Content */}
      <main style={{ padding: 24 }}>
        {nav === "dashboard" && (
          <DashboardTab counts={counts} employees={employees} />
        )}
        {nav === "directory" && (
          <DirectoryTab
            filteredEmps={filteredEmps}
            search={search}
            onSearchChange={setSearch}
            onAddEmployee={() => setAddEmpOpen(true)}
            BASE_URL={BASE_URL}
          />
        )}
        {nav === "attendance" && (
          <AttendanceTab attendance={attendance} BASE_URL={BASE_URL} />
        )}
        {nav === "leave" && (
          <LeaveTab
            leaves={leaves}
            onApprove={handleApproveLeave}
            onReject={handleRejectLeave}
          />
        )}
        {nav === "payroll" && (
          <PayrollPage
            employees={employees}
            attendance={attendance}
            leaves={leaves}
            BASE_URL={BASE_URL}
          />
        )}
        {nav === "performance" && <PerformanceTab />}
        {nav === "documents" && <DocumentsTab />}
        {nav === "settings" && <SettingsTab />}
      </main>

      {/* Modals */}
      {addEmpOpen && (
        <AddEmployeeModal
          newEmp={newEmp}
          setNewEmp={setNewEmp}
          employees={employees}
          teams={teams}
          roles={roles}
          profileImage={profileImage}
          setProfileImage={setProfileImage}
          onSubmit={handleAddEmployee}
          onClose={() => setAddEmpOpen(false)}
        />
      )}
      {profileCompleteOpen && currentEmployee && (
        <ProfileCompleteModal
          currentEmployee={currentEmployee}
          profileData={profileData}
          setProfileData={setProfileData}
          onSubmit={handleProfileComplete}
          onClose={() => setProfileCompleteOpen(false)}
        />
      )}
    </div>
  );
}
