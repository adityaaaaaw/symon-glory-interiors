import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Link } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { LandingPage } from './pages/LandingPage';
import { BookingForm } from './pages/BookingForm';
import { ClientDashboard } from './pages/ClientDashboard';
import { AdminCRM } from './pages/AdminCRM';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ForgotPassword } from './pages/ForgotPassword';
import { AdminLogin } from './pages/AdminLogin';
import { ProtectedRoute, AdminRoute } from './components/RouteGuards';
import { CommandPalette } from './components/CommandPalette';
import { NotificationCenter } from './components/NotificationCenter';
import { Search, Bell, Home, LogOut, Menu, X } from 'lucide-react';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const AppContent = () => {
  const { 
    setIsNotificationOpen, 
    setIsCommandPaletteOpen, 
    notifications, 
    user,
    logout
  } = useApp();
  const location = useLocation();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  useEffect(() => {
    // Only apply smooth scrolling in the main site (non-admin portal screens where performance is critical)
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 1.0,
      touchMultiplier: 1.5,
    });

    lenis.on('scroll', ScrollTrigger.update);

    gsap.ticker.add((time) => {
      lenis.raf(time * 1000);
    });

    gsap.ticker.lagSmoothing(0);

    return () => {
      lenis.destroy();
      gsap.ticker.remove(lenis.raf);
    };
  }, [location.pathname]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  useEffect(() => {
    setIsMobileNavOpen(false);
  }, [location.pathname]);

  // Exclude header from landing and auth screens
  const showHeader = !['/', '/login', '/register', '/forgot-password', '/admin/login'].includes(location.pathname);

  return (
    <div className="min-h-screen bg-bgBase text-primary transition-colors duration-200 flex flex-col">
      
      {/* Dynamic Header for Portal/CRM Screens */}
      {showHeader && (
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-borderColor px-3 sm:px-6 py-3 flex items-center justify-between shadow-sm">
          
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => setIsMobileNavOpen(true)}
              className="md:hidden p-2 rounded-lg border border-borderColor bg-white/80 text-secondary shadow-sm min-w-[40px] min-h-[40px] flex items-center justify-center"
              aria-label="Open navigation menu"
            >
              <Menu className="w-4 h-4" />
            </button>

            {/* Logo return */}
            <Link to="/" className="flex items-center gap-2 cursor-pointer min-h-[40px] min-w-0">
            <div className="w-7 h-7 rounded bg-primary flex items-center justify-center font-bold text-accentGold text-sm shrink-0">G</div>
            <span className="font-poppins font-bold text-xs tracking-tight text-primary hidden min-[380px]:inline">
              Glory Simon
            </span>
            </Link>
          </div>
 
          {/* Quick command search bar trigger */}
          <div 
            onClick={() => setIsCommandPaletteOpen(true)}
            className="hidden sm:flex items-center gap-2 bg-bgBase px-4 py-2 border border-borderColor rounded-xl cursor-pointer hover:border-accentGold w-80 text-secondary transition-colors"
          >
            <Search className="w-4 h-4 text-accentGold" />
            <span className="text-xs">Search client profile or bookings...</span>
            <kbd className="ml-auto px-1.5 py-0.5 border border-borderColor rounded bg-white text-[9px] shadow-sm font-semibold">
              Ctrl+K
            </kbd>
          </div>
 
          {/* Action Hub */}
          <div className="flex items-center gap-2 sm:gap-4">
            
            {/* Notification Bell */}
            <button 
              onClick={() => setIsNotificationOpen(true)}
              className="p-2 hover:bg-bgBase rounded-lg text-secondary relative transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
              title="Open Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-accentGold rounded-full animate-pulse"></span>
              )}
            </button>
 
            {/* Return Landing Page */}
            <Link 
              to="/"
              className="p-2 hover:bg-bgBase rounded-lg text-secondary transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
              title="Return Landing Page"
            >
              <Home className="w-4 h-4" />
            </Link>
 
            {/* Logout Button */}
            <button 
              onClick={logout}
              className="text-xs font-bold uppercase tracking-wider text-secondary hover:text-red-650 transition-colors border border-borderColor p-2 sm:px-3 sm:py-1.5 rounded-lg hover:bg-red-50 hover:border-red-200 font-poppins flex items-center gap-1.5 min-w-[36px] min-h-[36px] justify-center"
              title="Logout"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Logout</span>
            </button>
            
            {/* User Chip */}
            {user && (
              <div className="hidden md:flex items-center gap-2 border-l border-borderColor pl-4">
                <img 
                  src={user.avatar} 
                  alt={user.name} 
                  className="w-7 h-7 rounded-full object-cover border border-accentGold/50"
                />
                <span className="text-xs font-semibold text-secondary">
                  {user.name.split(' ')[0]}
                </span>
              </div>
            )}
 
          </div>
        </header>
      )}

      {isMobileNavOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm md:hidden" onClick={() => setIsMobileNavOpen(false)} />
      )}

      <div className={`fixed inset-y-0 left-0 z-[60] w-72 max-w-[85vw] bg-white shadow-2xl border-r border-borderColor p-5 flex flex-col gap-6 transition-transform duration-300 md:hidden ${isMobileNavOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center font-bold text-accentGold text-sm">G</div>
            <span className="font-poppins font-bold text-sm text-primary">Glory Simon</span>
          </div>
          <button type="button" onClick={() => setIsMobileNavOpen(false)} className="p-2 rounded-lg border border-borderColor text-secondary" aria-label="Close navigation menu">
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex flex-col gap-3 text-sm font-semibold text-secondary">
          <Link to="/" onClick={() => setIsMobileNavOpen(false)} className="flex items-center gap-2 rounded-xl px-3 py-2.5 hover:bg-bgBase hover:text-primary">
            <Home className="w-4 h-4" /> Home
          </Link>
          <button type="button" onClick={() => { setIsNotificationOpen(true); setIsMobileNavOpen(false); }} className="flex items-center gap-2 rounded-xl px-3 py-2.5 hover:bg-bgBase hover:text-primary text-left">
            <Bell className="w-4 h-4" /> Notifications
          </button>
          <button type="button" onClick={() => { setIsCommandPaletteOpen(true); setIsMobileNavOpen(false); }} className="flex items-center gap-2 rounded-xl px-3 py-2.5 hover:bg-bgBase hover:text-primary text-left">
            <Search className="w-4 h-4" /> Quick Search
          </button>
          <button type="button" onClick={() => { logout(); setIsMobileNavOpen(false); }} className="flex items-center gap-2 rounded-xl px-3 py-2.5 hover:bg-red-50 hover:text-red-600 text-left">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </nav>
      </div>

      {/* Render Active View Route */}
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/booking" element={<BookingForm />} />
          
          <Route path="/client/dashboard" element={
            <ProtectedRoute>
              <ClientDashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/admin/dashboard" element={
            <AdminRoute>
              <AdminCRM />
            </AdminRoute>
          } />
        </Routes>
      </main>

      {/* Global Command palette modal */}
      <CommandPalette />

      {/* Global Notification Center drawer */}
      <NotificationCenter />
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </BrowserRouter>
  );
}

export default App;
