import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import axios from "axios";
import { useAuthStore } from "../store/authStore";
import {
  LockClosedIcon,
  UserCircleIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowLeftIcon,
  KeyIcon,
} from "@heroicons/react/24/solid";
import bg from "../images/login-hero-new.webp";
import logo from "../images/s.png";

type ViewMode = "login" | "forgot-password" | "force-change-password";

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();

  // ---- Which card is showing ----
  const [view, setView] = useState<ViewMode>("login");
  const [pendingUserId, setPendingUserId] = useState<number | null>(null);
  const [loginKey, setLoginKey] = useState(0);

  // ---- Login form state ----
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // ---- Forgot / change password form state ----
  const [pwData, setPwData] = useState({
    username: "",
    otpCode: "",
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [otpStep, setOtpStep] = useState<1 | 2>(1);
  const [pwLoading, setPwLoading] = useState(false);
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await login(formData.email, formData.password);

      if (response.require_password_change) {
        toast(response.message || "Please change your default password", {
          icon: 'ℹ️',
        });
        setPendingUserId(response.user_id);
        setView("force-change-password");
        return;
      }

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
      otpCode: "",
      oldPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    setOtpStep(1);
    setShowOldPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  const handleBackToLogin = () => {
    resetPwForm();
    setLoginKey(prev => prev + 1);
    setView("login");
  };

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwData.username) return;

    setPwLoading(true);
    try {
      const apiUrl = `${import.meta.env.VITE_API_URL || ""}/api`;
      const res = await axios.post(`${apiUrl}/auth/forgot-password/request-otp`, {
        email: pwData.username,
      });
      toast.success(res.data.message || "OTP sent to your email");
      setOtpStep(2);
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.message || "Failed to send OTP");
    } finally {
      setPwLoading(false);
    }
  };

  const handleResetPasswordWithOTP = async (e: React.FormEvent) => {
    e.preventDefault();

    if (pwData.newPassword.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }

    if (pwData.newPassword !== pwData.confirmPassword) {
      toast.error("New password and confirm password do not match");
      return;
    }

    setPwLoading(true);
    try {
      const apiUrl = `${import.meta.env.VITE_API_URL || ""}/api`;
      const res = await axios.post(`${apiUrl}/auth/forgot-password/reset-with-otp`, {
        email: pwData.username,
        otp: pwData.otpCode,
        new_password: pwData.newPassword,
      });

      toast.success(res.data.message || "Password reset successfully");
      resetPwForm();
      setView("login");
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.message || "Password reset failed");
    } finally {
      setPwLoading(false);
    }
  };

  const handleForceChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (pwData.newPassword.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }

    if (pwData.newPassword !== pwData.confirmPassword) {
      toast.error("New password and confirm password do not match");
      return;
    }

    setPwLoading(true);

    try {
      const apiUrl = `${import.meta.env.VITE_API_URL || ""}/api`;
      const res = await axios.post(
        `${apiUrl}/auth/change-password`,
        {
          user_id: pendingUserId,
          current_password: "Welcome_PeopleHub",
          new_password: pwData.newPassword,
        }
      );

      toast.success("Password secured! Please login again with your new password.");
      setFormData({ email: "", password: "" });
      setTimeout(() => window.location.reload(), 1500);
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

  const glassInputClass =
    "w-full h-[52px] pl-11 pr-4 rounded-xl text-[15px] text-white placeholder:text-white/35 outline-none transition-all duration-200 glass-input";

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden text-neutral-800">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Outfit:wght@300;400;500;600;700;800;900&display=swap');

        @keyframes slowZoom { 
          0% { transform: scale(1); } 
          100% { transform: scale(1.05); } 
        }
        @keyframes floatParticle {
          0% { transform: translateY(100vh) rotate(0deg); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(-10vh) rotate(720deg); opacity: 0; }
        }
        @keyframes loginSlideUp { 
          from { opacity: 0; transform: translateY(30px); } 
          to { opacity: 1; transform: translateY(0); } 
        }

        .lp-particle { 
          position: absolute; 
          background: rgba(251,191,36,0.4); 
          border-radius: 50%; 
          animation: floatParticle linear infinite; 
        }
        .lp-particle:nth-child(1) { left: 10%; animation-duration: 22s; animation-delay: 0s; width: 6px; height: 6px; }
        .lp-particle:nth-child(2) { left: 20%; animation-duration: 28s; animation-delay: 3s; width: 3px; height: 3px; }
        .lp-particle:nth-child(3) { left: 35%; animation-duration: 18s; animation-delay: 5s; width: 8px; height: 8px; opacity: 0.3; }
        .lp-particle:nth-child(4) { left: 50%; animation-duration: 25s; animation-delay: 2s; width: 4px; height: 4px; }
        .lp-particle:nth-child(5) { left: 65%; animation-duration: 20s; animation-delay: 7s; width: 5px; height: 5px; }
        .lp-particle:nth-child(6) { left: 75%; animation-duration: 30s; animation-delay: 1s; width: 3px; height: 3px; }
        .lp-particle:nth-child(7) { left: 85%; animation-duration: 24s; animation-delay: 4s; width: 7px; height: 7px; opacity: 0.25; }
        .lp-particle:nth-child(8) { left: 45%; animation-duration: 26s; animation-delay: 6s; width: 4px; height: 4px; }

        .glass-input {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          color: #fff;
          font-family: 'Inter', sans-serif;
          outline: none;
          transition: all 0.3s;
        }
        .glass-input:focus { 
          border-color: #fbbf24 !important; 
          background: rgba(255,255,255,0.08) !important; 
          box-shadow: 0 0 0 4px rgba(251,191,36,0.06) !important; 
        }
        .glass-input::placeholder { 
          color: rgba(255,255,255,0.25); 
        }
        input:-webkit-autofill,
        input:-webkit-autofill:hover, 
        input:-webkit-autofill:focus, 
        input:-webkit-autofill:active,
        input:autofill,
        input:autofill:hover,
        input:autofill:focus,
        input:autofill:active {
          -webkit-box-shadow: 0 0 0 1000px #1c1f2e inset !important;
          -webkit-text-fill-color: #ffffff !important;
          box-shadow: 0 0 0 1000px #1c1f2e inset !important;
          color: #ffffff !important;
          transition: background-color 5000s ease-in-out 0s;
        }

        .feature-pill {
          background: rgba(0,0,0,0.3); 
          border: 1px solid rgba(255,255,255,0.08); 
          padding: 14px 18px; 
          border-radius: 16px; 
          transition: all 0.3s;
        }
        .feature-pill:hover { 
          background: rgba(0,0,0,0.4) !important; 
          border-color: rgba(251,191,36,0.2) !important; 
          transform: translateY(-2px); 
        }
        .remember-checkbox {
          accent-color: #fbbf24;
        }
      `}</style>

      {/* Background photo */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0" style={{ animation: "slowZoom 20s ease-in-out infinite alternate" }}>
          <img src={bg} alt="background" className="w-full h-full object-cover" />
        </div>
        {/* Navy gradient scrim overlay */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 70% 50%, rgba(10,15,30,0.2) 0%, rgba(10,15,30,0.6) 70%), linear-gradient(135deg, rgba(10,15,30,0.5) 0%, rgba(10,15,30,0.3) 100%)" }} />
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-50" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
        {/* Floating particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="lp-particle"></div><div className="lp-particle"></div><div className="lp-particle"></div><div className="lp-particle"></div>
          <div className="lp-particle"></div><div className="lp-particle"></div><div className="lp-particle"></div><div className="lp-particle"></div>
        </div>
      </div>

      {/* Header */}
      <header
        className="relative z-10 w-full flex items-center justify-between"
        style={{
          padding: "20px 48px",
          background: "rgba(10,15,30,0.3)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="flex items-center gap-3.5">
          <img
            src={logo}
            alt="S4Carlisle"
            style={{ height: "48px", width: "auto", objectFit: "contain" }}
          />
          <span
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontWeight: 700,
              fontSize: "20px",
              letterSpacing: "-0.02em",
              textShadow: "0 2px 20px rgba(0,0,0,0.3)",
            }}
          >
            <span style={{ color: "#fbbf24" }}>S4</span>
            <span style={{ color: "#fff" }}>C PeopleHub</span>
          </span>
        </div>
      </header>

      {/* Main Body */}
      <main className="relative z-10 flex-1 grid grid-cols-1 lg:grid-cols-[1fr_minmax(400px,460px)] gap-14 items-center px-6 lg:px-18 py-6 pb-12 max-w-[1200px] mx-auto w-full">
        {/* Hero section */}
        <div className="text-white max-w-[560px] flex flex-col justify-start h-full py-12 lg:py-20">


          <h1
            className="font-extrabold text-[40px] md:text-[64px] leading-[1.05] mb-5 tracking-tight"
            style={{
              fontFamily: "'Outfit', sans-serif",
              textShadow: "0 2px 40px rgba(0,0,0,0.5)",
            }}
          >
            Your workday,<br />
            <span
              style={{
                background: "linear-gradient(135deg, #fbbf24, #f59e0b)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              all in one place.
            </span>
          </h1>
          <p
            className="text-[17px] leading-[1.7] text-white/75 mb-10 max-w-[480px]"
            style={{ textShadow: "0 1px 30px rgba(0,0,0,0.4)" }}
          >
            Empowering people, driving performance. The unified HR &amp; employee self-service portal for S4Carlisle.
          </p>

          {/* Feature Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-[500px]">
            <div className="feature-pill flex gap-3 items-center">
              <i className="fa-solid fa-clock-rotate-left" style={{ color: "#fbbf24", fontSize: "18px" }}></i>
              <span className="text-[14px] font-medium text-white/90">Attendance &amp; leave</span>
            </div>
            <div className="feature-pill flex gap-3 items-center">
              <i className="fa-solid fa-receipt" style={{ color: "#fbbf24", fontSize: "18px" }}></i>
              <span className="text-[14px] font-medium text-white/90">Payroll &amp; benefits</span>
            </div>
            <div className="feature-pill flex gap-3 items-center">
              <i className="fa-solid fa-chart-line" style={{ color: "#fbbf24", fontSize: "18px" }}></i>
              <span className="text-[14px] font-medium text-white/90">Performance reviews</span>
            </div>
            <div className="feature-pill flex gap-3 items-center">
              <i className="fa-solid fa-graduation-cap" style={{ color: "#fbbf24", fontSize: "18px" }}></i>
              <span className="text-[14px] font-medium text-white/90">Learning &amp; dev</span>
            </div>
          </div>
        </div>

        {/* Card Column */}
        <div className="flex justify-center lg:justify-end w-full h-full items-center">
          <AnimatePresence mode="wait">
            {view === "login" ? (
              /* ================= LOGIN CARD ================= */
              <motion.div
                key="login-card"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.35 }}
                className="w-full max-w-[440px]"
                style={{
                  borderRadius: "24px",
                  padding: "48px 44px",
                  border: "1px solid rgba(255,255,255,0.08)",
                  backgroundColor: "#00000040",
                  backdropFilter: "blur(8px)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "flex-start",
                }}
              >
                <div className="mb-8">
                  <h2 className="font-bold text-[26px] mb-1" style={{ fontFamily: "'Outfit', sans-serif", color: "#fff", textShadow: "0 2px 20px rgba(0,0,0,0.3)" }}>Welcome back</h2>
                  <p className="text-[14px] text-white/50">Sign in to your dashboard</p>
                  <div style={{ width: "40px", height: "3px", background: "linear-gradient(90deg, #fbbf24, #f59e0b)", borderRadius: "2px", marginTop: "12px" }}></div>
                </div>

                <form key={`login-form-${loginKey}`} onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="block text-[12px] font-semibold mb-1.5 uppercase text-white/60" style={{ letterSpacing: "0.5px" }}>
                      Employee ID
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <UserCircleIcon className="h-5 w-5 text-white/40" />
                      </div>
                      <input
                        type="text"
                        name="employee_id"
                        id="employee_id"
                        required
                        autoComplete="off"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        placeholder="Enter your Employee ID"
                        className={glassInputClass}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[12px] font-semibold mb-1.5 uppercase text-white/60" style={{ letterSpacing: "0.5px" }}>
                      Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <LockClosedIcon className="h-5 w-5 text-white/40" />
                      </div>
                      <input
                        type={showPassword ? "text" : "password"}
                        name="employee_password"
                        id="employee_password"
                        required
                        autoComplete="new-password"
                        value={formData.password}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            password: e.target.value,
                          })
                        }
                        placeholder="Enter your password"
                        className={`${glassInputClass} pr-12`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-white/40 hover:text-white/70 transition-colors"
                      >
                        {showPassword ? (
                          <EyeIcon className="h-5 w-5" />
                        ) : (
                          <EyeSlashIcon className="h-5 w-5" />
                        )}
                      </button>
                    </div>

                    <div className="mt-4.5 flex items-center justify-between">
                      <label className="flex items-center gap-2 text-[13px] cursor-pointer text-white/50">
                        <input
                          type="checkbox"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          className="remember-checkbox h-4 w-4 cursor-pointer"
                        />
                        Remember me
                      </label>
                      <button
                        type="button"
                        onClick={() => setView("forgot-password")}
                        className="text-[13px] font-medium hover:underline text-white/40"
                      >
                        Forgot password?
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-[52px] text-[15px] font-semibold rounded-xl shadow-[0_8px_24px_rgba(251,191,36,0.2)] hover:shadow-[0_12px_32px_rgba(251,191,36,0.35)] transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2.5 disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      background: "linear-gradient(135deg, #fbbf24, #f59e0b)",
                      color: "#0a0f1e",
                    }}
                  >
                    {loading ? (
                      <>
                        <span>Signing in...</span>
                        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
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
                className="w-full max-w-[440px]"
                style={{
                  borderRadius: "24px",
                  padding: "48px 44px",
                  border: "1px solid rgba(255,255,255,0.08)",
                  backgroundColor: "#00000040",
                  backdropFilter: "blur(8px)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "flex-start",
                }}
              >
                {view === "forgot-password" && (
                  <button
                    type="button"
                    onClick={handleBackToLogin}
                    className="mb-5 inline-flex items-center gap-1.5 text-[13px] font-semibold text-white/60 hover:text-[#fbbf24] hover:underline"
                  >
                    <ArrowLeftIcon className="h-4 w-4" />
                    Back to Sign In
                  </button>
                )}

                <div className="mb-8">
                  <h2 className="font-bold text-[26px] mb-1" style={{ fontFamily: "'Outfit', sans-serif", color: "#fff", textShadow: "0 2px 20px rgba(0,0,0,0.3)" }}>
                    {view === "force-change-password" ? "Set New Password" : (otpStep === 1 ? "Forgot Password" : "Reset Password")}
                  </h2>
                  <p className="text-[14px] text-white/50">
                    {view === "force-change-password"
                      ? "Please choose a new password for your account."
                      : (otpStep === 1
                        ? "Enter your company email to receive an OTP."
                        : "Enter the OTP sent to your email and your new password.")}
                  </p>
                  <div style={{ width: "40px", height: "3px", background: "linear-gradient(90deg, #fbbf24, #f59e0b)", borderRadius: "2px", marginTop: "12px" }}></div>
                </div>

                <form onSubmit={view === "force-change-password" ? handleForceChangePassword : (otpStep === 1 ? handleRequestOTP : handleResetPasswordWithOTP)} className="space-y-5">
                  {(view === "force-change-password" || otpStep === 1) && (
                    <div>
                      <label className="block text-[12px] font-semibold mb-1.5 uppercase text-white/60" style={{ letterSpacing: "0.5px" }}>
                        {view === "force-change-password" ? "Employee ID" : "Company Email"}
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <UserCircleIcon className="h-5 w-5 text-white/40" />
                        </div>
                        <input
                          type={view === "force-change-password" ? "text" : "email"}
                          required
                          value={view === "force-change-password" ? formData.email : pwData.username}
                          onChange={(e) =>
                            view === "force-change-password"
                              ? setFormData({ ...formData, email: e.target.value })
                              : setPwData({ ...pwData, username: e.target.value })
                          }
                          disabled={view === "force-change-password"}
                          placeholder={view === "force-change-password" ? "Employee ID" : "Enter your company email"}
                          className={glassInputClass}
                        />
                      </div>
                    </div>
                  )}

                  {view === "forgot-password" && otpStep === 2 && (
                    <div>
                      <label className="block text-[12px] font-semibold mb-1.5 uppercase text-white/60" style={{ letterSpacing: "0.5px" }}>
                        OTP Code
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <KeyIcon className="h-5 w-5 text-white/40" />
                        </div>
                        <input
                          type="text"
                          required
                          value={pwData.otpCode}
                          onChange={(e) =>
                            setPwData({ ...pwData, otpCode: e.target.value })
                          }
                          placeholder="Enter 6-digit OTP"
                          className={glassInputClass}
                          maxLength={6}
                        />
                      </div>
                    </div>
                  )}

                  {(view === "force-change-password" || otpStep === 2) && (
                    <>
                      <div>
                        <label className="block text-[12px] font-semibold mb-1.5 uppercase text-white/60" style={{ letterSpacing: "0.5px" }}>
                          New Password
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <KeyIcon className="h-5 w-5 text-white/40" />
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
                            placeholder="Enter your new password"
                            className={`${glassInputClass} pr-12`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute inset-y-0 right-0 pr-4 flex items-center text-white/40 hover:text-white/70 transition-colors"
                          >
                            {showNewPassword ? (
                              <EyeIcon className="h-5 w-5" />
                            ) : (
                              <EyeSlashIcon className="h-5 w-5" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[12px] font-semibold mb-1.5 uppercase text-white/60" style={{ letterSpacing: "0.5px" }}>
                          Confirm Password
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <KeyIcon className="h-5 w-5 text-white/40" />
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
                            placeholder="Re-enter your new password"
                            className={`${glassInputClass} pr-12`}
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setShowConfirmPassword(!showConfirmPassword)
                            }
                            className="absolute inset-y-0 right-0 pr-4 flex items-center text-white/40 hover:text-white/70 transition-colors"
                          >
                            {showConfirmPassword ? (
                              <EyeIcon className="h-5 w-5" />
                            ) : (
                              <EyeSlashIcon className="h-5 w-5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                  <button
                    type="submit"
                    disabled={pwLoading}
                    className="w-full h-[52px] mt-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-neutral-900 font-bold text-[16px] transition-all hover:scale-[1.02] disabled:opacity-70 disabled:hover:scale-100 flex items-center justify-center gap-2"
                  >
                    {pwLoading ? (
                      <>
                        <span>{view === "forgot-password" && otpStep === 1 ? "Sending..." : "Updating..."}</span>
                        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      </>
                    ) : (
                      view === "force-change-password" ? "Change Password" : (otpStep === 1 ? "Send OTP" : "Reset Password")
                    )}
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Footer */}
      <footer
        style={{
          position: "relative",
          zIndex: 3,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: "16px 48px",
          background: "rgba(10,15,30,0.3)",
          backdropFilter: "blur(12px)",
          borderTop: "1px solid rgba(255,255,255,0.04)",
          fontSize: "12.5px",
          color: "rgba(255,255,255,0.6)",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        <span>© 2026 <span style={{ color: "#FBBF24", fontWeight: 500 }}>S4Carlisle Publishing Services Pvt Ltd.</span> All rights reserved.</span>
      </footer>
    </div>
  );
};

export default LoginPage;
