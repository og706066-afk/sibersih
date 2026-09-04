import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardCheck,
  AlertTriangle,
  Receipt,
  Boxes,
  Users,
  Building2,
  Settings,
  GraduationCap,
  History,
  FileText,
  User,
} from 'lucide-react';
import type { UserRole } from '../../types';

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
}

export interface BottomNavigationProps {
  role: UserRole;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({ role }) => {
  const getNavItems = (): NavItem[] => {
    switch (role) {
      case 'cleaner':
        return [
          { to: '/cleaner', label: 'Beranda', icon: <LayoutDashboard className="w-5 h-5" /> },
          { to: '/cleaner/inspections', label: 'Periksa', icon: <ClipboardCheck className="w-5 h-5" /> },
          { to: '/cleaner/violations', label: 'Pelanggaran', icon: <AlertTriangle className="w-5 h-5" /> },
          { to: '/cleaner/penalties', label: 'Denda', icon: <Receipt className="w-5 h-5" /> },
          { to: '/cleaner/inventory', label: 'Inventaris', icon: <Boxes className="w-5 h-5" /> },
        ];
      case 'admin':
        return [
          { to: '/admin', label: 'Beranda', icon: <LayoutDashboard className="w-5 h-5" /> },
          { to: '/admin/users', label: 'Pengguna', icon: <Users className="w-5 h-5" /> },
          { to: '/admin/areas', label: 'Area/Kelas', icon: <Building2 className="w-5 h-5" /> },
          { to: '/admin/penalties', label: 'Denda & Kas', icon: <Receipt className="w-5 h-5" /> },
          { to: '/admin/violations', label: 'Aturan', icon: <AlertTriangle className="w-5 h-5" /> },
          { to: '/admin/settings', label: 'Pengaturan', icon: <Settings className="w-5 h-5" /> },
        ];
      case 'teacher':
        return [
          { to: '/teacher', label: 'Kelas Saya', icon: <GraduationCap className="w-5 h-5" /> },
          { to: '/teacher/history', label: 'Riwayat', icon: <History className="w-5 h-5" /> },
          { to: '/teacher/violations', label: 'Pelanggaran', icon: <AlertTriangle className="w-5 h-5" /> },
          { to: '/teacher/reports', label: 'Laporan', icon: <FileText className="w-5 h-5" /> },
          { to: '/teacher/profile', label: 'Profil', icon: <User className="w-5 h-5" /> },
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 pb-[var(--safe-area-bottom)]">
      <div className="max-w-lg mx-auto flex items-center justify-around px-2 py-1.5">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/cleaner' || item.to === '/admin' || item.to === '/teacher'}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-xl transition-all ${
                isActive
                  ? 'text-emerald-600 font-semibold'
                  : 'text-slate-500 hover:text-slate-800'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div
                  className={`p-1 rounded-lg transition-transform ${
                    isActive ? 'scale-110 bg-emerald-50' : ''
                  }`}
                >
                  {item.icon}
                </div>
                <span className="text-[10px] mt-0.5 tracking-tight">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};
