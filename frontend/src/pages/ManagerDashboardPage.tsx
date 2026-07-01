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
} from "@heroicons/react/24/outline";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { StatCard } from "../components/ui/StatCard";
import { Tabs } from "../components/ui/Tabs";
import { Input, Select } from "../components/ui/Form";
import type { StatCardColor } from "../components/ui/StatCard";
import type { BadgeVariant } from "../components/ui/Badge";

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

const managerNotifications = [
  {
    id: 1,
    type: "alert",
    title: "High workload",
    message: "QA team workload is critically high.",
    time: "2 hours ago",
  },
  {
    id: 2,
    type: "info",
    title: "Leave request pending",
    message: "2 new leave requests need review.",
    time: "4 hours ago",
  },
  {
    id: 3,
    type: "success",
    title: "Tasks completed",
    message: "Copywriting team completed 12 tasks today.",
    time: "6 hours ago",
  },
  {
    id: 4,
    type: "warning",
    title: "Pending assignments",
    message: "Pre-Editing team has 3 pending assignments.",
    time: "1 day ago",
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
  alert: "border-l-danger-300 bg-danger-50",
  success: "border-l-success-300 bg-success-50",
  warning: "border-l-warning-300 bg-warning-50",
  info: "border-l-info-300 bg-info-50",
};

const ManagerDashboardPage = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");

  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [leaveRequests, setLeaveRequests] = useState(initialLeaveRequests);

  const userId = localStorage.getItem("user_id");

  // ==========================
  // LOAD TEAM MEMBERS
  // ==========================

  useEffect(() => {
    loadTeamMembers();
  }, []);

  const loadTeamMembers = async () => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/employees/my-team/${userId}`,
      );

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

  // ==========================
  // TEAM STATS
  // ==========================

  const activeCount = useMemo(
    () => teamMembers.filter((member) => member.status === "Active").length,
    [teamMembers],
  );

  const leaveCount = useMemo(
    () => teamMembers.filter((member) => member.status === "Leave").length,
    [teamMembers],
  );

  const totalTasks = useMemo(
    () => teamMembers.reduce((sum, member) => sum + member.tasksCompleted, 0),
    [teamMembers],
  );

  const avgEfficiency = useMemo(
    () =>
      teamMembers.length > 0
        ? Math.round(
            teamMembers.reduce((sum, member) => sum + member.efficiency, 0) /
              teamMembers.length,
          )
        : 0,
    [teamMembers],
  );

  const pendingLeaveCount = leaveRequests.filter(
    (req) => req.status === "Pending",
  ).length;

  // ==========================
  // FILTER MEMBERS
  // ==========================

  const filteredMembers = teamMembers.filter((member) => {
    const matchesSearch =
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter =
      filterStatus === "All" || member.status === filterStatus;

    return matchesSearch && matchesFilter;
  });

  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 85) return "bg-success-400";

    if (efficiency >= 70) return "bg-warning-400";

    return "bg-danger-400";
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

  // ==========================
  // TABS
  // ==========================

  const tabs = [
    {
      id: "overview",
      label: "Overview",
      icon: ChartBarIcon,
    },
    {
      id: "team",
      label: "Team",
      icon: UsersIcon,
    },
  ];

  // YOUR RETURN STARTS BELOW

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-700">
      <header className="sticky top-0 z-20 border-b border-neutral-200 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary-50 p-2.5">
              <Cog6ToothIcon className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-neutral-800">
                Manager Dashboard
              </h1>
              <p className="text-xs text-neutral-500">
                Team control, leave approvals, and performance tracking
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5 rounded-xl border border-neutral-200 bg-white px-3 py-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-xs font-semibold text-neutral-600">
                PM
              </div>
              <div className="leading-tight">
                <p className="text-sm font-medium text-neutral-700">Manager</p>
                <p className="text-[11px] text-neutral-500">Admin access</p>
              </div>
            </div>
          </div>
        </div>

        <nav className="mx-auto max-w-7xl px-5 pb-3">
          <Tabs items={tabs} activeId={activeTab} onChange={setActiveTab} variant="pill" />
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-7">
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                icon={UsersIcon}
                title="Total Team Members"
                value={teamMembers.length}
                subtitle={`${activeCount} active • ${leaveCount} on leave`}
                color="info"
              />
              <StatCard
                icon={CheckCircleIcon}
                title="Active Today"
                value={activeCount}
                subtitle={`${Math.round(
                  (activeCount / teamMembers.length) * 100,
                )}% of team`}
                color="success"
              />
              <StatCard
                icon={InboxArrowDownIcon}
                title="Pending Leave Requests"
                value={pendingLeaveCount}
                subtitle="Awaiting review"
                color="warning"
              />
              <StatCard
                icon={ChartBarIcon}
                title="Avg Efficiency"
                value={`${avgEfficiency}%`}
                subtitle={`${totalTasks} tasks completed this week`}
                color="primary"
              />
            </div>

            <div className="grid gap-6 xl:grid-cols-3">
              <Card className="xl:col-span-2">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-neutral-800">
                      Team Summary
                    </h2>
                    <p className="text-xs text-neutral-500">
                      Quick view of current member status.
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setActiveTab("team")}>
                    Manage Team
                  </Button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {teamMembers.slice(0, 6).map((member) => (
                    <div
                      key={member.id}
                      className="rounded-xl border border-neutral-200 p-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-xs font-semibold text-neutral-600">
                          {member.avatar}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-neutral-700">
                            {member.name}
                          </p>
                          <p className="text-[11px] text-neutral-500">
                            {member.role}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <Badge variant={STATUS_BADGE_VARIANT[member.status] ?? "neutral"} size="sm">
                          {member.status}
                        </Badge>
                        <span className="text-sm font-medium text-neutral-600">
                          {member.efficiency}%
                        </span>
                      </div>

                      <div className="mt-2 h-1.5 rounded-full bg-neutral-100">
                        <div
                          className={`h-1.5 rounded-full ${getEfficiencyColor(
                            member.efficiency,
                          )}`}
                          style={{ width: `${member.efficiency}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card>
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-neutral-800">
                      Notifications
                    </h2>
                    <p className="text-xs text-neutral-500">
                      Latest team updates.
                    </p>
                  </div>
                  <BellIcon className="h-4 w-4 text-neutral-400" />
                </div>

                <div className="space-y-3">
                  {managerNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`rounded-xl border-l-2 p-3 ${
                        NOTIFICATION_STYLES[notification.type] ?? NOTIFICATION_STYLES.info
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-neutral-700">
                          {notification.title}
                        </p>
                        <span className="text-[11px] text-neutral-400">
                          {notification.time}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-neutral-500">
                        {notification.message}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        )}

        {activeTab === "team" && (
          <div className="space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-neutral-800">
                  Team Management
                </h2>
                <p className="text-xs text-neutral-500">
                  View employees, efficiency, and availability.
                </p>
              </div>
              <Button variant="outline" size="sm" icon={UserPlusIcon}>
                Add Member
              </Button>
            </div>

            <Card>
              <div className="grid gap-3 md:grid-cols-[1fr_180px]">
                <div className="relative">
                  <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400 z-10" />
                  <Input
                    type="text"
                    placeholder="Search employee, role, or email"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <div className="relative">
                  <FunnelIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400 z-10" />
                  <Select
                    value={filterStatus}
                    onChange={setFilterStatus}
                    className="pl-9"
                    options={[
                      { label: "All Status", value: "All" },
                      { label: "Active", value: "Active" },
                      { label: "On Leave", value: "Leave" },
                    ]}
                  />
                </div>
              </div>
            </Card>

            <Card padding="none" className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-neutral-50 text-neutral-500">
                    <tr>
                      <th className="px-5 py-3.5 font-medium">Employee</th>
                      <th className="px-5 py-3.5 font-medium">Role</th>
                      <th className="px-5 py-3.5 font-medium">Tasks</th>
                      <th className="px-5 py-3.5 font-medium">Efficiency</th>
                      <th className="px-5 py-3.5 font-medium">Status</th>
                      <th className="px-5 py-3.5 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {filteredMembers.length > 0 ? (
                      filteredMembers.map((member: any) => (
                        <tr
                          key={member.id}
                          className="hover:bg-neutral-50 transition"
                        >
                          {/* Employee */}
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700">
                                {member.name?.charAt(0)?.toUpperCase() || "E"}
                              </div>

                              <div>
                                <p className="font-medium text-neutral-700">
                                  {member.name}
                                </p>

                                <p className="text-xs text-neutral-500">
                                  {member.email || "-"}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Role */}
                          <td className="px-5 py-4 text-neutral-600">
                            {member.role || member.designation || "-"}
                          </td>

                          {/* Tasks */}
                          <td className="px-5 py-4 text-neutral-600">
                            {member.tasks_completed || 0}
                          </td>

                          {/* Efficiency */}
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-1.5 w-24 rounded-full bg-neutral-100">
                                <div
                                  className="h-1.5 rounded-full bg-success-500"
                                  style={{
                                    width: `${member.efficiency || 0}%`,
                                  }}
                                />
                              </div>

                              <span className="text-sm text-neutral-600">
                                {member.efficiency || 0}%
                              </span>
                            </div>
                          </td>

                          {/* Status */}
                          <td className="px-5 py-4">
                            <Badge
                              variant={member.status === "Active" ? "success" : "danger"}
                              size="sm"
                            >
                              {member.status || "Active"}
                            </Badge>
                          </td>

                          {/* Actions */}
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <button
                                className="rounded-md p-2 hover:bg-neutral-100"
                                title="View"
                              >
                                <EyeIcon className="h-4 w-4 text-neutral-500" />
                              </button>

                              <button
                                className="rounded-md p-2 hover:bg-neutral-100"
                                title="Edit"
                              >
                                <PencilIcon className="h-4 w-4 text-neutral-500" />
                              </button>

                              <button
                                className="rounded-md p-2 hover:bg-neutral-100"
                                title="Delete"
                              >
                                <TrashIcon className="h-4 w-4 text-danger-500" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={6}
                          className="py-8 text-center text-neutral-500"
                        >
                          No Team Members Found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {activeTab === "performance" && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-neutral-800">
                Performance Analytics
              </h2>
              <p className="text-xs text-neutral-500">
                Weekly productivity and efficiency breakdown.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <StatCard title="Tasks Completed" value={totalTasks} icon={CheckCircleIcon} color="success" />
              <StatCard title="Hours Logged" value="204" icon={ClockIcon} color="info" />
              <StatCard title="Average Efficiency" value={`${avgEfficiency}%`} icon={ChartBarIcon} color="primary" />
            </div>

            <Card>
              <h3 className="mb-4 text-sm font-semibold text-neutral-700">
                Role Performance
              </h3>
              <div className="space-y-4">
                {["Pre-Editing", "Copywriting", "QA"].map((role, index) => {
                  const members = teamMembers.filter((m) => m.role === role);
                  const average = Math.round(
                    members.reduce((sum, m) => sum + m.efficiency, 0) /
                      members.length,
                  );
                  const colors: StatCardColor[] = ["info", "success", "primary"];

                  return (
                    <div key={role}>
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-sm text-neutral-600">{role}</p>
                        <p className="text-xs font-medium text-neutral-500">
                          {average}%
                        </p>
                      </div>
                      <div className="h-2 rounded-full bg-neutral-100">
                        <div
                          className={`h-2 rounded-full bg-${colors[index]}-300`}
                          style={{ width: `${average}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        )}

        {activeTab === "settings" && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-neutral-800">
                Manager Settings
              </h2>
              <p className="text-xs text-neutral-500">
                Configure profile and dashboard access.
              </p>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <Card>
                <h3 className="mb-4 text-sm font-semibold text-neutral-700">
                  Profile
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-neutral-500">
                      Manager Name
                    </label>
                    <Input type="text" defaultValue="Manager" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-neutral-500">
                      Email
                    </label>
                    <Input type="email" defaultValue="manager@company.com" />
                  </div>
                </div>
              </Card>

              <Card>
                <h3 className="mb-4 text-sm font-semibold text-neutral-700">
                  Permissions
                </h3>
                <div className="space-y-3">
                  {[
                    "View and edit team member information",
                    "Approve or reject leave requests",
                    "Access performance analytics",
                    "Manage team schedules",
                    "Send notifications to team members",
                    "Export reports",
                  ].map((permission) => (
                    <div
                      key={permission}
                      className="flex items-center justify-between rounded-xl bg-neutral-50 px-3 py-2.5"
                    >
                      <p className="text-xs text-neutral-600">{permission}</p>
                      <div className="relative h-5 w-9 rounded-full bg-success-300">
                        <div className="absolute right-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm" />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ManagerDashboardPage;
