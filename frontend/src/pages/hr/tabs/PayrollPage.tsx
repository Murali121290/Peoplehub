import React, { useEffect, useState, useCallback, useMemo } from "react";
import axios, { AxiosError } from "axios";
import {
  ArrowDownTrayIcon,
  UserCircleIcon,
  BriefcaseIcon,
  CalendarDaysIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  CreditCardIcon,
  ArrowPathIcon,
  BanknotesIcon,
  CalculatorIcon,
  MagnifyingGlassIcon
} from "@heroicons/react/24/outline";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Badge } from "../../../components/ui/Badge";
import { Table } from "../../../components/ui/Table";
import type { Column } from "../../../components/ui/Table";
import { Modal } from "../../../components/ui/Modal";
import { Spinner } from "../../../components/ui/Spinner";
import { EmptyState } from "../../../components/ui/EmptyState";
import { ConfirmDialog } from "../../../components/ui/Modal/ConfirmDialog";
import { toast } from "react-hot-toast";
import { API_URL } from "../../../config/api";
import { formatDateStr } from "../../../utils/date";

const BASE_URL = `${API_URL}/api`;

interface PayrollSummaryRecord {
  id: number;
  employee_id: string;
  employee_name: string;
  payroll_period: string;
  payroll_month: number;
  payroll_year: number;
  gross_salary: number;
  gross_earned_salary: number;
  total_deduction: number;
  net_transfer: number;
  actual_monthly_ctc: number;
  earned_monthly_ctc: number;
  payment_status: "Pending" | "Paid";
  real_employee_id: number;
}

interface EmployeeListOption {
  id: number;
  employee_id: string;
  first_name: string;
  last_name: string;
  department: string;
  designation: string;
  status: string;
  basic?: number;
  hra?: number;
  lta?: number;
  other_allowance?: number;
  bank_name?: string;
  account_number?: string;
  ifsc_code?: string;
  branch_code?: string;
}

// Frontend live preview calculations (Backend is source of truth upon save)
const calculatePayrollFrontend = (inputs: Record<string, any>, overrides: Record<string, any>) => {
  const res: Record<string, any> = {};
  
  const resolveField = (name: string, calculatedVal: number) => {
    let manualVal = 0.0;
    let isOverridden = false;
    if (overrides && overrides[name]) {
      isOverridden = !!overrides[name].is_overridden;
      manualVal = parseFloat(overrides[name].manual_value) || 0.0;
    }
    const finalVal = isOverridden ? manualVal : calculatedVal;
    res[name] = {
      calculated_value: calculatedVal,
      manual_value: manualVal,
      is_overridden: isOverridden,
      final_value: finalVal
    };
    return finalVal;
  };

  const basic = resolveField("basic", parseFloat(inputs.basic) || 0.0);
  const hra = resolveField("hra", parseFloat(inputs.hra) || 0.0);
  const lta = resolveField("lta", parseFloat(inputs.lta) || 0.0);
  const otherAllowance = resolveField("other_allowance", parseFloat(inputs.other_allowance) || 0.0);
  
  const noOfDays = resolveField("no_of_days", parseInt(inputs.no_of_days) || 31);
  const daysPayable = resolveField("days_payable", parseInt(inputs.days_payable) || noOfDays);
  
  // Gross Salary
  const grossSalary = resolveField("gross_salary", basic + hra + lta + otherAllowance);
  
  // Earned basic components
  const earnedBasic = resolveField("earned_basic", noOfDays > 0 ? Math.round((basic / noOfDays) * daysPayable) : 0);
  const earnedHra = resolveField("earned_hra", noOfDays > 0 ? Math.round((hra / noOfDays) * daysPayable) : 0);
  const earnedLta = resolveField("earned_lta", noOfDays > 0 ? Math.round((lta / noOfDays) * daysPayable) : 0);
  const earnedOtherAllowance = resolveField("earned_other_allowance", noOfDays > 0 ? Math.round((otherAllowance / noOfDays) * daysPayable) : 0);
  
  const earnedActualGross = resolveField("earned_actual_gross", earnedBasic + earnedHra + earnedLta + earnedOtherAllowance);
  
  const attendanceBonus = resolveField("attendance_bonus", parseFloat(inputs.attendance_bonus) || 0.0);
  const odw = resolveField("odw", parseFloat(inputs.odw) || 0.0);
  const total = resolveField("total", attendanceBonus + odw);
  const internetCharges = resolveField("internet_charges", parseFloat(inputs.internet_charges) || 0.0);
  
  const grossEarnedSalary = resolveField("gross_earned_salary", earnedActualGross + total);
  const earnedPfWages = resolveField("earned_pf_wages", grossEarnedSalary - earnedHra);
  
  const pfCalculationWage = resolveField("pf_calculation_wage", earnedBasic + earnedLta + earnedOtherAllowance);
  const pfDedEmployee = resolveField("pf_ded_employee", pfCalculationWage > 15000 ? 1800 : Math.round(pfCalculationWage * 0.12));
  
  const vpf = resolveField("vpf", parseFloat(inputs.vpf) || 0.0);
  const pfVpfDedEmployee = resolveField("pf_vpf_ded_employee", pfDedEmployee + vpf);
  
  const esiDedEmployee = resolveField("esi_ded_employee", grossSalary <= 21000 ? Math.ceil(grossEarnedSalary * 0.0075) : 0);
  
  const salaryAdvance = resolveField("salary_advance", parseFloat(inputs.salary_advance) || 0.0);
  const tds = resolveField("tds", parseFloat(inputs.tds) || 0.0);
  const lwf = resolveField("lwf", parseFloat(inputs.lwf) || 0.0);
  const pt = resolveField("pt", parseFloat(inputs.pt) || 0.0);
  const otherDeduction = resolveField("other_deduction", parseFloat(inputs.other_deduction) || 0.0);
  
  const totalDeduction = resolveField("total_deduction", pfVpfDedEmployee + esiDedEmployee + salaryAdvance + tds + lwf + pt + otherDeduction);
  
  const netTransfer = resolveField("net_transfer", grossEarnedSalary - totalDeduction + internetCharges);
  
  const pfWage = resolveField("pf_wage", grossEarnedSalary - earnedHra);
  const pf = resolveField("pf", pfDedEmployee);
  
  const epsWage = resolveField("eps_wage", Math.min(pfCalculationWage, 15000));
  const pf833 = resolveField("pf_8_33", Math.min(Math.ceil(epsWage * 0.0833), 1250));
  const pf367 = resolveField("pf_3_67", Math.min(Math.floor(epsWage * 0.0367), 550));
  
  const pf050PfWage = resolveField("pf_0_50_pf_wage", Math.ceil(pfWage * 0.005));
  const pf050EpsWage = resolveField("pf_0_50_eps_wage", Math.ceil(epsWage * 0.005));
  const pf001 = resolveField("pf_0_01", parseFloat(inputs.pf_0_01) || 0.0);
  
  const esiDedEmployer = resolveField("esi_ded_employer", grossSalary <= 21000 ? Math.ceil(grossEarnedSalary * 0.0325) : 0);
  const bonus = resolveField("bonus", Math.round(basic * 0.0833));
  
  const actualMonthlyCtc = resolveField("actual_monthly_ctc", grossSalary + pf + esiDedEmployer + bonus);
  const earnedMonthlyCtc = resolveField("earned_monthly_ctc", grossEarnedSalary + pf833 + pf367 + esiDedEmployer + bonus);
  
  return res;
};

const MONTHS = [
  { val: 1, label: "January" },
  { val: 2, label: "February" },
  { val: 3, label: "March" },
  { val: 4, label: "April" },
  { val: 5, label: "May" },
  { val: 6, label: "June" },
  { val: 7, label: "July" },
  { val: 8, label: "August" },
  { val: 9, label: "September" },
  { val: 10, label: "October" },
  { val: 11, label: "November" },
  { val: 12, label: "December" }
];

const YEARS = [2024, 2025, 2026, 2027, 2028];

const PayrollPage: React.FC = () => {
  // Navigation tabs: "summary" | "process" | "salary_bank"
  const [activeTab, setActiveTab] = useState<"summary" | "process" | "salary_bank">("summary");

  // Setup Tab states
  const [setupEmployeeId, setSetupEmployeeId] = useState<string>("");
  const [setupInputs, setSetupInputs] = useState({
    basic: 0,
    hra: 0,
    lta: 0,
    other_allowance: 0,
    bank_name: "",
    account_number: "",
    ifsc_code: "",
    branch_code: ""
  });
  const [isSetupLoading, setIsSetupLoading] = useState(false);
  const [isSetupSaving, setIsSetupSaving] = useState(false);
  const [setupSearchQuery, setSetupSearchQuery] = useState("");
  
  // View 1 states
  const [summaryList, setSummaryList] = useState<PayrollSummaryRecord[]>([]);
  const [isSummaryLoading, setIsSummaryLoading] = useState(true);
  const [summaryFilterMonth, setSummaryFilterMonth] = useState<number>(new Date().getMonth() + 1);
  const [summaryFilterYear, setSummaryFilterYear] = useState<number>(new Date().getFullYear());
  
  // View 2 states
  const [employees, setEmployees] = useState<EmployeeListOption[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [payrollMonth, setPayrollMonth] = useState<number>(new Date().getMonth() + 1);
  const [payrollYear, setPayrollYear] = useState<number>(new Date().getFullYear());
  const [employeeDetails, setEmployeeDetails] = useState<any>(null);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);
  const [editRecordId, setEditRecordId] = useState<number | null>(null);
  
  // Period & Formulas Live calculations
  const [inputs, setInputs] = useState<Record<string, any>>({
    basic: 0, hra: 0, lta: 0, other_allowance: 0,
    no_of_days: 31, days_payable: 31,
    attendance_bonus: 0, odw: 0, internet_charges: 0,
    vpf: 0, salary_advance: 0, tds: 0, lwf: 0, pt: 0, other_deduction: 0,
    pf_0_01: 0
  });
  const [overrides, setOverrides] = useState<Record<string, any>>({});
  const [bankDetails, setBankDetails] = useState({
    account_number: "", ifsc_code: "", branch_code: ""
  });
  const [payrollPeriod, setPayrollPeriod] = useState({
    start: "", end: ""
  });

  // Modals / View modes
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewRecord, setViewRecord] = useState<any>(null);
  
  // Custom delete confirmation modal state
  const [deleteRecordId, setDeleteRecordId] = useState<number | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  // Fetch all processed payroll records
  const fetchSummaryList = useCallback(async () => {
    setIsSummaryLoading(true);
    try {
      const res = await axios.get<{ success: boolean; data: PayrollSummaryRecord[] }>(
        `${BASE_URL}/payroll?month=${summaryFilterMonth}&year=${summaryFilterYear}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      setSummaryList(res.data.data || []);
    } catch (err) {
      toast.error("Failed to load processed payrolls");
    } finally {
      setIsSummaryLoading(false);
    }
  }, [summaryFilterMonth, summaryFilterYear]);

  // Fetch employees list
  const fetchEmployeesList = async () => {
    try {
      const res = await axios.get<any[]>(`${BASE_URL}/employees/`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      // Filter out admins or keep all active
      const list = res.data.filter((e: any) => e.status !== "Inactive");
      list.sort((a: any, b: any) => {
        const nameA = `${a.first_name || ""} ${a.last_name || ""}`.trim().toLowerCase();
        const nameB = `${b.first_name || ""} ${b.last_name || ""}`.trim().toLowerCase();
        return nameA.localeCompare(nameB);
      });
      setEmployees(list);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchSummaryList();
  }, [fetchSummaryList]);

  useEffect(() => {
    fetchEmployeesList();
  }, []);

  // Compute live calculations
  const liveCalcs = useMemo(() => {
    return calculatePayrollFrontend(inputs, overrides);
  }, [inputs, overrides]);

  // Fetch specific employee attendance/details
  const handleEmployeeSelect = async (empId: string, monthVal = payrollMonth, yearVal = payrollYear) => {
    if (!empId) {
      setEmployeeDetails(null);
      setEditRecordId(null);
      return;
    }
    setIsDetailsLoading(true);
    setEditRecordId(null);
    try {
      const res = await axios.get<any>(
        `${BASE_URL}/payroll/employee/${empId}/attendance?month=${monthVal}&year=${yearVal}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      
      const payload = res.data;
      setPayrollPeriod({
        start: payload.period_start,
        end: payload.period_end
      });

      if (payload.exists) {
        // Load saved payroll record
        const rec = payload.record;
        setEditRecordId(rec.id);
        setEmployeeDetails(payload.employee);
        
        // set inputs
        setInputs({
          basic: rec.basic,
          hra: rec.hra,
          lta: rec.lta,
          other_allowance: rec.other_allowance,
          no_of_days: rec.no_of_days,
          days_payable: rec.days_payable,
          attendance_bonus: rec.attendance_bonus,
          odw: rec.odw,
          internet_charges: rec.internet_charges,
          vpf: rec.vpf,
          salary_advance: rec.salary_advance,
          tds: rec.tds,
          lwf: rec.lwf,
          pt: rec.pt,
          other_deduction: rec.other_deduction,
          pf_0_01: rec.pf_0_01
        });
        
        setOverrides(rec.overrides || {});
        setBankDetails({
          account_number: rec.account_number || "",
          ifsc_code: rec.ifsc_code || "",
          branch_code: rec.branch_code || ""
        });
        
        toast.success("Loaded saved payroll record.");
      } else {
        // Initialize defaults
        setEmployeeDetails(payload.employee);
        setInputs({
          basic: payload.calculations.basic || 0,
          hra: payload.calculations.hra || 0,
          lta: payload.calculations.lta || 0,
          other_allowance: payload.calculations.other_allowance || 0,
          no_of_days: payload.no_of_days,
          days_payable: payload.days_payable,
          attendance_bonus: 0,
          odw: 0,
          internet_charges: 0,
          vpf: 0,
          salary_advance: 0,
          tds: 0,
          lwf: 0,
          pt: 0,
          other_deduction: 0,
          pf_0_01: 0
        });
        setOverrides({});
        setBankDetails({
          account_number: payload.employee.account_number || "",
          ifsc_code: payload.employee.ifsc_code || "",
          branch_code: payload.employee.branch_code || ""
        });
        toast.success("Fetched attendance. Loaded default calculations.");
      }
    } catch (err) {
      toast.error("Failed to load employee details.");
    } finally {
      setIsDetailsLoading(false);
    }
  };

  // Base field change handler
  const handleInputChange = (field: string, val: string) => {
    const num = parseFloat(val) || 0;
    setInputs(prev => ({
      ...prev,
      [field]: num
    }));
  };

  // Overridden field change handler
  const handleOverrideChange = (field: string, val: string) => {
    const num = parseFloat(val) || 0.0;
    setOverrides(prev => ({
      ...prev,
      [field]: {
        is_overridden: true,
        manual_value: num,
        calculated_value: liveCalcs[field]?.calculated_value || 0
      }
    }));
  };

  // Reset override handler
  const handleResetOverride = (field: string) => {
    setOverrides(prev => {
      const copy = { ...prev };
      delete copy[field];
      return copy;
    });
  };

  // Save / Update record handler
  const handleSavePayroll = async () => {
    if (!selectedEmployeeId) {
      toast.error("Please select an employee.");
      return;
    }
    
    // Validate inputs
    if (inputs.basic < 0 || inputs.hra < 0 || inputs.lta < 0 || inputs.other_allowance < 0) {
      toast.error("Salary components cannot be negative.");
      return;
    }
    if (inputs.days_payable > inputs.no_of_days) {
      toast.error("Days payable cannot exceed number of days.");
      return;
    }

    try {
      const payload = {
        employee_id: parseInt(selectedEmployeeId),
        payroll_period_start: payrollPeriod.start,
        payroll_period_end: payrollPeriod.end,
        payroll_month: payrollMonth,
        payroll_year: payrollYear,
        account_number: bankDetails.account_number,
        ifsc_code: bankDetails.ifsc_code,
        branch_code: bankDetails.branch_code,
        payment_status: editRecordId ? undefined : "Pending", // preserve status on edit, or handle explicitly
        inputs,
        overrides
      };

      if (editRecordId) {
        // Update existing
        await axios.put(`${BASE_URL}/payroll/${editRecordId}`, payload, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        });
        toast.success("Payroll record updated successfully!");
      } else {
        // Save new
        await axios.post(`${BASE_URL}/payroll`, payload, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        });
        toast.success("Payroll record processed and saved!");
      }
      
      // Reset form and return to summary
      setSelectedEmployeeId("");
      setEmployeeDetails(null);
      setEditRecordId(null);
      fetchSummaryList();
      setActiveTab("summary");
    } catch (err: any) {
      const msg = err.response?.data?.error || "Failed to save payroll record.";
      toast.error(msg);
    }
  };

  const handleEditRecordClick = async (rec: PayrollSummaryRecord) => {
    setSelectedEmployeeId(String(rec.real_employee_id));
    setPayrollMonth(rec.payroll_month);
    setPayrollYear(rec.payroll_year);
    setActiveTab("process");
    await handleEmployeeSelect(String(rec.real_employee_id), rec.payroll_month, rec.payroll_year);
  };

  const handleDeleteClick = (recordId: number) => {
    setDeleteRecordId(recordId);
    setIsDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteRecordId) return;
    try {
      await axios.delete(`${BASE_URL}/payroll/${deleteRecordId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      toast.success("Payroll record deleted.");
      fetchSummaryList();
    } catch (err) {
      toast.error("Failed to delete record.");
    } finally {
      setIsDeleteConfirmOpen(false);
      setDeleteRecordId(null);
    }
  };

  const handleSetupEmployeeChange = async (empId: string) => {
    setSetupEmployeeId(empId);
    if (!empId) {
      setSetupInputs({
        basic: 0,
        hra: 0,
        lta: 0,
        other_allowance: 0,
        bank_name: "",
        account_number: "",
        ifsc_code: "",
        branch_code: ""
      });
      return;
    }
    setIsSetupLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get<any>(`${BASE_URL}/employees/${empId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = res.data;
      setSetupInputs({
        basic: data.basic || 0,
        hra: data.hra || 0,
        lta: data.lta || 0,
        other_allowance: data.other_allowance || 0,
        bank_name: data.bank_name || "",
        account_number: data.account_number || "",
        ifsc_code: data.ifsc_code || "",
        branch_code: data.branch_code || ""
      });
    } catch (err) {
      toast.error("Failed to load employee setup profile.");
    } finally {
      setIsSetupLoading(false);
    }
  };

  const handleSaveSetup = async () => {
    if (!setupEmployeeId) {
      toast.error("Please select an employee first.");
      return;
    }
    setIsSetupSaving(true);
    try {
      const token = localStorage.getItem("token");
      const payload = new FormData();
      payload.append("basic", setupInputs.basic.toString());
      payload.append("hra", setupInputs.hra.toString());
      payload.append("lta", setupInputs.lta.toString());
      payload.append("other_allowance", setupInputs.other_allowance.toString());
      payload.append("bank_name", setupInputs.bank_name);
      payload.append("account_number", setupInputs.account_number);
      payload.append("ifsc_code", setupInputs.ifsc_code);
      payload.append("branch_code", setupInputs.branch_code);

      await axios.patch(`${BASE_URL}/employees/${setupEmployeeId}`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Salary & Bank Setup saved successfully!");
      fetchEmployeesList();
    } catch (err) {
      toast.error("Failed to save Setup details.");
    } finally {
      setIsSetupSaving(false);
    }
  };

  const handleMarkPaid = async (employeeId: number) => {
    try {
      await axios.put(`${BASE_URL}/payroll/mark-paid/${employeeId}`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      toast.success("Marked salary as paid.");
      fetchSummaryList();
    } catch (err) {
      toast.error("Failed to mark salary paid.");
    }
  };

  const handleViewRecordDetails = async (rec: PayrollSummaryRecord) => {
    try {
      const res = await axios.get<any>(`${BASE_URL}/payroll/record/${rec.id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      setViewRecord(res.data);
      setShowViewModal(true);
    } catch (err) {
      toast.error("Failed to load details");
    }
  };

  const downloadPayslip = (employeeId: number | string, month: number, year: number) => {
    window.location.href = `${BASE_URL}/payroll/payslip/${employeeId}?month=${month}&year=${year}&token=${localStorage.getItem("token")}`;
  };

  const exportPayrollExcel = () => {
    window.location.href = `${BASE_URL}/attendance/export-paysheet?month=${summaryFilterMonth}&year=${summaryFilterYear}&token=${localStorage.getItem("token")}`;
  };

  const renderInputField = (label: string, fieldName: string, isCalculated = false, min = 0, readOnly = false) => {
    const fieldData = liveCalcs[fieldName];
    const isOverridden = fieldData?.is_overridden;
    const value = isOverridden ? fieldData.manual_value : (fieldData?.calculated_value ?? inputs[fieldName] ?? 0);

    return (
      <div className="bg-white border border-neutral-200 rounded-lg p-3 shadow-sm relative flex flex-col justify-between h-24">
        <div className="flex justify-between items-start">
          <span className="text-[11px] text-neutral-500 font-semibold uppercase tracking-wider">{label}</span>
          {isOverridden && !readOnly && (
            <Badge variant="warning" size="sm">Override</Badge>
          )}
        </div>
        
        <div className="flex items-center gap-1.5 mt-2">
          {readOnly ? (
            <input
              type="text"
              readOnly
              disabled
              value={fieldName === "gross_salary" ? `₹${(value || 0).toLocaleString()}` : value}
              className="w-full border border-neutral-200 text-neutral-500 bg-neutral-50 text-sm rounded px-2.5 py-1.5 cursor-not-allowed font-semibold focus:outline-none"
              aria-label={`${label} (Read Only)`}
            />
          ) : isCalculated ? (
            <div className="flex-1 flex items-center">
              <input
                type="number"
                value={value}
                onChange={(e) => handleOverrideChange(fieldName, e.target.value)}
                className="w-full bg-neutral-50 border border-neutral-300 text-neutral-800 text-sm rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-black font-semibold"
                aria-label={`Override manual input for ${label}`}
              />
            </div>
          ) : (
            <input
              type="number"
              min={min}
              value={inputs[fieldName] ?? ""}
              onChange={(e) => handleInputChange(fieldName, e.target.value)}
              className="w-full border border-neutral-300 text-neutral-800 text-sm rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-black font-medium"
              aria-label={`Enter base input value for ${label}`}
            />
          )}
          
          {isCalculated && isOverridden && !readOnly && (
            <button
              onClick={() => handleResetOverride(fieldName)}
              title="Reset to Calculated"
              className="p-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded"
            >
              <ArrowPathIcon className="w-4 h-4" />
            </button>
          )}
        </div>
        
        {isCalculated && (
          <span className="text-[10px] text-neutral-400 mt-1 font-mono">
            Calculated: ₹{(fieldData?.calculated_value ?? 0).toLocaleString()}
          </span>
        )}
      </div>
    );
  };

  const columns: Column<PayrollSummaryRecord>[] = [
    {
      key: "employee_name",
      header: "Employee",
      render: (rec) => (
        <div>
          <button
            onClick={() => handleViewRecordDetails(rec)}
            className="text-black font-bold hover:underline text-xs"
          >
            {rec.employee_name}
          </button>
          <div className="text-[10px] text-neutral-400 font-mono mt-0.5">{rec.employee_id}</div>
        </div>
      )
    },
    {
      key: "payroll_period",
      header: "Payroll Period",
      render: (rec) => (
        <span className="text-neutral-600 text-xs font-medium">{rec.payroll_period}</span>
      )
    },
    {
      key: "gross_salary",
      header: "Gross",
      render: (rec) => <span className="text-neutral-700 text-xs font-mono">₹{rec.gross_salary.toLocaleString()}</span>
    },
    {
      key: "gross_earned_salary",
      header: "Earned Gross",
      render: (rec) => <span className="text-neutral-700 text-xs font-mono">₹{rec.gross_earned_salary.toLocaleString()}</span>
    },
    {
      key: "total_deduction",
      header: "Deduction",
      render: (rec) => <span className="text-danger-600 text-xs font-mono">₹{rec.total_deduction.toLocaleString()}</span>
    },
    {
      key: "net_transfer",
      header: "Net Pay",
      render: (rec) => <span className="text-success-600 text-xs font-bold font-mono">₹{rec.net_transfer.toLocaleString()}</span>
    },
    {
      key: "actual_monthly_ctc",
      header: "CTC",
      render: (rec) => <span className="text-neutral-700 text-xs font-mono">₹{rec.actual_monthly_ctc.toLocaleString()}</span>
    },
    {
      key: "earned_monthly_ctc",
      header: "Earned CTC",
      render: (rec) => <span className="text-neutral-700 text-xs font-mono">₹{rec.earned_monthly_ctc.toLocaleString()}</span>
    },
    {
      key: "payment_status",
      header: "Status",
      render: (rec) => (
        <Badge variant={rec.payment_status === "Paid" ? "success" : "warning"} size="sm">
          {rec.payment_status}
        </Badge>
      )
    },
    {
      key: "actions",
      header: "Actions",
      render: (rec) => (
        <div className="flex gap-1.5">
          <Button
            onClick={() => handleViewRecordDetails(rec)}
            variant="outline"
            size="sm"
            icon={EyeIcon}
            title="View Details"
          >
            {""}
          </Button>
          <Button
            onClick={() => handleEditRecordClick(rec)}
            variant="outline"
            size="sm"
            icon={PencilIcon}
            title="Edit Payroll"
          >
            {""}
          </Button>
          <Button
            onClick={() => handleDeleteClick(rec.id)}
            variant="outline"
            size="sm"
            icon={TrashIcon}
            className="text-danger-600 border-danger-200 hover:bg-danger-50"
            title="Delete Payroll"
          >
            {""}
          </Button>
          {rec.payment_status === "Pending" ? (
            <Button
              onClick={() => handleMarkPaid(rec.real_employee_id)}
              variant="success"
              size="sm"
              icon={CreditCardIcon}
              title="Mark Paid"
            >
              Pay
            </Button>
          ) : (
            <Button
              onClick={() => downloadPayslip(rec.real_employee_id, rec.payroll_month, rec.payroll_year)}
              variant="primary"
              size="sm"
              icon={ArrowDownTrayIcon}
              title="Download Payslip"
            >
              Payslip
            </Button>
          )}
        </div>
      )
    }
  ];

  const renderSalaryBankSetupTab = () => {
    const grossSetup = (Number(setupInputs.basic) || 0) + 
                       (Number(setupInputs.hra) || 0) + 
                       (Number(setupInputs.lta) || 0) + 
                       (Number(setupInputs.other_allowance) || 0);

    return (
      <div>
        {/* Setup Selector */}
        <div className="p-5 bg-white border-b border-neutral-200">
          <div className="max-w-xs">
            <label className="text-xs font-bold text-neutral-600 block mb-1">Select Employee</label>
            <select
              value={setupEmployeeId}
              onChange={(e) => handleSetupEmployeeChange(e.target.value)}
              className="border border-neutral-300 rounded p-2 text-sm w-full bg-white font-medium focus:ring-1 focus:ring-black focus:outline-none"
            >
              <option value="">-- Choose Employee --</option>
              {employees.map(e => (
                <option key={e.id} value={e.id}>{e.first_name} {e.last_name} ({e.employee_id})</option>
              ))}
            </select>
          </div>
        </div>

        {isSetupLoading ? (
          <div className="p-12 flex justify-center"><Spinner size="md" label="Loading employee salary & bank setup..." /></div>
        ) : !setupEmployeeId ? (
          <EmptyState title="No Employee Selected" description="Please select an employee from above to configure their standard salary structure and bank details." />
        ) : (
          <div className="p-6 bg-neutral-50 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Card 1: Salary Structure */}
              <div className="bg-white rounded-lg border border-neutral-200 shadow-sm p-4">
                <h3 className="text-sm font-bold text-neutral-800 mb-3 flex items-center gap-2 border-b pb-2">
                  <BriefcaseIcon className="w-5 h-5 text-neutral-700" />
                  Section 2 – Salary Structure Setup
                </h3>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-[10px] font-bold text-neutral-500 block uppercase tracking-wider mb-1">Basic</label>
                    <input
                      type="number"
                      value={setupInputs.basic || ""}
                      onChange={(e) => setSetupInputs(prev => ({ ...prev, basic: parseFloat(e.target.value) || 0 }))}
                      className="border border-neutral-300 rounded px-2.5 py-1.5 w-full text-sm font-medium focus:ring-1 focus:ring-black focus:outline-none font-semibold text-neutral-800"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-neutral-500 block uppercase tracking-wider mb-1">HRA</label>
                    <input
                      type="number"
                      value={setupInputs.hra || ""}
                      onChange={(e) => setSetupInputs(prev => ({ ...prev, hra: parseFloat(e.target.value) || 0 }))}
                      className="border border-neutral-300 rounded px-2.5 py-1.5 w-full text-sm font-medium focus:ring-1 focus:ring-black focus:outline-none font-semibold text-neutral-800"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-neutral-500 block uppercase tracking-wider mb-1">LTA</label>
                    <input
                      type="number"
                      value={setupInputs.lta || ""}
                      onChange={(e) => setSetupInputs(prev => ({ ...prev, lta: parseFloat(e.target.value) || 0 }))}
                      className="border border-neutral-300 rounded px-2.5 py-1.5 w-full text-sm font-medium focus:ring-1 focus:ring-black focus:outline-none font-semibold text-neutral-800"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-neutral-500 block uppercase tracking-wider mb-1">Other Allowance</label>
                    <input
                      type="number"
                      value={setupInputs.other_allowance || ""}
                      onChange={(e) => setSetupInputs(prev => ({ ...prev, other_allowance: parseFloat(e.target.value) || 0 }))}
                      className="border border-neutral-300 rounded px-2.5 py-1.5 w-full text-sm font-medium focus:ring-1 focus:ring-black focus:outline-none font-semibold text-neutral-800"
                    />
                  </div>
                  
                  <div className="col-span-2 mt-2">
                    <label className="text-[10px] font-bold text-neutral-500 block uppercase tracking-wider mb-1">Gross Salary (Auto calculated)</label>
                    <input
                      type="text"
                      disabled
                      value={`₹${grossSetup.toLocaleString()}`}
                      className="border border-neutral-200 bg-neutral-50 rounded px-2.5 py-1.5 w-full text-sm font-bold text-neutral-700 cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              {/* Card 2: Bank Details */}
              <div className="bg-white rounded-lg border border-neutral-200 shadow-sm p-4">
                <h3 className="text-sm font-bold text-neutral-800 mb-3 flex items-center gap-2 border-b pb-2">
                  <BanknotesIcon className="w-5 h-5 text-neutral-700" />
                  Section 7 – Bank Details Setup
                </h3>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-[10px] font-bold text-neutral-500 block uppercase tracking-wider mb-1">Bank Name</label>
                    <input
                      type="text"
                      value={setupInputs.bank_name}
                      onChange={(e) => setSetupInputs(prev => ({ ...prev, bank_name: e.target.value }))}
                      className="border border-neutral-300 rounded px-2.5 py-1.5 w-full text-sm font-semibold text-neutral-800 focus:ring-1 focus:ring-black focus:outline-none"
                      placeholder="e.g. State Bank of India"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-neutral-500 block uppercase tracking-wider mb-1">Account Number</label>
                    <input
                      type="text"
                      value={setupInputs.account_number}
                      onChange={(e) => setSetupInputs(prev => ({ ...prev, account_number: e.target.value }))}
                      className="border border-neutral-300 rounded px-2.5 py-1.5 w-full text-sm font-semibold text-neutral-800 focus:ring-1 focus:ring-black focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-neutral-500 block uppercase tracking-wider mb-1">IFSC Code</label>
                    <input
                      type="text"
                      value={setupInputs.ifsc_code}
                      onChange={(e) => setSetupInputs(prev => ({ ...prev, ifsc_code: e.target.value }))}
                      className="border border-neutral-300 rounded px-2.5 py-1.5 w-full text-sm font-semibold text-neutral-800 focus:ring-1 focus:ring-black focus:outline-none"
                      placeholder="e.g. SBIN0001234"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-neutral-500 block uppercase tracking-wider mb-1">Branch Code</label>
                    <input
                      type="text"
                      value={setupInputs.branch_code}
                      onChange={(e) => setSetupInputs(prev => ({ ...prev, branch_code: e.target.value }))}
                      className="border border-neutral-300 rounded px-2.5 py-1.5 w-full text-sm font-semibold text-neutral-800 focus:ring-1 focus:ring-black focus:outline-none"
                    />
                  </div>
                </div>
              </div>

            </div>

            <div className="flex justify-end gap-2 border-t pt-4">
              <Button
                onClick={handleSaveSetup}
                variant="primary"
                disabled={isSetupSaving}
              >
                {isSetupSaving ? "Saving Setup..." : "Save Salary & Bank Details"}
              </Button>
            </div>
          </div>
        )}

        {/* Configured employee list */}
        <div className="mt-8 border-t border-neutral-200 pt-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div>
              <h3 className="text-base font-bold text-neutral-800 flex items-center gap-2">
                <UserCircleIcon className="w-5 h-5 text-neutral-700" />
                Employee Configurations Directory
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">Overview of configured salary templates and bank details for active employees.</p>
            </div>
            
            <div className="max-w-xs w-full flex items-center gap-2 bg-white border border-neutral-300 rounded px-2.5 py-1.5 focus-within:ring-1 focus-within:ring-black">
              <MagnifyingGlassIcon className="w-4 h-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Search employee or ID..."
                value={setupSearchQuery}
                onChange={(e) => setSetupSearchQuery(e.target.value)}
                className="w-full text-xs font-medium focus:outline-none border-none p-0 bg-transparent text-neutral-800"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto bg-white rounded-lg border border-neutral-200 shadow-sm">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-bold uppercase text-[10px] tracking-wider">
                  <th className="p-3">Employee</th>
                  <th className="p-3 text-right">Basic</th>
                  <th className="p-3 text-right">HRA</th>
                  <th className="p-3 text-right">LTA</th>
                  <th className="p-3 text-right">Other</th>
                  <th className="p-3 text-right">Gross Salary</th>
                  <th className="p-3">Bank Details</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 font-medium text-neutral-700">
                {employees
                  .filter(emp => {
                    const search = setupSearchQuery.toLowerCase();
                    const fullName = `${emp.first_name || ""} ${emp.last_name || ""}`.toLowerCase();
                    const empId = (emp.employee_id || "").toLowerCase();
                    return fullName.includes(search) || empId.includes(search);
                  })
                  .map(emp => {
                    const isConfigured = Number(emp.basic) > 0 || !!emp.bank_name;
                    const gross = (Number(emp.basic) || 0) + 
                                  (Number(emp.hra) || 0) + 
                                  (Number(emp.lta) || 0) + 
                                  (Number(emp.other_allowance) || 0);

                    return (
                      <tr key={emp.id} className="hover:bg-neutral-50 transition-colors">
                        <td className="p-3">
                          <div className="font-bold text-neutral-900">{emp.first_name} {emp.last_name}</div>
                          <div className="text-[10px] text-neutral-400 font-mono">{emp.employee_id}</div>
                        </td>
                        <td className="p-3 text-right font-mono text-neutral-600">₹{(Number(emp.basic) || 0).toLocaleString()}</td>
                        <td className="p-3 text-right font-mono text-neutral-600">₹{(Number(emp.hra) || 0).toLocaleString()}</td>
                        <td className="p-3 text-right font-mono text-neutral-600">₹{(Number(emp.lta) || 0).toLocaleString()}</td>
                        <td className="p-3 text-right font-mono text-neutral-600">₹{(Number(emp.other_allowance) || 0).toLocaleString()}</td>
                        <td className="p-3 text-right font-mono font-bold text-neutral-900">₹{gross.toLocaleString()}</td>
                        <td className="p-3">
                          {emp.bank_name ? (
                            <div>
                              <div className="font-semibold text-neutral-800 text-[11px]">{emp.bank_name}</div>
                              <div className="text-[10px] text-neutral-500 font-mono">A/C: {emp.account_number}</div>
                            </div>
                          ) : (
                            <span className="text-neutral-400 italic">No bank setup</span>
                          )}
                        </td>
                        <td className="p-3">
                          {isConfigured ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-success-50 text-success-700 border border-success-200">
                              Configured
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 text-neutral-500 border border-neutral-200">
                              Not Setup
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <Button
                            onClick={() => {
                              handleSetupEmployeeChange(String(emp.id));
                              window.scrollTo({ top: 0, behavior: "smooth" });
                            }}
                            variant="outline"
                            size="sm"
                            icon={PencilIcon}
                            title="Edit Setup"
                          >
                            Edit
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 bg-neutral-50 min-h-screen">
      <Card padding="none" className="mb-6">
        <div className="p-4 border-b border-neutral-200 flex justify-between items-center bg-white rounded-t-lg">
          <div className="flex items-center gap-3">
            <CalculatorIcon className="w-6 h-6 text-black" />
            <h2 className="text-xl font-bold text-neutral-800">Payroll Management</h2>
          </div>
          
          <div className="flex gap-2">
            <Button
              onClick={() => {
                setActiveTab("summary");
                fetchSummaryList();
              }}
              variant={activeTab === "summary" ? "primary" : "outline"}
              size="sm"
            >
              Payroll Summary
            </Button>
            <Button
              onClick={() => setActiveTab("process")}
              variant={activeTab === "process" ? "primary" : "outline"}
              size="sm"
            >
              Process Payroll
            </Button>
            <Button
              onClick={() => setActiveTab("salary_bank")}
              variant={activeTab === "salary_bank" ? "primary" : "outline"}
              size="sm"
            >
              Salary & Bank Setup
            </Button>
            <Button
              onClick={exportPayrollExcel}
              variant="outline"
              size="sm"
              icon={ArrowDownTrayIcon}
            >
              Export Excel
            </Button>
          </div>
        </div>

        {activeTab === "summary" ? (
          <div>
            {/* View 1 - Summary Filters */}
            <div className="p-4 bg-white border-b border-neutral-200 flex gap-4 items-center">
              <div>
                <label className="text-xs font-semibold text-neutral-500 block mb-1">Payroll Month</label>
                <select
                  value={summaryFilterMonth}
                  onChange={(e) => setSummaryFilterMonth(parseInt(e.target.value))}
                  className="border border-neutral-300 rounded p-1.5 text-sm bg-white font-medium"
                >
                  {MONTHS.map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-500 block mb-1">Payroll Year</label>
                <select
                  value={summaryFilterYear}
                  onChange={(e) => setSummaryFilterYear(parseInt(e.target.value))}
                  className="border border-neutral-300 rounded p-1.5 text-sm bg-white font-medium"
                >
                  {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              
              <Button onClick={fetchSummaryList} variant="outline" size="sm" className="self-end mb-0.5">
                Apply Filters
              </Button>
            </div>

            {isSummaryLoading ? (
              <div className="p-12 flex justify-center"><Spinner size="md" label="Loading processed payrolls..." /></div>
            ) : summaryList.length === 0 ? (
              <EmptyState title="No payroll records found for this period." description="Select another period or switch to 'Process Payroll' to calculate payroll." />
            ) : (
              <Table columns={columns} data={summaryList} rowKey={(rec) => rec.id} />
            )}
          </div>
        ) : activeTab === "process" ? (
          <div>
            {/* View 2 - Process Payroll Selector */}
            <div className="p-5 bg-white border-b border-neutral-200 grid grid-cols-4 gap-4 items-center">
              <div>
                <label className="text-xs font-bold text-neutral-600 block mb-1">Select Employee</label>
                <select
                  value={selectedEmployeeId}
                  onChange={(e) => {
                    setSelectedEmployeeId(e.target.value);
                    handleEmployeeSelect(e.target.value);
                  }}
                  className="border border-neutral-300 rounded p-2 text-sm w-full bg-white font-medium focus:ring-1 focus:ring-black focus:outline-none"
                >
                  <option value="">-- Choose Employee --</option>
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>{e.first_name} {e.last_name} ({e.employee_id})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-600 block mb-1">Payroll Month</label>
                <select
                  value={payrollMonth}
                  onChange={(e) => {
                    const m = parseInt(e.target.value);
                    setPayrollMonth(m);
                    handleEmployeeSelect(selectedEmployeeId, m, payrollYear);
                  }}
                  className="border border-neutral-300 rounded p-2 text-sm w-full bg-white font-medium focus:ring-1 focus:ring-black focus:outline-none"
                >
                  {MONTHS.map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-600 block mb-1">Payroll Year</label>
                <select
                  value={payrollYear}
                  onChange={(e) => {
                    const y = parseInt(e.target.value);
                    setPayrollYear(y);
                    handleEmployeeSelect(selectedEmployeeId, payrollMonth, y);
                  }}
                  className="border border-neutral-300 rounded p-2 text-sm w-full bg-white font-medium focus:ring-1 focus:ring-black focus:outline-none"
                >
                  {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>

            {isDetailsLoading ? (
              <div className="p-12 flex justify-center"><Spinner size="md" label="Loading employee & attendance data..." /></div>
            ) : !employeeDetails ? (
              <EmptyState title="No Employee Selected" description="Please select an employee and payroll period from above to load details." />
            ) : (
              <div className="p-6 bg-neutral-50 space-y-6">
                
                {/* Section 1 – Employee Information */}
                <div className="bg-white rounded-lg border border-neutral-200 shadow-sm p-4">
                  <h3 className="text-sm font-bold text-neutral-800 mb-3 flex items-center gap-2 border-b pb-2">
                    <UserCircleIcon className="w-5 h-5 text-neutral-700" />
                    Section 1 – Employee Information
                  </h3>
                  <div className="grid grid-cols-4 gap-4 text-xs">
                    <div>
                      <span className="text-neutral-500 font-semibold block uppercase">Employee ID</span>
                      <span className="font-bold text-neutral-800 text-sm mt-0.5 block">{employeeDetails.employee_id}</span>
                    </div>
                    <div>
                      <span className="text-neutral-500 font-semibold block uppercase">Employee Name</span>
                      <span className="font-bold text-neutral-800 text-sm mt-0.5 block">{employeeDetails.name}</span>
                    </div>
                    <div>
                      <span className="text-neutral-500 font-semibold block uppercase">Department</span>
                      <span className="font-bold text-neutral-800 text-sm mt-0.5 block">{employeeDetails.department || "-"}</span>
                    </div>
                    <div>
                      <span className="text-neutral-500 font-semibold block uppercase">Designation</span>
                      <span className="font-bold text-neutral-800 text-sm mt-0.5 block">{employeeDetails.designation || "-"}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-neutral-500 font-semibold block uppercase">Payroll Period</span>
                      <span className="font-mono text-sm mt-0.5 block bg-neutral-50 px-2 py-1 rounded border inline-block">
                        {formatDateStr(payrollPeriod.start)} to {formatDateStr(payrollPeriod.end)}
                      </span>
                    </div>
                    <div>
                      <span className="text-neutral-500 font-semibold block uppercase">No. of Days</span>
                      <span className="font-bold text-neutral-800 text-sm mt-0.5 block">{inputs.no_of_days}</span>
                    </div>
                    
                    {/* Days Payable is editable */}
                    <div className="bg-neutral-50 p-2 rounded border border-neutral-200">
                      <label className="text-[10px] font-bold text-neutral-500 block uppercase tracking-wider mb-1">Days Payable</label>
                      <input
                        type="number"
                        max={inputs.no_of_days}
                        value={inputs.days_payable}
                        onChange={(e) => handleInputChange("days_payable", e.target.value)}
                        className="border border-neutral-300 rounded px-2 py-0.5 text-xs font-bold w-full"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  {/* Section 2 – Salary Structure */}
                  <div className="bg-white rounded-lg border border-neutral-200 shadow-sm p-4 relative">
                    <h3 className="text-sm font-bold text-neutral-800 mb-3 flex items-center gap-2 border-b pb-2">
                      <BriefcaseIcon className="w-5 h-5 text-neutral-700" />
                      Section 2 – Salary Structure
                    </h3>
                    <div className="absolute top-4 right-4 text-[10px] text-neutral-400 font-semibold italic bg-neutral-50 px-2 py-0.5 rounded border">
                      Configured in Setup Tab (Read-Only)
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {renderInputField("Basic", "basic", false, 0, true)}
                      {renderInputField("HRA", "hra", false, 0, true)}
                      {renderInputField("LTA", "lta", false, 0, true)}
                      {renderInputField("Other Allowance", "other_allowance", false, 0, true)}
                      
                      <div className="col-span-2 mt-2">
                        {renderInputField("Gross Salary", "gross_salary", true, 0, true)}
                      </div>
                    </div>
                  </div>

                  {/* Section 7 – Bank Details */}
                  <div className="bg-white rounded-lg border border-neutral-200 shadow-sm p-4 h-fit relative">
                    <h3 className="text-sm font-bold text-neutral-800 mb-3 flex items-center gap-2 border-b pb-2">
                      <BanknotesIcon className="w-5 h-5 text-neutral-700" />
                      Section 7 – Bank Details
                    </h3>
                    <div className="absolute top-4 right-4 text-[10px] text-neutral-400 font-semibold italic bg-neutral-50 px-2 py-0.5 rounded border">
                      Configured in Setup Tab (Read-Only)
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <label className="text-[10px] font-bold text-neutral-500 block uppercase tracking-wider mb-1">Account Number</label>
                        <input
                          type="text"
                          disabled
                          readOnly
                          value={bankDetails.account_number}
                          className="border border-neutral-200 bg-neutral-50 text-neutral-500 rounded px-2.5 py-1.5 w-full text-sm font-semibold cursor-not-allowed focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-neutral-500 block uppercase tracking-wider mb-1">IFSC Code</label>
                        <input
                          type="text"
                          disabled
                          readOnly
                          value={bankDetails.ifsc_code}
                          className="border border-neutral-200 bg-neutral-50 text-neutral-500 rounded px-2.5 py-1.5 w-full text-sm font-semibold cursor-not-allowed focus:outline-none"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="text-[10px] font-bold text-neutral-500 block uppercase tracking-wider mb-1">Branch Code</label>
                        <input
                          type="text"
                          disabled
                          readOnly
                          value={bankDetails.branch_code}
                          className="border border-neutral-200 bg-neutral-50 text-neutral-500 rounded px-2.5 py-1.5 w-full text-sm font-semibold cursor-not-allowed focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 3 – Earned Salary */}
                <div className="bg-white rounded-lg border border-neutral-200 shadow-sm p-4">
                  <h3 className="text-sm font-bold text-neutral-800 mb-3 flex items-center gap-2 border-b pb-2">
                    <CheckCircleIcon className="w-5 h-5 text-neutral-700" />
                    Section 3 – Earned Salary
                  </h3>
                  <div className="grid grid-cols-5 gap-3">
                    {renderInputField("Earned Basic", "earned_basic", true)}
                    {renderInputField("Earned HRA", "earned_hra", true)}
                    {renderInputField("Earned LTA", "earned_lta", true)}
                    {renderInputField("Earned Other Allowance", "earned_other_allowance", true)}
                    {renderInputField("Earned Actual Gross", "earned_actual_gross", true)}
                    
                    {renderInputField("Attendance Bonus", "attendance_bonus", false)}
                    {renderInputField("ODW", "odw", false)}
                    {renderInputField("Total Additions", "total", true)}
                    {renderInputField("Internet Charges", "internet_charges", false)}
                    
                    <div className="col-span-5 bg-neutral-50 border border-neutral-200 rounded p-2.5 flex justify-between items-center mt-2">
                      <span className="text-xs font-bold text-neutral-600 uppercase">Gross Earned Salary:</span>
                      <span className="text-lg font-mono font-bold text-black">
                        ₹{(liveCalcs.gross_earned_salary?.final_value ?? 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  {/* Section 4 – Employee Deductions */}
                  <div className="bg-white rounded-lg border border-neutral-200 shadow-sm p-4">
                    <h3 className="text-sm font-bold text-neutral-800 mb-3 flex items-center gap-2 border-b pb-2">
                      <ExclamationTriangleIcon className="w-5 h-5 text-neutral-700" />
                      Section 4 – Employee Deductions
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {renderInputField("Earned PF Wages", "earned_pf_wages", true)}
                      {renderInputField("PF DED Employee", "pf_ded_employee", true)}
                      {renderInputField("VPF", "vpf", false)}
                      {renderInputField("PF & VPF DED Employee", "pf_vpf_ded_employee", true)}
                      {renderInputField("ESI DED Employee", "esi_ded_employee", true)}
                      
                      {renderInputField("Salary Advance", "salary_advance", false)}
                      {renderInputField("TDS", "tds", false)}
                      {renderInputField("LWF", "lwf", false)}
                      {renderInputField("PT", "pt", false)}
                      {renderInputField("Other Deduction", "other_deduction", false)}
                      
                      <div className="col-span-2 border-t pt-2 mt-2">
                        {renderInputField("Total Deduction", "total_deduction", true)}
                      </div>
                    </div>
                  </div>

                  {/* Section 5 – Employer Contributions */}
                  <div className="bg-white rounded-lg border border-neutral-200 shadow-sm p-4">
                    <h3 className="text-sm font-bold text-neutral-800 mb-3 flex items-center gap-2 border-b pb-2">
                      <ArrowPathIcon className="w-5 h-5 text-neutral-700" />
                      Section 5 – Employer Contributions
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {renderInputField("PF Wage", "pf_wage", true)}
                      {renderInputField("PF Contribution Reference", "pf", true)}
                      {renderInputField("EPS Wage", "eps_wage", true)}
                      {renderInputField("8.33% Employer PF", "pf_8_33", true)}
                      {renderInputField("3.67% Employer PF", "pf_3_67", true)}
                      {renderInputField("0.50% PF Wage", "pf_0_50_pf_wage", true)}
                      {renderInputField("0.50% EPS Wage", "pf_0_50_eps_wage", true)}
                      {renderInputField("0.01% Field", "pf_0_01", false)}
                      
                      {renderInputField("ESI DED Employee", "esi_ded_employee", true)}
                      {renderInputField("ESI DED Employer", "esi_ded_employer", true)}
                    </div>
                  </div>
                </div>

                {/* Section 6 – CTC */}
                <div className="bg-white rounded-lg border border-neutral-200 shadow-sm p-4 grid grid-cols-3 gap-4">
                  <div className="col-span-3">
                    <h3 className="text-sm font-bold text-neutral-800 mb-3 flex items-center gap-2 border-b pb-2">
                      <CalculatorIcon className="w-5 h-5 text-neutral-700" />
                      Section 6 – CTC
                    </h3>
                  </div>
                  {renderInputField("Bonus", "bonus", true)}
                  {renderInputField("Actual Monthly CTC", "actual_monthly_ctc", true)}
                  {renderInputField("Earned Monthly CTC", "earned_monthly_ctc", true)}
                </div>

                {/* Bottom Summary Section */}
                <div className="bg-neutral-800 text-white rounded-lg p-5 flex flex-col md:flex-row justify-between items-center shadow-lg gap-4">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-6 text-center md:text-left flex-1">
                    <div>
                      <span className="text-[10px] text-neutral-400 block font-semibold uppercase tracking-wider">Gross Salary</span>
                      <span className="text-base font-bold font-mono">₹{(liveCalcs.gross_salary?.final_value ?? 0).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-400 block font-semibold uppercase tracking-wider">Earned Gross</span>
                      <span className="text-base font-bold font-mono">₹{(liveCalcs.gross_earned_salary?.final_value ?? 0).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-400 block font-semibold uppercase tracking-wider">Total Deductions</span>
                      <span className="text-base font-bold font-mono text-red-400">₹{(liveCalcs.total_deduction?.final_value ?? 0).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-400 block font-semibold uppercase tracking-wider">Actual CTC</span>
                      <span className="text-base font-bold font-mono">₹{(liveCalcs.actual_monthly_ctc?.final_value ?? 0).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-400 block font-semibold uppercase tracking-wider">Earned CTC</span>
                      <span className="text-base font-bold font-mono">₹{(liveCalcs.earned_monthly_ctc?.final_value ?? 0).toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="bg-white text-black px-6 py-3 rounded-lg border border-neutral-300 text-center shadow-inner md:ml-4">
                    <span className="text-[10px] text-neutral-500 font-bold block uppercase tracking-widest">NET TRANSFER</span>
                    <span className="text-2xl font-mono font-extrabold text-success-600 block mt-0.5">
                      ₹{(liveCalcs.net_transfer?.final_value ?? 0).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="flex justify-end gap-2 border-t pt-4 bg-white p-4 rounded-lg">
                  <Button
                    onClick={() => {
                      setSelectedEmployeeId("");
                      setEmployeeDetails(null);
                      setEditRecordId(null);
                      setActiveTab("summary");
                    }}
                    variant="outline"
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleSavePayroll} variant="primary">
                    {editRecordId ? "Save Changes" : "Save Payroll"}
                  </Button>
                </div>
                
              </div>
            )}

          </div>
        ) : (
          renderSalaryBankSetupTab()
        )}
      </Card>

      {/* VIEW DETAILS MODAL */}
      <Modal
        isOpen={showViewModal && !!viewRecord}
        onClose={() => setShowViewModal(false)}
        size="lg"
        title="Payroll Details Record"
      >
        {viewRecord && (
          <div className="space-y-6 text-xs max-h-[70vh] overflow-y-auto pr-1">
            <div className="bg-neutral-50 border p-3 rounded grid grid-cols-2 gap-4">
              <div>
                <span className="font-bold text-neutral-500 block">EMPLOYEE</span>
                <span className="text-sm font-semibold text-neutral-800">{viewRecord.employee?.name} ({viewRecord.employee?.employee_id})</span>
              </div>
              <div>
                <span className="font-bold text-neutral-500 block">PAYROLL PERIOD</span>
                <span className="text-sm font-semibold text-neutral-800">{formatDateStr(viewRecord.record?.payroll_period_start)} to {formatDateStr(viewRecord.record?.payroll_period_end)}</span>
              </div>
            </div>

            {/* Section 2: Salary Structure */}
            <div>
              <h4 className="font-bold text-sm text-black border-b pb-1 mb-2">Salary Structure</h4>
              <div className="grid grid-cols-5 gap-2 font-mono">
                <div><span>Basic:</span> <div className="font-semibold text-neutral-800">₹{viewRecord.record?.basic}</div></div>
                <div><span>HRA:</span> <div className="font-semibold text-neutral-800">₹{viewRecord.record?.hra}</div></div>
                <div><span>LTA:</span> <div className="font-semibold text-neutral-800">₹{viewRecord.record?.lta}</div></div>
                <div><span>Other Allow:</span> <div className="font-semibold text-neutral-800">₹{viewRecord.record?.other_allowance}</div></div>
                <div><span>Gross Salary:</span> <div className="font-semibold text-neutral-800">₹{viewRecord.record?.gross_salary}</div></div>
              </div>
            </div>

            {/* Section 3: Earned Salary */}
            <div>
              <h4 className="font-bold text-sm text-black border-b pb-1 mb-2">Earned Salary</h4>
              <div className="grid grid-cols-5 gap-2 font-mono">
                <div><span>Earned Basic:</span> <div className="font-semibold text-neutral-800">₹{viewRecord.record?.earned_basic}</div></div>
                <div><span>Earned HRA:</span> <div className="font-semibold text-neutral-800">₹{viewRecord.record?.earned_hra}</div></div>
                <div><span>Earned LTA:</span> <div className="font-semibold text-neutral-800">₹{viewRecord.record?.earned_lta}</div></div>
                <div><span>Earned Other:</span> <div className="font-semibold text-neutral-800">₹{viewRecord.record?.earned_other_allowance}</div></div>
                <div><span>Earned Gross:</span> <div className="font-semibold text-neutral-800">₹{viewRecord.record?.earned_actual_gross}</div></div>
                
                <div><span>Att Bonus:</span> <div className="font-semibold text-neutral-800">₹{viewRecord.record?.attendance_bonus}</div></div>
                <div><span>ODW:</span> <div className="font-semibold text-neutral-800">₹{viewRecord.record?.odw}</div></div>
                <div><span>Total Additions:</span> <div className="font-semibold text-neutral-800">₹{viewRecord.record?.total}</div></div>
                <div><span>Internet:</span> <div className="font-semibold text-neutral-800">₹{viewRecord.record?.internet_charges}</div></div>
                <div><span>Earned Actual Gross:</span> <div className="font-bold text-neutral-800">₹{viewRecord.record?.gross_earned_salary}</div></div>
              </div>
            </div>

            {/* Section 4: Employee Deductions */}
            <div>
              <h4 className="font-bold text-sm text-black border-b pb-1 mb-2">Employee Deductions</h4>
              <div className="grid grid-cols-4 gap-2 font-mono">
                <div><span>PF DED Employee:</span> <div className="font-semibold text-neutral-800">₹{viewRecord.record?.pf_ded_employee}</div></div>
                <div><span>VPF:</span> <div className="font-semibold text-neutral-800">₹{viewRecord.record?.vpf}</div></div>
                <div><span>PF & VPF DED:</span> <div className="font-semibold text-neutral-800">₹{viewRecord.record?.pf_vpf_ded_employee}</div></div>
                <div><span>ESI DED Employee:</span> <div className="font-semibold text-neutral-800">₹{viewRecord.record?.esi_ded_employee}</div></div>
                <div><span>Salary Advance:</span> <div className="font-semibold text-neutral-800">₹{viewRecord.record?.salary_advance}</div></div>
                <div><span>TDS:</span> <div className="font-semibold text-neutral-800">₹{viewRecord.record?.tds}</div></div>
                <div><span>LWF:</span> <div className="font-semibold text-neutral-800">₹{viewRecord.record?.lwf}</div></div>
                <div><span>PT:</span> <div className="font-semibold text-neutral-800">₹{viewRecord.record?.pt}</div></div>
                <div><span>Other Ded:</span> <div className="font-semibold text-neutral-800">₹{viewRecord.record?.other_deduction}</div></div>
                <div className="col-span-4 border-t pt-1 font-bold flex justify-between">
                  <span>TOTAL DEDUCTIONS:</span>
                  <span>₹{viewRecord.record?.total_deduction}</span>
                </div>
              </div>
            </div>

            {/* Section 5: Employer Contributions */}
            <div>
              <h4 className="font-bold text-sm text-black border-b pb-1 mb-2">Employer Contributions</h4>
              <div className="grid grid-cols-4 gap-2 font-mono">
                <div><span>PF Wage:</span> <div className="font-semibold text-neutral-800">₹{viewRecord.record?.pf_wage}</div></div>
                <div><span>PF:</span> <div className="font-semibold text-neutral-800">₹{viewRecord.record?.pf}</div></div>
                <div><span>EPS Wage:</span> <div className="font-semibold text-neutral-800">₹{viewRecord.record?.eps_wage}</div></div>
                <div><span>8.33% PF:</span> <div className="font-semibold text-neutral-800">₹{viewRecord.record?.pf_8_33}</div></div>
                <div><span>3.67% PF:</span> <div className="font-semibold text-neutral-800">₹{viewRecord.record?.pf_3_67}</div></div>
                <div><span>0.50% PF Wage:</span> <div className="font-semibold text-neutral-800">₹{viewRecord.record?.pf_0_50_pf_wage}</div></div>
                <div><span>0.50% EPS Wage:</span> <div className="font-semibold text-neutral-800">₹{viewRecord.record?.pf_0_50_eps_wage}</div></div>
                <div><span>0.01%:</span> <div className="font-semibold text-neutral-800">₹{viewRecord.record?.pf_0_01}</div></div>
                <div><span>Employer ESI:</span> <div className="font-semibold text-neutral-800">₹{viewRecord.record?.esi_ded_employer}</div></div>
              </div>
            </div>

            {/* Section 6: CTC */}
            <div>
              <h4 className="font-bold text-sm text-black border-b pb-1 mb-2">CTC</h4>
              <div className="grid grid-cols-3 gap-2 font-mono">
                <div><span>Bonus:</span> <div className="font-semibold text-neutral-800">₹{viewRecord.record?.bonus}</div></div>
                <div><span>Actual Monthly CTC:</span> <div className="font-semibold text-neutral-800">₹{viewRecord.record?.actual_monthly_ctc}</div></div>
                <div><span>Earned Monthly CTC:</span> <div className="font-semibold text-neutral-800">₹{viewRecord.record?.earned_monthly_ctc}</div></div>
              </div>
            </div>

            {/* Net Transfer Dashboard */}
            <div className="bg-neutral-800 text-white rounded p-4 flex justify-between items-center text-sm font-bold">
              <span>NET PAY TRANSFER:</span>
              <span className="text-xl text-green-400 font-mono">₹{viewRecord.record?.net_transfer.toLocaleString()}</span>
            </div>

            <div className="flex justify-end pt-2 border-t">
              <Button onClick={() => setShowViewModal(false)} variant="primary">Close</Button>
            </div>
          </div>
        )}
      </Modal>

      {isDeleteConfirmOpen && (
        <ConfirmDialog
          isOpen={isDeleteConfirmOpen}
          title="Delete Payroll Record"
          message="Are you sure you want to delete this payroll record? This action cannot be undone."
          variant="danger"
          confirmLabel="Delete"
          cancelLabel="Cancel"
          onConfirm={handleConfirmDelete}
          onCancel={() => setIsDeleteConfirmOpen(false)}
        />
      )}
    </div>
  );
};

export default PayrollPage;
