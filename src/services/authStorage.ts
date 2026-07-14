import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AuthUser } from '../store/authSlice';

const AUTH_STORAGE_KEY = 'vexean.auth';

export type StoredAuth = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
};

export async function readStoredAuth(): Promise<StoredAuth | null> {
  const value = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
  if (!value) return null;
  try {
    return JSON.parse(value) as StoredAuth;
  } catch {
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

export async function writeStoredAuth(value: StoredAuth) {
  await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(value));
}

export async function clearStoredAuth() {
  await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
}
