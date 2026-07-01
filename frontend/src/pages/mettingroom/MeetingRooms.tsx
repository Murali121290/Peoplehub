import { useEffect, useState } from "react";
import {
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";
import DashboardCards from "./components/DashboardCards";
import BookingForm from "./components/BookingForm";
import RoomCard from "./components/RoomCard";
import BookingTable from "./components/BookingTable";

import {
  getRooms,
  getBookings,
  createRoom,
} from "../../services/meetingRoomService";

import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { FormField, Input, Select } from "../../components/ui/Form";

type ToastType = "success" | "error" | "info";

const MeetingRooms = () => {
  const [rooms, setRooms] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);

  const [showRoomModal, setShowRoomModal] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);

  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    type: ToastType;
  }>({
    show: false,
    message: "",
    type: "success",
  });

  const [roomForm, setRoomForm] = useState({
    room_name: "",
    location: "",
    floor: "",
    capacity: "",
    room_type: "Conference Room",
  });

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  useEffect(() => {
    fetchRooms();
    fetchBookings();
  }, []);

  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => {
        setToast((prev) => ({ ...prev, show: false }));
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [toast.show]);

  const showToast = (message: string, type: ToastType = "success") => {
    setToast({
      show: true,
      message,
      type,
    });
  };

  const fetchRooms = async () => {
    try {
      const response = await getRooms();
      setRooms(response.data || response);
    } catch (error) {
      console.error(error);
      showToast("Failed to fetch rooms", "error");
    }
  };

  const fetchBookings = async () => {
    try {
      const response = await getBookings();
      setBookings(response.data || response);
    } catch (error) {
      console.error(error);
      showToast("Failed to fetch bookings", "error");
    }
  };

  const handleCreateRoom = async () => {
    if (
      !roomForm.room_name.trim() ||
      !roomForm.location.trim() ||
      !roomForm.floor.trim() ||
      !roomForm.capacity.trim()
    ) {
      showToast("Please fill all room details", "error");
      return;
    }

    try {
      setIsCreatingRoom(true);

      await createRoom({
        ...roomForm,
        capacity: Number(roomForm.capacity),
      });

      setShowRoomModal(false);

      setRoomForm({
        room_name: "",
        location: "",
        floor: "",
        capacity: "",
        room_type: "Conference Room",
      });

      showToast("Room created successfully", "success");
      fetchRooms();
    } catch (error) {
      console.error(error);
      showToast("Failed to create room", "error");
    } finally {
      setIsCreatingRoom(false);
    }
  };

  const toastStyles = {
    success: {
      container: "border-success-200 bg-success-50 text-success-800",
      iconBg: "bg-success-100",
      iconColor: "text-success-600",
    },
    error: {
      container: "border-danger-200 bg-danger-50 text-danger-800",
      iconBg: "bg-danger-100",
      iconColor: "text-danger-600",
    },
    info: {
      container: "border-info-200 bg-info-50 text-info-800",
      iconBg: "bg-info-100",
      iconColor: "text-info-600",
    },
  };

  const currentToastStyle = toastStyles[toast.type];

  const roomTypeOptions = [
    { label: "Conference Room", value: "Conference Room" },
    { label: "Board Room", value: "Board Room" },
    { label: "Training Room", value: "Training Room" },
  ];

  return (
    <div className="min-h-screen bg-neutral-50 p-6">
      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed top-5 right-5 z-toast animate-in slide-in-from-top-3 duration-300">
          <div
            className={`flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-popover min-w-[320px] max-w-md ${currentToastStyle.container}`}
          >
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full ${currentToastStyle.iconBg}`}
            >
              {toast.type === "success" && (
                <CheckCircleIcon className={`h-5 w-5 ${currentToastStyle.iconColor}`} />
              )}

              {toast.type === "error" && (
                <XCircleIcon className={`h-5 w-5 ${currentToastStyle.iconColor}`} />
              )}

              {toast.type === "info" && (
                <InformationCircleIcon className={`h-5 w-5 ${currentToastStyle.iconColor}`} />
              )}
            </div>

            <div className="flex-1">
              <p className="text-sm font-semibold">
                {toast.type === "success"
                  ? "Success"
                  : toast.type === "error"
                  ? "Error"
                  : "Info"}
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

      {/* Header */}
      <Card className="mb-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-neutral-500">
              Workspace / Meeting Rooms
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-neutral-800">
              Meeting Room Management
            </h1>
            <p className="mt-2 text-sm text-neutral-500">
              Manage rooms, create bookings, and monitor workplace availability.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {(user?.access_level === "admin" || user?.access_level === "hr") && (
              <Button variant="success" onClick={() => setShowRoomModal(true)}>
                + Create Room
              </Button>
            )}

            <Button variant="primary" onClick={() => setShowBookingModal(true)}>
              + Create Booking
            </Button>
          </div>
        </div>
      </Card>

      {/* Dashboard Sections */}
      <div className="space-y-6">
        <Card>
          <DashboardCards />
        </Card>

        <Card>
          <RoomCard rooms={rooms} />
        </Card>

        <Card padding="none" className="overflow-hidden">
          <BookingTable
  bookings={bookings}
  onRefresh={fetchBookings}
/>
        </Card>
      </div>

      {/* Create Room Modal */}
      <Modal
        isOpen={
          showRoomModal &&
          (user?.access_level === "admin" || user?.access_level === "hr")
        }
        onClose={() => setShowRoomModal(false)}
        size="lg"
        title="Create Meeting Room"
        eyebrow={{ label: "Add a new room to your workspace inventory." }}
        footer={
          <>
            <Button variant="outline" onClick={() => setShowRoomModal(false)}>
              Cancel
            </Button>

            <Button
              variant="success"
              onClick={handleCreateRoom}
              disabled={isCreatingRoom}
              loading={isCreatingRoom}
            >
              {isCreatingRoom ? "Saving..." : "Save Room"}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField label="Name">
            <Input
              type="text"
              placeholder="Enter name"
              value={roomForm.room_name}
              onChange={(e) =>
                setRoomForm({
                  ...roomForm,
                  room_name: e.target.value,
                })
              }
            />
          </FormField>

          <FormField label="Location">
            <Input
              type="text"
              placeholder="Enter location"
              value={roomForm.location}
              onChange={(e) =>
                setRoomForm({
                  ...roomForm,
                  location: e.target.value,
                })
              }
            />
          </FormField>

          <FormField label="Floor">
            <Input
              type="text"
              placeholder="Enter floor"
              value={roomForm.floor}
              onChange={(e) =>
                setRoomForm({
                  ...roomForm,
                  floor: e.target.value,
                })
              }
            />
          </FormField>

          <FormField label="Capacity">
            <Input
              type="number"
              placeholder="Enter capacity"
              value={roomForm.capacity}
              onChange={(e) =>
                setRoomForm({
                  ...roomForm,
                  capacity: e.target.value,
                })
              }
            />
          </FormField>

          <div className="md:col-span-2">
            <FormField label="Room Type">
              <Select
                value={roomForm.room_type}
                onChange={(value) =>
                  setRoomForm({
                    ...roomForm,
                    room_type: value,
                  })
                }
                options={roomTypeOptions}
              />
            </FormField>
          </div>
        </div>
      </Modal>

      {/* Create Booking Modal */}
      <Modal
        isOpen={showBookingModal}
        onClose={() => setShowBookingModal(false)}
        size="xl"
        title="Create Booking"
        eyebrow={{ label: "Schedule and manage a room reservation." }}
      >
        <BookingForm />
      </Modal>
    </div>
  );
};

export default MeetingRooms;
