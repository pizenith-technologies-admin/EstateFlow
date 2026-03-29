import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { secureStorage } from '../lib/secureStore';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'agent' | 'client' | 'brokerage' | 'admin';
  phone?: string;
  profileImageUrl?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'agent' | 'client';
  phone?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await secureStorage.getToken();
      if (token) {
        const { api } = await import('../lib/api');
        const response = await api.get('/api/auth/user');
        setUser(response.data);
      }
    } catch (error) {
      console.log('Auth check failed:', error);
      await secureStorage.clearToken();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const { api } = await import('../lib/api');
    const response = await api.post('/api/login', { email, password });
    const { accessToken, user: userData } = response.data;
    
    if (!accessToken || !userData) {
      throw new Error('Invalid login response: missing accessToken or user data');
    }
    
    await secureStorage.setToken(accessToken);
    setUser(userData);
  };

  const register = async (data: RegisterData) => {
    const { api } = await import('../lib/api');
    const response = await api.post('/api/register', { ...data });
    const { accessToken, user: userData } = response.data;
    
    if (!accessToken || !userData) {
      throw new Error('Invalid register response: missing accessToken or user data');
    }
    
    await secureStorage.setToken(accessToken);
    setUser(userData);
  };

  const logout = async () => {
    await secureStorage.clearToken();
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const { api } = await import('../lib/api');
      const response = await api.get('/api/auth/user');
      setUser(response.data);
    } catch (error) {
      console.log('User refresh failed:', error);
      await logout();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
