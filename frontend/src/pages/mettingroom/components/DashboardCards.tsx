import { useEffect, useState } from "react";
import {
  BuildingOffice2Icon,
  CheckCircleIcon,
  CalendarDaysIcon,
  ClockIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";
import { getDashboardStats } from "../../../services/meetingRoomService";
import { StatCard } from "../../../components/ui/StatCard";
import type { StatCardColor } from "../../../components/ui/StatCard";

const DashboardCards = () => {

  const [stats, setStats] = useState({
    total_rooms: 0,
    available_rooms: 0,
    booked_today: 0,
    pending: 0,
    utilization: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await getDashboardStats();

      setStats(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  const cards: {
    title: string;
    value: string | number;
    color: StatCardColor;
    icon: React.ElementType;
  }[] = [
    {
      title: "Total Rooms",
      value: stats.total_rooms,
      color: "neutral",
      icon: BuildingOffice2Icon,
    },
    {
      title: "Available",
      value: stats.available_rooms,
      color: "success",
      icon: CheckCircleIcon,
    },
    {
      title: "Booked Today",
      value: stats.booked_today,
      color: "primary",
      icon: CalendarDaysIcon,
    },
    {
      title: "Pending",
      value: stats.pending,
      color: "warning",
      icon: ClockIcon,
    },
    {
      title: "Utilization",
      value: `${stats.utilization}%`,
      color: "info",
      icon: ChartBarIcon,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {cards.map((item) => (
        <StatCard
          key={item.title}
          title={item.title}
          value={item.value}
          color={item.color}
          icon={item.icon}
        />
      ))}
    </div>
  );
};

export default DashboardCards;
