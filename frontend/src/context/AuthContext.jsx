import React, { createContext, useState, useEffect, useContext } from 'react';
import { authAPI, setAuthToken, clearAuthToken } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('gsi_auth_token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('gsi_auth_token');
      if (storedToken) {
        setAuthToken(storedToken);
        try {
          const res = await authAPI.getMe();
          if (res && res.success) {
            setUser(res.user);
          } else {
            handleLogout();
          }
        } catch (err) {
          console.error('Failed to verify token:', err);
          handleLogout();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const handleLogin = async (email, password) => {
    setLoading(true);
    try {
      const res = await authAPI.login({ email, password });
      if (res && res.success) {
        setToken(res.token);
        setUser(res.user);
        setAuthToken(res.token);
        localStorage.setItem('gsi_auth_token', res.token);
        localStorage.setItem('gsi_user', JSON.stringify(res.user));
        return { success: true };
      }
      return { success: false, message: res.message || 'Login failed' };
    } catch (err) {
      console.error('Login error:', err);
      return { success: false, message: err.message || 'An error occurred' };
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (data) => {
    setLoading(true);
    console.log('[AuthContext.handleRegister] Sending registration payload:', data);
    try {
      const res = await authAPI.register(data);
      console.log('[AuthContext.handleRegister] Registration success response:', res);
      if (res && res.success) {
        setToken(res.token);
        setUser(res.user);
        setAuthToken(res.token);
        localStorage.setItem('gsi_auth_token', res.token);
        localStorage.setItem('gsi_user', JSON.stringify(res.user));
        return { success: true };
      }
      return { success: false, message: res.message || 'Registration failed' };
    } catch (err) {
      console.error('[AuthContext.handleRegister] Registration error caught:', {
        message: err.message,
        status: err.status,
        data: err.data
      });
      return { success: false, message: err.data?.message || err.message || 'An error occurred' };
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    clearAuthToken();
    localStorage.removeItem('gsi_auth_token');
    localStorage.removeItem('gsi_user');
  };

  const handleUpdateProfile = async (data) => {
    try {
      const res = await authAPI.updateProfile(data);
      if (res && res.success) {
        setUser(res.user);
        localStorage.setItem('gsi_user', JSON.stringify(res.user));
        return { success: true };
      }
      return { success: false, message: res.message || 'Profile update failed' };
    } catch (err) {
      console.error('Profile update error:', err);
      return { success: false, message: err.message || 'An error occurred' };
    }
  };

  const hasRole = (roleName) => {
    return user && user.role_name === roleName;
  };

  const value = {
    user,
    token,
    loading,
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
    updateProfile: handleUpdateProfile,
    isAuthenticated: !!user,
    hasRole
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
