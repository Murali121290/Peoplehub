import React from 'react';
import Panel from '../components/Panel';
import { Button } from '../../../components/ui/Button';

const SETTINGS = [
  { label: "System Notifications", sub: "Receive dashboard notifications", default: true },
  { label: "Email Alerts for Leave Requests", sub: "Get notified when leaves are requested", default: true },
  { label: "Auto-approve Leaves under 2 days", sub: "Automatically approve short leaves", default: false },
  { label: "Daily Attendance Report", sub: "Receive daily attendance summary", default: true },
  { label: "Performance Review Reminders", sub: "Get reminded before review deadlines", default: true },
];

const SettingsTab: React.FC = () => {
  return (
    <Panel>
      <div className="text-[15px] font-extrabold text-neutral-800 mb-5">HR Admin Settings</div>
      <div className="flex flex-col gap-4">
        {SETTINGS.map((s) => (
          <div key={s.label} className="flex items-center justify-between p-4 bg-neutral-50 rounded-[10px]">
            <div>
              <div className="text-sm font-semibold text-neutral-800">{s.label}</div>
              <div className="text-[11px] text-neutral-500">{s.sub}</div>
            </div>
            <input type="checkbox" defaultChecked={s.default} className="w-5 h-5 cursor-pointer accent-primary-500" />
          </div>
        ))}
        <div className="flex gap-3 mt-2">
          <Button fullWidth>Save All Settings</Button>
          <Button variant="outline">Reset to Defaults</Button>
        </div>
      </div>
    </Panel>
  );
};

export default SettingsTab;
