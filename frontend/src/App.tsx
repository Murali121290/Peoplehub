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
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
}) => {
  const {
    isAuthenticated,
    checkAuth,
    loading,
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
            <ProtectedRoute>
              <ManagerDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/team-management"
          element={
            <ProtectedRoute>
              <TeamManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/leave-approval"
          element={
            <ProtectedRoute>
              <LeaveApprovalPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/permission-approval"
          element={
            <ProtectedRoute>
              <PermissionApprovalPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/shift-approval"
          element={
            <ProtectedRoute>
              <ShiftApprovalPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/wfh-approval"
          element={
            <ProtectedRoute>
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
            <ProtectedRoute>
              <HrmsModule />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/db"
          element={
            <ProtectedRoute>
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
