import React, { useState } from 'react';
import { Plus, Mail, Phone } from 'lucide-react';

import { Card, Button, Badge, Modal, Input, Select } from '../../components/common';
import { DEMO_PROFILES } from '../../constants/demoProfiles';
import type { UserProfile, UserRole } from '../../types';


export const AdminUsersPage: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([
    DEMO_PROFILES.admin,
    DEMO_PROFILES.cleaner,
    DEMO_PROFILES.teacher,
    {
      uid: 'user-cleaner-2',
      email: 'joko.kebersihan@sibersih.id',
      displayName: 'Pak Joko (Petugas Shift Siang)',
      role: 'cleaner',
      phoneNumber: '081399887766',
      isActive: true,
      createdAt: '2026-08-10T08:00:00Z',
      updatedAt: '2026-08-10T08:00:00Z',
    },
    {
      uid: 'user-teacher-2',
      email: 'ustadzah.nurul@sibersih.id',
      displayName: 'Ustadzah Nurul Latifah',
      role: 'teacher',
      phoneNumber: '085811223344',
      isActive: true,
      createdAt: '2026-08-10T08:00:00Z',
      updatedAt: '2026-08-10T08:00:00Z',
    },
  ]);

  const [filterRole, setFilterRole] = useState<'all' | UserRole>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Form State
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('cleaner');
  const [phone, setPhone] = useState('');

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    const newUser: UserProfile = {
      uid: `user-${Date.now()}`,
      email,
      displayName,
      role,
      phoneNumber: phone,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setUsers([newUser, ...users]);
    setIsCreateModalOpen(false);
    setDisplayName('');
    setEmail('');
    setPhone('');
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900">Manajemen Pengguna</h2>
          <p className="text-xs text-slate-500">Otorisasi & akun sistem SIBERSIH</p>
        </div>
        <Button
          size="sm"
          variant="primary"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setIsCreateModalOpen(true)}
        >
          Tambah Akun
        </Button>
      </div>

      {/* Role Filter Pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        <button
          onClick={() => setFilterRole('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            filterRole === 'all'
              ? 'bg-slate-900 text-white'
              : 'bg-white text-slate-600 border border-slate-200'
          }`}
        >
          Semua ({users.length})
        </button>
        <button
          onClick={() => setFilterRole('cleaner')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            filterRole === 'cleaner'
              ? 'bg-emerald-600 text-white'
              : 'bg-white text-slate-600 border border-slate-200'
          }`}
        >
          Petugas Kebersihan ({users.filter((u) => u.role === 'cleaner').length})
        </button>
        <button
          onClick={() => setFilterRole('teacher')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            filterRole === 'teacher'
              ? 'bg-amber-600 text-white'
              : 'bg-white text-slate-600 border border-slate-200'
          }`}
        >
          Ustadz/ah ({users.filter((u) => u.role === 'teacher').length})
        </button>
        <button
          onClick={() => setFilterRole('admin')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
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
        {filteredUsers.map((user) => (
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
              <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                Aktif
              </span>
            </div>
          </Card>
        ))}
      </div>

      {/* Modal: Tambah Akun Baru */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Tambah Akun Pengguna"
        description="Buat akun pengguna baru dan tetapkan peran akses"
      >
        <form onSubmit={handleCreateUser} className="space-y-3.5">
          <Input
            label="Nama Lengkap & Gelar"
            placeholder="Contoh: Ustadz Ahmad Fauzi, S.Pd"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
          />

          <Input
            type="email"
            label="Email Pengguna"
            placeholder="nama@sibersih.id"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Select
            label="Peran / Hak Akses"
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            options={[
              { value: 'cleaner', label: 'Bagian Kebersihan (Checklist & Denda)' },
              { value: 'teacher', label: 'Ustadz / Ustadzah (Read-Only Monitoring)' },
              { value: 'admin', label: 'Developer / Admin (Full Access)' },
            ]}
            required
          />

          <Input
            label="Nomor WhatsApp"
            placeholder="0812..."
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />

          <div className="pt-2 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Batal
            </Button>
            <Button type="submit" variant="primary">
              Simpan Akun
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
