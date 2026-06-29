import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardAPI, bookingAPI } from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import MetricCard from '../../components/MetricCard';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';

const EngineerDashboard = () => {
  const { addToast } = useNotification();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const res = await dashboardAPI.getEngineerMetrics();
      if (res && res.success) {
        setMetrics(res.data);
      } else {
        addToast('Failed to fetch site engineer metrics.', 'error');
      }
    } catch (err) {
      console.error('Error fetching engineer dashboard:', err);
      addToast('Error loading site engineer statistics.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const handleStartVisit = async (bookingId) => {
    try {
      const res = await bookingAPI.updateStatus(bookingId, { status: 'In Progress' });
      if (res && res.success) {
        addToast('Site inspection started! Status changed to In Progress.', 'success');
        fetchMetrics();
      }
    } catch (err) {
      console.error('Start visit error:', err);
      addToast(err.message || 'Failed to update visit status', 'error');
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading || !metrics) {
    return <LoadingSpinner fullPage={true} />;
  }

  return (
    <div className="engineer-dashboard-container flex flex-col gap-6">
      {/* Welcome Banner */}
      <div>
        <h1 className="heading-xl text-cream m-0" style={{ fontFamily: 'var(--font-heading)' }}>Site Engineer Dashboard</h1>
        <p className="text-muted text-sm m-0">Track technical surveys, verify dimensions, and inspect structural layouts.</p>
      </div>

      {/* Metrics Row */}
      <div className="stats-grid grid grid-cols-2 lg:grid-cols-4 gap-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
        <MetricCard
          title="Total Assigned"
          value={metrics.total_assigned}
          subtitle="All structural reviews"
          icon="🔧"
          color="blue"
        />
        <MetricCard
          title="Pending Inspections"
          value={metrics.pending_visits}
          subtitle="Awaiting site visits"
          icon="⏳"
          color="yellow"
        />
        <MetricCard
          title="Completed Reviews"
          value={metrics.completed_visits}
          subtitle="Reports submitted"
          icon="✅"
          color="green"
        />
        <MetricCard
          title="Inspections This Month"
          value={metrics.this_month_visits}
          subtitle="Monthly visits count"
          icon="📈"
          color="purple"
        />
      </div>

      {/* Assigned Visits List */}
      <div className="card bg-surface p-6 border border-border rounded-xl">
        <h3 className="heading-md text-cream mb-4 border-b pb-2 border-border" style={{ fontFamily: 'var(--font-heading)' }}>
          Assigned Site Inspections
        </h3>

        {metrics.recent_assignments.length === 0 ? (
          <div className="text-center py-8 text-muted">
            📋 You have no active technical assignments.
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {metrics.recent_assignments.map((asgn) => (
              <div 
                key={asgn.assignment_id} 
                className="assignment-row card bg-surface-2 p-4 border border-border rounded-xl flex justify-between items-center gap-4 flex-wrap hover-glow"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gold">{asgn.booking_ref}</span>
                    <StatusBadge status={asgn.booking_status} />
                    <StatusBadge status={asgn.priority} />
                  </div>
                  <span className="font-semibold text-cream text-sm">Client: {asgn.client_name} - {asgn.project_type}</span>
                  <span className="text-xs text-muted">📍 {asgn.address}, {asgn.city}</span>
                </div>

                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex flex-col items-end text-xs text-muted">
                    <span>Visit Date: <strong>{formatDate(asgn.preferred_visit_date)}</strong></span>
                    {asgn.notes && <span className="text-gold italic">Note: {asgn.notes}</span>}
                  </div>

                  <div className="actions flex gap-2">
                    {asgn.booking_status === 'Scheduled' && (
                      <button 
                        className="btn btn-sm btn-primary font-semibold"
                        onClick={() => handleStartVisit(asgn.booking_id)}
                      >
                        🚗 Start Inspection
                      </button>
                    )}
                    {asgn.booking_status === 'In Progress' && (
                      <button 
                        className="btn btn-sm btn-primary font-semibold"
                        onClick={() => navigate(`/engineer/report/${asgn.booking_id}`)}
                      >
                        📝 Submit Inspection
                      </button>
                    )}
                    {['Completed', 'Cancelled'].includes(asgn.booking_status) && (
                      <span className="text-xs text-muted">No Actions Available</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EngineerDashboard;
