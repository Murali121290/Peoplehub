import { API_URL } from "../config/api";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  MagnifyingGlassIcon,
  Bars3BottomLeftIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  PowerIcon,
} from "@heroicons/react/24/outline";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Modal, ConfirmDialog } from "../components/ui/Modal";
import { Input, Select, FormField } from "../components/ui/Form";

interface TelecomEntry {
  id: number;
  department_name: string;
  team_name: string;
  employee_name: string;
  extension_number: string;
  location?: string;
  status: "Active" | "Inactive";
  created_at?: string;
}

interface FormData {
  department_name: string;
  team_name: string;
  employee_name: string;
  extension_number: string;
  location: string;
  status: "Active" | "Inactive";
}

const EMPTY_FORM: FormData = {
  department_name: "",
  team_name: "",
  employee_name: "",
  extension_number: "",
  location: "",
  status: "Active",
};

export default function TelecomDirectory() {
  const user =
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("user") || "{}")
      : {};



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
  const PAGE_SIZE = 8;

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
      const response = await fetch(`${API_URL}/api/telecom/`);
      if (!response.ok) throw new Error("Failed to fetch telecoms");
      const data = await response.json();
      setTelecoms(Array.isArray(data) ? data : []);
    } catch {
      setTelecoms([]);
      toast.error("Failed to load Intercom Directory.");
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
      const res = await fetch(`${API_URL}/api/telecom/`, {
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
        `${API_URL}/api/telecom/${editingId}`,
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
      const res = await fetch(`${API_URL}/api/telecom/${deleteId}`, {
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
      const res = await fetch(`${API_URL}/api/telecom/${entry.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          department_name: entry.department_name,
          team_name: entry.team_name,
          employee_name: entry.employee_name,
          extension_number: entry.extension_number,
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
      extension_number: entry.extension_number,
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
        className={`w-2.5 h-2.5 ${sortField === field && sortDir === "asc"
          ? "text-neutral-900"
          : "text-neutral-300"
          }`}
        viewBox="0 0 10 6"
        fill="currentColor"
      >
        <path d="M5 0L10 6H0L5 0Z" />
      </svg>
      <svg
        className={`w-2.5 h-2.5 mt-0.5 ${sortField === field && sortDir === "desc"
          ? "text-neutral-900"
          : "text-neutral-300"
          }`}
        viewBox="0 0 10 6"
        fill="currentColor"
      >
        <path d="M5 6L0 0H10L5 6Z" />
      </svg>
    </span>
  );

  return (
    <div className="min-h-screen bg-neutral-100 p-4 sm:p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="text-xs text-neutral-400 mb-0.5">
            Home &rsaquo;{" "}
            <span className="text-neutral-600">Intercom Directory</span>
          </div>
          <h1 className="text-lg font-bold text-neutral-900 tracking-tight">
            Intercom Directory
          </h1>
        </div>
      </div>


      <Card padding="none" className="px-4 py-3 mb-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 min-w-0 max-w-md">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />

          <Input
            type="text"
            placeholder="Search by team name, extension, or department..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="h-9 pl-9 bg-neutral-50 focus:bg-white"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          <div className="w-44">
            <Select
              value={filterDept}
              onChange={(value) => {
                setFilterDept(value);
                setCurrentPage(1);
              }}
              options={[
                { label: "All Departments", value: "" },
                ...departments.map((d) => ({ label: d, value: d })),
              ]}
              className="h-9"
            />
          </div>

          <div className="w-36">
            <Select
              value={filterStatus}
              onChange={(value) => {
                setFilterStatus(value);
                setCurrentPage(1);
              }}
              options={[
                { label: "All Status", value: "" },
                { label: "Active", value: "Active" },
                { label: "Inactive", value: "Inactive" },
              ]}
              className="h-9"
            />
          </div>

          <Button
            variant="outline"
            size="md"
            icon={Bars3BottomLeftIcon}
            onClick={() => toggleSort("extension_number")}
            className="h-9 whitespace-nowrap"
          >
            Sort by Ext {sortDir === "asc" ? "▲" : "▼"}
          </Button>

          {canEdit && (
            <Button
              variant="primary"
              size="md"
              icon={PlusIcon}
              onClick={openAddModal}
              className="h-9 whitespace-nowrap"
            >
              Add Telecom
            </Button>
          )}
        </div>
      </Card>

      <Card padding="none" className="overflow-hidden">
        <div className="px-4 py-3 border-b border-neutral-100 flex items-center gap-2">
          <h2 className="text-sm font-semibold text-neutral-800">
            Extension Directory
          </h2>
          <span className="text-xs text-neutral-400">({filtered.length} records)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[1050px]">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                <th
                  className="px-4 py-3 text-left text-[11px] font-semibold text-neutral-500 uppercase tracking-wider cursor-pointer select-none whitespace-nowrap"
                  onClick={() => toggleSort("extension_number")}
                >
                  Ext. No. <SortIcon field="extension_number" />
                </th>

                <th
                  className="px-4 py-3 text-left text-[11px] font-semibold text-neutral-500 uppercase tracking-wider cursor-pointer select-none whitespace-nowrap"
                  onClick={() => toggleSort("department_name")}
                >
                  Department <SortIcon field="department_name" />
                </th>

                <th
                  className="px-4 py-3 text-left text-[11px] font-semibold text-neutral-500 uppercase tracking-wider cursor-pointer select-none whitespace-nowrap"
                  onClick={() => toggleSort("employee_name")}
                >
                  Contact Person <SortIcon field="employee_name" />
                </th>



                <th className="px-4 py-3 text-left text-[11px] font-semibold text-neutral-500 uppercase tracking-wider whitespace-nowrap">
                  Designation
                </th>



                <th className="px-4 py-3 text-left text-[11px] font-semibold text-neutral-500 uppercase tracking-wider whitespace-nowrap">
                  Location
                </th>

                <th className="px-4 py-3 text-left text-[11px] font-semibold text-neutral-500 uppercase tracking-wider whitespace-nowrap">
                  Status
                </th>

                {canEdit && (
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-neutral-500 uppercase tracking-wider whitespace-nowrap">
                    Actions
                  </th>
                )}
              </tr>
            </thead>

            <tbody className="divide-y divide-neutral-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: canEdit ? 8 : 7 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-neutral-100 rounded animate-pulse w-3/4" />
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
                    <p className="text-sm text-neutral-400">No records found.</p>
                  </td>
                </tr>
              ) : (
                paginated.map((r) => (
                  <tr key={r.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-md border border-neutral-200 bg-neutral-50 px-3 py-1 font-mono font-bold text-sm text-neutral-900">
                        {r.extension_number}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs text-neutral-600">
                        {r.department_name}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <div
                        className="text-neutral-900 font-medium text-sm truncate max-w-[160px]"
                        title={r.employee_name}
                      >
                        {r.employee_name}
                      </div>
                      {/* {r.designation && (
                        <div className="text-xs text-neutral-400 truncate max-w-[160px]">
                          {r.designation}
                        </div>
                      )} */}
                    </td>

                    <td
                      className="px-4 py-3 text-neutral-700 max-w-[180px] truncate"
                      title={r.team_name}
                    >
                      {r.team_name}
                    </td>




                    <td className="px-4 py-3 text-neutral-600 text-sm">
                      {r.location || <span className="text-neutral-300">—</span>}
                    </td>

                    <td className="px-4 py-3">
                      <Badge
                        variant={r.status === "Active" ? "success" : "neutral"}
                        dot
                      >
                        {r.status}
                      </Badge>
                    </td>

                    {canEdit && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleStatus(r)}
                            disabled={togglingId === r.id}
                            title={r.status === "Active" ? "Deactivate" : "Activate"}
                            className="w-8 h-8 inline-flex items-center justify-center rounded-md border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 disabled:opacity-50"
                          >
                            <PowerIcon className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => openEditModal(r)}
                            title="Edit"
                            className="w-8 h-8 inline-flex items-center justify-center rounded-md border border-neutral-200 bg-white text-neutral-600 hover:bg-warning-50 hover:text-warning-700"
                          >
                            <PencilSquareIcon className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => setDeleteId(r.id)}
                            title="Delete"
                            className="w-8 h-8 inline-flex items-center justify-center rounded-md border border-neutral-200 bg-white text-neutral-600 hover:bg-danger-50 hover:text-danger-600"
                          >
                            <TrashIcon className="w-4 h-4" />
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
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-neutral-100">
            <p className="text-xs text-neutral-400">
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
                className="h-8 px-3 text-xs border border-neutral-200 rounded-md text-neutral-500 hover:bg-neutral-50 disabled:opacity-40"
              >
                Prev
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setCurrentPage(p)}
                  className={`h-8 min-w-[32px] px-2 text-xs border rounded-md ${currentPage === p
                    ? "bg-primary-600 text-white border-primary-600 font-semibold"
                    : "border-neutral-200 text-neutral-500 hover:bg-neutral-50"
                    }`}
                >
                  {p}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="h-8 px-3 text-xs border border-neutral-200 rounded-md text-neutral-500 hover:bg-neutral-50 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </Card>

      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        size="md"
        title={editingId ? "Edit Extension" : "Add Extension"}
        footer={
          <>
            <Button variant="outline" onClick={closeModal}>
              Cancel
            </Button>

            <Button
              variant={editingId ? "secondary" : "primary"}
              onClick={editingId ? handleUpdateTelecom : handleAddTelecom}
              loading={formLoading}
            >
              {editingId ? "Update Extension" : "Save Extension"}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              label: "Extension Number",
              key: "extension_number",
              placeholder: "e.g. 118",
              required: true,
            },

            {
              label: "Location",
              key: "location",
              placeholder: "e.g. Floor 3, Block A",
              required: false,
            },
          ].map((field) => (
            <FormField key={field.key} label={field.label} required={field.required}>
              <Input
                type="text"
                placeholder={field.placeholder}
                value={form[field.key as keyof FormData] as string}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    [field.key]: e.target.value,
                  }))
                }
              />
            </FormField>
          ))}

          <FormField label="Status">
            <Select
              value={form.status}
              onChange={(value) =>
                setForm((prev) => ({
                  ...prev,
                  status: value as "Active" | "Inactive",
                }))
              }
              options={[
                { label: "Active", value: "Active" },
                { label: "Inactive", value: "Inactive" },
              ]}
            />
          </FormField>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={deleteId !== null}
        title="Delete Extension"
        message="Are you sure you want to delete this extension? This action cannot be undone."
        variant="danger"
        confirmLabel={deleteLoading ? "Deleting..." : "Delete"}
        cancelLabel="Cancel"
        onConfirm={handleDeleteTelecom}
        onCancel={() => setDeleteId(null)}
        loading={deleteLoading}
      />
    </div>
  );
}
