import {
  MapPinIcon,
  Squares2X2Icon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { Card } from "../../../components/ui/Card";
import { Badge } from "../../../components/ui/Badge";
import type { BadgeVariant } from "../../../components/ui/Badge";
import { EmptyState } from "../../../components/ui/EmptyState";

interface RoomCardProps {
  rooms: any[];
}

const RoomCard = ({ rooms }: RoomCardProps) => {
  const getStatusVariant = (status: string): BadgeVariant => {
    switch ((status || "").toLowerCase()) {
      case "available":
        return "success";
      case "booked":
        return "danger";
      case "maintenance":
        return "warning";
      default:
        return "neutral";
    }
  };

  if (!Array.isArray(rooms) || rooms.length === 0) {
    return (
      <Card className="border-dashed">
        <EmptyState
          icon={Squares2X2Icon}
          title="No rooms available"
          description="Create a new meeting room to start managing bookings."
        />
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
      {rooms.map((room: any) => (
        <Card
          key={room.id}
          className="group transition-all duration-300 hover:-translate-y-1 hover:shadow-popover"
        >
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-neutral-800">
                {room.room_name}
              </h3>
              <p className="mt-1 text-sm text-neutral-500">
                Meeting space overview
              </p>
            </div>

            <Badge variant={getStatusVariant(room.status)} dot>
              {room.status || "Unknown"}
            </Badge>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-2xl bg-neutral-50 px-4 py-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100 text-primary-600">
                <MapPinIcon className="h-5 w-5" />
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
                  Location
                </p>
                <p className="text-sm font-semibold text-neutral-700">
                  {room.location || "-"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl bg-neutral-50 px-4 py-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary-100 text-secondary-600">
                <Squares2X2Icon className="h-5 w-5" />
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
                  Floor
                </p>
                <p className="text-sm font-semibold text-neutral-700">
                  {room.floor || "-"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl bg-neutral-50 px-4 py-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success-100 text-success-600">
                <UserGroupIcon className="h-5 w-5" />
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
                  Capacity
                </p>
                <p className="text-sm font-semibold text-neutral-700">
                  {room.capacity || 0} People
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between border-t border-neutral-100 pt-4">
            <p className="text-xs text-neutral-400">Room ID: {room.id}</p>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default RoomCard;
