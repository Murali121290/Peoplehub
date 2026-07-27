import React from 'react';

const formatWorkingHours = (hoursVal: any) => {
  if (hoursVal == null || hoursVal === "" || hoursVal === 0 || hoursVal === "0" || hoursVal === "0.0") return "—";
  const num = Number(hoursVal);
  if (isNaN(num) || num <= 0) return "—";
  const hrs = Math.floor(num);
  const mins = Math.round((num - hrs) * 60);
  return `${hrs} hrs ${mins} mins`;
};


interface AttendanceDetailModalProps {
  selectedEmployee: any;
  onClose: () => void;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
}

const AttendanceDetailModal: React.FC<AttendanceDetailModalProps> = ({
  selectedEmployee,
  onClose,
  onApprove,
  onReject,
}) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-xl w-[600px] shadow-2xl overflow-hidden">

        <div className="bg-gradient-to-r from-gray-800 to-gray-700 text-white p-4 flex justify-between items-center">
          <h2 className="text-lg font-semibold">Attendance Details</h2>
          <button onClick={onClose} className="text-white hover:bg-gray-700 rounded-lg p-1 transition">✕</button>
        </div>

        <div className="p-5 space-y-4">
          <div className="border-b border-gray-200 pb-4">
            <h3 className="font-semibold text-base text-gray-800">{selectedEmployee.employee_name}</h3>
            <p className="text-gray-500 text-sm mt-1">{selectedEmployee.designation}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Check In", value: selectedEmployee.check_in },
              { label: "Check Out", value: selectedEmployee.check_out },
              { label: "Lunch Break", value: `${selectedEmployee.lunch_minutes} min` },
              { label: "Tea Break", value: `${selectedEmployee.tea_minutes} min` },
              { label: "Total Break", value: `${selectedEmployee.total_break_minutes} min` },
              { label: "Working Hours", value: formatWorkingHours(selectedEmployee.working_hours) },
            ].map((item) => (
              <div key={item.label} className="bg-gray-50 p-3 rounded-lg">
                <label className="text-gray-500 text-xs font-semibold uppercase">{item.label}</label>
                <p className="text-gray-800 font-semibold text-sm mt-1">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              className="bg-gradient-to-r from-green-600 to-green-500 text-white px-5 py-2 rounded-lg font-semibold text-sm hover:from-green-700 hover:to-green-600 transition shadow-md"
              onClick={() => onApprove(selectedEmployee.employee_id)}
            >
              Approve
            </button>
            <button
              className="bg-gradient-to-r from-red-600 to-red-500 text-white px-5 py-2 rounded-lg font-semibold text-sm hover:from-red-700 hover:to-red-600 transition shadow-md"
              onClick={() => onReject(selectedEmployee.employee_id)}
            >
              Reject
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendanceDetailModal;