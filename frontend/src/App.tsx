import React, { useEffect } from 'react';

import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';

import { AppToaster } from './components/ui/ToastConfig';


import { useAuthStore } from './store/authStore';

import DashboardLayout from './layouts/DashboardLayout';

// Pages
import LoginPage from './pages/LoginPage';
import SettingsPage from './pages/SettingsPage';
import HrmsModule from "./pages/hr/HRAdminDashboard";
import ManagerDashboardPage from './pages/ManagerDashboardPage';
import EmployeeDashboardPage from './pages/employee/EmployeeDashboardPage';
import CompleteProfile from './pages/Compeleteprofilepage';
import AnnouncementsPage from './pages/AnnouncementsPage';
import TelecomDirectoryPage from "./pages/Telecomdirectory ";
import MeetingRoomsPage from "./pages/mettingroom/MeetingRooms";
import AppraisalDashboard from "./pages/appraisal/AppraisalDashboard";
import DBAdminPage from "./pages/admin/DBAdminPage";
import LeaveApprovalPage from "./pages/manager/LeaveApprovalPage";
import ShiftApprovalPage from "./pages/manager/ShiftApprovalPage";
import PermissionApprovalPage from "./pages/manager/PermissionApprovalPage";
import WFHApprovalPage from "./pages/manager/WFHApprovalPage";



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
  return (<BrowserRouter>

    {/* Toast Notifications */}

    <AppToaster />

    {/* Application Routes */}

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
  </BrowserRouter>

  );
}

export default App;
