import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { TopBar, BottomNavigation } from '../components/common';
import { Cloud, CloudOff } from 'lucide-react';
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
      return { title: 'SIBERSIH Petugas', subtitle: 'Sistem Informasi Kebersihan' };
    }

    if (path.startsWith('/teacher')) {
      if (path.includes('/history')) return { title: 'Riwayat Kelas', subtitle: 'Log kebersihan ruang kelas' };
      if (path.includes('/violations')) return { title: 'Pelanggaran Kelas', subtitle: 'Catatan denda & sanksi' };
      if (path.includes('/profile')) return { title: 'Profil Ustadz/ah', subtitle: 'Informasi akun pendidik' };
      return { title: 'Monitoring Kebersihan', subtitle: 'Pantauan Ruang Kelas Santri' };
    }

    if (path.startsWith('/admin')) {
      if (path.includes('/users')) return { title: 'Manajemen Pengguna', subtitle: 'Pengaturan akun & peran' };
      if (path.includes('/areas')) return { title: 'Area & Kelas', subtitle: 'Master data lokasi pesantren' };
      if (path.includes('/violations')) return { title: 'Aturan & Pelanggaran', subtitle: 'Konfigurasi jenis denda' };
      if (path.includes('/settings')) return { title: 'Pengaturan Sistem', subtitle: 'Konfigurasi Firebase & database' };
      return { title: 'SIBERSIH Admin', subtitle: 'Panel Kontrol & Manajemen' };
    }

    return { title: 'SIBERSIH', subtitle: 'Sistem Informasi Kebersihan' };
  };

  const { title, subtitle } = getPageTitle();

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center">
      {/* Desktop simulated mobile frame or wide screen container */}
      <div className="w-full max-w-lg min-h-screen bg-slate-50 flex flex-col shadow-xl relative border-x border-slate-200/60 pb-20">
        
        {/* Top Demo/Ujikom Role Switcher Banner */}
        <div className="bg-slate-900 text-slate-300 text-xs px-3 py-1.5 flex items-center justify-between z-50">
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
            <select
              value={currentUser.role}
              onChange={(e) => switchDemoRole(e.target.value as UserRole)}
              className="bg-slate-800 text-emerald-300 rounded px-1.5 py-0.5 text-xs border border-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="cleaner">Bagian Kebersihan</option>
              <option value="teacher">Ustadz/Ustadzah</option>
              <option value="admin">Developer/Admin</option>
            </select>
          </div>
        </div>

        {/* Top Navigation Bar */}
        <TopBar
          title={title}
          subtitle={subtitle}
          userRole={currentUser.role}
          actions={
            <button
              onClick={logout}
              className="text-xs text-slate-500 hover:text-rose-600 font-medium px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors"
              title="Keluar"
            >
              Keluar
            </button>
          }
        />

        {/* Main Content Body */}
        <main className="flex-1 p-4 overflow-y-auto">
          <Outlet />
        </main>

        {/* Bottom Navigation */}
        <BottomNavigation role={currentUser.role} />
      </div>
    </div>
  );
};
