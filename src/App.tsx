import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AppShell } from './layouts/AppShell';
import { LoginPage } from './pages/auth/LoginPage';
import { LoadingState } from './components/common';
import type { UserRole } from './types';

// Cleaner Pages
import { CleanerDashboard } from './pages/cleaner/CleanerDashboard';
import { InspectionsPage } from './pages/cleaner/InspectionsPage';
import { ViolationsPage } from './pages/cleaner/ViolationsPage';
import { PenaltiesPage } from './pages/cleaner/PenaltiesPage';
import { InventoryPage } from './pages/cleaner/InventoryPage';

// Teacher Pages
import { TeacherDashboard } from './pages/teacher/TeacherDashboard';
import { TeacherHistoryPage } from './pages/teacher/TeacherHistoryPage';
import { TeacherViolationsPage } from './pages/teacher/TeacherViolationsPage';
import { TeacherProfilePage } from './pages/teacher/TeacherProfilePage';

// Admin Pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AdminAreasPage } from './pages/admin/AdminAreasPage';
import { AdminViolationsRulesPage } from './pages/admin/AdminViolationsRulesPage';
import { AdminSettingsPage } from './pages/admin/AdminSettingsPage';

const RootRedirect: React.FC = () => {
  const { currentUser, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingState message="Memuat aplikasi SIBERSIH..." fullScreen />;
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  switch (currentUser.role) {
    case 'admin':
      return <Navigate to="/admin" replace />;
    case 'teacher':
      return <Navigate to="/teacher" replace />;
    case 'cleaner':
    default:
      return <Navigate to="/cleaner" replace />;
  }
};

interface ProtectedRouteProps {
  children?: React.ReactNode;
  allowedRoles?: UserRole[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { currentUser, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingState message="Memeriksa autentikasi..." fullScreen />;
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    // FIX 1: If role is not allowed, redirect to the user's appropriate role dashboard
    const fallbackPath =
      currentUser.role === 'admin'
        ? '/admin'
        : currentUser.role === 'teacher'
        ? '/teacher'
        : '/cleaner';
    return <Navigate to={fallbackPath} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Login Route */}
          <Route path="/login" element={<LoginPage />} />

          {/* Root Redirector */}
          <Route path="/" element={<RootRedirect />} />

          {/* Authenticated Protected Shell */}
          <Route
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          >
            {/* FIX 1: Role 2: Bagian Kebersihan Route Guard */}
            <Route element={<ProtectedRoute allowedRoles={['cleaner']} />}>
              <Route path="/cleaner" element={<CleanerDashboard />} />
              <Route path="/cleaner/inspections" element={<InspectionsPage />} />
              <Route path="/cleaner/violations" element={<ViolationsPage />} />
              <Route path="/cleaner/penalties" element={<PenaltiesPage />} />
              <Route path="/cleaner/inventory" element={<InventoryPage />} />
            </Route>

            {/* FIX 1: Role 3: Ustadz / Ustadzah (Read-Only) Route Guard */}
            <Route element={<ProtectedRoute allowedRoles={['teacher']} />}>
              <Route path="/teacher" element={<TeacherDashboard />} />
              <Route path="/teacher/history" element={<TeacherHistoryPage />} />
              <Route path="/teacher/violations" element={<TeacherViolationsPage />} />
              <Route path="/teacher/profile" element={<TeacherProfilePage />} />
            </Route>

            {/* FIX 1: Role 1: Developer / Admin Route Guard */}
            <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/users" element={<AdminUsersPage />} />
              <Route path="/admin/areas" element={<AdminAreasPage />} />
              <Route path="/admin/violations" element={<AdminViolationsRulesPage />} />
              <Route path="/admin/settings" element={<AdminSettingsPage />} />
            </Route>
          </Route>

          {/* Catch All */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}


export default App;
