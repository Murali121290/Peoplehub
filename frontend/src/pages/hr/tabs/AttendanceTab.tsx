import React, {
  useState,
  useEffect,
} from "react";

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

  const [attendanceView, setAttendanceView] =
    useState("today");

    const [dateRange, setDateRange] =
useState("");

  const [attendanceData, setAttendanceData] =
    useState<any[]>(attendance);

  const [loading, setLoading] =
    useState(false);

    const [selectedShift, setSelectedShift] =
  useState("All");


const morningCount = attendanceData.filter(
  emp =>
    (emp.shift || emp.shift_timing || "General Shift")
    === "Morning Shift"
).length;

const generalCount = attendanceData.filter(
  emp =>
    (emp.shift || emp.shift_timing || "General Shift")
    === "General Shift"
).length;

const secondCount = attendanceData.filter(
  emp =>
    (emp.shift || emp.shift_timing || "General Shift")
    === "Second Shift"
).length;

const nightCount = attendanceData.filter(
  emp =>
    (emp.shift || emp.shift_timing || "General Shift")
    === "Night Shift"
).length;

const filteredAttendance =
  selectedShift === "All"
    ? attendanceData
    : attendanceData.filter(
        emp =>
          (emp.shift || emp.shift_timing || "General Shift")
            .trim()
            .toLowerCase() ===
          selectedShift
            .trim()
            .toLowerCase()
      );

  useEffect(() => {

    const loadAttendance = async () => {

      try {

        setLoading(true);

        let url =
          `${BASE_URL}/attendance`;

        if (
          attendanceView === "weekly"
        ) {
          url =
            `${BASE_URL}/attendance/weekly`;
        }

        if (
          attendanceView === "monthly"
        ) {
          url =
            `${BASE_URL}/attendance/monthly`;
        }

        const response =
          await fetch(url);

        const data =
          await response.json();

        setAttendanceData(
          data || []
        );

        console.log("Attendance Data", data);

      } catch (error) {

        console.error(
          "Attendance Error:",
          error
        );

      } finally {

        setLoading(false);

      }
    };

    loadAttendance();

    updateDateRange(attendanceView);

  }, [
    attendanceView,
    BASE_URL,
  ]);

  const updateDateRange = (
  type: string
) => {

  const today = new Date();

  if (type === "today") {

    setDateRange(
      today.toLocaleDateString()
    );

  }

  else if (type === "weekly") {

    const start = new Date();

    start.setDate(
      today.getDate() - 6
    );

    setDateRange(
      `${start.toLocaleDateString()} - ${today.toLocaleDateString()}`
    );

  }

  else if (type === "monthly") {

    const start = new Date(
      today.getFullYear(),
      today.getMonth(),
      1
    );

    const end = new Date(
      today.getFullYear(),
      today.getMonth() + 1,
      0
    );

    setDateRange(
      `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`
    );

  }

};

const downloadAttendance = async () => {

  try {
    console.log("BASE_URL =", BASE_URL);
console.log(
  `${BASE_URL}/attendance/export-monthly`
);

    const response = await fetch(

      `${BASE_URL}/attendance/export-monthly`
    );

    const blob =
      await response.blob();

    const url =
      window.URL.createObjectURL(blob);

    const a =
      document.createElement("a");

    a.href = url;

    a.download =
      "Attendance_Report.xlsx";

    document.body.appendChild(a);

    a.click();

    a.remove();

  } catch (error) {

    console.error(error);

  }

};

  const attendanceColumns = [
    {
      key: "employee_name",
      header: "Employee",
      render: (at: any) => at.employee_name,
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
      render: (at: any) => at.date || "-",
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
      key: "total_hours",
      header: "Working Hours",
      render: (at: any) => at.total_hours || "-",
    },
    {
      key: "shift",
      header: "Shift",
      render: (at: any) =>
        at.shift || at.shift_timing || "General Shift",
    },
    {
      key: "status",
      header: "Status",
      render: (at: any) => <Chip type={at.status} />,
    },
  ];

  return (
    <Panel>

      {/* Header */}

     <div className="flex justify-between items-center mb-5">
  <div>
    <div className="text-lg font-bold text-neutral-800">
      Attendance Management
    </div>

    <div className="text-xs text-neutral-500 mt-1 font-medium">
      {new Date().toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
        weekday: "long"
      })}
    </div>

    <div className="text-[11px] text-neutral-400 mt-1.5 font-medium">
      {dateRange}
    </div>
  </div>
  <Button
  onClick={downloadAttendance}
  variant="success"
  className="ml-[600px]"
>
  Download Excel
</Button>

  {/* Tabs */}
  <div className="flex gap-2">
    {["today", "weekly", "monthly"].map((tab) => (
      <button
        key={tab}
        onClick={() => setAttendanceView(tab)}
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

{/* Shift Cards */}
<div className="grid grid-cols-4 gap-3 mb-4">
  <div
    onClick={() => setSelectedShift("Morning Shift")}
    className={
      "cursor-pointer rounded-[10px] p-4 text-center transition-all " +
      (selectedShift === "Morning Shift"
        ? "bg-warning-100 border-2 border-warning-500"
        : "bg-neutral-50 border border-neutral-200")
    }
  >
    <div className="text-[11px] text-warning-700 font-semibold mb-1.5 uppercase">
      Morning
    </div>
    <div className="text-[22px] font-bold text-neutral-800">
      {morningCount}
    </div>
  </div>

  <div
    onClick={() => setSelectedShift("General Shift")}
    className={
      "cursor-pointer rounded-[10px] p-4 text-center transition-all " +
      (selectedShift === "General Shift"
        ? "bg-info-100 border-2 border-info-500"
        : "bg-neutral-50 border border-neutral-200")
    }
  >
    <div className="text-[11px] text-info-700 font-semibold mb-1.5 uppercase">
      General
    </div>
    <div className="text-[22px] font-bold text-neutral-800">
      {generalCount}
    </div>
  </div>

  <div
    onClick={() => setSelectedShift("Second Shift")}
    className={
      "cursor-pointer rounded-[10px] p-4 text-center transition-all " +
      (selectedShift === "Second Shift"
        ? "bg-pink-100 border-2 border-pink-500"
        : "bg-neutral-50 border border-neutral-200")
    }
  >
    <div className="text-[11px] text-pink-800 font-semibold mb-1.5 uppercase">
      Second
    </div>
    <div className="text-[22px] font-bold text-neutral-800">
      {secondCount}
    </div>
  </div>

  <div
    onClick={() => setSelectedShift("Night Shift")}
    className={
      "cursor-pointer rounded-[10px] p-4 text-center transition-all " +
      (selectedShift === "Night Shift"
        ? "bg-purple-100 border-2 border-purple-500"
        : "bg-neutral-50 border border-neutral-200")
    }
  >
    <div className="text-[11px] text-purple-800 font-semibold mb-1.5 uppercase">
      Night
    </div>
    <div className="text-[22px] font-bold text-neutral-800">
      {nightCount}
    </div>
  </div>
</div>

<div className="mb-4">
  <Button
    onClick={() => setSelectedShift("All")}
    variant="outline"
    size="sm"
  >
    Show All
  </Button>
</div>


      {/* Title */}

      <div className="mb-4 font-bold text-[15px]">
        {attendanceView ===
          "today" &&
          "Today's Attendance"}

        {attendanceView ===
          "weekly" &&
          "Weekly Attendance"}

        {attendanceView ===
          "monthly" &&
          "Monthly Attendance"}
      </div>



      {/* Loading */}

      {loading ? (

        <div className="text-center p-8">
          Loading Attendance...
        </div>

      ) : (

        <Table
          columns={attendanceColumns}
          data={filteredAttendance}
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
