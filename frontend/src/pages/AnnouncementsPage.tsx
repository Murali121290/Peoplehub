import { useState, useEffect, useRef } from "react";
import { socket } from "../socket";
import { ArrowDownTrayIcon, MegaphoneIcon, PencilSquareIcon, TrashIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { Button } from "../components/ui/Button";
import EmojiPicker from 'emoji-picker-react';
import { getProfileImageUrl, BASE_API_URL } from "../config/api";
import { BookLoader } from "../components/ui/Spinner";
import { ImageViewerModal } from "../components/ui/ImageViewerModal";
import { DatePicker } from "../components/ui/DatePicker";
import toast from 'react-hot-toast';


const AnnouncementsPage = () => {
  const [title, setTitle] = useState("");
  const [targetRole, setTargetRole] = useState("all");
  const [message, setMessage] = useState("");
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [sidebarTopOffset, setSidebarTopOffset] = useState("8.5rem");
  const [activeReactionPostId, setActiveReactionPostId] = useState<number | null>(null);
  const [activeReactionPopover, setActiveReactionPopover] = useState<{ announcementId: number; emoji: string } | null>(null);
  const [activePollVotersPopover, setActivePollVotersPopover] = useState<{ announcementId: number; optionIndex: number } | null>(null);

  // Edit & Delete Announcement States
  const [editingPost, setEditingPost] = useState<any | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editMessage, setEditMessage] = useState("");
  const [editTargetRole, setEditTargetRole] = useState("all");
  const [editImageUrl, setEditImageUrl] = useState("");
  const [editImagePreview, setEditImagePreview] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // New Image Upload States
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  // Delete Confirmation States
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [viewerImage, setViewerImage] = useState<{ url: string; title: string } | null>(null);

  // Hyperlink Modal States
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [isEditLinkMode, setIsEditLinkMode] = useState(false);
  const [linkUrl, setLinkUrl] = useState("https://");
  const [linkText, setLinkText] = useState("");

  // Poll States
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  const [pollExpiresAt, setPollExpiresAt] = useState<string>("");

  // Extend Poll States
  const [showExtendPollModal, setShowExtendPollModal] = useState<number | null>(null);
  const [extendDays, setExtendDays] = useState(7);

  // Close Poll States
  const [showClosePollConfirm, setShowClosePollConfirm] = useState<number | null>(null);

  const handleExtendPoll = async (announcementId: number) => {
    try {
      const res = await fetch(`${BASE_API_URL}/api/communications/${announcementId}/extend-poll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: extendDays })
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Poll extended by ${extendDays} days`);
        setAnnouncements(prev => prev.map(a =>
          a.id === announcementId
            ? { ...a, poll_data: { ...a.poll_data, expires_at: data.new_expires_at } }
            : a
        ));
        setShowExtendPollModal(null);
        setExtendDays(7);
      } else {
        toast.error(data.error || "Failed to extend poll");
      }
    } catch (err) {
      toast.error("Failed to extend poll");
    }
  };

  const handleClosePoll = async (announcementId: number) => {
    try {
      const res = await fetch(`${BASE_API_URL}/api/communications/${announcementId}/close-poll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Poll closed successfully");
        setAnnouncements(prev => prev.map(a =>
          a.id === announcementId
            ? { ...a, poll_data: { ...a.poll_data, expires_at: data.expires_at, closed_early: true } }
            : a
        ));
        setShowClosePollConfirm(null);
      } else {
        toast.error(data.error || "Failed to close poll");
      }
    } catch (err) {
      toast.error("Failed to close poll");
    }
  };

  const handleVotePoll = async (announcementId: number, optionIndex: number) => {
    try {
      const userStr = localStorage.getItem("user");
      const user = userStr ? JSON.parse(userStr) : null;
      const userId = user?.id || user?.user_id;
      const userName = user?.full_name || user?.first_name || user?.name || `User #${userId}`;
      const profileImage = user?.profile_image || "";
      const department = user?.department || user?.team || "";
      const designation = user?.designation || "";
      const employeeCode = user?.employee_id || user?.employee_code || user?.code || "";

      if (!userId) {
        toast.error("User session not found. Please log in again.");
        return;
      }

      const res = await fetch(`${BASE_API_URL}/api/communications/${announcementId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          user_name: userName,
          employee_code: employeeCode,
          profile_image: profileImage,
          department: department,
          team_name: department,
          designation: designation,
          option_index: optionIndex
        })
      });

      const data = await res.json();
      if (data.success) {
        setAnnouncements(prev => prev.map(ann => {
          if (ann.id === announcementId) {
            return {
              ...ann,
              poll_votes: data.poll_votes
            };
          }
          return ann;
        }));
        toast.success("Vote Recorded Successfully!");
      } else {
        toast.error(data.error || "Failed to record vote");
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to record vote");
    }
  };

  const handleDownloadPollReport = async (item: any) => {
    if (!item?.poll_data) return;

    const question = item.poll_data.question || "Interactive Poll";
    const options: string[] = item.poll_data.options || [];
    const votesObj: Record<string, any> = item.poll_votes || {};
    const totalVotesCount = Object.keys(votesObj).length;

    const expiresAt = item.poll_data.expires_at ? new Date(item.poll_data.expires_at).toLocaleString() : "No Expiration Date";
    const isExpired = item.poll_data.expires_at ? Date.now() > new Date(item.poll_data.expires_at).getTime() : false;
    const createdAt = item.created_at ? new Date(item.created_at).toLocaleString() : new Date().toLocaleString();

    let voterRows: any[] = [];
    let optionSummaries: any[] = [];

    // Try dedicated Backend Poll Report API first (Fetches exact Employee Codes directly from DB)
    try {
      const tokenStr = localStorage.getItem("token") || "";
      const token = tokenStr.replace(/^"(.*)"$/, '$1'); // clean up quotes if present
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

      const reportRes = await fetch(`${BASE_API_URL}/api/communications/${item.id}/poll-report`, { headers });
      const reportData = await reportRes.json();
      if (reportData.success && Array.isArray(reportData.voters)) {
        voterRows = reportData.voters.map((v: any) => ({
          sNo: v.s_no,
          employeeCode: v.employee_code || "—",
          voterName: v.voter_name || "Employee",
          teamName: v.department || "General",
          designation: v.designation || "Team Member",
          selectedOption: v.selected_option || "—",
          optionNumber: v.option_number || "—",
          changeCount: v.change_count || 1,
          votedAt: v.voted_at || createdAt
        }));
      }
    } catch (err) {
      console.warn("Direct poll report API failed, falling back to local resolver:", err);
    }

    // Fallback: If direct endpoint was unavailable, resolve from employee list
    if (voterRows.length === 0 && totalVotesCount > 0) {
      const employeeMap = new Map<string, any>();
      try {
        const tokenStr = localStorage.getItem("token") || "";
        const token = tokenStr.replace(/^"(.*)"$/, '$1'); // clean up quotes if present
        const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

        const empRes = await fetch(`${BASE_API_URL}/api/employees`, { headers });
        const empData = await empRes.json();
        const empList = Array.isArray(empData) ? empData : (empData?.employees || empData?.data || []);
        empList.forEach((e: any) => {
          const fName = `${e.first_name || ''} ${e.last_name || ''}`.trim() || e.name || e.employee_name || "";
          const dept = e.department || e.team || e.team_name || "General";
          const desig = e.designation || e.role_name || e.role || "Team Member";
          const code = e.employee_code || e.employee_id || e.code || "";
          const info = { fullName: fName, dept, desig, code };
          if (e.id) employeeMap.set(String(e.id), info);
          if (e.employee_id) employeeMap.set(String(e.employee_id), info);
          if (e.employee_code) employeeMap.set(String(e.employee_code), info);
          if (e.user_id) employeeMap.set(String(e.user_id), info);
        });
      } catch (err) {
        console.error("Error fetching employees for poll report:", err);
      }

      let sNo = 1;
      Object.entries(votesObj).forEach(([uId, vVal]: [string, any]) => {
        const dbEmp = employeeMap.get(String(uId));
        let uName = dbEmp?.fullName || `User #${uId}`;
        let empCode = dbEmp?.code || (vVal?.employee_code && !vVal.employee_code.startsWith("EMP-") ? vVal.employee_code : (uId.length >= 4 && !uId.startsWith("EMP-") ? uId : dbEmp?.code || uId));
        let teamName = dbEmp?.dept || "General";
        let designation = dbEmp?.desig || "Team Member";
        let votedAt = createdAt;
        let chosenOptIndices: number[] = [];
        let changeCount = 1;

        if (typeof vVal === "object" && vVal !== null) {
          if (vVal.user_name && vVal.user_name !== `User #${uId}`) {
            uName = vVal.user_name;
          }
          if (vVal.employee_code && !vVal.employee_code.startsWith("EMP-")) empCode = vVal.employee_code;
          if (vVal.team_name || vVal.department) teamName = vVal.team_name || vVal.department;
          if (vVal.designation) designation = vVal.designation;
          if (vVal.voted_at) votedAt = vVal.voted_at;
          changeCount = vVal.change_count || 1;
          const opts = Array.isArray(vVal.option_index) ? vVal.option_index : [vVal.option_index];
          chosenOptIndices = opts.filter((idx: any) => typeof idx === "number" || (!isNaN(Number(idx)) && idx !== ""));
        } else if (typeof vVal === "number" || (typeof vVal === "string" && !isNaN(Number(vVal)))) {
          chosenOptIndices = [Number(vVal)];
        } else if (Array.isArray(vVal)) {
          chosenOptIndices = vVal;
        }

        const chosenOptNames = chosenOptIndices.map(idx => options[idx] || `Option ${idx + 1}`).join(", ");
        const chosenOptNums = chosenOptIndices.map(idx => `Option ${idx + 1}`).join(", ");

        voterRows.push({
          sNo: sNo++,
          employeeCode: empCode,
          voterName: uName,
          teamName: teamName,
          designation: designation,
          selectedOption: chosenOptNames || "—",
          optionNumber: chosenOptNums || "—",
          changeCount: changeCount,
          votedAt: votedAt
        });
      });
    }

    // Calculate Summary per Option
    optionSummaries = options.map((optText, idx) => {
      let count = 0;
      Object.values(votesObj).forEach((vVal: any) => {
        let isMatch = false;
        if (typeof vVal === "object" && vVal !== null) {
          const opts = Array.isArray(vVal.option_index) ? vVal.option_index : [vVal.option_index];
          if (opts.includes(idx)) isMatch = true;
        } else {
          const opts = Array.isArray(vVal) ? vVal : [vVal];
          if (opts.includes(idx)) isMatch = true;
        }
        if (isMatch) count++;
      });
      const pct = totalVotesCount > 0 ? ((count / totalVotesCount) * 100).toFixed(1) : "0.0";
      return { optionNumber: idx + 1, optionName: optText, count, percentage: `${pct}%` };
    });

    // 4. Format Filter-Friendly CSV
    // Row 1 starts immediately with standard table headers for 1-click Excel Filtering
    const escapeCsv = (str: any) => `"${String(str ?? '').replace(/"/g, '""')}"`;

    let csv = "\uFEFF"; // UTF-8 BOM for Microsoft Excel
    csv += `S.No,Employee Code,Voter Name,Team / Department,Designation,Selected Option,Option Number,Poll Question,Announcement Title,Vote Changes,Voted At\n`;

    if (voterRows.length === 0) {
      csv += `1,—,No votes recorded yet,—,—,—,—,${escapeCsv(question)},${escapeCsv(item.title || "Announcement")},0,${escapeCsv(createdAt)}\n`;
    } else {
      voterRows.forEach(r => {
        csv += `${r.sNo},${escapeCsv(r.employeeCode)},${escapeCsv(r.voterName)},${escapeCsv(r.teamName)},${escapeCsv(r.designation)},${escapeCsv(r.selectedOption)},${escapeCsv(r.optionNumber)},${escapeCsv(question)},${escapeCsv(item.title || "Announcement")},${r.changeCount},${escapeCsv(r.votedAt)}\n`;
      });
    }

    // Additional Summary Block at the bottom
    csv += `\n\n`;
    csv += `--- POLL METADATA & SUMMARY ---\n`;
    csv += `Poll Question,${escapeCsv(question)}\n`;
    csv += `Announcement Title,${escapeCsv(item.title || "Announcement")}\n`;
    csv += `Announcement Author,${escapeCsv(item.created_by || "HR Admin")}\n`;
    csv += `Announcement Created Date,${escapeCsv(createdAt)}\n`;
    csv += `Poll Expiry,${escapeCsv(expiresAt)}\n`;
    csv += `Poll Status,${escapeCsv(isExpired ? "Ended / Frozen" : "Active")}\n`;
    csv += `Total Voters,${totalVotesCount}\n\n`;

    csv += `POLL OPTIONS BREAKDOWN\n`;
    csv += `Option #,Option Name,Total Votes,Percentage\n`;
    optionSummaries.forEach(s => {
      csv += `${s.optionNumber},${escapeCsv(s.optionName)},${s.count},${escapeCsv(s.percentage)}\n`;
    });

    // Trigger Download
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeTitle = (question || "poll").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 35);
    link.setAttribute("href", url);
    link.setAttribute("download", `Poll_Report_${safeTitle}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success("Poll voters and responses report downloaded successfully!");
  };


  const handleInsertLink = () => {
    if (!linkUrl || !linkUrl.trim() || linkUrl.trim() === "https://") {
      toast.error("Please enter a valid URL");
      return;
    }
    const targetRef = isEditLinkMode ? editEditableRef : composerEditableRef;
    if (targetRef.current) {
      targetRef.current.focus();
    }

    const cleanUrl = linkUrl.trim();
    const displayText = linkText.trim() || cleanUrl;
    const linkHtml = `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer" style="color:#2563eb; font-weight:600; text-decoration:underline;">${displayText}</a>`;

    try {
      document.execCommand("insertHTML", false, linkHtml);
    } catch {
      document.execCommand("createLink", false, cleanUrl);
    }

    if (targetRef.current) {
      const html = targetRef.current.innerHTML;
      if (isEditLinkMode) setEditMessage(html);
      else setMessage(html);
    }

    setShowLinkModal(false);
    setLinkUrl("https://");
    setLinkText("");
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, isEditMode = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 3MB size limit check (3 * 1024 * 1024 bytes)
    const MAX_SIZE = 3 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      toast.error("Image size exceeds the 3MB maximum limit. Please select a smaller file.");
      if (!isEditMode && fileInputRef.current) fileInputRef.current.value = "";
      if (isEditMode && editFileInputRef.current) editFileInputRef.current.value = "";
      return;
    }

    const localUrl = URL.createObjectURL(file);
    if (isEditMode) {
      setEditImagePreview(localUrl);
    } else {
      setImagePreviewUrl(localUrl);
    }
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
        if (isEditMode) {
          setEditImageUrl(data.image_url);
        } else {
          setImageUrl(data.image_url);
        }
      } else {
        toast.error(data.error || "Failed to upload image");
        if (isEditMode) {
          setEditImageUrl(""); setEditImagePreview("");
        } else {
          handleRemoveImage();
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to upload image");
      if (isEditMode) {
        setEditImageUrl(""); setEditImagePreview("");
      } else {
        handleRemoveImage();
      }
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

  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const composerEditableRef = useRef<HTMLDivElement>(null);
  const editEditableRef = useRef<HTMLDivElement>(null);

  // Active formatting state tracking
  const [activeFormats, setActiveFormats] = useState({
    b: false,
    i: false,
    u: false,
    s: false,
    h: false,
    bullet: false,
    number: false,
    quote: false,
    highlight: false,
  });

  const updateActiveFormats = () => {
    try {
      const isB = document.queryCommandState("bold");
      const isI = document.queryCommandState("italic");
      const isU = document.queryCommandState("underline");
      const isS = document.queryCommandState("strikethrough");
      const isBullet = document.queryCommandState("insertUnorderedList");
      const isNumber = document.queryCommandState("insertOrderedList");

      const sel = window.getSelection();
      let isH = false;
      let isQuote = false;
      let isHighlight = false;
      if (sel && sel.anchorNode) {
        const parent = sel.anchorNode.nodeType === 1 ? (sel.anchorNode as HTMLElement) : sel.anchorNode.parentElement;
        if (parent) {
          if (parent.closest("h3, h1, h2, h4")) isH = true;
          if (parent.closest("blockquote")) isQuote = true;
          if (parent.closest("mark, span[style*='background']")) isHighlight = true;
        }
      }

      setActiveFormats({
        b: isB,
        i: isI,
        u: isU,
        s: isS,
        h: isH,
        bullet: isBullet,
        number: isNumber,
        quote: isQuote,
        highlight: isHighlight,
      });
    } catch {
      // Ignore query error
    }
  };

  const applyFormatting = (cmd: string, value: string | undefined = undefined, isEdit = false) => {
    const targetRef = isEdit ? editEditableRef : composerEditableRef;
    if (targetRef.current) {
      targetRef.current.focus();
    }

    try {
      if (cmd === "b") {
        document.execCommand("bold", false);
      } else if (cmd === "i") {
        document.execCommand("italic", false);
      } else if (cmd === "u") {
        document.execCommand("underline", false);
      } else if (cmd === "strikethrough") {
        document.execCommand("strikethrough", false);
      } else if (cmd === "h") {
        document.execCommand("formatBlock", false, "<h3>");
      } else if (cmd === "bullet") {
        document.execCommand("insertUnorderedList", false);
      } else if (cmd === "number") {
        document.execCommand("insertOrderedList", false);
      } else if (cmd === "quote") {
        document.execCommand("formatBlock", false, "blockquote");
      } else if (cmd === "align_left") {
        document.execCommand("justifyLeft", false);
      } else if (cmd === "align_center") {
        document.execCommand("justifyCenter", false);
      } else if (cmd === "align_right") {
        document.execCommand("justifyRight", false);
      } else if (cmd === "hr") {
        document.execCommand("insertHorizontalRule", false);
      } else if (cmd === "highlight") {
        try {
          document.execCommand("hiliteColor", false, "#fef08a");
        } catch {
          document.execCommand("backColor", false, "#fef08a");
        }
      } else if (cmd === "link") {
        setIsEditLinkMode(isEdit);
        const sel = window.getSelection();
        const selectedText = sel ? sel.toString() : "";
        setLinkText(selectedText);
        setLinkUrl("https://");
        setShowLinkModal(true);
        return;
      } else if (cmd === "color") {
        document.execCommand("foreColor", false, value || "#ef4444");
      } else if (cmd === "clear") {
        document.execCommand("removeFormat", false);
      } else if (cmd === "table") {
        const tableHtml = `
          <table style="width:100%; border-collapse:collapse; margin:12px 0; border:1px solid #cbd5e1;">
            <thead>
              <tr style="background:#f1f5f9; font-weight:bold;">
                <th style="border:1px solid #cbd5e1; padding:8px; text-align:left;">Header 1</th>
                <th style="border:1px solid #cbd5e1; padding:8px; text-align:left;">Header 2</th>
                <th style="border:1px solid #cbd5e1; padding:8px; text-align:left;">Header 3</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="border:1px solid #e2e8f0; padding:8px;">Data 1</td>
                <td style="border:1px solid #e2e8f0; padding:8px;">Data 2</td>
                <td style="border:1px solid #e2e8f0; padding:8px;">Data 3</td>
              </tr>
              <tr>
                <td style="border:1px solid #e2e8f0; padding:8px;">Data 4</td>
                <td style="border:1px solid #e2e8f0; padding:8px;">Data 5</td>
                <td style="border:1px solid #e2e8f0; padding:8px;">Data 6</td>
              </tr>
            </tbody>
          </table>
          <p><br></p>
        `;
        document.execCommand("insertHTML", false, tableHtml);
      } else if (cmd === "add_row") {
        const sel = window.getSelection();
        const node = sel?.anchorNode;
        const table = node ? (node.nodeType === 1 ? (node as HTMLElement).closest("table") : node.parentElement?.closest("table")) : null;
        if (table) {
          const colCount = table.rows[0] ? table.rows[0].cells.length : 3;
          const newRow = table.insertRow(-1);
          for (let i = 0; i < colCount; i++) {
            const cell = newRow.insertCell(i);
            cell.style.border = "1px solid #e2e8f0";
            cell.style.padding = "8px";
            cell.innerHTML = "New Data";
          }
        } else {
          applyFormatting("table", undefined, isEdit);
        }
      } else if (cmd === "add_col") {
        const sel = window.getSelection();
        const node = sel?.anchorNode;
        const table = node ? (node.nodeType === 1 ? (node as HTMLElement).closest("table") : node.parentElement?.closest("table")) : null;
        if (table) {
          Array.from(table.rows).forEach((row, idx) => {
            if (idx === 0 && row.cells[0]?.tagName === "TH") {
              const th = document.createElement("th");
              th.style.border = "1px solid #cbd5e1";
              th.style.padding = "8px";
              th.style.background = "#f1f5f9";
              th.style.fontWeight = "bold";
              th.innerHTML = "Header";
              row.appendChild(th);
            } else {
              const td = row.insertCell(-1);
              td.style.border = "1px solid #e2e8f0";
              td.style.padding = "8px";
              td.innerHTML = "Data";
            }
          });
        }
      } else if (cmd === "del_table") {
        const sel = window.getSelection();
        const node = sel?.anchorNode;
        const table = node ? (node.nodeType === 1 ? (node as HTMLElement).closest("table") : node.parentElement?.closest("table")) : null;
        if (table) {
          table.remove();
        }
      }
    } catch (e) {
      console.error("Format error:", e);
    }

    updateActiveFormats();

    if (targetRef.current) {
      const html = targetRef.current.innerHTML;
      if (isEdit) setEditMessage(html);
      else setMessage(html);
    }
  };

  const renderFormattedMessage = (msgText: string) => {
    if (!msgText) return null;
    let html = msgText;
    if (!/<[a-z][\s\S]*>/i.test(html)) {
      html = html.replace(/\n/g, "<br />");
    }

    return (
      <div
        className="text-[14.5px] leading-relaxed text-neutral-800 format-message overflow-x-auto"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  };

  const userStr = localStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : {};
  const currentUserId = user.id || null;
  const userAccessLevel = (user.access_level || "").toLowerCase();
  const userRole = (user.role || "").toLowerCase();
  const canSendAnnouncement =
    userAccessLevel === "admin" ||
    userAccessLevel === "hr" ||
    userAccessLevel === "hr admin" ||
    userAccessLevel === "human resource" ||
    userRole.includes("hr") ||
    userRole.includes("admin");

  const [todayBirthdays, setTodayBirthdays] = useState<any[]>([]);
  const [todayAnniversaries, setTodayAnniversaries] = useState<any[]>([]);

  const fetchCelebrations = async () => {
    try {
      const apiUrl = `${BASE_API_URL}/api`;
      const [bRes, aRes] = await Promise.all([
        fetch(`${apiUrl}/employees/birthdays/today`),
        fetch(`${apiUrl}/employees/anniversaries/today`),
      ]);
      const bData = await bRes.json();
      const aData = await aRes.json();
      setTodayBirthdays(Array.isArray(bData) ? bData : []);
      setTodayAnniversaries(Array.isArray(aData) ? aData : []);
    } catch (err) {
      console.error("Error fetching celebrations:", err);
    }
  };

  useEffect(() => {
    const init = async () => {
      setIsPageLoading(true);
      try {
        await Promise.all([fetchAnnouncements(), fetchCelebrations()]);
      } catch (error) {
        console.error("Initialization Error:", error);
      } finally {
        setIsPageLoading(false);
      }
    };
    init();

    socket.on("receive_announcement", (newAnnouncement) => {
      const userLevel = (user.access_level || "").toLowerCase();
      const target = (newAnnouncement.target_role || "all").toLowerCase();

      if (!["admin", "hr"].includes(userLevel)) {
        if (userLevel === "manager" || userLevel.includes("lead")) {
          if (target !== "all" && target !== "manager") return;
        } else {
          if (target !== "all" && target !== "employee") return;
        }
      }

      setAnnouncements((prev) => {
        if (prev.find(a => a.id === newAnnouncement.id)) return prev;
        return [newAnnouncement, ...prev];
      });
    });

    socket.on("update_announcement", (updated) => {
      setAnnouncements((prev) => prev.map(a => a.id === updated.id ? { ...a, ...updated } : a));
    });

    socket.on("poll_vote_updated", (payload) => {
      setAnnouncements((prev) => prev.map(a => a.id === payload.message_id ? { ...a, poll_votes: payload.poll_votes } : a));
    });

    socket.on("delete_announcement", (payload) => {
      setAnnouncements((prev) => prev.filter(a => a.id !== payload.id));
    });

    return () => {
      socket.off("receive_announcement");
      socket.off("update_announcement");
      socket.off("poll_vote_updated");
      socket.off("delete_announcement");
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
      const target = event.target as HTMLElement;
      if (!target.closest(".reaction-container")) {
        setActiveReactionPostId(null);
      }
      if (!target.closest(".reaction-badge-container")) {
        setActiveReactionPopover(null);
      }
      if (!target.closest(".voter-badge-container")) {
        setActivePollVotersPopover(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const updateSidebarOffset = () => {
      if (headerRef.current) {
        const headerHeight = headerRef.current.offsetHeight;
        setSidebarTopOffset(`${headerHeight + 16}px`);
      }
    };

    updateSidebarOffset();
    window.addEventListener("resize", updateSidebarOffset);
    return () => window.removeEventListener("resize", updateSidebarOffset);
  }, []);

  const handleSend = () => {
    if (!title.trim() || !message.trim()) return;
    if (!canSendAnnouncement) {
      console.error("User does not have permission to send announcements");
      return;
    }

    setIsLoading(true);

    const activePollOptions = pollOptions.filter(o => o.trim().length > 0);
    const poll_data = (showPollCreator && pollQuestion.trim() && activePollOptions.length >= 2) ? {
      question: pollQuestion.trim(),
      options: activePollOptions,
      expires_at: pollExpiresAt ? new Date(`${pollExpiresAt}T23:59:59`).toISOString() : null
    } : null;

    const announcementData = {
      user_id: user.id,
      sender_name: user.full_name || user.first_name || "HR Admin",
      title: title.trim(),
      target_role: targetRole,
      message: message.trim(),
      image_url: imageUrl,
      poll_data: poll_data,
    };

    try {
      fetch(`${BASE_API_URL}/api/communications/announcements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          created_by: user.full_name || user.first_name || "HR Admin",
          title: title.trim(),
          target_role: targetRole,
          message: message.trim(),
          image_url: imageUrl,
          poll_data: poll_data,
        })
      }).catch(err => console.error("HTTP announcement error:", err));

      setTimeout(() => {
        setShowSuccess(true);
        setTitle("");
        setMessage("");
        setTargetRole("all");
        setImageUrl("");
        setImagePreviewUrl("");
        setShowPollCreator(false);
        setPollQuestion("");
        setPollOptions(["", ""]);
        setPollExpiresAt("");
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        setShowEmojiPicker(false);
        setIsLoading(false);
        setTimeout(() => {
          setShowSuccess(false);
          fetchAnnouncements();
        }, 1500);
      }, 500);
    } catch (error) {
      console.error("Error sending announcement:", error);
      setIsLoading(false);
    }
  };

  const fetchAnnouncements = async () => {
    try {
      const apiUrl = `${BASE_API_URL}/api`;
      const response = await fetch(`${apiUrl}/communications/announcements?role=${user.access_level || ''}`);
      const data = await response.json();
      if (data.success && data.announcements) {
        setAnnouncements(data.announcements);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleOpenEdit = (post: any) => {
    setEditingPost(post);
    setEditTitle(post.title || "");
    setEditMessage(post.message || "");
    setEditTargetRole(post.target_role || "all");
    setEditImageUrl(post.image_url || "");
    setEditImagePreview(post.image_url ? (post.image_url.startsWith("http") ? post.image_url : `${BASE_API_URL}${post.image_url}`) : "");
    setTimeout(() => {
      if (editEditableRef.current) {
        editEditableRef.current.innerHTML = post.message || "";
      }
    }, 100);
  };

  const handleSaveEdit = async () => {
    if (!editingPost || !editTitle.trim() || !editMessage.trim()) return;
    setIsSavingEdit(true);
    try {
      const res = await fetch(`${BASE_API_URL}/api/communications/${editingPost.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle.trim(),
          message: editMessage.trim(),
          target_role: editTargetRole,
          image_url: editImageUrl
        })
      });
      const data = await res.json();
      if (data.success) {
        setAnnouncements(prev => prev.map(a => a.id === editingPost.id ? { ...a, title: editTitle.trim(), message: editMessage.trim(), target_role: editTargetRole, image_url: editImageUrl } : a));
        setEditingPost(null);
        toast.success("Announcement updated successfully");
      } else {
        toast.error(data.error || "Failed to update announcement");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to update announcement");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDelete = (postId: number) => {
    setDeleteConfirmId(postId);
  };

  const confirmDeleteAction = async () => {
    if (!deleteConfirmId) return;
    const postId = deleteConfirmId;
    setDeleteConfirmId(null);
    try {
      const res = await fetch(`${BASE_API_URL}/api/communications/${postId}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (data.success) {
        setAnnouncements(prev => prev.filter(a => a.id !== postId));
        toast.success("Announcement deleted successfully");
      } else {
        toast.error(data.error || "Failed to delete announcement");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete announcement");
    }
  };

  const toggleLike = async (messageId: number, reactionEmoji: string = "👍") => {
    if (!currentUserId) return;
    try {
      const apiUrl = `${BASE_API_URL}/api`;
      const senderName =
        user.full_name ||
        user.name ||
        (user.first_name ? `${user.first_name} ${user.last_name || ""}`.trim() : "") ||
        "Employee";
      const response = await fetch(`${apiUrl}/communications/${messageId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: currentUserId,
          reaction: reactionEmoji,
          employee_name: senderName
        })
      });
      const data = await response.json();
      if (data.success) {
        setAnnouncements(prev => prev.map(ann =>
          ann.id === messageId ? { ...ann, likes: data.likes } : ann
        ));
      }
    } catch (error) {
      console.error("Error toggling like:", error);
    }
  };

  const REACTION_OPTIONS = [
    { emoji: "👍", label: "Like" },
    { emoji: "❤️", label: "Love" },
    { emoji: "🎉", label: "Celebrate" },
    { emoji: "💡", label: "Insightful" },
    { emoji: "🚀", label: "Launch" },
    { emoji: "👏", label: "Clap" },
  ];

  const onEmojiClick = (emojiObject: any) => {
    const emo = emojiObject.emoji;
    if (editingPost && editEditableRef.current) {
      editEditableRef.current.focus();
      document.execCommand("insertText", false, emo);
      setEditMessage(editEditableRef.current.innerHTML);
    } else if (composerEditableRef.current) {
      composerEditableRef.current.focus();
      document.execCommand("insertText", false, emo);
      setMessage(composerEditableRef.current.innerHTML);
    }
  };

  const filteredAnnouncements = announcements.filter((item) => {
    const t = item.title || "";
    const m = item.message || "";
    const role = item.target_role || "all";
    const matchesSearch =
      t.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === "all" || role === filterRole;
    return matchesSearch && matchesRole;
  });

  const getRoleBadge = (role: string) => {
    if (role === "employee")
      return { label: "Employees", bg: "bg-success-100", color: "text-success-700" };
    if (role === "manager")
      return { label: "Managers", bg: "bg-info-100", color: "text-info-700" };
    return { label: "Everyone", bg: "bg-primary-100", color: "text-primary-700" };
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr.endsWith("Z") ? dateStr : dateStr + "Z");
      return d.toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return dateStr;
    }
  };

  const getInitials = (name: string) => {
    if (!name) return "HR";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2);
  };

  if (isPageLoading) {
    return <BookLoader />;
  }

  return (
    <div className="min-h-screen bg-neutral-100 px-4 py-8 md:px-8">
      <style>{`
        .format-message [data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: #94a3b8;
          pointer-events: none;
        }
        .format-message table {
          width: 100%;
          border-collapse: collapse;
          margin: 12px 0;
          font-size: 13px;
          background: #ffffff;
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid #cbd5e1;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        .format-message th {
          background: #f1f5f9;
          color: #0f172a;
          font-weight: 700;
          padding: 9px 12px;
          border: 1px solid #cbd5e1;
          text-align: left;
        }
        .format-message td {
          padding: 8px 12px;
          border: 1px solid #e2e8f0;
          color: #334155;
        }
        .format-message tr:nth-child(even) {
          background-color: #f8fafc;
        }
        .format-message ul {
          list-style-type: disc;
          padding-left: 22px;
          margin: 8px 0;
        }
        .format-message ol {
          list-style-type: decimal;
          padding-left: 22px;
          margin: 8px 0;
        }
        .format-message h3 {
          font-size: 16px;
          font-weight: 800;
          color: #0f172a;
          margin: 14px 0 6px 0;
        }
        .format-message u {
          text-decoration: underline;
          text-underline-offset: 3px;
          text-decoration-color: #0d9488;
        }
        .format-message strong, .format-message b {
          font-weight: 800;
          color: #0f172a;
        }
        .format-message em, .format-message i {
          font-style: italic;
        }
      `}</style>
      {showSuccess && (
        <div className="fixed top-5 right-6 z-50 flex items-center gap-2.5 rounded-lg bg-neutral-900 px-5 py-3.5 text-sm font-semibold text-white shadow-lg animate-slideInRight">
          <span className="h-2 w-2 flex-shrink-0 rounded-full bg-success-500" />
          Announcement posted successfully
        </div>
      )}

      <div className="mx-auto max-w-6xl">
        <div ref={headerRef} className="sticky top-0 z-10 bg-neutral-100 pt-8 pb-4 -mt-8 mb-4">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Company Wall</h1>
              <p className="text-sm text-neutral-500 mt-1">Stay updated with the latest announcements</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search posts..."
                  className="w-48 rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm text-neutral-700 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm text-neutral-700 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="all">All Audiences</option>
                {(canSendAnnouncement || !((user.access_level || "").toLowerCase().includes("manager") || (user.access_level || "").toLowerCase().includes("lead"))) && (
                  <option value="employee">Employees</option>
                )}
                {(canSendAnnouncement || (user.access_level || "").toLowerCase().includes("manager") || (user.access_level || "").toLowerCase().includes("lead")) && (
                  <option value="manager">Managers</option>
                )}
              </select>
            </div>
          </div>
        </div>

        <div className="flex gap-6">
          {/* Main Content - Announcements */}
          <div className="flex-1 min-w-0">
            {canSendAnnouncement && (
              <div className="mb-8 rounded-2xl bg-white p-6 shadow-sm border border-neutral-200/80 transition-all hover:shadow-md">
                {/* Card Top Row: Avatar + Title + Target Audience */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-indigo-600 font-bold text-white shadow-inner text-base">
                    {getInitials(user.first_name || "Admin")}
                  </div>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Announcement Title..."
                    className="flex-1 bg-transparent text-xl font-bold text-neutral-900 placeholder-neutral-400 focus:outline-none border-b border-transparent focus:border-primary-500 pb-1 transition-colors"
                  />
                  <select
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                    className="h-9 rounded-full border border-neutral-200 bg-neutral-50 px-3.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
                  >
                    <option value="all">📢 Everyone</option>
                    <option value="employee">👥 Employees Only</option>
                    <option value="manager">👔 Managers Only</option>
                  </select>
                </div>

                {/* Integrated Rich Text Editor Box */}
                <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden shadow-2xs focus-within:border-primary-400 focus-within:ring-2 focus-within:ring-primary-100 transition-all">
                  {/* Integrated Toolbar Header */}
                  <div className="flex items-center gap-1.5 p-2 bg-neutral-50/90 border-b border-neutral-200/80 overflow-x-auto scrollbar-none flex-wrap">
                    {/* Basic Typography */}
                    <button
                      type="button"
                      onClick={() => applyFormatting("b")}
                      className={`w-7 h-7 flex items-center justify-center rounded-lg font-extrabold text-xs transition-all ${
                        activeFormats.b ? "bg-primary-600 text-white shadow-xs" : "text-neutral-700 hover:bg-white border border-transparent hover:border-neutral-200"
                      }`}
                      title="Bold (Ctrl+B)"
                    >
                      B
                    </button>
                    <button
                      type="button"
                      onClick={() => applyFormatting("i")}
                      className={`w-7 h-7 flex items-center justify-center rounded-lg italic font-semibold text-xs transition-all ${
                        activeFormats.i ? "bg-primary-600 text-white shadow-xs" : "text-neutral-700 hover:bg-white border border-transparent hover:border-neutral-200"
                      }`}
                      title="Italic (Ctrl+I)"
                    >
                      I
                    </button>
                    <button
                      type="button"
                      onClick={() => applyFormatting("u")}
                      className={`w-7 h-7 flex items-center justify-center rounded-lg underline font-semibold text-xs transition-all ${
                        activeFormats.u ? "bg-primary-600 text-white shadow-xs" : "text-neutral-700 hover:bg-white border border-transparent hover:border-neutral-200"
                      }`}
                      title="Underline (Ctrl+U)"
                    >
                      U
                    </button>
                    <button
                      type="button"
                      onClick={() => applyFormatting("strikethrough")}
                      className={`w-7 h-7 flex items-center justify-center rounded-lg line-through font-bold text-xs transition-all ${
                        activeFormats.s ? "bg-primary-600 text-white shadow-xs" : "text-neutral-700 hover:bg-white border border-transparent hover:border-neutral-200"
                      }`}
                      title="Strikethrough"
                    >
                      S
                    </button>

                    <div className="h-4 w-px bg-neutral-300 mx-0.5"></div>

                    {/* Structure & Headings */}
                    <button
                      type="button"
                      onClick={() => applyFormatting("h")}
                      className={`w-7 h-7 flex items-center justify-center rounded-lg font-bold text-xs transition-all ${
                        activeFormats.h ? "bg-primary-600 text-white shadow-xs" : "text-neutral-700 hover:bg-white border border-transparent hover:border-neutral-200"
                      }`}
                      title="Heading Text"
                    >
                      H
                    </button>
                    <button
                      type="button"
                      onClick={() => applyFormatting("bullet")}
                      className={`px-2 h-7 flex items-center justify-center rounded-lg font-bold text-xs transition-all gap-1 ${
                        activeFormats.bullet ? "bg-primary-600 text-white shadow-xs" : "text-neutral-700 hover:bg-white border border-transparent hover:border-neutral-200"
                      }`}
                      title="Bullet List"
                    >
                      <span>•</span>
                      <span className="text-[10px]">Bullet</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => applyFormatting("number")}
                      className={`px-2 h-7 flex items-center justify-center rounded-lg font-bold text-xs transition-all gap-1 ${
                        activeFormats.number ? "bg-primary-600 text-white shadow-xs" : "text-neutral-700 hover:bg-white border border-transparent hover:border-neutral-200"
                      }`}
                      title="Numbered List"
                    >
                      <span>1.</span>
                      <span className="text-[10px]">Number</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => applyFormatting("quote")}
                      className={`px-2 h-7 flex items-center justify-center rounded-lg font-bold text-xs transition-all gap-1 ${
                        activeFormats.quote ? "bg-primary-600 text-white shadow-xs" : "text-neutral-700 hover:bg-white border border-transparent hover:border-neutral-200"
                      }`}
                      title="Callout / Blockquote"
                    >
                      <span>💬</span>
                      <span className="text-[10px]">Quote</span>
                    </button>

                    <div className="h-4 w-px bg-neutral-300 mx-0.5"></div>

                    {/* Highlight & Text Colors */}
                    <button
                      type="button"
                      onClick={() => applyFormatting("highlight")}
                      className={`px-2 h-7 flex items-center justify-center rounded-lg font-bold text-xs transition-all gap-1 ${
                        activeFormats.highlight ? "bg-amber-400 text-amber-950 shadow-xs ring-2 ring-amber-300" : "bg-amber-100 text-amber-900 border border-amber-200 hover:bg-amber-200"
                      }`}
                      title="Highlight Sentence"
                    >
                      <span>🖌️</span>
                      <span className="text-[10px]">Highlight</span>
                    </button>

                    <div className="flex items-center gap-1 px-1 py-0.5 rounded-lg bg-white border border-neutral-200">
                      <button
                        type="button"
                        onClick={() => applyFormatting("color", "#dc2626")}
                        className="w-4 h-4 rounded-full bg-red-600 hover:scale-125 transition-transform shadow-2xs border border-white"
                        title="Red Text"
                      />
                      <button
                        type="button"
                        onClick={() => applyFormatting("color", "#16a34a")}
                        className="w-4 h-4 rounded-full bg-emerald-600 hover:scale-125 transition-transform shadow-2xs border border-white"
                        title="Green Text"
                      />
                      <button
                        type="button"
                        onClick={() => applyFormatting("color", "#2563eb")}
                        className="w-4 h-4 rounded-full bg-blue-600 hover:scale-125 transition-transform shadow-2xs border border-white"
                        title="Blue Text"
                      />
                      <button
                        type="button"
                        onClick={() => applyFormatting("color", "#ea580c")}
                        className="w-4 h-4 rounded-full bg-orange-600 hover:scale-125 transition-transform shadow-2xs border border-white"
                        title="Orange Text"
                      />
                      <button
                        type="button"
                        onClick={() => applyFormatting("color", "#9333ea")}
                        className="w-4 h-4 rounded-full bg-purple-600 hover:scale-125 transition-transform shadow-2xs border border-white"
                        title="Purple Text"
                      />
                      <button
                        type="button"
                        onClick={() => applyFormatting("color", "#1e293b")}
                        className="w-4 h-4 rounded-full bg-slate-800 hover:scale-125 transition-transform shadow-2xs border border-white"
                        title="Dark Slate Text"
                      />
                    </div>

                    <div className="h-4 w-px bg-neutral-300 mx-0.5"></div>

                    {/* Text Alignment */}
                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => applyFormatting("align_left")}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-xs text-neutral-600 hover:bg-white border border-transparent hover:border-neutral-200"
                        title="Align Left"
                      >
                        ⬅️
                      </button>
                      <button
                        type="button"
                        onClick={() => applyFormatting("align_center")}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-xs text-neutral-600 hover:bg-white border border-transparent hover:border-neutral-200"
                        title="Align Center"
                      >
                        ↔️
                      </button>
                      <button
                        type="button"
                        onClick={() => applyFormatting("align_right")}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-xs text-neutral-600 hover:bg-white border border-transparent hover:border-neutral-200"
                        title="Align Right"
                      >
                        ➡️
                      </button>
                    </div>

                    <div className="h-4 w-px bg-neutral-300 mx-0.5"></div>

                    {/* Insert & Tools */}
                    <button
                      type="button"
                      onClick={() => applyFormatting("link")}
                      className="px-2 h-7 flex items-center justify-center rounded-lg font-bold text-xs text-neutral-700 bg-white border border-neutral-200 hover:bg-neutral-100 transition-all gap-1 shadow-2xs"
                      title="Insert Hyperlink"
                    >
                      <span>🔗</span>
                      <span className="text-[10px]">Link</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => applyFormatting("hr")}
                      className="px-1.5 h-7 flex items-center justify-center rounded-lg text-xs font-bold text-neutral-600 hover:bg-white border border-transparent hover:border-neutral-200"
                      title="Insert Horizontal Divider Line"
                    >
                      ➖ Line
                    </button>

                    <button
                      type="button"
                      onClick={() => applyFormatting("clear")}
                      className="px-1.5 h-7 flex items-center justify-center rounded-lg text-xs text-neutral-500 hover:text-neutral-800 hover:bg-neutral-200 transition-all"
                      title="Clear Formatting"
                    >
                      🧹
                    </button>

                    <div className="h-4 w-px bg-neutral-300 mx-0.5"></div>

                    {/* Table Suite */}
                    <button
                      type="button"
                      onClick={() => applyFormatting("table")}
                      className="px-2.5 rounded-lg font-bold text-xs text-primary-700 bg-primary-50 border border-primary-200 hover:bg-primary-100 transition-all gap-1 h-7 flex items-center shadow-2xs"
                      title="Insert Table"
                    >
                      <span>📊</span>
                      <span className="text-[10px] font-bold">Table</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => applyFormatting("add_row")}
                      className="px-2 rounded-lg font-semibold text-xs text-neutral-700 bg-white border border-neutral-200 hover:bg-neutral-100 transition-all h-7 flex items-center shadow-2xs"
                      title="Add Row"
                    >
                      <span className="text-xs">+Row</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => applyFormatting("add_col")}
                      className="px-2 rounded-lg font-semibold text-xs text-neutral-700 bg-white border border-neutral-200 hover:bg-neutral-100 transition-all h-7 flex items-center shadow-2xs"
                      title="Add Column"
                    >
                      <span className="text-xs">+Col</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => applyFormatting("del_table")}
                      className="px-2 rounded-lg font-semibold text-xs text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 transition-all h-7 flex items-center"
                      title="Delete Table"
                    >
                      <span className="text-xs">🗑️</span>
                    </button>
                  </div>

                  {/* Editor Content Area */}
                  <div
                    ref={composerEditableRef}
                    contentEditable
                    onInput={(e) => setMessage(e.currentTarget.innerHTML)}
                    onBlur={(e) => setMessage(e.currentTarget.innerHTML)}
                    onKeyUp={updateActiveFormats}
                    onMouseUp={updateActiveFormats}
                    className="w-full min-h-[140px] p-4 text-[15px] text-neutral-800 focus:outline-none bg-white format-message leading-relaxed overflow-y-auto"
                    data-placeholder="What's happening in the company? Highlight text to format (B/I/U) or paste tables here..."
                  />
                </div>

                {/* Attached Image Preview */}
                {imagePreviewUrl && (
                  <div className="relative mt-3 inline-block rounded-xl overflow-hidden border border-neutral-200 shadow-sm max-w-[220px] group cursor-pointer">
                    <img
                      src={imagePreviewUrl}
                      className="w-full h-auto object-cover max-h-[150px] group-hover:scale-105 transition-transform"
                      alt="Preview"
                      onClick={() => setViewerImage({ url: imagePreviewUrl, title: title || "Image Attachment Preview" })}
                    />
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
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Bottom Footer: Emoji, Image, Post Button */}
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-2 relative">
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-100 text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900 transition-colors"
                      title="Add Emoji"
                    >
                      <span className="text-base">😊</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-100 text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900 transition-colors"
                      title="Attach Image"
                    >
                      <span className="text-base">🖼️</span>
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImageUpload}
                      accept="image/*"
                      className="hidden"
                    />

                    {/* Add Poll Button */}
                    <button
                      type="button"
                      onClick={() => setShowPollCreator(!showPollCreator)}
                      className={`flex h-9 px-3 items-center justify-center rounded-xl font-bold text-xs gap-1.5 transition-all cursor-pointer ${
                        showPollCreator 
                          ? "bg-primary-600 text-white shadow-xs" 
                          : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900"
                      }`}
                      title="Attach Poll"
                    >
                      <span className="text-sm">📊</span>
                      <span>{showPollCreator ? "Poll Added" : "Poll"}</span>
                    </button>

                    {showEmojiPicker && (
                      <div ref={emojiPickerRef} className="absolute left-0 top-12 z-50 shadow-2xl">
                        <EmojiPicker onEmojiClick={onEmojiClick} autoFocusSearch={false} />
                      </div>
                    )}
                  </div>

                  <Button
                    loading={isLoading}
                    onClick={handleSend}
                    disabled={!title.trim() || !message.trim()}
                    className="rounded-xl px-6 py-2.5 font-bold shadow-md bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-700 hover:to-indigo-700 text-white"
                  >
                    Post Announcement
                  </Button>
                </div>

                {/* Poll Creator Setup Box */}
                {showPollCreator && (
                  <div className="mt-3 p-4 rounded-2xl bg-primary-50/50 border border-primary-200/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold uppercase text-primary-700 tracking-wider flex items-center gap-1.5">
                        <span>📊</span> Create Interactive Poll
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setShowPollCreator(false);
                          setPollQuestion("");
                          setPollOptions(["", ""]);
                        }}
                        className="text-neutral-400 hover:text-neutral-600 text-xs font-bold cursor-pointer"
                      >
                        Remove Poll
                      </button>
                    </div>

                    <input
                      type="text"
                      placeholder="Poll Question (e.g., Where should we host our team outing?)"
                      value={pollQuestion}
                      onChange={(e) => setPollQuestion(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs font-bold border border-primary-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:outline-none bg-white text-neutral-800"
                    />

                    <div className="space-y-2">
                      <span className="text-[11px] font-bold text-neutral-600 block">Poll Options:</span>
                      {pollOptions.map((opt, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder={`Option ${idx + 1}`}
                            value={opt}
                            onChange={(e) => {
                              const newOpts = [...pollOptions];
                              newOpts[idx] = e.target.value;
                              setPollOptions(newOpts);
                            }}
                            className="flex-1 px-3 py-1.5 text-xs font-semibold border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:outline-none bg-white text-neutral-800"
                          />
                          {pollOptions.length > 2 && (
                            <button
                              type="button"
                              onClick={() => setPollOptions(pollOptions.filter((_, i) => i !== idx))}
                              className="text-red-500 hover:text-red-700 p-1 text-xs cursor-pointer font-bold"
                              title="Remove Option"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}

                      {pollOptions.length < 6 && (
                        <button
                          type="button"
                          onClick={() => setPollOptions([...pollOptions, ""])}
                          className="mt-1 text-xs font-bold text-primary-600 hover:text-primary-800 flex items-center gap-1 cursor-pointer"
                        >
                          + Add Option
                        </button>
                      )}
                    </div>
                    
                    <div className="space-y-2 mt-3">
                      <span className="text-[11px] font-bold text-neutral-600 block">Poll Deadline (Optional):</span>
                      <DatePicker
                        value={pollExpiresAt}
                        onChange={(val) => setPollExpiresAt(val)}
                        placeholder="Select deadline date"
                        disablePast={true}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
            <div className="space-y-5">
              {filteredAnnouncements.length === 0 ? (
                <div className="rounded-2xl border border-neutral-200 bg-white p-12 text-center">
                  <MegaphoneIcon className="mx-auto h-12 w-12 text-neutral-300 mb-3" />
                  <h3 className="text-lg font-bold text-neutral-700">No Announcements</h3>
                  <p className="text-sm text-neutral-500 mt-1">Check back later for company updates.</p>
                </div>
              ) : (
                filteredAnnouncements.map((item: any) => {
                  const badge = getRoleBadge(item.target_role);
                  const likesArray: any[] = (item.likes || []).map((l: any) =>
                    typeof l === "object" ? l : { employee_id: l, name: `User #${l}`, reaction: "👍" }
                  );

                  const myReaction = likesArray.find((l: any) => Number(l.employee_id) === Number(currentUserId));
                  const hasReacted = !!myReaction;

                  // Group reactions by emoji type with full user details
                  const emojiCounts: { [key: string]: { count: number; names: string[]; users: any[] } } = {};
                  likesArray.forEach((l: any) => {
                    const emo = l.reaction || "👍";
                    if (!emojiCounts[emo]) {
                      emojiCounts[emo] = { count: 0, names: [], users: [] };
                    }
                    emojiCounts[emo].count += 1;
                    const userName = l.name || (l.employee_id ? `User #${l.employee_id}` : "Anonymous");
                    emojiCounts[emo].names.push(userName);
                    emojiCounts[emo].users.push({
                      employee_id: l.employee_id || l.user_id,
                      name: userName,
                      profile_image: l.profile_image || ""
                    });
                  });

                  return (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-neutral-200 to-neutral-300 font-bold text-neutral-600 shadow-inner">
                          {getInitials(item.created_by)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-bold text-neutral-900 leading-none">{item.created_by}</h4>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[12px] font-medium text-neutral-500">{formatDate(item.created_at)}</span>
                                <span className="h-1 w-1 rounded-full bg-neutral-300"></span>
                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${badge.bg} ${badge.color}`}>
                                  {badge.label}
                                </span>
                              </div>
                            </div>
                            {canSendAnnouncement && (
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => handleOpenEdit(item)}
                                  className="p-1.5 rounded-lg text-neutral-400 hover:text-primary-600 hover:bg-neutral-100 transition-colors"
                                  title="Edit Announcement"
                                >
                                  <PencilSquareIcon className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDelete(item.id)}
                                  className="p-1.5 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                  title="Delete Announcement"
                                >
                                  <TrashIcon className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </div>

                          <div className="mt-3">
                            <h3 className="text-[16px] font-bold text-neutral-800 mb-1.5">{item.title}</h3>
                            {renderFormattedMessage(item.message)}

                            {item.image_url && (
                              <div
                                onClick={() =>
                                  setViewerImage({
                                    url: item.image_url.startsWith("http")
                                      ? item.image_url
                                      : `${BASE_API_URL}${item.image_url}`,
                                    title: item.title,
                                  })
                                }
                                className="mt-3 rounded-xl overflow-hidden border border-neutral-200/80 max-h-[420px] bg-neutral-900/5 hover:bg-neutral-900/10 flex items-center justify-center cursor-pointer group relative transition-all duration-200 shadow-xs hover:shadow-md"
                              >
                                <img
                                  src={item.image_url.startsWith("http") ? item.image_url : `${BASE_API_URL}${item.image_url}`}
                                  alt={item.title}
                                  className="max-w-full h-auto max-h-[420px] object-contain group-hover:scale-[1.01] transition-transform duration-300"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100 backdrop-blur-[1px]">
                                  <div className="px-3.5 py-1.5 rounded-full bg-neutral-900/80 backdrop-blur-md text-white text-xs font-semibold flex items-center gap-2 shadow-xl transform translate-y-2 group-hover:translate-y-0 transition-transform border border-white/20">
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                                    </svg>
                                    Click to view & zoom
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Embedded Poll Component */}
                            {item.poll_data && item.poll_data.question && (
                              <div className="mt-4 p-4 rounded-2xl bg-neutral-50 border border-neutral-200/90 space-y-3">
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="text-base shrink-0">📊</span>
                                    <h4 className="font-extrabold text-neutral-900 text-xs truncate">{item.poll_data.question}</h4>
                                  </div>
                                  {canSendAnnouncement && (() => {
                                    const pollExpiresAt = item.poll_data.expires_at ? new Date(item.poll_data.expires_at).getTime() : null;
                                    const isPollEnded = pollExpiresAt ? Date.now() > pollExpiresAt : false;

                                    return (
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setShowExtendPollModal(item.id);
                                            setExtendDays(7);
                                          }}
                                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-emerald-700 bg-white hover:bg-emerald-50 border border-emerald-200 hover:border-emerald-300 rounded-xl shadow-2xs transition-all duration-150 cursor-pointer shrink-0"
                                          title="Extend poll deadline"
                                        >
                                          <span>⏱️</span>
                                          <span>Extend Poll</span>
                                        </button>
                                        {!isPollEnded && (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setShowClosePollConfirm(item.id);
                                            }}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-red-700 bg-white hover:bg-red-50 border border-red-200 hover:border-red-300 rounded-xl shadow-2xs transition-all duration-150 cursor-pointer shrink-0"
                                            title="Close poll immediately"
                                          >
                                            <span>🔒</span>
                                            <span>Close Poll</span>
                                          </button>
                                        )}
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDownloadPollReport(item);
                                          }}
                                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-primary-700 bg-white hover:bg-primary-50 border border-primary-200 hover:border-primary-300 rounded-xl shadow-2xs transition-all duration-150 cursor-pointer shrink-0"
                                          title="Download full poll report with voter names and options chosen"
                                        >
                                          <ArrowDownTrayIcon className="w-3.5 h-3.5 stroke-[2.5]" />
                                          <span>Download Poll Report</span>
                                        </button>
                                      </div>
                                    );
                                  })()}
                                </div>

                                {(() => {
                                  const votesObj = item.poll_votes || {};
                                  const totalVotes = Object.keys(votesObj).length;
                                  const userVoteData = votesObj[String(currentUserId)] || null;
                                  const isCurrentUserVoted = !!userVoteData;
                                  
                                  const expiresAt = item.poll_data.expires_at ? new Date(item.poll_data.expires_at).getTime() : null;
                                  const isPollFrozen = expiresAt ? Date.now() > expiresAt : false;
                                  const formattedExpiresAt = expiresAt ? new Date(expiresAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : null;

                                  return (
                                    <div className="space-y-2 pt-1">
                                      {(item.poll_data.options || []).map((optText: string, idx: number) => {
                                        // Collect voters for this option
                                        const votersForOption: any[] = [];
                                        Object.entries(votesObj).forEach(([uId, vVal]: [string, any]) => {
                                          let isMatch = false;
                                          let uName = `User #${uId}`;
                                          let uImg = "";

                                          if (typeof vVal === "object" && vVal !== null) {
                                            const opts = Array.isArray(vVal.option_index) ? vVal.option_index : [vVal.option_index];
                                            if (opts.includes(idx)) {
                                              isMatch = true;
                                              uName = vVal.user_name || uName;
                                              uImg = vVal.profile_image || "";
                                            }
                                          } else {
                                            const opts = Array.isArray(vVal) ? vVal : [vVal];
                                            if (opts.includes(idx)) {
                                              isMatch = true;
                                            }
                                          }

                                          if (isMatch) {
                                            votersForOption.push({ userId: uId, name: uName, profileImage: uImg });
                                          }
                                        });

                                        const count = votersForOption.length;
                                        const percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                                        const isVotedByMe = votersForOption.some(v => String(v.userId) === String(currentUserId));

                                        return (
                                          <button
                                            key={idx}
                                            type="button"
                                            disabled={isPollFrozen}
                                            onClick={() => handleVotePoll(item.id, idx)}
                                            className={`w-full text-left p-3 rounded-xl border transition-all relative group/opt ${
                                              isPollFrozen ? "cursor-not-allowed opacity-80" : "cursor-pointer hover:border-primary-300 hover:bg-neutral-50"
                                            } ${
                                              isVotedByMe
                                                ? "border-primary-500 bg-primary-50/60 font-bold"
                                                : "border-neutral-200 bg-white"
                                            }`}
                                          >
                                            {/* Live Progress Bar Background - Only show if voted or poll ended */}
                                            {(isCurrentUserVoted || isPollFrozen) && (
                                              <div className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none">
                                                <div
                                                  className="h-full bg-primary-500/15 transition-all duration-500 rounded-xl"
                                                  style={{ width: `${percentage}%` }}
                                                />
                                              </div>
                                            )}

                                            <div className="relative flex items-center justify-between z-10 text-xs">
                                              <div className="flex items-center gap-2.5">
                                                <span className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] shrink-0 ${
                                                  isVotedByMe ? "border-primary-600 bg-primary-600 text-white" : "border-neutral-300 bg-white text-transparent"
                                                }`}>
                                                  ✓
                                                </span>
                                                <span className="font-semibold text-neutral-800 group-hover/opt:text-primary-700">
                                                  {optText}
                                                </span>
                                              </div>

                                              <div className="flex items-center gap-3 shrink-0">
                                                {/* Voter Profile Avatars & Scrollable Popover - Only show if voted or poll ended */}
                                                {(isCurrentUserVoted || isPollFrozen) && votersForOption.length > 0 && (() => {
                                                  const isVoterPopoverOpen =
                                                    activePollVotersPopover?.announcementId === item.id &&
                                                    activePollVotersPopover?.optionIndex === idx;

                                                  return (
                                                    <div
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        setActivePollVotersPopover(
                                                          isVoterPopoverOpen
                                                            ? null
                                                            : { announcementId: item.id, optionIndex: idx }
                                                        );
                                                      }}
                                                      className="voter-badge-container relative group/voters flex items-center -space-x-1.5 overflow-visible cursor-pointer select-none"
                                                    >
                                                      {votersForOption.slice(0, 4).map((voter, vIdx) => (
                                                        <img
                                                          key={vIdx}
                                                          src={getProfileImageUrl(voter.profileImage, voter.userId)}
                                                          alt={voter.name}
                                                          className="inline-block h-5 w-5 rounded-full ring-1 ring-white object-cover shadow-2xs"
                                                          onError={(e) => {
                                                            e.currentTarget.style.display = "none";
                                                          }}
                                                        />
                                                      ))}
                                                      {votersForOption.length > 4 && (
                                                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-neutral-200 hover:bg-neutral-300 text-[9px] font-bold text-neutral-700 ring-1 ring-white transition-colors">
                                                          +{votersForOption.length - 4}
                                                        </span>
                                                      )}

                                                      {/* Hover / Click Interactive Popover listing voter names */}
                                                      <div
                                                        onClick={(e) => e.stopPropagation()}
                                                        onWheel={(e) => e.stopPropagation()}
                                                        className={`absolute bottom-full right-0 mb-2 z-[999] w-60 sm:w-64 p-3 bg-neutral-900/95 backdrop-blur-md text-white text-[11px] rounded-2xl shadow-2xl pointer-events-auto border border-neutral-700/80 transition-all animate-fadeIn ${
                                                          isVoterPopoverOpen ? "block" : "hidden group-hover/voters:block"
                                                        }`}
                                                      >
                                                        {/* Header */}
                                                        <div className="flex items-center justify-between border-b border-neutral-800 pb-2 mb-2">
                                                          <div className="flex items-center gap-1.5 font-bold text-neutral-200 text-xs truncate max-w-[140px]">
                                                            <span>Voted:</span>
                                                            <span className="text-primary-400 font-bold truncate">"{optText}"</span>
                                                          </div>
                                                          <span className="text-[10px] font-semibold text-neutral-400 px-1.5 py-0.5 rounded-full bg-neutral-800 border border-neutral-700 shrink-0">
                                                            {votersForOption.length} {votersForOption.length === 1 ? "voter" : "voters"}
                                                          </span>
                                                        </div>

                                                        {/* Scrollable List */}
                                                        <div className="flex flex-col gap-1 max-h-44 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-neutral-700 hover:scrollbar-thumb-neutral-600">
                                                          {votersForOption.map((v, i) => (
                                                            <div
                                                              key={i}
                                                              className="flex items-center gap-2.5 p-1 rounded-lg hover:bg-white/5 transition-colors"
                                                            >
                                                              {v.profileImage ? (
                                                                <img
                                                                  src={getProfileImageUrl(v.profileImage, v.userId)}
                                                                  className="w-5 h-5 rounded-full object-cover shrink-0 border border-neutral-600"
                                                                  alt={v.name}
                                                                  onError={(e) => {
                                                                    e.currentTarget.style.display = "none";
                                                                  }}
                                                                />
                                                              ) : (
                                                                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-neutral-700 to-neutral-800 flex items-center justify-center text-[9px] font-bold text-neutral-300 shrink-0 border border-neutral-600">
                                                                  {v.name.charAt(0).toUpperCase()}
                                                                </div>
                                                              )}
                                                              <span className="text-[11.5px] text-neutral-200 font-medium truncate flex-1 text-left">
                                                                {v.name}
                                                              </span>
                                                            </div>
                                                          ))}
                                                        </div>

                                                        {/* Pointer Arrow */}
                                                        <div className="absolute top-full right-4 border-4 border-transparent border-t-neutral-900/95"></div>
                                                      </div>
                                                    </div>
                                                  );
                                                })()}

                                                {(isCurrentUserVoted || isPollFrozen) && (
                                                  <span className="font-extrabold text-neutral-600 text-[11px]">
                                                    {percentage}% ({count})
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                          </button>
                                        );
                                      })}

                                      <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-neutral-150/80 flex-wrap gap-2">
                                        <div className="flex items-center gap-2 font-semibold">
                                          {isPollFrozen ? (
                                            <span className="text-red-600">🔒 Poll Ended{formattedExpiresAt ? ` on ${formattedExpiresAt}` : ''}</span>
                                          ) : isCurrentUserVoted ? (
                                            <span className="text-emerald-600">✓ Voted (You can change your vote{formattedExpiresAt ? ` until ${formattedExpiresAt}` : ''})</span>
                                          ) : (
                                            <span className="text-neutral-400 font-medium">Select an option to vote{formattedExpiresAt ? ` (Ends on ${formattedExpiresAt})` : ''}</span>
                                          )}
                                        </div>
                                        <div className="text-[11px] text-neutral-400 font-semibold text-right">
                                          Total Votes: {totalVotes}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>
                            )}
                          </div>

                          <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between gap-4 flex-wrap">
                            {/* Multi-Emoji Picker Bar on Click */}
                            <div className="relative flex items-center gap-2 reaction-container">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveReactionPostId(activeReactionPostId === item.id ? null : item.id);
                                }}
                                className={`flex items-center gap-2 text-sm font-semibold transition-all px-3 py-1.5 rounded-full border ${hasReacted
                                    ? "text-primary-700 bg-primary-50 border-primary-200 shadow-xs"
                                    : "text-neutral-600 bg-neutral-50 border-neutral-200 hover:bg-neutral-100"
                                  }`}
                              >
                                <span>{myReaction?.reaction || "👍"}</span>
                                <span>{hasReacted ? "Reacted" : "React"}</span>
                              </button>

                              {/* Click Emoji Reaction Bar */}
                              {activeReactionPostId === item.id && (
                                <div className="absolute left-0 bottom-full mb-1 flex items-center gap-1.5 p-1.5 bg-white border border-neutral-200 shadow-xl rounded-full z-30 transition-all animate-fadeIn">
                                  {REACTION_OPTIONS.map((opt) => (
                                    <button
                                      key={opt.emoji}
                                      onClick={() => {
                                        toggleLike(item.id, opt.emoji);
                                        setActiveReactionPostId(null);
                                      }}
                                      className="w-8 h-8 flex items-center justify-center text-lg hover:scale-125 transition-transform rounded-full hover:bg-neutral-100"
                                      title={opt.label}
                                    >
                                      {opt.emoji}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Reaction Badges with In-Place Scrollable Popover */}
                            {likesArray.length > 0 && (
                              <div className="flex items-center gap-2 flex-wrap">
                                {Object.entries(emojiCounts).map(([emo, info]) => {
                                  const isPopoverOpen =
                                    activeReactionPopover?.announcementId === item.id &&
                                    activeReactionPopover?.emoji === emo;

                                  return (
                                    <div
                                      key={emo}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveReactionPopover(
                                          isPopoverOpen ? null : { announcementId: item.id, emoji: emo }
                                        );
                                      }}
                                      className={`reaction-badge-container relative group/reaction flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold transition-all cursor-pointer select-none ${
                                        isPopoverOpen
                                          ? "bg-neutral-800 text-white border-neutral-700 shadow-sm ring-2 ring-neutral-400/20"
                                          : "bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border-neutral-200"
                                      }`}
                                    >
                                      <span className="text-sm leading-none">{emo}</span>
                                      <span className="text-[11px] font-extrabold">{info.count}</span>

                                      {/* Scrollable Hover / Click Popover */}
                                      <div
                                        onClick={(e) => e.stopPropagation()}
                                        onWheel={(e) => e.stopPropagation()}
                                        className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-56 sm:w-64 p-3 bg-neutral-900/95 backdrop-blur-md text-white rounded-2xl shadow-2xl border border-neutral-700/80 pointer-events-auto transition-all animate-fadeIn ${
                                          isPopoverOpen ? "block" : "hidden group-hover/reaction:block"
                                        }`}
                                      >
                                        {/* Popover Header */}
                                        <div className="flex items-center justify-between border-b border-neutral-800 pb-2 mb-2">
                                          <div className="flex items-center gap-1.5 font-bold text-neutral-200 text-xs">
                                            <span>Reacted with {emo}</span>
                                          </div>
                                          <span className="text-[10px] font-semibold text-neutral-400 px-1.5 py-0.5 rounded-full bg-neutral-800 border border-neutral-700">
                                            {info.count} {info.count === 1 ? "person" : "people"}
                                          </span>
                                        </div>

                                        {/* Smooth Scrollable Users List */}
                                        <div className="flex flex-col gap-1 max-h-44 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-neutral-700 hover:scrollbar-thumb-neutral-600">
                                          {info.users.length > 0 ? (
                                            info.users.map((u, i) => (
                                              <div
                                                key={i}
                                                className="flex items-center gap-2.5 p-1 rounded-lg hover:bg-white/5 transition-colors"
                                              >
                                                {u.profile_image ? (
                                                  <img
                                                    src={getProfileImageUrl(u.profile_image, u.employee_id)}
                                                    alt={u.name}
                                                    className="w-5 h-5 rounded-full object-cover shrink-0 border border-neutral-600"
                                                    onError={(e) => {
                                                      e.currentTarget.style.display = "none";
                                                    }}
                                                  />
                                                ) : (
                                                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-neutral-700 to-neutral-800 flex items-center justify-center text-[9px] font-bold text-neutral-300 shrink-0 border border-neutral-600">
                                                    {u.name.charAt(0).toUpperCase()}
                                                  </div>
                                                )}
                                                <span className="text-[11.5px] text-neutral-200 font-medium truncate flex-1 text-left">
                                                  {u.name}
                                                </span>
                                              </div>
                                            ))
                                          ) : (
                                            <span className="text-neutral-400 text-xs py-1">No details</span>
                                          )}
                                        </div>

                                        {/* Pointer arrow */}
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-neutral-900/95"></div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Sidebar - Today's Celebrations */}
          {(todayBirthdays.length > 0 || todayAnniversaries.length > 0) && (
            <div className="w-80 hidden lg:block">
              <div className="sticky rounded-2xl bg-white p-5 shadow-sm border border-neutral-200" style={{ top: sidebarTopOffset }}>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-2xl">🎉</span>
                  <h2 className="text-lg font-bold text-neutral-900">Today's Celebrations</h2>
                </div>

                {/* Birthdays Section */}
                {todayBirthdays.length > 0 && (
                  <div className="mb-5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-600 mb-3 flex items-center gap-2">
                      <span className="text-lg">🎂</span>
                      <span>Birthdays Today ({todayBirthdays.length})</span>
                    </h3>
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
                      {todayBirthdays.map((b: any) => (
                        <div key={b.id} className="rounded-xl bg-neutral-50 p-4 hover:bg-neutral-100 transition-colors">
                          <div className="flex flex-col items-center text-center gap-2.5">
                            {b.profile_image ? (
                              <img src={getProfileImageUrl(b.profile_image, b.id)} alt={b.first_name} className="w-[150px] h-[150px] rounded-full object-cover flex-shrink-0 shadow-sm border border-neutral-100" />
                            ) : (
                              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-white flex items-center justify-center font-bold text-2xl flex-shrink-0 shadow-sm">
                                {b.first_name?.[0]}
                              </div>
                            )}
                            <div className="min-w-0">
                              <h4 className="font-semibold text-sm text-neutral-900 leading-snug">{b.first_name} {b.last_name}</h4>
                              {([b.designation, b.department].some(Boolean)) && (
                                <p className="text-xs text-neutral-500 font-medium mt-0.5">
                                  {[b.designation, b.department].filter(Boolean).join(" | ")}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Divider */}
                {todayBirthdays.length > 0 && todayAnniversaries.length > 0 && (
                  <div className="h-px bg-neutral-200 mb-5"></div>
                )}

                {/* Anniversaries Section */}
                {todayAnniversaries.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-600 mb-3 flex items-center gap-2">
                      <span className="text-lg">🏆</span>
                      <span>Anniversaries ({todayAnniversaries.length})</span>
                    </h3>
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
                      {todayAnniversaries.map((a: any) => (
                        <div key={a.id} className="rounded-xl bg-neutral-50 p-4 hover:bg-neutral-100 transition-colors">
                          <div className="flex flex-col items-center text-center gap-2.5">
                            {a.profile_image ? (
                              <img src={getProfileImageUrl(a.profile_image, a.id)} alt={a.first_name} className="w-20 h-20 rounded-full object-cover flex-shrink-0 shadow-sm border border-neutral-100" />
                            ) : (
                              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-white flex items-center justify-center font-bold text-2xl flex-shrink-0 shadow-sm">
                                {a.first_name?.[0]}
                              </div>
                            )}
                            <div className="min-w-0">
                              <h4 className="font-semibold text-sm text-neutral-900 leading-snug">{a.first_name} {a.last_name}</h4>
                              {([a.designation, a.department].some(Boolean)) && (
                                <p className="text-xs text-neutral-500 font-medium mt-0.5">
                                  {[a.designation, a.department].filter(Boolean).join(" | ")}
                                </p>
                              )}
                              <p className="text-xs text-amber-700 font-semibold mt-1.5">{a.years} {a.years === 1 ? 'Year' : 'Years'} Milestone</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Announcement Modal */}
      {editingPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg max-h-[90vh] rounded-2xl bg-white shadow-2xl border border-neutral-100 overflow-hidden animate-in fade-in zoom-in duration-150 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 bg-neutral-50/50 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-primary-50 text-primary-600">
                  <PencilSquareIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-neutral-800 text-base">Edit Announcement</h3>
                  <p className="text-xs text-neutral-500">Update announcement details</p>
                </div>
              </div>
              <button
                onClick={() => setEditingPost(null)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-600 uppercase tracking-wider mb-2">
                  Announcement Title
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Title..."
                  className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm text-neutral-800 focus:border-primary-600 focus:ring-2 focus:ring-primary-100 outline-none transition-all font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-600 uppercase tracking-wider mb-2">
                  Message Content
                </label>

                {/* Text Formatting Toolbar for Edit Modal */}
                <div className="flex items-center gap-1.5 p-2 bg-neutral-50/90 border-b border-neutral-200/80 overflow-x-auto scrollbar-none flex-wrap">
                  {/* Basic Typography */}
                  <button
                    type="button"
                    onClick={() => applyFormatting("b", undefined, true)}
                    className={`w-7 h-7 flex items-center justify-center rounded-lg font-extrabold text-xs transition-all ${
                      activeFormats.b ? "bg-primary-600 text-white shadow-xs" : "text-neutral-700 hover:bg-white border border-transparent hover:border-neutral-200"
                    }`}
                    title="Bold (Ctrl+B)"
                  >
                    B
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFormatting("i", undefined, true)}
                    className={`w-7 h-7 flex items-center justify-center rounded-lg italic font-semibold text-xs transition-all ${
                      activeFormats.i ? "bg-primary-600 text-white shadow-xs" : "text-neutral-700 hover:bg-white border border-transparent hover:border-neutral-200"
                    }`}
                    title="Italic (Ctrl+I)"
                  >
                    I
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFormatting("u", undefined, true)}
                    className={`w-7 h-7 flex items-center justify-center rounded-lg underline font-semibold text-xs transition-all ${
                      activeFormats.u ? "bg-primary-600 text-white shadow-xs" : "text-neutral-700 hover:bg-white border border-transparent hover:border-neutral-200"
                    }`}
                    title="Underline (Ctrl+U)"
                  >
                    U
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFormatting("strikethrough", undefined, true)}
                    className={`w-7 h-7 flex items-center justify-center rounded-lg line-through font-bold text-xs transition-all ${
                      activeFormats.s ? "bg-primary-600 text-white shadow-xs" : "text-neutral-700 hover:bg-white border border-transparent hover:border-neutral-200"
                    }`}
                    title="Strikethrough"
                  >
                    S
                  </button>

                  <div className="h-4 w-px bg-neutral-300 mx-0.5"></div>

                  {/* Structure & Headings */}
                  <button
                    type="button"
                    onClick={() => applyFormatting("h", undefined, true)}
                    className={`w-7 h-7 flex items-center justify-center rounded-lg font-bold text-xs transition-all ${
                      activeFormats.h ? "bg-primary-600 text-white shadow-xs" : "text-neutral-700 hover:bg-white border border-transparent hover:border-neutral-200"
                    }`}
                    title="Heading Text"
                  >
                    H
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFormatting("bullet", undefined, true)}
                    className={`px-2 h-7 flex items-center justify-center rounded-lg font-bold text-xs transition-all gap-1 ${
                      activeFormats.bullet ? "bg-primary-600 text-white shadow-xs" : "text-neutral-700 hover:bg-white border border-transparent hover:border-neutral-200"
                    }`}
                    title="Bullet List"
                  >
                    <span>•</span>
                    <span className="text-[10px]">Bullet</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFormatting("number", undefined, true)}
                    className={`px-2 h-7 flex items-center justify-center rounded-lg font-bold text-xs transition-all gap-1 ${
                      activeFormats.number ? "bg-primary-600 text-white shadow-xs" : "text-neutral-700 hover:bg-white border border-transparent hover:border-neutral-200"
                    }`}
                    title="Numbered List"
                  >
                    <span>1.</span>
                    <span className="text-[10px]">Number</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFormatting("quote", undefined, true)}
                    className={`px-2 h-7 flex items-center justify-center rounded-lg font-bold text-xs transition-all gap-1 ${
                      activeFormats.quote ? "bg-primary-600 text-white shadow-xs" : "text-neutral-700 hover:bg-white border border-transparent hover:border-neutral-200"
                    }`}
                    title="Callout / Blockquote"
                  >
                    <span>💬</span>
                    <span className="text-[10px]">Quote</span>
                  </button>

                  <div className="h-4 w-px bg-neutral-300 mx-0.5"></div>

                  {/* Highlight & Text Colors */}
                  <button
                    type="button"
                    onClick={() => applyFormatting("highlight", undefined, true)}
                    className={`px-2 h-7 flex items-center justify-center rounded-lg font-bold text-xs transition-all gap-1 ${
                      activeFormats.highlight ? "bg-amber-400 text-amber-950 shadow-xs ring-2 ring-amber-300" : "bg-amber-100 text-amber-900 border border-amber-200 hover:bg-amber-200"
                    }`}
                    title="Highlight Sentence"
                  >
                    <span>🖌️</span>
                    <span className="text-[10px]">Highlight</span>
                  </button>

                  <div className="flex items-center gap-1 px-1 py-0.5 rounded-lg bg-white border border-neutral-200">
                    <button
                      type="button"
                      onClick={() => applyFormatting("color", "#dc2626", true)}
                      className="w-4 h-4 rounded-full bg-red-600 hover:scale-125 transition-transform shadow-2xs border border-white"
                      title="Red Text"
                    />
                    <button
                      type="button"
                      onClick={() => applyFormatting("color", "#16a34a", true)}
                      className="w-4 h-4 rounded-full bg-emerald-600 hover:scale-125 transition-transform shadow-2xs border border-white"
                      title="Green Text"
                    />
                    <button
                      type="button"
                      onClick={() => applyFormatting("color", "#2563eb", true)}
                      className="w-4 h-4 rounded-full bg-blue-600 hover:scale-125 transition-transform shadow-2xs border border-white"
                      title="Blue Text"
                    />
                    <button
                      type="button"
                      onClick={() => applyFormatting("color", "#ea580c", true)}
                      className="w-4 h-4 rounded-full bg-orange-600 hover:scale-125 transition-transform shadow-2xs border border-white"
                      title="Orange Text"
                    />
                    <button
                      type="button"
                      onClick={() => applyFormatting("color", "#9333ea", true)}
                      className="w-4 h-4 rounded-full bg-purple-600 hover:scale-125 transition-transform shadow-2xs border border-white"
                      title="Purple Text"
                    />
                    <button
                      type="button"
                      onClick={() => applyFormatting("color", "#1e293b", true)}
                      className="w-4 h-4 rounded-full bg-slate-800 hover:scale-125 transition-transform shadow-2xs border border-white"
                      title="Dark Slate Text"
                    />
                  </div>

                  <div className="h-4 w-px bg-neutral-300 mx-0.5"></div>

                  {/* Text Alignment */}
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => applyFormatting("align_left", undefined, true)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-xs text-neutral-600 hover:bg-white border border-transparent hover:border-neutral-200"
                      title="Align Left"
                    >
                      ⬅️
                    </button>
                    <button
                      type="button"
                      onClick={() => applyFormatting("align_center", undefined, true)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-xs text-neutral-600 hover:bg-white border border-transparent hover:border-neutral-200"
                      title="Align Center"
                    >
                      ↔️
                    </button>
                    <button
                      type="button"
                      onClick={() => applyFormatting("align_right", undefined, true)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-xs text-neutral-600 hover:bg-white border border-transparent hover:border-neutral-200"
                      title="Align Right"
                    >
                      ➡️
                    </button>
                  </div>

                  <div className="h-4 w-px bg-neutral-300 mx-0.5"></div>

                  {/* Insert & Tools */}
                  <button
                    type="button"
                    onClick={() => applyFormatting("link", undefined, true)}
                    className="px-2 h-7 flex items-center justify-center rounded-lg font-bold text-xs text-neutral-700 bg-white border border-neutral-200 hover:bg-neutral-100 transition-all gap-1 shadow-2xs"
                    title="Insert Hyperlink"
                  >
                    <span>🔗</span>
                    <span className="text-[10px]">Link</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => applyFormatting("hr", undefined, true)}
                    className="px-1.5 h-7 flex items-center justify-center rounded-lg text-xs font-bold text-neutral-600 hover:bg-white border border-transparent hover:border-neutral-200"
                    title="Insert Horizontal Divider Line"
                  >
                    ➖ Line
                  </button>

                  <button
                    type="button"
                    onClick={() => applyFormatting("clear", undefined, true)}
                    className="px-1.5 h-7 flex items-center justify-center rounded-lg text-xs text-neutral-500 hover:text-neutral-800 hover:bg-neutral-200 transition-all"
                    title="Clear Formatting"
                  >
                    🧹
                  </button>

                  <div className="h-4 w-px bg-neutral-300 mx-0.5"></div>

                  {/* Table Suite */}
                  <button
                    type="button"
                    onClick={() => applyFormatting("table", undefined, true)}
                    className="px-2.5 rounded-lg font-bold text-xs text-primary-700 bg-primary-50 border border-primary-200 hover:bg-primary-100 transition-all gap-1 h-7 flex items-center shadow-2xs"
                    title="Insert Table"
                  >
                    <span>📊</span>
                    <span className="text-[10px] font-bold">Table</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFormatting("add_row", undefined, true)}
                    className="px-2 rounded-lg font-semibold text-xs text-neutral-700 bg-white border border-neutral-200 hover:bg-neutral-100 transition-all h-7 flex items-center shadow-2xs"
                    title="Add Row"
                  >
                    <span className="text-xs">+Row</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFormatting("add_col", undefined, true)}
                    className="px-2 rounded-lg font-semibold text-xs text-neutral-700 bg-white border border-neutral-200 hover:bg-neutral-100 transition-all h-7 flex items-center shadow-2xs"
                    title="Add Column"
                  >
                    <span className="text-xs">+Col</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFormatting("del_table", undefined, true)}
                    className="px-2 rounded-lg font-semibold text-xs text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 transition-all h-7 flex items-center"
                    title="Delete Table"
                  >
                    <span className="text-xs">🗑️</span>
                  </button>
                </div>

                <div
                  ref={editEditableRef}
                  contentEditable
                  onInput={(e) => setEditMessage(e.currentTarget.innerHTML)}
                  onBlur={(e) => setEditMessage(e.currentTarget.innerHTML)}
                  onKeyUp={updateActiveFormats}
                  onMouseUp={updateActiveFormats}
                  className="w-full min-h-[120px] rounded-xl border border-neutral-300 bg-white p-3.5 text-sm text-neutral-800 focus:border-primary-600 focus:ring-2 focus:ring-primary-100 outline-none transition-all font-medium overflow-y-auto format-message"
                  data-placeholder="Message..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-600 uppercase tracking-wider mb-2">
                  Target Audience
                </label>
                <select
                  value={editTargetRole}
                  onChange={(e) => setEditTargetRole(e.target.value)}
                  className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm text-neutral-800 focus:border-primary-600 focus:ring-2 focus:ring-primary-100 outline-none transition-all font-medium"
                >
                  <option value="all">📢 Everyone</option>
                  <option value="employee">👥 Employees Only</option>
                  <option value="manager">👔 Managers Only</option>
                </select>
              </div>

              {/* Image Preview & Upload */}
              <div>
                <label className="block text-xs font-bold text-neutral-600 uppercase tracking-wider mb-2">
                  Image Attachment (Optional)
                </label>
                {editImagePreview ? (
                  <div className="relative inline-block rounded-xl overflow-hidden border border-neutral-200 shadow-sm max-w-[200px] group cursor-pointer">
                    <img
                      src={editImagePreview}
                      className="w-full h-auto object-cover max-h-[140px] group-hover:scale-105 transition-transform"
                      alt="Edit Preview"
                      onClick={() => setViewerImage({ url: editImagePreview, title: editTitle || "Attachment Preview" })}
                    />
                    <button
                      type="button"
                      onClick={() => { setEditImageUrl(""); setEditImagePreview(""); }}
                      className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/60 hover:bg-black/85 text-white transition-colors"
                      title="Remove Image"
                    >
                      <XMarkIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div>
                    <button
                      type="button"
                      onClick={() => editFileInputRef.current?.click()}
                      className="px-4 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-semibold transition-colors"
                    >
                      📷 Change / Upload Image
                    </button>
                    <input
                      type="file"
                      ref={editFileInputRef}
                      onChange={(e) => handleImageUpload(e, true)}
                      accept="image/*"
                      className="hidden"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 bg-neutral-50/80 border-t border-neutral-100 flex-shrink-0">
              <button
                onClick={() => setEditingPost(null)}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-neutral-600 hover:bg-neutral-200/60 transition-colors"
              >
                Cancel
              </button>
              <Button
                loading={isSavingEdit}
                onClick={handleSaveEdit}
                disabled={!editTitle.trim() || !editMessage.trim()}
                className="rounded-xl px-5 py-2 font-semibold shadow-md"
              >
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Close Poll Confirmation Modal */}
      {showClosePollConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-neutral-100 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center gap-3 mb-4 text-red-600">
              <div className="p-2.5 rounded-full bg-red-100">
                <span className="text-lg">🔒</span>
              </div>
              <h3 className="text-lg font-bold text-neutral-900">Close Poll Now?</h3>
            </div>
            <p className="text-sm text-neutral-600 mb-6 font-medium">
              Closing this poll will immediately end voting. Employees will not be able to vote after this action.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowClosePollConfirm(null)}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-neutral-600 hover:bg-neutral-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (showClosePollConfirm) {
                    handleClosePoll(showClosePollConfirm);
                  }
                }}
                className="px-5 py-2 rounded-xl text-sm font-semibold bg-red-600 hover:bg-red-700 text-white shadow-md transition-colors"
              >
                Close Poll
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Extend Poll Modal */}
      {showExtendPollModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-neutral-100 overflow-hidden animate-in fade-in zoom-in duration-150">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 bg-neutral-50/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-primary-50 text-primary-600">
                  <span className="text-lg">⏱️</span>
                </div>
                <div>
                  <h3 className="font-bold text-neutral-800 text-base">Extend Poll</h3>
                  <p className="text-xs text-neutral-500">Add more time for voting</p>
                </div>
              </div>
              <button
                onClick={() => setShowExtendPollModal(null)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-600 uppercase tracking-wider mb-3">
                  Extend by (days)
                </label>
                <div className="flex gap-2">
                  {[1, 3, 7, 14, 30].map(days => (
                    <button
                      key={days}
                      onClick={() => setExtendDays(days)}
                      className={`flex-1 px-3 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                        extendDays === days
                          ? "bg-primary-600 text-white border border-primary-600"
                          : "bg-neutral-100 text-neutral-700 border border-neutral-200 hover:bg-neutral-200"
                      }`}
                    >
                      {days}d
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-600 uppercase tracking-wider mb-2">
                  Or Enter Custom Days
                </label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={extendDays}
                  onChange={(e) => setExtendDays(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm text-neutral-800 focus:border-primary-600 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
                  placeholder="Number of days..."
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 bg-neutral-50/80 border-t border-neutral-100">
              <button
                onClick={() => setShowExtendPollModal(null)}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-neutral-600 hover:bg-neutral-200/60 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleExtendPoll(showExtendPollModal)}
                className="px-5 py-2 rounded-xl text-sm font-semibold bg-primary-600 hover:bg-primary-700 text-white shadow-md transition-colors"
              >
                Extend Poll
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-neutral-100 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center gap-3 mb-4 text-red-600">
              <div className="p-2.5 rounded-full bg-red-100">
                <TrashIcon className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-neutral-900">Delete Announcement</h3>
            </div>
            <p className="text-sm text-neutral-600 mb-6 font-medium">
              Are you sure you want to delete this announcement? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-neutral-600 hover:bg-neutral-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteAction}
                className="px-5 py-2 rounded-xl text-sm font-semibold bg-red-600 hover:bg-red-700 text-white shadow-md transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Insert Hyperlink Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-neutral-100 overflow-hidden animate-in fade-in zoom-in duration-150">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 bg-neutral-50/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <span className="text-lg">🔗</span>
                </div>
                <div>
                  <h3 className="font-bold text-neutral-800 text-base">Insert Hyperlink</h3>
                  <p className="text-xs text-neutral-500">Add a website or document URL</p>
                </div>
              </div>
              <button
                onClick={() => setShowLinkModal(false)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-600 uppercase tracking-wider mb-2">
                  Link URL *
                </label>
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm text-neutral-800 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all font-medium"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-600 uppercase tracking-wider mb-2">
                  Display Text (Optional)
                </label>
                <input
                  type="text"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  placeholder="e.g. View Document / Policy Link"
                  className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm text-neutral-800 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all font-medium"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 bg-neutral-50/80 border-t border-neutral-100">
              <button
                onClick={() => setShowLinkModal(false)}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-neutral-600 hover:bg-neutral-200/60 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleInsertLink}
                className="px-5 py-2 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-colors"
              >
                Insert Link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox / Image Viewer Modal */}
      <ImageViewerModal
        isOpen={!!viewerImage}
        onClose={() => setViewerImage(null)}
        imageUrl={viewerImage?.url || ""}
        title={viewerImage?.title}
        altText={viewerImage?.title}
      />
    </div>
  );
};

export default AnnouncementsPage;
