import React from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircleIcon, ClockIcon, CalendarDaysIcon, ChartBarIcon,
  CheckBadgeIcon,
} from '@heroicons/react/24/outline';
import StatCard from '../components/StatCard';
import AttendanceCard from '../components/AttendanceCard';
import { tasksData, notificationsData, activityData, upcomingDeadlines } from '../data/employeeMockData';
import { getPriorityColor } from '../utils/employeeHelpers';

interface OverviewTabProps {
  isCheckedIn: boolean;
  checkInTime: Date | null;
  timer: string;
  totalLunchSeconds: number;
  totalTeaSeconds: number;
  isLunchBreak: boolean;
  isTeaBreak: boolean;
  lunchStartTime: Date | null;
  teaStartTime: Date | null;
  currentEmployee: any;
  user: any;
  onCheckInOut: () => void;
  onLunchBreak: () => void;
  onTeaBreak: () => void;
  itemVariants: any;
}

const OverviewTab: React.FC<OverviewTabProps> = ({
  isCheckedIn, checkInTime, timer, totalLunchSeconds, totalTeaSeconds,
  isLunchBreak, isTeaBreak, lunchStartTime, teaStartTime, currentEmployee, user,
  onCheckInOut, onLunchBreak, onTeaBreak, itemVariants,
}) => {
  return (
    <>
      <motion.div variants={itemVariants}>
        <AttendanceCard
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
          onCheckInOut={onCheckInOut}
          onLunchBreak={onLunchBreak}
          onTeaBreak={onTeaBreak}
        />
      </motion.div>


    </>
  );
};

export default OverviewTab;