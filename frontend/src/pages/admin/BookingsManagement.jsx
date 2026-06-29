import React, { useState, useEffect, useCallback } from 'react';
import { bookingAPI, projectTypeAPI } from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import BookingTable from '../../components/BookingTable';
import AssignModal from '../../components/AssignModal';
import Modal from '../../components/Modal';
import StatusBadge from '../../components/StatusBadge';
import Pagination from '../../components/Pagination';

const BookingsManagement = () => {
  const { addToast } = useNotification();
  const [bookings, setBookings] = useState([]);
  const [projectTypes, setProjectTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [projectTypeFilter, setProjectTypeFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [selectedBookingForAssign, setSelectedBookingForAssign] = useState(null);
  const [selectedBookingForDetail, setSelectedBookingForDetail] = useState(null);
  const [bookingDetail, setBookingDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchProjectTypes = async () => {
    try {
      // Fetch list of project types for filter
      const res = await projectTypeAPI.getAll();
      if (res && res.success) {
        setProjectTypes(res.projectTypes || []);
      }
    } catch (err) {
      console.warn('Could not load project types:', err.message);
    }
  };

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: currentPage,
        limit: 10,
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
        city: cityFilter || undefined,
        project_type_id: projectTypeFilter || undefined,
        search: searchQuery || undefined
      };
      
      const res = await bookingAPI.getAll(params);
      if (res && res.success) {
        setBookings(res.bookings || []);
        setTotalItems(res.pagination?.total || res.bookings.length);
        setTotalPages(res.pagination?.totalPages || 1);
      }
    } catch (err) {
      console.error('Error fetching bookings:', err);
      addToast('Failed to load bookings list.', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentPage, statusFilter, priorityFilter, cityFilter, projectTypeFilter, searchQuery, addToast]);

  useEffect(() => {
    fetchProjectTypes();
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const handleStatusChange = async (bookingId, newStatus) => {
    try {
      const res = await bookingAPI.updateStatus(bookingId, { status: newStatus });
      if (res && res.success) {
        addToast(`Booking status updated to ${newStatus}`, 'success');
        fetchBookings();
      }
    } catch (err) {
      console.error('Status update error:', err);
      addToast(err.message || 'Failed to update booking status', 'error');
    }
  };

  const handleOpenDetail = async (booking) => {
    setSelectedBookingForDetail(booking);
    setLoadingDetail(true);
    try {
      const res = await bookingAPI.getById(booking.booking_id || booking.id);
      if (res && res.success) {
        setBookingDetail(res.data);
      }
    } catch (err) {
      console.error('Failed to load details:', err);
      addToast('Failed to load booking detail sheet', 'error');
      setSelectedBookingForDetail(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleResetFilters = () => {
    setStatusFilter('');
    setPriorityFilter('');
    setCityFilter('');
    setProjectTypeFilter('');
    setSearchQuery('');
    setCurrentPage(1);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="bookings-management-container flex flex-col gap-6">
      {/* Page Header */}
      <div>
        <h1 className="heading-xl text-cream m-0" style={{ fontFamily: 'var(--font-heading)' }}>Bookings Management</h1>
        <p className="text-muted text-sm m-0">Review, assign, reschedule, and track interior site visits.</p>
      </div>

      {/* Filters Bar */}
      <div className="card bg-surface-2 border border-border p-4 flex flex-col gap-4">
        <h3 className="text-cream text-sm font-bold uppercase tracking-wider m-0">Search & Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
          
          <div className="form-group mb-0">
            <label className="form-label text-xs">Search Text</label>
            <input
              type="text"
              className="form-input text-sm p-2"
              placeholder="Ref / client name / mobile..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            />
          </div>

          <div className="form-group mb-0">
            <label className="form-label text-xs">Booking Status</label>
            <select
              className="form-select text-sm p-2"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            >
              <option value="">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Assigned">Assigned</option>
              <option value="Scheduled">Scheduled</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          <div className="form-group mb-0">
            <label className="form-label text-xs">Lead Priority</label>
            <select
              className="form-select text-sm p-2"
              value={priorityFilter}
              onChange={(e) => { setPriorityFilter(e.target.value); setCurrentPage(1); }}
            >
              <option value="">All Priorities</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Urgent">Urgent</option>
            </select>
          </div>

          <div className="form-group mb-0">
            <label className="form-label text-xs">Project Category</label>
            <select
              className="form-select text-sm p-2"
              value={projectTypeFilter}
              onChange={(e) => { setProjectTypeFilter(e.target.value); setCurrentPage(1); }}
            >
              <option value="">All Categories</option>
              {projectTypes.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button className="btn btn-secondary w-full py-2" onClick={handleResetFilters}>
              Clear Filters
            </button>
          </div>

        </div>
      </div>

      {/* Bookings Table Component */}
      <BookingTable
        bookings={bookings}
        loading={loading}
        role="admin"
        onViewBooking={handleOpenDetail}
        onAssign={(b) => setSelectedBookingForAssign(b)}
        onStatusChange={handleStatusChange}
      />

      {/* Pagination Controls */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        itemsPerPage={10}
        onPageChange={(page) => setCurrentPage(page)}
      />

      {/* Assignment Modal overlay */}
      {selectedBookingForAssign && (
        <AssignModal
          isOpen={!!selectedBookingForAssign}
          onClose={() => setSelectedBookingForAssign(null)}
          booking={selectedBookingForAssign}
          onSuccess={fetchBookings}
        />
      )}

      {/* Booking Detail Modal overlay */}
      {selectedBookingForDetail && (
        <Modal
          isOpen={!!selectedBookingForDetail}
          onClose={() => { setSelectedBookingForDetail(null); setBookingDetail(null); }}
          title={`Booking Details Sheet - ${selectedBookingForDetail.booking_ref}`}
          size="lg"
        >
          {loadingDetail || !bookingDetail ? (
            <div className="text-center py-8">
              <div className="spinner sm mx-auto mb-2"></div>
              <span className="text-muted text-sm">Fetching detailed visit sheet...</span>
            </div>
          ) : (
            <div className="booking-detail-sheet flex flex-col gap-4 text-cream">
              {/* Status Header info */}
              <div className="flex justify-between items-center border-b pb-3 border-border">
                <div className="flex gap-2">
                  <StatusBadge status={bookingDetail.status} />
                  <StatusBadge status={bookingDetail.priority} />
                </div>
                <div className="text-sm text-gold font-bold">
                  Budget: ₹{parseFloat(bookingDetail.estimated_budget).toLocaleString('en-IN')}
                </div>
              </div>

              {/* Grid 2-column info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                <div className="card bg-surface p-3 border border-border">
                  <h4 className="heading-md border-b pb-1 border-border text-gold m-0 mb-2">Client Details</h4>
                  <p className="m-0 mb-1"><strong>Name:</strong> {bookingDetail.client_name}</p>
                  <p className="m-0 mb-1"><strong>Mobile:</strong> {bookingDetail.client_mobile}</p>
                  <p className="m-0 mb-1"><strong>Email:</strong> {bookingDetail.client_email}</p>
                  <p className="m-0"><strong>Site Address:</strong> {bookingDetail.address}, {bookingDetail.city} - {bookingDetail.pincode}</p>
                </div>
                
                <div className="card bg-surface p-3 border border-border">
                  <h4 className="heading-md border-b pb-1 border-border text-gold m-0 mb-2">Schedule Details</h4>
                  <p className="m-0 mb-1"><strong>Date:</strong> {formatDate(bookingDetail.preferred_visit_date)}</p>
                  <p className="m-0 mb-1"><strong>Slot Time:</strong> {bookingDetail.slot_time}</p>
                  <p className="m-0 mb-1"><strong>Property Type:</strong> {bookingDetail.property_type}</p>
                  <p className="m-0"><strong>Design Category:</strong> {bookingDetail.project_type}</p>
                </div>
              </div>

              {/* Project description details */}
              {bookingDetail.project_description && (
                <div className="card bg-surface p-3 border border-border">
                  <h4 className="heading-md border-b pb-1 border-border text-gold m-0 mb-2">Requirement Description</h4>
                  <p className="m-0 text-sm text-muted" style={{ whiteSpace: 'pre-line' }}>{bookingDetail.project_description}</p>
                </div>
              )}

              {/* Staff Assignments Detail */}
              <div className="card bg-surface p-3 border border-border">
                <h4 className="heading-md border-b pb-1 border-border text-gold m-0 mb-2">Assigned Consulting Team</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <span className="text-xs text-muted block">Interior Designer</span>
                    <span className="font-semibold text-cream">
                      {bookingDetail.designer_name ? `🎨 ${bookingDetail.designer_name}` : '❌ Not Assigned'}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-muted block">Site Engineer</span>
                    <span className="font-semibold text-cream">
                      {bookingDetail.engineer_name ? `🔧 ${bookingDetail.engineer_name}` : '❌ Not Assigned'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex justify-end mt-2">
                <button type="button" className="btn btn-secondary" onClick={() => { setSelectedBookingForDetail(null); setBookingDetail(null); }}>
                  Close Sheet
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
};

export default BookingsManagement;
