import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import dayjs from 'dayjs';
import { getUserManager } from '../auth/userManager';

// --- Token Management ---
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

const decodeJwt = (token: string) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map((c) => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
};

const getValidToken = async (): Promise<string | null> => {
  const accessToken = window.sessionStorage.getItem('access_token');

  // Return current token if it's still valid (>1 min remaining)
  if (accessToken) {
    const decoded = decodeJwt(accessToken);
    if (decoded?.exp) {
      const isExpired = dayjs().add(1, 'minute').isAfter(dayjs(decoded.exp * 1000));
      if (!isExpired) return accessToken;
    }
  }

  // Token is expired or missing — attempt silent refresh via oidc-client-ts
  if (isRefreshing) {
    return new Promise((resolve, reject) => {
      failedQueue.push({ resolve, reject });
    });
  }

  isRefreshing = true;
  try {
    const oidcUser = await getUserManager().signinSilent();
    if (oidcUser) {
      window.sessionStorage.setItem('access_token', oidcUser.access_token);
      if (oidcUser.refresh_token) {
        window.localStorage.setItem('refresh_token', oidcUser.refresh_token);
      }
      processQueue(null, oidcUser.access_token);
      return oidcUser.access_token;
    }
    processQueue(null, null);
    return null;
  } catch (err) {
    processQueue(err, null);
    // Clear tokens on failed refresh — user will need to log in again
    window.sessionStorage.removeItem('access_token');
    window.localStorage.removeItem('refresh_token');
    window.localStorage.removeItem('id_token');
    window.localStorage.removeItem('argo_user');
    return null;
  } finally {
    isRefreshing = false;
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
