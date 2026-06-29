import React, { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import NotificationDrawer from '../components/NotificationDrawer';

const ClientLayout = () => {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotification();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <div className="client-layout-container flex flex-col min-h-screen bg-bg">
      {/* Top Navbar */}
      <nav className="client-navbar card rounded-none border-t-0 border-l-0 border-r-0 border-b p-3 flex justify-between items-center w-full sticky top-0 z-40 bg-surface backdrop-blur">
        {/* Brand Logo */}
        <div className="nav-brand flex items-center gap-2">
          <Link to="/client" className="flex items-center gap-2 decoration-none">
            <span className="brand-logo text-gold font-bold heading-md m-0">GS</span>
            <div className="flex flex-col brand-text">
              <span className="font-bold text-sm tracking-wider text-cream m-0 leading-none">GLORY SIMON</span>
              <span className="text-xs text-muted m-0 uppercase tracking-widest leading-none">Interiors</span>
            </div>
          </Link>
        </div>

        {/* Center Links */}
        <div className="nav-links flex gap-6 items-center">
          <Link 
            to="/client" 
            className={`nav-link text-sm font-semibold decoration-none ${isActive('/client') ? 'text-gold' : 'text-muted hover:text-cream'}`}
          >
            🏠 Dashboard
          </Link>
          <Link 
            to="/client/book" 
            className={`nav-link text-sm font-semibold decoration-none ${isActive('/client/book') ? 'text-gold' : 'text-muted hover:text-cream'}`}
          >
            📅 Book Visit
          </Link>
          <Link 
            to="/client/bookings" 
            className={`nav-link text-sm font-semibold decoration-none ${isActive('/client/bookings') ? 'text-gold' : 'text-muted hover:text-cream'}`}
          >
            📋 My Bookings
          </Link>
        </div>

        {/* Right Actions */}
        <div className="nav-actions flex items-center gap-4">
          {/* Notification Bell */}
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

          {/* User Display & Logout */}
          <div className="flex items-center gap-2 border-l pl-3 border-border">
            <span className="text-sm font-semibold text-cream hidden md:block">
              {user?.full_name || 'Client'}
            </span>
            <button className="btn btn-sm btn-secondary" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="client-main flex-1 w-full max-w-7xl mx-auto p-4 md:p-6 animate-fade-in">
        <Outlet />
      </main>

      {/* Notification Drawer */}
      <NotificationDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
};

export default ClientLayout;
