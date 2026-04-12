import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// ── Base URL ──
// Using the machine's network IP so the app works on physical devices,
// simulators, and Expo Go. Change this to your deployed URL in production.
const BASE_URL = 'http://10.121.24.103:5000';

const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Token storage helpers ──
// SecureStore for native mobile, localStorage for web.
// All wrapped in try-catch to handle Expo Go edge cases.
const TOKEN_KEY = 'aui_access_token';
const REFRESH_KEY = 'aui_refresh_token';

export const storeTokens = async (accessToken, refreshToken) => {
  try {
    if (Platform.OS === 'web') {
      localStorage.setItem(TOKEN_KEY, accessToken);
      localStorage.setItem(REFRESH_KEY, refreshToken);
    } else {
      await SecureStore.setItemAsync(TOKEN_KEY, accessToken);
      await SecureStore.setItemAsync(REFRESH_KEY, refreshToken);
    }
  } catch (e) {
    console.warn('Token storage failed:', e.message);
  }
};

export const getAccessToken = async () => {
  try {
    if (Platform.OS === 'web') return localStorage.getItem(TOKEN_KEY);
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const getRefreshToken = async () => {
  try {
    if (Platform.OS === 'web') return localStorage.getItem(REFRESH_KEY);
    return await SecureStore.getItemAsync(REFRESH_KEY);
  } catch {
    return null;
  }
};

export const clearTokens = async () => {
  try {
    if (Platform.OS === 'web') {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_KEY);
    } else {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_KEY);
    }
  } catch (e) {
    console.warn('Token clear failed:', e.message);
  }
};

// ── Request interceptor: attach access token to every request ──
api.interceptors.request.use(
  async (config) => {
    const token = await getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor: auto-refresh on 401 ──
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and we haven't already retried this request
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Don't try to refresh if the failed request was itself a refresh or login
      if (
        originalRequest.url?.includes('/users/refresh-token') ||
        originalRequest.url?.includes('/users/login')
      ) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Queue this request until the refresh completes
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await getRefreshToken();
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post(`${BASE_URL}/api/users/refresh-token`, {
          refreshToken,
        });

        const newAccessToken = data.data.accessToken;
        await storeTokens(newAccessToken, refreshToken);

        processQueue(null, newAccessToken);
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        await clearTokens();
        // The AuthContext will detect the cleared tokens and redirect to login
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
