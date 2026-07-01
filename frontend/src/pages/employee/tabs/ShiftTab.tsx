import React, { useState } from "react";

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
      {showShiftForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white w-[500px] rounded-xl p-6">
            <h2 className="text-xl font-bold mb-4">Apply Shift Request</h2>
            <select
              value={requestType}
              onChange={(e) => setRequestType(e.target.value)}
              className="w-full border p-3 rounded mb-4"
            >
              <option value="Shift">Shift Change</option>

              <option value="WFH">Work From Home</option>
            </select>
            <select
              value={shiftForm.requestedShift}
              onChange={(e) =>
                setShiftForm({ ...shiftForm, requestedShift: e.target.value })
              }
              className="w-full border p-3 rounded mb-4"
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
              <label>From Date</label>

              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full border p-2 rounded mb-4"
              />

              <label>To Date</label>

              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full border p-2 rounded"
              />
            </div>
            <textarea
              placeholder="Reason"
              value={shiftForm.reason}
              onChange={(e) =>
                setShiftForm({ ...shiftForm, reason: e.target.value })
              }
              className="w-full border p-3 rounded mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowShiftForm(false)}
                className="px-4 py-2 border rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="px-4 py-2 bg-blue-600 text-white rounded"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Shift Request</h2>
          <p className="text-gray-500">Manage your shift change requests</p>
        </div>
        <button
          onClick={() => setShowShiftForm(true)}
          className="bg-gray-600 hover:bg-gray-700 text-white px-5 py-3 rounded-lg"
        >
          + Apply Shift
        </button>
      </div>

      <div className="flex gap-3">
        {["my", "approval"].map((tab) => (
          <button
            key={tab}
            onClick={() => setShiftTab(tab)}
            className={`px-6 py-3 rounded-lg ${shiftTab === tab ? "border-2 border-black bg-white" : "bg-gray-100"}`}
          >
            {tab === "my" ? "My Requests" : "Approval Requests"}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="text-lg font-semibold">Current Shift</h3>
        <p className="text-gray-500 mt-2">
          {currentEmployee?.shift_timing || "General Shift"}
        </p>
      </div>

      {shiftTab === "my" && (
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="font-semibold mb-4">My Shift Requests</h3>
          <table className="w-full">
            <thead>
              <tr className="border-b">
                {[
                  "Type",
                  "Current Shift",
                  "From Date",
                  "To Date",
                  "Requested Shift",
                  "Reason",
                  "Status",
                ].map((h) => (
                  <th key={h} className="text-left p-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.isArray(shiftRequests) &&
                shiftRequests.map((item: any) => (
                  <tr key={item.id} className="border-b">
                    <td className="p-3">{item.request_type}</td>

                    <td className="p-3">{item.current_shift}</td>

                    <td className="p-3">{item.from_date}</td>

                    <td className="p-3">{item.to_date}</td>

                    <td className="p-3">{item.requested_shift}</td>

                    <td className="p-3">{item.reason}</td>

                    <td className="p-3">
                      <span
                        className={`px-3 py-1 rounded-full text-sm ${
                          item.status === "Approved"
                            ? "bg-green-100 text-green-700"
                            : item.status === "Rejected"
                              ? "bg-red-100 text-red-700"
                              : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {shiftTab === "approval" && (
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="font-semibold mb-4">Shift Approval Requests</h3>
          <table className="w-full">
            <thead>
              <tr className="border-b">
                {[
"Employee",
"Current Shift",
"Requested Shift",
"From Date",
"To Date",
"Reason",
"Action",
].map((h) => (
                  <th key={h} className="text-left p-3">
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
                    <tr key={item.id} className="border-b">
<td className="p-3">
  {item.employee_name}
</td>

<td className="p-3">
  {item.current_shift}
</td>

<td className="p-3">
  {item.requested_shift}
</td>

<td className="p-3">
  {item.from_date}
</td>

<td className="p-3">
  {item.to_date}
</td>

<td className="p-3">
  {item.reason}
</td>

<td className="p-3 flex gap-2">
  <button
    onClick={() => onApprove(item.id)}
    className="bg-green-600 text-white px-3 py-1 rounded"
  >
    Approve
  </button>

  <button
    onClick={() => onReject(item.id)}
    className="bg-red-600 text-white px-3 py-1 rounded"
  >
    Reject
  </button>
</td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ShiftTab;