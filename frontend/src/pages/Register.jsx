import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

const Register = () => {
  const { register } = useAuth();
  const { addToast } = useNotification();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Form states
  const [fullName, setFullName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');

  // Helper for displaying phone number: +91 XXXXX XXXXX
  const formatPhoneDisplay = (raw) => {
    if (!raw) return '';
    const digits = raw.replace(/\D/g, '').slice(0, 10);
    if (digits.length === 0) return '';
    if (digits.length <= 5) {
      return `+91 ${digits}`;
    }
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  };

  // Change handler to format phone and keep cursor position stable
  const handleMobileChange = (e) => {
    const input = e.target;
    const originalValue = input.value;
    const selectionStart = input.selectionStart;

    let prefixLen = 0;
    if (originalValue.startsWith('+91 ')) {
      prefixLen = 4;
    } else if (originalValue.startsWith('+91')) {
      prefixLen = 3;
    } else if (originalValue.startsWith('91') && originalValue.replace(/\D/g, '').length > 10) {
      prefixLen = 2;
    }

    let digitsBeforeCursor = 0;
    for (let i = prefixLen; i < selectionStart; i++) {
      if (/\d/.test(originalValue[i])) {
        digitsBeforeCursor++;
      }
    }

    let val = originalValue;
    if (val.startsWith('+91')) {
      val = val.substring(3);
    } else if (val.startsWith('91') && val.replace(/\D/g, '').length > 10) {
      val = val.substring(2);
    }
    const rawDigits = val.replace(/\D/g, '').slice(0, 10);

    setMobileNumber(rawDigits);

    const formatted = formatPhoneDisplay(rawDigits);

    setTimeout(() => {
      let newCursorPos = 0;
      if (rawDigits.length > 0) {
        if (digitsBeforeCursor === 0) {
          newCursorPos = 4;
        } else if (digitsBeforeCursor <= 5) {
          newCursorPos = 4 + digitsBeforeCursor;
        } else {
          newCursorPos = 5 + digitsBeforeCursor;
        }
      }
      input.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  // Password strength meter rules
  const getPasswordStrength = (pwd) => {
    if (!pwd) return { score: 0, label: 'None', color: 'var(--color-subtle)' };
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[a-z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    
    switch (score) {
      case 1: return { score: 1, label: 'Weak', color: 'var(--color-danger)' };
      case 2: return { score: 2, label: 'Fair', color: 'var(--color-warning)' };
      case 3: return { score: 3, label: 'Good', color: 'var(--color-info)' };
      case 4: return { score: 4, label: 'Strong', color: 'var(--color-success)' };
      default: return { score: 0, label: 'None', color: 'var(--color-subtle)' };
    }
  };

  const strength = getPasswordStrength(password);

  const validateStep1 = () => {
    if (!fullName || fullName.trim().length < 2) {
      setError('Please enter your full name (minimum 2 characters).');
      return false;
    }
    if (!mobileNumber || !/^[6-9]\d{9}$/.test(mobileNumber)) {
      setError('Please enter a valid 10-digit Indian mobile number.');
      return false;
    }
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address.');
      return false;
    }
    setError('');
    return true;
  };

  const handleNext = () => {
    if (validateStep1()) {
      setStep(2);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (strength.score < 4) {
      setError('Password must contain uppercase, lowercase, and numeric characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!city || !pincode) {
      setError('Please enter your city and pincode.');
      return;
    }

    setLoading(true);
    const payload = {
      full_name: fullName.trim(),
      mobile_number: mobileNumber.trim(),
      email: email.trim(),
      password,
      address: address.trim(),
      city: city.trim(),
      pincode: pincode.trim(),
    };
    console.log('[Register] Submitting registration payload:', payload);

    try {
      const res = await register(payload);
      console.log('[Register] API Response:', res);

      if (res && res.success) {
        setSuccess(true);
        addToast('Registration successful! Welcome.', 'success');
        setTimeout(() => {
          navigate('/client');
        }, 2000);
      } else {
        console.error('[Register] Failed response status or message:', res);
        setError(res.message || 'Registration failed.');
      }
    } catch (err) {
      console.error('[Register] Registration exception caught:', {
        message: err.message,
        status: err.status,
        data: err.data
      });
      setError(err.data?.message || err.message || 'An error occurred during registration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page-container flex min-h-screen flex-col md:flex-row bg-bg">
      {/* Left Branding Panel */}
      <div 
        className="register-branding-panel flex-1 flex flex-col justify-between p-8 md:p-16 text-left relative overflow-hidden bg-surface"
        style={{
          background: 'linear-gradient(135deg, hsl(30, 12%, 8%) 0%, hsl(30, 8%, 14%) 100%)',
          borderRight: '1px solid var(--color-border)',
          flex: '1.2'
        }}
      >
        <div className="brand-logo-area">
          <div className="text-gold font-bold mb-2" style={{ fontFamily: 'var(--font-heading)', fontSize: '80px', lineHeight: '1' }}>
            GS
          </div>
          <h1 className="heading-xl text-cream font-bold m-0" style={{ letterSpacing: '2px' }}>GLORY SIMON</h1>
          <p className="text-muted uppercase tracking-widest text-sm m-0">Interiors</p>
          <div className="gold-divider w-24 h-1 my-6" style={{ background: 'var(--color-gold)' }}></div>
        </div>

        <div className="brand-tagline-area max-w-lg mb-8 md:mb-0">
          <p className="heading-md text-cream italic mb-8" style={{ fontWeight: '300' }}>
            "Start your interior design journey today with our automated booking and assignment system."
          </p>
        </div>

        <div className="brand-footer text-xs text-subtle">
          © {new Date().getFullYear()} Glory Simon Interiors. All rights reserved.
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="register-card-panel flex-1 flex items-center justify-center p-6 md:p-12">
        <div className="card w-full max-w-md p-8 bg-surface-2 border border-border rounded-2xl shadow-2xl animate-slide-in">
          {success ? (
            <div className="text-center py-8">
              <div className="success-icon text-gold text-5xl mb-4">✓</div>
              <h2 className="heading-lg font-bold text-cream mb-2">Registration Successful!</h2>
              <p className="text-muted text-sm">Logging you in and redirecting to dashboard...</p>
              <div className="spinner sm mx-auto mt-4"></div>
            </div>
          ) : (
            <>
              <h2 className="heading-lg font-bold text-cream mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
                Create Client Account
              </h2>
              <p className="text-muted text-sm mb-4">Step {step} of 2 — {step === 1 ? 'Personal details' : 'Security & Location'}</p>

              {/* Progress bar */}
              <div className="progress-bar-container bg-surface w-full h-1 rounded mb-6 overflow-hidden">
                <div 
                  className="progress-bar-fill h-full bg-gold transition-all duration-300"
                  style={{ width: `${step * 50}%`, background: 'var(--color-gold)' }}
                ></div>
              </div>

              {error && (
                <div className="text-danger bg-danger-bg border border-danger text-sm rounded p-3 mb-4 flex gap-2 items-center">
                  <span>✗</span>
                  <span>{error}</span>
                </div>
              )}

              {step === 1 ? (
                /* Step 1: Personal Info */
                <div className="flex flex-col gap-4">
                  <div className="form-group">
                    <label className="form-label" htmlFor="reg-name">Full Name</label>
                    <input
                      id="reg-name"
                      type="text"
                      className="form-input"
                      placeholder="John Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="reg-mobile">Mobile Number (Indian)</label>
                    <input
                      id="reg-mobile"
                      type="tel"
                      className="form-input"
                      placeholder="+91 98765 43210"
                      maxLength="14"
                      value={formatPhoneDisplay(mobileNumber)}
                      onChange={handleMobileChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="reg-email">Email Address</label>
                    <input
                      id="reg-email"
                      type="email"
                      className="form-input"
                      placeholder="john@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  <button type="button" className="btn btn-primary w-full py-3 mt-4" onClick={handleNext}>
                    Continue &rarr;
                  </button>
                </div>
              ) : (
                /* Step 2: Location and Security */
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <div className="form-group">
                    <label className="form-label" htmlFor="reg-password">Password</label>
                    <input
                      id="reg-password"
                      type="password"
                      className="form-input"
                      placeholder="At least 8 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    {password && (
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-xs text-muted">Strength: <span style={{ color: strength.color, fontWeight: 'bold' }}>{strength.label}</span></span>
                        <div className="flex gap-1">
                          {Array.from({ length: 4 }).map((_, i) => (
                            <div 
                              key={i} 
                              className="w-4 h-1 rounded" 
                              style={{ 
                                backgroundColor: i < strength.score ? strength.color : 'var(--color-border)' 
                              }}
                            ></div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="reg-confirm">Confirm Password</label>
                    <input
                      id="reg-confirm"
                      type="password"
                      className="form-input"
                      placeholder="Repeat password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="reg-address">Street Address (Optional)</label>
                    <textarea
                      id="reg-address"
                      className="form-textarea"
                      placeholder="Apartment, building, street..."
                      rows="2"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                    ></textarea>
                  </div>

                  <div className="grid grid-cols-2 gap-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="form-group">
                      <label className="form-label" htmlFor="reg-city">City</label>
                      <input
                        id="reg-city"
                        type="text"
                        className="form-input"
                        placeholder="e.g. Mumbai"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="reg-pincode">Pincode</label>
                      <input
                        id="reg-pincode"
                        type="text"
                        className="form-input"
                        placeholder="400001"
                        maxLength="6"
                        value={pincode}
                        onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                        required
                      />
                    </div>
                  </div>

                  <div className="flex justify-between gap-4 mt-4">
                    <button type="button" className="btn btn-secondary w-full" onClick={() => setStep(1)} disabled={loading}>
                      &larr; Back
                    </button>
                    <button type="submit" className="btn btn-primary w-full" disabled={loading}>
                      {loading ? 'Submitting...' : 'Register'}
                    </button>
                  </div>
                </form>
              )}

              <p className="text-center text-sm text-muted mt-6 m-0">
                Already registered?{' '}
                <Link to="/login" className="text-gold font-semibold decoration-none">
                  Login Here
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Register;
