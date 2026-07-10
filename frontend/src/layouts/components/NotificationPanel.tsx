import React from 'react';

interface NotificationPanelProps {
  notifications: any[];
  showNotifications: boolean;
  onToggle: () => void;
  onClearAll: () => void;
  onDismiss: (id: number) => void;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({
  notifications,
  showNotifications,
  onToggle,
  onClearAll,
  onDismiss,
}) => {
  return (
    <div className="fixed top-5 right-5 z-[9998]">
      <button
        onClick={onToggle}
        className="relative bg-white rounded-full p-3 shadow-xl border border-gray-200 hover:shadow-2xl hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
        aria-label="Notifications"
      >
        <span className="text-xl">🔔</span>
        {notifications.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-semibold shadow">
            {notifications.length}
          </span>
        )}
      </button>

      {showNotifications && (
        <div
          className="absolute top-14 right-0 mt-2 w-[380px] bg-white rounded-2xl shadow-2xl border border-gray-200 max-h-[480px] overflow-y-auto"
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
            <ul className="divide-y divide-gray-100">
              {notifications.map((item: any) => (
                <li key={item.id} className="p-4 hover:bg-gray-50 transition-colors flex gap-3 items-start rounded-lg mx-3 my-2 border border-gray-200">
                  <span className="text-lg">
                    {item.type === "success" && "🟢"}
                    {item.type === "warning" && "🟡"}
                    {item.type === "error" && "🔴"}
                    {(item.type === "info" || !item.type) && "🔵"}
                  </span>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-800">{item.title}</h4>
                    <p className="text-sm text-gray-700 mt-0.5">{item.message}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      {item.timestamp ? new Date(item.timestamp).toLocaleString() : "Just now"}
                    </p>
                  </div>
                  <button
                    onClick={() => onDismiss(item.id)}
                    className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded focus:outline-none focus:ring-2 focus:ring-gray-300"
                    aria-label="Dismiss notification"
                  >
                    ✕
                  </button>
                </li>
              ))}
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