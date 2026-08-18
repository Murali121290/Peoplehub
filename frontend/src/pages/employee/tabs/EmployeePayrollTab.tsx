import React, { useState, useEffect } from "react";
import axiosInstance from "axios";
import { toast } from "react-hot-toast";
import {
  BanknotesIcon,
  ArrowDownTrayIcon,
  BuildingOfficeIcon,
  IdentificationIcon,
  EyeIcon
} from "@heroicons/react/24/outline";
import { Card } from "../../../components/ui/Card";
import { Badge } from "../../../components/ui/Badge";
import { Spinner } from "../../../components/ui/Spinner";
import { EmptyState } from "../../../components/ui/EmptyState";
import { Modal } from "../../../components/ui/Modal";
import { API_URL } from "../../../config/api";

const BASE_URL = `${API_URL}/api`;

const formatCurrency = (val: number | string) => {
  const num = typeof val === "string" ? parseFloat(val) : val;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(num || 0);
};

const formatDateRange = (startStr: string, endStr: string) => {
  if (!startStr || !endStr) return "N/A";
  try {
    const start = new Date(startStr);
    const end = new Date(endStr);
    const options: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short", year: "numeric" };
    return `${start.toLocaleDateString("en-IN", options)} → ${end.toLocaleDateString("en-IN", options)}`;
  } catch (e) {
    return `${startStr} → ${endStr}`;
  }
};

const maskAccountNumber = (accNum: string) => {
  if (!accNum) return "N/A";
  const clean = accNum.trim().replace(/\s+/g, "");
  if (clean.length <= 4) return clean;
  const lastFour = clean.slice(-4);
  return `XXXX XXXX ${lastFour}`;
};

export const EmployeePayrollTab: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payrollData, setPayrollData] = useState<any[]>([]);
  const [employeeInfo, setEmployeeInfo] = useState<any>(null);
  const [selectedRecordIndex, setSelectedRecordIndex] = useState(0);
  const [showViewModal, setShowViewModal] = useState(false);

  useEffect(() => {
    const fetchPayroll = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axiosInstance.get(`${BASE_URL}/payroll/my`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (res.data.success) {
          setPayrollData(res.data.data || []);
          setEmployeeInfo(res.data.employee || null);
        } else {
          setError(res.data.error || "Failed to load payroll details");
        }
      } catch (err: any) {
        console.error("Failed to fetch employee payroll", err);
        setError("Unable to load payroll information. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    fetchPayroll();
  }, []);

  const handleDownloadPayslip = (recordId: number) => {
    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Authentication expired. Please log in again.");
      return;
    }
    window.location.href = `${BASE_URL}/payroll/my/${recordId}/payslip?token=${token}`;
  };

  if (loading) {
    return (
      <div className="p-12 flex flex-col justify-center items-center gap-4">
        <Spinner size="md" label="Loading payroll details..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4 text-center">
        <Card className="p-8 border border-neutral-200 shadow-sm flex flex-col items-center gap-4 bg-white">
          <span className="text-4xl">⚠️</span>
          <h3 className="text-lg font-bold text-neutral-800">Error Loading Payroll</h3>
          <p className="text-neutral-500 max-w-md">{error}</p>
        </Card>
      </div>
    );
  }

  if (payrollData.length === 0) {
    return (
      <div className="py-8">
        <EmptyState
          title="No payroll records available yet."
          description="Your payslips will appear here once payroll has been processed."
        />
      </div>
    );
  }

  const selectedRecord = payrollData[selectedRecordIndex] || payrollData[0];

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-1 sm:px-4">
      {/* Overview and cards grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Latest Payroll Summary Card */}
        <Card className="bg-white border border-neutral-200 rounded-2xl shadow-sm p-6 flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <BanknotesIcon className="w-5 h-5 text-neutral-500" />
              <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-wider">Payroll Details</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-neutral-400 block uppercase mb-1.5">Select Payroll Period</label>
                <select
                  value={selectedRecordIndex}
                  onChange={(e) => setSelectedRecordIndex(parseInt(e.target.value))}
                  className="border border-neutral-300 rounded-lg p-2 text-sm w-full bg-white font-bold text-neutral-800 focus:ring-1 focus:ring-black focus:outline-none"
                >
                  {payrollData.map((rec, index) => (
                    <option key={rec.id} value={index}>
                      {formatDateRange(rec.payroll_period_start, rec.payroll_period_end)}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4 border-t border-neutral-100 pt-4">
                <div>
                  <span className="text-[10px] font-semibold text-neutral-400 block uppercase">Gross Salary</span>
                  <span className="text-sm font-semibold text-neutral-800">
                    {formatCurrency(selectedRecord.gross_salary)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-neutral-400 block uppercase">Gross Earned</span>
                  <span className="text-sm font-semibold text-neutral-800">
                    {formatCurrency(selectedRecord.gross_earned_salary)}
                  </span>
                </div>
              </div>

              <div className="border-t border-neutral-100 pt-4">
                <span className="text-[10px] font-semibold text-neutral-400 block uppercase">Total Deduction</span>
                <span className="text-sm font-semibold text-danger-600">
                  {formatCurrency(selectedRecord.total_deduction)}
                </span>
              </div>
            </div>
          </div>

          <div className="border-t border-neutral-200 pt-6 mt-6">
            <span className="text-xs font-bold text-neutral-400 block uppercase tracking-wide">Net Transfer</span>
            <div className="text-3xl font-extrabold text-success-600 font-mono tracking-tight mt-1">
              {formatCurrency(selectedRecord.net_transfer)}
            </div>
            <div className="mt-4 flex items-center justify-between">
              <Badge variant={selectedRecord.payment_status === "Paid" ? "success" : "warning"} size="sm">
                {selectedRecord.payment_status}
              </Badge>
              {selectedRecord.payment_status === "Paid" ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowViewModal(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-neutral-300 hover:bg-neutral-50 text-neutral-700 rounded-lg text-xs font-bold transition-all shadow-sm"
                  >
                    <EyeIcon className="w-3.5 h-3.5" />
                    View Details
                  </button>
                  <button
                    onClick={() => handleDownloadPayslip(selectedRecord.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                  >
                    <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                    Download Payslip
                  </button>
                </div>
              ) : (
                <span className="text-xs text-neutral-400 font-bold select-none pr-1">Pending Processing</span>
              )}
            </div>
          </div>
        </Card>

        {/* Salary Structure Card */}
        <Card className="bg-white border border-neutral-200 rounded-2xl shadow-sm p-6 h-full">
          <div className="flex items-center gap-2 mb-6">
            <IdentificationIcon className="w-5 h-5 text-neutral-500" />
            <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-wider">Salary Structure</h3>
          </div>
          
          <div className="space-y-3.5 font-mono text-sm">
            <div className="flex justify-between items-center py-1.5 border-b border-neutral-50">
              <span className="text-neutral-500 font-sans font-medium">Basic</span>
              <span className="text-neutral-800 font-bold">{formatCurrency(selectedRecord.basic)}</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-neutral-50">
              <span className="text-neutral-500 font-sans font-medium">HRA</span>
              <span className="text-neutral-800 font-bold">{formatCurrency(selectedRecord.hra)}</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-neutral-50">
              <span className="text-neutral-500 font-sans font-medium">LTA</span>
              <span className="text-neutral-800 font-bold">{formatCurrency(selectedRecord.lta)}</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-neutral-50">
              <span className="text-neutral-500 font-sans font-medium">Other Allowance</span>
              <span className="text-neutral-800 font-bold">{formatCurrency(selectedRecord.other_allowance)}</span>
            </div>
            <div className="flex justify-between items-center py-2 pt-4 border-t border-neutral-200">
              <span className="font-sans font-bold text-neutral-800">Gross Salary</span>
              <span className="text-neutral-900 font-extrabold">{formatCurrency(selectedRecord.gross_salary)}</span>
            </div>
          </div>
        </Card>

        {/* Bank Details Card */}
        <Card className="bg-white border border-neutral-200 rounded-2xl shadow-sm p-6 h-full">
          <div className="flex items-center gap-2 mb-6">
            <BuildingOfficeIcon className="w-5 h-5 text-neutral-500" />
            <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-wider">Bank Details</h3>
          </div>
          
          <div className="space-y-4 text-sm">
            <div>
              <span className="text-xs font-semibold text-neutral-400 block uppercase">Account Number</span>
              <span className="text-sm font-bold text-neutral-800 font-mono tracking-wider">
                {maskAccountNumber(selectedRecord.account_number || employeeInfo?.account_number)}
              </span>
            </div>
            <div>
              <span className="text-xs font-semibold text-neutral-400 block uppercase">IFSC Code</span>
              <span className="text-sm font-bold text-neutral-800 font-mono">
                {selectedRecord.ifsc_code || employeeInfo?.ifsc_code || "N/A"}
              </span>
            </div>
            <div>
              <span className="text-xs font-semibold text-neutral-400 block uppercase">Branch Code</span>
              <span className="text-sm font-bold text-neutral-800 font-mono">
                {selectedRecord.branch_code || employeeInfo?.branch_code || "N/A"}
              </span>
            </div>
          </div>
        </Card>

      </div>

      {/* VIEW DETAILS MODAL */}
      {showViewModal && (
        <Modal
          isOpen={showViewModal}
          onClose={() => setShowViewModal(false)}
          size="lg"
          title="My Payslip Details"
        >
          <div className="space-y-6 max-h-[80vh] overflow-y-auto pr-2 font-sans select-none text-xs">
            
            {/* Header info */}
            <div className="bg-neutral-900 text-white rounded-xl p-5 shadow-sm flex flex-col sm:flex-row justify-between gap-4">
              <div>
                <span className="text-[10px] text-neutral-450 font-bold uppercase tracking-wider block">Company</span>
                <span className="text-base font-extrabold block">S4 CARLISLE PUBLISHING SERVICES</span>
                <div className="mt-3 flex items-center gap-3">
                  <div>
                    <span className="text-[9px] text-neutral-400 block font-semibold uppercase">Employee Name</span>
                    <span className="text-xs font-bold text-neutral-200">{employeeInfo?.first_name} {employeeInfo?.last_name}</span>
                  </div>
                  <span className="h-6 w-px bg-white/20" />
                  <div>
                    <span className="text-[9px] text-neutral-400 block font-semibold uppercase">Employee ID</span>
                    <span className="text-xs font-bold text-neutral-200">{employeeInfo?.employee_id}</span>
                  </div>
                </div>
              </div>
              <div className="sm:text-right flex flex-col justify-between items-start sm:items-end">
                <div>
                  <span className="text-[10px] text-neutral-450 font-bold uppercase tracking-wider block">Payroll Cycle</span>
                  <span className="text-sm font-bold text-neutral-100">{formatDateRange(selectedRecord.payroll_period_start, selectedRecord.payroll_period_end)}</span>
                </div>
                <Badge variant={selectedRecord.payment_status === "Paid" ? "success" : "warning"} size="md" className="mt-2">
                  Status: {selectedRecord.payment_status}
                </Badge>
              </div>
            </div>

            {/* Core figures block (Earnings vs Deductions columns) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Earnings column */}
              <div className="border border-neutral-200 rounded-xl overflow-hidden shadow-xs bg-white">
                <div className="bg-neutral-50 px-4 py-3 border-b border-neutral-200 flex justify-between items-center">
                  <h4 className="font-bold text-neutral-850 text-[13px]">Earnings Breakdown</h4>
                  <span className="text-[10px] font-bold text-neutral-400 uppercase">Actual / Earned</span>
                </div>
                <div className="divide-y divide-neutral-100 text-xs">
                  <div className="px-4 py-2.5 flex justify-between items-center">
                    <span className="text-neutral-500 font-medium">Basic Salary</span>
                    <div className="space-x-3 font-mono">
                      <span className="text-neutral-400 text-[10px]">{formatCurrency(selectedRecord.basic)}</span>
                      <span className="font-bold text-neutral-800">{formatCurrency(selectedRecord.earned_basic)}</span>
                    </div>
                  </div>
                  <div className="px-4 py-2.5 flex justify-between items-center">
                    <span className="text-neutral-500 font-medium">HRA</span>
                    <div className="space-x-3 font-mono">
                      <span className="text-neutral-400 text-[10px]">{formatCurrency(selectedRecord.hra)}</span>
                      <span className="font-bold text-neutral-800">{formatCurrency(selectedRecord.earned_hra)}</span>
                    </div>
                  </div>
                  <div className="px-4 py-2.5 flex justify-between items-center">
                    <span className="text-neutral-500 font-medium">LTA</span>
                    <div className="space-x-3 font-mono">
                      <span className="text-neutral-400 text-[10px]">{formatCurrency(selectedRecord.lta)}</span>
                      <span className="font-bold text-neutral-800">{formatCurrency(selectedRecord.earned_lta)}</span>
                    </div>
                  </div>
                  <div className="px-4 py-2.5 flex justify-between items-center">
                    <span className="text-neutral-500 font-medium">Other Allowances</span>
                    <div className="space-x-3 font-mono">
                      <span className="text-neutral-400 text-[10px]">{formatCurrency(selectedRecord.other_allowance)}</span>
                      <span className="font-bold text-neutral-800">{formatCurrency(selectedRecord.earned_other_allowance)}</span>
                    </div>
                  </div>
                  <div className="px-4 py-2.5 flex justify-between items-center bg-neutral-50/20">
                    <span className="text-neutral-500 font-medium">Attendance Bonus</span>
                    <span className="font-bold text-neutral-800 font-mono">{formatCurrency(selectedRecord.attendance_bonus)}</span>
                  </div>
                  <div className="px-4 py-2.5 flex justify-between items-center bg-neutral-50/20">
                    <span className="text-neutral-500 font-medium">One Day Wages (ODW)</span>
                    <span className="font-bold text-neutral-800 font-mono">{formatCurrency(selectedRecord.odw)}</span>
                  </div>
                  <div className="px-4 py-2.5 flex justify-between items-center bg-neutral-50/20">
                    <span className="text-neutral-500 font-medium">Internet Allowance</span>
                    <span className="font-bold text-neutral-800 font-mono">{formatCurrency(selectedRecord.internet_charges)}</span>
                  </div>
                  <div className="px-4 py-2.5 flex justify-between items-center bg-neutral-50/20">
                    <span className="text-neutral-500 font-medium">Bonus / Additions</span>
                    <span className="font-bold text-neutral-800 font-mono">{formatCurrency(selectedRecord.bonus)}</span>
                  </div>
                  <div className="px-4 py-3 flex justify-between items-center bg-neutral-50 font-bold border-t border-neutral-200">
                    <span className="text-neutral-800 uppercase tracking-wider text-[10px]">Total Earned Gross</span>
                    <span className="text-neutral-900 font-mono text-sm">{formatCurrency(selectedRecord.gross_earned_salary)}</span>
                  </div>
                </div>
              </div>

              {/* Deductions column */}
              <div className="border border-neutral-200 rounded-xl overflow-hidden shadow-xs bg-white flex flex-col justify-between">
                <div>
                  <div className="bg-neutral-50 px-4 py-3 border-b border-neutral-200">
                    <h4 className="font-bold text-neutral-850 text-[13px]">Deductions Breakdown</h4>
                  </div>
                  <div className="divide-y divide-neutral-100 text-xs">
                    <div className="px-4 py-2.5 flex justify-between items-center">
                      <span className="text-neutral-500 font-medium">Provident Fund (PF)</span>
                      <span className="font-bold text-neutral-800 font-mono">{formatCurrency(selectedRecord.pf_ded_employee)}</span>
                    </div>
                    <div className="px-4 py-2.5 flex justify-between items-center">
                      <span className="text-neutral-500 font-medium">Voluntary PF (VPF)</span>
                      <span className="font-bold text-neutral-800 font-mono">{formatCurrency(selectedRecord.vpf)}</span>
                    </div>
                    <div className="px-4 py-2.5 flex justify-between items-center">
                      <span className="text-neutral-500 font-medium">Employee State Insurance (ESI)</span>
                      <span className="font-bold text-neutral-800 font-mono">{formatCurrency(selectedRecord.esi_ded_employee)}</span>
                    </div>
                    <div className="px-4 py-2.5 flex justify-between items-center">
                      <span className="text-neutral-500 font-medium">Salary Advance Recovery</span>
                      <span className="font-bold text-neutral-800 font-mono">{formatCurrency(selectedRecord.salary_advance)}</span>
                    </div>
                    <div className="px-4 py-2.5 flex justify-between items-center">
                      <span className="text-neutral-500 font-medium">Income Tax (TDS)</span>
                      <span className="font-bold text-neutral-800 font-mono">{formatCurrency(selectedRecord.tds)}</span>
                    </div>
                    <div className="px-4 py-2.5 flex justify-between items-center">
                      <span className="text-neutral-500 font-medium">Professional Tax (PT)</span>
                      <span className="font-bold text-neutral-800 font-mono">{formatCurrency(selectedRecord.pt)}</span>
                    </div>
                    <div className="px-4 py-2.5 flex justify-between items-center">
                      <span className="text-neutral-500 font-medium">Labour Welfare Fund (LWF)</span>
                      <span className="font-bold text-neutral-800 font-mono">{formatCurrency(selectedRecord.lwf)}</span>
                    </div>
                    <div className="px-4 py-2.5 flex justify-between items-center">
                      <span className="text-neutral-500 font-medium">Other Deductions</span>
                      <span className="font-bold text-neutral-800 font-mono">{formatCurrency(selectedRecord.other_deduction)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="px-4 py-3 flex justify-between items-center bg-neutral-50 font-bold border-t border-neutral-200">
                  <span className="text-neutral-800 uppercase tracking-wider text-[10px]">Total Deductions</span>
                  <span className="text-danger-600 font-mono text-sm">{formatCurrency(selectedRecord.total_deduction)}</span>
                </div>
              </div>

            </div>

            {/* Contributions Section */}
            <div className="border border-neutral-200 rounded-xl overflow-hidden shadow-xs bg-white p-4">
              <h4 className="font-bold text-neutral-800 text-sm border-b pb-2 mb-3">Employer Contributions</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
                <div className="bg-neutral-50/50 p-2.5 rounded-lg border border-neutral-100">
                  <span className="text-[10px] text-neutral-450 block font-sans font-bold uppercase mb-0.5">Employer PF Contribution</span>
                  <span className="font-bold text-neutral-700 text-sm">{formatCurrency(selectedRecord.pf)}</span>
                </div>
                <div className="bg-neutral-50/50 p-2.5 rounded-lg border border-neutral-100">
                  <span className="text-[10px] text-neutral-450 block font-sans font-bold uppercase mb-0.5">8.33% EPS Share</span>
                  <span className="font-bold text-neutral-700 text-sm">{formatCurrency(selectedRecord.pf_8_33)}</span>
                </div>
                <div className="bg-neutral-50/50 p-2.5 rounded-lg border border-neutral-100">
                  <span className="text-[10px] text-neutral-450 block font-sans font-bold uppercase mb-0.5">3.67% PF Share</span>
                  <span className="font-bold text-neutral-700 text-sm">{formatCurrency(selectedRecord.pf_3_67)}</span>
                </div>
                <div className="bg-neutral-50/50 p-2.5 rounded-lg border border-neutral-100">
                  <span className="text-[10px] text-neutral-450 block font-sans font-bold uppercase mb-0.5">Employer ESI Share</span>
                  <span className="font-bold text-neutral-700 text-sm">{formatCurrency(selectedRecord.esi_ded_employer)}</span>
                </div>
              </div>
            </div>

            {/* Net Transfer Callout */}
            <div className="bg-success-50 border border-success-200 rounded-xl p-5 flex justify-between items-center shadow-xs">
              <div>
                <span className="text-xs font-bold text-success-800 uppercase tracking-wider block">Net Payable Amount</span>
                <span className="text-[10px] text-success-600 font-semibold mt-0.5 block">Credited directly to your registered bank account</span>
              </div>
              <div className="text-right">
                <span className="text-2xl font-extrabold text-success-700 font-mono">{formatCurrency(selectedRecord.net_transfer)}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t pt-4 bg-white">
              <button
                onClick={() => setShowViewModal(false)}
                className="px-4 py-2 border border-neutral-300 hover:bg-neutral-50 text-neutral-700 font-bold rounded-lg text-sm transition-all"
              >
                Close
              </button>
              {selectedRecord.payment_status === "Paid" && (
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    handleDownloadPayslip(selectedRecord.id);
                  }}
                  className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white font-bold rounded-lg text-sm transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <ArrowDownTrayIcon className="w-4 h-4" />
                  Download PDF
                </button>
              )}
            </div>

          </div>
        </Modal>
      )}
    </div>
  );
};

export default EmployeePayrollTab;
