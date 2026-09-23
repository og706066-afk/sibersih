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
import { CleanerProfilePage } from './pages/cleaner/CleanerProfilePage';

// Teacher Pages
import { TeacherDashboard } from './pages/teacher/TeacherDashboard';
import { TeacherHistoryPage } from './pages/teacher/TeacherHistoryPage';
import { TeacherViolationsPage } from './pages/teacher/TeacherViolationsPage';
import { TeacherReportsPage } from './pages/teacher/TeacherReportsPage';
import { TeacherProfilePage } from './pages/teacher/TeacherProfilePage';

// Admin & Super Admin Pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { SuperAdminUsersPage } from './pages/admin/SuperAdminUsersPage';
import { AdminAreasPage } from './pages/admin/AdminAreasPage';
import { AdminViolationsRulesPage } from './pages/admin/AdminViolationsRulesPage';
import { AdminPenaltiesPage } from './pages/admin/AdminPenaltiesPage';
import { AdminReportsPage } from './pages/admin/AdminReportsPage';
import { AdminSettingsPage } from './pages/admin/AdminSettingsPage';
import { AdminProfilePage } from './pages/admin/AdminProfilePage';

const RootRedirect: React.FC = () => {
  const { currentUser, isLoading, activeRole } = useAuth();

  if (isLoading) {
    return <LoadingState message="Memuat aplikasi SIBERSIH..." fullScreen />;
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  switch (activeRole) {
    case 'superadmin':
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

  if (allowedRoles) {
    const userRoles: UserRole[] =
      currentUser.roles && currentUser.roles.length > 0
        ? currentUser.roles
        : [currentUser.role];

    const hasAccess = allowedRoles.some((r) => {
      // Super Admin otomatis mewarisi hak akses ke rute admin
      if (r === 'admin' && userRoles.includes('superadmin')) return true;
      return userRoles.includes(r);
    });

    if (!hasAccess) {
      // Fallback redirect yang aman ke area yang dimiliki user
      let fallbackPath = '/cleaner';
      if (userRoles.includes('superadmin') || userRoles.includes('admin')) {
        fallbackPath = '/admin';
      } else if (userRoles.includes('teacher')) {
        fallbackPath = '/teacher';
      }
      return <Navigate to={fallbackPath} replace />;
    }
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
              <Route path="/cleaner/profile" element={<CleanerProfilePage />} />
            </Route>

            {/* FIX 1: Role 3: Ustadz / Ustadzah (Read-Only) Route Guard */}
            <Route element={<ProtectedRoute allowedRoles={['teacher']} />}>
              <Route path="/teacher" element={<TeacherDashboard />} />
              <Route path="/teacher/history" element={<TeacherHistoryPage />} />
              <Route path="/teacher/violations" element={<TeacherViolationsPage />} />
              <Route path="/teacher/reports" element={<TeacherReportsPage />} />
              <Route path="/teacher/profile" element={<TeacherProfilePage />} />
            </Route>

            {/* Super Admin Route Guard */}
            <Route element={<ProtectedRoute allowedRoles={['superadmin']} />}>
              <Route path="/admin/users/roles" element={<SuperAdminUsersPage />} />
            </Route>

            {/* FIX 1: Role 1: Developer / Admin Route Guard */}
            <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/users" element={<AdminUsersPage />} />
              <Route path="/admin/areas" element={<AdminAreasPage />} />
              <Route path="/admin/penalties" element={<AdminPenaltiesPage />} />
              <Route path="/admin/reports" element={<AdminReportsPage />} />
              <Route path="/admin/violations" element={<AdminViolationsRulesPage />} />
              <Route path="/admin/settings" element={<AdminSettingsPage />} />
              <Route path="/admin/profile" element={<AdminProfilePage />} />
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
