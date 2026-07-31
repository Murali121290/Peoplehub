import { API_URL } from "../../../config/api";
import { useState, useEffect } from "react";
import { createBooking } from "../../../services/meetingRoomService";
import { FormField, Input, Select, Textarea } from "../../../components/ui/Form";
import { Button } from "../../../components/ui/Button";
import { TimePicker } from "../../../components/ui/TimePicker";
import { DatePicker } from "../../../components/ui/DatePicker";

interface BookingFormProps {
  rooms: any[];
  onSuccess?: () => void;
  selectedRoomId?: string | number;
}

const BookingForm: React.FC<BookingFormProps> = ({
  rooms,
  onSuccess,
  selectedRoomId,
}) => {
  const today = new Date().toISOString().split("T")[0];

  const getLoggedInUser = () => {
    try {
      const userStr = localStorage.getItem("user");
      return userStr ? JSON.parse(userStr) : null;
    } catch (e) {
      console.error("Failed to parse user from localStorage:", e);
      return null;
    }
  };

  const loggedInUser = getLoggedInUser();
  const defaultOrganizer = loggedInUser?.full_name || "";
  const defaultDepartment = loggedInUser?.department || "";

  const initialForm = {
    room_id: selectedRoomId ? selectedRoomId.toString() : "",
    meeting_title: "",
    organizer_name: defaultOrganizer,
    department: defaultDepartment,
    meeting_date: today,
    start_time: "",
    end_time: "",
    attendees_count: "",
    remarks: "",
  };

  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resolvedOrganizer, setResolvedOrganizer] = useState(defaultOrganizer);
  const [resolvedDepartment, setResolvedDepartment] = useState(defaultDepartment);

  useEffect(() => {
    const fetchCurrentEmployeeDetails = async () => {
      try {
        const loggedInUser = getLoggedInUser();
        if (!loggedInUser) return;

        const response = await fetch(`${API_URL}/api/employees/`);
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data)) {
            const currentEmp = data.find(
              (emp) =>
                emp.user_id === loggedInUser.id ||
                emp.employee_id === loggedInUser.employee_id
            );
            if (currentEmp) {
              const fullName = `${currentEmp.first_name} ${currentEmp.last_name}`;
              setResolvedOrganizer(fullName);
              setResolvedDepartment(currentEmp.department || "");
              setForm((prev) => ({
                ...prev,
                organizer_name: fullName,
                department: currentEmp.department || "",
              }));
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch current employee database details", err);
      }
    };
    fetchCurrentEmployeeDetails();
  }, []);

  useEffect(() => {
    if (selectedRoomId != null) {
      setForm((prev) => ({
        ...prev,
        room_id: selectedRoomId.toString(),
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        room_id: "",
      }));
    }
  }, [selectedRoomId]);

  const [employees, setEmployees] = useState<any[]>([]);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const response = await fetch(`${API_URL}/api/employees/`);
        if (response.ok) {
          const data = await response.json();
          setEmployees(data || []);
        }
      } catch (error) {
        console.error("Failed to fetch employees", error);
      }
    };
    fetchEmployees();
  }, []);

  const organizerOptions = employees
    .filter((emp) =>
      ["manager", "admin", "hr"].includes(
        (emp.access_level || emp.role || "").toLowerCase()
      )
    )
    .map((emp) => ({
      label: `${emp.first_name} ${emp.last_name}`,
      value: `${emp.first_name} ${emp.last_name}`,
      department: emp.department || "",
    }));

  const handleOrganizerChange = (value: string) => {
    const selectedOrg = organizerOptions.find((opt) => opt.value === value);

    setForm((prev) => ({
      ...prev,
      organizer_name: value,
      department: selectedOrg ? selectedOrg.department : prev.department,
    }));

    setErrors((prev) => ({
      ...prev,
      organizer_name: "",
      department: "",
    }));

    setMessage({ type: "", text: "" });
  };

  const [message, setMessage] = useState<{
    type: "success" | "error" | "";
    text: string;
  }>({
    type: "",
    text: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: "",
    }));

    setMessage({
      type: "",
      text: "",
    });
  };

  const handleFieldChange = (name: string, value: string) => {
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: "",
    }));

    setMessage({
      type: "",
      text: "",
    });
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!form.meeting_title.trim()) {
      newErrors.meeting_title = "Meeting title is required";
    }

    if (!form.room_id) {
      newErrors.room_id = "Please select a room";
    }

    if (!form.organizer_name.trim()) {
      newErrors.organizer_name = "Organizer name is required";
    }

    if (!form.department.trim()) {
      newErrors.department = "Department is required";
    }

    if (!form.meeting_date) {
      newErrors.meeting_date = "Meeting date is required";
    }

    if (!form.start_time) {
      newErrors.start_time = "Start time is required";
    }

    if (!form.end_time) {
      newErrors.end_time = "End time is required";
    }

    if (
      form.start_time &&
      form.end_time &&
      form.start_time >= form.end_time
    ) {
      newErrors.end_time = "End time must be later than start time";
    }

    if (
      form.attendees_count &&
      Number(form.attendees_count) < 1
    ) {
      newErrors.attendees_count = "Attendees must be at least 1";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleBooking = async () => {
    if (!validateForm()) {
      setMessage({
        type: "error",
        text: "Please fix the highlighted fields.",
      });
      return;
    }

    try {
      setIsSubmitting(true);

      const payload = {
        ...form,
        attendees_count: form.attendees_count
          ? Number(form.attendees_count)
          : "",
      };

      const response = await createBooking(payload);

      setMessage({
        type: "success",
        text:
          response?.data?.message || "Booking created successfully",
      });

      setForm(initialForm);
      setErrors({});
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error("BOOKING ERROR:", error);

      setMessage({
        type: "error",
        text:
          error?.response?.data?.message || "Booking failed",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const roomOptions = rooms.map((room) => ({
    label: room.room_name,
    value: String(room.id),
  }));
  return (
    <div className="rounded-3xl bg-white">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-neutral-800">
          Create Booking
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          Schedule a meeting room with date, time, and organizer details.
        </p>
      </div>

      {message.text && (
        <div
          className={`mb-5 rounded-2xl border px-4 py-3 text-sm ${message.type === "success"
            ? "border-success-200 bg-success-50 text-success-700"
            : "border-danger-200 bg-danger-50 text-danger-700"
            }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <FormField label="Meeting Title" required error={errors.meeting_title}>
          <Input
            type="text"
            name="meeting_title"
            placeholder="Enter meeting title"
            value={form.meeting_title}
            onChange={handleChange}
            error={!!errors.meeting_title}
          />
        </FormField>

        <FormField label="Room" required error={errors.room_id}>
          <Select
            name="room_id"
            value={form.room_id}
            onChange={(value) => handleFieldChange("room_id", value)}
            options={roomOptions}
            placeholder="Select Room"
            error={!!errors.room_id}
          />
        </FormField>

        <FormField label="Organizer Name" required error={errors.organizer_name}>
          <Input
            type="text"
            name="organizer_name"
            placeholder="Organizer Name"
            value={form.organizer_name}
            readOnly
            className="bg-neutral-50 cursor-not-allowed border-neutral-300 text-neutral-500 font-medium"
            error={!!errors.organizer_name}
          />
        </FormField>

        <FormField label="Department" required error={errors.department}>
          <Input
            type="text"
            name="department"
            placeholder="Enter department"
            value={form.department}
            onChange={handleChange}
            error={!!errors.department}
          />
        </FormField>

        <FormField label="Meeting Date" required error={errors.meeting_date}>
          <DatePicker
            name="meeting_date"
            value={form.meeting_date}
            onChange={(val) => setForm((prev) => ({ ...prev, meeting_date: val }))}
            error={!!errors.meeting_date}
          />
        </FormField>

        <FormField label="Attendees" error={errors.attendees_count}>
          <Input
            type="number"
            name="attendees_count"
            placeholder="Enter attendee count"
            value={form.attendees_count}
            onChange={handleChange}
            error={!!errors.attendees_count}
          />
        </FormField>

        <FormField label="Start Time" required error={errors.start_time}>
          <TimePicker
            name="start_time"
            value={form.start_time}
            onChange={(val) => setForm((prev) => ({ ...prev, start_time: val }))}
            error={!!errors.start_time}
          />
        </FormField>

        <FormField label="End Time" required error={errors.end_time}>
          <TimePicker
            name="end_time"
            value={form.end_time}
            onChange={(val) => setForm((prev) => ({ ...prev, end_time: val }))}
            error={!!errors.end_time}
          />
        </FormField>

        <div className="md:col-span-2 xl:col-span-3">
          <FormField label="Remarks">
            <Textarea
              name="remarks"
              placeholder="Add meeting notes or booking remarks"
              value={form.remarks}
              onChange={handleChange}
              rows={4}
            />
          </FormField>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setForm({
              ...initialForm,
              organizer_name: resolvedOrganizer,
              department: resolvedDepartment,
            });
            setErrors({});
            setMessage({ type: "", text: "" });
          }}
        >
          Reset
        </Button>

        <Button
          type="button"
          variant="primary"
          onClick={handleBooking}
          disabled={isSubmitting}
          loading={isSubmitting}
        >
          {isSubmitting ? "Creating Booking..." : "Create Booking"}
        </Button>
      </div>
    </div>
  );
};

export default BookingForm;
