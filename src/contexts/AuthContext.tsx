import React, { useState, useEffect } from 'react';


import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword,
  updatePassword as firebaseUpdatePassword,
  onAuthStateChanged,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from '../config/firebase';
import type { UserProfile, UserRole } from '../types';
import { normalizeUserRoles, isValidUserRole } from '../types';

import { DEMO_PROFILES } from '../constants/demoProfiles';


import { AuthContext } from './authContextInstance';




export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // If Firebase is not configured, fall back to default demo cleaner role
    if (!isFirebaseConfigured || !auth || !db) {
      const savedRole = (localStorage.getItem('sibersih_demo_role') as UserRole) || 'cleaner';
      const baseProfile = DEMO_PROFILES[savedRole as keyof typeof DEMO_PROFILES] || DEMO_PROFILES.cleaner;
      const savedDemoAvatar = localStorage.getItem(`sibersih_demo_avatar_${savedRole}`);
      setCurrentUser({
        ...baseProfile,
        roles: normalizeUserRoles(baseProfile),
        avatarUrl: savedDemoAvatar || baseProfile.avatarUrl,
      });
      setIsLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user && db) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userSnap = await getDoc(userDocRef);
          if (userSnap.exists()) {
            const rawData = userSnap.data();
            // Tolak user yang dinonaktifkan oleh Administrator
            if (rawData.isActive !== true) {
              if (auth) await firebaseSignOut(auth);
              setCurrentUser(null);
              setFirebaseUser(null);
              setIsLoading(false);
              return;
            }

            const roles = normalizeUserRoles(rawData);
            const primaryRole: UserRole = isValidUserRole(rawData.role) ? rawData.role : roles[0];

            const loadedProfile: UserProfile = {
              uid: user.uid,
              email: rawData.email || user.email || '',
              displayName: rawData.displayName || user.displayName || 'Pengguna',
              role: primaryRole,
              roles: roles,
              phoneNumber: rawData.phoneNumber,
              avatarUrl: rawData.avatarUrl || undefined,
              photoURL: rawData.photoURL,
              isActive: true,
              createdAt: rawData.createdAt || new Date().toISOString(),
              updatedAt: rawData.updatedAt || new Date().toISOString(),
            };
            setCurrentUser(loadedProfile);
          } else {
            // Pengguna Auth ada tetapi profil Firestore tidak ditemukan (belum diprovision Admin)
            console.warn('[SIBERSIH Auth] Dokumen /users/{uid} tidak ditemukan di Firestore. Akses ditolak.');
            if (auth) await firebaseSignOut(auth);
            setCurrentUser(null);
            setFirebaseUser(null);
          }
        } catch (error) {
          console.error('Failed to load user profile from Firestore:', error);
          if (auth) await firebaseSignOut(auth);
          setCurrentUser(null);
          setFirebaseUser(null);
        }
      } else {
        // Not authenticated
        // FIX 4: If Firebase is active and user == null, currentUser must be null (no fallback to demo profile)
        setCurrentUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<UserProfile> => {
    if (!isFirebaseConfigured || !auth || !db) {
      // Demo authentication simulation
      const demoKeys = Object.keys(DEMO_PROFILES) as (keyof typeof DEMO_PROFILES)[];
      const foundRole = demoKeys.find(
        (r) => DEMO_PROFILES[r].email.toLowerCase() === email.toLowerCase()
      );
      if (foundRole) {
        const demoUser = DEMO_PROFILES[foundRole];
        // FIX 2: Deny inactive users in demo mode
        if (demoUser.isActive !== true) {
          throw new Error('Akun Anda dinonaktifkan. Hubungi Administrator.');
        }
        const savedDemoAvatar = localStorage.getItem(`sibersih_demo_avatar_${foundRole}`);
        const activeDemoUser: UserProfile = {
          ...demoUser,
          roles: normalizeUserRoles(demoUser),
          avatarUrl: savedDemoAvatar || demoUser.avatarUrl,
        };
        setCurrentUser(activeDemoUser);
        localStorage.setItem('sibersih_demo_role', foundRole);
        return activeDemoUser;
      }
      throw new Error('Email demo tidak cocok. Gunakan salah satu email demo yang tertera.');
    }

    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const userDocRef = doc(db, 'users', userCredential.user.uid);
    const userSnap = await getDoc(userDocRef);
    if (userSnap.exists()) {
      const rawData = userSnap.data();
      // Tolak user jika isActive !== true
      if (rawData.isActive !== true) {
        await firebaseSignOut(auth);
        setCurrentUser(null);
        setFirebaseUser(null);
        throw new Error('Akun Anda sedang dinonaktifkan oleh Administrator.');
      }
      const roles = normalizeUserRoles(rawData);
      const primaryRole: UserRole = isValidUserRole(rawData.role) ? rawData.role : roles[0];

      const loadedProfile: UserProfile = {
        uid: userCredential.user.uid,
        email: rawData.email || userCredential.user.email || '',
        displayName: rawData.displayName || userCredential.user.displayName || 'Pengguna',
        role: primaryRole,
        roles: roles,
        phoneNumber: rawData.phoneNumber,
        avatarUrl: rawData.avatarUrl || undefined,
        photoURL: rawData.photoURL,
        isActive: true,
        createdAt: rawData.createdAt || new Date().toISOString(),
        updatedAt: rawData.updatedAt || new Date().toISOString(),
      };
      setActiveRoleState(null);
      setCurrentUser(loadedProfile);
      return loadedProfile;
    }

    // Dokumen /users/{uid} TIDAK ditemukan di Firestore:
    // Tolak akses, sign-out dari Firebase Auth, dan jangan pernah auto-create role
    await firebaseSignOut(auth);
    setCurrentUser(null);
    setFirebaseUser(null);
    throw new Error('Akun Anda belum terdaftar atau belum diaktivasi oleh Administrator. Silakan hubungi Admin SIBERSIH.');
  };

  const register = async (
    email: string,
    password: string,
    displayName: string,
    role: UserRole
  ): Promise<void> => {
    const roles: UserRole[] = [role];
    if (!isFirebaseConfigured || !auth || !db) {
      const newMockProfile: UserProfile = {
        uid: `mock-${Date.now()}`,
        email,
        displayName,
        role,
        roles,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setCurrentUser(newMockProfile);
      return;
    }

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const newProfile: UserProfile = {
      uid: userCredential.user.uid,
      email,
      displayName,
      role,
      roles,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'users', userCredential.user.uid), newProfile);
    setCurrentUser(newProfile);
  };

  const changePassword = async (newPassword: string): Promise<void> => {
    if (!isFirebaseConfigured || !auth) {
      // Demo mode password update simulation
      await new Promise((resolve) => setTimeout(resolve, 600));
      return;
    }

    if (!auth.currentUser) {
      throw new Error('Sesi autentikasi tidak ditemukan. Silakan login kembali.');
    }

    await firebaseUpdatePassword(auth.currentUser, newPassword);
  };

  const updateProfilePhoto = async (avatarUrl: string): Promise<void> => {
    // JANGAN menyimpan base64 data URL ke Firebase Auth (auth.currentUser)
    // Simpan ke Firestore dokumen /users/{currentUser.uid} pada field avatarUrl
    if (isFirebaseConfigured && db && currentUser?.uid) {
      try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userDocRef, {
          avatarUrl,
          updatedAt: new Date().toISOString(),
        });
      } catch (err: any) {
        console.error('Failed to update avatarUrl in Firestore users doc:', err);
        if (
          err?.code === 'permission-denied' ||
          err?.message?.includes('insufficient permissions') ||
          err?.message?.includes('Missing or insufficient permissions')
        ) {
          throw new Error('Anda tidak memiliki izin untuk memperbarui foto profil ini.');
        }
        throw err;
      }
    } else if (!isFirebaseConfigured) {
      // Demo / offline mode: simpan di localStorage agar tetap muncul setelah refresh
      try {
        const demoRole = currentUser?.role || 'cleaner';
        localStorage.setItem(`sibersih_demo_avatar_${demoRole}`, avatarUrl);
      } catch (err) {
        console.warn('Failed to save demo avatar to localStorage:', err);
      }
    }

    // Update state currentUser secara reactive agar UI langsung berubah tanpa reload
    setCurrentUser((prev) => (prev ? { ...prev, avatarUrl } : null));
  };

  const refreshUserProfile = async (): Promise<UserProfile | null> => {
    if (!isFirebaseConfigured || !auth || !db) {
      return currentUser;
    }
    const currentUid = auth.currentUser?.uid || currentUser?.uid;
    if (!currentUid) return null;

    try {
      const userDocRef = doc(db, 'users', currentUid);
      const userSnap = await getDoc(userDocRef);
      if (userSnap.exists()) {
        const rawData = userSnap.data();
        const roles = normalizeUserRoles(rawData);
        const primaryRole: UserRole = isValidUserRole(rawData.role) ? rawData.role : roles[0];
        const loadedProfile: UserProfile = {
          uid: currentUid,
          email: rawData.email || auth.currentUser?.email || '',
          displayName: rawData.displayName || auth.currentUser?.displayName || 'Pengguna',
          role: primaryRole,
          roles: roles,
          phoneNumber: rawData.phoneNumber,
          avatarUrl: rawData.avatarUrl || undefined,
          photoURL: rawData.photoURL,
          isActive: true,
          createdAt: rawData.createdAt || new Date().toISOString(),
          updatedAt: rawData.updatedAt || new Date().toISOString(),
        };
        setCurrentUser(loadedProfile);
        return loadedProfile;
      }
    } catch (err) {
      console.error('Failed to refresh user profile:', err);
    }
    return currentUser;
  };

  const logout = async (): Promise<void> => {
    if (auth && isFirebaseConfigured) {
      await firebaseSignOut(auth);
    }
    localStorage.removeItem('sibersih_demo_role');
    setActiveRoleState(null);
    setCurrentUser(null);
  };

  const switchDemoRole = (role: UserRole) => {
    // FIX 2: Do not allow switching demo role when Firebase Live is active
    if (isFirebaseConfigured && auth) {
      console.warn('[SIBERSIH] switchDemoRole diabaikan karena Firebase Live aktif.');
      return;
    }
    localStorage.setItem('sibersih_demo_role', role);
    const baseProfile = DEMO_PROFILES[role as keyof typeof DEMO_PROFILES] || DEMO_PROFILES.cleaner;
    const savedDemoAvatar = localStorage.getItem(`sibersih_demo_avatar_${role}`);
    setActiveRoleState(role);
    setCurrentUser({
      ...baseProfile,
      roles: normalizeUserRoles(baseProfile),
      avatarUrl: savedDemoAvatar || baseProfile.avatarUrl,
    });
  };

  const [activeRoleState, setActiveRoleState] = useState<UserRole | null>(null);

  const userRoles = currentUser?.roles && currentUser.roles.length > 0
    ? currentUser.roles
    : currentUser?.role && isValidUserRole(currentUser.role)
    ? [currentUser.role]
    : [];

  const activeRole: UserRole =
    activeRoleState && userRoles.includes(activeRoleState)
      ? activeRoleState
      : currentUser?.role && userRoles.includes(currentUser.role)
      ? currentUser.role
      : userRoles[0] || 'cleaner';

  const setActiveRole = (newRole: UserRole) => {
    if (!currentUser) return;
    const currentRoles =
      currentUser.roles && currentUser.roles.length > 0
        ? currentUser.roles
        : [currentUser.role];
    if (currentRoles.includes(newRole)) {
      setActiveRoleState(newRole);
    }
  };

  const hasRole = (role: UserRole): boolean => {
    const userRoles = currentUser?.roles;
    if (!userRoles || !Array.isArray(userRoles)) {
      return false;
    }
    return userRoles.includes(role);
  };

  const hasAnyRole = (rolesToCheck: UserRole[]): boolean => {
    const userRoles = currentUser?.roles;
    if (!userRoles || !Array.isArray(userRoles)) {
      return false;
    }
    return rolesToCheck.some((r) => userRoles.includes(r));
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        firebaseUser,
        isLoading,
        isFirebaseActive: isFirebaseConfigured,
        login,
        register,
        changePassword,
        updateProfilePhoto,
        logout,
        switchDemoRole,
        hasRole,
        hasAnyRole,
        activeRole,
        setActiveRole,
        refreshUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export { useAuth } from './useAuth';
export { AuthContext, type AuthContextType } from './authContextInstance';
export { normalizeUserRoles, isValidUserRole, VALID_USER_ROLES } from '../types';


