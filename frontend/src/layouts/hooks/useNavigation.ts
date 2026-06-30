import {
  HomeIcon, UserGroupIcon, FolderIcon, CalendarIcon, ChartBarIcon,
  Cog6ToothIcon, BanknotesIcon, BellIcon,PhoneIcon,BuildingOffice2Icon,
} from "@heroicons/react/24/outline";

export const useNavigation = (user: any) => {
  const getNavigationItems = () => {
    if (user?.access_level === "admin") {
      return [
      { name: "Dashboard", icon: HomeIcon, path: "/employee-dashboard" },
  { name: "Telecom Directory", icon: PhoneIcon, path: "/telecom-directory" },
  { name: "Meeting Rooms", icon: BuildingOffice2Icon, path: "/meeting-rooms" },
        { name: "Settings", icon: Cog6ToothIcon, path: "/settings" },
        { name: "Announcements", icon: BellIcon, path: "/announcements" },
      ];
    }

    if (user?.access_level === "manager") {
      return [
      { name: "Dashboard", icon: HomeIcon, path: "/employee-dashboard" },
        { name: "Team Management", icon: UserGroupIcon, path: "/manager-dashboard" },
        { name: "Announcements", icon: BellIcon, path: "/announcements" },
          { name: "Telecom Directory", icon: PhoneIcon, path: "/telecom-directory" },
  { name: "Meeting Rooms", icon: BuildingOffice2Icon, path: "/meeting-rooms" },
      ];
    }

    if (user?.access_level === "hr") {
      return [
              { name: "Dashboard", icon: HomeIcon, path: "/employee-dashboard" },

        { name: "HR Management", icon: UserGroupIcon, path: "/hrms" },

  { name: "Telecom Directory", icon: PhoneIcon, path: "/telecom-directory" },
  { name: "Meeting Rooms", icon: BuildingOffice2Icon, path: "/meeting-rooms" },
        { name: "Announcements", icon: BellIcon, path: "/announcements" },
      ];
    }

    return [
      { name: "Dashboard", icon: HomeIcon, path: "/employee-dashboard" },
      { name: "Announcements", icon: BellIcon, path: "/announcements" },
        { name: "Telecom Directory", icon: PhoneIcon, path: "/telecom-directory" },
  { name: "Meeting Rooms", icon: BuildingOffice2Icon, path: "/meeting-rooms" },
    ];
  };

  return { sidebarItems: getNavigationItems() };
};