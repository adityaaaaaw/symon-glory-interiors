import { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

/* ─── Page title map ─────────────────────────────────────── */
const PAGE_TITLES = {
  '/admin': 'Dashboard',
  '/admin/bookings': 'Bookings',
  '/admin/calendar': 'Calendar',
  '/admin/slots': 'Slot Management',
  '/admin/users': 'User Management',
  '/admin/reports': 'Reports',
};

/* ─── Nav items ──────────────────────────────────────────── */
const NAV_ITEMS = [
  { icon: '📊', label: 'Dashboard',  to: '/admin',          end: true },
  { icon: '📋', label: 'Bookings',   to: '/admin/bookings'             },
  { icon: '🗓️', label: 'Calendar',   to: '/admin/calendar'             },
  { icon: '⏰', label: 'Slots',      to: '/admin/slots'                },
  { icon: '👥', label: 'Users',      to: '/admin/users'                },
  { icon: '📄', label: 'Reports',    to: '/admin/reports'              },
];

/* ─── Notification Drawer ────────────────────────────────── */
function NotificationDrawer({ open, onClose }) {
  const { notifications, markAllRead, markRead } = useNotification();
  const drawerRef = useRef(null);

  useEffect(() => {
    function handleKey(e) { if (e.key === 'Escape') onClose(); }
    if (open) document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  return (
    <>
      {open && (
        <div
          className="overlay"
          onClick={onClose}
          style={{ zIndex: 1100 }}
        />
      )}
      <aside
        ref={drawerRef}
        className="notification-drawer"
        style={{
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          zIndex: 1200,
        }}
        aria-hidden={!open}
      >
        <div className="notification-drawer-header">
          <h3 className="notification-drawer-title">Notifications</h3>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button className="btn-ghost btn-sm" onClick={markAllRead}>
              Mark all read
            </button>
            <button className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
          </div>
        </div>

        <div className="notification-list">
          {(!notifications || notifications.length === 0) && (
            <div className="notification-empty">
              <span style={{ fontSize: '2rem' }}>🔔</span>
              <p>No notifications yet</p>
            </div>
          )}
          {notifications && notifications.map((n) => (
            <div
              key={n.id}
              className={`notification-item${n.is_read ? '' : ' notification-item--unread'}`}
              onClick={() => markRead(n.id)}
              role="button"
              tabIndex={0}
            >
              <div className="notification-item-dot" />
              <div className="notification-item-body">
                <p className="notification-item-title">{n.title}</p>
                <p className="notification-item-message">{n.message}</p>
                <span className="notification-item-time">
                  {new Date(n.created_at).toLocaleString('en-IN', {
                    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                  })}
                </span>
              </div>
            </div>
          ))}
        </div>
      </aside>
    </>
  );
}

/* ─── Admin Layout ───────────────────────────────────────── */
export default function AdminLayout() {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotification();
  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  /* Dynamic page title */
  const pageTitle =
    Object.entries(PAGE_TITLES)
      .sort((a, b) => b[0].length - a[0].length)
      .find(([path]) => location.pathname.startsWith(path))?.[1] ?? 'Admin';

  /* Close user menu on outside click */
  useEffect(() => {
    function handle(e) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  /* Close sidebar on route change (mobile) */
  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  /* Get initials */
  const initials = user?.full_name
    ? user.full_name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : 'A';

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="admin-layout">
      {/* ── Mobile overlay ── */}
      {sidebarOpen && (
        <div
          className="overlay"
          onClick={() => setSidebarOpen(false)}
          style={{ zIndex: 900 }}
        />
      )}

      {/* ══════════════ SIDEBAR ══════════════ */}
      <aside className={`admin-sidebar${sidebarOpen ? ' admin-sidebar--open' : ''}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-monogram">GS</div>
          <div className="sidebar-brand">
            <span className="sidebar-brand-name">Glory Simon</span>
            <span className="sidebar-brand-sub">Interiors</span>
          </div>
        </div>

        {/* User profile mini */}
        <div className="sidebar-profile">
          <div className="avatar avatar--sm">
            <span className="avatar-initials">{initials}</span>
          </div>
          <div className="sidebar-profile-info">
            <span className="sidebar-profile-name">{user?.full_name ?? 'Admin'}</span>
            <span className="role-badge role-badge--admin">Administrator</span>
          </div>
        </div>

        {/* Divider */}
        <div className="sidebar-divider" />

        {/* Navigation */}
        <nav className="sidebar-nav" aria-label="Admin navigation">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `sidebar-nav-item${isActive ? ' sidebar-nav-item--active' : ''}`
              }
            >
              <span className="sidebar-nav-icon" aria-hidden="true">{item.icon}</span>
              <span className="sidebar-nav-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Logout */}
        <div className="sidebar-footer">
          <button className="sidebar-logout-btn" onClick={handleLogout}>
            <span aria-hidden="true">🚪</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* ══════════════ MAIN WRAPPER ══════════════ */}
      <div className="admin-main">
        {/* ── Top Header ── */}
        <header className="admin-header">
          {/* Hamburger (mobile) */}
          <button
            className="hamburger-btn"
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label="Toggle sidebar"
          >
            <span className="hamburger-line" />
            <span className="hamburger-line" />
            <span className="hamburger-line" />
          </button>

          {/* Page title */}
          <h1 className="admin-header-title">{pageTitle}</h1>

          {/* Right cluster */}
          <div className="admin-header-right">
            {/* Notification bell */}
            <button
              className="icon-btn notification-bell"
              onClick={() => setDrawerOpen((v) => !v)}
              aria-label={`Notifications (${unreadCount} unread)`}
            >
              🔔
              {unreadCount > 0 && (
                <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
              )}
            </button>

            {/* User menu */}
            <div className="user-menu-wrapper" ref={userMenuRef}>
              <button
                className="user-menu-trigger"
                onClick={() => setUserMenuOpen((v) => !v)}
                aria-haspopup="true"
                aria-expanded={userMenuOpen}
              >
                <div className="avatar avatar--xs">
                  <span className="avatar-initials">{initials}</span>
                </div>
                <span className="user-menu-name">{user?.full_name?.split(' ')[0] ?? 'Admin'}</span>
                <span className="user-menu-caret" style={{ transform: userMenuOpen ? 'rotate(180deg)' : 'none' }}>▾</span>
              </button>

              {userMenuOpen && (
                <div className="dropdown-menu" role="menu">
                  <button
                    className="dropdown-item"
                    role="menuitem"
                    onClick={() => { setUserMenuOpen(false); navigate('/admin/profile'); }}
                  >
                    👤 My Profile
                  </button>
                  <div className="dropdown-divider" />
                  <button
                    className="dropdown-item dropdown-item--danger"
                    role="menuitem"
                    onClick={handleLogout}
                  >
                    🚪 Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ── Content ── */}
        <main className="admin-content">
          <Outlet />
        </main>
      </div>

      {/* ══════════════ NOTIFICATION DRAWER ══════════════ */}
      <NotificationDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
