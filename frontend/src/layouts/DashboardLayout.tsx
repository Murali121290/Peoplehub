import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  ChatBubbleLeftRightIcon,
  XMarkIcon,
  Bars3Icon,
} from "@heroicons/react/24/outline";
import { socket } from "../services/socket";

import Sidebar from "./components/Sidebar";
import NotificationPanel from "./components/NotificationPanel";
import BirthdayModal from "./components/BirthdayModal";
import AttendanceSummaryModal from "./components/AttendanceSummaryModal";
import AttendanceDetailModal from "./components/AttendanceDetailModal";
import ChatPanel from "./components/ChatPanel";
import { useNavigation } from "./hooks/useNavigation";
import { useIsDesktop } from "./hooks/useIsDesktop";

const BASE_URL = "http://localhost:5000/api";

const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const { sidebarItems } = useNavigation(user);
  const isDesktop = useIsDesktop();

  // UI state
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showReportMenu, setShowReportMenu] = useState(false);
  const [showCommunication, setShowCommunication] = useState(false);

  // Notification state
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const shownNotifications = useRef(new Set<number>());

  // Birthday state
  const [birthdayModal, setBirthdayModal] = useState(false);
  const [birthdayEmployees, setBirthdayEmployees] = useState<any[]>([]);

  // Attendance state
  const [showPopup, setShowPopup] = useState(false);
  const [reportingEmployees, setReportingEmployees] = useState<any[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);

  // Chat state
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [messageText, setMessageText] = useState("");
  const [employeeMessages, setEmployeeMessages] = useState<any[]>([]);
  const [officeMessages, setOfficeMessages] = useState<any[]>([]);
  const [officeText, setOfficeText] = useState("");
  const [liveAnnouncements, setLiveAnnouncements] = useState<any[]>([]);
  const [realtimeMessages, setRealtimeMessages] = useState<any[]>([]);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [lastMessageCount, setLastMessageCount] = useState(0);

  const employeeId = localStorage.getItem("employee_id");
  const userId = localStorage.getItem("user_id");
  const profileImageUrl = `${BASE_URL}/employees/image/${employeeId}`;
  const popupKey = `attendance_popup_${userId}`;

  const currentEmployee = employees.find(
    (emp: any) => Number(emp.user_id) === Number(user?.id),
  );

  const isMyBirthday = birthdayEmployees.some(
    (emp: any) => Number(emp.user_id) === Number(user?.id),
  );

  // --- Notifications ---
  useEffect(() => {
    notifications.forEach((item: any) => {
      if (!shownNotifications.current.has(item.id)) {
        shownNotifications.current.add(item.id);
        toast.error(item.message, { duration: 10000 });
      }
    });
  }, [notifications]);

  useEffect(() => {
    if (!user?.full_name) return;
    const fetchNotifications = async () => {
      try {
        const res = await fetch(`${BASE_URL}/notifications/${user.full_name}`);
        const data = await res.json();
        setNotifications(data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 5000);
    return () => clearInterval(interval);
  }, [user]);

  // --- Birthdays ---
  const fetchTodayBirthdays = async () => {
    try {
      const res = await fetch(`${BASE_URL}/employees/birthdays/today`);
      const data = await res.json();
      setBirthdayEmployees(Array.isArray(data) ? data : []);
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    fetchTodayBirthdays();
  }, []);

  useEffect(() => {
    if (
      birthdayEmployees.length > 0 &&
      !sessionStorage.getItem("birthday_popup_shown")
    ) {
      setBirthdayModal(true);
      sessionStorage.setItem("birthday_popup_shown", "true");
      setTimeout(() => {
        setBirthdayModal(false);
        setShowPopup(true);
      }, 5000);
    } else {
      setShowPopup(true);
    }
  }, [birthdayEmployees]);

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

  // --- Attendance Summary ---
  useEffect(() => {
    const loadReportingEmployees = async () => {
      const uid = localStorage.getItem("user_id");
      const response = await fetch(
        `${BASE_URL}/employees/reporting-employees/${uid}`,
      );
      const data = await response.json();
      setReportingEmployees(data);
    };
    loadReportingEmployees();
  }, []);

  useEffect(() => {
    if (reportingEmployees.length > 0 && !sessionStorage.getItem(popupKey)) {
      setShowPopup(true);
      sessionStorage.setItem(popupKey, "true");
    }
  }, [reportingEmployees]);

  const viewAttendance = async (emp: any) => {
    try {
      const response = await fetch(
        `${BASE_URL}/attendance/details/${emp.employee_id}`,
      );
      const data = await response.json();
      setSelectedEmployee(data);
      setShowAttendanceModal(true);
    } catch (error) {
      console.error(error);
    }
  };

  const approveAttendance = async (empId: string) => {
    console.log("Approve:", empId);
    setShowAttendanceModal(false);
  };

  const rejectAttendance = async (empId: string) => {
    console.log("Reject:", empId);
    setShowAttendanceModal(false);
  };

  // --- Employees ---
  useEffect(() => {
    fetch(`${BASE_URL}/employees`)
      .then((res) => res.json())
      .then((data) => setEmployees(Array.isArray(data) ? data : []))
      .catch((err) => console.error(err));
  }, []);

  // --- Messages ---
  const fetchMessages = async () => {
    try {
      if (!employeeId || employeeId === "null") return;
      const response = await fetch(
        `${BASE_URL}/communications/employee/${employeeId}`,
      );
      if (!response.ok) return;
      const data = await response.json();
      setEmployeeMessages(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Fetch Messages Error:", error);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  useEffect(() => {
    if (employeeMessages.length > lastMessageCount) setHasNewMessage(true);
    setLastMessageCount(employeeMessages.length);
  }, [employeeMessages]);

  //   useEffect(() => {
  //     if (!selectedUser) return;
  //     fetch(`${BASE_URL}/communications/chat/${user?.id}/${selectedUser.user_id}`)
  //       .then(res => res.json())
  //       .then(data => setMessages(Array.isArray(data) ? data : []));
  //   }, [selectedUser]);

  const sendMessage = async () => {
    if (!selectedUser || !messageText.trim()) return;
    try {
      await fetch(`${BASE_URL}/communications/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_id: employeeId ? Number(employeeId) : null,
          receiver_id: Number(selectedUser.employee_id),
          employee_name: user?.full_name,
          message_type: "employee",
          message: messageText,
          created_by: user?.full_name,
        }),
      });
      setMessageText("");

      handleSelectUser(selectedUser);
    } catch (error) {
      console.error("Send Message Error:", error);
    }
  };

  // --- Announcements ---
  const loadAnnouncements = async () => {
    try {
      const response = await fetch(`${BASE_URL}/communications/announcements`);
      if (!response.ok) return;
      const data = await response.json();
      setOfficeMessages(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Announcement Error:", error);
    }
  };

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const sendAnnouncement = async () => {
    if (!officeText.trim()) return;
    try {
      await fetch(`${BASE_URL}/communications/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_id: employeeId ? Number(employeeId) : null,
          receiver_id: null,
          employee_name: user?.full_name || "HR Admin",
          message_type: "announcement",
          message: officeText,
          created_by: user?.full_name || "HR Admin",
        }),
      });
      setOfficeText("");
      loadAnnouncements();
    } catch (error) {
      console.error("Send Announcement Error:", error);
    }
  };

  // --- Socket ---
  useEffect(() => {
    socket.emit("join", { employee_id: employeeId });
  }, []);

  useEffect(() => {
    socket.on("receive_message", (message) => {
      setRealtimeMessages((prev) => [...prev, message]);
    });
    return () => {
      socket.off("receive_message");
    };
  }, []);

  useEffect(() => {
    socket.on("receive_announcement", (data) => {
      setLiveAnnouncements((prev) => [data, ...prev]);
    });
    return () => {
      socket.off("receive_announcement");
    };
  }, []);

  // --- Logout ---
  const handleLogout = async () => {
    await logout();
    sessionStorage.clear();
    localStorage.clear();
    toast.success("Logged out successfully");
    navigate("/login");
  };

  const handleSelectUser = async (user: any) => {
    console.log("SELECTED USER FULL:", user);

    try {
      setSelectedUser(user);

      const myId = Number(localStorage.getItem("employee_id"));

      const chatUserId = Number(
        selectedUser?.id || selectedUser?.user_id || selectedUser?.employee_id,
      );
      console.log("CHAT USER ID:", chatUserId);

      console.log("MY ID:", myId);
      console.log("CHAT USER ID:", chatUserId);

      if (!selectedUser) {
        console.log("No user selected");
        return;
      }
      const response = await fetch(
        `${BASE_URL}/communications/chat/${myId}/${chatUserId}`,
      );

      const data = await response.json();

      setMessages(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Attendance Detail Modal */}
      {showAttendanceModal && selectedEmployee && (
        <AttendanceDetailModal
          selectedEmployee={selectedEmployee}
          onClose={() => setShowAttendanceModal(false)}
          onApprove={approveAttendance}
          onReject={rejectAttendance}
        />
      )}

      {/* Notification Panel */}
      <NotificationPanel
        notifications={notifications}
        showNotifications={showNotifications}
        onToggle={() => setShowNotifications(!showNotifications)}
        onClearAll={() => setNotifications([])}
        onDismiss={(id) =>
          setNotifications((prev) => prev.filter((n) => n.id !== id))
        }
      />

      {/* Birthday Modal */}
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

      {/* Attendance Summary Popup */}
      {showPopup && reportingEmployees.length > 0 && (
        <AttendanceSummaryModal
          reportingEmployees={reportingEmployees}
          onClose={() => setShowPopup(false)}
          onViewEmployee={(emp) => {
            setSelectedEmployee(emp);
            setShowAttendanceModal(true);
          }}
        />
      )}

      {/* Mobile Header */}
      <div className="flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-3 lg:hidden">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="rounded-lg p-2 text-neutral-600 transition hover:bg-neutral-100"
        >
          {sidebarOpen ? (
            <XMarkIcon className="h-6 w-6" />
          ) : (
            <Bars3Icon className="h-6 w-6" />
          )}
        </button>
        <h1 className="text-lg font-bold text-neutral-800">WMS</h1>
        <div className="w-10" />
      </div>

      <div className="flex">
        {/* Sidebar */}
        <AnimatePresence>
          {(sidebarOpen || isDesktop) && (
            <Sidebar
              sidebarItems={sidebarItems}
              showReportMenu={showReportMenu}
              setShowReportMenu={setShowReportMenu}
              user={user}
              profileImageUrl={profileImageUrl}
              onLogout={handleLogout}
            />
          )}
        </AnimatePresence>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>

      {/* Chat Floating Button */}
      <button
        onClick={() => setShowCommunication(true)}
        className="fixed bottom-6 right-6 z-50 bg-primary-500 hover:bg-primary-600 text-white rounded-full p-4 shadow-lg"
      >
        <ChatBubbleLeftRightIcon className="w-7 h-7" />
      </button>

      {/* Chat Panel */}
      {showCommunication && (
        <ChatPanel
          employees={employees}
          selectedUser={selectedUser}
          messages={messages}
          messageText={messageText}
          onSelectUser={handleSelectUser}
          onMessageChange={setMessageText}
          onSend={sendMessage}
          onClose={() => setShowCommunication(false)}
        />
      )}
    </div>
  );
};

export default DashboardLayout;
