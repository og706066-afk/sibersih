import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Badge } from './Badge';
import type { UserRole } from '../../types';

export interface TopBarProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  showBack?: boolean;
  userRole?: UserRole;
  actions?: React.ReactNode;
}

export const TopBar: React.FC<TopBarProps> = ({
  title,
  subtitle,
  onBack,
  showBack = false,
  userRole,
  actions,
}) => {
  const getRoleBadge = (role?: UserRole) => {
    switch (role) {
      case 'admin':
        return <Badge variant="info" size="sm">Admin</Badge>;
      case 'cleaner':
        return <Badge variant="success" size="sm">Kebersihan</Badge>;
      case 'teacher':
        return <Badge variant="warning" size="sm">Ustadz/ah</Badge>;
      default:
        return null;
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 py-3 pt-[calc(0.75rem+var(--safe-area-top))] transition-all">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {showBack && (
            <button
              onClick={onBack || (() => window.history.back())}
              className="p-2 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors shrink-0"
              aria-label="Kembali"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 truncate tracking-tight">
                {title}
              </h1>
              {userRole && getRoleBadge(userRole)}
            </div>
            {subtitle && (
              <p className="text-xs text-slate-500 truncate mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>

        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
    </header>
  );
};
