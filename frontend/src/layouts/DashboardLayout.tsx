import { API_URL } from "../config/api";
import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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

const BASE_URL = `${API_URL}/api`;

const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
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

  // Listen for the custom event to toggle system notifications
  useEffect(() => {
    const handleToggle = () => setShowNotifications(prev => !prev);
    const handleClose = () => setShowNotifications(false);
    window.addEventListener("toggleSystemNotifications", handleToggle);
    window.addEventListener("closeSystemNotifications", handleClose);
    return () => {
      window.removeEventListener("toggleSystemNotifications", handleToggle);
      window.removeEventListener("closeSystemNotifications", handleClose);
    }
  }, []);
  const [officeText, setOfficeText] = useState("");
  const [liveAnnouncements, setLiveAnnouncements] = useState<any[]>([]);
  const [realtimeMessages, setRealtimeMessages] = useState<any[]>([]);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [lastMessageCount, setLastMessageCount] = useState(0);
  const [unreadAnnouncements, setUnreadAnnouncements] = useState(0);

  const employeeId = localStorage.getItem("employee_id");
  const userId = localStorage.getItem("user_id");
  const profileImageUrl = `${BASE_URL}/employees/image/${employeeId}?v=${user?.image_version || 0}`;
  const popupKey = `attendance_popup_${userId}`;

  const currentEmployee = employees.find(
    (emp: any) => Number(emp.user_id) === Number(user?.id),
  );

  const isMyBirthday = birthdayEmployees.some(
    (emp: any) => Number(emp.user_id) === Number(user?.id),
  );

  // --- Notifications ---
  useEffect(() => {
    if (!notifications || notifications.length === 0) return;

    try {
      const storedShown = JSON.parse(localStorage.getItem("shown_notifications_ids") || "[]");
      const shownSet = new Set<number>(storedShown);
      let updated = false;

      notifications.forEach((item: any) => {
        if (!shownSet.has(item.id)) {
          shownSet.add(item.id);
          // Display a friendly toast instead of an error toast
          toast(item.message, { icon: "🔔", duration: 3000 });
          updated = true;
        }
        // Also ensure shownNotifications ref is synchronized
        shownNotifications.current.add(item.id);
      });

      if (updated) {
        localStorage.setItem("shown_notifications_ids", JSON.stringify(Array.from(shownSet)));
      }
    } catch (e) {
      console.error("Error reading/writing shown notifications:", e);
    }
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
    // Socket handles real-time notifications; poll every 30s as a fallback only
    const interval = setInterval(fetchNotifications, 30000);
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
    } else {
      setShowPopup(true);
    }
  }, [birthdayEmployees]);

  // Show attendance summary modal when navigating to Team Management
  useEffect(() => {
    if (location.pathname === "/manager-dashboard") {
      setShowPopup(true);
    }
  }, [location.pathname]);

  // Birthday & Thanks confirmation/view states
  const [thanksWishId, setThanksWishId] = useState<number | null>(null);
  const [thanksSenderName, setThanksSenderName] = useState<string>("");
  const [viewThanksMessage, setViewThanksMessage] = useState<string | null>(null);

  // Missed Check-in states
  const [remindNotifId, setRemindNotifId] = useState<number | null>(null);
  const [remindEmployeeName, setRemindEmployeeName] = useState<string>("");
  const [sendingReminder, setSendingReminder] = useState<boolean>(false);

  const sendCheckinReminder = async () => {
    if (remindNotifId === null) return;
    setSendingReminder(true);
    try {
      const response = await fetch(`${BASE_URL}/notifications/remind-checkin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notification_id: remindNotifId
        })
      });
      const data = await response.json();
      if (data.success) {
        toast.success("Check-In reminder sent to employee!");
        setNotifications((prev) =>
          prev.map((n) => {
            if (n.id === remindNotifId) {
              return { ...n, status: "Reminder Sent" };
            }
            return n;
          })
        );
      } else {
        toast.error(data.error || "Failed to send reminder");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to send reminder");
    } finally {
      setSendingReminder(false);
      setRemindNotifId(null);
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

  const handleSendThanks = async () => {
    if (!thanksWishId) return;
    try {
      const res = await fetch(`${BASE_URL}/birthday-wishes/thank/${thanksWishId}`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to send thanks.");
        return;
      }
      toast.success("Thanks sent successfully!");
      setNotifications((prev) =>
        prev.map((n) => (n.related_id === thanksWishId ? { ...n, thanked: true } : n))
      );
      setThanksWishId(null);
      setThanksSenderName("");
    } catch (e) {
      console.error(e);
      toast.error("Failed to send thanks.");
    }
  };

  // --- Attendance Summary ---
  const loadReportingEmployees = async () => {
    const uid = localStorage.getItem("user_id");
    if (!uid) return;
    try {
      const response = await fetch(
        `${BASE_URL}/employees/reporting-employees/${uid}`,
      );
      const data = await response.json();
      setReportingEmployees(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load reporting employees", err);
    }
  };

  useEffect(() => {
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

  const approveAttendance = async (empId: number) => {
    try {
      await fetch(`${BASE_URL}/attendance/approve/${empId}`, {
        method: "PUT",
      });

      setShowAttendanceModal(false);

      setReportingEmployees((prev) =>
        prev.filter((emp) => emp.employee_id !== empId)
      );
    } catch (error) {
      console.error(error);
    }
  };
  const rejectAttendance = async (empId: number) => {
    try {
      await fetch(`${BASE_URL}/attendance/reject/${empId}`, {
        method: "PUT",
      });

      setShowAttendanceModal(false);

      setReportingEmployees((prev) =>
        prev.filter((emp) => emp.employee_id !== empId)
      );
    } catch (error) {
      console.error(error);
    }
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
      const roleParam = user?.access_level || "";
      const response = await fetch(`${BASE_URL}/communications/announcements?role=${roleParam}`);
      if (!response.ok) return;
      const data = await response.json();
      const list = data.announcements || (Array.isArray(data) ? data : []);
      setOfficeMessages(list);
    } catch (error) {
      console.error("Announcement Error:", error);
    }
  };

  useEffect(() => {
    loadAnnouncements();
  }, [user]);

  // Track unread announcements count
  useEffect(() => {
    const lastViewed = localStorage.getItem("last_viewed_announcement_time") || "1970-01-01T00:00:00.000Z";
    const lastViewedDate = new Date(lastViewed);

    const allAnnouncements = [...liveAnnouncements, ...officeMessages];
    const unread = allAnnouncements.filter((ann: any) => {
      const created = ann.created_at ? new Date(ann.created_at) : new Date();
      return created > lastViewedDate;
    }).length;

    setUnreadAnnouncements(unread);
  }, [officeMessages, liveAnnouncements]);

  // Clear unread count when visiting the announcements page
  useEffect(() => {
    if (location.pathname === "/announcements") {
      localStorage.setItem("last_viewed_announcement_time", new Date().toISOString());
      setUnreadAnnouncements(0);
    }
  }, [location.pathname, officeMessages, liveAnnouncements]);

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
    if (!employeeId) return;

    socket.connect();

    socket.emit("join", {
      employee_id: employeeId,
    });

    return () => {
      socket.disconnect();
    };
  }, [employeeId]);

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

  useEffect(() => {
    socket.on("birthday_wish_sent", (newNotification) => {
      setNotifications((prev) => [newNotification, ...prev]);
      toast.success(`🎂 New Birthday Wish from ${newNotification.sender_name || "a coworker"}!`);
    });

    socket.on("birthday_thanks_sent", (newNotification) => {
      setNotifications((prev) => [newNotification, ...prev]);
      toast.success(`🎉 ${newNotification.sender_name || "A coworker"} thanked you for your birthday wishes!`);
    });



    socket.on("checkin_reminder_sent", (newNotification) => {
      setNotifications((prev) => [newNotification, ...prev]);
      toast.error("🔔 You have a Check-In Reminder from your manager!");
    });



    socket.on("general_notification_created", (newNotification) => {
      setNotifications((prev) => [newNotification, ...prev]);
      toast(`🔔 ${newNotification.title}: ${newNotification.message}`);
    });

    socket.on("manager_notification_resolved", (data) => {
      setNotifications((prev) => {
        if (data.status === "Completed" || data.status === "Resolved") {
          return prev.filter((n) => n.id !== data.notification_id);
        }
        return prev.map((n) => {
          if (n.id === data.notification_id) {
            return { ...n, status: data.status };
          }
          return n;
        });
      });
    });

    return () => {
      socket.off("birthday_wish_sent");
      socket.off("birthday_thanks_sent");

      socket.off("checkin_reminder_sent");

      socket.off("general_notification_created");
      socket.off("manager_notification_resolved");
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

  const handleApproveAll = async () => {
    try {
      const uid = localStorage.getItem("user_id");
      await fetch(`${BASE_URL}/attendance/approve-all?manager_id=${uid}`, {
        method: "PUT",
      });
      // Remove all employees from the popup
      setReportingEmployees([]);

      // Close the popup
      setShowPopup(false);

      // Optional: refresh the latest data
      // fetchReportingEmployees();
    } catch (error) {
      console.error("Approve All Error:", error);
    }
  };

  const handleApproveEmployee = async (employeeId: number) => {
    try {
      await fetch(`${BASE_URL}/attendance/approve/${employeeId}`, {
        method: "PUT",
      });
      setReportingEmployees((prev) =>
        prev.map((emp) =>
          emp.employee_id === employeeId || emp.id === employeeId
            ? { ...emp, status: "Present", manager_status: "Approved", decision: "Approved" }
            : emp
        )
      );
    } catch (err) {
      console.error("Approve Employee Error:", err);
    }
  };

  const handleRejectEmployee = async (employeeId: number) => {
    try {
      await fetch(`${BASE_URL}/attendance/reject/${employeeId}`, {
        method: "PUT",
      });
      setReportingEmployees((prev) =>
        prev.map((emp) =>
          emp.employee_id === employeeId || emp.id === employeeId
            ? { ...emp, status: "Absent", manager_status: "Rejected", decision: "Rejected" }
            : emp
        )
      );
    } catch (error) {
      console.error("Reject Employee Error:", error);
    }
  };

  const dismissNotification = async (id: number) => {
    try {
      await fetch(`${BASE_URL}/notifications/${id}`, {
        method: "DELETE",
      });
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error("Failed to dismiss notification:", err);
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
        onDismiss={dismissNotification}
        onSendThanks={(wishId, senderName) => {
          setThanksWishId(wishId);
          setThanksSenderName(senderName);
        }}
        onViewThanks={(message) => {
          setViewThanksMessage(message);
        }}
        onRemindCheckIn={(notificationId, employeeName) => {
          setRemindNotifId(notificationId);
          setRemindEmployeeName(employeeName);
        }}
        onGoToAttendance={() => {
          localStorage.setItem("highlightCheckIn", "true");
          navigate("/employee-dashboard");
        }}
        onViewAttendance={(employeeId) => {
          localStorage.setItem("highlightEmployeeId", employeeId.toString());
          navigate("/manager-dashboard");
        }}
      />

      {/* Thanks Confirmation Dialog */}
      {thanksWishId !== null && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800">Send Thanks</h3>
            <p className="text-sm text-slate-600 mt-2">
              Would you like to thank {thanksSenderName} for the birthday wishes?
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setThanksWishId(null);
                  setThanksSenderName("");
                }}
                className="px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSendThanks}
                className="px-4 py-2 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors cursor-pointer"
              >
                Send Thanks
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Thanks Appreciation Detail Modal */}
      {viewThanksMessage !== null && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-100 relative">
            <button
              onClick={() => setViewThanksMessage(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-lg cursor-pointer animate-pulse"
            >
              ✕
            </button>
            <div className="text-center space-y-4">
              <div className="text-4xl">🎉</div>
              <h3 className="text-lg font-bold text-slate-800">Appreciation Received</h3>
              <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl italic">
                {viewThanksMessage}
              </p>
              <button
                onClick={() => setViewThanksMessage(null)}
                className="mt-2 w-full py-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Missed Check-In Reminder Confirmation Dialog */}
      {remindNotifId !== null && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 animate-slide-up">
            <h3 className="text-lg font-bold text-slate-800">Notify Employee</h3>
            <p className="text-sm text-slate-600 mt-2 font-medium">
              {remindEmployeeName} has not completed today's check-in.
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Would you like to remind the employee to complete the attendance check-in?
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setRemindNotifId(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={sendCheckinReminder}
                disabled={sendingReminder}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors rounded-xl flex items-center gap-1 shadow-md shadow-blue-100 cursor-pointer"
              >
                {sendingReminder ? "Sending..." : "Send Reminder"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Birthday Modal */}
      {birthdayModal && birthdayEmployees.length > 0 && (
        <BirthdayModal
          birthdayEmployees={birthdayEmployees}
          isMyBirthday={isMyBirthday}
          currentEmployee={currentEmployee}
          user={user}
          onClose={() => {
            setBirthdayModal(false);
            setShowPopup(true);
          }}
          onSendWish={sendBirthdayWish}
        />
      )}

      {/* Attendance Summary Popup */}
      {showPopup && reportingEmployees.length > 0 && location.pathname === "/manager-dashboard" && (
        <AttendanceSummaryModal
          reportingEmployees={reportingEmployees}
          onClose={() => setShowPopup(false)}
          onViewEmployee={(emp) => {
            setSelectedEmployee(emp);
            setShowAttendanceModal(true);
          }}
          onApproveAll={handleApproveAll}
          onApproveEmployee={handleApproveEmployee}
          onRejectEmployee={handleRejectEmployee}
          onRefresh={loadReportingEmployees}
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
        <h1 className="text-lg font-bold text-neutral-800">Peoplehub</h1>
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
              unreadAnnouncements={unreadAnnouncements}
            />
          )}
        </AnimatePresence>

        {/* Main Content */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>

      {/* Chat Floating Button */}
      {/* <button
        onClick={() => setShowCommunication(true)}
        className="fixed bottom-6 right-6 z-50 bg-primary-500 hover:bg-primary-600 text-white rounded-full p-4 shadow-lg"
      >
        <ChatBubbleLeftRightIcon className="w-7 h-7" />
      </button> */}

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
