import React, { useState } from 'react';
import StatusBadge from './StatusBadge';

const BookingTable = ({ 
  bookings = [], 
  loading = false, 
  onViewBooking, 
  onAssign, 
  onStatusChange, 
  onCancel, 
  onReschedule, 
  showActions = true, 
  role = 'client' 
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Client-side filtering
  const filteredBookings = bookings.filter(b => {
    const term = searchTerm.toLowerCase();
    return (
      b.booking_ref.toLowerCase().includes(term) ||
      (b.client_name && b.client_name.toLowerCase().includes(term)) ||
      (b.client_mobile && b.client_mobile.toLowerCase().includes(term)) ||
      (b.city && b.city.toLowerCase().includes(term)) ||
      (b.project_type && b.project_type.toLowerCase().includes(term))
    );
  });

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getAvailableTransitions = (status) => {
    switch (status) {
      case 'Pending':
        return ['Confirmed', 'Cancelled'];
      case 'Confirmed':
        return ['Assigned', 'Cancelled'];
      case 'Assigned':
        return ['Scheduled', 'Cancelled'];
      case 'Scheduled':
        return ['In Progress', 'Cancelled'];
      case 'In Progress':
        return ['Completed', 'Cancelled'];
      default:
        return [];
    }
  };

  return (
    <div className="booking-table-wrapper flex flex-col w-full">
      {/* Table Header Controls */}
      <div className="flex justify-between items-center mb-4 gap-4 flex-wrap">
        <div className="form-group mb-0 flex-1 max-w-md">
          <input
            type="text"
            className="form-input"
            placeholder="Search bookings by ref, client, mobile, city..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Responsive Table Container */}
      <div className="table-wrapper card p-0">
        <table className="data-table">
          <thead>
            <tr>
              <th>Booking Ref</th>
              <th>Client</th>
              <th>Project Type</th>
              <th>City</th>
              <th>Visit Date & Slot</th>
              <th>Status</th>
              <th>Priority</th>
              {showActions && <th className="text-right">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              // Loading Skeleton Rows
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="skeleton-row">
                  <td colSpan={showActions ? 8 : 7} className="text-center py-4">
                    <div className="shimmer-line w-full rounded" style={{ height: '20px', background: 'var(--color-surface-2)' }}></div>
                  </td>
                </tr>
              ))
            ) : filteredBookings.length === 0 ? (
              <tr>
                <td colSpan={showActions ? 8 : 7} className="text-center py-8 text-muted">
                  📋 No bookings found.
                </td>
              </tr>
            ) : (
              filteredBookings.map((b) => (
                <tr key={b.booking_id || b.id}>
                  <td className="font-bold text-gold">{b.booking_ref}</td>
                  <td>
                    <div className="flex flex-col">
                      <span className="font-semibold text-cream">{b.client_name || 'Client'}</span>
                      <span className="text-xs text-muted">{b.client_mobile || ''}</span>
                    </div>
                  </td>
                  <td>{b.project_type}</td>
                  <td>{b.city}</td>
                  <td>
                    <div className="flex flex-col text-sm">
                      <span className="font-semibold text-cream">{formatDate(b.preferred_visit_date)}</span>
                      <span className="text-xs text-muted">{b.slot_time}</span>
                    </div>
                  </td>
                  <td>
                    <StatusBadge status={b.status} />
                  </td>
                  <td>
                    <StatusBadge status={b.priority} />
                  </td>
                  
                  {showActions && (
                    <td className="text-right">
                      <div className="flex gap-2 justify-end items-center">
                        <button 
                          onClick={() => onViewBooking(b)} 
                          className="btn btn-xs btn-secondary"
                        >
                          View
                        </button>

                        {/* Admin actions */}
                        {role === 'admin' && (
                          <>
                            {['Confirmed', 'Assigned', 'Scheduled'].includes(b.status) && (
                              <button 
                                onClick={() => onAssign(b)} 
                                className="btn btn-xs btn-primary"
                              >
                                {b.designer_name || b.engineer_name ? 'Reassign' : 'Assign'}
                              </button>
                            )}
                            
                            {getAvailableTransitions(b.status).length > 0 && (
                              <select
                                className="form-select text-xs p-1"
                                style={{ width: 'auto', display: 'inline-block' }}
                                defaultValue=""
                                onChange={(e) => {
                                  if (e.target.value) {
                                    onStatusChange(b.booking_id || b.id, e.target.value);
                                    e.target.value = ""; // reset dropdown
                                  }
                                }}
                              >
                                <option value="" disabled>Update Status</option>
                                {getAvailableTransitions(b.status).map(t => (
                                  <option key={t} value={t}>{t}</option>
                                ))}
                              </select>
                            )}
                          </>
                        )}

                        {/* Designer/Engineer actions */}
                        {(role === 'designer' || role === 'engineer') && (
                          <>
                            {b.status === 'Scheduled' && (
                              <button 
                                onClick={() => onStatusChange(b.booking_id || b.id, 'In Progress')}
                                className="btn btn-xs btn-primary"
                              >
                                Start Visit
                              </button>
                            )}
                            {b.status === 'In Progress' && (
                              <button 
                                onClick={() => onViewBooking(b)} // redirect to submit report
                                className="btn btn-xs btn-primary"
                              >
                                Submit Report
                              </button>
                            )}
                          </>
                        )}

                        {/* Client actions */}
                        {role === 'client' && (
                          <>
                            {['Pending', 'Confirmed'].includes(b.status) && (
                              <>
                                <button 
                                  onClick={() => onReschedule(b)} 
                                  className="btn btn-xs btn-secondary text-gold"
                                >
                                  Reschedule
                                </button>
                                <button 
                                  onClick={() => onCancel(b)} 
                                  className="btn btn-xs btn-danger"
                                >
                                  Cancel
                                </button>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BookingTable;
