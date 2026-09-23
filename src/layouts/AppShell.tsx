import React, { useEffect } from 'react';
import { Outlet, useLocation, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { TopBar, BottomNavigation } from '../components/common';
import { Cloud, CloudOff, User, ChevronDown } from 'lucide-react';
import type { UserRole } from '../types';

export const AppShell: React.FC = () => {
  const { currentUser, isFirebaseActive, switchDemoRole, activeRole, setActiveRole } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Sinkronisasi otomatis activeRole jika pengguna multi-role menavigasi via URL langsung
  useEffect(() => {
    if (!currentUser) return;
    const path = location.pathname;
    const userRoles = currentUser.roles || [currentUser.role];

    if (path.startsWith('/admin/users/roles') && userRoles.includes('superadmin') && activeRole !== 'superadmin') {
      setActiveRole('superadmin');
    } else if (path.startsWith('/teacher') && userRoles.includes('teacher') && activeRole !== 'teacher') {
      setActiveRole('teacher');
    } else if (path.startsWith('/cleaner') && userRoles.includes('cleaner') && activeRole !== 'cleaner') {
      setActiveRole('cleaner');
    } else if (
      path.startsWith('/admin') &&
      (userRoles.includes('admin') || userRoles.includes('superadmin')) &&
      activeRole !== 'admin' &&
      activeRole !== 'superadmin'
    ) {
      const adminRole = currentUser.role && (currentUser.role === 'admin' || currentUser.role === 'superadmin')
        ? currentUser.role
        : userRoles.includes('admin') ? 'admin' : 'superadmin';
      setActiveRole(adminRole);
    }
  }, [location.pathname, currentUser, activeRole, setActiveRole]);

  if (!currentUser) {
    return <Outlet />;
  }

  const getPageTitle = (): { title: string; subtitle?: string } => {
    const path = location.pathname;
    if (path.startsWith('/cleaner')) {
      if (path.includes('/inspections')) return { title: 'Pemeriksaan Kebersihan', subtitle: 'Checklist & evaluasi harian' };
      if (path.includes('/violations')) return { title: 'Daftar Pelanggaran', subtitle: 'Catatan & bukti ketidakbersihan' };
      if (path.includes('/penalties')) return { title: 'Manajemen Denda', subtitle: 'Pelunasan sanksi kebersihan' };
      if (path.includes('/inventory')) return { title: 'Inventaris Kebersihan', subtitle: 'Stok alat & bahan pembersih' };
      if (path.includes('/profile')) return { title: 'Pengaturan & Profil', subtitle: 'Kelola akun dan preferensi' };
      return { title: 'SIBERSIH Petugas', subtitle: 'Sistem Informasi Kebersihan' };
    }

    if (path.startsWith('/teacher')) {
      if (path.includes('/history')) return { title: 'Riwayat Kelas', subtitle: 'Log kebersihan ruang kelas' };
      if (path.includes('/violations')) return { title: 'Pelanggaran Kelas', subtitle: 'Catatan denda & sanksi' };
      if (path.includes('/reports')) return { title: 'Laporan & Rekapitulasi', subtitle: 'Rekapitulasi kelas & cetak dokumen' };
      if (path.includes('/profile')) return { title: 'Pengaturan & Profil', subtitle: 'Kelola akun dan preferensi' };
      return { title: 'Monitoring Kebersihan', subtitle: 'Pantauan Ruang Kelas Santri' };
    }

    if (path.startsWith('/admin')) {
      if (path.includes('/users/roles')) return { title: 'Manajemen Role', subtitle: 'Kelola peran & hak akses pengguna' };
      if (path.includes('/users')) return { title: 'Manajemen Pengguna', subtitle: 'Pengaturan akun & peran' };
      if (path.includes('/areas')) return { title: 'Area & Kelas', subtitle: 'Master data lokasi pesantren' };
      if (path.includes('/penalties')) return { title: 'Monitoring Denda & Kas', subtitle: 'Pencatatan & rekapitulasi kas denda' };
      if (path.includes('/reports')) return { title: 'Laporan & Rekapitulasi', subtitle: 'Rekap kebersihan, pelanggaran & kas denda' };
      if (path.includes('/violations')) return { title: 'Aturan & Pelanggaran', subtitle: 'Konfigurasi jenis denda' };
      if (path.includes('/settings')) return { title: 'Pengaturan', subtitle: 'Kelola akun dan preferensi' };
      if (path.includes('/profile')) return { title: 'Pengaturan & Profil', subtitle: 'Kelola akun dan preferensi' };
      return { title: 'SIBERSIH Admin', subtitle: 'Panel Kontrol & Manajemen' };
    }

    return { title: 'SIBERSIH', subtitle: 'Sistem Informasi Kebersihan' };
  };

  const { title, subtitle } = getPageTitle();

  const getRoleLabel = (role: UserRole): string => {
    switch (role) {
      case 'superadmin':
        return '👑 Super Admin';
      case 'admin':
        return '🛠️ Developer/Admin';
      case 'teacher':
        return '👨‍🏫 Ustadz/Ustadzah';
      case 'cleaner':
        return '🧹 Bagian Kebersihan';
      default:
        return role;
    }
  };

  const getRoleBadgeText = (role: UserRole): string => {
    switch (role) {
      case 'superadmin':
        return 'Super Admin';
      case 'admin':
        return 'Developer/Admin';
      case 'teacher':
        return 'Ustadz/Ustadzah';
      case 'cleaner':
      default:
        return 'Bagian Kebersihan';
    }
  };

  const handleSwitchActiveRole = (newRole: UserRole) => {
    setActiveRole(newRole);
    switch (newRole) {
      case 'superadmin':
        if (!location.pathname.startsWith('/admin')) {
          navigate('/admin');
        }
        break;
      case 'admin':
        if (!location.pathname.startsWith('/admin') || location.pathname.startsWith('/admin/users/roles')) {
          navigate('/admin');
        }
        break;
      case 'teacher':
        if (!location.pathname.startsWith('/teacher')) {
          navigate('/teacher');
        }
        break;
      case 'cleaner':
      default:
        if (!location.pathname.startsWith('/cleaner')) {
          navigate('/cleaner');
        }
        break;
    }
  };

  const getProfileLink = () => {
    switch (activeRole) {
      case 'superadmin':
      case 'admin':
        return '/admin/settings';
      case 'teacher':
        return '/teacher/profile';
      case 'cleaner':
      default:
        return '/cleaner/profile';
    }
  };

  const userFirstName = currentUser.displayName?.trim().split(/\s+/)[0] || 'Profil';
  const userPhoto = currentUser.avatarUrl;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center">
      {/* Desktop simulated mobile frame or wide screen container */}
      <div className="w-full max-w-lg min-h-screen bg-slate-50 flex flex-col shadow-xl relative border-x border-slate-200/60 pb-20">
        
        {/* Top Demo/Ujikom Role Switcher Banner */}
        <div className="no-print bg-slate-900 text-slate-300 text-xs px-3 py-1.5 flex items-center justify-between z-50">
          <div className="flex items-center gap-1.5">
            {isFirebaseActive ? (
              <span className="flex items-center gap-1 text-emerald-400 font-medium">
                <Cloud className="w-3.5 h-3.5" /> Firebase Live
              </span>
            ) : (
              <span className="flex items-center gap-1 text-amber-400 font-medium">
                <CloudOff className="w-3.5 h-3.5" /> Mode Demo / Preview
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 text-[11px]">Role:</span>
            {isFirebaseActive ? (
              currentUser.roles && currentUser.roles.length > 1 ? (
                <div className="relative flex items-center">
                  <select
                    value={activeRole}
                    onChange={(e) => handleSwitchActiveRole(e.target.value as UserRole)}
                    className="bg-slate-800 text-emerald-300 hover:bg-slate-750 font-medium rounded-md pl-2 pr-6 py-0.5 text-xs border border-emerald-500/40 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 focus:outline-none cursor-pointer appearance-none transition-colors"
                    aria-label="Pilih Peran Aktif"
                    title="Klik untuk beralih peran aktif"
                  >
                    {currentUser.roles.map((r) => (
                      <option key={r} value={r} className="bg-slate-900 text-slate-200">
                        {getRoleLabel(r)}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-emerald-400 pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2" />
                </div>
              ) : (
                <span className="bg-slate-800 text-emerald-300 rounded px-2 py-0.5 text-xs border border-slate-700 font-medium">
                  {getRoleBadgeText(activeRole)}
                </span>
              )
            ) : (
              <select
                value={currentUser.role}
                onChange={(e) => switchDemoRole(e.target.value as UserRole)}
                className="bg-slate-800 text-amber-300 rounded px-1.5 py-0.5 text-xs border border-slate-700 focus:outline-none cursor-pointer"
                title="Pilih role untuk simulasi demo Ujikom"
              >
                <option value="cleaner">Bagian Kebersihan</option>
                <option value="teacher">Ustadz/Ustadzah</option>
                <option value="admin">Developer/Admin</option>
              </select>
            )}
          </div>
        </div>

        {/* Top Navigation Bar */}
        <div className="no-print">
          <TopBar
            title={title}
            subtitle={subtitle}
            userRole={activeRole}
            actions={
              <Link
                to={getProfileLink()}
                className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 rounded-lg border border-slate-200 transition-colors"
                title="Pengaturan Akun & Profil"
              >
                {userPhoto ? (
                  <img
                    src={userPhoto}
                    alt={userFirstName}
                    className="w-4 h-4 rounded-full object-cover shrink-0 border border-emerald-400"
                  />
                ) : (
                  <User className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                )}
                <span className="max-w-[75px] sm:max-w-[100px] truncate">{userFirstName}</span>
              </Link>
            }
          />
        </div>

        {/* Main Content Body */}
        <main className="flex-1 p-4 overflow-y-auto">
          <Outlet />
        </main>

        {/* Bottom Navigation */}
        <div className="no-print">
          <BottomNavigation role={activeRole} />
        </div>
      </div>
    </div>
  );
};
