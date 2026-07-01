import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import logo from "../images/s.png"
import { useAuthStore } from "../store/authStore";
import {
  LockClosedIcon,
  UserCircleIcon,
  EyeIcon,
  EyeSlashIcon,
} from "@heroicons/react/24/solid";
import bg from "../images/hero-bg.jpg";
// import logo from "../src/images/s4carlisle-logo.png"; // optional

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {e.preventDefault();
setLoading(true);

try {

  const response = await login(
    formData.email,
    formData.password
  );

  sessionStorage.removeItem(
    "attendance_popup_shown"
  );

  sessionStorage.removeItem(
    "birthday_popup_shown"
  );

  console.log(
    "Login Response:",
    response
  );

  const accessLevel =
    response.access_level ||
    response.user?.access_level ||
    "";

  console.log(
    "Access Level:",
    accessLevel
  );

  if (
    accessLevel === "user" &&
    (
      response.is_first_login ||
      !response.profile_completed
    )
  ) {

    navigate("/complete-profile");
    return;

  }

  if (
    accessLevel === "user"
  ) {

    navigate(
      "/employee-dashboard"
    );

  }
  else if (
    accessLevel === "manager"
  ) {

    navigate(
      "/manager-dashboard"
    );

  }
  else if (
    accessLevel === "admin" ||
    accessLevel === "hr"
  ) {

    navigate(
      "/employee-dashboard"
    );

  }
  else {

    navigate(
      "/employee-dashboard"
    );

  }

} catch (error: any) {

  console.error(error);

  toast.error(
    error.response?.data?.error ||
    "Login failed"
  );

} finally {

  setLoading(false);

}};

// You have TWO separate popup states!

  return (
    <div className="min-h-screen flex flex-col bg-[#f5f5f5] overflow-hidden">
      {/* Header */}
      <header className="w-full bg-white border-b border-gray-200">
        <div className="max-w-[1600px] mx-auto h-[86px] px-8 flex items-center justify-between">
          <div className="flex items-center gap-5">
  {/* Logo */}
  <img
    src={logo}
    alt="S4 Carlisle Publishing Services"
    className="w-[140px] h-auto object-contain"
    draggable={false}
  />

  {/* PrepOps Text */}
</div>
        

          <p className="hidden md:block text-[12px] font-semibold tracking-[0.18em] uppercase text-[#a7afbd]">
            Your partner in publishing excellence
          </p>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col">
        <div className="flex-1 flex flex-col lg:flex-row min-h-0">
          {/* Hero section */}
          <section className="relative lg:w-[74%] min-h-[520px] lg:min-h-0 overflow-hidden">
            <img
              src={bg}
              alt="PrepOps hero"
              className="absolute inset-0 h-full w-full object-cover"
            />

            {/* overlays */}
            <div className="absolute inset-0 bg-[rgba(18,26,52,0.58)]" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#1a2244]/65 via-[#4e3c33]/20 to-[#ea9b5c]/35" />

            <div className="relative z-10 h-full flex items-center">
              <div className="px-8 sm:px-12 lg:px-10 xl:px-12 max-w-[760px] pt-10 lg:pt-0">
                <div className="inline-flex items-center gap-2 rounded-full border border-[#e6b85d]/40 bg-[#c89f3d]/15 px-5 py-2 mb-7 backdrop-blur-sm">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#e1b84f]" />
                  <span className="text-[13px] font-semibold tracking-[0.08em] uppercase text-[#efc765]">
                    Live Production System
                  </span>
                </div>

                <h2 className="font-serif font-semibold text-white leading-[0.95] text-[62px] sm:text-[60px] lg:text-[62px] xl:text-[68px]">
                  HR
                  <span className="block text-[#efc15b]">Management System</span>
                </h2>

                <p className="mt-7 max-w-[620px] text-[20px] leading-[1.5] text-white">
                  Automate pre-editing, mechanical editing, reference validation,
                  alt-text generation, and more — with real-time SLA visibility
                  and AI-assisted QA across every imprint.
                </p>
              </div>
            </div>
          </section>

          {/* Login panel */}
          <aside className="lg:w-[26%] bg-[#f4f5f7] flex items-center justify-center px-8 py-10">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="w-full max-w-[360px]"
            >
              <div className="mb-10">
                <h3 className="text-[20px] sm:text-[19px] font-bold font-serif text-[#22345a]">
                  Welcome to HR Management System
                </h3>
                <p className="mt-2 text-[15px] text-[#8a93a3]">
                  Sign in to your S4C HR workspace
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block mb-2 text-[15px] font-semibold text-[#334155]">
                    Username
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <UserCircleIcon className="h-5 w-5 text-[#98a2b3]" />
                    </div>

                    <input
                      type=""
                      required
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      placeholder="username"
                      className="w-full h-[52px] rounded-[10px] border border-[#d8dee8] bg-[#e9edf3] pl-11 pr-4 text-[#1f2937] placeholder:text-[#9ca3af] outline-none focus:ring-2 focus:ring-[#efac7f] focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block mb-2 text-[15px] font-semibold text-[#334155]">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <LockClosedIcon className="h-5 w-5 text-[#98a2b3]" />
                    </div>

                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      placeholder="••••••••"
                      className="w-full h-[52px] rounded-[10px] border border-[#d8dee8] bg-[#e9edf3] pl-11 pr-12 text-[#1f2937] placeholder:text-[#9ca3af] outline-none focus:ring-2 focus:ring-[#efac7f] focus:border-transparent"
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center"
                    >
                      {showPassword ? (
                        <EyeSlashIcon className="h-5 w-5 text-[#98a2b3] hover:text-[#475467]" />
                      ) : (
                        <EyeIcon className="h-5 w-5 text-[#98a2b3] hover:text-[#475467]" />
                      )}
                    </button>
                  </div>

                  <div className="mt-2 text-right">
                    <button
                      type="button"
                      className="text-[14px] font-medium text-[#e3a08a] hover:text-[#d17d62]"
                    >
                      Forgot password?
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-3 w-full h-[54px] rounded-[12px] bg-gradient-to-r from-[#ef9f96] to-[#e9ae68] text-white text-[16px] font-semibold shadow-sm transition hover:brightness-95 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? "Signing In..." : "Sign In \u2192"}
                </button>
              </form>

              <p className="mt-5 text-center text-[15px] text-[#9aa1ad]">
                Don&apos;t have an account?{" "}
                <span className="font-semibold text-[#d98167]">Register here</span>
              </p>
            </motion.div>
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