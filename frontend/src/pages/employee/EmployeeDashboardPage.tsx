import React, { useState, useEffect } from "react";
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
import OverviewTab from "./tabs/OverviewTab";
import LeaveTab from "./tabs/LeaveTab";
import ShiftTab from "./tabs/ShiftTab";
import AttendanceTab from "./tabs/AttendanceTab";
import ProfileTab from "./tabs/ProfileTab";

const BASE_URL = "http://10.1.6.178:5001/api";

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
  { id: "profile", label: "Profile", icon: UserCircleIcon },
];

const EmployeeDashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState("overview");

  // Employee & data state
  const [employees, setEmployees] = useState<any[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [attendanceData, setAttendanceData] = useState<Attendance[]>([]);
  const [shiftRequests, setShiftRequests] = useState<any[]>([]);
  const [managerShiftRequests, setManagerShiftRequests] = useState<any[]>([]);

  const currentEmployee = Array.isArray(employees)
    ? employees.find((emp: any) => Number(emp.user_id) === Number(user?.id))
    : null;
  console.log(currentEmployee);
  console.log("Reporting Manager:", currentEmployee?.reporting_manager);
  console.log("Access Level:", user?.access_level);
  console.log("Role:", user?.role);
  const managerName =
    `${currentEmployee?.first_name} ${currentEmployee?.last_name}`
      .trim()
      .toLowerCase();
  const pendingShiftCount = managerShiftRequests.filter(
    (shift: any) =>
      shift.reporting_manager?.trim().toLowerCase() === managerName &&
      shift.status === "Pending"
  ).length;

  // Attendance/timer state
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [checkInTime, setCheckInTime] = useState<Date | null>(null);
  const [timer, setTimer] = useState("00:00:00");
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
  const [shiftDate, setShiftDate] = useState("");
  // Modal state
  const [confirmModal, setConfirmModal] = useState(false);
  const [birthdayModal, setBirthdayModal] = useState(false);
  const [birthdayEmployees, setBirthdayEmployees] = useState<any[]>([]);
  const [popup, setPopup] = useState({
    show: false,
    type: "success",
    title: "",
    message: "",
  });



  const isMyBirthday = birthdayEmployees.some(
    (emp: any) => Number(emp.user_id) === Number(user?.id),
  );


  const approvalLeaves = leaveRequests.filter(
    (leave: any) =>
      leave.reporting_manager?.trim().toLowerCase() === managerName,
  );
  const totalBalance =
    (currentEmployee?.sick_leave || 0) +
    (currentEmployee?.casual_leave || 0) +
    (currentEmployee?.privilege_leave || 0);
  const pendingLeaveCount = approvalLeaves.filter(
    (leave: any) => leave.status === "Pending"
  ).length;

  const showPopup = (type: string, title: string, message: string) => {
    setPopup({ show: true, type, title, message });
  };

  const getTodayKey = () => new Date().toISOString().split("T")[0];

  const formatSeconds = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const parseTimeString = (timeStr: string) => {
    if (!timeStr) return new Date();
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
        `${BASE_URL}/shifts/employee/${currentEmployee.user_id}`,
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
  const handleCheckIn = async () => {
    try {
      const userId = localStorage.getItem("user_id");
      if (!userId) {
        showPopup(
          "error",
          "User Not Found",
          "Unable to identify current user.",
        );
        return;
      }
      const response = await fetch(`${BASE_URL}/attendance/checkin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: Number(userId) }),
      });
      const data = await response.json();
      if (!response.ok) {
        showPopup(
          "error",
          "Check In Failed",
          data.message || data.error || "Check In Failed",
        );
        return;
      }
      showPopup(
        "success",
        "Check In Successful",
        data.message || "You have checked in successfully.",
      );
      const nowIso = new Date().toISOString();
      localStorage.setItem(`checkInTime_${userId}`, nowIso);
      localStorage.setItem(`checkInDate_${userId}`, nowIso.split("T")[0]);
      clearTodayAttendanceSummary(userId);
      setIsCheckedIn(true);
      setCheckInTime(new Date());
      const attendanceResponse = await fetch(
        `${BASE_URL}/attendance/history/${userId}`,
      );
      const attendanceHistory = await attendanceResponse.json();
      setAttendanceData(attendanceHistory);
    } catch (error) {
      showPopup(
        "error",
        "Check In Error",
        "Something went wrong while checking in.",
      );
    }
  };

  const handleCheckOut = async () => {
    try {
      if (isLunchBreak) {
        showPopup(
          "warning",
          "Lunch Break Active",
          "Please stop lunch break before checkout.",
        );
        return;
      }
      if (isTeaBreak) {
        showPopup(
          "warning",
          "Tea Break Active",
          "Please stop tea break before checkout.",
        );
        return;
      }
      const userId = localStorage.getItem("user_id");
      if (!userId) {
        alert("User ID not found.");
        return;
      }
      const response = await fetch(`${BASE_URL}/attendance/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: Number(userId) }),
      });
      const data = await response.json();
      if (!response.ok) {
        alert(data.error || "Checkout Failed");
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
      setCheckInTime(null);
      setTimer(formattedTimer);
      localStorage.removeItem(`checkInTime_${userId}`);
      showPopup(
        "success",
        "Check Out Successful",
        "You have checked out successfully.",
      );
    } catch (error) {
      alert("Something went wrong while checking out.");
    }
  };

  const handleLunchBreak = async () => {
    if (!isCheckedIn) {
      showPopup(
        "error",
        "Check-In Required",
        "Please check in before starting Lunch Break.",
      );
      return;
    }
    try {
      const userId = localStorage.getItem("user_id");
      if (!userId) return;
      if (!isLunchBreak) {
        setLunchStartTime(new Date());
        setIsLunchBreak(true);
        await fetch(`${BASE_URL}/attendance/lunch-break`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: Number(userId), action: "start" }),
        });
      } else {
        if (lunchStartTime) {
          const seconds = Math.floor(
            (new Date().getTime() - lunchStartTime.getTime()) / 1000,
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
        }
      }
    } catch (error) {
      showPopup("error", "Error", "Something went wrong.");
    }
  };

  const handleTeaBreak = async () => {
    if (!isCheckedIn) {
      showPopup(
        "error",
        "Check-In Required",
        "Please check in before starting Tea Break.",
      );
      return;
    }
    try {
      const userId = localStorage.getItem("user_id");
      if (!userId) return;
      if (!isTeaBreak) {
        setTeaStartTime(new Date());
        setIsTeaBreak(true);
        await fetch(`${BASE_URL}/attendance/tea-break`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: Number(userId), action: "start" }),
        });
      } else {
        if (!teaStartTime) return;
        const seconds = Math.floor(
          (new Date().getTime() - teaStartTime.getTime()) / 1000,
        );
        setTotalTeaSeconds((prev) => prev + seconds);
        setIsTeaBreak(false);
        setTeaStartTime(null);
        await fetch(`${BASE_URL}/attendance/tea-break`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: Number(userId),
            action: "stop",
            break_seconds: seconds,
          }),
        });
      }
    } catch (error) {
      showPopup(
        "error",
        "Error",
        "Something went wrong while handling Tea Break.",
      );
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
        employee_id: currentEmployee?.id,
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

        emergency_contact: leaveForm.emergencyContact,

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
      const res = await fetch(`${BASE_URL}/leaves/cancel/${id}`, {
        method: "PUT",
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Leave Cancelled");
        loadLeaves();
      }
    } catch (err) {
      console.log(err);
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
          const checkIn = new Date(data.check_in);
          const lunchSecs = (data.lunch_minutes || 0) * 60;
          const teaSecs = (data.tea_minutes || 0) * 60;
          setIsCheckedIn(true);
          setCheckInTime(checkIn);
          setIsLunchBreak(data.lunch_break || false);
          setIsTeaBreak(data.tea_break || false);
          if (data.lunch_start) setLunchStartTime(new Date(data.lunch_start));
          if (data.tea_start) setTeaStartTime(new Date(data.tea_start));
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
          const userId = localStorage.getItem("user_id");
          const localSaved = userId ? localStorage.getItem(`checkInTime_${userId}`) : null;
          const savedDate = userId ? localStorage.getItem(`checkInDate_${userId}`) : null;
          const todayKey = new Date().toISOString().split("T")[0];
          if (localSaved && savedDate === todayKey) {
            setCheckInTime(new Date(localSaved));
          } else {
            setCheckInTime(parseTimeString(payload.check_in));
          }
        } else {
          setCheckInTime(null);
        }
        if (payload.lunch_start) setLunchStartTime(new Date(payload.lunch_start));
        if (payload.tea_start) setTeaStartTime(new Date(payload.tea_start));
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
      if (payload.reporting_manager?.trim().toLowerCase() === managerName) {
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
    if (!birthdayModal && !sessionStorage.getItem("attendance_popup_shown")) {
      sessionStorage.setItem("attendance_popup_shown", "true");
    }
  }, [birthdayModal]);

  useEffect(() => {
    if (birthdayModal && isMyBirthday) {
      const t = setTimeout(() => setBirthdayModal(false), 5000);
      return () => clearTimeout(t);
    }
  }, [birthdayModal, isMyBirthday]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isCheckedIn && checkInTime) {
      interval = setInterval(() => {
        const now = new Date().getTime();
        const elapsed = Math.floor((now - checkInTime.getTime()) / 1000);

        // Add currently-running break seconds on top of already-accumulated seconds
        const runningLunch =
          isLunchBreak && lunchStartTime
            ? Math.floor((now - lunchStartTime.getTime()) / 1000)
            : 0;
        const runningTea =
          isTeaBreak && teaStartTime
            ? Math.floor((now - teaStartTime.getTime()) / 1000)
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

      <div className="min-h-screen bg-neutral-50">
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

        {/* Header */}
        <header className="bg-white shadow-sm border-b border-neutral-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-500 rounded-lg flex items-center justify-center">
                  <SparklesIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-neutral-800">
                    Employee Dashboard
                  </h1>
                  <p className="text-xs text-neutral-500">
                    Workflow Management System
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Navigation */}
        <nav className="bg-white border-b border-neutral-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex space-x-1 overflow-x-auto py-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === tab.id
                      ? "bg-primary-50 text-primary-700 border-b-2 border-primary-600"
                      : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-800"
                      }`}
                  >
                    <Icon className="w-4 h-4" />
                    <div className="relative flex items-center">
                      <span>{tab.label}</span>
                      {/* Leave Notification */}
                      {tab.id === "leave" && pendingLeaveCount > 0 && (
                        <span className="absolute -top-2 -right-2 h-3 w-3 rounded-full bg-red-500"></span>
                      )}

                      {/* Shift Notification */}
                      {tab.id === "shift" && pendingShiftCount > 0 && (
                        <span className="absolute -top-2 -right-2 h-3 w-3 rounded-full bg-red-500"></span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </nav>

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
                isCheckedIn={isCheckedIn}
                checkInTime={checkInTime}
                timer={timer}
                totalLunchSeconds={totalLunchSeconds}
                totalTeaSeconds={totalTeaSeconds}
                isLunchBreak={isLunchBreak}
                isTeaBreak={isTeaBreak}
                lunchStartTime={lunchStartTime}
                teaStartTime={teaStartTime}
                currentEmployee={currentEmployee}
                user={user}
                onCheckInOut={() =>
                  isCheckedIn ? setConfirmModal(true) : handleCheckIn()
                }
                onLunchBreak={handleLunchBreak}
                onTeaBreak={handleTeaBreak}
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
                onSubmitShift={submitShiftRequest}
                onApprove={approveShift}
                onReject={rejectShift}
              />
            )}
            {activeTab === "attendance" && (
              <AttendanceTab attendanceData={attendanceData} />
            )}
            {activeTab === "profile" && <ProfileTab />}
          </motion.div>
        </main>
      </div>
    </>
  );
};

export default EmployeeDashboardPage;
