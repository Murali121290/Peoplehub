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
  EyeSlashIcon
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

  // Password visibility states
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
