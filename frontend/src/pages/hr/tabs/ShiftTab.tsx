import React from "react";
import Panel from "../components/Panel";
import Avatar from "../components/Avatar";
import Chip from "../components/Chip";
import { Button } from "../../../components/ui/Button";

interface ShiftRequest {
  id: number;
  employee_id: string;
  employee_name: string;
  current_shift: string;
  requested_shift: string;
  from_date: string;
  to_date: string;
  reason: string;
  reporting_manager: string;
  status: string;
}

interface ShiftTabProps {
  shifts: ShiftRequest[];
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
}

export const ShiftTab: React.FC<ShiftTabProps> = ({ shifts, onApprove, onReject }) => {
  return (
    <Panel>
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="text-sm font-bold text-neutral-850 mb-0.5">
            Shift Request Management
          </div>
          <div className="text-[11px] font-normal text-neutral-450">
            Review, approve, or reject employee shift timing transition requests
          </div>
        </div>
      </div>

      <div className="overflow-x-auto border border-neutral-150 rounded-xl bg-white shadow-sm">
        <table className="w-full border-collapse" style={{ minWidth: "1200px" }}>
          <thead>
            <tr className="bg-neutral-50 border-b border-neutral-200">
              {[
                "Employee",
                "Employee ID",
                "Current Shift",
                "Requested Shift",
                "From Date",
                "To Date",
                "Reason",
                "Reporting Manager",
                "Status",
                "Action",
              ].map((h) => (
                <th
                  key={h}
                  className="p-3 text-left text-[10px] font-semibold text-neutral-500 uppercase tracking-wider"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {shifts.map((s: ShiftRequest, index: number) => {
              const initials = s.employee_name
                ? s.employee_name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()
                : "EE";

              return (
                <tr
                  key={s.id}
                  className={`border-b border-neutral-150 transition-colors ${
                    index % 2 === 0 ? "bg-white" : "bg-neutral-50/30"
                  } hover:bg-neutral-50/70`}
                >
                  <td className="p-3 text-xs font-normal text-neutral-700">
                    <div className="flex items-center gap-2">
                      <Avatar initials={initials} size={28} />
                      <span className="font-medium text-neutral-800">{s.employee_name}</span>
                    </div>
                  </td>

                  <td className="p-3 text-xs font-normal text-neutral-500">{s.employee_id}</td>

                  <td className="p-3 text-xs font-normal text-neutral-600">
                    <span className="px-2 py-0.5 bg-neutral-100 text-neutral-700 rounded-md text-[11px]">
                      {s.current_shift}
                    </span>
                  </td>

                  <td className="p-3 text-xs font-normal text-neutral-600">
                    <span className="px-2 py-0.5 bg-primary-50 text-primary-700 rounded-md text-[11px] font-medium border border-primary-100">
                      {s.requested_shift}
                    </span>
                  </td>

                  <td className="p-3 text-xs font-normal text-neutral-500">{s.from_date || "—"}</td>

                  <td className="p-3 text-xs font-normal text-neutral-500">{s.to_date || "—"}</td>

                  <td className="p-3 text-xs font-normal text-neutral-500 max-w-[200px] truncate" title={s.reason}>
                    {s.reason}
                  </td>

                  <td className="p-3 text-xs font-normal text-neutral-500">{s.reporting_manager}</td>

                  <td className="p-3 text-xs font-normal">
                    <Chip type={s.status?.toLowerCase()} />
                  </td>

                  <td className="p-3 text-xs font-normal">
                    {s.status?.toLowerCase() === "pending" ? (
                      <div className="flex gap-1.5">
                        <Button
                          size="sm"
                          variant="success"
                          className="text-[10px] font-medium px-2 py-1 rounded-md"
                          onClick={() => onApprove(s.id)}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          className="text-[10px] font-medium px-2 py-1 rounded-md"
                          onClick={() => onReject(s.id)}
                        >
                          Reject
                        </Button>
                      </div>
                    ) : (
                      <span className="text-[11px] capitalize text-neutral-400 font-medium">
                        {s.status}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {shifts.length === 0 && (
        <div className="text-center py-8 text-neutral-450">
          <div className="text-4xl mb-2 text-neutral-300">✓</div>
          <div className="text-xs font-bold text-neutral-750">All caught up!</div>
          <div className="text-[11px]">No shift requests found</div>
        </div>
      )}
    </Panel>
  );
};

export default ShiftTab;
