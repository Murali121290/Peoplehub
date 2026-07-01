import React, { useState } from "react";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import { Modal } from "../../../components/ui/Modal";

interface ShiftTabProps {
  currentEmployee: any;
  shiftRequests: any[];
  managerShiftRequests: any[];
  onSubmitShift: (form: any) => void;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
}

const ShiftTab: React.FC<ShiftTabProps> = ({
  currentEmployee,
  shiftRequests,
  managerShiftRequests,
  onSubmitShift,
  onApprove,
  onReject,
}) => {
  const [shiftDate, setShiftDate] = useState("");
  const [requestType, setRequestType] = useState("Shift");

  const [fromDate, setFromDate] = useState("");

  const [toDate, setToDate] = useState("");
  const [shiftTab, setShiftTab] = useState("my");
  const [showShiftForm, setShowShiftForm] = useState(false);
  const [shiftForm, setShiftForm] = useState({
    requestedShift: "",
    reason: "",
  });

  const handleSubmit = () => {
  if (!fromDate || !toDate) {
    alert("Please select dates");
    return;
  }

  onSubmitShift({
    employee_id: currentEmployee.id,
    employee_name:
      `${currentEmployee.first_name} ${currentEmployee.last_name}`,

    current_shift:
      currentEmployee.shift_timing,

    reporting_manager:
      currentEmployee.reporting_manager,

    requested_shift:
      shiftForm.requestedShift,

    request_type:
      requestType,

    from_date:
      fromDate,

    to_date:
      toDate,

    reason:
      shiftForm.reason,
  });

  setFromDate("");
  setToDate("");
  setRequestType("Shift");

  setShiftForm({
    requestedShift: "",
    reason: "",
  });

  setShowShiftForm(false);
};

  return (
    <div className="space-y-6">
      <Modal
        isOpen={showShiftForm}
        onClose={() => setShowShiftForm(false)}
        size="sm"
        title="Apply Shift Request"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowShiftForm(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>Submit</Button>
          </>
        }
      >
        <select
          value={requestType}
          onChange={(e) => setRequestType(e.target.value)}
          className="w-full border border-neutral-200 p-3 rounded-lg mb-4"
        >
          <option value="Shift">Shift Change</option>

          <option value="WFH">Work From Home</option>
        </select>
        <select
          value={shiftForm.requestedShift}
          onChange={(e) =>
            setShiftForm({ ...shiftForm, requestedShift: e.target.value })
          }
          className="w-full border border-neutral-200 p-3 rounded-lg mb-4"
        >
          <option value="First Shift">
            First Shift (06:00 AM - 02:00 PM)
          </option>

          <option value="General Shift">
            General Shift (09:00 AM - 06:00 PM)
          </option>

          <option value="Second Shift">
            Second Shift (02:00 PM - 10:00 PM)
          </option>

          <option value="Night Shift">
            Night Shift (10:00 PM - 06:00 AM)
          </option>
        </select>
        <div style={{ marginBottom: 15 }}>
          <label className="block text-sm font-medium mb-1 text-neutral-700">From Date</label>

          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="w-full border border-neutral-200 p-2 rounded-lg mb-4"
          />

          <label className="block text-sm font-medium mb-1 text-neutral-700">To Date</label>

          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="w-full border border-neutral-200 p-2 rounded-lg"
          />
        </div>
        <textarea
          placeholder="Reason"
          value={shiftForm.reason}
          onChange={(e) =>
            setShiftForm({ ...shiftForm, reason: e.target.value })
          }
          className="w-full border border-neutral-200 p-3 rounded-lg"
        />
      </Modal>

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-neutral-800">Shift Request</h2>
          <p className="text-neutral-500">Manage your shift change requests</p>
        </div>
        <Button onClick={() => setShowShiftForm(true)}>
          + Apply Shift
        </Button>
      </div>

      <div className="flex gap-3">
        {["my", "approval"].map((tab) => (
          <button
            key={tab}
            onClick={() => setShiftTab(tab)}
            className={`px-6 py-3 rounded-lg text-sm font-medium ${shiftTab === tab ? "border-2 border-primary-500 bg-primary-50 text-primary-700" : "bg-neutral-100 text-neutral-600"}`}
          >
            {tab === "my" ? "My Requests" : "Approval Requests"}
          </button>
        ))}
      </div>

      <Card>
        <h3 className="text-lg font-semibold text-neutral-800">Current Shift</h3>
        <p className="text-neutral-500 mt-2">
          {currentEmployee?.shift_timing || "General Shift"}
        </p>
      </Card>

      {shiftTab === "my" && (
        <Card>
          <h3 className="font-semibold text-neutral-800 mb-4">My Shift Requests</h3>
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-200">
                {[
                  "Type",
                  "Current Shift",
                  "From Date",
                  "To Date",
                  "Requested Shift",
                  "Reason",
                  "Status",
                ].map((h) => (
                  <th key={h} className="text-left p-3 text-xs font-semibold uppercase text-neutral-500">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.isArray(shiftRequests) &&
                shiftRequests.map((item: any) => (
                  <tr key={item.id} className="border-b border-neutral-100">
                    <td className="p-3 text-sm text-neutral-700">{item.request_type}</td>

                    <td className="p-3 text-sm text-neutral-700">{item.current_shift}</td>

                    <td className="p-3 text-sm text-neutral-700">{item.from_date}</td>

                    <td className="p-3 text-sm text-neutral-700">{item.to_date}</td>

                    <td className="p-3 text-sm text-neutral-700">{item.requested_shift}</td>

                    <td className="p-3 text-sm text-neutral-700">{item.reason}</td>

                    <td className="p-3">
                      <span
                        className={`px-3 py-1 rounded-full text-sm ${
                          item.status === "Approved"
                            ? "bg-success-100 text-success-700"
                            : item.status === "Rejected"
                              ? "bg-danger-100 text-danger-700"
                              : "bg-warning-100 text-warning-700"
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </Card>
      )}

      {shiftTab === "approval" && (
        <Card>
          <h3 className="font-semibold text-neutral-800 mb-4">Shift Approval Requests</h3>
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-200">
                {[
"Employee",
"Current Shift",
"Requested Shift",
"From Date",
"To Date",
"Reason",
"Action",
].map((h) => (
                  <th key={h} className="text-left p-3 text-xs font-semibold uppercase text-neutral-500">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.isArray(managerShiftRequests) &&
                managerShiftRequests
                  .filter((item: any) => item.status === "Pending")
                  .map((item: any) => (
                    <tr key={item.id} className="border-b border-neutral-100">
<td className="p-3 text-sm text-neutral-700">
  {item.employee_name}
</td>

<td className="p-3 text-sm text-neutral-700">
  {item.current_shift}
</td>

<td className="p-3 text-sm text-neutral-700">
  {item.requested_shift}
</td>

<td className="p-3 text-sm text-neutral-700">
  {item.from_date}
</td>

<td className="p-3 text-sm text-neutral-700">
  {item.to_date}
</td>

<td className="p-3 text-sm text-neutral-700">
  {item.reason}
</td>

<td className="p-3 flex gap-2">
  <Button size="sm" variant="success" onClick={() => onApprove(item.id)}>
    Approve
  </Button>

  <Button size="sm" variant="danger" onClick={() => onReject(item.id)}>
    Reject
  </Button>
</td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
};

export default ShiftTab;
