export const computeAttendanceBadgeLabel = (
  status: string,
  totalHours: number,
  leaveDetails: any[],
  dateStr: string,
  todayStr: string,
  isFuture: boolean,
  isOneDayWages: boolean = false
): string => {
  if (leaveDetails && leaveDetails.length > 0 && !isOneDayWages) {
    if (leaveDetails.length === 2 && leaveDetails.every((l: any) => l.total_days != null && Number(l.total_days) <= 0.5)) {
      const l1 = leaveDetails[0];
      const l2 = leaveDetails[1];

      const getDur = (l: any) => l.reason?.includes("First Half") ? " (First Half)" : l.reason?.includes("Second Half") ? " (Second Half)" : " (Half)";

      return `${l1.leave_type || "Leave"}${getDur(l1)}${l1.status === "Pending" ? " (Pending)" : ""} & ${l2.leave_type || "Leave"}${getDur(l2)}${l2.status === "Pending" ? " (Pending)" : ""}`;
    } else {
      const matchedLeave = leaveDetails[0];
      const leaveTypeLower = matchedLeave.leave_type?.toLowerCase() || "";
      const isLopLeave = leaveTypeLower.includes("loss of pay") || /\blop\b/.test(leaveTypeLower) || leaveTypeLower.includes("unpaid leave");
      const isPending = matchedLeave.status === "Pending";
      const isHalfDay = matchedLeave.total_days != null && Number(matchedLeave.total_days) <= 0.5;

      let durationStr = "";
      if (isHalfDay) {
        if (matchedLeave.reason?.includes("First Half")) {
          durationStr = " (First Half)";
        } else if (matchedLeave.reason?.includes("Second Half")) {
          durationStr = " (Second Half)";
        } else {
          durationStr = " (Half Day)";
        }
      }

      let otherHalfStatusStr = "";
      if (isHalfDay && dateStr <= todayStr && !isFuture) {
        if (Math.round(totalHours * 60) >= 240) {
          otherHalfStatusStr = "Half Day Present & ";
        } else {
          otherHalfStatusStr = "Half Day Absent & ";
        }
      }

      if (isLopLeave) {
        return otherHalfStatusStr + (matchedLeave.leave_type || "Loss of Pay") + durationStr + (isPending ? " (Pending)" : "");
      } else {
        return otherHalfStatusStr + (matchedLeave.leave_type || "Leave") + durationStr + (isPending ? " (Pending)" : "");
      }
    }
  }

  return status || "—";
};
