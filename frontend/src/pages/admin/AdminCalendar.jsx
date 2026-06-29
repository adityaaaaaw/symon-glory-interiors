import React, { useState, useEffect } from 'react';
import { calendarAPI } from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';

const AdminCalendar = () => {
  const { addToast } = useNotification();
  const [view, setView] = useState('month'); // 'month', 'week', 'day'
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarData, setCalendarData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState(null);

  const getFormattedDateString = (date) => {
    return date.toISOString().slice(0, 10);
  };

  const fetchCalendarData = async () => {
    setLoading(true);
    try {
      const dateStr = getFormattedDateString(currentDate);
      const res = await calendarAPI.getData(view, dateStr);
      if (res && res.success) {
        setCalendarData(res);
      } else {
        addToast('Failed to fetch calendar schedules.', 'error');
      }
    } catch (err) {
      console.error('Error loading calendar:', err);
      addToast('Error fetching calendar bookings.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendarData();
  }, [view, currentDate]);

  const handleNavigate = (direction) => {
    const newDate = new Date(currentDate);
    if (view === 'month') {
      newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1));
    } else if (view === 'week') {
      newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7));
    } else {
      newDate.setDate(currentDate.getDate() + (direction === 'next' ? 1 : -1));
    }
    setCurrentDate(newDate);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Month rendering calculations
  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay(); // 0 is Sunday, 1 is Monday...

  const renderMonthView = () => {
    if (!calendarData) return null;
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const totalDays = getDaysInMonth(year, month);
    const firstDayIndex = getFirstDayOfMonth(year, month); // Day of week (0-6)
    
    // Shift days index to start week on Monday (1) rather than Sunday (0)
    // Mon (0), Tue (1) ... Sun (6)
    let shiftedFirstDay = firstDayIndex - 1;
    if (shiftedFirstDay < 0) shiftedFirstDay = 6; // Sunday becomes 6

    const days = [];
    // Pad previous month days
    for (let i = 0; i < shiftedFirstDay; i++) {
      days.push({ dayNum: null, dateStr: null });
    }

    // Add current month days
    for (let i = 1; i <= totalDays; i++) {
      const date = new Date(year, month, i);
      days.push({
        dayNum: i,
        dateStr: getFormattedDateString(date)
      });
    }

    // Map bookings by date for easy access
    const bookingsByDate = (calendarData.bookings || []).reduce((acc, b) => {
      const dateKey = b.preferred_visit_date.slice(0, 10);
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(b);
      return acc;
    }, {});

    const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    return (
      <div className="calendar-month-view">
        {/* Week headers */}
        <div className="calendar-week-headers grid grid-cols-7 text-center font-bold text-xs text-muted mb-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
          {weekDays.map(wd => (
            <div key={wd} className="py-2 border-b border-border uppercase tracking-widest">{wd}</div>
          ))}
        </div>

        {/* Days grid */}
        <div className="calendar-days-grid grid grid-cols-7 gap-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
          {days.map((day, idx) => {
            const hasDay = day.dayNum !== null;
            const dayBookings = hasDay ? (bookingsByDate[day.dateStr] || []) : [];

            return (
              <div 
                key={idx} 
                className={`calendar-day card p-2 bg-surface flex flex-col justify-start rounded-lg border min-h-24 ${
                  !hasDay ? 'opacity-20 border-none bg-transparent' : 'border-border'
                }`}
                style={{
                  minHeight: '110px'
                }}
              >
                {hasDay && (
                  <>
                    <div className="day-number text-xs font-semibold text-muted mb-1">
                      {day.dayNum}
                    </div>
                    <div className="day-events flex flex-col gap-1 overflow-y-auto" style={{ maxHeight: '80px' }}>
                      {dayBookings.map((b) => (
                        <button
                          key={b.booking_id}
                          className="calendar-event-pill text-left text-xs p-1 rounded font-semibold truncate cursor-pointer text-cream"
                          style={{
                            backgroundColor: calendarData.colors?.[b.status] || 'var(--color-gold-dim)',
                            border: 'none',
                            color: '#1a1408'
                          }}
                          onClick={() => setSelectedBooking(b)}
                        >
                          {b.booking_ref.slice(-4)} - {b.client_name}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderWeekOrDayView = () => {
    if (!calendarData) return null;
    return (
      <div className="calendar-list-view flex flex-col gap-4">
        <h3 className="heading-md text-cream mb-2">Bookings scheduled in this period</h3>
        {calendarData.bookings.length === 0 ? (
          <div className="card text-center py-8 text-muted border border-dashed rounded">
            🗓️ No site visits scheduled for this range.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {calendarData.bookings.map((b) => (
              <div 
                key={b.booking_id}
                className="card bg-surface p-4 border border-border rounded-xl flex justify-between items-center gap-4 hover-glow cursor-pointer"
                onClick={() => setSelectedBooking(b)}
              >
                <div className="flex flex-col gap-1">
                  <span className="font-bold text-gold">{b.booking_ref}</span>
                  <span className="font-semibold text-cream text-sm">{b.client_name} - {b.project_type}</span>
                  <span className="text-xs text-muted">📍 {b.city}</span>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <span className="text-xs text-muted font-mono">
                    {new Date(b.preferred_visit_date).toLocaleDateString('en-IN')} | {b.slot_time}
                  </span>
                  <div className="flex gap-2">
                    <StatusBadge status={b.status} />
                    <StatusBadge status={b.priority} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="admin-calendar-container flex flex-col gap-6">
      {/* Calendar Header */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="heading-xl text-cream m-0" style={{ fontFamily: 'var(--font-heading)' }}>Interactive Calendar</h1>
          <p className="text-muted text-sm m-0">Visualize site visit pipeline, monitor slot utilization overlay, and edit staff roles.</p>
        </div>
        
        {/* View togglers */}
        <div className="flex gap-2 bg-surface-2 p-1 border border-border rounded-lg">
          {['month', 'week', 'day'].map((v) => (
            <button
              key={v}
              className={`btn btn-xs ${view === v ? 'btn-primary' : 'btn-secondary border-none'}`}
              onClick={() => setView(v)}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar Controls */}
      <div className="card bg-surface p-4 border border-border flex justify-between items-center gap-4 flex-wrap">
        <div className="flex gap-2 items-center">
          <button className="btn btn-sm btn-secondary" onClick={() => handleNavigate('prev')}>&larr; Prev</button>
          <button className="btn btn-sm btn-secondary" onClick={handleToday}>Today</button>
          <button className="btn btn-sm btn-secondary" onClick={() => handleNavigate('next')}>Next &rarr;</button>
        </div>
        
        <h3 className="heading-md text-gold m-0" style={{ fontFamily: 'var(--font-heading)' }}>
          {currentDate.toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'long',
            day: view !== 'month' ? 'numeric' : undefined
          })}
        </h3>
      </div>

      {/* Main Grid Render */}
      {loading ? (
        <div className="text-center py-12">
          <div className="spinner sm mx-auto mb-2"></div>
          <span className="text-muted text-sm">Loading schedules grid...</span>
        </div>
      ) : view === 'month' ? (
        renderMonthView()
      ) : (
        renderWeekOrDayView()
      )}

      {/* Booking Quick Details Drawer Modal */}
      {selectedBooking && (
        <div className="drawer-backdrop" onClick={() => setSelectedBooking(null)}>
          <div className="drawer-container sidebar-drawer open" onClick={(e) => e.stopPropagation()} style={{ width: '400px' }}>
            <div className="drawer-header flex justify-between items-center mb-4 border-b pb-2 border-border">
              <h3 className="heading-md text-gold m-0">{selectedBooking.booking_ref}</h3>
              <button className="drawer-close-btn" onClick={() => setSelectedBooking(null)}>&times;</button>
            </div>
            
            <div className="drawer-content flex flex-col gap-4 text-cream">
              <div className="flex gap-2">
                <StatusBadge status={selectedBooking.status} />
                <StatusBadge status={selectedBooking.priority} />
              </div>

              <div className="bg-surface-2 p-3 rounded text-sm border border-border">
                <p className="m-0 mb-1"><strong>Client:</strong> {selectedBooking.client_name}</p>
                <p className="m-0 mb-1"><strong>Mobile:</strong> {selectedBooking.client_mobile}</p>
                <p className="m-0 mb-1"><strong>Preferred Date:</strong> {new Date(selectedBooking.preferred_visit_date).toLocaleDateString('en-IN')}</p>
                <p className="m-0 mb-1"><strong>Slot Time:</strong> {selectedBooking.slot_time}</p>
                <p className="m-0 mb-1"><strong>Design Style:</strong> {selectedBooking.project_type}</p>
                <p className="m-0"><strong>City:</strong> {selectedBooking.city}</p>
              </div>

              <div className="border border-border p-3 rounded bg-surface-2">
                <h4 className="heading-sm text-gold m-0 mb-2">Assigned Staff</h4>
                <p className="m-0 mb-1 text-sm">🎨 Designer: <strong>{selectedBooking.designer_name || 'Not Assigned'}</strong></p>
                <p className="m-0 text-sm">🔧 Engineer: <strong>{selectedBooking.engineer_name || 'Not Assigned'}</strong></p>
              </div>

              <button 
                className="btn btn-primary w-full mt-4" 
                onClick={() => { setSelectedBooking(null); navigate('/admin/bookings'); }}
              >
                Go to Bookings Detail
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCalendar;
