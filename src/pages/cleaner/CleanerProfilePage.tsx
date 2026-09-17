import React from 'react';
import { Mail, Phone, Sparkles, ShieldCheck, Settings } from 'lucide-react';

import { Card, Badge } from '../../components/common';
import { useAuth } from '../../contexts/AuthContext';
import {
  ChangePasswordCard,
  ProfileAvatarUploader,
  LogoutActionCard,
} from '../../components/profile';

export const CleanerProfilePage: React.FC = () => {
  const { currentUser } = useAuth();

  return (
    <div className="space-y-4">
      {/* Header Pengaturan & Profil */}
      <div className="flex items-center gap-2.5">
        <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 shrink-0">
          <Settings className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-900">Pengaturan & Profil</h2>
          <p className="text-xs text-slate-500">Kelola akun dan preferensi petugas kebersihan</p>
        </div>
      </div>

      {/* Profile Card */}
      <Card className="p-5 bg-white text-center flex flex-col items-center shadow-xs">
        <ProfileAvatarUploader fallbackVariant="cleaner" />
        <h2 className="text-base font-bold text-slate-900">
          {currentUser?.displayName || 'Petugas Kebersihan'}
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">{currentUser?.email}</p>
        <div className="mt-2.5">
          <Badge variant="success" size="md">
            Bagian Kebersihan
          </Badge>
        </div>
      </Card>

      {/* Account Info */}
      <Card className="p-4 bg-white space-y-3 shadow-xs">
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
            <span className="font-medium text-slate-800 truncate block">
              Tim Sarpras & Kebersihan Lingkungan
            </span>
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
          Akun Bagian Kebersihan memiliki izin untuk melakukan inspeksi berkala, mencatat checklist,
          menerbitkan temuan pelanggaran, mencatat pembayaran kas denda, serta mengelola stok
          inventaris.
        </p>
      </div>

      {/* Change Password Card */}
      <ChangePasswordCard />

      {/* Logout Action Card with Confirmation Dialog */}
      <LogoutActionCard />
    </div>
  );
};
