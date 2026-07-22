import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import axios from "axios";
import logo from "../images/s.png";
import { useAuthStore } from "../store/authStore";
import {
  LockClosedIcon,
  UserCircleIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowLeftIcon,
  KeyIcon,
} from "@heroicons/react/24/solid";
import bg from "../images/login-hero.png";
// import logo from "../src/images/s4carlisle-logo.png"; // optional

type ViewMode = "login" | "forgot-password";

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();

  // ---- Which card is showing ----
  const [view, setView] = useState<ViewMode>("login");

  // ---- Login form state ----
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // ---- Forgot / change password form state ----
  const [pwData, setPwData] = useState({
    username: "",
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [pwLoading, setPwLoading] = useState(false);
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await login(formData.email, formData.password);

      sessionStorage.removeItem("attendance_popup_shown");
      sessionStorage.removeItem("birthday_popup_shown");

      const accessLevel =
        response.access_level || response.user?.access_level || "";

      if (accessLevel === "manager") {
        navigate("/manager-dashboard");
      } else {
        // user / admin / hr / anything else
        navigate("/employee-dashboard");
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const resetPwForm = () => {
    setPwData({
      username: "",
      oldPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    setShowOldPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  const handleBackToLogin = () => {
    resetPwForm();
    setView("login");
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (pwData.newPassword.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }

    if (pwData.newPassword !== pwData.confirmPassword) {
      toast.error("New password and confirm password do not match");
      return;
    }

    if (pwData.oldPassword === pwData.newPassword) {
      toast.error("New password must be different from the old password");
      return;
    }

    setPwLoading(true);

    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const apiUrl = `${import.meta.env.VITE_API_URL || ""}/api`;

      const res = await axios.post(
        `${apiUrl}/auth/change-password`,
        {
          user_id: user.id,
          current_password: pwData.oldPassword,
          new_password: pwData.newPassword,
        }
      );

      toast.success(res.data.message || "Password changed successfully");
      handleBackToLogin();
    } catch (error: any) {
      console.error(error);
      toast.error(
        error.response?.data?.message ||
        error.response?.data?.error ||
        "Password update failed"
      );
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden text-neutral-800">
      {/* Background gradients */}
      <div className="absolute inset-0 z-0 pointer-events-none bg-login-blue-glow" />
      <div className="absolute inset-0 z-0 pointer-events-none bg-login-amber-glow" />
      <div className="absolute inset-0 z-0 pointer-events-none opacity-50 bg-login-grid bg-[length:44px_44px]" />

      {/* Header */}
      <header className="relative z-10 w-full flex items-center justify-between px-12 py-6">
        <div className="flex items-center gap-3.5">
          {/* Logo badge */}
          <div className="bg-white px-3 rounded-lg flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.08)] h-14 overflow-hidden">
            <img src={logo} alt="S4 Carlisle" className="h-[105px] w-auto object-contain -mt-[3px] -mb-[3px]" draggable={false} />
          </div>
          <div className="h-[70px] w-[2px] bg-white/25"></div>
          <span >
            S4C PeopleHub
          </span>
        </div>
      </header>

      {/* Main Body */}
      <main className="relative z-10 flex-1 grid grid-cols-1 lg:grid-cols-[1fr_minmax(400px,460px)] gap-14 items-center px-6 lg:px-18 py-6 pb-12 max-w-[1440px] mx-auto w-full">
        <div className="text-white max-w-[560px]">
          <h1 className="font-extrabold text-[38px] md:text-[56px] leading-[1.08] mb-5 tracking-tight" >
            Your workday,<br />all in one place.
          </h1>
          <p className="text-[18px] leading-relaxed text-white/80 mb-10 max-w-[460px]">
            Empowering people, driving performance. The unified HR &amp; employee self-service portal for S4Carlisle.
          </p>

          {/* Feature Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-w-[480px]">
            <div className="flex gap-3 items-center bg-white/5 border border-white/10 px-4 py-3.5 rounded-2xl transition duration-200 hover:bg-white/10 hover:border-white/20">
              <i className="fa-solid fa-clock-rotate-left text-warning-400 text-[17px]"></i>
              <span className="text-[14px] font-medium text-white/90">Attendance &amp; leave</span>
            </div>
            <div className="flex gap-3 items-center bg-white/5 border border-white/10 px-4 py-3.5 rounded-2xl transition duration-200 hover:bg-white/10 hover:border-white/20">
              <i className="fa-solid fa-receipt text-warning-400 text-[17px]"></i>
              <span className="text-[14px] font-medium text-white/90">Payroll &amp; benefits</span>
            </div>
            <div className="flex gap-3 items-center bg-white/5 border border-white/10 px-4 py-3.5 rounded-2xl transition duration-200 hover:bg-white/10 hover:border-white/20">
              <i className="fa-solid fa-chart-line text-warning-400 text-[17px]"></i>
              <span className="text-[14px] font-medium text-white/90">Performance reviews</span>
            </div>
            <div className="flex gap-3 items-center bg-white/5 border border-white/10 px-4 py-3.5 rounded-2xl transition duration-200 hover:bg-white/10 hover:border-white/20">
              <i className="fa-solid fa-graduation-cap text-warning-400 text-[17px]"></i>
              <span className="text-[14px] font-medium text-white/90">Learning &amp; development</span>
            </div>
          </div>
        </div>

        {/* Card Column */}
        <div className="flex justify-center w-full">
          <AnimatePresence mode="wait">
            {view === "login" ? (
              /* ================= LOGIN CARD ================= */
              <motion.div
                key="login-card"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.35 }}
                className="w-full bg-white rounded-[20px] shadow-[0_24px_50px_rgba(0,0,0,0.28)] p-10"
              >
                <div className="mb-7">
                  <h2 className="font-bold text-[28px] text-neutral-900 mb-1.5" >Let's Get Started</h2>
                  <p className="text-[14px] text-neutral-500">Enter your credentials to access the portal.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="block text-[13px] font-semibold text-neutral-700 mb-2">
                      Username
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <UserCircleIcon className="h-5 w-5 text-neutral-400" />
                      </div>
                      <input
                        type="text"
                        required
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        placeholder="username"
                        className="w-full h-[52px] pl-11 pr-4 border border-neutral-200 rounded-xl bg-neutral-50 text-[15px] text-neutral-800 placeholder:text-neutral-400 outline-none transition-all duration-200 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/15"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[13px] font-semibold text-neutral-700 mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <LockClosedIcon className="h-5 w-5 text-neutral-400" />
                      </div>
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={formData.password}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            password: e.target.value,
                          })
                        }
                        placeholder="••••••••"
                        className="w-full h-[52px] pl-11 pr-12 border border-neutral-200 rounded-xl bg-neutral-50 text-[15px] text-neutral-800 placeholder:text-neutral-400 outline-none transition-all duration-200 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/15"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-neutral-400 hover:text-neutral-600 transition-colors"
                      >
                        {showPassword ? (
                          <EyeSlashIcon className="h-5 w-5" />
                        ) : (
                          <EyeIcon className="h-5 w-5" />
                        )}
                      </button>
                    </div>

                    <div className="mt-2 text-right">
                      <button
                        type="button"
                        onClick={() => setView("forgot-password")}
                        className="text-[13px] font-medium text-blue-500 hover:text-blue-600 hover:underline"
                      >
                        Forgot password?
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-[52px] bg-blue-900 hover:bg-blue-700 text-white text-[15px] font-semibold rounded-xl shadow-[0_8px_18px_rgba(30,58,138,0.28)] hover:shadow-[0_10px_22px_rgba(30,58,138,0.4)] transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                    
                  >
                    {loading ? (
                      <>
                        <span>Signing in...</span>
                        <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      </>
                    ) : (
                      <>
                        <span>Sign in</span>
                        <i className="fa-solid fa-arrow-right-to-bracket"></i>
                      </>
                    )}
                  </button>
                </form>


              </motion.div>
            ) : (
              /* ============ FORGOT / CHANGE PASSWORD CARD ============ */
              <motion.div
                key="forgot-card"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.35 }}
                className="w-full bg-white rounded-[20px] shadow-[0_24px_50px_rgba(0,0,0,0.28)] p-10"
              >
                <button
                  type="button"
                  onClick={handleBackToLogin}
                  className="mb-5 inline-flex items-center gap-1.5 text-[13px] font-semibold text-neutral-500 hover:text-blue-500 hover:underline"
                >
                  <ArrowLeftIcon className="h-4 w-4" />
                  Back to Sign In
                </button>

                <div className="mb-7">
                  <h2 className="font-bold text-[28px] text-neutral-900 mb-1.5" >Change Password</h2>
                  <p className="text-[14px] text-neutral-500">Enter your old password and choose a new one.</p>
                </div>

                <form onSubmit={handleChangePassword} className="space-y-5">
                  <div>
                    <label className="block text-[13px] font-semibold text-neutral-700 mb-2">
                      Username
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <UserCircleIcon className="h-5 w-5 text-neutral-400" />
                      </div>
                      <input
                        type="text"
                        required
                        value={pwData.username}
                        onChange={(e) =>
                          setPwData({ ...pwData, username: e.target.value })
                        }
                        placeholder="username"
                        className="w-full h-[52px] pl-11 pr-4 border border-neutral-200 rounded-xl bg-neutral-50 text-[15px] text-neutral-800 placeholder:text-neutral-400 outline-none transition-all duration-200 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/15"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[13px] font-semibold text-neutral-700 mb-2">
                      Old Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <LockClosedIcon className="h-5 w-5 text-neutral-400" />
                      </div>
                      <input
                        type={showOldPassword ? "text" : "password"}
                        required
                        value={pwData.oldPassword}
                        onChange={(e) =>
                          setPwData({
                            ...pwData,
                            oldPassword: e.target.value,
                          })
                        }
                        placeholder="••••••••"
                        className="w-full h-[52px] pl-11 pr-12 border border-neutral-200 rounded-xl bg-neutral-50 text-[15px] text-neutral-800 placeholder:text-neutral-400 outline-none transition-all duration-200 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/15"
                      />
                      <button
                        type="button"
                        onClick={() => setShowOldPassword(!showOldPassword)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-neutral-400 hover:text-neutral-600 transition-colors"
                      >
                        {showOldPassword ? (
                          <EyeSlashIcon className="h-5 w-5" />
                        ) : (
                          <EyeIcon className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[13px] font-semibold text-neutral-700 mb-2">
                      New Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <KeyIcon className="h-5 w-5 text-neutral-400" />
                      </div>
                      <input
                        type={showNewPassword ? "text" : "password"}
                        required
                        minLength={8}
                        value={pwData.newPassword}
                        onChange={(e) =>
                          setPwData({
                            ...pwData,
                            newPassword: e.target.value,
                          })
                        }
                        placeholder="••••••••"
                        className="w-full h-[52px] pl-11 pr-12 border border-neutral-200 rounded-xl bg-neutral-50 text-[15px] text-neutral-800 placeholder:text-neutral-400 outline-none transition-all duration-200 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/15"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-neutral-400 hover:text-neutral-600 transition-colors"
                      >
                        {showNewPassword ? (
                          <EyeSlashIcon className="h-5 w-5" />
                        ) : (
                          <EyeIcon className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[13px] font-semibold text-neutral-700 mb-2">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <KeyIcon className="h-5 w-5 text-neutral-400" />
                      </div>
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        required
                        minLength={8}
                        value={pwData.confirmPassword}
                        onChange={(e) =>
                          setPwData({
                            ...pwData,
                            confirmPassword: e.target.value,
                          })
                        }
                        placeholder="••••••••"
                        className="w-full h-[52px] pl-11 pr-12 border border-neutral-200 rounded-xl bg-neutral-50 text-[15px] text-neutral-800 placeholder:text-neutral-400 outline-none transition-all duration-200 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/15"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-neutral-400 hover:text-neutral-600 transition-colors"
                      >
                        {showConfirmPassword ? (
                          <EyeSlashIcon className="h-5 w-5" />
                        ) : (
                          <EyeIcon className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={pwLoading}
                    className="w-full h-[52px] bg-blue-900 hover:bg-blue-700 text-white text-[15px] font-semibold rounded-xl shadow-[0_8px_18px_rgba(30,58,138,0.28)] hover:shadow-[0_10px_22px_rgba(30,58,138,0.4)] transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                    
                  >
                    {pwLoading ? (
                      <>
                        <span>Updating...</span>
                        <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      </>
                    ) : (
                      "Change Password"
                    )}
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full flex justify-between items-center px-12 py-4 border-t border-white/10 text-[12.5px] text-white/60">
        <span>© 2026 <span className="text-warning-400 font-medium">S4Carlisle Publishing Services Pvt Ltd.</span> All rights reserved.</span>
      </footer>
    </div>
  );
};

export default LoginPage;