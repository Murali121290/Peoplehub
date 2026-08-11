import React, {
  useState,
  useEffect,
  useRef,
} from "react";
import { toast } from "react-hot-toast";

import Panel from "../components/Panel";
import Chip from "../components/Chip";
import { Button } from "../../../components/ui/Button";
import { Table } from "../../../components/ui/Table";

interface AttendanceTabProps {
  attendance: any[];
  BASE_URL: string;
}

const AttendanceTab: React.FC<AttendanceTabProps> = ({
  attendance,
  BASE_URL,
}) => {

  const [attendanceView, setAttendanceView] = useState("today");
  const [dateRange, setDateRange] = useState("");
  const [attendanceData, setAttendanceData] = useState<any[]>(attendance);
  const [loading, setLoading] = useState(false);
  const [selectedShift, setSelectedShift] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [availableMonths, setAvailableMonths] = useState<any[]>([]);
  const [selectedCycle, setSelectedCycle] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExcelUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      setLoading(true);
      const res = await fetch(`${BASE_URL}/attendance/upload-excel`, {
        method: "POST",
        body: formData,
      });


      const result = await res.json();
      if (res.ok && result.success) {
        toast.success(result.message || "Excel uploaded and attendance synced successfully!");
        // Reload attendance data
        let url = `${BASE_URL}/attendance`;
        if (attendanceView === "weekly") {
          url = `${BASE_URL}/attendance/weekly`;
        } else if (attendanceView === "monthly") {
          url = `${BASE_URL}/attendance/monthly`;
        }
        const response = await fetch(url);
        const data = await response.json();
        setAttendanceData(data || []);
      } else {
        toast.error(result.error || "Failed to sync Excel attendance");
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Error uploading Excel file");
    } finally {
      setLoading(false);
      if (event.target) {
        event.target.value = ""; // Clear file selection
      }
    }
  };

  // Format Date Range professionally
  const formatReadableDate = (dateObj: Date) => {
    return dateObj.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const triggerDbSync = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${BASE_URL}/attendance/trigger-db-sync`, {
        method: "POST",
      });

      const result = await res.json();
      if (res.ok && result.success) {
        toast.success(result.message || "Attendance synced from Biometric Database successfully!");
        // Reload attendance data
        let url = `${BASE_URL}/attendance`;
        if (attendanceView === "weekly") {
          url = `${BASE_URL}/attendance/weekly`;
        } else if (attendanceView === "monthly") {
          url = `${BASE_URL}/attendance/monthly`;
        }
        const response = await fetch(url);
        const data = await response.json();
        setAttendanceData(data || []);
      } else {
        toast.error(result.error || "Failed to sync from Biometric Database");
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Error triggering database sync");
    } finally {
      setLoading(false);
    }
  };

  const updateDateRange = (type: string) => {
    const today = new Date();

    if (type === "today") {
      setDateRange(formatReadableDate(today));
    } else if (type === "weekly") {
      const start = new Date();
      start.setDate(today.getDate() - 6);
      setDateRange(`${formatReadableDate(start)} - ${formatReadableDate(today)}`);
    } else if (type === "monthly") {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      setDateRange(`${formatReadableDate(start)} - ${formatReadableDate(end)}`);
    }
  };

  // Helper to dynamically calculate calendar date string for the Mon-Sun header labels
  const getWeekdayHeader = (label: string, dayIndex: number) => {
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      if (d.getDay() === dayIndex) {
        const formattedDate = d.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
        return `${label} (${formattedDate})`;
      }
    }
    return label;
  };

  // Group flat backend weekly records into structured row per employee
  const getGroupedWeeklyData = (data: any[]) => {
    const grouped: Record<string, any> = {};

    data.forEach((record) => {
      const empName = record.employee_name;
      if (!grouped[empName]) {
        grouped[empName] = {
          employee_name: empName,
          team: record.team || record.department || "-",
          shift_timing: record.shift_timing || record.shift || "General Shift",
          mon: null,
          tue: null,
          wed: null,
          thu: null,
          fri: null,
          sat: null,
          sun: null,
        };
      }

      if (record.date) {
        const parts = record.date.split("-");
        if (parts.length === 3) {
          const dateObj = new Date(
            parseInt(parts[2]),
            parseInt(parts[1]) - 1,
            parseInt(parts[0])
          );
          const dayNames = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
          const dayName = dayNames[dateObj.getDay()];
          grouped[empName][dayName] = {
            status: record.status,
            check_in: record.check_in,
            check_out: record.check_out,
            total_hours: record.total_hours,
          };
        }
      }
    });

    return Object.values(grouped);
  };

  // Group flat backend monthly records into structured row per employee
  const getGroupedMonthlyData = (data: any[]) => {
    const grouped: Record<string, any> = {};

    // Collect all unique dates in the dataset
    const dateSet = new Set<string>();
    data.forEach((record) => {
      if (record.date) {
        dateSet.add(record.date);
      }
    });

    // Sort dates chronologically (date is "DD-MM-YYYY")
    const sortedDates = Array.from(dateSet).sort((a, b) => {
      const partsA = a.split("-");
      const partsB = b.split("-");
      const dateA = new Date(
        parseInt(partsA[2]),
        parseInt(partsA[1]) - 1,
        parseInt(partsA[0])
      );
      const dateB = new Date(
        parseInt(partsB[2]),
        parseInt(partsB[1]) - 1,
        parseInt(partsB[0])
      );
      return dateA.getTime() - dateB.getTime();
    });

    data.forEach((record) => {
      const empName = record.employee_name;
      if (!grouped[empName]) {
        grouped[empName] = {
          employee_name: empName,
          team: record.team || record.department || "-",
          shift_timing: record.shift_timing || record.shift || "General Shift",
          presentCount: 0,
          absentCount: 0,
          lateCount: 0,
          leaveCount: 0,
          totalHoursSum: 0,
          hoursRecordCount: 0,
          daysMap: {},
        };
      }

      if (record.date) {
        grouped[empName].daysMap[record.date] = record;

        const status = (record.status || "Absent").toLowerCase();
        if (status === "present") {
          grouped[empName].presentCount += 1;
        } else if (status === "absent") {
          grouped[empName].absentCount += 1;
        } else if (status === "late") {
          grouped[empName].lateCount += 1;
        } else if (
          status === "on_leave" ||
          status === "leave" ||
          status === "on leave"
        ) {
          grouped[empName].leaveCount += 1;
        } else if (status === "half day" || status === "half_day") {
          grouped[empName].halfDayCount = (grouped[empName].halfDayCount || 0) + 1;
        }

        if (record.total_hours && record.total_hours !== "-") {
          const hrs = parseFloat(record.total_hours);
          if (!isNaN(hrs)) {
            grouped[empName].totalHoursSum += hrs;
            grouped[empName].hoursRecordCount += 1;
          }
        }
      }
    });

    return Object.values(grouped).map((emp: any) => {
      const avgHours =
        emp.hoursRecordCount > 0
          ? (emp.totalHoursSum / emp.hoursRecordCount).toFixed(1)
          : "-";
      return {
        ...emp,
        avgHours,
        sortedDates,
      };
    });
  };

  // Render a professional status chip for weekly attendance columns
  const renderWeeklyCell = (cellData: any) => {
    if (!cellData) return <span className="text-neutral-400 font-medium">-</span>;

    const status = (cellData.status || "Absent").toLowerCase();

    if (status === "present") {
      return (
        <div className="flex flex-col items-center">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
            P
          </span>
          <span className="text-[9px] text-neutral-400 mt-0.5">
            {cellData.total_hours && cellData.total_hours !== "-" ? `${cellData.total_hours} hrs` : ""}
          </span>
        </div>
      );
    } else if (status === "absent") {
      return (
        <div className="flex flex-col items-center">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-800">
            A
          </span>
        </div>
      );
    } else if (status === "late") {
      return (
        <div className="flex flex-col items-center">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800">
            L
          </span>
          <span className="text-[9px] text-amber-600 mt-0.5">
            {cellData.check_in}
          </span>
        </div>
      );
    } else if (status === "on_leave" || status === "leave" || status === "on leave") {
      return (
        <div className="flex flex-col items-center">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-800">
            LV
          </span>
        </div>
      );
    } else if (status === "half day" || status === "half_day") {
      return (
        <div className="flex flex-col items-center">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 text-purple-800">
            HD
          </span>
          <span className="text-[9px] text-neutral-400 mt-0.5">
            {cellData.total_hours && cellData.total_hours !== "-" ? `${cellData.total_hours} hrs` : ""}
          </span>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center">
        <span className="text-[11px] text-neutral-500 font-medium capitalize">
          {cellData.status}
        </span>
      </div>
    );
  };

  // Render a mini square tracker for each of the last 30 days
  const renderMonthlyGrid = (row: any) => {
    return (
      <div className="flex gap-[2px] items-center py-1 flex-wrap">
        {row.sortedDates.map((dateStr: string) => {
          const record = row.daysMap[dateStr];
          const status = record
            ? (record.status || "Absent").toLowerCase()
            : "none";

          let colorClass = "bg-neutral-100 border border-neutral-200";
          let tooltipTitle = `${dateStr}: No Record`;

          if (status === "present") {
            colorClass = "bg-emerald-500 hover:bg-emerald-600";
            tooltipTitle = `${dateStr}: Present (${record.total_hours} hrs)`;
          } else if (status === "absent") {
            colorClass = "bg-rose-500 hover:bg-rose-600";
            tooltipTitle = `${dateStr}: Absent`;
          } else if (status === "late") {
            colorClass = "bg-amber-500 hover:bg-amber-600";
            tooltipTitle = `${dateStr}: Late (${record.check_in})`;
          } else if (
            status === "on_leave" ||
            status === "leave" ||
            status === "on leave"
          ) {
            colorClass = "bg-blue-500 hover:bg-blue-600";
            tooltipTitle = `${dateStr}: Leave`;
          } else if (status === "half day" || status === "half_day") {
            colorClass = "bg-purple-500 hover:bg-purple-600";
            tooltipTitle = `${dateStr}: Half Day (${record.total_hours} hrs)`;
          }

          return (
            <div
              key={dateStr}
              title={tooltipTitle}
              className={`w-2.5 h-2.5 rounded-[1px] cursor-pointer transition-transform hover:scale-125 opacity-80 hover:opacity-100 ${colorClass}`}
            />
          );
        })}
      </div>
    );
  };

  // Shift Count Logic - Ensure unique count of employees per shift
  const uniqueEmployees = Array.from(
    new Map(attendanceData.map((emp) => [emp.employee_name, emp])).values()
  );

  const getShiftCount = (shiftName: string) => {
    return uniqueEmployees.filter(
      (emp) =>
        (emp.shift || emp.shift_timing || "General Shift")
          .trim()
          .toLowerCase() === shiftName.toLowerCase()
    ).length;
  };

  const morningCount = getShiftCount("Morning Shift");
  const generalCount = getShiftCount("General Shift");
  const secondCount = getShiftCount("Second Shift");
  const nightCount = getShiftCount("Night Shift");
  const wfhCount = uniqueEmployees.filter((emp) => !!emp.is_wfh).length;
  const shiftChangedCount = uniqueEmployees.filter((emp) => !!emp.is_shift_changed).length;

  // Overview Counts (calculated from current active view's unfiltered attendanceData)
  const totalEmployees = uniqueEmployees.length;

  const totalPresentCount = attendanceData.filter(
    (emp) => {
      const s = (emp.status || "Absent").toLowerCase();
      return s === "present" || s === "late";
    }
  ).length;

  const totalAbsentCount = attendanceData.filter(
    (emp) => (emp.status || "Absent").toLowerCase() === "absent"
  ).length;

  const totalLateCount = attendanceData.filter(
    (emp) => (emp.status || "Absent").toLowerCase() === "late"
  ).length;

  const totalLeaveCount = attendanceData.filter(
    (emp) => {
      const s = (emp.status || "Absent").toLowerCase();
      return s === "on_leave" || s === "leave" || s === "on leave";
    }
  ).length;

  const totalHalfDayCount = attendanceData.filter(
    (emp) => {
      const s = (emp.status || "Absent").toLowerCase();
      return s === "half day" || s === "half_day";
    }
  ).length;

  const filteredAttendance = attendanceData.filter((emp) => {
    // 1. Shift / Operational category filter
    const matchesShift =
      selectedShift === "All" ||
      (selectedShift === "WFH" && !!emp.is_wfh) ||
      (selectedShift === "Shift Changed" && !!emp.is_shift_changed) ||
      (emp.shift || emp.shift_timing || "General Shift")
        .trim()
        .toLowerCase() === selectedShift.trim().toLowerCase();

    // 2. Status filter
    const status = (emp.status || "Absent").toLowerCase();
    let matchesStatus = true;
    if (statusFilter !== "All") {
      if (statusFilter === "Present") {
        matchesStatus = status === "present" || status === "late";
      } else if (statusFilter === "Absent") {
        matchesStatus = status === "absent";
      } else if (statusFilter === "Late") {
        matchesStatus = status === "late";
      } else if (statusFilter === "On Leave") {
        matchesStatus = status === "on_leave" || status === "leave" || status === "on leave";
      } else if (statusFilter === "Half Day") {
        matchesStatus = status === "half day" || status === "half_day";
      }
    }

    // 3. Search filter
    const matchesSearch =
      (emp.employee_name || "")
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

    return matchesShift && matchesStatus && matchesSearch;
  });

  const displayData =
    attendanceView === "weekly"
      ? getGroupedWeeklyData(filteredAttendance)
      : attendanceView === "monthly"
        ? getGroupedMonthlyData(filteredAttendance)
        : filteredAttendance;

  useEffect(() => {
    const loadAttendance = async () => {
      try {
        setLoading(true);
        let url = `${BASE_URL}/attendance`;

        if (attendanceView === "weekly") {
          url = `${BASE_URL}/attendance/weekly`;
        } else if (attendanceView === "monthly") {
          url = `${BASE_URL}/attendance/monthly`;
        }

        const response = await fetch(url);
        const data = await response.json();
        setAttendanceData(data || []);
      } catch (error) {
        console.error("Attendance Error:", error);
      } finally {
        setLoading(false);
      }
    };

    loadAttendance();
    updateDateRange(attendanceView);
  }, [attendanceView, BASE_URL]);

  useEffect(() => {
    const fetchMonths = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(`${BASE_URL}/attendance/available-months`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          setAvailableMonths(data);
          setSelectedCycle(`${data[0].month},${data[0].year}`);
        }
      } catch (err) {
        console.error("Failed to load available cycles:", err);
      }
    };
    fetchMonths();
  }, [BASE_URL]);

  const downloadAttendance = async () => {
    try {
      const userId = localStorage.getItem("user_id");
      const userStr = localStorage.getItem("user");
      const user = userStr ? JSON.parse(userStr) : null;
      const userRole = user?.role;

      let url = `${BASE_URL}/attendance/export-monthly`;
      const queryParams: string[] = [];

      if (userRole === "Manager") {
        queryParams.push(`manager_id=${userId}`);
      }
      if (selectedCycle) {
        const [m, y] = selectedCycle.split(",");
        queryParams.push(`month=${m}`);
        queryParams.push(`year=${y}`);
      }

      if (queryParams.length > 0) {
        url += `?${queryParams.join("&")}`;
      }


      const token = localStorage.getItem("token");
      const response = await fetch(url, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const blob = await response.blob();
      const urlBlob = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = urlBlob;
      const activeLabel = availableMonths.find((m) => `${m.month},${m.year}` === selectedCycle)?.label || "";
      const filenameSuffix = activeLabel ? `_${activeLabel.replace(" ", "_")}` : "";
      a.download = userRole === "Manager" ? `Team_Attendance_Report${filenameSuffix}.xlsx` : `Attendance_Report${filenameSuffix}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (error) {
      console.error(error);
    }
  };

  const todayColumns = [
    {
      key: "employee_name",
      header: "Employee",
      render: (at: any) => (
        <div className="font-semibold text-neutral-800">
          {at.employee_name}
        </div>
      ),
    },
    {
      key: "team",
      header: "Team",
      render: (at: any) =>
        at.team || at.department || at.designation || "-",
    },
    {
      key: "date",
      header: "Date",
      render: (at: any) => at.date || at.attendance_date || "-",
    },
    {
      key: "check_in",
      header: "Check In",
      render: (at: any) => at.check_in || "-",
    },
    {
      key: "check_out",
      header: "Check Out",
      render: (at: any) => at.check_out || "-",
    },
    {
      key: "card_check_in",
      header: "Bio Check In",
      render: (at: any) => at.card_check_in || "-",
    },
    {
      key: "card_check_out",
      header: "Bio Check Out",
      render: (at: any) => at.card_check_out || "-",
    },
    {
      key: "total_hours",
      header: "Working Hours",
      render: (at: any) => at.total_hours || "-",
    },
    {
      key: "shift",
      header: "Shift",
      render: (at: any) => at.shift || at.shift_timing || "General Shift",
    },
    {
      key: "status",
      header: "Status",
      render: (at: any) => <Chip type={at.status} />,
    },
  ];

  const weeklyColumns = [
    {
      key: "employee_name",
      header: "Employee",
      render: (row: any) => (
        <div className="font-semibold text-neutral-800">
          {row.employee_name}
        </div>
      ),
    },
    {
      key: "team",
      header: "Team",
      render: (row: any) => (
        <span className="text-xs text-neutral-500">
          {row.team || row.department || "-"}
        </span>
      ),
    },
    {
      key: "mon",
      header: getWeekdayHeader("Mon", 1),
      render: (row: any) => renderWeeklyCell(row.mon),
    },
    {
      key: "tue",
      header: getWeekdayHeader("Tue", 2),
      render: (row: any) => renderWeeklyCell(row.tue),
    },
    {
      key: "wed",
      header: getWeekdayHeader("Wed", 3),
      render: (row: any) => renderWeeklyCell(row.wed),
    },
    {
      key: "thu",
      header: getWeekdayHeader("Thu", 4),
      render: (row: any) => renderWeeklyCell(row.thu),
    },
    {
      key: "fri",
      header: getWeekdayHeader("Fri", 5),
      render: (row: any) => renderWeeklyCell(row.fri),
    },
    {
      key: "sat",
      header: getWeekdayHeader("Sat", 6),
      render: (row: any) => renderWeeklyCell(row.sat),
    },
    {
      key: "sun",
      header: getWeekdayHeader("Sun", 0),
      render: (row: any) => renderWeeklyCell(row.sun),
    },
  ];

  const monthlyColumns = [
    {
      key: "employee_name",
      header: "Employee",
      render: (row: any) => (
        <div className="font-semibold text-neutral-800">
          {row.employee_name}
        </div>
      ),
    },
    {
      key: "team",
      header: "Team",
      render: (row: any) => (
        <span className="text-xs text-neutral-500">
          {row.team || row.department || "-"}
        </span>
      ),
    },
    {
      key: "summary",
      header: "Summary (P/A/L/LV)",
      render: (row: any) => (
        <div className="flex items-center gap-3 text-[11px] font-bold tracking-wide">
          <span className="text-emerald-600">
            {row.presentCount} P
          </span>
          <span className="text-rose-500">
            {row.absentCount} A
          </span>
          <span className="text-amber-500">
            {row.lateCount} L
          </span>
          <span className="text-blue-500">
            {row.leaveCount} LV
          </span>
        </div>
      ),
    },
    {
      key: "avg_hours",
      header: "Avg Hours",
      render: (row: any) => (
        <span className="font-medium text-neutral-700 text-xs">
          {row.avgHours !== "-" ? `${row.avgHours} hrs` : "-"}
        </span>
      ),
    },

  ];

  const clearFilters = () => {
    setSelectedShift("All");
    setStatusFilter("All");
    setSearchQuery("");
  };

  return (
    <Panel>
      {/* Header */}
      <div className="flex justify-between items-start mb-5">
        <div>
          <div className="text-lg font-bold text-neutral-800">
            Attendance Management
          </div>

          <div className="text-xs text-neutral-500 mt-1 font-medium">
            {new Date().toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
              weekday: "long",
            })}
          </div>

          {/* <div className="text-[11px] text-neutral-400 mt-1.5 font-medium">
            {dateRange}
          </div> */}
        </div>

        <div className="flex items-center gap-4">
          {availableMonths.length > 0 && (
            <select
              value={selectedCycle}
              onChange={(e) => setSelectedCycle(e.target.value)}
              className="px-3 py-1.5 border border-neutral-200 rounded-xl bg-white text-xs font-semibold text-neutral-600 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-100 cursor-pointer"
            >
              {availableMonths.map((m: any) => (
                <option key={`${m.month}-${m.year}`} value={`${m.month},${m.year}`}>
                  {m.label}
                </option>
              ))}
            </select>
          )}

          <Button
            onClick={downloadAttendance}
            variant="success"
          >
            Download Excel
          </Button>

          <Button
            onClick={() => fileInputRef.current?.click()}
            variant="primary"
          >
            Upload Card Excel
          </Button>

          <Button
            onClick={triggerDbSync}
            variant="success"
            disabled={loading}
          >
            {loading ? "Syncing..." : "Link to DB"}
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleExcelUpload}
            accept=".xls"
            style={{ display: "none" }}
          />

          {/* Tabs */}
          <div className="flex gap-2">
            {["today", "weekly", "monthly"].map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setAttendanceView(tab);
                  clearFilters(); // Clear active filters when switching views to ensure clean state
                }}
                className={
                  "px-3.5 py-1.5 rounded-md font-semibold text-xs transition-all " +
                  (attendanceView === tab
                    ? "border-2 border-info-600 bg-info-50 text-info-600"
                    : "border border-neutral-200 bg-white text-neutral-500")
                }
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Attendance Overview Summary Cards */}
      <div className="grid grid-cols-6 gap-3 mb-4">
        <div className="rounded-[10px] p-4 text-center bg-neutral-50 border border-neutral-200">
          <div className="text-[11px] text-neutral-500 font-semibold mb-1.5 uppercase">
            Total Employees
          </div>
          <div className="text-[22px] font-bold text-neutral-800">
            {totalEmployees}
          </div>
        </div>

        <div
          onClick={() => setStatusFilter(statusFilter === "Present" ? "All" : "Present")}
          className={
            "cursor-pointer rounded-[10px] p-4 text-center transition-all " +
            (statusFilter === "Present"
              ? "bg-emerald-100 border-2 border-emerald-500 text-emerald-800"
              : "bg-emerald-50/50 border border-emerald-100 text-emerald-700 hover:bg-emerald-50")
          }
        >
          <div className="text-[11px] font-semibold mb-1.5 uppercase">
            Present
          </div>
          <div className="text-[22px] font-bold">
            {totalPresentCount}
          </div>
        </div>

        <div
          onClick={() => setStatusFilter(statusFilter === "Absent" ? "All" : "Absent")}
          className={
            "cursor-pointer rounded-[10px] p-4 text-center transition-all " +
            (statusFilter === "Absent"
              ? "bg-rose-100 border-2 border-rose-500 text-rose-800"
              : "bg-rose-50/50 border border-rose-100 text-rose-700 hover:bg-rose-50")
          }
        >
          <div className="text-[11px] font-semibold mb-1.5 uppercase">
            Absent
          </div>
          <div className="text-[22px] font-bold">
            {totalAbsentCount}
          </div>
        </div>

        <div
          onClick={() => setStatusFilter(statusFilter === "Late" ? "All" : "Late")}
          className={
            "cursor-pointer rounded-[10px] p-4 text-center transition-all " +
            (statusFilter === "Late"
              ? "bg-amber-100 border-2 border-amber-500 text-amber-800"
              : "bg-amber-50/50 border border-amber-100 text-amber-700 hover:bg-amber-50")
          }
        >
          <div className="text-[11px] font-semibold mb-1.5 uppercase">
            Late
          </div>
          <div className="text-[22px] font-bold">
            {totalLateCount}
          </div>
        </div>

        <div
          onClick={() => setStatusFilter(statusFilter === "On Leave" ? "All" : "On Leave")}
          className={
            "cursor-pointer rounded-[10px] p-4 text-center transition-all " +
            (statusFilter === "On Leave"
              ? "bg-blue-100 border-2 border-blue-500 text-blue-800"
              : "bg-blue-50/50 border border-blue-100 text-blue-700 hover:bg-blue-50")
          }
        >
          <div className="text-[11px] font-semibold mb-1.5 uppercase">
            On Leave
          </div>
          <div className="text-[22px] font-bold">
            {totalLeaveCount}
          </div>
        </div>

        <div
          onClick={() => setStatusFilter(statusFilter === "Half Day" ? "All" : "Half Day")}
          className={
            "cursor-pointer rounded-[10px] p-4 text-center transition-all " +
            (statusFilter === "Half Day"
              ? "bg-purple-100 border-2 border-purple-500 text-purple-800"
              : "bg-purple-50/50 border border-purple-100 text-purple-700 hover:bg-purple-50")
          }
        >
          <div className="text-[11px] font-semibold mb-1.5 uppercase">
            Half Day
          </div>
          <div className="text-[22px] font-bold">
            {totalHalfDayCount}
          </div>
        </div>
      </div>

      {/* Shift Distribution Cards */}
      <div className="flex flex-wrap gap-3 mb-4">
        {morningCount > 0 && (
          <div
            onClick={() => setSelectedShift(selectedShift === "Morning Shift" ? "All" : "Morning Shift")}
            className={
              "cursor-pointer rounded-[10px] p-4 text-center transition-all flex-1 min-w-[150px] " +
              (selectedShift === "Morning Shift"
                ? "bg-warning-100 border-2 border-warning-500 text-warning-800"
                : "bg-neutral-50 border border-neutral-200 text-neutral-500 hover:bg-neutral-100")
            }
          >
            <div className="text-[11px] font-semibold mb-1.5 uppercase">
              Morning Shift
            </div>
            <div className="text-[22px] font-bold text-neutral-800">
              {morningCount}
            </div>
          </div>
        )}

        {generalCount > 0 && (
          <div
            onClick={() => setSelectedShift(selectedShift === "General Shift" ? "All" : "General Shift")}
            className={
              "cursor-pointer rounded-[10px] p-4 text-center transition-all flex-1 min-w-[150px] " +
              (selectedShift === "General Shift"
                ? "bg-info-100 border-2 border-info-500 text-info-800"
                : "bg-neutral-50 border border-neutral-200 text-neutral-500 hover:bg-neutral-100")
            }
          >
            <div className="text-[11px] font-semibold mb-1.5 uppercase">
              General Shift
            </div>
            <div className="text-[22px] font-bold text-neutral-800">
              {generalCount}
            </div>
          </div>
        )}

        {secondCount > 0 && (
          <div
            onClick={() => setSelectedShift(selectedShift === "Second Shift" ? "All" : "Second Shift")}
            className={
              "cursor-pointer rounded-[10px] p-4 text-center transition-all flex-1 min-w-[150px] " +
              (selectedShift === "Second Shift"
                ? "bg-pink-100 border-2 border-pink-500 text-pink-800"
                : "bg-neutral-50 border border-neutral-200 text-neutral-500 hover:bg-neutral-100")
            }
          >
            <div className="text-[11px] font-semibold mb-1.5 uppercase">
              Second Shift
            </div>
            <div className="text-[22px] font-bold text-neutral-800">
              {secondCount}
            </div>
          </div>
        )}

        {nightCount > 0 && (
          <div
            onClick={() => setSelectedShift(selectedShift === "Night Shift" ? "All" : "Night Shift")}
            className={
              "cursor-pointer rounded-[10px] p-4 text-center transition-all flex-1 min-w-[150px] " +
              (selectedShift === "Night Shift"
                ? "bg-purple-100 border-2 border-purple-500 text-purple-800"
                : "bg-neutral-50 border border-neutral-200 text-neutral-500 hover:bg-neutral-100")
            }
          >
            <div className="text-[11px] font-semibold mb-1.5 uppercase">
              Night Shift
            </div>
            <div className="text-[22px] font-bold text-neutral-800">
              {nightCount}
            </div>
          </div>
        )}

        {wfhCount > 0 && (
          <div
            onClick={() => setSelectedShift(selectedShift === "WFH" ? "All" : "WFH")}
            className={
              "cursor-pointer rounded-[10px] p-4 text-center transition-all flex-1 min-w-[150px] " +
              (selectedShift === "WFH"
                ? "bg-teal-100 border-2 border-teal-500 text-teal-800"
                : "bg-neutral-50 border border-neutral-200 text-neutral-500 hover:bg-teal-50")
            }
          >
            <div className="text-[11px] font-semibold mb-1.5 uppercase">
              Work From Home
            </div>
            <div className="text-[22px] font-bold text-neutral-800">
              {wfhCount}
            </div>
          </div>
        )}

        {shiftChangedCount > 0 && (
          <div
            onClick={() => setSelectedShift(selectedShift === "Shift Changed" ? "All" : "Shift Changed")}
            className={
              "cursor-pointer rounded-[10px] p-4 text-center transition-all flex-1 min-w-[150px] " +
              (selectedShift === "Shift Changed"
                ? "bg-indigo-100 border-2 border-indigo-500 text-indigo-800"
                : "bg-neutral-50 border border-neutral-200 text-neutral-500 hover:bg-indigo-50")
            }
          >
            <div className="text-[11px] font-semibold mb-1.5 uppercase">
              Shift Changed
            </div>
            <div className="text-[22px] font-bold text-neutral-800">
              {shiftChangedCount}
            </div>
          </div>
        )}
      </div>

      {/* Employee Search Input */}
      <div className="mb-5 flex items-center justify-between gap-4 bg-white p-3 rounded-xl border border-neutral-200 shadow-sm">
        <div className="flex-1 max-w-md">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search employee by name..."
            className="block w-full rounded-lg border border-neutral-300 bg-neutral-50 px-4 py-2 text-sm text-neutral-800 placeholder-neutral-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
          />
        </div>
        <div className="text-xs text-neutral-400 font-medium">
          Showing {displayData.length} records
        </div>
      </div>

      {/* Active Filters Display */}
      {(selectedShift !== "All" || statusFilter !== "All" || searchQuery !== "") && (
        <div className="mb-4 flex items-center gap-2 bg-neutral-50 p-2 rounded-lg border border-neutral-200 w-fit">
          <span className="text-xs text-neutral-600 font-semibold">
            Active Filters:
            {selectedShift !== "All" && ` [Shift: ${selectedShift}]`}
            {statusFilter !== "All" && ` [Status: ${statusFilter}]`}
            {searchQuery !== "" && ` [Search: "${searchQuery}"]`}
          </span>
          <Button onClick={clearFilters} variant="outline" size="sm" className="h-6 py-0 text-[10px]">
            Clear Filters
          </Button>
        </div>
      )}

      {/* Title */}
      <div className="mb-5 flex items-center gap-3">
        <h2 className="text-lg font-extrabold text-neutral-800 tracking-tight">
          {attendanceView === "today" && "Today's Attendance"}
          {attendanceView === "weekly" && "Weekly Attendance"}
          {attendanceView === "monthly" && "Monthly Attendance"}
        </h2>
        <div className="h-px bg-neutral-200 flex-1"></div>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="text-center p-8">Loading Attendance...</div>
      ) : attendanceView === "today" ? (
        <div className="overflow-x-auto overflow-y-auto max-h-[600px] border border-neutral-300 rounded-2xl bg-white shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-20 bg-white shadow-xs">
              {/* Group Headers */}
              <tr className="border-b border-neutral-300 text-neutral-500 text-[10px] font-extrabold uppercase tracking-widest bg-neutral-50/40">
                <th rowSpan={2} className="p-3 pl-6 border-r border-neutral-300 text-left">Employee</th>
                <th rowSpan={2} className="p-3 border-r border-neutral-300 text-left">Department</th>

                <th colSpan={3} className="p-2.5 text-center border-r border-b-2 border-cyan-500 bg-cyan-50/20 text-cyan-700 text-[11px] font-black">
                  Web Site Entry
                </th>

                <th colSpan={3} className="p-2.5 text-center border-r border-b-2 border-violet-500 bg-violet-50/25 text-violet-700 text-[11px] font-black">
                  Biometric Card Entry
                </th>

                <th rowSpan={2} className="p-3 border-r border-neutral-300 text-center text-neutral-600 font-extrabold">
                  Breaks <div className="text-[9px] text-neutral-400 font-bold normal-case">(L/T)</div>
                </th>

                <th rowSpan={2} className="p-3 border-r border-neutral-300 text-center">Status</th>
                <th rowSpan={2} className="p-3 border-r border-neutral-300 text-left">Shift</th>
                <th rowSpan={2} className="p-3 text-center pr-6">Overtime</th>
              </tr>
              {/* Sub Headers */}
              <tr className="border-b border-neutral-300 text-neutral-500 text-[10px] font-extrabold uppercase tracking-wider bg-white">
                {/* Web Site Entry columns */}
                <th className="p-2 text-center text-cyan-600">Check-In</th>
                <th className="p-2 text-center text-cyan-600">Check-Out</th>
                <th className="p-2 text-center text-cyan-600 border-r border-neutral-300">Hours</th>
                {/* Biometric Card Entry columns */}
                <th className="p-2 text-center text-violet-600">Check-In</th>
                <th className="p-2 text-center text-violet-600">Check-Out</th>
                <th className="p-2 text-center text-violet-600 border-r border-neutral-300">Hours</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-300 text-xs font-semibold text-neutral-700 bg-white">
              {displayData.length === 0 ? (
                <tr>
                  <td colSpan={12} className="p-10 text-center text-neutral-400 font-semibold bg-neutral-50/20">
                    No Attendance Records Found
                  </td>
                </tr>
              ) : (
                displayData.map((row: any, i: number) => {
                  const formatHoursMinutes = (hoursDecimal: number): string => {
                    if (!hoursDecimal || hoursDecimal <= 0) return "—";
                    const hrs = Math.floor(hoursDecimal);
                    const mins = Math.round((hoursDecimal - hrs) * 60);
                    if (mins === 0) return `${hrs}h`;
                    if (hrs === 0) return `${mins}m`;
                    return `${hrs}h`;
                  };

                  const workingHours = Number(row.total_hours || 0);
                  const workingHoursFormatted = formatHoursMinutes(workingHours);

                  let overtime = "00:00";
                  if (workingHours > 8) {
                    const otVal = workingHours - 8;
                    const otHrs = Math.floor(otVal);
                    overtime = otHrs > 0 ? `${otHrs}h` : "—";
                  }

                  return (
                    <tr key={i} className="hover:bg-primary-500/5 transition-colors border-b border-neutral-300">
                      <td className="p-3 pl-6 font-bold text-neutral-900 border-r border-neutral-300">{row.employee_name}</td>
                      <td className="p-3 text-neutral-500 border-r border-neutral-300 font-bold">{row.department || row.team || "-"}</td>

                      {/* Web Site Entry */}
                      <td className="p-3 text-center text-neutral-800 font-bold">{row.check_in || "-"}</td>
                      <td className="p-3 text-center text-neutral-800 font-bold">{row.check_out || "-"}</td>
                      <td className="p-3 text-center text-cyan-600 font-black border-r border-neutral-300">
                        {row.status === "Present" || row.status === "Half Day" ? workingHoursFormatted : "—"}
                      </td>

                      {/* Biometric Card Entry */}
                      <td className="p-3 text-center text-neutral-800 font-bold">{row.card_check_in || "-"}</td>
                      <td className="p-3 text-center text-neutral-800 font-bold">{row.card_check_out || "-"}</td>
                      <td className="p-3 text-center text-violet-600 font-black border-r border-neutral-300">
                        {row.status === "Present" || row.status === "Half Day" ? formatHoursMinutes(row.card_working_hours || 0) : "—"}
                      </td>

                      {/* Breaks */}
                      <td className="p-3 text-center font-bold text-neutral-600 border-r border-neutral-300">
                        {(row.lunch_minutes || row.tea_minutes) ? `${row.lunch_minutes || 0}m / ${row.tea_minutes || 0}m` : "—"}
                      </td>

                      {/* Status */}
                      <td className="p-3 text-center border-r border-neutral-300">
                        <Chip type={row.status} />
                      </td>

                      {/* Shift */}
                      <td className="p-3 text-neutral-750 font-extrabold border-r border-neutral-300 truncate max-w-[170px]">
                        {row.shift_timing || row.shift || "General Shift"}
                      </td>

                      {/* Overtime */}
                      <td className="p-3 text-center pr-6 font-bold text-emerald-700">{overtime}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <Table
          columns={
            attendanceView === "weekly"
              ? weeklyColumns
              : monthlyColumns
          }
          data={displayData}
          rowKey={(_at, i) => i}
          emptyState={
            <div className="text-center p-8 text-neutral-500">
              No Attendance Records Found
            </div>
          }
        />
      )}
    </Panel>
  );
};

export default AttendanceTab;
