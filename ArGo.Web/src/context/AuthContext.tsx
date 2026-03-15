import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { proxyLogin } from '../repositories/authRepository';

interface User {
  email: string;
  name: string;
  picture: string;
  roles?: string[];
}

interface AuthContextType {
  user: User | null;
  login: (googleResponse: any) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('argo_user');
    const hasToken = localStorage.getItem('id_token') || sessionStorage.getItem('access_token');
    
    if (savedUser && hasToken) {
      setUser(JSON.parse(savedUser));
    }
    setIsLoading(false);
  }, []);

  const decodeIdToken = (token: string) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map((c) => {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      const decoded = JSON.parse(jsonPayload);
      
      // Normalize roles to an array
      if (decoded.roles) {
        decoded.roles = Array.isArray(decoded.roles) ? decoded.roles : [decoded.roles];
      } else {
        decoded.roles = [];
      }
      
      return decoded;
    } catch (e) {
      console.error('Failed to decode ID Token', e);
      return null;
    }
  };

  const login = async (googleResponse: any) => {
    try {
      setIsLoading(true);
      const data = await proxyLogin(googleResponse);
      
      // Store tokens according to requested pattern
      window.localStorage.setItem("refresh_token", data.refresh_token);
      window.localStorage.setItem("id_token", data.id_token);
      window.sessionStorage.setItem("access_token", data.access_token);

      // Decode ID token to get user info
      const decoded = decodeIdToken(data.id_token);
      
      if (decoded) {
        const userData: User = {
          email: decoded.email,
          name: decoded.name,
          picture: decoded.picture,
          roles: decoded.roles
        };

        setUser(userData);
        localStorage.setItem('argo_user', JSON.stringify(userData));
      }
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('argo_user');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('id_token');
    sessionStorage.removeItem('access_token');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, isLoading }}>
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
