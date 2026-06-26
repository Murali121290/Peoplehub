import React, { useEffect, useState, useCallback } from "react";
import axios, { AxiosError } from "axios";

// Constants
const BASE_URL = "http://localhost:5000/api";

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
          <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-xs font-medium">
            Paid
          </span>
          <div className="text-xs text-gray-400 mt-0.5">{emp.paid_date}</div>
        </div>
      );
    }

    return (
      <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-xs font-medium">
        Pending
      </span>
    );
  };

  const renderActions = (emp: Employee): React.JSX.Element => {
    return (
      <>
        {emp.payment_status === "Paid" ? (
          <button
            onClick={() => downloadPayslip(emp.id)}
            className="bg-teal-600 hover:bg-teal-700 text-white px-3 py-1.5 rounded-md text-xs font-medium transition-colors duration-200"
            aria-label={`Download payslip for ${emp.employee_name}`}
          >
            Payslip
          </button>
        ) : (
          <button
            disabled
            className="bg-gray-400 text-white px-3 py-1.5 rounded-md text-xs cursor-not-allowed"
            aria-label="Payslip available after payment"
          >
            Payslip
          </button>
        )}

        {emp.payment_status === "Paid" ? (
          <button
            disabled
            className="bg-gray-400 text-white px-3 py-1.5 rounded-md text-xs cursor-not-allowed"
            aria-label="Salary already paid"
          >
            Paid
          </button>
        ) : (
          <button
            onClick={() => markAsPaid(emp.id)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-md text-xs font-medium transition-colors duration-200"
            aria-label={`Mark salary as paid for ${emp.employee_name}`}
          >
            Pay
          </button>
        )}
      </>
    );
  };

  if (isLoading) {
    return (
      <div className="p-4 flex justify-center items-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (error && employees.length === 0) {
    return (
      <div className="p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <p className="text-red-600 text-sm font-medium">{error}</p>
          <button
            onClick={fetchPayroll}
            className="mt-3 bg-purple-600 hover:bg-purple-700 text-white px-4 py-1.5 rounded-md text-sm transition-colors duration-200"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-50">
      {showModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 backdrop-blur-sm">
          <div className="bg-white w-[950px] rounded-2xl shadow-2xl max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Employee Payroll Details
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {selectedEmployee.employee_id} • {selectedEmployee.department}
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Personal Info Section */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <svg
                    className="w-5 h-5 mr-2 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                  Personal Information
                </h3>
                <div className="grid grid-cols-3 gap-5">
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <div className="text-xs text-gray-500 uppercase tracking-wide">
                      Name
                    </div>
                    <div className="text-sm mt-1 font-medium text-gray-900">
                      {selectedEmployee.name}
                    </div>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <div className="text-xs text-gray-500 uppercase tracking-wide">
                      Employee ID
                    </div>
                    <div className="text-sm mt-1 font-medium text-gray-900">
                      {selectedEmployee.employee_id}
                    </div>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <div className="text-xs text-gray-500 uppercase tracking-wide">
                      Email
                    </div>
                    <div className="text-sm mt-1 font-medium text-gray-900">
                      {selectedEmployee.email}
                    </div>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <div className="text-xs text-gray-500 uppercase tracking-wide">
                      Phone
                    </div>
                    <div className="text-sm mt-1 font-medium text-gray-900">
                      {selectedEmployee.phone}
                    </div>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <div className="text-xs text-gray-500 uppercase tracking-wide">
                      Department
                    </div>
                    <div className="text-sm mt-1 font-medium text-gray-900">
                      {selectedEmployee.department}
                    </div>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <div className="text-xs text-gray-500 uppercase tracking-wide">
                      Designation
                    </div>
                    <div className="text-sm mt-1 font-medium text-gray-900">
                      {selectedEmployee.designation}
                    </div>
                  </div>
                </div>
              </div>

              {/* Employment Details Section */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <svg
                    className="w-5 h-5 mr-2 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 13.255A23.931 23.931 0 0112 15c-3.063 0-5.917-.857-8.377-2.345L2 21h20l-1.623-4.255A23.932 23.932 0 0112 15z"
                    />
                  </svg>
                  Employment Details
                </h3>
                <div className="grid grid-cols-3 gap-5">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="text-xs text-blue-500 uppercase tracking-wide">
                      Salary
                    </div>
                    <div className="text-sm mt-1 font-bold text-blue-900">
                      ₹{selectedEmployee.salary}
                    </div>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <div className="text-xs text-gray-500 uppercase tracking-wide">
                      Shift Timing
                    </div>
                    <div className="text-sm mt-1 font-medium text-gray-900">
                      {selectedEmployee.shift_timing}
                    </div>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <div className="text-xs text-gray-500 uppercase tracking-wide">
                      Joining Date
                    </div>
                    <div className="text-sm mt-1 font-medium text-gray-900">
                      {selectedEmployee.joining_date}
                    </div>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <div className="text-xs text-gray-500 uppercase tracking-wide">
                      Reporting Manager
                    </div>
                    <div className="text-sm mt-1 font-medium text-gray-900">
                      {selectedEmployee.reporting_manager}
                    </div>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <div className="text-xs text-gray-500 uppercase tracking-wide">
                      Present Days
                    </div>
                    <div className="text-sm mt-1 font-medium text-gray-900">
                      {selectedEmployee.present_days}
                    </div>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <div className="text-xs text-gray-500 uppercase tracking-wide">
                      Leave Days
                    </div>
                    <div className="text-sm mt-1 font-medium text-gray-900">
                      {selectedEmployee.leave_days}
                    </div>
                  </div>
                </div>
              </div>

              {/* Leave Balances Section */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <svg
                    className="w-5 h-5 mr-2 text-purple-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  Leave Balances
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                    <div className="text-xs uppercase tracking-wide opacity-75">
                      Sick Leave
                    </div>
                    <div className="text-xl font-bold mt-1 text-red-900">
                      {selectedEmployee.sick_leave}
                    </div>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                    <div className="text-xs uppercase tracking-wide opacity-75">
                      Casual Leave
                    </div>
                    <div className="text-xl font-bold mt-1 text-blue-900">
                      {selectedEmployee.casual_leave}
                    </div>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                    <div className="text-xs uppercase tracking-wide opacity-75">
                      Earned Leave
                    </div>
                    <div className="text-xl font-bold mt-1 text-green-900">
                      {selectedEmployee.earned_leave}
                    </div>
                  </div>
                </div>
              </div>

              {/* Absent Dates Section */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                  <svg
                    className="w-5 h-5 mr-2 text-orange-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  Absent Dates
                </h3>
                {selectedEmployee.absent_dates?.length > 0 ? (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <ul className="grid grid-cols-2 gap-2 text-sm text-orange-700">
                      {selectedEmployee.absent_dates.map((date: string) => (
                        <li key={date} className="flex items-center">
                          <svg
                            className="w-4 h-4 mr-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                          {date}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                    <span className="text-green-600 flex items-center justify-center">
                      <svg
                        className="w-5 h-5 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      No Absent Records
                    </span>
                  </div>
                )}
              </div>

              {/* Leave History Section */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                  <svg
                    className="w-5 h-5 mr-2 text-indigo-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                  Leave History
                </h3>
                {selectedEmployee.leave_history?.length > 0 ? (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-indigo-50">
                        <tr>
                          <th className="px-4 py-3 text-left font-semibold text-indigo-900">
                            Type
                          </th>
                          <th className="px-4 py-3 text-left font-semibold text-indigo-900">
                            From
                          </th>
                          <th className="px-4 py-3 text-left font-semibold text-indigo-900">
                            To
                          </th>
                          <th className="px-4 py-3 text-left font-semibold text-indigo-900">
                            Days
                          </th>
                          <th className="px-4 py-3 text-left font-semibold text-indigo-900">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {selectedEmployee.leave_history.map(
                          (leave: any, index: number) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-4 py-3">{leave.leave_type}</td>
                              <td className="px-4 py-3">{leave.from_date}</td>
                              <td className="px-4 py-3">{leave.to_date}</td>
                              <td className="px-4 py-3">{leave.total_days}</td>
                              <td className="px-4 py-3">
                                <span
                                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    leave.status === "Approved"
                                      ? "bg-green-100 text-green-800"
                                      : leave.status === "Pending"
                                        ? "bg-yellow-100 text-yellow-800"
                                        : leave.status === "Rejected"
                                          ? "bg-red-100 text-red-800"
                                          : "bg-gray-100 text-gray-800"
                                  }`}
                                >
                                  {leave.status}
                                </span>
                              </td>
                            </tr>
                          ),
                        )}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
                    <span className="text-gray-500">
                      No Leave History Found
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-800">
            Payroll Management
          </h2>
          <button
            onClick={exportPayrollExcel}
            className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-md text-xs font-medium transition-colors duration-200"
            aria-label="Export payroll to Excel"
          >
            Export Excel
          </button>
        </div>

        {employees.length === 0 ? (
          <div className="p-6 text-center text-gray-400">
            <p className="text-sm">
              No payroll data available for this period.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-3 py-2 text-left font-semibold text-gray-600 text-xs">
                    Employee
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600 text-xs">
                    Working
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600 text-xs">
                    Leave
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600 text-xs">
                    Salary
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600 text-xs">
                    Account No
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600 text-xs">
                    Monthly
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600 text-xs">
                    Status
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600 text-xs">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => (
                  <tr
                    key={emp.id}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors duration-150"
                  >
                    <td className="px-3 py-2 text-xs">
                      <button
                        onClick={() => fetchEmployeeDetails(emp.id)}
                        className="text-blue-600 hover:underline font-medium"
                      >
                        {emp.employee_name}
                      </button>
                    </td>
                    <td className="px-3 py-2 text-gray-600 text-xs">
                      {emp.working_days}
                    </td>
                    <td className="px-3 py-2 text-gray-600 text-xs">
                      {emp.leave_days}
                    </td>
                    <td className="px-3 py-2 text-gray-700 text-xs">
                      ₹{emp.salary}
                    </td>
                    <td className="px-3 py-2 text-gray-600 text-xs">
                      {emp.account_number || "-"}
                    </td>
                    <td className="px-3 py-2 font-semibold text-emerald-600 text-xs">
                      ₹{emp.monthly_salary}
                    </td>
                    <td className="px-3 py-2">{renderStatus(emp)}</td>
                    <td className="px-3 py-2 flex gap-1.5">
                      {renderActions(emp)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default PayrollPage;
