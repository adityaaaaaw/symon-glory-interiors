import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import LoadingSpinner from './components/LoadingSpinner';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';

// Layouts
import AdminLayout from './layouts/AdminLayout';
import ClientLayout from './layouts/ClientLayout';
import DesignerLayout from './layouts/DesignerLayout';
import EngineerLayout from './layouts/EngineerLayout';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import BookingsManagement from './pages/admin/BookingsManagement';
import SlotManagement from './pages/admin/SlotManagement';
import UserManagement from './pages/admin/UserManagement';
import AdminCalendar from './pages/admin/AdminCalendar';
import Reports from './pages/admin/Reports';

// Client Pages
import ClientDashboard from './pages/client/ClientDashboard';
import BookingForm from './pages/client/BookingForm';
import BookingHistory from './pages/client/BookingHistory';

// Designer Pages
import DesignerDashboard from './pages/designer/DesignerDashboard';
import VisitReportForm from './pages/designer/VisitReportForm';

// Engineer Pages
import EngineerDashboard from './pages/engineer/EngineerDashboard';
import InspectionForm from './pages/engineer/InspectionForm';

// Helper component for role-based protection
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingSpinner fullPage={true} />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role_name)) {
    // Redirect to correct dashboard based on role
    switch (user.role_name) {
      case 'Admin':
        return <Navigate to="/admin" replace />;
      case 'Client':
        return <Navigate to="/client" replace />;
      case 'Designer':
        return <Navigate to="/designer" replace />;
      case 'Site Engineer':
        return <Navigate to="/engineer" replace />;
      default:
        return <Navigate to="/login" replace />;
    }
  }

  return children;
};

const App = () => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner fullPage={true} />;
  }

  return (
    <Routes>
      {/* Root redirection */}
      <Route
        path="/"
        element={
          !isAuthenticated ? (
            <Navigate to="/login" replace />
          ) : user.role_name === 'Admin' ? (
            <Navigate to="/admin" replace />
          ) : user.role_name === 'Client' ? (
            <Navigate to="/client" replace />
          ) : user.role_name === 'Designer' ? (
            <Navigate to="/designer" replace />
          ) : user.role_name === 'Site Engineer' ? (
            <Navigate to="/engineer" replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* Public auth routes */}
      <Route
        path="/login"
        element={
          isAuthenticated ? (
            <Navigate to="/" replace />
          ) : (
            <Login />
          )
        }
      />
      <Route
        path="/register"
        element={
          isAuthenticated ? (
            <Navigate to="/" replace />
          ) : (
            <Register />
          )
        }
      />

      {/* Admin routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['Admin']}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="bookings" element={<BookingsManagement />} />
        <Route path="slots" element={<SlotManagement />} />
        <Route path="users" element={<UserManagement />} />
        <Route path="calendar" element={<AdminCalendar />} />
        <Route path="reports" element={<Reports />} />
      </Route>

      {/* Client routes */}
      <Route
        path="/client"
        element={
          <ProtectedRoute allowedRoles={['Client']}>
            <ClientLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<ClientDashboard />} />
        <Route path="book" element={<BookingForm />} />
        <Route path="bookings" element={<BookingHistory />} />
      </Route>

      {/* Designer routes */}
      <Route
        path="/designer"
        element={
          <ProtectedRoute allowedRoles={['Designer']}>
            <DesignerLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DesignerDashboard />} />
        <Route path="report/:bookingId" element={<VisitReportForm />} />
      </Route>

      {/* Site Engineer routes */}
      <Route
        path="/engineer"
        element={
          <ProtectedRoute allowedRoles={['Site Engineer']}>
            <EngineerLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<EngineerDashboard />} />
        <Route path="report/:bookingId" element={<InspectionForm />} />
      </Route>

      {/* Fallback to root */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
