import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardAPI } from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import MetricCard from '../../components/MetricCard';
import LoadingSpinner from '../../components/LoadingSpinner';

const AdminDashboard = () => {
  const { addToast } = useNotification();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState(null);
  const [funnel, setFunnel] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resMetrics, resFunnel, resActivity] = await Promise.all([
        dashboardAPI.getAdminMetrics(),
        dashboardAPI.getConversionFunnel(),
        dashboardAPI.getRecentActivity()
      ]);

      if (resMetrics.success && resFunnel.success && resActivity.success) {
        setMetrics(resMetrics.data);
        setFunnel(resFunnel.data);
        setActivity(resActivity.data || []);
      } else {
        addToast('Failed to load dashboard metrics.', 'error');
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      addToast('Error fetching admin dashboard statistics.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading || !metrics || !funnel) {
    return <LoadingSpinner fullPage={true} />;
  }

  const base = metrics.base_metrics || {};

  // Color mappings for booking status badges
  const statusColors = {
    Pending: 'var(--color-warning)',
    Confirmed: 'var(--color-info)',
    Assigned: 'var(--color-purple)',
    Scheduled: 'var(--color-teal)',
    'In Progress': 'orange',
    Completed: 'var(--color-success)',
    Cancelled: 'var(--color-danger)',
  };

  return (
    <div className="admin-dashboard-container flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="heading-xl text-cream m-0" style={{ fontFamily: 'var(--font-heading)' }}>Dashboard Overview</h1>
          <p className="text-muted text-sm m-0">Glory Simon Interiors booking and execution activity.</p>
        </div>
        <button className="btn btn-primary" onClick={fetchData}>
          🔄 Refresh Data
        </button>
      </div>

      {/* Row 1: Key Metrics */}
      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
        <MetricCard
          title="Total Clients"
          value={base.total_clients || 0}
          subtitle="Registered client profiles"
          icon="👥"
          color="blue"
        />
        <MetricCard
          title="Total Bookings"
          value={base.total_bookings || 0}
          subtitle="All-time booked site visits"
          icon="📋"
          color="gold"
        />
        <MetricCard
          title="Today's Site Visits"
          value={base.todays_visits || 0}
          subtitle="Visits scheduled for today"
          icon="🚗"
          color="teal"
        />
        <MetricCard
          title="Upcoming Site Visits"
          value={base.upcoming_visits_7d || 0}
          subtitle="Scheduled for next 7 days"
          icon="📅"
          color="purple"
        />
      </div>

      {/* Row 2: Secondary Metrics */}
      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
        <MetricCard
          title="Completed Visits"
          value={base.completed_bookings || 0}
          subtitle="Design consultations completed"
          icon="✅"
          color="green"
        />
        <MetricCard
          title="Active Designers"
          value={base.active_designers || 0}
          subtitle="Specialists currently active"
          icon="🎨"
          color="gold"
        />
        <MetricCard
          title="Active Engineers"
          value={base.active_engineers || 0}
          subtitle="Site engineers currently active"
          icon="🔧"
          color="teal"
        />
        <MetricCard
          title="Booking Lead Conversion"
          value={`${funnel.conversion_rate || 0}%`}
          subtitle="Completed vs total bookings"
          icon="📈"
          color="green"
        />
      </div>

      {/* Row 3: Conversion Funnel */}
      <div className="card bg-surface-2 p-6 rounded-xl border border-border">
        <h3 className="heading-md text-cream mb-4">Site Visit Booking Conversion Funnel</h3>
        <div className="funnel-chart flex flex-col gap-3">
          {[
            { label: 'Total Leads/Bookings', count: funnel.total_leads, pct: 100 },
            { label: 'Confirmed Visits', count: funnel.total_confirmed, pct: funnel.total_leads ? (funnel.total_confirmed / funnel.total_leads) * 100 : 0 },
            { label: 'Staff Assigned', count: funnel.total_assigned, pct: funnel.total_leads ? (funnel.total_assigned / funnel.total_leads) * 100 : 0 },
            { label: 'Scheduled Visits', count: funnel.total_scheduled, pct: funnel.total_leads ? (funnel.total_scheduled / funnel.total_leads) * 100 : 0 },
            { label: 'In Progress Visits', count: funnel.total_in_progress, pct: funnel.total_leads ? (funnel.total_in_progress / funnel.total_leads) * 100 : 0 },
            { label: 'Completed Consultations', count: funnel.total_completed, pct: funnel.total_leads ? (funnel.total_completed / funnel.total_leads) * 100 : 0 }
          ].map((stage, idx) => (
            <div key={idx} className="funnel-stage">
              <div className="flex justify-between text-sm mb-1">
                <span className="font-semibold text-cream">{stage.label}</span>
                <span className="text-gold font-bold">{stage.count} <span className="text-muted text-xs">({stage.pct.toFixed(1)}%)</span></span>
              </div>
              <div className="w-full bg-surface h-2 rounded overflow-hidden">
                <div 
                  className="h-full bg-gold-gradient rounded" 
                  style={{ width: `${stage.pct}%`, background: 'var(--color-gold)' }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Row 4: Bookings Breakdown & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
        
        {/* Bookings Breakdown by Status */}
        <div className="card bg-surface p-6 border border-border rounded-xl">
          <h3 className="heading-md text-cream mb-4">Bookings Status Breakdown</h3>
          <div className="flex flex-col gap-4">
            {metrics.bookings_by_status.map((item, idx) => {
              const total = base.total_bookings || 1;
              const pct = (item.count / total) * 100;
              return (
                <div key={idx} className="status-progress-bar">
                  <div className="flex justify-between items-center text-sm mb-1">
                    <span className="font-semibold text-cream">{item.status}</span>
                    <span className="font-bold" style={{ color: statusColors[item.status] || 'white' }}>
                      {item.count} <span className="text-muted text-xs">({pct.toFixed(1)}%)</span>
                    </span>
                  </div>
                  <div className="w-full bg-surface-2 h-2 rounded overflow-hidden">
                    <div 
                      className="h-full" 
                      style={{ 
                        width: `${pct}%`, 
                        backgroundColor: statusColors[item.status] || 'var(--color-gold)' 
                      }}
                    ></div>
                  </div>
                </div>
              );
            })}
            {metrics.bookings_by_status.length === 0 && (
              <p className="text-center text-muted text-sm py-8 m-0">No bookings available for breakdown.</p>
            )}
          </div>
        </div>

        {/* Recent Audit Activities */}
        <div className="card bg-surface p-6 border border-border rounded-xl flex flex-col">
          <h3 className="heading-md text-cream mb-4">Recent System Logs</h3>
          <div className="activity-list scrollable flex-1 flex flex-col gap-3" style={{ maxHeight: '350px', overflowY: 'auto', paddingRight: '8px' }}>
            {activity.map((log, idx) => (
              <div key={idx} className="activity-item p-3 bg-surface-2 border border-border rounded flex flex-col gap-1">
                <div className="flex justify-between text-xs text-muted">
                  <span className="font-bold text-gold">{log.action.replace('_', ' ')}</span>
                  <span>{new Date(log.created_at).toLocaleString('en-IN')}</span>
                </div>
                <div className="text-sm text-cream font-medium">
                  {log.user_name} <span className="text-muted font-normal">performed actions on {log.entity_type} #{log.entity_id}</span>
                </div>
                {log.details && (
                  <div className="text-xs text-muted bg-surface p-1 rounded font-mono truncate">
                    {JSON.stringify(log.details)}
                  </div>
                )}
              </div>
            ))}
            {activity.length === 0 && (
              <p className="text-center text-muted text-sm py-8 m-0">No recent system activity.</p>
            )}
          </div>
        </div>
        
      </div>
    </div>
  );
};

export default AdminDashboard;
