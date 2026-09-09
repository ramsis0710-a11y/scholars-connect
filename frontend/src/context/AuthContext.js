import React, { createContext, useState, useContext, useEffect } from 'react';
import { login as apiLogin, register as apiRegister, logout as apiLogout } from '../api/auth';
import { getMe } from '../api/users';
import { storeToken, storeRefreshToken, storeUser, getUser, clearAuth } from '../utils/storage';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const storedUser = await getUser();
      if (storedUser) {
        setUser(storedUser);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.log('Failed to load user', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email, password) => {
    const data = await apiLogin(email, password);
    await storeToken(data.token);
    await storeRefreshToken(data.refreshToken);
    await storeUser(data.user);
    setUser(data.user);
    setIsAuthenticated(true);
    return data.user;
  };

  const register = async (userData) => {
    const data = await apiRegister(userData);
    await storeToken(data.token);
    await storeRefreshToken(data.refreshToken);
    await storeUser(data.user);
    setUser(data.user);
    setIsAuthenticated(true);
    return data.user;
  };

  const logout = async () => {
    try {
      await apiLogout();
    } catch (error) {
      console.log('Logout API error', error);
    }
    await clearAuth();
    setUser(null);
    setIsAuthenticated(false);
  };

  const refreshUser = async () => {
    try {
      const freshUser = await getMe();
      await storeUser(freshUser);
      setUser(freshUser);
      return freshUser;
    } catch (error) {
      console.log('Failed to refresh user', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        isAuthenticated,
        isLoading,
        login,
        register,
        logout,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
