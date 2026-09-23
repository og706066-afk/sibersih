import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
  Search,
  Trash2,
  RotateCcw,
} from 'lucide-react';

import { Card, Button, Badge, Modal, Input, Select, LoadingState } from '../../components/common';
import { useAuth } from '../../contexts/AuthContext';
import { DataService } from '../../services/dataService';
import { normalizeUserRoles } from '../../types';
import type { UserProfile, UserRole } from '../../types';

export const AdminUsersPage: React.FC = () => {
  const { currentUser, hasRole } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterRole, setFilterRole] = useState<'all' | UserRole>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Modal Deaktivasi (Soft Delete)
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
  const [userToDeactivate, setUserToDeactivate] = useState<UserProfile | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [deactivateError, setDeactivateError] = useState<string | null>(null);

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

  const isSuperAdmin =
    hasRole('superadmin') ||
    Boolean(currentUser?.roles && currentUser.roles.includes('superadmin'));
  const isAdmin = hasRole('admin') || isSuperAdmin;

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

  // Cek apakah target pengguna adalah Super Admin terakhir yang masih aktif
  const isLastActiveSuperAdmin = (targetUser: UserProfile): boolean => {
    const targetRoles = targetUser.roles || normalizeUserRoles(targetUser);
    if (!targetRoles.includes('superadmin')) return false;

    const otherActiveSuperAdmins = users.filter(
      (u) =>
        u.uid !== targetUser.uid &&
        u.isActive !== false &&
        (u.roles || normalizeUserRoles(u)).includes('superadmin')
    );

    return otherActiveSuperAdmins.length === 0;
  };

  const handleOpenDeactivateModal = (user: UserProfile) => {
    setUserToDeactivate(user);
    setDeactivateError(null);
    setIsDeactivateModalOpen(true);
  };

  const handleCloseDeactivateModal = () => {
    if (isDeactivating) return;
    setIsDeactivateModalOpen(false);
    setUserToDeactivate(null);
    setDeactivateError(null);
  };

  const handleConfirmDeactivate = async () => {
    if (!userToDeactivate || isDeactivating) return;

    if (isLastActiveSuperAdmin(userToDeactivate)) {
      setDeactivateError('Super Admin terakhir yang masih aktif tidak dapat dinonaktifkan.');
      return;
    }

    setIsDeactivating(true);
    setDeactivateError(null);

    try {
      await DataService.deactivateUser(userToDeactivate.uid, currentUser?.uid);
      setFeedbackMessage({
        type: 'success',
        text: 'Pengguna berhasil dinonaktifkan.',
      });
      setIsDeactivateModalOpen(false);
      setUserToDeactivate(null);
      await loadUsers();
    } catch (err: any) {
      setDeactivateError(err?.message || 'Gagal menonaktifkan pengguna.');
    } finally {
      setIsDeactivating(false);
    }
  };

  const handleReactivateUser = async (user: UserProfile) => {
    try {
      await DataService.reactivateUser(user.uid);
      setFeedbackMessage({
        type: 'success',
        text: `Pengguna "${user.displayName}" berhasil diaktifkan kembali.`,
      });
      await loadUsers();
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err?.message || 'Gagal mengaktifkan kembali pengguna.',
      });
    }
  };

  // Statistik status pengguna
  const stats = useMemo(() => {
    let active = 0;
    let inactive = 0;
    users.forEach((u) => {
      if (u.isActive !== false) {
        active++;
      } else {
        inactive++;
      }
    });
    return {
      total: users.length,
      active,
      inactive,
    };
  }, [users]);

  // Filter & Search Pengguna (Local Search)
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // 1. Pencarian lokal: Nama, Email, UID
      const query = searchQuery.trim().toLowerCase();
      if (query) {
        const matchesName = u.displayName.toLowerCase().includes(query);
        const matchesEmail = u.email.toLowerCase().includes(query);
        const matchesUid = u.uid.toLowerCase().includes(query);
        if (!matchesName && !matchesEmail && !matchesUid) {
          return false;
        }
      }

      // 2. Filter Status: Semua, Aktif, Nonaktif
      if (filterStatus === 'active' && u.isActive === false) return false;
      if (filterStatus === 'inactive' && u.isActive !== false) return false;

      // 3. Filter Role
      if (filterRole !== 'all') {
        const userRoles = u.roles || normalizeUserRoles(u);
        if (!userRoles.includes(filterRole) && u.role !== filterRole) {
          return false;
        }
      }

      return true;
    });
  }, [users, searchQuery, filterStatus, filterRole]);

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

      {/* Tab Navigasi Khusus Super Admin */}
      {hasRole('superadmin') && (
        <div className="flex border-b border-slate-200">
          <span className="py-2 px-3 text-xs font-bold text-indigo-700 border-b-2 border-indigo-600">
            Akun Pengguna
          </span>
          <Link
            to="/admin/users/roles"
            className="py-2 px-3 text-xs font-semibold text-slate-500 hover:text-purple-700 border-b-2 border-transparent transition-colors flex items-center gap-1"
          >
            <span>👑</span> Manajemen Role
          </Link>
        </div>
      )}

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

      {/* Kolom Pencarian Pengguna (Search UX) */}
      <div>
        <Input
          type="text"
          placeholder="Cari nama atau email pengguna..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          leftIcon={<Search className="w-4 h-4 text-slate-400" />}
          className="text-xs"
        />
      </div>

      {/* Filter Status: Semua, Aktif, Nonaktif */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
          Status:
        </span>
        <button
          type="button"
          onClick={() => setFilterStatus('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
            filterStatus === 'all'
              ? 'bg-slate-900 text-white'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          Semua ({stats.total})
        </button>
        <button
          type="button"
          onClick={() => setFilterStatus('active')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            filterStatus === 'active'
              ? 'bg-emerald-700 text-white'
              : 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50'
          }`}
        >
          <span>🟢</span>
          <span>Aktif ({stats.active})</span>
        </button>
        <button
          type="button"
          onClick={() => setFilterStatus('inactive')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            filterStatus === 'inactive'
              ? 'bg-slate-700 text-white'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <span>⚪</span>
          <span>Nonaktif ({stats.inactive})</span>
        </button>
      </div>

      {/* Role Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
          Peran:
        </span>
        <button
          onClick={() => setFilterRole('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
            filterRole === 'all'
              ? 'bg-slate-800 text-white'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          Semua ({users.length})
        </button>
        <button
          onClick={() => setFilterRole('cleaner')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
            filterRole === 'cleaner'
              ? 'bg-emerald-600 text-white'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          Petugas Kebersihan ({users.filter((u) => u.role === 'cleaner').length})
        </button>
        <button
          onClick={() => setFilterRole('teacher')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
            filterRole === 'teacher'
              ? 'bg-amber-600 text-white'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          Ustadz/ah ({users.filter((u) => u.role === 'teacher').length})
        </button>
        <button
          onClick={() => setFilterRole('admin')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
            filterRole === 'admin'
              ? 'bg-indigo-600 text-white'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          Admin ({users.filter((u) => u.role === 'admin').length})
        </button>
      </div>

      {/* Users List */}
      <div className="space-y-2.5">
        {filteredUsers.length === 0 ? (
          <Card className="p-6 text-center text-xs text-slate-400 bg-white">
            {searchQuery || filterStatus !== 'all' || filterRole !== 'all'
              ? 'Tidak ditemukan pengguna yang sesuai dengan kriteria pencarian atau filter.'
              : 'Belum ada pengguna pada kategori peran ini.'}
          </Card>
        ) : (
          filteredUsers.map((user) => {
            const isLastSuperAdminUser = isLastActiveSuperAdmin(user);

            return (
              <Card key={user.uid} className="p-3.5 bg-white border border-slate-200 hover:border-slate-300 transition-shadow shadow-xs space-y-3">
                {/* Info Pengguna & Status */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-slate-900 truncate">{user.displayName}</span>
                      {getRoleBadge(user.role)}
                      {currentUser?.uid === user.uid && (
                        <span className="text-[10px] font-bold bg-purple-100 text-purple-700 px-1.5 py-0.2 rounded border border-purple-200 shrink-0">
                          Akun Anda
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mt-1 text-xs text-slate-500">
                      <span className="flex items-center gap-1 truncate">
                        <Mail className="w-3 h-3 text-slate-400 shrink-0" /> {user.email}
                      </span>
                      {user.phoneNumber && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400 shrink-0" /> {user.phoneNumber}
                        </span>
                      )}
                      <span className="text-[10px] font-mono text-slate-400 truncate">
                        UID: {user.uid}
                      </span>
                    </div>
                  </div>

                  {/* Status Pengguna: 🟢 Aktif / ⚪ Nonaktif */}
                  <div className="shrink-0">
                    {user.isActive !== false ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        <span>🟢</span>
                        <span>Aktif</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-300">
                        <span>⚪</span>
                        <span>Nonaktif</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Aksi Nonaktifkan (Soft Delete) atau Aktifkan Kembali bagi Role Berwenang */}
                {isAdmin && (
                  <div className="pt-2.5 mt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-400">
                      {user.isActive !== false ? 'Opsi status akun' : 'Akun telah dinonaktifkan'}
                    </span>
                    <div className="flex items-center gap-2 flex-wrap">
                      {user.isActive !== false ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenDeactivateModal(user)}
                          leftIcon={<Trash2 className="w-3.5 h-3.5 text-rose-600 shrink-0" />}
                          className="text-xs font-semibold text-rose-700 border-rose-200 hover:bg-rose-50 hover:border-rose-300 cursor-pointer shadow-2xs shrink-0"
                          title={
                            isLastSuperAdminUser
                              ? 'Super Admin terakhir yang masih aktif tidak dapat dinonaktifkan'
                              : 'Nonaktifkan akun pengguna'
                          }
                        >
                          Hapus Pengguna
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleReactivateUser(user)}
                          leftIcon={<RotateCcw className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                          className="text-xs font-semibold text-emerald-700 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300 cursor-pointer shadow-2xs shrink-0"
                        >
                          Aktifkan Kembali
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>

      {/* Modal: Konfirmasi Nonaktifkan Pengguna (Soft Delete) */}
      <Modal
        isOpen={isDeactivateModalOpen}
        onClose={handleCloseDeactivateModal}
        title="Nonaktifkan Pengguna?"
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCloseDeactivateModal}
              disabled={isDeactivating}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={handleConfirmDeactivate}
              disabled={
                isDeactivating ||
                (userToDeactivate ? isLastActiveSuperAdmin(userToDeactivate) : false)
              }
              isLoading={isDeactivating}
            >
              Nonaktifkan Pengguna
            </Button>
          </div>
        }
      >
        {userToDeactivate && (
          <div className="space-y-3.5">
            {/* Detail Akun Pengguna */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-slate-900">
                  {userToDeactivate.displayName}
                </span>
                {getRoleBadge(userToDeactivate.role)}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{userToDeactivate.email}</span>
              </div>
              <div className="text-[10px] font-mono text-slate-400">
                UID: {userToDeactivate.uid}
              </div>
            </div>

            {/* Pesan Konfirmasi Resmi sesuai Spesifikasi */}
            <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                Pengguna ini tidak dapat login lagi setelah dinonaktifkan. Data profil dan seluruh riwayat aktivitas pengguna tetap tersimpan.
              </p>
            </div>

            {/* Proteksi Super Admin Terakhir */}
            {isLastActiveSuperAdmin(userToDeactivate) && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <span className="font-bold block">Tindakan Ditolak:</span>
                  <span>Super Admin terakhir yang masih aktif tidak dapat dinonaktifkan. Minimal harus ada satu Super Admin aktif.</span>
                </div>
              </div>
            )}

            {/* Peringatan Menonaktifkan Diri Sendiri */}
            {currentUser?.uid === userToDeactivate.uid && !isLastActiveSuperAdmin(userToDeactivate) && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Perhatian:</strong> Anda sedang menonaktifkan akun Anda sendiri. Sesi login Anda akan otomatis keluar setelah tindakan ini.
                </span>
              </div>
            )}

            {/* Error Message jika terjadi kegagalan */}
            {deactivateError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span className="font-semibold">{deactivateError}</span>
              </div>
            )}
          </div>
        )}
      </Modal>

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
