import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

interface TelecomEntry {
  id: number;
  department_name: string;
  team_name: string;
  employee_name: string;
  designation: string;
  extension_number: string;
  direct_number?: string;
  location?: string;
  status: "Active" | "Inactive";
  created_at?: string;
}

interface FormData {
  department_name: string;
  team_name: string;
  employee_name: string;
  designation: string;
  extension_number: string;
  direct_number: string;
  location: string;
  status: "Active" | "Inactive";
}

const EMPTY_FORM: FormData = {
  department_name: "",
  team_name: "",
  employee_name: "",
  designation: "",
  extension_number: "",
  direct_number: "",
  location: "",
  status: "Active",
};

export default function TelecomDirectory() {
  const user =
  typeof window !== "undefined"
    ? JSON.parse(localStorage.getItem("user") || "{}")
    : {};

// Debug
console.log("User Data:", user);
console.log("Role:", user?.role);
console.log("Access Level:", user?.access_level);

// Support both role and access_level
const isAdmin =
  user?.role === "Admin" ||
  user?.role === "admin" ||
  user?.access_level === "admin";

const isHR =
  user?.role === "HR" ||
  user?.role === "hr" ||
  user?.access_level === "hr";

const canEdit = isAdmin || isHR;

// Temporary testing
console.log("Can Edit:", canEdit);

  const [telecoms, setTelecoms] = useState<TelecomEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [sortField, setSortField] = useState<
    "extension_number" | "department_name" | "employee_name"
  >("extension_number");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 5;

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [formLoading, setFormLoading] = useState(false);

  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  useEffect(() => {
    loadTelecoms();
  }, []);

  const loadTelecoms = async () => {
    try {
      setLoading(true);
      const response = await fetch("http://localhost:5000/api/telecom/");
      if (!response.ok) throw new Error("Failed to fetch telecoms");
      const data = await response.json();
      setTelecoms(Array.isArray(data) ? data : []);
    } catch {
      setTelecoms([]);
      toast.error("Failed to load telecom directory.");
    } finally {
      setLoading(false);
    }
  };

  async function handleAddTelecom() {
    if (
      !form.department_name ||
      !form.team_name ||
      !form.employee_name ||
      !form.extension_number
    ) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setFormLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/telecom/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) throw new Error();

      toast.success("Extension added successfully.");
      closeModal();
      loadTelecoms();
    } catch {
      toast.error("Failed to add extension.");
    } finally {
      setFormLoading(false);
    }
  }

  async function handleUpdateTelecom() {
  if (
    !form.department_name ||
    !form.team_name ||
    !form.employee_name ||
    !form.extension_number
  ) {
    toast.error("Please fill in all required fields.");
    return;
  }

  if (!editingId) return;

  setFormLoading(true);

  try {
    const res = await fetch(
      `http://localhost:5000/api/telecom/${editingId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      toast.error(data.message || "Failed to update extension.");
      return;
    }

    toast.success(
      data.message || "Extension updated successfully."
    );

    closeModal();
    loadTelecoms();

  } catch (error) {
    console.error("Update Telecom Error:", error);
    toast.error("Server error. Please try again.");
  } finally {
    setFormLoading(false);
  }
}
  async function handleDeleteTelecom() {
    if (!deleteId) return;

    setDeleteLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/telecom/${deleteId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error();

      toast.success("Extension deleted.");
      setDeleteId(null);
      loadTelecoms();
    } catch {
      toast.error("Failed to delete extension.");
    } finally {
      setDeleteLoading(false);
    }
  }

  async function handleToggleStatus(entry: TelecomEntry) {
    setTogglingId(entry.id);
    const newStatus = entry.status === "Active" ? "Inactive" : "Active";

    try {
      const res = await fetch(`http://localhost:5000/api/telecom/${entry.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          department_name: entry.department_name,
          team_name: entry.team_name,
          employee_name: entry.employee_name,
          designation: entry.designation,
          extension_number: entry.extension_number,
          direct_number: entry.direct_number || "",
          location: entry.location || "",
          status: newStatus,
        }),
      });

      if (!res.ok) throw new Error();

      toast.success(`Extension marked as ${newStatus}.`);
      loadTelecoms();
    } catch {
      toast.error("Failed to update status.");
    } finally {
      setTogglingId(null);
    }
  }

  function openAddModal() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEditModal(entry: TelecomEntry) {
    setEditingId(entry.id);
    setForm({
      department_name: entry.department_name,
      team_name: entry.team_name,
      employee_name: entry.employee_name,
      designation: entry.designation,
      extension_number: entry.extension_number,
      direct_number: entry.direct_number || "",
      location: entry.location || "",
      status: entry.status,
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  function toggleSort(
    field: "extension_number" | "department_name" | "employee_name"
  ) {
    if (sortField === field) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
    setCurrentPage(1);
  }

  const departments = useMemo(() => {
    return Array.from(new Set(telecoms.map((r) => r.department_name))).sort();
  }, [telecoms]);

  const recentCutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const recentlyAdded = telecoms.filter(
    (r) => r.created_at && new Date(r.created_at).getTime() > recentCutoff
  ).length;

  const filtered = useMemo(() => {
    return telecoms
      .filter((r) => {
        const q = search.toLowerCase().trim();
        if (
          q &&
          !r.team_name.toLowerCase().includes(q) &&
          !r.extension_number.includes(q) &&
          !r.department_name.toLowerCase().includes(q) &&
          !r.employee_name.toLowerCase().includes(q)
        ) {
          return false;
        }

        if (filterDept && r.department_name !== filterDept) return false;
        if (filterStatus && r.status !== filterStatus) return false;

        return true;
      })
      .sort((a, b) => {
        const av = (a[sortField] || "").toString();
        const bv = (b[sortField] || "").toString();
        return sortDir === "asc"
          ? av.localeCompare(bv, undefined, { numeric: true })
          : bv.localeCompare(av, undefined, { numeric: true });
      });
  }, [telecoms, search, filterDept, filterStatus, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const totalActive = telecoms.filter((r) => r.status === "Active").length;
  const totalDepts = new Set(telecoms.map((r) => r.department_name)).size;

  const SortIcon = ({
    field,
  }: {
    field: "extension_number" | "department_name" | "employee_name";
  }) => (
    <span className="ml-1 inline-flex flex-col" style={{ lineHeight: 0 }}>
      <svg
        className={`w-2.5 h-2.5 ${
          sortField === field && sortDir === "asc"
            ? "text-gray-900"
            : "text-gray-300"
        }`}
        viewBox="0 0 10 6"
        fill="currentColor"
      >
        <path d="M5 0L10 6H0L5 0Z" />
      </svg>
      <svg
        className={`w-2.5 h-2.5 mt-0.5 ${
          sortField === field && sortDir === "desc"
            ? "text-gray-900"
            : "text-gray-300"
        }`}
        viewBox="0 0 10 6"
        fill="currentColor"
      >
        <path d="M5 6L0 0H10L5 6Z" />
      </svg>
    </span>
  );

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="text-xs text-gray-400 mb-0.5">
            Home &rsaquo;{" "}
            <span className="text-gray-600">Telecom Directory</span>
          </div>
          <h1 className="text-lg font-bold text-gray-900 tracking-tight">
            Telecom Directory
          </h1>
        </div>

        <div className="w-8 h-8 rounded-full bg-gray-800 text-white text-xs font-bold flex items-center justify-center">
          {(user?.name || "AD").slice(0, 2).toUpperCase()}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        {[
          {
            label: "Total Extensions",
            sub: "All telecom numbers",
            value: telecoms.length,
            accent: "border-l-blue-500",
          },
          {
            label: "Active Numbers",
            sub: "Currently in service",
            value: totalActive,
            accent: "border-l-green-500",
          },
          {
            label: "Departments Covered",
            sub: "Unique departments",
            value: totalDepts,
            accent: "border-l-purple-500",
          },
          {
            label: "Recently Added",
            sub: "Last 30 days",
            value: recentlyAdded,
            accent: "border-l-orange-400",
          },
        ].map((card) => (
          <div
            key={card.label}
            className={`bg-white rounded-lg shadow-sm border border-gray-200 border-l-4 ${card.accent} px-5 py-4`}
          >
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">
              {card.label}
            </p>
            <p className="text-3xl font-extrabold text-gray-900 leading-none mb-1">
              {card.value}
            </p>
            <p className="text-xs text-gray-400">{card.sub}</p>
          </div>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg shadow-sm px-4 py-3 mb-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 min-w-0 max-w-md">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"
            />
          </svg>

          <input
            type="text"
            placeholder="Search by team name, extension, or department..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full h-9 pl-9 pr-3 text-sm border border-gray-200 rounded-md bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-500 focus:bg-white transition-colors"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          <select
            value={filterDept}
            onChange={(e) => {
              setFilterDept(e.target.value);
              setCurrentPage(1);
            }}
            className="h-9 px-3 text-sm border border-gray-200 rounded-md bg-white text-gray-700 focus:outline-none focus:border-gray-500 transition-colors"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setCurrentPage(1);
            }}
            className="h-9 px-3 text-sm border border-gray-200 rounded-md bg-white text-gray-700 focus:outline-none focus:border-gray-500 transition-colors"
          >
            <option value="">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>

          <button
            onClick={() => toggleSort("extension_number")}
            className="h-9 px-3 text-sm border border-gray-200 rounded-md bg-white text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-1.5 whitespace-nowrap"
          >
            <svg
              className="w-4 h-4 text-gray-500"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 7h18M6 12h12M10 17h4"
              />
            </svg>
            Sort by Ext {sortDir === "asc" ? "▲" : "▼"}
          </button>

          {canEdit && (
            <button
              onClick={openAddModal}
              className="h-9 px-4 text-sm bg-gray-900 text-white font-semibold rounded-md hover:bg-gray-800 transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              + Add Telecom
            </button>
          )}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
          <h2 className="text-sm font-semibold text-gray-800">
            Extension Directory
          </h2>
          <span className="text-xs text-gray-400">({filtered.length} records)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[1050px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th
                  className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider cursor-pointer select-none whitespace-nowrap"
                  onClick={() => toggleSort("extension_number")}
                >
                  Ext. No. <SortIcon field="extension_number" />
                </th>

                <th
                  className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider cursor-pointer select-none whitespace-nowrap"
                  onClick={() => toggleSort("department_name")}
                >
                  Department <SortIcon field="department_name" />
                </th>

                <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Team Name
                </th>

                <th
                  className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider cursor-pointer select-none whitespace-nowrap"
                  onClick={() => toggleSort("employee_name")}
                >
                  Contact Person <SortIcon field="employee_name" />
                </th>

                <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Direct Number
                </th>

                <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Location
                </th>

                <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Status
                </th>

                {canEdit && (
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Actions
                  </th>
                )}
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: canEdit ? 8 : 7 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-gray-100 rounded animate-pulse w-3/4" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : paginated.length === 0 ? (
                <tr>
                  <td
                    colSpan={canEdit ? 8 : 7}
                    className="px-4 py-14 text-center"
                  >
                    <p className="text-sm text-gray-400">No records found.</p>
                  </td>
                </tr>
              ) : (
                paginated.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-md border border-gray-200 bg-gray-50 px-3 py-1 font-mono font-bold text-sm text-gray-900">
                        {r.extension_number}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-600">
                        {r.department_name}
                      </span>
                    </td>

                    <td
                      className="px-4 py-3 text-gray-700 max-w-[180px] truncate"
                      title={r.team_name}
                    >
                      {r.team_name}
                    </td>

                    <td className="px-4 py-3">
                      <div
                        className="text-gray-900 font-medium text-sm truncate max-w-[160px]"
                        title={r.employee_name}
                      >
                        {r.employee_name}
                      </div>
                      {r.designation && (
                        <div className="text-xs text-gray-400 truncate max-w-[160px]">
                          {r.designation}
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3 text-gray-600 text-sm">
                      {r.direct_number || <span className="text-gray-300">—</span>}
                    </td>

                    <td className="px-4 py-3 text-gray-600 text-sm">
                      {r.location || <span className="text-gray-300">—</span>}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
                          r.status === "Active"
                            ? "bg-green-50 text-green-700 border border-green-100"
                            : "bg-gray-100 text-gray-600 border border-gray-200"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            r.status === "Active"
                              ? "bg-green-500"
                              : "bg-gray-400"
                          }`}
                        />
                        {r.status}
                      </span>
                    </td>

                    {canEdit && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleStatus(r)}
                            disabled={togglingId === r.id}
                            title={r.status === "Active" ? "Deactivate" : "Activate"}
                            className="w-8 h-8 inline-flex items-center justify-center rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                          >
                            {togglingId === r.id ? "…" : "◉"}
                          </button>

                          <button
                            onClick={() => openEditModal(r)}
                            title="Edit"
                            className="w-8 h-8 inline-flex items-center justify-center rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                          >
                            ✎
                          </button>

                          <button
                            onClick={() => setDeleteId(r.id)}
                            title="Delete"
                            className="w-8 h-8 inline-flex items-center justify-center rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-red-50 hover:text-red-600"
                          >
                            🗑
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-400">
              {filtered.length === 0
                ? "No records"
                : `Showing ${Math.min(
                    (currentPage - 1) * PAGE_SIZE + 1,
                    filtered.length
                  )}–${Math.min(
                    currentPage * PAGE_SIZE,
                    filtered.length
                  )} of ${filtered.length} records`}
            </p>

            <div className="flex gap-1 items-center">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-8 px-3 text-xs border border-gray-200 rounded-md text-gray-500 hover:bg-gray-50 disabled:opacity-40"
              >
                Prev
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setCurrentPage(p)}
                  className={`h-8 min-w-[32px] px-2 text-xs border rounded-md ${
                    currentPage === p
                      ? "bg-gray-900 text-white border-gray-900 font-semibold"
                      : "border-gray-200 text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  {p}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="h-8 px-3 text-xs border border-gray-200 rounded-md text-gray-500 hover:bg-gray-50 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-base font-semibold text-gray-900">
                {editingId ? "Edit Extension" : "Add Extension"}
              </h2>

              <button
                onClick={closeModal}
                className="w-8 h-8 flex items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                {
                  label: "Department",
                  key: "department_name",
                  placeholder: "e.g. Editorial",
                  required: true,
                },
                {
                  label: "Team Name",
                  key: "team_name",
                  placeholder: "e.g. Copy Editing Team",
                  required: true,
                },
                {
                  label: "Contact Person",
                  key: "employee_name",
                  placeholder: "e.g. Priya Rajan",
                  required: true,
                },
                {
                  label: "Designation",
                  key: "designation",
                  placeholder: "e.g. Senior Editor",
                  required: false,
                },
                {
                  label: "Extension Number",
                  key: "extension_number",
                  placeholder: "e.g. 118",
                  required: true,
                },
                {
                  label: "Direct Number",
                  key: "direct_number",
                  placeholder: "e.g. +91 44 2200 0118",
                  required: false,
                },
                {
                  label: "Location",
                  key: "location",
                  placeholder: "e.g. Floor 3, Block A",
                  required: false,
                },
              ].map((field) => (
                <div key={field.key}>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    {field.label}{" "}
                    {field.required && <span className="text-red-500">*</span>}
                  </label>

                  <input
                    type="text"
                    placeholder={field.placeholder}
                    value={form[field.key as keyof FormData] as string}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        [field.key]: e.target.value,
                      }))
                    }
                    className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-700 transition-colors"
                  />
                </div>
              ))}

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Status
                </label>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      status: e.target.value as "Active" | "Inactive",
                    }))
                  }
                  className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:border-gray-700 transition-colors bg-white"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                onClick={editingId ? handleUpdateTelecom : handleAddTelecom}
                disabled={formLoading}
                className={`px-4 py-2 text-sm text-white font-medium rounded-lg disabled:opacity-60 ${
                  editingId
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "bg-gray-900 hover:bg-gray-800"
                }`}
              >
                {formLoading
                  ? "Saving..."
                  : editingId
                  ? "Update Extension"
                  : "Save Extension"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteId !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDeleteId(null);
          }}
        >
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
              🗑
            </div>

            <h3 className="text-base font-semibold text-gray-900 mb-1">
              Delete Extension
            </h3>

            <p className="text-sm text-gray-500 mb-5">
              Are you sure you want to delete this extension? This action cannot
              be undone.
            </p>

            <div className="flex gap-2 justify-center">
              <button
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                onClick={handleDeleteTelecom}
                disabled={deleteLoading}
                className="px-4 py-2 text-sm bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:opacity-60"
              >
                {deleteLoading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}