import React, { useEffect } from 'react';

import {
BrowserRouter,
Routes,
Route,
Navigate,
} from 'react-router-dom';

import { Toaster } from 'react-hot-toast';


import { useAuthStore } from './store/authStore';

import DashboardLayout from './layouts/DashboardLayout';

// Pages
import LoginPage from './pages/LoginPage';
import SettingsPage from './pages/SettingsPage';
import  HrmsModule  from "./pages/hr/HRAdminDashboard";
import ManagerDashboardPage from './pages/ManagerDashboardPage';
import EmployeeDashboardPage from './pages/employee/EmployeeDashboardPage';
import CompleteProfile from './pages/Compeleteprofilepage';
import AnnouncementsPage from './pages/AnnouncementsPage';
import TelecomDirectoryPage from "./pages/Telecomdirectory ";
import MeetingRoomsPage from "./pages/mettingroom/MeetingRooms";



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
return ( <div className="min-h-screen bg-gray-900 flex items-center justify-center"> <div className="h-16 w-16 rounded-full border-4 border-white border-t-transparent animate-spin"></div> </div>
);
}

// Redirect if not authenticated

if (!isAuthenticated) {
return <Navigate to="/login" replace />;
}

// Render protected layout

return ( <DashboardLayout>
{children} </DashboardLayout>
);
};

function App() {
return ( <BrowserRouter>

  {/* Toast Notifications */}

  <Toaster
    position="top-right"
    toastOptions={{
      duration: 4000,

      style: {
        background: '#1f2937',
        color: '#ffffff',
        border: '1px solid #374151',
      },

      success: {
        iconTheme: {
          primary: '#10B981',
          secondary: '#ffffff',
        },
      },

      error: {
        iconTheme: {
          primary: '#EF4444',
          secondary: '#ffffff',
        },
      },
    }}
  />

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

    {/* Telecom Directory */}

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
  path="/manager-dashboard"
  element={
    <ProtectedRoute>
      <ManagerDashboardPage />
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
