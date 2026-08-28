import {
  HomeIcon, UserGroupIcon, ChartBarIcon,
  BellIcon, PhoneIcon, BuildingOffice2Icon, ClipboardDocumentCheckIcon,
  QuestionMarkCircleIcon
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
      { name: "Help & FAQ", icon: QuestionMarkCircleIcon, path: "/faq" },
    ];

    const teamManagementNode = {
      name: "Team Management",
      icon: UserGroupIcon,
      path: "/manager-dashboard",
      subItems: [
        { name: "Team Overview", icon: ChartBarIcon, path: "/manager-dashboard" },
        { name: "All Approvals", icon: ClipboardDocumentCheckIcon, path: "/manager/team-management" },
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
        { name: "Help & FAQ", icon: QuestionMarkCircleIcon, path: "/faq" },
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
        { name: "Help & FAQ", icon: QuestionMarkCircleIcon, path: "/faq" },
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
        { name: "Help & FAQ", icon: QuestionMarkCircleIcon, path: "/faq" },
      ];
    }

    return commonItems;
  };

  return { sidebarItems: getNavigationItems() };
};