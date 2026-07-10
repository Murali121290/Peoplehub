import React, { useEffect, useMemo, useState } from "react";
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
} from "@heroicons/react/24/outline";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { StatCard } from "../components/ui/StatCard";
import { Tabs } from "../components/ui/Tabs";
import { Input, Select } from "../components/ui/Form";
import type { StatCardColor } from "../components/ui/StatCard";
import type { BadgeVariant } from "../components/ui/Badge";

const BASE_URL = "http://10.1.6.178:5001/api";

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

const initialLeaveRequests = [
  {
    id: 1,
    employeeId: 2,
    employeeName: "Sarah Johnson",
    role: "Copywriting",
    leaveType: "Sick Leave",
    fromDate: "2026-06-04",
    toDate: "2026-06-06",
    reason: "Medical rest required",
    status: "Pending",
    submittedAt: "2 hours ago",
  },
  {
    id: 2,
    employeeId: 5,
    employeeName: "Michael Brown",
    role: "Pre-Editing",
    leaveType: "Casual Leave",
    fromDate: "2026-06-08",
    toDate: "2026-06-09",
    reason: "Personal work",
    status: "Pending",
    submittedAt: "5 hours ago",
  },
  {
    id: 3,
    employeeId: 7,
    employeeName: "Anita Roy",
    role: "QA",
    leaveType: "Earned Leave",
    fromDate: "2026-06-10",
    toDate: "2026-06-12",
    reason: "Family function",
    status: "Approved",
    submittedAt: "1 day ago",
  },
];

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
  const [leaveRequests, setLeaveRequests] = useState(initialLeaveRequests);
  const [managerName, setManagerName] = useState("");

  const userId = localStorage.getItem("user_id");

  // ==========================
  // LOAD TEAM MEMBERS & ATTENDANCE
  // ==========================
  useEffect(() => {
    loadTeamMembers();
    loadTeamAttendance();
    loadManagerInfo();
  }, []);

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
        role: emp.role || emp.designation || "Employee",
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

  const pendingLeaveCount = leaveRequests.filter((req) => req.status === "Pending").length;

  // ==========================
  // FILTER MEMBERS
  // ==========================
  const filteredMembers = scopedTeamMembers.filter((member) => {
    const matchesSearch =
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter = filterStatus === "All" || member.status === filterStatus;

    return matchesSearch && matchesFilter;
  });

  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 85) return THEME.success;
    if (efficiency >= 70) return THEME.warning;
    return THEME.danger;
  };

  // ==========================
  // LEAVE ACTION
  // ==========================
  const handleLeaveAction = (requestId: number, action: string) => {
    const request = leaveRequests.find((req) => req.id === requestId);

    if (!request) return;

    setLeaveRequests((prev) =>
      prev.map((req) =>
        req.id === requestId
          ? {
            ...req,
            status: action === "approve" ? "Approved" : "Rejected",
          }
          : req,
      ),
    );

    setTeamMembers((prev) =>
      prev.map((member) =>
        member.name === request.employeeName
          ? {
            ...member,
            status: action === "approve" ? "Leave" : "Active",
            hoursThisWeek: action === "approve" ? 0 : member.hoursThisWeek,
          }
          : member,
      ),
    );
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
      label: "Pending Leaves",
      value: pendingLeaveCount,
      sub: "Need action",
      icon: InboxArrowDownIcon,
      tone: "danger",
    },
    {
      label: "Avg Efficiency",
      value: `${avgEfficiency}%`,
      sub: "Team average",
      icon: ChartBarIcon,
      tone: "primary",
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
                      Team Attendance
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
              ) : (
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
                          key={member.id}
                          style={{
                            background: statusStyle.bg,
                            border: `1px solid ${statusStyle.border}`,
                            borderRadius: "22px",
                            padding: "18px",
                            boxShadow: "0 2px 10px rgba(15,23,42,0.03)",
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
              )}
            </div>
          </section>

        </div>
      </main>
    </div>
  );
};

export default ManagerDashboardPage;