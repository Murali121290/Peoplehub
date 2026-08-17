import React, { useEffect, Suspense, lazy } from 'react';

import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';

import { AppToaster } from './components/ui/ToastConfig';
import { BookLoader } from './components/ui/Spinner';
import { useAuthStore } from './store/authStore';
import DashboardLayout from './layouts/DashboardLayout';

// Pages
const LoginPage = lazy(() => import('./pages/LoginPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const HrmsModule = lazy(() => import("./pages/hr/HRAdminDashboard"));
const ManagerDashboardPage = lazy(() => import('./pages/ManagerDashboardPage'));
const EmployeeDashboardPage = lazy(() => import('./pages/employee/EmployeeDashboardPage'));
const CompleteProfile = lazy(() => import('./pages/Compeleteprofilepage'));
const AnnouncementsPage = lazy(() => import('./pages/AnnouncementsPage'));
const TelecomDirectoryPage = lazy(() => import("./pages/Telecomdirectory "));
const MeetingRoomsPage = lazy(() => import("./pages/mettingroom/MeetingRooms"));
const AppraisalDashboard = lazy(() => import("./pages/appraisal/AppraisalDashboard"));
const DBAdminPage = lazy(() => import("./pages/admin/DBAdminPage"));
const LeaveApprovalPage = lazy(() => import("./pages/manager/LeaveApprovalPage"));
const ShiftApprovalPage = lazy(() => import("./pages/manager/ShiftApprovalPage"));
const PermissionApprovalPage = lazy(() => import("./pages/manager/PermissionApprovalPage"));
const WFHApprovalPage = lazy(() => import("./pages/manager/WFHApprovalPage"));
const TeamManagementPage = lazy(() => import("./pages/manager/TeamManagementPage"));

const PageLoadingFallback = () => (
  <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
    <div className="h-16 w-16 rounded-full border-4 border-primary-200 border-t-primary-500 animate-spin"></div>
  </div>
);



interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedAccessLevels?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedAccessLevels,
}) => {
  const {
    isAuthenticated,
    checkAuth,
    loading,
    user,
  } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Loading Screen
  if (loading) {
    return (<div className="min-h-screen bg-neutral-50 flex items-center justify-center"> <div className="h-16 w-16 rounded-full border-4 border-primary-200 border-t-primary-500 animate-spin"></div> </div>
    );
  }

  // Redirect if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Redirect if role not allowed
  if (allowedAccessLevels && allowedAccessLevels.length > 0) {
    const userRole = (user?.role || '').toLowerCase();
    const userAccessLevel = (user?.access_level || '').toLowerCase();
    const allowed = allowedAccessLevels.map((l) => l.toLowerCase());
    const isAllowed = allowed.includes(userRole) || allowed.includes(userAccessLevel);
    if (!isAllowed) {
      return <Navigate to="/employee-dashboard" replace />;
    }
  }

  // Render protected layout
  return (<DashboardLayout>
    {children} </DashboardLayout>
  );
};

function App() {
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target && target.tagName === 'IMG') {
        e.preventDefault();
      }
    };

    const handleDragStart = (e: DragEvent) => {
      const target = e.target as HTMLElement;
      if (target && target.tagName === 'IMG') {
        e.preventDefault();
      }
    };

    document.addEventListener('contextmenu', handleContextMenu, true);
    document.addEventListener('dragstart', handleDragStart, true);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu, true);
      document.removeEventListener('dragstart', handleDragStart, true);
    };
  }, []);

  return (<BrowserRouter>

    {/* Toast Notifications */}

    <AppToaster />

    {/* Application Routes */}

    <Suspense fallback={<PageLoadingFallback />}>
      <Routes>

        {/* Login */}

        <Route
          path="/login"
          element={<LoginPage />}
        />



        {/* Settings */}

        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />

        {/* Pre Editing */}



        {/* Copywriting */}


        {/* QA */}


        {/* Default Redirect */}

        <Route
          path="/"
          element={
            <Navigate
              to="/login"
              replace
            />
          }
        />

        {/* Intercom Directory */}

        <Route
          path="/telecom-directory"
          element={
            <ProtectedRoute>
              <TelecomDirectoryPage />
            </ProtectedRoute>
          }
        />

        {/* Meeting Rooms */}

        <Route
          path="/meeting-rooms"
          element={
            <ProtectedRoute>
              <MeetingRoomsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/appraisal"
          element={
            <ProtectedRoute>
              <AppraisalDashboard />
            </ProtectedRoute>
          }
        />





        <Route
          path="/manager-dashboard"
          element={
            <ProtectedRoute allowedAccessLevels={['Manager', 'HR', 'Admin']}>
              <ManagerDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/team-management"
          element={
            <ProtectedRoute allowedAccessLevels={['Manager', 'HR', 'Admin']}>
              <TeamManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/leave-approval"
          element={
            <ProtectedRoute allowedAccessLevels={['Manager', 'HR', 'Admin']}>
              <LeaveApprovalPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/permission-approval"
          element={
            <ProtectedRoute allowedAccessLevels={['Manager', 'HR', 'Admin']}>
              <PermissionApprovalPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/shift-approval"
          element={
            <ProtectedRoute allowedAccessLevels={['Manager', 'HR', 'Admin']}>
              <ShiftApprovalPage isOdwOnly={false} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/odw-approval"
          element={
            <ProtectedRoute allowedAccessLevels={['Manager', 'HR', 'Admin']}>
              <ShiftApprovalPage isOdwOnly={true} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/wfh-approval"
          element={
            <ProtectedRoute allowedAccessLevels={['Manager', 'HR', 'Admin']}>
              <WFHApprovalPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/employee-dashboard"
          element={
            <ProtectedRoute>
              <EmployeeDashboardPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/announcements"
          element={
            <ProtectedRoute>
              <AnnouncementsPage />
            </ProtectedRoute>

          }
        />


        <Route
          path="/hrms"
          element={
            <ProtectedRoute allowedAccessLevels={['HR', 'Admin']}>
              <HrmsModule />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/db"
          element={
            <ProtectedRoute allowedAccessLevels={['Admin']}>
              <DBAdminPage />
            </ProtectedRoute>
          }
        />


        {/* Complete Profile */}

        <Route
          path="/complete-profile"
          element={
            <CompleteProfile />
          }
        />



        {/* 404 */}

        <Route
          path="*"
          element={
            <div className="min-h-screen bg-black flex items-center justify-center">
              <h1 className="text-4xl font-bold text-white">
                404 - Page Not Found
              </h1>
            </div>
          }
        />

      </Routes>
    </Suspense>
  </BrowserRouter>

  );
}

export default App;
