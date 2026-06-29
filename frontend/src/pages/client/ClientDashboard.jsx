import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { dashboardAPI } from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import MetricCard from '../../components/MetricCard';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';

const ClientDashboard = () => {
  const { user } = useAuth();
  const { addToast } = useNotification();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchClientMetrics = async () => {
    setLoading(true);
    try {
      const res = await dashboardAPI.getClientMetrics();
      if (res && res.success) {
        setMetrics(res.data);
      } else {
        addToast('Failed to fetch dashboard metrics.', 'error');
      }
    } catch (err) {
      console.error('Error fetching client dashboard:', err);
      addToast('Error loading dashboard stats', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientMetrics();
  }, []);

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
    <div className="client-dashboard-container flex flex-col gap-6">
      {/* Welcome Banner */}
      <div className="card bg-surface-2 p-6 border border-border rounded-2xl flex justify-between items-center flex-wrap gap-4" style={{ background: 'linear-gradient(135deg, hsl(30, 10%, 12%) 0%, hsl(30, 6%, 18%) 100%)' }}>
        <div>
          <h1 className="heading-xl text-cream m-0" style={{ fontFamily: 'var(--font-heading)' }}>
            Welcome, {user?.full_name || 'Client'}!
          </h1>
          <p className="text-muted text-sm mt-1 mb-0">Transform your living space. Schedule site visits and track your design approvals.</p>
        </div>
        <Link to="/client/book" className="btn btn-primary decoration-none">
          📅 Book Site Visit
        </Link>
      </div>

      {/* Metric Cards Row */}
      <div className="stats-grid grid grid-cols-2 lg:grid-cols-4 gap-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
        <MetricCard
          title="Total Bookings"
          value={metrics.total_bookings}
          subtitle="All requested visits"
          icon="📋"
          color="gold"
        />
        <MetricCard
          title="Pending Approval"
          value={metrics.pending}
          subtitle="Awaiting slot confirmation"
          icon="⏳"
          color="yellow"
        />
        <MetricCard
          title="Confirmed Visits"
          value={metrics.confirmed}
          subtitle="Staff assigned and confirmed"
          icon="📅"
          color="blue"
        />
        <MetricCard
          title="Completed Visits"
          value={metrics.completed}
          subtitle="Site surveys completed"
          icon="✅"
          color="green"
        />
      </div>

      {/* Recent Bookings Section */}
      <div className="card bg-surface p-6 border border-border rounded-xl">
        <div className="flex justify-between items-center mb-4 border-b pb-2 border-border">
          <h3 className="heading-md text-cream m-0" style={{ fontFamily: 'var(--font-heading)' }}>Recent Site Visits</h3>
          <Link to="/client/bookings" className="text-gold font-semibold text-sm decoration-none">
            View All Bookings &rarr;
          </Link>
        </div>

        {metrics.recent_bookings.length === 0 ? (
          <div className="text-center py-8 text-muted">
            📋 You haven't booked any site visits yet. Click "Book Site Visit" above to request your first design consultation!
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {metrics.recent_bookings.map((b) => (
              <div 
                key={b.id} 
                className="booking-row-item card bg-surface-2 p-4 border border-border rounded-xl flex justify-between items-center gap-4 flex-wrap hover-glow cursor-pointer"
                onClick={() => navigate('/client/bookings')}
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gold">{b.booking_ref}</span>
                    <StatusBadge status={b.status} />
                  </div>
                  <span className="font-semibold text-cream text-sm">{b.project_type} ({b.property_type})</span>
                  <span className="text-xs text-muted">📍 {b.city}</span>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <span className="text-xs text-muted">
                    Preferred Visit: <strong>{formatDate(b.preferred_visit_date)}</strong>
                  </span>
                  <span className="text-xs text-muted">
                    Slot Time: <strong>{b.slot_start ? `${b.slot_start.slice(0, 5)} - ${b.slot_end.slice(0, 5)}` : 'N/A'}</strong>
                  </span>
                  <span className="text-sm font-bold text-gold mt-1">
                    Est. Budget: ₹{parseFloat(b.estimated_budget).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientDashboard;
