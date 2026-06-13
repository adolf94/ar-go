import type { ReactNode } from 'react';
import { AuthProvider as BaseAuthProvider, useAuth as useBaseAuth, type AuthConfig } from '@adolf94/ar-auth-client';

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
  
  const customHasScope = (scope: string) => {
    if (!auth.user) return false;
    const target = scope.toLowerCase();

    // Check if the user has the scope, stripping audience/client prefixes for comparison
    const match = (s: string) => {
      const sLower = s.toLowerCase();
      // Remove any audience prefix like api://ar-go-api/ or api://ar-go-web/
      const cleanScope = sLower.replace(/^api:\/\/[^/]+\//, '');
      return cleanScope === target;
    };

    const inScopes = auth.user.scopes?.some(match) ?? false;
    const inRoles = auth.user.roles?.some(match) ?? false;

    return inScopes || inRoles;
  };

  return {
    ...auth,
    hasScope: customHasScope,
    accessToken: (auth as any).accessToken,
  };
};
