import React, { useState, useEffect } from 'react';
import { useApp, api } from '../context/AppContext';
import { InteractiveCalendar } from '../components/InteractiveCalendar';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend 
} from 'recharts';
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  FileText, 
  Download, 
  Search, 
  Filter, 
  Plus, 
  ChevronRight, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  XCircle, 
  Settings, 
  AlertTriangle,
  UserCheck,
  ChevronDown,
  RefreshCw,
  FileSpreadsheet,
  MapPin,
  Clock3,
  UserPlus,
  Activity,
  Database,
  Trash2,
  PlusCircle,
  Eye,
  CheckSquare,
  Square,
  FilePlus,
  Menu,
  X
} from 'lucide-react';

export const AdminCRM = () => {
  const { 
    bookings, 
    professionals, 
    logout, 
    bookSiteVisit,
    assignProfessional, 
    updateBookingStatus, 
    updateProfessionalAvailability,
    getBookingActivities,
    getVisitReport,
    getBookingAssignments,
    fetchData,
    submitVisitReport
  } = useApp();

  const [crmTab, setCrmTab] = useState('dashboard'); // 'dashboard', 'bookings', 'calendar', 'reports', 'settings', 'diagnostics', 'database_viewer', 'quotation_creator'
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Booking detail / CRM interaction states
  const [detailBookingOpen, setDetailBookingOpen] = useState(false);
  const [activeDetailTab, setActiveDetailTab] = useState('timeline'); // 'timeline', 'notes', 'tasks', 'communications', 'quotation'
  const [detailNotes, setDetailNotes] = useState([]);
  const [detailTasks, setDetailTasks] = useState([]);
  const [detailComms, setDetailComms] = useState([]);
  const [detailQuotation, setDetailQuotation] = useState(null);
  const [loadingDetailData, setLoadingDetailData] = useState(false);
  
  // Note/Task creation states
  const [newNoteText, setNewNoteText] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskAssigned, setNewTaskAssigned] = useState('');

  // Database Viewer states
  const [dbSummary, setDbSummary] = useState(null);
  const [dbTableData, setDbTableData] = useState([]);
  const [selectedDbTable, setSelectedDbTable] = useState('users');
  const [loadingDb, setLoadingDb] = useState(false);
  const [dbError, setDbError] = useState(null);
  const [dbSearch, setDbSearch] = useState('');
  const [dbLimit, setDbLimit] = useState(10);
  const [dbPage, setDbPage] = useState(1);
  const [dbSortColumn, setDbSortColumn] = useState('');
  const [dbSortOrder, setDbSortOrder] = useState('asc');

  // Quotation Creator states
  const [selectedQuotationBooking, setSelectedQuotationBooking] = useState(null);
  const [quoteDiscount, setQuoteDiscount] = useState(0);
  const [quoteGst, setQuoteGst] = useState(18);
  const [quoteItems, setQuoteItems] = useState([{ description: '', qty: 1, unit_price: 0 }]);
  const [submittingQuote, setSubmittingQuote] = useState(false);

  // Search & Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Submit report modal states
  const [submitReportModalOpen, setSubmitReportModalOpen] = useState(false);
  const [selectedReportBooking, setSelectedReportBooking] = useState(null);
  const [reportSummary, setReportSummary] = useState('');
  const [reportRecs, setReportRecs] = useState('');
  const [reportFollowUps, setReportFollowUps] = useState('');
  const [reportImage, setReportImage] = useState(null);

  const handleStatusSelectChange = (booking, newStatus) => {
    if (newStatus === 'Visit Completed') {
      setSelectedReportBooking(booking);
      setReportSummary('');
      setReportRecs('');
      setReportFollowUps('');
      setReportImage(null);
      setSubmitReportModalOpen(true);
    } else {
      updateBookingStatus(booking.id, newStatus);
    }
  };

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    if (!reportSummary) return;

    const formData = new FormData();
    formData.append('summary', reportSummary);
    formData.append('recommendations', reportRecs);
    formData.append('follow_ups', reportFollowUps);
    if (reportImage) {
      formData.append('image', reportImage);
    }

    try {
      await submitVisitReport(selectedReportBooking.id, formData);
      setSubmitReportModalOpen(false);
    } catch (err) {
      console.error('Failed to submit visit report:', err);
    }
  };
  const [dateFilter, setDateFilter] = useState('');
  const [professionalFilter, setProfessionalFilter] = useState('all');

  // Modals state
  const [isNewBookingOpen, setIsNewBookingOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [activitiesModalOpen, setActivitiesModalOpen] = useState(false);
  const [activitiesList, setActivitiesList] = useState([]);
  const [assignmentsList, setAssignmentsList] = useState([]);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportData, setReportData] = useState(null);

  // New Booking form state
  const [newBookingForm, setNewBookingForm] = useState({
    client_name: '',
    email: '',
    phone: '',
    property_type: 'Living Room',
    address: '',
    preferred_date: '',
    preferred_slot: '09:00 AM - 12:00 PM',
    notes: ''
  });

  // Assignment Modal form state
  const [assignmentOverride, setAssignmentOverride] = useState({
    assigned_to_id: '',
    assigned_to_role: 'designer',
    reason: ''
  });

  // Diagnostics page state
  const [diagnosticsData, setDiagnosticsData] = useState(null);
  const [loadingDiagnostics, setLoadingDiagnostics] = useState(false);
  const [diagnosticsError, setDiagnosticsError] = useState(null);

  const fetchDiagnostics = async () => {
    setLoadingDiagnostics(true);
    setDiagnosticsError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/admin/diagnostics', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      setDiagnosticsData(data);
    } catch (err) {
      console.error('Diagnostics fetch failed:', err);
      setDiagnosticsError(err.message || 'Could not reach server API');
    } finally {
      setLoadingDiagnostics(false);
    }
  };

  useEffect(() => {
    if (crmTab === 'diagnostics') {
      fetchDiagnostics();
    }
  }, [crmTab]);

  // DB Engine state for verification banner
  const [dbEngine, setDbEngine] = useState('MYSQL');

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch('http://localhost:5000/api/admin/diagnostics', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (data && data.activeDatabase) {
          setDbEngine(data.activeDatabase);
        }
      })
      .catch(err => console.error('Failed to fetch DB engine:', err));
  }, []);

  // Today's date YYYY-MM-DD
  const todayStr = new Date().toISOString().split('T')[0];

  // Calculate dynamic stats
  const totalBookings = bookings.length;
  const todayVisits = bookings.filter(b => b.preferred_date === todayStr && b.status !== 'Cancelled').length;
  const pendingVisits = bookings.filter(b => b.status === 'Pending').length;
  const completedVisits = bookings.filter(b => b.status === 'Visit Completed').length;
  const cancelledVisits = bookings.filter(b => b.status === 'Cancelled').length;

  // Compute charts data dynamically from bookings
  // Monthly Trends
  const getTrendsData = () => {
    const months = {};
    bookings.forEach(b => {
      if (!b.preferred_date) return;
      const date = new Date(b.preferred_date);
      const mLabel = date.toLocaleString('default', { month: 'short', year: '2-digit' });
      months[mLabel] = (months[mLabel] || 0) + 1;
    });
    // Sort chronologically
    return Object.keys(months).map(m => ({ name: m, Bookings: months[m] })).slice(-6);
  };

  // Professional utilization workloads
  const getUtilizationData = () => {
    return professionals.map(p => ({
      name: p.name.split(' ')[0],
      Workload: p.workload,
      Role: p.role === 'designer' ? 'Designer' : 'Engineer'
    }));
  };

  // Filters application
  const filteredBookings = bookings.filter(b => {
    const matchesSearch = 
      b.client_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (b.booking_id_str && b.booking_id_str.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
    const matchesDate = !dateFilter || b.preferred_date === dateFilter;
    
    let matchesProfessional = true;
    if (professionalFilter !== 'all') {
      const [pId, pRole] = professionalFilter.split('-');
      matchesProfessional = b.assigned_to_id === Number(pId) && b.assigned_to_role === pRole;
    }

    return matchesSearch && matchesStatus && matchesDate && matchesProfessional;
  });

  // Handle New Booking Submission
  const handleCreateBooking = async (e) => {
    e.preventDefault();
    try {
      await bookSiteVisit(newBookingForm);
      setIsNewBookingOpen(false);
      // reset form
      setNewBookingForm({
        client_name: '',
        email: '',
        phone: '',
        property_type: 'Living Room',
        address: '',
        preferred_date: '',
        preferred_slot: '09:00 AM - 12:00 PM',
        notes: ''
      });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  // Open Assignment Dialog
  const openAssignmentModal = (booking) => {
    setSelectedBooking(booking);
    // Preset with recommendations or default
    setAssignmentOverride({
      assigned_to_id: booking.assigned_to_id || '',
      assigned_to_role: booking.assigned_to_role || 'designer',
      reason: booking.assignment_reason || ''
    });
    setIsAssignModalOpen(true);
  };

  // Handle Assignment Confirm/Override
  const handleConfirmAssignment = async () => {
    if (!selectedBooking) return;
    try {
      await assignProfessional(selectedBooking.id, {
        assigned_to_id: Number(assignmentOverride.assigned_to_id),
        assigned_to_role: assignmentOverride.assigned_to_role,
        reason: assignmentOverride.reason
      });
      setIsAssignModalOpen(false);
      setSelectedBooking(null);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  // View Activities
  const handleViewActivities = async (booking) => {
    setSelectedBooking(booking);
    setActivitiesList([]);
    setAssignmentsList([]);
    setActivitiesModalOpen(true);
    try {
      const list = await getBookingActivities(booking.id);
      setActivitiesList(list);
      const assigns = await getBookingAssignments(booking.id);
      setAssignmentsList(assigns);
    } catch (e) {
      console.error(e);
    }
  };

  // View Report
  const handleViewReport = async (booking) => {
    setSelectedBooking(booking);
    setReportData(null);
    setReportModalOpen(true);
    try {
      const rep = await getVisitReport(booking.id);
      setReportData(rep);
    } catch (e) {
      console.error(e);
    }
  };

  // ------------------------------------
  // CRM DETAIL DRAWER / TIMELINE ACTIONS
  // ------------------------------------
  const handleOpenBookingDetails = async (booking) => {
    setSelectedBooking(booking);
    setDetailBookingOpen(true);
    setActiveDetailTab('timeline');
    setLoadingDetailData(true);
    setActivitiesList([]);
    setAssignmentsList([]);
    setDetailNotes([]);
    setDetailTasks([]);
    setDetailComms([]);
    setDetailQuotation(null);
    setNewNoteText('');
    setNewTaskTitle('');
    setNewTaskDueDate('');
    setNewTaskAssigned('');

    try {
      // 1. Fetch activities and assignments
      const actPromise = getBookingActivities(booking.id).then(setActivitiesList).catch(console.error);
      const asgPromise = getBookingAssignments(booking.id).then(setAssignmentsList).catch(console.error);
      
      // 2. Fetch notes
      const notesPromise = api.get(`/bookings/${booking.id}/notes`).then(res => setDetailNotes(res.data)).catch(console.error);
      
      // 3. Fetch tasks
      const tasksPromise = api.get(`/bookings/${booking.id}/tasks`).then(res => setDetailTasks(res.data)).catch(console.error);
      
      // 4. Fetch communications
      const commsPromise = api.get(`/bookings/${booking.id}/communications`).then(res => setDetailComms(res.data)).catch(console.error);
      
      // 5. Fetch quotation
      const quotePromise = api.get(`/bookings/${booking.id}/quotation`).then(res => setDetailQuotation(res.data)).catch(err => {
        if (err.response?.status !== 404) console.error(err);
      });

      await Promise.all([actPromise, asgPromise, notesPromise, tasksPromise, commsPromise, quotePromise]);
    } catch (e) {
      console.error('Failed to load booking detail data:', e);
    } finally {
      setLoadingDetailData(false);
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNoteText.trim() || !selectedBooking) return;
    try {
      const res = await api.post(`/bookings/${selectedBooking.id}/notes`, { note_text: newNoteText });
      setDetailNotes(prev => [res.data, ...prev]);
      setNewNoteText('');
      showToast('Note added successfully!', 'success');
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || 'Failed to add note.', 'error');
    }
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !newTaskDueDate || !selectedBooking) return;
    try {
      const res = await api.post(`/bookings/${selectedBooking.id}/tasks`, {
        title: newTaskTitle,
        due_date: newTaskDueDate,
        assigned_to_id: newTaskAssigned ? Number(newTaskAssigned) : null
      });
      setDetailTasks(prev => [res.data, ...prev]);
      setNewTaskTitle('');
      setNewTaskDueDate('');
      setNewTaskAssigned('');
      showToast('Task added successfully!', 'success');
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || 'Failed to add task.', 'error');
    }
  };

  const handleToggleTaskStatus = async (task) => {
    const newStatus = task.status === 'Completed' ? 'Pending' : 'Completed';
    try {
      await api.patch(`/tasks/${task.id}`, { status: newStatus });
      setDetailTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
      showToast(`Task marked as ${newStatus.toLowerCase()}`, 'success');
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || 'Failed to update task.', 'error');
    }
  };

  // ------------------------------------
  // DATABASE EXPLORER FUNCTIONS
  // ------------------------------------
  const getEndpointForTable = (table) => {
    if (table === 'site_engineers') return 'site-engineers';
    if (table === 'booking_activities') return 'booking-activities';
    if (table === 'visit_reports') return 'visit-reports';
    return table;
  };

  const fetchDbSummary = async () => {
    try {
      const res = await api.get('/admin/database/summary');
      setDbSummary(res.data);
    } catch (err) {
      console.error('Failed to fetch DB summary:', err);
    }
  };

  const fetchDbTableData = async (table) => {
    setLoadingDb(true);
    setDbError(null);
    try {
      const endpoint = getEndpointForTable(table);
      const res = await api.get(`/admin/database/${endpoint}`);
      setDbTableData(res.data);
      setDbPage(1); // reset to page 1 on table change
    } catch (err) {
      console.error(`Failed to fetch DB table ${table}:`, err);
      setDbError(err.response?.data?.message || err.message || `Failed to fetch ${table} table.`);
    } finally {
      setLoadingDb(false);
    }
  };

  const refreshDatabaseViewer = async () => {
    await fetchDbSummary();
    await fetchDbTableData(selectedDbTable);
  };

  useEffect(() => {
    if (crmTab === 'database_viewer') {
      refreshDatabaseViewer();
    }
  }, [crmTab, selectedDbTable]);

  // Client side sorting & filtering helper
  const getFilteredDbRecords = () => {
    if (!dbTableData) return [];
    let records = [...dbTableData];

    // 1. Filter based on dbSearch
    if (dbSearch.trim() !== '') {
      const q = dbSearch.toLowerCase().trim();
      records = records.filter(row => {
        return Object.values(row).some(val => 
          String(val).toLowerCase().includes(q)
        );
      });
    }

    // 2. Sort based on dbSortColumn
    if (dbSortColumn) {
      records.sort((a, b) => {
        let valA = a[dbSortColumn];
        let valB = b[dbSortColumn];

        if (valA === null || valA === undefined) valA = '';
        if (valB === null || valB === undefined) valB = '';

        if (typeof valA === 'number' && typeof valB === 'number') {
          return dbSortOrder === 'asc' ? valA - valB : valB - valA;
        }

        const strA = String(valA).toLowerCase();
        const strB = String(valB).toLowerCase();
        if (strA < strB) return dbSortOrder === 'asc' ? -1 : 1;
        if (strA > strB) return dbSortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return records;
  };

  const filteredDbRecords = getFilteredDbRecords();
  const dbTotalCount = filteredDbRecords.length;
  const dbTotalPages = Math.max(1, Math.ceil(dbTotalCount / dbLimit));
  const paginatedDbRecords = filteredDbRecords.slice(
    (dbPage - 1) * dbLimit,
    dbPage * dbLimit
  );

  const handleSortDb = (column) => {
    if (dbSortColumn === column) {
      setDbSortOrder(dbSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setDbSortColumn(column);
      setDbSortOrder('asc');
    }
  };

  // ------------------------------------
  // QUOTATION CREATOR FUNCTIONS
  // ------------------------------------
  const handleAddQuoteItem = () => {
    setQuoteItems([...quoteItems, { description: '', qty: 1, unit_price: 0 }]);
  };

  const handleRemoveQuoteItem = (index) => {
    if (quoteItems.length === 1) return;
    setQuoteItems(quoteItems.filter((_, idx) => idx !== index));
  };

  const handleQuoteItemChange = (index, field, value) => {
    const updated = [...quoteItems];
    updated[index][field] = value;
    setQuoteItems(updated);
  };

  const calculateQuotationValues = () => {
    const subtotal = quoteItems.reduce((sum, item) => sum + (Number(item.qty) * Number(item.unit_price) || 0), 0);
    const discount = Number(quoteDiscount) || 0;
    const gstRate = Number(quoteGst) || 18;
    const taxableAmount = Math.max(0, subtotal - discount);
    const tax = taxableAmount * (gstRate / 100);
    const grandTotal = taxableAmount + tax;
    return { subtotal, discount, tax, grandTotal };
  };

  const { subtotal: qSubtotal, discount: qDiscount, tax: qTax, grandTotal: qGrandTotal } = calculateQuotationValues();

  // Fetch quotation on booking select (in creator tab)
  useEffect(() => {
    if (crmTab === 'quotation_creator' && selectedQuotationBooking) {
      // Check if it already has a quotation
      api.get(`/bookings/${selectedQuotationBooking.id}/quotation`)
        .then(res => {
          setDetailQuotation(res.data);
        })
        .catch(err => {
          if (err.response?.status === 404) {
            setDetailQuotation(null);
          } else {
            console.error(err);
          }
        });
    } else {
      setDetailQuotation(null);
    }
  }, [crmTab, selectedQuotationBooking]);

  const handlePublishQuotation = async (e) => {
    e.preventDefault();
    if (!selectedQuotationBooking) return;
    
    // Validate items
    const invalidItem = quoteItems.some(item => !item.description.trim() || Number(item.qty) <= 0 || Number(item.unit_price) < 0);
    if (invalidItem) {
      showToast('Please fill all item descriptions, quantities (>0) and prices (>=0)', 'error');
      return;
    }

    setSubmittingQuote(true);
    try {
      const payload = {
        subtotal: qSubtotal,
        discount: qDiscount,
        gst: Number(quoteGst),
        tax: qTax,
        grand_total: qGrandTotal,
        items: quoteItems
      };
      
      const res = await api.post(`/bookings/${selectedQuotationBooking.id}/quotation`, payload);
      showToast('Quotation created and sent successfully!', 'success');
      
      // Clear form
      setQuoteItems([{ description: '', qty: 1, unit_price: 0 }]);
      setQuoteDiscount(0);
      setQuoteGst(18);
      
      // Update state
      setDetailQuotation(res.data);
      fetchData();
      setSelectedQuotationBooking(null);
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || 'Failed to create quotation.', 'error');
    } finally {
      setSubmittingQuote(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-bgBase text-primary animate-fadeIn w-full relative overflow-x-hidden">
      
      {/* Mobile Header Toggle Bar */}
      <div className="flex lg:hidden items-center justify-between p-4 bg-white border-b border-borderColor sticky top-0 z-30 w-full shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-slate-800 flex items-center justify-center font-bold text-accentGold text-sm shadow-sm">
            GS
          </div>
          <div>
            <h3 className="font-poppins font-bold text-primary text-xs tracking-tight">Glory Simon</h3>
            <span className="text-[9px] text-accentGold uppercase font-bold tracking-widest block -mt-0.5">Scheduling CRM</span>
          </div>
        </div>
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 rounded-xl border border-borderColor text-secondary hover:text-accentGold active:scale-95 transition-all min-w-[40px] min-h-[40px] flex items-center justify-center"
          aria-label="Toggle CRM navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Mobile Drawer Backdrop */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden transition-opacity duration-300"
        />
      )}

      {/* Sidebar navigation (Drawer on mobile, permanent on desktop) */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-borderColor p-6 flex flex-col gap-6 shrink-0 shadow-xl lg:shadow-sm transform lg:transform-none transition-transform duration-300 ease-in-out ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        <div className="flex items-center justify-between border-b border-borderColor pb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-slate-800 flex items-center justify-center font-bold text-accentGold text-base shadow-md">
              GS
            </div>
            <div>
              <h3 className="font-poppins font-bold text-primary text-sm tracking-tight">Glory Simon</h3>
              <span className="text-[10px] text-accentGold uppercase font-bold tracking-widest block -mt-0.5">Scheduling CRM</span>
            </div>
          </div>
          {/* Mobile close button */}
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-2 rounded-xl hover:bg-slate-900/5 transition-all text-[#1C1C1C] min-w-[40px] min-h-[40px] flex items-center justify-center"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 flex flex-col gap-1.5 text-xs font-semibold">
          <button
            onClick={() => { setCrmTab('dashboard'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-left transition-all duration-200 min-h-[44px] ${
              crmTab === 'dashboard' 
                ? 'bg-primary text-white shadow-sm font-bold' 
                : 'text-secondary hover:bg-bgBase'
            }`}
          >
            <LayoutDashboard className="w-4.5 h-4.5" /> Analytics Dashboard
          </button>
          
          <button
            onClick={() => { setCrmTab('bookings'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-left transition-all duration-200 min-h-[44px] ${
              crmTab === 'bookings' 
                ? 'bg-primary text-white shadow-sm font-bold' 
                : 'text-secondary hover:bg-bgBase'
            }`}
          >
            <Users className="w-4.5 h-4.5" /> Bookings Management
          </button>

          <button
            onClick={() => { setCrmTab('calendar'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-left transition-all duration-200 min-h-[44px] ${
              crmTab === 'calendar' 
                ? 'bg-primary text-white shadow-sm font-bold' 
                : 'text-secondary hover:bg-bgBase'
            }`}
          >
            <Calendar className="w-4.5 h-4.5" /> Visit Calendar
          </button>

          <button
            onClick={() => { setCrmTab('reports'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-left transition-all duration-200 min-h-[44px] ${
              crmTab === 'reports' 
                ? 'bg-primary text-white shadow-sm font-bold' 
                : 'text-secondary hover:bg-bgBase'
            }`}
          >
            <FileSpreadsheet className="w-4.5 h-4.5" /> Reports & Exports
          </button>

          <button
            onClick={() => { setCrmTab('settings'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-left transition-all duration-200 min-h-[44px] ${
              crmTab === 'settings' 
                ? 'bg-primary text-white shadow-sm font-bold' 
                : 'text-secondary hover:bg-bgBase'
            }`}
          >
            <Settings className="w-4.5 h-4.5" /> Staff Availability
          </button>

          <button
            onClick={() => { setCrmTab('quotation_creator'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-left transition-all duration-200 min-h-[44px] ${
              crmTab === 'quotation_creator' 
                ? 'bg-primary text-white shadow-sm font-bold' 
                : 'text-secondary hover:bg-bgBase'
            }`}
          >
            <FilePlus className="w-4.5 h-4.5" /> Quotation Creator
          </button>

          <button
            onClick={() => { setCrmTab('diagnostics'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-left transition-all duration-200 min-h-[44px] ${
              crmTab === 'diagnostics' 
                ? 'bg-primary text-white shadow-sm font-bold' 
                : 'text-secondary hover:bg-bgBase'
            }`}
          >
            <Activity className="w-4.5 h-4.5" /> System Diagnostics
          </button>

          <button
            onClick={() => { setCrmTab('database_viewer'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-left transition-all duration-200 min-h-[44px] ${
              crmTab === 'database_viewer' 
                ? 'bg-primary text-white shadow-sm font-bold' 
                : 'text-secondary hover:bg-bgBase'
            }`}
          >
            <Database className="w-4.5 h-4.5" /> Database Viewer
          </button>
        </nav>

        <div className="border-t border-borderColor pt-4">
          <button 
            onClick={logout}
            className="w-full py-3 border border-borderColor hover:border-red-500 hover:text-red-500 text-xs font-bold rounded-xl transition-all duration-300 text-center bg-bgBase min-h-[44px] flex items-center justify-center"
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content body */}
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 overflow-y-auto max-h-screen">
        
        {/* Internship Review Verification Banner */}
        <div className="bg-[#FAF6F0] border border-[#C5A880]/30 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center font-bold text-accentGold text-base shadow-sm shrink-0">
              <Activity className="w-5 h-5 text-accentGold" />
            </div>
            <div>
              <h3 className="font-poppins font-bold text-sm text-primary tracking-tight">Internship Verification Board</h3>
              <p className="text-[10px] text-secondary font-medium mt-0.5">Demonstrating real-time database state and active engine connectivity.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
            {/* Active DB Pill */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-borderColor rounded-xl">
              <span className="text-[10px] text-secondary">Active Database:</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide ${
                dbEngine === 'MYSQL' ? 'bg-blue-100 text-blue-800 border border-blue-200' : 'bg-amber-100 text-amber-800 border border-amber-200'
              }`}>
                {dbEngine}
              </span>
            </div>

            {/* Stats list */}
            <div className="flex items-center gap-4 px-4 py-1.5 bg-white border border-borderColor rounded-xl divide-x divide-borderColor">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-secondary">Total:</span>
                <span className="font-bold text-primary font-mono">{totalBookings}</span>
              </div>
              <div className="flex items-center gap-1.5 pl-4">
                <span className="text-[10px] text-secondary">Pending:</span>
                <span className="font-bold text-amber-500 font-mono">{pendingVisits}</span>
              </div>
              <div className="flex items-center gap-1.5 pl-4">
                <span className="text-[10px] text-secondary">Completed:</span>
                <span className="font-bold text-green-600 font-mono">{completedVisits}</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* TAB 1: CRM DASHBOARD */}
        {crmTab === 'dashboard' && (
          <div className="space-y-8 animate-fadeIn">
            
            {/* Quick Actions Panel */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-borderColor pb-4">
              <div>
                <h2 className="font-poppins text-xl font-bold text-primary">Overview Dashboard</h2>
                <p className="text-xs text-secondary mt-0.5">Site inspection tracking and designer utilization metrics.</p>
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap gap-2.5">
                <button
                  onClick={() => setIsNewBookingOpen(true)}
                  className="px-4 py-2.5 bg-accentGold hover:bg-accentGold/90 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> New Booking
                </button>
                <button
                  onClick={() => setCrmTab('bookings')}
                  className="px-4 py-2.5 bg-white border border-borderColor hover:border-accentGold text-secondary hover:text-accentGold text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
                >
                  <UserPlus className="w-4 h-4" /> Assign Professional
                </button>
                <a
                  href="http://localhost:5000/api/reports/csv"
                  className="px-4 py-2.5 bg-white border border-borderColor hover:border-accentGold text-secondary hover:text-accentGold text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
                >
                  <FileSpreadsheet className="w-4 h-4" /> Export CSV
                </a>
                <button
                  onClick={() => setCrmTab('reports')}
                  className="px-4 py-2.5 bg-white border border-borderColor hover:border-accentGold text-secondary hover:text-accentGold text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
                >
                  <FileText className="w-4 h-4" /> Download Reports
                </button>
              </div>
            </div>

            {/* exactly 5 KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
              <div className="bg-white border border-borderColor rounded-2xl p-5 shadow-sm space-y-2 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-2 h-full bg-accentGold"></div>
                <span className="text-[10px] text-secondary/50 font-bold uppercase tracking-wider block font-semibold">Total Bookings</span>
                <h3 className="text-3xl font-bold text-primary font-poppins">{totalBookings}</h3>
              </div>
              <div className="bg-white border border-borderColor rounded-2xl p-5 shadow-sm space-y-2 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-2 h-full bg-blue-500"></div>
                <span className="text-[10px] text-secondary/50 font-bold uppercase tracking-wider block font-semibold">Today's Visits</span>
                <h3 className="text-3xl font-bold text-primary font-poppins">{todayVisits}</h3>
              </div>
              <div className="bg-white border border-borderColor rounded-2xl p-5 shadow-sm space-y-2 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-2 h-full bg-amber-500"></div>
                <span className="text-[10px] text-secondary/50 font-bold uppercase tracking-wider block font-semibold">Pending Visits</span>
                <h3 className="text-3xl font-bold text-amber-500 font-poppins">{pendingVisits}</h3>
              </div>
              <div className="bg-white border border-borderColor rounded-2xl p-5 shadow-sm space-y-2 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-2 h-full bg-green-500"></div>
                <span className="text-[10px] text-secondary/50 font-bold uppercase tracking-wider block font-semibold">Completed Visits</span>
                <h3 className="text-3xl font-bold text-green-500 font-poppins">{completedVisits}</h3>
              </div>
              <div className="bg-white border border-borderColor rounded-2xl p-5 shadow-sm space-y-2 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-2 h-full bg-red-500"></div>
                <span className="text-[10px] text-secondary/50 font-bold uppercase tracking-wider block font-semibold">Cancelled Visits</span>
                <h3 className="text-3xl font-bold text-red-500 font-poppins">{cancelledVisits}</h3>
              </div>
            </div>

            {/* Graphs Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              
              {/* Line chart: booking trends */}
              <div className="bg-white border border-borderColor rounded-2xl p-6 shadow-sm space-y-4">
                <div>
                  <h4 className="font-poppins text-sm font-bold text-primary">Consultation Volume Trends</h4>
                  <p className="text-[10px] text-secondary mt-0.5">Visits scheduled over the past months.</p>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={getTrendsData()}>
                      <XAxis dataKey="name" stroke="#94A3B8" fontSize={9} tickLine={false} axisLine={false} />
                      <YAxis stroke="#94A3B8" fontSize={9} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                      <Line type="monotone" dataKey="Bookings" stroke="#D4A017" strokeWidth={2.5} dot={{ r: 4, fill: '#D4A017' }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Bar chart: designer workloads */}
              <div className="bg-white border border-borderColor rounded-2xl p-6 shadow-sm space-y-4">
                <div>
                  <h4 className="font-poppins text-sm font-bold text-primary">Designer & Engineer Workload</h4>
                  <p className="text-[10px] text-secondary mt-0.5">Active inspection duties assigned per staff professional.</p>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={getUtilizationData()}>
                      <XAxis dataKey="name" stroke="#94A3B8" fontSize={9} tickLine={false} axisLine={false} />
                      <YAxis stroke="#94A3B8" fontSize={9} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                      <Bar dataKey="Workload" fill="#1E293B" radius={[4, 4, 0, 0]} maxBarSize={30} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* TAB 2: BOOKINGS DATABASE & SEARCH/FILTER */}
        {crmTab === 'bookings' && (
          <div className="bg-white border border-borderColor rounded-2xl p-6 shadow-sm space-y-6 animate-fadeIn">
            
            {/* Table Header / Title */}
            <div>
              <h2 className="font-poppins text-lg font-bold text-primary">Bookings Database</h2>
              <p className="text-xs text-secondary mt-0.5">Search, filter, auto-assign, and manage site inspection statuses.</p>
            </div>

            {/* Table filters */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-borderColor/40 pb-4">
              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                {/* Search query */}
                <div className="flex items-center gap-2 bg-bgBase px-3.5 py-2 border border-borderColor rounded-xl w-64">
                  <Search className="w-4 h-4 text-secondary/60 shrink-0" />
                  <input
                    type="text"
                    className="bg-transparent text-xs text-primary outline-none placeholder-secondary w-full"
                    placeholder="Search Booking ID or Client Name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                {/* Status Filter */}
                <select
                  className="px-3.5 py-2 bg-bgBase text-xs font-bold text-secondary border border-borderColor rounded-xl outline-none"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="Assigned">Assigned</option>
                  <option value="Scheduled">Scheduled</option>
                  <option value="Visit Completed">Visit Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>

                {/* Date Filter */}
                <div className="flex items-center gap-1.5 bg-bgBase px-3 py-1.5 border border-borderColor rounded-xl">
                  <Calendar className="w-3.5 h-3.5 text-secondary shrink-0" />
                  <input 
                    type="date"
                    className="bg-transparent text-xs text-secondary outline-none font-bold"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                  />
                  {dateFilter && (
                    <button onClick={() => setDateFilter('')} className="text-[10px] text-red-500 hover:underline px-1 font-bold">Clear</button>
                  )}
                </div>

                {/* Professional Filter */}
                <select
                  className="px-3.5 py-2 bg-bgBase text-xs font-bold text-secondary border border-borderColor rounded-xl outline-none"
                  value={professionalFilter}
                  onChange={(e) => setProfessionalFilter(e.target.value)}
                >
                  <option value="all">All Professionals</option>
                  {professionals.map(p => (
                    <option key={`${p.id}-${p.role}`} value={`${p.id}-${p.role}`}>{p.name} ({p.role === 'designer' ? 'Designer' : 'Engineer'})</option>
                  ))}
                </select>
              </div>

              {/* Export actions */}
              <a
                href="http://localhost:5000/api/reports/csv"
                className="px-4.5 py-2 bg-primary text-white hover:bg-slate-800 text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5 shrink-0"
              >
                <Download className="w-3.5 h-3.5" /> Export Bookings CSV
              </a>
            </div>


            ) : (
              /* EMPTY STATE: NO MATCHING BOOKINGS */
              <div className="text-center py-16 space-y-4 border border-dashed border-borderColor rounded-2xl">
                <AlertCircle className="w-10 h-10 text-secondary/30 mx-auto" />
                <h3 className="font-poppins font-bold text-sm text-primary">No matching bookings</h3>
                <p className="text-xs text-secondary max-w-xs mx-auto leading-relaxed">Adjust your search query or filters to find other site visit consultations.</p>
              </div>
            )}

          </div>
        )}

        {/* TAB 3: CALENDAR VIEW */}
        {crmTab === 'calendar' && (
          <div className="bg-white border border-borderColor rounded-2xl p-6 shadow-sm space-y-4 animate-fadeIn">
            <div>
              <h2 className="font-poppins text-lg font-bold text-primary">Visit Calendar</h2>
              <p className="text-xs text-secondary mt-0.5">Visual monthly scheduler plotted with unique Booking IDs.</p>
            </div>
            
            <InteractiveCalendar events={bookings} />
          </div>
        )}

        {/* TAB 4: REPORTS DOWNLOADS PANE */}
        {crmTab === 'reports' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-white border border-borderColor rounded-2xl p-6 shadow-sm space-y-6">
              <div>
                <h2 className="font-poppins text-lg font-bold text-primary">Reports & Exports</h2>
                <p className="text-xs text-secondary mt-0.5">Download consolidated booking lists and individual AI site visit summaries.</p>
              </div>

              {/* CSV export card */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-5 border border-borderColor bg-bgBase rounded-2xl flex items-start gap-4 shadow-sm hover:border-accentGold transition-colors">
                  <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  <div className="space-y-2.5">
                    <div>
                      <h4 className="font-poppins font-bold text-sm text-primary">Consolidated CSV Export</h4>
                      <p className="text-xs text-secondary mt-0.5">Download full spreadsheets containing client details, slots, regional mapping coordinates, and workloads.</p>
                    </div>
                    <a
                      href="http://localhost:5000/api/reports/csv"
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" /> Download Spreadsheet
                    </a>
                  </div>
                </div>

                {/* Info Alert */}
                <div className="p-5 border border-borderColor bg-bgBase rounded-2xl flex items-start gap-4 shadow-sm">
                  <div className="p-3 bg-accentGold/10 text-accentGold rounded-xl shrink-0">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-poppins font-bold text-sm text-primary">AI Compilation Info</h4>
                    <p className="text-xs text-secondary leading-relaxed mt-0.5">Individual site summaries are compiled automatically using a rule-based AI layer. They compile dimensional coordinates and light vectors once the visit transitions to Completed.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Individual Completed Visit reports */}
            <div className="bg-white border border-borderColor rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="font-poppins font-bold text-xs uppercase tracking-widest text-secondary/60">Individual Site Inspection Reports</h3>
              
              {bookings.filter(b => b.status === 'Visit Completed').length > 0 ? (
                <div className="divide-y divide-borderColor/60">
                  {bookings.filter(b => b.status === 'Visit Completed').map((b) => (
                    <div key={b.id} className="py-3.5 flex items-center justify-between gap-4">
                      <div>
                        <span className="font-mono text-accentGold font-bold text-[11px] block">{b.booking_id_str}</span>
                        <h4 className="font-bold text-xs text-primary mt-0.5">{b.client_name} - {b.property_type}</h4>
                        <p className="text-[10px] text-secondary/80 mt-0.5">Inspected on preferred schedule {b.preferred_date}</p>
                      </div>

                      <a
                        href={`http://localhost:5000/api/reports/pdf/${b.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-bgBase border border-borderColor hover:border-accentGold hover:text-accentGold text-[10px] font-bold rounded-lg transition-colors flex items-center gap-1"
                      >
                        <Download className="w-3 h-3" /> Report PDF
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-secondary/60 text-center py-6">No completed visits with generated reports found.</p>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: STAFF AVAILABILITY & SETTINGS */}
        {crmTab === 'settings' && (
          <div className="bg-white border border-borderColor rounded-2xl p-6 shadow-sm space-y-6 animate-fadeIn">
            <div>
              <h2 className="font-poppins text-lg font-bold text-primary">Staff Availability Settings</h2>
              <p className="text-xs text-secondary mt-0.5">Toggle availability status for designers and site engineers. Unavailable staff are skipped by the assignment engine.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Designers availability list */}
              <div className="space-y-4">
                <h3 className="font-poppins font-bold text-xs uppercase tracking-widest text-accentGold border-b border-borderColor/40 pb-2">Interior Designers</h3>
                <div className="space-y-3.5">
                  {professionals.filter(p => p.role === 'designer').map((p) => (
                    <div key={p.id} className="p-4 border border-borderColor/40 bg-bgBase rounded-xl flex items-center justify-between gap-4 shadow-inner">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-accentGold/10 text-accentGold font-bold flex items-center justify-center text-xs">
                          {p.name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-bold text-xs text-primary">{p.name}</h4>
                          <p className="text-[10px] text-secondary mt-0.5">Experience: {p.experience} • Workload: {p.workload}</p>
                        </div>
                      </div>

                      <select
                        value={p.availability}
                        onChange={(e) => updateProfessionalAvailability('designer', p.id, e.target.value)}
                        className={`px-2 py-1 text-[10px] font-bold rounded-lg border outline-none ${
                          p.availability === 'Available' 
                            ? 'bg-green-50 border-green-200 text-green-700'
                            : p.availability === 'Busy'
                            ? 'bg-amber-50 border-amber-200 text-amber-700'
                            : 'bg-red-50 border-red-200 text-red-700'
                        }`}
                      >
                        <option value="Available">Available</option>
                        <option value="Busy">Busy</option>
                        <option value="On Leave">On Leave</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {/* Site Engineers availability list */}
              <div className="space-y-4">
                <h3 className="font-poppins font-bold text-xs uppercase tracking-widest text-accentGold border-b border-borderColor/40 pb-2">Site Engineers</h3>
                <div className="space-y-3.5">
                  {professionals.filter(p => p.role === 'engineer' || p.role === 'site_engineer').map((p) => (
                    <div key={p.id} className="p-4 border border-borderColor/40 bg-bgBase rounded-xl flex items-center justify-between gap-4 shadow-inner">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-accentGold/10 text-accentGold font-bold flex items-center justify-center text-xs">
                          {p.name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-bold text-xs text-primary">{p.name}</h4>
                          <p className="text-[10px] text-secondary mt-0.5">Rating: {p.rating}★ • Workload: {p.workload}</p>
                        </div>
                      </div>

                      <select
                        value={p.availability}
                        onChange={(e) => updateProfessionalAvailability('engineer', p.id, e.target.value)}
                        className={`px-2 py-1 text-[10px] font-bold rounded-lg border outline-none ${
                          p.availability === 'Available' 
                            ? 'bg-green-50 border-green-200 text-green-700'
                            : p.availability === 'Busy'
                            ? 'bg-amber-50 border-amber-200 text-amber-700'
                            : 'bg-red-50 border-red-200 text-red-700'
                        }`}
                      >
                        <option value="Available">Available</option>
                        <option value="Busy">Busy</option>
                        <option value="On Leave">On Leave</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 6: SYSTEM DIAGNOSTICS */}
        {crmTab === 'diagnostics' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-white border border-borderColor rounded-2xl p-6 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="font-poppins text-lg font-bold text-primary">System Diagnostics</h2>
                  <p className="text-xs text-secondary mt-0.5">Database connectivity details and resource statistics.</p>
                </div>
                {diagnosticsData && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-secondary font-semibold">Active Database:</span>
                    <span className={`px-3 py-1 rounded-xl text-xs font-bold ${
                      diagnosticsData.activeDatabase === 'MYSQL' 
                        ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                    }`}>
                      {diagnosticsData.activeDatabase}
                    </span>
                  </div>
                )}
              </div>

              {loadingDiagnostics ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-3">
                  <RefreshCw className="w-8 h-8 animate-spin text-accentGold" />
                  <p className="text-xs text-secondary font-medium">Fetching database statistics...</p>
                </div>
              ) : diagnosticsError ? (
                <div className="p-5 border border-red-200 bg-red-50 rounded-2xl flex items-start gap-4">
                  <AlertCircle className="w-6 h-6 text-red-600 shrink-0" />
                  <div className="space-y-1">
                    <h4 className="font-poppins font-bold text-sm text-red-800">Connection Error</h4>
                    <p className="text-xs text-red-700 leading-relaxed">Could not reach the diagnostics endpoint: {diagnosticsError}</p>
                    <button 
                      onClick={fetchDiagnostics} 
                      className="mt-2 px-3 py-1 bg-red-600 hover:bg-red-700 text-white font-bold text-[10px] rounded-lg transition-colors"
                    >
                      Retry Connection
                    </button>
                  </div>
                </div>
              ) : diagnosticsData ? (
                <div className="space-y-6">
                  {/* KPI cards Grid */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-bgBase border border-borderColor/40 rounded-2xl p-5 shadow-inner space-y-2">
                      <span className="text-[10px] text-secondary font-bold uppercase tracking-wider block">Total Users</span>
                      <h3 className="text-3xl font-bold text-primary font-poppins">{diagnosticsData.totalUsers}</h3>
                    </div>
                    <div className="bg-bgBase border border-borderColor/40 rounded-2xl p-5 shadow-inner space-y-2">
                      <span className="text-[10px] text-secondary font-bold uppercase tracking-wider block">Total Bookings</span>
                      <h3 className="text-3xl font-bold text-primary font-poppins">{diagnosticsData.totalBookings}</h3>
                    </div>
                    <div className="bg-bgBase border border-borderColor/40 rounded-2xl p-5 shadow-inner space-y-2">
                      <span className="text-[10px] text-secondary font-bold uppercase tracking-wider block">Total Designers</span>
                      <h3 className="text-3xl font-bold text-primary font-poppins">{diagnosticsData.totalDesigners}</h3>
                    </div>
                    <div className="bg-bgBase border border-borderColor/40 rounded-2xl p-5 shadow-inner space-y-2">
                      <span className="text-[10px] text-secondary font-bold uppercase tracking-wider block">Total Site Engineers</span>
                      <h3 className="text-3xl font-bold text-primary font-poppins">{diagnosticsData.totalEngineers}</h3>
                    </div>
                  </div>

                  {/* Two-Column Grid: Tables list & Latest Users */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column: Tables list (1/3 width) */}
                    <div className="space-y-3 lg:col-span-1">
                      <h3 className="font-poppins font-bold text-xs uppercase tracking-widest text-secondary/60">Database Tables</h3>
                      {diagnosticsData.tableCounts && diagnosticsData.tableCounts.length > 0 ? (
                        <div className="overflow-x-auto border border-borderColor/60 rounded-xl bg-bgBase/10">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="border-b border-borderColor bg-bgBase text-secondary font-bold">
                                <th className="py-2.5 px-4">Table Name</th>
                                <th className="py-2.5 px-4 text-right">Rows</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-borderColor/40 bg-white">
                              {diagnosticsData.tableCounts.map((t) => (
                                <tr key={t.tableName} className="hover:bg-bgBase/30 transition-colors">
                                  <td className="py-2.5 px-4 font-mono font-semibold text-primary">{t.tableName}</td>
                                  <td className="py-2.5 px-4 text-right font-bold text-accentGold">{t.rowCount}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-xs text-secondary/60 py-2">No table details available.</p>
                      )}
                    </div>

                    {/* Right Column: Latest 10 Users (2/3 width) */}
                    <div className="space-y-3 lg:col-span-2">
                      <h3 className="font-poppins font-bold text-xs uppercase tracking-widest text-secondary/60">Recent User Registrations (Last 10)</h3>
                      {diagnosticsData.recentUsers && diagnosticsData.recentUsers.length > 0 ? (
                        <div className="overflow-x-auto border border-borderColor/60 rounded-xl">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="border-b border-borderColor bg-bgBase text-secondary font-bold">
                                <th className="py-2.5 px-4">ID</th>
                                <th className="py-2.5 px-4">Name</th>
                                <th className="py-2.5 px-4">Email</th>
                                <th className="py-2.5 px-4">Role</th>
                                <th className="py-2.5 px-4">Phone</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-borderColor/40 bg-white">
                              {diagnosticsData.recentUsers.map((u) => (
                                <tr key={u.id} className="hover:bg-bgBase/30 transition-colors">
                                  <td className="py-2.5 px-4 text-secondary font-mono">{u.id}</td>
                                  <td className="py-2.5 px-4 font-semibold">{u.name}</td>
                                  <td className="py-2.5 px-4 text-secondary">{u.email}</td>
                                  <td className="py-2.5 px-4">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      u.role === 'admin' 
                                        ? 'bg-red-50 text-red-700 border border-red-150' 
                                        : 'bg-slate-100 text-slate-800 border border-slate-200'
                                    }`}>
                                      {u.role}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-4 text-secondary font-medium">{u.phone}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-xs text-secondary/60 py-2">No recent users found.</p>
                      )}
                    </div>
                  </div>

                  {/* Recent Bookings Table */}
                  <div className="space-y-3">
                    <h3 className="font-poppins font-bold text-xs uppercase tracking-widest text-secondary/60">Recent Booking Records (Last 10)</h3>
                    {diagnosticsData.recentBookings && diagnosticsData.recentBookings.length > 0 ? (
                      <div className="overflow-x-auto border border-borderColor/60 rounded-xl">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-borderColor bg-bgBase text-secondary font-bold">
                              <th className="py-2.5 px-4">Booking ID</th>
                              <th className="py-2.5 px-4">Client Name</th>
                              <th className="py-2.5 px-4">Email</th>
                              <th className="py-2.5 px-4">Phone</th>
                              <th className="py-2.5 px-4">Status</th>
                              <th className="py-2.5 px-4">Created At</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-borderColor/40 bg-white">
                            {diagnosticsData.recentBookings.map((b) => (
                              <tr key={b.id} className="hover:bg-bgBase/30 transition-colors">
                                <td className="py-3 px-4 font-mono font-bold text-accentGold">{b.booking_id_str || `GSI-TEMP-${b.id}`}</td>
                                <td className="py-3 px-4 font-semibold">{b.client_name}</td>
                                <td className="py-3 px-4 text-secondary">{b.email}</td>
                                <td className="py-3 px-4 text-secondary font-medium">{b.phone}</td>
                                <td className="py-3 px-4">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    b.status === 'Visit Completed'
                                      ? 'bg-green-50 text-green-700 border border-green-150'
                                      : b.status === 'Cancelled'
                                      ? 'bg-red-50 text-red-700 border border-red-150'
                                      : b.status === 'Pending'
                                      ? 'bg-amber-50 text-amber-700 border border-amber-150'
                                      : 'bg-blue-50 text-blue-700 border border-blue-150'
                                  }`}>
                                    {b.status}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-secondary/70">{new Date(b.created_at).toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-xs text-secondary/60 text-center py-6">No bookings found in database.</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <button 
                    onClick={fetchDiagnostics} 
                    className="px-4 py-2 bg-accentGold text-white font-bold text-xs rounded-xl shadow-sm"
                  >
                    Load Diagnostics
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 7: DATABASE VIEWER */}
        {crmTab === 'database_viewer' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-white border border-borderColor rounded-2xl p-6 shadow-sm space-y-6">
              
              {/* Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="font-poppins text-lg font-bold text-primary">Database Viewer & Explorer</h2>
                  <p className="text-xs text-secondary mt-0.5">Inspect raw MySQL database tables, check rows, search, and paginate.</p>
                </div>
                <button
                  onClick={refreshDatabaseViewer}
                  className="px-4 py-2 border border-borderColor hover:border-accentGold hover:text-accentGold text-xs font-bold rounded-xl bg-bgBase transition-all flex items-center gap-1.5 shrink-0"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Refresh Data
                </button>
              </div>

              {/* Database Summary Section */}
              <div className="space-y-3">
                <h3 className="font-poppins font-bold text-xs uppercase tracking-widest text-secondary/60">Database Summary</h3>
                {dbSummary ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 text-xs font-semibold">
                    <div className="bg-bgBase border border-borderColor/40 rounded-xl p-3.5 text-center shadow-inner space-y-1">
                      <span className="text-[9px] text-secondary/60 uppercase block">Engine</span>
                      <span className="font-bold text-accentGold block text-[11px]">{dbSummary.activeDatabase}</span>
                    </div>
                    <div className="bg-bgBase border border-borderColor/40 rounded-xl p-3.5 text-center shadow-inner space-y-1">
                      <span className="text-[9px] text-secondary/60 uppercase block">Users</span>
                      <span className="font-bold text-primary block text-base leading-none">{dbSummary.totalUsers}</span>
                    </div>
                    <div className="bg-bgBase border border-borderColor/40 rounded-xl p-3.5 text-center shadow-inner space-y-1">
                      <span className="text-[9px] text-secondary/60 uppercase block">Bookings</span>
                      <span className="font-bold text-primary block text-base leading-none">{dbSummary.totalBookings}</span>
                    </div>
                    <div className="bg-bgBase border border-borderColor/40 rounded-xl p-3.5 text-center shadow-inner space-y-1">
                      <span className="text-[9px] text-secondary/60 uppercase block">Designers</span>
                      <span className="font-bold text-primary block text-base leading-none">{dbSummary.totalDesigners}</span>
                    </div>
                    <div className="bg-bgBase border border-borderColor/40 rounded-xl p-3.5 text-center shadow-inner space-y-1">
                      <span className="text-[9px] text-secondary/60 uppercase block">Engineers</span>
                      <span className="font-bold text-primary block text-base leading-none">{dbSummary.totalEngineers}</span>
                    </div>
                    <div className="bg-bgBase border border-borderColor/40 rounded-xl p-3.5 text-center shadow-inner space-y-1">
                      <span className="text-[9px] text-secondary/60 uppercase block">Assigns</span>
                      <span className="font-bold text-primary block text-base leading-none">{dbSummary.totalAssignments}</span>
                    </div>
                    <div className="bg-bgBase border border-borderColor/40 rounded-xl p-3.5 text-center shadow-inner space-y-1">
                      <span className="text-[9px] text-secondary/60 uppercase block">Reports</span>
                      <span className="font-bold text-primary block text-base leading-none">{dbSummary.totalReports}</span>
                    </div>
                    <div className="bg-bgBase border border-borderColor/40 rounded-xl p-3.5 text-center shadow-inner space-y-1">
                      <span className="text-[9px] text-secondary/60 uppercase block">Notifs</span>
                      <span className="font-bold text-primary block text-base leading-none">{dbSummary.totalNotifications}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-secondary/60 italic">Summary metrics unavailable.</p>
                )}
              </div>

              {/* Table Selector, Search & Pagination Limit Controls */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-t border-borderColor/45 pt-5">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-secondary uppercase tracking-wider">Select Table</label>
                    <select
                      className="px-3.5 py-2 bg-bgBase text-xs font-bold text-secondary border border-borderColor rounded-xl outline-none focus:border-accentGold cursor-pointer"
                      value={selectedDbTable}
                      onChange={(e) => setSelectedDbTable(e.target.value)}
                    >
                      <option value="users">users</option>
                      <option value="bookings">bookings</option>
                      <option value="designers">designers</option>
                      <option value="site_engineers">site_engineers</option>
                      <option value="assignments">assignments</option>
                      <option value="visit_reports">visit_reports</option>
                      <option value="notifications">notifications</option>
                      <option value="booking_activities">booking_activities</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1 w-64">
                    <label className="text-[9px] font-bold text-secondary uppercase tracking-wider">Search records</label>
                    <div className="flex items-center gap-2 bg-bgBase px-3.5 py-2 border border-borderColor rounded-xl">
                      <Search className="w-4 h-4 text-secondary/60 shrink-0" />
                      <input
                        type="text"
                        className="bg-transparent text-xs text-primary outline-none placeholder-secondary w-full font-semibold"
                        placeholder="Search any field..."
                        value={dbSearch}
                        onChange={(e) => { setDbSearch(e.target.value); setDbPage(1); }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end">
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-secondary uppercase tracking-wider">Rows per page</label>
                    <select
                      className="px-3 py-1.5 bg-bgBase text-xs font-bold text-secondary border border-borderColor rounded-xl outline-none"
                      value={dbLimit}
                      onChange={(e) => { setDbLimit(Number(e.target.value)); setDbPage(1); }}
                    >
                      <option value="10">10 rows</option>
                      <option value="25">25 rows</option>
                      <option value="50">50 rows</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Data Table */}
              {loadingDb ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-3">
                  <RefreshCw className="w-8 h-8 animate-spin text-accentGold" />
                  <p className="text-xs text-secondary font-medium">Querying {selectedDbTable} table from MySQL...</p>
                </div>
              ) : dbError ? (
                <div className="p-4 border border-red-200 bg-red-50 text-red-700 text-xs font-semibold rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 shrink-0" /> {dbError}
                </div>
              ) : paginatedDbRecords.length > 0 ? (
                <div className="space-y-4">
                  <div className="overflow-x-auto border border-borderColor/60 rounded-xl">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-borderColor bg-bgBase text-secondary font-bold select-none">
                          {Object.keys(dbTableData[0]).map((col) => (
                            <th 
                              key={col} 
                              onClick={() => handleSortDb(col)}
                              className="py-3 px-4 hover:bg-borderColor/30 cursor-pointer transition-colors"
                            >
                              <div className="flex items-center gap-1.5">
                                {col.replace(/_/g, ' ').toUpperCase()}
                                {dbSortColumn === col && (
                                  <span className="text-[9px] text-accentGold">
                                    {dbSortOrder === 'asc' ? '▲' : '▼'}
                                  </span>
                                )}
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-borderColor/35 bg-white font-semibold">
                        {paginatedDbRecords.map((row, idx) => (
                          <tr key={idx} className="hover:bg-bgBase/20 transition-colors">
                            {Object.entries(row).map(([key, val], cIdx) => (
                              <td key={cIdx} className="py-2.5 px-4 max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap">
                                {val === null || val === undefined ? (
                                  <span className="text-[10px] text-slate-300 italic">NULL</span>
                                ) : key.includes('created') || key.includes('updated') || key.includes('at') ? (
                                  <span className="text-secondary/70 font-mono text-[10px]">{new Date(val).toLocaleDateString()}</span>
                                ) : typeof val === 'object' ? (
                                  <span className="text-secondary font-mono text-[10px]" title={JSON.stringify(val)}>{JSON.stringify(val)}</span>
                                ) : key.includes('uuid') || key.includes('_str') ? (
                                  <span className="text-accentGold font-mono text-[10px]">{String(val)}</span>
                                ) : (
                                  <span className="text-primary">{String(val)}</span>
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Controls */}
                  <div className="flex justify-between items-center text-xs font-semibold border-t border-borderColor/40 pt-4">
                    <span className="text-secondary">
                      Showing {(dbPage - 1) * dbLimit + 1} to {Math.min(dbPage * dbLimit, dbTotalCount)} of {dbTotalCount} records
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setDbPage(prev => Math.max(1, prev - 1))}
                        disabled={dbPage === 1}
                        className={`px-3 py-1.5 border rounded-lg transition-all ${
                          dbPage === 1 ? 'border-borderColor/40 text-secondary/40 cursor-not-allowed' : 'border-borderColor hover:bg-bgBase text-secondary'
                        }`}
                      >
                        Prev
                      </button>
                      <span className="px-3 py-1 bg-primary text-white rounded-lg">{dbPage} of {dbTotalPages}</span>
                      <button
                        onClick={() => setDbPage(prev => Math.min(dbTotalPages, prev + 1))}
                        disabled={dbPage === dbTotalPages}
                        className={`px-3 py-1.5 border rounded-lg transition-all ${
                          dbPage === dbTotalPages ? 'border-borderColor/40 text-secondary/40 cursor-not-allowed' : 'border-borderColor hover:bg-bgBase text-secondary'
                        }`}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-16 border border-dashed border-borderColor rounded-2xl space-y-3">
                  <AlertCircle className="w-9 h-9 text-secondary/40 mx-auto" />
                  <h4 className="font-poppins font-bold text-sm text-primary">No table records matching filters</h4>
                  <p className="text-xs text-secondary">The MySQL query completed successfully but returned an empty dataset.</p>
                </div>
              )}

            </div>
          </div>
        )}

        {/* TAB 8: QUOTATION CREATOR */}
        {crmTab === 'quotation_creator' && (
          <div className="space-y-6 animate-fadeIn text-xs font-semibold">
            <div className="bg-white border border-borderColor rounded-2xl p-6 shadow-sm space-y-6">
              
              <div>
                <h2 className="font-poppins text-lg font-bold text-primary">Quotation Creator & Proposal Builder</h2>
                <p className="text-xs text-secondary mt-0.5">Select a customer booking, define customized woodwork estimates, apply discounts, and dispatch details directly.</p>
              </div>

              {/* Booking Selector */}
              <div className="space-y-1.5 border-b border-borderColor/40 pb-5 max-w-md">
                <label className="text-[10px] font-bold text-secondary uppercase tracking-wider block">1. Select Active Customer Booking *</label>
                <select
                  className="w-full p-2.5 bg-bgBase border border-borderColor rounded-xl outline-none font-bold text-secondary focus:border-accentGold cursor-pointer"
                  value={selectedQuotationBooking ? selectedQuotationBooking.id : ''}
                  onChange={(e) => {
                    const selectedId = Number(e.target.value);
                    const booking = bookings.find(b => b.id === selectedId);
                    setSelectedQuotationBooking(booking || null);
                  }}
                >
                  <option value="">-- Choose Booking --</option>
                  {bookings
                    .filter(b => b.status !== 'Cancelled')
                    .map(b => (
                      <option key={b.id} value={b.id}>
                        [{b.status}] {b.client_name} - {b.booking_id_str || `ID: ${b.id}`} ({b.property_type})
                      </option>
                    ))
                  }
                </select>
              </div>

              {selectedQuotationBooking ? (
                detailQuotation ? (
                  // Preexisting proposal details
                  <div className="border border-borderColor/45 bg-bgBase/20 rounded-2xl p-5 space-y-4">
                    <div className="flex justify-between items-start border-b border-borderColor/40 pb-3">
                      <div>
                        <span className="text-[9px] text-amber-600 font-bold block uppercase tracking-widest">Active Proposal Found</span>
                        <h4 className="font-poppins font-bold text-sm text-primary">Proposal ID: GSI-Q-{detailQuotation.uuid ? detailQuotation.uuid.substring(0, 8).toUpperCase() : detailQuotation.id}</h4>
                        <span className="text-[10px] text-secondary font-medium">Created: {new Date(detailQuotation.created_at).toLocaleString()}</span>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                        detailQuotation.status === 'Approved'
                          ? 'bg-green-100 text-green-700'
                          : detailQuotation.status === 'Rejected'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-amber-100 text-amber-700'
                      }`}>
                        {detailQuotation.status}
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-borderColor bg-white text-secondary font-bold">
                            <th className="py-2.5 px-3">Description</th>
                            <th className="py-2.5 px-3 text-right">Qty</th>
                            <th className="py-2.5 px-3 text-right">Unit Price</th>
                            <th className="py-2.5 px-3 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-borderColor/30">
                          {detailQuotation.items && detailQuotation.items.map((item, idx) => (
                            <tr key={idx} className="hover:bg-white/40 font-semibold">
                              <td className="py-2 px-3 text-primary">{item.description}</td>
                              <td className="py-2 px-3 text-right">{item.qty}</td>
                              <td className="py-2 px-3 text-right">₹{item.unit_price.toLocaleString()}</td>
                              <td className="py-2 px-3 text-right text-primary font-bold">₹{item.amount.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="border-t border-borderColor/40 pt-3 flex flex-col items-end gap-1.5 text-xs font-semibold">
                      <div className="flex justify-between w-48 text-secondary">
                        <span>Subtotal:</span>
                        <span>₹{detailQuotation.subtotal.toLocaleString()}</span>
                      </div>
                      {detailQuotation.discount > 0 && (
                        <div className="flex justify-between w-48 text-secondary">
                          <span>Discount:</span>
                          <span>-₹{detailQuotation.discount.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex justify-between w-48 text-secondary">
                        <span>GST ({detailQuotation.gst}%):</span>
                        <span>₹{detailQuotation.tax.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between w-48 text-primary font-bold border-t border-borderColor/30 pt-1.5 text-sm">
                        <span>Grand Total:</span>
                        <span className="text-accentGold">₹{detailQuotation.grand_total.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Form builder
                  <form onSubmit={handlePublishQuotation} className="space-y-6">
                    <div className="space-y-3">
                      <h4 className="font-poppins font-bold text-xs uppercase tracking-widest text-secondary/60">2. Proposal Estimates Table</h4>
                      <div className="overflow-x-auto border border-borderColor/60 rounded-xl">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-borderColor bg-bgBase text-secondary font-bold">
                              <th className="py-2.5 px-4 w-12 text-center">Line</th>
                              <th className="py-2.5 px-4">Item Work Description *</th>
                              <th className="py-2.5 px-4 w-28 text-right">Quantity *</th>
                              <th className="py-2.5 px-4 w-36 text-right">Unit Price (₹) *</th>
                              <th className="py-2.5 px-4 w-32 text-right">Total Amount</th>
                              <th className="py-2.5 px-4 w-16 text-center">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-borderColor/35 bg-white font-semibold">
                            {quoteItems.map((item, index) => (
                              <tr key={index} className="hover:bg-bgBase/20 transition-colors">
                                <td className="py-2 px-4 text-center font-mono text-secondary">{index + 1}</td>
                                <td className="py-2 px-4">
                                  <input
                                    type="text"
                                    required
                                    placeholder="e.g. Veneer polish sliding wardrobe..."
                                    className="w-full p-2 border border-borderColor rounded-xl outline-none focus:border-accentGold text-primary"
                                    value={item.description}
                                    onChange={(e) => handleQuoteItemChange(index, 'description', e.target.value)}
                                  />
                                </td>
                                <td className="py-2 px-4">
                                  <input
                                    type="number"
                                    required
                                    min="1"
                                    className="w-full p-2 border border-borderColor rounded-xl text-right outline-none focus:border-accentGold font-bold text-primary"
                                    value={item.qty}
                                    onChange={(e) => handleQuoteItemChange(index, 'qty', parseInt(e.target.value) || 0)}
                                  />
                                </td>
                                <td className="py-2 px-4">
                                  <input
                                    type="number"
                                    required
                                    min="0"
                                    step="100"
                                    className="w-full p-2 border border-borderColor rounded-xl text-right outline-none focus:border-accentGold font-bold text-primary"
                                    value={item.unit_price}
                                    onChange={(e) => handleQuoteItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
                                  />
                                </td>
                                <td className="py-2 px-4 text-right font-bold text-primary">
                                  ₹{(Number(item.qty) * Number(item.unit_price) || 0).toLocaleString()}
                                </td>
                                <td className="py-2 px-4 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveQuoteItem(index)}
                                    disabled={quoteItems.length === 1}
                                    className={`p-1.5 rounded-lg border transition-all ${
                                      quoteItems.length === 1 
                                        ? 'border-borderColor/40 text-secondary/35 cursor-not-allowed' 
                                        : 'border-borderColor hover:border-red-500 hover:text-red-500 text-secondary'
                                    }`}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      
                      <button
                        type="button"
                        onClick={handleAddQuoteItem}
                        className="px-4 py-2 border border-borderColor hover:border-accentGold hover:text-accentGold text-[11px] font-bold rounded-xl shadow-sm transition-all flex items-center gap-1 bg-bgBase"
                      >
                        <PlusCircle className="w-4 h-4 text-accentGold" /> Add Estimate Line Item
                      </button>
                    </div>

                    {/* Summary Calculations block */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-borderColor/40 pt-5 text-xs font-semibold">
                      <div className="space-y-4">
                        <h4 className="font-poppins font-bold text-xs uppercase tracking-widest text-secondary/60">3. Proposal Parameters</h4>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-secondary">Discount Amount (₹)</label>
                            <input
                              type="number"
                              min="0"
                              className="w-full p-2.5 bg-bgBase border border-borderColor rounded-xl outline-none focus:border-accentGold font-bold text-primary"
                              value={quoteDiscount}
                              onChange={(e) => setQuoteDiscount(parseFloat(e.target.value) || 0)}
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-secondary">GST Tax Rate (%)</label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              className="w-full p-2.5 bg-bgBase border border-borderColor rounded-xl outline-none focus:border-accentGold font-bold text-primary"
                              value={quoteGst}
                              onChange={(e) => setQuoteGst(parseFloat(e.target.value) || 18)}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Calculations Panel */}
                      <div className="p-5 border border-borderColor/40 bg-bgBase rounded-2xl flex flex-col gap-2 md:self-end">
                        <div className="flex justify-between text-secondary">
                          <span>Estimates Subtotal:</span>
                          <span className="font-bold">₹{qSubtotal.toLocaleString()}</span>
                        </div>
                        {qDiscount > 0 && (
                          <div className="flex justify-between text-secondary">
                            <span>Discount Reduction:</span>
                            <span className="font-bold text-red-600">-₹{qDiscount.toLocaleString()}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-secondary">
                          <span>Calculated GST Tax ({quoteGst}%):</span>
                          <span className="font-bold">₹{qTax.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-primary font-bold border-t border-borderColor pt-2 text-sm">
                          <span>Grand Total Estimate:</span>
                          <span className="text-accentGold text-base">₹{qGrandTotal.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-3 border-t border-borderColor/40">
                      <button
                        type="button"
                        onClick={() => setSelectedQuotationBooking(null)}
                        className="px-5 py-2 border border-borderColor text-secondary hover:text-primary rounded-xl font-bold"
                      >
                        Reset Selector
                      </button>
                      <button
                        type="submit"
                        disabled={submittingQuote || qSubtotal <= 0}
                        className={`px-6 py-2.5 text-white rounded-xl shadow-md font-bold transition-all flex items-center gap-1.5 ${
                          submittingQuote || qSubtotal <= 0 
                            ? 'bg-slate-300 text-slate-500 cursor-not-allowed' 
                            : 'bg-accentGold hover:bg-accentGold/90'
                        }`}
                      >
                        {submittingQuote ? (
                          <>
                            <RefreshCw className="w-4.5 h-4.5 animate-spin" /> Publishing...
                          </>
                        ) : (
                          <>
                            <FilePlus className="w-4.5 h-4.5" /> Publish & Send Proposal
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )
              ) : (
                <div className="text-center py-16 border border-dashed border-borderColor rounded-2xl space-y-3">
                  <FileSpreadsheet className="w-10 h-10 text-secondary/30 mx-auto" />
                  <h4 className="font-poppins font-bold text-sm text-primary">No Customer Booking Chosen</h4>
                  <p className="text-xs text-secondary max-w-sm mx-auto leading-relaxed">Choose an active site visit booking from the dropdown above to initialize a customized proposal quote.</p>
                </div>
              )}

            </div>
          </div>
        )}

      </main>

      {/* MODAL 1: NEW BOOKING (ON BEHALF OF CLIENT) */}
      {isNewBookingOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-borderColor rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-scaleIn my-8">
            <div className="flex justify-between items-start border-b border-borderColor/40 pb-3">
              <div>
                <h3 className="font-poppins font-bold text-base text-primary">Book Site Visit Consultation</h3>
                <p className="text-xs text-secondary mt-0.5">Submit a new site booking request on behalf of a client.</p>
              </div>
              <button 
                onClick={() => setIsNewBookingOpen(false)}
                className="text-secondary hover:text-primary hover:bg-bgBase p-1.5 rounded-lg"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBooking} className="space-y-4 text-xs font-semibold">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-secondary">Client Full Name *</label>
                  <input
                    type="text" required
                    className="w-full p-2.5 bg-bgBase border border-borderColor rounded-xl outline-none focus:border-accentGold font-medium text-primary"
                    placeholder="Enter client's full name"
                    value={newBookingForm.client_name}
                    onChange={(e) => setNewBookingForm({...newBookingForm, client_name: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-secondary">Client Email *</label>
                  <input
                    type="email" required
                    className="w-full p-2.5 bg-bgBase border border-borderColor rounded-xl outline-none focus:border-accentGold font-medium text-primary"
                    placeholder="Enter email address"
                    value={newBookingForm.email}
                    onChange={(e) => setNewBookingForm({...newBookingForm, email: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-secondary">Client Phone *</label>
                  <input
                    type="text" required
                    className="w-full p-2.5 bg-bgBase border border-borderColor rounded-xl outline-none focus:border-accentGold font-medium text-primary"
                    placeholder="e.g. +91 98765 43210"
                    value={newBookingForm.phone}
                    onChange={(e) => setNewBookingForm({...newBookingForm, phone: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-secondary">Property type *</label>
                  <select
                    className="w-full p-2.5 bg-bgBase border border-borderColor rounded-xl outline-none focus:border-accentGold font-medium text-secondary"
                    value={newBookingForm.property_type}
                    onChange={(e) => setNewBookingForm({...newBookingForm, property_type: e.target.value})}
                  >
                    <option value="Living Room">Living Room</option>
                    <option value="Modular Kitchen">Modular Kitchen</option>
                    <option value="Full 2 BHK Apartment">Full 2 BHK Apartment</option>
                    <option value="Full 3 BHK Apartment">Full 3 BHK Apartment</option>
                    <option value="Luxury Villa">Luxury Villa</option>
                    <option value="Office space">Office space</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-secondary">Site Address *</label>
                <input
                  type="text" required
                  className="w-full p-2.5 bg-bgBase border border-borderColor rounded-xl outline-none focus:border-accentGold font-medium text-primary"
                  placeholder="Enter complete site coordinates and address"
                  value={newBookingForm.address}
                  onChange={(e) => setNewBookingForm({...newBookingForm, address: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-secondary">Preferred Date *</label>
                  <input
                    type="date" required
                    className="w-full p-2.5 bg-bgBase border border-borderColor rounded-xl outline-none focus:border-accentGold font-medium text-secondary"
                    value={newBookingForm.preferred_date}
                    onChange={(e) => setNewBookingForm({...newBookingForm, preferred_date: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-secondary">Preferred Time Slot *</label>
                  <select
                    className="w-full p-2.5 bg-bgBase border border-borderColor rounded-xl outline-none focus:border-accentGold font-medium text-secondary"
                    value={newBookingForm.preferred_slot}
                    onChange={(e) => setNewBookingForm({...newBookingForm, preferred_slot: e.target.value})}
                  >
                    <option value="09:00 AM - 12:00 PM">09:00 AM - 12:00 PM (Morning)</option>
                    <option value="12:00 PM - 03:00 PM">12:00 PM - 03:00 PM (Noon)</option>
                    <option value="03:00 PM - 06:00 PM">03:00 PM - 06:00 PM (Evening)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-secondary">Additional Design Notes</label>
                <textarea
                  className="w-full p-2.5 bg-bgBase border border-borderColor rounded-xl outline-none focus:border-accentGold font-medium h-20 resize-none text-primary"
                  placeholder="Styles wanted, lighting vector constraints, budget ceilings, etc."
                  value={newBookingForm.notes}
                  onChange={(e) => setNewBookingForm({...newBookingForm, notes: e.target.value})}
                ></textarea>
              </div>

              <div className="flex gap-2.5 justify-end pt-3 border-t border-borderColor/40">
                <button
                  type="button"
                  onClick={() => setIsNewBookingOpen(false)}
                  className="px-4 py-2 border border-borderColor text-secondary hover:text-primary rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-accentGold text-white hover:bg-accentGold/90 rounded-xl shadow-md font-bold"
                >
                  Create Booking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ASSIGNMENT OVERRIDES */}
      {isAssignModalOpen && selectedBooking && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-borderColor rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-scaleIn">
            <div className="flex justify-between items-start border-b border-borderColor/40 pb-3">
              <div>
                <h3 className="font-poppins font-bold text-base text-primary">Manage Assignment</h3>
                <p className="text-xs text-secondary mt-0.5">Confirm the system suggestion or manually override it.</p>
              </div>
              <button 
                onClick={() => setIsAssignModalOpen(false)}
                className="text-secondary hover:text-primary p-1 rounded-lg"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-semibold">
              
              {/* Booking Context */}
              <div className="p-3 border border-borderColor/40 bg-bgBase rounded-xl space-y-1">
                <span className="text-[10px] text-accentGold font-mono uppercase tracking-wider block">{selectedBooking.booking_id_str}</span>
                <h4 className="font-bold text-xs">{selectedBooking.client_name} - {selectedBooking.property_type}</h4>
                <p className="text-[10px] text-secondary/80">Site Area: {selectedBooking.address}</p>
              </div>

              {/* System Recommendation Banner */}
              <div className="p-4 border border-indigo-200/50 bg-indigo-50/50 rounded-xl space-y-2">
                <div className="flex items-center gap-1.5 text-indigo-700">
                  <UserCheck className="w-4 h-4 shrink-0" />
                  <span className="font-bold">System Auto-Assignment Suggestion</span>
                </div>
                <p className="text-secondary leading-relaxed italic">
                  "{selectedBooking.assignment_reason || 'All professionals busy. Queue empty.'}"
                </p>
              </div>

              {/* Manual Selector overrides */}
              <div className="space-y-3 border-t border-borderColor/40 pt-4">
                <h4 className="text-[10px] uppercase font-bold text-secondary tracking-wider">Manual Assignment Override</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-secondary">Professional Role *</label>
                    <select
                      className="w-full p-2 bg-bgBase border border-borderColor rounded-lg outline-none font-bold text-secondary"
                      value={assignmentOverride.assigned_to_role}
                      onChange={(e) => setAssignmentOverride({...assignmentOverride, assigned_to_role: e.target.value})}
                    >
                      <option value="designer">Designer</option>
                      <option value="engineer">Site Engineer</option>
                    </select>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-secondary">Select Available Staff *</label>
                    <select
                      className="w-full p-2 bg-bgBase border border-borderColor rounded-lg outline-none font-bold text-secondary"
                      value={assignmentOverride.assigned_to_id}
                      onChange={(e) => setAssignmentOverride({...assignmentOverride, assigned_to_id: e.target.value})}
                    >
                      <option value="">-- Choose Staff member --</option>
                      {professionals
                        .filter(p => p.role === assignmentOverride.assigned_to_role && p.availability === 'Available')
                        .map(p => (
                          <option key={p.id} value={p.id}>{p.name} (Active workload: {p.workload} | {p.region})</option>
                        ))
                      }
                      {professionals.filter(p => p.role === assignmentOverride.assigned_to_role && p.availability === 'Available').length === 0 && (
                        <option disabled>No Available staff found.</option>
                      )}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-secondary">Reason for override / Notes *</label>
                  <textarea
                    required
                    className="w-full p-2 bg-bgBase border border-borderColor rounded-lg outline-none font-medium h-16 resize-none text-primary"
                    placeholder="Enter reason for designer assignment change"
                    value={assignmentOverride.reason}
                    onChange={(e) => setAssignmentOverride({...assignmentOverride, reason: e.target.value})}
                  ></textarea>
                </div>
              </div>

              <div className="flex gap-2.5 justify-end pt-3 border-t border-borderColor/40">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-4 py-2 border border-borderColor text-secondary hover:text-primary rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAssignment}
                  disabled={!assignmentOverride.assigned_to_id}
                  className={`px-5 py-2 text-white rounded-xl shadow-md font-bold transition-all ${
                    assignmentOverride.assigned_to_id ? 'bg-accentGold hover:bg-accentGold/90' : 'bg-slate-300 cursor-not-allowed text-slate-500'
                  }`}
                >
                  Confirm Assignment
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: CRM DETAIL DRAWER / CRM CONTROL PANEL */}
      {detailBookingOpen && selectedBooking && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-borderColor rounded-2xl max-w-4xl w-full overflow-hidden shadow-2xl animate-scaleIn flex flex-col max-h-[85vh]">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-primary to-slate-900 text-white p-5 border-b border-borderColor flex justify-between items-center shrink-0">
              <div className="space-y-0.5">
                <span className="text-[10px] text-accentGold font-mono uppercase tracking-widest font-bold">
                  {selectedBooking.booking_id_str || `GSI-TEMP-${selectedBooking.id}`}
                </span>
                <h4 className="font-poppins font-bold text-base flex items-center gap-2">
                  <Users className="w-5 h-5 text-accentGold" /> {selectedBooking.client_name} - {selectedBooking.property_type}
                </h4>
                <p className="text-[10px] text-slate-300">
                  Address: {selectedBooking.address} | Status: <span className="font-semibold text-accentGold">{selectedBooking.status}</span>
                </p>
              </div>
              <button 
                onClick={() => setDetailBookingOpen(false)}
                className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body with tabs */}
            <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
              
              {/* Tab Selector Left Column (Sidebar-like in modal) */}
              <div className="w-full md:w-56 bg-bgBase border-r border-borderColor/60 p-4 flex flex-col gap-1 shrink-0 overflow-y-auto">
                <button
                  onClick={() => setActiveDetailTab('timeline')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs transition-all ${
                    activeDetailTab === 'timeline'
                      ? 'bg-primary text-white font-bold'
                      : 'text-secondary hover:bg-white hover:text-primary font-semibold'
                  }`}
                >
                  <Clock className="w-4 h-4" /> Activity Timeline
                </button>
                <button
                  onClick={() => setActiveDetailTab('notes')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs transition-all ${
                    activeDetailTab === 'notes'
                      ? 'bg-primary text-white font-bold'
                      : 'text-secondary hover:bg-white hover:text-primary font-semibold'
                  }`}
                >
                  <FileText className="w-4 h-4" /> Staff Notes ({detailNotes.length})
                </button>
                <button
                  onClick={() => setActiveDetailTab('tasks')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs transition-all ${
                    activeDetailTab === 'tasks'
                      ? 'bg-primary text-white font-bold'
                      : 'text-secondary hover:bg-white hover:text-primary font-semibold'
                  }`}
                >
                  <CheckSquare className="w-4 h-4" /> CRM Tasks ({detailTasks.length})
                </button>
                <button
                  onClick={() => setActiveDetailTab('communications')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs transition-all ${
                    activeDetailTab === 'communications'
                      ? 'bg-primary text-white font-bold'
                      : 'text-secondary hover:bg-white hover:text-primary font-semibold'
                  }`}
                >
                  <Activity className="w-4 h-4" /> Communications ({detailComms.length})
                </button>
                <button
                  onClick={() => setActiveDetailTab('quotation')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs transition-all ${
                    activeDetailTab === 'quotation'
                      ? 'bg-primary text-white font-bold'
                      : 'text-secondary hover:bg-white hover:text-primary font-semibold'
                  }`}
                >
                  <FileSpreadsheet className="w-4 h-4" /> Proposals & Estimates
                </button>

                <div className="mt-auto pt-4 border-t border-borderColor/40 text-[10px] text-secondary/60 space-y-1 font-semibold">
                  <p>Client Email: {selectedBooking.email}</p>
                  <p>Client Phone: {selectedBooking.phone}</p>
                  <p>Date: {selectedBooking.preferred_date}</p>
                  <p>Slot: {selectedBooking.preferred_slot}</p>
                </div>
              </div>

              {/* Tab Content Panel */}
              <div className="flex-1 p-6 overflow-y-auto min-h-0 bg-white">
                {loadingDetailData ? (
                  <div className="flex flex-col items-center justify-center py-20 space-y-2 text-secondary/60">
                    <RefreshCw className="w-6 h-6 animate-spin text-accentGold" />
                    <p className="text-xs font-semibold">Retrieving CRM interaction records...</p>
                  </div>
                ) : (
                  <>
                    {/* TIMELINE TAB */}
                    {activeDetailTab === 'timeline' && (
                      <div className="space-y-6">
                        <div>
                          <h5 className="font-poppins font-bold text-xs uppercase tracking-widest text-accentGold border-b border-borderColor/30 pb-1.5 mb-3">
                            Assignment & Override History
                          </h5>
                          {assignmentsList.length > 0 ? (
                            <div className="space-y-2.5">
                              {assignmentsList.map((asg) => (
                                <div key={asg.id} className="p-3 border border-borderColor/40 bg-bgBase rounded-xl space-y-1.5 text-xs font-semibold">
                                  <div className="flex justify-between items-center">
                                    <span className="font-bold text-primary">{asg.professional_name || 'Lead Specialist'}</span>
                                    <span className="text-[10px] text-secondary font-medium uppercase tracking-wider bg-white border border-borderColor/40 px-1.5 py-0.5 rounded">
                                      {asg.professional_role === 'designer' ? 'Designer' : 'Site Engineer'}
                                    </span>
                                  </div>
                                  <p className="text-secondary/85 leading-relaxed italic text-[10.5px]">"{asg.reason}"</p>
                                  <span className="text-[9px] text-secondary/40 font-mono block text-right">
                                    Assigned: {new Date(asg.assigned_at).toLocaleString()}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-secondary/60 italic">No staff assignment overrides found.</p>
                          )}
                        </div>

                        <div>
                          <h5 className="font-poppins font-bold text-xs uppercase tracking-widest text-secondary/60 border-b border-borderColor/30 pb-1.5 mb-3">
                            Audit Activities Log
                          </h5>
                          {activitiesList.length > 0 ? (
                            <div className="relative pl-5 border-l border-borderColor/70 space-y-4 ml-1 pt-1">
                              {activitiesList.map((act) => (
                                <div key={act.id} className="relative text-xs font-semibold">
                                  <div className="absolute -left-[25.5px] top-1 w-2 h-2 rounded-full border border-accentGold bg-white"></div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-primary">{act.activity_type}</span>
                                    <span className="text-[9px] text-secondary/40 font-mono">
                                      {new Date(act.created_at).toLocaleString()}
                                    </span>
                                  </div>
                                  <p className="text-secondary/80 leading-relaxed mt-0.5 font-medium">{act.description}</p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-secondary/60 italic">No activity logs recorded.</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* NOTES TAB */}
                    {activeDetailTab === 'notes' && (
                      <div className="space-y-5">
                        <form onSubmit={handleAddNote} className="space-y-2 border-b border-borderColor/30 pb-4">
                          <label className="text-[10px] font-bold text-secondary uppercase tracking-wider block">Add Staff Note</label>
                          <div className="flex gap-2">
                            <textarea
                              rows="2"
                              required
                              value={newNoteText}
                              onChange={(e) => setNewNoteText(e.target.value)}
                              placeholder="Type an internal note (e.g. client requested maple veneer woodwork)..."
                              className="flex-1 p-2.5 text-xs border border-borderColor rounded-xl outline-none focus:border-accentGold bg-bgBase resize-none text-primary font-semibold"
                            />
                            <button
                              type="submit"
                              className="px-4 bg-primary hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition-colors flex items-center justify-center gap-1.5"
                            >
                              <Plus className="w-4 h-4" /> Save
                            </button>
                          </div>
                        </form>

                        <div className="space-y-3 max-h-[300px] overflow-y-auto">
                          {detailNotes.length > 0 ? (
                            detailNotes.map((note) => (
                              <div key={note.id} className="p-3 border border-borderColor/40 bg-bgBase rounded-xl space-y-1.5 text-xs font-semibold">
                                <div className="flex justify-between items-center">
                                  <span className="font-bold text-accentGold">{note.author_name}</span>
                                  <span className="text-[9px] text-secondary/40 font-mono">
                                    {new Date(note.created_at).toLocaleString()}
                                  </span>
                                </div>
                                <p className="text-secondary leading-relaxed font-semibold">{note.note_text}</p>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-6 text-secondary/60 italic">No staff notes posted yet.</div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* TASKS TAB */}
                    {activeDetailTab === 'tasks' && (
                      <div className="space-y-5">
                        <form onSubmit={handleAddTask} className="grid grid-cols-1 md:grid-cols-3 gap-3 border-b border-borderColor/30 pb-4 text-xs font-semibold">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-secondary uppercase tracking-wider">Task Title *</label>
                            <input
                              type="text"
                              required
                              value={newTaskTitle}
                              onChange={(e) => setNewTaskTitle(e.target.value)}
                              placeholder="Follow up on veneer choice"
                              className="w-full p-2 border border-borderColor rounded-xl outline-none focus:border-accentGold bg-bgBase text-primary"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-secondary uppercase tracking-wider">Due Date *</label>
                            <input
                              type="date"
                              required
                              value={newTaskDueDate}
                              onChange={(e) => setNewTaskDueDate(e.target.value)}
                              className="w-full p-2 border border-borderColor rounded-xl outline-none focus:border-accentGold bg-bgBase text-primary font-bold"
                            />
                          </div>
                          <div className="space-y-1 flex flex-col justify-end">
                            <button
                              type="submit"
                              className="w-full py-2 bg-accentGold hover:bg-accentGold/90 text-white rounded-xl font-bold shadow transition-colors flex items-center justify-center gap-1.5"
                            >
                              <Plus className="w-4 h-4" /> Create Task
                            </button>
                          </div>
                        </form>

                        <div className="space-y-2.5 max-h-[300px] overflow-y-auto">
                          {detailTasks.length > 0 ? (
                            detailTasks.map((task) => (
                              <div key={task.id} className="p-3 border border-borderColor/40 bg-bgBase rounded-xl flex items-center justify-between text-xs font-semibold gap-4">
                                <div className="flex items-start gap-3">
                                  <button
                                    onClick={() => handleToggleTaskStatus(task)}
                                    className="mt-0.5 text-secondary hover:text-accentGold shrink-0 transition-colors"
                                  >
                                    {task.status === 'Completed' ? (
                                      <CheckSquare className="w-4.5 h-4.5 text-green-600" />
                                    ) : (
                                      <Square className="w-4.5 h-4.5 text-secondary/60" />
                                    )}
                                  </button>
                                  <div>
                                    <span className={`font-bold block ${task.status === 'Completed' ? 'line-through text-secondary/50' : 'text-primary'}`}>
                                      {task.title}
                                    </span>
                                    <span className="text-[9px] text-secondary/40 block font-mono">
                                      Due: {new Date(task.due_date).toLocaleDateString()} | Status: {task.status}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-6 text-secondary/60 italic">No reminders or tasks registered.</div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* COMMUNICATIONS TAB */}
                    {activeDetailTab === 'communications' && (
                      <div className="space-y-3 max-h-[400px] overflow-y-auto">
                        <h5 className="font-poppins font-bold text-xs uppercase tracking-widest text-accentGold border-b border-borderColor/30 pb-1.5 mb-2">
                          Communication History Log
                        </h5>
                        {detailComms.length > 0 ? (
                          <div className="space-y-2.5">
                            {detailComms.map((comm) => (
                              <div key={comm.id} className="p-3 border border-borderColor/40 bg-bgBase rounded-xl space-y-1.5 text-xs font-semibold">
                                <div className="flex justify-between items-center">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-primary uppercase tracking-wide px-1.5 py-0.5 rounded bg-white border border-borderColor/40 text-[9px]">
                                      {comm.channel}
                                    </span>
                                    <span className="text-[10px] text-secondary font-bold">{comm.recipient}</span>
                                  </div>
                                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${comm.status === 'Sent' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {comm.status}
                                  </span>
                                </div>
                                <p className="text-secondary/80 leading-relaxed italic text-[10px] bg-white border border-borderColor/30 p-2 rounded-lg">
                                  "{comm.message_preview || 'Notification sent.'}"
                                </p>
                                <span className="text-[8.5px] text-secondary/40 font-mono block text-right">
                                  Dispatched: {new Date(comm.sent_at).toLocaleString()}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-6 text-secondary/60 italic">No communication logs recorded.</div>
                        )}
                      </div>
                    )}

                    {/* QUOTATION TAB */}
                    {activeDetailTab === 'quotation' && (
                      <div className="space-y-4 text-xs font-semibold">
                        {detailQuotation ? (
                          <div className="border border-borderColor/50 rounded-2xl p-5 bg-bgBase/40 space-y-4">
                            <div className="flex justify-between items-start border-b border-borderColor/40 pb-3">
                              <div>
                                <span className="text-[9px] text-accentGold font-mono uppercase tracking-widest font-bold">Proposal Invoice</span>
                                <h4 className="font-bold text-sm text-primary">GSI-Q-{detailQuotation.uuid ? detailQuotation.uuid.substring(0, 8).toUpperCase() : detailQuotation.id}</h4>
                                <span className="text-[10px] text-secondary font-medium">Created: {new Date(detailQuotation.created_at).toLocaleDateString()}</span>
                              </div>
                              <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                                detailQuotation.status === 'Approved'
                                  ? 'bg-green-100 text-green-700'
                                  : detailQuotation.status === 'Rejected'
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-amber-100 text-amber-700'
                              }`}>
                                {detailQuotation.status}
                              </span>
                            </div>

                            {/* Lines */}
                            <div className="overflow-x-auto">
                              <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                  <tr className="border-b border-borderColor bg-white text-secondary font-bold">
                                    <th className="py-2 px-3">Description</th>
                                    <th className="py-2 px-3 text-right">Qty</th>
                                    <th className="py-2 px-3 text-right">Unit Price</th>
                                    <th className="py-2 px-3 text-right">Amount</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-borderColor/30">
                                  {detailQuotation.items && detailQuotation.items.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-white/40">
                                      <td className="py-2 px-3 font-semibold text-primary">{item.description}</td>
                                      <td className="py-2 px-3 text-right">{item.qty}</td>
                                      <td className="py-2 px-3 text-right">₹{item.unit_price.toLocaleString()}</td>
                                      <td className="py-2 px-3 text-right font-bold text-primary">₹{item.amount.toLocaleString()}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            {/* Summary Totals */}
                            <div className="border-t border-borderColor/40 pt-3 flex flex-col items-end gap-1.5 text-xs">
                              <div className="flex justify-between w-48 text-secondary">
                                <span>Subtotal:</span>
                                <span>₹{detailQuotation.subtotal.toLocaleString()}</span>
                              </div>
                              {detailQuotation.discount > 0 && (
                                <div className="flex justify-between w-48 text-secondary">
                                  <span>Discount:</span>
                                  <span>-₹{detailQuotation.discount.toLocaleString()}</span>
                                </div>
                              )}
                              <div className="flex justify-between w-48 text-secondary">
                                <span>GST ({detailQuotation.gst}%):</span>
                                <span>₹{detailQuotation.tax.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between w-48 text-primary font-bold border-t border-borderColor/30 pt-1.5 text-sm">
                                <span>Grand Total:</span>
                                <span className="text-accentGold">₹{detailQuotation.grand_total.toLocaleString()}</span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-10 space-y-4 border border-dashed border-borderColor rounded-2xl">
                            <FileSpreadsheet className="w-10 h-10 text-secondary/30 mx-auto" />
                            <div className="space-y-1">
                              <h5 className="font-poppins font-bold text-sm text-primary">No Proposal Created Yet</h5>
                              <p className="text-xs text-secondary max-w-xs mx-auto">Create a customized quotation to send to this customer for design approval.</p>
                            </div>
                            <button
                              onClick={() => {
                                setDetailBookingOpen(false);
                                setSelectedQuotationBooking(selectedBooking);
                                setCrmTab('quotation_creator');
                              }}
                              className="px-4 py-2 bg-primary hover:bg-slate-800 text-white font-bold rounded-xl text-xs shadow transition-all flex items-center gap-1 mx-auto"
                            >
                              <Plus className="w-4.5 h-4.5" /> Generate Proposal Quote
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

            </div>

          </div>
        </div>
      )}

      {/* MODAL 4: AI REPORT PREVIEW */}
      {reportModalOpen && selectedBooking && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-borderColor rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl animate-scaleIn">
            
            {/* Header */}
            <div className="bg-gradient-to-r from-primary to-slate-900 text-white p-5 border-b border-borderColor flex justify-between items-center gap-4">
              <div className="space-y-0.5">
                <h4 className="font-poppins font-bold text-base text-accentGold flex items-center gap-1.5">
                  <FileText className="w-5 h-5 shrink-0" /> AI Site Visit Report
                </h4>
                <p className="text-[10px] text-slate-300">Generated for client {selectedBooking.client_name} ({selectedBooking.booking_id_str})</p>
              </div>

              <button 
                onClick={() => setReportModalOpen(false)}
                className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Contents */}
            <div className="p-6 space-y-5 text-xs max-h-[400px] overflow-y-auto">
              {reportData ? (
                <>
                  <div className="space-y-1.5">
                    <h5 className="font-bold text-[10px] text-secondary uppercase tracking-wider">1. Site Inspection Summary</h5>
                    <p className="text-secondary leading-relaxed bg-bgBase p-3 rounded-xl border border-borderColor/40">
                      {reportData.summary}
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <h5 className="font-bold text-[10px] text-secondary uppercase tracking-wider">2. Architectural Recommendations</h5>
                    <p className="text-secondary leading-relaxed bg-bgBase p-3 rounded-xl border border-borderColor/40 whitespace-pre-line">
                      {reportData.recommendations}
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <h5 className="font-bold text-[10px] text-secondary uppercase tracking-wider">3. Actionable Follow-up</h5>
                    <p className="text-secondary leading-relaxed bg-bgBase p-3 rounded-xl border border-borderColor/40">
                      {reportData.follow_ups}
                    </p>
                  </div>
                  
                  {/* PDF download direct action */}
                  <div className="pt-2 border-t border-borderColor/30 flex justify-between items-center text-[10px]">
                    <span className="text-secondary/50">Compiled under GSI AI Inspection guidelines.</span>
                    <a
                      href={`http://localhost:5000/api/reports/pdf/${selectedBooking.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-accentGold text-white font-bold rounded-lg shadow-sm hover:bg-accentGold/90 transition-colors flex items-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" /> Download Report
                    </a>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 space-y-2 text-secondary/60">
                  <RefreshCw className="w-6 h-6 animate-spin text-accentGold" />
                  <p>Compiling inspection parameters...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: SUBMIT VISIT REPORT */}
      {submitReportModalOpen && selectedReportBooking && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-borderColor rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl animate-scaleIn">
            
            {/* Header */}
            <div className="bg-gradient-to-r from-primary to-slate-900 text-white p-5 border-b border-borderColor flex justify-between items-center gap-4">
              <div className="space-y-0.5">
                <h4 className="font-poppins font-bold text-base text-accentGold flex items-center gap-1.5">
                  <FileText className="w-5 h-5 shrink-0" /> Submit Site Visit Report
                </h4>
                <p className="text-[10px] text-slate-300">Complete inspection details for {selectedReportBooking.client_name} ({selectedReportBooking.booking_id_str})</p>
              </div>
              <button 
                onClick={() => setSubmitReportModalOpen(false)}
                className="text-slate-350 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleReportSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-secondary uppercase tracking-wider block">1. Inspection Summary *</label>
                <textarea
                  rows="3"
                  required
                  placeholder="Describe the overall site conditions, measurements, humidity check, moisture levels, spatial alignment details..."
                  value={reportSummary}
                  onChange={(e) => setReportSummary(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-borderColor rounded-xl outline-none focus:border-accentGold bg-bgBase"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-secondary uppercase tracking-wider block">2. Architectural & Aesthetic Recommendations</label>
                <textarea
                  rows="3"
                  placeholder="Detail suggestions for custom woodwork, veneers, color palettes, spacing overlays, layouts..."
                  value={reportRecs}
                  onChange={(e) => setReportRecs(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-borderColor rounded-xl outline-none focus:border-accentGold bg-bgBase"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-secondary uppercase tracking-wider block">3. Actionable Follow-up Guidelines</label>
                <textarea
                  rows="2"
                  placeholder="E.g. Schedule 3D layout review meeting on client portal, compile structural calculations..."
                  value={reportFollowUps}
                  onChange={(e) => setReportFollowUps(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-borderColor rounded-xl outline-none focus:border-accentGold bg-bgBase"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-secondary uppercase tracking-wider block">4. Upload Site Visit Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setReportImage(e.target.files[0])}
                  className="w-full text-xs text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-accentGold/10 file:text-accentGold hover:file:bg-accentGold/20 cursor-pointer"
                />
              </div>

              <div className="pt-2 border-t border-borderColor/30 flex gap-3">
                <button
                  type="button"
                  onClick={() => setSubmitReportModalOpen(false)}
                  className="flex-1 py-2 border border-borderColor text-xs font-bold rounded-xl hover:bg-bgBase transition-colors text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-accentGold hover:bg-accentGold/90 text-white text-xs font-bold rounded-xl shadow transition-colors text-center"
                >
                  Submit Report & Complete Visit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
