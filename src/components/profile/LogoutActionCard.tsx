import React, { useState } from 'react';
import { LogOut, AlertTriangle } from 'lucide-react';
import { Card, Button, Modal } from '../common';
import { useAuth } from '../../contexts/AuthContext';

export const LogoutActionCard: React.FC = () => {
  const { logout } = useAuth();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } catch (err) {
      console.error('Failed to logout:', err);
      setIsLoggingOut(false);
      setIsConfirmOpen(false);
    }
  };

  return (
    <>
      <Card className="p-0 bg-white overflow-hidden border-rose-100 hover:border-rose-200 transition-colors shadow-xs">
        <button
          type="button"
          onClick={() => setIsConfirmOpen(true)}
          className="w-full p-3.5 sm:p-4 flex items-center justify-between text-left hover:bg-rose-50/50 transition-colors group cursor-pointer"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 group-hover:bg-rose-100 group-hover:text-rose-700 transition-colors shrink-0">
              <LogOut className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-slate-800 group-hover:text-rose-700 transition-colors">
                Keluar dari Akun
              </div>
              <p className="text-[11px] text-slate-500 truncate">
                Keluar dari sesi akun SIBERSIH pada perangkat ini
              </p>
            </div>
          </div>
          <span className="text-[11px] font-semibold text-rose-600 px-2.5 py-1 rounded-lg bg-rose-50 group-hover:bg-rose-100 transition-colors shrink-0 ml-2">
            Keluar
          </span>
        </button>
      </Card>

      <Modal
        isOpen={isConfirmOpen}
        onClose={() => !isLoggingOut && setIsConfirmOpen(false)}
        title="Konfirmasi Keluar"
        size="sm"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsConfirmOpen(false)}
              disabled={isLoggingOut}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="danger"
              isLoading={isLoggingOut}
              onClick={handleConfirmLogout}
              leftIcon={<LogOut className="w-4 h-4" />}
            >
              Keluar
            </Button>
          </>
        }
      >
        <div className="space-y-2 py-1">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-rose-100 text-rose-600 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <p className="text-sm text-slate-800 font-semibold">
                Apakah Anda yakin ingin keluar dari akun?
              </p>
              <p className="text-xs text-slate-500 leading-relaxed">
                Anda perlu memasukkan email dan kata sandi kembali untuk masuk ke sistem SIBERSIH.
              </p>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
};
