import { UserManager, WebStorageStateStore, User as OidcUser, OidcClient } from 'oidc-client-ts';
import { config } from '../config';

const userManagerSettings = {
    authority: config.authUri,
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: config.scope,
    userStore: new WebStorageStateStore({ store: window.localStorage }),
    monitorSession: false,
    staleStateAgeInSeconds: 10 * 60,
    automaticSilentRenew: true,
};

const createUserManager = () => new UserManager(userManagerSettings);

let _userManager: UserManager | null = null;
export const getUserManager = (): UserManager => {
  if (!_userManager) {
    _userManager = createUserManager();
  }
  return _userManager;
};

export const refreshAccessToken = async (): Promise<OidcUser | null> => {
  const userManager = getUserManager();
  const user = await userManager.getUser();

  if (!user || !user.refresh_token) {
    return null;
  }

  try {
    const metadata = await userManager.metadataService.getMetadata();
    const tokenEndpoint = metadata.token_endpoint;

    if (!tokenEndpoint) throw new Error('Token endpoint not found in metadata');

    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: user.refresh_token,
      client_id: userManager.settings.client_id,
    });

    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    });

    if (!response.ok) throw new Error(`Refresh failed: ${response.status}`);

    const tokenResponse = await response.json();

    const newUser = new OidcUser({
      id_token: tokenResponse.id_token || user.id_token,
      access_token: tokenResponse.access_token,
      refresh_token: tokenResponse.refresh_token || user.refresh_token,
      token_type: tokenResponse.token_type || user.token_type,
      scope: tokenResponse.scope || user.scope,
      profile: user.profile,
      expires_at: Math.floor(Date.now() / 1000) + (tokenResponse.expires_in || 3600),
      session_state: tokenResponse.session_state || user.session_state,
    });

    await userManager.storeUser(newUser);
    return newUser;
  } catch (error) {
    console.error('Manual refresh failed:', error);
    return null;
  }
};

export const getSigninUrl = async (): Promise<string> => {
  const client = new OidcClient(userManagerSettings);
  const request = await client.createSigninRequest({});
  return request.url;
};
