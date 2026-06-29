import React, { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import NotificationDrawer from '../components/NotificationDrawer';

const EngineerLayout = () => {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotification();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <div className="engineer-layout-container flex min-h-screen bg-bg">
      {/* Sidebar navigation */}
      <aside className={`sidebar ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-brand p-4 border-b border-border flex justify-between items-center">
          <Link to="/engineer" className="flex items-center gap-2 decoration-none">
            <span className="brand-logo text-gold font-bold heading-md m-0">GS</span>
            <div className="flex flex-col brand-text">
              <span className="font-bold text-sm tracking-wider text-cream m-0 leading-none">GLORY SIMON</span>
              <span className="text-xs text-muted m-0 uppercase tracking-widest leading-none">Interiors</span>
            </div>
          </Link>
          <button className="mobile-close-btn md:hidden" onClick={() => setMobileMenuOpen(false)}>&times;</button>
        </div>

        {/* User profile mini card */}
        <div className="p-3 border-b border-border text-center flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-surface-2 border border-gold flex items-center justify-center font-bold text-lg text-gold mb-2">
            {user?.full_name ? user.full_name.split(' ').map(n=>n[0]).join('').slice(0, 2).toUpperCase() : 'SE'}
          </div>
          <span className="font-bold text-sm text-cream block truncate max-w-full">{user?.full_name}</span>
          <span className="badge badge-scheduled text-xs mt-1">Site Engineer</span>
        </div>

        <nav className="sidebar-nav p-3 flex flex-col gap-2 flex-1">
          <Link
            to="/engineer"
            onClick={() => setMobileMenuOpen(false)}
            className={`nav-item decoration-none ${isActive('/engineer') ? 'active' : ''}`}
          >
            🔧 My Dashboard
          </Link>
        </nav>

        <div className="p-3 border-t border-border mt-auto">
          <button className="btn btn-secondary w-full text-left justify-start" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area Wrapper */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top Header Bar */}
        <header className="navbar card rounded-none border-t-0 border-l-0 border-r-0 border-b p-3 flex justify-between items-center bg-surface sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button className="btn btn-secondary border-none p-2 md:hidden" onClick={() => setMobileMenuOpen(true)}>
              ☰
            </button>
            <h2 className="heading-md m-0 text-gold hidden md:block">Site Engineer Portal</h2>
          </div>

          <div className="flex items-center gap-4">
            <button 
              className="btn btn-secondary border-none p-2 relative flex items-center justify-center" 
              onClick={() => setDrawerOpen(true)}
              aria-label="Toggle notifications"
            >
              <span className="text-lg">🔔</span>
              {unreadCount > 0 && (
                <span className="absolute badge badge-pending p-1 flex justify-center items-center font-bold text-xs" style={{ top: '-4px', right: '-4px', minWidth: '18px', height: '18px', fontSize: '10px' }}>
                  {unreadCount}
                </span>
              )}
            </button>

            <span className="text-sm font-semibold text-cream hidden md:block border-l pl-3 border-border">
              {user?.full_name}
            </span>
          </div>
        </header>

        {/* Nested Content Outlet */}
        <main className="flex-grow p-4 md:p-6 animate-fade-in">
          <Outlet />
        </main>
      </div>

      {/* Notifications Drawer */}
      <NotificationDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
};

export default EngineerLayout;
