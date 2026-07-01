import React from "react";
import Panel from "../components/Panel";
import Avatar from "../components/Avatar";
import Chip from "../components/Chip";
import { Button } from "../../../components/ui/Button";

const BASE_URL = "http://localhost:5000/api";

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
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="text-[15px] font-extrabold text-neutral-800 mb-1">
            Leave Management
          </div>

          <div className="text-xs text-neutral-500">
            Approve or reject leave requests as HR Admin
          </div>
        </div>
        <Button variant="success" size="sm" onClick={downloadLeaveReport}>
          Download Leave Report
        </Button>
      </div>

      <div className="overflow-x-auto border border-neutral-200 rounded-xl bg-white">
        <table className="w-full border-collapse" style={{ minWidth: "1200px" }}>
          <thead>
            <tr className="bg-neutral-50 border-b-2 border-neutral-200">
              {["Employee", "Employee ID", "Leave Type", "From Date", "To Date", "Days", "Reason", "Reporting Manager", "Status", "Action"].map((h) => (
                <th key={h} className="p-3.5 text-left text-xs font-bold text-neutral-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>

          <tbody>
            {leaves.map((l: any, index: number) => (
              <tr
                key={l.id}
                className={`border-b border-neutral-200 ${index % 2 === 0 ? "bg-white" : "bg-neutral-50"}`}
              >
                <td className="p-3.5 text-sm">
                  <div className="flex items-center gap-2.5">
                    <Avatar initials={l.av || "NA"} size={36} />

                    <span className="font-semibold">{l.empName}</span>
                  </div>
                </td>

                <td className="p-3.5 text-sm">{l.empId}</td>

                <td className="p-3.5 text-sm">{l.type}</td>

                <td className="p-3.5 text-sm">{l.from}</td>

                <td className="p-3.5 text-sm">{l.to}</td>

                <td className="p-3.5 text-sm">{l.days}</td>

                <td className="p-3.5 text-sm">{l.reason}</td>

                <td className="p-3.5 text-sm">{l.reporting_manager}</td>

                <td className="p-3.5 text-sm">
                  <Chip type={l.status} />
                </td>

                <td className="p-3.5 text-sm">
                  {l.status === "pending" ? (
                    <div className="flex gap-2">
                      <Button size="sm" variant="success" onClick={() => onApprove(l.id)}>
                        Approve
                      </Button>

                      <Button size="sm" variant="danger" onClick={() => onReject(l.id)}>
                        Reject
                      </Button>
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
        <div className="text-center py-10 text-neutral-500">
          <div className="text-5xl mb-3">
            ✓
          </div>

          <div className="text-base font-bold">
            All caught up!
          </div>

          <div className="text-sm">
            No leave requests found
          </div>
        </div>
      )}
    </Panel>
  );
};

export default LeaveTab;
