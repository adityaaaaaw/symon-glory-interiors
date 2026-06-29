import React, { useState, useEffect } from 'react';
import { userAPI, assignmentAPI } from '../services/api';
import { useNotification } from '../context/NotificationContext';
import Modal from './Modal';

const AssignModal = ({ isOpen, onClose, booking, onSuccess }) => {
  const { addToast } = useNotification();
  const [designers, setDesigners] = useState([]);
  const [engineers, setEngineers] = useState([]);
  const [selectedDesigner, setSelectedDesigner] = useState('');
  const [selectedEngineer, setSelectedEngineer] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingStaff, setFetchingStaff] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const fetchStaff = async () => {
        setFetchingStaff(true);
        try {
          const resDesigners = await userAPI.getAll({ role_id: 3, is_active: 1 });
          const resEngineers = await userAPI.getAll({ role_id: 4, is_active: 1 });
          
          setDesigners(resDesigners.users || []);
          setEngineers(resEngineers.users || []);
        } catch (err) {
          console.error('Failed to load staff list:', err);
          addToast('Failed to load designers and engineers', 'error');
        } finally {
          setFetchingStaff(false);
        }
      };

      fetchStaff();
      
      // Initialize values if booking already has assignments
      if (booking) {
        setSelectedDesigner(booking.designer_user_id || '');
        setSelectedEngineer(booking.engineer_user_id || '');
        setNotes('');
      }
    }
  }, [isOpen, booking, addToast]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDesigner && !selectedEngineer) {
      addToast('Please assign at least one staff member (Designer or Site Engineer)', 'warning');
      return;
    }

    setLoading(true);
    try {
      const res = await assignmentAPI.assign({
        booking_id: booking.booking_id,
        designer_user_id: selectedDesigner ? parseInt(selectedDesigner, 10) : null,
        engineer_user_id: selectedEngineer ? parseInt(selectedEngineer, 10) : null,
        notes: notes.trim() || null
      });

      if (res && res.success) {
        addToast('Staff assigned successfully', 'success');
        onSuccess();
        onClose();
      }
    } catch (err) {
      console.error('Assignment error:', err);
      addToast(err.message || 'Failed to assign staff', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!booking) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Assign Staff - ${booking.booking_ref}`} size="md">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="card-body bg-surface-2 p-3 rounded mb-2 text-sm">
          <div className="flex justify-between mb-1">
            <span className="text-muted">Client:</span>
            <span className="font-semibold">{booking.client_name}</span>
          </div>
          <div className="flex justify-between mb-1">
            <span className="text-muted">Preferred Date:</span>
            <span className="font-semibold">{new Date(booking.preferred_visit_date).toLocaleDateString('en-IN')}</span>
          </div>
          <div className="flex justify-between mb-1">
            <span className="text-muted">Time Slot:</span>
            <span className="font-semibold">{booking.slot_time}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Project Type:</span>
            <span className="font-semibold">{booking.project_type}</span>
          </div>
        </div>

        {fetchingStaff ? (
          <div className="text-center py-4">
            <div className="spinner sm mx-auto mb-2"></div>
            <span className="text-muted text-sm">Loading staff members...</span>
          </div>
        ) : (
          <>
            <div className="form-group">
              <label className="form-label" htmlFor="designer-select">Assign Interior Designer</label>
              <select
                id="designer-select"
                className="form-select"
                value={selectedDesigner}
                onChange={(e) => setSelectedDesigner(e.target.value)}
              >
                <option value="">-- Select Designer (Optional) --</option>
                {designers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.full_name} {d.profile?.specialization ? `(${d.profile.specialization})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="engineer-select">Assign Site Engineer</label>
              <select
                id="engineer-select"
                className="form-select"
                value={selectedEngineer}
                onChange={(e) => setSelectedEngineer(e.target.value)}
              >
                <option value="">-- Select Site Engineer (Optional) --</option>
                {engineers.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.full_name} {e.profile?.specialization ? `(${e.profile.specialization})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="assign-notes">Assignment Instructions / Notes</label>
              <textarea
                id="assign-notes"
                className="form-textarea"
                rows="3"
                placeholder="Add instructions for the assigned team..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              ></textarea>
            </div>

            <div className="flex justify-between gap-4 mt-2">
              <button type="button" className="btn btn-secondary w-full" onClick={onClose} disabled={loading}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary w-full" disabled={loading}>
                {loading ? 'Assigning...' : 'Save Assignment'}
              </button>
            </div>
          </>
        )}
      </form>
    </Modal>
  );
};

export default AssignModal;
