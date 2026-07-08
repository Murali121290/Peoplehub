import {
  HomeIcon, UserGroupIcon, FolderIcon, CalendarIcon, ChartBarIcon,
  Cog6ToothIcon, BanknotesIcon, BellIcon,PhoneIcon,BuildingOffice2Icon,ClipboardDocumentCheckIcon
} from "@heroicons/react/24/outline";

export const useNavigation = (user: any) => {
  const getNavigationItems = () => {
    const normalizedRole = `${user?.access_level || user?.role || ""}`.toLowerCase();
    const isAdmin = normalizedRole.includes("admin") || normalizedRole.includes("super");
    const isManager = normalizedRole.includes("manager") || normalizedRole.includes("lead");
    const isHr = normalizedRole.includes("hr") || normalizedRole.includes("human");

    const commonItems = [
      { name: "Dashboard", icon: HomeIcon, path: "/employee-dashboard" },
      { name: "Announcements", icon: BellIcon, path: "/announcements" },
      { name: "Telecom Directory", icon: PhoneIcon, path: "/telecom-directory" },
      { name: "Meeting Rooms", icon: BuildingOffice2Icon, path: "/meeting-rooms" },
      { name: "Appraisal", icon: ClipboardDocumentCheckIcon, path: "/appraisal" },
    ];

    if (isAdmin) {
      return [
        ...commonItems.slice(0, 1),
        { name: "Telecom Directory", icon: PhoneIcon, path: "/telecom-directory" },
        { name: "Meeting Rooms", icon: BuildingOffice2Icon, path: "/meeting-rooms" },
        { name: "Appraisal", icon: ClipboardDocumentCheckIcon, path: "/appraisal" },
        { name: "Settings", icon: Cog6ToothIcon, path: "/settings" },
        { name: "Announcements", icon: BellIcon, path: "/announcements" },
      ];
    }

    if (isManager) {
      return [
        { name: "Dashboard", icon: HomeIcon, path: "/employee-dashboard" },
        { name: "Team Management", icon: UserGroupIcon, path: "/manager-dashboard" },
        { name: "Announcements", icon: BellIcon, path: "/announcements" },
        { name: "Telecom Directory", icon: PhoneIcon, path: "/telecom-directory" },
        { name: "Meeting Rooms", icon: BuildingOffice2Icon, path: "/meeting-rooms" },
        { name: "Appraisal", icon: ClipboardDocumentCheckIcon, path: "/appraisal" },
      ];
    }

    if (isHr) {
      return [
        { name: "Dashboard", icon: HomeIcon, path: "/employee-dashboard" },
        { name: "HR Management", icon: UserGroupIcon, path: "/hrms" },
        { name: "Telecom Directory", icon: PhoneIcon, path: "/telecom-directory" },
        { name: "Meeting Rooms", icon: BuildingOffice2Icon, path: "/meeting-rooms" },
        { name: "Announcements", icon: BellIcon, path: "/announcements" },
        { name: "Appraisal", icon: ClipboardDocumentCheckIcon, path: "/appraisal" },
      ];
    }

    return commonItems;
  };

  return { sidebarItems: getNavigationItems() };
};