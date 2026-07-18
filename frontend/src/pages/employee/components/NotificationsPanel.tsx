import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Gift, CalendarHeart } from "lucide-react";
import WorkAnniversaryCard from "./WorkAnniversaryCard";

interface NotificationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  birthdayEmployees: any[];
  isMyBirthday: boolean;
}

const NotificationsPanel: React.FC<NotificationsPanelProps> = ({
  isOpen,
  onClose,
  birthdayEmployees,
  isMyBirthday
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 z-40"
          />
          
          {/* Side Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 w-full max-w-sm bg-white shadow-xl z-50 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Celebrations</h2>
              <button 
                onClick={onClose}
                className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              
              {/* Birthdays */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-rose-50 rounded-lg text-rose-500">
                    <Gift className="w-4 h-4" />
                  </div>
                  <h3 className="font-semibold text-gray-900 text-sm">Today's Birthdays</h3>
                </div>
                
                {birthdayEmployees.length === 0 && !isMyBirthday ? (
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 text-center">
                    <p className="text-sm text-gray-500">No birthdays today</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {isMyBirthday && (
                      <div className="p-4 bg-gradient-to-r from-rose-50 to-orange-50 rounded-xl border border-rose-100">
                        <div className="flex items-center gap-3">
                          <div className="text-2xl">🎉</div>
                          <div>
                            <h4 className="font-semibold text-gray-900 text-sm">Happy Birthday!</h4>
                            <p className="text-xs text-gray-600">Wishing you a fantastic day!</p>
                          </div>
                        </div>
                      </div>
                    )}
                    {birthdayEmployees.map((emp) => (
                      <div key={emp.id} className="flex items-center gap-3 p-3 bg-white border border-gray-100 rounded-xl shadow-sm">
                        <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden flex-shrink-0">
                          {emp.profile_image ? (
                            <img src={`data:image/jpeg;base64,${emp.profile_image}`} alt={emp.first_name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              <Gift className="w-5 h-5" />
                            </div>
                          )}
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 text-sm">{emp.first_name} {emp.last_name}</h4>
                          <p className="text-xs text-gray-500">{emp.designation}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <hr className="border-gray-100" />

              {/* Work Anniversaries */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-blue-50 rounded-lg text-blue-500">
                    <CalendarHeart className="w-4 h-4" />
                  </div>
                  <h3 className="font-semibold text-gray-900 text-sm">Work Anniversaries</h3>
                </div>
                <WorkAnniversaryCard />
              </div>

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default NotificationsPanel;
