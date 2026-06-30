import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { getStatusColor } from '../utils/employeeHelpers';
import { leaveReasons } from '../data/employeeMockData';

const permissionReasons = [
  "Personal Emergency",
  "Medical Appointment",
  "Accident",
  "Family Emergency",
  "Official Work",
];

interface LeaveTabProps {
  leaveRequests: any[];
  currentEmployee: any;
  employees: any[];
  approvalLeaves: any[];
  totalBalance: number;
  itemVariants: any;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
  onCancel: (id: number) => void;
  onSubmitLeave: (e: React.FormEvent, leaveForm: any, editingLeave: any) => void;
}

const LeaveTab: React.FC<LeaveTabProps> = ({
  leaveRequests, currentEmployee, employees, approvalLeaves,
  totalBalance, itemVariants, onApprove, onReject, onCancel, onSubmitLeave,
}) => {
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [editingLeave, setEditingLeave] = useState<any>(null);
  const [leaveTab, setLeaveTab] = useState("myRequests");
  const [leaveForm, setLeaveForm] = useState({
    requestType: "Leave",
    leaveType: "",
    leaveDuration: "Full Day",
    fromDate: "",
    toDate: "",
    permissionDate: "",
    fromTime: "",
    toTime: "",
    totalDays: 0,
    reason: "",
    emergencyContact: "",
    reportingManager: "",
    handoverTo: "",
    attachment: null,
  });

  useEffect(() => {
    if (leaveForm.fromDate && leaveForm.toDate) {
      const fromDate = new Date(leaveForm.fromDate);
      const toDate = new Date(leaveForm.toDate);

      let totalDays =
        Math.floor((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      if (leaveForm.leaveDuration === "First Half" || leaveForm.leaveDuration === "Second Half") {
        totalDays = 0.5;
      }

      setLeaveForm(prev => ({
        ...prev,
        totalDays: totalDays > 0 ? totalDays : 0
      }));
    }
  }, [leaveForm.fromDate, leaveForm.toDate, leaveForm.leaveDuration]);

  const resetLeaveForm = () => {
    setLeaveForm({
      requestType: "Leave",
      leaveType: "",
      leaveDuration: "Full Day",
      fromDate: "",
      toDate: "",
      permissionDate: "",
      fromTime: "",
      toTime: "",
      totalDays: 0,
      reason: "",
      emergencyContact: "",
      reportingManager: "",
      handoverTo: "",
      attachment: null,
    });
  };

  const editLeave = (leave: any) => {
    setLeaveForm({
      requestType: leave.request_type || "Leave",
      leaveType: leave.leave_type || "",
      leaveDuration: leave.leave_duration || "Full Day",
      fromDate: leave.from_date || "",
      toDate: leave.to_date || "",
      permissionDate: leave.permission_date || "",
      fromTime: leave.from_time || "",
      toTime: leave.to_time || "",
      totalDays: leave.total_days || 0,
      reason: leave.reason || "",
      emergencyContact: leave.emergency_contact || "",
      reportingManager: leave.reporting_manager || "",
      handoverTo: leave.handover_to || "",
      attachment: null,
    });
    setEditingLeave(leave);
    setShowLeaveForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    const payload = {
      ...leaveForm,
      request_type: leaveForm.requestType,
      permission_date: leaveForm.permissionDate,
      from_time: leaveForm.fromTime,
      to_time: leaveForm.toTime,
    };
    onSubmitLeave(e, payload, editingLeave);
    setShowLeaveForm(false);
    setEditingLeave(null);
    resetLeaveForm();
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Leave Request</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your leave applications</p>
        </div>
        <button
          onClick={() => setShowLeaveForm(true)}
          className="flex items-center gap-2 bg-[#4C5C68] text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm"
        >
          <PlusIcon className="w-4 h-4" />
          Apply Leave
        </button>
      </div>

      <div className="flex gap-3 mb-6 p-1 bg-gray-100 rounded-lg w-fit">
        <button
          onClick={() => setLeaveTab("myRequests")}
          className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${leaveTab === "myRequests" ? "bg-white text-blue-600 shadow-sm" : "text-gray-600 hover:text-gray-900"}`}
        >My Requests</button>
        <button
          onClick={() => setLeaveTab("approvalRequests")}
          className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${leaveTab === "approvalRequests" ? "bg-white text-blue-600 shadow-sm" : "text-gray-600 hover:text-gray-900"}`}
        >Approval Requests</button>
      </div>

      {/* Leave Balance Card */}
      <motion.div variants={itemVariants} className="mb-6">
        <div className="bg-white rounded-xl p-6 text-black shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Leave Balance</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Sick Leave", value: currentEmployee?.sick_leave || 0 },
              { label: "Casual Leave", value: currentEmployee?.casual_leave || 0 },
              { label: "Earned Leave", value: currentEmployee?.earned_leave || 0 },
              { label: "Total Balance", value: totalBalance },
            ].map((item) => (
              <div key={item.label} className="bg-gray-200 rounded-lg p-4">
                <p className="text-black text-xs mb-1 font-medium">{item.label}</p>
                <p className="text-3xl font-bold">{item.value}</p>
                <p className="text-black text-xs mt-1">days remaining</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {leaveTab === "myRequests" && (
        <>
          {/* Leave Form Modal */}
          {showLeaveForm && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-y-auto"
              >

                <div className="flex items-center justify-between p-6 border-b">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{editingLeave ? "Edit Leave" : "Apply Leave"}</h2>
                    <p className="text-sm text-gray-500 mt-1">Fill in the details to request leave</p>
                  </div>
                  <button onClick={() => setShowLeaveForm(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <XMarkIcon className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-4 gap-6 p-6">
                  <div className="lg:col-span-3 space-y-5">

                    {/* Request Type */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium mb-2">
                        Request Type
                      </label>
                      <select
                        value={leaveForm.requestType}
                        onChange={(e) =>
                          setLeaveForm({
                            ...leaveForm,
                            requestType: e.target.value,
                            reason: "",
                          })
                        }
                        className="w-full border rounded-lg px-3 py-2"
                      >
                        <option value="Leave">Leave</option>
                        <option value="Permission">Permission</option>
                      </select>
                    </div>

                    {leaveForm.requestType === "Leave" && (
                      <>
                        <div>
                          <label className="block text-sm font-semibold mb-2 text-gray-700">Leave Type <span className="text-red-500">*</span></label>
                          <select required value={leaveForm.leaveType}
                            onChange={(e) => setLeaveForm({ ...leaveForm, leaveType: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500">
                            <option value="">Select Leave Type</option>
                            <option value="Sick Leave">Sick Leave</option>
                            <option value="Casual Leave">Casual Leave</option>
                            <option value="Earned Leave">Earned Leave</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-semibold mb-2">Leave Duration</label>
                          <select value={leaveForm.leaveDuration}
                            onChange={(e) => setLeaveForm({ ...leaveForm, leaveDuration: e.target.value })}
                            className="w-full border rounded-lg px-4 py-2">
                            <option value="Full Day">Full Day</option>
                            <option value="First Half">First Half</option>
                            <option value="Second Half">Second Half</option>
                          </select>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-semibold mb-2 text-gray-700">From Date <span className="text-red-500">*</span></label>
                            <input type="date" required value={leaveForm.fromDate}
                              onChange={(e) => setLeaveForm({ ...leaveForm, fromDate: e.target.value })}
                              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500" />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold mb-2 text-gray-700">To Date <span className="text-red-500">*</span></label>
                            <input type="date" required value={leaveForm.toDate}
                              onChange={(e) => setLeaveForm({ ...leaveForm, toDate: e.target.value })}
                              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500" />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold mb-2 text-gray-700">Total Days</label>
                            <input readOnly value={leaveForm.totalDays || 0}
                              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 bg-gray-50 text-gray-600 font-semibold" />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-semibold mb-2 text-gray-700">Reporting Manager</label>
                          <input type="text" value={currentEmployee?.reporting_manager || ""} readOnly
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-600" />
                        </div>

                        <div>
                          <label className="block text-sm font-semibold mb-2 text-gray-700">Work Handover To</label>
                          <select value={leaveForm.handoverTo}
                            onChange={(e) => setLeaveForm({ ...leaveForm, handoverTo: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-4 py-2.5">
                            <option value="">Select Employee</option>
                            {employees?.map((emp) => (
                              <option key={emp.id} value={`${emp.first_name} ${emp.last_name}`}>
                                {emp.first_name} {emp.last_name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-semibold mb-2 text-gray-700">Emergency Contact <span className="text-red-500">*</span></label>
                          <input type="text" required value={leaveForm.emergencyContact}
                            onChange={(e) => setLeaveForm({ ...leaveForm, emergencyContact: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter emergency contact number" />
                        </div>
                      </>
                    )}

                    {leaveForm.requestType === "Permission" && (
                      <>
                        <div className="mb-4">
                          <label className="block text-sm font-medium mb-2">
                            Permission Date
                          </label>
                          <input
                            type="date"
                            value={leaveForm.permissionDate}
                            onChange={(e) =>
                              setLeaveForm({
                                ...leaveForm,
                                permissionDate: e.target.value,
                              })
                            }
                            className="w-full border rounded-lg px-3 py-2"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-2">
                              From Time
                            </label>
                            <input
                              type="time"
                              value={leaveForm.fromTime}
                              onChange={(e) =>
                                setLeaveForm({
                                  ...leaveForm,
                                  fromTime: e.target.value,
                                })
                              }
                              className="w-full border rounded-lg px-3 py-2"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium mb-2">
                              To Time
                            </label>
                            <input
                              type="time"
                              value={leaveForm.toTime}
                              onChange={(e) =>
                                setLeaveForm({
                                  ...leaveForm,
                                  toTime: e.target.value,
                                })
                              }
                              className="w-full border rounded-lg px-3 py-2"
                            />
                          </div>
                        </div>
                      </>
                    )}

                    <div>
                      <label className="block text-sm font-semibold mb-2">Reason</label>
                      <select required value={leaveForm.reason}
                        onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                        className="w-full border rounded-lg px-4 py-2">
                        <option value="">Select Reason</option>
                        {leaveForm.requestType === "Permission"
                          ? permissionReasons.map((reason) => (
                              <option key={reason} value={reason}>{reason}</option>
                            ))
                          : leaveForm.leaveType && leaveReasons[leaveForm.leaveType]?.map((reason) => (
                              <option key={reason} value={reason}>{reason}</option>
                            ))
                        }
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold mb-2 text-gray-700">Attachment</label>
                      <input type="file" className="w-full border border-gray-300 rounded-lg px-4 py-2.5" />
                      <p className="text-xs text-gray-500 mt-1">Supports: PDF, JPG, PNG (Max 5MB)</p>
                    </div>

                    <div className="flex gap-3 pt-3 border-t">
                      <button type="button" onClick={() => setShowLeaveForm(false)}
                        className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium">
                        Cancel
                      </button>
                      <button type="submit" className="px-6 py-2.5 bg-[#4C5C68] text-white rounded-lg">
                        {editingLeave ? "Update Leave" : "Submit Leave"}
                      </button>
                    </div>
                  </div>

                  {/* Right Info Panel */}
                  <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
                      <h3 className="font-bold text-lg mb-4 text-blue-900">Leave Balance</h3>
                      <div className="space-y-3">
                        {[
                          { label: "Earned Leave", value: currentEmployee?.earned_leave || 0 },
                          { label: "Casual Leave", value: currentEmployee?.casual_leave || 0 },
                          { label: "Sick Leave", value: currentEmployee?.sick_leave || 0 },
                        ].map((item) => (
                          <div key={item.label} className="flex justify-between items-center py-2 border-b border-blue-100">
                            <span className="text-gray-700">{item.label}</span>
                            <span className="font-bold text-blue-700 text-lg">{item.value}</span>
                          </div>
                        ))}
                        <div className="flex justify-between items-center pt-3">
                          <span className="font-bold text-blue-900">Total Balance</span>
                          <span className="font-bold text-blue-700 text-xl">{totalBalance}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-green-50 border border-green-200 rounded-xl p-5">
                      <h4 className="font-semibold mb-3 text-green-900">Leave Information</h4>
                      <ul className="text-sm text-gray-700 space-y-2">
                        <li className="flex items-start gap-2"><span className="text-green-600 mt-1">•</span><span><strong>Earned Leave:</strong> Planned leave for vacations</span></li>
                        <li className="flex items-start gap-2"><span className="text-green-600 mt-1">•</span><span><strong>Casual Leave:</strong> Personal work or short absence</span></li>
                        <li className="flex items-start gap-2"><span className="text-green-600 mt-1">•</span><span><strong>Sick Leave:</strong> Medical leave when unwell</span></li>
                        <li className="flex items-start gap-2"><span className="text-green-600 mt-1">•</span><span>Approval required by Reporting Manager</span></li>
                      </ul>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                      <h4 className="font-semibold mb-3 text-amber-900">Quick Tips</h4>
                      <ul className="text-sm text-gray-700 space-y-2">
                        <li>• Apply at least 2 days in advance</li>
                        <li>• Provide emergency contact details</li>
                        <li>• Arrange work handover before leaving</li>
                      </ul>
                    </div>
                  </div>
                </form>
              </motion.div>
            </div>
          )}

          {/* Leave Tracking */}
          {leaveRequests.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Leave Request Tracking</h3>
              {leaveRequests
                .filter((leave: any) => leave.employee_id === currentEmployee?.id)
                .slice(0, 1)
                .map((leave: any) => (
                  <div key={leave.id}>
                    <div className="flex items-center justify-between">
                      {["Applied", "Reporting Manager", "Final Status"].map((step, i) => (
                        <React.Fragment key={step}>
                          <div className="flex flex-col items-center">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white shadow-md ${
                              i === 0 ? "bg-green-500" :
                              leave.status === "Approved" ? "bg-green-500" :
                              leave.status === "Rejected" ? "bg-red-500" : "bg-yellow-500"
                            }`}>
                              {leave.status === "Approved" || i === 0
                                ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20,6 9,17 4,12" /></svg>
                                : leave.status === "Rejected"
                                ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12,6 12,12 16,14" /></svg>
                              }
                            </div>
                            <p className="text-xs font-semibold mt-2 text-gray-900">{step}</p>
                          </div>
                          {i < 2 && <div className="flex-1 h-1 bg-gradient-to-r from-green-500 to-yellow-500 mx-2 rounded-full"></div>}
                        </React.Fragment>
                      ))}
                    </div>
                    <div className="mt-4 text-center">
                      <span className={`inline-flex items-center px-4 py-2 rounded-full text-xs font-bold border shadow-sm ${
                        leave.status === "Approved" ? "bg-green-100 text-green-700 border-green-300" :
                        leave.status === "Rejected" ? "bg-red-100 text-red-700 border-red-300" :
                        "bg-yellow-100 text-yellow-700 border-yellow-300"
                      }`}>
                        Current Status: {leave.status}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* Leave History Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-900">Leave History</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    {["Leave Type", "Date Range", "Days", "Status", "Manager", "Actions"].map(h => (
                      <th key={h} className="text-left p-4 font-semibold text-gray-700 text-xs uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {leaveRequests
                    .filter((request: any) => request.employee_id === currentEmployee?.id)
                    .map((request: any) => (
                      <tr key={request.id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-4 text-sm font-semibold text-gray-900">{request.leave_type}</td>
                        <td className="p-4 text-sm">
                          <p className="text-gray-900 font-medium">{request.from_date}</p>
                          <p className="text-xs text-gray-500">to {request.to_date}</p>
                        </td>
                        <td className="p-4 text-sm">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                            {request.total_days} days
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold border ${getStatusColor(request.status)}`}>
                            {request.status}
                          </span>
                        </td>
                        <td className="p-4 text-sm">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                            request.status === "Approved" ? "bg-green-100 text-green-700" :
                            request.status === "Rejected" ? "bg-red-100 text-red-700" :
                            "bg-yellow-100 text-yellow-700"
                          }`}>{request.status}</span>
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            {request.status === "Pending" && (
                              <>
                                <button onClick={() => editLeave(request)} className="bg-yellow-500 text-white px-3 py-1 rounded">Edit</button>
                                <button onClick={() => onCancel(request.id)} className="bg-red-500 text-white px-3 py-1 rounded">Cancel</button>
                              </>
                            )}
                            {request.status === "Approved" && (
                              <button onClick={() => onCancel(request.id)} className="bg-red-500 text-white px-3 py-1 rounded">Cancel Leave</button>
                            )}
                            {request.status === "Rejected" && (
                              <button onClick={() => editLeave(request)} className="bg-yellow-500 text-white px-3 py-1 rounded">Edit</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {leaveTab === "approvalRequests" && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Leave Approval Requests</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {["Employee", "Leave Type", "From", "To", "Status", "Action"].map(h => (
                    <th key={h} className="text-left p-4 font-semibold text-gray-700 text-xs uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {approvalLeaves.filter((leave: any) => leave.status !== "Cancelled").map((leave: any) => (
                  <tr key={leave.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 text-sm font-medium text-gray-900">{leave.employee_name}</td>
                    <td className="p-4 text-sm text-gray-700">{leave.leave_type}</td>
                    <td className="p-4 text-sm text-gray-700">{leave.from_date}</td>
                    <td className="p-4 text-sm text-gray-700">{leave.to_date}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold border ${getStatusColor(leave.status)}`}>
                        {leave.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <button onClick={() => onApprove(leave.id)} className="bg-green-600 text-white px-4 py-2 rounded-lg">Approve</button>
                        <button onClick={() => onReject(leave.id)} className="bg-red-600 text-white px-4 py-2 rounded-lg">Reject</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
};

export default LeaveTab;