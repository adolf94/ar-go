import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User as OidcUser } from 'oidc-client-ts';
import { getUserManager, refreshAccessToken, getSigninUrl } from './userManager';
import { App as CapacitorApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';

interface User {
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  login: () => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
  accessToken: string | null;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const mapOidcUser = (oidcUser: OidcUser): User => {
  return {
    email: oidcUser.profile.email ?? '',
    name: oidcUser.profile.name ?? ''
  };
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthUrl = async (url: string) => {
      if (url.includes('/auth/callback')) {
        try {
          console.log('[Auth] Handling auth URL:', url);
          await getUserManager().signinRedirectCallback(url);
          const ouser = await getUserManager().getUser();
          if (ouser) {
            console.log('[Auth] User loaded via callback:', ouser.profile.name);
            setUser(mapOidcUser(ouser));
            setAccessToken(ouser.access_token);
          }
          await Browser.close();
        } catch (err) {
          console.error('[Auth] Callback error:', err);
          setError((err as Error).message);
        }
      }
    };

    const restore = async () => {
      try {
        let oidcUser = await getUserManager().getUser();

        if (!oidcUser || oidcUser.expired) {
          oidcUser = await refreshAccessToken();
        }

        if (oidcUser && !oidcUser.expired) {
          console.log('[Auth] Existing user restored:', oidcUser.profile.name);
          setUser(mapOidcUser(oidcUser));
          setAccessToken(oidcUser.access_token);
        }

        // Handle case where app was launched via URL
        const launchUrl = await CapacitorApp.getLaunchUrl();
        if (launchUrl) {
          console.log('[Auth] App was launched with URL:', launchUrl.url);
          await handleAuthUrl(launchUrl.url);
        }
      } catch (e) {
        console.error('Failed to restore session:', e);
      } finally {
        setIsLoading(false);
      }
    };
    restore();

    const setupListener = async () => {
      return await CapacitorApp.addListener('appUrlOpen', async (data: any) => {
        console.log('[AuthContext] appUrlOpen received:', data.url);
        await handleAuthUrl(data.url);
      });
    };
    const listenerPromise = setupListener();

    const onUserLoaded = (oidcUser: OidcUser) => {
      setUser(mapOidcUser(oidcUser));
      setAccessToken(oidcUser.access_token);
    };

    const onUserUnloaded = () => {
      setUser(null);
      setAccessToken(null);
    };

    getUserManager().events.addUserLoaded(onUserLoaded);
    getUserManager().events.addUserUnloaded(onUserUnloaded);

    return () => {
      getUserManager().events.removeUserLoaded(onUserLoaded);
      getUserManager().events.removeUserUnloaded(onUserUnloaded);
      listenerPromise.then(l => l.remove());
    };
  }, []);

  const login = async () => {
    try {
      setError(null);
      const url = await getSigninUrl();
      await Browser.open({ url });
    } catch (err) {
      console.error(err);
      setError((err as Error).message);
    }
  };

  const clearError = () => setError(null);

  const logout = async () => {
    await getUserManager().signoutRedirect();
    setUser(null);
    setAccessToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, isLoading, accessToken, error, clearError }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be within AuthProvider');
  return context;
};
