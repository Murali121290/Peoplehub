export const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    'Pending': 'bg-warning-50 text-warning-700 border-warning-200',
    'In Progress': 'bg-info-50 text-info-700 border-info-200',
    'Completed': 'bg-success-50 text-success-700 border-success-200',
    'On Hold': 'bg-neutral-100 text-neutral-600 border-neutral-200',
    'Approved': 'bg-success-50 text-success-700 border-success-200',
    'Rejected': 'bg-danger-50 text-danger-700 border-danger-200',
    'Present': 'bg-success-50 text-success-700 border-success-200',
    'Absent': 'bg-danger-50 text-danger-700 border-danger-200',
    'Leave': 'bg-purple-50 text-purple-700 border-purple-200',
  };
  return colors[status] || 'bg-neutral-100 text-neutral-600 border-neutral-200';
};

export const getPriorityColor = (priority: string): string => {
  const colors: Record<string, string> = {
    'High': 'text-danger-600 bg-danger-50',
    'Medium': 'text-warning-600 bg-warning-50',
    'Low': 'text-success-600 bg-success-50',
  };
  return colors[priority] || 'text-neutral-600 bg-neutral-100';
};