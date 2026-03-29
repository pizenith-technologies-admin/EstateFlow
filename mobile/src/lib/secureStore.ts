import AsyncStorage from '@react-native-async-storage/async-storage';

// Use AsyncStorage for token storage - more reliable across all platforms
// In production, you can replace this with expo-secure-store for hardware-backed storage
const TOKEN_KEY = 'auth_token';

export const secureStorage = {
  async getToken(): Promise<string | null> {
    try {
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      return token || null;
    } catch (error) {
      console.error('Failed to retrieve token:', error);
      return null;
    }
  },

  async setToken(token: string): Promise<void> {
    try {
      if (!token || typeof token !== 'string') {
        throw new Error('Token must be a non-empty string');
      }
      await AsyncStorage.setItem(TOKEN_KEY, token);
    } catch (error) {
      console.error('Failed to store token:', error);
      throw error;
    }
  },

  async clearToken(): Promise<void> {
    try {
      await AsyncStorage.removeItem(TOKEN_KEY);
    } catch (error) {
      console.error('Failed to clear token:', error);
    }
  },
};
