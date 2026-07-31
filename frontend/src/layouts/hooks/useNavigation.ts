import {
  HomeIcon, UserGroupIcon, FolderIcon, CalendarIcon, ChartBarIcon,
  Cog6ToothIcon, BanknotesIcon, BellIcon, PhoneIcon, BuildingOffice2Icon, ClipboardDocumentCheckIcon, CheckCircleIcon, ClockIcon
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
      { name: "Intercom Directory", icon: PhoneIcon, path: "/telecom-directory" },
      { name: "Meeting Rooms", icon: BuildingOffice2Icon, path: "/meeting-rooms" },
      { name: "Appraisal", icon: ClipboardDocumentCheckIcon, path: "/appraisal" },
    ];

    const teamManagementNode = {
      name: "Team Management",
      icon: UserGroupIcon,
      path: "/manager-dashboard",
      subItems: [
        { name: "Team Overview", icon: ChartBarIcon, path: "/manager-dashboard" },
        { name: "Leave Approval", icon: CheckCircleIcon, path: "/manager/leave-approval" },
        { name: "Permission Approval", icon: ClipboardDocumentCheckIcon, path: "/manager/permission-approval" },
        { name: "Shift Approval", icon: ClockIcon, path: "/manager/shift-approval" },
        { name: "WFH Approval", icon: HomeIcon, path: "/manager/wfh-approval" },
      ]
    };

    if (isAdmin) {
      return [
        { name: "Dashboard", icon: HomeIcon, path: "/employee-dashboard" },
        { name: "HR Management", icon: UserGroupIcon, path: "/hrms" },
        teamManagementNode,
        { name: "Intercom Directory", icon: PhoneIcon, path: "/telecom-directory" },
        { name: "Meeting Rooms", icon: BuildingOffice2Icon, path: "/meeting-rooms" },
        { name: "Announcements", icon: BellIcon, path: "/announcements" },
        { name: "Appraisal", icon: ClipboardDocumentCheckIcon, path: "/appraisal" },
      ];
    }

    if (isManager) {
      return [
        { name: "Dashboard", icon: HomeIcon, path: "/employee-dashboard" },
        teamManagementNode,
        { name: "Announcements", icon: BellIcon, path: "/announcements" },
        { name: "Intercom Directory", icon: PhoneIcon, path: "/telecom-directory" },
        { name: "Meeting Rooms", icon: BuildingOffice2Icon, path: "/meeting-rooms" },
        { name: "Appraisal", icon: ClipboardDocumentCheckIcon, path: "/appraisal" },
      ];
    }

    if (isHr) {
      return [
        { name: "Dashboard", icon: HomeIcon, path: "/employee-dashboard" },
        { name: "HR Management", icon: UserGroupIcon, path: "/hrms" },
        { name: "Intercom Directory", icon: PhoneIcon, path: "/telecom-directory" },
        { name: "Meeting Rooms", icon: BuildingOffice2Icon, path: "/meeting-rooms" },
        { name: "Announcements", icon: BellIcon, path: "/announcements" },
        { name: "Appraisal", icon: ClipboardDocumentCheckIcon, path: "/appraisal" },
      ];
    }

    return commonItems;
  };

  return { sidebarItems: getNavigationItems() };
};