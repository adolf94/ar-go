import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User as OidcUser } from 'oidc-client-ts';
import { getUserManager } from '../auth/userManager';

interface User {
  email: string;
  name: string;
  picture: string;
  roles?: string[];
  scopes: string[];
}

interface AuthContextType {
  user: User | null;
  login: (options?: { useRedirect?: boolean }) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
  accessToken: string | null;
  hasScope: (scope: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const mapOidcUser = (oidcUser: OidcUser): User => {
  const profile = oidcUser.profile;
  
  // Collect all potential permission claims
  // Roles are usually in 'roles' or 'role' in the ID Token (profile)
  // Scopes are in 'scope' or 'scp' in either ID Token or Access Token response
  const rawItems = [
    (profile as any)['roles'],
    (profile as any)['role'],
    (profile as any)['scp'],
    (profile as any)['scope'],
    oidcUser.scope // Granted scopes from the Access Token response
  ];

  const allPermissions: string[] = [];
  rawItems.forEach(item => {
    if (!item) return;
    if (Array.isArray(item)) {
      allPermissions.push(...item.map(String));
    } else if (typeof item === 'string') {
      // Split space-separated strings (common for 'scope' claims)
      allPermissions.push(...item.split(' ').filter(Boolean));
    }
  });

  // Extract scopes following backend logic: api://audience/scope -> scope
  const audience = window.webConfig.clientId === 'ar-go-web' ? 'ar-go-api' : '';
  const prefix = `api://${audience}/`;
  
  const scopes = allPermissions
    .filter(p => p.startsWith('api://'))
    .map(p => p.startsWith(prefix) ? p.substring(prefix.length) : p);

  // Clean and deduplicate
  const uniqueScopes = Array.from(new Set(scopes));
  const uniqueRoles = Array.from(new Set(allPermissions.filter(p => !p.includes('://') || p.startsWith('api://'))));

  return {
    email: profile.email ?? '',
    name: profile.name ?? '',
    picture: (profile as any)['picture'] ?? '',
    roles: uniqueRoles,
    scopes: uniqueScopes
  };
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const restore = async () => {
      try {
        // Check if we're coming back from a redirect login
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const state = params.get('state');

        // Only handle redirect if there's no opener (popups have openers)
        if (!window.opener && code && state) {
          try {
            console.log('Handling redirect callback...');
            await getUserManager().signinRedirectCallback();
            // Clear URL
            window.history.replaceState({}, document.title, window.location.pathname);
          } catch (err) {
            console.error('Redirect callback failed:', err);
          }
        }

        let oidcUser = await getUserManager().getUser();
        
        // If no user or expired, try silent signin (refreshes if refresh_token is available)
        if (!oidcUser || oidcUser.expired) {
          try {
            console.log('User missing or expired, attempting silent signin...');
            oidcUser = await getUserManager().signinSilent();
          } catch (err) {
            console.warn('Silent signin on load failed:', err);
          }
        }

        if (oidcUser && !oidcUser.expired) {
          setUser(mapOidcUser(oidcUser));
          setAccessToken(oidcUser.access_token);
          sessionStorage.setItem('access_token', oidcUser.access_token);
          if (oidcUser.refresh_token) {
            localStorage.setItem('refresh_token', oidcUser.refresh_token);
          }
        }
      } catch (e) {
        console.error('Failed to restore session:', e);
      } finally {
        setIsLoading(false);
      }
    };
    restore();

    // Keep React state in sync when oidc-client-ts silently refreshes the token
    const onUserLoaded = (oidcUser: OidcUser) => {
      setUser(mapOidcUser(oidcUser));
      setAccessToken(oidcUser.access_token);
      sessionStorage.setItem('access_token', oidcUser.access_token);
      if (oidcUser.refresh_token) {
        localStorage.setItem('refresh_token', oidcUser.refresh_token);
      }
    };

    const onSilentRenewError = (error: Error) => {
      console.error('Silent renew failed:', error);
      // Token couldn't be refreshed — clear state so user is prompted to log in
      setUser(null);
      setAccessToken(null);
      sessionStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    };

    getUserManager().events.addUserLoaded(onUserLoaded);
    getUserManager().events.addSilentRenewError(onSilentRenewError);

    return () => {
      getUserManager().events.removeUserLoaded(onUserLoaded);
      getUserManager().events.removeSilentRenewError(onSilentRenewError);
    };
  }, []);

  const login = async (options?: { useRedirect?: boolean }) => {
    try {
      // Social In-app Browsers (FB Messenger, Instagram) often block popups
      const ua = navigator.userAgent || navigator.vendor || (window as any).opera;
      const isSocialInApp = /FBAN|FBAV|Instagram|Messenger|WhatsApp/i.test(ua);
      const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
      
      // Force redirect if matches social in-app or if explicitly requested
      if (options?.useRedirect || isSocialInApp || isIOS) {
        console.log('Using signinRedirect for this environment');
        await getUserManager().signinRedirect();
        return;
      }

      console.log('Using signinPopup');
      const oidcUser = await getUserManager().signinPopup();
      const mapped = mapOidcUser(oidcUser);
      setUser(mapped);
      setAccessToken(oidcUser.access_token);
      sessionStorage.setItem('access_token', oidcUser.access_token);
      if (oidcUser.refresh_token) {
        localStorage.setItem('refresh_token', oidcUser.refresh_token);
      }
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const logout = () => {
    getUserManager().removeUser();
    setUser(null);
    setAccessToken(null);
    sessionStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('id_token');
    localStorage.removeItem('argo_user');
  };

  const hasScope = (scope: string) => {
    return user?.scopes.some(s => s.toLowerCase() === scope.toLowerCase()) ?? false;
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, isLoading, accessToken, hasScope }}>
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
