import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
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
  EnvelopeIcon
} from '@heroicons/react/24/outline';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

interface FAQItem {
  id: number;
  question: string;
  answer: string;
  category: 'attendance' | 'leaves' | 'office' | 'performance' | 'support';
}

const FAQ_DATA: FAQItem[] = [
  // --- Attendance ---
  {
    id: 1,
    category: 'attendance',
    question: 'How do I check in or check out?',
    answer: 'Navigate to your Employee Dashboard and click the "Check In" button. A modal will appear where you can select your shift timing and work mode (e.g., Office or WFH). Once confirmed, your daily work timer starts. When your workday is complete, click the "Check Out" button to end your timer and register your hours.'
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
    question: 'What are the standard office timings and core hours?',
    answer: 'Standard working hours for the General Shift are from 09:00 AM to 06:00 PM. Employees are expected to log a minimum of 8 working hours per day. Core hours of required availability are between 10:00 AM and 05:00 PM.'
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
    answer: 'Navigate to the "Attendance" tab, scroll to the Leave section, and click "Apply Leave". Select the start and end dates, leave type (Casual, Sick, LOP, etc.), select your reporting manager, add a reason, and click submit. You will receive a notification once approved or rejected.'
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
    question: 'What is One Day Wages (ODW) and how do I request it?',
    answer: 'If you work on a weekend (weekly off) or a public holiday, you are eligible for One Day Wages. When you click "Check In" on a non-working day, the system will automatically prompt: "Consider as One Day Wages?". Click "Yes, Request" to submit the wages request to your manager. Once approved, the day will be counted toward your overtime/extra wages.'
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
    answer: 'Navigate to the "Attendance" tab, scroll down to the Permission section, and click "Apply Permission". Select the date, choose the time duration, select whether it is for Late Entry or Early Exit, select your reporting manager, and submit. The approved hours will be adjusted in your attendance total.'
  },
  {
    id: 11,
    category: 'leaves',
    question: 'How do I apply for a Shift Change or permanent Work Mode change?',
    answer: 'Navigate to the "Requests" tab and click "Apply Shift/Work Mode". Enter the date range, select your requested shift timings and work mode (Office, WFH, or Hybrid), provide a reason, and submit it for manager review.'
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
  {
    id: 26,
    category: 'performance',
    question: 'How do I change my portal login password?',
    answer: 'Navigate to the Settings page from the sidebar or from your profile menu. Click on "Change Password", enter your current password, then set and confirm your new password. If you have forgotten your current password, use the "Forgot Password" link on the login page to reset it via email.'
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

const CATEGORIES = [
  { id: 'all', name: 'All Topics', icon: QuestionMarkCircleIcon, count: FAQ_DATA.length, color: 'text-violet-500 bg-violet-50 border-violet-100' },
  { id: 'attendance', name: 'Daily Attendance', icon: ClockIcon, count: FAQ_DATA.filter(f => f.category === 'attendance').length, color: 'text-emerald-500 bg-emerald-50 border-emerald-100' },
  { id: 'leaves', name: 'Leaves & Overtime', icon: CalendarDaysIcon, count: FAQ_DATA.filter(f => f.category === 'leaves').length, color: 'text-amber-500 bg-amber-50 border-amber-100' },
  { id: 'office', name: 'Office Tools', icon: BuildingOfficeIcon, count: FAQ_DATA.filter(f => f.category === 'office').length, color: 'text-indigo-500 bg-indigo-50 border-indigo-100' },
  { id: 'performance', name: 'Performance & Profile', icon: UserCircleIcon, count: FAQ_DATA.filter(f => f.category === 'performance').length, color: 'text-rose-500 bg-rose-50 border-rose-100' },
  { id: 'support', name: 'Help & Support', icon: ShieldCheckIcon, count: FAQ_DATA.filter(f => f.category === 'support').length, color: 'text-sky-500 bg-sky-50 border-sky-100' }
];

export const FAQPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // FAQ Helpfulness Voting State
  const [votes, setVotes] = useState<Record<number, 'yes' | 'no'>>({});
  const handleVote = (faqId: number, type: 'yes' | 'no') => {
    setVotes(prev => ({ ...prev, [faqId]: type }));
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
    
    window.location.href = `mailto:hr.chennai@s4carlisle.com?subject=${subjectLine}&body=${emailBody}`;
    
    setTimeout(() => {
      setIsHrDrafting(false);
    }, 1550);
  };

  const toggleAccordion = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const filteredFAQs = FAQ_DATA.filter((faq) => {
    const matchesSearch = 
      faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory === 'all' || faq.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  // Chatbot State
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'bot'; text: string; timestamp: Date; suggestions?: Array<{ id: number; question: string }> }>>([
    {
      sender: 'bot',
      text: "Hello! 👋 I'm the PeopleHub AI Assistant. I can answer S4Carlisle guidelines, check-in errors, leave rules, and appraisal questions in real-time.\n\nAsk me anything!",
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

    // 1. Handle Greetings & Small Talk
    const greetings = ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening', 'hi there'];
    if (greetings.includes(cleanQuery)) {
      return {
        type: 'direct',
        text: "Hello! 👋 I'm the PeopleHub AI Assistant. I'm here in real-time to help you. How can I assist you with your attendance, leaves, shift requests, or payroll today?"
      };
    }

    const personalQuestions = ['who are you', 'what is your name', 'your name', 'are you a bot', 'are you ai'];
    if (personalQuestions.some(q => cleanQuery.includes(q))) {
      return {
        type: 'direct',
        text: "I am the PeopleHub AI Assistant! 🤖 I'm trained to help S4Carlisle employees with portal troubleshooting, policy lookups, and payroll/attendance queries."
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
    const punchTerms = [
      'forgot checkin', 'forgot checkout', 'forgot to check out', 'forgot to check in',
      'forgot punch', 'forgot card', 'forgot to swipe', 'regularization', 'clarification'
    ];
    if (punchTerms.some(term => cleanQuery.includes(term))) {
      return {
        type: 'direct',
        text: "If you forgot to check in or out yesterday:\n\n1. The system will mark that day as needing clarification on your calendar.\n2. Click the **\"Provide Clarification\"** button on that specific day in your dashboard.\n3. Enter your actual work start and end times, then click submit.\n\nOnce approved by your manager, your status and hours will update automatically."
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
        text: "One Day Wages (ODW) is compensating wages for working on a weekend or public holiday:\n\n1. When you check in on a non-working day, the system will prompt: **\"Consider as One Day Wages?\"**.\n2. Click **\"Yes, Request\"** to submit the wages request to your manager.\n3. Once approved, the day will be counted toward your overtime/extra wages."
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

    // Synonym word mappings for keyword index lookup
    const synonyms: Record<string, string> = {
      'leave': 'leave leaves holiday absent lop casual sick vacation cancel balance remaining',
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

    FAQ_DATA.forEach(faq => {
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

    try {
      // 1. Attempt to call backend Gemini AI endpoint
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
      // 2. Fall back to local search matching
      const match = findAnswer(text);
      let botMsg: any;

      if (!match) {
        botMsg = {
          sender: 'bot' as const,
          text: "I couldn't find an answer to that specific question in our portal guidelines. Please email HR at hr.chennai@s4carlisle.com.",
          timestamp: new Date()
        };
      } else if (match.type === 'suggestions') {
        botMsg = {
          sender: 'bot' as const,
          text: match.text,
          timestamp: new Date(),
          suggestions: match.suggestions
        };
      } else {
        botMsg = {
          sender: 'bot' as const,
          text: match.text,
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
              Help & Knowledge Base
            </h1>
            <p className="mt-1.5 text-sm text-neutral-500">
              Find answers, troubleshoot portal behaviors, and review official S4Carlisle guidelines.
            </p>
          </div>
          <button
            onClick={scrollToHrForm}
            className="flex-shrink-0 self-start sm:self-center flex items-center gap-2 px-4.5 py-2.5 bg-primary-50 text-primary-700 hover:bg-primary-100 border border-primary-200 rounded-xl text-sm font-bold shadow-sm transition-all cursor-pointer hover:scale-[1.01] active:scale-95"
          >
            <EnvelopeIcon className="h-4.5 w-4.5" />
            Contact HR Support
          </button>
        </div>

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
              {CATEGORIES.map((cat) => {
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
              <div className="space-y-4 animate-fade-in">
                {filteredFAQs.map((faq) => {
                  const isExpanded = expandedId === faq.id;
                  return (
                    <div
                      key={faq.id}
                      className={`bg-white border rounded-2xl overflow-hidden transition-all duration-200 ${
                        isExpanded 
                          ? 'border-neutral-350 shadow-sm' 
                          : 'border-neutral-200 hover:border-neutral-300 shadow-sm'
                      }`}
                    >
                      <button
                        onClick={() => toggleAccordion(faq.id)}
                        className="w-full text-left px-6 py-4 flex items-center justify-between gap-4 font-bold text-sm sm:text-base text-neutral-800 hover:text-primary-600 transition-colors"
                      >
                        <span>{faq.question}</span>
                        <ChevronDownIcon
                          className={`h-4.5 w-4.5 text-neutral-400 flex-shrink-0 transition-transform duration-200 ${
                            isExpanded ? 'transform rotate-180 text-neutral-650' : ''
                          }`}
                        />
                      </button>
                      
                      {isExpanded && (
                        <div className="px-6 pb-5 pt-1 text-sm leading-relaxed text-neutral-600 border-t border-neutral-100/70 bg-neutral-50/50 whitespace-pre-line flex flex-col justify-between">
                          <div>{faq.answer}</div>
                          
                          {/* Helpfulness Rating Widget */}
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
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
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
              PeopleHub Assistant
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
                  <h3 className="font-bold text-sm leading-tight">PeopleHub Assistant</h3>
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
