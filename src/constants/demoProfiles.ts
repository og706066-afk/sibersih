import type { UserProfile, UserRole } from '../types';

export const DEMO_PROFILES: Record<Extract<UserRole, 'admin' | 'cleaner' | 'teacher'>, UserProfile> = {
  admin: {
    uid: 'demo-admin-uid',
    email: 'admin@sibersih.id',
    displayName: 'Ahmad Faisal, S.Kom (Admin)',
    role: 'admin',
    roles: ['admin'],
    phoneNumber: '081234567890',
    isActive: true,
    createdAt: '2026-08-01T08:00:00Z',
    updatedAt: '2026-08-01T08:00:00Z',
  },
  cleaner: {
    uid: 'demo-cleaner-uid',
    email: 'kebersihan@sibersih.id',
    displayName: 'Pak Slamet (Tim Kebersihan)',
    role: 'cleaner',
    roles: ['cleaner'],
    phoneNumber: '081298765432',
    isActive: true,
    createdAt: '2026-08-01T08:00:00Z',
    updatedAt: '2026-08-01T08:00:00Z',
  },
  teacher: {
    uid: 'demo-teacher-uid',
    email: 'ustadz.syarif@sibersih.id',
    displayName: 'Ustadz Syarif Hidayatullah',
    role: 'teacher',
    roles: ['teacher'],
    phoneNumber: '085712345678',
    isActive: true,
    createdAt: '2026-08-01T08:00:00Z',
    updatedAt: '2026-08-01T08:00:00Z',
  },
};
