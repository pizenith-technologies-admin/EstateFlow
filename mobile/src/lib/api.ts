import axios, { AxiosError } from 'axios';
import { Platform } from 'react-native';
import { secureStorage } from './secureStore';

/**
 * Dev API host: must match how you run the app.
 * - Expo Web / iOS Simulator: 127.0.0.1
 * - Android Emulator: 10.0.2.2 (special alias to the host machine)
 * - Physical phone: set EXPO_PUBLIC_API_URL to your PC's LAN IP (10.0.2.2 will not work).
 */
function defaultDevApiBaseUrl(): string {
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5000';
  }
  return 'http://127.0.0.1:5000';
}

const envUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
const API_BASE_URL =
  envUrl ||
  (__DEV__ ? defaultDevApiBaseUrl() : 'https://your-app.vercel.app');

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

api.interceptors.request.use(
  async (config) => {
    try {
      const token = await secureStorage.getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.warn('Failed to get auth token:', error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      await secureStorage.clearToken();
    }
    
    if (error.code === 'ECONNABORTED') {
      console.error('Request timeout');
    } else if (!error.response) {
      console.error('Network error - check API URL configuration');
    }
    
    return Promise.reject(error);
  }
);

export const apiRequest = async <T = any>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  url: string,
  data?: any
): Promise<T> => {
  const response = await api({
    method,
    url,
    data,
  });
  return response.data;
};

export const getApiBaseUrl = () => API_BASE_URL;
