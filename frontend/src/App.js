import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import MobileLoginPage from './pages/MobileLoginPage';
import AdminDashboard from './pages/AdminDashboard';
import AdminCreatePlan from './pages/AdminCreatePlan';
import AdminPlanDetail from './pages/AdminPlanDetail';
import MobileDashboard from './pages/MobileDashboard';
import MobileCustomerList from './pages/MobileCustomerList';
import MobileCustomerDetail from './pages/MobileCustomerDetail';
import AdminRouteManagement from './pages/AdminRouteManagement';

function ProtectedRoute({ children, role }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (role && user.role !== role) return <Navigate to="/" />;
  return children;
}

function RoleRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  return user.role === 'admin' ? <Navigate to="/admin" /> : <Navigate to="/mobile" />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/mobile-login" element={<MobileLoginPage />} />
      <Route path="/" element={<RoleRedirect />} />
      <Route path="/admin" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/create-plan" element={<ProtectedRoute role="admin"><AdminCreatePlan /></ProtectedRoute>} />
      <Route path="/admin/plan/:id" element={<ProtectedRoute role="admin"><AdminPlanDetail /></ProtectedRoute>} />
      <Route path="/admin/route-management" element={<ProtectedRoute role="admin"><AdminRouteManagement /></ProtectedRoute>} />
      <Route path="/mobile" element={<ProtectedRoute role="vansales"><MobileDashboard /></ProtectedRoute>} />
      <Route path="/mobile/plan/:planId/customers" element={<ProtectedRoute role="vansales"><MobileCustomerList /></ProtectedRoute>} />
      <Route path="/mobile/customer/:customerId" element={<ProtectedRoute role="vansales"><MobileCustomerDetail /></ProtectedRoute>} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
