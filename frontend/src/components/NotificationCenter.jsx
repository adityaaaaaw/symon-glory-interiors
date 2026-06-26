import React from 'react';
import { useApp } from '../context/AppContext';
import { X, MessageSquare, Mail, Bell, CheckCheck } from 'lucide-react';

export const NotificationCenter = () => {
  const { isNotificationOpen, setIsNotificationOpen, notifications, markNotificationRead } = useApp();

  if (!isNotificationOpen) return null;

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-white border-l border-borderColor shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
      
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-borderColor">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-accentGold" />
          <h3 className="font-poppins text-lg font-semibold text-primary">
            Notifications
          </h3>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-semibold bg-accentGold text-white rounded-full">
              {unreadCount} new
            </span>
          )}
        </div>
        <button
          onClick={() => setIsNotificationOpen(false)}
          className="p-1.5 hover:bg-bgBase rounded-lg text-secondary transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Notifications List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {notifications.length > 0 ? (
          notifications.map((notif) => {
            const isRead = notif.is_read === 1;
            return (
              <div
                key={notif.id}
                onClick={() => !isRead && markNotificationRead(notif.id)}
                className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
                  isRead
                    ? 'bg-white border-borderColor opacity-70'
                    : 'bg-bgBase border-accentGold/20 gold-glow'
                }`}
              >
                <div className="flex gap-3">
                  <div className={`p-2 rounded-lg ${
                    notif.type === 'whatsapp' 
                      ? 'bg-green-100 text-green-600' 
                      : notif.type === 'email' 
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-gold-100 text-gold-600'
                  }`}>
                    {notif.type === 'whatsapp' ? (
                      <MessageSquare className="w-4 h-4" />
                    ) : notif.type === 'email' ? (
                      <Mail className="w-4 h-4" />
                    ) : (
                      <Bell className="w-4 h-4" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold uppercase tracking-wider text-accentGold">
                        {notif.title}
                      </span>
                      {!isRead && (
                        <span className="w-2 h-2 bg-accentGold rounded-full animate-ping"></span>
                      )}
                    </div>
                    <p className="text-sm font-inter text-secondary leading-relaxed">
                      {notif.message}
                    </p>
                    <span className="block mt-2 text-[10px] text-secondary/60">
                      {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 text-secondary">
            <div className="w-16 h-16 bg-bgBase rounded-full flex items-center justify-center mb-4 border border-borderColor/40">
              <Bell className="w-6 h-6 text-secondary/60" />
            </div>
            <h4 className="font-poppins font-medium text-sm text-primary mb-1">
              All caught up!
            </h4>
            <p className="text-xs text-secondary max-w-[200px]">
              No new alerts or project notifications available.
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="p-4 border-t border-borderColor bg-bgBase/50 flex items-center justify-center">
          <button className="flex items-center gap-2 text-xs font-semibold text-accentGold hover:text-accentGold/80 transition-colors">
            <CheckCheck className="w-4 h-4" /> Mark all as read
          </button>
        </div>
      )}
    </div>
  );
};
