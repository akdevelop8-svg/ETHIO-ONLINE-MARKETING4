/**
 * EOM Authentication Context
 * Phase 1: Real Authentication & Access Control
 * Provides centralized auth state, protected action gatekeeping,
 * modal triggers, and access control across the whole application.
 */
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User, AuthRole, SignUpData, SignInData, AuthSession, AuthModalView } from '../types';
import { apiClient, getAuthHeaders } from '../api/client';
import { jwtDecode } from 'jwt-decode';

export interface AuthContextType {
  user: User | null;
  role: AuthRole;
  isAuthenticated: boolean;
  isEmailVerified: boolean;
  isLoading: boolean;
  session: AuthSession | null;
  authModal: {
    isOpen: boolean;
    view: AuthModalView;
    reason?: string;
    emailForVerification?: string;
    resetToken?: string;
  };
  openAuthModal: (view?: AuthModalView, reason?: string, email?: string, resetToken?: string) => void;
  closeAuthModal: () => void;
  setAuthModalView: (view: AuthModalView) => void;
  login: (data: SignInData) => Promise<void>;
  register: (data: SignUpData) => Promise<{ verificationCode: string }>;
  logout: () => Promise<void>;
  verifyEmail: (code: string) => Promise<void>;
  resendVerificationEmail: () => Promise<{ code: string }>;
  requestPasswordReset: (email: string) => Promise<{ resetToken: string }>;
  confirmPasswordReset: (token: string, newPass: string, confirmPass: string) => Promise<void>;
  updateProfile: (data: { fullName?: string; phone?: string; username?: string }) => Promise<void>;
  requireAuth: (reason: string, callback?: () => void) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [authModal, setAuthModal] = useState<{
    isOpen: boolean;
    view: AuthModalView;
    reason?: string;
    emailForVerification?: string;
    resetToken?: string;
  }>({
    isOpen: false,
    view: 'signin',
    reason: undefined,
    emailForVerification: undefined,
    resetToken: undefined
  });

  // Restore stored session on mount
  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      try {
        const token = localStorage.getItem('eom_token');
        if (token && isMounted) {
            const decoded: any = jwtDecode(token);
            if (decoded.exp * 1000 > Date.now()) {
                const res = await fetch('/api/auth/me', { headers: getAuthHeaders() });
                if (res.ok) {
                   const { user } = await res.json();
                   setUser(user);
                   setSession({ token, user, expiresAt: new Date(decoded.exp * 1000).toISOString() });
                }
            } else {
                localStorage.removeItem('eom_token');
            }
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const role: AuthRole = user ? user.authRole : 'guest';
  const isAuthenticated = Boolean(user && session);
  const isEmailVerified = Boolean(user?.isVerified && user?.emailVerified);

  const openAuthModal = useCallback(
    (view: AuthModalView = 'signin', reason?: string, email?: string, resetToken?: string) => {
      setAuthModal({
        isOpen: true,
        view,
        reason,
        emailForVerification: email || user?.email,
        resetToken
      });
    },
    [user]
  );

  const closeAuthModal = useCallback(() => {
    setAuthModal((prev) => ({
      ...prev,
      isOpen: false,
      reason: undefined,
      resetToken: undefined
    }));
  }, []);

  const setAuthModalView = useCallback((view: AuthModalView) => {
    setAuthModal((prev) => ({
      ...prev,
      view
    }));
  }, []);

  const login = async (data: SignInData) => {
    setIsLoading(true);
    try {
      const result: any = await apiClient.post('/auth/login', data);
      localStorage.setItem('eom_token', result.token);
      setUser(result.user);
      const decoded: any = jwtDecode(result.token);
      setSession({ token: result.token, user: result.user, expiresAt: new Date(decoded.exp * 1000).toISOString() });
      closeAuthModal();
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: SignUpData) => {
    setIsLoading(true);
    try {
      await apiClient.post('/auth/register', data);
      
      // Immediately log in after successful registration since email verification is disabled
      await login({
        identifier: data.email,
        password: data.password
      });
      
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem('eom_token');
      setUser(null);
      setSession(null);
      setIsLoading(false);
    }
  };

  const verifyEmail = async (code: string) => {
    if (!user) throw new Error('You must be signed in to verify your email.');
    const updatedUser: any = await apiClient.post('/auth/verify-email', { code });
    setUser({ ...updatedUser });
    closeAuthModal();
  };

  const resendVerificationEmail = async () => {
    if (!user) throw new Error('You must be signed in to resend verification.');
    const res: any = await apiClient.post('/auth/resend-verification');
    return { code: res.code };
  };

  const requestPasswordReset = async (email: string) => {
    const res: any = await apiClient.post('/auth/request-password-reset', { email });
    return { resetToken: res.resetToken };
  };

  const confirmPasswordReset = async (token: string, newPass: string, confirmPass: string) => {
    await apiClient.post('/auth/confirm-password-reset', { token, newPassword: newPass, confirmPassword: confirmPass });
    setAuthModalView('signin');
  };

  const updateProfile = async (data: { fullName?: string; phone?: string; username?: string }) => {
    if (!user) throw new Error('User not authenticated.');
    const updated: any = await apiClient.put('/auth/profile', data);
    setUser({ ...updated });
  };

  const requireAuth = useCallback(
    (reason: string, callback?: () => void): boolean => {
      if (isAuthenticated) {
        callback?.();
        return true;
      }
      openAuthModal('signin', reason);
      return false;
    },
    [isAuthenticated, openAuthModal]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isAuthenticated,
        isEmailVerified,
        isLoading,
        session,
        authModal,
        openAuthModal,
        closeAuthModal,
        setAuthModalView,
        login,
        register,
        logout,
        verifyEmail,
        resendVerificationEmail,
        requestPasswordReset,
        confirmPasswordReset,
        updateProfile,
        requireAuth
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

