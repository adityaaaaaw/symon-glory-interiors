import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Calendar as CalendarIcon, Clock, MapPin, CheckCircle, Star, ArrowRight, Clipboard } from 'lucide-react';

export const BookingForm = () => {
  const { bookSiteVisit, user, setCurrentTab } = useApp();
  
  // Form fields
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    property_type: 'Apartment',
    address: '',
    preferred_date: '',
    preferred_slot: '09:00 AM - 12:00 PM',
    notes: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState(null);

  // Pre-fill user data if logged in as client
  useEffect(() => {
    if (user && user.role === 'client') {
      setFormData(prev => ({
        ...prev,
        name: user.name,
        phone: user.phone || '',
        email: user.email
      }));
    }
  }, [user]);

  // Set default date to tomorrow
  useEffect(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setFormData(prev => ({
      ...prev,
      preferred_date: tomorrow.toISOString().split('T')[0]
    }));
  }, []);

  const propertyOptions = ['Apartment', 'Villa', 'Penthouse', 'Office', 'Retail Space', 'Modular Kitchen', 'Renovation'];
  const slotOptions = ['09:00 AM - 12:00 PM', '12:00 PM - 03:00 PM', '03:00 PM - 06:00 PM'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      alert('Please log in to the Client Portal first to schedule site visits.');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const res = await bookSiteVisit(formData);
      if (res) {
        setConfirmedBooking(res);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to book site visit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ------------------------------------
  // BOOKING CONFIRMATION SCREEN
  // ------------------------------------
  if (confirmedBooking) {
    const isSuggested = confirmedBooking.assigned_to_id !== null;
    return (
      <div className="max-w-2xl mx-auto py-16 px-6">
        <div className="bg-white border border-borderColor rounded-3xl p-8 md:p-12 shadow-premium space-y-8 animate-in zoom-in-95 duration-200">
          
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto text-green-600">
              <CheckCircle className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-accentGold bg-accentGold/10 px-3 py-1 rounded-full">
                Booking Successful
              </span>
              <h2 className="font-poppins text-2xl md:text-3xl font-bold text-primary mt-2">
                Consultation Request Logged
              </h2>
            </div>
          </div>

          {/* Ticket Body with unique Booking ID */}
          <div className="border border-borderColor/60 rounded-2xl overflow-hidden bg-bgBase/20">
            {/* Header banner */}
            <div className="bg-primary text-white px-6 py-4 flex items-center justify-between border-b border-borderColor">
              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Booking ID</span>
                <span className="block font-inter font-bold text-sm text-accentGold">{confirmedBooking.booking_id_str}</span>
              </div>
              <Clipboard className="w-4 h-4 text-slate-400" />
            </div>

            {/* Details grid */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 text-xs leading-relaxed border-b border-borderColor/60">
              <div className="space-y-1">
                <span className="block text-secondary font-medium uppercase tracking-wider text-[10px]">Client Name</span>
                <span className="font-semibold text-primary text-sm">{confirmedBooking.client_name}</span>
              </div>
              <div className="space-y-1">
                <span className="block text-secondary font-medium uppercase tracking-wider text-[10px]">Contact Phone</span>
                <span className="font-semibold text-primary text-sm">{confirmedBooking.phone}</span>
              </div>
              <div className="space-y-1">
                <span className="block text-secondary font-medium uppercase tracking-wider text-[10px]">Date & Time Slot</span>
                <span className="font-semibold text-primary text-sm">
                  {confirmedBooking.preferred_date} • {confirmedBooking.preferred_slot}
                </span>
              </div>
              <div className="space-y-1">
                <span className="block text-secondary font-medium uppercase tracking-wider text-[10px]">Property Type</span>
                <span className="font-semibold text-primary text-sm">{confirmedBooking.property_type}</span>
              </div>
              <div className="md:col-span-2 space-y-1">
                <span className="block text-secondary font-medium uppercase tracking-wider text-[10px]">Site Address</span>
                <span className="font-medium text-primary">{confirmedBooking.address}</span>
              </div>
            </div>

            {/* AI Suggested Assignment */}
            <div className="p-6 space-y-4">
              <span className="block text-secondary font-medium uppercase tracking-wider text-[10px]">Smart System Recommendation</span>
              
              {isSuggested ? (
                <div className="p-4 border border-borderColor rounded-xl bg-white space-y-3 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-accentGold/20 font-bold flex items-center justify-center text-accentGold text-sm">
                      {confirmedBooking.assigned_to_role === 'designer' ? 'ID' : 'SE'}
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-accentGold uppercase tracking-wider block">
                        Recommended {confirmedBooking.assigned_to_role === 'designer' ? 'Designer' : 'Site Engineer'}
                      </span>
                      <span className="font-semibold text-primary text-sm">
                        {confirmedBooking.assigned_to_role === 'designer' ? 'Ananya Iyer (Designer)' : 'Amit Patel (Site Engineer)'}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-secondary italic bg-bgBase/40 p-2.5 rounded-lg border border-borderColor/40">
                    "{confirmedBooking.assignment_reason}"
                  </p>
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">No available local professional matches for this slot. Placed in waitlist for administrator review.</p>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-4 border-t border-borderColor/60">
            <button
              onClick={() => { setConfirmedBooking(null); setCurrentTab('portal'); }}
              className="px-6 py-3 text-xs font-bold bg-primary text-white rounded-xl hover:bg-primary/95 transition-colors uppercase tracking-wider"
            >
              Track Booking Status
            </button>
          </div>

        </div>
      </div>
    );
  }

  // ------------------------------------
  // BOOKING REQUEST FORM
  // ------------------------------------
  return (
    <div className="max-w-4xl mx-auto py-16 px-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
      
      {/* Form Area */}
      <div className="lg:col-span-2 bg-white border border-borderColor rounded-2xl p-6 md:p-8 shadow-premium space-y-6">
        <div className="border-b border-borderColor pb-4">
          <h2 className="font-poppins text-xl font-bold text-primary">
            Request Site Consultation Visit
          </h2>
          <p className="text-xs text-secondary mt-1">
            Book a site assessment. Our system analyzes availability and workloads instantly.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Client Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-secondary">Full Name</label>
              <input
                type="text"
                required
                className="w-full px-4 py-2.5 bg-bgBase text-xs text-primary border border-borderColor rounded-xl outline-none focus:border-accentGold"
                placeholder="John Doe"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-secondary">Contact Phone</label>
              <input
                type="text"
                required
                className="w-full px-4 py-2.5 bg-bgBase text-xs text-primary border border-borderColor rounded-xl outline-none focus:border-accentGold"
                placeholder="+91 99000 88888"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              />
            </div>
            <div className="md:col-span-2 space-y-1">
              <label className="text-xs font-semibold text-secondary">Email Address</label>
              <input
                type="email"
                required
                className="w-full px-4 py-2.5 bg-bgBase text-xs text-primary border border-borderColor rounded-xl outline-none focus:border-accentGold"
                placeholder="name@example.com"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
          </div>

          {/* Property Type Grid */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-secondary">Property Type</label>
            <div className="flex flex-wrap gap-2">
              {propertyOptions.map(opt => (
                <button
                  type="button"
                  key={opt}
                  onClick={() => setFormData(prev => ({ ...prev, property_type: opt }))}
                  className={`py-2 px-3.5 text-xs font-semibold rounded-lg border transition-all ${
                    formData.property_type === opt
                      ? 'border-accentGold bg-accentGold/5 text-accentGold'
                      : 'border-borderColor bg-white text-secondary hover:bg-bgBase'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Date & Time Slot Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-secondary font-poppins">Preferred Date</label>
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-3 w-4 h-4 text-accentGold" />
                <input
                  type="date"
                  required
                  className="w-full pl-9 pr-4 py-2.5 bg-bgBase text-xs text-primary border border-borderColor rounded-xl outline-none focus:border-accentGold"
                  value={formData.preferred_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, preferred_date: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-secondary font-poppins">Preferred Slot</label>
              <div className="relative">
                <Clock className="absolute left-3 top-3 w-4 h-4 text-accentGold" />
                <select
                  className="w-full pl-9 pr-4 py-2.5 bg-bgBase text-xs text-primary border border-borderColor rounded-xl outline-none focus:border-accentGold"
                  value={formData.preferred_slot}
                  onChange={(e) => setFormData(prev => ({ ...prev, preferred_slot: e.target.value }))}
                >
                  {slotOptions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Location Picker & Address input */}
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-secondary">Inspection Site Address</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 w-4 h-4 text-accentGold" />
                <textarea
                  required
                  rows="3"
                  className="w-full pl-9 pr-4 py-2.5 bg-bgBase text-xs text-primary border border-borderColor rounded-xl outline-none resize-none placeholder-secondary focus:border-accentGold"
                  placeholder="Enter full address, sector, landmark details..."
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* Requirements Textarea */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-secondary">Project Notes / Comments</label>
            <textarea
              rows="3"
              className="w-full p-3 bg-bgBase text-xs text-primary border border-borderColor rounded-xl outline-none resize-none placeholder-secondary focus:border-accentGold"
              placeholder="Any style preferences, dimensional restrictions, or specific lighting coves..."
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 bg-accentGold text-white hover:bg-accentGold/90 text-xs font-bold rounded-xl shadow-lg transition-colors uppercase tracking-wider"
          >
            {isSubmitting ? 'Checking availabilities...' : 'Schedule site visit consultation'}
          </button>
        </form>
      </div>

      {/* Utilization & Helper Sidebar */}
      <div className="space-y-6">
        <div className="bg-white border border-borderColor rounded-2xl p-6 shadow-premium space-y-4">
          <h3 className="font-poppins text-sm font-semibold text-primary border-b border-borderColor pb-2">
            Why Auto-Assignment?
          </h3>
          <ul className="space-y-4 text-[11px] text-secondary leading-relaxed">
            <li className="flex gap-2.5 items-start">
              <span className="w-1.5 h-1.5 rounded-full bg-accentGold mt-1.5 shrink-0"></span>
              <span><strong>Workload Balance</strong>: We match you with professionals containing lower active workloads to guarantee dedicated attention.</span>
            </li>
            <li className="flex gap-2.5 items-start">
              <span className="w-1.5 h-1.5 rounded-full bg-accentGold mt-1.5 shrink-0"></span>
              <span><strong>Local Experts</strong>: Auto-assignment parses regional proximity to match inspectors serving your exact district.</span>
            </li>
            <li className="flex gap-2.5 items-start">
              <span className="w-1.5 h-1.5 rounded-full bg-accentGold mt-1.5 shrink-0"></span>
              <span><strong>Availability First</strong>: Engine filters out busy or on-leave site inspectors to prevent slot conflicts.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
