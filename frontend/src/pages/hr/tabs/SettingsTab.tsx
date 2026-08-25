import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import Panel from '../components/Panel';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { ConfirmDialog, Modal } from '../../../components/ui/Modal';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

import { API_URL as CONFIG_API_URL } from '../../../config/api';

const API_URL = `${CONFIG_API_URL}/api`;

interface SettingsTabProps {
  employees?: any[];
}

const SettingsTab: React.FC<SettingsTabProps> = ({ employees = [] }) => {
  const [policies, setPolicies] = useState<any[]>([]);
  const [newLeaveType, setNewLeaveType] = useState('');
  const [newLimit, setNewLimit] = useState<number>(0);
  const [newApplicableGender, setNewApplicableGender] = useState('All');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  // Individual employee balance override states
  const [selectedEmpId, setSelectedEmpId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [balances, setBalances] = useState<any[]>([]);
  const [isBalancesLoading, setIsBalancesLoading] = useState(false);
  const [isSavingBalances, setIsSavingBalances] = useState(false);
  const [updatedDetails, setUpdatedDetails] = useState<any[]>([]);
  const [showUpdatedDetails, setShowUpdatedDetails] = useState(false);
  
  const [creditHistory, setCreditHistory] = useState<any[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [selectedHistoryRun, setSelectedHistoryRun] = useState<any | null>(null);
  const [updatedType, setUpdatedType] = useState<string>('');

  // Fetch policies on mount
  useEffect(() => {
    fetchPolicies();
    fetchCreditHistory();
  }, []);

  const fetchCreditHistory = async () => {
    try {
      setIsHistoryLoading(true);
      const res = await axios.get(`${API_URL}/leaves/monthly-credit-history`);
      setCreditHistory(res.data);
    } catch (err: any) {
      toast.error("Failed to load credit history");
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const fetchPolicies = async () => {
    try {
      const res = await axios.get(`${API_URL}/leaves/policies`);
      setPolicies(res.data);
    } catch (err: any) {
      toast.error("Failed to load leave policies");
    }
  };

  const handleCreatePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeaveType.trim()) {
      toast.error("Leave category name is required");
      return;
    }
    try {
      setIsSubmitting(true);
      const res = await axios.post(`${API_URL}/leaves/policies`, {
        leave_type: newLeaveType.trim(),
        yearly_limit: newLimit,
        applicable_gender: newApplicableGender
      });
      setPolicies([...policies, res.data.policy]);
      setNewLeaveType('');
      setNewLimit(0);
      setNewApplicableGender('All');
      toast.success("Leave category added successfully!");

      // If an employee is currently selected, refresh their balances to include the new policy
      if (selectedEmpId) {
        try {
          const balRes = await axios.get(`${API_URL}/leaves/balances/${selectedEmpId}`);
          setBalances(balRes.data);
        } catch (balErr) {
          console.error("Failed to refresh employee balances after policy creation", balErr);
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to create leave category");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateLimits = async () => {
    try {
      setIsSubmitting(true);
      await axios.put(`${API_URL}/leaves/policies`, policies);
      toast.success("Leave limits updated successfully!");
    } catch (err: any) {
      toast.error("Failed to update leave limits");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePolicy = async (id: number) => {
    try {
      await axios.delete(`${API_URL}/leaves/policies/${id}`);
      setPolicies(policies.filter(p => p.id !== id));
      toast.success("Leave category deleted successfully");

      // If an employee is currently selected, refresh their balances to remove the deleted policy
      if (selectedEmpId) {
        try {
          const balRes = await axios.get(`${API_URL}/leaves/balances/${selectedEmpId}`);
          setBalances(balRes.data);
        } catch (balErr) {
          console.error("Failed to refresh employee balances after policy deletion", balErr);
        }
      }
    } catch (err: any) {
      toast.error("Failed to delete leave category");
    }
  };

  const handleLimitChange = (id: number, val: number) => {
    setPolicies(policies.map(p => p.id === id ? { ...p, yearly_limit: val } : p));
  };

  // Fetch employee balances when selectedEmpId changes
  useEffect(() => {
    if (!selectedEmpId) {
      setBalances([]);
      return;
    }
    const fetchEmployeeBalances = async () => {
      setIsBalancesLoading(true);
      try {
        const res = await axios.get(`${API_URL}/leaves/balances/${selectedEmpId}`);
        setBalances(res.data);
      } catch (err) {
        toast.error("Failed to load employee leave balances");
      } finally {
        setIsBalancesLoading(false);
      }
    };
    fetchEmployeeBalances();
  }, [selectedEmpId]);

  const handleEmployeeBalanceChange = (leaveType: string, val: number) => {
    setBalances(prev => prev.map(b => b.leave_type === leaveType ? { ...b, available: val } : b));
  };

  const handleSaveEmployeeBalances = async () => {
    if (!selectedEmpId) return;
    setIsSavingBalances(true);
    try {
      const payload = balances.reduce((acc, curr) => {
        acc[curr.leave_type] = curr.available;
        return acc;
      }, {} as Record<string, number>);

      await axios.put(`${API_URL}/leaves/balances/${selectedEmpId}`, payload);
      toast.success("Employee leave balances updated successfully!");
    } catch (err) {
      toast.error("Failed to update employee leave balances");
    } finally {
      setIsSavingBalances(false);
    }
  };

  const filteredEmployees = React.useMemo(() => {
    const sorted = [...employees].sort((a, b) => {
      const nameA = `${a.first_name || ""} ${a.last_name || ""}`.trim().toLowerCase();
      const nameB = `${b.first_name || ""} ${b.last_name || ""}`.trim().toLowerCase();
      return nameA.localeCompare(nameB);
    });

    if (!searchQuery.trim()) return sorted;

    const query = searchQuery.toLowerCase().trim();
    const matched = sorted.filter((emp) => {
      const fullName = `${emp.first_name || ""} ${emp.last_name || ""}`.toLowerCase();
      const empId = String(emp.employee_id || "").toLowerCase();
      return fullName.includes(query) || empId.includes(query);
    });

    if (selectedEmpId) {
      const selectedEmp = sorted.find(emp => String(emp.id) === String(selectedEmpId));
      if (selectedEmp && !matched.some(emp => String(emp.id) === String(selectedEmpId))) {
        matched.push(selectedEmp);
      }
    }

    return matched;
  }, [employees, searchQuery, selectedEmpId]);

  return (
    <div className="space-y-6">
      {/* 1. Manage Leave Policies */}
      <Panel>
        <div className="text-[15px] font-extrabold text-neutral-800 mb-2">Manage Leave Policies (Jan - Dec)</div>
        <p className="text-xs text-neutral-500 mb-5">Configure the annual credit limits for all leave categories.</p>

        {/* Edit Limits Form */}
        <div className="space-y-4 mb-6">
          {policies.map((p) => (
            <div key={p.id} className="flex items-center justify-between p-4 bg-neutral-50 rounded-[10px] gap-4">
              <div className="flex items-center gap-3.5">
                <span className="text-sm font-semibold text-neutral-800">{p.leave_type}</span>
                <span className="text-[10px] bg-primary-50 text-primary-700 border border-primary-200 px-2 py-0.5 rounded-full font-extrabold uppercase tracking-wide">
                  {p.applicable_gender || "All"}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center bg-white border border-neutral-200 rounded-lg px-2">
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={p.yearly_limit}
                    onChange={(e) => handleLimitChange(p.id, parseFloat(e.target.value) || 0)}
                    onBlur={() => handleUpdateLimits()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        (e.target as HTMLInputElement).blur();
                      }
                    }}
                    className="w-16 text-center border-none focus:ring-0 text-sm font-medium py-1.5"
                  />
                  <span className="text-xs text-neutral-400 font-semibold pr-1">Days</span>
                </div>
                <button
                  type="button"
                  onClick={() => setDeleteTargetId(p.id)}
                  className="p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Add New Category form */}
        <Card className="p-5 border border-dashed border-neutral-300 bg-neutral-50/50 rounded-xl">
          <div className="text-sm font-bold text-neutral-800 mb-3">Add New Leave Category</div>
          <form onSubmit={handleCreatePolicy} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1.5">Leave Name</label>
              <input
                type="text"
                placeholder="e.g. Maternity Leave"
                value={newLeaveType}
                onChange={(e) => setNewLeaveType(e.target.value)}
                className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1.5">Annual Limit (Days)</label>
              <input
                type="number"
                min="0"
                step="0.5"
                placeholder="0"
                value={newLimit}
                onChange={(e) => setNewLimit(parseFloat(e.target.value) || 0)}
                className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1.5">Applicable Gender</label>
              <select
                value={newApplicableGender}
                onChange={(e) => setNewApplicableGender(e.target.value)}
                className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 bg-white"
              >
                <option value="All">All</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
            <Button type="submit" disabled={isSubmitting} icon={PlusIcon}>
              Add Category
            </Button>
          </form>
        </Card>
      </Panel>

      {/* 2. Individual Employee Leave Balances Override */}
      <Panel>
        <div className="text-[15px] font-extrabold text-neutral-800 mb-2">Individual Employee Leave Balances</div>
        <p className="text-xs text-neutral-500 mb-5">Select a specific employee to view and override their remaining Sick, Casual, or Privilege Leave balances.</p>

        <div className="space-y-6">
          {/* Employee Dropdown Selection */}
          <div className="max-w-md space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1.5">Search Employee (Name / ID)</label>
              <input
                type="text"
                placeholder="Type name or Employee ID to filter..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 font-medium text-neutral-700 bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1.5">Select Employee</label>
              <select
                value={selectedEmpId}
                onChange={(e) => setSelectedEmpId(e.target.value)}
                className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 bg-white font-medium text-neutral-700 cursor-pointer"
              >
                <option value="">-- Choose Employee --</option>
                {filteredEmployees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.last_name} ({emp.employee_id}) - {emp.designation || "No Designation"}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Balance Adjustment Inputs */}
          {selectedEmpId && (
            <div className="border border-neutral-200/80 rounded-2xl p-5 bg-neutral-50/30 space-y-4 max-w-2xl">
              <div className="text-sm font-bold text-neutral-800 border-b border-neutral-100 pb-2 flex items-center justify-between">
                <span>Adjust Available Balances</span>
                {isBalancesLoading && <span className="text-xs text-neutral-400 font-semibold animate-pulse">Loading balances...</span>}
              </div>

              {!isBalancesLoading && balances.length === 0 && (
                <p className="text-xs text-neutral-400 font-medium">No leave categories active for this employee.</p>
              )}

              {!isBalancesLoading && balances.length > 0 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {balances.map((b) => (
                      <div key={b.leave_type} className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-neutral-600 uppercase tracking-wider">{b.leave_type}</label>
                        <div className="flex items-center bg-white border border-neutral-200 rounded-lg px-3 py-1 shadow-sm">
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={b.available}
                            onChange={(e) => handleEmployeeBalanceChange(b.leave_type, parseFloat(e.target.value) || 0)}
                            className="w-full border-none focus:ring-0 text-sm font-bold text-neutral-800 py-1.5"
                          />
                          <span className="text-xs text-neutral-450 font-bold shrink-0">Days</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2">
                    <Button onClick={handleSaveEmployeeBalances} disabled={isSavingBalances}>
                      {isSavingBalances ? "Saving..." : "Save Employee Balances"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Panel>

      <Panel>
        <div className="p-6">
          <div className="mb-5 border-b border-neutral-100 pb-4">
            <h3 className="text-base font-bold text-neutral-800">Monthly Leave Automation</h3>
            <p className="mt-1 text-sm text-neutral-500">
              The system automatically credits leaves on the 25th of every month. You can manually trigger this process if it was missed or if you need to run it immediately. It is safe to run multiple times, as employees who were already credited this month will be skipped.
            </p>
          </div>
          <div>
            <div className="flex gap-4">
              <Button
                onClick={async () => {
                  try {
                    const res = await axios.post(`${API_URL}/leaves/trigger-monthly-credit`);
                    if (res.data.employees_updated > 0) {
                      toast.success(`Successfully updated balances for ${res.data.employees_updated} employees!`);
                      if (res.data.updated_details) {
                        setUpdatedDetails(res.data.updated_details);
                        setUpdatedType('month');
                        setShowUpdatedDetails(true);
                      }
                      fetchCreditHistory(); // Refresh history
                    } else {
                      toast.success("Balances are already updated for this month.");
                    }
                  } catch (err: any) {
                    toast.error("Failed to trigger monthly leave credit");
                  }
                }}
              >
                Trigger Monthly Credit (CL/SL)
              </Button>
              <Button
                onClick={async () => {
                  try {
                    const res = await axios.post(`${API_URL}/leaves/trigger-yearly-credit`);
                    if (res.data.employees_updated > 0) {
                      toast.success(`Successfully updated PL balances for ${res.data.employees_updated} employees!`);
                      if (res.data.updated_details) {
                        setUpdatedDetails(res.data.updated_details);
                        setUpdatedType('year');
                        setShowUpdatedDetails(true);
                      }
                      fetchCreditHistory(); // Refresh history
                    } else {
                      toast.success(res.data.message || "PL balances are already updated for this year.");
                    }
                  } catch (err: any) {
                    toast.error("Failed to trigger yearly PL credit");
                  }
                }}
              >
                Trigger Yearly PL Credit
              </Button>
              <Button
                onClick={async () => {
                  try {
                    const res = await axios.post(`${API_URL}/leaves/trigger-monthly-permission-reset`);
                    if (res.data.employees_updated > 0) {
                      toast.success(`Successfully reset permission balances for ${res.data.employees_updated} employees!`);
                      if (res.data.updated_details) {
                        setUpdatedDetails(res.data.updated_details);
                        setUpdatedType('permission');
                        setShowUpdatedDetails(true);
                      }
                      fetchCreditHistory(); // Refresh history
                    } else {
                      toast.success(res.data.message || "Permission balances are already reset for this month.");
                    }
                  } catch (err: any) {
                    toast.error("Failed to trigger monthly permission reset");
                  }
                }}
              >
                Trigger Monthly Permission Reset
              </Button>
            </div>
            
            {updatedDetails.length > 0 && (
              <div className="mt-4">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowUpdatedDetails(!showUpdatedDetails)}
                >
                  {showUpdatedDetails ? "Hide Updated Employees" : `Show ${updatedDetails.length} Updated Employees`}
                </Button>
                
                {showUpdatedDetails && (
                  <div className="mt-3 p-4 bg-neutral-50 rounded-lg max-h-80 overflow-y-auto border border-neutral-200">
                    <h4 className="text-sm font-semibold text-neutral-700 mb-2">Employees Updated This Run:</h4>
                    <table className="min-w-full text-sm text-left text-neutral-600">
                      <thead className="text-xs text-neutral-500 uppercase bg-neutral-100">
                        <tr>
                          <th className="px-3 py-2">Name</th>
                          <th className="px-3 py-2">DOJ</th>
                          <th className="px-3 py-2">Previous Balance ({updatedType === 'month' ? 'CL/SL' : updatedType === 'year' ? 'PL' : 'Permission'})</th>
                          <th className="px-3 py-2">New Balance ({updatedType === 'month' ? 'CL/SL' : updatedType === 'year' ? 'PL' : 'Permission'})</th>
                        </tr>
                      </thead>
                      <tbody>
                        {updatedDetails.map((emp, idx) => (
                          <tr key={idx} className="border-b border-neutral-200">
                            <td className="px-3 py-2 font-medium">{emp.name}</td>
                            <td className="px-3 py-2">{emp.doj}</td>
                            <td className="px-3 py-2">{emp.previous_leave}</td>
                            <td className="px-3 py-2 font-bold text-green-600">{emp.current_leave}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Update History Section */}
          <div className="mt-8 border-t border-neutral-100 pt-6">
            <h3 className="text-base font-bold text-neutral-800 mb-4">Leave Credit History</h3>
            {isHistoryLoading ? (
              <div className="text-sm text-neutral-500">Loading history...</div>
            ) : creditHistory.length === 0 ? (
              <div className="text-sm text-neutral-500">No history available yet.</div>
            ) : (
              <div className="overflow-x-auto overflow-y-auto max-h-[190px] rounded-lg border border-neutral-200">
                <table className="min-w-full text-sm text-left text-neutral-600">
                  <thead className="text-xs text-neutral-500 uppercase bg-neutral-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3">Run Date</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Month/Year</th>
                      <th className="px-4 py-3">Employees Updated</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {creditHistory.map((run) => (
                      <tr key={run.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50/50">
                        <td className="px-4 py-3">{new Date(run.run_date).toLocaleString()}</td>
                        <td className="px-4 py-3 font-semibold text-primary-700 capitalize">{run.credit_type}</td>
                        <td className="px-4 py-3">{run.month}/{run.year}</td>
                        <td className="px-4 py-3 font-medium">{run.employees_updated}</td>
                        <td className="px-4 py-3">
                          <button 
                            className="text-primary-600 hover:text-primary-800 font-medium text-xs"
                            onClick={() => setSelectedHistoryRun(run)}
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </Panel>

      {/* History Details Modal */}
      <Modal
        isOpen={selectedHistoryRun !== null}
        onClose={() => setSelectedHistoryRun(null)}
        title="Credit Run Details"
        size="lg"
      >
        <div className="mt-4 max-h-96 overflow-y-auto">
          <table className="min-w-full text-sm text-left text-neutral-600">
            <thead className="text-xs text-neutral-500 uppercase bg-neutral-100 sticky top-0">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">DOJ</th>
                <th className="px-3 py-2">Previous Balance ({selectedHistoryRun?.credit_type === 'month' ? 'CL/SL' : selectedHistoryRun?.credit_type === 'year' ? 'PL' : 'Permission'})</th>
                <th className="px-3 py-2">New Balance ({selectedHistoryRun?.credit_type === 'month' ? 'CL/SL' : selectedHistoryRun?.credit_type === 'year' ? 'PL' : 'Permission'})</th>
              </tr>
            </thead>
            <tbody>
              {selectedHistoryRun?.employee_details?.map((emp: any, idx: number) => (
                <tr key={idx} className="border-b border-neutral-200">
                  <td className="px-3 py-2 font-medium">{emp.name}</td>
                  <td className="px-3 py-2">{emp.doj}</td>
                  <td className="px-3 py-2">{emp.previous_leave}</td>
                  <td className="px-3 py-2 font-bold text-green-600">{emp.current_leave}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-6 flex justify-end">
          <Button onClick={() => setSelectedHistoryRun(null)}>Close</Button>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={deleteTargetId !== null}
        title="Delete Leave Category"
        message="Are you sure you want to delete this leave category? This will delete all corresponding balances for employees."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={async () => {
          if (deleteTargetId !== null) {
            await handleDeletePolicy(deleteTargetId);
            setDeleteTargetId(null);
          }
        }}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
};

export default SettingsTab;
