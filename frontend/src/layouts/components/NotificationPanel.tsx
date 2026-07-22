import { API_URL } from "../../config/api";
import React from 'react';

interface NotificationPanelProps {
  notifications: any[];
  showNotifications: boolean;
  onToggle: () => void;
  onClearAll: () => void;
  onDismiss: (id: number) => void;
  onSendThanks: (wishId: number, senderName: string) => void;
  onViewThanks: (message: string) => void;
  onRemindCheckIn?: (notificationId: number, employeeName: string) => void;
  onGoToAttendance?: () => void;
  onViewAttendance?: (employeeId: number) => void;
}

const BASE_URL = `${API_URL}/api`;

const NotificationPanel: React.FC<NotificationPanelProps> = ({
  notifications,
  showNotifications,
  onToggle,
  onClearAll,
  onDismiss,
  onSendThanks,
  onViewThanks,
  onRemindCheckIn,
  onGoToAttendance,
  onViewAttendance,
}) => {
  return (
    <div className="fixed top-5 right-5 z-[9998]">
        {/* Floating Bell Button Removed per user request */}

      {showNotifications && (
        <div
          className="absolute top-14 right-0 mt-2 w-[390px] bg-white rounded-2xl shadow-2xl border border-gray-200 max-h-[500px] overflow-y-auto"
          role="dialog"
          aria-label="Notifications Panel"
        >
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">Notifications</h3>
            {notifications.length > 0 && (
              <button onClick={onClearAll} className="text-sm text-gray-600 hover:text-red-600 hover:font-medium transition-colors">
                Clear all
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <div className="text-4xl mb-2">📭</div>
              <p className="font-medium">No Notifications</p>
              <p className="text-sm mt-1">You're all clear for now.</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100 p-2">
              {notifications.map((item: any) => {
                const isBirthdayWish = item.related_type === "birthday_wish";
                const isBirthdayThanks = item.related_type === "birthday_thanks";
                const isCheckinReminder = item.related_type === "checkin_reminder";

                return (
                  <li
                    key={item.id}
                    className="p-4 hover:bg-slate-50 transition-all duration-200 flex gap-4 items-start rounded-xl mx-2 my-2 border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 relative bg-white"
                  >
                    {/* Unread indicator dot */}
                    {!item.is_read && (
                      <span className="absolute top-4 left-2 w-2.5 h-2.5 bg-blue-600 rounded-full animate-pulse" title="Unread" />
                    )}

                    {/* Avatar */}
                    {item.sender_employee_id ? (
                      <img
                        src={`${BASE_URL}/employees/image/${item.sender_employee_id}`}
                        alt={item.sender_name || "User"}
                        className="w-10 h-10 rounded-full object-cover border border-slate-200 shadow-sm flex-shrink-0"
                        onError={(e) => {
                          e.currentTarget.src = "https://cdn-icons-png.flaticon.com/512/149/149071.png";
                        }}
                      />
                    ) : (
                      <span className="text-2xl flex-shrink-0 select-none">
                        {isBirthdayWish && "🎂"}
                        {isBirthdayThanks && "🎉"}
                        {isCheckinReminder && "🔔"}
                        {!isBirthdayWish && !isBirthdayThanks && !isCheckinReminder && "🔔"}
                      </span>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-semibold text-slate-800 text-sm truncate">
                          {item.title}
                        </h4>
                        <span className="text-[10px] text-slate-400 whitespace-nowrap">
                          {item.created_at ? new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now"}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        {item.message}
                      </p>

                      {/* Action buttons area */}
                      {(isBirthdayWish || isBirthdayThanks) && (
                        <div className="mt-3 flex items-center gap-2">
                          {isBirthdayWish && (
                            <button
                              onClick={() => {
                                if (!item.thanked) {
                                  onSendThanks(item.related_id, item.sender_name || "Employee");
                                }
                              }}
                              disabled={item.thanked}
                              className={`text-xs font-semibold px-3 py-1.5 rounded-lg border shadow-sm transition-all ${item.thanked
                                  ? "bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed"
                                  : "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 cursor-pointer"
                                }`}
                            >
                              {item.thanked ? "✔ Thanked" : "Thanks"}
                            </button>
                          )}

                          {isBirthdayThanks && (
                            <>
                              <button
                                onClick={() => onViewThanks(item.message)}
                                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white border border-slate-800 shadow-sm transition-colors cursor-pointer"
                              >
                                View
                              </button>
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Acknowledged
                              </span>
                            </>
                          )}
                        </div>
                      )}

                      {/* Check-In Reminder Action */}
                      {isCheckinReminder && (
                        <div className="mt-3 flex items-center gap-2">
                          <button
                            onClick={() => {
                              if (onGoToAttendance) {
                                onGoToAttendance();
                              }
                            }}
                            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white border border-blue-600 shadow-sm transition-colors cursor-pointer"
                          >
                            Go to Attendance
                          </button>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => onDismiss(item.id)}
                      className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded focus:outline-none focus:ring-1 focus:ring-slate-300 cursor-pointer"
                      aria-label="Dismiss notification"
                    >
                      ✕
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      <style>{`
        @keyframes fadeInSlide {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default NotificationPanel;