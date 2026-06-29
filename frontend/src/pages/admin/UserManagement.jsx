import React, { useState, useEffect, useCallback } from 'react';
import { userAPI } from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import LoadingSpinner from '../../components/LoadingSpinner';

const UserManagement = () => {
  const { addToast } = useNotification();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [roleFilter, setRoleFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        role_id: roleFilter || undefined,
        is_active: statusFilter === '' ? undefined : statusFilter === 'active' ? 'true' : 'false',
        search: searchQuery || undefined
      };
      
      const res = await userAPI.getAll(params);
      if (res && res.success) {
        setUsers(res.users || []);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      addToast('Failed to load user directories.', 'error');
    } finally {
      setLoading(false);
    }
  }, [roleFilter, searchQuery, statusFilter, addToast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleToggleStatus = async (user) => {
    if (window.confirm(`Are you sure you want to ${user.is_active ? 'deactivate' : 'activate'} user "${user.full_name}"?`)) {
      try {
        const res = await userAPI.toggleActive(user.id, { is_active: !user.is_active });
        if (res && res.success) {
          addToast(`Account status updated successfully`, 'success');
          fetchUsers();
        }
      } catch (err) {
        console.error('Toggle status error:', err);
        addToast(err.message || 'Failed to update user status.', 'error');
      }
    }
  };

  const getRoleBadge = (roleId) => {
    switch (roleId) {
      case 1: return <span className="badge badge-pending">Admin</span>;
      case 2: return <span className="badge badge-completed">Client</span>;
      case 3: return <span className="badge badge-assigned">Designer</span>;
      case 4: return <span className="badge badge-scheduled">Site Engineer</span>;
      default: return <span className="badge">User</span>;
    }
  };

  return (
    <div className="user-management-container flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="heading-xl text-cream m-0" style={{ fontFamily: 'var(--font-heading)' }}>User Directories</h1>
          <p className="text-muted text-sm m-0">View all registered accounts, manage staff records, and toggle profile active status.</p>
        </div>
        <button className="btn btn-secondary" onClick={fetchUsers}>
          🔄 Refresh
        </button>
      </div>

      {/* Filters Bar */}
      <div className="card bg-surface-2 border border-border p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          
          <div className="form-group mb-0">
            <label className="form-label text-xs">Search Accounts</label>
            <input
              type="text"
              className="form-input text-sm p-2"
              placeholder="Search by name, email, mobile..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="form-group mb-0">
            <label className="form-label text-xs">Filter by Role</label>
            <select
              className="form-select text-sm p-2"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="">All Roles</option>
              <option value="1">Admin</option>
              <option value="2">Client</option>
              <option value="3">Designer</option>
              <option value="4">Site Engineer</option>
            </select>
          </div>

          <div className="form-group mb-0">
            <label className="form-label text-xs">Filter by Status</label>
            <select
              className="form-select text-sm p-2"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="active">Active Accounts</option>
              <option value="inactive">Inactive Accounts</option>
            </select>
          </div>

          <div className="flex items-end">
            <button 
              className="btn btn-secondary w-full py-2" 
              onClick={() => { setRoleFilter(''); setStatusFilter(''); setSearchQuery(''); }}
            >
              Reset Filters
            </button>
          </div>

        </div>
      </div>

      {/* Directory Table */}
      {loading ? (
        <div className="text-center py-12">
          <div className="spinner sm mx-auto mb-2"></div>
          <span className="text-muted text-sm">Loading user listings...</span>
        </div>
      ) : users.length === 0 ? (
        <div className="card text-center py-12 text-muted border border-dashed rounded">
          👥 No accounts matched the selected filters.
        </div>
      ) : (
        <div className="table-wrapper card p-0 overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Account Details</th>
                <th>Contact</th>
                <th>System Role</th>
                <th>Profile Specialization / Details</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className="flex flex-col">
                      <span className="font-bold text-cream">{u.full_name}</span>
                      <span className="text-xs text-muted">{u.email}</span>
                    </div>
                  </td>
                  <td>{u.mobile_number}</td>
                  <td>{getRoleBadge(u.role_id)}</td>
                  <td>
                    {u.role_id === 2 && u.profile && (
                      <span className="text-xs text-muted">
                        📍 {u.profile.city || 'No City'}
                      </span>
                    )}
                    {(u.role_id === 3 || u.role_id === 4) && u.profile && (
                      <div className="flex flex-col text-xs text-muted">
                        <span>Specialization: <strong>{u.profile.specialization || 'General'}</strong></span>
                        <span>Experience: <strong>{u.profile.experience_yrs} yrs</strong></span>
                      </div>
                    )}
                    {(!u.profile) && <span className="text-xs text-subtle">-</span>}
                  </td>
                  <td>
                    <span className={`badge ${u.is_active ? 'badge-completed' : 'badge-cancelled'} text-xs font-semibold`}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="text-right">
                    <button
                      className={`btn btn-xs ${u.is_active ? 'btn-danger' : 'btn-primary'}`}
                      onClick={() => handleToggleStatus(u)}
                    >
                      {u.is_active ? 'Deactivate' : 'Activate'}
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

export default UserManagement;
