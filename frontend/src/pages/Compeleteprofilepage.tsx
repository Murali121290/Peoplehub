import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { DatePicker } from "../components/ui/DatePicker";

// ─── Moved OUTSIDE the parent component ───────────────────────────────────────

const inputCls =
  "w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-neutral-800 placeholder-neutral-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 transition-all";
const selectCls = `${inputCls} cursor-pointer`;


const Field = ({ label, children, full = false }: { label: string; children: React.ReactNode; full?: boolean }) => (
  <div className={full ? "col-span-full" : ""}>
    <label className="mb-1.5 block text-sm font-medium text-neutral-700">
      {label}
    </label>
    {children}
  </div>
);

// ──────────────────────────────────────────────────────────────────────────────

const Completeprofilepage = () => {
  const navigate = useNavigate();
  const [skillInput, setSkillInput] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [employeeInfo, setEmployeeInfo] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const employeeId = localStorage.getItem("employee_id");

  const [profilePreview, setProfilePreview] = useState<string>("");

  const [formData, setFormData] = useState({
    // Personal
    phone: "",
    dob: "",
    gender: "",
    marital_status: "",
    blood_group: "",
    // Address
    address: "",
    city: "",
    state: "",
    country: "",
    pincode: "",
    // Bank
    bank_name: "",
    account_number: "",
    ifsc_code: "",
    // Identity
    pan_number: "",
    aadhaar_number: "",
    // 10th
    tenth_board: "",
    tenth_school: "",
    tenth_percentage: "",
    // 12th
    twelfth_board: "",
    twelfth_school: "",
    twelfth_percentage: "",
    // UG
    ug_university: "",
    ug_degree: "",
    ug_college: "",
    ug_percentage: "",
    // PG (optional)
    pg_degree: "",
    pg_college: "",
    pg_percentage: "",
    pg_university: "",
    // Experience
    total_experience: "",
    previous_company: "",
    current_ctc: "",
    expected_ctc: "",
    notice_period: "",
    skills: "",
    // Work Details
    employee_type: "",
    work_location: "",
    shift_timing: "",
    // PF
    pf_number: "",
    uan_number: "",
    esi_number: "",
    // Emergency
    emergency_contact_name: "",
    emergency_contact_number: "",
    emergency_contact_relation: "",
    // Files
    profile_image: null as any,
    resume_file: null as any,
    aadhaar_file: null as any,
    pan_file: null as any,
    degree_certificate: null as any,
  });

  // ─── Skill helpers ────────────────────────────────────────
  const addSkill = () => {
    const trimmed = skillInput.trim();
    if (trimmed && !skills.includes(trimmed)) {
      const updated = [...skills, trimmed];
      setSkills(updated);
      setFormData((p) => ({ ...p, skills: updated.join(",") }));
      setSkillInput("");
    }
  };

  const removeSkill = (skill: string) => {
    const updated = skills.filter((s) => s !== skill);
    setSkills(updated);
    setFormData((p) => ({ ...p, skills: updated.join(",") }));
  };

  // ─── Handlers ─────────────────────────────────────────────
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === "total_experience") {
      const isFresher =
        value.trim() === "0" || value.trim().toLowerCase() === "fresher";
      setFormData((p) => ({
        ...p,
        total_experience: value,
        previous_company: isFresher ? "" : p.previous_company,
      }));
      return;
    }
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, files } = e.target;
    setFormData((p) => ({ ...p, [name]: files ? files[0] : null }));
  };

  const handleProfilePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData((prev) => ({ ...prev, profile_image: file }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const [shiftOptions, setShiftOptions] = useState<string[]>([]);

  useEffect(() => {
    const apiUrl = `${import.meta.env.VITE_API_URL || ""}/api`;
    fetch(`${apiUrl}/shifts/options`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setShiftOptions(data);
        }
      })
      .catch((err) => console.error("Fetch shift options error:", err));
  }, []);

  // ─── Fetch existing employee data ─────────────────────────
  useEffect(() => {
    if (!employeeId) return;
    const fetchEmployee = async () => {
      try {
        const apiUrl = `${import.meta.env.VITE_API_URL || ""}/api`;
        const res = await fetch(
          `${apiUrl}/employees/${employeeId}`,
        );
        const data = await res.json();
        setEmployeeInfo(data);
        if (data.profile_image) {
          setProfilePreview(
            data.profile_image.startsWith("data:")
              ? data.profile_image
              : `data:image/jpeg;base64,${data.profile_image}`
          );
        }
        setFormData((prev) => ({
          ...prev,
          ...Object.fromEntries(
            Object.entries(data)
              .filter(([, v]) => v !== null && v !== undefined && v !== false)
              .map(([k, v]) => [k, String(v)]),
          ),
          profile_image: null,
          resume_file: null,
          aadhaar_file: null,
          pan_file: null,
          degree_certificate: null,
        }));
        if (data.skills) {
          setSkills(
            data.skills
              .split(",")
              .map((s: string) => s.trim())
              .filter(Boolean),
          );
        }
      } catch (err) {
        console.error("Fetch employee error:", err);
      }
    };
    fetchEmployee();
  }, []);

  // ─── Submit ───────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isSubmitting) return;

    const requiredFields = [
      { key: "dob", label: "Date of Birth" },
      { key: "gender", label: "Gender" },
      { key: "marital_status", label: "Marital Status" },
      { key: "blood_group", label: "Blood Group" },
      { key: "address", label: "Address" },
      { key: "city", label: "City" },
      { key: "state", label: "State" },
      { key: "country", label: "Country" },
      { key: "pincode", label: "Pincode" },
      { key: "bank_name", label: "Bank Name" },
      { key: "account_number", label: "Account Number" },
      { key: "ifsc_code", label: "IFSC Code" },
      { key: "pan_number", label: "PAN Number" },
      { key: "aadhaar_number", label: "Aadhaar Number" },
      { key: "tenth_board", label: "10th Board" },
      { key: "tenth_school", label: "10th School" },
      { key: "tenth_percentage", label: "10th Percentage" },
      { key: "twelfth_board", label: "12th Board" },
      { key: "twelfth_school", label: "12th School" },
      { key: "twelfth_percentage", label: "12th Percentage" },
      { key: "ug_university", label: "UG University" },
      { key: "ug_degree", label: "UG Degree" },
      { key: "ug_college", label: "UG College" },
      { key: "ug_percentage", label: "UG Percentage / CGPA" },
      { key: "total_experience", label: "Total Experience" },
      { key: "current_ctc", label: "Current CTC" },
      { key: "expected_ctc", label: "Expected CTC" },
      { key: "notice_period", label: "Notice Period" },
      { key: "employee_type", label: "Employee Type" },
      { key: "work_location", label: "Work Location" },
      { key: "shift_timing", label: "Shift Timing" },
      { key: "pf_number", label: "PF Number" },
      { key: "uan_number", label: "UAN Number" },
      { key: "esi_number", label: "ESI Number" },
      { key: "emergency_contact_name", label: "Emergency Contact Name" },
      { key: "emergency_contact_number", label: "Emergency Contact Number" },
    ];

    for (const { key, label } of requiredFields) {
      const val = (formData as Record<string, any>)[key];
      if (val === undefined || val === null || String(val).trim() === "") {
        toast.error(`${label} is required`);
        document
          .getElementsByName(key)[0]
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
    }

    const isFresher =
      String(formData.total_experience).trim() === "0" ||
      String(formData.total_experience).trim().toLowerCase() === "fresher";
    if (!isFresher && !String(formData.previous_company || "").trim()) {
      toast.error("Previous Company is required");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== "") {
          payload.append(key, value);
        }
      });

      const apiUrl = `${import.meta.env.VITE_API_URL || ""}/api`;
      const res = await fetch(
        `${apiUrl}/employees/${employeeId}`,
        {
          method: "PATCH",
          body: payload,
        },
      );

      const data = await res.json();

      if (res.ok) {
        toast.success("Profile Completed Successfully!");

        const user = JSON.parse(localStorage.getItem("user") || "{}");

        user.profile_completed = true;
        user.is_first_login = false;

        localStorage.setItem("user", JSON.stringify(user));

        setTimeout(() => {
          window.location.href = "/employee-dashboard";
        }, 1200);
      } else {
        toast.error(data.error || data.message || "Failed to update profile");
      }
    } catch (err) {
      console.error("Submit error:", err);
      toast.error("Network error — please try again");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFresher =
    String(formData.total_experience).trim() === "0" ||
    String(formData.total_experience).trim().toLowerCase() === "fresher";

  // ─── Section definitions ───────────────────────────────────
  const sections = [
    // ── 1. Personal ──────────────────────────────────────────
    {
      title: "Personal Information",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
        />
      ),
      fields: (
        <>
          <Field label="Phone Number *">
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="e.g. +91 9876543210"
              className={inputCls}
            />
          </Field>
          <Field label="Profile Photo">
            <input
              type="file"
              name="profile_image"
              accept="image/*"
              onChange={handleProfilePhotoChange}
              className={`${inputCls} py-2 file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 cursor-pointer`}
            />
          </Field>
          <Field label="Date of Birth">
            <DatePicker
              name="dob"
              value={formData.dob}
              onChange={(val) => setFormData((prev) => ({ ...prev, dob: val }))}
              placeholder="Select Date of Birth"
            />
          </Field>
          <Field label="Gender">
            <select
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              className={selectCls}
            >
              <option value="">Select Gender</option>
              <option>Male</option>
              <option>Female</option>
              <option>Other</option>
            </select>
          </Field>
          <Field label="Marital Status">
            <select
              name="marital_status"
              value={formData.marital_status}
              onChange={handleChange}
              className={selectCls}
            >
              <option value="">Select Status</option>
              <option>Married</option>
              <option>Unmarried</option>
            </select>
          </Field>
          <Field label="Blood Group">
            <select
              name="blood_group"
              value={formData.blood_group}
              onChange={handleChange}
              className={selectCls}
            >
              <option value="">Select Blood Group</option>
              {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map((bg) => (
                <option key={bg}>{bg}</option>
              ))}
            </select>
          </Field>
        </>
      ),
    },

    // ── 2. Address ────────────────────────────────────────────
    {
      title: "Address Details",
      icon: (
        <>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </>
      ),
      fields: (
        <>
          <Field label="Address" full>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleChange}
              rows={3}
              placeholder="Enter your full address"
              className={`${inputCls} resize-none`}
            />
          </Field>
          <Field label="City">
            <input
              name="city"
              value={formData.city}
              onChange={handleChange}
              placeholder="Enter city"
              className={inputCls}
            />
          </Field>
          <Field label="State">
            <input
              name="state"
              value={formData.state}
              onChange={handleChange}
              placeholder="Enter state"
              className={inputCls}
            />
          </Field>
          <Field label="Country">
            <input
              name="country"
              value={formData.country}
              onChange={handleChange}
              placeholder="Enter country"
              className={inputCls}
            />
          </Field>
          <Field label="Pincode">
            <input
              name="pincode"
              value={formData.pincode}
              onChange={handleChange}
              placeholder="Enter pincode"
              className={inputCls}
            />
          </Field>
        </>
      ),
    },

    // ── 3. Bank ───────────────────────────────────────────────
    {
      title: "Bank Details",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
        />
      ),
      fields: (
        <>
          <Field label="Bank Name">
            <input
              name="bank_name"
              value={formData.bank_name}
              onChange={handleChange}
              placeholder="e.g. State Bank of India"
              className={inputCls}
            />
          </Field>
          <Field label="Account Number">
            <input
              name="account_number"
              value={formData.account_number}
              onChange={handleChange}
              placeholder="Enter account number"
              className={inputCls}
            />
          </Field>
          <Field label="IFSC Code" full>
            <input
              name="ifsc_code"
              value={formData.ifsc_code}
              onChange={handleChange}
              placeholder="e.g. SBIN0001234"
              className={inputCls}
            />
          </Field>
        </>
      ),
    },

    // ── 4. Identity ───────────────────────────────────────────
    {
      title: "Identity Details",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"
        />
      ),
      fields: (
        <>
          <Field label="PAN Number">
            <input
              name="pan_number"
              value={formData.pan_number}
              onChange={handleChange}
              placeholder="e.g. ABCDE1234F"
              className={inputCls}
            />
          </Field>
          <Field label="Aadhaar Number">
            <input
              name="aadhaar_number"
              value={formData.aadhaar_number}
              onChange={handleChange}
              placeholder="12-digit Aadhaar"
              className={inputCls}
            />
          </Field>
        </>
      ),
    },

    // ── 5. Education ──────────────────────────────────────────
    {
      title: "Education",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
        />
      ),
      fields: (
        <>
          {/* 10th */}
          <div className="col-span-full">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-primary-600">
              10th Standard
            </p>
          </div>
          <Field label="10th Board">
            <select
              name="tenth_board"
              value={formData.tenth_board}
              onChange={handleChange}
              className={selectCls}
            >
              <option value="">Select Board</option>
              <option>State Board</option>
              <option>CBSE</option>
              <option>ICSE</option>
              <option>Matriculation</option>
            </select>
          </Field>
          <Field label="10th School">
            <input
              name="tenth_school"
              value={formData.tenth_school}
              onChange={handleChange}
              placeholder="School name"
              className={inputCls}
            />
          </Field>
          <Field label="10th Percentage">
            <input
              name="tenth_percentage"
              value={formData.tenth_percentage}
              onChange={handleChange}
              placeholder="e.g. 85%"
              className={inputCls}
            />
          </Field>

          {/* 12th */}
          <div className="col-span-full mt-2">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-primary-600">
              12th Standard
            </p>
          </div>
          <Field label="12th Board">
            <select
              name="twelfth_board"
              value={formData.twelfth_board}
              onChange={handleChange}
              className={selectCls}
            >
              <option value="">Select Board</option>
              <option>State Board</option>
              <option>CBSE</option>
              <option>ICSE</option>
              <option>Matriculation</option>
            </select>
          </Field>
          <Field label="12th School">
            <input
              name="twelfth_school"
              value={formData.twelfth_school}
              onChange={handleChange}
              placeholder="School name"
              className={inputCls}
            />
          </Field>
          <Field label="12th Percentage">
            <input
              name="twelfth_percentage"
              value={formData.twelfth_percentage}
              onChange={handleChange}
              placeholder="e.g. 82%"
              className={inputCls}
            />
          </Field>

          {/* UG */}
          <div className="col-span-full mt-2">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-primary-600">
              Under Graduate (UG)
            </p>
          </div>
          <Field label="UG University">
            <select
              name="ug_university"
              value={formData.ug_university}
              onChange={handleChange}
              className={selectCls}
            >
              <option value="">Select University</option>
              <option>Anna University</option>
              <option>University of Madras</option>
              <option>Bharathiar University</option>
              <option>Bharathidasan University</option>
              <option>VTU</option>
              <option>Other</option>
            </select>
          </Field>
          <Field label="UG Degree">
            <input
              name="ug_degree"
              value={formData.ug_degree}
              onChange={handleChange}
              placeholder="e.g. B.Tech IT"
              className={inputCls}
            />
          </Field>
          <Field label="UG College">
            <input
              name="ug_college"
              value={formData.ug_college}
              onChange={handleChange}
              placeholder="College name"
              className={inputCls}
            />
          </Field>
          <Field label="UG Percentage / CGPA">
            <input
              name="ug_percentage"
              value={formData.ug_percentage}
              onChange={handleChange}
              placeholder="e.g. 8.5 CGPA"
              className={inputCls}
            />
          </Field>

          {/* PG */}
          <div className="col-span-full mt-2">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-neutral-400">
              Post Graduate (PG) — Optional
            </p>
          </div>
          <Field label="PG Degree">
            <input
              name="pg_degree"
              value={formData.pg_degree}
              onChange={handleChange}
              placeholder="e.g. MBA"
              className={inputCls}
            />
          </Field>
          <Field label="PG College">
            <input
              name="pg_college"
              value={formData.pg_college}
              onChange={handleChange}
              placeholder="College name"
              className={inputCls}
            />
          </Field>
          <Field label="PG Percentage / CGPA">
            <input
              name="pg_percentage"
              value={formData.pg_percentage}
              onChange={handleChange}
              placeholder="e.g. 8.8 CGPA"
              className={inputCls}
            />
          </Field>
          <Field label="PG University">
            <select
              name="pg_university"
              value={formData.pg_university}
              onChange={handleChange}
              className={selectCls}
            >
              <option value="">Select University</option>
              <option>Anna University</option>
              <option>University of Madras</option>
              <option>Bharathiar University</option>
              <option>Bharathidasan University</option>
              <option>VTU</option>
              <option>Other</option>
            </select>
          </Field>
        </>
      ),
    },

    // ── 6. Experience & Skills ────────────────────────────────
    {
      title: "Experience & Skills",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
        />
      ),
      fields: (
        <>
          <Field label="Total Experience" full>
            <input
              name="total_experience"
              value={formData.total_experience}
              onChange={handleChange}
              placeholder='e.g. 2 Years or "0" for Fresher'
              className={inputCls}
            />
          </Field>

          <Field label="Previous Company" full>
            <input
              name="previous_company"
              value={formData.previous_company}
              onChange={handleChange}
              placeholder="e.g. Infosys"
              disabled={isFresher}
              className={`${inputCls} disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-400`}
            />
          </Field>

          {isFresher && (
            <div className="col-span-full">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-700">
                🌱 Fresher — No previous company needed
              </span>
            </div>
          )}

          <Field label="Current CTC (₹)">
            <input
              type="number"
              name="current_ctc"
              value={formData.current_ctc}
              onChange={handleChange}
              placeholder="e.g. 500000"
              className={inputCls}
            />
          </Field>
          <Field label="Expected CTC (₹)">
            <input
              type="number"
              name="expected_ctc"
              value={formData.expected_ctc}
              onChange={handleChange}
              placeholder="e.g. 700000"
              className={inputCls}
            />
          </Field>
          <Field label="Notice Period">
            <select
              name="notice_period"
              value={formData.notice_period}
              onChange={handleChange}
              className={selectCls}
            >
              <option value="">Select Notice Period</option>
              <option>Immediate</option>
              <option>15 Days</option>
              <option>30 Days</option>
              <option>60 Days</option>
              <option>90 Days</option>
            </select>
          </Field>

          {/* Skills */}
          <Field label="Skills" full>
            <div className="flex gap-2">
              <input
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSkill();
                  }
                }}
                placeholder="Type a skill and press Add or Enter"
                className={inputCls}
              />
              <button
                type="button"
                onClick={addSkill}
                className="rounded-xl bg-primary-500 px-5 py-3 font-medium text-white hover:bg-primary-600 transition-all"
              >
                Add
              </button>
            </div>
            {skills.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {skills.map((skill, i) => (
                  <span
                    key={i}
                    className="flex items-center gap-1.5 rounded-full bg-primary-100 px-4 py-1.5 text-sm font-medium text-primary-700"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => removeSkill(skill)}
                      className="ml-1 text-red-400 hover:text-red-600 font-bold leading-none"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </Field>
        </>
      ),
    },

    // ── 7. Work Details ───────────────────────────────────────
    {
      title: "Work Details",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
        />
      ),
      fields: (
        <>
          <Field label="Employee Type">
            <select
              name="employee_type"
              value={formData.employee_type}
              onChange={handleChange}
              className={selectCls}
            >
              <option value="">Select Type</option>
              <option>Full-Time</option>
              <option>Part-Time</option>
              <option>Contract</option>
              <option>Intern</option>
            </select>
          </Field>
          <Field label="Work Location">
            <select
              name="work_location"
              value={formData.work_location}
              onChange={handleChange}
              className={selectCls}
            >
              <option value="">Select Location</option>
              <option>Office</option>
              <option>Remote</option>
              <option>Hybrid</option>
            </select>
          </Field>
          <Field label="Shift Timing">
            <select
              name="shift_timing"
              value={formData.shift_timing}
              onChange={handleChange}
              className={selectCls}
            >
              <option value="">Select Shift</option>
              {(shiftOptions.length > 0
                ? shiftOptions
                : ["General Shift", "First Shift", "Second Shift", "Night Shift"]
              ).map((shift) => (
                <option key={shift} value={shift}>
                  {shift}
                </option>
              ))}
            </select>
          </Field>
        </>
      ),
    },

    // ── 8. PF Details ─────────────────────────────────────────
    {
      title: "PF / ESI Details",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12h6m-6 4h6m0-8H7m14 4v-2.563c0-.759-.372-1.464-1.003-1.894l-2.79-1.919a6.002 6.002 0 00-6.414 0l-2.79 1.919A2.25 2.25 0 003.75 8.437V11A9 9 0 0012 20a9 9 0 008.25-9z"
        />
      ),
      fields: (
        <>
          <Field label="PF Number" full>
            <input
              name="pf_number"
              value={formData.pf_number}
              onChange={handleChange}
              placeholder="Enter PF Number"
              className={inputCls}
            />
          </Field>
          <Field label="UAN Number">
            <input
              name="uan_number"
              value={formData.uan_number}
              onChange={handleChange}
              placeholder="Enter UAN Number"
              className={inputCls}
            />
          </Field>
          <Field label="ESI Number">
            <input
              name="esi_number"
              value={formData.esi_number}
              onChange={handleChange}
              placeholder="Enter ESI Number"
              className={inputCls}
            />
          </Field>
          <div className="col-span-full rounded-xl bg-primary-50 border border-primary-100 p-4">
            <p className="text-sm font-medium text-primary-700">
              ℹ️ PF, UAN and ESI are mandatory for eligible employees.
            </p>
          </div>
        </>
      ),
    },

    // ── 9. Documents ──────────────────────────────────────────
    {
      title: "Documents Upload",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
        />
      ),
      fields: (
        <>
          {[
            { name: "resume_file", label: "Resume", accept: ".pdf,.doc,.docx" },
            {
              name: "aadhaar_file",
              label: "Aadhaar Card",
              accept: ".pdf,.jpg,.jpeg,.png",
            },
            {
              name: "pan_file",
              label: "PAN Card",
              accept: ".pdf,.jpg,.jpeg,.png",
            },
            {
              name: "degree_certificate",
              label: "Degree Certificate",
              accept: ".pdf,.jpg,.jpeg,.png",
            },
          ].map(({ name, label, accept }) => (
            <Field key={name} label={label}>
              <input
                type="file"
                name={name}
                accept={accept}
                onChange={handleFileChange}
                className={inputCls}
              />
            </Field>
          ))}
        </>
      ),
    },

    // ── 10. Emergency Contact ─────────────────────────────────
    {
      title: "Emergency Contact",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
        />
      ),
      fields: (
        <>
          <Field label="Contact Name">
            <input
              name="emergency_contact_name"
              value={formData.emergency_contact_name}
              onChange={handleChange}
              placeholder="Full name"
              className={inputCls}
            />
          </Field>
          <Field label="Contact Number">
            <input
              name="emergency_contact_number"
              value={formData.emergency_contact_number}
              onChange={handleChange}
              placeholder="Phone number"
              className={inputCls}
            />
          </Field>
          <Field label="Relation" full>
            <select
              name="emergency_contact_relation"
              value={formData.emergency_contact_relation}
              onChange={handleChange}
              className={selectCls}
            >
              <option value="">Select Relation</option>
              <option>Parent</option>
              <option>Spouse</option>
              <option>Sibling</option>
              <option>Friend</option>
              <option>Other</option>
            </select>
          </Field>
        </>
      ),
    },
  ];

  // ─── Render ────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-primary-50/30 to-neutral-100 p-4 py-8">
      <div className="mx-auto max-w-7xl">
        {/* Page Header */}
        <div className="relative mb-8 text-center bg-white/60 backdrop-blur-xl p-6 md:p-8 rounded-3xl border border-white/80 shadow-sm">
          {/* Close Button */}
          <button
            type="button"
            onClick={() => navigate("/employee-dashboard")}
            className="absolute top-4 right-4 md:top-6 md:right-6 p-2 px-3 rounded-xl bg-white hover:bg-neutral-50 text-neutral-600 hover:text-neutral-900 shadow-sm border border-neutral-200 transition-all duration-200 flex items-center gap-1.5 text-xs font-semibold"
            title="Close & Return to Dashboard"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span>Close</span>
          </button>

          {/* Profile Photo Avatar Badge */}
          <div className="mb-4 inline-flex items-center gap-4 bg-white p-3 px-6 rounded-2xl shadow-md border border-neutral-100">
            <div className="relative group cursor-pointer">
              <img
                src={profilePreview || "/default-avatar.png"}
                alt="Profile Avatar"
                className="w-16 h-16 rounded-full object-cover border-2 border-primary-500 shadow-sm bg-neutral-100"
              />
              <label
                htmlFor="header_photo_input"
                className="absolute -bottom-1 -right-1 bg-primary-600 hover:bg-primary-700 text-white p-1.5 rounded-full shadow-md cursor-pointer transition-all hover:scale-105"
                title="Change Profile Photo"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <input
                  id="header_photo_input"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleProfilePhotoChange}
                />
              </label>
            </div>
            <div className="text-left">
              <h2 className="text-base font-bold text-neutral-800">
                {employeeInfo?.first_name ? `${employeeInfo.first_name} ${employeeInfo.last_name || ""}` : "Employee Profile"}
              </h2>
              <p className="text-xs text-neutral-500 font-medium">
                {employeeInfo?.email || "Update your details below"}
              </p>
            </div>
          </div>

          <h1 className="text-3xl md:text-4xl font-extrabold text-neutral-800 tracking-tight">
            Complete Your Profile
          </h1>
          <p className="mx-auto mt-2 max-w-2xl text-sm md:text-base text-neutral-600 font-medium">
            Fill in all the details below to unlock your dashboard.
          </p>
        </div>

        <div className="rounded-3xl bg-white shadow-2xl shadow-neutral-200/50">

          {/* Form */}
          <form onSubmit={handleSubmit} method="post" action="#">
            <div className="p-6 md:p-8">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {sections.map((section, idx) => (
                  <div
                    key={idx}
                    className={`rounded-2xl border border-neutral-200 bg-neutral-50/50 p-6 transition-all hover:border-primary-300 hover:shadow-md
                      ${["Education", "Experience & Skills"].includes(section.title) ? "lg:col-span-2" : ""}`}
                  >
                    <div className="mb-5 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500 text-white">
                        <svg
                          className="h-5 w-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          {section.icon}
                        </svg>
                      </div>
                      <h3 className="text-lg font-bold text-neutral-800">
                        {section.title}
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {section.fields}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-neutral-200 bg-neutral-50 px-6 py-5 rounded-b-3xl">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-sm text-neutral-500 flex items-center gap-2">
                  <svg
                    className="h-4 w-4 text-primary-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  All marked fields are required for profile completion
                </p>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary-500 px-8 py-3.5 font-semibold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-300 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0"
                >
                  {isSubmitting ? (
                    <>
                      <svg
                        className="h-5 w-5 animate-spin"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v8z"
                        />
                      </svg>
                      Saving...
                    </>
                  ) : (
                    <>
                      Complete Profile
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 7l5 5m0 0l-5 5m5-5H6"
                        />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Progress bar */}
        <div className="mt-6 text-center">
          <p className="text-sm text-neutral-500">
            Step 2 of 3 — Complete Profile Information
          </p>
          <div className="mx-auto mt-2 max-w-md overflow-hidden rounded-full bg-neutral-200">
            <div className="h-2 w-2/3 rounded-full bg-primary-500 transition-all" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Completeprofilepage;
