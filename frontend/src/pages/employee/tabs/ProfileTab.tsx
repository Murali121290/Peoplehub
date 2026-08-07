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
  XMarkIcon,
  MapPinIcon,
  IdentificationIcon,
  AcademicCapIcon,
  DocumentArrowUpIcon
} from "@heroicons/react/24/outline";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { DatePicker } from "../../../components/ui/DatePicker";
import Cropper from "react-easy-crop";
import getCroppedImg from "../../../utils/cropImage";

import { getProfileImageUrl, BASE_API_URL } from "../../../config/api";

const BASE_URL = `${BASE_API_URL}/api`;

const COUNTRY_CODES = [
  { value: "+91", label: "🇮🇳 IN" },
  { value: "+1", label: "🇺🇸 US" },
  { value: "+44", label: "🇬🇧 UK" },
  { value: "+61", label: "🇦🇺 AU" },
  { value: "+65", label: "🇸🇬 SG" },
  { value: "+971", label: "🇦🇪 AE" },
  { value: "+966", label: "🇸🇦 SA" },
  { value: "+49", label: "🇩🇪 DE" },
  { value: "+33", label: "🇫🇷 FR" },
  { value: "+81", label: "🇯🇵 JP" },
  { value: "+86", label: "🇨🇳 CN" },
  { value: "+60", label: "🇲🇾 MY" },
  { value: "+62", label: "🇮🇩 ID" },
  { value: "+63", label: "🇵🇭 PH" },
  { value: "+94", label: "🇱🇰 LK" },
  { value: "+880", label: "🇧🇩 BD" },
  { value: "+92", label: "🇵🇰 PK" },
  { value: "+977", label: "🇳🇵 NP" }
];

interface ProfileTabProps {
  employeeId?: string | number;
}

export const ProfileTab: React.FC<ProfileTabProps> = ({ employeeId }) => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const { updateUser, logout } = useAuthStore();
  const [profile, setProfile] = useState<any>({});
  const [isEditing, setIsEditing] = useState(false);
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState("personal");

  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  const [formData, setFormData] = useState({
    phone: "",
    email: "",
    dob: "",
    gender: "",
    marital_status: "",
    blood_group: "",
    address: "",
    city: "",
    state: "",
    country: "",
    pincode: "",
    bank_name: "",
    account_number: "",
    ifsc_code: "",
    pan_number: "",
    aadhaar_number: "",
    tenth_board: "",
    tenth_school: "",
    tenth_percentage: "",
    twelfth_board: "",
    twelfth_school: "",
    twelfth_percentage: "",
    ug_university: "",
    ug_degree: "",
    ug_college: "",
    ug_percentage: "",
    pg_degree: "",
    pg_college: "",
    pg_percentage: "",
    pg_university: "",
    total_experience: "",
    previous_company: "",
    current_ctc: "",
    expected_ctc: "",
    notice_period: "",
    skills: "",
    employee_type: "",
    work_location: "",
    shift_timing: "",
    pf_number: "",
    uan_number: "",
    esi_number: "",
    emergency_contact_name: "",
    emergency_contact_number: "",
    emergency_contact_relation: "",
    department: "",
    reporting_manager: "",
    team_id: "",
    additional_education: "",
  });

  const [selectedFiles, setSelectedFiles] = useState<{
    profile_image: File | null;
    resume_file: File | null;
    aadhaar_file: File | null;
    pan_file: File | null;
    degree_certificate: File | null;
  }>({
    profile_image: null,
    resume_file: null,
    aadhaar_file: null,
    pan_file: null,
    degree_certificate: null,
  });

  const [profilePreview, setProfilePreview] = useState<string>("");
  const [skillInput, setSkillInput] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [shiftOptions, setShiftOptions] = useState<string[]>([]);
  interface CollegeCourse {
    type: string;
    university: string;
    degree: string;
    college: string;
    percentage: string;
  }

  const [courses, setCourses] = useState<CollegeCourse[]>([]);
  const [showAddCourseForm, setShowAddCourseForm] = useState(false);
  const [newCourseType, setNewCourseType] = useState<string>("");
  const [newCourseData, setNewCourseData] = useState({
    university: "",
    degree: "",
    college: "",
    percentage: "",
  });

  const syncCoursesToFormData = (updatedList: CollegeCourse[]) => {
    const firstUG = updatedList.find(c => c.type === "UG");
    const firstPG = updatedList.find(c => c.type === "PG");

    setFormData((prev) => ({
      ...prev,
      additional_education: JSON.stringify(updatedList),
      ug_university: firstUG?.university || "",
      ug_degree: firstUG?.degree || "",
      ug_college: firstUG?.college || "",
      ug_percentage: firstUG?.percentage || "",
      pg_university: firstPG?.university || "",
      pg_degree: firstPG?.degree || "",
      pg_college: firstPG?.college || "",
      pg_percentage: firstPG?.percentage || "",
    }));
  };

  const handleAddCourseConfirm = () => {
    if (!newCourseType) {
      toast.error("Please select education level");
      return;
    }
    if (!newCourseData.university || !newCourseData.degree || !newCourseData.college || !newCourseData.percentage) {
      toast.error("Please fill in all course details");
      return;
    }

    const newCourse: CollegeCourse = {
      type: newCourseType,
      university: newCourseData.university,
      degree: newCourseData.degree,
      college: newCourseData.college,
      percentage: newCourseData.percentage,
    };

    const updatedCourses = [...courses, newCourse];
    setCourses(updatedCourses);
    syncCoursesToFormData(updatedCourses);

    setNewCourseData({ university: "", degree: "", college: "", percentage: "" });
    setNewCourseType("");
    
    const hasUG = updatedCourses.some(c => c.type === "UG");
    const hasPG = updatedCourses.some(c => c.type === "PG");
    if (!hasUG) {
      setNewCourseType("UG");
      setShowAddCourseForm(true);
    } else if (!hasPG) {
      setNewCourseType("PG");
      setShowAddCourseForm(true);
    } else {
      setShowAddCourseForm(false);
    }

    toast.success(`${newCourseType} education details added`);
  };

  const handleRemoveCourse = (index: number) => {
    const removedCourse = courses[index];
    const updatedCourses = courses.filter((_, idx) => idx !== index);
    setCourses(updatedCourses);
    syncCoursesToFormData(updatedCourses);
    
    if (removedCourse.type === "UG" || removedCourse.type === "PG") {
      setNewCourseType(removedCourse.type);
    } else {
      setNewCourseType("Other");
    }
    setShowAddCourseForm(true);
    toast.success("Education details removed");
  };

  const [phoneCountryCode, setPhoneCountryCode] = useState("+91");
  const [phoneDigits, setPhoneDigits] = useState("");
  const [emergencyCountryCode, setEmergencyCountryCode] = useState("+91");
  const [emergencyDigits, setEmergencyDigits] = useState("");

  const parsePhone = (phoneStr: string | null | undefined): [string, string] => {
    if (!phoneStr) return ["+91", ""];
    const commonPrefixes = [
      "+91", "+1", "+44", "+61", "+65", "+971", "+966", "+49", "+33", "+81", "+86", "+60", "+62", "+63", "+94", "+880", "+92", "+977"
    ];
    const sorted = [...commonPrefixes].sort((a, b) => b.length - a.length);
    for (const prefix of sorted) {
      if (phoneStr.startsWith(prefix)) {
        return [prefix, phoneStr.slice(prefix.length).trim()];
      }
    }
    if (phoneStr.startsWith("+")) {
      const match = phoneStr.match(/^(\+\d{1,4})(.*)$/);
      if (match) {
        return [match[1], match[2].trim()];
      }
    }
    return ["+91", phoneStr.trim()];
  };

  const handlePhoneCodeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value;
    setPhoneCountryCode(code);
    setFormData((prev) => ({ ...prev, phone: `${code}${phoneDigits}` }));
  };

  const handlePhoneDigitsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
    setPhoneDigits(digits);
    setFormData((prev) => ({ ...prev, phone: `${phoneCountryCode}${digits}` }));
  };

  const handleEmergencyCodeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value;
    setEmergencyCountryCode(code);
    setFormData((prev) => ({ ...prev, emergency_contact_number: `${code}${emergencyDigits}` }));
  };

  const handleEmergencyDigitsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
    setEmergencyDigits(digits);
    setFormData((prev) => ({ ...prev, emergency_contact_number: `${emergencyCountryCode}${digits}` }));
  };

  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });

  const isHrOrAdmin = user.access_level?.toLowerCase() === "hr" || user.access_level?.toLowerCase() === "admin";
  const [teams, setTeams] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);

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
    fetchShiftOptions();
    if (isHrOrAdmin) {
      fetchTeams();
      fetchEmployees();
    }
  }, []);

  const fetchShiftOptions = () => {
    fetch(`${BASE_URL}/shifts/options`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setShiftOptions(data);
        }
      })
      .catch((err) => console.error("Fetch shift options error:", err));
  };

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
      const activeEmpId = employeeId || localStorage.getItem("employee_id");
      if (!activeEmpId) return;
      const res = await axios.get(`${BASE_URL}/employees/${activeEmpId}`);
      const data = res.data;
      setProfile(data);

      if (data) {
        setFormData({
          phone: data.phone || "",
          email: data.email || "",
          dob: data.dob || "",
          gender: data.gender || "",
          marital_status: data.marital_status || "",
          blood_group: data.blood_group || "",
          address: data.address || "",
          city: data.city || "",
          state: data.state || "",
          country: data.country || "",
          pincode: data.pincode || "",
          bank_name: data.bank_name || "",
          account_number: data.account_number || "",
          ifsc_code: data.ifsc_code || "",
          pan_number: data.pan_number || "",
          aadhaar_number: data.aadhaar_number || "",
          tenth_board: data.tenth_board || "",
          tenth_school: data.tenth_school || "",
          tenth_percentage: data.tenth_percentage || "",
          twelfth_board: data.twelfth_board || "",
          twelfth_school: data.twelfth_school || "",
          twelfth_percentage: data.twelfth_percentage || "",
          ug_university: data.ug_university || "",
          ug_degree: data.ug_degree || "",
          ug_college: data.ug_college || "",
          ug_percentage: data.ug_percentage || "",
          pg_degree: data.pg_degree || "",
          pg_college: data.pg_college || "",
          pg_percentage: data.pg_percentage || "",
          pg_university: data.pg_university || "",
          total_experience: data.total_experience || "",
          previous_company: data.previous_company || "",
          current_ctc: data.current_ctc || "",
          expected_ctc: data.expected_ctc || "",
          notice_period: data.notice_period || "",
          skills: data.skills || "",
          employee_type: data.employee_type || "",
          work_location: data.work_location || "",
          shift_timing: data.shift_timing || "",
          pf_number: data.pf_number || "",
          uan_number: data.uan_number || "",
          esi_number: data.esi_number || "",
          emergency_contact_name: data.emergency_contact_name || "",
          emergency_contact_number: data.emergency_contact_number || "",
          emergency_contact_relation: data.emergency_contact_relation || "",
          department: data.department || "",
          reporting_manager: data.reporting_manager || "",
          team_id: data.team_id || "",
          additional_education: data.additional_education || "",
        });

        const [pCode, pDigits] = parsePhone(data.phone);
        setPhoneCountryCode(pCode);
        setPhoneDigits(pDigits);

        const [eCode, eDigits] = parsePhone(data.emergency_contact_number);
        setEmergencyCountryCode(eCode);
        setEmergencyDigits(eDigits);

        if (data.profile_image) {
          setProfilePreview(getProfileImageUrl(data.profile_image, data.id));
        } else {
          setProfilePreview("");
        }

        if (data.skills) {
          setSkills(
            data.skills
              .split(",")
              .map((s: string) => s.trim())
              .filter(Boolean)
          );
        } else {
          setSkills([]);
        }

        let loadedCourses: CollegeCourse[] = [];
        if (data.additional_education) {
          try {
            loadedCourses = JSON.parse(data.additional_education);
          } catch (e) {
            console.error("Error parsing additional_education:", e);
          }
        }
        if (loadedCourses.length === 0) {
          if (data.ug_degree) {
            loadedCourses.push({
              type: "UG",
              university: data.ug_university || "",
              degree: data.ug_degree || "",
              college: data.ug_college || "",
              percentage: data.ug_percentage || "",
            });
          }
          if (data.pg_degree) {
            loadedCourses.push({
              type: "PG",
              university: data.pg_university || "",
              degree: data.pg_degree || "",
              college: data.pg_college || "",
              percentage: data.pg_percentage || "",
            });
          }
        }
        setCourses(loadedCourses);

        const hasUG = loadedCourses.some(c => c.type === "UG");
        const hasPG = loadedCourses.some(c => c.type === "PG");
        if (!hasUG || !hasPG) {
          setShowAddCourseForm(true);
          setNewCourseType(!hasUG ? "UG" : "PG");
        } else {
          setShowAddCourseForm(false);
          setNewCourseType("");
        }
      }
    } catch (err) {
      console.error("Fetch profile error:", err);
    }
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === "total_experience") {
      const isFresher = value.trim() === "0" || value.trim().toLowerCase() === "fresher";
      setFormData((p) => ({
        ...p,
        total_experience: value,
        previous_company: isFresher ? "Fresher" : (p.previous_company === "Fresher" ? "" : p.previous_company),
      }));
      return;
    }
    if (name === "aadhaar_number") {
      const clean = value.replace(/\D/g, "").slice(0, 12);
      const parts = [];
      for (let i = 0; i < clean.length; i += 4) {
        parts.push(clean.slice(i, i + 4));
      }
      const formatted = parts.join("-");
      setFormData((p) => ({ ...p, aadhaar_number: formatted }));
      return;
    }
    if (name === "pan_number") {
      const clean = value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
      setFormData((p) => ({ ...p, pan_number: clean }));
      return;
    }
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const handleDownloadFile = async (name: string, label: string) => {
    if (!profile?.id) {
      toast.error("Employee profile not loaded");
      return;
    }
    
    const loadingToastId = toast.loading(`Downloading ${label}...`);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${BASE_URL}/employees/${profile.id}/document/${name}`, {
        responseType: "blob",
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const contentType = (res.headers["content-type"] as string) || "application/octet-stream";
      const blob = new Blob([res.data], { type: contentType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      
      let filename = `${label.replace(/[\s/]/g, "_")}.pdf`;
      const disposition = res.headers["content-disposition"] as string | undefined;
      if (disposition && disposition.indexOf("filename=") !== -1) {
        filename = disposition.split("filename=")[1].replace(/"/g, "");
      }
      
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`${label} downloaded successfully`, { id: loadingToastId });
    } catch (err) {
      console.error(err);
      toast.error(`Failed to download ${label}. Please try again.`, { id: loadingToastId });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, files } = e.target;
    if (files && files[0]) {
      setSelectedFiles((prev) => ({ ...prev, [name]: files[0] }));
    }
  };

  const handleProfilePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageToCrop(reader.result as string);
        setCropModalOpen(true);
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    }
  };

  const onCropComplete = (croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const uploadCroppedImage = async () => {
    if (!imageToCrop || !croppedAreaPixels) return;

    setIsUploadingPhoto(true);
    const loadingToastId = toast.loading("Processing and updating profile photo...");
    
    try {
      const croppedFile = await getCroppedImg(imageToCrop, croppedAreaPixels);
      if (!croppedFile) throw new Error("Could not crop image");

      const previewUrl = URL.createObjectURL(croppedFile);
      setProfilePreview(previewUrl);

      const token = localStorage.getItem("token");
      const activeEmpId = employeeId || localStorage.getItem("employee_id");
      const payload = new FormData();
      payload.append("profile_image", croppedFile);

      await axios.patch(`${BASE_URL}/employees/${activeEmpId}`, payload, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      toast.success("Profile photo updated successfully!", { id: loadingToastId });
      
      const isSelf = String(activeEmpId) === String(localStorage.getItem("employee_id"));
      if (isSelf) {
        const updatedUserFields: any = {};
        updatedUserFields.image_version = Date.now();
        updateUser(updatedUserFields);
      }
      
      setCropModalOpen(false);
      setImageToCrop(null);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.error || err?.response?.data?.message || "Failed to update profile photo", { id: loadingToastId });
      fetchProfile();
    } finally {
      setIsUploadingPhoto(false);
    }
  };

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

  const handleCancelEdit = () => {
    setIsEditing(false);
    setSelectedFiles({
      profile_image: null,
      resume_file: null,
      aadhaar_file: null,
      pan_file: null,
      degree_certificate: null,
    });
    fetchProfile();
  };

  const subTabsOrder = ["personal", "address_bank", "work_pf", "education_career", "documents"];

  const validateTab = (tabId: string): boolean => {
    if (tabId === "personal") {
      const fields = [
        { key: "dob", label: "Date of Birth" },
        { key: "gender", label: "Gender" },
        { key: "blood_group", label: "Blood Group" },
      ];
      for (const f of fields) {
        const val = (formData as any)[f.key];
        if (!val || String(val).trim() === "") {
          toast.error(`${f.label} is required`);
          return false;
        }
      }
      if (!phoneDigits || phoneDigits.trim() === "") {
        toast.error("Phone Number is required");
        return false;
      }
      if (phoneDigits.length !== 10) {
        toast.error("Phone Number must be exactly 10 digits");
        return false;
      }
      if (emergencyDigits && emergencyDigits.length > 0 && emergencyDigits.length !== 10) {
        toast.error("Emergency Contact Number must be exactly 10 digits");
        return false;
      }
    } else if (tabId === "address_bank") {
      const cleanAadhaar = formData.aadhaar_number ? formData.aadhaar_number.replace(/\D/g, "") : "";
      if (cleanAadhaar && cleanAadhaar.length !== 12) {
        toast.error("Aadhaar Number must be exactly 12 digits");
        return false;
      }
      const cleanPan = formData.pan_number ? formData.pan_number.toUpperCase().replace(/[^A-Z0-9]/g, "") : "";
      if (cleanPan && cleanPan.length !== 10) {
        toast.error("PAN Number must be exactly 10 alphanumeric characters");
        return false;
      }
    }
    return true;
  };

  const handleSaveAll = async () => {
    const requiredFields = [
      { key: "dob", label: "Date of Birth" },
      { key: "gender", label: "Gender" },
      { key: "blood_group", label: "Blood Group" },
    ];

    for (const { key, label } of requiredFields) {
      const val = (formData as any)[key];
      if (val === undefined || val === null || String(val).trim() === "") {
        toast.error(`${label} is required`);
        return;
      }
    }

    if (!phoneDigits || phoneDigits.trim() === "") {
      toast.error("Phone Number is required");
      return;
    }
    if (phoneDigits.length !== 10) {
      toast.error("Phone Number must be exactly 10 digits");
      return;
    }
    if (emergencyDigits && emergencyDigits.length > 0 && emergencyDigits.length !== 10) {
      toast.error("Emergency Contact Number must be exactly 10 digits");
      return;
    }

    const cleanAadhaar = formData.aadhaar_number ? formData.aadhaar_number.replace(/\D/g, "") : "";
    if (cleanAadhaar && cleanAadhaar.length !== 12) {
      toast.error("Aadhaar Number must be exactly 12 digits");
      return;
    }
    const cleanPan = formData.pan_number ? formData.pan_number.toUpperCase().replace(/[^A-Z0-9]/g, "") : "";
    if (cleanPan && cleanPan.length !== 10) {
      toast.error("PAN Number must be exactly 10 alphanumeric characters");
      return;
    }

    setIsSavingAll(true);
    try {
      const token = localStorage.getItem("token");
      const activeEmpId = employeeId || localStorage.getItem("employee_id");
      const payload = new FormData();

      Object.entries(formData).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== "") {
          payload.append(key, value);
        }
      });

      if (isHrOrAdmin) {
        const matchedTeam = teams.find(t => t.name === formData.department);
        if (matchedTeam) {
          payload.set("team_id", matchedTeam.id);
        }
      }

      if (selectedFiles.profile_image) payload.append("profile_image", selectedFiles.profile_image);
      if (selectedFiles.resume_file) payload.append("resume_file", selectedFiles.resume_file);
      if (selectedFiles.aadhaar_file) payload.append("aadhaar_file", selectedFiles.aadhaar_file);
      if (selectedFiles.pan_file) payload.append("pan_file", selectedFiles.pan_file);
      if (selectedFiles.degree_certificate) payload.append("degree_certificate", selectedFiles.degree_certificate);

      await axios.patch(`${BASE_URL}/employees/${activeEmpId}`, payload, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      toast.success("Profile updated successfully!");
      setIsEditing(false);
      setSelectedFiles({
        profile_image: null,
        resume_file: null,
        aadhaar_file: null,
        pan_file: null,
        degree_certificate: null,
      });
      
      const updatedUserFields: any = {};
      updatedUserFields.image_version = Date.now();
      updateUser(updatedUserFields);

      fetchProfile();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.error || err?.response?.data?.message || "Failed to update profile");
    } finally {
      setIsSavingAll(false);
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      
      setPasswordData({
        current_password: "",
        new_password: "",
        confirm_password: "",
      });
      
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
      const windowDate = new Date();
      const diffTime = Math.abs(windowDate.getTime() - joinDate.getTime());
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

  const userInitials = `${profile.first_name?.charAt(0) || ""}${profile.last_name?.charAt(0) || ""}`.toUpperCase() || "PH";
  const isFresher = String(formData.total_experience).trim() === "0" || String(formData.total_experience).trim().toLowerCase() === "fresher";

  const renderField = (icon: any, label: string, value: string | null | undefined) => {
    const Icon = icon;
    return (
      <div className="p-3.5 rounded-2xl border border-neutral-100 bg-neutral-50/50 hover:bg-neutral-50 transition-colors">
        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
          {Icon && <Icon className="w-3.5 h-3.5 text-neutral-400" />}
          {label}
        </span>
        <p className="text-neutral-800 font-semibold text-sm">{value || "N/A"}</p>
      </div>
    );
  };

  const renderEditField = (label: string, name: string, type: string = "text", placeholder: string = "", options: any[] = [], disabled: boolean = false) => {
    return (
      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider">
          {label}
        </label>
        {type === "select" ? (
          <select
            name={name}
            value={formData[name as keyof typeof formData] || ""}
            onChange={handleFormChange}
            disabled={disabled}
            className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-neutral-800 placeholder-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 transition-all cursor-pointer text-sm shadow-sm disabled:bg-neutral-100 disabled:text-neutral-500 disabled:cursor-not-allowed"
          >
            <option value="">Select {label}</option>
            {options.map((opt: any) => {
              const val = typeof opt === "object" ? opt.value : opt;
              const lbl = typeof opt === "object" ? opt.label : opt;
              return <option key={val} value={val}>{lbl}</option>;
            })}
          </select>
        ) : type === "textarea" ? (
          <textarea
            name={name}
            value={formData[name as keyof typeof formData] || ""}
            onChange={handleFormChange}
            disabled={disabled}
            rows={3}
            placeholder={placeholder}
            className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-neutral-800 placeholder-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 transition-all text-sm resize-none shadow-sm disabled:bg-neutral-100 disabled:text-neutral-500 disabled:cursor-not-allowed"
          />
        ) : (
          <input
            type={type}
            name={name}
            value={formData[name as keyof typeof formData] || ""}
            onChange={handleFormChange}
            disabled={disabled}
            placeholder={placeholder}
            className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-neutral-800 placeholder-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 transition-all text-sm shadow-sm disabled:bg-neutral-100 disabled:text-neutral-500 disabled:cursor-not-allowed"
          />
        )}
      </div>
    );
  };

  const renderPersonalTab = () => {
    if (isEditing) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider">
              Phone Number *
            </label>
            <div className="flex gap-2">
              <select
                value={phoneCountryCode}
                onChange={handlePhoneCodeChange}
                className="rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-neutral-800 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 text-sm shadow-sm cursor-pointer"
              >
                {COUNTRY_CODES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label} ({c.value})
                  </option>
                ))}
              </select>
              <input
                type="tel"
                value={phoneDigits}
                onChange={handlePhoneDigitsChange}
                placeholder="98765 43210"
                className="flex-1 rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-neutral-800 placeholder-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 text-sm shadow-sm"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider">Date of Birth</label>
            <DatePicker
              name="dob"
              value={formData.dob}
              onChange={(val) => setFormData((prev) => ({ ...prev, dob: val }))}
              placeholder="Select Date of Birth"
            />
          </div>
          {renderEditField("Gender", "gender", "select", "", ["Male", "Female", "Other"])}
          {renderEditField("Personal Email", "email", "email", "example@personal.com")}
          {renderEditField("Marital Status", "marital_status", "select", "", ["Married", "Unmarried"])}
          {renderEditField("Blood Group", "blood_group", "select", "", ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"])}
          
          <div className="col-span-full border-t border-neutral-100 my-4 pt-4">
            <h4 className="text-sm font-bold text-neutral-700 mb-3">Emergency Contact Details</h4>
          </div>
          {renderEditField("Contact Name", "emergency_contact_name", "text", "Full name")}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider">
              Contact Number *
            </label>
            <div className="flex gap-2">
              <select
                value={emergencyCountryCode}
                onChange={handleEmergencyCodeChange}
                className="rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-neutral-800 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 text-sm shadow-sm cursor-pointer"
              >
                {COUNTRY_CODES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label} ({c.value})
                  </option>
                ))}
              </select>
              <input
                type="tel"
                value={emergencyDigits}
                onChange={handleEmergencyDigitsChange}
                placeholder="98765 43210"
                className="flex-1 rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-neutral-800 placeholder-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 text-sm shadow-sm"
              />
            </div>
          </div>
          {renderEditField("Relation", "emergency_contact_relation", "select", "", ["Parent", "Spouse", "Sibling", "Friend", "Other"])}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {renderField(PhoneIcon, "Phone Number", profile.phone)}
        {renderField(EnvelopeIcon, "Personal Email", profile.email)}
        {renderField(CalendarDaysIcon, "Date of Birth", profile.dob)}
        {renderField(UserIcon, "Gender", profile.gender)}
        {renderField(UserIcon, "Marital Status", profile.marital_status)}
        {renderField(UserIcon, "Blood Group", profile.blood_group)}
        
        <div className="col-span-full border-t border-neutral-100 my-2 pt-4">
          <h4 className="text-sm font-bold text-neutral-700 mb-2 flex items-center gap-1.5">
            <ShieldCheckIcon className="w-4 h-4 text-primary-500" />
            Emergency Contact Information
          </h4>
        </div>
        {renderField(UserIcon, "Contact Name", profile.emergency_contact_name)}
        {renderField(PhoneIcon, "Contact Number", profile.emergency_contact_number)}
        {renderField(UserIcon, "Relation", profile.emergency_contact_relation)}
      </div>
    );
  };

  const renderAddressBankTab = () => {
    if (isEditing) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="col-span-full">
            {renderEditField("Address", "address", "textarea", "Enter your full address")}
          </div>
          {renderEditField("City", "city", "text", "City")}
          {renderEditField("State", "state", "text", "State")}
          {renderEditField("Country", "country", "text", "Country")}
          {renderEditField("Pincode", "pincode", "text", "Pincode")}
          
          <div className="col-span-full border-t border-neutral-100 my-4 pt-4">
            <h4 className="text-sm font-bold text-neutral-700 mb-3">Bank Details</h4>
          </div>
          {renderEditField("Bank Name", "bank_name", "text", "e.g. State Bank of India")}
          {renderEditField("Account Number", "account_number", "text", "Account number")}
          {renderEditField("IFSC Code", "ifsc_code", "text", "e.g. SBIN0001234")}
          
          <div className="col-span-full border-t border-neutral-100 my-4 pt-4">
            <h4 className="text-sm font-bold text-neutral-700 mb-3">Identity Details</h4>
          </div>
          {renderEditField("PAN Number", "pan_number", "text", "e.g. ABCDE1234F")}
          {renderEditField("Aadhaar Number", "aadhaar_number", "text", "12-digit Aadhaar")}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="col-span-full">
          {renderField(MapPinIcon, "Address", profile.address)}
        </div>
        {renderField(MapPinIcon, "City", profile.city)}
        {renderField(MapPinIcon, "State", profile.state)}
        {renderField(MapPinIcon, "Country", profile.country)}
        {renderField(MapPinIcon, "Pincode", profile.pincode)}
        
        <div className="col-span-full border-t border-neutral-100 my-2 pt-4">
          <h4 className="text-sm font-bold text-neutral-700 mb-2 flex items-center gap-1.5">
            <BuildingOfficeIcon className="w-4 h-4 text-primary-500" />
            Bank & Account Details
          </h4>
        </div>
        {renderField(BuildingOfficeIcon, "Bank Name", profile.bank_name)}
        {renderField(BuildingOfficeIcon, "Account Number", profile.account_number)}
        {renderField(BuildingOfficeIcon, "IFSC Code", profile.ifsc_code)}
        
        <div className="col-span-full border-t border-neutral-100 my-2 pt-4">
          <h4 className="text-sm font-bold text-neutral-700 mb-2 flex items-center gap-1.5">
            <IdentificationIcon className="w-4 h-4 text-primary-500" />
            Identity Verification Details
          </h4>
        </div>
        {renderField(IdentificationIcon, "PAN Number", profile.pan_number)}
        {renderField(IdentificationIcon, "Aadhaar Number", profile.aadhaar_number)}
      </div>
    );
  };

  const renderWorkPfTab = () => {
    if (isEditing) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider">Department</label>
            {isHrOrAdmin ? (
              <select
                name="department"
                value={formData.department}
                onChange={handleFormChange}
                className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-neutral-800 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 text-sm shadow-sm"
              >
                <option value="">Select Department</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.name}>{t.name}</option>
                ))}
              </select>
            ) : (
              <div className="w-full rounded-xl border border-neutral-200 bg-neutral-100 px-4 py-2.5 text-neutral-500 text-sm">
                {formData.department || "N/A"}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider">Reporting Manager</label>
            {isHrOrAdmin ? (
              <select
                name="reporting_manager"
                value={formData.reporting_manager}
                onChange={handleFormChange}
                className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-neutral-800 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 text-sm shadow-sm"
              >
                <option value="">Select Manager</option>
                {employees
                  .filter((emp) => emp.access_level?.toLowerCase() === "manager" || emp.access_level?.toLowerCase() === "hr" || emp.access_level?.toLowerCase() === "admin")
                  .map((emp) => {
                    const fullName = `${emp.first_name} ${emp.last_name}`.trim();
                    return <option key={emp.id} value={fullName}>{fullName}</option>;
                  })}
              </select>
            ) : (
              <div className="w-full rounded-xl border border-neutral-200 bg-neutral-100 px-4 py-2.5 text-neutral-500 text-sm">
                {formData.reporting_manager || "N/A"}
              </div>
            )}
          </div>

          {renderEditField("Employee Type", "employee_type", "select", "", ["Full-Time", "Part-Time", "Contract", "Intern"])}
          {renderEditField("Work Location", "work_location", "select", "", ["Office", "Remote", "Hybrid"])}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider">Shift Timing</label>
            {isHrOrAdmin ? (
              <select
                name="shift_timing"
                value={formData.shift_timing}
                onChange={handleFormChange}
                className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-neutral-800 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 text-sm shadow-sm cursor-pointer"
              >
                <option value="">Select Shift Timing</option>
                {(shiftOptions.length > 0 ? shiftOptions : ["General Shift", "First Shift", "Second Shift", "Night Shift"]).map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            ) : (
              <div className="w-full rounded-xl border border-neutral-200 bg-neutral-100 px-4 py-2.5 text-neutral-500 text-sm">
                {formData.shift_timing || "N/A"}
              </div>
            )}
          </div>
          
          <div className="col-span-full border-t border-neutral-100 my-4 pt-4">
            <h4 className="text-sm font-bold text-neutral-700 mb-3">Provident Fund (PF) & ESI Details</h4>
          </div>
          {renderEditField("PF Number", "pf_number", "text", "Enter PF Number")}
          {renderEditField("UAN Number", "uan_number", "text", "Enter UAN Number")}
          {renderEditField("ESI Number", "esi_number", "text", "Enter ESI Number")}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {renderField(BuildingOfficeIcon, "Department", profile.department)}
        {renderField(UserGroupIcon, "Reporting Manager", profile.reporting_manager)}
        {renderField(BriefcaseIcon, "Employee Type", profile.employee_type)}
        {renderField(MapPinIcon, "Work Location", profile.work_location)}
        {renderField(ClockIcon, "Shift Timing", profile.shift_timing)}
        
        <div className="col-span-full border-t border-neutral-100 my-2 pt-4">
          <h4 className="text-sm font-bold text-neutral-700 mb-2 flex items-center gap-1.5">
            <ShieldCheckIcon className="w-4 h-4 text-primary-500" />
            Social Security (PF / ESI) Details
          </h4>
        </div>
        {renderField(IdentificationIcon, "PF Number", profile.pf_number)}
        {renderField(IdentificationIcon, "UAN Number", profile.uan_number)}
        {renderField(IdentificationIcon, "ESI Number", profile.esi_number)}
      </div>
    );
  };

  const renderEducationCareerTab = () => {
    if (isEditing) {
      return (
        <div className="space-y-6">
          <div>
            <h4 className="text-xs font-extrabold text-primary-600 uppercase tracking-widest mb-3 pb-1 border-b border-primary-100">10th Standard</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {renderEditField("10th Board", "tenth_board", "select", "", ["State Board", "CBSE", "ICSE", "Matriculation"])}
              {renderEditField("10th School", "tenth_school", "text", "School name")}
              {renderEditField("10th Percentage", "tenth_percentage", "text", "e.g. 85%")}
            </div>
          </div>

          <div>
            <h4 className="text-xs font-extrabold text-primary-600 uppercase tracking-widest mb-3 pb-1 border-b border-primary-100">12th Standard</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {renderEditField("12th Board", "twelfth_board", "select", "", ["State Board", "CBSE", "ICSE", "Matriculation"])}
              {renderEditField("12th School", "twelfth_school", "text", "School name")}
              {renderEditField("12th Percentage", "twelfth_percentage", "text", "e.g. 82%")}
            </div>
          </div>

          {/* College Courses Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-primary-100 pb-2">
              <h4 className="text-xs font-extrabold text-primary-600 uppercase tracking-widest">College Courses / Education</h4>
              {!showAddCourseForm && (
                <button
                  type="button"
                  onClick={() => {
                    const hasUG = courses.some(c => c.type === "UG");
                    const hasPG = courses.some(c => c.type === "PG");
                    if (!hasUG) setNewCourseType("UG");
                    else if (!hasPG) setNewCourseType("PG");
                    else setNewCourseType("Other");
                    setShowAddCourseForm(true);
                  }}
                  className="flex items-center gap-1 text-xs font-bold text-primary-600 hover:text-primary-800 bg-primary-50 hover:bg-primary-100 px-3 py-1.5 rounded-xl transition-all"
                >
                  ＋ Add Course
                </button>
              )}
            </div>

            {/* Added Courses List */}
            <div className="space-y-3">
              {courses.map((course, index) => {
                const label = course.type === "UG" ? "Under Graduate (UG)" : course.type === "PG" ? "Post Graduate (PG)" : course.type;
                return (
                  <div key={index} className="p-4 rounded-2xl border border-primary-100 bg-primary-50/20 flex items-center justify-between gap-4">
                    <div>
                      <span className="text-[9px] font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-md uppercase tracking-wider">{label}</span>
                      <h5 className="text-sm font-bold text-neutral-800 mt-1">{course.degree}</h5>
                      <p className="text-xs text-neutral-500 mt-0.5">{course.college} • {course.university} • {course.percentage}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveCourse(index)}
                      className="text-xs font-bold text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2.5 py-1.5 rounded-xl transition-all"
                    >
                      Remove
                    </button>
                  </div>
                );
              })}

              {courses.length === 0 && !showAddCourseForm && (
                <p className="text-xs text-neutral-400 italic">No higher education courses added yet. Click "Add Course" to add one.</p>
              )}
            </div>

            {/* Add Course Form Block */}
            {showAddCourseForm && (
              <div className="p-5 rounded-2xl border border-neutral-200 bg-neutral-50/50 space-y-4 animate-in fade-in duration-200">
                <h5 className="text-xs font-bold text-neutral-600 uppercase tracking-wider">Add Course Details</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider">Education Level</label>
                    <select
                      value={newCourseType}
                      onChange={(e) => setNewCourseType(e.target.value)}
                      className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-neutral-800 text-sm shadow-sm cursor-pointer"
                    >
                      <option value="">Select Level</option>
                      {!courses.some(c => c.type === "UG") && <option value="UG">Under Graduate (UG)</option>}
                      {!courses.some(c => c.type === "PG") && <option value="PG">Post Graduate (PG)</option>}
                      <option value="Doctorate">Doctorate / Ph.D</option>
                      <option value="Diploma">Diploma</option>
                      <option value="Other">Other Certification</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider">University</label>
                    <input
                      type="text"
                      value={newCourseData.university}
                      onChange={(e) => setNewCourseData(prev => ({ ...prev, university: e.target.value }))}
                      placeholder="e.g. Anna University"
                      className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-neutral-800 text-sm shadow-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider">Degree / Course Name</label>
                    <input
                      type="text"
                      value={newCourseData.degree}
                      onChange={(e) => setNewCourseData(prev => ({ ...prev, degree: e.target.value }))}
                      placeholder="e.g. B.Tech IT, MBA"
                      className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-neutral-800 text-sm shadow-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider">College Name</label>
                    <input
                      type="text"
                      value={newCourseData.college}
                      onChange={(e) => setNewCourseData(prev => ({ ...prev, college: e.target.value }))}
                      placeholder="College / Institution name"
                      className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-neutral-800 text-sm shadow-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider">Percentage / CGPA</label>
                    <input
                      type="text"
                      value={newCourseData.percentage}
                      onChange={(e) => setNewCourseData(prev => ({ ...prev, percentage: e.target.value }))}
                      placeholder="e.g. 85% or 8.5 CGPA"
                      className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-neutral-800 text-sm shadow-sm"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddCourseForm(false);
                      setNewCourseType("");
                      setNewCourseData({ university: "", degree: "", college: "", percentage: "" });
                    }}
                    className="px-4 py-2 border border-neutral-300 rounded-xl hover:bg-neutral-100 text-xs font-semibold text-neutral-700 transition-all shadow-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddCourseConfirm}
                    className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
                  >
                    Add Course
                  </button>
                </div>
              </div>
            )}
          </div>

          <div>
            <h4 className="text-xs font-extrabold text-primary-600 uppercase tracking-widest mb-3 pb-1 border-b border-primary-100">Experience & Skills</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderEditField("Total Experience", "total_experience", "text", "e.g. 2 Years or '0' for Fresher")}
              {renderEditField("Previous Company", "previous_company", "text", "e.g. Infosys", [], isFresher)}
              {renderEditField("Current CTC (₹)", "current_ctc", "number", "Current salary")}
              {renderEditField("Notice Period", "notice_period", "select", "", ["Immediate", "15 Days", "30 Days", "60 Days", "90 Days"])}
              
              <div className="col-span-full space-y-1.5">
                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider">Skills</label>
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
                    placeholder="Type skill & press Enter"
                    className="flex-1 rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm text-neutral-800 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
                  />
                  <button
                    type="button"
                    onClick={addSkill}
                    className="rounded-xl bg-primary-600 hover:bg-primary-700 px-5 py-2 font-semibold text-white text-sm shadow-sm transition-all"
                  >
                    Add
                  </button>
                </div>
                {skills.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {skills.map((skill, i) => (
                      <span
                        key={i}
                        className="flex items-center gap-1.5 rounded-full bg-primary-50 border border-primary-100 px-3 py-1 text-xs font-bold text-primary-700"
                      >
                        {skill}
                        <button
                          type="button"
                          onClick={() => removeSkill(skill)}
                          className="ml-1 text-rose-500 hover:text-rose-700 font-bold"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div>
          <h4 className="text-sm font-bold text-neutral-700 mb-3 flex items-center gap-1.5">
            <AcademicCapIcon className="w-4 h-4 text-primary-500" />
            Schooling Education
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {renderField(null, "10th Board", profile.tenth_board)}
            {renderField(null, "10th School", profile.tenth_school)}
            {renderField(null, "10th Score", profile.tenth_percentage)}
            {renderField(null, "12th Board", profile.twelfth_board)}
            {renderField(null, "12th School", profile.twelfth_school)}
            {renderField(null, "12th Score", profile.twelfth_percentage)}
          </div>
        </div>

        {/* College Courses List */}
        <div>
          <h4 className="text-sm font-bold text-neutral-700 mb-3 flex items-center gap-1.5">
            <AcademicCapIcon className="w-4 h-4 text-primary-500" />
            College Courses / Higher Education
          </h4>
          <div className="space-y-3">
            {courses.map((course, index) => {
              const label = course.type === "UG" ? "Under Graduate (UG)" : course.type === "PG" ? "Post Graduate (PG)" : course.type;
              return (
                <div key={index} className="p-4 rounded-2xl border border-neutral-200 bg-neutral-50/50 flex items-center justify-between gap-4">
                  <div>
                    <span className="text-[9px] font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-md uppercase tracking-wider">{label}</span>
                    <h5 className="text-sm font-bold text-neutral-800 mt-1">{course.degree}</h5>
                    <p className="text-xs text-neutral-500 mt-0.5">{course.college} • {course.university} • {course.percentage}</p>
                  </div>
                </div>
              );
            })}

            {courses.length === 0 && (
              <p className="text-xs text-neutral-400 italic">No college courses / higher education records added.</p>
            )}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-bold text-neutral-700 mb-3 flex items-center gap-1.5">
            <BriefcaseIcon className="w-4 h-4 text-primary-500" />
            Career Experience & Skills
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {renderField(null, "Total Experience", profile.total_experience)}
            {renderField(null, "Previous Company", profile.previous_company)}
            {renderField(null, "Notice Period", profile.notice_period)}
            {renderField(null, "Current CTC", profile.current_ctc ? `₹${profile.current_ctc.toLocaleString("en-IN")}` : null)}
          </div>
          <div className="mt-4 p-4 rounded-2xl border border-neutral-100 bg-neutral-50/50">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-2">Technical Skills & Expertise</span>
            <div className="flex flex-wrap gap-2">
              {skills.length > 0 ? (
                skills.map((skill, i) => (
                  <span key={i} className="px-3 py-1 bg-white border border-neutral-200 text-neutral-700 rounded-full text-xs font-semibold shadow-sm">
                    {skill}
                  </span>
                ))
              ) : (
                <span className="text-xs text-neutral-400 italic">No skills listed</span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderFileStatus = (label: string, isUploaded: boolean, name: string, accept: string) => {
    const fileSelected = (selectedFiles as any)[name];
    return (
      <div className="p-4 rounded-2xl border border-neutral-200 bg-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-primary-300 transition-all duration-200">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${isUploaded ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
            <IdentificationIcon className="w-6 h-6" />
          </div>
          <div>
            <h5 className="text-sm font-bold text-neutral-800">{label}</h5>
            <p className="text-xs text-neutral-400 mt-0.5">
              {fileSelected ? `New selected file: ${fileSelected.name}` : isUploaded ? "✓ Securely saved on database blob storage" : "✗ Required document has not been uploaded"}
            </p>
          </div>
        </div>
        
        {isEditing ? (
          <div className="flex items-center gap-2">
            {isUploaded && (
              <button
                type="button"
                onClick={() => handleDownloadFile(name, label)}
                className="flex items-center gap-1.5 px-4 py-2 border border-neutral-300 hover:border-primary-500 hover:text-primary-600 rounded-xl bg-neutral-50 hover:bg-white text-xs font-bold text-neutral-600 transition-all shadow-sm"
              >
                <ArrowDownTrayIcon className="w-4 h-4 text-neutral-500" />
                Download Existing
              </button>
            )}
            <label className="flex items-center gap-2 px-4 py-2 border border-neutral-300 hover:border-primary-500 hover:text-primary-600 rounded-xl cursor-pointer bg-neutral-50 hover:bg-white text-xs font-bold text-neutral-600 transition-all shadow-sm">
              <DocumentArrowUpIcon className="w-4 h-4" />
              Upload New
              <input type="file" name={name} accept={accept} onChange={handleFileChange} className="hidden" />
            </label>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {isUploaded && (
              <button
                type="button"
                onClick={() => handleDownloadFile(name, label)}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-primary-200 text-primary-600 hover:bg-primary-50 rounded-xl text-xs font-bold transition-all shadow-sm"
                title={`Download ${label}`}
              >
                <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                Download
              </button>
            )}
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
              isUploaded ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isUploaded ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
              {isUploaded ? 'Uploaded' : 'Missing'}
            </span>
          </div>
        )}
      </div>
    );
  };

  const renderDocumentsTab = () => {
    return (
      <div className="space-y-4">
        {renderFileStatus("Resume / Curriculum Vitae", profile.has_resume, "resume_file", ".pdf,.doc,.docx")}
        {renderFileStatus("Aadhaar Card copy", profile.has_aadhaar, "aadhaar_file", ".pdf,.jpg,.jpeg,.png")}
        {renderFileStatus("PAN Card copy", profile.has_pan, "pan_file", ".pdf,.jpg,.jpeg,.png")}
        {renderFileStatus("UG / Highest Degree Certificate", profile.has_degree, "degree_certificate", ".pdf,.jpg,.jpeg,.png")}
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-1 animate-in fade-in duration-300">
      
      <div className="relative overflow-hidden bg-white rounded-3xl border border-neutral-200 p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 hover:shadow-md transition-shadow duration-300">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-50/20 rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
          <div className="relative w-24 h-24 shrink-0 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-3xl font-extrabold shadow-md border-4 border-white cursor-pointer" onClick={() => setIsImageViewerOpen(true)}>
            {profilePreview ? (
              <img src={profilePreview} alt="Avatar" className="w-full h-full rounded-full object-cover" />
            ) : (
              userInitials
            )}
            {!profile.profile_image && (
              <label htmlFor="tab_photo_input" className={`absolute -bottom-1 -right-1 bg-primary-600 hover:bg-primary-700 text-white p-2 rounded-full shadow-lg cursor-pointer transition-all hover:scale-105 ${isUploadingPhoto ? 'opacity-50 cursor-not-allowed' : ''}`} title="Change profile photo" onClick={(e) => e.stopPropagation()}>
                <PencilIcon className="w-3.5 h-3.5" />
                <input id="tab_photo_input" type="file" accept="image/*" className="hidden" onChange={handleProfilePhotoChange} disabled={isUploadingPhoto} />
              </label>
            )}
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-neutral-800 flex items-center gap-2 justify-center sm:justify-start">
              {profile.first_name ? `${profile.first_name} ${profile.last_name || ""}` : user.full_name}
            </h2>
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mt-1 justify-center sm:justify-start">
              <p className="text-sm font-bold text-primary-600">{profile.designation || user.designation}</p>
              <span className="hidden sm:inline text-neutral-300 text-xs">•</span>
              <p className="text-xs text-neutral-400">{profile.company_email || user.company_email || user.email}</p>
            </div>
            
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-neutral-500 justify-center sm:justify-start border-t border-neutral-100 pt-3">
              <div className="flex items-center gap-1">
                <span className="font-semibold text-neutral-400">Employee ID:</span>
                <span className="font-bold text-neutral-700">{profile.employee_id || "N/A"}</span>
              </div>
              <span className="hidden sm:inline text-neutral-200">|</span>
              <div className="flex items-center gap-1">
                <span className="font-semibold text-neutral-400">Department:</span>
                <span className="font-bold text-neutral-700">{profile.department || "N/A"}</span>
              </div>
              <span className="hidden sm:inline text-neutral-200">|</span>
              <div className="flex items-center gap-1">
                <span className="font-semibold text-neutral-400">Manager:</span>
                <span className="font-bold text-neutral-700">{profile.reporting_manager || "N/A"}</span>
              </div>
              <span className="hidden sm:inline text-neutral-200">|</span>
              <div className="flex items-center gap-1">
                <span className="font-semibold text-neutral-400">Joining Date:</span>
                <span className="font-bold text-neutral-700">
                  {profile.joining_date
                    ? new Date(profile.joining_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                    : "N/A"}
                </span>
              </div>
              {profile.joining_date && (
                <>
                  <span className="hidden sm:inline text-neutral-200">|</span>
                  <div className="flex items-center gap-1">
                    <span className="font-semibold text-neutral-400">Tenure:</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-primary-50 text-primary-700 border border-primary-100/80">
                      {getTenure(profile.joining_date)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {isEditing ? (
            <>
              <button
                type="button"
                className="px-4 py-2 border border-neutral-300 rounded-xl hover:bg-neutral-100 text-sm font-semibold text-neutral-700 transition-all shadow-sm whitespace-nowrap shrink-0"
                onClick={handleCancelEdit}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-primary-500/10 transition-all disabled:opacity-60 whitespace-nowrap shrink-0"
                onClick={handleSaveAll}
                disabled={isSavingAll}
              >
                {isSavingAll ? "Saving..." : "Save Changes"}
              </button>
            </>
          ) : (
            <button
              type="button"
              className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-primary-500/10 transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 animate-pulse hover:animate-none"
              onClick={() => setIsEditing(true)}
            >
              <PencilIcon className="w-4 h-4 shrink-0" />
              Edit Profile
            </button>
          )}
        </div>
      </div>

      <div className="mt-6">
        
        <Card className="shadow-sm rounded-3xl border border-neutral-200 p-6 bg-white hover:shadow-md transition-shadow duration-300">
          
          <div className="mb-8 border-b border-neutral-100 pb-5 overflow-x-auto scrollbar-none">
            <div className="flex items-center flex-nowrap gap-3 md:gap-4 min-w-max">
              {[
                { id: "personal", stepNum: "01", label: "Personal & Contacts" },
                { id: "address_bank", stepNum: "02", label: "Address & Banking" },
                { id: "work_pf", stepNum: "03", label: "Work & PF Details" },
                { id: "education_career", stepNum: "04", label: "Education & Career" },
                { id: "documents", stepNum: "05", label: "Documents" },
              ].map((subTab, idx) => {
                const isActive = activeSubTab === subTab.id;
                const order = ["personal", "address_bank", "work_pf", "education_career", "documents"];
                const activeIdx = order.indexOf(activeSubTab);
                const isCompleted = isEditing && (order.indexOf(subTab.id) < activeIdx);

                return (
                  <React.Fragment key={subTab.id}>
                    {idx > 0 && (
                      <div className={`h-0.5 w-6 sm:w-10 ${isCompleted ? 'bg-emerald-500' : 'bg-neutral-200'}`} />
                    )}
                    <button
                      onClick={() => {
                        if (isEditing && !validateTab(activeSubTab)) return;
                        setActiveSubTab(subTab.id);
                      }}
                      className="flex items-center gap-2 group focus:outline-none shrink-0"
                    >
                      <span
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                          isActive
                            ? "bg-primary-600 text-white shadow-md shadow-primary-500/20 ring-4 ring-primary-50"
                            : isCompleted
                            ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/10"
                            : "bg-neutral-100 text-neutral-400 group-hover:bg-neutral-200 group-hover:text-neutral-600"
                        }`}
                      >
                        {isCompleted ? "✓" : subTab.stepNum}
                      </span>
                      <span
                        className={`text-xs font-bold transition-all ${
                          isActive
                            ? "text-primary-600"
                            : isCompleted
                            ? "text-emerald-600"
                            : "text-neutral-400 group-hover:text-neutral-600"
                        }`}
                      >
                        {subTab.label}
                      </span>
                    </button>
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          <div className="space-y-6">
            {activeSubTab === "personal" && renderPersonalTab()}
            {activeSubTab === "address_bank" && renderAddressBankTab()}
            {activeSubTab === "work_pf" && renderWorkPfTab()}
            {activeSubTab === "education_career" && renderEducationCareerTab()}
            {activeSubTab === "documents" && renderDocumentsTab()}
          </div>
          
          {isEditing && (
            <div className="border-t border-neutral-100 mt-8 pt-6 flex items-center justify-between gap-3">
              <button
                type="button"
                className="px-4 py-2 border border-neutral-300 rounded-xl hover:bg-neutral-100 text-sm font-semibold text-neutral-700 transition-all shadow-sm"
                onClick={handleCancelEdit}
              >
                Cancel
              </button>
              
              <div className="flex items-center gap-3">
                {activeSubTab !== "personal" && (
                  <button
                    type="button"
                    className="px-4 py-2 border border-neutral-300 rounded-xl hover:bg-neutral-100 text-sm font-semibold text-neutral-700 transition-all shadow-sm"
                    onClick={() => {
                      const idx = subTabsOrder.indexOf(activeSubTab);
                      if (idx > 0) setActiveSubTab(subTabsOrder[idx - 1]);
                    }}
                  >
                    Back
                  </button>
                )}
                
                {activeSubTab !== "documents" ? (
                  <button
                    type="button"
                    className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-primary-500/10 transition-all"
                    onClick={() => {
                      if (validateTab(activeSubTab)) {
                        const idx = subTabsOrder.indexOf(activeSubTab);
                        if (idx < subTabsOrder.length - 1) setActiveSubTab(subTabsOrder[idx + 1]);
                      }
                    }}
                  >
                    Next
                  </button>
                ) : (
                  <button
                    type="button"
                    className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-primary-500/10 transition-all disabled:opacity-60"
                    onClick={handleSaveAll}
                    disabled={isSavingAll}
                  >
                    {isSavingAll ? "Saving..." : "Save Changes"}
                  </button>
                )}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Image Viewer Modal */}
      {isImageViewerOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative max-w-4xl max-h-screen">
            <button
              onClick={() => setIsImageViewerOpen(false)}
              className="absolute -top-12 right-0 md:-right-12 text-white/80 hover:text-white bg-black/50 hover:bg-black p-2 rounded-full transition-all"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
            {profilePreview ? (
              <img src={profilePreview} alt="Profile" className="max-w-full max-h-[80vh] rounded-xl shadow-2xl object-contain" />
            ) : (
              <div className="w-64 h-64 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-7xl font-extrabold shadow-2xl">
                {userInitials}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Crop Modal */}
      {cropModalOpen && imageToCrop && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
            <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
              <h3 className="font-bold text-neutral-800">Crop Profile Photo</h3>
              <button onClick={() => { setCropModalOpen(false); setImageToCrop(null); }} className="text-neutral-400 hover:text-neutral-600 bg-neutral-100 hover:bg-neutral-200 p-1.5 rounded-full transition-all">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            
            <div className="relative w-full h-80 bg-neutral-900">
              <Cropper
                image={imageToCrop}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            </div>
            
            <div className="p-4 md:p-6 bg-white space-y-4">
              <div className="flex items-center gap-4">
                <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider shrink-0">Zoom</span>
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  aria-labelledby="Zoom"
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                />
              </div>
              
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setCropModalOpen(false); setImageToCrop(null); }}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-neutral-600 hover:bg-neutral-100 transition-all border border-transparent hover:border-neutral-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={uploadCroppedImage}
                  disabled={isUploadingPhoto}
                  className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-primary-500/20 transition-all disabled:opacity-60"
                >
                  {isUploadingPhoto ? "Saving..." : "Apply & Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileTab;
