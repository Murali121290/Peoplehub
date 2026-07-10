import React, { useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDownIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';
import {
  DocumentChartBarIcon, ClockIcon, PresentationChartLineIcon,
} from '@heroicons/react/24/outline';
import logo from '../../images/s.png';
import { Button } from '../../components/ui/Button';
import { useIsDesktop } from '../hooks/useIsDesktop';

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
  { name: "Project Info", icon: PresentationChartLineIcon, path: "/reports/project-schedule", state: { tab: "project" } },
];

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

  const navigate = useNavigate();

  const accessLevel = `${user?.access_level || ''}`.toLowerCase();
  const isEmployeeOrManager = 
    accessLevel === 'user' || 
    accessLevel === 'manager' || 
    accessLevel === 'standard' ||
    ['copyeditor', 'project manager', 'editorial manager'].includes(user?.role?.toLowerCase() || '');

  const showUpdateProfile = isEmployeeOrManager;

  return (
    <motion.aside
      initial={{ x: -280 }}
      animate={{ x: 0 }}
      exit={{ x: -280 }}
      transition={{ type: "spring", damping: 22, stiffness: 220 }}
      className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-neutral-200 bg-white shadow-sm lg:sticky flex flex-col"
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
                                isSubActive ? "bg-primary-500 text-white font-semibold" : "text-neutral-600 hover:bg-white hover:text-neutral-800"
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
              src={profileImageUrl}
              alt="Profile"
              className="w-10 h-10 rounded-full object-cover"
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
          <div className="ml-3 flex-1 overflow-hidden">
            <p className="truncate text-sm font-medium text-neutral-800">{user?.full_name}</p>
            <p className="text-xs text-neutral-400">{user?.role}</p>
          </div>
        </div>
        <>
  {showUpdateProfile && (
    <Button
      variant="secondary"
      fullWidth
      className="mb-3"
      onClick={() => navigate("/complete-profile")}
    >
      Update Profile
    </Button>
  )}

  <Button
    variant="danger"
    fullWidth
    icon={ArrowRightOnRectangleIcon}
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