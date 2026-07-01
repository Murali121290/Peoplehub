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

import ConfirmModal from "./components/ConfirmModal";
import PopupModal from "./components/PopupModal";
import BirthdayModal from "./components/BirthdayModal";
import OverviewTab from "./tabs/OverviewTab";
import TasksTab from "./tabs/TasksTab";
import LeaveTab from "./tabs/LeaveTab";
import ShiftTab from "./tabs/ShiftTab";
import AttendanceTab from "./tabs/AttendanceTab";
import PerformanceTab from "./tabs/PerformanceTab";
import ProfileTab from "./tabs/ProfileTab";

const BASE_URL = "http://localhost:5000/api";

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
  { id: "tasks", label: "My Tasks", icon: CheckCircleIcon },
  { id: "leave", label: "Leave Requests", icon: CalendarDaysIcon },
  { id: "shift", label: "Shift Request", icon: ClockIcon },
  { id: "attendance", label: "Attendance", icon: ClockIcon },
  { id: "performance", label: "Performance", icon: ChartBarIcon },
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

  const currentEmployee = Array.isArray(employees)
    ? employees.find((emp: any) => Number(emp.user_id) === Number(user?.id))
    : null;

  const isMyBirthday = birthdayEmployees.some(
    (emp: any) => Number(emp.user_id) === Number(user?.id),
  );

  const managerName =
    `${currentEmployee?.first_name} ${currentEmployee?.last_name}`
      .trim()
      .toLowerCase();
  const approvalLeaves = leaveRequests.filter(
    (leave: any) =>
      leave.reporting_manager?.trim().toLowerCase() === managerName,
  );
  const totalBalance =
    (currentEmployee?.sick_leave || 0) +
    (currentEmployee?.casual_leave || 0) +
    (currentEmployee?.earned_leave || 0);
  const pendingLeaveCount = leaveRequests.filter(
    (leave: any) => leave.status === "Pending",
  ).length;

  const showPopup = (type: string, title: string, message: string) => {
    setPopup({ show: true, type, title, message });
    setTimeout(() => setPopup((prev) => ({ ...prev, show: false })), 3000);
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
    try {
      const res = await fetch(`${BASE_URL}/shifts/approvals`);
      const data = await res.json();
      setManagerShiftRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.log(err);
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
      setTimeout(() => window.location.reload(), 1000);
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
      setIsCheckedIn(false);
      setCheckInTime(null);
      setTimer("00:00:00");
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

  const sendBirthdayWish = async (emp: any) => {
    const senderName = localStorage.getItem("full_name");
    await fetch(`${BASE_URL}/communications`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employee_id: emp.id,
        employee_name: `${emp.first_name} ${emp.last_name}`,
        receiver_id: emp.user_id,
        message_type: "employee",
        created_by: senderName,
        message: `🎂 Happy Birthday ${emp.first_name}! Wishing you happiness, success and prosperity. 🎉`,
      }),
    });
  };

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
    const savedCheckIn = localStorage.getItem(`checkInTime_${userId}`);
    if (savedCheckIn) {
      setIsCheckedIn(true);
      setCheckInTime(new Date(savedCheckIn));
    }
  }, []);

  useEffect(() => {
    const userId = localStorage.getItem("user_id");
    if (!userId) return;
    fetch(`${BASE_URL}/attendance/status/${userId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.checked_in) {
          setIsCheckedIn(true);
          setCheckInTime(new Date(data.check_in));
          setIsLunchBreak(data.lunch_break || false);
          setIsTeaBreak(data.tea_break || false);
          if (data.lunch_start) setLunchStartTime(new Date(data.lunch_start));
          if (data.tea_start) setTeaStartTime(new Date(data.tea_start));
          setTotalLunchSeconds((data.lunch_minutes || 0) * 60);
          setTotalTeaSeconds((data.tea_minutes || 0) * 60);
        } else {
          setIsCheckedIn(false);
        }
      })
      .catch((err) => console.error("Attendance Status Error:", err));
  }, []);

  useEffect(() => {
    const userId = localStorage.getItem("user_id");
    if (!userId) return;
    fetch(`${BASE_URL}/attendance/history/${userId}`)
      .then((res) => res.json())
      .then((data) => setAttendanceData(data))
      .catch((err) => console.log(err));
  }, []);

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
    if (isCheckedIn && checkInTime && !isLunchBreak && !isTeaBreak) {
      interval = setInterval(() => {
        const totalWorkedSeconds = Math.floor(
          (new Date().getTime() - checkInTime.getTime()) / 1000,
        );
        const workingSeconds =
          totalWorkedSeconds - totalLunchSeconds - totalTeaSeconds;
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
      {confirmModal && (
        <ConfirmModal
          onCancel={() => setConfirmModal(false)}
          onConfirm={() => {
            setConfirmModal(false);
            handleCheckOut();
          }}
        />
      )}

      <PopupModal
        popup={popup}
        onClose={() => setPopup({ ...popup, show: false })}
      />

      <div className="min-h-screen bg-gray-100">
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
        <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#022B3A] rounded-lg flex items-center justify-center">
                  <SparklesIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">
                    Employee Dashboard
                  </h1>
                  <p className="text-xs text-gray-500">
                    Workflow Management System
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Navigation */}
        <nav className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex space-x-1 overflow-x-auto py-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                      activeTab === tab.id
                        ? "bg-blue-50 text-blue-700 border-b-2 border-blue-600"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <div className="relative flex items-center">
                      <span>{tab.label}</span>
                      {tab.id === "leave" && pendingLeaveCount > 0 && (
                        <span className="absolute -top-3 -right-6 bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full">
                          {pendingLeaveCount}
                        </span>
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
            {activeTab === "tasks" && <TasksTab />}
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
            {activeTab === "performance" && <PerformanceTab />}
            {activeTab === "profile" && <ProfileTab />}
          </motion.div>
        </main>
      </div>
    </>
  );
};

export default EmployeeDashboardPage;
