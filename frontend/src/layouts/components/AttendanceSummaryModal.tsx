import React from 'react';

interface AttendanceSummaryModalProps {
  reportingEmployees: any[];
  onClose: () => void;
  onViewEmployee: (emp: any) => void;
  onApproveAll: () => void;
  onApproveEmployee: (employeeId: number) => void;
}

const AttendanceSummaryModal: React.FC<AttendanceSummaryModalProps> = ({
  reportingEmployees,
  onClose,
  onViewEmployee,
  onApproveAll,
  onApproveEmployee,
}) => {
  const presentCount = reportingEmployees.filter(e => e.status === "Present").length;
  const absentCount = reportingEmployees.filter(e => e.status === "Absent").length;

  return (
    <div className="fixed inset-0 bg-black/35 backdrop-blur-[1px] flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-[800px] max-w-full overflow-hidden border border-gray-200">

        {/* Header */}
        <div className="bg-gradient-to-r from-gray-800 to-gray-600 p-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-2 rounded-lg">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-white">Yesterday Attendance Summary</h2>
          </div>
          <button onClick={onClose} className="bg-white/10 hover:bg-white/20 p-2 rounded-lg transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Table */}
        <div className="p-6 bg-gray-50">
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr className="border-b border-gray-200">
                  {["Name", "Status", "Check In", "Check Out", "Hours", "Action"].map(h => (
                    <th key={h} className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reportingEmployees.map((emp: any, idx: number) => (
                  <tr key={emp.employee_id} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/40"}`}>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={emp.profile_image ? `data:image/jpeg;base64,${emp.profile_image}` : "/default-avatar.png"}
                          alt={emp.employee_name}
                          className="w-10 h-10 rounded-full object-cover border border-gray-300 bg-gray-100"
                        />
                        <div>
                          <p className="font-medium text-gray-900">{emp.employee_name}</p>
                          <p className="text-xs text-gray-500">{emp.designation}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${
                        emp.status === "Present" ? "bg-gray-100 text-gray-800 border-gray-300" :
                        emp.status === "Absent" ? "bg-gray-200 text-gray-700 border-gray-300" :
                        "bg-gray-100 text-gray-600 border-gray-300"
                      }`}>
                        {emp.status === "Present" && (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="mr-1">
                            <polyline points="20,6 9,17 4,12" />
                          </svg>
                        )}
                        {emp.status === "Absent" && (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="mr-1">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        )}
                        {emp.status === "Late" && (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-1">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12,6 12,12 16,14" />
                          </svg>
                        )}
                        {emp.status}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-gray-600">
                      <div className="flex items-center gap-2">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-500">
                          <circle cx="12" cy="12" r="10" /><polyline points="12,6 12,12 16,14" />
                        </svg>
                        {emp.check_in}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-gray-600">
                      <div className="flex items-center gap-2">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-500">
                          <circle cx="12" cy="12" r="10" /><polyline points="12,6 12,12 16,14" />
                        </svg>
                        {emp.check_out}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-semibold text-gray-900">{emp.working_hours}</span>
                    </td>

                    <td className="py-3 px-4">
  <div className="flex gap-2">
    <button
      className="px-3 py-1.5 bg-gray-800 text-white rounded-lg text-sm hover:bg-gray-900 transition-colors"
      onClick={() => onViewEmployee(emp)}
    >
      View
    </button>

    <button
      className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors"
      onClick={() => onApproveEmployee(emp.employee_id)}
    >
      Approve
    </button>
  </div>
</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer Stats */}
          <div className="mt-6 flex flex-wrap gap-3">
            <div className="bg-gray-100 px-4 py-3 rounded-lg flex items-center gap-2 border border-gray-200">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2">
                <polyline points="20,6 9,17 4,12" />
              </svg>
              <span className="text-sm font-medium text-gray-700">{presentCount} Present</span>
            </div>

            <div className="bg-gray-100 px-4 py-3 rounded-lg flex items-center gap-2 border border-gray-200">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              <span className="text-sm font-medium text-gray-700">{absentCount} Absent</span>
            </div>

            <div className="bg-gray-100 px-4 py-3 rounded-lg flex items-center gap-2 border border-gray-200">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2">
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
              </svg>
              <span className="text-sm font-medium text-gray-700">Total: {reportingEmployees.length} Employees</span>
            </div>

            <button
  onClick={onApproveAll}
  className="bg-green-600 hover:bg-green-700 text-white px-5 py-3 rounded-lg font-medium shadow-md transition-all ml-[140px]"
>
  ✓ Approve All
</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendanceSummaryModal;