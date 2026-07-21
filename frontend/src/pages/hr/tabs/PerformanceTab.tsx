import React, { useState } from "react";
import Panel from "../components/Panel";
import { Button } from "../../../components/ui/Button";
import { Badge } from "../../../components/ui/Badge";
import { Modal } from "../../../components/ui/Modal";
import { Input, Select, Textarea } from "../../../components/ui/Form";
import { StatCard } from "../../../components/ui/StatCard";
import type { BadgeVariant } from "../../../components/ui/Badge";
import axios from "axios";
import { toast } from "react-hot-toast";
import { API_URL } from "../../../config/api";
import { useAuthStore } from "../../../store/authStore";

// ─── Types ────────────────────────────────────────────────────────────────────

type Rating = "Excellent" | "Good" | "Average" | "Poor";

interface EmployeePerformance {
  id: number;
  name: string;
  department: string;
  designation: string;
  reviewPeriod: string;
  efficiency: number;
  quality: number;
  productivity: number;
  attendance: number;
  rating: Rating;
  goals: string;
  feedback: string;
  reviewer: string;
  reviewDate: string;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const initialRecords: EmployeePerformance[] = [];

// Rating → design-system badge variant + bar/text color classes
const ratingVariant: Record<Rating, BadgeVariant> = {
  Excellent: "success",
  Good: "info",
  Average: "warning",
  Poor: "danger",
};

// Metric accent classes (bar fill + label text). Attendance has no matching
// design-system scale, so it keeps its original purple via an arbitrary value.
const metricClasses = {
  efficiency: { bar: "bg-primary-500", text: "text-primary-600" },
  quality: { bar: "bg-success-500", text: "text-success-600" },
  productivity: { bar: "bg-secondary-500", text: "text-secondary-600" },
  attendance: { bar: "bg-[#8B5CF6]", text: "text-[#8B5CF6]" },
};

// ─── Score Bar ────────────────────────────────────────────────────────────────

const ScoreBar: React.FC<{ value: number; barClass: string; textClass: string }> = ({
  value,
  barClass,
  textClass,
}) => (
  <div className="flex items-center gap-2">
    <div className="flex-1 h-2 bg-neutral-200 rounded overflow-hidden">
      <div
        className={`h-full rounded transition-[width] duration-[400ms] ease-in-out ${barClass}`}
        style={{ width: `${value}%` }}
      />
    </div>
    <span className={`text-xs font-bold min-w-[32px] ${textClass}`}>{value}%</span>
  </div>
);

// ─── Rating Badge ─────────────────────────────────────────────────────────────

const RatingBadge: React.FC<{ rating: Rating }> = ({ rating }) => (
  <Badge variant={ratingVariant[rating]} size="sm">
    {rating}
  </Badge>
);

// ─── View Modal ───────────────────────────────────────────────────────────────

const ViewModal: React.FC<{ record: EmployeePerformance; onClose: () => void }> = ({
  record,
  onClose,
}) => (
  <Modal
    isOpen
    onClose={onClose}
    size="md"
    footer={
      <Button variant="primary" fullWidth onClick={onClose}>
        Close
      </Button>
    }
  >
    {/* Header */}
    <div className="flex justify-between items-start mb-6">
      <div>
        <div className="text-lg font-extrabold text-neutral-800">{record.name}</div>
        <div className="text-[13px] text-neutral-500 mt-0.5">
          {record.designation} — {record.department}
        </div>
      </div>
      <RatingBadge rating={record.rating} />
    </div>

    {/* Score Grid */}
    <div className="grid grid-cols-2 gap-4 bg-neutral-50 rounded-md p-4 mb-5">
      {[
        { label: "Efficiency", value: record.efficiency, ...metricClasses.efficiency },
        { label: "Quality", value: record.quality, ...metricClasses.quality },
        { label: "Productivity", value: record.productivity, ...metricClasses.productivity },
        { label: "Attendance", value: record.attendance, ...metricClasses.attendance },
      ].map((m) => (
        <div key={m.label}>
          <div className="text-[11px] text-neutral-500 mb-1">{m.label}</div>
          <ScoreBar value={m.value} barClass={m.bar} textClass={m.text} />
        </div>
      ))}
    </div>

    {/* Details */}
    {[
      { label: "Review Period", value: record.reviewPeriod },
      { label: "Reviewer", value: record.reviewer },
      { label: "Review Date", value: record.reviewDate },
      { label: "Goals", value: record.goals },
      { label: "Feedback", value: record.feedback },
    ].map(({ label, value }) => (
      <div key={label} className="mb-3">
        <div className="text-[11px] font-bold text-neutral-400 uppercase mb-0.5">
          {label}
        </div>
        <div className="text-[13px] text-neutral-700">{value}</div>
      </div>
    ))}
  </Modal>
);

// ─── Add / Edit Form ──────────────────────────────────────────────────────────

const emptyForm = (): Omit<EmployeePerformance, "id"> => ({
  name: "",
  department: "",
  designation: "",
  reviewPeriod: "",
  efficiency: 0,
  quality: 0,
  productivity: 0,
  attendance: 0,
  rating: "Good",
  goals: "",
  feedback: "",
  reviewer: "",
  reviewDate: "",
});

const ratingOptions = ["Excellent", "Good", "Average", "Poor"].map((r) => ({ label: r, value: r }));

const FormModal: React.FC<{
  initial: Omit<EmployeePerformance, "id"> | EmployeePerformance;
  title: string;
  onSave: (data: Omit<EmployeePerformance, "id"> | EmployeePerformance) => void;
  onClose: () => void;
}> = ({ initial, title, onSave, onClose }) => {
  const { user } = useAuthStore();
  const [form, setForm] = useState({ ...initial });
  const [employees, setEmployees] = useState<any[]>([]);

  // Split review period into start and end for UI
  const splitPeriod = form.reviewPeriod ? form.reviewPeriod.split(" to ") : ["", ""];
  const [reviewStart, setReviewStart] = useState(splitPeriod[0]);
  const [reviewEnd, setReviewEnd] = useState(splitPeriod[1] || "");

  const set = (field: string, value: string | number) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  React.useEffect(() => {
    // Pre-fill if it's a new record
    if (!("id" in initial)) {
      set("reviewer", user?.full_name || "");
      set("reviewDate", new Date().toISOString().split("T")[0]);
    }

    const fetchEmployees = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${API_URL}/api/employees/`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        // Filter for current user's team, or show all if user has no team
        const userAny = user as any;
        const teamEmployees = userAny?.team_id 
          ? res.data.filter((e: any) => e.team_id === userAny.team_id)
          : res.data;
          
        setEmployees(teamEmployees);
      } catch (err) {
        console.error("Failed to load employees for dropdown", err);
      }
    };
    fetchEmployees();
  }, [initial, user]);

  const handleEmployeeChange = (empName: string) => {
    const emp = employees.find((e) => `${e.first_name} ${e.last_name}` === empName);
    if (emp) {
      setForm((prev) => ({
        ...prev,
        name: `${emp.first_name} ${emp.last_name}`,
        department: emp.department || "",
        designation: emp.designation || "",
      }));
    } else {
      set("name", empName);
    }
  };

  const handleSave = () => {
    const period = reviewStart && reviewEnd ? `${reviewStart} to ${reviewEnd}` : form.reviewPeriod;
    onSave({ ...form, reviewPeriod: period });
  };

  const labelClass = "text-[11px] font-bold text-neutral-500 uppercase mb-1 block";
  
  const empOptions = [
    { label: "Select Employee", value: "" },
    ...employees.map(e => ({
      label: `${e.first_name} ${e.last_name}`,
      value: `${e.first_name} ${e.last_name}`
    }))
  ];

  return (
    <Modal
      isOpen
      onClose={onClose}
      size="lg"
      title={title}
      footer={
        <>
          <Button variant="outline" fullWidth onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" fullWidth onClick={handleSave}>
            Save
          </Button>
        </>
      }
    >
      {/* Two-column grid */}
      <div className="grid grid-cols-2 gap-3.5">
        <div>
          <label className={labelClass}>Employee Name</label>
          <Select
            options={empOptions.length > 1 ? empOptions : [{ label: form.name || "Select Employee", value: form.name }]}
            value={form.name}
            onChange={handleEmployeeChange}
          />
        </div>
        <div>
          <label className={labelClass}>Department</label>
          <Input value={form.department} onChange={(e) => set("department", e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Designation</label>
          <Input value={form.designation} onChange={(e) => set("designation", e.target.value)} />
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className={labelClass}>Review Start</label>
            <Input type="date" value={reviewStart} onChange={(e) => setReviewStart(e.target.value)} />
          </div>
          <div className="flex-1">
            <label className={labelClass}>Review End</label>
            <Input type="date" value={reviewEnd} onChange={(e) => setReviewEnd(e.target.value)} />
          </div>
        </div>
        <div>
          <label className={labelClass}>Reviewer</label>
          <Input value={form.reviewer} onChange={(e) => set("reviewer", e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Review Date</label>
          <Input type="date" value={form.reviewDate} onChange={(e) => set("reviewDate", e.target.value)} />
        </div>
      </div>

      {/* Score sliders */}
      <div className="grid grid-cols-2 gap-3.5 mt-3.5">
        {[
          { field: "efficiency", label: "Efficiency (%)", ...metricClasses.efficiency },
          { field: "quality", label: "Quality (%)", ...metricClasses.quality },
          { field: "productivity", label: "Productivity (%)", ...metricClasses.productivity },
          { field: "attendance", label: "Attendance (%)", ...metricClasses.attendance },
        ].map(({ field, label, text }) => (
          <div key={field}>
            <label className={labelClass}>
              {label}{" "}
              <span className={`font-extrabold ${text}`}>
                {(form as Record<string, unknown>)[field] as number}%
              </span>
            </label>
            <input
              type="range"
              min={0}
              max={100}
              value={(form as Record<string, unknown>)[field] as number}
              onChange={(e) => set(field, Number(e.target.value))}
              className="w-full"
            />
          </div>
        ))}
      </div>

      {/* Rating */}
      <div className="mt-3.5">
        <label className={labelClass}>Rating</label>
        <Select
          options={ratingOptions}
          value={form.rating}
          onChange={(value) => set("rating", value)}
        />
      </div>

      {/* Text areas */}
      {[
        { field: "goals", label: "Goals" },
        { field: "feedback", label: "Feedback" },
      ].map(({ field, label }) => (
        <div key={field} className="mt-3.5">
          <label className={labelClass}>{label}</label>
          <Textarea
            className="h-[70px] resize-y"
            value={(form as Record<string, unknown>)[field] as string}
            onChange={(e) => set(field, e.target.value)}
          />
        </div>
      ))}
    </Modal>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const PerformanceTab: React.FC = () => {
  const [records, setRecords] = useState<EmployeePerformance[]>(initialRecords);
  const [search, setSearch] = useState("");
  const [filterRating, setFilterRating] = useState<string>("All");
  const [viewRecord, setViewRecord] = useState<EmployeePerformance | null>(null);
  const [editRecord, setEditRecord] = useState<EmployeePerformance | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // ── Derived ──────────────────────────────────────────────────────────────────

  React.useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_URL}/api/performance`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRecords(res.data.records || []);
    } catch (err) {
      toast.error("Failed to load performance records");
    }
  };

  const filtered = records.filter((r) => {
    const matchSearch =
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.department.toLowerCase().includes(search.toLowerCase()) ||
      r.designation.toLowerCase().includes(search.toLowerCase());
    const matchRating = filterRating === "All" || r.rating === filterRating;
    return matchSearch && matchRating;
  });

  const avgOf = (key: keyof EmployeePerformance) =>
    records.length
      ? Math.round(
          records.reduce((sum, r) => sum + (r[key] as number), 0) / records.length
        )
      : 0;

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleAdd = async (data: Omit<EmployeePerformance, "id"> | EmployeePerformance) => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(`${API_URL}/api/performance`, data, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRecords((prev) => [res.data.record, ...prev]);
      setShowAdd(false);
      toast.success("Review added successfully");
    } catch (err) {
      toast.error("Failed to add review");
    }
  };

  const handleEdit = async (data: Omit<EmployeePerformance, "id"> | EmployeePerformance) => {
    try {
      const token = localStorage.getItem("token");
      const recordData = data as EmployeePerformance;
      const res = await axios.put(`${API_URL}/api/performance/${recordData.id}`, recordData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRecords((prev) =>
        prev.map((r) => (r.id === recordData.id ? res.data.record : r))
      );
      setEditRecord(null);
      toast.success("Review updated successfully");
    } catch (err) {
      toast.error("Failed to update review");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API_URL}/api/performance/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRecords((prev) => prev.filter((r) => r.id !== id));
      setDeleteId(null);
      toast.success("Review deleted successfully");
    } catch (err) {
      toast.error("Failed to delete review");
    }
  };

  // ── Summary Cards ─────────────────────────────────────────────────────────────

  const summaryCards = [
    { label: "Total Employees", value: records.length, icon: "👥", color: "primary" as const },
    { label: "Avg Efficiency", value: `${avgOf("efficiency")}%`, icon: "⚡", color: "primary" as const },
    { label: "Avg Quality", value: `${avgOf("quality")}%`, icon: "✅", color: "success" as const },
    { label: "Avg Attendance", value: `${avgOf("attendance")}%`, icon: "📅", color: "info" as const },
    {
      label: "Excellent Ratings",
      value: records.filter((r) => r.rating === "Excellent").length,
      icon: "⭐",
      color: "success" as const,
    },
  ];

  return (
    <Panel>
      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="flex justify-between items-center mb-5">
        <div>
          <div className="text-[17px] font-extrabold text-neutral-800">
            Performance Management
          </div>
          <div className="text-xs text-neutral-500 mt-0.5">
            View, add, edit and manage employee performance reviews
          </div>
        </div>
        <Button variant="primary" onClick={() => setShowAdd(true)}>
          + Add Review
        </Button>
      </div>

      {/* ── Summary Cards ───────────────────────────────────────────────────── */}
      <div className="grid gap-3 mb-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}>
        {summaryCards.map((c) => (
          <StatCard
            key={c.label}
            title={c.label}
            value={c.value}
            color={c.color}
            variant="accent-border"
            subtitle={c.icon}
          />
        ))}
      </div>

      {/* ── Search & Filter ─────────────────────────────────────────────────── */}
      <div className="flex gap-2.5 mb-4">
        <Input
          placeholder="Search by name, department or designation…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
        />
        <Select
          options={["All", "Excellent", "Good", "Average", "Poor"].map((r) => ({ label: r, value: r }))}
          value={filterRating}
          onChange={(value) => setFilterRating(value)}
          className="w-auto min-w-[160px]"
        />
      </div>

      {/* ── Table ───────────────────────────────────────────────────────────── */}
      <div className="overflow-x-auto rounded-md border border-neutral-200">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="bg-neutral-50">
              {[
                "Employee",
                "Department",
                "Period",
                "Efficiency",
                "Quality",
                "Productivity",
                "Attendance",
                "Rating",
                "Actions",
              ].map((h) => (
                <th
                  key={h}
                  className="p-3 text-left font-bold text-[11px] text-neutral-500 uppercase border-b border-neutral-200 whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center p-8 text-neutral-400 text-[13px]">
                  No performance records found.
                </td>
              </tr>
            ) : (
              filtered.map((r, i) => (
                <tr key={r.id} className={`transition-colors duration-150 ${i % 2 === 0 ? "bg-white" : "bg-neutral-25"}`}>
                  <td className="p-3 border-b border-neutral-100">
                    <div className="font-bold text-neutral-800">{r.name}</div>
                    <div className="text-[11px] text-neutral-500">{r.designation}</div>
                  </td>
                  <td className="p-3 border-b border-neutral-100 text-neutral-700">
                    {r.department}
                  </td>
                  <td className="p-3 border-b border-neutral-100 text-neutral-700">
                    {r.reviewPeriod}
                  </td>
                  {[
                    { v: r.efficiency, ...metricClasses.efficiency },
                    { v: r.quality, ...metricClasses.quality },
                    { v: r.productivity, ...metricClasses.productivity },
                    { v: r.attendance, ...metricClasses.attendance },
                  ].map(({ v, bar, text }, idx) => (
                    <td key={idx} className="p-3 border-b border-neutral-100 min-w-[100px]">
                      <ScoreBar value={v} barClass={bar} textClass={text} />
                    </td>
                  ))}
                  <td className="p-3 border-b border-neutral-100">
                    <RatingBadge rating={r.rating} />
                  </td>
                  <td className="p-3 border-b border-neutral-100">
                    <div className="flex gap-1.5">
                      {/* View */}
                      <button
                        className="px-2.5 py-1 rounded-md text-xs font-medium bg-info-50 text-info-700 hover:bg-info-100 transition-colors"
                        onClick={() => setViewRecord(r)}
                      >
                        View
                      </button>
                      {/* Edit */}
                      <button
                        className="px-2.5 py-1 rounded-md text-xs font-medium bg-success-50 text-success-700 hover:bg-success-100 transition-colors"
                        onClick={() => setEditRecord(r)}
                      >
                        Edit
                      </button>
                      {/* Delete */}
                      <button
                        className="px-2.5 py-1 rounded-md text-xs font-medium bg-danger-50 text-danger-700 hover:bg-danger-100 transition-colors"
                        onClick={() => setDeleteId(r.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-neutral-400 mt-2.5">
        Showing {filtered.length} of {records.length} records
      </div>

      {/* ── Modals ──────────────────────────────────────────────────────────── */}

      {viewRecord && (
        <ViewModal record={viewRecord} onClose={() => setViewRecord(null)} />
      )}

      {showAdd && (
        <FormModal
          title="Add Performance Review"
          initial={emptyForm()}
          onSave={handleAdd}
          onClose={() => setShowAdd(false)}
        />
      )}

      {editRecord && (
        <FormModal
          title="Edit Performance Review"
          initial={editRecord}
          onSave={handleEdit}
          onClose={() => setEditRecord(null)}
        />
      )}

      {/* ── Delete Confirm ───────────────────────────────────────────────────── */}
      {deleteId !== null && (
        <Modal
          isOpen
          onClose={() => setDeleteId(null)}
          size="sm"
          footer={
            <>
              <Button variant="outline" fullWidth onClick={() => setDeleteId(null)}>
                Cancel
              </Button>
              <Button variant="danger" fullWidth onClick={() => handleDelete(deleteId)}>
                Yes, Delete
              </Button>
            </>
          }
        >
          <div className="text-center">
            <div className="text-4xl mb-3">🗑️</div>
            <div className="text-base font-extrabold text-neutral-800 mb-2">
              Delete Review?
            </div>
            <div className="text-[13px] text-neutral-500">
              This action cannot be undone. The performance record will be permanently removed.
            </div>
          </div>
        </Modal>
      )}
    </Panel>
  );
};

export default PerformanceTab;
