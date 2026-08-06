import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { BuildingOfficeIcon, TrashIcon } from '@heroicons/react/24/outline';
import { API_URL } from "../../config/api";
import { ConfirmDialog } from "../../components/ui/Modal/ConfirmDialog";

const BASE_URL = `${API_URL}/api`;

export default function DBAdminPage() {
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [tableData, setTableData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [deletingRecordVal, setDeletingRecordVal] = useState<{ idVal: any; pkCol: string } | null>(null);

  useEffect(() => {
    fetchTables();
  }, []);

  const fetchTables = async () => {
    try {
      const response = await fetch(`${BASE_URL}/admin/db/tables`, {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        }
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setTables(data.tables);
      } else {
        toast.error(data.error || "Failed to fetch tables");
      }
    } catch (error) {
      console.error(error);
      toast.error("Error fetching tables");
    }
  };

  const fetchTableData = async (tableName: string) => {
    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/admin/db/tables/${tableName}`, {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        }
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setTableData(data);
      } else {
        toast.error(data.error || "Failed to fetch table data");
      }
    } catch (error) {
      console.error(error);
      toast.error("Error fetching table data");
    } finally {
      setLoading(false);
    }
  };

  const handleTableChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const tableName = e.target.value;
    setSelectedTable(tableName);
    if (tableName) {
      fetchTableData(tableName);
    } else {
      setTableData(null);
    }
  };

  const handleDelete = (row: any) => {
    if (!tableData?.pk_columns?.length) {
      toast.error("Cannot delete from a table without a primary key.");
      return;
    }
    const pkCol = tableData.pk_columns[0];
    const idVal = row[pkCol];
    setDeletingRecordVal({ idVal, pkCol });
  };

  const confirmDeleteRecord = async () => {
    if (!deletingRecordVal) return;
    const { idVal } = deletingRecordVal;
    setDeletingRecordVal(null);
    try {
      const response = await fetch(`${BASE_URL}/admin/db/tables/${selectedTable}/${idVal}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        }
      });
      const data = await response.json();
      if (response.ok && data.success) {
        toast.success("Record deleted successfully");
        fetchTableData(selectedTable);
      } else {
        toast.error(data.error || "Failed to delete record");
      }
    } catch (error) {
      console.error(error);
      toast.error("Error deleting record");
    }
  };

  const cancelDeleteRecord = () => {
    setDeletingRecordVal(null);
  };

  return (
    <div className="min-h-screen bg-neutral-50 font-sans p-6">
      <header className="mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[10px] bg-red-600 flex items-center justify-center shadow-lg">
            <BuildingOfficeIcon className="w-[22px] h-[22px] text-white" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-neutral-800">Database Administration</h1>
            <p className="text-sm text-neutral-500 mt-1">Directly view and manage database tables.</p>
          </div>
        </div>
      </header>

      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-6">
        <div className="mb-6">
          <label htmlFor="tableSelect" className="block text-sm font-semibold text-neutral-700 mb-2">
            Select Database Table
          </label>
          <select
            id="tableSelect"
            className="block w-full max-w-md rounded-lg border-neutral-300 bg-neutral-50 p-2.5 text-sm text-neutral-900 focus:border-red-500 focus:ring-red-500"
            value={selectedTable}
            onChange={handleTableChange}
          >
            <option value="">-- Select a table --</option>
            {tables.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {loading && <p className="text-neutral-500">Loading data...</p>}

        {!loading && tableData && (
          <div className="overflow-x-auto border border-neutral-200 rounded-lg">
            <table className="w-full text-left text-sm text-neutral-600">
              <thead className="bg-neutral-100 text-xs uppercase text-neutral-700">
                <tr>
                  <th className="px-4 py-3 w-10">Actions</th>
                  {tableData.columns.map((col: string) => (
                    <th key={col} className="px-4 py-3 whitespace-nowrap">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableData.rows.length === 0 ? (
                  <tr>
                    <td colSpan={tableData.columns.length + 1} className="px-4 py-8 text-center text-neutral-500">
                      No records found in this table.
                    </td>
                  </tr>
                ) : (
                  tableData.rows.map((row: any, i: number) => (
                    <tr key={i} className="border-b border-neutral-100 hover:bg-neutral-50">
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDelete(row)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded transition-colors"
                          title="Delete Record"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </td>
                      {tableData.columns.map((col: string) => (
                        <td key={col} className="px-4 py-3 truncate max-w-xs" title={String(row[col])}>
                          {String(row[col])}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
        {deletingRecordVal && (
          <ConfirmDialog
            isOpen={deletingRecordVal !== null}
            title="Delete Record?"
            message={`Are you sure you want to delete this record (${deletingRecordVal.pkCol}: ${deletingRecordVal.idVal})?`}
            variant="danger"
            confirmLabel="Yes, Delete"
            cancelLabel="Cancel"
            onConfirm={confirmDeleteRecord}
            onCancel={cancelDeleteRecord}
          />
        )}
      </div>
    </div>
  );
}
