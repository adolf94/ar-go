import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import dayjs from 'dayjs';

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

const getValidToken = async () => {
  const accessToken = window.sessionStorage.getItem('access_token');
  const idToken = window.localStorage.getItem('id_token');
  const refreshToken = window.localStorage.getItem('refresh_token');

  if (accessToken) {
    const decoded = decodeJwt(accessToken);
    if (decoded && decoded.exp) {
      const isExpired = dayjs().add(1, 'minute').isAfter(dayjs(decoded.exp * 1000));
      if (!isExpired) return accessToken;
    }
  }

  if (refreshToken) {
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      });
    }

    isRefreshing = true;
    try {
      // Import proxyRefresh dynamically to avoid circular dependency
      const { proxyRefresh } = await import('../repositories/authRepository');
      const data = await proxyRefresh(refreshToken);
      window.sessionStorage.setItem('access_token', data.access_token);
      window.localStorage.setItem('refresh_token', data.refresh_token);
      window.localStorage.setItem('id_token', data.id_token);
      
      processQueue(null, data.access_token);
      return data.access_token;
    } catch (err) {
      processQueue(err, null);
      // Clear tokens on failed refresh to force re-authentication
      window.sessionStorage.removeItem('access_token');
      window.localStorage.removeItem('refresh_token');
      window.localStorage.removeItem('id_token');
      window.localStorage.removeItem('argo_user');
      return null;
    } finally {
      isRefreshing = false;
    }
  }

  return accessToken || idToken; 
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
  (error) => {
    return Promise.reject(error);
  }
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
