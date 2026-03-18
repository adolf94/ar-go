import axios from 'axios';

// Token refreshing via oidc-client-ts is handled by the UserManager.
// This file is kept for any future custom auth API calls.

export const proxyRefresh = async (refreshToken: string) => {
  const response = await axios.post(`${window.webConfig.authUri}/auth/refresh`, {
    refresh_token: refreshToken,
    app: 'argo',
  });
  return response.data;
};
