import React, { useState } from 'react';
import {
  UserGroupIcon,
  BuildingOfficeIcon,
  UserCircleIcon,
  BellIcon,
  ShieldCheckIcon,
  SwatchIcon,
} from '@heroicons/react/24/outline';
import UsersPage from './UsersPage';

type TabType =
  | 'users'
  | 'clients'
  | 'profile'
  | 'notifications'
  | 'security'
  | 'appearance';

const tabs = [
  {
    id: 'users' as TabType,
    label: 'Users',
    icon: UserGroupIcon,
    hint: 'Team access',
  },
  {
    id: 'clients' as TabType,
    label: 'Clients',
    icon: BuildingOfficeIcon,
    hint: 'Organizations',
  },
  {
    id: 'profile' as TabType,
    label: 'Profile',
    icon: UserCircleIcon,
    hint: 'Personal info',
  },
  {
    id: 'notifications' as TabType,
    label: 'Notifications',
    icon: BellIcon,
    hint: 'Alerts & email',
  },
  {
    id: 'security' as TabType,
    label: 'Security',
    icon: ShieldCheckIcon,
    hint: 'Password & 2FA',
  },
  {
    id: 'appearance' as TabType,
    label: 'Appearance',
    icon: SwatchIcon,
    hint: 'Theme & layout',
  },
];

const Toggle = ({ enabled = false }: { enabled?: boolean }) => {
  return (
    <button
      type="button"
      className={`relative h-6 w-11 rounded-full transition ${
        enabled ? 'bg-[#49464C]' : 'bg-slate-300'
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition ${
          enabled ? 'left-5' : 'left-0.5'
        }`}
      />
    </button>
  );
};

const SectionCard = ({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
    <div className="mb-5">
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
    </div>
    {children}
  </div>
);

const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('users');

  const activeTabData = tabs.find((tab) => tab.id === activeTab);

  const renderContent = () => {
    switch (activeTab) {
      case 'users':
        return <UsersPage />;

      case 'clients':

      case 'profile':
        return (
          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <SectionCard
              title="Profile details"
              subtitle="Update your personal information and workspace identity."
            >
              <div className="space-y-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#1985A1] text-xl font-bold text-white">
                    SB
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Selva Bharath</p>
                    <p className="text-sm text-slate-500">selva.bharath@example.com</p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      First name
                    </label>
                    <input
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-slate-400"
                      defaultValue="Selva"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Last name
                    </label>
                    <input
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-slate-400"
                      defaultValue="Bharath"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Email address
                  </label>
                  <input
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-slate-400"
                    defaultValue="selva.bharath@example.com"
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <button className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
                    Cancel
                  </button>
                  <button className="rounded-xl bg-[#46494C] px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800">
                    Save changes
                  </button>
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title="Workspace summary"
              subtitle="Quick account details and recent activity."
            >
              <div className="space-y-4">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Role</p>
                  <p className="mt-1 font-semibold text-slate-900">Administrator</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Last sign in</p>
                  <p className="mt-1 font-semibold text-slate-900">Today, 09:45 AM</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Workspace plan</p>
                  <p className="mt-1 font-semibold text-slate-900">Business Pro</p>
                </div>
              </div>
            </SectionCard>
          </div>
        );

      case 'notifications':
        return (
          <SectionCard
            title="Notification preferences"
            subtitle="Choose how and when updates reach you."
          >
            <div className="space-y-3">
              {[
                {
                  title: 'Email notifications',
                  text: 'Receive project and client activity by email.',
                  enabled: true,
                },
                {
                  title: 'Push notifications',
                  text: 'Get instant updates inside the dashboard.',
                  enabled: true,
                },
                {
                  title: 'Weekly digest',
                  text: 'A summary of users, projects, and milestones.',
                  enabled: false,
                },
                {
                  title: 'Milestone alerts',
                  text: 'Notify me when important work reaches completion.',
                  enabled: true,
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
                >
                  <div className="pr-4">
                    <p className="font-medium text-slate-900">{item.title}</p>
                    <p className="mt-1 text-sm text-slate-500">{item.text}</p>
                  </div>
                  <Toggle enabled={item.enabled} />
                </div>
              ))}
            </div>
          </SectionCard>
        );

      case 'security':
        return (
          <div className="grid gap-6 lg:grid-cols-2">
            <SectionCard
              title="Password"
              subtitle="Keep your account secure with a strong password."
            >
              <div className="space-y-4">
                <input
                  type="password"
                  placeholder="Current password"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-slate-400"
                />
                <input
                  type="password"
                  placeholder="New password"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-slate-400"
                />
                <button className="rounded-xl bg-[#46494C] px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800">
                  Update password
                </button>
              </div>
            </SectionCard>

            <SectionCard
              title="Two-factor authentication"
              subtitle="Add another verification step to protect your account."
            >
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div>
                  <p className="font-medium text-slate-900">2FA status</p>
                  <p className="mt-1 text-sm text-slate-500">Currently disabled</p>
                </div>
                <button className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-white">
                  Enable now
                </button>
              </div>
            </SectionCard>
          </div>
        );

      case 'appearance':
        return (
          <div className="grid gap-6 lg:grid-cols-2">
            <SectionCard
              title="Theme"
              subtitle="Adjust the look and feel of your workspace."
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <div>
                    <p className="font-medium text-slate-900">Dark mode</p>
                    <p className="mt-1 text-sm text-slate-500">
                      Switch between light and dark interface styles.
                    </p>
                  </div>
                  <Toggle enabled={false} />
                </div>

                <div>
                  <p className="mb-3 text-sm font-medium text-slate-700">Accent color</p>
                  <div className="flex flex-wrap gap-3">
                    {[
                      'bg-blue-500',
                      'bg-emerald-500',
                      'bg-amber-500',
                      'bg-rose-500',
                      'bg-violet-500',
                      'bg-cyan-500',
                    ].map((color) => (
                      <button
                        key={color}
                        className={`h-10 w-10 rounded-full border-4 border-white shadow ${color}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title="Layout density"
              subtitle="Choose how compact the interface  uld feel."
            >
              <div className="grid gap-3">
                {['Comfortable', 'Balanced', 'Compact'].map((item, index) => (
                  <button
                    key={item}
                    className={`rounded-2xl border px-4 py-4 text-left ${
                      index === 1
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 bg-white text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <p className="font-medium">{item}</p>
                    <p
                      className={`mt-1 text-sm ${
                        index === 1 ? 'text-slate-300' : 'text-slate-500'
                      }`}
                    >
                      Best for daily admin work.
                    </p>
                  </button>
                ))}
              </div>
            </SectionCard>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Workspace settings</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">
              Settings
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Manage your team, profile, notifications, and interface preferences.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 sm:w-auto">
            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-center">
              <p className="text-xs uppercase tracking-wide text-slate-500">Users</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">12</p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-center">
              <p className="text-xs uppercase tracking-wide text-slate-500">Clients</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">8</p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-center">
              <p className="text-xs uppercase tracking-wide text-slate-500">Projects</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">23</p>
            </div>
          </div>
        </div>

        <div className="mb-6 overflow-x-auto">
          <div className="inline-flex min-w-full gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex min-w-fit items-center gap-3 rounded-xl px-4 py-3 text-left transition ${
                    isActive
                      ? 'bg-[#1985A1] text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <div>
                    <p className="text-sm font-medium">{tab.label}</p>
                    <p
                      className={`text-xs ${
                        isActive ? 'text-slate-300' : 'text-slate-400'
                      }`}
                    >
                      {tab.hint}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              {activeTabData?.label}
            </h2>
            <p className="mt-1 text-sm text-slate-500">{activeTabData?.hint}</p>
          </div>
        </div>

        {renderContent()}
      </div>
    </div>
  );
};

export default SettingsPage;