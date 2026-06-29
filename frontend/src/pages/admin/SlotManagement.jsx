import React, { useState, useEffect, useCallback } from 'react';
import { slotAPI } from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import Modal from '../../components/Modal';

const SlotManagement = () => {
  const { addToast } = useNotification();
  
  // Date range state (defaulting to next 7 days)
  const getTodayString = () => new Date().toISOString().slice(0, 10);
  const getFutureString = (daysAhead) => {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    return d.toISOString().slice(0, 10);
  };

  const [fromDate, setFromDate] = useState(getTodayString());
  const [toDate, setToDate] = useState(getFutureString(7));
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);

  // Create Slot form state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [slotDate, setSlotDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('11:00');
  const [maxBookings, setMaxBookings] = useState(3);
  const [submitting, setSubmitting] = useState(false);

  // Edit Slot state
  const [editSlot, setEditSlot] = useState(null);
  const [editMaxBookings, setEditMaxBookings] = useState(3);
  const [editActive, setEditActive] = useState(true);

  const fetchSlots = useCallback(async () => {
    setLoading(true);
    try {
      const res = await slotAPI.getRange(fromDate, toDate);
      if (res && res.success) {
        // Sort slots chronologically
        const sorted = (res.slots || []).sort((a, b) => {
          if (a.slot_date !== b.slot_date) {
            return new Date(a.slot_date) - new Date(b.slot_date);
          }
          return a.start_time.localeCompare(b.start_time);
        });
        setSlots(sorted);
      }
    } catch (err) {
      console.error('Error loading slots:', err);
      addToast('Failed to fetch slot ranges', 'error');
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, addToast]);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  const handleCreateSlot = async (e) => {
    e.preventDefault();
    if (startTime >= endTime) {
      addToast('End time must be after start time.', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      const res = await slotAPI.create({
        slot_date: slotDate,
        start_time: startTime + ':00',
        end_time: endTime + ':00',
        max_bookings: parseInt(maxBookings, 10),
        is_active: 1
      });

      if (res && res.success) {
        addToast('Time slot created successfully', 'success');
        setCreateModalOpen(false);
        // Reset form
        setSlotDate('');
        setStartTime('09:00');
        setEndTime('11:00');
        setMaxBookings(3);
        fetchSlots();
      }
    } catch (err) {
      console.error('Slot create error:', err);
      addToast(err.message || 'Failed to create slot.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEdit = (slot) => {
    setEditSlot(slot);
    setEditMaxBookings(slot.max_bookings);
    setEditActive(!!slot.is_active);
  };

  const handleUpdateSlot = async (e) => {
    e.preventDefault();
    if (editMaxBookings < editSlot.current_bookings) {
      addToast(`Cannot reduce max spots below current bookings count (${editSlot.current_bookings})`, 'warning');
      return;
    }
    
    setSubmitting(true);
    try {
      const res = await slotAPI.update(editSlot.id, {
        max_bookings: parseInt(editMaxBookings, 10),
        is_active: editActive ? 1 : 0
      });
      if (res && res.success) {
        addToast('Slot capacity updated successfully', 'success');
        setEditSlot(null);
        fetchSlots();
      }
    } catch (err) {
      console.error('Slot update error:', err);
      addToast(err.message || 'Failed to update slot.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSlot = async (slotId) => {
    const slot = slots.find(s => s.id === slotId);
    if (slot && slot.current_bookings > 0) {
      addToast('Cannot delete a slot that already contains active bookings.', 'warning');
      return;
    }

    if (!window.confirm('Are you sure you want to deactivate/delete this slot?')) return;

    try {
      const res = await slotAPI.delete(slotId);
      if (res && res.success) {
        addToast('Slot deactivated successfully', 'success');
        fetchSlots();
      }
    } catch (err) {
      console.error('Slot delete error:', err);
      addToast(err.message || 'Failed to deactivate slot', 'error');
    }
  };

  const formatTime = (timeStr) => {
    const [hours, minutes] = timeStr.split(':');
    const h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const dispHours = h % 12 || 12;
    return `${dispHours}:${minutes} ${ampm}`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="slot-management-container flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="heading-xl text-cream m-0" style={{ fontFamily: 'var(--font-heading)' }}>Time Slots Configuration</h1>
          <p className="text-muted text-sm m-0">Set up hourly site visit limits, enable slots, or add new scheduling times.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setCreateModalOpen(true)}>
          ➕ Add New Time Slot
        </button>
      </div>

      {/* Date Filters Range */}
      <div className="card bg-surface p-4 border border-border flex justify-between items-center gap-4 flex-wrap">
        <div className="flex gap-4 items-center flex-wrap">
          <div className="form-group mb-0">
            <label className="form-label text-xs">From Date</label>
            <input 
              type="date" 
              className="form-input text-sm" 
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)} 
            />
          </div>
          <div className="form-group mb-0">
            <label className="form-label text-xs">To Date</label>
            <input 
              type="date" 
              className="form-input text-sm" 
              value={toDate} 
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
        </div>
        <button className="btn btn-secondary" onClick={fetchSlots}>
          🔄 Refresh
        </button>
      </div>

      {/* Grid of Slots Grouped by Date */}
      {loading ? (
        <div className="text-center py-12">
          <div className="spinner sm mx-auto mb-2"></div>
          <span className="text-muted text-sm">Loading slots index...</span>
        </div>
      ) : slots.length === 0 ? (
        <div className="card text-center py-12 text-muted border border-dashed rounded">
          📅 No booking slots found in this range. Select "Add New Time Slot" to start.
        </div>
      ) : (
        <div className="slots-by-date-grid flex flex-col gap-6">
          {/* Group slots by Date in JS */}
          {Object.entries(
            slots.reduce((acc, slot) => {
              if (!acc[slot.slot_date]) acc[slot.slot_date] = [];
              acc[slot.slot_date].push(slot);
              return acc;
            }, {})
          ).map(([dateStr, dateSlots]) => (
            <div key={dateStr} className="date-group-card card bg-surface-2 p-4 border border-border rounded-xl">
              <h3 className="heading-md text-gold border-b pb-2 mb-3 m-0" style={{ fontFamily: 'var(--font-heading)' }}>
                {formatDate(dateStr)}
              </h3>
              
              <div className="grid gap-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
                {dateSlots.map((slot) => {
                  const isFull = slot.current_bookings >= slot.max_bookings;
                  const isInactive = !slot.is_active;

                  return (
                    <div 
                      key={slot.id} 
                      className={`slot-card card p-3 flex flex-col justify-between ${isInactive ? 'border-dashed opacity-60' : ''}`}
                      style={{
                        border: isInactive 
                          ? '1px dashed var(--color-danger)' 
                          : isFull 
                            ? '1px solid var(--color-gold-dim)' 
                            : '1px solid var(--color-border)',
                        backgroundColor: 'var(--color-surface)'
                      }}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-bold text-sm text-cream">
                          {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                        </span>
                        <span className={`badge ${isInactive ? 'badge-cancelled' : isFull ? 'badge-pending' : 'badge-completed'} text-xs`}>
                          {isInactive ? 'Inactive' : isFull ? 'Full' : 'Available'}
                        </span>
                      </div>

                      <div className="text-xs text-muted mb-3">
                        Bookings: <strong className="text-cream">{slot.current_bookings}</strong> / {slot.max_bookings} max spots
                      </div>

                      <div className="flex gap-2 mt-auto pt-2 border-t border-border">
                        <button 
                          className="btn btn-xs btn-secondary w-full"
                          onClick={() => handleOpenEdit(slot)}
                        >
                          Edit
                        </button>
                        <button 
                          className="btn btn-xs btn-danger w-full"
                          onClick={() => handleDeleteSlot(slot.id)}
                          disabled={slot.current_bookings > 0}
                        >
                          Deactivate
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE SLOT MODAL OVERLAY */}
      {createModalOpen && (
        <Modal 
          isOpen={createModalOpen} 
          onClose={() => setCreateModalOpen(false)} 
          title="Create Site Visit Slots" 
          size="md"
        >
          <form onSubmit={handleCreateSlot} className="flex flex-col gap-4">
            <div className="form-group">
              <label className="form-label" htmlFor="new-slot-date">Slot Date</label>
              <input
                id="new-slot-date"
                type="date"
                className="form-input"
                min={getTodayString()}
                value={slotDate}
                onChange={(e) => setSlotDate(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="new-slot-start">Start Time</label>
                <input
                  id="new-slot-start"
                  type="time"
                  className="form-input"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="new-slot-end">End Time</label>
                <input
                  id="new-slot-end"
                  type="time"
                  className="form-input"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="new-slot-max">Max Bookings Allowed (Capacity)</label>
              <input
                id="new-slot-max"
                type="number"
                className="form-input"
                min="1"
                max="10"
                value={maxBookings}
                onChange={(e) => setMaxBookings(e.target.value)}
                required
              />
            </div>

            <div className="flex justify-between gap-4 mt-2">
              <button type="button" className="btn btn-secondary w-full" onClick={() => setCreateModalOpen(false)} disabled={submitting}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary w-full" disabled={submitting}>
                {submitting ? 'Creating...' : 'Create Time Slot'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* EDIT SLOT MODAL OVERLAY */}
      {editSlot && (
        <Modal 
          isOpen={!!editSlot} 
          onClose={() => setEditSlot(null)} 
          title={`Edit Time Slot - ${editSlot.slot_date}`}
          size="md"
        >
          <form onSubmit={handleUpdateSlot} className="flex flex-col gap-4">
            <div className="card bg-surface-2 p-3 text-sm rounded mb-2">
              <p className="m-0 mb-1"><strong>Date:</strong> {editSlot.slot_date}</p>
              <p className="m-0 mb-1"><strong>Time Range:</strong> {formatTime(editSlot.start_time)} - {formatTime(editSlot.end_time)}</p>
              <p className="m-0"><strong>Current Bookings:</strong> {editSlot.current_bookings}</p>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="edit-slot-max">Max Spots (Capacity)</label>
              <input
                id="edit-slot-max"
                type="number"
                className="form-input"
                min={editSlot.current_bookings || 1}
                max="10"
                value={editMaxBookings}
                onChange={(e) => setEditMaxBookings(e.target.value)}
                required
              />
            </div>

            <div className="form-group flex items-center gap-3 mt-2">
              <input
                id="edit-slot-active"
                type="checkbox"
                checked={editActive}
                onChange={(e) => setEditActive(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <label className="form-label mb-0 cursor-pointer" htmlFor="edit-slot-active">
                Active & Open for Client Bookings
              </label>
            </div>

            <div className="flex justify-between gap-4 mt-2">
              <button type="button" className="btn btn-secondary w-full" onClick={() => setEditSlot(null)} disabled={submitting}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary w-full" disabled={submitting}>
                {submitting ? 'Saving...' : 'Save Capacity'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default SlotManagement;
