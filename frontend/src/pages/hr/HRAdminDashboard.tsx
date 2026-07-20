import { API_URL } from "../../config/api";
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
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { toast } from "react-hot-toast";

import DashboardTab from "./tabs/DashboardTab";
import DirectoryTab from "./tabs/DirectoryTab";
import AttendanceTab from "./tabs/AttendanceTab";
import LeaveTab from "./tabs/LeaveTab";
import ShiftTab from "./tabs/ShiftTab";
import HolidayTab from "./tabs/HolidayTab";
import PayrollPage from "./tabs/PayrollPage";
import PerformanceTab from "./tabs/PerformanceTab";
import DocumentsTab from "./tabs/DocumentsTab";
import SettingsTab from "./tabs/SettingsTab";
import AddEmployeeModal from "./modals/AddEmployeeModal";
import ProfileCompleteModal from "./modals/ProfileCompleteModal";
import AddTeamModal from "./modals/AddTeamModal";
import { Tabs } from "../../components/ui/Tabs";
const NAV = [
  { id: "dashboard", label: "Dashboard" },
  { id: "directory", label: "Staff Directory" },
  { id: "attendance", label: "Attendance" },
  { id: "shift", label: "Shift Requests" },
  { id: "holiday", label: "Holiday Calendar" },
  { id: "payroll", label: "Payroll" },
  { id: "performance", label: "Performance" },
  { id: "documents", label: "Documents" },
  { id: "settings", label: "Settings" },
];

const DEFAULT_NEW_EMP = {
  id: "",
  user_id: "",
  employee_id: "",
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  role_id: "",
  access_level: "",
  company_email: "",
  password: "",
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

const DEFAULT_PROFILE_DATA = {
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

const NAV_ICONS: Record<string, React.ElementType> = {
  dashboard: HomeIcon,
  directory: UserGroupIcon,
  attendance: ClockIcon,
  shift: ArrowPathIcon,
  holiday: CalendarDaysIcon,
  payroll: CurrencyDollarIcon,
  performance: ChartBarIcon,
  documents: DocumentTextIcon,
  settings: Cog6ToothIcon,
};

const BASE_URL = `${API_URL}/api`;

export default function HRAdminDashboard() {
  const [nav, setNav] = useState("dashboard");
  const [search, setSearch] = useState("");
  const [leaves, setLeaves] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [teamOverview, setTeamOverview] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [addEmpOpen, setAddEmpOpen] = useState(false);
  const [addTeamOpen, setAddTeamOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<any>(null);
  const [profileCompleteOpen, setProfileCompleteOpen] = useState(false);
  const [currentEmployee, setCurrentEmployee] = useState<any>(null);
  const [profileImage, setProfileImage] = useState<any>(null);
  const [newEmp, setNewEmp] = useState(DEFAULT_NEW_EMP);
  const [profileData, setProfileData] = useState(DEFAULT_PROFILE_DATA);
  const [isEditMode, setIsEditMode] = useState(false);

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
      const formatted = data.map((leave: any) => {
        const isPermission = leave.request_type === "Permission";

        const formatTime = (timeStr: string) => {
          if (!timeStr) return "";
          const parts = timeStr.split(":");
          if (parts.length >= 2) {
            return `${parts[0]}:${parts[1]}`;
          }
          return timeStr;
        };

        const timeRange = (leave.from_time && leave.to_time)
          ? `${formatTime(leave.from_time)} - ${formatTime(leave.to_time)}`
          : "";

        return {
          id: leave.id,
          empId: leave.employee_id,
          empName: leave.employee_name,
          av: leave.employee_name
            ?.split(" ")
            ?.map((n: string) => n[0])
            ?.join("")
            ?.toUpperCase(),
          type: isPermission ? "Permission" : leave.leave_type,
          from: isPermission ? leave.permission_date : leave.from_date,
          to: isPermission ? timeRange : leave.to_date,
          days: leave.total_days,
          reason: leave.reason,
          status: leave.status?.toLowerCase(),
          reporting_manager: leave.reporting_manager,
          // Keep raw fields for calculations like counts
          employee_id: leave.employee_id,
          from_date: leave.from_date,
          to_date: leave.to_date,
        };
      });
      setLeaves(formatted);
    } catch (error) {
      console.error("Leave Fetch Error:", error);
    }
  };

  const fetchShiftRequests = async () => {
    try {
      const response = await fetch(`${BASE_URL}/shifts/`);
      const data = await response.json();
      setShifts(data || []);
    } catch (error) {
      console.error("Shift Fetch Error:", error);
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

  const fetchTeamOverview = async () => {
    try {
      const res = await apiService.getTeamOverview();
      setTeamOverview(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchEmployees();
    fetchAttendance();
    fetchLeaveRequests();
    fetchShiftRequests();
    fetchTeams();
    fetchRoles();
    fetchTeamOverview();
  }, []);

  // --- Counts ---
  const counts = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const today = `${year}-${month}-${day}`;

    const presentEmployeeIds = [
      ...new Set(
        attendance
          .filter((att) => {
            const status = (att.status || "").toLowerCase();
            return att.attendance_date === today && (status === "present" || status === "late");
          })
          .map((att) => att.user_id),
      ),
    ];
    const activeEmployees = employees.filter((emp) =>
      presentEmployeeIds.includes(emp.user_id),
    ).length;

    const onLeaveEmployees = employees.filter((emp) => {
      return leaves.some((leave) => {
        const isUserMatch =
          String(leave.employee_id) === String(emp.id) ||
          String(leave.employee_id) === String(emp.user_id);
        if (!isUserMatch) return false;

        const isApproved = (leave.status || "").toLowerCase() === "approved";
        if (!isApproved) return false;

        try {
          const fromDate = new Date(leave.from_date).toISOString().split("T")[0];
          const toDate = new Date(leave.to_date).toISOString().split("T")[0];
          return fromDate <= today && today <= toDate;
        } catch (e) {
          return false;
        }
      });
    }).length;

    return {
      total: employees.length,
      active: activeEmployees,
      onLeave: onLeaveEmployees,
      pendingLeaves: leaves.filter((leave) => leave.status?.toLowerCase() === "pending")
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

  const handleApproveShift = async (id: number) => {
    try {
      const response = await fetch(`${BASE_URL}/shifts/approve/${id}`, {
        method: "PUT",
      });
      const data = await response.json();
      if (data.success) {
        toast.success("Shift request approved successfully");
        fetchShiftRequests();
        fetchAttendance();
      } else {
        toast.error(data.message || "Failed to approve shift request");
      }
    } catch (error) {
      console.error(error);
      toast.error("Error approving shift request");
    }
  };

  const handleRejectShift = async (id: number) => {
    try {
      const response = await fetch(`${BASE_URL}/shifts/reject/${id}`, {
        method: "PUT",
      });
      const data = await response.json();
      if (data.success) {
        toast.success("Shift request rejected successfully");
        fetchShiftRequests();
      } else {
        toast.error(data.message || "Failed to reject shift request");
      }
    } catch (error) {
      console.error(error);
      toast.error("Error rejecting shift request");
    }
  };

  const handleAddEmployee = async (e: any) => {
    e.preventDefault();

    try {
      console.log("HANDLE ADD EMPLOYEE CALLED");
      console.log("IS EDIT MODE:", isEditMode);
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
      formData.append("role_id", String(newEmp.role_id || ""));

      formData.append("reporting_manager", newEmp.reporting_manager);

      formData.append("company_email", newEmp.company_email);
      formData.append("password", newEmp.password);
      formData.append("access_level", newEmp.access_level);

      formData.append("status", newEmp.status);
      formData.append(
        "shift_timing",
        newEmp.shift_timing || ""
      );

      if (profileImage) {
        formData.append("profile_image", profileImage);
      }

      // Determine method and URL based on edit mode
      const method = isEditMode ? "PATCH" : "POST";
      const url = isEditMode
        ? `${BASE_URL}/employees/${newEmp.id}`
        : `${BASE_URL}/employees/`;

      const response = await fetch(url, {
        method,
        body: formData,
      });

      console.log("STATUS:", response.status);
      console.log("OK:", response.ok);

      const text = await response.text();
      console.log("RAW RESPONSE:", text);

      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.log("Not JSON");
      }

      console.log("SERVER RESPONSE:", data);

      if (!response.ok) {
        throw new Error(data.message || "Failed to save employee");
      }

      toast.success(isEditMode ? "Employee Updated Successfully" : "Employee Added Successfully");

      await fetchEmployees();

      setAddEmpOpen(false);

      setNewEmp(DEFAULT_NEW_EMP);

      setIsEditMode(false);
    } catch (error: any) {
      console.error(error);

      toast.error(error.message || "Error saving employee");
    }
  };
  const handleEditEmployee = (employee: any) => {

    setNewEmp(employee);

    setProfileImage(null);

    setIsEditMode(true);

    setAddEmpOpen(true);
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
      toast.success(data.message || "Profile Completed Successfully");
      setProfileCompleteOpen(false);
      setProfileData(DEFAULT_PROFILE_DATA);
    } catch (error) {
      console.error(error);
      toast.error("Error completing profile");
    }
  };

  const navTabs = NAV.map((item) => ({
    id: item.id,
    label: item.label,
    icon: NAV_ICONS[item.id],
  }));

  return (
    <div className="min-h-screen bg-neutral-50 font-sans">

      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-neutral-200">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[10px] bg-primary-500 flex items-center justify-center">
              <BuildingOfficeIcon className="w-[22px] h-[22px] text-white" />
            </div>
            <div>
              <div className="text-base font-extrabold text-neutral-800">
                HR Admin Dashboard
              </div>
              <div className="text-xs text-neutral-400 mt-0.5">
                {navTabs.find((n) => n.id === nav)?.label}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation — Employee Dashboard style */}
        <nav className="bg-white border-t border-neutral-100">
          <div className="px-4">
            <div className="flex space-x-1 overflow-x-auto py-2">
              {navTabs.map((item) => {
                const Icon = item.icon;
                const isActive = nav === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setNav(item.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                      isActive
                        ? "bg-primary-50 text-primary-700 border-b-2 border-primary-600"
                        : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-800"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="p-6">
        {nav === "dashboard" && (
          <DashboardTab
            counts={counts}
            teamOverview={teamOverview}
            teams={teams}
            onEditTeam={(team) => {
              setEditingTeam(team);
              setAddTeamOpen(true);
            }}
            onCreateTeam={() => {
              setEditingTeam(null);
              setAddTeamOpen(true);
            }}
          />
        )}
        {nav === "directory" && (
          <DirectoryTab
            filteredEmps={filteredEmps}
            search={search}
            onSearchChange={setSearch}
            onAddEmployee={() => {
              setIsEditMode(false);
              setNewEmp(DEFAULT_NEW_EMP);
              setProfileImage(null);
              setAddEmpOpen(true);
            }}
            onEditEmployee={handleEditEmployee}
            BASE_URL={BASE_URL}
          />
        )}
        {nav === "attendance" && (
          <AttendanceTab attendance={attendance} BASE_URL={BASE_URL} />
        )}
        {nav === "shift" && (
          <ShiftTab
            shifts={shifts}
            onApprove={handleApproveShift}
            onReject={handleRejectShift}
          />
        )}
        {nav === "holiday" && <HolidayTab />}
        {nav === "payroll" && <PayrollPage />}
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
          isEdit={isEditMode}
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
      {addTeamOpen && (
        <AddTeamModal
          isOpen={addTeamOpen}
          onClose={() => {
            setAddTeamOpen(false);
            setEditingTeam(null);
          }}
          onSuccess={() => {
            fetchTeams();
            fetchTeamOverview();
            fetchRoles();
          }}
          isEdit={!!editingTeam}
          teamData={editingTeam}
        />
      )}
    </div>
  );
}
