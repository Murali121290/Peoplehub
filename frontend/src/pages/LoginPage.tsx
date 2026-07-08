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

      const res = await axios.post(
        "http://localhost:5000/api/auth/change-password",
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
    <div className="min-h-screen flex flex-col bg-neutral-50 overflow-hidden">
      {/* Header */}
      <header className="w-full bg-white border-b border-neutral-200">
        <div className="max-w-[1600px] mx-auto h-[86px] px-8 flex items-center justify-between">
          <div className="flex items-center gap-5">
            {/* Logo */}
            <img
              src={logo}
              alt="S4 Carlisle Publishing Services"
              className="w-[140px] h-auto object-contain"
              draggable={false}
            />

            <div className="hidden sm:block h-8 w-px bg-neutral-200" />

            <span className="hidden sm:block text-[19px] font-bold font-serif text-neutral-800">
              S4C <span className="text-primary-600">PeopleHub</span>
            </span>
          </div>

          <p className="hidden md:block text-[12px] font-semibold tracking-[0.18em] uppercase text-neutral-400">
            Empowering People, Driving Performance
          </p>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col">
        <div className="flex-1 flex flex-col lg:flex-row min-h-0">
          {/* Hero image — 75% */}
          <section className="relative lg:w-[75%] min-h-[420px] lg:min-h-0 overflow-hidden bg-white">
            <img
              src={bg}
              alt="S4C PeopleHub"
              className="absolute inset-0 h-full w-full object-contain"
            />
          </section>

          {/* Card column — 25%, overlapping the image edge */}
          <aside className="relative lg:w-[25%] bg-neutral-50 flex items-center justify-center px-8 py-10">
            <AnimatePresence mode="wait">
              {view === "login" ? (
                /* ================= LOGIN CARD ================= */
                <motion.div
                  key="login-card"
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.35 }}
                  className="relative z-10 w-full max-w-[360px] lg:-ml-48 bg-white/45 backdrop-blur-md rounded-2xl shadow-2xl ring-1 ring-white/40 p-8"
                >
                  <div className="mb-8">
                    <h3 className="text-[20px] sm:text-[19px] font-bold font-serif text-neutral-800">
                      Welcome to S4C PeopleHub
                    </h3>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                      <label className="block mb-2 text-[15px] font-semibold text-neutral-700">
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
                          className="w-full h-[52px] rounded-[10px] border border-neutral-200 bg-neutral-100 pl-11 pr-4 text-neutral-800 placeholder:text-neutral-400 outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-400"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block mb-2 text-[15px] font-semibold text-neutral-700">
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
                          className="w-full h-[52px] rounded-[10px] border border-neutral-200 bg-neutral-100 pl-11 pr-12 text-neutral-800 placeholder:text-neutral-400 outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-400"
                        />

                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-4 flex items-center"
                        >
                          {showPassword ? (
                            <EyeSlashIcon className="h-5 w-5 text-neutral-400 hover:text-neutral-600" />
                          ) : (
                            <EyeIcon className="h-5 w-5 text-neutral-400 hover:text-neutral-600" />
                          )}
                        </button>
                      </div>

                      <div className="mt-2 text-right">
                        <button
                          type="button"
                          onClick={() => setView("forgot-password")}
                          className="text-[14px] font-medium text-primary-600 hover:text-primary-700"
                        >
                          Forgot password?
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="mt-3 w-full h-[54px] rounded-[12px] bg-primary-500 text-white text-[16px] font-semibold shadow-sm transition hover:bg-primary-600 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {loading ? "Signing In..." : "Sign In \u2192"}
                    </button>
                  </form>

                  <p className="mt-5 text-center text-[15px] text-neutral-400">
                    Don&apos;t have an account?{" "}
                    <span className="font-semibold text-primary-600">
                      Register here
                    </span>
                  </p>
                </motion.div>
              ) : (
                /* ============ FORGOT / CHANGE PASSWORD CARD ============ */
                <motion.div
                  key="forgot-card"
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.35 }}
                  className="relative z-10 w-full max-w-[360px] lg:-ml-48 bg-white/45 backdrop-blur-md rounded-2xl shadow-2xl ring-1 ring-white/40 p-8"
                >
                  <button
                    type="button"
                    onClick={handleBackToLogin}
                    className="mb-5 inline-flex items-center gap-1.5 text-[13px] font-semibold text-neutral-500 hover:text-primary-600"
                  >
                    <ArrowLeftIcon className="h-4 w-4" />
                    Back to Sign In
                  </button>

                  <div className="mb-8">
                    <h3 className="text-[20px] sm:text-[19px] font-bold font-serif text-neutral-800">
                      Change Password
                    </h3>
                    <p className="mt-1.5 text-[13px] text-neutral-500">
                      Enter your old password and choose a new one.
                    </p>
                  </div>

                  <form onSubmit={handleChangePassword} className="space-y-5">
                    <div>
                      <label className="block mb-2 text-[15px] font-semibold text-neutral-700">
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
                          className="w-full h-[52px] rounded-[10px] border border-neutral-200 bg-neutral-100 pl-11 pr-4 text-neutral-800 placeholder:text-neutral-400 outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-400"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block mb-2 text-[15px] font-semibold text-neutral-700">
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
                          className="w-full h-[52px] rounded-[10px] border border-neutral-200 bg-neutral-100 pl-11 pr-12 text-neutral-800 placeholder:text-neutral-400 outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-400"
                        />

                        <button
                          type="button"
                          onClick={() => setShowOldPassword(!showOldPassword)}
                          className="absolute inset-y-0 right-0 pr-4 flex items-center"
                        >
                          {showOldPassword ? (
                            <EyeSlashIcon className="h-5 w-5 text-neutral-400 hover:text-neutral-600" />
                          ) : (
                            <EyeIcon className="h-5 w-5 text-neutral-400 hover:text-neutral-600" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block mb-2 text-[15px] font-semibold text-neutral-700">
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
                          className="w-full h-[52px] rounded-[10px] border border-neutral-200 bg-neutral-100 pl-11 pr-12 text-neutral-800 placeholder:text-neutral-400 outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-400"
                        />

                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute inset-y-0 right-0 pr-4 flex items-center"
                        >
                          {showNewPassword ? (
                            <EyeSlashIcon className="h-5 w-5 text-neutral-400 hover:text-neutral-600" />
                          ) : (
                            <EyeIcon className="h-5 w-5 text-neutral-400 hover:text-neutral-600" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block mb-2 text-[15px] font-semibold text-neutral-700">
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
                          className="w-full h-[52px] rounded-[10px] border border-neutral-200 bg-neutral-100 pl-11 pr-12 text-neutral-800 placeholder:text-neutral-400 outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-400"
                        />

                        <button
                          type="button"
                          onClick={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                          }
                          className="absolute inset-y-0 right-0 pr-4 flex items-center"
                        >
                          {showConfirmPassword ? (
                            <EyeSlashIcon className="h-5 w-5 text-neutral-400 hover:text-neutral-600" />
                          ) : (
                            <EyeIcon className="h-5 w-5 text-neutral-400 hover:text-neutral-600" />
                          )}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={pwLoading}
                      className="mt-3 w-full h-[54px] rounded-[12px] bg-primary-500 text-white text-[16px] font-semibold shadow-sm transition hover:bg-primary-600 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {pwLoading ? "Updating..." : "Change Password"}
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </aside>
        </div>

        {/* Bottom footer */}
        <footer className="bg-[#1c2c5a] text-white">
          <div className="max-w-[1600px] mx-auto px-6 lg:px-8 py-3">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-[13px]">
              <p className="text-[#b8c0d4]">
                © 2026{" "}
                <span className="font-semibold text-[#f0b44e]">
                  S4Carlisle Publishing Services Pvt Ltd.
                </span>{" "}
                All rights reserved.
              </p>

              <div className="flex items-center gap-6 text-[#b8c0d4]">
                <button type="button" className="hover:text-white">
                  Privacy Policy
                </button>
                <button type="button" className="hover:text-white">
                  Terms of Use
                </button>
                <button type="button" className="hover:text-white">
                  Support
                </button>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default LoginPage;