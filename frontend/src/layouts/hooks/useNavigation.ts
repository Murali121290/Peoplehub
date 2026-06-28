import {
  HomeIcon, UserGroupIcon, FolderIcon, CalendarIcon, ChartBarIcon,
  Cog6ToothIcon, BanknotesIcon, BellIcon,PhoneIcon,BuildingOffice2Icon,
} from "@heroicons/react/24/outline";

export const useNavigation = (user: any) => {
  const getNavigationItems = () => {
    if (user?.access_level === "admin") {
      return [
        { name: "Dashboard", icon: HomeIcon, path: "/dashboard" },
        { name: "Projects", icon: FolderIcon, path: "/projects" },
        { name: "Clients", icon: UserGroupIcon, path: "/clients" },
  { name: "Telecom Directory", icon: PhoneIcon, path: "/telecom-directory" },
  { name: "Meeting Rooms", icon: BuildingOffice2Icon, path: "/meeting-rooms" },
        { name: "Settings", icon: Cog6ToothIcon, path: "/settings" },
        { name: "Calendar", icon: CalendarIcon, path: "/calendar" },
        { name: "Reports", icon: ChartBarIcon, path: "/reports" },
        { name: "Announcements", icon: BellIcon, path: "/announcements" },
      ];
    }

    if (user?.access_level === "manager") {
      return [
        { name: "Dashboard", icon: HomeIcon, path: "/dashboard" },
        { name: "Projects", icon: FolderIcon, path: "/projects" },
        { name: "Team Management", icon: UserGroupIcon, path: "/manager-dashboard" },
        { name: "Employee Dashboard", icon: HomeIcon, path: "/employee-dashboard" },
        { name: "Calendar", icon: CalendarIcon, path: "/calendar" },
        { name: "Reports", icon: ChartBarIcon, path: "/reports" },
        { name: "Announcements", icon: BellIcon, path: "/announcements" },
          { name: "Telecom Directory", icon: PhoneIcon, path: "/telecom-directory" },
  { name: "Meeting Rooms", icon: BuildingOffice2Icon, path: "/meeting-rooms" },
      ];
    }

    if (user?.access_level === "hr") {
      return [
        { name: "HR Management", icon: UserGroupIcon, path: "/hrms" },
        { name: "Calendar", icon: CalendarIcon, path: "/calendar" },
        { name: "Reports", icon: ChartBarIcon, path: "/reports" },

  { name: "Telecom Directory", icon: PhoneIcon, path: "/telecom-directory" },
  { name: "Meeting Rooms", icon: BuildingOffice2Icon, path: "/meeting-rooms" },
        { name: "Announcements", icon: BellIcon, path: "/announcements" },
      ];
    }

    return [
      { name: "Dashboard", icon: HomeIcon, path: "/employee-dashboard" },
      { name: "Reports", icon: ChartBarIcon, path: "/reports" },
      { name: "Announcements", icon: BellIcon, path: "/announcements" },
        { name: "Telecom Directory", icon: PhoneIcon, path: "/telecom-directory" },
  { name: "Meeting Rooms", icon: BuildingOffice2Icon, path: "/meeting-rooms" },
    ];
  };

  return { sidebarItems: getNavigationItems() };
};