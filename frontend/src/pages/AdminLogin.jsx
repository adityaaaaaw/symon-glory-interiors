import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Mail, Lock, ShieldAlert, ArrowRight } from 'lucide-react';

export const AdminLogin = () => {
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
        setError('Access denied. Administrator credentials required.');
      }
    } else {
      setError(res.message || 'Invalid administrator credentials.');
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-poppins relative overflow-hidden text-slate-100">
      
      {/* Decorative luxury gradient spots for admin portal */}
      <div className="absolute top-[-30%] right-[-20%] w-[70%] h-[70%] rounded-full bg-blue-500/10 blur-[130px]" />
      <div className="absolute bottom-[-30%] left-[-20%] w-[70%] h-[70%] rounded-full bg-[#C5A880]/10 blur-[130px]" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10 text-center">
        <Link to="/" className="inline-flex items-center justify-center gap-2 mb-6">
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center font-bold text-[#0F172A] text-xl shadow-md">G</div>
          <span className="font-extrabold text-white tracking-tight text-xl">
            Glory Simon <span className="text-[#C5A880] font-light">Interiors</span>
          </span>
        </Link>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">
          Staff Control Center
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Cease operations if unauthorized. All sessions are audited.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10 font-inter">
        <div className="bg-[#1E293B] py-8 px-4 shadow-2xl rounded-2xl sm:px-10 border border-slate-700/60">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-950/40 border border-red-800 text-red-400 text-xs font-semibold flex gap-2 items-center">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Administrator Username/Email
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
                  className="block w-full pl-10 pr-4 py-3 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#C5A880]/50 focus:border-[#C5A880] text-sm transition-all bg-[#0F172A]/50"
                  placeholder="admin@glorysimon.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Secure Password Key
              </label>
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
                  className="block w-full pl-10 pr-4 py-3 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#C5A880]/50 focus:border-[#C5A880] text-sm transition-all bg-[#0F172A]/50"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold uppercase tracking-wider text-[#0F172A] bg-white hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#1E293B] focus:ring-white transition-all disabled:opacity-50"
              >
                {loading ? 'Initializing Console...' : 'Establish Connection'}
                {!loading && <ArrowRight className="w-4 h-4 text-[#0F172A]" />}
              </button>
            </div>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-800 text-center">
            <Link to="/login" className="text-xs font-semibold text-slate-400 hover:text-[#C5A880] transition-colors">
              Return to standard client login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
