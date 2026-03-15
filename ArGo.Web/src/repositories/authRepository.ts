import axios from 'axios';

export const proxyLogin = async (googleData: any) => {
  const response = await axios.post(`${window.webConfig.authUri}/auth/google_credential`, googleData);
  return response.data;
};

export const proxyRefresh = async (refreshToken: string) => {
  const response = await axios.post(`${window.webConfig.authUri}/auth/refresh`, { refresh_token: refreshToken, app: 'argo' });
  return response.data;
};
