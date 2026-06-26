import React, {
  useState,
  useEffect,
} from "react";

import Panel from "../components/Panel";
import Chip from "../components/Chip";
import { theme } from "../data/hrMockData";

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

  return (
    <Panel>

      {/* Header */}

     <div
  style={{
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20
  }}
>
  <div>
    <div
      style={{
        fontSize: 18,
        fontWeight: 700,
        color: "#1f2937"
      }}
    >
      Attendance Management
    </div>

    <div
      style={{
        fontSize: 12,
        color: "#6b7280",
        marginTop: 4,
        fontWeight: 500
      }}
    >
      {new Date().toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
        weekday: "long"
      })}
    </div>

    <div
      style={{
        fontSize: 11,
        color: "#9ca3af",
        marginTop: 5,
        fontWeight: 500
      }}
    >
      {dateRange}
    </div>
  </div>
  <button
  onClick={downloadAttendance}
  className="bg-green-600 text-white px-4 py-2 rounded ml-[600px]"
>
  Download Excel
</button>

  {/* Tabs */}
  <div
    style={{
      display: "flex",
      gap: 8
    }}
  >
    {["today", "weekly", "monthly"].map((tab) => (
      <button
        key={tab}
        onClick={() => setAttendanceView(tab)}
        style={{
          padding: "6px 14px",
          borderRadius: 6,
          border:
            attendanceView === tab
              ? "2px solid #2563eb"
              : "1px solid #e5e7eb",
          background:
            attendanceView === tab
              ? "#eff6ff"
              : "#fff",
          cursor: "pointer",
          fontWeight: 600,
          fontSize: 12,
          color: attendanceView === tab ? "#2563eb" : "#6b7280",
          transition: "all 0.2s"
        }}
      >
        {tab.charAt(0).toUpperCase() + tab.slice(1)}
      </button>
    ))}
  </div>
</div>

{/* Shift Cards */}
<div
  style={{
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 12,
    marginBottom: 16
  }}
>
  <div
    onClick={() => setSelectedShift("Morning Shift")}
    style={{
      cursor: "pointer",
      background:
        selectedShift === "Morning Shift"
          ? "#fef3c7"
          : "#f9fafb",
      border:
        selectedShift === "Morning Shift"
          ? "2px solid #f59e0b"
          : "1px solid #e5e7eb",
      borderRadius: 10,
      padding: 16,
      textAlign: "center",
      transition: "all 0.2s"
    }}
  >
    <div
      style={{
        fontSize: 11,
        color: "#92400e",
        fontWeight: 600,
        marginBottom: 6,
        textTransform: "uppercase"
      }}
    >
      Morning
    </div>
    <div
      style={{
        fontSize: 22,
        fontWeight: 700,
        color: "#1f2937"
      }}
    >
      {morningCount}
    </div>
  </div>

  <div
    onClick={() => setSelectedShift("General Shift")}
    style={{
      cursor: "pointer",
      background:
        selectedShift === "General Shift"
          ? "#dbeafe"
          : "#f9fafb",
      border:
        selectedShift === "General Shift"
          ? "2px solid #3b82f6"
          : "1px solid #e5e7eb",
      borderRadius: 10,
      padding: 16,
      textAlign: "center",
      transition: "all 0.2s"
    }}
  >
    <div
      style={{
        fontSize: 11,
        color: "#1e40af",
        fontWeight: 600,
        marginBottom: 6,
        textTransform: "uppercase"
      }}
    >
      General
    </div>
    <div
      style={{
        fontSize: 22,
        fontWeight: 700,
        color: "#1f2937"
      }}
    >
      {generalCount}
    </div>
  </div>

  <div
    onClick={() => setSelectedShift("Second Shift")}
    style={{
      cursor: "pointer",
      background:
        selectedShift === "Second Shift"
          ? "#fce7f3"
          : "#f9fafb",
      border:
        selectedShift === "Second Shift"
          ? "2px solid #ec4899"
          : "1px solid #e5e7eb",
      borderRadius: 10,
      padding: 16,
      textAlign: "center",
      transition: "all 0.2s"
    }}
  >
    <div
      style={{
        fontSize: 11,
        color: "#9d174d",
        fontWeight: 600,
        marginBottom: 6,
        textTransform: "uppercase"
      }}
    >
      Second
    </div>
    <div
      style={{
        fontSize: 22,
        fontWeight: 700,
        color: "#1f2937"
      }}
    >
      {secondCount}
    </div>
  </div>

  <div
    onClick={() => setSelectedShift("Night Shift")}
    style={{
      cursor: "pointer",
      background:
        selectedShift === "Night Shift"
          ? "#e9d5ff"
          : "#f9fafb",
      border:
        selectedShift === "Night Shift"
          ? "2px solid #8b5cf6"
          : "1px solid #e5e7eb",
      borderRadius: 10,
      padding: 16,
      textAlign: "center",
      transition: "all 0.2s"
    }}
  >
    <div
      style={{
        fontSize: 11,
        color: "#5b21b6",
        fontWeight: 600,
        marginBottom: 6,
        textTransform: "uppercase"
      }}
    >
      Night
    </div>
    <div
      style={{
        fontSize: 22,
        fontWeight: 700,
        color: "#1f2937"
      }}
    >
      {nightCount}
    </div>
  </div>
</div>

<div
  style={{
    marginBottom: 16
  }}
>
  <button
    onClick={() => setSelectedShift("All")}
    style={{
      padding: "6px 14px",
      borderRadius: 6,
      border: "1px solid #e5e7eb",
      background: "#fff",
      cursor: "pointer",
      fontWeight: 600,
      fontSize: 12,
      color: "#6b7280"
    }}
  >
    Show All
  </button>
</div>


      {/* Title */}

      <div
        style={{
          marginBottom: 15,
          fontWeight: 700,
          fontSize: 15,
        }}
      >
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

        <div
          style={{
            textAlign: "center",
            padding: 30,
          }}
        >
          Loading Attendance...
        </div>

      ) : (

        <div
          style={{
            overflowX: "auto",
          }}
        >
          <table
            style={{
              width: "100%",
              textAlign:
                "left",
              fontSize: 13,
              borderCollapse:
                "collapse",
            }}
          >

            <thead>
              <tr
                style={{
                  borderBottom:
                    `2px solid ${theme.border}`,
                  color:
                    theme.textMuted,
                }}
              >
                {[
                  "Employee",
                  "Team",
                  "Date",
                  "Check In",
                  "Check Out",
                  "Working Hours",
                  "Shift",
                  "Status",
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding:
                        "14px 12px",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>

              {filteredAttendance.length >
              0 ? (

                filteredAttendance.map(
                  (
                    at,
                    i
                  ) => (
                    <tr
                      key={i}
                      style={{
                        borderBottom:
                          "1px solid #f1f5f9",
                      }}
                    >
                      <td
                        style={{
                          padding:
                            "14px 12px",
                        }}
                      >
                        {
                          at.employee_name
                        }
                      </td>

                      <td
                        style={{
                          padding:
                            "14px 12px",
                        }}
                      >
                        {at.team ||
                          at.department ||
                          at.designation ||
                          "-"}
                      </td>

                      <td
  style={{
    padding: "14px 12px",
  }}
>
  {at.date || "-"}
</td>

                      <td
                        style={{
                          padding:
                            "14px 12px",
                        }}
                      >
                        {at.check_in ||
                          "-"}
                      </td>

                      <td
                        style={{
                          padding:
                            "14px 12px",
                        }}
                      >
                        {at.check_out ||
                          "-"}
                      </td>

                      <td
                        style={{
                          padding:
                            "14px 12px",
                        }}
                      >
                        {at.total_hours ||
                          "-"}
                      </td>

     <td style={{ padding: "14px 12px" }}>
  {at.shift || at.shift_timing || "General Shift"}
</td>

                      <td
                        style={{
                          padding:
                            "14px 12px",
                        }}
                      >
                        <Chip
                          type={
                            at.status
                          }
                        />
                      </td>
                    </tr>
                  )
                )

              ) : (

                <tr>
                  <td
                    colSpan={6}
                    style={{
                      textAlign:
                        "center",
                      padding: 30,
                    }}
                  >
                    No Attendance
                    Records Found
                  </td>
                </tr>

              )}

            </tbody>

          </table>
        </div>

      )}

    </Panel>
  );
};

export default AttendanceTab;