import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor: attach token
api.interceptors.request.use((config) => {
  const authStorage = localStorage.getItem('nexspace-auth');
  if (authStorage) {
    try {
      const { state } = JSON.parse(authStorage);
      if (state?.accessToken) {
        config.headers.Authorization = `Bearer ${state.accessToken}`;
      }
    } catch {
      // Ignore parse errors
    }
  }
  return config;
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: Error) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Endpoints that must NOT trigger the refresh flow (they are the auth endpoints themselves
// or public endpoints). Hitting 401 on these means the session is gone — no point retrying.
const SKIP_REFRESH_URLS = [
  '/auth/refresh-token',
  '/auth/login',
  '/auth/register',
  '/auth/logout',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/verify-email',
  '/auth/resend-otp',
];

const clearAuthAndRedirect = () => {
  localStorage.removeItem('nexspace-auth');
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
};

// Response interceptor: handle 401 + token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const requestUrl = (original?.url || '').split('?')[0];

    // If the failing request is itself an auth/refresh endpoint, never retry —
    // just clear auth. This is what prevents the infinite 401 loop.
    const shouldSkipRefresh =
      !original ||
      original._retry ||
      SKIP_REFRESH_URLS.some((u) => requestUrl.includes(u));

    if (error.response?.status !== 401 || shouldSkipRefresh) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      // Queue this request until the in-flight refresh finishes
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        })
        .catch((err) => Promise.reject(err));
    }

    original._retry = true;
    isRefreshing = true;

    try {
      const { data } = await api.post('/auth/refresh-token');
      const newToken = data.data.accessToken;

      // Update stored token
      const authStorage = localStorage.getItem('nexspace-auth');
      if (authStorage) {
        const parsed = JSON.parse(authStorage);
        parsed.state = parsed.state || {};
        parsed.state.accessToken = newToken;
        localStorage.setItem('nexspace-auth', JSON.stringify(parsed));
      }

      processQueue(null, newToken);
      original.headers.Authorization = `Bearer ${newToken}`;
      return api(original);
    } catch (refreshError) {
      processQueue(refreshError as Error, null);
      clearAuthAndRedirect();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;
