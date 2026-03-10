import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { authApi, getToken, removeToken } from '@/lib/api';
import { ApiError } from '@/lib/api';

interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  avatar?: string;
  notifications?: {
    email: boolean;
    push: boolean;
    reminders: boolean;
  };
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  session: { token: string } | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null; needsVerification?: boolean }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null; needsVerification?: boolean }>;
  verifyEmail: (email: string, otp: string) => Promise<{ error: Error | null }>;
  resendOtp: (email: string) => Promise<{ error: Error | null }>;
  googleSignIn: (credential: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<{ token: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing token and validate it
    const token = getToken();
    if (token) {
      authApi.getCurrentUser()
        .then((response) => {
          setUser(response.user);
          setSession({ token });
          setLoading(false);
        })
        .catch(() => {
          // Token is invalid, remove it
          removeToken();
          setUser(null);
          setSession(null);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      // Signup now just sends OTP — no token returned yet
      await authApi.signup(email, password, fullName);
      return { error: null, needsVerification: true };
    } catch (error) {
      const apiError = error instanceof ApiError
        ? new Error(error.message)
        : new Error('Signup failed. Please try again.');
      return { error: apiError };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const response = await authApi.login(email, password);
      setUser(response.user);
      setSession({ token: response.token });
      return { error: null };
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        return { error: new Error(error.message), needsVerification: true };
      }
      const apiError = error instanceof ApiError
        ? new Error(error.message)
        : new Error('Login failed. Please try again.');
      return { error: apiError };
    }
  };

  const verifyEmail = async (email: string, otp: string) => {
    try {
      const response = await authApi.verifyEmail(email, otp);
      setUser(response.user);
      setSession({ token: response.token });
      return { error: null };
    } catch (error) {
      const apiError = error instanceof ApiError
        ? new Error(error.message)
        : new Error('Verification failed. Please try again.');
      return { error: apiError };
    }
  };

  const resendOtp = async (email: string) => {
    try {
      await authApi.resendOtp(email);
      return { error: null };
    } catch (error) {
      const apiError = error instanceof ApiError
        ? new Error(error.message)
        : new Error('Failed to resend OTP.');
      return { error: apiError };
    }
  };

  const googleSignIn = async (credential: string) => {
    try {
      const response = await authApi.googleAuth(credential);
      setUser(response.user);
      setSession({ token: response.token });
      return { error: null };
    } catch (error) {
      const apiError = error instanceof ApiError
        ? new Error(error.message)
        : new Error('Google sign-in failed. Please try again.');
      return { error: apiError };
    }
  };

  const signOut = async () => {
    removeToken();
    setUser(null);
    setSession(null);
  };

  const logout = () => {
    removeToken();
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, verifyEmail, resendOtp, googleSignIn, signOut, logout }}>
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
