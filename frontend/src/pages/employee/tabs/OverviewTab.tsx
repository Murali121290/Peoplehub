import React from "react";
import { motion } from "framer-motion";

import AttendanceCard from "../components/AttendanceCard";
import WorkAnniversaryCard from "../components/WorkAnniversaryCard";

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
  isCheckedIn,
  checkInTime,
  timer,
  totalLunchSeconds,
  totalTeaSeconds,
  isLunchBreak,
  isTeaBreak,
  lunchStartTime,
  teaStartTime,
  currentEmployee,
  user,
  onCheckInOut,
  onLunchBreak,
  onTeaBreak,
  itemVariants,
}) => {
  return (
    <motion.div
      variants={itemVariants}
      className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start"
    >
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

      <WorkAnniversaryCard />
    </motion.div>
  );
};

export default OverviewTab;