import React from 'react';
import { CheckCircleIcon, CalendarDaysIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import { XMarkIcon } from '@heroicons/react/24/outline';
import StatCard from '../components/StatCard';
import { getStatusColor } from '../utils/employeeHelpers';
import { Attendance } from '../../../types/employee.types';
import { Card } from '../../../components/ui/Card';

interface AttendanceTabProps {
  attendanceData: Attendance[];
}

const AttendanceTab: React.FC<AttendanceTabProps> = ({ attendanceData }) => {
  return (
    <>
      <div>
        <h2 className="text-xl font-bold text-neutral-800">Attendance</h2>
        <p className="text-sm text-neutral-500">Track your attendance and working hours</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={CheckCircleIcon} title="Present Days" value={attendanceData.length} subtitle="This month" trend="normal" color="green" />
        <StatCard icon={XMarkIcon} title="Absent Days" value={attendanceData.filter(a => a.status === 'Absent').length} subtitle="This month" trend="negative" color="red" />
        <StatCard icon={CalendarDaysIcon} title="Leave Days" value={attendanceData.filter(a => a.status === 'Leave').length} subtitle="This month" trend="normal" color="purple" />
        <StatCard icon={ChartBarIcon} title="Attendance %" value="96%" subtitle="This month" trend="positive" color="blue" />
      </div>

      <Card padding="none" className="overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-200">
          <h3 className="text-lg font-semibold text-neutral-800">Attendance History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-neutral-50">
              <tr>
                {["Date", "Check In", "Check Out", "Hours", "Status"].map(h => (
                  <th key={h} className="text-left p-3 font-semibold text-neutral-700 text-xs uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {attendanceData.map((attendance) => (
                <tr key={attendance.id} className="hover:bg-neutral-50 transition-colors">
                  <td className="p-3 text-sm text-neutral-800">{attendance.date}</td>
                  <td className="p-3 text-sm text-neutral-700">{attendance.checkIn}</td>
                  <td className="p-3 text-sm text-neutral-700">{attendance.checkOut}</td>
                  <td className="p-3 text-sm text-neutral-700">{attendance.workingHours} hrs</td>
                  <td className="p-3">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold border ${getStatusColor(attendance.status)}`}>
                      {attendance.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
};

export default AttendanceTab;
