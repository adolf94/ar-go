import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { getUserManager } from '@adolf94/ar-auth-client';

const getValidToken = async (): Promise<string | null> => {
  try {
    const user = await getUserManager().getUser();
    if (user && !user.expired) {
      return user.access_token;
    }

    // Try silent refresh if expired or missing
    const refreshedUser = await getUserManager().signinSilent();
    return refreshedUser?.access_token || null;
  } catch (err) {
    console.error('Failed to get valid token:', err);
    return null;
  }
};

const apiClient: AxiosInstance = axios.create({
  baseURL: window.webConfig.api
});

apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    if (config.url?.includes('/auth/')) return config;

    const token = await getValidToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const newToken = await getValidToken();
      if (newToken) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
