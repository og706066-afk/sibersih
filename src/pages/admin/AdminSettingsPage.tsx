import React, { useState } from 'react';
import {
  Smartphone,
  ShieldCheck,
  RotateCcw,
  Cloud,
  Mail,
  Phone,
  Key,
  Settings,
} from 'lucide-react';
import { Card, Button, Badge } from '../../components/common';
import { useAuth } from '../../contexts/AuthContext';
import {
  ProfileAvatarUploader,
  ChangePasswordCard,
  LogoutActionCard,
} from '../../components/profile';
import { isFirebaseConfigured } from '../../config/firebase';

export const AdminSettingsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [resetSuccess, setResetSuccess] = useState(false);

  const handleResetLocalData = () => {
    const keysToRemove = [
      'sibersih_data_classes',
      'sibersih_data_areas',
      'sibersih_data_schedules',
      'sibersih_data_inspections',
      'sibersih_data_inspection_items',
      'sibersih_data_violation_types',
      'sibersih_data_penalty_rules',
      'sibersih_data_violations',
      'sibersih_data_penalties',
      'sibersih_data_inventories',
      'sibersih_data_inventory_logs',
      'sibersih_data_teacher_assignments',
      'sibersih_demo_role',
    ];
    keysToRemove.forEach((k) => localStorage.removeItem(k));
    setResetSuccess(true);
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  return (
    <div className="space-y-4">
      {/* Header Pengaturan */}
      <div className="flex items-center gap-2.5">
        <div className="p-2 rounded-xl bg-slate-900 text-indigo-400 border border-slate-800 shrink-0">
          <Settings className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-900">Pengaturan</h2>
          <p className="text-xs text-slate-500">Kelola akun dan preferensi sistem SIBERSIH</p>
        </div>
      </div>

      {/* Bagian Akun / User: Profil Card */}
      <Card className="p-5 bg-white text-center flex flex-col items-center shadow-xs">
        <ProfileAvatarUploader fallbackVariant="admin" />
        <h2 className="text-base font-bold text-slate-900">
          {currentUser?.displayName || 'Administrator'}
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">{currentUser?.email}</p>
        <div className="mt-2.5">
          <Badge variant="info" size="md">
            Developer / Admin
          </Badge>
        </div>
      </Card>

      {/* Rincian Informasi Akun */}
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
              {currentUser?.phoneNumber || '0811-9876-5432'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
          <Key className="w-4 h-4 text-slate-400 shrink-0" />
          <div className="min-w-0 flex-1">
            <span className="text-[11px] text-slate-400 block">Otoritas Sistem</span>
            <span className="font-medium text-slate-800 truncate block">
              Super Administrator & Data Controller
            </span>
          </div>
        </div>
      </Card>

      {/* Bagian Ganti Password */}
      <ChangePasswordCard />

      {/* Bagian Aksi Keluar */}
      <LogoutActionCard />

      {/* Pembatas Pengaturan Sistem */}
      <div className="pt-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1">
          Preferensi Sistem & Konfigurasi
        </h3>
      </div>

      {/* Tech Stack Specs Card */}
      <Card className="p-4 bg-white space-y-3 shadow-xs">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
            Arsitektur Teknologi SIBERSIH
          </h3>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex justify-between py-1 border-b border-slate-50">
            <span className="text-slate-500">Frontend Framework</span>
            <span className="font-semibold text-slate-800">React 19 + TypeScript + Vite</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-50">
            <span className="text-slate-500">Mobile Hybrid Engine</span>
            <span className="font-semibold text-slate-800">Capacitor 8 (Android Ready)</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-50">
            <span className="text-slate-500">Database Utama</span>
            <span className="font-semibold text-slate-800">Google Cloud Firestore</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-50">
            <span className="text-slate-500">Authentication</span>
            <span className="font-semibold text-slate-800">Firebase Auth + Custom Profiles</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-50">
            <span className="text-slate-500">Penyimpanan Avatar</span>
            <span className="font-semibold text-slate-800">Firestore Document Base64</span>
          </div>
        </div>
      </Card>

      {/* Firebase Status */}
      <Card className="p-4 bg-white space-y-3 shadow-xs">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Cloud className="w-4 h-4 text-indigo-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Koneksi Firebase Cloud
            </h3>
          </div>
          <Badge variant={isFirebaseConfigured ? 'success' : 'warning'} size="sm">
            {isFirebaseConfigured ? 'Terkonfigurasi' : 'Offline Mode'}
          </Badge>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          {isFirebaseConfigured
            ? 'Credential Firebase terdeteksi aktif dari file .env. Data tersinkronisasi langsung dengan Google Cloud Firestore.'
            : 'Belum ada credential di file .env. Sistem saat ini berjalan dalam mode mandiri/preview dengan database cache lokal lengkap untuk kebutuhan demo dan presentasi Ujikom.'}
        </p>

        {!isFirebaseConfigured && (
          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 font-mono">
            Salin <code>.env.example</code> ke <code>.env</code> lalu masukkan API Key Firebase Anda.
          </div>
        )}
      </Card>

      {/* Android Capacitor Spec */}
      <Card className="p-4 bg-white space-y-2 text-xs shadow-xs">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <Smartphone className="w-4 h-4 text-sky-600" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
            Konfigurasi Android Native
          </h3>
        </div>
        <div className="flex justify-between py-1">
          <span className="text-slate-500">Package ID</span>
          <span className="font-mono text-slate-700">id.sch.pesantren.sibersih</span>
        </div>
        <div className="flex justify-between py-1">
          <span className="text-slate-500">Target Platform</span>
          <span className="font-semibold text-slate-700">Android 12+ (SDK 34)</span>
        </div>
      </Card>

      {/* Reset Cache for Demo */}
      <Card className="p-4 bg-white border-rose-100 space-y-3 shadow-xs">
        <div>
          <h4 className="text-xs font-bold text-rose-900">Reset Data Demo ke Kondisi Awal</h4>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Gunakan tombol ini saat ingin mengulang simulasi pengujian Ujikom dari awal.
          </p>
        </div>

        {resetSuccess && (
          <div className="p-2 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-medium border border-emerald-200">
            Data berhasil di-reset. Memuat ulang aplikasi...
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          className="border-rose-300 text-rose-700 hover:bg-rose-50"
          leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
          onClick={handleResetLocalData}
        >
          Reset Database Demo
        </Button>
      </Card>
    </div>
  );
};
