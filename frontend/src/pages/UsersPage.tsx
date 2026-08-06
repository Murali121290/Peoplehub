import React, { useEffect, useMemo, useState } from 'react';
import { apiService } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  MagnifyingGlassIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  FunnelIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EllipsisHorizontalIcon,
} from '@heroicons/react/24/outline';
import UserModal from '../modals/UserModal';
import { User } from '../types/index';
import { ConfirmDialog } from '../components/ui/Modal/ConfirmDialog';

const roleOptions = [
  'Admin',
  'Project Manager',
  'Pre-Editing',
  'Copywriting',
  'Proofreading',
  'Quality Analyst (QA)',
  'Final Delivery',
];

const statusOptions = ['active', 'inactive'];

const getInitials = (name: string) =>
  name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

const statusClasses: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  inactive: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
};

const accessClasses: Record<string, string> = {
  full: 'bg-slate-900 text-white',
  limited: 'bg-amber-100 text-amber-800',
  read_only: 'bg-sky-100 text-sky-800',
};

const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    per_page: 20,
    total: 0,
    pages: 0,
  });

  useEffect(() => {
    fetchUsers();
  }, [pagination.page, roleFilter, statusFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await apiService.getUsers({
        page: pagination.page,
        per_page: pagination.per_page,
        search,
        role: roleFilter,
        status: statusFilter,
      });

      setUsers(response.data.users);
      setPagination(response.data.pagination);
    } catch (error) {
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingUser(null);
    setShowModal(true);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setShowModal(true);
  };

  const [deactivatingUserId, setDeactivatingUserId] = useState<number | null>(null);

  const handleDelete = (id: number) => {
    setDeactivatingUserId(id);
  };

  const confirmDeactivate = async () => {
    if (deactivatingUserId === null) return;
    const targetId = deactivatingUserId;
    setDeactivatingUserId(null);
    try {
      await apiService.deleteUser(targetId);
      toast.success('User deactivated successfully');
      fetchUsers();
    } catch (error) {
      toast.error('Failed to delete user');
    }
  };

  const cancelDeactivate = () => {
    setDeactivatingUserId(null);
  };

  const handleModalClose = (refresh = false) => {
    setShowModal(false);
    setEditingUser(null);
    if (refresh) fetchUsers();
  };

  const handleSearch = () => {
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchUsers();
  };

  const clearFilters = () => {
    setSearch('');
    setRoleFilter('');
    setStatusFilter('');
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const stats = useMemo(() => {
    const activeCount = users.filter((u) => u.status === 'active').length;
    const inactiveCount = users.filter((u) => u.status === 'inactive').length;
    const adminCount = users.filter((u) => u.role === 'Admin').length;

    return [
      { label: 'Total records', value: pagination.total || users.length },
      { label: 'Active users', value: activeCount },
      { label: 'Inactive', value: inactiveCount },
      { label: 'Admins', value: adminCount },
    ];
  }, [users, pagination.total]);

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Workspace / Directory</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">
                User Management
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                Manage access, roles, and user lifecycle across your workspace.
              </p>
            </div>

            <button
              onClick={handleCreate}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-neutral-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <PlusIcon className="h-5 w-5" />
              Add user
            </button>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <p className="text-sm text-slate-500">{item.label}</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Toolbar */}
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-slate-900 outline-none transition focus:border-slate-400"
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleSearch}
                className="rounded-2xl bg-neutral-700 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800"
              >
                Search
              </button>

              <button
                onClick={() => setShowFilters((prev) => !prev)}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <FunnelIcon className="h-5 w-5" />
                Filters
              </button>

              <button
                onClick={clearFilters}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Reset
              </button>
            </div>
          </div>

          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-4 grid gap-4 border-t border-slate-200 pt-4 md:grid-cols-2 xl:grid-cols-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Role
                    </label>
                    <select
                      value={roleFilter}
                      onChange={(e) => {
                        setRoleFilter(e.target.value);
                        setPagination((prev) => ({ ...prev, page: 1 }));
                      }}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-slate-400"
                    >
                      <option value="">All roles</option>
                      {roleOptions.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Status
                    </label>
                    <select
                      value={statusFilter}
                      onChange={(e) => {
                        setStatusFilter(e.target.value);
                        setPagination((prev) => ({ ...prev, page: 1 }));
                      }}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-slate-400"
                    >
                      <option value="">All status</option>
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Table shell */}
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Team directory</h2>
              <p className="text-sm text-slate-500">
                Showing people, roles, access levels, and account state.
              </p>
            </div>

            <button className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700">
              <EllipsisHorizontalIcon className="h-5 w-5" />
            </button>
          </div>

          {loading ? (
            <div className="space-y-3 p-5">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="h-16 animate-pulse rounded-2xl bg-slate-100"
                />
              ))}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-slate-50">
                    <tr className="text-left">
                      <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        User
                      </th>
                      <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Role
                      </th>
                      <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Team
                      </th>
                      <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Access
                      </th>
                      <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Status
                      </th>
                      <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Last login
                      </th>
                      <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200">
                    {users.length > 0 ? (
                      users.map((user, index) => (
                        <motion.tr
                          key={user.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.03 }}
                          className="hover:bg-slate-50"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-500 text-sm font-semibold text-white">
                                {getInitials(user.full_name)}
                              </div>
                              <div>
                                <p className="font-medium text-slate-900">{user.full_name}</p>
                                <p className="text-sm text-slate-500">{user.email}</p>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <span className="inline-flex rounded-full bg-sky-100 px-3 py-1 text-xs font-medium text-sky-700">
                              {user.role_name}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-sm text-slate-600">
                            {user.team_name|| '—'}
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                                accessClasses[user.access_level?.toLowerCase()] ||
                                'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {user.access_level}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-medium capitalize ${
                                statusClasses[user.status] ||
                                'bg-slate-100 text-slate-700 ring-1 ring-slate-200'
                              }`}
                            >
                              {user.status}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-sm text-slate-500">
                            {user.last_login
                              ? new Date(user.last_login).toLocaleDateString()
                              : 'Never'}
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleEdit(user)}
                                className="rounded-xl border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                              >
                                <PencilSquareIcon className="h-4 w-4" />
                              </button>

                              <button
                                onClick={() => handleDelete(user.id)}
                                className="rounded-xl border border-rose-200 p-2 text-rose-600 transition hover:bg-rose-50"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="px-5 py-16 text-center">
                          <div className="mx-auto max-w-sm">
                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                              <MagnifyingGlassIcon className="h-6 w-6 text-slate-400" />
                            </div>
                            <h3 className="mt-4 text-lg font-semibold text-slate-900">
                              No users found
                            </h3>
                            <p className="mt-2 text-sm text-slate-500">
                              Try changing your search term or filters to find a matching user.
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {pagination.pages > 1 && (
                <div className="flex flex-col gap-4 border-t border-slate-200 px-5 py-4 md:flex-row md:items-center md:justify-between">
                  <p className="text-sm text-slate-500">
                    Showing {(pagination.page - 1) * pagination.per_page + 1} to{' '}
                    {Math.min(pagination.page * pagination.per_page, pagination.total)} of{' '}
                    {pagination.total} users
                  </p>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
                      }
                      disabled={pagination.page === 1}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <ChevronLeftIcon className="h-4 w-4" />
                      Previous
                    </button>

                    <div className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700">
                      Page {pagination.page} of {pagination.pages}
                    </div>

                    <button
                      onClick={() =>
                        setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
                      }
                      disabled={pagination.page === pagination.pages}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Next
                      <ChevronRightIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {showModal && <UserModal user={editingUser} onClose={handleModalClose} />}
        {deactivatingUserId !== null && (
          <ConfirmDialog
            isOpen={deactivatingUserId !== null}
            title="Deactivate User?"
            message="Are you sure you want to deactivate this user?"
            variant="danger"
            confirmLabel="Yes, Deactivate"
            cancelLabel="Cancel"
            onConfirm={confirmDeactivate}
            onCancel={cancelDeactivate}
          />
        )}
      </div>
    </div>
  );
};

export default UsersPage;