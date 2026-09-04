import React, { useState, useEffect } from 'react';


import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword,
  updatePassword as firebaseUpdatePassword,
  onAuthStateChanged,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from '../config/firebase';
import type { UserProfile, UserRole } from '../types';

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
      setCurrentUser(DEMO_PROFILES[savedRole] || DEMO_PROFILES.cleaner);
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
            const profile = userSnap.data() as UserProfile;
            // Tolak user yang dinonaktifkan oleh Administrator
            if (profile.isActive !== true) {
              if (auth) await firebaseSignOut(auth);
              setCurrentUser(null);
              setFirebaseUser(null);
              setIsLoading(false);
              return;
            }

            setCurrentUser(profile);
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
      const foundRole = (Object.keys(DEMO_PROFILES) as UserRole[]).find(
        (r) => DEMO_PROFILES[r].email.toLowerCase() === email.toLowerCase()
      );
      if (foundRole) {
        const demoUser = DEMO_PROFILES[foundRole];
        // FIX 2: Deny inactive users in demo mode
        if (demoUser.isActive !== true) {
          throw new Error('Akun Anda dinonaktifkan. Hubungi Administrator.');
        }
        setCurrentUser(demoUser);
        localStorage.setItem('sibersih_demo_role', foundRole);
        return demoUser;
      }
      throw new Error('Email demo tidak cocok. Gunakan salah satu email demo yang tertera.');
    }

    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const userDocRef = doc(db, 'users', userCredential.user.uid);
    const userSnap = await getDoc(userDocRef);
    if (userSnap.exists()) {
      const profile = userSnap.data() as UserProfile;
      // Tolak user jika isActive !== true
      if (profile.isActive !== true) {
        await firebaseSignOut(auth);
        setCurrentUser(null);
        setFirebaseUser(null);
        throw new Error('Akun Anda sedang dinonaktifkan oleh Administrator.');
      }
      setCurrentUser(profile);
      return profile;
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
    if (!isFirebaseConfigured || !auth || !db) {
      const newMockProfile: UserProfile = {
        uid: `mock-${Date.now()}`,
        email,
        displayName,
        role,
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

  const logout = async (): Promise<void> => {
    if (auth && isFirebaseConfigured) {
      await firebaseSignOut(auth);
    }
    localStorage.removeItem('sibersih_demo_role');
    setCurrentUser(null);
  };

  const switchDemoRole = (role: UserRole) => {
    // FIX 2: Do not allow switching demo role when Firebase Live is active
    if (isFirebaseConfigured && auth) {
      console.warn('[SIBERSIH] switchDemoRole diabaikan karena Firebase Live aktif.');
      return;
    }
    localStorage.setItem('sibersih_demo_role', role);
    setCurrentUser(DEMO_PROFILES[role]);
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
        logout,
        switchDemoRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export { useAuth } from './useAuth';
export { AuthContext, type AuthContextType } from './authContextInstance';


