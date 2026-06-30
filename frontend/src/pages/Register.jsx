import React, { useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { User, Mail, Lock, Phone, ArrowRight, Eye, EyeOff } from 'lucide-react';

export const Register = () => {
  const { register, loading, showToast } = useApp();
  const navigate = useNavigate();

  // Field states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState(''); // Stores raw 10 digits
  const [password, setPassword] = useState('');
  
  // UX states
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState({
    name: false,
    email: false,
    phone: false,
    password: false
  });
  const [errors, setErrors] = useState({
    name: '',
    email: '',
    phone: '',
    password: ''
  });

  // Validation helper rules
  const validateName = (val) => {
    const trimmed = val.trim();
    if (!trimmed) return 'Full Name is required.';
    if (trimmed.length < 2) return 'Full Name must be at least 2 characters.';
    if (!/^[A-Za-z\s]+$/.test(trimmed)) return 'Only letters and spaces are allowed.';
    return '';
  };

  const validateEmail = (val) => {
    const trimmed = val.trim();
    if (!trimmed) return 'Email Address is required.';
    if (/^\d+$/.test(trimmed)) return 'Please enter a valid email address, not a phone number.';
    // RFC-compliant email regex
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if (!emailRegex.test(trimmed)) return 'Please enter a valid email address.';
    return '';
  };

  const validatePhone = (val) => {
    if (!val) return 'Phone Number is required.';
    let clean = String(val).replace(/\D/g, '');
    if (clean.startsWith('91') && clean.length > 10) {
      clean = clean.slice(2);
    } else if (clean.startsWith('0') && clean.length > 10) {
      clean = clean.slice(1);
    }
    if (!/^[6-9]\d{9}$/.test(clean)) {
      return 'Please enter a valid 10-digit mobile number.';
    }
    return '';
  };

  const validatePassword = (val) => {
    if (!val) return 'Password is required.';
    if (val.length < 8) return 'Password must be at least 8 characters.';
    if (val.length > 64) return 'Password cannot exceed 64 characters.';
    if (!/[A-Z]/.test(val)) return 'Password must contain at least one uppercase letter.';
    if (!/[a-z]/.test(val)) return 'Password must contain at least one lowercase letter.';
    if (!/\d/.test(val)) return 'Password must contain at least one number.';
    if (!/[@$!%*?&#]/.test(val)) return 'Password must contain at least one special character.';
    return '';
  };

  // Run validation for a single field
  const validateField = (field, val) => {
    let msg = '';
    if (field === 'name') msg = validateName(val);
    else if (field === 'email') msg = validateEmail(val);
    else if (field === 'phone') msg = validatePhone(val);
    else if (field === 'password') msg = validatePassword(val);

    setErrors(prev => ({ ...prev, [field]: msg }));
    return msg;
  };

  // Input change handlers
  const handleNameChange = (e) => {
    let val = e.target.value;
    // Allow only letters and spaces
    val = val.replace(/[^A-Za-z\s]/g, '');
    setName(val);
    if (touched.name) {
      validateField('name', val);
    }
  };

  const handleNameBlur = () => {
    setTouched(prev => ({ ...prev, name: true }));
    // Trim and auto-capitalize each word on blur
    const trimmed = name.trim();
    if (trimmed) {
      const capitalized = trimmed
        .split(/\s+/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
      setName(capitalized);
      validateField('name', capitalized);
    } else {
      setName('');
      validateField('name', '');
    }
  };

  const handleEmailChange = (e) => {
    const val = e.target.value;
    setEmail(val);
    if (touched.email) {
      validateField('email', val);
    }
  };

  const handlePhoneChange = (e) => {
    let val = e.target.value;

    // Allow user to clear input completely
    if (val === '') {
      setPhone('');
      if (touched.phone) {
        validateField('phone', '');
      }
      return;
    }

    // Strip non-digits
    let cleanVal = val.replace(/\D/g, '');

    // Normalize: remove +91, 91 or 0 prefixes if length suggests they were pasted/typed as country codes
    if (cleanVal.startsWith('91') && cleanVal.length > 10) {
      cleanVal = cleanVal.slice(2);
    } else if (cleanVal.startsWith('0') && cleanVal.length > 10) {
      cleanVal = cleanVal.slice(1);
    }

    // Slice to maximum of 10 digits
    cleanVal = cleanVal.slice(0, 10);

    setPhone(cleanVal);
    if (touched.phone) {
      validateField('phone', cleanVal);
    }
  };

  const handlePasswordChange = (e) => {
    const val = e.target.value;
    setPassword(val);
    if (touched.password) {
      validateField('password', val);
    }
  };

  const handlePasswordPaste = (e) => {
    const pastedText = e.clipboardData.getData('text');
    if (pastedText.length > 64) {
      e.preventDefault();
      showToast('Pasting strings longer than 64 characters is not allowed.', 'error');
    }
  };

  // Calculate live password strength
  const getPasswordStrength = (val) => {
    if (val.length < 8) return 'Weak';
    let score = 0;
    if (/[A-Z]/.test(val)) score++;
    if (/[a-z]/.test(val)) score++;
    if (/\d/.test(val)) score++;
    if (/[@$!%*?&#]/.test(val)) score++;

    if (score <= 2) return 'Weak';
    if (score === 3) return 'Medium';
    return 'Strong';
  };

  const strength = password ? getPasswordStrength(password) : '';

  // Determine border and outline styles based on touched/error state
  const getInputClassName = (field) => {
    const baseClass = "block w-full pl-10 pr-10 py-3 border rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 text-sm transition-all bg-slate-50/30 font-medium";
    if (!touched[field]) {
      return `${baseClass} border-slate-200 focus:ring-[#C5A880]/30 focus:border-[#C5A880]`;
    }
    if (errors[field]) {
      return `${baseClass} border-red-500 focus:ring-red-200 focus:border-red-500 bg-red-50/5`;
    }
    return `${baseClass} border-green-500 focus:ring-green-200 focus:border-green-500 bg-green-50/5`;
  };

  // Form validity check
  const isFormValid =
    name.trim() !== '' &&
    validateName(name) === '' &&
    email.trim() !== '' &&
    validateEmail(email) === '' &&
    phone.length === 10 &&
    validatePhone(phone) === '' &&
    password !== '' &&
    validatePassword(password) === '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid || submitting || loading) return;

    setSubmitting(true);

    // Form final sanitization parameters
    const trimmedName = name.trim();
    const lowercaseEmail = email.trim().toLowerCase();

    const res = await register(trimmedName, lowercaseEmail, password, phone);
    if (res.success) {
      navigate('/client/dashboard');
    } else {
      setTouched(prev => ({ ...prev, name: true, email: true, phone: true, password: true }));
      setErrors(prev => ({
        ...prev,
        ...(res.field ? { [res.field]: res.message } : {})
      }));
      showToast(res.message || 'Registration failed. Please try again.', 'error');
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-[#FAF6F0] flex flex-col justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8 font-poppins relative overflow-hidden">
      
      {/* Decorative luxury elements */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-[#C5A880]/5 blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-[#1C1C1C]/5 blur-[120px]" />

      <div className="w-full max-w-md mx-auto z-10 text-center">
        <Link to="/" className="inline-flex items-center justify-center gap-2 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[#1C1C1C] flex items-center justify-center font-bold text-[#C5A880] text-xl shadow-md">G</div>
          <span className="font-extrabold text-[#1C1C1C] tracking-tight text-xl">
            Glory Simon <span className="text-[#C5A880] font-light">Studio</span>
          </span>
        </Link>
        <h2 className="text-3xl font-extrabold text-[#1C1C1C] tracking-tight">
          Create Account
        </h2>
        <p className="mt-2 text-sm text-[#5C5C5C]">
          Or{' '}
          <Link to="/login" className="font-medium text-[#C5A880] hover:text-[#b4956c] transition-colors">
            sign in to your portal
          </Link>
        </p>
      </div>

      <div className="mt-8 w-full max-w-md mx-auto z-10">
        <div className="bg-white py-6 sm:py-8 px-4 sm:px-6 lg:px-8 shadow-xl rounded-2xl border border-[#C5A880]/10">

          <form className="space-y-5" onSubmit={handleSubmit} noValidate>
            
            {/* Full Name */}
            <div>
              <label htmlFor="name" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Full Name
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-4 w-4 text-[#C5A880]" />
                </div>
                <input
                  id="name"
                  type="text"
                  required
                  value={name}
                  onChange={handleNameChange}
                  onBlur={handleNameBlur}
                  autoComplete="name"
                  aria-invalid={touched.name && errors.name ? "true" : "false"}
                  aria-describedby={touched.name && errors.name ? "name-error" : undefined}
                  className={`${getInputClassName('name')} min-h-[48px]`}
                  placeholder="John Doe"
                />
              </div>
              {touched.name && errors.name && (
                <div id="name-error" role="alert" className="text-[11px] text-red-650 mt-1.5 transition-all duration-200 font-medium">
                  ✕ {errors.name}
                </div>
              )}
            </div>

            {/* Email Address */}
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
                  onChange={handleEmailChange}
                  onBlur={() => {
                    setTouched(prev => ({ ...prev, email: true }));
                    validateField('email', email);
                  }}
                  autoComplete="email"
                  aria-invalid={touched.email && errors.email ? "true" : "false"}
                  aria-describedby={touched.email ? "email-helper" : undefined}
                  className={`${getInputClassName('email')} min-h-[48px]`}
                  placeholder="john@example.com"
                />
              </div>
              {touched.email && (
                <div id="email-helper" role="alert" className={`text-[11px] mt-1.5 transition-all duration-200 font-medium ${errors.email ? 'text-red-650' : 'text-green-600'}`}>
                  {errors.email ? `✕ ${errors.email}` : '✓ Valid email'}
                </div>
              )}
            </div>

            {/* Phone Number */}
            <div>
              <label htmlFor="phone" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Phone Number
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-4 w-4 text-[#C5A880]" />
                </div>
                <input
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength="10"
                  required
                  value={phone}
                  onChange={handlePhoneChange}
                  onBlur={() => {
                    setTouched(prev => ({ ...prev, phone: true }));
                    validateField('phone', phone);
                  }}
                  autoComplete="tel"
                  aria-invalid={touched.phone && errors.phone ? "true" : "false"}
                  aria-describedby={touched.phone && errors.phone ? "phone-error" : undefined}
                  className={`${getInputClassName('phone')} min-h-[48px]`}
                  placeholder="7013218110"
                />
              </div>
              {touched.phone && errors.phone && (
                <div id="phone-error" role="alert" className="text-[11px] text-red-650 mt-1.5 transition-all duration-200 font-medium">
                  ✕ {errors.phone}
                </div>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Password
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-[#C5A880]" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={handlePasswordChange}
                  onPaste={handlePasswordPaste}
                  onBlur={() => {
                    setTouched(prev => ({ ...prev, password: true }));
                    validateField('password', password);
                  }}
                  autoComplete="new-password"
                  aria-invalid={touched.password && errors.password ? "true" : "false"}
                  aria-describedby={touched.password && errors.password ? "password-error" : undefined}
                  className={`${getInputClassName('password')} min-h-[48px]`}
                  placeholder="••••••••"
                />
                
                {/* Toggle Show/Hide Password */}
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => !prev)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#C5A880] hover:text-[#b4956c] transition-colors"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {touched.password && errors.password && (
                <div id="password-error" role="alert" className="text-[11px] text-red-650 mt-1.5 transition-all duration-200 font-medium">
                  ✕ {errors.password}
                </div>
              )}

              {/* Password Strength Meter */}
              {password && (
                <div className="mt-3 space-y-1.5 animate-fadeIn">
                  <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                    <span className="text-slate-500">Password Strength</span>
                    <span className={
                      strength === 'Strong' ? 'text-green-600' :
                      strength === 'Medium' ? 'text-amber-600' : 'text-red-500'
                    }>{strength}</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex gap-1">
                    <div className={`h-full flex-1 rounded-full transition-all duration-300 ${
                      password.length >= 8 ? (strength === 'Strong' ? 'bg-green-500' : strength === 'Medium' ? 'bg-amber-500' : 'bg-red-500') : 'bg-red-500'
                    }`}></div>
                    <div className={`h-full flex-1 rounded-full transition-all duration-300 ${
                      password.length >= 8 && (strength === 'Medium' || strength === 'Strong') ? (strength === 'Strong' ? 'bg-green-500' : strength === 'Medium' ? 'bg-amber-500' : 'bg-red-500') : 'bg-slate-200'
                    }`}></div>
                    <div className={`h-full flex-1 rounded-full transition-all duration-300 ${
                      password.length >= 8 && strength === 'Strong' ? 'bg-green-500' : 'bg-slate-200'
                    }`}></div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mt-2 text-[10px] text-slate-500">
                    <div className={/[a-z]/.test(password) ? 'text-green-600 font-bold' : ''}>
                      {/[a-z]/.test(password) ? '✓' : '•'} Lowercase letter
                    </div>
                    <div className={/[A-Z]/.test(password) ? 'text-green-600 font-bold' : ''}>
                      {/[A-Z]/.test(password) ? '✓' : '•'} Uppercase letter
                    </div>
                    <div className={/\d/.test(password) ? 'text-green-600 font-bold' : ''}>
                      {/\d/.test(password) ? '✓' : '•'} Numeric character
                    </div>
                    <div className={/[@$!%*?&#]/.test(password) ? 'text-green-600 font-bold' : ''}>
                      {/[@$!%*?&#]/.test(password) ? '✓' : '•'} Special character
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading || submitting || !isFormValid}
                className="w-full min-h-[48px] flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold uppercase tracking-wider text-white bg-[#1C1C1C] hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-900 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading || submitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    Create Account
                    <ArrowRight className="w-4 h-4 text-[#C5A880]" />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center text-xs text-slate-400">
            By creating an account, you agree to our Terms of Service and Privacy Policy.
          </div>
        </div>
      </div>
    </div>
  );
};
