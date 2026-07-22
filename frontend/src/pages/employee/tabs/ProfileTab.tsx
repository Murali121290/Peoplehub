import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { useAuthStore } from "../../../store/authStore";
import {
  PencilIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  CalendarDaysIcon,
  BriefcaseIcon,
  LockClosedIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  ClockIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowDownTrayIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  CurrencyRupeeIcon,
  XMarkIcon
} from "@heroicons/react/24/outline";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Form";


const BASE_URL = `${import.meta.env.VITE_API_URL || ""}/api`;

const ProfileTab = () => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const { logout } = useAuthStore();
  const [profile, setProfile] = useState<any>({});
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });

  const isHrOrAdmin = user.access_level?.toLowerCase() === "hr" || user.access_level?.toLowerCase() === "admin";
  const [teams, setTeams] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);

  // Editing states
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [editedPhone, setEditedPhone] = useState("");

  const [isEditingDept, setIsEditingDept] = useState(false);
  const [editedDept, setEditedDept] = useState("");

  const [isEditingManager, setIsEditingManager] = useState(false);
  const [editedManager, setEditedManager] = useState("");

  // Password visibility states
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Payslip state
  const today = new Date();
  const MONTHS = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December"
  ];
  // Build last 12 months list
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    return { month: d.getMonth() + 1, year: d.getFullYear(), label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}` };
  });
  const [selectedPayrollMonth, setSelectedPayrollMonth] = useState<string>(`${monthOptions[0].month}-${monthOptions[0].year}`);
  const [payrollStatus, setPayrollStatus] = useState<null | { status: string; message?: string; paid_date?: string; month?: string }>(null);
  const [payrollModalOpen, setPayrollModalOpen] = useState(false);
  const [payrollModalData, setPayrollModalData] = useState<{ title: string; message: string }>({ title: "", message: "" });
  const [isCheckingPayroll, setIsCheckingPayroll] = useState(false);

  useEffect(() => {
    fetchProfile();
    if (isHrOrAdmin) {
      fetchTeams();
      fetchEmployees();
    }
  }, []);

  const fetchTeams = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${BASE_URL}/users/teams`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTeams(res.data.teams || []);
    } catch (err) {
      console.error("Failed to fetch teams:", err);
    }
  };

  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${BASE_URL}/employees/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEmployees(res.data || []);
    } catch (err) {
      console.error("Failed to fetch employees:", err);
    }
  };

  const fetchProfile = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/employees/profile/${user.id}`);
      setProfile(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleStartEditPhone = () => {
    setEditedPhone(profile.phone || "");
    setIsEditingPhone(true);
  };

  const handleSavePhone = async () => {
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("phone", editedPhone);
      await axios.patch(`${BASE_URL}/employees/${profile.id}`, formData, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setProfile({ ...profile, phone: editedPhone });
      setIsEditingPhone(false);
      toast.success("Phone number updated successfully.");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.error || err?.response?.data?.message || "Failed to update phone number");
    }
  };

  const handleStartEditDept = () => {
    setEditedDept(profile.department || "");
    setIsEditingDept(true);
  };

  const handleSaveDept = async () => {
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("department", editedDept);
      const matchedTeam = teams.find(t => t.name === editedDept);
      if (matchedTeam) {
        formData.append("team_id", matchedTeam.id);
      }
      await axios.patch(`${BASE_URL}/employees/${profile.id}`, formData, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setProfile({ ...profile, department: editedDept, team_id: matchedTeam ? matchedTeam.id : profile.team_id });
      setIsEditingDept(false);
      toast.success("Department updated successfully.");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.error || err?.response?.data?.message || "Failed to update department");
    }
  };

  const handleStartEditManager = () => {
    setEditedManager(profile.reporting_manager || "");
    setIsEditingManager(true);
  };

  const handleSaveManager = async () => {
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("reporting_manager", editedManager);
      await axios.patch(`${BASE_URL}/employees/${profile.id}`, formData, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setProfile({ ...profile, reporting_manager: editedManager });
      setIsEditingManager(false);
      toast.success("Reporting manager updated successfully.");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.error || err?.response?.data?.message || "Failed to update reporting manager");
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordData({
      ...passwordData,
      [e.target.name]: e.target.value,
    });
  };

  const updatePassword = async () => {
    if (!passwordData.current_password || !passwordData.new_password || !passwordData.confirm_password) {
      toast.error("Please fill in all password fields.");
      return;
    }

    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error("New passwords do not match");
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const res = await axios.post(`${BASE_URL}/auth/change-password`, {
        user_id: user.id,
        current_password: passwordData.current_password,
        new_password: passwordData.new_password,
      });

      toast.success(res.data.message || "Password updated successfully. Logging out...");
      
      // Clear password inputs
      setPasswordData({
        current_password: "",
        new_password: "",
        confirm_password: "",
      });
      
      // Auto logout after 1.5 seconds so they can read the success message
      setTimeout(() => {
        logout();
      }, 1500);

    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.response?.data?.error || "Password update failed");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const getTenure = (joiningDateStr: string) => {
    if (!joiningDateStr) return "N/A";
    try {
      const joinDate = new Date(joiningDateStr);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - joinDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays < 30) {
        return `${diffDays} days`;
      } else {
        const months = Math.floor(diffDays / 30);
        if (months < 12) {
          return `${months} month${months > 1 ? 's' : ''}`;
        } else {
          const years = Math.floor(months / 12);
          const remainingMonths = months % 12;
          return `${years} year${years > 1 ? 's' : ''}${remainingMonths > 0 ? `, ${remainingMonths} month${remainingMonths > 1 ? 's' : ''}` : ''}`;
        }
      }
    } catch (e) {
      return "N/A";
    }
  };

  const userAccessLevel = user.access_level || user.role || "employee";
  const userInitials = `${profile.first_name?.charAt(0) || ""}${profile.last_name?.charAt(0) || ""}`.toUpperCase() || "PH";

  // ── Payslip download with validation ──────────────────────────────────
  const handleDownloadPayslip = async () => {
    if (!profile?.id) {
      toast.error("Employee profile not loaded. Please refresh.");
      return;
    }

    const [m, y] = selectedPayrollMonth.split("-");
    setIsCheckingPayroll(true);
    setPayrollStatus(null);

    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${BASE_URL}/payroll/status/${profile.id}`, {
        params: { month: m, year: y },
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = res.data;
      setPayrollStatus(data);

      if (data.status === "Paid") {
        // Direct download
        const token2 = localStorage.getItem("token");
        const dlRes = await axios.get(`${BASE_URL}/payroll/payslip/${profile.id}`, {
          responseType: "blob",
          headers: { Authorization: `Bearer ${token2}` }
        });
        const url = window.URL.createObjectURL(new Blob([dlRes.data], { type: "application/pdf" }));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `Payslip_${data.month?.replace(" ", "_")}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        toast.success("Payslip downloaded successfully.");
      } else {
        // Show blocking modal
        const selectedLabel = monthOptions.find(o => `${o.month}-${o.year}` === selectedPayrollMonth)?.label || "this month";
        const isPending = data.status === "Pending";
        setPayrollModalData({
          title: "Payroll Not Available",
          message: isPending
            ? data.message || `Your salary for ${selectedLabel} has not been processed yet. Please wait until the payroll is completed by HR. Once your salary has been marked as Paid, you will be able to download your payslip.`
            : `Payroll has not been generated for ${selectedLabel}. Please contact the HR department if you believe this is incorrect.`
        });
        setPayrollModalOpen(true);
      }
    } catch (err: any) {
      const errData = err?.response?.data;
      const selectedLabel = monthOptions.find(o => `${o.month}-${o.year}` === selectedPayrollMonth)?.label || "this month";
      const status = errData?.status || "Not Found";
      const isPending = status === "Pending";
      setPayrollModalData({
        title: "Payroll Not Available",
        message: isPending
          ? errData?.message || `Your salary for ${selectedLabel} has not been processed yet.`
          : `Payroll has not been generated for ${selectedLabel}. Please contact the HR department if you believe this is incorrect.`
      });
      setPayrollModalOpen(true);
    } finally {
      setIsCheckingPayroll(false);
    }
  };
  // ─────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8 max-w-7xl mx-auto p-1">
      {/* Profile Header Hero Card */}

      {/* Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Profile details */}
        <Card className="lg:col-span-2 shadow-sm rounded-2xl hover:shadow-md transition-shadow duration-300 border border-neutral-200 p-6">
          <div className="flex items-center gap-2 border-b border-neutral-100 pb-4 mb-6">
            <UserIcon className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-bold text-neutral-800">Personal & Job Information</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            <div className="group p-3 rounded-lg hover:bg-neutral-50 transition-colors duration-200">
              <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                <BriefcaseIcon className="w-3.5 h-3.5 text-neutral-400 group-hover:text-indigo-500 transition-colors" />
                Employee ID
              </span>
              <p className="text-neutral-800 font-semibold text-sm">{profile.employee_id || "N/A"}</p>
            </div>

            <div className="group p-3 rounded-lg hover:bg-neutral-50 transition-colors duration-200">
              <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider flex items-center justify-between gap-1.5 mb-1">
                <span className="flex items-center gap-1.5">
                  <BuildingOfficeIcon className="w-3.5 h-3.5 text-neutral-400 group-hover:text-indigo-500 transition-colors" />
                  Department
                </span>
                {isHrOrAdmin && !isEditingDept && (
                  <button
                    onClick={handleStartEditDept}
                    className="p-1 text-neutral-400 hover:text-indigo-600 hover:bg-neutral-200/50 rounded transition-colors"
                    title="Edit Department"
                  >
                    <PencilIcon className="w-3.5 h-3.5" />
                  </button>
                )}
              </span>
              {isEditingDept ? (
                <div className="flex items-center gap-2 mt-1">
                  <select
                    value={editedDept}
                    onChange={(e) => setEditedDept(e.target.value)}
                    className="border border-neutral-300 rounded-lg px-2 py-1 text-sm text-neutral-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 w-full"
                  >
                    <option value="">Select Department</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.name}>{t.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleSaveDept}
                    className="p-1 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded transition-colors"
                    title="Save"
                  >
                    <CheckCircleIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setIsEditingDept(false)}
                    className="p-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded transition-colors"
                    title="Cancel"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <p className="text-neutral-800 font-semibold text-sm">{profile.department || "N/A"}</p>
              )}
            </div>

            <div className="group p-3 rounded-lg hover:bg-neutral-50 transition-colors duration-200">
              <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                <EnvelopeIcon className="w-3.5 h-3.5 text-neutral-400 group-hover:text-indigo-500 transition-colors" />
                Email Address
              </span>
              <p className="text-neutral-800 font-semibold text-sm select-all">{profile.email || "N/A"}</p>
            </div>

            <div className="group p-3 rounded-lg hover:bg-neutral-50 transition-colors duration-200">
              <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider flex items-center justify-between gap-1.5 mb-1">
                <span className="flex items-center gap-1.5">
                  <PhoneIcon className="w-3.5 h-3.5 text-neutral-400 group-hover:text-indigo-500 transition-colors" />
                  Phone Number
                </span>
                {!isEditingPhone && (
                  <button
                    onClick={handleStartEditPhone}
                    className="p-1 text-neutral-400 hover:text-indigo-600 hover:bg-neutral-200/50 rounded transition-colors"
                    title="Edit Phone Number"
                  >
                    <PencilIcon className="w-3.5 h-3.5" />
                  </button>
                )}
              </span>
              {isEditingPhone ? (
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="text"
                    value={editedPhone}
                    onChange={(e) => setEditedPhone(e.target.value)}
                    className="border border-neutral-300 rounded-lg px-2 py-1 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 w-full"
                    placeholder="Enter phone number"
                  />
                  <button
                    onClick={handleSavePhone}
                    className="p-1 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded transition-colors"
                    title="Save"
                  >
                    <CheckCircleIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setIsEditingPhone(false)}
                    className="p-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded transition-colors"
                    title="Cancel"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <p className="text-neutral-800 font-semibold text-sm select-all">{profile.phone || "N/A"}</p>
              )}
            </div>

            <div className="group p-3 rounded-lg hover:bg-neutral-50 transition-colors duration-200">
              <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider flex items-center justify-between gap-1.5 mb-1">
                <span className="flex items-center gap-1.5">
                  <UserGroupIcon className="w-3.5 h-3.5 text-neutral-400 group-hover:text-indigo-500 transition-colors" />
                  Reporting Manager
                </span>
                {isHrOrAdmin && !isEditingManager && (
                  <button
                    onClick={handleStartEditManager}
                    className="p-1 text-neutral-400 hover:text-indigo-600 hover:bg-neutral-200/50 rounded transition-colors"
                    title="Edit Reporting Manager"
                  >
                    <PencilIcon className="w-3.5 h-3.5" />
                  </button>
                )}
              </span>
              {isEditingManager ? (
                <div className="flex items-center gap-2 mt-1">
                  <select
                    value={editedManager}
                    onChange={(e) => setEditedManager(e.target.value)}
                    className="border border-neutral-300 rounded-lg px-2 py-1 text-sm text-neutral-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 w-full"
                  >
                    <option value="">Select Manager</option>
                    {employees
                      .filter(
                        (emp) =>
                          emp.access_level?.toLowerCase() === "manager" ||
                          emp.access_level?.toLowerCase() === "hr"
                      )
                      .map((emp) => {
                        const fullName = `${emp.first_name} ${emp.last_name}`.trim();
                        return (
                          <option key={emp.id} value={fullName}>
                            {fullName}
                          </option>
                        );
                      })}
                  </select>
                  <button
                    onClick={handleSaveManager}
                    className="p-1 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded transition-colors"
                    title="Save"
                  >
                    <CheckCircleIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setIsEditingManager(false)}
                    className="p-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded transition-colors"
                    title="Cancel"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <p className="text-neutral-800 font-semibold text-sm">{profile.reporting_manager || "N/A"}</p>
              )}
            </div>

            <div className="group p-3 rounded-lg hover:bg-neutral-50 transition-colors duration-200">
              <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                <CalendarDaysIcon className="w-3.5 h-3.5 text-neutral-400 group-hover:text-indigo-500 transition-colors" />
                Date of Joining
              </span>
              <p className="text-neutral-800 font-semibold text-sm">{profile.joining_date || "N/A"}</p>
            </div>
          </div>
        </Card>

        {/* Quick Stats sidebar */}
        <div className="space-y-6">
          <Card className="shadow-sm rounded-2xl hover:shadow-md transition-shadow duration-300 border border-neutral-200 p-6 bg-gradient-to-br from-white to-indigo-50/20">
            <div className="flex items-center gap-2 border-b border-neutral-100 pb-4 mb-4">
              <ClockIcon className="w-5 h-5 text-indigo-600" />
              <h3 className="text-lg font-bold text-neutral-800">Employment Overview</h3>
            </div>

            <div className="space-y-4">
              <div className="bg-white/60 p-4 rounded-xl border border-neutral-100 flex items-center justify-between shadow-sm">
                <div>
                  <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block mb-0.5">Company Tenure</span>
                  <span className="text-neutral-800 font-extrabold text-base">{getTenure(profile.joining_date)}</span>
                </div>
                <div className="p-2 bg-indigo-100/50 rounded-lg">
                  <CalendarDaysIcon className="w-5 h-5 text-indigo-600" />
                </div>
              </div>

              <div className="bg-white/60 p-4 rounded-xl border border-neutral-100 flex items-center justify-between shadow-sm">
                <div>
                  <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block mb-0.5">Status</span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                    Active
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>


    </div>
  );
};

export default ProfileTab;
