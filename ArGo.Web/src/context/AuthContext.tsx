import { ReactNode } from 'react';
import { AuthProvider as BaseAuthProvider, useAuth as useBaseAuth, AuthConfig } from '@adolf94/ar-auth-client';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const config: AuthConfig = {
    authority: window.webConfig.authUri,
    clientId: window.webConfig.clientId,
    redirectUri: window.webConfig.redirectUri || window.location.origin + '/auth/callback',
    popupRedirectUri: window.webConfig.redirectUri || window.location.origin + '/',
    scope: window.webConfig.scope,
    automaticSilentRenew: true,
  };

  return (
    <BaseAuthProvider config={config}>
      {children}
    </BaseAuthProvider>
  );
};

export const useAuth = () => {
  const auth = useBaseAuth();
  
  // Return the standard interface expected by the app
  return {
    ...auth,
    // Add any ar-go specific helpers if needed beyond what's in the base hook
    // The base hook already provides: user, login, logout, isAuthenticated, isLoading, hasScope, getAccessToken
    accessToken: (auth as any).accessToken, // The library uses state for this too
  };
};
