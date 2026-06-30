import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const AppContext = createContext();

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');
export const api = axios.create({
  baseURL: API_URL,
  timeout: 10000
});

// Configure Axios Request Interceptor to automatically attach JWT Bearer Token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, error => {
  return Promise.reject(error);
});

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const darkMode = false;
  const [currentTab, setCurrentTab] = useState('home'); // 'home', 'booking', 'portal', 'crm'
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  
  // Data lists
  const [bookings, setBookings] = useState([]);
  const [professionals, setProfessionals] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Load user session and token
  useEffect(() => {
    document.documentElement.classList.remove('dark');
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch all listings (MySQL-backed only, no mock fallbacks)
  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Fetch bookings
      const bookRes = await api.get('/bookings');
      setBookings(bookRes.data);

      // Fetch professionals
      const profsRes = await api.get('/professionals');
      setProfessionals(profsRes.data);

      // Fetch notifications
      const notifRes = await api.get('/notifications');
      setNotifications(notifRes.data);
    } catch (error) {
      const errMsg = error.response?.data?.message || 'Server connection error. Failed to retrieve live data.';
      showToast(errMsg, 'error');
      console.error('Fetch data failed:', error);
    } finally {
      setLoading(false);
    }
  };

  // Trigger fetch
  useEffect(() => {
    if (user) {
      fetchData();
    } else {
      setBookings([]);
      setProfessionals([]);
      setNotifications([]);
    }
  }, [user]);

  // Login handler
  const login = async (email, password) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      
      // Flatten the response user details for frontend compatibility
      const flatUserData = {
        token: res.data.token,
        id: res.data.user.id,
        name: res.data.user.full_name,
        email: res.data.user.email,
        role: res.data.user.role_name.toLowerCase(),
        phone: res.data.user.mobile_number
      };

      // Store token and user details in localStorage
      localStorage.setItem('token', flatUserData.token);
      localStorage.setItem('user', JSON.stringify(flatUserData));
      
      setUser(flatUserData);
      showToast(`Welcome, ${flatUserData.name}!`, 'success');
      
      if (flatUserData.role === 'admin') {
        setCurrentTab('crm');
      } else {
        setCurrentTab('portal');
      }
      return { success: true, role: flatUserData.role };
    } catch (error) {
      const errMsg = error.response?.data?.message || 'Authentication failed. Please verify credentials.';
      showToast(errMsg, 'error');
      return { success: false, message: errMsg };
    } finally {
      setLoading(false);
    }
  };

  // Register client handler
  const register = async (name, email, password, phone) => {
    // Temporary Dev Log: Request Payload
    if (import.meta.env.DEV) {
      console.log('[DEV LOG] Register Request Payload:', { name, email, password, phone });
    }

    setLoading(true);
    try {
      const payload = {
        full_name: name,
        email,
        password,
        mobile_number: phone
      };

      const res = await api.post('/auth/register', payload);
      
      // Flatten response user details for frontend compatibility
      const flatUserData = {
        token: res.data.token,
        id: res.data.user.id,
        name: res.data.user.full_name,
        email: res.data.user.email,
        role: res.data.user.role_name.toLowerCase(),
        phone: res.data.user.mobile_number
      };

      // Temporary Dev Log: Success response and status
      if (import.meta.env.DEV) {
        console.log('[DEV LOG] Register API Success:', {
          status: 201,
          data: res.data
        });
      }

      localStorage.setItem('token', flatUserData.token);
      localStorage.setItem('user', JSON.stringify(flatUserData));

      setUser(flatUserData);
      showToast(`Account created, welcome ${flatUserData.name}!`, 'success');
      setCurrentTab('portal');
      return { success: true, user: flatUserData };
    } catch (error) {
      const status = error.response?.status;
      const errMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Registration failed.';
      const field = error.response?.data?.field || null;

      // Temporary Dev Log: Failure response and status
      if (import.meta.env.DEV) {
        console.error('[DEV LOG] Register API Failure:', {
          status,
          data: error.response?.data,
          message: errMsg,
          error: error.message
        });
      }

      return { success: false, message: errMsg, field };
    } finally {
      setLoading(false);
    }
  };

  // Logout handler
  const logout = () => {
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setCurrentTab('home');
    showToast('Logged out successfully', 'info');
  };

  // Submit site visit request
  const bookSiteVisit = async (formData) => {
    setLoading(true);
    try {
      const payload = {
        client_id: user.id,
        client_name: formData.name || user.name,
        phone: formData.phone || user.phone,
        email: formData.email || user.email,
        ...formData
      };
      const res = await api.post('/bookings', payload);
      showToast('Site visit booked successfully!', 'success');
      fetchData();
      return res.data;
    } catch (error) {
      const errMsg = error.response?.data?.message || 'Booking submission failed.';
      showToast(errMsg, 'error');
      throw new Error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  // Admin Confirm / Override Assignment
  const assignProfessional = async (bookingId, payload) => {
    setLoading(true);
    try {
      const res = await api.patch(`/bookings/${bookingId}/assign`, payload);
      showToast(res.data.message, 'success');
      fetchData();
    } catch (error) {
      const errMsg = error.response?.data?.message || 'Assignment failed.';
      showToast(errMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Update Booking Status
  const updateBookingStatus = async (bookingId, newStatus) => {
    setLoading(true);
    try {
      await api.patch(`/bookings/${bookingId}/status`, { status: newStatus });
      showToast(`Booking status updated to ${newStatus}`, 'success');
      fetchData();
    } catch (error) {
      const errMsg = error.response?.data?.message || 'Status update failed.';
      showToast(errMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Cancel booking
  const cancelBooking = async (bookingId) => {
    setLoading(true);
    try {
      await api.patch(`/bookings/${bookingId}/cancel`);
      showToast('Booking cancelled successfully.', 'info');
      fetchData();
    } catch (error) {
      const errMsg = error.response?.data?.message || 'Cancellation failed.';
      showToast(errMsg, 'error');
      throw new Error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  // Reschedule booking
  const rescheduleBooking = async (bookingId, preferred_date, preferred_slot) => {
    setLoading(true);
    try {
      await api.patch(`/bookings/${bookingId}/reschedule`, { preferred_date, preferred_slot });
      showToast('Booking rescheduled successfully.', 'success');
      fetchData();
    } catch (error) {
      const errMsg = error.response?.data?.message || 'Rescheduling failed.';
      showToast(errMsg, 'error');
      throw new Error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  // Submit visit report (with multipart file support)
  const submitVisitReport = async (bookingId, formData) => {
    setLoading(true);
    try {
      const res = await api.post(`/bookings/${bookingId}/report`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      showToast('Visit report submitted and completed successfully!', 'success');
      fetchData();
      return res.data;
    } catch (error) {
      const errMsg = error.response?.data?.message || 'Report submission failed.';
      showToast(errMsg, 'error');
      throw new Error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  // Get activities timeline logs
  const getBookingActivities = async (bookingId) => {
    try {
      const res = await api.get(`/bookings/${bookingId}/activities`);
      return res.data;
    } catch (error) {
      console.error('Failed to fetch booking activities:', error);
      return [];
    }
  };

  // Get Visit Report
  const getVisitReport = async (bookingId) => {
    try {
      const res = await api.get(`/bookings/${bookingId}/report`);
      return res.data;
    } catch (error) {
      console.error('Failed to fetch report:', error);
      return null;
    }
  };

  // Get Booking Assignment History
  const getBookingAssignments = async (bookingId) => {
    try {
      const res = await api.get(`/bookings/${bookingId}/assignments`);
      return res.data;
    } catch (error) {
      console.error('Failed to fetch assignment history:', error);
      return [];
    }
  };

  // Upload booking media files
  const uploadBookingMedia = async (bookingId, formData) => {
    setLoading(true);
    try {
      const res = await api.post(`/bookings/${bookingId}/media`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      showToast('Media references uploaded successfully!', 'success');
      fetchData();
      return res.data;
    } catch (error) {
      const errMsg = error.response?.data?.message || 'Media upload failed.';
      showToast(errMsg, 'error');
      throw new Error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  // Get Quotation for a booking
  const getQuotation = async (bookingId) => {
    try {
      const res = await api.get(`/bookings/${bookingId}/quotation`);
      return res.data;
    } catch (error) {
      console.error('Failed to fetch quotation:', error);
      return null;
    }
  };

  // Update Quotation Status (Approve/Reject)
  const updateQuotationStatus = async (uuid, status, reason) => {
    setLoading(true);
    try {
      const res = await api.patch(`/quotations/${uuid}/status`, { status, reason });
      showToast(`Estimate GSI-Q has been ${status.toLowerCase()}!`, 'success');
      fetchData();
      return res.data;
    } catch (error) {
      const errMsg = error.response?.data?.message || 'Status update failed.';
      showToast(errMsg, 'error');
      throw new Error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  // Update availability status of a professional
  const updateProfessionalAvailability = async (role, id, availability) => {
    try {
      await api.patch(`/professionals/${role}/${id}/availability`, { availability });
      showToast('Availability updated successfully.', 'success');
      fetchData();
    } catch (error) {
      const errMsg = error.response?.data?.message || 'Failed to update professional availability.';
      showToast(errMsg, 'error');
    }
  };

  const markNotificationRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  return (
    <AppContext.Provider value={{
      user,
      darkMode,
      currentTab,
      setCurrentTab,
      isNotificationOpen,
      setIsNotificationOpen,
      isCommandPaletteOpen,
      setIsCommandPaletteOpen,
      bookings,
      professionals,
      notifications,
      loading,
      toast,
      showToast,

      login,
      register,
      logout,
      bookSiteVisit,
      assignProfessional,
      updateBookingStatus,
      cancelBooking,
      rescheduleBooking,
      submitVisitReport,
      getBookingActivities,
      getVisitReport,
      getBookingAssignments,
      uploadBookingMedia,
      getQuotation,
      updateQuotationStatus,
      updateProfessionalAvailability,
      markNotificationRead,
      fetchData
    }}>
      {children}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 text-white shadow-2xl rounded-xl border animate-bounce duration-300 ${
          toast.type === 'error' 
            ? 'bg-red-600 border-red-500' 
            : toast.type === 'info' 
              ? 'bg-slate-700 border-slate-600' 
              : 'bg-primary border-accentGold/40'
        }`}>
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
