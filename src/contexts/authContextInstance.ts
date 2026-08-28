import { createContext } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import type { UserProfile, UserRole } from '../types';

export interface AuthContextType {
  currentUser: UserProfile | null;
  firebaseUser: FirebaseUser | null;
  isLoading: boolean;
  isFirebaseActive: boolean;
  login: (email: string, password: string) => Promise<UserProfile>;

  register: (email: string, password: string, displayName: string, role: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  switchDemoRole: (role: UserRole) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
