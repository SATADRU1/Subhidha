import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signOut as firebaseSignOut,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../config/firebase';
import { Language } from '../constants/translations';

export type UserType = 'citizen' | 'admin';

interface User {
  id: string;
  name?: string;
  mobile?: string;
  email?: string;
  type: UserType;
}

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  token: string | null;
  language: Language;
  isLoading: boolean;
  isAuthenticated: boolean;
  isFirebaseReady: boolean;
  /** Call after Firebase phone sign-in from citizen screen, or use loginWithEmail for admin. */
  setUserTypeAfterLogin: (type: UserType) => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setLanguage: (lang: Language) => Promise<void>;
  getToken: () => Promise<string | null>;
}

const USER_TYPE_KEY = 'subhidha_user_type';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userType, setUserTypeState] = useState<UserType | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [language, setLanguageState] = useState<Language>('en');
  const [isLoading, setIsLoading] = useState(true);

  const isFirebaseReady = isFirebaseConfigured && !!auth;

  useEffect(() => {
    if (!isFirebaseReady) {
      setIsLoading(false);
      return;
    }
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        try {
          const t = await fbUser.getIdToken();
          setToken(t);
        } catch {
          setToken(null);
        }
        const stored = await AsyncStorage.getItem(USER_TYPE_KEY);
        setUserTypeState((stored as UserType) || null);
      } else {
        setToken(null);
        setUserTypeState(null);
      }
      setIsLoading(false);
    });
    return () => unsub();
  }, [isFirebaseReady]);

  useEffect(() => {
    if (!firebaseUser) return;
    loadStoredLanguage();
  }, [firebaseUser]);

  const loadStoredLanguage = async () => {
    try {
      const storedLang = await AsyncStorage.getItem('language');
      if (storedLang) setLanguageState(storedLang as Language);
    } catch {
      // ignore
    }
  };

  const setUserTypeAfterLogin = async (type: UserType) => {
    await AsyncStorage.setItem(USER_TYPE_KEY, type);
    setUserTypeState(type);
  };

  const buildUserFromFirebase = (): User | null => {
    if (!firebaseUser || !userType) return null;
    const phone = firebaseUser.phoneNumber || undefined;
    const email = firebaseUser.email || undefined;
    const name = firebaseUser.displayName || firebaseUser.email || undefined;
    return {
      id: firebaseUser.uid,
      name: name || undefined,
      mobile: phone || undefined,
      email: email || undefined,
      type: userType,
    };
  };

  const loginWithEmail = async (email: string, password: string) => {
    if (!auth) throw new Error('Firebase Auth not configured');
    await signInWithEmailAndPassword(auth, email, password);
    const user = auth.currentUser;
    if (user) {
      const t = await user.getIdToken();
      setToken(t);
      await setUserTypeAfterLogin('admin');
    }
  };

  const logout = async () => {
    try {
      if (auth) await firebaseSignOut(auth);
      await AsyncStorage.removeItem(USER_TYPE_KEY);
      setToken(null);
      setUserTypeState(null);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const setLanguage = async (lang: Language) => {
    try {
      await AsyncStorage.setItem('language', lang);
      setLanguageState(lang);
    } catch (error) {
      console.error('Error setting language:', error);
    }
  };

  const getToken = async (): Promise<string | null> => {
    if (!firebaseUser) return null;
    try {
      const t = await firebaseUser.getIdToken(true);
      setToken(t);
      return t;
    } catch {
      return null;
    }
  };

  const user = buildUserFromFirebase();
  const isAuthenticated = !!firebaseUser && !!userType && !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        token,
        language,
        isLoading,
        isAuthenticated,
        isFirebaseReady,
        setUserTypeAfterLogin,
        loginWithEmail,
        logout,
        setLanguage,
        getToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
