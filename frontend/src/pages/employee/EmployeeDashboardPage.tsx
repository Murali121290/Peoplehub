import { API_URL } from "../../config/api";
import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  HomeIcon,
  CheckCircleIcon,
  ClockIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  UserCircleIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import { useAuthStore } from "../../store/authStore";
import { Attendance } from "../../types/employee.types";

import { socket } from "../../services/socket";
import ConfirmModal from "./components/ConfirmModal";
import PopupModal from "./components/PopupModal";
import BirthdayModal from "../../layouts/components/BirthdayModal";
import EmployeeClarificationModal from "../../layouts/components/EmployeeClarificationModal";
import OverviewTab from "./tabs/OverviewTab";
import LeaveTab from "./tabs/LeaveTab";
import ShiftTab from "./tabs/ShiftTab";
import AttendanceTab from "./tabs/AttendanceTab";
import ProfileTab from "./tabs/ProfileTab";
import DashboardHeaderActions from "./components/DashboardHeaderActions";
import NotificationsPanel from "./components/NotificationsPanel";

const BASE_URL = `${API_URL}/api`;

const NewHireTab: React.FC<{ employees: any[] }> = ({ employees }) => {
  const newJoiners = React.useMemo(() => {
    return employees.filter(emp => {
      if (!emp.joining_date) return false;
      const joinDate = new Date(emp.joining_date);
      const today = new Date();
      const diffTime = today.getTime() - joinDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      // 2 months is roughly 60 days
      return diffDays >= 0 && diffDays <= 60 && (emp.status || "").toLowerCase() !== "inactive";
    }).sort((a, b) => new Date(b.joining_date).getTime() - new Date(a.joining_date).getTime());
  }, [employees]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {newJoiners.length === 0 ? (
        <div className="col-span-full text-center py-12 bg-white rounded-2xl border border-neutral-200 shadow-sm">
          <span className="text-4xl">👋</span>
          <p className="mt-4 text-neutral-500 font-medium">No new joiners in the last 2 months.</p>
        </div>
      ) : (
        newJoiners.map((emp) => {
          const joinDate = new Date(emp.joining_date);
          const formattedJoinDate = joinDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
          const today = new Date();
          const diffDays = Math.floor((today.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24));
          const initials = `${(emp.first_name || "").charAt(0)}${(emp.last_name || "").charAt(0)}`.toUpperCase();

          return (
            <div
              key={emp.id}
              className="relative p-6 bg-white rounded-2xl border border-neutral-200 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md flex flex-col justify-between"
              style={{ minHeight: "150px" }}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  {/* Avatar / Profile Pic */}
                  <img
                    src={emp.profile_image ? `data:image/jpeg;base64,${emp.profile_image}` : "/default-avatar.png"}
                    alt={`${emp.first_name} ${emp.last_name}`}
                    className="w-12 h-12 rounded-2xl object-cover border border-neutral-100 bg-neutral-50"
                    onError={(e) => {
                      e.currentTarget.src = "/default-avatar.png";
                    }}
                  />
                  {/* Days Joined Badge */}
                  <span className="bg-neutral-50 text-neutral-600 border border-neutral-100 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
                    Day {diffDays}
                  </span>
                </div>

                {/* Name & Designation */}
                <h3 className="text-base font-bold text-neutral-800 mb-1">{emp.first_name} {emp.last_name}</h3>
                <p className="text-sm font-semibold text-neutral-500 mb-4">{emp.designation || "N/A"}</p>
              </div>

              {/* Department & Joining Date Badges */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className="inline-flex items-center rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 border border-blue-100">
                  {emp.department || "N/A"}
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs text-neutral-500 font-semibold">
                  <CalendarDaysIcon className="w-4 h-4 text-neutral-400" />
                  {formattedJoinDate}
                </span>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100 } },
};

const tabs = [
  { id: "overview", label: "Overview", icon: HomeIcon },
  { id: "leave", label: "Leave Requests", icon: CalendarDaysIcon },
  { id: "shift", label: "Shift Request", icon: ClockIcon },
  { id: "attendance", label: "Attendance", icon: ClockIcon },
  { id: "new-hire", label: "New Hire", icon: SparklesIcon },
  { id: "profile", label: "Profile", icon: UserCircleIcon },
];

const EmployeeDashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const userId = localStorage.getItem("user_id") || (user ? String(user.id) : "");
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const initialTab = queryParams.get("tab") || "overview";
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    const tab = new URLSearchParams(location.search).get("tab");
    if (tab) {
      setActiveTab(tab);
    } else {
      setActiveTab("overview");
    }
  }, [location.search]);

  // Employee & data state
  const [employees, setEmployees] = useState<any[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [attendanceData, setAttendanceData] = useState<Attendance[]>([]);
  const [shiftRequests, setShiftRequests] = useState<any[]>([]);
  const [managerShiftRequests, setManagerShiftRequests] = useState<any[]>([]);
  const [showCheckInShiftModal, setShowCheckInShiftModal] = useState(false);
  const [selectedCheckInShift, setSelectedCheckInShift] = useState("General Shift");

  const currentEmployee = Array.isArray(employees)
    ? employees.find((emp: any) => Number(emp.user_id) === Number(user?.id))
    : null;
  console.log(currentEmployee);
  console.log("Reporting Manager:", currentEmployee?.reporting_manager);
  console.log("Access Level:", user?.access_level);
  console.log("Role:", user?.role);
  const managerName =
    `${currentEmployee?.first_name || ""} ${currentEmployee?.last_name || ""}`
      .trim()
      .toLowerCase();

  const checkManagerMatch = (reportingManager: string | null | undefined) => {
    if (!reportingManager) return false;
    const repManagerClean = reportingManager.trim().toLowerCase();

    // Exact match
    if (repManagerClean === managerName) return true;

    // Check if reporting manager is just a single name (first name)
    const repManagerParts = repManagerClean.split(/\s+/);
    const loggedManagerParts = managerName.split(/\s+/);

    if (repManagerParts.length === 1 && loggedManagerParts.length > 0) {
      if (loggedManagerParts[0] === repManagerParts[0]) return true;
    }

    if (loggedManagerParts.length === 1 && repManagerParts.length > 0) {
      if (repManagerParts[0] === loggedManagerParts[0]) return true;
    }

    return false;
  };

  const canApprove = ["admin", "manager", "hr"].includes(
    (user?.access_level || user?.role || "").toLowerCase()
  );

  const pendingShiftCount = canApprove
    ? managerShiftRequests.filter(
      (shift: any) =>
        checkManagerMatch(shift.reporting_manager) &&
        shift.status === "Pending"
    ).length
    : 0;

  // Attendance/timer state
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [checkInTime, setCheckInTime] = useState<Date | null>(null);
  const [timer, setTimer] = useState("00:00:00");
  const [lunchTimer, setLunchTimer] = useState("");
  const [teaTimer, setTeaTimer] = useState("");
  const [isLunchBreak, setIsLunchBreak] = useState(false);
  const [isTeaBreak, setIsTeaBreak] = useState(false);
  const [lunchStartTime, setLunchStartTime] = useState<Date | null>(null);
  const [teaStartTime, setTeaStartTime] = useState<Date | null>(null);
  const [totalLunchSeconds, setTotalLunchSeconds] = useState(0);
  const [totalTeaSeconds, setTotalTeaSeconds] = useState(0);
  const [todayAttendanceSummary, setTodayAttendanceSummary] = useState<{
    date: string;
    timer: string;
    totalLunchSeconds: number;
    totalTeaSeconds: number;
  } | null>(null);
  const [hasCheckedOutToday, setHasCheckedOutToday] = useState(false);
  const [shiftDate, setShiftDate] = useState("");
  // Modal state
  const [pendingClarifications, setPendingClarifications] = useState<any[]>([]);
  const [confirmModal, setConfirmModal] = useState(false);
  const [showNotificationsPanel, setShowNotificationsPanel] = useState(false);
  const [birthdayEmployees, setBirthdayEmployees] = useState<any[]>([]);
  const [anniversaryEmployees, setAnniversaryEmployees] = useState<any[]>([]);
  const [birthdayModal, setBirthdayModal] = useState<boolean>(false);
  const [popup, setPopup] = useState({
    show: false,
    type: "success",
    title: "",
    message: "",
  });

  const loadPendingClarifications = async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`${BASE_URL}/attendance/pending-clarifications/${user.id}`);
      const data = await res.json();
      setPendingClarifications(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch pending clarifications", err);
    }
  };

  useEffect(() => {
    loadPendingClarifications();

    socket.on("attendance_update", () => {
      loadPendingClarifications();
    });

    return () => {
      socket.off("attendance_update");
    };
  }, [user?.id]);



  const isMyAnniversary = anniversaryEmployees.some(
    (emp: any) => Number(emp.user_id) === Number(user?.id)
  );
  const isMyBirthday = birthdayEmployees.some(
    (emp: any) => Number(emp.user_id) === Number(user?.id),
  );


  const approvalLeaves = canApprove
    ? leaveRequests.filter(
      (leave: any) => checkManagerMatch(leave.reporting_manager),
    )
    : [];
  const totalBalance =
    (currentEmployee?.sick_leave || 0) +
    (currentEmployee?.casual_leave || 0) +
    (currentEmployee?.privilege_leave || 0);
  const pendingLeaveCount = canApprove
    ? approvalLeaves.filter(
      (leave: any) => leave.status === "Pending"
    ).length
    : 0;

  // Check if today is an approved leave day for the current employee
  const isOnApprovedLeaveToday = (() => {
    if (!currentEmployee || !leaveRequests.length) return false;
    const todayStr = new Date().toISOString().split("T")[0];
    const todayDate = new Date(todayStr);
    return leaveRequests.some((leave: any) => {
      if (leave.status !== "Approved") return false;

if (leave.request_type !== "Leave") return false;

// Do NOT block check-in for half-day leave
if (Number(leave.total_days) <= 0.5) return false;;
      // Match by employee_id (stored as string in DB)
      const leaveEmpId = String(leave.employee_id || "");
      if (
        leaveEmpId !== String(currentEmployee.id) &&
        leaveEmpId !== String(currentEmployee.employee_id)
      ) return false;
      if (!leave.from_date || !leave.to_date) return false;
      const from = new Date(leave.from_date);
      const to = new Date(leave.to_date);
      return todayDate >= from && todayDate <= to;
    });
  })();

  // Check if today is an approved shift change day for the current employee
  const isShiftChangedToday = (() => {
    if (!currentEmployee || !shiftRequests.length) return false;
    const todayStr = new Date().toLocaleDateString("en-CA");
    return shiftRequests.some((shift: any) => {
      if (shift.status !== "Approved") return false;
      return todayStr >= shift.from_date && todayStr <= shift.to_date;
    });
  })();

  const todayActiveShift = (() => {
    if (!currentEmployee) return "General Shift";
    const todayStr = new Date().toLocaleDateString("en-CA");
    const approvedShift = shiftRequests.find((shift: any) => {
      if (shift.status !== "Approved") return false;
      return todayStr >= shift.from_date && todayStr <= shift.to_date;
    });
    return approvedShift ? approvedShift.requested_shift : (currentEmployee.shift_timing || "General Shift");
  })();

  const shiftLockStatus = (() => {
    if (isCheckedIn) return { isLocked: false, label: "", timeLabel: "" };
    const currentHour = new Date().getHours();
    const cleanShift = (todayActiveShift || "").trim().toLowerCase();

    if (cleanShift === "first shift" && currentHour < 6) {
      return { isLocked: true, label: "First Shift Locked", timeLabel: "06:00 AM" };
    }
    if (cleanShift === "second shift" && currentHour < 12) {
      return { isLocked: true, label: "Second Shift Locked", timeLabel: "12:00 PM" };
    }
    if (cleanShift === "night shift" && currentHour < 22) {
      return { isLocked: true, label: "Night Shift Locked", timeLabel: "10:00 PM" };
    }
    return { isLocked: false, label: "", timeLabel: "" };
  })();

  const getTodayKey = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const formatSeconds = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const parseTimeString = (timeStr: string) => {
    if (!timeStr) return new Date();
    if (timeStr.includes("-") && timeStr.includes(":")) {
      const isoStr = timeStr.replace(" ", "T");
      const match = isoStr.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d+)?)$/);
      if (match) {
        return new Date(
          parseInt(match[1], 10),
          parseInt(match[2], 10) - 1,
          parseInt(match[3], 10),
          parseInt(match[4], 10),
          parseInt(match[5], 10),
          parseFloat(match[6])
        );
      }
      return new Date(isoStr);
    }
    if (timeStr.includes("T") || timeStr.includes("-")) {
      return new Date(timeStr);
    }
    const d = new Date();
    const match = timeStr.match(/^(\d+):(\d+)(?::(\d+))?\s*(AM|PM)?$/i);
    if (match) {
      let hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      const seconds = match[3] ? parseInt(match[3], 10) : 0;
      const ampm = match[4];
      if (ampm) {
        if (ampm.toUpperCase() === "PM" && hours < 12) {
          hours += 12;
        } else if (ampm.toUpperCase() === "AM" && hours === 12) {
          hours = 0;
        }
      }
      d.setHours(hours, minutes, seconds, 0);
      return d;
    }
    return new Date();
  };

  const loadTodayAttendanceSummary = (userId: string) => {
    try {
      const summaryJson = localStorage.getItem(`todayAttendanceSummary_${userId}`);
      if (!summaryJson) return null;
      const summary = JSON.parse(summaryJson);
      if (summary?.date === getTodayKey()) {
        return summary;
      }
      localStorage.removeItem(`todayAttendanceSummary_${userId}`);
      return null;
    } catch {
      localStorage.removeItem(`todayAttendanceSummary_${userId}`);
      return null;
    }
  };

  const saveTodayAttendanceSummary = (
    userId: string,
    summary: {
      date: string;
      timer: string;
      totalLunchSeconds: number;
      totalTeaSeconds: number;
    },
  ) => {
    localStorage.setItem(`todayAttendanceSummary_${userId}`, JSON.stringify(summary));
  };

  const clearTodayAttendanceSummary = (userId: string) => {
    localStorage.removeItem(`todayAttendanceSummary_${userId}`);
    setTodayAttendanceSummary(null);
  };

  // --- API Calls ---

  const fetchTodayAnniversaries = async () => {
    try {
      const res = await fetch(`${BASE_URL}/employees/anniversaries/today`);
      if (!res.ok) throw new Error("Failed to load anniversaries");
      const data = await res.json();
      setAnniversaryEmployees(Array.isArray(data) ? data : []);
    } catch (err) {
      setAnniversaryEmployees([]);
    }
  };

  const fetchTodayBirthdays = async () => {
    try {
      const res = await fetch(`${BASE_URL}/employees/birthdays/today`);
      if (!res.ok) throw new Error("Failed to load birthdays");
      const data = await res.json();
      setBirthdayEmployees(Array.isArray(data) ? data : []);
    } catch (err) {
      setBirthdayEmployees([]);
    }
  };

  const loadLeaves = async () => {
    try {
      const res = await fetch(`${BASE_URL}/leaves/`);
      const data = await res.json();
      setLeaveRequests(data);
    } catch (err) {
      console.log(err);
    }
  };


  const loadShiftRequests = async () => {
    if (!currentEmployee?.user_id) return;
    try {
      const res = await fetch(
        `${BASE_URL}/shifts/employee/${currentEmployee.employee_id}`,
      );
      const data = await res.json();
      setShiftRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.log(err);
    }
  };

  const loadManagerShiftRequests = async () => {

    if (!currentEmployee) {
      console.log("Current employee not loaded");
      return;
    }

    try {

      const managerName =
        `${currentEmployee.first_name} ${currentEmployee.last_name}`.trim();

      console.log("Logged In Manager:", managerName);

      const url =
        `${BASE_URL}/shifts/approvals/${encodeURIComponent(managerName)}`;

      console.log("Request URL:", url);

      const res = await fetch(url);

      if (!res.ok) {
        console.error("Failed to fetch approval requests");
        setManagerShiftRequests([]);
        return;
      }

      const data = await res.json();

      console.log("Approval Requests:", data);

      setManagerShiftRequests(
        Array.isArray(data) ? data : []
      );

    } catch (err) {

      console.error("Load Manager Shift Requests Error:", err);

      setManagerShiftRequests([]);

    }

  };

  // --- Attendance Handlers ---
  const handleCheckIn = async (selectedShift?: string) => {
    try {
      const userId = localStorage.getItem("user_id");
      if (!userId) {
        toast.error("Unable to identify current user.");
        return;
      }
      const response = await fetch(`${BASE_URL}/attendance/checkin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          user_id: Number(userId),
          selected_shift: selectedShift
        }),
      });
      const data = await response.json();
      if (!data.success) {
        toast.error(data.message || data.error || "Check In Failed");
        return;
      }
      toast.success(data.message || "You have checked in successfully.");
      const nowIso = new Date().toISOString();
      localStorage.setItem(`checkInTime_${userId}`, nowIso);
      localStorage.setItem(`checkInDate_${userId}`, getTodayKey());
      clearTodayAttendanceSummary(userId);
      setIsCheckedIn(true);
      setCheckInTime(new Date());
      const attendanceResponse = await fetch(
        `${BASE_URL}/attendance/history/${userId}`,
      );
      const attendanceHistory = await attendanceResponse.json();
      setAttendanceData(attendanceHistory);
    } catch (error) {
      toast.error("Something went wrong while checking in.");
    }
  };

  const handleCheckInClick = () => {
    setSelectedCheckInShift(todayActiveShift || "General Shift");
    setShowCheckInShiftModal(true);
  };

  const handleConfirmCheckInShift = async () => {
    setShowCheckInShiftModal(false);

    const cleanActive = (todayActiveShift || "").trim().toLowerCase();
    const cleanSelected = (selectedCheckInShift || "").trim().toLowerCase();

    if (cleanSelected !== cleanActive) {
      try {
        if (!currentEmployee) {
          toast.error("Employee details not found");
          return;
        }

        const todayStr = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD local format

        const payload = {
          employee_id: currentEmployee.employee_id || currentEmployee.id,
          employee_name: `${currentEmployee.first_name} ${currentEmployee.last_name}`,
          current_shift: todayActiveShift,
          requested_shift: selectedCheckInShift,
          request_type: selectedCheckInShift === "WFH" ? "WFH" : "Shift",
          from_date: todayStr,
          to_date: todayStr,
          reporting_manager: currentEmployee.reporting_manager || "Admin",
          reason: "Requested via Check-In for today.",
          status: "Approved"
        };

        const response = await fetch(`${BASE_URL}/shifts/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const data = await response.json();
        if (!response.ok) {
          toast.error(data.message || "Failed to save shift details.");
          return;
        }

        toast.success(`Today's mode changed to ${selectedCheckInShift}.`);
        loadShiftRequests();
        loadManagerShiftRequests();

        // Check timing lock on the newly selected shift
        const currentHour = new Date().getHours();
        let isLocked = false;
        let timeLabel = "";

        if (cleanSelected === "first shift" && currentHour < 6) {
          isLocked = true;
          timeLabel = "06:00 AM";
        } else if (cleanSelected === "second shift" && currentHour < 12) {
          isLocked = true;
          timeLabel = "12:00 PM";
        } else if (cleanSelected === "night shift" && currentHour < 22) {
          isLocked = true;
          timeLabel = "10:00 PM";
        }

        if (isLocked) {
          toast.error(`${selectedCheckInShift} starts at ${timeLabel}. Check-in is locked until then.`);
          return;
        }

        await handleCheckIn(selectedCheckInShift);
      } catch (err) {
        console.error(err);
        toast.error("Error setting shift timing.");
      }
    } else {
      const currentHour = new Date().getHours();
      let isLocked = false;
      let timeLabel = "";

      if (cleanSelected === "first shift" && currentHour < 6) {
        isLocked = true;
        timeLabel = "06:00 AM";
      } else if (cleanSelected === "second shift" && currentHour < 12) {
        isLocked = true;
        timeLabel = "12:00 PM";
      } else if (cleanSelected === "night shift" && currentHour < 22) {
        isLocked = true;
        timeLabel = "10:00 PM";
      }

      if (isLocked) {
        toast.error(`${selectedCheckInShift} starts at ${timeLabel}. Check-in is locked until then.`);
        return;
      }

      await handleCheckIn(selectedCheckInShift);
    }
  };

  const handleCheckOut = async () => {
    try {
      if (isLunchBreak) {
        toast.error("Lunch Break Active. Please stop lunch break before checkout.");
        return;
      }
      if (isTeaBreak) {
        toast.error("Tea Break Active. Please stop tea break before checkout.");
        return;
      }
      const userId = localStorage.getItem("user_id");
      if (!userId) {
        toast.error("User ID not found.");
        return;
      }
      const response = await fetch(`${BASE_URL}/attendance/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: Number(userId) }),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || "Checkout Failed");
        return;
      }
      const attendanceResponse = await fetch(
        `${BASE_URL}/attendance/history/${userId}`,
      );
      const attendanceHistory = await attendanceResponse.json();
      setAttendanceData(attendanceHistory);
      const todayDate = getTodayKey();
      const totalWorkedSeconds = checkInTime
        ? Math.max(
          Math.floor((new Date().getTime() - checkInTime.getTime()) / 1000) -
          totalLunchSeconds -
          totalTeaSeconds,
          0,
        )
        : 0;
      const formattedTimer = formatSeconds(totalWorkedSeconds);
      const summary = {
        date: todayDate,
        timer: formattedTimer,
        totalLunchSeconds,
        totalTeaSeconds,
      };
      saveTodayAttendanceSummary(userId, summary);
      setTodayAttendanceSummary(summary);
      setIsCheckedIn(false);
      setHasCheckedOutToday(true);
      setCheckInTime(null);
      setTimer(formattedTimer);
      localStorage.removeItem(`checkInTime_${userId}`);
      toast.success("You have checked out successfully.");
      window.dispatchEvent(new Event('refreshTeamStatus'));
    } catch (error) {
      toast.error("Something went wrong while checking out.");
    }
  };

  const handleLunchBreak = async () => {
    if (!isCheckedIn) {
      toast.error("Check-In Required. Please check in before starting Lunch Break.");
      return;
    }
    try {
      const userId = localStorage.getItem("user_id");
      if (!userId) return;
      if (!isLunchBreak) {
        const response = await fetch(`${BASE_URL}/attendance/lunch-break`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: Number(userId), action: "start" }),
        });
        const data = await response.json();
        if (!response.ok || !data.success) {
          toast.error(data.error || "Failed to start lunch break");
          return;
        }
        setLunchStartTime(new Date());
        setIsLunchBreak(true);
        window.dispatchEvent(new Event('refreshTeamStatus'));
      } else {
        if (lunchStartTime) {
          const seconds = Math.max(
            0,
            Math.floor(
              (new Date().getTime() - lunchStartTime.getTime()) / 1000,
            ),
          );
          setTotalLunchSeconds((prev) => prev + seconds);
          setIsLunchBreak(false);
          setLunchStartTime(null);
          await fetch(`${BASE_URL}/attendance/lunch-break`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              user_id: Number(userId),
              action: "stop",
              break_seconds: seconds,
            }),
          });
          window.dispatchEvent(new Event('refreshTeamStatus'));
        }
      }
    } catch (error) {
      toast.error("Something went wrong.");
    }
  };

  const handleTeaBreak = async () => {
    const currentUserId = localStorage.getItem("user_id");
    if (!currentUserId) return;

    if (!isTeaBreak && !isCheckedIn) {
      toast.error("Check-In Required. Please check in before starting Tea Break.");
      return;
    }

    try {
      if (isTeaBreak) {
        const response = await fetch(`${API_URL}/api/attendance/tea-break`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: Number(currentUserId), action: "stop" }),
        });
        const data = await response.json();
        if (!data.success) {
          toast.error(data.error || "Failed to stop tea break");
          return;
        }
        if (teaStartTime) {
          const seconds = Math.max(
            0,
            Math.floor((new Date().getTime() - teaStartTime.getTime()) / 1000)
          );
          setTotalTeaSeconds((prev) => prev + seconds);
        }
        setIsTeaBreak(false);
        setTeaStartTime(null);
        setTeaTimer("");
        window.dispatchEvent(new Event('refreshTeamStatus'));
      } else {
        const response = await fetch(`${API_URL}/api/attendance/tea-break`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: Number(currentUserId), action: "start" }),
        });
        const data = await response.json();
        if (!data.success) {
          toast.error(data.error || "Failed to start tea break");
          return;
        }
        setTeaStartTime(new Date());
        setIsTeaBreak(true);
        window.dispatchEvent(new Event('refreshTeamStatus'));
      }
    } catch (error) {
      toast.error("Something went wrong while handling Tea Break.");
    }
  };

  // --- Leave Handlers ---
  const handleLeaveSubmit = async (
    e: React.FormEvent,
    leaveForm: any,
    editingLeave: any,
  ) => {

    e.preventDefault();

    try {

      let response;

      const payload = {
        employee_id: currentEmployee?.employee_id || currentEmployee?.id,
        employee_name: `${currentEmployee?.first_name} ${currentEmployee?.last_name}`,

        request_type: leaveForm.requestType,

        leave_type: leaveForm.leaveType,

        from_date: leaveForm.fromDate,
        to_date: leaveForm.toDate,

        permission_date: leaveForm.permissionDate,
        from_time: leaveForm.fromTime,
        to_time: leaveForm.toTime,

        total_days: leaveForm.totalDays,

        reporting_manager: currentEmployee?.reporting_manager,

        handover_to: leaveForm.handoverTo,

        reason: leaveForm.reason,
      };

      if (editingLeave) {

        response = await fetch(
          `${BASE_URL}/leaves/update/${editingLeave.id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          }
        );

      } else {

        response = await fetch(
          `${BASE_URL}/leaves/`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          }
        );

      }

      const data = await response.json();

      if (data.success) {

        toast.success(
          editingLeave
            ? "Request Updated Successfully"
            : `${leaveForm.requestType} Applied Successfully`
        );

        loadLeaves();

      } else {

        toast.error(data.error || data.message || "Operation Failed");

      }

    } catch (error) {

      console.error(error);

      toast.error("Server Error");

    }

  };

  const approveLeave = async (id: number) => {
    try {
      const res = await fetch(`${BASE_URL}/leaves/approve/${id}`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        }
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Leave Approved");
        loadLeaves();
      }
    } catch (err) {
      console.log(err);
    }
  };

  const rejectLeave = async (id: number) => {
    try {
      const res = await fetch(`${BASE_URL}/leaves/reject/${id}`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        }
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Leave Rejected");
        loadLeaves();
      }
    } catch (err) {
      console.log(err);
    }
  };

  const cancelLeave = async (id: number) => {
    try {
      const res = await fetch(`${BASE_URL}/leaves/${id}/cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          employee_id: currentEmployee?.id
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Your leave has been cancelled successfully.");
        loadLeaves();
      } else {
        toast.error(data.message || "Failed to cancel leave");
      }
    } catch (err) {
      console.log(err);
      toast.error("Error cancelling leave");
    }
  };

  // --- Shift Handlers ---
  const submitShiftRequest = async (shiftForm: any) => {
    try {
      if (!currentEmployee) {
        toast.error("Employee details not found");
        return;
      }

      console.log("Sending Shift Request:", shiftForm);

      const response = await fetch(`${BASE_URL}/shifts/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employee_id: shiftForm.employee_id,
          employee_name: shiftForm.employee_name,
          current_shift: shiftForm.current_shift,
          requested_shift: shiftForm.requested_shift,
          current_work_mode: shiftForm.current_work_mode,
          requested_work_mode: shiftForm.requested_work_mode,
          request_type: shiftForm.request_type,
          from_date: shiftForm.from_date,
          to_date: shiftForm.to_date,
          reporting_manager: shiftForm.reporting_manager,
          reason: shiftForm.reason,
        }),
      });

      const data = await response.json();

      console.log(data);

      if (!response.ok) {
        toast.error(data.message);
        return;
      }

      toast.success("Shift Request Submitted Successfully");

      loadShiftRequests();
      loadManagerShiftRequests();

    } catch (err) {
      console.error(err);
      toast.error("Server Error");
    }
  };

  const approveShift = async (id: number) => {
    const response = await fetch(`${BASE_URL}/shifts/approve/${id}`, {
      method: "PUT",
    });
    const data = await response.json();
    if (data.success) {
      toast.success("Shift Approved Successfully");
      loadShiftRequests();
      loadManagerShiftRequests();
    }
  };

  const rejectShift = async (id: number) => {
    const response = await fetch(`${BASE_URL}/shifts/reject/${id}`, {
      method: "PUT",
    });
    const data = await response.json();
    if (data.success) {
      toast.success("Shift Rejected");
      loadShiftRequests();
      loadManagerShiftRequests();
    }
  };

  const cancelShiftRequest = async (id: number) => {
    try {
      const response = await fetch(`${BASE_URL}/shifts/cancel/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        }
      });
      const data = await response.json();
      if (response.ok && data.success) {
        toast.success("Shift Request Cancelled Successfully");
        loadShiftRequests();
        loadManagerShiftRequests();
      } else {
        toast.error(data.message || data.error || "Failed to cancel request");
      }
    } catch (err) {
      console.error(err);
      toast.error("Server Error");
    }
  };

  const sendBirthdayWish = async (emp: any, customMessage: string) => {
    const senderId = localStorage.getItem("employee_id");
    if (!senderId) {
      toast.error("Sender employee details not found.");
      return;
    }
    try {
      const res = await fetch(`${BASE_URL}/birthday-wishes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sender_id: Number(senderId),
          receiver_id: emp.id,
          message: customMessage,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to send wishes.");
        return;
      }
      toast.success("Birthday wishes sent successfully!");
    } catch (e) {
      console.error(e);
      toast.error("Failed to send wishes.");
    }
  };

  // --- Auto Check-In Reminder (Every 5 mins) ---
  useEffect(() => {
    if (isCheckedIn || hasCheckedOutToday || !currentEmployee) return;

    // Determine if on leave today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const isOnLeaveToday = leaveRequests.some((leave: any) => {
      const leaveEmpId = String(leave.employee_id || "");
      if (
        leaveEmpId !== String(currentEmployee.id) &&
        leaveEmpId !== String(currentEmployee.employee_id)
      ) return false;
      if (leave.status !== "Approved") return false;
if (leave.request_type !== "Leave") return false;

// Half-day leave should not stop reminders/check-in
if (Number(leave.total_days) === 0.5) return false;
      const fromDate = new Date(leave.from_date);
      const toDate = new Date(leave.to_date);
      fromDate.setHours(0, 0, 0, 0);
      toDate.setHours(0, 0, 0, 0);
      return today >= fromDate && today <= toDate;
    });

    if (isOnLeaveToday) return;

    const intervalId = setInterval(() => {
      toast("🔔 Reminder: Don't forget to check in for today's attendance!", {
        duration: 8000,
        icon: '⏰',
      });
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(intervalId);
  }, [isCheckedIn, hasCheckedOutToday, currentEmployee, leaveRequests]);



  useEffect(() => {
    if (currentEmployee) {
      loadShiftRequests();
      loadManagerShiftRequests();
    }
  }, [currentEmployee]);

  // --- Effects ---
  useEffect(() => {
    fetch(`${BASE_URL}/employees/`)
      .then((res) => res.json())
      .then((data) => setEmployees(data))
      .catch((err) => console.error(err));
    fetchTodayBirthdays();
    fetchTodayAnniversaries();
    loadLeaves();
  }, []);

  useEffect(() => {
    const userId = localStorage.getItem("user_id");
    if (!userId) return;
    const savedCheckInDate = localStorage.getItem(`checkInDate_${userId}`);
    const savedCheckIn = localStorage.getItem(`checkInTime_${userId}`);
    const todayKey = new Date().toISOString().split("T")[0];
    if (savedCheckIn && savedCheckInDate === todayKey) {
      setIsCheckedIn(true);
      setCheckInTime(new Date(savedCheckIn));
    } else {
      localStorage.removeItem(`checkInTime_${userId}`);
      localStorage.removeItem(`checkInDate_${userId}`);
    }
  }, []);

  useEffect(() => {
    const userId = localStorage.getItem("user_id");
    if (!userId) return;
    fetch(`${BASE_URL}/attendance/status/${userId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.checked_in) {
          const checkIn = parseTimeString(data.check_in);
          const lunchSecs = (data.lunch_minutes || 0) * 60;
          const teaSecs = (data.tea_minutes || 0) * 60;
          setIsCheckedIn(true);
          setCheckInTime(checkIn);
          setIsLunchBreak(data.lunch_break || false);
          setIsTeaBreak(data.tea_break || false);
          if (data.lunch_break && data.lunch_start) {
            setLunchStartTime(parseTimeString(data.lunch_start));
          } else {
            setLunchStartTime(null);
          }

          if (data.tea_break && data.tea_start) {
            setTeaStartTime(parseTimeString(data.tea_start));
          } else {
            setTeaStartTime(null);
          }
          setTotalLunchSeconds(lunchSecs);
          setTotalTeaSeconds(teaSecs);
          // Immediately show the correct timer on re-login
          const elapsedSeconds = Math.floor((new Date().getTime() - checkIn.getTime()) / 1000);
          const workingSeconds = Math.max(elapsedSeconds - lunchSecs - teaSecs, 0);
          const hrs = Math.floor(workingSeconds / 3600);
          const mins = Math.floor((workingSeconds % 3600) / 60);
          const secs = workingSeconds % 60;
          setTimer(`${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`);
          clearTodayAttendanceSummary(userId);
        } else {
          setIsCheckedIn(false);
          const summary = loadTodayAttendanceSummary(userId);
          if (summary) {
            setTodayAttendanceSummary(summary);
            setHasCheckedOutToday(true);
            setTimer(summary.timer);
            setTotalLunchSeconds(summary.totalLunchSeconds);
            setTotalTeaSeconds(summary.totalTeaSeconds);
          }
        }
      })
      .catch((err) => console.error("Attendance Status Error:", err));
  }, []);

  useEffect(() => {
    const userId = localStorage.getItem("user_id");
    if (!userId) return;

    fetch(`${BASE_URL}/attendance/history/${userId}`)
      .then((res) => res.json())
      .then((data) => {
        setAttendanceData(data);

        // Find today's attendance
        const today = new Date().toISOString().split("T")[0];

        const todayRecord = data.find(
          (record: any) => record.date === today
        );

        // If today's attendance is available and employee has checked out
        if (
          todayRecord &&
          todayRecord.checkOut !== "-" &&
          todayRecord.workingHours
        ) {
          const totalSeconds = Math.floor(
            Number(todayRecord.workingHours) * 3600
          );

          setHasCheckedOutToday(true);
          setTimer(formatSeconds(totalSeconds));

          setTotalLunchSeconds(
            (todayRecord.lunchMinutes || 0) * 60
          );

          setTotalTeaSeconds(
            (todayRecord.teaMinutes || 0) * 60
          );
        }
      })
      .catch((err) => console.log(err));
  }, []);

  useEffect(() => {
    socket.on("attendance_update", (payload: any) => {
      if (Number(payload.user_id) === Number(user?.id)) {
        setIsCheckedIn(payload.checked_in);
        setIsLunchBreak(payload.lunch_break);
        setIsTeaBreak(payload.tea_break);
        if (payload.check_in) {
          setCheckInTime(parseTimeString(payload.check_in));
        } else {
          setCheckInTime(null);
        }
        if (payload.lunch_break && payload.lunch_start) {
          setLunchStartTime(parseTimeString(payload.lunch_start));
        } else {
          setLunchStartTime(null);
        }

        if (payload.tea_break && payload.tea_start) {
          setTeaStartTime(parseTimeString(payload.tea_start));
        } else {
          setTeaStartTime(null);
        }
        setTotalLunchSeconds((payload.lunch_minutes || 0) * 60);
        setTotalTeaSeconds((payload.tea_minutes || 0) * 60);

        const userId = localStorage.getItem("user_id");
        if (userId) {
          if (!payload.checked_in && payload.check_out) {
            const summary = {
              date: new Date().toISOString().split("T")[0],
              timer: formatSeconds(Math.floor((payload.working_hours || 0) * 3600)),
              totalLunchSeconds: (payload.lunch_minutes || 0) * 60,
              totalTeaSeconds: (payload.tea_minutes || 0) * 60,
            };
            saveTodayAttendanceSummary(userId, summary);
            setTodayAttendanceSummary(summary);
            setTimer(summary.timer);
          }
          fetch(`${BASE_URL}/attendance/history/${userId}`)
            .then((res) => res.json())
            .then((data) => setAttendanceData(data));
        }
      }
    });

    socket.on("leave_update", (payload: any) => {
      // Update leave request list
      setLeaveRequests((prev) => {
        const index = prev.findIndex((l) => l.id === payload.id);
        if (index > -1) {
          const next = [...prev];
          next[index] = payload;
          return next;
        }
        return [payload, ...prev];
      });

      // If the leave belongs to current user, we should update their leave balance in employees state!
      if (Number(payload.employee_id) === Number(currentEmployee?.id)) {
        // Reload employee details from backend to sync balances
        fetch(`${BASE_URL}/employees/`)
          .then((res) => res.json())
          .then((data) => setEmployees(data))
          .catch((err) => console.error(err));
      }
    });

    socket.on("shift_update", (payload: any) => {
      if (payload.action === "delete") {
        setShiftRequests((prev) => prev.filter((s) => s.id !== payload.id));
        setManagerShiftRequests((prev) => prev.filter((s) => s.id !== payload.id));
        return;
      }

      // If it belongs to current employee
      if (Number(payload.employee_id) === Number(currentEmployee?.user_id)) {
        setShiftRequests((prev) => {
          const index = prev.findIndex((s) => s.id === payload.id);
          if (index > -1) {
            const next = [...prev];
            next[index] = payload;
            return next;
          }
          return [payload, ...prev];
        });
      }

      // If we are their manager
      if (checkManagerMatch(payload.reporting_manager)) {
        setManagerShiftRequests((prev) => {
          const index = prev.findIndex((s) => s.id === payload.id);
          if (index > -1) {
            const next = [...prev];
            next[index] = payload;
            return next;
          }
          return [payload, ...prev];
        });
      }
    });

    socket.on("employee_profile_update", (payload: any) => {
      setEmployees((prev) =>
        prev.map((emp) => (emp.id === payload.id ? { ...emp, ...payload } : emp))
      );
    });

    return () => {
      socket.off("attendance_update");
      socket.off("leave_update");
      socket.off("shift_update");
      socket.off("employee_profile_update");
    };
  }, [currentEmployee, managerName]);

  useEffect(() => {
    if (
      birthdayEmployees.length > 0 &&
      !sessionStorage.getItem("birthday_popup_shown")
    ) {
      setBirthdayModal(true);
      sessionStorage.setItem("birthday_popup_shown", "true");
    }
  }, [birthdayEmployees]);

  useEffect(() => {
    if (!showNotificationsPanel && !sessionStorage.getItem("attendance_popup_shown")) {
      sessionStorage.setItem("attendance_popup_shown", "true");
    }
  }, [showNotificationsPanel]);

  // Remove auto-close logic for birthday modal as we use a persistent side panel now

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isCheckedIn && checkInTime) {
      interval = setInterval(() => {
        const now = new Date().getTime();
        const elapsed = Math.floor((now - checkInTime.getTime()) / 1000);

        // Add currently-running break seconds on top of already-accumulated seconds for sub-timers
        const runningLunch =
          isLunchBreak && lunchStartTime
            ? Math.max(0, Math.floor((now - lunchStartTime.getTime()) / 1000))
            : 0;
        const runningTea =
          isTeaBreak && teaStartTime
            ? Math.max(0, Math.floor((now - teaStartTime.getTime()) / 1000))
            : 0;

        const workingSeconds = Math.max(
          elapsed - totalLunchSeconds - runningLunch - totalTeaSeconds - runningTea,
          0,
        );
        const hrs = Math.floor(workingSeconds / 3600);
        const mins = Math.floor((workingSeconds % 3600) / 60);
        const secs = workingSeconds % 60;
        setTimer(
          `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`,
        );

        if (isLunchBreak && lunchStartTime) {
          const lHrs = Math.floor(runningLunch / 3600);
          const lMins = Math.floor((runningLunch % 3600) / 60);
          const lSecs = runningLunch % 60;
          setLunchTimer(`${lHrs > 0 ? String(lHrs).padStart(2, "0") + ":" : ""}${String(lMins).padStart(2, "0")}:${String(lSecs).padStart(2, "0")}`);
        } else {
          setLunchTimer("");
        }

        if (isTeaBreak && teaStartTime) {
          const tHrs = Math.floor(runningTea / 3600);
          const tMins = Math.floor((runningTea % 3600) / 60);
          const tSecs = runningTea % 60;
          setTeaTimer(`${tHrs > 0 ? String(tHrs).padStart(2, "0") + ":" : ""}${String(tMins).padStart(2, "0")}:${String(tSecs).padStart(2, "0")}`);
        } else {
          setTeaTimer("");
        }

      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [
    isCheckedIn,
    checkInTime,
    isLunchBreak,
    isTeaBreak,
    lunchStartTime,
    teaStartTime,
    totalLunchSeconds,
    totalTeaSeconds,
  ]);

  useEffect(() => {
    if (activeTab === "shift") {
      loadShiftRequests();
      loadManagerShiftRequests();
    }
  }, [activeTab]);

  return (
    <>
      <ConfirmModal
        isOpen={confirmModal}
        onCancel={() => setConfirmModal(false)}
        onConfirm={() => {
          setConfirmModal(false);
          handleCheckOut();
        }}
      />

      <PopupModal
        popup={popup}
        onClose={() => setPopup({ ...popup, show: false })}
      />

      {birthdayModal && birthdayEmployees.length > 0 && (
        <BirthdayModal
          birthdayEmployees={birthdayEmployees}
          isMyBirthday={isMyBirthday}
          currentEmployee={currentEmployee}
          user={user}
          onClose={() => setBirthdayModal(false)}
          onSendWish={sendBirthdayWish}
        />
      )}

      <div className="min-h-screen bg-neutral-50">
        <NotificationsPanel
          isOpen={showNotificationsPanel}
          onClose={() => setShowNotificationsPanel(false)}
          birthdayEmployees={birthdayEmployees}
          isMyBirthday={isMyBirthday}
          anniversaryEmployees={anniversaryEmployees}
          isMyAnniversary={isMyAnniversary}
        />

        {/* Sticky Header & Navigation Container */}
        <div className="sticky top-0 z-20 bg-white shadow-sm border-b border-neutral-200">
          {/* Header */}
          <header className="bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-16">
                <div className="flex items-center gap-3">
                  {/* {currentEmployee?.id ? (
                    <img
                      src={`${API_URL}/api/employees/image/${currentEmployee.id}`}
                      alt="Profile"
                      className="w-10 h-10 rounded-full object-cover border-2 border-primary-200 shadow-sm"
                      onError={(e) => {
                        e.currentTarget.src = "https://cdn-icons-png.flaticon.com/512/149/149071.png";
                      }}
                    />
                  ) : (
                  <div className="w-10 h-10 bg-primary-500 rounded-lg flex items-center justify-center">
                    <SparklesIcon className="w-6 h-6 text-white" />
                  </div>
                  )} */}
                  <div>
                    <h1 className="text-xl font-bold text-neutral-800">
                      Dashboard
                    </h1>
                  </div>
                </div>

                {/* Check-In & Break Actions */}
                <div>
                  <DashboardHeaderActions
                    isCheckedIn={isCheckedIn}
                    timer={timer}
                    totalLunchSeconds={totalLunchSeconds}
                    totalTeaSeconds={totalTeaSeconds}
                    isLunchBreak={isLunchBreak}
                    isTeaBreak={isTeaBreak}
                    lunchTimer={lunchTimer}
                    teaTimer={teaTimer}
                    hasCheckedOutToday={hasCheckedOutToday}
                    isOnLeave={isOnApprovedLeaveToday}
                    isShiftChanged={isShiftChangedToday}
                    isShiftLocked={shiftLockStatus.isLocked}
                    shiftLockLabel={shiftLockStatus.label}
                    shiftLockTime={shiftLockStatus.timeLabel}
                    onCheckInOut={() => isCheckedIn ? setConfirmModal(true) : handleCheckInClick()}
                    onLunchBreak={handleLunchBreak}
                    onTeaBreak={handleTeaBreak}
                    onOpenNotifications={() => setShowNotificationsPanel(true)}
                  />
                </div>
              </div>
            </div>
          </header>

          {/* Navigation */}
          <nav className="bg-white border-t border-neutral-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex space-x-1 overflow-x-auto py-2">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => navigate("?tab=" + tab.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === tab.id
                        ? "bg-primary-50 text-primary-700 border-b-2 border-primary-600"
                        : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-800"
                        }`}
                    >
                      <Icon className="w-4 h-4" />
                      <div className="relative flex items-center">
                        <span>{tab.label}</span>
                        {/* Notifications moved to sidebar */}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </nav>
        </div>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <motion.div
            key={activeTab}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-6"
          >
            {activeTab === "overview" && (
              <OverviewTab
                currentEmployee={currentEmployee}
                user={user}
                itemVariants={itemVariants}
              />
            )}
            {activeTab === "leave" && (
              <LeaveTab
                leaveRequests={leaveRequests}
                currentEmployee={currentEmployee}
                employees={employees}
                approvalLeaves={approvalLeaves}
                totalBalance={totalBalance}
                itemVariants={itemVariants}
                onApprove={approveLeave}
                onReject={rejectLeave}
                onCancel={cancelLeave}
                onSubmitLeave={handleLeaveSubmit}
              />
            )}
            {activeTab === "shift" && (
              <ShiftTab
                currentEmployee={currentEmployee}
                shiftRequests={shiftRequests}
                managerShiftRequests={managerShiftRequests}
                leaveRequests={leaveRequests}
                onSubmitShift={submitShiftRequest}
                onApprove={approveShift}
                onReject={rejectShift}
                onCancelShift={cancelShiftRequest}
              />
            )}
            {activeTab === "attendance" && (
              <AttendanceTab attendanceData={attendanceData} currentEmployee={currentEmployee} />
            )}
            {activeTab === "new-hire" && (
              <NewHireTab employees={employees} />
            )}
            {activeTab === "profile" && <ProfileTab />}
          </motion.div>
        </main>
      </div>

      {pendingClarifications.length > 0 && (
        <EmployeeClarificationModal
          pendingItems={pendingClarifications}
          userId={Number(currentEmployee?.id || user?.id || 0)}
          onSubmitted={() => loadPendingClarifications()}
        />
      )}

      {showCheckInShiftModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 backdrop-blur-sm transition-opacity duration-300">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-neutral-100 transform scale-100 transition-transform duration-300 flex flex-col gap-4">
            {/* Header */}
            <div className="flex justify-between items-center pb-2.5 border-b border-neutral-100">
              <div>
                <h3 className="text-lg font-bold text-neutral-800 tracking-tight flex items-center gap-2">
                  <span className="text-[18px]">⚙️</span> Today's Attendance Mode
                </h3>
                <p className="text-xs text-neutral-450 font-semibold mt-0.5">Select a shift timing or WFH for today</p>
              </div>
              <button
                onClick={() => setShowCheckInShiftModal(false)}
                className="p-1 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>

            {/* Grid options - 2 Columns (Compact, No Scroll) */}
            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  name: "General Shift",
                  time: "09:00 AM - 06:00 PM",
                  icon: (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                    </svg>
                  ),
                  color: "bg-blue-50 text-blue-600 border-blue-100",
                  span: "col-span-1"
                },
                {
                  name: "First Shift",
                  time: "06:00 AM - 02:00 PM",
                  icon: (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m11.314 11.314l.707.707M12 7a5 5 0 100 10 5 5 0 000-10z"/>
                    </svg>
                  ),
                  color: "bg-amber-50 text-amber-600 border-amber-100",
                  span: "col-span-1"
                },
                {
                  name: "Second Shift",
                  time: "12:00 PM - 08:00 PM",
                  icon: (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m11.314 11.314l.707.707M12 7a5 5 0 100 10 5 5 0 000-10z"/>
                    </svg>
                  ),
                  color: "bg-orange-50 text-orange-600 border-orange-100",
                  span: "col-span-1"
                },
                {
                  name: "WFH",
                  time: "Flexible remote work",
                  icon: (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
                    </svg>
                  ),
                  color: "bg-emerald-50 text-emerald-600 border-emerald-100",
                  span: "col-span-2"
                }
              ].map((opt) => {
                const isSelected = selectedCheckInShift === opt.name;
                return (
                  <div
                    key={opt.name}
                    onClick={() => setSelectedCheckInShift(opt.name)}
                    className={`flex items-center gap-3 p-3 border rounded-2xl cursor-pointer transition-all duration-200 group ${opt.span} ${
                      isSelected
                        ? "border-primary-500 bg-primary-50/20 ring-2 ring-primary-100 shadow-sm"
                        : "border-neutral-200 hover:bg-neutral-50/60 hover:border-neutral-300"
                    }`}
                  >
                    {/* Icon Wrap */}
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-colors flex-shrink-0 ${
                      isSelected ? opt.color : "bg-neutral-50 text-neutral-450 border-neutral-100"
                    }`}>
                      {opt.icon}
                    </div>
                    
                    {/* Details */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-sm font-bold text-neutral-850 truncate">{opt.name}</span>
                        {isSelected && (
                          <span className="w-3.5 h-3.5 rounded-full bg-primary-600 flex items-center justify-center flex-shrink-0">
                            <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/>
                            </svg>
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-neutral-500 font-semibold truncate block mt-0.5 font-sans">{opt.time}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-3 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setShowCheckInShiftModal(false)}
                className="flex-1 py-2.5 border border-neutral-200 rounded-2xl text-sm font-bold text-neutral-600 hover:bg-neutral-50 hover:text-neutral-800 transition-all duration-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmCheckInShift}
                className="flex-1 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl text-sm font-extrabold shadow-md hover:shadow-lg transition-all duration-200"
              >
                Confirm today's mode
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default EmployeeDashboardPage;
