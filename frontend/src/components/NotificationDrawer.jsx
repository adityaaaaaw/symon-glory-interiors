import React, { useEffect } from 'react';
import { useNotification } from '../context/NotificationContext';

const NotificationDrawer = ({ isOpen, onClose }) => {
  const { notifications, loading, fetchNotifications, markRead, markAllRead, unreadCount } = useNotification();

  useEffect(() => {
    if (isOpen) {
      fetchNotifications({ limit: 30 });
    }
  }, [isOpen, fetchNotifications]);

  if (!isOpen) return null;

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose}></div>
      <div className="drawer-container sidebar-drawer open">
        <div className="drawer-header flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <h3 className="heading-md m-0">Notifications</h3>
            {unreadCount > 0 && <span className="badge badge-pending">{unreadCount} new</span>}
          </div>
          <button className="drawer-close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="drawer-actions mb-4 flex justify-between">
          <button 
            className="btn btn-xs btn-secondary"
            onClick={markAllRead}
            disabled={unreadCount === 0 || loading}
          >
            Mark all read
          </button>
          <button 
            className="btn btn-xs btn-secondary"
            onClick={() => fetchNotifications({ limit: 30 })}
            disabled={loading}
          >
            Refresh
          </button>
        </div>

        <div className="drawer-content scrollable">
          {loading && notifications.length === 0 ? (
            <div className="text-center py-4">
              <div className="spinner sm mx-auto mb-2"></div>
              <span className="text-muted text-sm">Loading...</span>
            </div>
          ) : notifications.length === 0 ? (
            <div className="empty-state text-center py-8">
              <div className="empty-icon text-muted mb-2">🔔</div>
              <p className="text-muted m-0">No notifications yet</p>
            </div>
          ) : (
            <div className="notifications-list flex flex-col gap-2">
              {notifications.map((n) => (
                <div 
                  key={n.id} 
                  className={`notification-item p-3 card ${n.is_read ? 'read' : 'unread'}`}
                  onClick={() => !n.is_read && markRead(n.id)}
                  style={{
                    cursor: n.is_read ? 'default' : 'pointer',
                    borderLeft: n.is_read ? '1px solid var(--color-border)' : '3px solid var(--color-gold)',
                    opacity: n.is_read ? 0.75 : 1,
                  }}
                >
                  <div className="flex justify-between items-start gap-2 mb-1">
                    <span className="notification-type text-gold text-xs font-semibold">
                      {n.type === 'Email' ? '📧 Email Sent' : n.type === 'WhatsApp' ? '📱 WhatsApp' : '🔔 Notification'}
                    </span>
                    <span className="notification-time text-xs text-muted">
                      {formatDate(n.created_at)}
                    </span>
                  </div>
                  <h4 className="notification-title text-sm font-semibold m-0 mb-1">{n.title}</h4>
                  <p className="notification-body text-xs text-muted m-0">{n.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default NotificationDrawer;
