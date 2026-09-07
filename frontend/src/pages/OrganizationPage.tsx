import React, { useState, useEffect } from 'react';
import {
  DocumentTextIcon,
  ArrowDownTrayIcon,
  MagnifyingGlassIcon,
  FolderIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { API_URL } from '../config/api';

const BASE_URL = `${API_URL}/api`;

const CATEGORIES = ["All", "Policy", "Handbook", "General"];

const OrganizationPage: React.FC = () => {
  const [documents, setDocuments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/hr-documents/`);
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
      } else {
        toast.error("Failed to load organization documents.");
      }
    } catch (e) {
      console.error("Error loading documents:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  // Filter documents by category & search query
  const filteredDocuments = documents.filter((doc) => {
    const matchesCategory =
      selectedCategory === "All" ||
      (doc.category || "Policy").toLowerCase() === selectedCategory.toLowerCase();
    const matchesSearch =
      (doc.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.filename || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.category || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

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
      toast.error("Failed to download document.");
    }
  };

  return (
    <div className="p-6 w-full space-y-6 animate-in fade-in duration-200">
      {/* Search & Category Filter Bar */}
      <div className="bg-white rounded-2xl p-4 shadow-xs border border-neutral-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Categories Tab Pill List */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat
                  ? "bg-primary-600 text-white shadow-xs"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200/80"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search Box */}
        <div className="relative w-full md:w-72 shrink-0">
          <MagnifyingGlassIcon className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search handbook, policy..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-neutral-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:outline-none bg-neutral-50/50"
          />
        </div>
      </div>

      {/* Documents List View - Full Screen Length */}
      {isLoading ? (
        <div className="p-12 text-center text-sm text-neutral-400 font-medium bg-white rounded-2xl border border-neutral-200">
          Loading organization documents...
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-neutral-200 space-y-3">
          <FolderIcon className="w-12 h-12 text-neutral-300 mx-auto" />
          <h3 className="text-base font-bold text-neutral-800">No Documents Found</h3>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto">
            {searchQuery || selectedCategory !== "All"
              ? "No documents match your current filter or search criteria."
              : "HR has not uploaded any organization documents yet."}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs overflow-hidden w-full">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50/80 border-b border-neutral-200 text-[11px] font-extrabold uppercase tracking-wider text-neutral-500">
                  <th className="py-3.5 px-6">Document Name</th>
                  <th className="py-3.5 px-6">Category</th>
                  <th className="py-3.5 px-6">File Size</th>
                  <th className="py-3.5 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-xs">
                {filteredDocuments.map((doc) => (
                  <tr
                    key={doc.id}
                    className="hover:bg-primary-50/30 transition-colors group"
                  >
                    {/* Document Title & File Info */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center text-primary-600 border border-primary-100 shrink-0 group-hover:scale-105 transition-transform">
                          <DocumentTextIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-neutral-900 text-sm group-hover:text-primary-700 transition-colors">
                            {doc.title}
                          </h4>
                          <span className="text-[11px] text-neutral-400 font-medium block mt-0.5">
                            📄 {doc.filename}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Category Badge */}
                    <td className="py-4 px-6">
                      <span className="inline-flex px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-primary-700 bg-primary-50 rounded-lg border border-primary-200">
                        {doc.category || "Policy"}
                      </span>
                    </td>

                    {/* File Size */}
                    <td className="py-4 px-6 font-semibold text-neutral-500">
                      {doc.file_size || "PDF Document"}
                    </td>

                    {/* Download Action Button */}
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => handleDownload(doc.id, doc.filename)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-all cursor-pointer"
                        title="Download Document"
                      >
                        <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                        Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrganizationPage;
