import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Calendar, 
  MapPin, 
  Clock, 
  Sparkles, 
  Download, 
  User, 
  CheckCircle2, 
  Clock3, 
  AlertCircle, 
  XCircle, 
  Compass, 
  ChevronRight, 
  Bell, 
  Inbox, 
  Check,
  FileText,
  AlertTriangle,
  Upload,
  Layers
} from 'lucide-react';

const OPERATIONAL_WORKFLOW = [
  'Draft', 
  'Pending', 
  'Confirmed', 
  'Assigned', 
  'Designer Accepted', 
  'Site Visit Scheduled', 
  'Site Visit In Progress', 
  'Site Visit Completed', 
  'Quotation Sent', 
  'Quotation Approved', 
  'Project Started', 
  'Project Completed'
];

export const ClientDashboard = () => {
  const { 
    bookings, 
    notifications, 
    markNotificationRead, 
    getBookingActivities, 
    getVisitReport, 
    getQuotation,
    updateQuotationStatus,
    uploadBookingMedia,
    user, 
    cancelBooking,
    rescheduleBooking,
    fetchData,
    submitVisitReport,
    updateProfessionalAvailability,
    updateBookingStatus,
    professionals,
    showToast
  } = useApp();

  const [activeTab, setActiveTab] = useState('bookings'); // 'bookings', 'tracking', 'estimates', 'reports', 'notifications'
  const [selectedBookingId, setSelectedBookingId] = useState(null);
  const [activities, setActivities] = useState([]);
  const [report, setReport] = useState(null);
  const [quotation, setQuotation] = useState(null);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [quotationLoading, setQuotationLoading] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  // Reschedule state variables
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [selectedRescheduleId, setSelectedRescheduleId] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleSlot, setRescheduleSlot] = useState('');

  // Professional workspace states
  const [reportSummary, setReportSummary] = useState('');
  const [reportRecs, setReportRecs] = useState('');
  const [reportMaterials, setReportMaterials] = useState('');
  const [reportFollowUps, setReportFollowUps] = useState('');
  const [reportImageFile, setReportImageFile] = useState(null);
  const [submittingReport, setSubmittingReport] = useState(false);
  const [profActiveTab, setProfActiveTab] = useState('assignments'); // 'assignments', 'profile', 'notifications'

  // Set default selected booking on load
  useEffect(() => {
    if (bookings.length > 0 && !selectedBookingId) {
      setSelectedBookingId(bookings[0].id);
    }
  }, [bookings, selectedBookingId]);

  // Fetch activities, report and quotation whenever selected booking changes
  const fetchBookingDetails = async () => {
    if (!selectedBookingId) return;

    setActivitiesLoading(true);
    setReportLoading(true);
    setQuotationLoading(true);

    try {
      const acts = await getBookingActivities(selectedBookingId);
      setActivities(acts);
    } catch (err) {
      console.error('Error fetching activities:', err);
    } finally {
      setActivitiesLoading(false);
    }

    try {
      const rep = await getVisitReport(selectedBookingId);
      setReport(rep);
    } catch (err) {
      console.error('Error fetching report:', err);
    } finally {
      setReportLoading(false);
    }

    try {
      const q = await getQuotation(selectedBookingId);
      setQuotation(q);
    } catch (err) {
      console.error('Error fetching quotation:', err);
    } finally {
      setQuotationLoading(false);
    }
  };

  useEffect(() => {
    if (selectedBookingId) {
      fetchBookingDetails();
    }
  }, [selectedBookingId]);

  const activeBooking = bookings.find(b => b.id === selectedBookingId) || bookings[0];

  const handleRescheduleSubmit = async (e) => {
    e.preventDefault();
    if (!rescheduleDate || !rescheduleSlot) return;
    try {
      await rescheduleBooking(selectedRescheduleId, rescheduleDate, rescheduleSlot);
      setRescheduleModalOpen(false);
      fetchBookingDetails();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCancelBooking = async () => {
    if (!activeBooking) return;
    if (window.confirm('Are you sure you want to cancel this site visit request?')) {
      try {
        await cancelBooking(activeBooking.id);
        fetchBookingDetails();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  const clientName = activeBooking?.client_name || user?.name || '';
  const clientEmail = activeBooking?.email || user?.email || '';
  const clientPhone = activeBooking?.phone || user?.phone || '';

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Pending':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-200/50">
            <Clock3 className="w-3.5 h-3.5" /> Pending Approval
          </span>
        );
      case 'Assigned':
      case 'Designer Accepted':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-purple-50 text-purple-700 border border-purple-200/50">
            <User className="w-3.5 h-3.5" /> Designer Assigned
          </span>
        );
      case 'Site Visit Scheduled':
      case 'Site Visit In Progress':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-200/50">
            <Calendar className="w-3.5 h-3.5" /> Visit Scheduled
          </span>
        );
      case 'Site Visit Completed':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-green-50 text-green-700 border border-green-200/50">
            <CheckCircle2 className="w-3.5 h-3.5" /> Visit Completed
          </span>
        );
      case 'Quotation Sent':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/50">
            <FileText className="w-3.5 h-3.5" /> Estimate Sent
          </span>
        );
      case 'Quotation Approved':
      case 'Project Started':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-teal-50 text-teal-700 border border-teal-200/50">
            <Layers className="w-3.5 h-3.5" /> Project Started
          </span>
        );
      case 'Project Completed':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/50">
            <CheckCircle2 className="w-3.5 h-3.5" /> Delivered
          </span>
        );
      case 'Cancelled':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-red-50 text-red-700 border border-red-200/50">
            <XCircle className="w-3.5 h-3.5" /> Cancelled
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-700">
            {status}
          </span>
        );
    }
  };

  const getStepStatus = (status, stepName) => {
    if (status === 'Cancelled') {
      return 'cancelled';
    }
    const currentIdx = OPERATIONAL_WORKFLOW.indexOf(status);
    const stepIdx = OPERATIONAL_WORKFLOW.indexOf(stepName);

    if (currentIdx >= stepIdx) {
      return 'completed';
    }
    if (currentIdx + 1 === stepIdx) {
      return 'active';
    }
    return 'upcoming';
  };

  const isProfessional = user && (user.role === 'designer' || user.role === 'engineer');

  const handleAcceptAssignment = async (bookingId) => {
    try {
      await updateBookingStatus(bookingId, 'Designer Accepted');
      await fetchData();
      fetchBookingDetails();
    } catch (err) {
      console.error(err);
    }
  };

  const handleScheduleVisit = async (bookingId) => {
    try {
      await updateBookingStatus(bookingId, 'Site Visit Scheduled');
      await fetchData();
      fetchBookingDetails();
    } catch (err) {
      console.error(err);
    }
  };

  const handleStartVisit = async (bookingId) => {
    try {
      await updateBookingStatus(bookingId, 'Site Visit In Progress');
      await fetchData();
      fetchBookingDetails();
    } catch (err) {
      console.error(err);
    }
  };

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    if (!reportSummary) {
      showToast('Summary is required.', 'error');
      return;
    }
    const formData = new FormData();
    formData.append('summary', reportSummary);
    formData.append('recommendations', reportRecs);
    formData.append('follow_ups', reportFollowUps);
    formData.append('material_suggestions', reportMaterials);
    if (reportImageFile) {
      formData.append('image', reportImageFile);
    }
    
    try {
      setSubmittingReport(true);
      await submitVisitReport(activeBooking.id, formData);
      setReportSummary('');
      setReportRecs('');
      setReportMaterials('');
      setReportFollowUps('');
      setReportImageFile(null);
      await fetchData();
      fetchBookingDetails();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingReport(false);
    }
  };

  const handleAvailabilityChange = async (availability) => {
    try {
      const roleName = user.role === 'designer' ? 'designer' : 'engineer';
      const profObj = professionals.find(p => p.email === user.email);
      if (profObj) {
        await updateProfessionalAvailability(roleName, profObj.id, availability);
      } else {
        showToast('Could not resolve professional record.', 'error');
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (isProfessional) {
    const profObj = professionals.find(p => p.email === user.email) || {
      name: user.name,
      email: user.email,
      rating: 5.0,
      region: 'Bengaluru Core',
      workload: bookings.filter(b => b.status !== 'Visit Completed' && b.status !== 'Cancelled').length,
      experience: 5,
      availability: 'Available'
    };

    return (
      <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 space-y-8 animate-fadeIn font-poppins text-primary">
        
        {/* Top Profile Banner for Professional Workspace */}
        <div className="flex flex-wrap items-center justify-between gap-6 p-4 sm:p-6 bg-white border border-borderColor rounded-2xl shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-accentGold/5 rounded-full blur-3xl pointer-events-none"></div>
          <div className="flex items-center gap-3 sm:gap-4 relative z-10">
            <div className="w-16 h-16 rounded-full border-2 border-accentGold/60 bg-bgBase flex items-center justify-center font-bold font-poppins text-accentGold text-xl shadow-inner overflow-hidden">
              {profObj.avatar ? (
                <img src={profObj.avatar} alt={profObj.name} className="w-full h-full object-cover" />
              ) : (
                getInitials(profObj.name)
              )}
            </div>
            <div>
              <span className="text-[10px] font-bold text-accentGold uppercase tracking-widest bg-accentGold/10 px-2 py-0.5 rounded">
                Glory Simon Studio Staff Portal
              </span>
              <h2 className="font-poppins text-xl font-bold mt-1">{profObj.name}</h2>
              <p className="text-xs text-secondary mt-0.5">
                {user.role === 'designer' ? 'Lead Interior Designer' : 'Site Engineer'} • {profObj.region} • {profObj.experience} Yrs Exp • {profObj.rating}★
              </p>
            </div>
          </div>
          
          {/* Availability Switcher */}
          <div className="flex items-center gap-3 relative z-10">
            <span className="text-xs font-semibold text-secondary">My Status:</span>
            <select
              value={profObj.availability || 'Available'}
              onChange={(e) => handleAvailabilityChange(e.target.value)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl border outline-none cursor-pointer ${
                profObj.availability === 'Available'
                  ? 'bg-green-50 border-green-200 text-green-700'
                  : profObj.availability === 'Busy'
                    ? 'bg-amber-50 border-amber-200 text-amber-700'
                    : 'bg-red-50 border-red-200 text-red-700'
              }`}
            >
              <option value="Available">Available</option>
              <option value="Busy">Busy</option>
              <option value="On Leave">On Leave</option>
            </select>
          </div>
        </div>

        {/* Mobile Horizontal Tabs Row */}
        <div className="flex lg:hidden overflow-x-auto gap-2 pb-3 px-1 border-b border-borderColor scrollbar-none snap-x snap-mandatory">
          <button 
            onClick={() => setProfActiveTab('assignments')} 
            className={`snap-start shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              profActiveTab === 'assignments' ? 'bg-primary text-white' : 'bg-bgSurface border border-borderColor text-secondary'
            }`}
          >
            My Assignments ({bookings.length})
          </button>
          <button 
            onClick={() => setProfActiveTab('profile')} 
            className={`snap-start shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              profActiveTab === 'profile' ? 'bg-primary text-white' : 'bg-bgSurface border border-borderColor text-secondary'
            }`}
          >
            Profile & Stats
          </button>
          <button 
            onClick={() => setProfActiveTab('notifications')} 
            className={`snap-start shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              profActiveTab === 'notifications' ? 'bg-primary text-white' : 'bg-bgSurface border border-borderColor text-secondary'
            }`}
          >
            Notifications {notifications.filter(n => !n.is_read).length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-accentGold text-white text-[8px]">
                {notifications.filter(n => !n.is_read).length}
              </span>
            )}
          </button>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 sm:gap-8">
          
          {/* Sidebar Navigation */}
          <div className="hidden lg:block space-y-4 lg:col-span-1">
            <div className="bg-white border border-borderColor rounded-2xl p-4 space-y-1">
              <span className="text-[9px] font-bold text-secondary/50 uppercase tracking-widest px-3 block mb-2">Staff Operations</span>
              
              <button
                onClick={() => setProfActiveTab('assignments')}
                className={`w-full text-left px-4 py-3 rounded-xl text-xs font-semibold flex items-center justify-between transition-all duration-200 ${
                  profActiveTab === 'assignments'
                    ? 'bg-primary text-white shadow-sm font-bold'
                    : 'text-secondary hover:bg-bgBase'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Compass className="w-4 h-4" /> My Assignments
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] ${
                  profActiveTab === 'assignments' ? 'bg-white/20 text-white' : 'bg-bgBase text-secondary'
                }`}>{bookings.length}</span>
              </button>

              <button
                onClick={() => setProfActiveTab('profile')}
                className={`w-full text-left px-4 py-3 rounded-xl text-xs font-semibold flex items-center justify-between transition-all duration-200 ${
                  profActiveTab === 'profile'
                    ? 'bg-primary text-white shadow-sm font-bold'
                    : 'text-secondary hover:bg-bgBase'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <User className="w-4 h-4" /> Profile & Stats
                </span>
              </button>

              <button
                onClick={() => setProfActiveTab('notifications')}
                className={`w-full text-left px-4 py-3 rounded-xl text-xs font-semibold flex items-center justify-between transition-all duration-200 ${
                  profActiveTab === 'notifications'
                    ? 'bg-primary text-white shadow-sm font-bold'
                    : 'text-secondary hover:bg-bgBase'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Bell className="w-4 h-4" /> Notifications
                </span>
                {notifications.filter(n => !n.is_read).length > 0 && (
                  <span className="px-2 py-0.5 rounded bg-[#C5A880] text-white text-[9px] font-bold">
                    {notifications.filter(n => !n.is_read).length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* TAB: ASSIGNMENTS */}
            {profActiveTab === 'assignments' && (
              <div className="space-y-6">
                
                {/* Header */}
                <div className="border-b border-borderColor pb-4 flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-bold text-primary">Active Site Assignments</h3>
                    <p className="text-xs text-secondary mt-0.5">Manage space layout visits, technical surveys, and client briefings.</p>
                  </div>
                </div>

                {bookings.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    
                    {/* Left assignments list (1 column) */}
                    <div className="md:col-span-1 space-y-4">
                      {bookings.map((b) => (
                        <div
                          key={b.id}
                          onClick={() => setSelectedBookingId(b.id)}
                          className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer relative hover:border-[#C5A880]/65 ${
                            selectedBookingId === b.id
                              ? 'border-accentGold bg-accentGold/[0.02] shadow-sm'
                              : 'border-borderColor bg-white'
                          }`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-[9px] font-mono font-bold text-accentGold">{b.booking_id_str}</span>
                            <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase ${
                              b.status === 'Visit Completed' || b.status === 'Site Visit Completed' || b.status === 'Quotation Sent' || b.status === 'Quotation Approved' || b.status === 'Project Started' || b.status === 'Project Completed'
                                ? 'bg-green-50 text-green-700'
                                : b.status === 'Assigned'
                                  ? 'bg-purple-50 text-purple-700'
                                  : 'bg-blue-50 text-blue-700'
                            }`}>{b.status}</span>
                          </div>
                          <h4 className="font-bold text-xs text-primary">{b.property_type}</h4>
                          <p className="text-[11px] text-secondary mt-1 truncate">{b.address}</p>
                          <div className="flex justify-between items-center text-[10px] text-secondary/60 mt-3 pt-2 border-t border-borderColor/40">
                            <span>{b.preferred_date}</span>
                            <span>{b.preferred_slot.split(' - ')[0]}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Right detail workspace (2 columns) */}
                    <div className="md:col-span-2 space-y-6">
                      {activeBooking ? (
                        <div className="bg-white border border-borderColor rounded-2xl p-6 shadow-sm space-y-6">
                          
                          {/* Title header */}
                          <div className="flex justify-between items-start border-b border-borderColor/50 pb-4">
                            <div>
                              <span className="text-[10px] font-mono font-bold text-accentGold uppercase block">{activeBooking.booking_id_str}</span>
                              <h3 className="font-bold text-base text-primary mt-0.5">{activeBooking.property_type} consultation</h3>
                            </div>
                            <span className="px-3 py-1 text-xs font-bold rounded-full bg-slate-100 text-slate-700">{activeBooking.status}</span>
                          </div>

                          {/* Client details grid */}
                          <div className="grid grid-cols-2 gap-4 text-xs bg-bgBase p-4 rounded-xl border border-borderColor/30">
                            <div>
                              <span className="text-[9px] text-secondary/50 uppercase block">Client Name</span>
                              <span className="font-bold text-primary">{activeBooking.client_name}</span>
                            </div>
                            <div>
                              <span className="text-[9px] text-secondary/50 uppercase block">Contact Phone</span>
                              <span className="font-mono text-primary">{activeBooking.phone}</span>
                            </div>
                            <div className="col-span-2 border-t border-borderColor/30 pt-2 mt-2">
                              <span className="text-[9px] text-secondary/50 uppercase block">Site Visit Location</span>
                              <span className="text-secondary leading-relaxed block mt-0.5">{activeBooking.address}</span>
                            </div>
                          </div>

                          {/* Client notes */}
                          {activeBooking.notes && (
                            <div className="space-y-1.5 text-xs">
                              <span className="text-[10px] font-bold text-secondary uppercase tracking-wider block">Client Design Directives</span>
                              <p className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl text-secondary leading-relaxed italic font-light">
                                "{activeBooking.notes}"
                              </p>
                            </div>
                          )}

                          {/* Client uploaded reference media */}
                          {activeBooking.media && activeBooking.media.length > 0 && (
                            <div className="space-y-3">
                              <span className="text-[10px] font-bold text-secondary uppercase tracking-wider block">Reference Images & Blueprints</span>
                              <div className="grid grid-cols-3 gap-3">
                                {activeBooking.media.map((med) => (
                                  <a
                                    key={med.id}
                                    href={`http://localhost:5000${med.file_url}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group border border-borderColor rounded-xl overflow-hidden bg-bgBase hover:border-[#C5A880] transition-colors flex flex-col h-24"
                                  >
                                    {med.mime_type.startsWith('image/') ? (
                                      <img src={`http://localhost:5000${med.file_url}`} alt={med.file_name} className="w-full h-16 object-cover" />
                                    ) : (
                                      <div className="w-full h-16 flex items-center justify-center bg-slate-100 text-slate-400">
                                        <FileText className="w-6 h-6" />
                                      </div>
                                    )}
                                    <div className="p-1 px-2 text-[9px] truncate text-primary font-medium bg-white border-t border-borderColor/40">
                                      {med.file_name}
                                    </div>
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Timeline logs */}
                          <div className="border-t border-borderColor/40 pt-4 space-y-3">
                            <span className="text-[10px] font-bold text-secondary uppercase tracking-wider block">Timeline History</span>
                            {activitiesLoading ? (
                              <div className="h-10 skeleton rounded"></div>
                            ) : activities.length > 0 ? (
                              <div className="pl-4 border-l border-borderColor/60 space-y-3">
                                {activities.slice(-3).map((act) => (
                                  <div key={act.id} className="text-[11px] leading-normal text-secondary">
                                    <span className="font-bold text-primary block">{act.activity_type}</span>
                                    <span>{act.description}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-[11px] text-secondary/50">No activity logged.</p>
                            )}
                          </div>

                          {/* ACTION PANEL */}
                          <div className="border-t border-borderColor/50 pt-5 mt-2">
                            
                            {/* Workflow Stepper buttons */}
                            {activeBooking.status === 'Assigned' && (
                              <div className="space-y-4">
                                <div className="p-4 bg-amber-50/50 border border-amber-200/50 rounded-xl flex items-start gap-3">
                                  <AlertCircle className="w-5 h-5 text-[#C5A880] shrink-0 mt-0.5" />
                                  <div className="text-xs leading-relaxed text-slate-700">
                                    <span className="font-bold block text-primary">New Assignment Received</span>
                                    Review the client layout specifications above. Please accept this assignment to proceed with scheduling.
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleAcceptAssignment(activeBooking.id)}
                                  className="w-full py-3 bg-[#C5A880] hover:bg-[#C5A880]/90 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition-colors"
                                >
                                  Accept Site Assignment
                                </button>
                              </div>
                            )}

                            {activeBooking.status === 'Designer Accepted' && (
                              <div className="space-y-4">
                                <p className="text-xs text-secondary leading-relaxed">
                                  Liaise with the client at <span className="font-semibold text-primary">{activeBooking.phone}</span> to finalize scheduling alignment for the preferred date & slot: <span className="font-semibold text-primary">{activeBooking.preferred_date} ({activeBooking.preferred_slot})</span>.
                                </p>
                                <button
                                  onClick={() => handleScheduleVisit(activeBooking.id)}
                                  className="w-full py-3 bg-[#C5A880] hover:bg-[#C5A880]/90 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition-colors"
                                >
                                  Schedule Site Visit
                                </button>
                              </div>
                            )}

                            {activeBooking.status === 'Site Visit Scheduled' && (
                              <div className="space-y-4">
                                <p className="text-xs text-secondary leading-relaxed">
                                  The site visit is scheduled. Once you arrive at the client's location and begin the survey, click below to initiate audit mode.
                                </p>
                                <button
                                  onClick={() => handleStartVisit(activeBooking.id)}
                                  className="w-full py-3 bg-[#C5A880] hover:bg-[#C5A880]/90 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition-colors"
                                >
                                  Start Site Visit
                                </button>
                              </div>
                            )}

                            {/* REPORT ENTRY FORM */}
                            {(activeBooking.status === 'Site Visit Scheduled' || activeBooking.status === 'Site Visit In Progress') && (
                              <form onSubmit={handleReportSubmit} className="space-y-4 border-t border-borderColor/40 pt-5 mt-4">
                                <h4 className="font-bold text-xs uppercase tracking-widest text-[#C5A880]">Create Inspection Report</h4>
                                
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-secondary uppercase tracking-wider block">Visit Summary & Spatial Analysis *</label>
                                  <textarea
                                    required
                                    value={reportSummary}
                                    onChange={(e) => setReportSummary(e.target.value)}
                                    rows={3}
                                    placeholder="Enter physical dimensions, vertical profiles, lighting channels, and layout summaries..."
                                    className="w-full px-3 py-2 text-xs border border-borderColor rounded-xl outline-none focus:border-accentGold bg-white text-slate-800"
                                  />
                                </div>

                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-secondary uppercase tracking-wider block">Layout Recommendations & Measurements</label>
                                  <textarea
                                    value={reportRecs}
                                    onChange={(e) => setReportRecs(e.target.value)}
                                    rows={3}
                                    placeholder="Add dimensions (e.g. Living: 12x14ft) and spatial layout suggestions..."
                                    className="w-full px-3 py-2 text-xs border border-borderColor rounded-xl outline-none focus:border-accentGold bg-white text-slate-800"
                                  />
                                </div>

                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-secondary uppercase tracking-wider block">Material Recommendations</label>
                                  <textarea
                                    value={reportMaterials}
                                    onChange={(e) => setReportMaterials(e.target.value)}
                                    rows={2}
                                    placeholder="E.g., custom veneers, matte quartz, LED warm white channels, modular carpentry..."
                                    className="w-full px-3 py-2 text-xs border border-borderColor rounded-xl outline-none focus:border-accentGold bg-white text-slate-800"
                                  />
                                </div>

                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-secondary uppercase tracking-wider block">Next Steps & Briefings</label>
                                  <textarea
                                    value={reportFollowUps}
                                    onChange={(e) => setReportFollowUps(e.target.value)}
                                    rows={2}
                                    placeholder="Layout briefing scheduled on admin portal; Quotation draft to be sent by admin."
                                    className="w-full px-3 py-2 text-xs border border-borderColor rounded-xl outline-none focus:border-accentGold bg-white text-slate-800"
                                  />
                                </div>

                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-secondary uppercase tracking-wider block">Upload Visit Verification Image</label>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => setReportImageFile(e.target.files[0])}
                                    className="w-full text-xs text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#C5A880]/15 file:text-[#C5A880] hover:file:bg-[#C5A880]/20 cursor-pointer"
                                  />
                                </div>

                                <button
                                  type="submit"
                                  disabled={submittingReport}
                                  className="w-full py-3 bg-[#1C1C1C] hover:bg-neutral-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition-colors disabled:opacity-50 mt-2"
                                >
                                  {submittingReport ? 'Submitting Report...' : 'Submit Report & Complete Visit'}
                                </button>
                              </form>
                            )}

                            {/* COMPLETED REPORT VIEW */}
                            {(activeBooking.status === 'Site Visit Completed' || ['Quotation Sent', 'Quotation Approved', 'Project Started', 'Project Completed'].includes(activeBooking.status)) && (
                              <div className="space-y-4">
                                <div className="p-3 bg-green-50 text-green-700 border border-green-200 rounded-xl flex items-center gap-2 text-xs font-bold">
                                  <CheckCircle2 className="w-4 h-4" /> Visit Report Submitted Successfully
                                </div>
                                {reportLoading ? (
                                  <div className="h-20 skeleton rounded"></div>
                                ) : report ? (
                                  <div className="space-y-3 text-xs bg-bgBase p-4 rounded-xl border border-borderColor/30">
                                    <div>
                                      <span className="text-[9px] text-[#C5A880] uppercase tracking-wider block font-bold">Visit Summary</span>
                                      <p className="mt-1 text-slate-800 leading-relaxed font-light">{report.summary}</p>
                                    </div>
                                    {report.recommendations && (
                                      <div className="border-t border-borderColor/30 pt-2 mt-2">
                                        <span className="text-[9px] text-[#C5A880] uppercase tracking-wider block font-bold">Measurements & Suggestions</span>
                                        <p className="mt-1 text-slate-800 leading-relaxed font-light">{report.recommendations}</p>
                                      </div>
                                    )}
                                    {report.material_suggestions && (
                                      <div className="border-t border-borderColor/30 pt-2 mt-2">
                                        <span className="text-[9px] text-[#C5A880] uppercase tracking-wider block font-bold">Material Recommendations</span>
                                        <p className="mt-1 text-slate-800 leading-relaxed font-light font-mono">{report.material_suggestions}</p>
                                      </div>
                                    )}
                                    {report.image_path && (
                                      <div className="border-t border-borderColor/30 pt-2 mt-2">
                                        <span className="text-[9px] text-[#C5A880] uppercase tracking-wider block font-bold">Verification Photo</span>
                                        <img src={`http://localhost:5000${report.image_path}`} alt="Verification" className="max-w-xs h-auto rounded-xl border border-borderColor mt-2" />
                                      </div>
                                    )}
                                    <div className="pt-3 flex">
                                      <a
                                        href={`http://localhost:5000/api/reports/pdf/${activeBooking.id}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-4 py-2 border border-borderColor bg-white hover:bg-bgBase text-primary font-bold text-[10px] rounded-lg tracking-wider transition-colors inline-flex items-center gap-1.5 uppercase"
                                      >
                                        <Download className="w-3.5 h-3.5 text-[#C5A880]" /> Download Report HTML/PDF
                                      </a>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-xs text-secondary/60">Report is pending retrieval...</p>
                                )}
                              </div>
                            )}

                          </div>

                        </div>
                      ) : (
                        <div className="bg-white border border-borderColor rounded-2xl p-12 text-center space-y-4 shadow-sm py-16">
                          <Inbox className="w-10 h-10 text-secondary/30 mx-auto" />
                          <p className="text-xs text-secondary">Select an assignment to view details and submit report.</p>
                        </div>
                      )}
                    </div>

                  </div>
                ) : (
                  <div className="bg-white border border-borderColor rounded-2xl p-12 text-center space-y-4 shadow-sm py-16">
                    <div className="w-16 h-16 bg-[#C5A880]/10 rounded-full flex items-center justify-center mx-auto">
                      <Inbox className="w-8 h-8 text-[#C5A880]" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-semibold text-primary">No Assignments Allocated</h3>
                      <p className="text-xs text-secondary max-w-sm mx-auto leading-relaxed">
                        There are currently no active site visits allocated to you. Check back later for system suggestions.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB: PROFILE & STATS */}
            {profActiveTab === 'profile' && (
              <div className="bg-white border border-borderColor rounded-2xl p-6 shadow-sm space-y-6">
                <h3 className="text-lg font-bold text-primary">My Professional Dashboard</h3>
                <p className="text-xs text-secondary mt-0.5">Performance index, active workload, and target dispatch region.</p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                  <div className="p-5 border border-borderColor rounded-xl bg-bgBase text-center space-y-1.5">
                    <span className="text-[10px] font-bold text-secondary uppercase block">Workload Rating</span>
                    <span className="font-mono text-3xl font-extrabold text-accentGold">{profObj.rating} ★</span>
                    <span className="text-[9px] text-secondary/50 block">Based on customer satisfaction</span>
                  </div>
                  <div className="p-5 border border-borderColor rounded-xl bg-bgBase text-center space-y-1.5">
                    <span className="text-[10px] font-bold text-secondary uppercase block">Active Workload</span>
                    <span className="font-mono text-3xl font-extrabold text-primary">{profObj.workload} Visits</span>
                    <span className="text-[9px] text-secondary/50 block">Visits currently allocated</span>
                  </div>
                  <div className="p-5 border border-borderColor rounded-xl bg-bgBase text-center space-y-1.5">
                    <span className="text-[10px] font-bold text-secondary uppercase block">Experience</span>
                    <span className="font-mono text-3xl font-extrabold text-primary">{profObj.experience} Yrs</span>
                    <span className="text-[9px] text-secondary/50 block">Total professional experience</span>
                  </div>
                </div>

                <div className="border-t border-borderColor/40 pt-6 space-y-4">
                  <h4 className="font-bold text-xs uppercase text-secondary">Proximity & Availability Settings</h4>
                  <div className="grid grid-cols-2 gap-6 text-xs text-secondary">
                    <div>
                      <span className="text-[10px] text-secondary/50 uppercase block font-bold">Target Allocation Region</span>
                      <span className="font-bold text-primary text-sm mt-1 block">{profObj.region}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-secondary/50 uppercase block font-bold">Account Registration Email</span>
                      <span className="font-mono text-primary text-sm mt-1 block">{profObj.email}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: NOTIFICATIONS */}
            {profActiveTab === 'notifications' && (
              <div className="space-y-6">
                <div className="border-b border-borderColor pb-4">
                  <h3 className="text-lg font-bold text-primary">System Dispatch Log</h3>
                  <p className="text-xs text-secondary mt-0.5">Real-time alerts regarding site visits, client reference uploads, and completions.</p>
                </div>
                {notifications.length > 0 ? (
                  <div className="bg-white border border-borderColor rounded-2xl overflow-hidden shadow-sm divide-y divide-borderColor/60">
                    {notifications.map((notif) => (
                      <div key={notif.id} className="p-4 flex gap-4 items-start bg-accentGold/[0.005]">
                        <Bell className="w-4 h-4 text-accentGold mt-0.5 shrink-0" />
                        <div className="flex-1 text-xs">
                          <h4 className="font-bold text-primary">{notif.title}</h4>
                          <p className="text-slate-500 mt-1 leading-relaxed">{notif.message}</p>
                          <span className="text-[9px] text-secondary/35 mt-1 block font-mono">
                            {new Date(notif.created_at).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white border border-borderColor rounded-2xl p-12 text-center py-16">
                    <Bell className="w-8 h-8 text-secondary/30 mx-auto mb-2" />
                    <p className="text-xs text-secondary">You are all caught up!</p>
                  </div>
                )}
              </div>
            )}

          </div>

        </div>

      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 space-y-8 animate-fadeIn font-poppins text-primary">
      
      {/* Top Profile Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 sm:p-6 bg-white border border-borderColor rounded-2xl shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-accentGold/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-16 h-16 rounded-full border-2 border-accentGold/60 bg-bgBase flex items-center justify-center font-bold font-poppins text-accentGold text-xl shadow-inner">
            {getInitials(clientName)}
          </div>
          <div>
            <span className="text-[10px] font-bold text-accentGold uppercase tracking-widest bg-accentGold/10 px-2 py-0.5 rounded">Client Portal</span>
            <h2 className="font-poppins text-xl font-bold mt-1">{clientName}</h2>
            <p className="text-xs text-secondary mt-0.5">{clientEmail} • {clientPhone}</p>
          </div>
        </div>
      </div>

      {/* Mobile Horizontal Tabs Row */}
      <div className="flex lg:hidden overflow-x-auto gap-2 pb-3 px-1 border-b border-borderColor scrollbar-none snap-x snap-mandatory">
        <button 
          onClick={() => setActiveTab('bookings')} 
          className={`snap-start shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'bookings' ? 'bg-primary text-white' : 'bg-bgSurface border border-borderColor text-secondary'
          }`}
        >
          My Bookings ({bookings.length})
        </button>
        <button 
          onClick={() => setActiveTab('tracking')} 
          className={`snap-start shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'tracking' ? 'bg-primary text-white' : 'bg-bgSurface border border-borderColor text-secondary'
          }`}
        >
          Visit Tracking {activeBooking && <span className="w-1.5 h-1.5 rounded-full bg-accentGold"></span>}
        </button>
        <button 
          onClick={() => setActiveTab('estimates')} 
          className={`snap-start shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'estimates' ? 'bg-primary text-white' : 'bg-bgSurface border border-borderColor text-secondary'
          }`}
        >
          Estimates {quotation && quotation.status === 'Pending' && <span className="w-1.5 h-1.5 rounded-full bg-accentGold"></span>}
        </button>
        <button 
          onClick={() => setActiveTab('reports')} 
          className={`snap-start shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'reports' ? 'bg-primary text-white' : 'bg-bgSurface border border-borderColor text-secondary'
          }`}
        >
          Reports {report && <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>}
        </button>
        <button 
          onClick={() => setActiveTab('notifications')} 
          className={`snap-start shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'notifications' ? 'bg-primary text-white' : 'bg-bgSurface border border-borderColor text-secondary'
          }`}
        >
          Notifications {notifications.filter(n => !n.is_read).length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-accentGold text-white text-[8px]">
              {notifications.filter(n => !n.is_read).length}
            </span>
          )}
        </button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 sm:gap-8">
        
        {/* Navigation Sidebar */}
        <div className="hidden lg:block space-y-4 lg:col-span-1">
          <div className="bg-white border border-borderColor rounded-2xl p-4 space-y-1">
            <span className="text-[9px] font-bold text-secondary/50 uppercase tracking-widest px-3 block mb-2">Navigation</span>
            
            <button
              onClick={() => setActiveTab('bookings')}
              className={`w-full text-left px-4 py-3 rounded-xl text-xs font-semibold flex items-center justify-between transition-all duration-200 ${
                activeTab === 'bookings'
                  ? 'bg-primary text-white shadow-sm font-bold'
                  : 'text-secondary hover:bg-bgBase'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Compass className="w-4 h-4" /> My Bookings
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] ${
                activeTab === 'bookings' ? 'bg-white/20 text-white' : 'bg-bgBase text-secondary'
              }`}>{bookings.length}</span>
            </button>

            <button
              onClick={() => setActiveTab('tracking')}
              className={`w-full text-left px-4 py-3 rounded-xl text-xs font-semibold flex items-center justify-between transition-all duration-200 ${
                activeTab === 'tracking'
                  ? 'bg-primary text-white shadow-sm font-bold'
                  : 'text-secondary hover:bg-bgBase'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Clock className="w-4 h-4" /> Visit Tracking
              </span>
              {activeBooking && (
                <span className="w-2 h-2 rounded-full bg-accentGold animate-pulse"></span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('estimates')}
              className={`w-full text-left px-4 py-3 rounded-xl text-xs font-semibold flex items-center justify-between transition-all duration-200 ${
                activeTab === 'estimates'
                  ? 'bg-primary text-white shadow-sm font-bold'
                  : 'text-secondary hover:bg-bgBase'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <FileText className="w-4 h-4" /> Estimates & Quotations
              </span>
              {quotation && quotation.status === 'Pending' && (
                <span className="px-1.5 py-0.5 rounded bg-accentGold text-white text-[8px] font-bold uppercase">Action Required</span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('reports')}
              className={`w-full text-left px-4 py-3 rounded-xl text-xs font-semibold flex items-center justify-between transition-all duration-200 ${
                activeTab === 'reports'
                  ? 'bg-primary text-white shadow-sm font-bold'
                  : 'text-secondary hover:bg-bgBase'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4" /> Visit Report Assistant
              </span>
              {report && (
                <span className="px-1.5 py-0.5 rounded bg-green-500 text-white text-[8px] font-bold uppercase">New</span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('notifications')}
              className={`w-full text-left px-4 py-3 rounded-xl text-xs font-semibold flex items-center justify-between transition-all duration-200 ${
                activeTab === 'notifications'
                  ? 'bg-primary text-white shadow-sm font-bold'
                  : 'text-secondary hover:bg-bgBase'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Bell className="w-4 h-4" /> Notifications Log
              </span>
              {notifications.filter(n => !n.is_read).length > 0 && (
                <span className="px-2 py-0.5 rounded bg-accentGold text-white text-[9px] font-bold">
                  {notifications.filter(n => !n.is_read).length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Dynamic Display Area */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* TAB 1: BOOKINGS LIST */}
          {activeTab === 'bookings' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-borderColor pb-4">
                <div>
                  <h3 className="text-lg font-bold text-primary">My Bookings</h3>
                  <p className="text-xs text-secondary mt-0.5">Track and manage your scheduled design consultations.</p>
                </div>
              </div>

              {bookings.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  {bookings.map((b) => (
                    <div
                      key={b.id}
                      onClick={() => {
                        setSelectedBookingId(b.id);
                        setActiveTab('tracking');
                      }}
                      className={`p-5 rounded-2xl border transition-all duration-300 cursor-pointer relative hover:shadow-md ${
                        selectedBookingId === b.id
                          ? 'border-accentGold bg-accentGold/[0.02]'
                          : 'border-borderColor bg-white hover:border-accentGold/40'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <span className="text-[10px] font-bold text-accentGold tracking-wider block font-mono">
                            {b.booking_id_str}
                          </span>
                          <h4 className="font-bold text-sm text-primary mt-0.5">
                            {b.property_type} Consultation
                          </h4>
                        </div>
                        {getStatusBadge(b.status)}
                      </div>

                      <div className="space-y-2.5 text-xs text-secondary border-t border-borderColor/50 pt-3">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-accentGold shrink-0" />
                          <span className="font-semibold text-primary">{b.client_name} ({b.phone})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-accentGold shrink-0" />
                          <span>{b.preferred_date}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-accentGold shrink-0" />
                          <span>{b.preferred_slot}</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-accentGold shrink-0 mt-0.5" />
                          <span className="line-clamp-2">{b.address}</span>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-borderColor/30 flex items-center justify-between text-[11px]">
                        <span className="text-secondary/70">Click to view details</span>
                        <ChevronRight className="w-4 h-4 text-secondary/40" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white border border-borderColor rounded-2xl p-12 text-center space-y-4 shadow-sm py-16">
                  <div className="w-16 h-16 bg-accentGold/10 rounded-full flex items-center justify-center mx-auto">
                    <Inbox className="w-8 h-8 text-accentGold" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-semibold text-primary">No Booking Records Found</h3>
                    <p className="text-xs text-secondary max-w-sm mx-auto leading-relaxed">
                      You haven't scheduled any site visits yet. Start by scheduling an appointment to meet our space styling experts.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: VISIT TRACKING & TIMELINE */}
          {activeTab === 'tracking' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-borderColor pb-4">
                <div>
                  <h3 className="text-lg font-bold text-primary">Visit Tracking</h3>
                  <p className="text-xs text-secondary mt-0.5">Real-time schedule progression and activity registry.</p>
                </div>

                {bookings.length > 1 && (
                  <select
                    value={selectedBookingId || ''}
                    onChange={(e) => setSelectedBookingId(Number(e.target.value))}
                    className="px-3 py-1.5 text-xs bg-bgBase text-primary border border-borderColor rounded-xl outline-none focus:border-accentGold font-medium"
                  >
                    {bookings.map(b => (
                      <option key={b.id} value={b.id}>{b.booking_id_str} ({b.property_type})</option>
                    ))}
                  </select>
                )}
              </div>

              {activeBooking ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  {/* Timeline progress stepper and tracking logs */}
                  <div className="md:col-span-2 space-y-6">
                    
                    {/* Stepper Card */}
                    <div className="bg-white border border-borderColor rounded-2xl p-4 sm:p-6 shadow-sm space-y-6 overflow-hidden">
                      <h4 className="font-bold text-xs uppercase tracking-widest text-secondary/60">Milestone Stepper</h4>
                      
                      {/* Visual Timeline Path */}
                      <div className="relative pl-5 sm:pl-6 border-l-2 border-[#C5A880]/30 space-y-4 sm:space-y-5 py-2">
                        {OPERATIONAL_WORKFLOW.map((step, idx) => {
                          const stepStatus = getStepStatus(activeBooking.status, step);
                          return (
                            <div key={idx} className="flex gap-4 items-center relative">
                              
                              {/* Indicator dot */}
                              <div className={`absolute -left-[31px] w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-extrabold border ${
                                stepStatus === 'completed'
                                  ? 'bg-[#C5A880] border-[#C5A880] text-white shadow-sm'
                                  : stepStatus === 'active'
                                    ? 'bg-white border-[#C5A880] text-[#C5A880] ring-4 ring-[#C5A880]/15'
                                    : 'bg-white border-slate-300 text-slate-400'
                              }`}>
                                {stepStatus === 'completed' ? '✓' : idx + 1}
                              </div>

                              <div className="pl-2">
                                <span className={`text-xs font-bold ${
                                  stepStatus === 'active' 
                                    ? 'text-[#C5A880]' 
                                    : stepStatus === 'completed'
                                      ? 'text-primary'
                                      : 'text-slate-400'
                                }`}>
                                  {step}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {activeBooking.status === 'Cancelled' && (
                        <div className="p-4 bg-red-50 text-red-700 border border-red-200/50 rounded-xl flex items-start gap-3 text-xs leading-relaxed">
                          <AlertTriangle className="w-5 h-5 shrink-0" />
                          <div>
                            <span className="font-bold block">Visit Booking Cancelled</span>
                            This booking request was cancelled. Assigned slots have been released.
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Timeline Activity Log */}
                    <div className="bg-white border border-borderColor rounded-2xl p-6 shadow-sm space-y-6">
                      <h4 className="font-bold text-xs uppercase tracking-widest text-secondary/60">Activity History Log</h4>
                      
                      {activitiesLoading ? (
                        <div className="space-y-4">
                          {[1, 2, 3].map(i => (
                            <div key={i} className="flex gap-4">
                              <div className="w-4 h-4 rounded-full skeleton mt-1"></div>
                              <div className="flex-1 space-y-2">
                                <div className="h-3 w-1/4 skeleton rounded"></div>
                                <div className="h-2 w-3/4 skeleton rounded"></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : activities.length > 0 ? (
                        <div className="relative pl-6 border-l-2 border-borderColor space-y-6 ml-2.5 pt-1">
                          {activities.map((act) => (
                            <div key={act.id} className="relative group">
                              <div className="absolute -left-[31px] top-1 w-3 h-3 rounded-full border-2 border-accentGold bg-white group-last:border-primary"></div>
                              
                              <div className="space-y-1">
                                <div className="flex items-center gap-3">
                                  <span className="text-xs font-bold text-primary">
                                    {act.activity_type}
                                  </span>
                                  <span className="text-[10px] text-secondary/50 font-mono">
                                    {new Date(act.created_at).toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}
                                  </span>
                                </div>
                                <p className="text-xs text-secondary leading-relaxed">
                                  {act.description}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-secondary/60 text-center py-4">No activities logged yet.</p>
                      )}
                    </div>
                  </div>

                  {/* Summary Sidebar Card & Media Uploader */}
                  <div className="space-y-6">
                    
                    {/* Summary Info */}
                    <div className="bg-white border border-borderColor rounded-2xl p-5 shadow-sm space-y-5">
                      <h4 className="font-bold text-xs uppercase tracking-widest text-secondary/60">Booking Summary</h4>
                      
                      <div className="space-y-3.5 text-xs">
                        <div>
                          <span className="text-[10px] text-secondary/50 uppercase block">Booking ID</span>
                          <span className="font-mono font-bold text-accentGold text-sm">{activeBooking.booking_id_str}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-secondary/50 uppercase block">Property Type</span>
                          <span className="font-bold text-primary">{activeBooking.property_type}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-secondary/50 uppercase block">Preferred Time</span>
                          <span className="font-bold text-primary">
                            {activeBooking.preferred_date} • {activeBooking.preferred_slot}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-secondary/50 uppercase block">Site Address</span>
                          <span className="text-secondary leading-relaxed block mt-0.5">{activeBooking.address}</span>
                        </div>
                      </div>

                      {/* Expert Detail */}
                      {(activeBooking.status !== 'Draft' && activeBooking.status !== 'Pending' && activeBooking.status !== 'Confirmed') && activeBooking.assigned_to_id ? (
                        <div className="border-t border-borderColor/40 pt-4 mt-2">
                          <span className="text-[9px] font-bold text-accentGold uppercase tracking-widest block mb-2">Assigned Professional</span>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-bgBase flex items-center justify-center font-bold text-accentGold text-xs border border-borderColor">
                              {activeBooking.assigned_to_role === 'designer' ? 'D' : 'SE'}
                            </div>
                            <div>
                              <h5 className="font-bold text-xs text-primary">
                                {activeBooking.assigned_to_role === 'designer' ? 'Lead Designer' : 'Site Engineer'}
                              </h5>
                              <p className="text-[10px] text-secondary mt-0.5">Active Assignment</p>
                            </div>
                          </div>
                          <p className="text-[11px] text-secondary/80 italic mt-3 bg-bgBase p-3 rounded-lg border border-borderColor/40 leading-relaxed">
                            {activeBooking.assignment_reason}
                          </p>
                        </div>
                      ) : null}

                      {/* Cancel / Reschedule Actions */}
                      {activeBooking.status !== 'Cancelled' && !['Quotation Sent', 'Quotation Approved', 'Project Started', 'Project Completed'].includes(activeBooking.status) && (
                        <div className="border-t border-borderColor/40 pt-4 flex gap-3">
                          <button
                            onClick={() => {
                              setSelectedRescheduleId(activeBooking.id);
                              setRescheduleDate(activeBooking.preferred_date);
                              setRescheduleSlot(activeBooking.preferred_slot);
                              setRescheduleModalOpen(true);
                            }}
                            className="flex-1 py-2 bg-primary hover:bg-primary/95 text-white text-xs font-bold rounded-xl shadow transition-colors text-center"
                          >
                            Reschedule
                          </button>
                          <button
                            onClick={handleCancelBooking}
                            className="flex-1 py-2 bg-red-50 hover:bg-red-100 text-red-650 border border-red-200 text-xs font-bold rounded-xl transition-colors text-center"
                          >
                            Cancel Visit
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Media Attachments & Gallery */}
                    <div className="bg-white border border-borderColor rounded-2xl p-5 shadow-sm space-y-4">
                      <h4 className="font-bold text-xs uppercase tracking-widest text-secondary/60">Design References & Media</h4>
                      
                      {activeBooking.media && activeBooking.media.length > 0 ? (
                        <div className="grid grid-cols-2 gap-3">
                          {activeBooking.media.map((med) => (
                            <a 
                              key={med.id} 
                              href={`http://localhost:5000${med.file_url}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="group border border-borderColor/60 rounded-xl overflow-hidden bg-bgBase hover:border-accentGold transition-colors flex flex-col h-28 relative"
                            >
                              {med.mime_type.startsWith('image/') ? (
                                <img 
                                  src={`http://localhost:5000${med.file_url}`} 
                                  alt={med.file_name} 
                                  className="w-full h-20 object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                              ) : (
                                <div className="w-full h-20 flex items-center justify-center bg-slate-100 text-slate-400">
                                  <FileText className="w-8 h-8" />
                                </div>
                              )}
                              <div className="p-1 px-2 text-[10px] truncate text-primary font-medium flex-grow bg-white border-t border-borderColor/40 flex items-center justify-between">
                                <span className="truncate">{med.file_name}</span>
                                <span className="text-[8px] text-secondary/50 font-mono">{(med.file_size / 1024).toFixed(0)}KB</span>
                              </div>
                            </a>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-secondary/50 text-center py-4 bg-bgBase rounded-xl border border-dashed border-borderColor">No references uploaded yet.</p>
                      )}

                      {/* File Uploader */}
                      {activeBooking.status !== 'Cancelled' && activeBooking.status !== 'Project Completed' && (
                        <div className="pt-2">
                          <label className="w-full flex flex-col items-center justify-center py-4 border-2 border-dashed border-borderColor hover:border-[#C5A880] rounded-xl cursor-pointer bg-bgBase hover:bg-slate-50 transition-all">
                            <Upload className="w-4 h-4 text-[#C5A880] mb-1.5" />
                            <span className="text-[10px] font-bold text-[#C5A880] uppercase tracking-wider">
                              {uploadingMedia ? 'Uploading Files...' : 'Upload References'}
                            </span>
                            <span className="text-[8px] text-secondary/40 mt-0.5">PNG, JPG, PDF up to 5MB</span>
                            <input 
                              type="file" 
                              multiple 
                              disabled={uploadingMedia}
                              accept="image/*,application/pdf"
                              className="hidden" 
                              onChange={async (e) => {
                                const files = e.target.files;
                                if (!files || files.length === 0) return;
                                const formData = new FormData();
                                for (let i = 0; i < files.length; i++) {
                                  formData.append('media', files[i]);
                                }
                                setUploadingMedia(true);
                                try {
                                  await uploadBookingMedia(activeBooking.id, formData);
                                  fetchBookingDetails();
                                } catch (err) {
                                  console.error(err);
                                } finally {
                                  setUploadingMedia(false);
                                }
                              }}
                            />
                          </label>
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              ) : (
                <div className="bg-white border border-borderColor p-8 text-center space-y-3 rounded-2xl py-12">
                  <Inbox className="w-10 h-10 text-secondary/30 mx-auto" />
                  <p className="text-xs text-secondary">No booking selected. Go to My Bookings to track a visit.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ESTIMATES & QUOTATIONS */}
          {activeTab === 'estimates' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-borderColor pb-4">
                <div>
                  <h3 className="text-lg font-bold text-primary">Estimates & Quotations</h3>
                  <p className="text-xs text-secondary mt-0.5">Line-item cost analysis, architectural suggestions, and discount variables.</p>
                </div>
              </div>

              {quotationLoading ? (
                <div className="bg-white border border-borderColor rounded-2xl p-6 shadow-sm space-y-6">
                  <div className="h-6 w-1/3 skeleton rounded"></div>
                  <div className="h-24 skeleton rounded"></div>
                </div>
              ) : quotation ? (
                <div className="bg-white border border-borderColor rounded-2xl overflow-hidden shadow-md">
                  <div className="bg-gradient-to-r from-primary to-slate-900 text-white p-6 border-b border-borderColor flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-base text-accentGold">Interior Design Estimate</h4>
                      <p className="text-xs text-slate-350 mt-1">Estimate Ref: GSI-Q-{quotation.id}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      quotation.status === 'Approved' 
                        ? 'bg-green-500/20 text-green-400' 
                        : quotation.status === 'Rejected' 
                          ? 'bg-red-500/20 text-red-400' 
                          : 'bg-amber-500/20 text-amber-400'
                    }`}>{quotation.status}</span>
                  </div>

                  {/* Table of items (Desktop/Tablet) */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-borderColor text-secondary/60 font-bold uppercase tracking-wider bg-bgBase">
                          <th className="py-3 px-4">Description</th>
                          <th className="py-3 px-4 text-center">Qty</th>
                          <th className="py-3 px-4 text-right">Unit Price</th>
                          <th className="py-3 px-4 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-borderColor/50">
                        {quotation.items && quotation.items.map((item, idx) => (
                          <tr key={idx} className="hover:bg-bgBase/40">
                            <td className="py-3.5 px-4 font-medium text-primary">{item.description}</td>
                            <td className="py-3.5 px-4 text-center font-mono">{item.qty}</td>
                            <td className="py-3.5 px-4 text-right font-mono">INR {item.unit_price.toLocaleString()}</td>
                            <td className="py-3.5 px-4 text-right font-mono font-bold">INR {item.amount.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Card List for Estimate Items */}
                  <div className="space-y-4 md:hidden">
                    {quotation.items && quotation.items.map((item, idx) => (
                      <div key={idx} className="p-4 rounded-xl border border-borderColor bg-bgBase/25 space-y-2.5">
                        <div className="flex justify-between items-start">
                          <span className="font-bold text-primary text-xs">{item.description}</span>
                          <span className="text-[10px] font-bold text-accentGold uppercase bg-accentGold/10 px-2 py-0.5 rounded">
                            Item {idx + 1}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-500">
                          <div>
                            <span className="block text-[9px] uppercase tracking-wider text-slate-400">Qty</span>
                            <span className="font-semibold text-primary font-mono">{item.qty}</span>
                          </div>
                          <div className="text-right">
                            <span className="block text-[9px] uppercase tracking-wider text-slate-400">Unit Price</span>
                            <span className="font-semibold text-primary font-mono">INR {item.unit_price.toLocaleString()}</span>
                          </div>
                          <div className="text-right">
                            <span className="block text-[9px] uppercase tracking-wider text-slate-400">Amount</span>
                            <span className="font-bold text-[#1C1C1C] font-mono">INR {item.amount.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Calculation summary */}
                  <div className="flex justify-end pt-4 border-t border-borderColor">
                    <div className="w-full sm:w-80 space-y-2.5 text-xs text-secondary">
                      <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span className="font-mono">INR {quotation.subtotal.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-green-600">
                        <span>Discount ({quotation.discount}%)</span>
                        <span className="font-mono">- INR {(quotation.subtotal * quotation.discount / 100).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>GST ({quotation.gst}%)</span>
                        <span className="font-mono">INR {quotation.tax.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-primary font-bold text-sm pt-2 border-t border-borderColor">
                        <span>Grand Total</span>
                        <span className="font-mono text-accentGold">INR {quotation.grand_total.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                    {/* Approval Actions */}
                    {quotation.status === 'Pending' && activeBooking.status === 'Quotation Sent' && (
                      <div className="bg-bgBase border border-borderColor p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="space-y-1">
                          <h5 className="font-bold text-xs text-primary uppercase">Accept layout estimate?</h5>
                          <p className="text-[11px] text-secondary">Upon acceptance, our team will coordinate the site construction start.</p>
                        </div>
                        <div className="flex gap-3 w-full sm:w-auto">
                          <button
                            onClick={async () => {
                              if (window.confirm('Are you sure you want to approve this estimate?')) {
                                try {
                                  await updateQuotationStatus(quotation.uuid, 'Approved');
                                  fetchBookingDetails();
                                } catch (err) {
                                  console.error(err);
                                }
                              }
                            }}
                            className="flex-1 sm:flex-initial px-6 py-2.5 bg-[#C5A880] hover:bg-[#C5A880]/90 text-white font-bold text-xs rounded-xl shadow-md transition-colors"
                          >
                            Approve Estimate
                          </button>
                          <button
                            onClick={async () => {
                              const reason = window.prompt('Please provide a reason for rejecting the estimate (optional):');
                              if (reason !== null) {
                                try {
                                  await updateQuotationStatus(quotation.uuid, 'Rejected', reason);
                                  fetchBookingDetails();
                                } catch (err) {
                                  console.error(err);
                                }
                              }
                            }}
                            className="flex-1 sm:flex-initial px-6 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold text-xs rounded-xl transition-colors"
                          >
                            Reject Estimate
                          </button>
                        </div>
                      </div>
                    )}

                    {quotation.status === 'Rejected' && quotation.reason && (
                      <div className="p-4 bg-red-50 text-red-750 border border-red-100 rounded-xl text-xs">
                        <span className="font-bold block">Rejection Feedback:</span>
                        <p className="mt-1 italic">"{quotation.reason}"</p>
                      </div>
                    )}
                  </div>
                ) : (
                <div className="bg-white border border-borderColor rounded-2xl p-12 text-center space-y-4 py-16">
                  <div className="w-16 h-16 bg-accentGold/10 rounded-full flex items-center justify-center mx-auto">
                    <FileText className="w-8 h-8 text-accentGold" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-semibold text-primary">No Quotation Prepared Yet</h3>
                    <p className="text-xs text-secondary max-w-sm mx-auto leading-relaxed">
                      Estimates are prepared after the site visit and audit report. Once ready, you'll be able to review and approve the cost sheets here.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: INTELLIGENT VISIT REPORT ASSISTANT */}
          {activeTab === 'reports' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-borderColor pb-4">
                <div>
                  <h3 className="text-lg font-bold text-primary">Intelligent Visit Report Assistant</h3>
                  <p className="text-xs text-secondary mt-0.5">Automated architectural intelligence compiled from professional site inspection parameters.</p>
                </div>

                {bookings.filter(b => b.status !== 'Draft' && b.status !== 'Pending' && b.status !== 'Confirmed').length > 1 && (
                  <select
                    value={selectedBookingId || ''}
                    onChange={(e) => setSelectedBookingId(Number(e.target.value))}
                    className="px-3 py-1.5 text-xs bg-bgBase text-primary border border-borderColor rounded-xl outline-none focus:border-accentGold font-medium"
                  >
                    {bookings.filter(b => b.status !== 'Draft' && b.status !== 'Pending' && b.status !== 'Confirmed').map(b => (
                      <option key={b.id} value={b.id}>{b.booking_id_str} - {b.property_type}</option>
                    ))}
                  </select>
                )}
              </div>

              {reportLoading ? (
                <div className="bg-white border border-borderColor rounded-2xl p-6 shadow-sm space-y-6">
                  <div className="h-6 w-1/3 skeleton rounded"></div>
                  <div className="space-y-2">
                    <div className="h-3 w-full skeleton rounded"></div>
                    <div className="h-3 w-5/6 skeleton rounded"></div>
                  </div>
                </div>
              ) : report ? (
                <div className="bg-white border border-borderColor rounded-2xl overflow-hidden shadow-md font-inter">
                  
                  {/* Report Header */}
                  <div className="bg-gradient-to-r from-primary to-slate-900 text-white p-6 border-b border-borderColor flex flex-wrap justify-between items-center gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-accentGold animate-pulse" />
                        <h4 className="font-poppins font-bold text-base text-accentGold">Site Inspection Audit</h4>
                      </div>
                      <p className="text-xs text-slate-350">Generated for booking ID {activeBooking?.booking_id_str}</p>
                    </div>

                    <a
                      href={`http://localhost:5000/api/reports/pdf/${activeBooking?.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2.5 bg-accentGold hover:bg-[#b4956c] text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center gap-1.5 uppercase font-poppins tracking-wider"
                    >
                      <Download className="w-3.5 h-3.5" /> Download Report PDF
                    </a>
                  </div>

                  {/* Report Contents */}
                  <div className="p-6 space-y-6">
                    
                    <div className="space-y-2.5">
                      <h5 className="text-xs font-bold text-primary uppercase tracking-wider border-b border-borderColor/40 pb-1">
                        1. Site Visit Summary
                      </h5>
                      <p className="text-xs text-secondary leading-relaxed bg-bgBase p-4 rounded-xl border border-borderColor/30 font-light">
                        {report.summary}
                      </p>
                    </div>

                    <div className="space-y-2.5">
                      <h5 className="text-xs font-bold text-primary uppercase tracking-wider border-b border-borderColor/40 pb-1">
                        2. Architectural Style Recommendations
                      </h5>
                      <div className="text-xs text-secondary leading-relaxed bg-bgBase p-4 rounded-xl border border-borderColor/30 font-light">
                        {report.recommendations.split('\n').map((line, idx) => (
                          <p key={idx} className="mb-2 last:mb-0">{line}</p>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      <h5 className="text-xs font-bold text-primary uppercase tracking-wider border-b border-borderColor/40 pb-1">
                        3. Suggested Next Steps
                      </h5>
                      <p className="text-xs text-secondary leading-relaxed bg-bgBase p-4 rounded-xl border border-borderColor/30 font-light">
                        {report.follow_ups}
                      </p>
                    </div>

                    {report.material_suggestions && (
                      <div className="space-y-2.5">
                        <h5 className="text-xs font-bold text-primary uppercase tracking-wider border-b border-borderColor/40 pb-1">
                          4. Material Outlines
                        </h5>
                        <p className="text-xs text-secondary leading-relaxed bg-bgBase p-4 rounded-xl border border-borderColor/30 font-light font-mono">
                          {report.material_suggestions}
                        </p>
                      </div>
                    )}

                    {report.image_path && (
                      <div className="space-y-2.5">
                        <h5 className="text-xs font-bold text-primary uppercase tracking-wider border-b border-borderColor/40 pb-1">
                          5. Site Inspection Image
                        </h5>
                        <div className="rounded-xl overflow-hidden border border-borderColor max-w-lg mt-2">
                          <img src={`http://localhost:5000${report.image_path}`} alt="Site audit screenshot" className="w-full h-auto object-contain" />
                        </div>
                      </div>
                    )}

                  </div>
                </div>
              ) : (
                <div className="bg-white border border-borderColor rounded-2xl p-12 text-center space-y-4 shadow-sm py-16">
                  <div className="w-16 h-16 bg-accentGold/10 rounded-full flex items-center justify-center mx-auto">
                    <FileText className="w-8 h-8 text-accentGold" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-semibold text-primary">No Report Generated Yet</h3>
                    <p className="text-xs text-secondary max-w-sm mx-auto leading-relaxed">
                      Detailed reports are generated and uploaded directly to your portal immediately after a professional completes the site inspection.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: NOTIFICATIONS LIST */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-borderColor pb-4">
                <div>
                  <h3 className="text-lg font-bold text-primary">Notifications Log</h3>
                  <p className="text-xs text-secondary mt-0.5">Security alerts and system confirmation dispatches.</p>
                </div>
              </div>

              {notifications.length > 0 ? (
                <div className="bg-white border border-borderColor rounded-2xl overflow-hidden shadow-sm divide-y divide-borderColor/60">
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`p-4 flex gap-4 items-start transition-colors duration-200 ${
                        !notif.is_read ? 'bg-accentGold/[0.015]' : ''
                      }`}
                    >
                      <div className={`p-2 rounded-xl mt-0.5 shrink-0 ${
                        notif.type === 'whatsapp' 
                          ? 'bg-emerald-50 text-emerald-600' 
                          : 'bg-indigo-50 text-indigo-600'
                      }`}>
                        <Bell className="w-4 h-4" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <h4 className="font-bold text-xs text-primary">
                              {notif.title || 'System Dispatch Update'}
                            </h4>
                            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                              {notif.message}
                            </p>
                          </div>
                          
                          <span className="text-[10px] text-secondary/40 shrink-0 font-mono">
                            {new Date(notif.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      </div>

                      {!notif.is_read && (
                        <button
                          onClick={async () => {
                            await markNotificationRead(notif.id);
                            fetchData();
                          }}
                          className="p-1.5 hover:bg-bgBase text-accentGold hover:text-accentGold/80 rounded-lg shrink-0 transition-colors"
                          title="Mark as read"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white border border-borderColor rounded-2xl p-12 text-center space-y-4 shadow-sm py-16">
                  <div className="w-16 h-16 bg-accentGold/10 rounded-full flex items-center justify-center mx-auto">
                    <Bell className="w-8 h-8 text-accentGold" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-semibold text-primary">No Notifications Yet</h3>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                      You are all caught up! Updates regarding booking schedule confirmations, assignments, and reports will show up here.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Reschedule Modal */}
      {rescheduleModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-borderColor rounded-2xl max-w-sm w-full overflow-hidden shadow-2xl animate-scaleIn">
            <div className="bg-primary px-6 py-4 flex items-center justify-between text-white">
              <h4 className="font-bold text-sm text-accentGold">Reschedule Site Visit</h4>
              <button 
                onClick={() => setRescheduleModalOpen(false)}
                className="text-slate-350 hover:text-white text-2xl font-semibold leading-none"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleRescheduleSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-secondary uppercase tracking-wider block">New Visit Date</label>
                <input 
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  required
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 text-xs border border-borderColor rounded-xl outline-none focus:border-accentGold bg-white text-slate-800"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-secondary uppercase tracking-wider block">New Time Slot</label>
                <select
                  value={rescheduleSlot}
                  onChange={(e) => setRescheduleSlot(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs border border-borderColor rounded-xl outline-none focus:border-accentGold bg-white text-slate-850"
                >
                  <option value="09:00 AM - 12:00 PM">09:00 AM - 12:00 PM</option>
                  <option value="12:00 PM - 03:00 PM">12:00 PM - 03:00 PM</option>
                  <option value="03:00 PM - 06:00 PM">03:00 PM - 06:00 PM</option>
                </select>
              </div>
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setRescheduleModalOpen(false)}
                  className="flex-1 py-2 border border-borderColor text-xs font-bold rounded-xl hover:bg-bgBase transition-colors text-center text-slate-650"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-accentGold hover:bg-accentGold/90 text-white text-xs font-bold rounded-xl shadow transition-colors text-center"
                >
                  Confirm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
