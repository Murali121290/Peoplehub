import React, { useEffect, useState, useCallback } from "react";
import { API_URL } from "../../config/api";
import { useAuthStore } from "../../store/authStore";
import { CheckIcon, MagnifyingGlassIcon, ClockIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import { BookLoader } from "../../components/ui/Spinner";
import AttendanceDetailModal from "../../layouts/components/AttendanceDetailModal";

const BASE_URL = `${API_URL}/api`;

// ── Helpers ─────────────────────────────────────────────────────────────────

const fmtCycleDate = (iso: string) => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const StatusBadge: React.FC<{ value: string }> = ({ value }) => {
  const map: Record<string, string> = {
    Present:    "bg-emerald-100 text-emerald-700",
    "Half Day": "bg-yellow-100  text-yellow-700",
    Absent:     "bg-red-100     text-red-700",
    Late:       "bg-orange-100  text-orange-700",
    Leave:      "bg-purple-100  text-purple-700",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${map[value] ?? "bg-slate-100 text-slate-600"}`}>
      {value}
    </span>
  );
};

// ── Types ────────────────────────────────────────────────────────────────────

interface PendingRecord {
  id: number;
  db_employee_id: number;
  employee_id: string;
  employee_name: string;
  department: string;
  designation: string;
  attendance_date: string;
  web_checkin: string;
  web_checkout: string;
  biometric_checkin: string;
  biometric_checkout: string;
  working_hours: number;
  status: string;
  manager_status: string;
}

// ── Page ─────────────────────────────────────────────────────────────────────

const PendingAttendancePage: React.FC = () => {
  const { user } = useAuthStore();
  const [records, setRecords] = useState<PendingRecord[]>([]);
  const [cycleStart, setCycleStart] = useState("");
  const [cycleEnd, setCycleEnd] = useState("");
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const uid = localStorage.getItem("user_id");

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchPending = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/attendance/pending-cycle/${uid}`);
      const data = await res.json();
      if (data.success) {
        setRecords(data.records ?? []);
        setCycleStart(data.cycle_start ?? "");
        setCycleEnd(data.cycle_end ?? "");
        // Broadcast updated count to sidebar
        window.dispatchEvent(
          new CustomEvent("pendingAttendanceCount", { detail: data.pending_count ?? 0 })
        );
      } else {
        toast.error(data.error || "Failed to load pending attendance");
      }
    } catch {
      toast.error("Network error while loading pending attendance");
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  // ── Approve a single record ────────────────────────────────────────────────

  const approveRecord = async (rec: PendingRecord) => {
    setApprovingId(rec.id);
    try {
      const url = `${BASE_URL}/attendance/approve/${rec.db_employee_id}?date=${rec.attendance_date}`;
      const res = await fetch(url, { method: "PUT" });
      if (!res.ok) throw new Error();
      // Optimistically remove from list
      setRecords((prev) => {
        const next = prev.filter((r) => r.id !== rec.id);
        window.dispatchEvent(
          new CustomEvent("pendingAttendanceCount", { detail: next.length })
        );
        return next;
      });
      toast.success(`Approved — ${rec.employee_name} · ${fmtCycleDate(rec.attendance_date)}`);
    } catch {
      toast.error("Failed to approve. Please try again.");
    } finally {
      setApprovingId(null);
    }
  };

  // ── Approve All visible ────────────────────────────────────────────────────

  const approveAll = async () => {
    const pending = filtered;
    if (!pending.length) return;
    const confirmed = window.confirm(`Approve all ${pending.length} pending records?`);
    if (!confirmed) return;

    let failed = 0;
    for (const rec of pending) {
      try {
        const url = `${BASE_URL}/attendance/approve/${rec.db_employee_id}?date=${rec.attendance_date}`;
        await fetch(url, { method: "PUT" });
      } catch {
        failed++;
      }
    }

    if (failed > 0) {
      toast.error(`${failed} record(s) failed to approve`);
    } else {
      toast.success("All records approved!");
    }
    await fetchPending();
  };

  // ── Filter ─────────────────────────────────────────────────────────────────

  const filtered = records.filter((r) => {
    const q = search.toLowerCase();
    return (
      !q ||
      r.employee_name.toLowerCase().includes(q) ||
      r.employee_id.toLowerCase().includes(q) ||
      r.department.toLowerCase().includes(q) ||
      r.designation.toLowerCase().includes(q) ||
      r.attendance_date.includes(q)
    );
  });

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <BookLoader />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 p-6">
      {/* ── Header ── */}
      <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ClockIcon className="h-7 w-7 text-orange-500" />
            Pending Attendance
          </h1>
          {cycleStart && cycleEnd && (
            <p className="mt-1 text-sm text-slate-500">
              Payroll Cycle:{" "}
              <span className="font-semibold text-slate-700">
                {fmtCycleDate(cycleStart)} – {fmtCycleDate(cycleEnd)}
              </span>
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search employee, dept…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm text-slate-700 placeholder-slate-400 shadow-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200 w-56 transition-all"
            />
          </div>

          {/* Approve All button */}
          {filtered.length > 0 && (
            <button
              id="approve-all-pending-btn"
              onClick={approveAll}
              className="flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-orange-200 hover:bg-orange-600 transition-colors"
            >
              <CheckIcon className="h-4 w-4" />
              Approve All ({filtered.length})
            </button>
          )}
        </div>
      </div>

      {/* ── Summary Badge ── */}
      <div className="mb-4 flex items-center gap-3">
        <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-4 py-1.5 text-sm font-semibold text-orange-700 border border-orange-200">
          <span className="h-2 w-2 rounded-full bg-orange-500 animate-pulse inline-block" />
          {records.length} pending {records.length === 1 ? "record" : "records"}
        </div>
      </div>

      {/* ── Empty State ── */}
      {records.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-emerald-300 bg-emerald-50 py-20 text-center">
          <div className="text-5xl mb-4">✅</div>
          <h3 className="text-xl font-bold text-emerald-700">All attendance approved!</h3>
          <p className="mt-2 text-sm text-emerald-600">
            No pending records for the current payroll cycle.
          </p>
        </div>
      )}

      {/* ── Table ── */}
      {records.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[1100px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Web Check-in</th>
                <th className="px-4 py-3">Web Check-out</th>
                <th className="px-4 py-3">Biometric In</th>
                <th className="px-4 py-3">Biometric Out</th>
                <th className="px-4 py-3 text-center">Hours</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((rec, idx) => (
                <tr
                  key={rec.id}
                  className={`border-b border-slate-50 transition-colors hover:bg-orange-50/40 ${idx % 2 === 0 ? "" : "bg-slate-50/30"}`}
                >
                  {/* Employee */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-600">
                        {rec.employee_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-slate-800">{rec.employee_name}</div>
                        <div className="text-xs text-slate-400">{rec.designation}</div>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3 text-slate-500">{rec.employee_id || "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{rec.department || "—"}</td>

                  {/* Date */}
                  <td className="px-4 py-3 font-medium text-slate-700">
                    {fmtCycleDate(rec.attendance_date)}
                  </td>

                  {/* Web times */}
                  <td className="px-4 py-3 text-slate-600">{rec.web_checkin}</td>
                  <td className="px-4 py-3 text-slate-600">{rec.web_checkout}</td>

                  {/* Biometric times */}
                  <td className="px-4 py-3 text-slate-500">{rec.biometric_checkin}</td>
                  <td className="px-4 py-3 text-slate-500">{rec.biometric_checkout}</td>

                  {/* Hours */}
                  <td className="px-4 py-3 text-center">
                    <span className={`font-semibold ${rec.working_hours >= 8 ? "text-emerald-600" : rec.working_hours >= 4 ? "text-yellow-600" : "text-red-500"}`}>
                      {rec.working_hours > 0 ? `${rec.working_hours}h` : "—"}
                    </span>
                  </td>

                  {/* Status badge */}
                  <td className="px-4 py-3">
                    <StatusBadge value={rec.status} />
                  </td>

                  {/* Action buttons */}
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedRecord(rec);
                          setShowDetailModal(true);
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        View
                      </button>
                      <button
                        id={`approve-btn-${rec.id}`}
                        disabled={approvingId === rec.id}
                        onClick={() => approveRecord(rec)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm shadow-emerald-200 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                      >
                        {approvingId === rec.id ? (
                          <span className="h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                        ) : (
                          <CheckIcon className="h-3.5 w-3.5" />
                        )}
                        {approvingId === rec.id ? "…" : "Approve"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && records.length > 0 && (
                <tr>
                  <td colSpan={11} className="py-10 text-center text-sm text-slate-400">
                    No records match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {showDetailModal && selectedRecord && (
        <AttendanceDetailModal
          selectedEmployee={selectedRecord}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedRecord(null);
          }}
        />
      )}
    </div>
  );
};

export default PendingAttendancePage;
