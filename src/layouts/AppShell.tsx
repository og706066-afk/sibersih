import React from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { TopBar, BottomNavigation } from '../components/common';
import { Cloud, CloudOff, User } from 'lucide-react';
import type { UserRole } from '../types';

export const AppShell: React.FC = () => {
  const { currentUser, isFirebaseActive, switchDemoRole, logout } = useAuth();
  const location = useLocation();

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
      if (path.includes('/profile')) return { title: 'Profil Petugas', subtitle: 'Informasi akun kebersihan & keamanan' };
      return { title: 'SIBERSIH Petugas', subtitle: 'Sistem Informasi Kebersihan' };
    }

    if (path.startsWith('/teacher')) {
      if (path.includes('/history')) return { title: 'Riwayat Kelas', subtitle: 'Log kebersihan ruang kelas' };
      if (path.includes('/violations')) return { title: 'Pelanggaran Kelas', subtitle: 'Catatan denda & sanksi' };
      if (path.includes('/reports')) return { title: 'Laporan & Rekapitulasi', subtitle: 'Rekapitulasi kelas & cetak dokumen' };
      if (path.includes('/profile')) return { title: 'Profil Ustadz/ah', subtitle: 'Informasi akun pendidik & keamanan' };
      return { title: 'Monitoring Kebersihan', subtitle: 'Pantauan Ruang Kelas Santri' };
    }

    if (path.startsWith('/admin')) {
      if (path.includes('/users')) return { title: 'Manajemen Pengguna', subtitle: 'Pengaturan akun & peran' };
      if (path.includes('/areas')) return { title: 'Area & Kelas', subtitle: 'Master data lokasi pesantren' };
      if (path.includes('/penalties')) return { title: 'Monitoring Denda & Kas', subtitle: 'Pencatatan & rekapitulasi kas denda' };
      if (path.includes('/reports')) return { title: 'Laporan & Rekapitulasi', subtitle: 'Rekap kebersihan, pelanggaran & kas denda' };
      if (path.includes('/violations')) return { title: 'Aturan & Pelanggaran', subtitle: 'Konfigurasi jenis denda' };
      if (path.includes('/settings')) return { title: 'Pengaturan Sistem', subtitle: 'Konfigurasi Firebase & database' };
      if (path.includes('/profile')) return { title: 'Profil Administrator', subtitle: 'Pengaturan akun & hak akses' };
      return { title: 'SIBERSIH Admin', subtitle: 'Panel Kontrol & Manajemen' };
    }

    return { title: 'SIBERSIH', subtitle: 'Sistem Informasi Kebersihan' };
  };

  const { title, subtitle } = getPageTitle();

  const getProfileLink = () => {
    switch (currentUser.role) {
      case 'admin':
        return '/admin/profile';
      case 'teacher':
        return '/teacher/profile';
      case 'cleaner':
      default:
        return '/cleaner/profile';
    }
  };

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
              <span className="bg-slate-800 text-emerald-300 rounded px-2 py-0.5 text-xs border border-slate-700 font-medium">
                {currentUser.role === 'admin'
                  ? 'Developer/Admin'
                  : currentUser.role === 'teacher'
                  ? 'Ustadz/Ustadzah'
                  : 'Bagian Kebersihan'}
              </span>
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
            userRole={currentUser.role}
            actions={
              <div className="flex items-center gap-1">
                <Link
                  to={getProfileLink()}
                  className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition-colors"
                  title="Profil Akun & Ganti Password"
                >
                  <User className="w-4 h-4" />
                </Link>
                <button
                  onClick={logout}
                  className="text-xs text-slate-500 hover:text-rose-600 font-medium px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Keluar"
                >
                  Keluar
                </button>
              </div>
            }
          />
        </div>

        {/* Main Content Body */}
        <main className="flex-1 p-4 overflow-y-auto">
          <Outlet />
        </main>

        {/* Bottom Navigation */}
        <div className="no-print">
          <BottomNavigation role={currentUser.role} />
        </div>
      </div>
    </div>
  );
};
