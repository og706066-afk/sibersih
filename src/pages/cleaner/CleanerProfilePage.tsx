import React from 'react';
import { User, Mail, Phone, Sparkles, LogOut, ShieldCheck } from 'lucide-react';

import { Card, Button, Badge } from '../../components/common';
import { useAuth } from '../../contexts/AuthContext';
import { ChangePasswordCard } from '../../components/profile/ChangePasswordCard';

export const CleanerProfilePage: React.FC = () => {
  const { currentUser, logout } = useAuth();

  return (
    <div className="space-y-4">
      {/* Profile Card */}
      <Card className="p-5 bg-white text-center flex flex-col items-center">
        <div className="w-20 h-20 rounded-full bg-emerald-50 border-2 border-emerald-200 text-emerald-600 flex items-center justify-center mb-3 shadow-xs">
          <User className="w-10 h-10" />
        </div>
        <h2 className="text-base font-bold text-slate-900">{currentUser?.displayName || 'Petugas Kebersihan'}</h2>
        <p className="text-xs text-slate-500 mt-0.5">{currentUser?.email}</p>
        <div className="mt-2.5">
          <Badge variant="success" size="md">
            Bagian Kebersihan
          </Badge>
        </div>
      </Card>

      {/* Account Info */}
      <Card className="p-4 bg-white space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Informasi Akun
        </h3>

        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
          <Mail className="w-4 h-4 text-slate-400 shrink-0" />
          <div className="min-w-0 flex-1">
            <span className="text-[11px] text-slate-400 block">Email Pengguna</span>
            <span className="font-medium text-slate-800 truncate block">{currentUser?.email}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
          <Phone className="w-4 h-4 text-slate-400 shrink-0" />
          <div className="min-w-0 flex-1">
            <span className="text-[11px] text-slate-400 block">Nomor WhatsApp</span>
            <span className="font-medium text-slate-800 truncate block">
              {currentUser?.phoneNumber || '0812-3456-7890'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
          <Sparkles className="w-4 h-4 text-slate-400 shrink-0" />
          <div className="min-w-0 flex-1">
            <span className="text-[11px] text-slate-400 block">Unit Operasional</span>
            <span className="font-medium text-slate-800 truncate block">Tim Sarpras & Kebersihan Lingkungan</span>
          </div>
        </div>
      </Card>

      {/* Role Notice */}
      <div className="p-3.5 bg-slate-100 rounded-2xl border border-slate-200/80 text-xs text-slate-600 space-y-1">
        <div className="flex items-center gap-1.5 font-bold text-slate-800">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Hak Akses Akun: Petugas Kebersihan</span>
        </div>
        <p className="text-[11px] leading-relaxed">
          Akun Bagian Kebersihan memiliki izin untuk melakukan inspeksi berkala, mencatat checklist, menerbitkan temuan pelanggaran, mencatat pembayaran kas denda, serta mengelola stok inventaris.
        </p>
      </div>

      {/* Change Password Card */}
      <ChangePasswordCard />

      {/* Logout */}
      <Button
        variant="outline"
        size="md"
        className="w-full text-rose-600 border-rose-200 hover:bg-rose-50"
        leftIcon={<LogOut className="w-4 h-4" />}
        onClick={logout}
      >
        Keluar dari SIBERSIH
      </Button>
    </div>
  );
};
