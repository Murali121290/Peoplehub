import { useEffect, useState, useMemo } from "react";
import { CalendarDaysIcon, CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/outline";
import { cancelBooking } from "../../../services/meetingRoomService";
import { Card } from "../../../components/ui/Card";
import { Badge } from "../../../components/ui/Badge";
import type { BadgeVariant } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { Table } from "../../../components/ui/Table";
import type { Column } from "../../../components/ui/Table";
import { EmptyState } from "../../../components/ui/EmptyState";
import { ConfirmDialog } from "../../../components/ui/Modal";

interface BookingTableProps {
  bookings: any[];
  onRefresh: () => void;
}

const BookingTable = ({ bookings, onRefresh }: BookingTableProps) => {

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const handleCancel = async (id: number) => {
    try {
      setIsCancelling(true);
      await cancelBooking(id);
      showToast("Booking cancelled successfully", "success");
      setSelectedBooking(null);
      onRefresh();
    } catch (error) {
      console.error(error);
      showToast("Failed to cancel booking", "error");
    } finally {
      setIsCancelling(false);
    }
  };
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [toast, setToast] = useState<{
    show: boolean;
    type: "success" | "error";
    message: string;
  }>({
    show: false,
    type: "success",
    message: "",
  });

  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => {
        setToast((prev) => ({ ...prev, show: false }));
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [toast.show]);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({
      show: true,
      type,
      message,
    });
  };


  const getStatusVariant = (status: string): BadgeVariant => {
    switch ((status || "").toLowerCase()) {
      case "approved":
      case "confirmed":
      case "completed":
        return "success";
      case "pending":
        return "warning";
      case "cancelled":
      case "rejected":
        return "danger";
      case "in progress":
        return "info";
      default:
        return "neutral";
    }
  };

  const isBookingFinished = (booking: any) => {
    if (!booking.meeting_date || !booking.end_time) return false;
    try {
      const dateParts = booking.meeting_date.split("-");
      const timeParts = booking.end_time.split(":");
      if (dateParts.length < 3 || timeParts.length < 2) return false;
      const year = parseInt(dateParts[0], 10);
      const month = parseInt(dateParts[1], 10) - 1;
      const day = parseInt(dateParts[2], 10);
      const hours = parseInt(timeParts[0], 10);
      const minutes = parseInt(timeParts[1], 10);
      const seconds = timeParts.length > 2 ? parseInt(timeParts[2], 10) : 0;
      const endDate = new Date(year, month, day, hours, minutes, seconds);
      return endDate < new Date();
    } catch (e) {
      return false;
    }
  };

  // Returns true if the meeting start time is still in the future (cancellable)
  const isBeforeStartTime = (booking: any) => {
    if (!booking.meeting_date || !booking.start_time) return false;
    try {
      const dateParts = booking.meeting_date.split("-");
      const timeParts = booking.start_time.split(":");
      if (dateParts.length < 3 || timeParts.length < 2) return false;
      const year = parseInt(dateParts[0], 10);
      const month = parseInt(dateParts[1], 10) - 1;
      const day = parseInt(dateParts[2], 10);
      const hours = parseInt(timeParts[0], 10);
      const minutes = parseInt(timeParts[1], 10);
      const seconds = timeParts.length > 2 ? parseInt(timeParts[2], 10) : 0;
      const startDate = new Date(year, month, day, hours, minutes, seconds);
      return startDate > new Date();
    } catch (e) {
      return false;
    }
  };

  const getBookingDateTime = (booking: any, timeField: "start_time" | "end_time") => {
    if (!booking.meeting_date || !booking[timeField]) return new Date(0);
    try {
      const dateParts = booking.meeting_date.split("-");
      const timeParts = booking[timeField].split(":");
      if (dateParts.length < 3 || timeParts.length < 2) return new Date(0);
      const year = parseInt(dateParts[0], 10);
      const month = parseInt(dateParts[1], 10) - 1;
      const day = parseInt(dateParts[2], 10);
      const hours = parseInt(timeParts[0], 10);
      const minutes = parseInt(timeParts[1], 10);
      const seconds = timeParts.length > 2 ? parseInt(timeParts[2], 10) : 0;
      return new Date(year, month, day, hours, minutes, seconds);
    } catch (e) {
      return new Date(0);
    }
  };

  const sortedBookings = useMemo(() => {
    if (!Array.isArray(bookings)) return [];

    return [...bookings].sort((a, b) => {
      const isFinishedA = isBookingFinished(a);
      const isFinishedB = isBookingFinished(b);
      const isBeforeA = isBeforeStartTime(a);
      const isBeforeB = isBeforeStartTime(b);

      const isCancelledA = a.status === "Cancelled";
      const isCancelledB = b.status === "Cancelled";

      const isInProgressA = !isCancelledA && !isFinishedA && !isBeforeA;
      const isInProgressB = !isCancelledB && !isFinishedB && !isBeforeB;

      const isBookedA = !isCancelledA && !isFinishedA && isBeforeA;
      const isBookedB = !isCancelledB && !isFinishedB && isBeforeB;

      const isCompletedA = !isCancelledA && isFinishedA;
      const isCompletedB = !isCancelledB && isFinishedB;

      const getPriority = (isCancelled: boolean, isInProgress: boolean, isBooked: boolean, isCompleted: boolean) => {
        if (isInProgress) return 1;
        if (isBooked) return 2;
        if (isCompleted) return 3;
        if (isCancelled) return 4;
        return 5;
      };

      const priorityA = getPriority(isCancelledA, isInProgressA, isBookedA, isCompletedA);
      const priorityB = getPriority(isCancelledB, isInProgressB, isBookedB, isCompletedB);

      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      // Within same priority, sort by date/time
      const startA = getBookingDateTime(a, "start_time");
      const startB = getBookingDateTime(b, "start_time");

      if (priorityA === 2) {
        // Future Bookings: ascending (nearest first)
        return startA.getTime() - startB.getTime();
      } else {
        // Completed, Cancelled, In Progress: descending (latest first)
        return startB.getTime() - startA.getTime();
      }
    });
  }, [bookings]);

  const canCancel = (status: string) => {
    const normalized = (status || "").toLowerCase();
    return normalized === "confirmed" || normalized === "approved";
  };

  if (!Array.isArray(bookings) || bookings.length === 0) {
    return (
      <Card padding="none">
        <div className="border-b border-neutral-200 px-6 py-5">
          <h2 className="text-lg font-semibold text-neutral-800">Bookings</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Track meeting room reservations and schedule activity.
          </p>
        </div>

        <EmptyState
          icon={CalendarDaysIcon}
          title="No bookings found"
          description="New booking entries will appear here once meetings are scheduled."
        />
      </Card>
    );
  }

  const columns: Column<any>[] = [
    {
      key: "meeting",
      header: "Meeting",
      render: (booking) => (
        <div>
          <p className="font-semibold text-neutral-800">
            {booking.meeting_title || "-"}
          </p>
          <p className="mt-1 text-xs text-neutral-400">
            Booking ID: {booking.id}
          </p>
        </div>
      ),
    },
    {
      key: "organizer_name",
      header: "Organizer",
      render: (booking) => (
        <span className="text-sm font-medium text-neutral-700">
          {booking.organizer_name || "-"}
        </span>
      ),
    },
    {
      key: "meeting_date",
      header: "Date",
      render: (booking) => (
        <span className="text-sm text-neutral-600">
          {booking.meeting_date || "-"}
        </span>
      ),
    },
    {
      key: "start_time",
      header: "Start",
      render: (booking) => (
        <span className="text-sm text-neutral-600">
          {booking.start_time || "-"}
        </span>
      ),
    },
    {
      key: "end_time",
      header: "End",
      render: (booking) => (
        <span className="text-sm text-neutral-600">
          {booking.end_time || "-"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (booking) => {
        const displayStatus = (isBookingFinished(booking) && booking.status !== "Cancelled") ? "Completed" : (booking.status || "Unknown");
        return (
          <Badge variant={getStatusVariant(displayStatus)} dot>
            {displayStatus}
          </Badge>
        );
      },
    },
    {
      key: "action",
      header: "Action",
      render: (booking) => {
        // Who can cancel: the person who booked, or admin/hr
        const currentUserId = user?.id || user?.user_id;
        const isOwner =
          (booking.organizer_id && currentUserId && String(booking.organizer_id) === String(currentUserId)) ||
          booking.organizer_name === user?.full_name ||
          booking.organizer_name === user?.employee_name ||
          booking.organizer_name === localStorage.getItem("full_name");

        const isHrOrAdmin =
          user?.access_level === "admin" || user?.access_level === "hr";

        const canCancelBooking = isOwner || isHrOrAdmin;

        // Meeting is finished (past end time)
        if (isBookingFinished(booking) && booking.status !== "Cancelled") {
          return <Badge variant="success">Completed</Badge>;
        }

        // Already cancelled
        if (booking.status === "Cancelled") {
          return <span className="text-xs text-neutral-400">—</span>;
        }

        // Only show cancel if status is cancellable
        if (!canCancel(booking.status)) {
          return <span className="text-xs text-neutral-400">—</span>;
        }

        // Meeting has already started — no cancel allowed
        if (!isBeforeStartTime(booking)) {
          return (
            <Badge variant="warning">In Progress</Badge>
          );
        }

        // Show cancel button only to owner or HR/Admin
        return canCancelBooking ? (
          <Button
            variant="danger"
            size="sm"
            onClick={() => setSelectedBooking(booking)}
          >
            Cancel
          </Button>
        ) : (
          <Badge variant="neutral">Booked</Badge>
        );
      },
    },
  ];

  return (
    <>
      {toast.show && (
        <div className="fixed right-5 top-5 z-toast">
          <div
            className={`flex min-w-[320px] items-start gap-3 rounded-2xl border px-4 py-3 shadow-popover ${
              toast.type === "success"
                ? "border-success-200 bg-success-50 text-success-800"
                : "border-danger-200 bg-danger-50 text-danger-800"
            }`}
          >
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full ${
                toast.type === "success" ? "bg-success-100" : "bg-danger-100"
              }`}
            >
              {toast.type === "success" ? (
                <CheckCircleIcon className="h-5 w-5 text-success-600" />
              ) : (
                <XCircleIcon className="h-5 w-5 text-danger-600" />
              )}
            </div>

            <div className="flex-1">
              <p className="text-sm font-semibold">
                {toast.type === "success" ? "Success" : "Error"}
              </p>
              <p className="text-sm opacity-90">{toast.message}</p>
            </div>

            <button
              onClick={() => setToast((prev) => ({ ...prev, show: false }))}
              className="text-lg leading-none opacity-60 hover:opacity-100"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <Card padding="none">
        <div className="flex flex-col gap-3 border-b border-neutral-200 px-6 py-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-neutral-800">Reservation</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Track meeting room reservations.
            </p>
          </div>

          <div className="inline-flex w-fit items-center rounded-full bg-neutral-100 px-3 py-1 text-sm font-medium text-neutral-600">
            Total: {bookings.length}
          </div>
        </div>

        <div className="p-0">
          <Table columns={columns} data={sortedBookings} rowKey={(booking) => booking.id} zebra={false} />
        </div>
      </Card>

      <ConfirmDialog
        isOpen={!!selectedBooking}
        title="Cancel Booking"
        message="Are you sure you want to cancel this booking?"
        description={
          selectedBooking
            ? `${selectedBooking.meeting_title || "-"} — ${selectedBooking.organizer_name || "-"} on ${selectedBooking.meeting_date || "-"}`
            : undefined
        }
        variant="danger"
        confirmLabel={isCancelling ? "Cancelling..." : "Yes, Cancel"}
        cancelLabel="Keep Booking"
        loading={isCancelling}
        onCancel={() => setSelectedBooking(null)}
        onConfirm={() => handleCancel(selectedBooking.id)}
      />
    </>
  );
};

export default BookingTable;
