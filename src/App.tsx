import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AppShell } from './layouts/AppShell';
import { LoadingState } from './components/common';
import type { UserRole } from './types';

// Public Auth Page (Lazy)
const LoginPage = lazy(() => import('./pages/auth/LoginPage').then((m) => ({ default: m.LoginPage })));

// Cleaner Pages (Lazy)
const CleanerDashboard = lazy(() => import('./pages/cleaner/CleanerDashboard').then((m) => ({ default: m.CleanerDashboard })));
const InspectionsPage = lazy(() => import('./pages/cleaner/InspectionsPage').then((m) => ({ default: m.InspectionsPage })));
const ViolationsPage = lazy(() => import('./pages/cleaner/ViolationsPage').then((m) => ({ default: m.ViolationsPage })));
const PenaltiesPage = lazy(() => import('./pages/cleaner/PenaltiesPage').then((m) => ({ default: m.PenaltiesPage })));
const InventoryPage = lazy(() => import('./pages/cleaner/InventoryPage').then((m) => ({ default: m.InventoryPage })));
const CleanerProfilePage = lazy(() => import('./pages/cleaner/CleanerProfilePage').then((m) => ({ default: m.CleanerProfilePage })));

// Teacher Pages (Lazy)
const TeacherDashboard = lazy(() => import('./pages/teacher/TeacherDashboard').then((m) => ({ default: m.TeacherDashboard })));
const TeacherHistoryPage = lazy(() => import('./pages/teacher/TeacherHistoryPage').then((m) => ({ default: m.TeacherHistoryPage })));
const TeacherViolationsPage = lazy(() => import('./pages/teacher/TeacherViolationsPage').then((m) => ({ default: m.TeacherViolationsPage })));
const TeacherReportsPage = lazy(() => import('./pages/teacher/TeacherReportsPage').then((m) => ({ default: m.TeacherReportsPage })));
const TeacherProfilePage = lazy(() => import('./pages/teacher/TeacherProfilePage').then((m) => ({ default: m.TeacherProfilePage })));

// Admin & Super Admin Pages (Lazy)
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard').then((m) => ({ default: m.AdminDashboard })));
const AdminUsersPage = lazy(() => import('./pages/admin/AdminUsersPage').then((m) => ({ default: m.AdminUsersPage })));
const SuperAdminUsersPage = lazy(() => import('./pages/admin/SuperAdminUsersPage').then((m) => ({ default: m.SuperAdminUsersPage })));
const AdminAreasPage = lazy(() => import('./pages/admin/AdminAreasPage').then((m) => ({ default: m.AdminAreasPage })));
const AdminViolationsRulesPage = lazy(() => import('./pages/admin/AdminViolationsRulesPage').then((m) => ({ default: m.AdminViolationsRulesPage })));
const AdminPenaltiesPage = lazy(() => import('./pages/admin/AdminPenaltiesPage').then((m) => ({ default: m.AdminPenaltiesPage })));
const AdminReportsPage = lazy(() => import('./pages/admin/AdminReportsPage').then((m) => ({ default: m.AdminReportsPage })));
const AdminSettingsPage = lazy(() => import('./pages/admin/AdminSettingsPage').then((m) => ({ default: m.AdminSettingsPage })));
const AdminProfilePage = lazy(() => import('./pages/admin/AdminProfilePage').then((m) => ({ default: m.AdminProfilePage })));

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
  requireActiveRole?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles, requireActiveRole }) => {
  const { currentUser, isLoading, activeRole } = useAuth();

  if (isLoading) {
    return <LoadingState message="Memeriksa autentikasi..." fullScreen />;
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles) {
    if (requireActiveRole && !allowedRoles.includes(activeRole)) {
      return <Navigate to="/admin" replace />;
    }
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

  return (
    <Suspense fallback={<LoadingState message="Memuat modul halaman..." />}>
      {children ? <>{children}</> : <Outlet />}
    </Suspense>
  );
};

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<LoadingState message="Memuat aplikasi SIBERSIH..." fullScreen />}>
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
            <Route element={<ProtectedRoute allowedRoles={['superadmin']} requireActiveRole />}>
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
      </Suspense>
    </BrowserRouter>
    </AuthProvider>
  );
}


export default App;
