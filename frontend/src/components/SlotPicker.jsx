import React, { useState, useEffect } from 'react';
import { slotAPI } from '../services/api';

const SlotPicker = ({ selectedDate, onDateChange, selectedSlotId, onSlotSelect }) => {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Set minimum date to tomorrow (visits must be booked at least 1 day in advance)
  const getMinDateString = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().slice(0, 10);
  };

  useEffect(() => {
    if (!selectedDate) return;

    const fetchSlots = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await slotAPI.getByDate(selectedDate);
        if (res && res.success) {
          setSlots(res.slots || []);
        } else {
          setError(res.message || 'Failed to fetch slots.');
        }
      } catch (err) {
        console.error('Error fetching slots:', err);
        setError('Error loading available slots for this date.');
      } finally {
        setLoading(false);
      }
    };

    fetchSlots();
  }, [selectedDate]);

  const formatTime = (timeStr) => {
    // timeStr is like "09:00:00"
    const [hours, minutes] = timeStr.split(':');
    const h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const dispHours = h % 12 || 12;
    return `${dispHours}:${minutes} ${ampm}`;
  };

  return (
    <div className="slot-picker-container flex flex-col gap-4">
      <div className="form-group">
        <label className="form-label" htmlFor="visit-date-picker">Preferred Visit Date</label>
        <input
          id="visit-date-picker"
          type="date"
          className="form-input"
          min={getMinDateString()}
          value={selectedDate}
          onChange={(e) => onDateChange(e.target.value)}
          required
        />
      </div>

      {selectedDate && (
        <div className="slots-grid-wrapper mt-2">
          <label className="form-label mb-2 block">Available Time Slots</label>
          
          {loading ? (
            <div className="flex flex-col items-center py-6">
              <div className="spinner sm mb-2"></div>
              <span className="text-muted text-sm">Checking slot availability...</span>
            </div>
          ) : error ? (
            <div className="text-danger text-sm text-center py-4 bg-danger-bg rounded border border-danger p-3">
              {error}
            </div>
          ) : slots.length === 0 ? (
            <div className="text-muted text-sm text-center py-6 border border-dashed rounded p-4">
              📅 No booking slots have been created for this date. Please try another date.
            </div>
          ) : (
            <div className="slots-grid grid grid-cols-2 gap-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' }}>
              {slots.map((slot) => {
                const isFull = slot.available_spots <= 0;
                const isSelected = selectedSlotId === slot.id;
                
                let badgeClass = 'badge-success';
                if (slot.availability_label === 'Full') badgeClass = 'badge-cancelled';
                else if (slot.availability_label === 'Filling Fast') badgeClass = 'badge-pending';

                return (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => !isFull && onSlotSelect(slot.id)}
                    disabled={isFull}
                    className={`slot-card card text-center p-3 flex flex-col items-center justify-between transition ${
                      isSelected ? 'selected-slot' : ''
                    } ${isFull ? 'disabled-slot opacity-50' : 'hover-glow cursor-pointer'}`}
                    style={{
                      border: isSelected 
                        ? '2px solid var(--color-gold)' 
                        : '1px solid var(--color-border)',
                      backgroundColor: isSelected 
                        ? 'var(--color-surface-2)' 
                        : 'var(--color-surface)',
                      cursor: isFull ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <div className="time-range font-bold text-sm mb-1 text-cream">
                      {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                    </div>
                    
                    <div className="spots-left text-xs text-muted mb-2">
                      {isFull ? '0 spots' : `${slot.available_spots} spots`} left
                    </div>

                    <span className={`badge ${badgeClass} text-xs font-semibold`}>
                      {slot.availability_label}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SlotPicker;
