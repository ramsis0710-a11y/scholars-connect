import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../utils/constants';

export const storeToken = async (token) => {
  await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, token);
};

export const getToken = async () => {
  return await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
};

export const removeToken = async () => {
  await AsyncStorage.removeItem(STORAGE_KEYS.TOKEN);
};

export const storeRefreshToken = async (token) => {
  await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, token);
};

export const getRefreshToken = async () => {
  return await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
};

export const storeUser = async (user) => {
  await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
};

export const getUser = async () => {
  const user = await AsyncStorage.getItem(STORAGE_KEYS.USER);
  return user ? JSON.parse(user) : null;
};

export const clearAuth = async () => {
  await AsyncStorage.multiRemove([
    STORAGE_KEYS.TOKEN,
    STORAGE_KEYS.REFRESH_TOKEN,
    STORAGE_KEYS.USER
  ]);
};
