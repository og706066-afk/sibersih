import React, { useState, useEffect } from 'react';
import { Plus, Mail, Phone, Lock, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';

import { Card, Button, Badge, Modal, Input, Select, LoadingState } from '../../components/common';
import { DataService } from '../../services/dataService';
import type { UserProfile, UserRole } from '../../types';

export const AdminUsersPage: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterRole, setFilterRole] = useState<'all' | UserRole>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Notification / Feedback State
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  // Form State
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<UserRole>('cleaner');
  const [phone, setPhone] = useState('');

  const loadUsers = async () => {
    try {
      const list = await DataService.getUsers();
      setUsers(list);
    } catch (err: any) {
      console.error('Failed to load users:', err);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleOpenModal = () => {
    setModalError(null);
    setDisplayName('');
    setEmail('');
    setPassword('');
    setShowPassword(false);
    setPhone('');
    setRole('cleaner');
    setIsCreateModalOpen(true);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    const trimmedName = displayName.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();

    // Validasi Form
    if (!trimmedName) {
      setModalError('Nama lengkap & gelar wajib diisi.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setModalError('Format email tidak valid (contoh: nama@sibersih.id).');
      return;
    }

    if (!password || password.length < 6) {
      setModalError('Kata sandi awal wajib diisi minimal 6 karakter sesuai persyaratan Firebase Authentication.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Panggil DataService.createUserAccount yang menggunakan secondary Firebase Auth instance
      // sehingga sesi Admin yang sedang login tetap terjaga 100%.
      const createdUser = await DataService.createUserAccount({
        displayName: trimmedName,
        email: trimmedEmail,
        password,
        role,
        phoneNumber: trimmedPhone,
      });

      setFeedbackMessage({
        type: 'success',
        text: `Akun "${createdUser.displayName}" (${createdUser.role}) berhasil didaftarkan ke Firebase Auth & profil Firestore.`,
      });

      setIsCreateModalOpen(false);
      setDisplayName('');
      setEmail('');
      setPassword('');
      setPhone('');
      setRole('cleaner');

      // Refresh daftar pengguna langsung dari Firestore
      await loadUsers();
    } catch (err: any) {
      setModalError(err?.message || 'Gagal membuat akun pengguna.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredUsers = users.filter((u) => filterRole === 'all' || u.role === filterRole);

  const getRoleBadge = (r: UserRole) => {
    switch (r) {
      case 'admin':
        return <Badge variant="info" size="sm">Admin</Badge>;
      case 'cleaner':
        return <Badge variant="success" size="sm">Petugas Kebersihan</Badge>;
      case 'teacher':
        return <Badge variant="warning" size="sm">Ustadz/ah</Badge>;
    }
  };

  if (isLoadingUsers) {
    return <LoadingState message="Memuat daftar pengguna..." />;
  }

  return (
    <div className="space-y-4">
      {/* Header & Tombol Tambah */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900">Manajemen Pengguna</h2>
          <p className="text-xs text-slate-500">Otorisasi akun & peran sistem SIBERSIH</p>
        </div>
        <Button
          size="sm"
          variant="primary"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={handleOpenModal}
        >
          Tambah Akun
        </Button>
      </div>

      {/* Global Feedback Banner */}
      {feedbackMessage && (
        <div
          className={`p-3 rounded-xl text-xs font-medium flex items-center justify-between animate-in fade-in duration-200 ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMessage.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedbackMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMessage(null)}
            className="text-xs underline ml-2 opacity-70 hover:opacity-100 cursor-pointer"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Role Filter Pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        <button
          onClick={() => setFilterRole('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
            filterRole === 'all'
              ? 'bg-slate-900 text-white'
              : 'bg-white text-slate-600 border border-slate-200'
          }`}
        >
          Semua ({users.length})
        </button>
        <button
          onClick={() => setFilterRole('cleaner')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
            filterRole === 'cleaner'
              ? 'bg-emerald-600 text-white'
              : 'bg-white text-slate-600 border border-slate-200'
          }`}
        >
          Petugas Kebersihan ({users.filter((u) => u.role === 'cleaner').length})
        </button>
        <button
          onClick={() => setFilterRole('teacher')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
            filterRole === 'teacher'
              ? 'bg-amber-600 text-white'
              : 'bg-white text-slate-600 border border-slate-200'
          }`}
        >
          Ustadz/ah ({users.filter((u) => u.role === 'teacher').length})
        </button>
        <button
          onClick={() => setFilterRole('admin')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
            filterRole === 'admin'
              ? 'bg-indigo-600 text-white'
              : 'bg-white text-slate-600 border border-slate-200'
          }`}
        >
          Admin ({users.filter((u) => u.role === 'admin').length})
        </button>
      </div>

      {/* Users List */}
      <div className="space-y-2.5">
        {filteredUsers.length === 0 ? (
          <Card className="p-6 text-center text-xs text-slate-400 bg-white">
            Belum ada pengguna pada kategori peran ini.
          </Card>
        ) : (
          filteredUsers.map((user) => (
            <Card key={user.uid} className="p-3.5 bg-white flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-slate-900 truncate">{user.displayName}</span>
                  {getRoleBadge(user.role)}
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mt-1 text-xs text-slate-500">
                  <span className="flex items-center gap-1 truncate">
                    <Mail className="w-3 h-3 text-slate-400" /> {user.email}
                  </span>
                  {user.phoneNumber && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" /> {user.phoneNumber}
                    </span>
                  )}
                </div>
              </div>

              <div className="shrink-0 ml-2">
                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                    user.isActive
                      ? 'text-emerald-600 bg-emerald-50'
                      : 'text-rose-600 bg-rose-50'
                  }`}
                >
                  {user.isActive ? 'Aktif' : 'Nonaktif'}
                </span>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Modal: Tambah Akun Baru */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          if (!isSubmitting) setIsCreateModalOpen(false);
        }}
        title="Tambah Akun Pengguna"
        description="Mendaftarkan akun ke Firebase Authentication & profil Cloud Firestore"
      >
        <form onSubmit={handleCreateUser} className="space-y-3.5">
          {modalError && (
            <div className="p-3 bg-rose-50 text-rose-700 rounded-xl text-xs border border-rose-200 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{modalError}</span>
            </div>
          )}

          <Input
            label="Nama Lengkap & Gelar"
            placeholder="Contoh: Ustadz Ahmad Fauzi, S.Pd"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            disabled={isSubmitting}
            required
          />

          <Input
            type="email"
            label="Email Pengguna"
            placeholder="nama@sibersih.id"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leftIcon={<Mail className="w-4 h-4 text-slate-400" />}
            disabled={isSubmitting}
            required
          />

          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              label="Kata Sandi Awal"
              placeholder="Minimal 6 karakter"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock className="w-4 h-4 text-slate-400" />}
              minLength={6}
              helperText="Minimal 6 karakter sesuai persyaratan Firebase Authentication"
              disabled={isSubmitting}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-[34px] text-slate-400 hover:text-slate-600 focus:outline-none p-0.5 cursor-pointer"
              title={showPassword ? 'Sembunyikan sandi' : 'Tampilkan sandi'}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <Select
            label="Peran / Hak Akses"
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            options={[
              { value: 'cleaner', label: 'Bagian Kebersihan (Checklist & Denda)' },
              { value: 'teacher', label: 'Ustadz / Ustadzah (Read-Only Monitoring)' },
              { value: 'admin', label: 'Developer / Admin (Full Access)' },
            ]}
            disabled={isSubmitting}
            required
          />

          <Input
            label="Nomor WhatsApp (Opsional)"
            placeholder="08123456789"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            leftIcon={<Phone className="w-4 h-4 text-slate-400" />}
            disabled={isSubmitting}
          />

          <div className="pt-2 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreateModalOpen(false)}
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
              disabled={isSubmitting}
            >
              Simpan Akun
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
