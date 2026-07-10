import React, { useEffect, useState, useCallback } from "react";
import axios, { AxiosError } from "axios";
import {
  ArrowDownTrayIcon,
  UserCircleIcon,
  BriefcaseIcon,
  CalendarDaysIcon,
  ExclamationTriangleIcon,
  ClipboardDocumentListIcon,
  CheckCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Badge } from "../../../components/ui/Badge";
import { Table } from "../../../components/ui/Table";
import type { Column } from "../../../components/ui/Table";
import { Modal } from "../../../components/ui/Modal";
import { Spinner } from "../../../components/ui/Spinner";
import { EmptyState } from "../../../components/ui/EmptyState";

// Constants
const BASE_URL = "http://10.1.6.178:5001/api";

// TypeScript Interfaces
interface Employee {
  id: number;
  employee_name: string;
  working_days: number;
  leave_days: number;
  salary: number;
  account_number: string | null;
  monthly_salary: number;
  payment_status: "Paid" | "Pending";
  paid_date?: string;
}

interface PayrollResponse {
  data: Employee[];
}

// Component
const PayrollPage: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);

  const [showModal, setShowModal] = useState(false);

  const fetchEmployeeDetails = async (employeeId: number) => {
    try {
      const res = await axios.get(
        `${BASE_URL}/employees/employee-details/${employeeId}`,
      );

      setSelectedEmployee(res.data.employee);

      setShowModal(true);
    } catch (err) {
      console.log(err);
    }
  };

  const fetchPayroll = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await axios.get<PayrollResponse>(
        `${BASE_URL}/payroll/summary`,
      );
      setEmployees(res.data.data || []);
    } catch (err) {
      const axiosError = err as AxiosError;
      setError(axiosError.message || "Failed to fetch payroll data");
      setEmployees([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPayroll();
  }, [fetchPayroll]);

  const downloadPayslip = (id: number): void => {
    window.location.href = `${BASE_URL}/payroll/payslip/${id}`;
  };

  const markAsPaid = async (id: number): Promise<void> => {
    try {
      await axios.put(`${BASE_URL}/payroll/mark-paid/${id}`);
      await fetchPayroll();
    } catch (err) {
      const axiosError = err as AxiosError;
      setError(axiosError.message || "Failed to mark salary as paid");
    }
  };

  const exportPayrollExcel = (): void => {
    window.location.href = `${BASE_URL}/attendance/export-paysheet`;
  };

  const renderStatus = (emp: Employee): React.JSX.Element => {
    if (emp.payment_status === "Paid") {
      return (
        <div>
          <Badge variant="success" size="sm">
            Paid
          </Badge>
          <div className="text-xs text-neutral-400 mt-0.5">
            {emp.paid_date}
          </div>
        </div>
      );
    }

    return (
      <Badge variant="warning" size="sm">
        Pending
      </Badge>
    );
  };

  const renderActions = (emp: Employee): React.JSX.Element => {
    return (
      <div className="flex gap-1.5">


        {emp.payment_status === "Paid" ? (
          <Button
            disabled
            variant="outline"
            size="sm"
            aria-label="Salary already paid"
          >
            Paid
          </Button>
        ) : (
          <Button
            onClick={() => markAsPaid(emp.id)}
            variant="success"
            size="sm"
            aria-label={`Mark salary as paid for ${emp.employee_name}`}
          >
            Pay
          </Button>
        )}
        {emp.payment_status === "Paid" ? (
          <Button
            onClick={() => downloadPayslip(emp.id)}
            variant="primary"
            size="sm"
            aria-label={`Download payslip for ${emp.employee_name}`}
          >
            Payslip
          </Button>
        ) : (
          <Button
            disabled
            variant="outline"
            size="sm"
            aria-label="Payslip available after payment"
          >
            Payslip
          </Button>
        )}


      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="p-4 flex justify-center items-center min-h-screen bg-neutral-50">
        <Spinner size="md" label="Loading..." />
      </div>
    );
  }

  if (error && employees.length === 0) {
    return (
      <div className="p-4">
        <div className="bg-danger-50 border border-danger-200 rounded-lg p-4 text-center">
          <p className="text-danger-600 text-sm font-medium">{error}</p>
          <Button onClick={fetchPayroll} variant="primary" size="sm" className="mt-3">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const columns: Column<Employee>[] = [
    {
      key: "employee_name",
      header: "Employee",
      render: (emp) => (
        <button
          onClick={() => fetchEmployeeDetails(emp.id)}
          className="text-info-600 hover:underline font-medium text-xs"
        >
          {emp.employee_name}
        </button>
      ),
    },
    {
      key: "working_days",
      header: "Working",
      render: (emp) => (
        <span className="text-neutral-600 text-xs">{emp.working_days}</span>
      ),
    },
    {
      key: "leave_days",
      header: "Leave",
      render: (emp) => (
        <span className="text-neutral-600 text-xs">{emp.leave_days}</span>
      ),
    },
    {
      key: "salary",
      header: "Salary",
      render: (emp) => (
        <span className="text-neutral-700 text-xs">₹{emp.salary}</span>
      ),
    },
    {
      key: "account_number",
      header: "Account No",
      render: (emp) => (
        <span className="text-neutral-600 text-xs">
          {emp.account_number || "-"}
        </span>
      ),
    },
    {
      key: "monthly_salary",
      header: "Monthly",
      render: (emp) => (
        <span className="font-semibold text-success-600 text-xs">
          ₹{emp.monthly_salary}
        </span>
      ),
    },
    {
      key: "payment_status",
      header: "Status",
      render: (emp) => renderStatus(emp),
    },
    {
      key: "actions",
      header: "Actions",
      render: (emp) => renderActions(emp),
    },
  ];

  return (
    <div className="p-4 bg-neutral-50">
      <Modal
        isOpen={showModal && !!selectedEmployee}
        onClose={() => setShowModal(false)}
        size="xl"
        title="Employee Payroll Details"
        eyebrow={
          selectedEmployee
            ? {
              label: `${selectedEmployee.employee_id ?? ""} • ${selectedEmployee.department ?? ""}`,
            }
            : undefined
        }
      >
        {selectedEmployee && (
          <>
            {/* Personal Info Section */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-neutral-800 mb-4 flex items-center">
                <UserCircleIcon className="w-5 h-5 mr-2 text-info-600" />
                Personal Information
              </h3>
              <div className="grid grid-cols-3 gap-5">
                <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-3">
                  <div className="text-xs text-neutral-500 uppercase tracking-wide">
                    Name
                  </div>
                  <div className="text-sm mt-1 font-medium text-neutral-800">
                    {selectedEmployee.name}
                  </div>
                </div>
                <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-3">
                  <div className="text-xs text-neutral-500 uppercase tracking-wide">
                    Employee ID
                  </div>
                  <div className="text-sm mt-1 font-medium text-neutral-800">
                    {selectedEmployee.employee_id}
                  </div>
                </div>
                <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-3">
                  <div className="text-xs text-neutral-500 uppercase tracking-wide">
                    Email
                  </div>
                  <div className="text-sm mt-1 font-medium text-neutral-800">
                    {selectedEmployee.email}
                  </div>
                </div>
                <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-3">
                  <div className="text-xs text-neutral-500 uppercase tracking-wide">
                    Phone
                  </div>
                  <div className="text-sm mt-1 font-medium text-neutral-800">
                    {selectedEmployee.phone}
                  </div>
                </div>
                <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-3">
                  <div className="text-xs text-neutral-500 uppercase tracking-wide">
                    Department
                  </div>
                  <div className="text-sm mt-1 font-medium text-neutral-800">
                    {selectedEmployee.department}
                  </div>
                </div>
                <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-3">
                  <div className="text-xs text-neutral-500 uppercase tracking-wide">
                    Designation
                  </div>
                  <div className="text-sm mt-1 font-medium text-neutral-800">
                    {selectedEmployee.designation}
                  </div>
                </div>
              </div>
            </div>

            {/* Employment Details Section */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-neutral-800 mb-4 flex items-center">
                <BriefcaseIcon className="w-5 h-5 mr-2 text-success-600" />
                Employment Details
              </h3>
              <div className="grid grid-cols-3 gap-5">
                <div className="bg-info-50 border border-info-200 rounded-lg p-3">
                  <div className="text-xs text-info-500 uppercase tracking-wide">
                    Salary
                  </div>
                  <div className="text-sm mt-1 font-bold text-info-700">
                    ₹{selectedEmployee.salary}
                  </div>
                </div>
                <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-3">
                  <div className="text-xs text-neutral-500 uppercase tracking-wide">
                    Shift Timing
                  </div>
                  <div className="text-sm mt-1 font-medium text-neutral-800">
                    {selectedEmployee.shift_timing}
                  </div>
                </div>
                <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-3">
                  <div className="text-xs text-neutral-500 uppercase tracking-wide">
                    Joining Date
                  </div>
                  <div className="text-sm mt-1 font-medium text-neutral-800">
                    {selectedEmployee.joining_date}
                  </div>
                </div>
                <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-3">
                  <div className="text-xs text-neutral-500 uppercase tracking-wide">
                    Reporting Manager
                  </div>
                  <div className="text-sm mt-1 font-medium text-neutral-800">
                    {selectedEmployee.reporting_manager}
                  </div>
                </div>
                <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-3">
                  <div className="text-xs text-neutral-500 uppercase tracking-wide">
                    Present Days
                  </div>
                  <div className="text-sm mt-1 font-medium text-neutral-800">
                    {selectedEmployee.present_days}
                  </div>
                </div>
                <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-3">
                  <div className="text-xs text-neutral-500 uppercase tracking-wide">
                    Leave Days
                  </div>
                  <div className="text-sm mt-1 font-medium text-neutral-800">
                    {selectedEmployee.leave_days}
                  </div>
                </div>
              </div>
            </div>

            {/* Leave Balances Section */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-neutral-800 mb-4 flex items-center">
                <CalendarDaysIcon className="w-5 h-5 mr-2 text-primary-600" />
                Leave Balances
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-danger-50 border border-danger-200 rounded-lg p-3 text-center">
                  <div className="text-xs uppercase tracking-wide opacity-75">
                    Sick Leave
                  </div>
                  <div className="text-xl font-bold mt-1 text-danger-700">
                    {selectedEmployee.sick_leave}
                  </div>
                </div>
                <div className="bg-info-50 border border-info-200 rounded-lg p-3 text-center">
                  <div className="text-xs uppercase tracking-wide opacity-75">
                    Casual Leave
                  </div>
                  <div className="text-xl font-bold mt-1 text-info-700">
                    {selectedEmployee.casual_leave}
                  </div>
                </div>
                <div className="bg-success-50 border border-success-200 rounded-lg p-3 text-center">
                  <div className="text-xs uppercase tracking-wide opacity-75">
                    Privilege Leave
                  </div>
                  <div className="text-xl font-bold mt-1 text-success-700">
                    {selectedEmployee.privilege_leave}
                  </div>
                </div>
              </div>
            </div>

            {/* Absent Dates Section */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-neutral-800 mb-3 flex items-center">
                <ExclamationTriangleIcon className="w-5 h-5 mr-2 text-warning-600" />
                Absent Dates
              </h3>
              {selectedEmployee.absent_dates?.length > 0 ? (
                <div className="bg-warning-50 border border-warning-200 rounded-lg p-4">
                  <ul className="grid grid-cols-2 gap-2 text-sm text-warning-700">
                    {selectedEmployee.absent_dates.map((date: string) => (
                      <li key={date} className="flex items-center">
                        <XMarkIcon className="w-4 h-4 mr-2" />
                        {date}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="bg-success-50 border border-success-200 rounded-lg p-3 text-center">
                  <span className="text-success-600 flex items-center justify-center">
                    <CheckCircleIcon className="w-5 h-5 mr-2" />
                    No Absent Records
                  </span>
                </div>
              )}
            </div>

            {/* Leave History Section */}
            <div>
              <h3 className="text-lg font-semibold text-neutral-800 mb-3 flex items-center">
                <ClipboardDocumentListIcon className="w-5 h-5 mr-2 text-primary-600" />
                Leave History
              </h3>
              {selectedEmployee.leave_history?.length > 0 ? (
                <div className="border border-neutral-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-primary-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-primary-700">
                          Type
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-primary-700">
                          From
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-primary-700">
                          To
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-primary-700">
                          Days
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-primary-700">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200">
                      {selectedEmployee.leave_history.map(
                        (leave: any, index: number) => (
                          <tr key={index} className="hover:bg-neutral-50">
                            <td className="px-4 py-3">{leave.leave_type}</td>
                            <td className="px-4 py-3">{leave.from_date}</td>
                            <td className="px-4 py-3">{leave.to_date}</td>
                            <td className="px-4 py-3">{leave.total_days}</td>
                            <td className="px-4 py-3">
                              <Badge
                                size="sm"
                                variant={
                                  leave.status === "Approved"
                                    ? "success"
                                    : leave.status === "Pending"
                                      ? "warning"
                                      : leave.status === "Rejected"
                                        ? "danger"
                                        : "neutral"
                                }
                              >
                                {leave.status}
                              </Badge>
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-3 text-center">
                  <span className="text-neutral-500">
                    No Leave History Found
                  </span>
                </div>
              )}
            </div>
          </>
        )}
      </Modal>

      <Card padding="none">
        <div className="p-4 border-b border-neutral-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-neutral-800">
            Payroll Management
          </h2>
          <Button
            onClick={exportPayrollExcel}
            variant="outline"
            size="sm"
            icon={ArrowDownTrayIcon}
            aria-label="Export payroll to Excel"
          >
            Export Excel
          </Button>
        </div>

        {employees.length === 0 ? (
          <EmptyState title="No payroll data available for this period." />
        ) : (
          <Table columns={columns} data={employees} rowKey={(emp) => emp.id} />
        )}
      </Card>
    </div>
  );
};

export default PayrollPage;
