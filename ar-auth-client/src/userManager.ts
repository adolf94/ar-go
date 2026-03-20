import { UserManager, WebStorageStateStore, type UserManagerSettings } from 'oidc-client-ts';

export interface AuthConfig {
  authority: string;
  clientId: string;
  redirectUri: string;
  scope: string;
  popupRedirectUri?: string;
  automaticSilentRenew?: boolean;
}

let _userManager: UserManager | null = null;

export const initUserManager = (config: AuthConfig): UserManager => {
  if (_userManager) return _userManager;

  const settings: UserManagerSettings = {
    authority: config.authority,
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    popup_redirect_uri: config.popupRedirectUri || config.redirectUri,
    response_type: 'code',
    scope: config.scope,
    userStore: new WebStorageStateStore({ store: window.localStorage }),
    monitorSession: false,
    automaticSilentRenew: config.automaticSilentRenew ?? true,
  };

  _userManager = new UserManager(settings);
  return _userManager;
};

export const getUserManager = (): UserManager => {
  if (!_userManager) {
    throw new Error('UserManager not initialized. Call initUserManager() first.');
  }
  return _userManager;
};
