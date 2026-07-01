import React, { useState, useMemo } from 'react';
import { MagnifyingGlassIcon, FunnelIcon, EyeIcon, PencilIcon } from '@heroicons/react/24/outline';
import { tasksData } from '../data/employeeMockData';
import { getStatusColor, getPriorityColor } from '../utils/employeeHelpers';
import { Card } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Form';
import { Select } from '../../../components/ui/Form';

const TasksTab: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');

  const filteredTasks = useMemo(() => {
    return tasksData.filter(task => {
      const matchesSearch = task.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.taskId.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = filterStatus === 'All' || task.status === filterStatus;
      return matchesSearch && matchesFilter;
    });
  }, [searchQuery, filterStatus]);

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-neutral-800">My Tasks</h2>
          <p className="text-sm text-neutral-500">Manage and track your assigned tasks</p>
        </div>
      </div>

      <Card>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <Input
              type="text"
              placeholder="Search tasks by name or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <FunnelIcon className="w-5 h-5 text-neutral-500 flex-shrink-0" />
            <Select
              value={filterStatus}
              onChange={setFilterStatus}
              options={[
                { label: 'All Status', value: 'All' },
                { label: 'Pending', value: 'Pending' },
                { label: 'In Progress', value: 'In Progress' },
                { label: 'Completed', value: 'Completed' },
                { label: 'On Hold', value: 'On Hold' },
              ]}
            />
          </div>
        </div>
      </Card>

      <Card padding="none" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-neutral-50">
              <tr>
                <th className="text-left p-3 font-semibold text-neutral-700 text-xs uppercase">Task ID</th>
                <th className="text-left p-3 font-semibold text-neutral-700 text-xs uppercase">Project</th>
                <th className="text-left p-3 font-semibold text-neutral-700 text-xs uppercase">Complexity</th>
                <th className="text-left p-3 font-semibold text-neutral-700 text-xs uppercase">Assigned</th>
                <th className="text-left p-3 font-semibold text-neutral-700 text-xs uppercase">Due Date</th>
                <th className="text-left p-3 font-semibold text-neutral-700 text-xs uppercase">Priority</th>
                <th className="text-left p-3 font-semibold text-neutral-700 text-xs uppercase">Status</th>
                <th className="text-left p-3 font-semibold text-neutral-700 text-xs uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredTasks.map((task) => (
                <tr key={task.id} className="hover:bg-neutral-50 transition-colors">
                  <td className="p-3 text-sm font-medium text-neutral-800">{task.taskId}</td>
                  <td className="p-3 text-sm text-neutral-700">
                    <p className="font-medium">{task.projectName}</p>
                    <p className="text-xs text-neutral-500 truncate max-w-xs">{task.description}</p>
                  </td>
                  <td className="p-3 text-sm text-neutral-700">{task.complexity}</td>
                  <td className="p-3 text-sm text-neutral-700">{task.assignedDate}</td>
                  <td className="p-3 text-sm text-neutral-700">{task.dueDate}</td>
                  <td className="p-3">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold border ${getStatusColor(task.status)}`}>
                      {task.status}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <button className="p-1 hover:bg-primary-50 rounded transition-colors" title="View">
                        <EyeIcon className="w-4 h-4 text-neutral-600 hover:text-primary-600" />
                      </button>
                      <button className="p-1 hover:bg-warning-50 rounded transition-colors" title="Edit">
                        <PencilIcon className="w-4 h-4 text-neutral-600 hover:text-warning-600" />
                      </button>
                    </div>
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

export default TasksTab;
