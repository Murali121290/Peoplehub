import React, { useState, useEffect, useRef } from "react";
import { socket } from "../socket";
import { MegaphoneIcon, HandThumbUpIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { HandThumbUpIcon as HandThumbUpSolid } from "@heroicons/react/24/solid";
import { Button } from "../components/ui/Button";
import { Input, Select, Textarea } from "../components/ui/Form";
import { EmptyState } from "../components/ui/EmptyState";
import EmojiPicker from 'emoji-picker-react';

const AnnouncementsPage = () => {
  const [title, setTitle] = useState("");
  const [targetRole, setTargetRole] = useState("all");
  const [message, setMessage] = useState("");
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const emojiPickerRef = useRef<HTMLDivElement>(null);

  const userStr = localStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : {};
  const currentUserId = user.id || null;
  const canSendAnnouncement = user.access_level === "admin" || user.access_level === "hr";

  useEffect(() => {
    fetchAnnouncements();
    socket.on("receive_announcement", (newAnnouncement) => {
      setAnnouncements((prev) => {
        if (prev.find(a => a.id === newAnnouncement.id)) return prev;
        return [newAnnouncement, ...prev];
      });
    });
    return () => {
      socket.off("receive_announcement");
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSend = () => {
    if (!title.trim() || !message.trim()) return;
    setIsLoading(true);
    socket.emit("send_announcement", {
      sender_name: user.first_name || "HR Admin",
      title,
      target_role: targetRole,
      message,
    });
    setTimeout(() => {
      setShowSuccess(true);
      setTitle("");
      setMessage("");
      setTargetRole("all");
      setShowEmojiPicker(false);
      setIsLoading(false);
      setTimeout(() => {
        setShowSuccess(false);
        fetchAnnouncements();
      }, 3000);
    }, 500);
  };

  const fetchAnnouncements = async () => {
    try {
      const apiUrl = `${import.meta.env.VITE_API_URL || ""}/api`;
      const response = await fetch(`${apiUrl}/communications/announcements?role=${user.access_level || ''}`);
      const data = await response.json();
      if (data.success && data.announcements) {
        setAnnouncements(data.announcements);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const toggleLike = async (messageId: number) => {
    if (!currentUserId) return;
    try {
      const apiUrl = `${import.meta.env.VITE_API_URL || ""}/api`;
      const response = await fetch(`${apiUrl}/communications/${messageId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: currentUserId })
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

  const onEmojiClick = (emojiObject: any) => {
    setMessage(prev => prev + emojiObject.emoji);
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

  return (
    <div className="min-h-screen bg-neutral-100 px-4 py-8 md:px-8">
      {showSuccess && (
        <div className="fixed top-5 right-6 z-50 flex items-center gap-2.5 rounded-lg bg-neutral-900 px-5 py-3.5 text-sm font-semibold text-white shadow-lg animate-slideInRight">
          <span className="h-2 w-2 flex-shrink-0 rounded-full bg-success-500" />
          Announcement posted successfully
        </div>
      )}

      <div className="mx-auto max-w-2xl">
        <div className="sticky top-0 z-10 bg-neutral-100 pt-8 pb-4 -mt-8 mb-4">
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
                <option value="employee">Employees</option>
                <option value="manager">Managers</option>
              </select>
          </div>
        </div>

        {canSendAnnouncement && (
          <div className="mb-8 rounded-2xl bg-white p-5 shadow-sm border border-neutral-200 transition-all focus-within:shadow-md focus-within:border-primary-300">
            <div className="flex gap-4">
              <div className="hidden sm:flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-indigo-600 font-bold text-white shadow-inner">
                {getInitials(user.first_name || "Admin")}
              </div>
              <div className="flex-1">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Announcement Title"
                  className="w-full border-b border-transparent bg-transparent px-2 py-1 text-lg font-bold text-neutral-800 placeholder-neutral-400 focus:border-neutral-200 focus:outline-none mb-2"
                />
                
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="What's happening in the company?"
                  className="w-full resize-none rounded-xl border-none bg-neutral-50 p-3 text-[15px] text-neutral-700 placeholder-neutral-400 focus:outline-none focus:ring-0 min-h-[100px]"
                />

                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 relative">
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-700 transition-colors"
                      title="Add Emoji"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </button>
                    {showEmojiPicker && (
                      <div ref={emojiPickerRef} className="absolute left-0 top-12 z-50 shadow-2xl">
                        <EmojiPicker onEmojiClick={onEmojiClick} autoFocusSearch={false} />
                      </div>
                    )}
                    
                    <div className="ml-2">
                       <select
                          value={targetRole}
                          onChange={(e) => setTargetRole(e.target.value)}
                          className="h-9 rounded-full border border-neutral-200 bg-white px-3 text-xs font-semibold text-neutral-600 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1"
                        >
                          <option value="all">📢 Everyone</option>
                          <option value="employee">👥 Employees Only</option>
                          <option value="manager">👔 Managers Only</option>
                        </select>
                    </div>
                  </div>

                  <Button
                    loading={isLoading}
                    onClick={handleSend}
                    disabled={!title.trim() || !message.trim()}
                    className="rounded-full px-6 py-2 font-bold shadow-sm"
                  >
                    Post
                  </Button>
                </div>
              </div>
            </div>
            </div>
          )}
        </div>

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
              const likesArray = item.likes || [];
              const hasLiked = currentUserId ? likesArray.includes(currentUserId) : false;

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
                      </div>

                      <div className="mt-3">
                        <h3 className="text-[16px] font-bold text-neutral-800 mb-1.5">{item.title}</h3>
                        <p className="text-[14.5px] leading-relaxed text-neutral-700 whitespace-pre-wrap">{item.message}</p>
                      </div>
                      
                      <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center gap-4">
                        <button 
                          onClick={() => toggleLike(item.id)}
                          className={`flex items-center gap-1.5 text-sm font-semibold transition-colors px-3 py-1.5 rounded-full ${
                            hasLiked 
                              ? "text-primary-600 bg-primary-50" 
                              : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700"
                          }`}
                        >
                          {hasLiked ? (
                            <HandThumbUpSolid className="w-5 h-5" />
                          ) : (
                            <HandThumbUpIcon className="w-5 h-5" />
                          )}
                          <span>{likesArray.length > 0 ? likesArray.length : "Like"}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default AnnouncementsPage;
