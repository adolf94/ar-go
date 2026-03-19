import { UserManager, WebStorageStateStore } from 'oidc-client-ts';

const createUserManager = () =>
  new UserManager({
    authority: window.webConfig.authUri,
    client_id: window.webConfig.clientId,
    redirect_uri: window.webConfig.redirectUri || window.location.origin + '/auth/callback',
    popup_redirect_uri: window.webConfig.redirectUri || window.location.origin + '/',
    response_type: 'code',
    scope: window.webConfig.scope,
    userStore: new WebStorageStateStore({ store: window.localStorage }),
    monitorSession: false,
    automaticSilentRenew: true,
  });

// Singleton — created lazily so window.webConfig is ready
let _userManager: UserManager | null = null;

export const getUserManager = (): UserManager => {
  if (!_userManager) {
    _userManager = createUserManager();
  }
  return _userManager;
};
