import { API_URL, getProfileImageUrl } from "../config/api";
import React, { useEffect, useMemo, useState } from "react";
import { socket } from "../services/socket";
import {
  UsersIcon,
  CheckCircleIcon,
  ChartBarIcon,
  BellIcon,
  Cog6ToothIcon,
  UserPlusIcon,
  ClockIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  InboxArrowDownIcon,
  XCircleIcon,
  ArrowRightOnRectangleIcon,
  CalendarDaysIcon,
  BuildingOfficeIcon,
  BriefcaseIcon,
  Squares2X2Icon,
  ListBulletIcon,
  HomeIcon,
  ArrowPathIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { StatCard } from "../components/ui/StatCard";
import { Tabs } from "../components/ui/Tabs";
import { Input, Select } from "../components/ui/Form";
import { BookLoader } from "../components/ui/Spinner";
import type { StatCardColor } from "../components/ui/StatCard";
import type { BadgeVariant } from "../components/ui/Badge";

const CustomSelect: React.FC<{
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder: string;
}> = ({ value, onChange, options, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleClose = () => setIsOpen(false);
    document.addEventListener("click", handleClose);
    return () => document.removeEventListener("click", handleClose);
  }, [isOpen]);

  return (
    <div style={{ position: "relative", width: "100%", textAlign: "left", textTransform: "none" }} onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: "flex",
          width: "100%",
          alignItems: "center",
          justifyContent: "space-between",
          borderRadius: "6px",
          border: "1px solid #cbd5e1",
          background: "#fff",
          padding: "4px 8px",
          fontSize: "11px",
          fontWeight: 600,
          color: "#334155",
          outline: "none",
          cursor: "pointer",
        }}
      >
        <span style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
          {value === "All" ? placeholder : value}
        </span>
        <span style={{ marginLeft: "4px", fontSize: "8px", color: "#94a3b8" }}>▼</span>
      </button>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            zIndex: 50,
            marginTop: "4px",
            maxHeight: "192px",
            overflowY: "auto",
            borderRadius: "8px",
            border: "1px solid #e2e8f0",
            background: "#fff",
            padding: "4px 0",
            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
          }}
        >
          {options.map((opt) => (
            <div
              key={opt}
              onClick={() => {
                onChange(opt);
                setIsOpen(false);
              }}
              style={{
                cursor: "pointer",
                padding: "6px 10px",
                fontSize: "11px",
                color: "#334155",
                background: opt === value ? "#f1f5f9" : "transparent",
                fontWeight: opt === value ? "bold" : "normal",
                textOverflow: "ellipsis",
                overflow: "hidden",
                whiteSpace: "nowrap",
              }}
              title={opt}
            >
              {opt === "All" ? placeholder : opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const BASE_URL = `${API_URL}/api`;

const formatWorkingHours = (hoursVal: any) => {
  if (hoursVal == null || hoursVal === "" || hoursVal === 0 || hoursVal === "0" || hoursVal === "0.0") return "—";
  const num = Number(hoursVal);
  if (isNaN(num) || num <= 0) return "—";
  const hrs = Math.floor(num);
  const mins = Math.round((num - hrs) * 60);
  return `${hrs} h ${mins} m`;
};

// ==========================
// THEME - professional enterprise palette
// ==========================
const THEME = {
  primary: "#186370", // primary-600
  primaryDark: "#144F5A", // primary-700
  primarySoft: "#EFF7F8", // primary-50
  navy: "#0F172A", // neutral-900
  text: "#1E293B", // neutral-800
  textSoft: "#475569", // neutral-600
  textLight: "#94A3B8", // neutral-400
  border: "#DCDEF5", // neutral-200
  surface: "#FFFFFF",
  surfaceSoft: "#F8FAFF", // neutral-50
  surfaceMuted: "#F0F4FF", // neutral-100
  success: "#059669",
  successBg: "#D1FAE5",
  warning: "#D97706",
  warningBg: "#FEF3C7",
  danger: "#DC2626",
  dangerBg: "#FEE2E2",
  shadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
};

const initialTeamMembers = [
  {
    id: 1,
    name: "John Smith",
    email: "john.smith@company.com",
    role: "Pre-Editing",
    status: "Active",
    tasksCompleted: 28,
    efficiency: 85,
    hoursThisWeek: 32,
    avatar: "JS",
  },
  {
    id: 2,
    name: "Sarah Johnson",
    email: "sarah.johnson@company.com",
    role: "Copywriting",
    status: "Leave",
    tasksCompleted: 15,
    efficiency: 78,
    hoursThisWeek: 0,
    avatar: "SJ",
  },
  {
    id: 3,
    name: "David Miller",
    email: "david.miller@company.com",
    role: "QA",
    status: "Active",
    tasksCompleted: 42,
    efficiency: 92,
    hoursThisWeek: 40,
    avatar: "DM",
  },
  {
    id: 4,
    name: "Emma Wilson",
    email: "emma.wilson@company.com",
    role: "Copywriting",
    status: "Active",
    tasksCompleted: 22,
    efficiency: 88,
    hoursThisWeek: 36,
    avatar: "EW",
  },
  {
    id: 5,
    name: "Michael Brown",
    email: "michael.brown@company.com",
    role: "Pre-Editing",
    status: "Leave",
    tasksCompleted: 8,
    efficiency: 70,
    hoursThisWeek: 0,
    avatar: "MB",
  },
  {
    id: 6,
    name: "Lisa Anderson",
    email: "lisa.anderson@company.com",
    role: "QA",
    status: "Active",
    tasksCompleted: 35,
    efficiency: 89,
    hoursThisWeek: 38,
    avatar: "LA",
  },
];

// Leave requests removed from manager dashboard

const STATUS_BADGE_VARIANT: Record<string, BadgeVariant> = {
  Active: "success",
  Leave: "danger",
  Pending: "warning",
  Approved: "success",
  Rejected: "neutral",
};

const NOTIFICATION_STYLES: Record<string, string> = {
  alert: "border-l-neutral-800 bg-neutral-50",
  success: "border-l-primary-600 bg-primary-50",
  warning: "border-l-neutral-400 bg-neutral-50",
  info: "border-l-primary-300 bg-primary-50",
};

const ManagerDashboardPage = () => {
  const userId = localStorage.getItem("user_id");

  const [managerPath, setManagerPath] = useState<{ id: number; name: string }[]>([
    { id: Number(userId) || 0, name: "My Team" }
  ]);

  const currentViewedManagerId = managerPath[managerPath.length - 1]?.id || Number(userId);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");

  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [teamAttendance, setTeamAttendance] = useState<any[]>([]);
  const [attendanceSearch, setAttendanceSearch] = useState("");
  const [attendanceFilter, setAttendanceFilter] = useState("All");
  const [deptFilter, setDeptFilter] = useState("All");
  const [desigFilter, setDesigFilter] = useState("All");
  const [mgrFilter, setMgrFilter] = useState("All");
  const [shiftFilter, setShiftFilter] = useState("All");
  const [managerName, setManagerName] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [showViewDropdown, setShowViewDropdown] = useState(false);

  // Attendance History States & Callbacks
  const [historyModalUser, setHistoryModalUser] = useState<any | null>(null);
  const [historyRecords, setHistoryRecords] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [hoveredRowId, setHoveredRowId] = useState<number | null>(null);
  const [hoveredCardId, setHoveredCardId] = useState<number | null>(null);
  const [highlightedEmployeeId, setHighlightedEmployeeId] = useState<number | null>(null);
  const [selectedCycle, setSelectedCycle] = useState<string>("");
  const [availableMonths, setAvailableMonths] = useState<any[]>([]);
  const [showExportDropdown, setShowExportDropdown] = useState(false);

  // Yesterday Summary States
  const [yesterdaySummary, setYesterdaySummary] = useState<any[]>([]);
  const [loadingYesterday, setLoadingYesterday] = useState(false);
  const [yesterdaySummaryDate, setYesterdaySummaryDate] = useState("");
  const [isPageLoading, setIsPageLoading] = useState(true);

  const generatePayrollCycles = () => {
    const today = new Date();
    const cycles = [];
    for (let i = 0; i < 6; i++) {
      let year = today.getFullYear();
      let month = today.getMonth();
      let targetMonth = month - i;
      let targetYear = year;
      if (targetMonth < 0) {
        targetYear += Math.floor(targetMonth / 12);
        targetMonth = (targetMonth % 12 + 12) % 12;
      }
      if (today.getDate() < 25) {
        targetMonth = targetMonth - 1;
        if (targetMonth < 0) {
          targetYear -= 1;
          targetMonth = 11;
        }
      }
      const cycleStart = new Date(targetYear, targetMonth, 25);
      let cycleEndMonth = targetMonth + 1;
      let cycleEndYear = targetYear;
      if (cycleEndMonth > 11) {
        cycleEndMonth = 0;
        cycleEndYear += 1;
      }
      const cycleEnd = new Date(cycleEndYear, cycleEndMonth, 24);
      const label = `${cycleStart.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} - ${cycleEnd.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
      const value = `${cycleStart.getFullYear()}-${String(cycleStart.getMonth() + 1).padStart(2, "0")}-25`;
      cycles.push({ label, value });
    }
    return cycles;
  };

  const handleMemberClick = async (member: any) => {
    if (member.is_reporting_manager && member.user_id && member.report_count && member.report_count > 0) {
      // Verify the employee actually has team members before drilling down
      try {
        const res = await fetch(`${BASE_URL}/employees/my-team/${member.user_id}`);
        const subTeam = await res.json();
        if (Array.isArray(subTeam) && subTeam.length > 0) {
          setManagerPath((prev) => [...prev, { id: member.user_id, name: member.name }]);
          return;
        }
      } catch (_) {
        // Fall through to history on error
      }
    }
    viewEmployeeHistory(member);
  };

  const viewEmployeeHistory = async (member: any) => {
    setHistoryModalUser(member);
    setLoadingHistory(true);
    setHistoryRecords([]);
    const cycles = generatePayrollCycles();
    const defaultCycle = cycles[0]?.value || "";
    setSelectedCycle(defaultCycle);
    try {
      const targetUserId = member?.user_id || member?.id || member?.employee_id;
      if (!targetUserId || targetUserId === "undefined") {
        console.warn("Cannot fetch attendance history: invalid user ID", member);
        return;
      }
      const response = await fetch(`${BASE_URL}/attendance/history/${targetUserId}?start_date=${defaultCycle}`);
      if (!response.ok) throw new Error("Failed to fetch history");
      const data = await response.json();
      setHistoryRecords(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load attendance history:", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleCycleChange = async (cycleValue: string) => {
    setSelectedCycle(cycleValue);
    setLoadingHistory(true);
    try {
      const targetUserId = historyModalUser?.user_id || historyModalUser?.id || historyModalUser?.employee_id;
      const response = await fetch(`${BASE_URL}/attendance/history/${targetUserId}?start_date=${cycleValue}`);
      if (!response.ok) throw new Error("Failed to fetch history");
      const data = await response.json();
      setHistoryRecords(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load attendance history:", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleApproveToday = async (empUserId: number) => {
    setIsPageLoading(true);
    try {
      const todayStr = new Date().toISOString().split("T")[0];
      const response = await fetch(`${BASE_URL}/attendance/approve/${empUserId}?date=${todayStr}`, {
        method: "PUT",
      });
      if (response.ok) {
        await loadTeamAttendance();
      } else {
        console.error("Failed to approve today's attendance");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsPageLoading(false);
    }
  };

  const handleRejectToday = async (empUserId: number) => {
    setIsPageLoading(true);
    try {
      const todayStr = new Date().toISOString().split("T")[0];
      const response = await fetch(`${BASE_URL}/attendance/reject/${empUserId}?date=${todayStr}`, {
        method: "PUT",
      });
      if (response.ok) {
        await loadTeamAttendance();
      } else {
        console.error("Failed to reject today's attendance");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsPageLoading(false);
    }
  };

  useEffect(() => {
    const fetchMonths = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(`${BASE_URL}/attendance/available-months`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          setAvailableMonths(data);
        }
      } catch (err) {
        console.error("Failed to load available cycles:", err);
      }
    };
    fetchMonths();
  }, [BASE_URL]);

  // ==========================
  // LOAD TEAM MEMBERS & ATTENDANCE & YESTERDAY SUMMARY
  // ==========================
  const loadAllManagerData = async () => {
    setIsPageLoading(true);
    try {
      await Promise.all([
        loadTeamMembers(currentViewedManagerId),
        loadTeamAttendance(currentViewedManagerId),
        loadYesterdaySummary()
      ]);
      await loadManagerInfo();
    } catch (err) {
      console.error("Failed to load manager data:", err);
    } finally {
      setIsPageLoading(false);
    }
  };

  useEffect(() => {
    loadAllManagerData();
  }, [currentViewedManagerId]);

  useEffect(() => {
    if (teamAttendance.length > 0) {
      const highlightIdStr = localStorage.getItem("highlightEmployeeId");
      if (highlightIdStr) {
        const targetId = Number(highlightIdStr);
        setHighlightedEmployeeId(targetId);

        setTimeout(() => {
          const el = document.getElementById(`employee-row-${targetId}`) || document.getElementById(`employee-card-${targetId}`);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }, 600);

        const timer = setTimeout(() => {
          setHighlightedEmployeeId(null);
          localStorage.removeItem("highlightEmployeeId");
        }, 5000);

        return () => clearTimeout(timer);
      }
    }
  }, [teamAttendance]);

  useEffect(() => {
    const handleRefresh = () => {
      loadTeamAttendance(currentViewedManagerId);
      loadYesterdaySummary();
    };

    socket.on("attendance_update", handleRefresh);
    socket.on("attendance_approved_all", handleRefresh);
    socket.on("leave_update", handleRefresh);
    socket.on("shift_update", handleRefresh);

    socket.on("employee_profile_update", (payload: any) => {
      handleRefresh();
      setTeamMembers((prev) =>
        prev.map((m) =>
          m.id === payload.id
            ? {
              ...m,
              role: payload.designation || m.role,
              name: `${payload.first_name} ${payload.last_name}`,
              email: payload.email,
            }
            : m
        )
      );
    });

    return () => {
      socket.off("attendance_update", handleRefresh);
      socket.off("attendance_approved_all", handleRefresh);
      socket.off("leave_update", handleRefresh);
      socket.off("shift_update", handleRefresh);
      socket.off("employee_profile_update");
    };
  }, [managerName, currentViewedManagerId]);

  const loadManagerInfo = async () => {
    try {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const user = JSON.parse(userStr);
        setManagerName(user.full_name || user.name || "Manager");
      }
    } catch { }
  };

  const loadTeamMembers = async (viewedUserId = currentViewedManagerId) => {
    try {
      const response = await fetch(`${BASE_URL}/employees/my-team/${viewedUserId}`);
      const data = await response.json();
      const formattedMembers = data.map((emp: any) => ({
        id: emp.id,
        user_id: emp.user_id || emp.id,
        employee_id: emp.employee_id || emp.employee_code || (emp.id ? `EMP${emp.id}` : ""),
        avatar: emp.name
          ? emp.name
            .split(" ")
            .map((n: string) => n[0])
            .join("")
            .substring(0, 2)
            .toUpperCase()
          : "EM",
        name: emp.name || "",
        email: emp.email || "",
        role: emp.designation || "Employee",
        designation: emp.designation || "Employee",
        department: emp.department || "",
        tasksCompleted: emp.tasks_completed || 0,
        efficiency: emp.efficiency || 0,
        hoursThisWeek: emp.hours_this_week || 0,
        status: emp.status || "Active",
      }));
      setTeamMembers(formattedMembers);
    } catch (error) {
      console.error("Failed to load team members", error);
    }
  };

  const loadTeamAttendance = async (viewedUserId = currentViewedManagerId) => {
    try {
      const response = await fetch(`${BASE_URL}/employees/team-attendance/${viewedUserId}`);
      const data = await response.json();
      setTeamAttendance(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load team attendance", error);
    }
  };

  const loadYesterdaySummary = async () => {
    try {
      setLoadingYesterday(true);
      const response = await fetch(`${BASE_URL}/employees/reporting-employees/${userId}`);
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        setYesterdaySummary(data);
        setYesterdaySummaryDate(data[0]?.summary_date_formatted || "");
      } else {
        setYesterdaySummary([]);
      }
    } catch (error) {
      console.error("Failed to load yesterday summary", error);
    } finally {
      setLoadingYesterday(false);
    }
  };

  const handleApproveYesterday = async (empId: number, dateStr: string) => {
    try {
      const response = await fetch(`${BASE_URL}/attendance/approve/${empId}?date=${dateStr}`, {
        method: "PUT",
      });
      if (response.ok) {
        loadYesterdaySummary();
      }
    } catch (error) {
      console.error("Approve yesterday failed:", error);
    }
  };

  const handleNeedClarificationYesterday = async (empId: number, dateStr: string) => {
    try {
      const response = await fetch(`${BASE_URL}/attendance/need-clarification/${empId}?date=${dateStr}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "" }),
      });
      if (response.ok) {
        loadYesterdaySummary();
      }
    } catch (error) {
      console.error("Need clarification failed:", error);
    }
  };


  // Leave requests logic moved to LeaveApprovalPage

  // ==========================
  // SCOPED TEAM MEMBERS
  // ==========================
  const scopedTeamMembers = useMemo(() => {
    if (teamAttendance.length === 0) {
      return teamMembers;
    }

    return teamAttendance.map((att: any) => {
      const match = teamMembers.find(
        (m) =>
          (att.id != null && m.id === att.id) ||
          (att.email && m.email && m.email.toLowerCase() === att.email.toLowerCase()),
      );

      const isOnLeave = att.attendance_status === "On Leave";

      return {
        id: att.id ?? match?.id,
        user_id: att.user_id || match?.user_id || att.id || match?.id,
        employee_id: att.employee_id || match?.employee_id || (att.id ? `EMP${att.id}` : ""),
        name: att.name || match?.name || "",
        email: match?.email || att.email || "",
        role: att.designation || match?.role || "Employee",
        designation: att.designation || match?.role || "Employee",
        department: att.department || "",
        avatar:
          match?.avatar ||
          (att.name
            ? att.name
              .split(" ")
              .map((n: string) => n[0])
              .join("")
              .substring(0, 2)
              .toUpperCase()
            : "EM"),
        tasksCompleted: match?.tasksCompleted ?? 0,
        efficiency: match?.efficiency ?? 0,
        hoursThisWeek: match?.hoursThisWeek ?? att.working_hours ?? 0,
        status: isOnLeave ? "Leave" : match?.status || "Active",
        isWfh: att.is_wfh || false,
        isPermanentWfh: att.is_permanent_wfh || false,
        isShiftChanged: att.is_shift_changed || false,
        attendanceStatus: att.attendance_status || "",
        profile_image: att.profile_image,
        check_in: att.check_in,
        check_out: att.check_out,
        working_hours: att.working_hours,
        card_check_in: att.card_check_in,
        card_check_out: att.card_check_out,
        card_working_hours: att.card_working_hours,
        lunch_minutes: att.lunch_minutes,
        tea_minutes: att.tea_minutes,
        shift: att.shift,
        manager_status: att.manager_status,
        attendance_status: att.attendance_status || "",
        is_reporting_manager: att.is_reporting_manager || match?.is_reporting_manager || false,
        report_count: att.report_count ?? match?.report_count ?? 0,
        reporting_manager: att.reporting_manager || match?.reporting_manager || "",
        permission_from: att.permission_from,
        permission_to: att.permission_to,
        is_permission: att.is_permission,
        permission_hours: att.permission_hours,
      };
    });
  }, [teamAttendance, teamMembers]);

  const departments = useMemo(() => {
    const s = new Set<string>();
    scopedTeamMembers.forEach((m) => { if (m.department) s.add(m.department); });
    return ["All", ...Array.from(s)];
  }, [scopedTeamMembers]);

  const designations = useMemo(() => {
    const s = new Set<string>();
    scopedTeamMembers.forEach((m) => { if (m.designation) s.add(m.designation); });
    return ["All", ...Array.from(s)];
  }, [scopedTeamMembers]);

  const managersList = useMemo(() => {
    const s = new Set<string>();
    scopedTeamMembers.forEach((m) => { if (m.reporting_manager) s.add(m.reporting_manager); });
    return ["All", ...Array.from(s)];
  }, [scopedTeamMembers]);

  const shiftsList = useMemo(() => {
    const s = new Set<string>();
    scopedTeamMembers.forEach((m) => { if (m.shift) s.add(m.shift); });
    return ["All", ...Array.from(s)];
  }, [scopedTeamMembers]);

  // ==========================
  // TEAM STATS
  // ==========================
  const activeCount = useMemo(
    () => scopedTeamMembers.filter((member) => member.status === "Active").length,
    [scopedTeamMembers],
  );

  const leaveCount = useMemo(
    () => scopedTeamMembers.filter((member) => member.status === "Leave").length,
    [scopedTeamMembers],
  );

  const totalTasks = useMemo(
    () => scopedTeamMembers.reduce((sum, member) => sum + (member.tasksCompleted || 0), 0),
    [scopedTeamMembers],
  );

  const wfhCount = useMemo(
    () => scopedTeamMembers.filter((member) => member.isWfh).length,
    [scopedTeamMembers],
  );

  const shiftChangedCount = useMemo(
    () => scopedTeamMembers.filter((member) => member.isShiftChanged).length,
    [scopedTeamMembers],
  );

  const avgEfficiency = useMemo(
    () =>
      scopedTeamMembers.length > 0
        ? Math.round(
          scopedTeamMembers.reduce((sum, member) => sum + (member.efficiency || 0), 0) /
          scopedTeamMembers.length,
        )
        : 0,
    [scopedTeamMembers],
  );

  // Pending leave calculation removed

  // ==========================
  // FILTER MEMBERS
  // ==========================
  const filteredMembers = scopedTeamMembers.filter((member) => {
    const matchesSearch =
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.designation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase());

    let matchesFilter = false;
    if (filterStatus === "All") {
      matchesFilter = true;
    } else if (filterStatus === "Present") {
      matchesFilter = !!member.check_in || !!member.card_check_in || member.attendanceStatus === "Present" || member.attendanceStatus === "Checked Out" || member.attendanceStatus === "Half Day";
    } else if (filterStatus === "Not Checked In") {
      matchesFilter = !member.check_in && !member.card_check_in && member.attendanceStatus !== "Present" && member.attendanceStatus !== "Checked Out" && member.attendanceStatus !== "Half Day";
    } else if (filterStatus === "Leave") {
      matchesFilter = member.status === "Leave" || member.attendanceStatus === "On Leave";
    } else if (filterStatus === "WFH") {
      matchesFilter = !!member.isWfh;
    } else if (filterStatus === "Shift Changed") {
      matchesFilter = !!member.isShiftChanged;
    } else {
      matchesFilter = member.status === filterStatus;
    }

    return matchesSearch && matchesFilter;
  });

  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 85) return THEME.success;
    if (efficiency >= 70) return THEME.warning;
    return THEME.danger;
  };



  const notCheckedInCount = useMemo(
    () =>
      teamAttendance.filter(
        (m) =>
          !m.check_in &&
          !m.card_check_in &&
          m.attendance_status !== "Present" &&
          m.attendance_status !== "Checked Out" &&
          m.attendance_status !== "Half Day",
      ).length,
    [teamAttendance],
  );

  const statCards = [
    {
      label: "Team Members",
      value: teamAttendance.length,
      sub: "Direct reports",
      icon: UsersIcon,
      tone: "default",
    },
    {
      label: "Present Today",
      value: teamAttendance.filter(
        (m) =>
          !!m.check_in ||
          !!m.card_check_in ||
          m.attendance_status === "Present" ||
          m.attendance_status === "Checked Out" ||
          m.attendance_status === "Half Day",
      ).length,
      sub: "Checked in (Web/Card)",
      icon: CheckCircleIcon,
      tone: "success",
    },
    {
      label: "Not Checked In",
      value: notCheckedInCount,
      sub: "Pending check-in today",
      icon: ArrowRightOnRectangleIcon,
      tone: "default",
    },
    {
      label: "On Leave",
      value: teamAttendance.filter((m) => m.attendance_status === "On Leave").length,
      sub: "Approved leave",
      icon: CalendarDaysIcon,
      tone: "warning",
    },
    {
      label: "Work From Home",
      value: wfhCount,
      sub: "Approved WFH today",
      icon: HomeIcon,
      tone: "info",
    },
    {
      label: "Shift Changed",
      value: shiftChangedCount,
      sub: "Approved change today",
      icon: ArrowPathIcon,
      tone: "default",
    },
  ];

  const getStatTone = (tone: string) => {
    switch (tone) {
      case "success":
        return {
          iconBg: THEME.successBg,
          iconColor: THEME.success,
        };
      case "warning":
        return {
          iconBg: THEME.warningBg,
          iconColor: THEME.warning,
        };
      case "danger":
        return {
          iconBg: THEME.dangerBg,
          iconColor: THEME.danger,
        };
      case "info":
        return {
          iconBg: "#E0F2FE",
          iconColor: "#0284C7",
        };
      default:
        return {
          iconBg: THEME.surfaceMuted,
          iconColor: THEME.navy,
        };
    }
  };

  const getAttendanceStatusStyle = (status: string) => {
    switch (status) {
      case "Present":
        return {
          bg: "#ecfdf5",
          border: "#bbf7d0",
          text: "#166534",
          dot: "#16a34a",
          pillBg: "#dcfce7",
        };
      case "Checked Out":
        return {
          bg: "#eff6ff",
          border: "#bfdbfe",
          text: "#1d4ed8",
          dot: "#2563eb",
          pillBg: "#dbeafe",
        };
      case "On Leave":
        return {
          bg: "#fff7ed",
          border: "#fed7aa",
          text: "#c2410c",
          dot: "#ea580c",
          pillBg: "#ffedd5",
        };
      case "Half Day":
        return {
          bg: "#f3e8ff",
          border: "#e9d5ff",
          text: "#6b21a8",
          dot: "#a855f7",
          pillBg: "#f3e8ff",
        };
      default:
        return {
          bg: "#fef2f2",
          border: "#fecaca",
          text: "#b91c1c",
          dot: "#dc2626",
          pillBg: "#fee2e2",
        };
    }
  };

  if (isPageLoading) {
    return <BookLoader />;
  }

  return (
    <div
      className="min-h-screen"
      style={{
        background:
          "linear-gradient(180deg, #f8fafc 0%, #f8fafc 55%, #f1f5f9 100%)",
        color: THEME.text,
      }}
    >
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 30,
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(14px)",
          borderBottom: `1px solid ${THEME.border}`,
        }}
      >
        <div
          style={{
            maxWidth: "1400px",
            margin: "0 auto",
            padding: "16px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div
              style={{
                width: "46px",
                height: "46px",
                borderRadius: "14px",
                background: `linear-gradient(135deg, ${THEME.primary} 0%, ${THEME.primaryDark} 100%)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 10px 20px rgba(15, 118, 110, 0.22)",
              }}
            >
              <Cog6ToothIcon style={{ width: "22px", height: "22px", color: "#fff" }} />
            </div>

            <div>
              <div
                style={{
                  fontSize: "20px",
                  fontWeight: 800,
                  color: THEME.navy,
                  lineHeight: 1.2,
                }}
              >
                Manager Dashboard
              </div>
              <div
                style={{
                  fontSize: "13px",
                  color: THEME.textSoft,
                  marginTop: "4px",
                }}
              >
                Professional team operations, attendance monitoring, and leave control
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <div
              style={{
                padding: "10px 14px",
                borderRadius: "12px",
                background: THEME.surface,
                border: `1px solid ${THEME.border}`,
                color: THEME.textSoft,
                fontSize: "13px",
                fontWeight: 600,
              }}
            >
              {new Date().toLocaleDateString("en-IN", {
                weekday: "short",
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </div>

            <div style={{ position: "relative" }}>
              <button
                onClick={() => setShowExportDropdown(!showExportDropdown)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "9px 16px",
                  borderRadius: "12px",
                  border: "none",
                  background: THEME.navy,
                  color: "#fff",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "0 4px 10px rgba(15,23,42,0.15)",
                  height: "42px",
                }}
              >
                <ArrowDownTrayIcon style={{ width: "16px", height: "16px" }} />
                Export Team Attendance
              </button>

              {showExportDropdown && availableMonths.length > 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    right: 0,
                    marginTop: "8px",
                    minWidth: "280px",
                    borderRadius: "12px",
                    border: `1px solid ${THEME.border}`,
                    background: THEME.surface,
                    boxShadow: "0 12px 32px rgba(15, 23, 42, 0.15)",
                    zIndex: 50,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      padding: "10px 12px",
                      borderBottom: `1px solid ${THEME.border}`,
                      background: THEME.surfaceSoft,
                      fontSize: "12px",
                      fontWeight: 600,
                      color: THEME.textSoft,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Select Month
                  </div>
                  {availableMonths.map((m: any) => (
                    <button
                      key={`${m.month}-${m.year}`}
                      onClick={async () => {
                        setShowExportDropdown(false);
                        try {
                          let url = `${BASE_URL}/attendance/export-monthly?manager_id=${userId}`;
                          url += `&month=${m.month}&year=${m.year}`;
                          const token = localStorage.getItem("token");
                          const response = await fetch(url, {
                            headers: { "Authorization": `Bearer ${token}` }
                          });
                          const blob = await response.blob();
                          const urlBlob = window.URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = urlBlob;
                          a.download = `Team_Attendance_Report_${m.label.replace(/\s+/g, "_")}.xlsx`;
                          document.body.appendChild(a);
                          a.click();
                          a.remove();
                        } catch (error) {
                          console.error("Failed to download team attendance report:", error);
                        }
                      }}
                      style={{
                        width: "100%",
                        padding: "12px 16px",
                        border: "none",
                        background: "transparent",
                        color: THEME.text,
                        fontSize: "13px",
                        fontWeight: 500,
                        cursor: "pointer",
                        textAlign: "left",
                        transition: "all 0.2s ease",
                        borderBottom: `1px solid ${THEME.border}`,
                      }}
                      onMouseEnter={(e) => {
                        (e.target as HTMLElement).style.background = THEME.surfaceMuted;
                      }}
                      onMouseLeave={(e) => {
                        (e.target as HTMLElement).style.background = "transparent";
                      }}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {showExportDropdown && (
              <div
                style={{
                  position: "fixed",
                  inset: 0,
                  zIndex: 40,
                }}
                onClick={() => setShowExportDropdown(false)}
              />
            )}
          </div>
        </div>
      </header>

      <main style={{ maxWidth: "1400px", margin: "0 auto", padding: "28px 24px 40px" }}>
        <div style={{ display: "grid", gap: "24px" }}>
          {/* Hero summary */}


          {/* Summary cards */}
          <section
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: "14px",
            }}
          >
            {statCards.map((card) => {
              const tone = getStatTone(card.tone);
              const Icon = card.icon;

              const isSelected = (() => {
                if (card.label === "Team Members" && attendanceFilter === "All") return true;
                if (card.label === "Present Today" && attendanceFilter === "Present") return true;
                if (card.label === "Not Checked In" && attendanceFilter === "Not Checked In") return true;
                if (card.label === "On Leave" && attendanceFilter === "Leave") return true;
                if (card.label === "Work From Home" && attendanceFilter === "WFH") return true;
                if (card.label === "Shift Changed" && attendanceFilter === "Shift Changed") return true;
                return false;
              })();

              return (
                <div
                  key={card.label}
                  onClick={() => {
                    const statusMap: Record<string, string> = {
                      "Team Members": "All",
                      "Present Today": "Present",
                      "Not Checked In": "Not Checked In",
                      "On Leave": "Leave",
                      "Work From Home": "WFH",
                      "Shift Changed": "Shift Changed",
                    };
                    setAttendanceFilter(statusMap[card.label] || "All");
                  }}
                  style={{
                    background: THEME.surface,
                    borderRadius: "14px",
                    border: isSelected
                      ? `2px solid ${tone.iconColor}`
                      : `1px solid ${THEME.border}`,
                    boxShadow: isSelected
                      ? "0 6px 16px -4px rgba(0, 0, 0, 0.08)"
                      : "0 2px 10px rgba(15, 23, 42, 0.03)",
                    padding: isSelected ? "8px 12px" : "9px 12px",
                    cursor: "pointer",
                    transform: isSelected ? "scale(1.01)" : "scale(1)",
                    transition: "all 0.2s ease-in-out",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "6px",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: "10px",
                          fontWeight: 700,
                          color: THEME.textLight,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                        }}
                      >
                        {card.label}
                      </div>
                      <div
                        style={{
                          marginTop: "2px",
                          fontSize: "20px",
                          fontWeight: 800,
                          lineHeight: 1.1,
                          color: THEME.navy,
                        }}
                      >
                        {card.value}
                      </div>
                      <div
                        style={{
                          marginTop: "2px",
                          fontSize: "10px",
                          color: THEME.textSoft,
                        }}
                      >
                        {card.sub}
                      </div>
                    </div>

                    <div
                      style={{
                        width: "30px",
                        height: "30px",
                        borderRadius: "8px",
                        background: tone.iconBg,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Icon style={{ width: "16px", height: "16px", color: tone.iconColor }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </section>

          {/* Team attendance section */}
          <section
            style={{
              background: THEME.surface,
              borderRadius: "24px",
              border: `1px solid ${THEME.border}`,
              boxShadow: THEME.shadow,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "24px 24px 18px",
                borderBottom: `1px solid ${THEME.border}`,
                background: "linear-gradient(180deg, #ffffff 0%, #fbfdff 100%)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "16px",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                  <div
                    style={{
                      width: "48px",
                      height: "48px",
                      borderRadius: "16px",
                      background: THEME.primarySoft,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <UsersIcon style={{ width: "24px", height: "24px", color: THEME.primary }} />
                  </div>

                  <div>
                    <div
                      style={{
                        fontSize: "20px",
                        fontWeight: 800,
                        color: THEME.navy,
                        lineHeight: 1.2,
                      }}
                    >
                      Team Members
                    </div>
                    <div
                      style={{
                        marginTop: "4px",
                        fontSize: "13px",
                        color: THEME.textSoft,
                      }}
                    >
                      Daily attendance records for your direct reporting team
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ position: "relative" }}>
                    <MagnifyingGlassIcon
                      style={{
                        width: "16px",
                        height: "16px",
                        position: "absolute",
                        left: "12px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: THEME.textLight,
                      }}
                    />
                    <input
                      type="text"
                      placeholder="Search employee"
                      value={attendanceSearch}
                      onChange={(e) => setAttendanceSearch(e.target.value)}
                      style={{
                        width: "220px",
                        height: "42px",
                        paddingLeft: "38px",
                        paddingRight: "14px",
                        borderRadius: "12px",
                        border: `1px solid ${THEME.border}`,
                        background: THEME.surface,
                        outline: "none",
                        fontSize: "14px",
                        color: THEME.text,
                      }}
                    />
                  </div>



                  <div style={{ display: "flex", background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: "12px", overflow: "hidden", height: "42px" }}>
                    <button
                      onClick={() => setViewMode("grid")}
                      style={{
                        padding: "0 14px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: viewMode === "grid" ? THEME.primary : "transparent",
                        color: viewMode === "grid" ? "#ffffff" : THEME.textLight,
                        border: "none",
                        outline: "none",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                      }}
                      title="Grid View"
                    >
                      <Squares2X2Icon style={{ width: "20px", height: "20px" }} />
                    </button>
                    <div style={{ width: "1px", background: THEME.border }} />
                    <button
                      onClick={() => setViewMode("list")}
                      style={{
                        padding: "0 14px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: viewMode === "list" ? THEME.primary : "transparent",
                        color: viewMode === "list" ? "#ffffff" : THEME.textLight,
                        border: "none",
                        outline: "none",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                      }}
                      title="List View"
                    >
                      <ListBulletIcon style={{ width: "20px", height: "20px" }} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ padding: "24px" }}>
              {/* Breadcrumbs for manager team hierarchy */}
              {managerPath.length > 1 && (
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "20px",
                  fontSize: "14px",
                  color: THEME.textSoft,
                  background: THEME.surfaceSoft,
                  padding: "10px 18px",
                  borderRadius: "12px",
                  border: `1px solid ${THEME.border}`,
                  width: "fit-content"
                }}>
                  <UsersIcon style={{ width: "16px", height: "16px", color: THEME.primary }} />
                  <span style={{ fontWeight: 600, color: THEME.navy }}>Viewing Team:</span>
                  {managerPath.map((mgr, index) => (
                    <React.Fragment key={mgr.id}>
                      {index > 0 && <span style={{ color: THEME.textLight }}>&gt;</span>}
                      {index === managerPath.length - 1 ? (
                        <span style={{ fontWeight: 700, color: THEME.primary }}>{mgr.name}</span>
                      ) : (
                        <button
                          onClick={() => {
                            const newPath = managerPath.slice(0, index + 1);
                            setManagerPath(newPath);
                          }}
                          style={{
                            background: "none",
                            border: "none",
                            color: THEME.textSoft,
                            textDecoration: "underline",
                            cursor: "pointer",
                            padding: 0,
                            font: "inherit",
                            fontWeight: 500
                          }}
                        >
                          {mgr.name}
                        </button>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              )}

              {teamAttendance.length === 0 ? (
                <div
                  style={{
                    border: `1px dashed ${THEME.border}`,
                    borderRadius: "20px",
                    padding: "60px 20px",
                    textAlign: "center",
                    background: THEME.surfaceSoft,
                  }}
                >
                  <UsersIcon
                    style={{
                      width: "40px",
                      height: "40px",
                      margin: "0 auto 14px",
                      color: THEME.textLight,
                    }}
                  />
                  <div
                    style={{
                      fontSize: "18px",
                      fontWeight: 700,
                      color: THEME.navy,
                    }}
                  >
                    No team members found
                  </div>
                  <div
                    style={{
                      marginTop: "6px",
                      fontSize: "14px",
                      color: THEME.textSoft,
                    }}
                  >
                    No team members are currently mapped under your reporting line.
                  </div>
                </div>
              ) : viewMode === "grid" ? (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                    gap: "18px",
                    maxHeight: "calc(100vh - 350px)",
                    overflowY: "auto",
                    paddingRight: "4px",
                  }}
                >
                  {scopedTeamMembers
                    .filter((m) => {
                      const matchSearch =
                        m.name.toLowerCase().includes(attendanceSearch.toLowerCase()) ||
                        (m.designation || "")
                          .toLowerCase()
                          .includes(attendanceSearch.toLowerCase());

                      let matchFilter = false;
                      if (attendanceFilter === "All") {
                        matchFilter = true;
                      } else if (attendanceFilter === "Present") {
                        matchFilter = m.attendance_status === "Present" || m.attendance_status === "Checked Out" || m.attendance_status === "Half Day";
                      } else if (attendanceFilter === "Not Checked In") {
                        matchFilter = !m.check_in && !m.card_check_in && m.attendance_status !== "Present" && m.attendance_status !== "Checked Out" && m.attendance_status !== "Half Day";
                      } else if (attendanceFilter === "Leave") {
                        matchFilter = m.status === "Leave" || m.attendance_status === "On Leave";
                      } else if (attendanceFilter === "WFH") {
                        matchFilter = !!m.isWfh;
                      } else if (attendanceFilter === "Shift Changed") {
                        matchFilter = !!m.isShiftChanged;
                      } else {
                        matchFilter = m.attendance_status === attendanceFilter;
                      }

                      const matchDept = deptFilter === "All" || m.department === deptFilter;
                      const matchDesig = desigFilter === "All" || m.designation === desigFilter;
                      const matchMgr = mgrFilter === "All" || m.reporting_manager === mgrFilter;
                      const matchShift = shiftFilter === "All" || m.shift === shiftFilter;

                      return matchSearch && matchFilter && matchDept && matchDesig && matchMgr && matchShift;
                    })
                    .map((member) => {
                      const status = member.attendance_status;
                      const statusStyle = getAttendanceStatusStyle(status);
                      const isPresent = status === "Present";
                      const isCheckedOut = status === "Checked Out";

                      const initials = member.name
                        .split(" ")
                        .map((n: string) => n[0])
                        .join("")
                        .substring(0, 2)
                        .toUpperCase();

                      return (
                        <div
                          id={`employee-card-${member.id}`}
                          key={member.id}
                          onMouseEnter={() => setHoveredCardId(member.id)}
                          onMouseLeave={() => setHoveredCardId(null)}
                          onClick={() => handleMemberClick(member)}
                          style={{
                            background: statusStyle.bg,
                            border: highlightedEmployeeId === member.id ? `2px solid #3b82f6` : `1px solid ${statusStyle.border}`,
                            borderRadius: "22px",
                            padding: "18px",
                            boxShadow: highlightedEmployeeId === member.id ? "0 0 0 4px rgba(59, 130, 246, 0.4), 0 10px 25px rgba(15,23,42,0.08)" : (hoveredCardId === member.id ? "0 10px 25px rgba(15,23,42,0.08)" : "0 2px 10px rgba(15,23,42,0.03)"),
                            transform: hoveredCardId === member.id ? "translateY(-4px)" : "none",
                            cursor: "pointer",
                            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                            animation: highlightedEmployeeId === member.id ? "pulse 1.5s infinite" : "none",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "flex-start",
                              gap: "14px",
                              marginBottom: "16px",
                            }}
                          >
                            <div style={{ display: "flex", gap: "12px", minWidth: 0 }}>
                              <div style={{ position: "relative", flexShrink: 0 }}>
                                {member.profile_image ? (
                                  <img
                                    src={getProfileImageUrl(member.profile_image, member.employee_id || member.id)}
                                    alt={member.name}
                                    style={{
                                      width: "52px",
                                      height: "52px",
                                      borderRadius: "16px",
                                      objectFit: "cover",
                                      border: "2px solid #fff",
                                    }}
                                  />
                                ) : (
                                  <div
                                    style={{
                                      width: "52px",
                                      height: "52px",
                                      borderRadius: "16px",
                                      background: `linear-gradient(135deg, ${THEME.primary} 0%, ${THEME.primaryDark} 100%)`,
                                      color: "#fff",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      fontSize: "15px",
                                      fontWeight: 800,
                                      border: "2px solid #fff",
                                    }}
                                  >
                                    {initials}
                                  </div>
                                )}

                                <div
                                  style={{
                                    position: "absolute",
                                    right: "-2px",
                                    bottom: "-2px",
                                    width: "14px",
                                    height: "14px",
                                    borderRadius: "999px",
                                    background: statusStyle.dot,
                                    border: "2px solid #fff",
                                  }}
                                />
                              </div>

                              <div style={{ minWidth: 0 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                                  <div
                                    style={{
                                      fontSize: "15px",
                                      fontWeight: 800,
                                      color: THEME.navy,
                                      whiteSpace: "nowrap",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                    }}
                                  >
                                    {member.name}
                                  </div>
                                  {member.permission_hours > 0 && (
                                    <span
                                      title={`Permission: ${member.permission_from} - ${member.permission_to}`}
                                      style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "3px",
                                        padding: "2px 7px",
                                        borderRadius: "999px",
                                        background: "#f3e8ff",
                                        border: "1px solid #d8b4fe",
                                        color: "#6b21a8",
                                        fontSize: "10px",
                                        fontWeight: 800,
                                        flexShrink: 0,
                                      }}
                                    >
                                      Permission: {member.permission_hours} hr{member.permission_hours !== 1 ? "s" : ""}
                                    </span>
                                  )}
                                  {member.is_reporting_manager && (
                                    <span
                                      title={`This employee manages ${member.report_count || 0} team members`}
                                      style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "4px",
                                        padding: "3px 10px",
                                        borderRadius: "6px",
                                        background: "#f0fdf4",
                                        border: "1px solid #bbf7d0",
                                        color: "#166534",
                                        fontSize: "11px",
                                        fontWeight: 700,
                                        flexShrink: 0,
                                        whiteSpace: "nowrap",
                                      }}
                                    >
                                      <span>👥</span>
                                      <span>People Manager ({member.report_count || 0})</span>
                                    </span>
                                  )}
                                  {member.isWfh && (
                                    <span
                                      title={member.isPermanentWfh ? "Permanent Work From Home" : "Work From Home (WFH)"}
                                      style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "4px",
                                        padding: "2px 7px",
                                        borderRadius: "999px",
                                        background: "#eff6ff",
                                        border: "1px solid #bfdbfe",
                                        color: "#1d4ed8",
                                        fontSize: "10px",
                                        fontWeight: 800,
                                        flexShrink: 0,
                                      }}
                                    >
                                      <img
                                        src="/wfh-icon.svg"
                                        alt="WFH"
                                        style={{
                                          width: "13px",
                                          height: "13px",
                                        }}
                                      />
                                    </span>
                                  )}
                                </div>

                                <div
                                  style={{
                                    marginTop: "3px",
                                    fontSize: "12px",
                                    color: THEME.textSoft,
                                  }}
                                >
                                  {member.employee_id || "Employee ID not available"}
                                </div>

                                <div
                                  style={{
                                    marginTop: "8px",
                                    display: "flex",
                                    gap: "8px",
                                    flexWrap: "wrap",
                                  }}
                                >
                                  {member.designation && (
                                    <span
                                      style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "5px",
                                        padding: "5px 9px",
                                        borderRadius: "999px",
                                        background: "#fff",
                                        border: `1px solid ${THEME.border}`,
                                        fontSize: "11px",
                                        color: THEME.textSoft,
                                        fontWeight: 600,
                                      }}
                                    >
                                      <BriefcaseIcon style={{ width: "12px", height: "12px" }} />
                                      {member.designation}
                                    </span>
                                  )}

                                  {member.department && (
                                    <span
                                      style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "5px",
                                        padding: "5px 9px",
                                        borderRadius: "999px",
                                        background: "#fff",
                                        border: `1px solid ${THEME.border}`,
                                        fontSize: "11px",
                                        color: THEME.textSoft,
                                        fontWeight: 600,
                                      }}
                                    >
                                      <BuildingOfficeIcon
                                        style={{ width: "12px", height: "12px" }}
                                      />
                                      {member.department}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div
                              style={{
                                padding: "7px 10px",
                                borderRadius: "999px",
                                background: statusStyle.pillBg,
                                color: statusStyle.text,
                                fontSize: "11px",
                                fontWeight: 800,
                                whiteSpace: "nowrap",
                                flexShrink: 0,
                              }}
                            >
                              {status}
                            </div>
                          </div>

                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "1fr 1fr",
                              gap: "10px",
                            }}
                          >
                            <div
                              style={{
                                background: "#fff",
                                borderRadius: "14px",
                                border: `1px solid ${THEME.border}`,
                                padding: "12px",
                              }}
                            >
                              <div
                                style={{
                                  fontSize: "11px",
                                  fontWeight: 700,
                                  color: THEME.textLight,
                                  textTransform: "uppercase",
                                  letterSpacing: "0.06em",
                                  marginBottom: "6px",
                                }}
                              >
                                Check In
                              </div>
                              <div
                                style={{
                                  fontSize: "15px",
                                  fontWeight: 800,
                                  color: THEME.navy,
                                }}
                              >
                                {member.check_in || "—"}
                              </div>
                            </div>

                            <div
                              style={{
                                background: "#fff",
                                borderRadius: "14px",
                                border: `1px solid ${THEME.border}`,
                                padding: "12px",
                              }}
                            >
                              <div
                                style={{
                                  fontSize: "11px",
                                  fontWeight: 700,
                                  color: THEME.textLight,
                                  textTransform: "uppercase",
                                  letterSpacing: "0.06em",
                                  marginBottom: "6px",
                                }}
                              >
                                Check Out
                              </div>
                              <div
                                style={{
                                  fontSize: "15px",
                                  fontWeight: 800,
                                  color: THEME.navy,
                                }}
                              >
                                {member.check_out || "—"}
                              </div>
                            </div>
                          </div>

                          {(isPresent || isCheckedOut) && (
                            <div style={{ marginTop: "14px" }}>
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  marginBottom: "8px",
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: "11px",
                                    color: THEME.textLight,
                                    fontWeight: 700,
                                    textTransform: "uppercase",
                                    letterSpacing: "0.06em",
                                  }}
                                >
                                  Working Hours
                                </span>

                                <span
                                  style={{
                                    fontSize: "12px",
                                    fontWeight: 800,
                                    color: statusStyle.text,
                                  }}
                                >
                                  {formatWorkingHours(member.working_hours)}
                                </span>
                              </div>

                              <div
                                style={{
                                  height: "8px",
                                  borderRadius: "999px",
                                  background: "#ffffff",
                                  border: `1px solid ${THEME.border}`,
                                  overflow: "hidden",
                                }}
                              >
                                <div
                                  style={{
                                    width: `${Math.min(((member.working_hours || 0) / 9) * 100, 100)}%`,
                                    height: "100%",
                                    borderRadius: "999px",
                                    background: `linear-gradient(90deg, ${statusStyle.dot} 0%, ${THEME.primary} 100%)`,
                                    transition: "width 0.4s ease",
                                  }}
                                />
                              </div>
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div style={{ display: "flex", gap: "8px", marginTop: "14px" }}>
                            {member.is_reporting_manager && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setManagerPath((prev) => [...prev, { id: member.user_id, name: member.name }]);
                                }}
                                style={{
                                  flex: 1,
                                  padding: "6px 12px",
                                  borderRadius: "10px",
                                  border: "none",
                                  background: THEME.primary,
                                  color: "#fff",
                                  fontSize: "12px",
                                  fontWeight: 600,
                                  cursor: "pointer",
                                  textAlign: "center",
                                }}
                              >
                                View Team
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                  e.stopPropagation();
                                  viewEmployeeHistory(member);
                              }}
                              style={{
                                flex: 1,
                                padding: "6px 12px",
                                borderRadius: "10px",
                                border: `1px solid ${THEME.border}`,
                                background: "#fff",
                                color: THEME.textSoft,
                                fontSize: "12px",
                                fontWeight: 600,
                                cursor: "pointer",
                                textAlign: "center",
                              }}
                            >
                              View History
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: "calc(100vh - 380px)", border: `1px solid ${THEME.border}`, borderRadius: "16px" }}>
                  <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, textAlign: "left", background: THEME.surface }}>
                    <thead style={{ position: "sticky", top: 0, zIndex: 20, background: "#f8fafc" }}>
                      <tr style={{ background: "#f8fafc", borderBottom: `1px solid ${THEME.border}`, fontSize: "11px", color: THEME.textSoft, textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em" }}>
                        <th rowSpan={2} style={{ position: "sticky", top: 0, zIndex: 20, background: "#f8fafc", padding: "14px 16px", borderBottom: `1px solid ${THEME.border}` }}>Employee</th>
                        <th rowSpan={2} style={{ position: "sticky", top: 0, zIndex: 20, background: "#f8fafc", padding: "14px 16px", borderBottom: `1px solid ${THEME.border}` }}>Employee ID</th>
                        <th rowSpan={2} style={{ position: "sticky", top: 0, zIndex: 20, background: "#f8fafc", padding: "8px 12px", minWidth: "140px", borderBottom: `1px solid ${THEME.border}` }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            <span>Department</span>
                            <CustomSelect
                              value={deptFilter}
                              onChange={setDeptFilter}
                              options={departments}
                              placeholder="All"
                            />
                          </div>
                        </th>
                        <th rowSpan={2} style={{ position: "sticky", top: 0, zIndex: 20, background: "#f8fafc", padding: "8px 12px", minWidth: "140px", borderBottom: `1px solid ${THEME.border}` }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            <span>Designation</span>
                            <CustomSelect
                              value={desigFilter}
                              onChange={setDesigFilter}
                              options={designations}
                              placeholder="All"
                            />
                          </div>
                        </th>
                        <th rowSpan={2} style={{ position: "sticky", top: 0, zIndex: 20, background: "#f8fafc", padding: "8px 12px", minWidth: "150px", borderBottom: `1px solid ${THEME.border}` }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            <span>Reporting Manager</span>
                            <CustomSelect
                              value={mgrFilter}
                              onChange={setMgrFilter}
                              options={managersList}
                              placeholder="All"
                            />
                          </div>
                        </th>
                        <th rowSpan={2} style={{ position: "sticky", top: 0, zIndex: 20, background: "#f8fafc", padding: "8px 12px", minWidth: "130px", borderBottom: `1px solid ${THEME.border}` }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            <span>Shift</span>
                            <CustomSelect
                              value={shiftFilter}
                              onChange={setShiftFilter}
                              options={shiftsList}
                              placeholder="All"
                            />
                          </div>
                        </th>
                        <th colSpan={3} style={{ position: "sticky", top: 0, zIndex: 20, padding: "10px 16px", textAlign: "center", borderBottom: `2px solid ${THEME.border}`, background: "#eff6ff", color: THEME.primary, fontWeight: 800 }}>Web Site Entry</th>
                        <th colSpan={3} style={{ position: "sticky", top: 0, zIndex: 20, padding: "10px 16px", textAlign: "center", borderBottom: `2px solid ${THEME.border}`, background: "#faf5ff", color: "#7e22ce", fontWeight: 800 }}>Biometric Card Entry</th>
                        <th rowSpan={2} style={{ position: "sticky", top: 0, zIndex: 20, background: "#f8fafc", padding: "14px 16px", borderBottom: `1px solid ${THEME.border}`, color: "#6b21a8", fontWeight: 800, textAlign: "center" }}>Permission</th>
                        <th rowSpan={2} style={{ position: "sticky", top: 0, zIndex: 20, background: "#f8fafc", padding: "8px 12px", minWidth: "120px", borderBottom: `1px solid ${THEME.border}` }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            <span>Status</span>
                            <CustomSelect
                              value={attendanceFilter}
                              onChange={setAttendanceFilter}
                              options={["All", "Present", "Checked Out", "Absent", "On Leave", "WFH", "Shift Changed"]}
                              placeholder="All"
                            />
                          </div>
                        </th>
                        <th rowSpan={2} style={{ padding: "14px 16px", minWidth: "140px", verticalAlign: "middle", textAlign: "center" }}>
                          Actions
                        </th>
                      </tr>
                      <tr style={{ background: "#f8fafc", fontSize: "10px", color: THEME.textSoft, textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em" }}>
                        <th style={{ position: "sticky", top: "36px", zIndex: 20, padding: "8px 16px", background: "#eff6ff", borderBottom: `1px solid ${THEME.border}` }}>Check In</th>
                        <th style={{ position: "sticky", top: "36px", zIndex: 20, padding: "8px 16px", background: "#eff6ff", borderBottom: `1px solid ${THEME.border}` }}>Check Out</th>
                        <th style={{ position: "sticky", top: "36px", zIndex: 20, padding: "8px 16px", background: "#eff6ff", borderBottom: `1px solid ${THEME.border}`, fontWeight: 700 }}>Hours</th>
                        <th style={{ position: "sticky", top: "36px", zIndex: 20, padding: "8px 16px", background: "#faf5ff", borderBottom: `1px solid ${THEME.border}` }}>Check In</th>
                        <th style={{ position: "sticky", top: "36px", zIndex: 20, padding: "8px 16px", background: "#faf5ff", borderBottom: `1px solid ${THEME.border}` }}>Check Out</th>
                        <th style={{ position: "sticky", top: "36px", zIndex: 20, padding: "8px 16px", background: "#faf5ff", borderBottom: `1px solid ${THEME.border}`, fontWeight: 700 }}>Hours</th>
                      </tr>
                    </thead>
                    <tbody style={{ fontSize: "13px", color: THEME.text, fontWeight: 500 }}>
                      {scopedTeamMembers
                        .filter((m) => {
                          const matchSearch =
                            m.name.toLowerCase().includes(attendanceSearch.toLowerCase()) ||
                            (m.designation || "")
                              .toLowerCase()
                              .includes(attendanceSearch.toLowerCase());

                          let matchFilter = false;
                          if (attendanceFilter === "All") {
                            matchFilter = true;
                          } else if (attendanceFilter === "Present") {
                            matchFilter = m.attendance_status === "Present" || m.attendance_status === "Checked Out" || m.attendance_status === "Half Day";
                          } else if (attendanceFilter === "Not Checked In") {
                            matchFilter = !m.check_in && !m.card_check_in && m.attendance_status !== "Present" && m.attendance_status !== "Checked Out" && m.attendance_status !== "Half Day";
                          } else if (attendanceFilter === "Leave") {
                            matchFilter = m.status === "Leave" || m.attendance_status === "On Leave";
                          } else if (attendanceFilter === "WFH") {
                            matchFilter = !!m.isWfh;
                          } else if (attendanceFilter === "Shift Changed") {
                            matchFilter = !!m.isShiftChanged;
                          } else {
                            matchFilter = m.attendance_status === attendanceFilter;
                          }

                          const matchDept = deptFilter === "All" || m.department === deptFilter;
                          const matchDesig = desigFilter === "All" || m.designation === desigFilter;
                          const matchMgr = mgrFilter === "All" || m.reporting_manager === mgrFilter;
                          const matchShift = shiftFilter === "All" || m.shift === shiftFilter;

                          return matchSearch && matchFilter && matchDept && matchDesig && matchMgr && matchShift;
                        })
                        .map((member) => {
                          const status = member.attendance_status;
                          const statusStyle = getAttendanceStatusStyle(status);

                          const initials = member.name
                            .split(" ")
                            .map((n: string) => n[0])
                            .join("")
                            .substring(0, 2)
                            .toUpperCase();

                          const managerStatus = member.manager_status || "Pending";
                          const managerStatusStyle =
                            managerStatus === "Approved"
                              ? { bg: THEME.successBg, text: THEME.success }
                              : managerStatus === "Rejected"
                                ? { bg: THEME.dangerBg, text: THEME.danger }
                                : { bg: THEME.warningBg, text: THEME.warning };

                          return (
                            <tr
                              id={`employee-row-${member.id}`}
                              key={member.id}
                              onMouseEnter={() => setHoveredRowId(member.id)}
                              onMouseLeave={() => setHoveredRowId(null)}
                              onClick={() => handleMemberClick(member)}
                              style={{
                                borderBottom: `1px solid ${THEME.border}`,
                                background: highlightedEmployeeId === member.id ? "rgba(59, 130, 246, 0.15)" : (hoveredRowId === member.id ? THEME.surfaceSoft : "transparent"),
                                cursor: "pointer",
                                transition: "background 0.2s ease",
                                animation: highlightedEmployeeId === member.id ? "pulse 1.5s infinite" : "none",
                              }}
                            >
                              <td style={{ padding: "12px 16px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                  {member.profile_image ? (
                                    <img
                                      src={getProfileImageUrl(member.profile_image, member.employee_id || member.id)}
                                      alt={member.name}
                                      style={{ width: "36px", height: "36px", borderRadius: "10px", objectFit: "cover" }}
                                    />
                                  ) : (
                                    <div
                                      style={{
                                        width: "36px",
                                        height: "36px",
                                        borderRadius: "10px",
                                        background: `linear-gradient(135deg, ${THEME.primary} 0%, ${THEME.primaryDark} 100%)`,
                                        color: "#fff",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: "12px",
                                        fontWeight: 800,
                                      }}
                                    >
                                      {initials}
                                    </div>
                                  )}
                                  <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                                    <span style={{ fontWeight: 700, color: THEME.navy }}>{member.name}</span>
                                    {member.permission_hours > 0 && (
                                      <span
                                        title={`Permission: ${member.permission_from} - ${member.permission_to}`}
                                        style={{
                                          display: "inline-flex",
                                          alignItems: "center",
                                          gap: "3px",
                                          padding: "2px 8px",
                                          borderRadius: "999px",
                                          background: "#f3e8ff",
                                          border: "1px solid #d8b4fe",
                                          color: "#6b21a8",
                                          fontSize: "10px",
                                          fontWeight: 800,
                                          flexShrink: 0,
                                        }}
                                      >
                                        Permission: {member.permission_hours} hr{member.permission_hours !== 1 ? "s" : ""}
                                      </span>
                                    )}
                                    {member.is_reporting_manager && (
                                      <span
                                        title={`This employee manages ${member.report_count || 0} team members`}
                                        style={{
                                          display: "inline-flex",
                                          alignItems: "center",
                                          gap: "4px",
                                          padding: "3px 10px",
                                          borderRadius: "6px",
                                          background: "#f0fdf4",
                                          border: "1px solid #bbf7d0",
                                          color: "#166534",
                                          fontSize: "11px",
                                          fontWeight: 700,
                                          flexShrink: 0,
                                          whiteSpace: "nowrap",
                                        }}
                                      >
                                        <span>👥</span>
                                        <span>People Manager ({member.report_count || 0})</span>
                                      </span>
                                    )}
                                    {member.isWfh && (
                                      <span
                                        title={member.isPermanentWfh ? "Permanent Work From Home" : "Work From Home (WFH)"}
                                        style={{
                                          display: "inline-flex",
                                          alignItems: "center",
                                          gap: "3px",
                                          padding: "2px 6px",
                                          borderRadius: "999px",
                                          background: "#eff6ff",
                                          border: "1px solid #bfdbfe",
                                          color: "#1d4ed8",
                                          fontSize: "10px",
                                          fontWeight: 800,
                                          flexShrink: 0,
                                        }}
                                      >
                                        <img
                                          src="/wfh-icon.svg"
                                          alt="WFH"
                                          style={{
                                            width: "13px",
                                            height: "13px",
                                          }}
                                        />
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td style={{ padding: "12px 16px", color: THEME.textSoft }}>{member.employee_id || "—"}</td>
                              <td style={{ padding: "12px 16px", color: THEME.textSoft }}>{member.department || "—"}</td>
                              <td style={{ padding: "12px 16px", color: THEME.textSoft }}>{member.designation || "—"}</td>
                              <td style={{ padding: "12px 16px", color: THEME.textSoft }}>{member.reporting_manager || "—"}</td>
                              <td style={{ padding: "12px 16px", color: THEME.textSoft }}>{member.shift || "General Shift"}</td>

                              {/* Web Entry Columns */}
                              <td style={{ padding: "12px 16px", background: "rgba(37,99,235,0.01)" }}>{member.check_in || "—"}</td>
                              <td style={{ padding: "12px 16px", background: "rgba(37,99,235,0.01)" }}>{member.check_out || "—"}</td>
                              <td style={{ padding: "12px 16px", background: "rgba(37,99,235,0.01)", fontWeight: 700 }}>
                                {formatWorkingHours(member.working_hours)}
                              </td>

                              {/* Card Entry Columns */}
                              <td style={{ padding: "12px 16px", background: "rgba(126,34,206,0.01)", color: "#7e22ce", fontWeight: 600 }}>{member.card_check_in || "—"}</td>
                              <td style={{ padding: "12px 16px", background: "rgba(126,34,206,0.01)", color: "#7e22ce", fontWeight: 600 }}>{member.card_check_out || "—"}</td>
                              <td style={{ padding: "12px 16px", background: "rgba(126,34,206,0.01)", fontWeight: 700, color: "#7e22ce" }}>
                                {formatWorkingHours(member.card_working_hours)}
                              </td>
                              <td style={{ padding: "12px 16px", color: "#6b21a8", fontWeight: 700, textAlign: "center" }}>
                                {member.permission_hours ? `${member.permission_hours} hr${member.permission_hours !== 1 ? "s" : ""}` : "—"}
                              </td>

                              <td style={{ padding: "12px 16px" }}>
                                <span
                                  style={{
                                    display: "inline-flex",
                                    padding: "4px 8px",
                                    borderRadius: "999px",
                                    background: statusStyle.pillBg,
                                    color: statusStyle.text,
                                    fontSize: "11px",
                                    fontWeight: 800,
                                  }}
                                >
                                  {status}
                                </span>
                              </td>
                              <td style={{ padding: "12px 16px", textAlign: "center" }}>
                                <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      viewEmployeeHistory(member);
                                    }}
                                    style={{
                                      padding: "6px 12px",
                                      borderRadius: "6px",
                                      border: `1px solid ${THEME.border}`,
                                      background: "#fff",
                                      color: THEME.textSoft,
                                      fontSize: "12px",
                                      fontWeight: 600,
                                      cursor: "pointer",
                                    }}
                                  >
                                    History
                                  </button>
                                  {member.is_reporting_manager && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setManagerPath((prev) => [...prev, { id: member.user_id, name: member.name }]);
                                      }}
                                      style={{
                                        padding: "6px 12px",
                                        borderRadius: "6px",
                                        border: "none",
                                        background: THEME.primary,
                                        color: "#fff",
                                        fontSize: "12px",
                                        fontWeight: 600,
                                        cursor: "pointer",
                                      }}
                                    >
                                      Team
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>

      {/* Yesterday's Attendance Summary */}
      {yesterdaySummary.length > 0 && (
        <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "0 24px 40px" }}>
          <section style={{
            background: "#fff",
            borderRadius: "24px",
            border: `1px solid ${THEME.border}`,
            boxShadow: THEME.shadow,
            overflow: "hidden",
          }}>
            {/* Header */}
            <div style={{ padding: "24px", borderBottom: `1px solid ${THEME.border}`, background: "linear-gradient(180deg,#fff 0%,#fbfdff 100%)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                  <div style={{ width: "46px", height: "46px", borderRadius: "14px", background: "#fef9c3", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <CalendarDaysIcon style={{ width: "22px", height: "22px", color: "#ca8a04" }} />
                  </div>
                  <div>
                    <div style={{ fontSize: "18px", fontWeight: 800, color: THEME.navy }}>Yesterday's Attendance Summary</div>
                    <div style={{ fontSize: "13px", color: THEME.textSoft, marginTop: "2px" }}>
                      {yesterdaySummaryDate ? `For ${yesterdaySummaryDate}` : "Last working day"} — Pending your approval
                    </div>
                  </div>
                </div>
                <button
                  onClick={loadYesterdaySummary}
                  style={{ display: "flex", alignItems: "center", gap: "6px", padding: "9px 16px", borderRadius: "10px", border: `1px solid ${THEME.border}`, background: THEME.surface, color: THEME.textSoft, fontSize: "13px", fontWeight: 600, cursor: "pointer" }}
                >
                  <ArrowPathIcon style={{ width: "15px", height: "15px" }} />
                  Refresh
                </button>
              </div>
            </div>

            {/* Table */}
            {loadingYesterday ? (
              <div style={{ padding: "48px", textAlign: "center", color: THEME.textSoft }}>
                <div style={{ width: "28px", height: "28px", border: `3px solid ${THEME.border}`, borderTop: `3px solid ${THEME.primary}`, borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 12px" }} />
                <p style={{ fontSize: "13px", fontWeight: 500 }}>Loading yesterday's summary...</p>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px", color: THEME.text }}>
                  <thead>
                    <tr style={{ background: THEME.surfaceSoft, borderBottom: `1px solid ${THEME.border}`, fontSize: "11px", color: THEME.textSoft, textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em" }}>
                      <th style={{ padding: "12px 16px" }}>Employee</th>
                      <th style={{ padding: "12px 16px" }}>Department</th>
                      <th style={{ padding: "12px 16px" }}>Status</th>
                      <th style={{ padding: "12px 16px" }}>Check In</th>
                      <th style={{ padding: "12px 16px" }}>Check Out</th>
                      <th style={{ padding: "12px 16px" }}>Working Hours</th>
                      <th style={{ padding: "12px 16px" }}>Breaks (L/T)</th>
                      <th style={{ padding: "12px 16px" }}>Permission</th>
                      <th style={{ padding: "12px 16px" }}>Manager Status</th>
                      <th style={{ padding: "12px 16px", textAlign: "center" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {yesterdaySummary.map((emp, idx) => {
                      const status = emp.status || "Absent";
                      // Determine category based on status
                      let category = "absent";
                      if (status === "Leave") {
                        category = "leave";
                      } else if (status === "Present" || status === "Half Day") {
                        category = "present";
                      }
                      const managerStatus = emp.manager_status || emp.decision || "Pending";
                      const isRegularization = emp.is_regularization || false;
                      const isLop = emp.is_lop || false;

                      // Check if employee has responded by looking at clarification_history for employee messages
                      const clarificationHistory = emp.clarification_history || [];
                      const employeeReplied = clarificationHistory.some((msg: any) => msg.sender_role === "employee");
                      const summaryDateStr = emp.summary_date || "";

                      let statusBg = "#fee2e2"; let statusColor = "#b91c1c";
                      if (status === "Present") { statusBg = "#dcfce7"; statusColor = "#166534"; }
                      else if (status === "Leave") { statusBg = "#fef3c7"; statusColor = "#92400e"; }
                      else if (status === "Half Day") { statusBg = "#f3e8ff"; statusColor = "#7e22ce"; }

                      let msBg = "#f1f5f9"; let msColor = "#475569";
                      if (managerStatus === "Approved") { msBg = "#dcfce7"; msColor = "#166534"; }
                      else if (managerStatus === "Need Clarification") { msBg = "#fef9c3"; msColor = "#854d0e"; }

                      // Row background hint for leave (read-only)
                      const rowBg = category === "leave" ? "#fffbeb" : "transparent";

                      return (
                        <tr key={idx} style={{ borderBottom: `1px solid ${THEME.border}`, background: rowBg }}>
                          <td style={{ padding: "12px 16px", fontWeight: 700, color: THEME.navy }}>
                            <div>{emp.employee_name}</div>
                            <div style={{ fontSize: "11px", color: THEME.textSoft, fontWeight: 500 }}>{emp.designation}</div>
                          </td>
                          <td style={{ padding: "12px 16px", color: THEME.textSoft }}>{emp.department}</td>
                          <td style={{ padding: "12px 16px" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                              <span style={{ display: "inline-flex", padding: "3px 10px", borderRadius: "999px", background: statusBg, color: statusColor, fontSize: "11px", fontWeight: 800 }}>{status}</span>
                              {emp.leave_type && (
                                <span style={{ fontSize: "10px", color: THEME.textSoft }}>{emp.leave_type}</span>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            {emp.check_in || (category === "leave" ? "—" : <span style={{ color: "#ef4444", fontSize: "11px" }}>No data</span>)}
                          </td>
                          <td style={{ padding: "12px 16px" }}>{emp.check_out || "—"}</td>
                          <td style={{ padding: "12px 16px", fontWeight: 700, color: THEME.primary }}>{formatWorkingHours(emp.working_hours)}</td>
                          <td style={{ padding: "12px 16px", color: THEME.textSoft }}>
                            {(emp.lunch_minutes > 0 || emp.tea_minutes > 0) ? `${emp.lunch_minutes}m / ${emp.tea_minutes}m` : "—"}
                          </td>
                          <td style={{ padding: "12px 16px", color: "#0f766e", fontWeight: 700 }}>
                                    {emp.permission_hours ? `${emp.permission_hours} hr${emp.permission_hours !== 1 ? "s" : ""}` : "—"}
                                  </td>
                          <td style={{ padding: "12px 16px" }}>
                            <span style={{ display: "inline-flex", padding: "3px 10px", borderRadius: "999px", background: msBg, color: msColor, fontSize: "11px", fontWeight: 800 }}>{managerStatus}</span>
                          </td>

                          {/* ── ACTION CELL ── */}
                          <td style={{ padding: "12px 16px", textAlign: "center", minWidth: "160px" }}>

                            {/* LEAVE — read-only, only Confirm Leave */}
                            {category === "leave" && managerStatus !== "Approved" && !(managerStatus === "Need Clarification" && employeeReplied) && (
                              <div style={{ display: "flex", flexDirection: "column", gap: "6px", alignItems: "center" }}>
                                <span style={{ fontSize: "11px", color: "#92400e", fontWeight: 600, background: "#fef3c7", padding: "2px 8px", borderRadius: "6px" }}>On Leave</span>
                                <button
                                  onClick={() => handleApproveYesterday(emp.employee_id, summaryDateStr)}
                                  style={{ padding: "5px 12px", borderRadius: "8px", border: "none", background: "#dcfce7", color: "#166534", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}
                                >✓ Confirm Leave</button>
                              </div>
                            )}

                            {/* PRESENT — Approve + Need Clarification */}
                            {category === "present" && managerStatus === "Pending" && (
                              <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                                <button
                                  onClick={() => handleApproveYesterday(emp.employee_id, summaryDateStr)}
                                  style={{ padding: "6px 12px", borderRadius: "8px", border: "none", background: "#dcfce7", color: "#166534", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}
                                >✓ Approve</button>
                                <button
                                  onClick={() => handleNeedClarificationYesterday(emp.employee_id, summaryDateStr)}
                                  style={{ padding: "6px 12px", borderRadius: "8px", border: "none", background: "#fef9c3", color: "#854d0e", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}
                                >? Clarify</button>
                              </div>
                            )}

                            {/* PRESENT — Need Clarification sent, employee has replied (regularization / leave) */}
                            {category === "present" && managerStatus === "Need Clarification" && employeeReplied && (
                              <div style={{ display: "flex", flexDirection: "column", gap: "6px", alignItems: "center" }}>
                                {isRegularization && emp.check_in && (
                                  <span style={{ fontSize: "10px", color: "#166534", fontWeight: 600 }}>
                                    Reg: {emp.check_in} – {emp.check_out || "?"}
                                  </span>
                                )}
                                <div style={{ display: "flex", gap: "6px" }}>
                                  <button
                                    onClick={() => handleApproveYesterday(emp.employee_id, summaryDateStr)}
                                    style={{ padding: "5px 12px", borderRadius: "8px", border: "none", background: "#dcfce7", color: "#166534", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}
                                  >✓ Approve</button>
                                  <button
                                    onClick={() => handleNeedClarificationYesterday(emp.employee_id, summaryDateStr)}
                                    style={{ padding: "5px 12px", borderRadius: "8px", border: "none", background: "#fef9c3", color: "#854d0e", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}
                                  >? Again</button>
                                </div>
                              </div>
                            )}

                            {/* PRESENT — Need Clarification sent, waiting for employee */}
                            {category === "present" && managerStatus === "Need Clarification" && !employeeReplied && (
                              <span style={{ fontSize: "11px", color: "#854d0e", fontWeight: 500 }}>⏳ Awaiting employee</span>
                            )}

                            {/* ABSENT — only Need Clarification (triggers employee to decide) */}
                            {category === "absent" && managerStatus === "Pending" && (
                              <button
                                onClick={() => handleNeedClarificationYesterday(emp.employee_id, summaryDateStr)}
                                style={{ padding: "6px 14px", borderRadius: "8px", border: "none", background: "#fef9c3", color: "#854d0e", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}
                              >? Need Clarification</button>
                            )}

                            {/* ABSENT — Need Clarification sent, employee chose LOP */}
                            {category === "absent" && managerStatus === "Need Clarification" && isLop && employeeReplied && (
                              <div style={{ display: "flex", flexDirection: "column", gap: "6px", alignItems: "center" }}>
                                <span style={{ fontSize: "10px", color: "#b91c1c", fontWeight: 600, background: "#fee2e2", padding: "2px 8px", borderRadius: "6px" }}>Employee chose LOP</span>
                                <button
                                  onClick={() => handleApproveYesterday(emp.employee_id, summaryDateStr)}
                                  style={{ padding: "5px 12px", borderRadius: "8px", border: "none", background: "#dcfce7", color: "#166534", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}
                                >✓ Confirm LOP</button>
                              </div>
                            )}

                            {/* ABSENT — Need Clarification sent, employee chose Leave */}
                            {category === "leave" && managerStatus === "Need Clarification" && employeeReplied && (
                              <div style={{ display: "flex", flexDirection: "column", gap: "6px", alignItems: "center" }}>
                                <span style={{ fontSize: "10px", color: "#92400e", fontWeight: 600, background: "#fef3c7", padding: "2px 8px", borderRadius: "6px" }}>Applied {emp.leave_type || "Leave"}</span>
                                <button
                                  onClick={() => handleApproveYesterday(emp.employee_id, summaryDateStr)}
                                  style={{ padding: "5px 12px", borderRadius: "8px", border: "none", background: "#dcfce7", color: "#166534", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}
                                >✓ Approve Leave</button>
                              </div>
                            )}

                            {/* ABSENT — Need Clarification sent, waiting for employee response */}
                            {category === "absent" && managerStatus === "Need Clarification" && !employeeReplied && (
                              <span style={{ fontSize: "11px", color: "#854d0e", fontWeight: 500 }}>⏳ Awaiting employee</span>
                            )}

                            {/* Done state */}
                            {managerStatus === "Approved" && (
                              <span style={{ fontSize: "12px", color: THEME.textLight, fontWeight: 500 }}>— Done —</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}

      {/* Attendance History Modal */}
      {historyModalUser && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(15, 23, 42, 0.4)",
            backdropFilter: "blur(4px)",
            padding: "20px",
            animation: "fadeIn 0.2s ease-out",
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "24px",
              width: "100%",
              maxWidth: "800px",
              maxHeight: "85vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.15)",
              border: "1px solid #f1f5f9",
              animation: "slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
              overflow: "hidden",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid #f1f5f9",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "#f8fafc",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                {historyModalUser.profile_image ? (
                  <img
                    src={getProfileImageUrl(historyModalUser.profile_image, historyModalUser.employee_id || historyModalUser.id)}
                    alt={historyModalUser.name}
                    style={{ width: "48px", height: "48px", borderRadius: "14px", objectFit: "cover" }}
                  />
                ) : (
                  <div
                    style={{
                      width: "48px",
                      height: "48px",
                      borderRadius: "14px",
                      background: `linear-gradient(135deg, ${THEME.primary} 0%, ${THEME.primaryDark} 100%)`,
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "14px",
                      fontWeight: 800,
                    }}
                  >
                    {historyModalUser.name
                      .split(" ")
                      .map((n: string) => n[0])
                      .join("")
                      .substring(0, 2)
                      .toUpperCase()}
                  </div>
                )}
                <div>
                  <h3 style={{ fontSize: "16px", fontWeight: 800, color: THEME.navy, margin: 0 }}>
                    {historyModalUser.name}
                  </h3>
                  <p style={{ fontSize: "12px", color: THEME.textSoft, margin: "2px 0 0 0" }}>
                    {historyModalUser.designation} • {historyModalUser.department} (ID: {historyModalUser.employee_id})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setHistoryModalUser(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: "20px",
                  color: "#94a3b8",
                  cursor: "pointer",
                  padding: "4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "50%",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#e2e8f0";
                  e.currentTarget.style.color = "#475569";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "#94a3b8";
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: "24px", overflowY: "auto", flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "8px" }}>
                <h4 style={{ fontSize: "13px", fontWeight: 700, color: THEME.navy, textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>
                  Attendance History
                </h4>
                <div style={{ width: "260px" }}>
                  <select
                    value={selectedCycle}
                    onChange={(e) => handleCycleChange(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "4px 8px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      background: "#fff",
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "#334155",
                      outline: "none",
                      cursor: "pointer"
                    }}
                  >
                    {generatePayrollCycles().map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {loadingHistory ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 0", gap: "12px" }}>
                  <div style={{ width: "32px", height: "32px", border: `3px solid ${THEME.border}`, borderTop: `3px solid ${THEME.primary}`, borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                  <p style={{ fontSize: "13px", color: THEME.textSoft, fontWeight: 500 }}>Loading attendance records...</p>
                </div>
              ) : historyRecords.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: THEME.textSoft }}>
                  <span style={{ fontSize: "36px" }}>📅</span>
                  <p style={{ marginTop: "12px", fontSize: "14px", fontWeight: 600 }}>No attendance history found.</p>
                </div>
              ) : (
                <div style={{ overflowX: "auto", border: "1px solid #f1f5f9", borderRadius: "16px" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                    <thead>
                      <tr style={{ background: "#f8fafc", borderBottom: "1px solid #f1f5f9", fontSize: "11px", color: THEME.textSoft, textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em" }}>
                        <th rowSpan={2} style={{ padding: "12px 16px" }}>Date</th>
                        <th rowSpan={2} style={{ padding: "12px 16px" }}>Status</th>
                        <th colSpan={3} style={{ padding: "8px 16px", textAlign: "center", borderBottom: `2px solid ${THEME.border}`, background: "rgba(37,99,235,0.05)", color: THEME.primary, fontWeight: 800 }}>Web Site Entry</th>
                        <th colSpan={3} style={{ padding: "8px 16px", textAlign: "center", borderBottom: `2px solid ${THEME.border}`, background: "rgba(126,34,206,0.05)", color: "#7e22ce", fontWeight: 800 }}>Biometric Card Entry</th>
                        <th rowSpan={2} style={{ padding: "12px 16px" }}>Breaks (L/T)</th>
                      </tr>
                      <tr style={{ background: "#f8fafc", borderBottom: "1px solid #f1f5f9", fontSize: "10px", color: THEME.textSoft, textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em" }}>
                        <th style={{ padding: "6px 16px", background: "rgba(37,99,235,0.02)" }}>Check In</th>
                        <th style={{ padding: "6px 16px", background: "rgba(37,99,235,0.02)" }}>Check Out</th>
                        <th style={{ padding: "6px 16px", background: "rgba(37,99,235,0.02)", fontWeight: 700 }}>Hours</th>
                        <th style={{ padding: "6px 16px", background: "rgba(126,34,206,0.02)" }}>Check In</th>
                        <th style={{ padding: "6px 16px", background: "rgba(126,34,206,0.02)" }}>Check Out</th>
                        <th style={{ padding: "6px 16px", background: "rgba(126,34,206,0.02)", fontWeight: 700 }}>Hours</th>
                      </tr>
                    </thead>
                    <tbody style={{ fontSize: "13px", color: THEME.text, fontWeight: 500 }}>
                      {historyRecords.map((record) => {
                        let pillBg = "#f1f5f9";
                        let pillText = "#475569";
                        const status = record.status || "Absent";

                        if (status === "Present" || status === "Checked Out") {
                          pillBg = THEME.successBg;
                          pillText = THEME.success;
                        } else if (status === "Leave" || status === "On Leave") {
                          pillBg = THEME.warningBg;
                          pillText = THEME.warning;
                        } else if (status === "Absent") {
                          pillBg = THEME.dangerBg;
                          pillText = THEME.danger;
                        } else if (status === "Week Off") {
                          pillBg = "rgba(148, 163, 184, 0.15)";
                          pillText = "#64748b";
                        } else if (status === "Holiday") {
                          pillBg = "rgba(124, 58, 237, 0.15)";
                          pillText = "#7c3aed";
                        }

                        // Format date nicely
                        const dateObj = new Date(record.date);
                        const formattedDate = dateObj.toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        });

                        return (
                          <tr key={record.id} style={{ borderBottom: "1px solid #f8fafc" }}>
                            <td style={{ padding: "12px 16px", fontWeight: 700, color: THEME.navy }}>
                              {formattedDate}
                            </td>
                            <td style={{ padding: "12px 16px" }}>
                              <div style={{ display: "flex", flexDirection: "column", gap: "4px", alignItems: "flex-start" }}>
                                <span
                                  style={{
                                    display: "inline-flex",
                                    padding: "4px 10px",
                                    borderRadius: "999px",
                                    background: pillBg,
                                    color: pillText,
                                    fontSize: "11px",
                                    fontWeight: 800,
                                  }}
                                >
                                  {status}
                                </span>
                                {record.is_one_day_wages && (
                                  <span
                                    title={`One Day Wages: ${record.wages_status || "Pending"}`}
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "4px",
                                      padding: "2px 8px",
                                      borderRadius: "999px",
                                      background: record.wages_status === "Approved" ? "#fef3c7" : "#f9fafb",
                                      border: `1px solid ${record.wages_status === "Approved" ? "#fbbf24" : "#e2e8f0"}`,
                                      color: record.wages_status === "Approved" ? "#92400e" : "#64748b",
                                      fontSize: "10px",
                                      fontWeight: 800,
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    ⭐ ODW: {record.wages_status || "Pending"}
                                  </span>
                                )}
                              </div>
                            </td>
                            {/* Web site entry */}
                            <td style={{ padding: "12px 16px", background: "rgba(37,99,235,0.01)", color: record.checkIn !== "-" ? THEME.text : THEME.textSoft }}>
                              {record.checkIn}
                            </td>
                            <td style={{ padding: "12px 16px", background: "rgba(37,99,235,0.01)", color: record.checkOut !== "-" ? THEME.text : THEME.textSoft }}>
                              {record.checkOut}
                            </td>
                            <td style={{ padding: "12px 16px", background: "rgba(37,99,235,0.01)", fontWeight: 700, color: record.workingHours > 0 ? THEME.primary : THEME.textSoft }}>
                              {formatWorkingHours(record.workingHours)}
                            </td>
                            {/* Biometric Card entry */}
                            <td style={{ padding: "12px 16px", background: "rgba(126,34,206,0.01)", color: record.cardCheckIn !== "-" ? "#7e22ce" : THEME.textSoft, fontWeight: 600 }}>
                              {record.cardCheckIn}
                            </td>
                            <td style={{ padding: "12px 16px", background: "rgba(126,34,206,0.01)", color: record.cardCheckOut !== "-" ? "#7e22ce" : THEME.textSoft, fontWeight: 600 }}>
                              {record.cardCheckOut}
                            </td>
                            <td style={{ padding: "12px 16px", background: "rgba(126,34,206,0.01)", fontWeight: 700, color: "#7e22ce" }}>
                              {formatWorkingHours(record.cardWorkingHours)}
                            </td>
                            <td style={{ padding: "12px 16px", color: THEME.textSoft }}>
                              {record.lunchMinutes > 0 || record.teaMinutes > 0 ? (
                                <span>{record.lunchMinutes}m / {record.teaMinutes}m</span>
                              ) : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: "16px 24px",
                borderTop: "1px solid #f1f5f9",
                display: "flex",
                justifyContent: "end",
                background: "#f8fafc",
              }}
            >
              <button
                onClick={() => setHistoryModalUser(null)}
                style={{
                  background: THEME.navy,
                  color: "#fff",
                  border: "none",
                  borderRadius: "12px",
                  padding: "10px 24px",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = "0.9";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = "1";
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ManagerDashboardPage;