import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ShieldCheck,
  ShieldAlert,
  Search,
  RefreshCw,
  Mail,
  Phone,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Users,
  Check,
  AlertCircle,
  X,
  Trash2,
  RotateCcw,
} from 'lucide-react';

import { Card, Button, Input, LoadingState, EmptyState, ErrorState, Modal } from '../../components/common';
import { useAuth } from '../../contexts/AuthContext';
import { DataService } from '../../services/dataService';
import { normalizeUserRoles, isValidUserRole, VALID_USER_ROLES } from '../../types';
import type { UserProfile, UserRole } from '../../types';

interface RoleOption {
  id: UserRole;
  label: string;
  emoji: string;
  description: string;
}

const AVAILABLE_ROLES: RoleOption[] = [
  {
    id: 'superadmin',
    label: 'Super Admin',
    emoji: '👑',
    description: 'Akses penuh seluruh sistem & otorisasi manajemen role pengguna',
  },
  {
    id: 'admin',
    label: 'Admin',
    emoji: '🛠️',
    description: 'Panel kontrol, master data, jadwal, inventaris & verifikasi denda',
  },
  {
    id: 'cleaner',
    label: 'Petugas Kebersihan',
    emoji: '🧹',
    description: 'Pengerjaan checklist area kebersihan & pelaporan temuan pelanggaran',
  },
  {
    id: 'teacher',
    label: 'Guru',
    emoji: '👨‍🏫',
    description: 'Inspeksi & evaluasi kebersihan kelas serta rekapitulasi nilai kelas binaan',
  },
];

export const SuperAdminUsersPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, hasRole, activeRole, setActiveRole, refreshUserProfile } = useAuth();

  // State
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | UserRole>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  // Modal & Mutation State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<UserRole[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [successFeedback, setSuccessFeedback] = useState<string | null>(null);

  // Modal Deaktivasi (Soft Delete)
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
  const [userToDeactivate, setUserToDeactivate] = useState<UserProfile | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [deactivateError, setDeactivateError] = useState<string | null>(null);

  const handleOpenRoleModal = (user: UserProfile) => {
    setSelectedUser(user);
    // Jika user memiliki roles[], gunakan roles[]
    // Jika hanya memiliki legacy role, gunakan [role]
    // Fallback aman ke ['cleaner'] jika tidak tersedia
    const initialRoles: UserRole[] =
      user.roles && user.roles.length > 0
        ? user.roles
        : isValidUserRole(user.role)
        ? [user.role]
        : ['cleaner'];

    setSelectedRoles([...initialRoles]);
    setValidationError(null);
    setSaveError(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (isSaving) return; // Cegah menutup saat proses simpan berlangsung
    setIsModalOpen(false);
    setSelectedUser(null);
    setSelectedRoles([]);
    setValidationError(null);
    setSaveError(null);
  };

  const handleToggleRole = (role: UserRole) => {
    if (isSaving) return;

    setSelectedRoles((prev) => {
      let next: UserRole[];
      if (prev.includes(role)) {
        next = prev.filter((r) => r !== role);
      } else {
        next = [...prev, role];
      }

      if (next.length === 0) {
        setValidationError('Pengguna harus memiliki minimal satu role.');
      } else {
        setValidationError(null);
      }

      return next;
    });
  };

  const handleSaveRoles = async () => {
    if (!selectedUser || isSaving) return;

    // Validasi 1: Pengguna wajib memiliki minimal satu role
    if (selectedRoles.length === 0) {
      setValidationError('Pengguna harus memiliki minimal satu role.');
      return;
    }

    // Validasi 2: Hanya role dalam VALID_USER_ROLES yang boleh disimpan
    const validatedRoles = selectedRoles.filter((r): r is UserRole =>
      VALID_USER_ROLES.includes(r)
    );

    if (validatedRoles.length === 0) {
      setValidationError('Pengguna harus memiliki minimal satu role.');
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setValidationError(null);

    try {
      // 1. Ambil data pengguna terbaru untuk memverifikasi kondisi Super Admin terkini
      const freshUsers = await DataService.getUsers();
      const freshTarget = freshUsers.find((u) => u.uid === selectedUser.uid) || selectedUser;
      const targetRoles = freshTarget.roles || normalizeUserRoles(freshTarget);
      const targetHadSuperAdmin = targetRoles.includes('superadmin');
      const targetWillKeepSuperAdmin = validatedRoles.includes('superadmin');
      const isSelf = Boolean(currentUser && currentUser.uid === selectedUser.uid);

      // 2. Proteksi Aturan Super Admin Terakhir & Self-Demotion
      if (targetHadSuperAdmin && !targetWillKeepSuperAdmin) {
        const otherSuperAdmins = freshUsers.filter(
          (u) =>
            u.uid !== selectedUser.uid &&
            u.isActive !== false &&
            (u.roles || normalizeUserRoles(u)).includes('superadmin')
        );

        if (otherSuperAdmins.length === 0) {
          setIsSaving(false);
          const errorMsg = isSelf
            ? 'Anda adalah satu-satunya Super Admin. Tambahkan Super Admin lain sebelum menghapus role Super Admin dari akun ini.'
            : 'Minimal harus ada satu Super Admin yang tetap aktif.';
          setValidationError(errorMsg);
          return;
        }
      }

      // 3. Mutasi role via DataService
      await DataService.updateUserRoles(selectedUser.uid, validatedRoles, currentUser?.uid);

      // 4. Penyesuaian activeRole & sinkronisasi akun jika mengedit diri sendiri (Self-Demotion)
      if (isSelf) {
        // Jika activeRole saat ini sudah tidak ada di roles baru, beralih ke role pertama yang tersisa
        if (!validatedRoles.includes(activeRole)) {
          const nextRole = validatedRoles[0];
          setActiveRole(nextRole);
        }
        // Segarkan data currentUser di AuthContext agar TopBar & UI langsung reaktif
        if (refreshUserProfile) {
          await refreshUserProfile();
        }
      }

      // 5. UX Berhasil
      setSuccessFeedback(
        isSelf
          ? 'Role akun Anda berhasil diperbarui.'
          : `Role pengguna "${selectedUser.displayName}" berhasil diperbarui.`
      );
      setIsModalOpen(false);
      setSelectedUser(null);

      // Refresh data pengguna agar role terbaru langsung tampil
      await loadUsers();

      // Auto-hide feedback sukses setelah 4 detik
      setTimeout(() => {
        setSuccessFeedback(null);
      }, 4000);
    } catch (err: any) {
      console.error('Failed to update user roles:', err);
      const customMessage =
        err?.message?.includes('Super Admin') || err?.message?.includes('minimal satu role')
          ? err.message
          : 'Gagal memperbarui role pengguna. Silakan coba lagi.';
      setSaveError(customMessage);
    } finally {
      setIsSaving(false);
    }
  };

  // Keamanan: Cek hak akses Super Admin berbasis multi-role
  const isSuperAdmin =
    hasRole('superadmin') ||
    (currentUser?.roles && currentUser.roles.includes('superadmin'));

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await DataService.getUsers();
      // Pastikan setiap user memiliki roles yang dinormalisasi
      const normalizedList = data.map((u) => ({
        ...u,
        roles: normalizeUserRoles(u),
      }));
      setUsers(normalizedList);
    } catch (err: any) {
      console.error('Failed to load users for superadmin:', err);
      setErrorMessage(err?.message || 'Gagal memuat daftar pengguna dari Firestore.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isSuperAdmin) {
      void loadUsers();
    } else {
      setIsLoading(false);
    }
  }, [isSuperAdmin, loadUsers]);

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
      setSuccessFeedback('Pengguna berhasil dinonaktifkan.');
      setIsDeactivateModalOpen(false);
      setUserToDeactivate(null);
      await loadUsers();
      setTimeout(() => {
        setSuccessFeedback(null);
      }, 4000);
    } catch (err: any) {
      setDeactivateError(err?.message || 'Gagal menonaktifkan pengguna.');
    } finally {
      setIsDeactivating(false);
    }
  };

  const handleReactivateUser = async (user: UserProfile) => {
    try {
      await DataService.reactivateUser(user.uid);
      setSuccessFeedback(`Pengguna "${user.displayName}" berhasil diaktifkan kembali.`);
      await loadUsers();
      setTimeout(() => {
        setSuccessFeedback(null);
      }, 4000);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Gagal mengaktifkan kembali pengguna.');
    }
  };

  // Statistik role & status untuk badge & summary
  const stats = useMemo(() => {
    let superadminCount = 0;
    let adminCount = 0;
    let cleanerCount = 0;
    let teacherCount = 0;
    let activeCount = 0;
    let inactiveCount = 0;

    users.forEach((u) => {
      if (u.isActive !== false) {
        activeCount++;
      } else {
        inactiveCount++;
      }
      const userRoles = u.roles || normalizeUserRoles(u);
      if (userRoles.includes('superadmin')) superadminCount++;
      if (userRoles.includes('admin')) adminCount++;
      if (userRoles.includes('cleaner')) cleanerCount++;
      if (userRoles.includes('teacher')) teacherCount++;
    });

    return {
      total: users.length,
      active: activeCount,
      inactive: inactiveCount,
      superadmin: superadminCount,
      admin: adminCount,
      cleaner: cleanerCount,
      teacher: teacherCount,
    };
  }, [users]);

  // Filter & Search
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Filter pencarian berdasarkan nama, email, dan UID
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        u.displayName.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query) ||
        u.uid.toLowerCase().includes(query);

      if (!matchesSearch) return false;

      // Filter berdasarkan status
      if (filterStatus === 'active' && u.isActive === false) return false;
      if (filterStatus === 'inactive' && u.isActive !== false) return false;

      // Filter berdasarkan role
      if (filterRole === 'all') return true;
      const userRoles = u.roles || normalizeUserRoles(u);
      return userRoles.includes(filterRole);
    });
  }, [users, searchQuery, filterStatus, filterRole]);

  // Helper render badge role dengan emoji sesuai requirement
  const renderRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'superadmin':
        return (
          <span
            key={role}
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200"
          >
            <span>👑</span> Super Admin
          </span>
        );
      case 'admin':
        return (
          <span
            key={role}
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200"
          >
            <span>🛠️</span> Admin
          </span>
        );
      case 'cleaner':
        return (
          <span
            key={role}
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200"
          >
            <span>🧹</span> Petugas Kebersihan
          </span>
        );
      case 'teacher':
        return (
          <span
            key={role}
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200"
          >
            <span>👨‍🏫</span> Guru
          </span>
        );
    }
  };

  // 1. Tampilan Akses Ditolak jika user bukan Super Admin
  if (!isSuperAdmin) {
    return (
      <div className="space-y-4">
        <Card className="p-6 bg-rose-50/80 border border-rose-200 text-center flex flex-col items-center">
          <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mb-3">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-rose-900">Akses Ditolak</h3>
          <p className="text-xs text-rose-700 max-w-sm mt-1 mb-4 leading-relaxed">
            Halaman ini khusus untuk pengguna dengan peran <strong>Super Admin</strong>. Akun Anda tidak memiliki otorisasi untuk melihat atau mengelola hak akses peran.
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate('/admin')}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Kembali ke Dashboard Admin
          </Button>
        </Card>
      </div>
    );
  }

  // 2. Loading State
  if (isLoading) {
    return <LoadingState message="Memuat daftar pengguna & otorisasi peran..." />;
  }

  // 3. Error State
  if (errorMessage) {
    return (
      <div className="space-y-4">
        <ErrorState
          title="Gagal Memuat Data Pengguna"
          message={errorMessage}
          onRetry={loadUsers}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header & Sub-Navigasi Tab */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-700 to-indigo-600 text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Manajemen Role</h2>
              <p className="text-xs text-slate-500">Otorisasi multi-role pengguna SIBERSIH</p>
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={loadUsers}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            className="text-xs text-slate-600 hover:text-purple-700"
          >
            Refresh
          </Button>
        </div>

        {/* Tab Navigasi Antara Akun Pengguna & Manajemen Role */}
        <div className="flex border-b border-slate-200">
          <Link
            to="/admin/users"
            className="py-2 px-3 text-xs font-semibold text-slate-500 hover:text-slate-800 border-b-2 border-transparent transition-colors"
          >
            Akun Pengguna
          </Link>
          <span className="py-2 px-3 text-xs font-bold text-purple-700 border-b-2 border-purple-600">
            👑 Manajemen Role (Super Admin)
          </span>
        </div>
      </div>

      {/* Success Feedback Toast/Banner */}
      {successFeedback && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800 shadow-2xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{successFeedback}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessFeedback(null)}
            className="text-emerald-600 hover:text-emerald-800 p-0.5 rounded cursor-pointer"
            aria-label="Tutup notifikasi"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Mode Manajemen Multi-Role Aktif Banner */}
      <div className="p-3 bg-purple-50/80 border border-purple-200/90 rounded-xl flex items-start gap-2.5 text-xs text-purple-900 shadow-2xs">
        <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
        <div className="flex-1">
          <span className="font-bold">Otorisasi Manajemen Multi-Role Aktif</span>
          <p className="text-[11px] text-purple-700 mt-0.5 leading-relaxed">
            Sebagai <strong>Super Admin</strong>, Anda memiliki wewenang penuh untuk menambah, mengubah, atau mencabut peran pengguna. Klik tombol <strong>Kelola Role</strong> pada kartu pengguna di bawah untuk mengelola peran.
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="bg-white p-2.5 rounded-xl border border-slate-200 text-center">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Total User</span>
          <span className="text-lg font-bold text-slate-900">{stats.total}</span>
        </div>
        <div className="bg-white p-2.5 rounded-xl border border-purple-200 bg-purple-50/30 text-center">
          <span className="text-[10px] font-semibold text-purple-600 uppercase tracking-wider block">👑 Super Admin</span>
          <span className="text-lg font-bold text-purple-900">{stats.superadmin}</span>
        </div>
        <div className="bg-white p-2.5 rounded-xl border border-indigo-200 bg-indigo-50/30 text-center">
          <span className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wider block">🛠️ Admin</span>
          <span className="text-lg font-bold text-indigo-900">{stats.admin}</span>
        </div>
        <div className="bg-white p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/30 text-center">
          <span className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider block">🧹 & 👨‍🏫 Lapangan</span>
          <span className="text-lg font-bold text-emerald-900">{stats.cleaner + stats.teacher}</span>
        </div>
      </div>

      {/* Search Input */}
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
          type="button"
          onClick={() => setFilterRole('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
            filterRole === 'all'
              ? 'bg-slate-800 text-white'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          Semua ({stats.total})
        </button>
        <button
          type="button"
          onClick={() => setFilterRole('superadmin')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
            filterRole === 'superadmin'
              ? 'bg-purple-700 text-white'
              : 'bg-white text-purple-700 border border-purple-200 hover:bg-purple-50'
          }`}
        >
          👑 Super Admin ({stats.superadmin})
        </button>
        <button
          type="button"
          onClick={() => setFilterRole('admin')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
            filterRole === 'admin'
              ? 'bg-indigo-600 text-white'
              : 'bg-white text-indigo-700 border border-indigo-200 hover:bg-indigo-50'
          }`}
        >
          🛠️ Admin ({stats.admin})
        </button>
        <button
          type="button"
          onClick={() => setFilterRole('cleaner')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
            filterRole === 'cleaner'
              ? 'bg-emerald-600 text-white'
              : 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50'
          }`}
        >
          🧹 Petugas Kebersihan ({stats.cleaner})
        </button>
        <button
          type="button"
          onClick={() => setFilterRole('teacher')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
            filterRole === 'teacher'
              ? 'bg-amber-600 text-white'
              : 'bg-white text-amber-700 border border-amber-200 hover:bg-amber-50'
          }`}
        >
          👨‍🏫 Guru ({stats.teacher})
        </button>
      </div>

      {/* Users List */}
      <div className="space-y-3">
        {filteredUsers.length === 0 ? (
          <EmptyState
            icon={<Users className="w-7 h-7 text-slate-400" />}
            title="Tidak Ada Pengguna"
            description={
              searchQuery || filterStatus !== 'all' || filterRole !== 'all'
                ? 'Tidak ditemukan pengguna yang sesuai dengan pencarian atau filter yang dipilih.'
                : 'Belum ada data pengguna yang terdaftar di sistem.'
            }
            actionLabel={searchQuery || filterStatus !== 'all' || filterRole !== 'all' ? 'Reset Pencarian' : undefined}
            onAction={
              searchQuery || filterStatus !== 'all' || filterRole !== 'all'
                ? () => {
                    setSearchQuery('');
                    setFilterStatus('all');
                    setFilterRole('all');
                  }
                : undefined
            }
          />
        ) : (
          filteredUsers.map((user) => {
            const userRoles = user.roles || normalizeUserRoles(user);
            const isMultiRole = userRoles.length > 1;
            const isLastSuperAdminUser = isLastActiveSuperAdmin(user);

            return (
              <Card
                key={user.uid}
                className="p-3.5 bg-white border border-slate-200 hover:border-slate-300 transition-shadow shadow-xs space-y-3"
              >
                {/* Header User Card: Profil & Status */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Avatar */}
                    {user.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt={user.displayName}
                        className="w-10 h-10 rounded-full object-cover shrink-0 border border-slate-200"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-sm shrink-0 border border-slate-200">
                        {user.displayName ? user.displayName.charAt(0).toUpperCase() : '?'}
                      </div>
                    )}

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="font-bold text-sm text-slate-900 truncate">
                          {user.displayName}
                        </h3>
                        {currentUser?.uid === user.uid && (
                          <span className="text-[10px] font-bold bg-purple-100 text-purple-700 px-1.5 py-0.2 rounded border border-purple-200 shrink-0">
                            Akun Anda
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1 truncate">
                          <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{user.email}</span>
                        </span>
                        {user.phoneNumber && (
                          <span className="flex items-center gap-1 text-slate-500">
                            <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{user.phoneNumber}</span>
                          </span>
                        )}
                        <span className="text-[10px] font-mono text-slate-400 truncate">
                          UID: {user.uid}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Status Aktif/Nonaktif */}
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

                {/* Section Peran: roles[] & legacy role */}
                <div className="pt-2 border-t border-slate-100 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Peran Sistem ({userRoles.length})
                    </span>
                    {isMultiRole && (
                      <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded border border-emerald-200">
                        Multi-Role Aktif
                      </span>
                    )}
                  </div>

                  {/* Badges Roles[] */}
                  <div className="flex flex-wrap gap-1.5">
                    {userRoles.map((r) => renderRoleBadge(r))}
                  </div>

                  {/* Legacy Role Indicator jika masih ada */}
                  {user.role && (
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 pt-1">
                      <span className="text-slate-400 text-[10px]">Field legacy:</span>
                      <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded border border-slate-200">
                        role: &quot;{user.role}&quot;
                      </span>
                      {userRoles.length === 1 && userRoles[0] === user.role && (
                        <span className="text-[10px] text-slate-400">
                          (selaras)
                        </span>
                      )}
                    </div>
                  )}

                  {/* Tombol Aksi: Kelola Role & Nonaktifkan (Soft Delete) */}
                  <div className="pt-3 mt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <span className="text-[11px] font-medium text-slate-500">
                      Otorisasi peran pengguna
                    </span>
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* 1. Kelola Role */}
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenRoleModal(user)}
                        leftIcon={<ShieldCheck className="w-3.5 h-3.5 text-purple-600 shrink-0" />}
                        className="text-xs font-semibold text-purple-700 border-purple-200 hover:bg-purple-50 hover:border-purple-300 shadow-2xs cursor-pointer shrink-0"
                      >
                        Kelola Role
                      </Button>

                      {/* 2. Hapus Pengguna (Aktif) atau Aktifkan Kembali (Nonaktif) */}
                      {user.isActive !== false ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenDeactivateModal(user)}
                          leftIcon={<Trash2 className="w-3.5 h-3.5 text-rose-600 shrink-0" />}
                          className="text-xs font-semibold text-rose-700 border-rose-200 hover:bg-rose-50 hover:border-rose-300 shadow-2xs cursor-pointer shrink-0"
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
                          className="text-xs font-semibold text-emerald-700 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300 shadow-2xs cursor-pointer shrink-0"
                        >
                          Aktifkan Kembali
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Modal Kelola Role Pengguna */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title="Kelola Role Pengguna"
        description="Atur hak akses peran multi-role pengguna sistem SIBERSIH."
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCloseModal}
              disabled={isSaving}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleSaveRoles}
              disabled={isSaving || selectedRoles.length === 0}
              leftIcon={
                isSaving ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )
              }
              className="bg-purple-700 hover:bg-purple-800 text-white cursor-pointer"
            >
              {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Button>
          </div>
        }
      >
        {selectedUser && (
          <div className="space-y-4">
            {/* Profil Pengguna yang Sedang Dikelola */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                {selectedUser.avatarUrl ? (
                  <img
                    src={selectedUser.avatarUrl}
                    alt={selectedUser.displayName}
                    className="w-9 h-9 rounded-full object-cover shrink-0 border border-slate-200"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs shrink-0 border border-purple-200">
                    {selectedUser.displayName ? selectedUser.displayName.charAt(0).toUpperCase() : '?'}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-bold text-xs text-slate-900 truncate">
                      {selectedUser.displayName}
                    </h4>
                    {currentUser?.uid === selectedUser.uid && (
                      <span className="text-[10px] font-bold bg-purple-100 text-purple-700 px-1.5 py-0.2 rounded border border-purple-200 shrink-0">
                        Akun Anda
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 truncate flex items-center gap-1">
                    <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate">{selectedUser.email}</span>
                  </p>
                </div>
              </div>
              <div className="shrink-0">
                {selectedUser.isActive ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                    Aktif
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                    <XCircle className="w-2.5 h-2.5 text-rose-600" />
                    Nonaktif
                  </span>
                )}
              </div>
            </div>

            {/* Peringatan Self-Demotion Super Admin */}
            {currentUser?.uid === selectedUser.uid && !selectedRoles.includes('superadmin') && (
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 text-xs text-amber-900 animate-in fade-in duration-150">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="leading-snug">
                  <span className="font-bold block">Peringatan Pelepasan Hak Super Admin:</span>
                  <span className="text-[11px] text-amber-800">
                    Anda sedang melepas peran Super Admin dari akun Anda sendiri. Perubahan hanya diperbolehkan jika masih ada Super Admin lain yang aktif di sistem.
                  </span>
                </div>
              </div>
            )}

            {/* Role Pengguna Saat Ini */}
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 block">
                Role Saat Ini:
              </span>
              <div className="flex flex-wrap gap-1">
                {(selectedUser.roles || normalizeUserRoles(selectedUser)).map((r) =>
                  renderRoleBadge(r)
                )}
              </div>
            </div>

            {/* Checkbox Pilihan Role */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-900">
                  Pilih Role Pengguna:
                </label>
                <span className="text-[11px] text-slate-500 font-medium">
                  {selectedRoles.length} role terpilih
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Centang peran yang diberikan kepada pengguna ini. Jika memilih lebih dari satu, pengguna akan memiliki hak multi-role.
              </p>

              <div className="space-y-2 pt-0.5">
                {AVAILABLE_ROLES.map((roleOpt) => {
                  const isChecked = selectedRoles.includes(roleOpt.id);
                  return (
                    <label
                      key={roleOpt.id}
                      className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                        isChecked
                          ? 'bg-purple-50/70 border-purple-300 shadow-2xs'
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                      } ${isSaving ? 'opacity-60 cursor-not-allowed pointer-events-none' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleRole(roleOpt.id)}
                        disabled={isSaving}
                        className="mt-0.5 w-4 h-4 text-purple-600 border-slate-300 rounded focus:ring-purple-500 focus:ring-offset-0 cursor-pointer transition-colors"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm">{roleOpt.emoji}</span>
                          <span className="font-bold text-xs text-slate-900">
                            {roleOpt.label}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            ({roleOpt.id})
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                          {roleOpt.description}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Validasi Error: Minimal 1 role */}
            {validationError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-800 animate-in fade-in duration-150">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span className="font-semibold">{validationError}</span>
              </div>
            )}

            {/* Pesan Error Firestore */}
            {saveError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-800 animate-in fade-in duration-150">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span className="font-semibold">{saveError}</span>
              </div>
            )}

            {/* Sinkronisasi Field Legacy Note */}
            <div className="p-2.5 bg-slate-100 rounded-lg text-[11px] text-slate-600 leading-relaxed border border-slate-200">
              <span className="font-semibold text-slate-700">Sinkronisasi Legacy:</span> Field <code className="bg-slate-200/80 px-1 py-0.5 rounded font-mono text-slate-800">role</code> akan otomatis disinkronkan dengan role pertama (<strong>{selectedRoles[0] || '—'}</strong>) untuk menjaga kompatibilitas aplikasi.
            </div>
          </div>
        )}
      </Modal>

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
                <div className="flex flex-wrap gap-1">
                  {(userToDeactivate.roles || normalizeUserRoles(userToDeactivate)).map((r) =>
                    renderRoleBadge(r)
                  )}
                </div>
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
    </div>
  );
};

export default SuperAdminUsersPage;
