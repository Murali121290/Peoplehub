import React, { useState, useEffect, useRef } from "react";
import { BASE_API_URL } from "../../../config/api";
import { Button } from "../../../components/ui/Button";
import { BookLoader } from "../../../components/ui/Spinner";
import { toast } from "react-hot-toast";
import {
  BriefcaseIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  PhotoIcon,
  XMarkIcon,
  MapPinIcon,
  BuildingOfficeIcon,
  AcademicCapIcon,
  EnvelopeIcon,
  UserPlusIcon
} from "@heroicons/react/24/outline";

interface JobOpening {
  id: number;
  title: string;
  message: string;
  image_url?: string;
  created_by: string;
  created_at: string;
}

interface ParsedJobOpening {
  id: number;
  title: string;
  description: string;
  department: string;
  location: string;
  experience: string;
  poc_name: string;
  poc_email: string;
  image_url?: string;
  created_by: string;
  created_at: string;
}

interface JobOpeningsTabProps {
  user: any;
}

const JobOpeningsTab: React.FC<JobOpeningsTabProps> = ({ user }) => {
  const [jobs, setJobs] = useState<JobOpening[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // HR Access Levels
  const userAccess = (user?.access_level || "").toLowerCase();
  const isHR = userAccess === "hr" || userAccess === "admin";

  // Modals & Form States
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingJob, setEditingJob] = useState<ParsedJobOpening | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formDept, setFormDept] = useState("Engineering");
  const [formLoc, setFormLoc] = useState("Chennai Office");
  const [formExp, setFormExp] = useState("1 - 3 Years");
  const [formPocName, setFormPocName] = useState("");
  const [formPocEmail, setFormPocEmail] = useState("");
  
  // Image Upload States
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete Dialog States
  const [jobToDelete, setJobToDelete] = useState<ParsedJobOpening | null>(null);

  // Departments State (initialized with fallback defaults)
  const [dbDepartments, setDbDepartments] = useState<string[]>([
    "Engineering",
    "HR / Recruitment",
    "Marketing",
    "Sales",
    "Operations",
    "Finance",
    "Design"
  ]);

  const fetchJobs = async () => {
    try {
      const response = await fetch(`${BASE_API_URL}/api/communications/job-openings`);
      const data = await response.json();
      if (data.success && data.job_openings) {
        setJobs(data.job_openings);
      }
    } catch (error) {
      console.error("Error fetching job openings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await fetch(`${BASE_API_URL}/api/employees/departments`, { headers });
      const data = await response.json();
      if (data.success && data.departments && data.departments.length > 0) {
        setDbDepartments(data.departments);
      }
    } catch (error) {
      console.error("Error fetching departments:", error);
    }
  };

  useEffect(() => {
    fetchJobs();
    fetchDepartments();
  }, []);

  // Helper to parse JSON job descriptions safely
  const parseJob = (job: JobOpening): ParsedJobOpening => {
    let description = job.message;
    let department = "General";
    let location = "Chennai Office";
    let experience = "Not Specified";
    let poc_name = "HR Recruitment Team";
    let poc_email = "hr.chennai@s4carlisle.com";

    try {
      if (job.message.trim().startsWith("{")) {
        const parsed = JSON.parse(job.message);
        description = parsed.description || job.message;
        department = parsed.department || "General";
        location = parsed.location || "Chennai Office";
        experience = parsed.experience || "Not Specified";
        poc_name = parsed.poc_name || "HR Recruitment Team";
        poc_email = parsed.poc_email || "hr.chennai@s4carlisle.com";
      }
    } catch (e) {
      // Fallback to raw values
    }

    return {
      ...job,
      description,
      department,
      location,
      experience,
      poc_name,
      poc_email
    };
  };

  const parsedJobs = jobs.map(parseJob);

  const filteredJobs = parsedJobs.filter(
    (job) =>
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenCreateModal = () => {
    setEditingJob(null);
    setFormTitle("");
    setFormDesc("");
    setFormDept(dbDepartments.length > 0 ? dbDepartments[0] : "Engineering");
    setFormLoc("Chennai Office");
    setFormExp("1 - 3 Years");
    setFormPocName(user?.full_name || user?.first_name || "HR Admin");
    setFormPocEmail("hr.chennai@s4carlisle.com");
    setImageUrl("");
    setImagePreviewUrl("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    setShowFormModal(true);
  };

  const handleOpenEditModal = (job: ParsedJobOpening) => {
    setEditingJob(job);
    setFormTitle(job.title);
    setFormDesc(job.description);
    setFormDept(job.department);
    setFormLoc(job.location);
    setFormExp(job.experience);
    setFormPocName(job.poc_name || "HR Recruitment Team");
    setFormPocEmail(job.poc_email || "hr.chennai@s4carlisle.com");
    setImageUrl(job.image_url || "");
    setImagePreviewUrl(job.image_url ? (job.image_url.startsWith("http") ? job.image_url : `${BASE_API_URL}${job.image_url}`) : "");
    setShowFormModal(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 3MB Frontend limit check
    const MAX_SIZE = 3 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      toast.error("Image size exceeds the 3MB maximum limit. Please select a smaller file.");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    const localUrl = URL.createObjectURL(file);
    setImagePreviewUrl(localUrl);
    setIsUploadingImage(true);

    const formData = new FormData();
    formData.append("image", file);

    try {
      const response = await fetch(`${BASE_API_URL}/api/communications/upload-image`, {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (data.success && data.image_url) {
        setImageUrl(data.image_url);
      } else {
        toast.error(data.error || "Failed to upload image");
        handleRemoveImage();
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to upload image");
      handleRemoveImage();
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleRemoveImage = () => {
    setImageUrl("");
    setImagePreviewUrl("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formDesc.trim() || isSubmitting) return;

    setIsSubmitting(true);
    const creatorName = user?.full_name || user?.first_name || "HR Admin";

    // Serialize details into a structured JSON string
    const serializedMessage = JSON.stringify({
      description: formDesc.trim(),
      department: formDept,
      location: formLoc,
      experience: formExp,
      poc_name: formPocName.trim() || "HR Recruitment Team",
      poc_email: formPocEmail.trim() || "hr.chennai@s4carlisle.com"
    });

    const payload = {
      title: formTitle.trim(),
      message: serializedMessage,
      image_url: imageUrl,
      created_by: creatorName
    };

    try {
      let response;
      if (editingJob) {
        // Edit mode
        response = await fetch(`${BASE_API_URL}/api/communications/job-openings/${editingJob.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      } else {
        // Create mode
        response = await fetch(`${BASE_API_URL}/api/communications/job-openings`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      }

      const data = await response.json();
      if (data.success) {
        setShowFormModal(false);
        fetchJobs();
      } else {
        toast.error(data.error || "Failed to save job opening");
      }
    } catch (error) {
      console.error(error);
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteJob = async () => {
    if (!jobToDelete) return;

    try {
      const response = await fetch(`${BASE_API_URL}/api/communications/${jobToDelete.id}`, {
        method: "DELETE"
      });
      const data = await response.json();
      if (data.success) {
        setJobToDelete(null);
        fetchJobs();
      } else {
        toast.error(data.error || "Failed to delete job opening");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete job opening");
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr.endsWith("Z") ? dateStr : dateStr + "Z");
      return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      });
    } catch {
      return dateStr;
    }
  };

  // Referral Mail Info
  const getReferralMailInfo = (job: ParsedJobOpening) => {
    const to = job.poc_email;
    const subject = `Candidate Referral: ${job.title}`;
    const body = `Hi ${job.poc_name},\n\nI would like to refer the following candidate for the "${job.title}" position:\n\n- Candidate Name: \n- Candidate Contact Number: \n- Candidate Email Address: \n- Candidate Skills/Brief intro: \n\nI have attached their resume for your review.\n\nBest regards,\n${user?.full_name || "Employee"}`;
    return { to, subject, body };
  };

  // Internal Transition Info
  const getIjpMailInfo = (job: ParsedJobOpening) => {
    const to = job.poc_email;
    const subject = `IJP Application: ${job.title}`;
    const body = `Hi ${job.poc_name},\n\nI am interested in applying internally (IJP) for the position of "${job.title}" (Department: ${job.department}).\n\n- Current Designation: \n- Current Department: \n- Total years at S4Carlisle: \n- Reason for internal transition request: \n\nBest regards,\n${user?.full_name || "Employee"}`;
    return { to, subject, body };
  };

  // Open Outlook Web in a new browser tab immediately
  const handleMailAction = (job: ParsedJobOpening, type: 'refer' | 'ijp') => {
    const info = type === 'refer' ? getReferralMailInfo(job) : getIjpMailInfo(job);
    const url = `https://outlook.office.com/mail/deeplink/compose?to=${encodeURIComponent(info.to)}&subject=${encodeURIComponent(info.subject)}&body=${encodeURIComponent(info.body)}`;
    window.open(url, '_blank');
  };

  // Social Share Text Generator
  const handleCopyShare = (job: ParsedJobOpening) => {
    const text = `S4Carlisle is hiring a "${job.title}"!
Department: ${job.department}
Location: ${job.location}
Experience Required: ${job.experience}

Details:
${job.description.slice(0, 150)}...

If you are interested, please contact ${job.poc_name} directly at ${job.poc_email}.`;
    
    navigator.clipboard.writeText(text);
    toast.success("Job share template copied to clipboard!");
  };

  const getWhatsAppShareLink = (job: ParsedJobOpening) => {
    const text = encodeURIComponent(
      `*S4Carlisle is hiring a "${job.title}"!*\n\n*Department:* ${job.department}\n*Location:* ${job.location}\n*Experience:* ${job.experience}\n\nInterested candidates can reach out directly to *${job.poc_name}* at *${job.poc_email}*.\n\n_Shared from S4Carlisle PeopleHub_`
    );
    return `https://api.whatsapp.com/send?text=${text}`;
  };

  const getInitials = (name: string) => {
    if (!name) return "HR";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2);
  };

  const getDeptColor = (dept: string) => {
    const d = dept.toLowerCase();
    if (d.includes("engineer") || d.includes("tech")) return "bg-emerald-100 text-emerald-700 border-emerald-200";
    if (d.includes("hr") || d.includes("recruit")) return "bg-blue-100 text-blue-700 border-blue-200";
    if (d.includes("market") || d.includes("sale")) return "bg-indigo-100 text-indigo-700 border-indigo-200";
    if (d.includes("operation")) return "bg-purple-100 text-purple-700 border-purple-200";
    if (d.includes("finance")) return "bg-amber-100 text-amber-700 border-amber-200";
    return "bg-neutral-100 text-neutral-700 border-neutral-200";
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Search and Action Bar Panel */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-neutral-200 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search job openings..."
            className="w-full rounded-full border border-neutral-200 bg-white pl-10 pr-4 py-2 text-sm text-neutral-700 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>

        {isHR && (
          <Button
            onClick={handleOpenCreateModal}
            className="flex items-center justify-center gap-1.5 rounded-full px-5 py-2 text-sm font-bold shadow-sm"
          >
            <PlusIcon className="w-4 h-4" />
            Post Job Opening
          </Button>
        )}
      </div>

      {/* Feed Area */}
      {filteredJobs.length === 0 ? (
        <div className="rounded-2xl border border-neutral-200 bg-white p-12 text-center shadow-sm">
          <BriefcaseIcon className="mx-auto h-12 w-12 text-neutral-300 mb-3" />
          <h3 className="text-lg font-bold text-neutral-700">No Job Openings</h3>
          <p className="text-sm text-neutral-500 mt-1">There are no job opportunities posted at this moment. Check back later!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredJobs.map((job) => (
            <div
              key={job.id}
              className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm flex flex-col gap-4"
            >
              {/* Creator Header block */}
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-neutral-200 to-neutral-300 font-bold text-neutral-600 shadow-inner">
                  {getInitials(job.created_by)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-neutral-900 leading-none">{job.created_by}</h4>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs font-medium text-neutral-500">{formatDate(job.created_at)}</span>
                        <span className="h-1 w-1 rounded-full bg-neutral-300"></span>
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${getDeptColor(job.department)}`}>
                          {job.department}
                        </span>
                      </div>
                    </div>

                    {isHR && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditModal(job)}
                          className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-primary-600 transition-colors"
                          title="Edit Job"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setJobToDelete(job)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-neutral-400 hover:text-red-600 transition-colors"
                          title="Delete Job"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Job Header Info */}
                  <div className="mt-4">
                    <h3 className="text-lg md:text-xl font-extrabold text-neutral-800 leading-tight mb-2">
                      {job.title}
                    </h3>
                    
                    {/* Location and Experience Sub-badges */}
                    <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-neutral-500">
                      <div className="flex items-center gap-1.5">
                        <MapPinIcon className="w-4 h-4 text-neutral-400" />
                        <span>{job.location}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <AcademicCapIcon className="w-4 h-4 text-neutral-400" />
                        <span>{job.experience}</span>
                      </div>
                    </div>
                  </div>

                  {/* Banner Image */}
                  {job.image_url && (
                    <div className="mt-4 rounded-xl overflow-hidden border border-neutral-150 max-h-[300px] bg-neutral-50 flex items-center justify-center">
                      <img
                        src={job.image_url.startsWith("http") ? job.image_url : `${BASE_API_URL}${job.image_url}`}
                        alt={job.title}
                        className="w-full h-auto max-h-[300px] object-cover"
                      />
                    </div>
                  )}

                  {/* Description Text */}
                  <div className="mt-4">
                    <h5 className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">Job Description & Requirements</h5>
                    <p className="text-[14.5px] leading-relaxed text-neutral-700 whitespace-pre-wrap">
                      {job.description}
                    </p>
                  </div>

                  {/* Recruiter POC profile widget */}
                  <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200 flex items-center justify-between mt-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center font-bold text-primary-700 text-xs">
                        {getInitials(job.poc_name)}
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-neutral-400 uppercase leading-none">Recruiter Point of Contact</div>
                        <div className="text-sm font-bold text-neutral-800 mt-1">{job.poc_name}</div>
                        <div className="text-xs text-neutral-500 mt-0.5">{job.poc_email}</div>
                      </div>
                    </div>
                    <a
                      href={`mailto:${job.poc_email}?subject=Job opening inquiry: ${job.title}`}
                      className="text-xs font-bold px-3 py-1.5 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-100 text-neutral-600 transition-colors shadow-2xs"
                    >
                      Email Recruiter
                    </a>
                  </div>

                  {/* Dual Action Application Bar */}
                  <div className="mt-5 pt-4 border-t border-neutral-150 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                    <div className="text-xs text-neutral-400 max-w-sm">
                      Recommend external candidates or submit internal transfer application (IJP).
                    </div>
                    <div className="flex gap-2.5">
                      <button
                        onClick={() => handleMailAction(job, 'ijp')}
                        className="inline-flex items-center justify-center gap-2 px-5 py-2 border border-primary-600 text-primary-750 hover:bg-primary-50 font-bold rounded-lg text-xs transition-colors shadow-3xs"
                      >
                        Apply Internally (IJP)
                      </button>
                      <button
                        onClick={() => handleMailAction(job, 'refer')}
                        className="inline-flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-lg px-5 py-2 text-xs transition-colors shadow-xs"
                      >
                        <UserPlusIcon className="w-4 h-4" />
                        Refer Candidate
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Post / Edit Modal Dialog */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-neutral-200 overflow-hidden transform transition-all animate-fadeIn">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-neutral-50 border-b border-neutral-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-neutral-800">
                {editingJob ? "Edit Job Opening" : "Post New Job Opening"}
              </h2>
              <button
                onClick={() => setShowFormModal(false)}
                className="p-1.5 rounded-full hover:bg-neutral-200 text-neutral-500 transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitForm} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-1">
                  Job Title *
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Senior Frontend Developer (React)"
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-800 placeholder-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-1">
                    Department
                  </label>
                  <select
                    value={formDept}
                    onChange={(e) => setFormDept(e.target.value)}
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-800 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  >
                    {dbDepartments.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-1">
                    Location
                  </label>
                  <select
                    value={formLoc}
                    onChange={(e) => setFormLoc(e.target.value)}
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-800 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  >
                    <option value="Chennai Office">Chennai Office</option>
                    <option value="Work From Home">Work From Home</option>
                    <option value="Hybrid (Chennai)">Hybrid (Chennai)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-1">
                    Experience
                  </label>
                  <select
                    value={formExp}
                    onChange={(e) => setFormExp(e.target.value)}
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-800 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  >
                    <option value="Fresher / Entry">Fresher / Entry</option>
                    <option value="1 - 3 Years">1 - 3 Years</option>
                    <option value="3 - 5 Years">3 - 5 Years</option>
                    <option value="5+ Years">5+ Years</option>
                  </select>
                </div>
              </div>

              {/* Point of Contact inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-1">
                    Contact Recruiter Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formPocName}
                    onChange={(e) => setFormPocName(e.target.value)}
                    placeholder="e.g. Murali"
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-800 placeholder-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-1">
                    Contact Recruiter Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formPocEmail}
                    onChange={(e) => setFormPocEmail(e.target.value)}
                    placeholder="e.g. hr.chennai@s4carlisle.com"
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-800 placeholder-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-1">
                  Job Details & Requirements *
                </label>
                <textarea
                  required
                  rows={4}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Provide experience limits, primary skills, role duties, and application guidelines..."
                  className="w-full rounded-lg border border-neutral-200 p-3 text-sm text-neutral-800 placeholder-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-1">
                  Banner Image (Optional)
                </label>
                
                {imagePreviewUrl ? (
                  <div className="relative mt-1 inline-block rounded-xl overflow-hidden border border-neutral-200 shadow-sm max-w-[200px]">
                    <img src={imagePreviewUrl} className="w-full h-auto object-cover max-h-[100px]" alt="Banner preview" />
                    {isUploadingImage && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/60 hover:bg-black/85 text-white transition-colors"
                      title="Remove Image"
                    >
                      <XMarkIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-1 flex items-center gap-2 rounded-lg border border-dashed border-neutral-300 hover:border-neutral-400 bg-neutral-50 px-4 py-2.5 text-sm text-neutral-500 hover:text-neutral-700 transition-colors w-full justify-center"
                  >
                    <PhotoIcon className="w-5 h-5 text-neutral-400" />
                    <span>Upload Banner (Max 3MB)</span>
                  </button>
                )}
                
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/*"
                  className="hidden"
                />
              </div>

              {/* Modal Actions */}
              <div className="mt-6 pt-4 border-t border-neutral-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="px-4 py-2 border border-neutral-200 text-neutral-600 rounded-lg text-sm font-semibold hover:bg-neutral-50 transition-colors"
                >
                  Cancel
                </button>
                <Button
                  type="submit"
                  loading={isSubmitting}
                  disabled={!formTitle.trim() || !formDesc.trim() || isUploadingImage}
                  className="px-6 py-2 rounded-lg font-semibold shadow-xs"
                >
                  {editingJob ? "Save Changes" : "Post Opening"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {jobToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-neutral-200 p-6 space-y-4 transform transition-all animate-scaleUp">
            <h3 className="text-lg font-bold text-neutral-800">
              Delete Job Opening?
            </h3>
            <p className="text-sm text-neutral-500 leading-relaxed">
              Are you sure you want to remove the job opening **"{jobToDelete.title}"**? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setJobToDelete(null)}
                className="px-4 py-2 border border-neutral-200 text-neutral-600 rounded-lg text-sm font-semibold hover:bg-neutral-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteJob}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobOpeningsTab;
