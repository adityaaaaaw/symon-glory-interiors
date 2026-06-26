import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, ArrowRight } from 'lucide-react';

export const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    
    setLoading(true);
    // Simulate API recovery trigger
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 1200);
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
          Recover Password
        </h2>
        <p className="mt-2 text-sm text-[#5C5C5C]">
          We will send you link instructions to reset your password.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="bg-white py-8 px-4 shadow-xl rounded-2xl sm:px-10 border border-[#C5A880]/10">
          
          {submitted ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-12 h-12 bg-green-50 rounded-full border border-green-200 flex items-center justify-center mx-auto text-green-600 font-bold text-xl">✓</div>
              <h3 className="font-bold text-slate-800 text-sm">Reset link dispatched</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                If the email address <strong>{email}</strong> exists in our system, you will receive password reset guidelines shortly.
              </p>
              <div className="pt-4">
                <Link to="/login" className="inline-flex items-center gap-1 text-xs font-bold text-[#C5A880] hover:underline">
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
                </Link>
              </div>
            </div>
          ) : (
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

              <div className="flex flex-col gap-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold uppercase tracking-wider text-white bg-[#1C1C1C] hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-900 transition-all disabled:opacity-50"
                >
                  {loading ? 'Sending Request...' : 'Send Reset Instructions'}
                  {!loading && <ArrowRight className="w-4 h-4 text-[#C5A880]" />}
                </button>

                <Link to="/login" className="inline-flex items-center justify-center gap-1 text-xs font-bold text-slate-600 hover:text-[#C5A880] transition-colors py-2">
                  <ArrowLeft className="w-3.5 h-3.5" /> Return to Login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
