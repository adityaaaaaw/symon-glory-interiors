import React, { useState, useEffect, useCallback } from 'react';
import { bookingAPI } from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import BookingTable from '../../components/BookingTable';
import Modal from '../../components/Modal';
import SlotPicker from '../../components/SlotPicker';
import StatusBadge from '../../components/StatusBadge';
import Pagination from '../../components/Pagination';

const BookingHistory = () => {
  const { addToast } = useNotification();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [detailBooking, setDetailBooking] = useState(null);
  const [cancelBooking, setCancelBooking] = useState(null);
  const [cancellationReason, setCancellationReason] = useState('');
  
  const [rescheduleBooking, setRescheduleBooking] = useState(null);
  const [newDate, setNewDate] = useState('');
  const [newSlotId, setNewSlotId] = useState('');
  
  const [actionLoading, setActionLoading] = useState(false);

  const fetchMyBookings = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: currentPage,
        limit: 10,
        status: statusFilter || undefined
      };
      const res = await bookingAPI.getMy(params);
      if (res && res.success) {
        setBookings(res.data?.bookings || res.bookings || []);
        setTotalItems(res.data?.pagination?.total || res.pagination?.total || res.bookings?.length || 0);
        setTotalPages(res.data?.pagination?.totalPages || res.pagination?.totalPages || 1);
      }
    } catch (err) {
      console.error('Failed to load my bookings:', err);
      addToast('Failed to retrieve bookings history', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentPage, statusFilter, addToast]);

  useEffect(() => {
    fetchMyBookings();
  }, [fetchMyBookings]);

  const handleCancelSubmit = async (e) => {
    e.preventDefault();
    if (!cancellationReason.trim()) {
      addToast('Please provide a reason for cancellation.', 'warning');
      return;
    }

    setActionLoading(true);
    try {
      const res = await bookingAPI.cancel(cancelBooking.id || cancelBooking.booking_id, {
        cancellation_reason: cancellationReason.trim()
      });
      if (res && res.success) {
        addToast('Site visit cancelled successfully', 'success');
        setCancelBooking(null);
        setCancellationReason('');
        fetchMyBookings();
      }
    } catch (err) {
      console.error('Cancellation error:', err);
      addToast(err.message || 'Failed to cancel booking', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRescheduleSubmit = async (e) => {
    e.preventDefault();
    if (!newDate || !newSlotId) {
      addToast('Please pick both date and time slot.', 'warning');
      return;
    }

    setActionLoading(true);
    try {
      const res = await bookingAPI.reschedule(rescheduleBooking.id || rescheduleBooking.booking_id, {
        preferred_visit_date: newDate,
        slot_id: parseInt(newSlotId, 10)
      });
      if (res && res.success) {
        addToast('Site visit rescheduled successfully', 'success');
        setRescheduleBooking(null);
        setNewDate('');
        setNewSlotId('');
        fetchMyBookings();
      }
    } catch (err) {
      console.error('Reschedule error:', err);
      addToast(err.message || 'Failed to reschedule site visit', 'error');
    } finally {
      setActionLoading(false);
    }
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
    <div className="booking-history-container flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="heading-xl text-cream m-0" style={{ fontFamily: 'var(--font-heading)' }}>My Bookings History</h1>
          <p className="text-muted text-sm m-0">View historical visits requests, cancel bookings, or reschedule slots.</p>
        </div>
        <button className="btn btn-secondary" onClick={fetchMyBookings}>
          🔄 Refresh
        </button>
      </div>

      {/* Filter Bar */}
      <div className="card bg-surface-2 p-4 border border-border flex justify-between items-center flex-wrap gap-4">
        <div className="form-group mb-0 max-w-xs flex-1">
          <label className="form-label text-xs">Filter by Status</label>
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
      </div>

      {/* Booking Table rendering */}
      <BookingTable
        bookings={bookings}
        loading={loading}
        role="client"
        onViewBooking={(b) => setDetailBooking(b)}
        onCancel={(b) => setCancelBooking(b)}
        onReschedule={(b) => setRescheduleBooking(b)}
      />

      {/* Pagination component */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        itemsPerPage={10}
        onPageChange={(page) => setCurrentPage(page)}
      />

      {/* DETAILED BOOKING MODAL */}
      {detailBooking && (
        <Modal
          isOpen={!!detailBooking}
          onClose={() => setDetailBooking(null)}
          title={`Booking details - ${detailBooking.booking_ref}`}
          size="md"
        >
          <div className="booking-detail-content flex flex-col gap-4 text-cream">
            <div className="flex justify-between border-b pb-2 border-border">
              <div className="flex gap-2">
                <StatusBadge status={detailBooking.status} />
                <StatusBadge status={detailBooking.priority} />
              </div>
              <span className="text-gold font-bold">₹{parseFloat(detailBooking.estimated_budget).toLocaleString('en-IN')}</span>
            </div>

            <div className="card bg-surface-2 p-3 text-sm flex flex-col gap-2">
              <p className="m-0"><strong>Project Type:</strong> {detailBooking.project_type} ({detailBooking.property_type})</p>
              <p className="m-0"><strong>Rooms Count:</strong> {detailBooking.num_rooms}</p>
              <p className="m-0"><strong>Visit Date:</strong> {formatDate(detailBooking.preferred_visit_date)}</p>
              <p className="m-0"><strong>Visit Slot:</strong> {detailBooking.slot_time}</p>
              <p className="m-0"><strong>Site Address:</strong> {detailBooking.address}, {detailBooking.city} - {detailBooking.pincode}</p>
            </div>

            {detailBooking.project_description && (
              <div className="form-group mb-0">
                <span className="text-xs text-muted block mb-1">Requirements Description</span>
                <p className="m-0 text-sm bg-surface p-3 rounded border border-border" style={{ whiteSpace: 'pre-line' }}>
                  {detailBooking.project_description}
                </p>
              </div>
            )}

            <div className="card bg-surface p-3 border border-border rounded">
              <h4 className="heading-sm text-gold m-0 mb-2">Assigned Staff Details</h4>
              <p className="m-0 mb-1 text-sm">🎨 Designer: <strong>{detailBooking.designer_name || 'Not Assigned Yet'}</strong></p>
              <p className="m-0 text-sm">🔧 Site Engineer: <strong>{detailBooking.engineer_name || 'Not Assigned Yet'}</strong></p>
            </div>

            <div className="flex justify-end mt-2">
              <button className="btn btn-secondary" onClick={() => setDetailBooking(null)}>
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* CANCELLATION MODAL */}
      {cancelBooking && (
        <Modal
          isOpen={!!cancelBooking}
          onClose={() => { setCancelBooking(null); setCancellationReason(''); }}
          title={`Cancel Site Visit - ${cancelBooking.booking_ref}`}
          size="md"
        >
          <form onSubmit={handleCancelSubmit} className="flex flex-col gap-4">
            <p className="text-sm text-muted m-0">
              Are you sure you want to cancel this booking request? This action will release your reserved slot.
            </p>

            <div className="form-group">
              <label className="form-label" htmlFor="cancel-reason">Reason for Cancellation</label>
              <textarea
                id="cancel-reason"
                className="form-textarea"
                rows="3"
                placeholder="Please tell us why you are cancelling this visit request..."
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                required
              ></textarea>
            </div>

            <div className="flex justify-between gap-4 mt-2">
              <button type="button" className="btn btn-secondary w-full" onClick={() => setCancelBooking(null)} disabled={actionLoading}>
                Go Back
              </button>
              <button type="submit" className="btn btn-danger w-full" disabled={actionLoading}>
                {actionLoading ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* RESCHEDULE MODAL */}
      {rescheduleBooking && (
        <Modal
          isOpen={!!rescheduleBooking}
          onClose={() => { setRescheduleBooking(null); setNewDate(''); setNewSlotId(''); }}
          title={`Reschedule Site Visit - ${rescheduleBooking.booking_ref}`}
          size="md"
        >
          <form onSubmit={handleRescheduleSubmit} className="flex flex-col gap-4">
            <p className="text-sm text-muted m-0">
              Select a new date and available time slot below to reschedule your site consultation.
            </p>
            
            <SlotPicker
              selectedDate={newDate}
              onDateChange={(d) => { setNewDate(d); setNewSlotId(''); }}
              selectedSlotId={newSlotId}
              onSlotSelect={setNewSlotId}
            />

            <div className="flex justify-between gap-4 mt-2">
              <button type="button" className="btn btn-secondary w-full" onClick={() => setRescheduleBooking(null)} disabled={actionLoading}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary w-full" disabled={actionLoading || !newSlotId}>
                {actionLoading ? 'Saving...' : 'Confirm Reschedule'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default BookingHistory;
