import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  QuestionMarkCircleIcon,
  ChevronDownIcon,
  MagnifyingGlassIcon,
  ClockIcon,
  CalendarDaysIcon,
  BuildingOfficeIcon,
  UserCircleIcon,
  ShieldCheckIcon,
  ChatBubbleLeftRightIcon,
  PaperAirplaneIcon,
  EnvelopeIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
  PencilIcon
} from '@heroicons/react/24/outline';
import { useAuthStore } from '../store/authStore';
import { BASE_API_URL } from '../config/api';

const BASE_URL = `${BASE_API_URL}/api`;

interface FAQItem {
  id: number;
  question: string;
  answer: string;
  category: 'attendance' | 'leaves' | 'office' | 'performance' | 'support';
  isCustom?: boolean;
  created_by?: string;
}

const FAQ_DATA: FAQItem[] = [
  // --- PeopleHub Core Info ---
  {
    id: 999,
    category: 'attendance',
    question: 'What is PeopleHub and how does it replace Pathfinder?',
    answer: 'PeopleHub is the centralized Employee Management and Attendance Tracking system for S4Carlisle. It completely replaces the older Pathfinder system. Crucially, ONLY the attendance logged inside PeopleHub is considered for monthly payroll processing and salary credits. Make sure to check in and check out daily on PeopleHub to ensure your attendance and payroll calculations are accurate.'
  },
  {
    id: 1000,
    category: 'attendance',
    question: 'What are the core processes and features available in PeopleHub?',
    answer: 'PeopleHub manages the entire employee lifecycle and daily operations from top to bottom. The key processes include:\n\n1. Daily Attendance (Check-In/Out): Click "Check In" on your dashboard to select your shift and work mode (Office/WFH). Use break trackers (Lunch/Tea) to pause/resume the timer. Click "Check Out" at the end of the shift.\n\n2. Hybrid / Work From Home (WFH): Toggle work mode directly during check-in to apply for today\'s WFH without visiting the requests page. For past/future dates, submit a WFH request under "Requests".\n\n3. One Day Wages (ODW): Claim extra wages when working on weekends/public holidays either in real-time on check-in or by clicking the blue holiday block on your "Attendance" calendar.\n\n4. Leaves & Regularization: Apply for leaves, regularization (missed punches), and late entry/early exit permissions under the "Attendance" tab.\n\n5. Shift Requests: Request shift timing changes in the "Shift" tab.\n\n6. Appraisal & Payroll: Access monthly salary slips, check tax details, download forms, and complete self-appraisals under the "Appraisal" and "Payroll" tabs.'
  },
  // --- Attendance ---
  {
    id: 1,
    category: 'attendance',
    question: 'How do I check in or check out?',
    answer: 'Navigate to your Employee Dashboard and click the "Check In" button. A modal will appear where you can select your shift timing and work mode (e.g., Office or WFH). Once confirmed, your daily work timer starts. When your workday is complete, click the "Check Out" button to end your timer and register your hours.'
  },
  {
    id: 101,
    category: 'attendance',
    question: 'If I am in Hybrid mode, how do I apply for WFH?',
    answer: 'For today\'s work, you do not need to go to the WFH request page. Just click "Check In" on your dashboard, toggle the work mode to "WFH", and confirm. You only need to use the WFH request page under the "Requests" tab for future dates or to correct past dates.'
  },
  {
    id: 2,
    category: 'attendance',
    question: 'How do break timers (Lunch & Tea) work?',
    answer: 'While checked in, you will see buttons to start a "Lunch Break" or "Tea Break". Clicking these pauses your active working hours tracker and logs your break duration. When you return, click "Stop Break" to resume tracking your working hours. The system automatically subtracts breaks from your total hours.'
  },
  {
    id: 3,
    category: 'attendance',
    question: 'What is the session inactivity timeout?',
    answer: 'For security reasons, if there is no movement or interaction (such as mouse movement, clicks, scrolling, or keystrokes) on the site for 15 minutes, your session will automatically expire, and the system will log you out. Any activity resets this timer.'
  },
  {
    id: 4,
    category: 'attendance',
    question: 'What are the standard office timings?',
    answer: 'Standard working hours for the General Shift are from 09:00 AM to 06:00 PM. Employees are expected to log a minimum of 9 working hours per day. If logged working hours are below 9 hours, it will be considered as a half day.'
  },
  {
    id: 19,
    category: 'attendance',
    question: 'Can I check in when working from home (WFH)?',
    answer: 'Yes. When you click "Check In", a work mode selection modal will appear. Choose "WFH" (Work From Home) and select your shift timing. Your timer will start normally and the day will be recorded as a WFH day in your attendance history.'
  },
  {
    id: 20,
    category: 'attendance',
    question: 'What happens if I forget to check out?',
    answer: 'If you forget to check out, the system will flag that day and show a "Provide Clarification" prompt the next working day. You will need to enter the actual time you stopped working so your manager can review and approve it. Until approved, those hours will remain unconfirmed in your record.'
  },

  // --- Leaves & Regularization ---
  {
    id: 5,
    category: 'leaves',
    question: 'How do I apply for leave?',
    answer: 'Navigate to the "My Requests" tab in the sidebar navigation, then click the "Apply Leave" button. Select the start and end dates, leave type (CL/SL, Loss of Pay, etc.), leave duration (Full Day, First/Second Half), confirm your reporting manager, add a reason, and click submit. You will receive a notification once approved or rejected.'
  },
  {
    id: 6,
    category: 'leaves',
    question: 'What is a clarification/regularization request and when do I submit one?',
    answer: 'If you forgot to check in or out yesterday, the system will mark that day as needing clarification. Click "Provide Clarification" on that specific day in your dashboard. You will be prompted to enter your actual check-in and check-out times, which are sent to your manager for approval. Once approved, your daily record will update automatically.'
  },
  {
    id: 7,
    category: 'leaves',
    question: 'What do the colors on the Attendance Calendar represent?',
    answer: 'The calendar uses color codes to identify your daily status:\n• Green: Present (Full Day worked)\n• Yellow/Light Green: Half Day worked\n• Red: Absent\n• Blue: Weekly Off or Public Holiday\n• Yellow/Orange outline: Clarification/Regularization request is pending manager review.'
  },
  {
    id: 8,
    category: 'leaves',
    question: 'How do I apply for One Day Wages (ODW)?',
    answer: 'There are two ways to apply for One Day Wages (ODW) depending on the date:\n\n• For Today (Current Day): Click "Check In" on your dashboard. When prompted "Consider as One Day Wages?", click "Yes, Request" to submit and check in.\n\n• For Past Dates (Claiming after the fact): Go to the "Attendance" tab, click on the specific Weekend or Public Holiday (Blue block) on your attendance calendar, fill in your "Reason for Claiming One Day Wages" in the details panel, and click "Claim One Day Wages".'
  },
  {
    id: 9,
    category: 'leaves',
    question: 'How long does it take for leave and shift requests to be approved?',
    answer: 'Reporting managers and HR strive to review all leave, shift changes, and regularization requests within 24 to 48 business hours. If your request is urgent, please follow up with your manager directly.'
  },
  {
    id: 10,
    category: 'leaves',
    question: 'How do I request a Permission (Late Entry / Early Exit)?',
    answer: 'Navigate to the "My Requests" tab in the sidebar navigation, click the "Permissions" sub-tab, and click the "Apply Permission" button. Select the date, choose the From/To times, select your reporting manager, add a reason, and submit.'
  },
  {
    id: 11,
    category: 'leaves',
    question: 'How do I apply for a Shift Change?',
    answer: 'Navigate to the "My Requests" tab in the sidebar navigation, click the "Shift" sub-tab, then click the "Request Shift Change" button. Select the date range, choose your requested shift timings, select your reporting manager, add a reason, and submit it for manager review.'
  },
  {
    id: 12,
    category: 'leaves',
    question: 'If I was absent on a past date, how do I apply for a leave to cover it?',
    answer: 'Go to the leave application form, select the past date (the day you were absent) as both the Start Date and End Date, choose the type of leave (Casual, Sick, or LOP), and submit the request. Once approved by your manager, the status for that past day will automatically update from "Absent" to "Leave".'
  },
  {
    id: 21,
    category: 'leaves',
    question: 'How do I check my remaining leave balance?',
    answer: 'Navigate to the "Attendance" tab and scroll to the Leave section. Your current leave balance (Casual Leave, Sick Leave, etc.) is displayed at the top of the section showing how many days are used and how many remain for the year.'
  },
  {
    id: 22,
    category: 'leaves',
    question: 'Can I cancel a leave request after submitting it?',
    answer: 'Yes, as long as your request is still in "Pending" status (not yet approved), you can cancel it from the Leave section in the Attendance tab. Once a leave is approved, you will need to contact your manager or HR to cancel it manually.'
  },
  {
    id: 23,
    category: 'leaves',
    question: 'What happens if my manager rejects my leave request?',
    answer: 'You will receive a notification when your leave request is rejected. Your leave balance will not be deducted, and the rejected days will revert to their original attendance status. You may re-apply with an updated reason or discuss with your manager directly.'
  },

  // --- Office Tools ---
  {
    id: 13,
    category: 'office',
    question: "How do I find a colleague's contact number or extension?",
    answer: 'Navigate to the "Intercom Directory" tab from the sidebar. You can search by name, department, or extension to find contact details and intercom extensions of any employee instantly.'
  },
  {
    id: 14,
    category: 'office',
    question: 'How can I book a meeting room?',
    answer: 'Navigate to the "Meeting Rooms" page from the sidebar. Select a room, choose an available time slot, fill in the meeting title/description, and submit the booking. You can view existing bookings to avoid conflicts.'
  },
  {
    id: 24,
    category: 'office',
    question: 'How do I view company announcements?',
    answer: 'Click on "Announcements" in the navigation sidebar. Here you will find all official notices, policy updates, events, and company-wide messages posted by HR and management. Unread announcements are highlighted so you do not miss anything important.'
  },

  // --- Performance & Profile ---
  {
    id: 15,
    category: 'performance',
    question: 'How do I submit my performance appraisal self-evaluation?',
    answer: 'Navigate to the "Appraisal" page from the sidebar. Select the active appraisal cycle, click on your self-evaluation form, answer the performance questions, and click submit. It will go to your manager for their evaluation.'
  },
  {
    id: 16,
    category: 'performance',
    question: 'How do I update my profile details?',
    answer: 'Navigate to your Profile tab (top right avatar or profile menu) and click "Edit Details". Once you save the updates, some sensitive fields (such as Bank Details or DOB) might require HR approval before they are officially updated.'
  },
  {
    id: 17,
    category: 'performance',
    question: 'How do I submit claims for travel, internet, or phone bills?',
    answer: 'To submit reimbursement claims, please contact the HR or Finance team directly with the supportive invoices. Online reimbursement processing is currently under development and will launch in an upcoming release.'
  },
  {
    id: 25,
    category: 'performance',
    question: 'How do I view or download my payslip?',
    answer: 'Navigate to your Profile tab and select the "Payslip" or "Salary" section. You can view monthly payslips and download them as PDF. If your payslip is missing or shows incorrect details, please contact your HR team.'
  },


  // --- Support & Troubleshooting ---
  {
    id: 27,
    category: 'support',
    question: 'My biometric punch time is different from my actual check-in time. What do I do?',
    answer: 'Biometric card punch times are automatically synced into the system. If there is a mismatch (e.g., the card reader showed a different time than when you actually arrived), submit a clarification/regularization request for that date with your correct check-in and check-out times. Your manager will review and approve the corrected timings.'
  },
  {
    id: 18,
    category: 'support',
    question: 'What should I do if the portal encounters an error or behaves unexpectedly?',
    answer: 'If you encounter slow page loads, unresponsive buttons, or discrepancies in your active timer or check-in buttons, please follow these troubleshooting steps:\n\n1. **Hard Refresh**: Force your browser to reload with the latest files and clear caches. Press **Ctrl + Shift + R** (Windows/Linux) or **Cmd + Shift + R** (Mac).\n2. **Log Out & Log In**: Click your profile icon, click "Logout", and sign back in. This clears old browser tokens and re-establishes live websocket connections.\n3. **Contact Manager / Support**: If the issue persists, take a screenshot of the error and contact your Reporting Manager or the HR/IT support team directly.'
  },
  {
    id: 28,
    category: 'attendance',
    question: 'Is there a grace period for daily check-in times?',
    answer: 'Yes, a standard 15-minute grace period is allowed for General Shift check-ins. If your shift starts at 09:00 AM, you can check in up to 09:15 AM without being flagged as late. However, you must still log a total of 8 working hours for the day.'
  },
  {
    id: 29,
    category: 'attendance',
    question: 'Can I check in multiple times on the same day?',
    answer: 'No, you can only check in once per day. Checking in starts a single daily work timer. If you need to exit early and check in again, or if you accidentally checked out, do not worry—simply check out and submit a "Clarification/Regularization" request for the missing hours to your manager.'
  },
  {
    id: 30,
    category: 'leaves',
    question: 'What is the "Sandwich Leave Rule" and how does it affect me?',
    answer: 'The Sandwich Leave Rule states that if you take LOP (unpaid) or Casual leaves on both the day preceding a weekend/holiday (e.g. Friday) and the day following it (e.g. Monday), the intermediate non-working days (Saturday and Sunday) will also be treated as leave days and deducted from your balance.'
  },
  {
    id: 31,
    category: 'leaves',
    question: 'When do my monthly permission hours refresh?',
    answer: 'Permission hours auto-refresh back to 2.0 hours for all employees on the 25th of every month at 00:01 AM. Unused permission hours from the previous cycle do not carry over to the next month.'
  },
  {
    id: 32,
    category: 'leaves',
    question: 'Can I apply for WFH (Work From Home) mode for past dates?',
    answer: 'Yes. If you worked from home on a past date but forgot to set your mode, submit a "Requests" -> "Apply Shift/Work Mode" or regularization request specifying the date, select "WFH" mode, and provide a reason for your manager to approve.'
  },
  {
    id: 33,
    category: 'performance',
    question: 'Can I edit my performance appraisal form after I have submitted it?',
    answer: 'No, once you click "Submit", your appraisal self-evaluation is locked and forwarded to your manager. If you made a mistake and need to edit it, please ask your manager to "Send Back" the evaluation form to your queue from their dashboard.'
  },
  {
    id: 34,
    category: 'leaves',
    question: 'What is the date range for the monthly payroll cycle?',
    answer: 'Our payroll cycle runs from the 25th of the previous month to the 24th of the current month. For example, October payroll calculates attendance and leaves between September 25th and October 24th. Stored payable days are calculated from confirmations during this period.'
  },
  {
    id: 35,
    category: 'support',
    question: 'Who should I contact if my monthly leave balance is incorrect?',
    answer: 'If you notice a discrepancy in your Casual, Sick, or Permission balances that does not align with your approved requests, please email HR directly at hr.chennai@s4carlisle.com with your Employee ID and a description of the issue.'
  }
];

export const FAQPage: React.FC = () => {
  const { user } = useAuthStore();
  const normalizedRole = `${user?.access_level || user?.role || ""}`.toLowerCase();
  const isHR = normalizedRole.includes("hr") || normalizedRole.includes("admin") || normalizedRole.includes("super") || normalizedRole.includes("human");

  const [employeeDetails, setEmployeeDetails] = useState<any>(null);
  
  useEffect(() => {
    const fetchEmpDetails = async () => {
      const empId = localStorage.getItem("employee_id");
      if (empId) {
        try {
          const token = localStorage.getItem("token");
          const headers = token ? { Authorization: `Bearer ${token}` } : {};
          const res = await axios.get(`${BASE_URL}/employees/${empId}`, { headers });
          if (res.data) {
            setEmployeeDetails(res.data);
          }
        } catch (e) {
          console.error("Error fetching employee details in FAQPage:", e);
        }
      }
    };
    fetchEmpDetails();
  }, []);

  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // FAQ Helpfulness Voting State
  const [votes, setVotes] = useState<Record<number, 'yes' | 'no'>>({});
  const handleVote = (faqId: number, type: 'yes' | 'no') => {
    setVotes(prev => ({ ...prev, [faqId]: type }));
  };

  // Reset page to 1 on filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeCategory]);

  // ── Custom FAQ (HR-managed) state ─────────────────────────────────────────
  const [customFAQs, setCustomFAQs] = useState<FAQItem[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingFAQ, setEditingFAQ] = useState<FAQItem | null>(null);
  const [addForm, setAddForm] = useState({ question: '', answer: '', category: 'support' as FAQItem['category'] });
  const [addLoading, setAddLoading] = useState(false);

  const fetchCustomFAQs = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.get(`${BASE_URL}/faq/`, { headers });
      const data: any[] = res.data || [];
      setCustomFAQs(data.map(item => ({
        id: 10000 + item.id, // offset so IDs don't clash with static FAQ_DATA
        question: item.question,
        answer: item.answer,
        category: item.category as FAQItem['category'],
        isCustom: true,
        created_by: item.created_by,
      })));
    } catch { /* silent */ }
  };

  useEffect(() => { fetchCustomFAQs(); }, []);

  const handleAddFAQ = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.question.trim() || !addForm.answer.trim()) {
      toast.error('Please fill in both question and answer.');
      return;
    }
    setAddLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await axios.post(`${BASE_URL}/faq/`, {
        question: addForm.question.trim(),
        answer: addForm.answer.trim(),
        category: addForm.category,
        created_by: user?.full_name || 'HR Team',
      }, { headers });
      toast.success('FAQ added successfully!');
      setAddForm({ question: '', answer: '', category: 'support' });
      setShowAddModal(false);
      fetchCustomFAQs();
    } catch {
      toast.error('Failed to add FAQ. Please try again.');
    } finally {
      setAddLoading(false);
    }
  };

  const handleDeleteCustomFAQ = async (customItemId: number) => {
    // customItemId is offset by 10000; real DB id = customItemId - 10000
    const realId = customItemId - 10000;
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await axios.delete(`${BASE_URL}/faq/${realId}`, { headers });
      toast.success('FAQ removed.');
      fetchCustomFAQs();
    } catch {
      toast.error('Failed to remove FAQ.');
    }
  };

  // Scroll to HR Form Reference
  const hrFormRef = useRef<HTMLDivElement>(null);
  const scrollToHrForm = () => {
    hrFormRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Contact HR Form State
  const [hrForm, setHrForm] = useState({
    subject: 'Attendance Issues',
    empId: '',
    message: ''
  });
  const [isHrDrafting, setIsHrDrafting] = useState(false);

  const handleDraftEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hrForm.message.trim()) {
      alert("Please enter details of your query before drafting the email!");
      return;
    }
    
    setIsHrDrafting(true);
    const subjectLine = encodeURIComponent(`[PeopleHub Query] - ${hrForm.subject} (Emp ID: ${hrForm.empId || 'Not Provided'})`);
    const emailBody = encodeURIComponent(
      `Dear HR Team,\n\nI am writing to raise a query regarding my ${hrForm.subject} on the PeopleHub portal.\n\nDetails of my query:\n${hrForm.message}\n\nEmployee ID: ${hrForm.empId || 'Not Provided'}\nSubmitted on: ${new Date().toLocaleDateString()}\n\nBest regards,\n(Sent via PeopleHub FAQ Helpdesk)`
    );
    
    const outlookWebUrl = `https://outlook.office.com/mail/deeplink/compose?to=hr.chennai@s4carlisle.com&subject=${subjectLine}&body=${emailBody}`;
    window.open(outlookWebUrl, '_blank');
    
    setTimeout(() => {
      setIsHrDrafting(false);
    }, 1550);
  };

  const toggleAccordion = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const allFAQs: FAQItem[] = [...FAQ_DATA, ...customFAQs];

  const categories = [
    { id: 'all', name: 'All Topics', icon: QuestionMarkCircleIcon, count: allFAQs.length, color: 'text-violet-500 bg-violet-50 border-violet-100' },
    { id: 'attendance', name: 'Daily Attendance', icon: ClockIcon, count: allFAQs.filter(f => f.category === 'attendance').length, color: 'text-emerald-500 bg-emerald-50 border-emerald-100' },
    { id: 'leaves', name: 'Leaves & Overtime', icon: CalendarDaysIcon, count: allFAQs.filter(f => f.category === 'leaves').length, color: 'text-amber-500 bg-amber-50 border-amber-100' },
    { id: 'office', name: 'Office Tools', icon: BuildingOfficeIcon, count: allFAQs.filter(f => f.category === 'office').length, color: 'text-indigo-500 bg-indigo-50 border-indigo-100' },
    { id: 'performance', name: 'Performance & Profile', icon: UserCircleIcon, count: allFAQs.filter(f => f.category === 'performance').length, color: 'text-rose-500 bg-rose-50 border-rose-100' },
    { id: 'support', name: 'Help & Support', icon: ShieldCheckIcon, count: allFAQs.filter(f => f.category === 'support').length, color: 'text-sky-500 bg-sky-50 border-sky-100' }
  ];

  const handleStartEdit = (faq: FAQItem) => {
    setEditingFAQ(faq);
    setAddForm({
      question: faq.question,
      answer: faq.answer,
      category: faq.category
    });
    setShowAddModal(true);
  };

  const handleSaveFAQ = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.question.trim() || !addForm.answer.trim()) {
      toast.error('Please fill in both question and answer.');
      return;
    }
    setAddLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      if (editingFAQ) {
        // Edit Mode
        const realId = editingFAQ.id - 10000;
        await axios.put(`${BASE_URL}/faq/${realId}`, {
          question: addForm.question.trim(),
          answer: addForm.answer.trim(),
          category: addForm.category
        }, { headers });
        toast.success('FAQ updated successfully!');
      } else {
        // Add Mode
        await axios.post(`${BASE_URL}/faq/`, {
          question: addForm.question.trim(),
          answer: addForm.answer.trim(),
          category: addForm.category,
          created_by: user?.full_name || 'HR Team',
        }, { headers });
        toast.success('FAQ added successfully!');
      }

      setAddForm({ question: '', answer: '', category: 'support' });
      setEditingFAQ(null);
      setShowAddModal(false);
      fetchCustomFAQs();
    } catch {
      toast.error('Failed to save FAQ. Please try again.');
    } finally {
      setAddLoading(false);
    }
  };

  const filteredFAQs = allFAQs.filter((faq) => {
    const matchesSearch = 
      faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory === 'all' || faq.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const totalPages = Math.ceil(filteredFAQs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedFAQs = filteredFAQs.slice(startIndex, startIndex + itemsPerPage);

  // Chatbot State
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'bot'; text: string; timestamp: Date; suggestions?: Array<{ id: number; question: string }> }>>([
    {
      sender: 'bot',
      text: "Hello! 👋 I am your 'How can I Help Today' assistant. I can answer S4Carlisle guidelines, check-in errors, leave rules, and appraisal questions in real-time.\n\nAsk me anything!",
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  // Dynamic search matching with Conversational AI wrappers
  const findAnswer = (query: string) => {
    const cleanQuery = query.toLowerCase().trim();
    if (!cleanQuery) return null;

    // Personal Role / Designation Query
    if (cleanQuery.includes('role') || cleanQuery.includes('designation')) {
      if (employeeDetails) {
        return {
          type: 'direct',
          text: `Your active designation in S4Carlisle is **${employeeDetails.designation || 'Not Configured'}** under the **${employeeDetails.department || 'Not Configured'}** department.\n\n*Access Level: ${user?.access_level || 'User'}*`
        };
      }
      return {
        type: 'direct',
        text: `Your active role in the system is **${user?.role || 'User'}** with access level **${user?.access_level || 'Default'}**.`
      };
    }

    // Personal DOB Query
    if (cleanQuery.includes('dob') || cleanQuery.includes('date of birth') || cleanQuery.includes('birth date')) {
      if (employeeDetails && employeeDetails.dob) {
        const dobDate = new Date(employeeDetails.dob);
        const formattedDob = dobDate.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
        return {
          type: 'direct',
          text: `Your Date of Birth (DOB) registered in our records is **${formattedDob}**.`
        };
      }
      return {
        type: 'direct',
        text: "We couldn't retrieve your Date of Birth. Please check the **Profile** tab in your dashboard or contact HR if this is missing."
      };
    }

    // Personal Joining Date / Days Ago Query
    if (cleanQuery.includes('join') || cleanQuery.includes('doj') || cleanQuery.includes('joining date') || cleanQuery.includes('when did i')) {
      if (employeeDetails && employeeDetails.joining_date) {
        const joinDate = new Date(employeeDetails.joining_date);
        const today = new Date();
        const diffTime = Math.abs(today.getTime() - joinDate.getTime());
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const formattedDoj = joinDate.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
        return {
          type: 'direct',
          text: `You joined S4Carlisle on **${formattedDoj}**. That was exactly **${diffDays} days ago**! 🚀`
        };
      }
      return {
        type: 'direct',
        text: "We couldn't retrieve your joining date. Please check your **Profile** tab or contact HR to verify your employment records."
      };
    }

    // 1. Handle Greetings & Small Talk
    const greetings = ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening', 'hi there'];
    if (greetings.includes(cleanQuery)) {
      return {
        type: 'direct',
        text: "Hello! 👋 I am the 'How can I Help Today' assistant. I'm here in real-time to help you. How can I assist you with your attendance, leaves, shift requests, or payroll today?"
      };
    }

    // PeopleHub Core Explanation & Full Process
    if (cleanQuery.includes('peoplehub') || cleanQuery.includes('explain peoplehub') || cleanQuery.includes('what is peoplehub') || cleanQuery.includes('pathfinder')) {
      return {
        type: 'direct',
        text: "### Welcome to PeopleHub! 🏢✨\n\n**PeopleHub** is S4Carlisle's official centralized Employee Management and Attendance Tracking portal, **fully replacing the older Pathfinder system**.\n\n> [!IMPORTANT]\n> **Payroll Dependency**: ONLY the attendance records registered inside PeopleHub are used for monthly payroll calculations, salary credits, and LOP tracking. Attendance from the old Pathfinder system is no longer considered.\n\n---\n\n### 📝 Core Processes & How to Apply (Step-by-Step):\n\n#### 1. Daily Attendance (Check-In/Out)\n* **Check-In**: Click **\"Check In\"** at the top of your Employee Dashboard. Select your shift timing and work mode (Office / WFH).\n* **Breaks**: Use **\"Lunch Break\"** or **\"Tea Break\"** trackers during the day to pause/resume the timer.\n* **Check-Out**: Click **\"Check Out\"** at the end of your shift to submit your daily hours.\n\n#### 2. Hybrid Mode / WFH Check-In\n* **Today's WFH**: Simply click **\"Check In\"** on your dashboard, toggle the work mode switch to **\"WFH\"**, and click confirm. No need to visit the WFH request page!\n* **Past/Future WFH**: Go to the **Requests** tab and click **\"Request WFH\"**.\n\n#### 3. One Day Wages (ODW)\n* **Today**: A pop-up asks **\"Consider as One Day Wages?\"** when checking in on weekends/holidays. Click **\"Yes, Request\"**.\n* **Past Days**: Go to **Attendance**, click on the specific **Weekend/Holiday** (marked in **Blue**), fill in the reason, and click **\"Claim One Day Wages\"**.\n\n#### 4. Applying for Leave\n* **Navigation**: Click on the **My Requests** tab in the sidebar navigation, then click the **\"Apply Leave\"** button.\n* **Form Fields**:\n  1. Select **Leave Type** (e.g., `CL/SL`, `Loss of Pay (LOP)`).\n  2. Select **Leave Duration** (`Full Day`, `First Half`, `Second Half`).\n  3. Pick the **From Date** and **To Date** using the calendar pickers.\n  4. Confirm the **Reporting Manager** (automatically shows `Murali B`).\n  5. Choose the **Reason for Application** (e.g., `Emergency`, `Personal Reasons`, `Family Reasons`, `Medical`, `Travel`, `Others`).\n  6. (Optional) Upload a **Supportive Document / Attachment** (PDF/JPG/PNG up to 5MB).\n* **Submit**: Click **\"Submit Request\"** to send it for approval.\n\n#### 5. Applying for Permission (Late Entry / Early Exit)\n* **Navigation**: Go to the **My Requests** tab in the sidebar, click the **Permissions** sub-tab, then click the **\"Apply Permission\"** button.\n* **Form Fields**:\n  1. Select the **Permission Date** using the date picker.\n  2. Specify the **From Time** and **To Time** (hours, minutes, and AM/PM).\n  3. Confirm the **Reporting Manager** (`Murali B`).\n  4. Choose the **Reason for Application** (e.g., `Personal Emergency`, `Medical Appointment`, `Accident`, `Family Emergency`, `Official Work`, `Others`).\n  5. (Optional) Upload a **Supportive Document / Attachment**.\n* **Submit**: Click **\"Submit Request\"** to submit.\n\n#### 6. Payroll & Payslips\n* **Access**: Navigate to the **Payroll** tab to download monthly payslips (PDF), review PF wages, tax details, and earnings summaries."
      };
    }

    const personalQuestions = ['who are you', 'what is your name', 'your name', 'are you a bot', 'are you ai'];
    if (personalQuestions.some(q => cleanQuery.includes(q))) {
      return {
        type: 'direct',
        text: "I am the 'How can I Help Today' assistant! 🤖 I'm trained to help S4Carlisle employees with portal troubleshooting, policy lookups, and payroll/attendance queries."
      };
    }

    const stateQuestions = ['how are you', 'how is it going', 'doing ok', 'how are you doing'];
    if (stateQuestions.some(q => cleanQuery.includes(q))) {
      return {
        type: 'direct',
        text: "I'm doing great and running at full speed! 🚀 Thank you for asking. How can I help you check your leaves, shift details, or biometric logs today?"
      };
    }

    const thanksList = ['thank you', 'thanks', 'ok', 'okay', 'perfect', 'awesome', 'great', 'got it'];
    if (thanksList.some(q => cleanQuery.includes(q))) {
      return {
        type: 'direct',
        text: "You're very welcome! 👍 Glad I could help. Let me know if you have any other questions!"
      };
    }

    // 1.2 Real-time Dynamic Intent Recognition (Local Clock / Server checks)
    const hasDate = cleanQuery.includes('date');
    const hasTime = cleanQuery.includes('time') || cleanQuery.includes('clock');
    const hasToday = cleanQuery.includes('today');
    const hasNow = cleanQuery.includes('now') || cleanQuery.includes('current');

    if (hasTime && (hasToday || hasNow || cleanQuery.includes('what is') || cleanQuery.includes('what\'s'))) {
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      return {
        type: 'direct',
        text: `The current local time is **${timeStr}** ⏰.\n\nLet me know if you need help checking shift start margins or regularizing forgotten punches!`
      };
    }

    if (hasDate && (hasToday || hasNow || cleanQuery.includes('what is') || cleanQuery.includes('what\'s'))) {
      const dateStr = new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      return {
        type: 'direct',
        text: `Today's date is **${dateStr}** 📅.\n\nYou can view holidays or apply leave for any past dates in your Attendance tab.`
      };
    }

    if (cleanQuery.includes('server status') || cleanQuery.includes('is server down') || cleanQuery.includes('server ok') || cleanQuery.includes('peoplehub status')) {
      return {
        type: 'direct',
        text: "The PeopleHub server dashboard status is healthy: **Active & Responsive** 🟢.\n\nIf any page feels slow or cached, perform a hard refresh using **Ctrl + Shift + R**."
      };
    }

    // 2. Specific Error / Troubleshooting Router (Real-time AI style)

    // Hybrid/WFH Mode Check-In Rule
    if (cleanQuery.includes('hybrid') || cleanQuery.includes('wfh') || cleanQuery.includes('work from home') || cleanQuery.includes('work from hom')) {
      return {
        type: 'direct',
        text: "If you are in **Hybrid mode** and working from home **today**, you do **not** need to go to the WFH request page. Simply click **\"Check In\"** on your dashboard, toggle the work mode to **\"WFH\"**, and confirm.\n\nYou only need to use the **Requests** tab to apply for WFH if you are pre-booking WFH for a **future date** or correcting a **past date** where you forgot to set the mode during check-in."
      };
    }
    
    // Check-in / Check-out / General Error Matching Rules
    const isCheckin = cleanQuery.includes('checkin') || cleanQuery.includes('check in') || cleanQuery.includes('punchin') || cleanQuery.includes('punch in');
    const isCheckout = cleanQuery.includes('checkout') || cleanQuery.includes('check out') || cleanQuery.includes('punchout') || cleanQuery.includes('punch out');
    const isError = cleanQuery.includes('fail') || cleanQuery.includes('error') || cleanQuery.includes('issue') || cleanQuery.includes('problem') || cleanQuery.includes('not working') || cleanQuery.includes('unable') || cleanQuery.includes('wrong');

    if (isCheckin && isError) {
      return {
        type: 'direct',
        text: "If you got a check-in error or failure:\n\n1. **Hard Refresh**: Press **Ctrl + Shift + R** (Windows) or **Cmd + Shift + R** (Mac) to clear cached scripts.\n2. **Re-login**: Log out of the portal, clear cookies/cache, and log back in to renew your login session.\n3. **Verify Settings**:\n   • **IP Whitelist**: Ensure you select WFH mode if you are outside the office premises.\n   • **Shift Conflict**: Check if you already have a pending shift request.\n\nIf the issue persists, please submit a query using the **Contact HR Support** button at the top of the page, or email hr.chennai@s4carlisle.com."
      };
    }

    if (isCheckout && isError) {
      return {
        type: 'direct',
        text: "If you got a check-out error or failure:\n\n1. **Hard Refresh**: Press **Ctrl + Shift + R** (Windows) or **Cmd + Shift + R** (Mac) to clear cached scripts.\n2. **Re-login**: Log out of the portal, clear cookies/cache, and log back in to renew your login session.\n3. **Verify Settings**:\n   • **Shift Time Locks**: The portal prevents checkouts if it violates shift timelines or if you punch in too recently.\n\nIf it still fails, contact your reporting manager to regularize your checkout time manually."
      };
    }

    if (isError) {
      return {
        type: 'direct',
        text: "If you encounter any error, failure, or unexpected behavior on the portal, please try these first-aid steps:\n\n1. **Hard Refresh**: Press **Ctrl + Shift + R** (Windows) or **Cmd + Shift + R** (Mac) to clear your browser's cached files and load the latest updates.\n2. **Re-login**: Log out of the portal, clear cookies/cache, and log back in to renew your login session.\n3. **Check Network**: Verify you are connected to the internal S4Carlisle network or active VPN.\n\nIf the issue persists, please submit a query using the **Contact HR Support** button at the top of the page, or email hr.chennai@s4carlisle.com."
      };
    }

    // Forgot Punch / Regularization / Clarification Rule
    const hasForgot = cleanQuery.includes('forgot') || cleanQuery.includes('forget') || cleanQuery.includes('missed') || cleanQuery.includes('miss ');
    const hasPunch = cleanQuery.includes('check') || cleanQuery.includes('punch') || cleanQuery.includes('swipe') || cleanQuery.includes('card') || cleanQuery.includes('regular') || cleanQuery.includes('clarif');

    if ((hasForgot && hasPunch) || cleanQuery.includes('regularization') || cleanQuery.includes('clarification')) {
      return {
        type: 'direct',
        text: "If you forgot to check in or out:\n\n1. The system will mark that day as needing clarification on your calendar.\n2. Click the **\"Provide Clarification\"** button on that specific day in your dashboard.\n3. Enter your actual work start and end times, then click submit.\n\nOnce approved by your manager, your status and hours will update automatically."
      };
    }

    // Biometric Mismatch Rule
    if (cleanQuery.includes('biometric mismatch') || cleanQuery.includes('biometric error') || cleanQuery.includes('card punch mismatch')) {
      return {
        type: 'direct',
        text: "Biometric punches sync automatically every few hours. If there is a mismatch between your card swipe and the portal:\n\n1. Wait up to 2 hours for sync.\n2. If it persists, click 'Provide Regularization' on the attendance card to enter your actual punch times.\n3. Once approved, the calendar status will correct itself."
      };
    }

    // Permission Resets & Balance Rule
    if (cleanQuery.includes('permission') && (cleanQuery.includes('refresh') || cleanQuery.includes('reset') || cleanQuery.includes('renew') || cleanQuery.includes('cycle') || cleanQuery.includes('monthly') || cleanQuery.includes('when') || cleanQuery.includes('balance') || cleanQuery.includes('limit') || cleanQuery.includes('hours'))) {
      return {
        type: 'direct',
        text: "According to company guidelines, your permission balance auto-refreshes/resets back to **2.0 hours** for all employees on the **25th of every month at 00:01 AM**.\n\nYou can review your remaining permission hours in your Attendance tab under the Permission section."
      };
    }

    // Session Inactivity & Timeout Rule
    if (cleanQuery.includes('session timeout') || cleanQuery.includes('auto logout') || cleanQuery.includes('session expired') || cleanQuery.includes('logged out automatically') || cleanQuery.includes('system timeout') || cleanQuery.includes('inactivity')) {
      return {
        type: 'direct',
        text: "For security reasons, if there is no movement or interaction (such as mouse movement, clicks, scrolling, or keystrokes) on the site for **15 minutes**, your session will automatically expire and log you out.\n\n👉 **Tip**: Keep your portal tab active to avoid automatic logouts."
      };
    }

    // One Day Wages / ODW Rule
    if (cleanQuery.includes('odw') || cleanQuery.includes('one day wages') || cleanQuery.includes('weekend work') || cleanQuery.includes('extra wages') || cleanQuery.includes('holiday wages')) {
      return {
        type: 'direct',
        text: "You can apply for **One Day Wages (ODW)** when working on a weekend or public holiday in two ways:\n\n### 1. For Today (Real-time Check-In)\n* Click **\"Check In\"** on your Employee Dashboard.\n* When prompted **\"Consider as One Day Wages?\"**, select:\n  • **Yes, Request**: Submits the ODW request to your manager and starts the work timer.\n  • **Cancel**: Proceeds to normal check-in without extra wages.\n  • **Close (X)**: Cancels check-in entirely.\n\n### 2. For Past Dates (Regularizing Weekend Work)\n* Navigate to the **Attendance** tab.\n* Select the specific **Weekend / Public Holiday** (marked as a Blue date block) on your attendance calendar.\n* In the details pane, locate the **\"Reason for Claiming One Day Wages\"** input, type your justification, and click **\"Claim One Day Wages\"** to submit for manager approval."
      };
    }

    // Sandwich Leave Rule
    if (cleanQuery.includes('sandwich leave') || cleanQuery.includes('sandwich rule') || cleanQuery.includes('absent between')) {
      return {
        type: 'direct',
        text: "According to S4Carlisle policies, if you take leave or are absent on the days directly before AND after a weekend or public holiday, the weekend/holiday in between will also be counted as leave (loss of pay/deduction).\n\n👉 **Example**: If you are absent on Friday and Monday, Saturday and Sunday will also be counted as leaves."
      };
    }

    // Portal Error / Unexpected Behaviors Rule
    if (cleanQuery.includes('portal error') || cleanQuery.includes('portal encounters') || cleanQuery.includes('behaves unexpectedly') || cleanQuery.includes('page error') || cleanQuery.includes('something went wrong')) {
      return {
        type: 'direct',
        text: "If the portal displays a generic error page, throws a console error, or behaves unexpectedly:\n\n1. **Hard Cache Refresh**: Press **Ctrl + Shift + R** (Windows) or **Cmd + Shift + R** (Mac) to clear cached scripts.\n2. **Session Reset**: Log out of the portal, clear cookies for localhost/ip, and log back in.\n3. **Network Check**: Ensure you are connected to the internal S4Carlisle network or VPN.\n\nIf the issue persists, please submit a **Portal Bug Report** using the form below or contact IT support."
      };
    }

    // Regularization / Missed Punch / Forgotten Punch Router
    if (cleanQuery.includes('regular') || cleanQuery.includes('missed punch') || cleanQuery.includes('forgot') || cleanQuery.includes('mismatch') || cleanQuery.includes('punch regularization')) {
      return {
        type: 'direct',
        text: "### Missed Punch / Forgotten Check-In & Check-Out ⏰\n\nIf you forgot to check in/out, or had a biometric mismatch, you must regularize the timing to keep attendance and payroll accurate:\n\n1. Go to the **Attendance** tab in the sidebar.\n2. Click on the specific **Date** block in your attendance calendar grid that has the missing hours.\n3. In the detail drawer that opens, enter your actual **Check-In** and **Check-Out** times.\n4. Type a brief **Reason for Regularization**.\n5. Click **\"Request Regularization\"** to submit it to your manager for approval."
      };
    }

    // Shift Change Request Router
    if (cleanQuery.includes('shift') && (cleanQuery.includes('change') || cleanQuery.includes('request') || cleanQuery.includes('timing') || cleanQuery.includes('general') || cleanQuery.includes('first') || cleanQuery.includes('second'))) {
      return {
        type: 'direct',
        text: "### Requesting a Shift Change 🔄\n\nTo apply for a different shift timeline (First Shift, General Shift, or Second Shift):\n\n1. Go to the **My Requests** tab in the sidebar navigation.\n2. Select the **Shift** sub-tab.\n3. Click the **\"Request Shift Change\"** button.\n4. Input the following details:\n   • **From Date** and **To Date** (the dates the shift is applicable).\n   • **Requested Shift** (select from First Shift, General Shift, or Second Shift).\n   • Confirm your **Reporting Manager**.\n   • Input your **Reason for Shift Change**.\n5. Click **\"Submit Request\"**.\n\n*Note: Strict lock-out times apply during morning check-ins depending on your active shift assignment.*"
      };
    }

    // Meeting / Conference Room Booking Router
    if (cleanQuery.includes('meeting') || cleanQuery.includes('conference') || cleanQuery.includes('book room') || cleanQuery.includes('reserve room')) {
      return {
        type: 'direct',
        text: "### Booking a Meeting Room 📅🏢\n\nTo reserve a conference/meeting room inside the office premises:\n\n1. Click the **Meeting Rooms** tab in the sidebar.\n2. View the calendar grid showing room availabilities and capacities.\n3. Drag and select the desired **Date & Time slot** on the timeline, or click **\"Book Slot\"**.\n4. Fill in the **Meeting Title**, **Description**, and list any invitees.\n5. Click **\"Confirm Booking\"** to complete the slot reservation."
      };
    }

    // Appraisal & Self-Appraisal Router
    if (cleanQuery.includes('appraisal') || cleanQuery.includes('performance') || cleanQuery.includes('rating') || cleanQuery.includes('self-appraisal')) {
      return {
        type: 'direct',
        text: "### Completing Self-Appraisal Forms 📈\n\nTo complete your self-evaluation during appraisal cycles:\n\n1. Go to the **Appraisal** tab in the sidebar.\n2. Open your active evaluation form listed for the cycle.\n3. Input your highlights, key accomplishments, self-rating metrics, and comments.\n4. Click **\"Submit Appraisal\"** to forward it to your reporting manager.\n5. Once submitted, your manager will review, schedule a conversation, and provide final ratings."
      };
    }

    // Telecom / Colleague Directory Router
    if (cleanQuery.includes('directory') || cleanQuery.includes('extension') || cleanQuery.includes('intercom') || cleanQuery.includes('contact') || cleanQuery.includes('phone') || cleanQuery.includes('search colleague')) {
      return {
        type: 'direct',
        text: "### Telecom & Colleague Directory 📞\n\nTo find department extensions, intercom lines, or email contacts:\n\n1. Go to the **Telecom Directory** tab in the sidebar.\n2. Use the search bar to query colleagues by **Name**, **Department**, or **Designation**.\n3. You can filter the contacts by departments (e.g. Software Development, Editorial Services, HR, etc.) using the dropdown select options."
      };
    }

    // Payroll & Payslips Router
    if (cleanQuery.includes('payroll') || cleanQuery.includes('payslip') || cleanQuery.includes('salary') || cleanQuery.includes('overtime') || cleanQuery.includes('tax')) {
      return {
        type: 'direct',
        text: "### Accessing Payslips & Payroll Details 💵📄\n\nTo download monthly salary statements and tax files:\n\n1. Go to the **Payroll** tab in the sidebar.\n2. Under the Payslip block, filter by **Year** and select the month.\n3. Click the **\"Download PDF\"** icon next to the month to save your payslip.\n4. The page also outlines Gross salary, PF deductions, Professional tax, and Net payable days."
      };
    }

    // Apply Leave / Past Leave / Future Leave Router
    if (cleanQuery.includes('leave') && (cleanQuery.includes('apply') || cleanQuery.includes('request') || cleanQuery.includes('take') || cleanQuery.includes('need to') || cleanQuery.includes('sick') || cleanQuery.includes('casual') || cleanQuery.includes('lop'))) {
      const isPast = cleanQuery.includes('past') || cleanQuery.includes('absent') || cleanQuery.includes('yesterday') || cleanQuery.includes('previous') || cleanQuery.includes('backdate');

      if (isPast) {
        return {
          type: 'direct',
          text: "To apply for leave for a past date (when you were absent):\n\n1. Navigate to the **My Requests** tab in the sidebar.\n2. Click the **\"Apply Leave\"** button.\n3. In the form fields:\n   • Select **Leave Type** (e.g., `CL/SL`, `Loss of Pay (LOP)`).\n   • Set the **From Date** and **To Date** as the specific past date(s) of your absence.\n   • Select the **Reason for Application** (e.g. `Emergency`, `Medical`, etc.).\n   • (Highly Recommended) Upload a medical certificate or supporting document.\n4. Click **\"Submit Request\"**.\n\n*Note: Missed check-ins block your dashboard until a regularization or post-leave request is submitted.*"
        };
      }
      
      // Default or Future Leave
      return {
        type: 'direct',
        text: "To apply for standard/future leave:\n\n1. Navigate to the **My Requests** tab in the sidebar.\n2. Click the **\"Apply Leave\"** button.\n3. Fill in the form details:\n   • Choose **Leave Type** (`CL/SL` or `LOP`).\n   • Set the **Leave Duration** (`Full Day`, `First Half`, or `Second Half`).\n   • Pick your **From Date** and **To Date**.\n   • Confirm your **Reporting Manager** (`Murali B`).\n   • Select your **Reason for Application**.\n   • (Optional) Attach a supporting document.\n4. Click **\"Submit Request\"**."
      };
    }

    // Synonym word mappings for keyword index lookup
    const synonyms: Record<string, string> = {
      'leave': 'leave leaves holiday lop casual sick vacation cancel balance remaining',
      'regularize': 'regularize regularization punch forgotten punch card timing override biometric mismatch missing punch checkout checkin',
      'meeting': 'meeting room book conference room book meeting',
      'appraisal': 'appraisal self appraisal form review performance cycle rating self-evaluation rating feedback appraisal edit',
      'directory': 'directory extension intercom departments departments contacts numbers colleagues phone department list department search departments',
      'payroll': 'payroll payslip pdf download payslips salary salary slip payslip credit date wages salary credit cycle payable days ODW overtime'
    };

    let expandedQuery = cleanQuery;
    Object.entries(synonyms).forEach(([key, val]) => {
      if (cleanQuery.includes(key)) {
        expandedQuery += ' ' + val;
      }
    });

    // Score FAQ items based on word intersections
    const words = expandedQuery.split(/\s+/).filter(w => w.length > 2);
    
    let bestMatch: FAQItem | null = null;
    let highestScore = 0;
    const partialMatches: { id: number; question: string; score: number }[] = [];

    allFAQs.forEach(faq => {
      let score = 0;
      const qLower = faq.question.toLowerCase();
      const aLower = faq.answer.toLowerCase();

      // Check direct substring matches
      if (qLower.includes(cleanQuery)) score += 20;
      if (aLower.includes(cleanQuery)) score += 10;
      
      // Word overlap matches
      words.forEach(word => {
        if (qLower.includes(word)) score += 6;
        if (aLower.includes(word)) score += 3;
      });

      if (score > 0) {
        partialMatches.push({ id: faq.id, question: faq.question, score });
      }

      if (score > highestScore) {
        highestScore = score;
        bestMatch = faq;
      }
    });

    // 3. Conversational AI Framing wrappers
    const prefixes = [
      "Here is what I found in the portal guidelines: \n\n",
      "Certainly! I can help you with that. According to our guidelines: \n\n",
      "That's a great question! Here is how it works: \n\n",
      "Sure! Here is the relevant information from our knowledge base: \n\n"
    ];

    const suffixes = [
      "\n\nHope this helps! Let me know if you need any further clarification.",
      "\n\nDoes this help resolve your query? Let me know if you need anything else!",
      "\n\nFeel free to ask if you have more questions about this topic."
    ];

    // If we have a very clear match (score >= 10)
    if (bestMatch && highestScore >= 10) {
      const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
      const randomSuffix = suffixes[Math.floor(Math.random() * suffixes.length)];
      
      return {
        type: 'direct',
        text: `${randomPrefix}${(bestMatch as FAQItem).answer}${randomSuffix}`,
        question: (bestMatch as FAQItem).question
      };
    }

    // Otherwise if we have partial matches
    if (partialMatches.length > 0) {
      const sorted = partialMatches
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map(m => ({ id: m.id, question: m.question }));

      return {
        type: 'suggestions',
        text: "I couldn't find a direct match, but I found some related topics. Did you mean one of these questions?",
        suggestions: sorted
      };
    }

    return {
      type: 'direct',
      text: "I couldn't find an answer to that specific question in our portal guidelines. 😟\n\nPlease contact HR at **hr.chennai@s4carlisle.com** for direct assistance with this topic."
    };
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim()) return;

    if (!textToSend) {
      setInputText('');
    }

    // Add user message
    const userMsg = { sender: 'user' as const, text, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    // 1. Check local search index first for highly-relevant matches (direct answers or custom HR entries)
    const localMatch = findAnswer(text);
    if (localMatch && localMatch.type === 'direct') {
      const botMsg = {
        sender: 'bot' as const,
        text: localMatch.text,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMsg]);
      setIsTyping(false);
      return;
    }

    // 2. If no direct local match, attempt to call generative AI endpoint
    try {
      const res = await axios.post(
        `${BASE_URL}/ai/chat`,
        { message: text },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );

      if (res.data && res.data.success && res.data.response) {
        const botMsg = {
          sender: 'bot' as const,
          text: res.data.response,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, botMsg]);
        setIsTyping(false);
      } else {
        throw new Error("Invalid API response format");
      }
    } catch (err) {
      // 3. Fall back to local search suggestions if AI is offline/errored
      let botMsg: any;

      if (!localMatch) {
        botMsg = {
          sender: 'bot' as const,
          text: "I couldn't find an answer to that specific question in our portal guidelines. Please email HR at hr.chennai@s4carlisle.com.",
          timestamp: new Date()
        };
      } else if (localMatch.type === 'suggestions') {
        botMsg = {
          sender: 'bot' as const,
          text: localMatch.text,
          timestamp: new Date(),
          suggestions: localMatch.suggestions
        };
      } else {
        botMsg = {
          sender: 'bot' as const,
          text: localMatch.text,
          timestamp: new Date()
        };
      }

      setMessages(prev => [...prev, botMsg]);
      setIsTyping(false);
    }
  };

  const handleSuggestionClick = (question: string) => {
    handleSendMessage(question);
  };

  // Pre-configured FAQ suggestion chips
  const CHIPS = [
    "Forgot to check-out?",
    "Apply leave for absent date?",
    "What is ODW?",
    "Session timeout rules?"
  ];

  return (
    <div className="min-h-screen bg-neutral-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 tracking-tight">
              Help &amp; Knowledge Base
            </h1>
            <p className="mt-1.5 text-sm text-neutral-500">
              Find answers, troubleshoot portal behaviors, and review official S4Carlisle guidelines.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {isHR && (
              <button
                onClick={() => setShowAddModal(true)}
                className="flex-shrink-0 self-start sm:self-center flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-sm transition-all cursor-pointer hover:scale-[1.01] active:scale-95"
              >
                <PlusIcon className="h-4.5 w-4.5" />
                Add FAQ
              </button>
            )}
            <button
              onClick={scrollToHrForm}
              className="flex-shrink-0 self-start sm:self-center flex items-center gap-2 px-4 py-2.5 bg-primary-50 text-primary-700 hover:bg-primary-100 border border-primary-200 rounded-xl text-sm font-bold shadow-sm transition-all cursor-pointer hover:scale-[1.01] active:scale-95"
            >
              <EnvelopeIcon className="h-4.5 w-4.5" />
              Contact HR Support
            </button>
          </div>
        </div>

        {/* ── Add FAQ Modal (HR only) ──────────────────────────────────────────── */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-neutral-200 w-full max-w-lg">
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-100">
                    {editingFAQ ? (
                      <PencilIcon className="h-5 w-5 text-emerald-600" />
                    ) : (
                      <PlusIcon className="h-5 w-5 text-emerald-600" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-neutral-800">
                      {editingFAQ ? "Edit FAQ" : "Add New FAQ"}
                    </h2>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      {editingFAQ ? "Update FAQ details" : "Visible to all employees immediately"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingFAQ(null);
                    setAddForm({ question: "", answer: "", category: "support" });
                  }}
                  className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition-colors cursor-pointer"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              {/* Modal Body */}
              <form onSubmit={handleSaveFAQ} className="p-6 space-y-4">
                {/* Category */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Category</label>
                  <select
                    value={addForm.category}
                    onChange={e => setAddForm(p => ({ ...p, category: e.target.value as FAQItem['category'] }))}
                    className="w-full bg-white border border-neutral-250 rounded-xl px-4 py-2.5 text-sm text-neutral-800 font-medium outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-400 transition-all cursor-pointer"
                  >
                    <option value="attendance">Daily Attendance</option>
                    <option value="leaves">Leaves &amp; Overtime</option>
                    <option value="office">Office Tools</option>
                    <option value="performance">Performance &amp; Profile</option>
                    <option value="support">Help &amp; Support</option>
                  </select>
                </div>

                {/* Question */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Question</label>
                  <input
                    type="text"
                    placeholder="e.g. How do I update my emergency contact?"
                    value={addForm.question}
                    onChange={e => setAddForm(p => ({ ...p, question: e.target.value }))}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm text-neutral-800 placeholder-neutral-400 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-400 focus:bg-white transition-all"
                    required
                  />
                </div>

                {/* Answer */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Answer</label>
                  <textarea
                    rows={5}
                    placeholder="Type the full answer here..."
                    value={addForm.answer}
                    onChange={e => setAddForm(p => ({ ...p, answer: e.target.value }))}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm text-neutral-800 placeholder-neutral-400 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-400 focus:bg-white transition-all resize-none"
                    required
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setEditingFAQ(null);
                      setAddForm({ question: "", answer: "", category: "support" });
                    }}
                    className="px-5 py-2.5 text-sm font-bold text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addLoading}
                    className="px-5 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 rounded-xl transition-all cursor-pointer flex items-center gap-2"
                  >
                    {addLoading ? (
                      <><span className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />Saving...</>
                    ) : editingFAQ ? (
                      <><PencilIcon className="h-4 w-4" />Save Changes</>
                    ) : (
                      <><PlusIcon className="h-4 w-4" />Add FAQ</>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Search Bar Widget */}
        <div className="relative mb-8 bg-white border border-neutral-200 rounded-2xl p-2.5 shadow-sm focus-within:border-primary-500 focus-within:ring-1 focus-within:ring-primary-500 transition-all flex items-center gap-3">
          <MagnifyingGlassIcon className="h-5 w-5 text-neutral-400 ml-3 flex-shrink-0" />
          <input
            type="text"
            placeholder="Search questions, categories, policies or keywords (e.g. WFH, regularization, sandwich leave)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent outline-none text-neutral-800 placeholder-neutral-400 text-sm py-1.5 px-0.5"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="text-neutral-500 hover:text-neutral-800 text-xs font-semibold px-3 py-1.5 hover:bg-neutral-100 rounded-xl transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        {/* Two-Column Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Sidebar: Categories list */}
          <div className="lg:col-span-1 space-y-4">
            <div className="hidden lg:block">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3 ml-1">Categories</h3>
            </div>
            
            <div className="flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-3 lg:pb-0 whitespace-nowrap scrollbar-none">
              {categories.map((cat: any) => {
                const isActive = activeCategory === cat.id;
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm border transition-all text-left justify-between lg:w-full min-w-[140px] lg:min-w-0 ${
                      isActive
                        ? 'bg-primary-600 border-primary-600 text-white shadow-sm'
                        : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50 hover:text-neutral-900 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="h-4.5 w-4.5 flex-shrink-0" />
                      <span>{cat.name}</span>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                      isActive ? 'bg-white/20 text-white' : 'bg-neutral-100 text-neutral-500 border border-neutral-200/50'
                    }`}>
                      {cat.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Quick Policy SLA Alert Box (Only on Desktop) */}
            <div className="hidden lg:block bg-gradient-to-tr from-primary-50 to-indigo-50 border border-primary-100/50 rounded-2xl p-5 shadow-sm">
              <h4 className="font-bold text-neutral-800 text-xs flex items-center gap-1.5 uppercase tracking-wide">
                <ShieldCheckIcon className="h-4 w-4 text-primary-600" />
                Response SLA
              </h4>
              <p className="text-xs text-neutral-500 mt-2 leading-relaxed">
                HR/Reporting managers review leave, permission, and shift change requests within **24-48 business hours**.
              </p>
            </div>
          </div>

          {/* Right Column: FAQ Accordion List */}
          <div className="lg:col-span-3 space-y-4">
            {filteredFAQs.length > 0 ? (
              <>
                <div className="space-y-4 animate-fade-in">
                  {paginatedFAQs.map((faq) => {
                    const isExpanded = expandedId === faq.id;
                    return (
                      <div
                        key={faq.id}
                        className={`bg-white border rounded-2xl overflow-hidden transition-all duration-200 ${
                          isExpanded 
                            ? 'border-neutral-350 shadow-sm' 
                            : faq.isCustom
                            ? 'border-emerald-200 hover:border-emerald-300 shadow-sm'
                            : 'border-neutral-200 hover:border-neutral-300 shadow-sm'
                        }`}
                      >
                        <button
                          onClick={() => toggleAccordion(faq.id)}
                          className="w-full text-left px-6 py-4 flex items-center justify-between gap-4 font-bold text-sm sm:text-base text-neutral-800 hover:text-primary-600 transition-colors"
                        >
                          <span className="flex items-center gap-2">
                            {faq.question}
                            {faq.isCustom && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 tracking-wide uppercase">
                                HR
                              </span>
                            )}
                          </span>
                          <ChevronDownIcon
                            className={`h-4.5 w-4.5 text-neutral-400 flex-shrink-0 transition-transform duration-200 ${
                              isExpanded ? 'transform rotate-180 text-neutral-650' : ''
                            }`}
                          />
                        </button>
                        
                        {isExpanded && (
                          <div className="px-6 pb-5 pt-1 text-sm leading-relaxed text-neutral-600 border-t border-neutral-100/70 bg-neutral-50/50 whitespace-pre-line flex flex-col justify-between">
                            <div>{faq.answer}</div>
                            
                            {/* Helpfulness Rating Widget + HR delete */}
                            <div className="mt-4 pt-3 border-t border-neutral-200/40 flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-500">
                              <span className="font-semibold">Was this answer helpful?</span>
                              <div className="flex items-center gap-2">
                                {votes[faq.id] ? (
                                  <span className="font-bold text-primary-600 transition-all animate-fade-in flex items-center gap-1">
                                    {votes[faq.id] === 'yes' ? '💚 Thanks for your feedback!' : '📝 Feedback logged for review.'}
                                  </span>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => handleVote(faq.id, 'yes')}
                                      className="flex items-center gap-1 px-2.5 py-1 bg-white border border-neutral-250 hover:border-emerald-300 hover:text-emerald-650 rounded-lg transition-all active:scale-95 shadow-sm font-bold cursor-pointer"
                                    >
                                      👍 Yes
                                    </button>
                                    <button
                                      onClick={() => handleVote(faq.id, 'no')}
                                      className="flex items-center gap-1 px-2.5 py-1 bg-white border border-neutral-250 hover:border-rose-300 hover:text-rose-650 rounded-lg transition-all active:scale-95 shadow-sm font-bold cursor-pointer"
                                    >
                                      👎 No
                                    </button>
                                  </>
                                )}
                                {/* HR-only: edit custom FAQ */}
                                {isHR && faq.isCustom && (
                                  <button
                                    onClick={() => handleStartEdit(faq)}
                                    className="ml-2 flex items-center gap-1 px-2.5 py-1 bg-white border border-indigo-200 hover:border-indigo-400 text-indigo-600 hover:text-indigo-800 rounded-lg transition-all active:scale-95 shadow-sm font-bold cursor-pointer"
                                    title="Edit this FAQ"
                                  >
                                    <PencilIcon className="h-3.5 w-3.5" />
                                    Edit
                                  </button>
                                )}
                                {/* HR-only: delete custom FAQ */}
                                {isHR && faq.isCustom && (
                                  <button
                                    onClick={() => handleDeleteCustomFAQ(faq.id)}
                                    className="ml-2 flex items-center gap-1 px-2.5 py-1 bg-white border border-rose-200 hover:border-rose-400 text-rose-500 hover:text-rose-700 rounded-lg transition-all active:scale-95 shadow-sm font-bold cursor-pointer"
                                    title="Remove this FAQ"
                                  >
                                    <TrashIcon className="h-3.5 w-3.5" />
                                    Delete
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-1.5 mt-8 pt-4">
                    {/* Prev Button */}
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white px-4 py-2 rounded-xl text-sm font-bold cursor-pointer select-none transition-all shadow-xs"
                    >
                      Prev
                    </button>

                    {/* Page Numbers */}
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                      const isActive = pageNum === currentPage;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-3.5 py-2 rounded-xl text-sm transition-all shadow-xs cursor-pointer select-none border ${
                            isActive
                              ? "bg-primary-600 border-primary-600 text-white font-bold"
                              : "bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50 font-semibold"
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}

                    {/* Next Button */}
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white px-4 py-2 rounded-xl text-sm font-bold cursor-pointer select-none transition-all shadow-xs"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12 bg-white border border-dashed border-neutral-300 rounded-2xl animate-fade-in">
                <QuestionMarkCircleIcon className="h-10 w-10 text-neutral-300 mx-auto mb-2.5" />
                <h3 className="font-semibold text-neutral-700 text-base">No FAQs found</h3>
                <p className="text-neutral-400 max-w-sm mx-auto text-xs mt-1">
                  We couldn't find any questions matching your query. Try clearing filters or searching for other policies.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Contact HR Quick-Form Widget */}
        <div ref={hrFormRef} className="mt-12 bg-white border border-neutral-200 rounded-2xl p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between border-b border-neutral-100 pb-5 mb-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary-50 border border-primary-100 text-primary-600 rounded-xl">
                <EnvelopeIcon className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-neutral-800">Still Need Assistance?</h2>
                <p className="text-xs text-neutral-500 mt-0.5">Email S4Carlisle HR with a pre-formatted query.</p>
              </div>
            </div>
            <div className="text-[11px] bg-primary-50 text-primary-700 font-bold px-3 py-1 rounded-full border border-primary-100 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-500"></span>
              Direct Mailbox: hr.chennai@s4carlisle.com
            </div>
          </div>

          <form onSubmit={handleDraftEmail} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1.5 ml-0.5">Query Category</label>
                <select
                  value={hrForm.subject}
                  onChange={(e) => setHrForm(prev => ({ ...prev, subject: e.target.value }))}
                  className="w-full bg-white border border-neutral-250 rounded-xl px-4 py-2.5 text-sm text-neutral-800 font-medium outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all cursor-pointer"
                >
                  <option value="Attendance Issues">Attendance Issues ⏰</option>
                  <option value="Leave Balance Discrepancy">Leave Balance Discrepancy 📅</option>
                  <option value="Appraisal Concerns">Appraisal Concerns 📈</option>
                  <option value="Payroll & Payslip Errors">Payroll & Payslip Errors 💵</option>
                  <option value="Portal Bug Report">Portal Bug Report 🐛</option>
                  <option value="Others">Others 💬</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1.5 ml-0.5">Employee ID (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. S4C1024"
                  value={hrForm.empId}
                  onChange={(e) => setHrForm(prev => ({ ...prev, empId: e.target.value }))}
                  className="w-full bg-white border border-neutral-250 rounded-xl px-4 py-2.5 text-sm text-neutral-800 placeholder-neutral-400 font-medium outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1.5 ml-0.5">Detailed Explanation</label>
              <textarea
                rows={3}
                placeholder="Explain the problem or request in detail so the HR team can help you quickly..."
                value={hrForm.message}
                onChange={(e) => setHrForm(prev => ({ ...prev, message: e.target.value }))}
                className="w-full bg-white border border-neutral-250 rounded-xl px-4 py-3 text-sm text-neutral-800 placeholder-neutral-400 font-medium outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all resize-none animate-none"
              />
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={isHrDrafting}
                className={`flex items-center justify-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm rounded-xl transition-all active:scale-[0.98] ${
                  isHrDrafting ? 'opacity-75 cursor-not-allowed' : ''
                }`}
              >
                {isHrDrafting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Opening Mail Client...
                  </>
                ) : (
                  <>
                    <EnvelopeIcon className="h-4.5 w-4.5" />
                    Draft Email to HR
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Floating Chat Bubble widget */}
      <div className="fixed bottom-6 right-6 z-50 font-sans">
        {!isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            className="bg-primary-600 hover:bg-primary-700 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 flex items-center gap-2 group relative"
          >
            <ChatBubbleLeftRightIcon className="h-6 w-6" />
            <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 ease-out text-sm font-bold whitespace-nowrap">
              How can I Help Today
            </span>
            <span className="absolute top-0 right-0 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          </button>
        )}

        {isOpen && (
          <div className="w-[350px] sm:w-[380px] h-[500px] bg-white border border-neutral-200 rounded-2xl shadow-xl flex flex-col overflow-hidden animate-slide-up">
            {/* Header */}
            <div className="bg-primary-600 px-5 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center border border-white/20 relative">
                  <ChatBubbleLeftRightIcon className="h-5 w-5 text-white" />
                  <span className="absolute bottom-0 right-0 block h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-primary-600"></span>
                </div>
                <div>
                  <h3 className="font-bold text-sm leading-tight">How can I Help Today</h3>
                  <span className="text-[10px] text-primary-100 flex items-center gap-1 font-semibold mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
                    Active Helpdesk
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-full hover:bg-white/10 text-white/85 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-neutral-50/50">
              {messages.map((msg, index) => {
                const isBot = msg.sender === 'bot';
                return (
                  <div key={index} className={`flex ${isBot ? 'justify-start' : 'justify-end'} animate-fade-in`}>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      isBot 
                        ? 'bg-white text-neutral-800 border border-neutral-200 shadow-sm'
                        : 'bg-primary-600 text-white shadow-sm'
                    }`}>
                      <p className="whitespace-pre-line">{msg.text}</p>
                      
                      {isBot && msg.suggestions && (
                        <div className="mt-3.5 space-y-2 border-t pt-3 border-neutral-100">
                          {msg.suggestions.map((sug) => (
                            <button
                              key={sug.id}
                              onClick={() => handleSuggestionClick(sug.question)}
                              className="block w-full text-left text-xs font-bold text-primary-600 hover:text-primary-700 bg-primary-50/50 hover:bg-primary-50 px-2.5 py-1.5 rounded-lg border border-primary-100/60 transition-colors"
                            >
                              👉 {sug.question}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white border border-neutral-200 shadow-sm rounded-2xl px-4 py-3 flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chips Container */}
            <div className="px-4 py-2 border-t border-neutral-100 bg-white flex gap-1.5 overflow-x-auto whitespace-nowrap scrollbar-none">
              {CHIPS.map((chip, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(chip)}
                  className="inline-block px-3 py-1 bg-neutral-100 hover:bg-primary-50 hover:text-primary-600 border border-neutral-150 rounded-full text-xs font-semibold text-neutral-600 transition-all cursor-pointer"
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="p-3 border-t border-neutral-100 bg-white flex items-center gap-2"
            >
              <input
                type="text"
                placeholder="Ask about WFH, LOP, Appraisal..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="flex-1 bg-neutral-50 outline-none text-sm px-4.5 py-2 rounded-full border border-neutral-200 focus:border-primary-500 placeholder-neutral-400"
              />
              <button
                type="submit"
                className="bg-primary-600 hover:bg-primary-700 text-white rounded-full p-2.5 transition-colors shadow-sm active:scale-95 flex-shrink-0"
              >
                <PaperAirplaneIcon className="h-4.5 w-4.5" />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default FAQPage;
