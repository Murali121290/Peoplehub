import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Modal } from "../../../components/ui/Modal";
import { DatePicker } from "../../../components/ui/DatePicker";
import { 
  CalendarIcon, 
  PlusIcon, 
  TrashIcon, 
  PencilIcon, 
  MegaphoneIcon, 
  AdjustmentsHorizontalIcon 
} from "@heroicons/react/24/outline";

const API_URL = `${import.meta.env.VITE_API_URL || ""}/api`;

export const HolidayTab: React.FC = () => {
  const [holidays, setHolidays] = useState<any[]>([]);
  const [overrides, setOverrides] = useState<any[]>([]);
  const [holidayTypes, setHolidayTypes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Holiday Modal state
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<any>(null);
  const [holidayForm, setHolidayForm] = useState({
    name: "",
    date: "",
    holiday_type: "Festival Holiday",
    is_published: false
  });

  // Weekend Override form state
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideForm, setOverrideForm] = useState({
    date: "",
    override_type: "Working Day", // "Working Day" or "Holiday"
    name: "",
    holiday_type: "Weekly Off"
  });

  useEffect(() => {
    fetchAdminHolidays();
  }, []);

  const fetchAdminHolidays = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      const [resHolidays, resTypes] = await Promise.all([
        axios.get(`${API_URL}/holidays`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/holidays/types`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { types: ["National Holiday", "Festival Holiday", "Company Holiday", "Weekly Off"] } }))
      ]);
      setHolidays(resHolidays.data.holidays || []);
      setOverrides(resHolidays.data.overrides || []);
      setHolidayTypes(resTypes.data.types || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load holidays calendar");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenHolidayModal = (h?: any) => {
    if (h) {
      setEditingHoliday(h);
      setHolidayForm({
        name: h.name,
        date: h.date,
        holiday_type: h.holiday_type,
        is_published: h.is_published
      });
    } else {
      setEditingHoliday(null);
      setHolidayForm({
        name: "",
        date: "",
        holiday_type: "Festival Holiday",
        is_published: false
      });
    }
    setShowHolidayModal(true);
  };

  const handleSaveHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!holidayForm.name || !holidayForm.date) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      if (editingHoliday) {
        await axios.put(`${API_URL}/holidays/${editingHoliday.id}`, holidayForm, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success("Holiday updated successfully");
      } else {
        await axios.post(`${API_URL}/holidays`, holidayForm, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success("Holiday created successfully");
      }
      setShowHolidayModal(false);
      fetchAdminHolidays();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Error saving holiday");
    }
  };

  const handleDeleteHoliday = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this holiday?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API_URL}/holidays/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Holiday deleted successfully");
      fetchAdminHolidays();
    } catch (err) {
      toast.error("Error deleting holiday");
    }
  };

  const handlePublishAll = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(`${API_URL}/holidays/publish`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(res.data.message || "All draft holidays published");
      fetchAdminHolidays();
    } catch (err) {
      toast.error("Error publishing holidays");
    }
  };

  const handleSaveOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideForm.date) {
      toast.error("Date is required");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      await axios.post(`${API_URL}/holidays/override`, overrideForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Weekend override updated successfully");
      setShowOverrideModal(false);
      setOverrideForm({
        date: "",
        override_type: "Working Day",
        name: "",
        holiday_type: "Weekly Off"
      });
      fetchAdminHolidays();
    } catch (err) {
      toast.error("Error saving weekend override");
    }
  };

  const handleRemoveOverride = async (dateStr: string) => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${API_URL}/holidays/override`, {
        date: dateStr,
        override_type: "none"
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Weekend override cleared successfully");
      fetchAdminHolidays();
    } catch (err) {
      toast.error("Error clearing override");
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn p-1">
      {/* Title block */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <div>
          <h1 className="text-xl font-bold text-neutral-800 tracking-tight flex items-center gap-2">
            Holiday Calendar Management
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Create, edit, publish corporate holidays, and configure weekend overrides
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => setShowOverrideModal(true)}
            icon={AdjustmentsHorizontalIcon}
            className="bg-neutral-100 border border-neutral-300 text-neutral-700 hover:bg-neutral-200 font-semibold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm"
          >
            Weekend Override
          </Button>
          <Button
            onClick={handlePublishAll}
            icon={MegaphoneIcon}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm"
          >
            Publish Drafts
          </Button>
          <Button
            onClick={() => handleOpenHolidayModal()}
            icon={PlusIcon}
            className="bg-primary-600 hover:bg-primary-700 text-white font-semibold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-md hover:shadow-lg transition-all"
          >
            Add Holiday
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Side: Holiday List table */}
        <Card className="xl:col-span-2 shadow-sm rounded-2xl border border-neutral-200 p-6 bg-white">
          <h3 className="text-sm font-bold text-neutral-850 mb-4 border-b border-neutral-100 pb-3 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-indigo-600" />
            Scheduled Holidays List
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-100 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Day</th>
                  <th className="py-3 px-4">Holiday Name</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100/50 text-xs">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-neutral-400">Loading scheduled holidays...</td>
                  </tr>
                ) : holidays.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-neutral-400">No scheduled holidays. Click "Add Holiday" to create one.</td>
                  </tr>
                ) : (
                  holidays.map(h => (
                    <tr key={h.id} className="hover:bg-neutral-50/50">
                      <td className="py-3.5 px-4 text-neutral-700 font-medium">{h.date}</td>
                      <td className="py-3.5 px-4 text-neutral-500">{h.day}</td>
                      <td className="py-3.5 px-4 text-neutral-800 font-bold">{h.name}</td>
                      <td className="py-3.5 px-4">
                        <span className="bg-violet-50 text-violet-700 border border-violet-100 px-2 py-0.5 rounded-full font-semibold">
                          {h.holiday_type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full font-bold border ${
                          h.is_published 
                            ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                            : "bg-amber-50 text-amber-700 border-amber-100 animate-pulse"
                        }`}>
                          {h.is_published ? "Published" : "Draft"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenHolidayModal(h)}
                            className="p-1 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-neutral-100"
                            title="Edit holiday"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteHoliday(h.id)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded-lg hover:bg-neutral-100"
                            title="Delete holiday"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Right Side: Weekend Overrides list */}
        <Card className="shadow-sm rounded-2xl border border-neutral-200 p-6 bg-white">
          <h3 className="text-sm font-bold text-neutral-850 mb-4 border-b border-neutral-100 pb-3 flex items-center gap-2">
            <AdjustmentsHorizontalIcon className="w-5 h-5 text-indigo-600" />
            Active Weekend Overrides
          </h3>

          <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1">
            {overrides.length === 0 ? (
              <div className="text-center text-xs text-neutral-400 py-12">
                No active weekend working days or manual swaps configured.
              </div>
            ) : (
              overrides.map(o => (
                <div key={o.date} className="p-3 border border-neutral-200/60 rounded-xl flex flex-col gap-1.5 bg-white">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-bold text-neutral-800">
                      {o.name || (o.override_type === "Working Day" ? "Manual Working Weekend" : "Special Holiday Off")}
                    </span>
                    <button 
                      onClick={() => handleRemoveOverride(o.date)}
                      className="text-neutral-400 hover:text-red-500 p-0.5 rounded-lg hover:bg-neutral-50"
                      title="Clear override"
                    >
                      <TrashIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex justify-between text-[11px] text-neutral-500 font-semibold">
                    <span>Date: {o.date}</span>
                    <span className={`px-2 py-0.5 rounded-full font-bold border ${
                      o.override_type === "Working Day" 
                        ? "bg-amber-50 text-amber-700 border-amber-100" 
                        : "bg-slate-50 text-slate-700 border-slate-100"
                    }`}>
                      {o.override_type}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Add/Edit Holiday Modal */}
      <Modal
        isOpen={showHolidayModal}
        onClose={() => setShowHolidayModal(false)}
        title={editingHoliday ? "Edit Corporate Holiday" : "Add Corporate Holiday"}
        size="md"
      >
        <form onSubmit={handleSaveHoliday} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-2">
              Holiday Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Independence Day, Diwali"
              value={holidayForm.name}
              onChange={e => setHolidayForm({ ...holidayForm, name: e.target.value })}
              className="w-full border border-neutral-200 rounded-xl px-4 py-2.5 text-sm text-neutral-600 focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-400 font-medium"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-2">
                Holiday Date <span className="text-red-500">*</span>
              </label>
              <DatePicker
                required
                value={holidayForm.date}
                onChange={val => setHolidayForm({ ...holidayForm, date: val })}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-2">
                Holiday Type
              </label>
              <select
                value={holidayForm.holiday_type}
                onChange={e => setHolidayForm({ ...holidayForm, holiday_type: e.target.value })}
                className="w-full border border-neutral-200 rounded-xl px-4 py-2.5 text-sm text-neutral-600 focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-400 font-medium bg-white"
              >
                {holidayTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="is_published"
              checked={holidayForm.is_published}
              onChange={e => setHolidayForm({ ...holidayForm, is_published: e.target.checked })}
              className="w-4 h-4 text-primary-600 border-neutral-300 rounded focus:ring-primary-500"
            />
            <label htmlFor="is_published" className="text-xs font-semibold text-neutral-700 select-none">
              Publish holiday calendar immediately (Visible to employees)
            </label>
          </div>

          <div className="flex justify-end gap-2.5 pt-4 border-t border-neutral-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowHolidayModal(false)}
              className="px-4 py-2 rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-primary-600 hover:bg-primary-700 text-white font-semibold px-5 py-2 rounded-xl text-xs shadow-md"
            >
              Save Holiday
            </Button>
          </div>
        </form>
      </Modal>

      {/* Weekend Override Modal */}
      <Modal
        isOpen={showOverrideModal}
        onClose={() => setShowOverrideModal(false)}
        title="Weekend Policy Override"
        size="md"
      >
        <form onSubmit={handleSaveOverride} className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3.5 rounded-xl text-xs leading-relaxed font-semibold">
            Use overrides to swap weekends. For example, toggle a Saturday to a Working Day or a Sunday to an active Holiday.
          </div>

          <div>
            <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-2">
              Select Target Weekend Date <span className="text-red-500">*</span>
            </label>
            <DatePicker
              required
              value={overrideForm.date}
              onChange={val => setOverrideForm({ ...overrideForm, date: val })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-2">
                Override Target Status
              </label>
              <select
                value={overrideForm.override_type}
                onChange={e => setOverrideForm({ ...overrideForm, override_type: e.target.value })}
                className="w-full border border-neutral-200 rounded-xl px-4 py-2.5 text-sm text-neutral-600 focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-400 font-medium bg-white"
              >
                <option value="Working Day">Working Day (Weekend Swapped to Work)</option>
                <option value="Holiday">Holiday (Weekend Swapped to Off)</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-2">
                Holiday Type (If swapping to Holiday)
              </label>
              <select
                value={overrideForm.holiday_type}
                disabled={overrideForm.override_type !== "Holiday"}
                onChange={e => setOverrideForm({ ...overrideForm, holiday_type: e.target.value })}
                className="w-full border border-neutral-200 rounded-xl px-4 py-2.5 text-sm text-neutral-600 focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-400 font-medium bg-white disabled:bg-neutral-100 disabled:text-neutral-400"
              >
                <option value="Weekly Off">Weekly Off</option>
                <option value="Festival Holiday">Festival Holiday</option>
                <option value="National Holiday">National Holiday</option>
                <option value="Company Holiday">Company Holiday</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-2">
              Reason / Display Name (e.g. "Special Work Session")
            </label>
            <input
              type="text"
              placeholder="Provide a name or brief swap reason"
              value={overrideForm.name}
              onChange={e => setOverrideForm({ ...overrideForm, name: e.target.value })}
              className="w-full border border-neutral-200 rounded-xl px-4 py-2.5 text-sm text-neutral-600 focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-400 font-medium"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-4 border-t border-neutral-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowOverrideModal(false)}
              className="px-4 py-2 rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-primary-600 hover:bg-primary-700 text-white font-semibold px-5 py-2 rounded-xl text-xs shadow-md"
            >
              Apply Override
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default HolidayTab;
