import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { bookingAPI, reportAPI, aiAPI } from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import LoadingSpinner from '../../components/LoadingSpinner';

const InspectionForm = () => {
  const { bookingId } = useParams();
  const { addToast } = useNotification();
  const navigate = useNavigate();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [visitDate, setVisitDate] = useState(new Date().toISOString().slice(0, 10));
  const [observations, setObservations] = useState('');
  const [designSuggestions, setDesignSuggestions] = useState('');
  const [materialSuggestions, setMaterialSuggestions] = useState('');
  const [budgetEstimate, setBudgetEstimate] = useState('');
  const [summary, setSummary] = useState('');
  const [followUpNotes, setFollowUpNotes] = useState('');

  // Measurements
  const [measurements, setMeasurements] = useState([
    { room_name: 'Living Room', length_ft: '', width_ft: '', height_ft: '', notes: '' }
  ]);
  
  const [generatingSummary, setGeneratingSummary] = useState(false);

  useEffect(() => {
    const fetchBookingDetails = async () => {
      setLoading(true);
      try {
        const res = await bookingAPI.getById(bookingId);
        if (res && res.success) {
          setBooking(res.data);
          setBudgetEstimate(res.data.estimated_budget || '');
        }
      } catch (err) {
        console.error('Error fetching booking details:', err);
        addToast('Failed to load booking details', 'error');
        navigate('/engineer');
      } finally {
        setLoading(false);
      }
    };

    fetchBookingDetails();
  }, [bookingId, addToast, navigate]);

  const handleAddRow = () => {
    setMeasurements([
      ...measurements,
      { room_name: '', length_ft: '', width_ft: '', height_ft: '', notes: '' }
    ]);
  };

  const handleRemoveRow = (index) => {
    if (measurements.length === 1) return;
    setMeasurements(measurements.filter((_, idx) => idx !== index));
  };

  const handleMeasurementChange = (index, field, value) => {
    const updated = measurements.map((m, idx) => {
      if (idx === index) {
        return { ...m, [field]: value };
      }
      return m;
    });
    setMeasurements(updated);
  };

  const handleGenerateAISummary = async () => {
    if (!observations.trim()) {
      addToast('Please input observations first to generate AI summary.', 'warning');
      return;
    }

    setGeneratingSummary(true);
    try {
      const res = await aiAPI.generateSummary({
        observations,
        design_suggestions: designSuggestions,
        material_suggestions: materialSuggestions,
        budget_estimate: parseFloat(budgetEstimate) || 0,
        measurements: measurements.map(m => ({
          room_name: m.room_name,
          length_ft: parseFloat(m.length_ft) || 0,
          width_ft: parseFloat(m.width_ft) || 0,
          height_ft: parseFloat(m.height_ft) || 0
        }))
      });

      if (res && res.success) {
        setSummary(res.summary);
        addToast('AI Summary generated successfully!', 'success');
      }
    } catch (err) {
      console.error('AI generate summary error:', err);
      addToast('Failed to generate summary using AI', 'error');
    } finally {
      setGeneratingSummary(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!observations.trim() || !summary.trim()) {
      addToast('Please fill out visit observations and report summary.', 'warning');
      return;
    }

    // Validate measurements
    const parsedMeasurements = [];
    for (let i = 0; i < measurements.length; i++) {
      const m = measurements[i];
      if (!m.room_name || !m.length_ft || !m.width_ft || !m.height_ft) {
        addToast('Please fill all room measurements details completely.', 'warning');
        return;
      }
      parsedMeasurements.push({
        room_name: m.room_name,
        length_ft: parseFloat(m.length_ft),
        width_ft: parseFloat(m.width_ft),
        height_ft: parseFloat(m.height_ft),
        notes: m.notes || null
      });
    }

    setSubmitting(true);
    try {
      const res = await reportAPI.create({
        booking_id: parseInt(bookingId, 10),
        visit_date: visitDate,
        observations: observations.trim(),
        design_suggestions: designSuggestions.trim() || null,
        material_suggestions: materialSuggestions.trim() || null,
        budget_estimate: parseFloat(budgetEstimate) || null,
        summary: summary.trim(),
        follow_up_notes: followUpNotes.trim() || null,
        measurements: parsedMeasurements
      });

      if (res && res.success) {
        addToast('Site Inspection Report submitted successfully!', 'success');
        navigate('/engineer');
      }
    } catch (err) {
      console.error('Report submission error:', err);
      addToast(err.message || 'Failed to submit inspection report.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !booking) {
    return <LoadingSpinner fullPage={true} />;
  }

  return (
    <div className="inspection-report-page max-w-5xl mx-auto flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex justify-between items-center border-b pb-4 border-border">
        <div>
          <h1 className="heading-xl text-cream m-0" style={{ fontFamily: 'var(--font-heading)' }}>
            Technical Inspection: {booking.booking_ref}
          </h1>
          <p className="text-muted text-sm m-0">Submit engineering observations, structural survey, and room dimensions.</p>
        </div>
        <button className="btn btn-secondary" onClick={() => navigate('/engineer')}>
          &larr; Back to Dashboard
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Client Overview Card */}
        <div className="card bg-surface-2 p-4 border border-border rounded-xl text-sm">
          <h3 className="text-gold font-bold uppercase tracking-wider text-xs m-0 mb-3">Site details overview</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px' }}>
            <div><span className="text-muted block">Client Name:</span> <strong className="text-cream">{booking.client_name}</strong></div>
            <div><span className="text-muted block">Project Category:</span> <strong className="text-cream">{booking.project_type}</strong></div>
            <div><span className="text-muted block">Preferred Date:</span> <strong className="text-cream">{new Date(booking.preferred_visit_date).toLocaleDateString('en-IN')}</strong></div>
            <div><span className="text-muted block">Site Location:</span> <strong className="text-cream">{booking.address}, {booking.city}</strong></div>
          </div>
        </div>

        {/* Observations & Metadata */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
          
          <div className="flex flex-col gap-4">
            <div className="card bg-surface p-6 border border-border rounded-xl flex flex-col gap-4">
              <h3 className="heading-md text-gold border-b pb-2 mb-2 m-0" style={{ fontFamily: 'var(--font-heading)' }}>Structural Observations</h3>
              
              <div className="form-group">
                <label className="form-label" htmlFor="obs-input">Structural Observations</label>
                <textarea
                  id="obs-input"
                  className="form-textarea"
                  rows="4"
                  placeholder="Verify wall alignment, concrete strength, dampness issues, load bearing checks..."
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  required
                ></textarea>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="design-input">Layout Suggestions</label>
                <textarea
                  id="design-input"
                  className="form-textarea"
                  rows="3"
                  placeholder="Structural alignment modifications, columns adjustments..."
                  value={designSuggestions}
                  onChange={(e) => setDesignSuggestions(e.target.value)}
                ></textarea>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="material-input">Technical Material Specifications</label>
                <textarea
                  id="material-input"
                  className="form-textarea"
                  rows="3"
                  placeholder="Electrical wiring ratings, plumbing piping types, waterproof compounds..."
                  value={materialSuggestions}
                  onChange={(e) => setMaterialSuggestions(e.target.value)}
                ></textarea>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div className="card bg-surface p-6 border border-border rounded-xl flex flex-col gap-4">
              <h3 className="heading-md text-gold border-b pb-2 mb-2 m-0" style={{ fontFamily: 'var(--font-heading)' }}>Technical Metadata</h3>
              
              <div className="form-group">
                <label className="form-label" htmlFor="report-visit-date">Visit Date</label>
                <input
                  id="report-visit-date"
                  type="date"
                  className="form-input"
                  value={visitDate}
                  onChange={(e) => setVisitDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="report-budget">Estimated Execution Cost (₹)</label>
                <input
                  id="report-budget"
                  type="number"
                  className="form-input"
                  placeholder="Budget estimate..."
                  value={budgetEstimate}
                  onChange={(e) => setBudgetEstimate(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="followup-input">Technical Follow-up Notes</label>
                <textarea
                  id="followup-input"
                  className="form-textarea"
                  rows="3"
                  placeholder="Civil works requirements, architectural approvals required..."
                  value={followUpNotes}
                  onChange={(e) => setFollowUpNotes(e.target.value)}
                ></textarea>
              </div>
            </div>
          </div>

        </div>

        {/* Room Measurements Dynamic Table */}
        <div className="card bg-surface p-6 border border-border rounded-xl">
          <div className="flex justify-between items-center mb-4 border-b pb-2 border-border">
            <h3 className="heading-md text-gold m-0" style={{ fontFamily: 'var(--font-heading)' }}>Technical Layout Measurements</h3>
            <button type="button" className="btn btn-sm btn-primary" onClick={handleAddRow}>
              ➕ Add Room Row
            </button>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Room Name</th>
                  <th>Length (ft)</th>
                  <th>Width (ft)</th>
                  <th>Height (ft)</th>
                  <th>Technical Notes / Specs</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {measurements.map((m, idx) => (
                  <tr key={idx}>
                    <td>
                      <input
                        type="text"
                        className="form-input text-xs p-1"
                        placeholder="e.g. Kitchen"
                        value={m.room_name}
                        onChange={(e) => handleMeasurementChange(idx, 'room_name', e.target.value)}
                        required
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.1"
                        className="form-input text-xs p-1"
                        placeholder="Length"
                        value={m.length_ft}
                        onChange={(e) => handleMeasurementChange(idx, 'length_ft', e.target.value)}
                        required
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.1"
                        className="form-input text-xs p-1"
                        placeholder="Width"
                        value={m.width_ft}
                        onChange={(e) => handleMeasurementChange(idx, 'width_ft', e.target.value)}
                        required
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.1"
                        className="form-input text-xs p-1"
                        placeholder="Height"
                        value={m.height_ft}
                        onChange={(e) => handleMeasurementChange(idx, 'height_ft', e.target.value)}
                        required
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className="form-input text-xs p-1"
                        placeholder="Structural notes"
                        value={m.notes}
                        onChange={(e) => handleMeasurementChange(idx, 'notes', e.target.value)}
                      />
                    </td>
                    <td className="text-right">
                      <button
                        type="button"
                        className="btn btn-xs btn-danger"
                        disabled={measurements.length === 1}
                        onClick={() => handleRemoveRow(idx)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Inspection Summary Box */}
        <div className="card bg-surface p-6 border border-border rounded-xl">
          <div className="flex justify-between items-center mb-4 border-b pb-2 border-border">
            <h3 className="heading-md text-gold m-0" style={{ fontFamily: 'var(--font-heading)' }}>Inspection Summary</h3>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              disabled={generatingSummary}
              onClick={handleGenerateAISummary}
            >
              {generatingSummary ? (
                <span className="flex items-center gap-1">
                  <span className="spinner sm inline-block"></span> Generating Summary...
                </span>
              ) : (
                '🤖 Auto-Generate AI Summary'
              )}
            </button>
          </div>

          <div className="form-group mb-0">
            <textarea
              className="form-textarea"
              rows="5"
              placeholder="Write a technical site inspection summary or click 'Auto-Generate AI Summary' above..."
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              required
            ></textarea>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-4">
          <button type="button" className="btn btn-secondary py-3 px-6" onClick={() => navigate('/engineer')} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary py-3 px-8 font-semibold" disabled={submitting}>
            {submitting ? 'Submitting Inspection...' : 'Submit Inspection Report'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default InspectionForm;
