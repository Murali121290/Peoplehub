import React, { useState, useEffect } from "react";
import { socket } from "../socket";
import { API_URL } from "../config/api";
import { InboxIcon } from "@heroicons/react/24/outline";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input, Select, Textarea } from "../components/ui/Form";
import { EmptyState } from "../components/ui/EmptyState";

const AnnouncementsPage = () => {
  const [title, setTitle] = useState("");
  const [targetRole, setTargetRole] = useState("all");
  const [message, setMessage] = useState("");
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const canSendAnnouncement =
    user.access_level === "admin" || user.access_level === "hr";

  useEffect(() => {
    fetchAnnouncements();
    socket.on("receive_announcement", (newAnnouncement) => {
      setAnnouncements((prev) => [newAnnouncement, ...prev]);
    });
    return () => {
      socket.off("receive_announcement");
    };
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
      setIsLoading(false);
      setTimeout(() => setShowSuccess(false), 3000);
    }, 500);
  };

  const fetchAnnouncements = async () => {
    try {
      const response = await fetch(
        `${API_URL}/api/communications/announcements`,
      );
      const data = await response.json();
      if (data.success && data.announcements) {
        setAnnouncements(data.announcements);
      }
    } catch (error) {
      console.error(error);
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
      return new Date(dateStr + "Z").toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 px-6 py-8">
      {/* Success Toast */}
      {showSuccess && (
        <div className="fixed top-5 right-6 z-toast flex items-center gap-2.5 rounded-lg bg-neutral-900 px-5 py-3.5 text-sm font-semibold text-white shadow-lg animate-slideInRight">
          <span className="h-2 w-2 flex-shrink-0 rounded-full bg-success-500" />
          Announcement sent successfully
        </div>
      )}

      {/* Page Header */}
      <div className="mb-7">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-800">Announcements</h1>
        <p className="text-sm text-neutral-500">
          {canSendAnnouncement
            ? "Compose and broadcast company-wide messages"
            : "Stay up to date with the latest from your team"}
        </p>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-[420px_1fr]">
        {/* LEFT: COMPOSE or READ-ONLY CARD */}
        {canSendAnnouncement ? (
          <Card padding="none">
            <div className="border-b border-neutral-100 px-6 py-5">
              <h2 className="text-[15px] font-bold text-neutral-800">New Announcement</h2>
            </div>
            <div className="p-6">
              {/* Title */}
              <div className="mb-4">
                <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-neutral-500">Title</label>
                <Input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Office closed on Friday"
                  maxLength={120}
                />
              </div>

              {/* Audience */}
              <div className="mb-4">
                <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-neutral-500">Audience</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: "all", label: "Everyone" },
                    { value: "employee", label: "Employees" },
                    { value: "manager", label: "Managers" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setTargetRole(opt.value)}
                      className={`rounded-lg border px-4 py-2 text-[13px] font-semibold transition-colors ${targetRole === opt.value
                          ? "border-primary-500 bg-primary-500 text-white"
                          : "border-neutral-200 bg-neutral-50 text-neutral-500 hover:border-primary-300 hover:text-neutral-800"
                        }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message */}
              <div className="mb-4">
                <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-neutral-500">Message</label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Write your announcement here..."
                  maxLength={2000}
                  className="min-h-[140px]"
                />
                <p className="mt-1 text-right text-[11px] text-neutral-400">{message.length} / 2000</p>
              </div>

              {/* Send Button */}
              <Button
                fullWidth
                loading={isLoading}
                onClick={handleSend}
                disabled={!title.trim() || !message.trim()}
              >
                {isLoading ? "Sending..." : "Send Announcement"}
              </Button>
            </div>
          </Card>
        ) : (
          /* Non-HR: show a simple info panel instead */
          <Card padding="none">
            <div className="border-b border-neutral-100 px-6 py-5">
              <h2 className="text-[15px] font-bold text-neutral-800">About Announcements</h2>
            </div>
            <div className="p-6">
              <p className="text-sm leading-relaxed text-neutral-500">
                This page shows all official announcements from HR and
                management. New messages appear here in real time. Check back
                regularly to stay informed about company updates, policy
                changes, and events.
              </p>
              <div className="mt-5 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3.5">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-neutral-500">
                  Total Announcements
                </p>
                <p className="text-3xl font-extrabold text-neutral-800">
                  {announcements.length}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* RIGHT: ANNOUNCEMENTS LIST */}
        <Card padding="none" className="min-w-0">
          {/* Card Header */}
          <div className="border-b border-neutral-100 px-6 py-5">
            <div className="flex items-center gap-2.5">
              <h2 className="text-[15px] font-bold text-neutral-800">All Announcements</h2>
              <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-neutral-100 px-2 text-xs font-bold text-neutral-600">
                {filteredAnnouncements.length}
              </span>
            </div>
          </div>

          {/* Search + Filter */}
          <div className="flex gap-2.5 border-b border-neutral-100 px-6 py-4">
            <div className="flex-1">
              <Input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by title or message..."
              />
            </div>
            <div className="w-44 flex-shrink-0">
              <Select
                value={filterRole}
                onChange={setFilterRole}
                options={[
                  { label: "All audiences", value: "all" },
                  { label: "Employees", value: "employee" },
                  { label: "Managers", value: "manager" },
                ]}
              />
            </div>
          </div>

          {/* List */}
          {filteredAnnouncements.length === 0 ? (
            <EmptyState
              icon={InboxIcon}
              title={searchTerm || filterRole !== "all" ? "No results found" : "No announcements yet"}
              description={
                searchTerm || filterRole !== "all"
                  ? "Try adjusting your search or filter"
                  : "Announcements will appear here once posted"
              }
            />
          ) : (
            <div className="flex max-h-[calc(100vh-220px)] flex-col gap-3 overflow-y-auto px-6 py-4">
              {filteredAnnouncements.map((item: any) => {
                const badge = getRoleBadge(item.target_role);
                return (
                  <div
                    key={item.id}
                    className="group relative rounded-xl border border-neutral-200 bg-white p-5 transition-all hover:border-neutral-300 hover:shadow-sm"
                  >
                    <span className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-sm bg-primary-500 opacity-0 transition-opacity group-hover:opacity-100" />
                    <div className="mb-2.5 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="mb-1.5 text-[15px] font-bold leading-tight text-neutral-800">{item.title}</h3>
                        <span className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-[11px] font-bold tracking-wide ${badge.bg} ${badge.color}`}>
                          {badge.label}
                        </span>
                      </div>
                    </div>

                    <p className="mb-3.5 line-clamp-3 text-[13.5px] leading-relaxed text-neutral-600">{item.message}</p>

                    <div className="flex items-center justify-between gap-3 border-t border-neutral-100 pt-3">
                      <span className="text-xs text-neutral-500">
                        Posted by <strong className="font-semibold text-neutral-800">{item.created_by}</strong>
                      </span>
                      <span className="whitespace-nowrap text-[11.5px] text-neutral-400">
                        {formatDate(item.created_at)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default AnnouncementsPage;
