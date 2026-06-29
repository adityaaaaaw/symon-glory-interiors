import React, { useState, useEffect } from 'react';
import { bookingAPI, reportAPI } from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import LoadingSpinner from '../../components/LoadingSpinner';

const Reports = () => {
  const { addToast } = useNotification();
  const [completedBookings, setCompletedBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);

  const fetchCompletedBookings = async () => {
    setLoading(true);
    try {
      // Fetch bookings filtered by completed status
      const res = await bookingAPI.getAll({ status: 'Completed', limit: 50 });
      if (res && res.success) {
        setCompletedBookings(res.bookings || []);
      }
    } catch (err) {
      console.error('Failed to load completed bookings:', err);
      addToast('Failed to fetch reports index', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompletedBookings();
  }, []);

  const handleDownloadPDF = async (bookingId, bookingRef) => {
    setDownloadingId(bookingId);
    try {
      const blob = await reportAPI.exportPDF(bookingId);
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `GSI_SiteReport_${bookingRef}.pdf`);
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      addToast('PDF downloaded successfully', 'success');
    } catch (err) {
      console.error('Error downloading PDF:', err);
      addToast(err.message || 'Failed to download report PDF. Ensure the designer has submitted a report.', 'error');
    } finally {
      setDownloadingId(null);
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="reports-container flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="heading-xl text-cream m-0" style={{ fontFamily: 'var(--font-heading)' }}>Inspection Reports</h1>
          <p className="text-muted text-sm m-0">View completed consultations and download signed site measurements & design specifications sheets.</p>
        </div>
        <button className="btn btn-secondary" onClick={fetchCompletedBookings}>
          🔄 Refresh
        </button>
      </div>

      {/* Reports Directory Card */}
      {loading ? (
        <LoadingSpinner />
      ) : completedBookings.length === 0 ? (
        <div className="card text-center py-12 text-muted border border-dashed rounded">
          📄 No completed bookings with reports found. Reports are generated once designers/engineers submit their post-visit forms.
        </div>
      ) : (
        <div className="table-wrapper card p-0 overflow-x-auto border border-border">
          <table className="data-table">
            <thead>
              <tr>
                <th>Booking Ref</th>
                <th>Client Name</th>
                <th>Project Category</th>
                <th>Visit Date</th>
                <th>Specialist Assigned</th>
                <th>Site Engineer</th>
                <th className="text-right">Export PDF</th>
              </tr>
            </thead>
            <tbody>
              {completedBookings.map((b) => (
                <tr key={b.booking_id}>
                  <td className="font-bold text-gold">{b.booking_ref}</td>
                  <td>{b.client_name}</td>
                  <td>{b.project_type}</td>
                  <td>{formatDate(b.preferred_visit_date)}</td>
                  <td>🎨 {b.designer_name || 'Not Assigned'}</td>
                  <td>🔧 {b.engineer_name || 'Not Assigned'}</td>
                  <td className="text-right">
                    <button
                      className="btn btn-xs btn-primary font-semibold"
                      disabled={downloadingId === b.booking_id}
                      onClick={() => handleDownloadPDF(b.booking_id, b.booking_ref)}
                    >
                      {downloadingId === b.booking_id ? (
                        <span className="flex items-center gap-1">
                          <span className="spinner sm inline-block"></span> Generating...
                        </span>
                      ) : (
                        '📥 Download PDF'
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Reports;
