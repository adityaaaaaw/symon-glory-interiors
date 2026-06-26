import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Mail, Lock, Sparkles, ArrowRight } from 'lucide-react';

export const Login = () => {
  const { login, loading } = useApp();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    const res = await login(email, password);
    if (res.success) {
      if (res.role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/client/dashboard');
      }
    } else {
      setError(res.message || 'Invalid email or password.');
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF6F0] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-poppins relative overflow-hidden">
      
      {/* Decorative luxury elements */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-[#C5A880]/5 blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-[#1C1C1C]/5 blur-[120px]" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10 text-center">
        <Link to="/" className="inline-flex items-center justify-center gap-2 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[#1C1C1C] flex items-center justify-center font-bold text-[#C5A880] text-xl shadow-md">G</div>
          <span className="font-extrabold text-[#1C1C1C] tracking-tight text-xl">
            Glory Simon <span className="text-[#C5A880] font-light">Studio</span>
          </span>
        </Link>
        <h2 className="text-3xl font-extrabold text-[#1C1C1C] tracking-tight">
          Client Portal
        </h2>
        <p className="mt-2 text-sm text-[#5C5C5C]">
          Or{' '}
          <Link to="/register" className="font-medium text-[#C5A880] hover:text-[#b4956c] transition-colors">
            create a new account
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="bg-white py-8 px-4 shadow-xl rounded-2xl sm:px-10 border border-[#C5A880]/10">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
              {error}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Email Address
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-[#C5A880]" />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#C5A880]/40 focus:border-[#C5A880] text-sm transition-all bg-slate-50/30"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Password
                </label>
                <div className="text-xs">
                  <Link to="/forgot-password" className="font-medium text-[#C5A880] hover:text-[#b4956c] transition-colors">
                    Forgot your password?
                  </Link>
                </div>
              </div>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-[#C5A880]" />
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#C5A880]/40 focus:border-[#C5A880] text-sm transition-all bg-slate-50/30"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold uppercase tracking-wider text-white bg-[#1C1C1C] hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-900 transition-all disabled:opacity-50"
              >
                {loading ? 'Signing In...' : 'Sign In'}
                {!loading && <ArrowRight className="w-4 h-4 text-[#C5A880]" />}
              </button>
            </div>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <span className="text-xs text-slate-400">Glory Simon Interiors Administrator? </span>
            <Link to="/admin/login" className="text-xs font-bold text-[#1C1C1C] hover:text-[#C5A880] transition-colors">
              Staff Portal
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
