import { API_URL } from "../config/api";
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
} from "@heroicons/react/24/outline";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { StatCard } from "../components/ui/StatCard";
import { Tabs } from "../components/ui/Tabs";
import { Input, Select } from "../components/ui/Form";
import type { StatCardColor } from "../components/ui/StatCard";
import type { BadgeVariant } from "../components/ui/Badge";

const BASE_URL = `${API_URL}/api`;

// ==========================
// THEME - professional enterprise palette
// ==========================
const THEME = {
  primary: "#0f766e",
  primaryDark: "#115e59",
  primarySoft: "#ecfdf5",
  navy: "#0f172a",
  text: "#111827",
  textSoft: "#6b7280",
  textLight: "#94a3b8",
  border: "#e5e7eb",
  surface: "#ffffff",
  surfaceSoft: "#f8fafc",
  surfaceMuted: "#f1f5f9",
  success: "#166534",
  successBg: "#dcfce7",
  warning: "#a16207",
  warningBg: "#fef3c7",
  danger: "#b91c1c",
  dangerBg: "#fee2e2",
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
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");

  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [teamAttendance, setTeamAttendance] = useState<any[]>([]);
  const [attendanceSearch, setAttendanceSearch] = useState("");
  const [attendanceFilter, setAttendanceFilter] = useState("All");
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

  const viewEmployeeHistory = async (member: any) => {
    setHistoryModalUser(member);
    setLoadingHistory(true);
    setHistoryRecords([]);
    try {
      const response = await fetch(`${BASE_URL}/attendance/history/${member.user_id}`);
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
    try {
      const todayStr = new Date().toISOString().split("T")[0];
      const response = await fetch(`${BASE_URL}/attendance/approve/${empUserId}?date=${todayStr}`, {
        method: "PUT",
      });
      if (response.ok) {
        loadTeamAttendance();
      } else {
        console.error("Failed to approve today's attendance");
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleRejectToday = async (empUserId: number) => {
    try {
      const todayStr = new Date().toISOString().split("T")[0];
      const response = await fetch(`${BASE_URL}/attendance/reject/${empUserId}?date=${todayStr}`, {
        method: "PUT",
      });
      if (response.ok) {
        loadTeamAttendance();
      } else {
        console.error("Failed to reject today's attendance");
      }
    } catch (error) {
      console.error(error);
    }
  };

  const userId = localStorage.getItem("user_id");

  // ==========================
  // LOAD TEAM MEMBERS & ATTENDANCE
  // ==========================
  useEffect(() => {
    loadTeamMembers();
    loadTeamAttendance();
    loadManagerInfo();
    loadManagerInfo();
  }, []);

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
    socket.on("attendance_update", (payload: any) => {
      setTeamAttendance((prev) => {
        const exists = prev.some((m) => m.id === payload.id);
        if (exists) {
          return prev.map((m) => (m.id === payload.id ? { ...m, ...payload } : m));
        }
        return prev;
      });
    });

    socket.on("attendance_approved_all", () => {
      loadTeamAttendance();
    });

    socket.on("leave_update", (payload: any) => {
      if (
        payload.reporting_manager?.trim().toLowerCase() ===
        managerName?.trim().toLowerCase()
      ) {
        // Also update leave status inside teamAttendance
        if (payload.status === "Approved") {
          setTeamAttendance((prev) =>
            prev.map((m) =>
              m.id === Number(payload.employee_id)
                ? { ...m, attendance_status: "On Leave" }
                : m
            )
          );
        }
      }
    });

    socket.on("employee_profile_update", (payload: any) => {
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
      setTeamAttendance((prev) =>
        prev.map((m) =>
          m.id === payload.id
            ? {
              ...m,
              designation: payload.designation || m.designation,
              name: `${payload.first_name} ${payload.last_name}`,
              email: payload.email,
              shift: payload.shift,
            }
            : m
        )
      );
    });

    return () => {
      socket.off("attendance_update");
      socket.off("attendance_approved_all");
      socket.off("attendance_approved_all");
      socket.off("employee_profile_update");
    };
  }, [managerName]);

  const loadManagerInfo = async () => {
    try {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const user = JSON.parse(userStr);
        setManagerName(user.full_name || user.name || "Manager");
      }
    } catch { }
  };

  const loadTeamMembers = async () => {
    try {
      const response = await fetch(`${BASE_URL}/employees/my-team/${userId}`);
      const data = await response.json();
      const formattedMembers = data.map((emp: any) => ({
        id: emp.id,
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

  const loadTeamAttendance = async () => {
    try {
      const response = await fetch(`${BASE_URL}/employees/team-attendance/${userId}`);
      const data = await response.json();
      setTeamAttendance(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load team attendance", error);
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
      };
    });
  }, [teamAttendance, teamMembers]);

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

    const matchesFilter = filterStatus === "All" || member.status === filterStatus;

    return matchesSearch && matchesFilter;
  });

  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 85) return THEME.success;
    if (efficiency >= 70) return THEME.warning;
    return THEME.danger;
  };



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
        (m) => m.attendance_status === "Present" || m.attendance_status === "Checked Out",
      ).length,
      sub: "Available now",
      icon: CheckCircleIcon,
      tone: "success",
    },
    {
      label: "On Leave",
      value: teamAttendance.filter((m) => m.attendance_status === "On Leave").length,
      sub: "Approved leave",
      icon: CalendarDaysIcon,
      tone: "warning",
    },
    {
      label: "Tasks Completed",
      value: totalTasks,
      sub: "Current total",
      icon: ClockIcon,
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
      case "primary":
        return {
          iconBg: THEME.primarySoft,
          iconColor: THEME.primary,
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

            <div
              style={{
                padding: "10px 14px",
                borderRadius: "12px",
                background: THEME.primarySoft,
                border: `1px solid #c7f9e9`,
                color: THEME.primaryDark,
                fontSize: "13px",
                fontWeight: 700,
              }}
            >
              {managerName ? `Welcome, ${managerName}` : "Welcome, Manager"}
            </div>
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
              gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
              gap: "18px",
            }}
          >
            {statCards.map((card) => {
              const tone = getStatTone(card.tone);
              const Icon = card.icon;

              return (
                <div
                  key={card.label}
                  style={{
                    background: THEME.surface,
                    borderRadius: "20px",
                    border: `1px solid ${THEME.border}`,
                    boxShadow: "0 4px 20px rgba(15, 23, 42, 0.04)",
                    padding: "20px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: "12px",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: "12px",
                          fontWeight: 700,
                          color: THEME.textLight,
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                        }}
                      >
                        {card.label}
                      </div>
                      <div
                        style={{
                          marginTop: "12px",
                          fontSize: "34px",
                          fontWeight: 800,
                          lineHeight: 1,
                          color: THEME.navy,
                        }}
                      >
                        {card.value}
                      </div>
                      <div
                        style={{
                          marginTop: "8px",
                          fontSize: "13px",
                          color: THEME.textSoft,
                        }}
                      >
                        {card.sub}
                      </div>
                    </div>

                    <div
                      style={{
                        width: "46px",
                        height: "46px",
                        borderRadius: "14px",
                        background: tone.iconBg,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Icon style={{ width: "22px", height: "22px", color: tone.iconColor }} />
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

                  <select
                    value={attendanceFilter}
                    onChange={(e) => setAttendanceFilter(e.target.value)}
                    style={{
                      height: "42px",
                      padding: "0 14px",
                      borderRadius: "12px",
                      border: `1px solid ${THEME.border}`,
                      background: THEME.surface,
                      outline: "none",
                      fontSize: "14px",
                      color: THEME.text,
                      minWidth: "150px",
                      cursor: "pointer",
                    }}
                  >
                    <option value="All">All Status</option>
                    <option value="Present">Present</option>
                    <option value="Checked Out">Checked Out</option>
                    <option value="Absent">Absent</option>
                    <option value="On Leave">On Leave</option>
                  </select>

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
                  }}
                >
                  {teamAttendance
                    .filter((m) => {
                      const matchSearch =
                        m.name.toLowerCase().includes(attendanceSearch.toLowerCase()) ||
                        (m.designation || "")
                          .toLowerCase()
                          .includes(attendanceSearch.toLowerCase());

                      const matchFilter =
                        attendanceFilter === "All" || m.attendance_status === attendanceFilter;

                      return matchSearch && matchFilter;
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
                          onClick={() => viewEmployeeHistory(member)}
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
                                    src={`data:image/jpeg;base64,${member.profile_image}`}
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
                                  {member.working_hours || 0} hrs
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
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div style={{ overflowX: "auto", border: `1px solid ${THEME.border}`, borderRadius: "16px" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", background: THEME.surface }}>
                    <thead>
                      <tr style={{ background: THEME.surfaceSoft, borderBottom: `1px solid ${THEME.border}`, fontSize: "11px", color: THEME.textSoft, textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em" }}>
                        <th rowSpan={2} style={{ padding: "14px 16px" }}>Employee</th>
                        <th rowSpan={2} style={{ padding: "14px 16px" }}>Employee ID</th>
                        <th rowSpan={2} style={{ padding: "14px 16px" }}>Department</th>
                        <th rowSpan={2} style={{ padding: "14px 16px" }}>Designation</th>
                        <th rowSpan={2} style={{ padding: "14px 16px" }}>Shift</th>
                        <th colSpan={3} style={{ padding: "10px 16px", textAlign: "center", borderBottom: `2px solid ${THEME.border}`, background: "rgba(37,99,235,0.05)", color: THEME.primary, fontWeight: 800 }}>Web Site Entry</th>
                        <th colSpan={3} style={{ padding: "10px 16px", textAlign: "center", borderBottom: `2px solid ${THEME.border}`, background: "rgba(126,34,206,0.05)", color: "#7e22ce", fontWeight: 800 }}>Biometric Card Entry</th>
                        <th rowSpan={2} style={{ padding: "14px 16px" }}>Status</th>
                      </tr>
                      <tr style={{ background: THEME.surfaceSoft, borderBottom: `1px solid ${THEME.border}`, fontSize: "10px", color: THEME.textSoft, textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em" }}>
                        <th style={{ padding: "8px 16px", background: "rgba(37,99,235,0.02)" }}>Check In</th>
                        <th style={{ padding: "8px 16px", background: "rgba(37,99,235,0.02)" }}>Check Out</th>
                        <th style={{ padding: "8px 16px", background: "rgba(37,99,235,0.02)", fontWeight: 700 }}>Hours</th>
                        <th style={{ padding: "8px 16px", background: "rgba(126,34,206,0.02)" }}>Check In</th>
                        <th style={{ padding: "8px 16px", background: "rgba(126,34,206,0.02)" }}>Check Out</th>
                        <th style={{ padding: "8px 16px", background: "rgba(126,34,206,0.02)", fontWeight: 700 }}>Hours</th>
                      </tr>
                    </thead>
                    <tbody style={{ fontSize: "13px", color: THEME.text, fontWeight: 500 }}>
                      {teamAttendance
                        .filter((m) => {
                          const matchSearch =
                            m.name.toLowerCase().includes(attendanceSearch.toLowerCase()) ||
                            (m.designation || "")
                              .toLowerCase()
                              .includes(attendanceSearch.toLowerCase());

                          const matchFilter =
                            attendanceFilter === "All" || m.attendance_status === attendanceFilter;

                          return matchSearch && matchFilter;
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
                              onClick={() => viewEmployeeHistory(member)}
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
                                      src={`data:image/jpeg;base64,${member.profile_image}`}
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
                                  <span style={{ fontWeight: 700, color: THEME.navy }}>{member.name}</span>
                                </div>
                              </td>
                              <td style={{ padding: "12px 16px", color: THEME.textSoft }}>{member.employee_id || "—"}</td>
                              <td style={{ padding: "12px 16px", color: THEME.textSoft }}>{member.department || "—"}</td>
                              <td style={{ padding: "12px 16px", color: THEME.textSoft }}>{member.designation || "—"}</td>
                              <td style={{ padding: "12px 16px", color: THEME.textSoft }}>{member.shift || "General Shift"}</td>

                              {/* Web Entry Columns */}
                              <td style={{ padding: "12px 16px", background: "rgba(37,99,235,0.01)" }}>{member.check_in || "—"}</td>
                              <td style={{ padding: "12px 16px", background: "rgba(37,99,235,0.01)" }}>{member.check_out || "—"}</td>
                              <td style={{ padding: "12px 16px", background: "rgba(37,99,235,0.01)", fontWeight: 700 }}>
                                {member.working_hours != null ? `${member.working_hours} hrs` : "0.0 hrs"}
                              </td>

                              {/* Card Entry Columns */}
                              <td style={{ padding: "12px 16px", background: "rgba(126,34,206,0.01)", color: "#7e22ce", fontWeight: 600 }}>{member.card_check_in || "—"}</td>
                              <td style={{ padding: "12px 16px", background: "rgba(126,34,206,0.01)", color: "#7e22ce", fontWeight: 600 }}>{member.card_check_out || "—"}</td>
                              <td style={{ padding: "12px 16px", background: "rgba(126,34,206,0.01)", fontWeight: 700, color: "#7e22ce" }}>
                                {member.card_working_hours != null ? `${member.card_working_hours} hrs` : "0.0 hrs"}
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
                    src={`data:image/jpeg;base64,${historyModalUser.profile_image}`}
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
              <h4 style={{ fontSize: "13px", fontWeight: 700, color: THEME.navy, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "16px" }}>
                30-Day Attendance History
              </h4>

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
                            </td>
                            {/* Web site entry */}
                            <td style={{ padding: "12px 16px", background: "rgba(37,99,235,0.01)", color: record.checkIn !== "-" ? THEME.text : THEME.textSoft }}>
                              {record.checkIn}
                            </td>
                            <td style={{ padding: "12px 16px", background: "rgba(37,99,235,0.01)", color: record.checkOut !== "-" ? THEME.text : THEME.textSoft }}>
                              {record.checkOut}
                            </td>
                            <td style={{ padding: "12px 16px", background: "rgba(37,99,235,0.01)", fontWeight: 700, color: record.workingHours > 0 ? THEME.primary : THEME.textSoft }}>
                              {record.workingHours > 0 ? `${record.workingHours} hrs` : "0.0 hrs"}
                            </td>
                            {/* Biometric Card entry */}
                            <td style={{ padding: "12px 16px", background: "rgba(126,34,206,0.01)", color: record.cardCheckIn !== "-" ? "#7e22ce" : THEME.textSoft, fontWeight: 600 }}>
                              {record.cardCheckIn}
                            </td>
                            <td style={{ padding: "12px 16px", background: "rgba(126,34,206,0.01)", color: record.cardCheckOut !== "-" ? "#7e22ce" : THEME.textSoft, fontWeight: 600 }}>
                              {record.cardCheckOut}
                            </td>
                            <td style={{ padding: "12px 16px", background: "rgba(126,34,206,0.01)", fontWeight: 700, color: "#7e22ce" }}>
                              {record.cardWorkingHours > 0 ? `${record.cardWorkingHours} hrs` : "0.0 hrs"}
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