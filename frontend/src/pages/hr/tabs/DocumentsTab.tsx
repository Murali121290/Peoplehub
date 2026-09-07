import React, { useState, useEffect } from 'react';
import { DocumentTextIcon, ArrowDownTrayIcon, TrashIcon, CloudArrowUpIcon, PlusIcon } from '@heroicons/react/24/outline';
import Panel from '../components/Panel';
import { Button } from '../../../components/ui/Button';
import { toast } from 'react-hot-toast';
import { API_URL } from '../../../config/api';
const BASE_URL = `${API_URL}/api`;

const HR_LETTERS = [
  "Experience Letter",
  "Bonafide Certificate",
  "NOC",
  "Employment Contract",
  "Salary Certificate",
  "Relieving Letter",
];

const CATEGORIES = ["Policy", "Handbook", "General"];

const DocumentsTab: React.FC = () => {
  const [documents, setDocuments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // Upload Form state
  const [title, setTitle] = useState<string>("");
  const [category, setCategory] = useState<string>("Policy");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/hr-documents/`);
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
      } else {
        toast.error("Failed to load HR documents.");
      }
    } catch (e) {
      console.error("Error fetching documents:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      if (!title) {
        // Auto fill title from filename without extension
        const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
        setTitle(nameWithoutExt);
      }
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error("Please select a file to upload.");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("title", title || selectedFile.name);
      formData.append("category", category);
      formData.append("uploaded_by", "HR Department");

      const res = await fetch(`${BASE_URL}/hr-documents/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Document uploaded successfully!");
        setShowUploadModal(false);
        setTitle("");
        setCategory("Policy");
        setSelectedFile(null);
        fetchDocuments();
      } else {
        toast.error(data.error || "Failed to upload document.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error uploading document.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = (docId: number, filename: string) => {
    try {
      const downloadUrl = `${BASE_URL}/hr-documents/download/${docId}`;
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success(`Downloading ${filename}...`);
    } catch (e) {
      console.error(e);
      toast.error("Failed to initiate download.");
    }
  };

  const handleDelete = async (docId: number, title: string) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) return;

    try {
      const res = await fetch(`${BASE_URL}/hr-documents/${docId}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Document deleted!");
        setDocuments((prev) => prev.filter((d) => d.id !== docId));
      } else {
        toast.error(data.error || "Failed to delete document.");
      }
    } catch (e) {
      console.error(e);
      toast.error("Error deleting document.");
    }
  };

  const handleGenerateLetter = (letterType: string) => {
    toast.success(`Generated ${letterType} template!`);
    const content = `========================================================\nS4 CARLISLE PUBLISHING SERVICES - OFFICIAL HR LETTER\n========================================================\nDocument Type: ${letterType}\nDate: ${new Date().toLocaleDateString("en-IN")}\n\nTo Whom It May Concern,\n\nThis is to certify that [Employee Name] is an employee at S4Carlisle Publishing Services.\n\nHR Department\nS4Carlisle Publishing Services\n========================================================`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${letterType.replace(/\s+/g, "_")}_Template.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <Panel>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="text-[16px] font-extrabold text-neutral-800 tracking-tight">HR Documents & Templates</div>
          <div className="text-xs text-neutral-500 mt-0.5">Upload, manage, and download corporate policies, handbooks, and templates</div>
        </div>

        <button
          onClick={() => setShowUploadModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all hover:scale-[1.02] cursor-pointer self-start sm:self-auto"
        >
          <PlusIcon className="w-4 h-4" />
          Upload New Document
        </button>
      </div>

      {/* Document Cards List */}
      {isLoading ? (
        <div className="p-8 text-center text-xs font-medium text-neutral-400">Loading documents...</div>
      ) : documents.length === 0 ? (
        <div className="p-10 text-center border-2 border-dashed border-neutral-200 rounded-2xl bg-neutral-50/50">
          <CloudArrowUpIcon className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
          <h4 className="text-sm font-bold text-neutral-700">No HR Documents Uploaded Yet</h4>
          <p className="text-xs text-neutral-400 mt-1 mb-4">Upload company policies, handbooks, or templates to store them securely in the Docker environment.</p>
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-4 py-2 bg-primary-600 text-white rounded-xl text-xs font-bold hover:bg-primary-700 transition-colors"
          >
            Upload First Document
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {documents.map((doc) => (
            <div key={doc.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white hover:bg-neutral-50/80 rounded-xl border border-neutral-200 shadow-2xs transition-all gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center shrink-0 border border-primary-100">
                  <DocumentTextIcon className="w-5 h-5 text-primary-600" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-neutral-800 truncate">{doc.title}</span>
                    <span className="px-2 py-0.5 text-[10px] font-bold text-primary-700 bg-primary-50 rounded-md border border-primary-200">
                      {doc.category || "Policy"}
                    </span>
                  </div>
                  <div className="text-[11px] text-neutral-500 mt-0.5 flex items-center gap-3 flex-wrap">
                    <span>📄 {doc.filename}</span>
                    {doc.file_size && <span>• {doc.file_size}</span>}
                    {doc.uploaded_by && <span>• {doc.uploaded_by}</span>}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <Button size="sm" onClick={() => handleDownload(doc.id, doc.filename)}>
                  <ArrowDownTrayIcon className="w-3.5 h-3.5 mr-1.5" />
                  Download
                </Button>

                <button
                  onClick={() => handleDelete(doc.id, doc.title)}
                  className="p-2 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-100"
                  title="Delete Document"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* HR Letter Generator */}
      <div className="mt-8 pt-6 border-t border-neutral-200">
        <div className="text-sm font-extrabold text-neutral-800 mb-1">HR Letter Generator</div>
        <div className="text-xs text-neutral-500 mb-4">Instantly generate standard template letters for employees</div>
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
          {HR_LETTERS.map((letter, i) => (
            <button
              key={i}
              onClick={() => handleGenerateLetter(letter)}
              className="p-3.5 bg-neutral-50 border border-neutral-200 rounded-xl cursor-pointer text-center text-xs font-semibold hover:bg-neutral-100 hover:border-neutral-300 transition-all shadow-2xs"
            >
              📄 {letter}
            </button>
          ))}
        </div>
      </div>

      {/* Upload Document Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-neutral-900/40 backdrop-blur-xs z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-neutral-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-4 mb-4">
              <h3 className="text-base font-bold text-neutral-800">Upload HR Document</h3>
              <button onClick={() => setShowUploadModal(false)} className="text-neutral-400 hover:text-neutral-600 text-lg">✕</button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Document Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Leave Management Policy v2026"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:outline-none"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Select File (PDF, DOCX, XLSX, ZIP)</label>
                <input
                  type="file"
                  required
                  onChange={handleFileChange}
                  className="w-full text-xs text-neutral-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 text-xs font-bold text-neutral-600 hover:bg-neutral-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-5 py-2 text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-xl shadow-xs disabled:opacity-50"
                >
                  {isUploading ? "Uploading..." : "Upload Document"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Panel>
  );
};

export default DocumentsTab;
