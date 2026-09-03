import React, { useRef, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { API_URL } from '../../config/api';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDownIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';
import {
  DocumentChartBarIcon, ClockIcon, PresentationChartLineIcon,
} from '@heroicons/react/24/outline';
import logo from '../../images/s.png';
import { Button } from '../../components/ui/Button';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { socket } from "../../services/socket";

interface SidebarProps {
  sidebarItems: any[];
  showReportMenu: boolean;
  setShowReportMenu: (val: boolean) => void;
  user: any;
  profileImageUrl: string;
  onLogout: () => void;
  unreadAnnouncements?: number;
}

const reportLinks = [
  { name: "Schedule Report", icon: DocumentChartBarIcon, path: "/reports/schedule", state: { tab: "schedule" } },
  { name: "Team Schedule", icon: ClockIcon, path: "/reports/today-schedule", state: { tab: "today" } },
];

const checkManagerMatch = (reportingManager: string | null | undefined, managerFullName: string | null | undefined): boolean => {
  if (!reportingManager || !managerFullName) return false;
  const repManagerClean = reportingManager.trim().toLowerCase();
  const managerName = managerFullName.trim().toLowerCase();

  if (repManagerClean === managerName) return true;
  const repParts = repManagerClean.split(/\s+/);
  const mgParts = managerName.split(/\s+/);

  if (repParts.length === 1 && mgParts.length > 0 && mgParts[0] === repParts[0]) return true;
  if (mgParts.length === 1 && repParts.length > 0 && repParts[0] === mgParts[0]) return true;
  return false;
};

const getRecursiveReportingIdentifiers = (managerFullName: string, employeesList: any[]): Set<string> => {
  const allowed = new Set<string>();
  if (!managerFullName || !employeesList.length) return allowed;

  const queue: string[] = [managerFullName];
  const visitedManagers = new Set<string>([managerFullName.trim().toLowerCase()]);

  while (queue.length > 0) {
    const currentMgr = queue.shift()!;
    for (const emp of employeesList) {
      if (checkManagerMatch(emp.reporting_manager, currentMgr)) {
        const empFullName = `${emp.first_name || ""} ${emp.last_name || ""}`.trim() || emp.name || "";

        if (emp.id) allowed.add(String(emp.id));
        if (emp.employee_id) allowed.add(String(emp.employee_id).toLowerCase());
        if (empFullName) allowed.add(empFullName.toLowerCase());

        const empFullNameClean = empFullName.toLowerCase();
        if (empFullNameClean && !visitedManagers.has(empFullNameClean)) {
          visitedManagers.add(empFullNameClean);
          queue.push(empFullName);
        }
      }
    }
  }

  return allowed;
};

const Sidebar: React.FC<SidebarProps> = ({
  sidebarItems,
  showReportMenu,
  setShowReportMenu,
  user,
  profileImageUrl,
  onLogout,
  unreadAnnouncements = 0,
}) => {
  const location = useLocation();
  const reportMenuRef = useRef<HTMLDivElement | null>(null);
  const isDesktop = useIsDesktop();
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});
  const [pendingLeaveCount, setPendingLeaveCount] = useState(0);
  const [pendingShiftCount, setPendingShiftCount] = useState(0);
  const [teamManagementCount, setTeamManagementCount] = useState(0);

  const [effectiveShift, setEffectiveShift] = useState<{
    effective_shift: string;
    is_wfh: boolean;
    is_permanent_wfh: boolean;
    is_shift_changed: boolean;
  } | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    const access = user?.access_level?.toLowerCase() || '';
    const role = user?.role?.toLowerCase() || '';
    const isManagerOrAdmin = 
      access === 'admin' || access === 'manager' || access === 'team_lead' || access === 'service_manager' || access === 'lead' || 
      role.includes('manager') || role.includes('lead');

    if (isManagerOrAdmin) {
      const fetchCounts = async () => {
        try {
          const token = localStorage.getItem('token');
          const headers = token ? { 'Authorization': `Bearer ${token}` } : undefined;
          const [leaveRes, shiftRes, empRes] = await Promise.all([
             fetch(`${API_URL}/api/leaves/`, { headers }),
             fetch(`${API_URL}/api/shifts/`, { headers }),
             fetch(`${API_URL}/api/employees/`, { headers })
          ]);

          const accessClean = user?.access_level?.toLowerCase() || '';
          const isAdmin = accessClean === 'admin';

          let reportingIdentifiers = new Set<string>();
          if (empRes.ok && user?.full_name && !isAdmin) {
            const employees = await empRes.json();
            if (Array.isArray(employees)) {
              reportingIdentifiers = getRecursiveReportingIdentifiers(user.full_name, employees);
            }
          }

          const filterByManager = (req: any): boolean => {
            if (isAdmin) return true;
            if (checkManagerMatch(req.reporting_manager, user?.full_name) || checkManagerMatch(req.handover_to, user?.full_name)) return true;
            if (req.employee_id && reportingIdentifiers.has(String(req.employee_id).toLowerCase())) return true;
            if (req.employee_name && reportingIdentifiers.has(String(req.employee_name).trim().toLowerCase())) return true;
            return false;
          };

          const todayDate = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000);
          const todayStr = todayDate.toISOString().split("T")[0];
          const cutoffDate = new Date(todayDate.getTime() - 3 * 24 * 60 * 60 * 1000);
          const cutoffStr = cutoffDate.toISOString().split("T")[0];

          let leaveCountVal = 0;
          let shiftCountVal = 0;

          if (leaveRes.ok) {
            const leaves = await leaveRes.json();
            leaveCountVal = leaves.filter((l: any) => {
              const isPending = filterByManager(l) && l.status === "Pending";
              if (!isPending) return false;
              const startDate = l.from_date || l.permission_date || l.to_date || "";
              const isFinished = startDate && startDate < todayStr;
              return !isFinished;
            }).length;
            setPendingLeaveCount(leaveCountVal);
          }
          if (shiftRes.ok) {
            const shifts = await shiftRes.json();
            shiftCountVal = shifts.filter((s: any) => {
              const isPending = filterByManager(s) && s.status === "Pending";
              if (!isPending) return false;
              const isOneDayWages = s.request_type === "One Day Wages";
              const startDate = isOneDayWages
                ? (s.created_at ? s.created_at.split(/[T ]/)[0] : "")
                : (s.from_date || s.shift_date || s.to_date || "");
              const isFinished = startDate && startDate < cutoffStr;
              return !isFinished;
            }).length;
            setPendingShiftCount(shiftCountVal);
          }

          setTeamManagementCount(leaveCountVal + shiftCountVal);
        } catch (e) {
          console.error("Failed to fetch pending counts", e);
        }
      };
      fetchCounts();

      socket.on("leave_update", fetchCounts);
      socket.on("shift_update", fetchCounts);

      // Listen for team management notification count updates
      const handleTeamManagementCount = (event: any) => {
        setTeamManagementCount(event.detail);
      };
      window.addEventListener("teamManagementNotificationCount", handleTeamManagementCount);

      return () => {
        socket.off("leave_update", fetchCounts);
        socket.off("shift_update", fetchCounts);
        window.removeEventListener("teamManagementNotificationCount", handleTeamManagementCount);
      };
    }
  }, [user, location.pathname]); // re-fetch when navigating so counts stay fresh

  // Fetch effective shift for the logged-in employee
  useEffect(() => {
    const employeeId = localStorage.getItem('employee_id');
    if (!employeeId) return;

    const fetchShift = async () => {
      try {
        const res = await fetch(`${API_URL}/api/shifts/effective-today/${employeeId}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        });
        if (res.ok) {
          const data = await res.json();
          setEffectiveShift(data);
        }
      } catch (e) {
        // silently ignore
      }
    };

    fetchShift();

    // Instant refresh when any shift request is approved/rejected via Socket.IO
    socket.on('shift_update', fetchShift);

    // 5-minute fallback poll (safety net for missed socket events)
    const interval = setInterval(fetchShift, 5 * 60 * 1000);

    return () => {
      socket.off('shift_update', fetchShift);
      clearInterval(interval);
    };
  }, [user]);


  const accessLevel = `${user?.access_level || ''}`.toLowerCase();
  const isEmployeeOrManager = 
    accessLevel === 'user' || 
    accessLevel === 'manager' || 
    accessLevel === 'standard' ||
    ['copyeditor', 'editorial manager'].includes(user?.role?.toLowerCase() || '');

  return (
    <motion.aside
      initial={{ x: -280 }}
      animate={{ x: 0 }}
      exit={{ x: -280 }}
      transition={{ type: "spring", damping: 22, stiffness: 220 }}
      className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-neutral-200 bg-white shadow-sm md:sticky flex flex-col"
    >
      {/* Logo */}
      <div className="flex flex-col items-center mb-6 mt-2 flex-shrink-0">
        <div className="relative w-[180px] h-[95px] bg-gradient-to-br from-white to-slate-50 rounded-3xl border border-white/40 shadow-[0_8px_30px_rgba(0,0,0,0.12)] flex items-center justify-center overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-[0_10px_40px_rgba(59,130,246,0.25)]">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-orange-500/5" />
          <img src={logo} alt="S4 Carlisle" className="relative z-10 w-[150px] h-auto object-contain drop-shadow-sm select-none pointer-events-none" draggable="false" />
        </div>
        <div className="mt-3.5 px-4 py-1.5 rounded-full text-center" style={{ background: 'linear-gradient(135deg, #eef1f8, #fff5f3)', border: '1px solid rgba(26,48,96,0.2)' }}>
          <span className="font-extrabold text-[13.5px] tracking-[0.05em] select-none peoplehub-typed" style={{ fontFamily: "'Outfit', sans-serif" }}>
            PeopleHub
          </span>
        </div>
      </div>

      {/* Nav Links — scrollable */}
      <nav className="flex-1 overflow-y-auto mt-4 px-3">
        {sidebarItems.map((item) => {
          const isActive = location.pathname === item.path;
          
          if (item.subItems) {
            const isParentActive = location.pathname.startsWith(item.path) || item.subItems.some((sub: any) => location.pathname === sub.path);
            const isOpen = openMenus[item.name] || false;
            
            return (
              <div
                key={item.path}
                className="mb-2"
                onMouseEnter={() => isDesktop && setOpenMenus(prev => ({ ...prev, [item.name]: true }))}
                onMouseLeave={() => isDesktop && setOpenMenus(prev => ({ ...prev, [item.name]: false }))}
              >
                <button
                  onClick={() => setOpenMenus(prev => ({ ...prev, [item.name]: !prev[item.name] }))}
                  className={`flex w-full items-center justify-between rounded-xl px-4 py-3 transition-all duration-200 ${
                    isParentActive || isOpen ? "bg-primary-50 text-primary-700" : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-800"
                  }`}
                >
                  <div className="flex items-center">
                    <item.icon className="mr-3 h-5 w-5" />
                    <span className="font-medium">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.name === "Team Management" && (pendingLeaveCount > 0 || pendingShiftCount > 0) && (
                      <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
                    )}
                    <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                      <ChevronDownIcon className="h-4 w-4" />
                    </motion.div>
                  </div>
                </button>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: "auto" }}
                      exit={{ opacity: 0, y: -8, height: 0 }}
                      transition={{ duration: 0.22, ease: "easeOut" }}
                      className="overflow-hidden"
                    >
                      <div className="mt-2 space-y-1 rounded-2xl border border-neutral-200 bg-neutral-50 p-2">
                        {item.subItems.map((subItem: any) => {
                          const isSubActive = location.pathname === subItem.path;
                          return (
                            <Link
                              key={subItem.path}
                              to={subItem.path}
                              state={subItem.state}
                              className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition-all ${
                                isSubActive ? "bg-primary-50 text-primary-700 font-semibold" : "text-neutral-600 hover:bg-white hover:text-neutral-800"
                              }`}
                            >
                              <subItem.icon className="h-4 w-4" />
                              <div className="relative flex items-center w-full justify-between pr-2">
                                <span>{subItem.name}</span>
                                {subItem.name === "Leave Approval" && pendingLeaveCount > 0 && (
                                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white animate-pulse">
                                    {pendingLeaveCount}
                                  </span>
                                )}
                                {subItem.name === "Shift Approval" && pendingShiftCount > 0 && (
                                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white animate-pulse">
                                    {pendingShiftCount}
                                  </span>
                                )}
                                {subItem.name === "All Approvals" && teamManagementCount > 0 && (
                                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white animate-pulse">
                                    {teamManagementCount > 9 ? "9+" : teamManagementCount}
                                  </span>
                                )}
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          }

          if (item.name === "Reports") {
            const isReportsParent = location.pathname.startsWith("/reports/");
            return (
              <div
                key={item.path}
                ref={reportMenuRef}
                className="mb-2"
                onMouseEnter={() => isDesktop && setShowReportMenu(true)}
                onMouseLeave={() => isDesktop && setShowReportMenu(false)}
              >
                <button
                  onClick={() => setShowReportMenu(!showReportMenu)}
                  className={`flex w-full items-center justify-between rounded-xl px-4 py-3 transition-all duration-200 ${
                    isReportsParent || showReportMenu ? "bg-primary-50 text-primary-700" : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-800"
                  }`}
                >
                  <div className="flex items-center">
                    <item.icon className="mr-3 h-5 w-5" />
                    <span className="font-medium">Reports</span>
                  </div>
                  <motion.div animate={{ rotate: showReportMenu ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronDownIcon className="h-4 w-4" />
                  </motion.div>
                </button>

                <AnimatePresence>
                  {showReportMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: "auto" }}
                      exit={{ opacity: 0, y: -8, height: 0 }}
                      transition={{ duration: 0.22, ease: "easeOut" }}
                      className="overflow-hidden"
                    >
                      <div className="mt-2 space-y-1 rounded-2xl border border-neutral-200 bg-neutral-50 p-2">
                        {reportLinks.map((report) => {
                          const isSubActive = location.pathname === report.path;
                          return (
                            <Link
                              key={report.path}
                              to={report.path}
                              state={report.state}
                              className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition-all ${
                                isSubActive ? "bg-primary-50 text-primary-700 font-semibold" : "text-neutral-600 hover:bg-white hover:text-neutral-800"
                              }`}
                            >
                              <report.icon className="h-4 w-4" />
                              <span>{report.name}</span>
                            </Link>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          }

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`mb-2 flex items-center justify-between rounded-xl px-4 py-3 transition-colors ${
                isActive ? "bg-primary-50 font-semibold text-primary-700" : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-800"
              }`}
            >
              <div className="flex items-center">
                <item.icon className="mr-3 h-5 w-5" />
                {item.name}
              </div>
              {item.name === "Announcements" && unreadAnnouncements > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white animate-pulse">
                  {unreadAnnouncements}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Profile + Logout — always at bottom, never overlaps */}
      <div className="flex-shrink-0 border-t border-neutral-200 bg-white p-4">
        <div className="mb-4 flex items-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-50 border border-neutral-200">
            <img
              key={profileImageUrl}
              src={profileImageUrl}
              alt="Profile"
              className="w-10 h-10 rounded-full object-cover"
              onLoad={(e) => {
                e.currentTarget.style.display = "block";
                const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                if (fallback) fallback.style.display = "none";
              }}
              onError={(e) => {
                e.currentTarget.style.display = "none";
                const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                if (fallback) fallback.style.display = "flex";
              }}
            />
            <div className="w-10 h-10 rounded-full bg-primary-50 text-primary-700 font-semibold items-center justify-center hidden">
              {user?.full_name?.charAt(0)?.toUpperCase()}
            </div>
          </div>
          <Link to="/employee-dashboard?tab=profile" className="ml-3 flex-1 overflow-hidden block hover:opacity-80 transition-opacity cursor-pointer">
            <p className="truncate text-sm font-medium text-neutral-800">{user?.full_name}</p>
            <p className="text-xs text-neutral-400 capitalize">{user?.designation || user?.role_name || user?.role || "Employee"}</p>
            {effectiveShift && (
              <span
                className={`mt-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                  effectiveShift.is_wfh
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : effectiveShift.is_shift_changed
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                    : 'bg-neutral-50 text-neutral-500 border border-neutral-200'
                }`}
                title={effectiveShift.is_shift_changed ? `Today: ${effectiveShift.effective_shift}` : effectiveShift.effective_shift}
              >
                {effectiveShift.is_wfh && (
                  <img
                    src="/wfh-icon.svg"
                    alt="WFH"
                    className="w-3.5 h-3.5"
                  />
                )}
                <span>
                  {effectiveShift.effective_shift === "WFH" ? "General Shift" : effectiveShift.effective_shift}
                  {effectiveShift.is_shift_changed && ' ↺'}
                </span>
              </span>
            )}
          </Link>
        </div>
        <>
  <Button
    variant="outline"
    fullWidth
    icon={ArrowRightOnRectangleIcon}
    className="bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100 hover:text-rose-700 hover:border-rose-300 transition-colors shadow-sm font-bold"
    onClick={onLogout}
  >
    Logout
  </Button>
</>
      </div>
    </motion.aside>
  );
};

export default Sidebar;
