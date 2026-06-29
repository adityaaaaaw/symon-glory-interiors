import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

const Login = () => {
  const { login } = useAuth();
  const { addToast } = useNotification();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDemoAccounts, setShowDemoAccounts] = useState(true);

  // Redirect path after login
  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await login(email, password);
      if (res && res.success) {
        addToast('Welcome back to Glory Simon Interiors!', 'success');
        navigate(from, { replace: true });
      } else {
        setError(res.message || 'Invalid email or password.');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoCredentials = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError('');
  };

  return (
    <div className="login-page-container flex min-h-screen flex-col md:flex-row bg-bg">
      {/* Left Branding Side (60% width on desktop) */}
      <div 
        className="login-branding-panel flex-1 flex flex-col justify-between p-8 md:p-16 text-left relative overflow-hidden bg-surface"
        style={{
          background: 'linear-gradient(135deg, hsl(30, 12%, 8%) 0%, hsl(30, 8%, 14%) 100%)',
          borderRight: '1px solid var(--color-border)',
          flex: '1.2'
        }}
      >
        {/* Monogram branding */}
        <div className="brand-logo-area">
          <div className="text-gold font-bold mb-2" style={{ fontFamily: 'var(--font-heading)', fontSize: '80px', lineHeight: '1' }}>
            GS
          </div>
          <h1 className="heading-xl text-cream font-bold m-0" style={{ letterSpacing: '2px' }}>GLORY SIMON</h1>
          <p className="text-muted uppercase tracking-widest text-sm m-0">Interiors</p>
          <div className="gold-divider w-24 h-1 my-6" style={{ background: 'var(--color-gold)' }}></div>
        </div>

        {/* Brand Tagline & Props */}
        <div className="brand-tagline-area max-w-lg mb-8 md:mb-0">
          <p className="heading-md text-cream italic mb-8" style={{ fontWeight: '300' }}>
            "Transforming spaces, crafting premium experiences tailored to your lifestyle."
          </p>

          <div className="brand-features flex flex-col gap-3">
            <div className="feature-item flex items-center gap-3 text-cream">
              <span className="text-gold">✦</span>
              <span>Premium Interior & Space Planning</span>
            </div>
            <div className="feature-item flex items-center gap-3 text-cream">
              <span className="text-gold">✦</span>
              <span>Professional Technical Site Visits</span>
            </div>
            <div className="feature-item flex items-center gap-3 text-cream">
              <span className="text-gold">✦</span>
              <span>Dedicated Staff & Expert Coordination</span>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="brand-footer text-xs text-subtle">
          © {new Date().getFullYear()} Glory Simon Interiors. All rights reserved.
        </div>
      </div>

      {/* Right Login Card Side (40% width on desktop) */}
      <div className="login-card-panel flex-1 flex items-center justify-center p-6 md:p-12">
        <div className="card w-full max-w-md p-8 bg-surface-2 border border-border rounded-2xl shadow-2xl animate-slide-in">
          <h2 className="heading-lg font-bold text-cream mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
            Welcome Back
          </h2>
          <p className="text-muted text-sm mb-6">Sign in to book and manage site visits.</p>

          {error && (
            <div className="text-danger bg-danger-bg border border-danger text-sm rounded p-3 mb-4 flex gap-2 items-center">
              <span>✗</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="form-group">
              <label className="form-label" htmlFor="email-input">Email Address</label>
              <input
                id="email-input"
                type="email"
                className="form-input"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <div className="flex justify-between items-center mb-1">
                <label className="form-label mb-0" htmlFor="password-input">Password</label>
              </div>
              <input
                id="password-input"
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary w-full py-3 mt-2" disabled={loading}>
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-sm text-muted mt-6 mb-4">
            New client?{' '}
            <Link to="/register" className="text-gold font-semibold decoration-none">
              Register Here
            </Link>
          </p>

          {/* Demo Accounts Box */}
          {showDemoAccounts && (
            <div className="demo-accounts-box card bg-surface p-4 border border-border mt-4 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-gold">Demo Accounts</span>
                <button 
                  className="btn btn-xs btn-secondary p-0 px-2"
                  onClick={() => setShowDemoAccounts(false)}
                >
                  Hide
                </button>
              </div>
              <div className="flex flex-col gap-2" style={{ maxHeight: '150px', overflowY: 'auto' }}>
                <button
                  type="button"
                  className="btn btn-xs btn-secondary text-left w-full truncate"
                  onClick={() => fillDemoCredentials('admin@glorysimon.com', 'Admin@123')}
                >
                  👑 Admin: admin@glorysimon.com (Admin@123)
                </button>
                <button
                  type="button"
                  className="btn btn-xs btn-secondary text-left w-full truncate"
                  onClick={() => fillDemoCredentials('designer1@glorysimon.com', 'Designer@123')}
                >
                  🎨 Designer: designer1@glorysimon.com (Designer@123)
                </button>
                <button
                  type="button"
                  className="btn btn-xs btn-secondary text-left w-full truncate"
                  onClick={() => fillDemoCredentials('engineer1@glorysimon.com', 'Engineer@123')}
                >
                  🔧 Engineer: engineer1@glorysimon.com (Engineer@123)
                </button>
                <button
                  type="button"
                  className="btn btn-xs btn-secondary text-left w-full truncate"
                  onClick={() => fillDemoCredentials('client1@gmail.com', 'Client@123')}
                >
                  🏠 Client: client1@gmail.com (Client@123)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
