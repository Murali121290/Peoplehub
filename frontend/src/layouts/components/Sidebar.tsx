import React, { useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDownIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';
import {
  DocumentChartBarIcon, ClockIcon, PresentationChartLineIcon,
} from '@heroicons/react/24/outline';
import logo from '../../images/s.png';

interface SidebarProps {
  sidebarItems: any[];
  showReportMenu: boolean;
  setShowReportMenu: (val: boolean) => void;
  user: any;
  profileImageUrl: string;
  onLogout: () => void;
}

const reportLinks = [
  { name: "Schedule Report", icon: DocumentChartBarIcon, path: "/reports/schedule", state: { tab: "schedule" } },
  { name: "Team Schedule", icon: ClockIcon, path: "/reports/today-schedule", state: { tab: "today" } },
  { name: "Project Info", icon: PresentationChartLineIcon, path: "/reports/project-schedule", state: { tab: "project" } },
];

const Sidebar: React.FC<SidebarProps> = ({
  sidebarItems,
  showReportMenu,
  setShowReportMenu,
  user,
  profileImageUrl,
  onLogout,
}) => {
  const location = useLocation();
  const reportMenuRef = useRef<HTMLDivElement | null>(null);
  const isDesktop = typeof window !== "undefined" && window.innerWidth >= 1024;

  return (
    <motion.aside
      initial={{ x: -280 }}
      animate={{ x: 0 }}
      exit={{ x: -280 }}
      transition={{ type: "spring", damping: 22, stiffness: 220 }}
      className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-gray-700 bg-gray-800 lg:sticky flex flex-col"
    >
      {/* Logo */}
      <div className="flex justify-center items-center mb-10 mt-2 flex-shrink-0">
        <div className="relative w-[180px] h-[95px] bg-gradient-to-br from-[#ffffff] to-[#f8fafc] rounded-3xl border border-white/40 shadow-[0_8px_30px_rgba(0,0,0,0.12)] flex items-center justify-center overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-[0_10px_40px_rgba(59,130,246,0.25)]">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-orange-500/5" />
          <img src={logo} alt="S4 Carlisle" className="relative z-10 w-[150px] h-auto object-contain drop-shadow-sm select-none pointer-events-none" draggable="false" />
        </div>
      </div>

      {/* Nav Links — scrollable */}
      <nav className="flex-1 overflow-y-auto mt-4 px-3">
        {sidebarItems.map((item) => {
          const isActive = location.pathname === item.path;
          const isReportsParent = location.pathname.startsWith("/reports/");

          if (item.name === "Reports") {
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
                    isReportsParent || showReportMenu ? "bg-gray-700 text-white" : "text-gray-300 hover:bg-gray-700 hover:text-white"
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
                      <div className="mt-2 space-y-1 rounded-2xl border border-gray-700 bg-gray-900/60 p-2 backdrop-blur-sm">
                        {reportLinks.map((report) => {
                          const isSubActive = location.pathname === report.path;
                          return (
                            <Link
                              key={report.path}
                              to={report.path}
                              state={report.state}
                              className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition-all ${
                                isSubActive ? "bg-white text-gray-900 font-semibold" : "text-gray-300 hover:bg-gray-700 hover:text-white"
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
              className={`mb-2 flex items-center rounded-xl px-4 py-3 transition-colors ${
                isActive ? "bg-white font-semibold text-gray-900" : "text-gray-300 hover:bg-gray-700 hover:text-white"
              }`}
            >
              <item.icon className="mr-3 h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Profile + Logout — always at bottom, never overlaps */}
      <div className="flex-shrink-0 border-t border-gray-700 bg-gray-800 p-4">
        <div className="mb-4 flex items-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white">
            <img
              src={profileImageUrl}
              alt="Profile"
              className="w-10 h-10 rounded-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = "none";
                const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                if (fallback) fallback.style.display = "flex";
              }}
            />
            <div className="w-10 h-10 rounded-full bg-white text-black font-semibold items-center justify-center hidden">
              {user?.full_name?.charAt(0)?.toUpperCase()}
            </div>
          </div>
          <div className="ml-3 flex-1 overflow-hidden">
            <p className="truncate text-sm font-medium text-white">{user?.full_name}</p>
            <p className="text-xs text-gray-400">{user?.role}</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="flex w-full items-center justify-center rounded-xl bg-red-600 px-4 py-2.5 text-white transition-colors hover:bg-red-700"
        >
          <ArrowRightOnRectangleIcon className="mr-2 h-5 w-5" />
          Logout
        </button>
      </div>
    </motion.aside>
  );
};

export default Sidebar;