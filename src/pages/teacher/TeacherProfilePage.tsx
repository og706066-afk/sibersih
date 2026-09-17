import React, { useState, useEffect } from 'react';
import { Mail, Phone, GraduationCap, ShieldCheck, Settings } from 'lucide-react';

import { Card, Badge } from '../../components/common';
import { useAuth } from '../../contexts/AuthContext';
import { DataService } from '../../services/dataService';
import {
  ChangePasswordCard,
  ProfileAvatarUploader,
  LogoutActionCard,
} from '../../components/profile';

export const TeacherProfilePage: React.FC = () => {
  const { currentUser } = useAuth();
  const [assignedClassName, setAssignedClassName] = useState<string>('Memuat kelas...');

  useEffect(() => {
    const loadAssignment = async () => {
      if (!currentUser?.uid) return;
      try {
        const assign = await DataService.getTeacherAssignments(currentUser.uid);
        if (assign.length > 0) {
          setAssignedClassName(`${assign[0].className || 'Kelas Binaan'} (Aktif)`);
        } else {
          setAssignedClassName('Belum ada penugasan kelas');
        }
      } catch (err) {
        console.error('Failed to load teacher class assignment:', err);
        setAssignedClassName('Kelas X IPA 1');
      }
    };
    loadAssignment();
  }, [currentUser]);

  return (
    <div className="space-y-4">
      {/* Header Pengaturan & Profil */}
      <div className="flex items-center gap-2.5">
        <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 shrink-0">
          <Settings className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-900">Pengaturan & Profil</h2>
          <p className="text-xs text-slate-500">Kelola akun dan preferensi pembina</p>
        </div>
      </div>

      {/* Profile Card */}
      <Card className="p-5 bg-white text-center flex flex-col items-center shadow-xs">
        <ProfileAvatarUploader fallbackVariant="teacher" />
        <h2 className="text-base font-bold text-slate-900">
          {currentUser?.displayName || 'Ustadz Pembina'}
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">{currentUser?.email}</p>
        <div className="mt-2.5">
          <Badge variant="info" size="md">
            Wali Kelas / Ustadz
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
              {currentUser?.phoneNumber || '0857-1234-5678'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
          <GraduationCap className="w-4 h-4 text-slate-400 shrink-0" />
          <div className="min-w-0 flex-1">
            <span className="text-[11px] text-slate-400 block">Tugas Binaan Kelas</span>
            <span className="font-medium text-slate-800 truncate block">{assignedClassName}</span>
          </div>
        </div>
      </Card>

      {/* Role Notice */}
      <div className="p-3.5 bg-slate-100 rounded-2xl border border-slate-200/80 text-xs text-slate-600 space-y-1">
        <div className="flex items-center gap-1.5 font-bold text-slate-800">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Hak Akses Akun: Read-Only Monitoring</span>
        </div>
        <p className="text-[11px] leading-relaxed">
          Akun Ustadz/Ustadzah memiliki izin untuk memonitor hasil inspeksi kebersihan ruang kelas
          santri, menerima laporan temuan pelanggaran piket, serta mencetak laporan kebersihan
          kelas.
        </p>
      </div>

      {/* Change Password Card */}
      <ChangePasswordCard />

      {/* Logout Action Card with Confirmation Dialog */}
      <LogoutActionCard />
    </div>
  );
};
