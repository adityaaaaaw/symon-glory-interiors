import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { notificationAPI } from '../services/api';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const getUnreadCount = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await notificationAPI.getUnreadCount();
      if (res && res.success) {
        setUnreadCount(res.count);
      }
    } catch (err) {
      console.error('Error getting unread count:', err);
    }
  }, [isAuthenticated]);

  const fetchNotifications = useCallback(async (params = {}) => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const res = await notificationAPI.getAll(params);
      if (res && res.success) {
        setNotifications(res.notifications || []);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
      addToast('Failed to load notifications', 'error');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, addToast]);

  const markRead = useCallback(async (id) => {
    try {
      const res = await notificationAPI.markRead(id);
      if (res && res.success) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, is_read: 1, status: 'Read' } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
        addToast('Notification marked as read', 'success');
      }
    } catch (err) {
      console.error('Error marking notification as read:', err);
      addToast('Failed to update notification', 'error');
    }
  }, [addToast]);

  const markAllRead = useCallback(async () => {
    try {
      const res = await notificationAPI.markAllRead();
      if (res && res.success) {
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, is_read: 1, status: 'Read' }))
        );
        setUnreadCount(0);
        addToast('All notifications marked as read', 'success');
      }
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
      addToast('Failed to update notifications', 'error');
    }
  }, [addToast]);

  useEffect(() => {
    if (isAuthenticated) {
      getUnreadCount();
      fetchNotifications({ limit: 10 });
      
      // Poll notifications every 30s
      const interval = setInterval(() => {
        getUnreadCount();
      }, 30000);
      return () => clearInterval(interval);
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [isAuthenticated, getUnreadCount, fetchNotifications]);

  const value = {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    markRead,
    markAllRead,
    addToast,
    getUnreadCount
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      {/* Toast Container */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.type}`} onClick={() => removeToast(toast.id)}>
            <div className="toast-content">
              {toast.type === 'success' && '✓ '}
              {toast.type === 'error' && '✗ '}
              {toast.type === 'warning' && '⚠ '}
              {toast.type === 'info' && 'ℹ '}
              {toast.message}
            </div>
            <button className="toast-close" onClick={(e) => { e.stopPropagation(); removeToast(toast.id); }}>×</button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
