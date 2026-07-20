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
import { HolidayCalendarWidget } from "../components/HolidayCalendarWidget";

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
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/employees/profile/${user.id}`);
      setProfile(res.data.data);
    } catch (err) {
      console.error(err);
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
              <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                <BuildingOfficeIcon className="w-3.5 h-3.5 text-neutral-400 group-hover:text-indigo-500 transition-colors" />
                Department
              </span>
              <p className="text-neutral-800 font-semibold text-sm">{profile.department || "N/A"}</p>
            </div>

            <div className="group p-3 rounded-lg hover:bg-neutral-50 transition-colors duration-200">
              <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                <EnvelopeIcon className="w-3.5 h-3.5 text-neutral-400 group-hover:text-indigo-500 transition-colors" />
                Email Address
              </span>
              <p className="text-neutral-800 font-semibold text-sm select-all">{profile.email || "N/A"}</p>
            </div>

            <div className="group p-3 rounded-lg hover:bg-neutral-50 transition-colors duration-200">
              <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                <PhoneIcon className="w-3.5 h-3.5 text-neutral-400 group-hover:text-indigo-500 transition-colors" />
                Phone Number
              </span>
              <p className="text-neutral-800 font-semibold text-sm select-all">{profile.phone || "N/A"}</p>
            </div>

            <div className="group p-3 rounded-lg hover:bg-neutral-50 transition-colors duration-200">
              <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                <UserGroupIcon className="w-3.5 h-3.5 text-neutral-400 group-hover:text-indigo-500 transition-colors" />
                Reporting Manager
              </span>
              <p className="text-neutral-800 font-semibold text-sm">{profile.reporting_manager || "N/A"}</p>
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

      {/* Holiday Calendar Widget */}
      <HolidayCalendarWidget />

      {/* ── Payroll & Payslip Card ── */}
      <Card className="shadow-sm rounded-2xl hover:shadow-md transition-shadow duration-300 border border-neutral-200 p-6 bg-gradient-to-br from-white to-indigo-50/10">
        <div className="flex items-center gap-2 border-b border-neutral-100 pb-4 mb-6">
          <CurrencyRupeeIcon className="w-5 h-5 text-indigo-600" />
          <h3 className="text-lg font-bold text-neutral-800">Payroll &amp; Payslip</h3>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-end gap-5">
          {/* Month selector */}
          <div className="flex flex-col gap-1.5 flex-1 max-w-xs">
            <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Select Payroll Month</label>
            <select
              value={selectedPayrollMonth}
              onChange={e => { setSelectedPayrollMonth(e.target.value); setPayrollStatus(null); }}
              className="border border-neutral-200 rounded-xl px-4 py-2.5 text-sm text-neutral-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 font-semibold shadow-sm"
            >
              {monthOptions.map(opt => (
                <option key={`${opt.month}-${opt.year}`} value={`${opt.month}-${opt.year}`}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Status badge */}
          {payrollStatus && (
            <div className="flex items-center gap-2">
              {payrollStatus.status === "Paid" ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircleIcon className="w-4 h-4" />
                  Paid {payrollStatus.paid_date ? `on ${payrollStatus.paid_date}` : ""}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  <ExclamationTriangleIcon className="w-4 h-4" />
                  {payrollStatus.status}
                </span>
              )}
            </div>
          )}

          {/* Download button */}
          <Button
            onClick={handleDownloadPayslip}
            disabled={isCheckingPayroll}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-neutral-300 disabled:cursor-not-allowed text-white font-semibold px-5 py-2.5 rounded-xl shadow-sm transition-all duration-200 text-sm"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            {isCheckingPayroll ? "Checking..." : "Download Payslip"}
          </Button>
        </div>

        <p className="mt-4 text-[11px] text-neutral-400 font-medium">
          Payslip is available for download only after HR has completed payroll and marked your salary as <span className="text-emerald-600 font-bold">Paid</span>.
        </p>
      </Card>

      {/* ── Payroll Not Available Modal ── */}
      {payrollModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-neutral-100 w-full max-w-md mx-4 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 bg-gradient-to-r from-amber-50 to-orange-50">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-amber-100 rounded-xl">
                  <ExclamationTriangleIcon className="w-5 h-5 text-amber-600" />
                </div>
                <h2 className="text-base font-bold text-neutral-800">{payrollModalData.title}</h2>
              </div>
              <button
                onClick={() => setPayrollModalOpen(false)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5">
              <p className="text-sm text-neutral-600 leading-relaxed">
                {payrollModalData.message}
              </p>
            </div>

            {/* Modal Footer */}
            <div className="px-6 pb-5 flex justify-end gap-2.5">
              <Button
                onClick={() => setPayrollModalOpen(false)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-2 rounded-xl text-sm shadow-sm transition-all"
              >
                OK
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Card */}
      <Card className="shadow-sm rounded-2xl hover:shadow-md transition-shadow duration-300 border border-neutral-200 p-6">
        <div className="flex items-center gap-2 border-b border-neutral-100 pb-4 mb-6">
          <LockClosedIcon className="w-5 h-5 text-indigo-600" />
          <h3 className="text-lg font-bold text-neutral-800">Security & Credentials</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider">Current Password</label>
            <div className="relative">
              <Input
                type={showCurrentPassword ? "text" : "password"}
                name="current_password"
                placeholder="••••••••"
                value={passwordData.current_password}
                onChange={handleChange}
                className="bg-neutral-50 border-neutral-200 hover:border-neutral-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl pr-10"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-600 focus:outline-none"
              >
                {showCurrentPassword ? (
                  <EyeSlashIcon className="w-5 h-5" />
                ) : (
                  <EyeIcon className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider">New Password</label>
            <div className="relative">
              <Input
                type={showNewPassword ? "text" : "password"}
                name="new_password"
                placeholder="••••••••"
                value={passwordData.new_password}
                onChange={handleChange}
                className="bg-neutral-50 border-neutral-200 hover:border-neutral-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-600 focus:outline-none"
              >
                {showNewPassword ? (
                  <EyeSlashIcon className="w-5 h-5" />
                ) : (
                  <EyeIcon className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider">Confirm Password</label>
            <div className="relative">
              <Input
                type={showConfirmPassword ? "text" : "password"}
                name="confirm_password"
                placeholder="••••••••"
                value={passwordData.confirm_password}
                onChange={handleChange}
                className="bg-neutral-50 border-neutral-200 hover:border-neutral-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-600 focus:outline-none"
              >
                {showConfirmPassword ? (
                  <EyeSlashIcon className="w-5 h-5" />
                ) : (
                  <EyeIcon className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-neutral-100">
          <div className="flex items-center gap-2 text-xs text-neutral-400">
            <ShieldCheckIcon className="w-4 h-4 text-emerald-500" />
            <span>Passwords must be secure and kept confidential.</span>
          </div>

          <Button
            onClick={updatePassword}
            disabled={isUpdatingPassword}
            className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-5 rounded-xl shadow-sm transition-all duration-200 disabled:bg-neutral-300 disabled:cursor-not-allowed"
          >
            {isUpdatingPassword ? "Updating..." : "Update Password"}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default ProfileTab;
