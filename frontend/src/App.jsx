import React, { useEffect } from 'react';
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
import { Search, Bell, Home } from 'lucide-react';
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

  // Exclude header from landing and auth screens
  const showHeader = !['/', '/login', '/register', '/forgot-password', '/admin/login'].includes(location.pathname);

  return (
    <div className="min-h-screen bg-bgBase text-primary transition-colors duration-200 flex flex-col">
      
      {/* Dynamic Header for Portal/CRM Screens */}
      {showHeader && (
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-borderColor px-6 py-3.5 flex items-center justify-between shadow-sm">
          
          {/* Logo return */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-primary flex items-center justify-center font-bold text-accentGold text-sm">G</div>
            <span className="font-poppins font-bold text-xs tracking-tight text-primary">
              Glory Simon
            </span>
          </Link>

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
          <div className="flex items-center gap-4">
            
            {/* Notification Bell */}
            <button 
              onClick={() => setIsNotificationOpen(true)}
              className="p-1.5 hover:bg-bgBase rounded-lg text-secondary relative transition-colors"
              title="Open Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-accentGold rounded-full animate-pulse"></span>
              )}
            </button>

            {/* Return Landing Page */}
            <Link 
              to="/"
              className="p-1.5 hover:bg-bgBase rounded-lg text-secondary transition-colors"
              title="Return Landing Page"
            >
              <Home className="w-4 h-4" />
            </Link>

            {/* Logout Button */}
            <button 
              onClick={logout}
              className="text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-red-600 transition-colors border border-borderColor px-3 py-1.5 rounded-lg hover:bg-red-50 hover:border-red-200 font-poppins"
            >
              Logout
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
