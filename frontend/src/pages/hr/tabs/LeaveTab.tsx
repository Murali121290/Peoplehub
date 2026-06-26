import React from "react";
import Panel from "../components/Panel";
import Avatar from "../components/Avatar";
import Chip from "../components/Chip";
import { theme } from "../data/hrMockData";

const BASE_URL = "http://localhost:5000/api";

const thS: React.CSSProperties = {
  padding: "14px",
  textAlign: "left",
  fontSize: 12,
  fontWeight: 700,
  color: "#64748B",
  textTransform: "uppercase",
};

const tdS: React.CSSProperties = {
  padding: "14px",
  fontSize: 13,
};

interface LeaveTabProps {
  leaves: any[];
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
}

const LeaveTab: React.FC<LeaveTabProps> = ({ leaves, onApprove, onReject }) => {
  const downloadLeaveReport = () => {
    window.location.assign(`${BASE_URL}/leaves/export-leave-report`);
  };

  return (
    <Panel>
      <div className="flex">
        <div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 800,
              marginBottom: 4,
            }}
          >
            Leave Management
          </div>

          <div
            style={{
              fontSize: 12,
              color: theme.textMuted,
              marginBottom: 20,
            }}
          >
            Approve or reject leave requests as HR Admin
          </div>
        </div>
        <button
          onClick={downloadLeaveReport}
          className="bg-green-600 text-white px-2 py-1 rounded ml-[800px] mb-[10px]"
        >
          Download Leave Report
        </button>
      </div>

      <div
        style={{
          overflowX: "auto",
          border: `1px solid ${theme.border}`,
          borderRadius: 12,
          background: "#fff",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            minWidth: "1200px",
          }}
        >
          <thead>
            <tr
              style={{
                background: theme.surface2,
                borderBottom: `2px solid ${theme.border}`,
              }}
            >
              <th style={thS}>Employee</th>
              <th style={thS}>Employee ID</th>
              <th style={thS}>Leave Type</th>
              <th style={thS}>From Date</th>
              <th style={thS}>To Date</th>
              <th style={thS}>Days</th>
              <th style={thS}>Reason</th>
              <th style={thS}>Reporting Manager</th>
              <th style={thS}>Status</th>
              <th style={thS}>Action</th>
            </tr>
          </thead>

          <tbody>
            {leaves.map((l: any, index: number) => (
              <tr
                key={l.id}
                style={{
                  borderBottom: `1px solid ${theme.border}`,
                  background: index % 2 === 0 ? "#FFFFFF" : "#F8FAFC",
                }}
              >
                <td style={tdS}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <Avatar initials={l.av || "NA"} size={36} />

                    <span style={{ fontWeight: 600 }}>{l.empName}</span>
                  </div>
                </td>

                <td style={tdS}>{l.empId}</td>

                <td style={tdS}>{l.type}</td>

                <td style={tdS}>{l.from}</td>

                <td style={tdS}>{l.to}</td>

                <td style={tdS}>{l.days}</td>

                <td style={tdS}>{l.reason}</td>

                <td style={tdS}>{l.reporting_manager}</td>

                <td style={tdS}>
                  <Chip type={l.status} />
                </td>

                <td style={tdS}>
                  {l.status === "pending" ? (
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => onApprove(l.id)}
                        style={{
                          background: "#10B981",
                          color: "#fff",
                          border: "none",
                          padding: "8px 12px",
                          borderRadius: 8,
                          cursor: "pointer",
                        }}
                      >
                        Approve
                      </button>

                      <button
                        onClick={() => onReject(l.id)}
                        style={{
                          background: "#EF4444",
                          color: "#fff",
                          border: "none",
                          padding: "8px 12px",
                          borderRadius: 8,
                          cursor: "pointer",
                        }}
                      >
                        Reject
                      </button>
                    </div>
                  ) : (
                    l.status
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {leaves.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: 40,
            color: theme.textMuted,
          }}
        >
          <div
            style={{
              fontSize: 48,
              marginBottom: 12,
            }}
          >
            ✓
          </div>

          <div
            style={{
              fontSize: 16,
              fontWeight: 700,
            }}
          >
            All caught up!
          </div>

          <div
            style={{
              fontSize: 13,
            }}
          >
            No leave requests found
          </div>
        </div>
      )}
    </Panel>
  );
};

export default LeaveTab;
