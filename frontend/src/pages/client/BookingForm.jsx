import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { bookingAPI, projectTypeAPI, aiAPI } from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import SlotPicker from '../../components/SlotPicker';
import StatusBadge from '../../components/StatusBadge';

const BookingForm = () => {
  const { addToast } = useNotification();
  const navigate = useNavigate();

  // Form Fields
  const [propertyType, setPropertyType] = useState('Residential');
  const [projectTypes, setProjectTypes] = useState([]);
  const [projectTypeId, setProjectTypeId] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');
  
  // Date & Slot
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlotId, setSelectedSlotId] = useState('');

  // Specs
  const [numRooms, setNumRooms] = useState(1);
  const [estimatedBudget, setEstimatedBudget] = useState(500000);
  const [projectDescription, setProjectDescription] = useState('');

  // Priority Auto-detection
  const [aiPriority, setAiPriority] = useState('Medium');
  const [aiExplanation, setAiExplanation] = useState('Default priority assigned.');
  const [detectingPriority, setDetectingPriority] = useState(false);
  
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchTypes = async () => {
      try {
        const res = await projectTypeAPI.getAll();
        if (res && res.success) {
          setProjectTypes(res.projectTypes || []);
          if (res.projectTypes && res.projectTypes.length > 0) {
            setProjectTypeId(res.projectTypes[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load project categories:', err);
      }
    };
    fetchTypes();
  }, []);

  // Run AI Priority Detection when budget, propertyType, or numRooms changes
  useEffect(() => {
    const detectPriority = async () => {
      setDetectingPriority(true);
      try {
        const res = await aiAPI.detectPriority({
          estimated_budget: parseFloat(estimatedBudget),
          property_type: propertyType,
          num_rooms: parseInt(numRooms, 10)
        });
        if (res && res.success) {
          setAiPriority(res.priority);
          setAiExplanation(res.explanation || 'Priority computed by system rules.');
        }
      } catch (err) {
        console.warn('AI Priority detection failed:', err.message);
      } finally {
        setDetectingPriority(false);
      }
    };

    const delayDebounce = setTimeout(() => {
      detectPriority();
    }, 600); // debounce API requests

    return () => clearTimeout(delayDebounce);
  }, [estimatedBudget, propertyType, numRooms]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedSlotId || !selectedDate) {
      addToast('Please select a visit date and time slot.', 'warning');
      return;
    }

    if (!projectTypeId) {
      addToast('Please select a project category.', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const res = await bookingAPI.create({
        property_type: propertyType,
        project_type_id: parseInt(projectTypeId, 10),
        address: address.trim(),
        city: city.trim(),
        pincode: pincode.trim(),
        preferred_visit_date: selectedDate,
        slot_id: parseInt(selectedSlotId, 10),
        num_rooms: parseInt(numRooms, 10),
        estimated_budget: parseFloat(estimatedBudget),
        project_description: projectDescription.trim() || null
      });

      if (res && res.success) {
        addToast('Site visit booked successfully! Awaiting admin confirmation.', 'success');
        navigate('/client/bookings');
      }
    } catch (err) {
      console.error('Create booking error:', err);
      addToast(err.message || 'Failed to submit booking. Check slot capacities.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="booking-form-page max-w-4xl mx-auto flex flex-col gap-6">
      <div>
        <h1 className="heading-xl text-cream m-0" style={{ fontFamily: 'var(--font-heading)' }}>Book a Site Visit</h1>
        <p className="text-muted text-sm m-0">Tell us about your spaces. Select a preferred date and slot to schedule our team visit.</p>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        
        {/* Left Side: Space Information */}
        <div className="flex flex-col gap-4">
          <div className="card bg-surface p-6 border border-border rounded-xl flex flex-col gap-4">
            <h3 className="heading-md text-gold border-b pb-2 mb-2 m-0" style={{ fontFamily: 'var(--font-heading)' }}>Space Details</h3>

            <div className="form-group">
              <label className="form-label">Property Type</label>
              <div className="flex gap-4">
                {['Residential', 'Commercial'].map((pt) => (
                  <label key={pt} className="flex items-center gap-2 cursor-pointer text-cream text-sm">
                    <input
                      type="radio"
                      name="propertyType"
                      value={pt}
                      checked={propertyType === pt}
                      onChange={(e) => setPropertyType(e.target.value)}
                      style={{ width: '16px', height: '16px' }}
                    />
                    {pt}
                  </label>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="project-category-select">Design Category</label>
              <select
                id="project-category-select"
                className="form-select"
                value={projectTypeId}
                onChange={(e) => setProjectTypeId(e.target.value)}
                required
              >
                <option value="" disabled>-- Select Category --</option>
                {projectTypes.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="input-num-rooms">No. of Rooms</label>
                <input
                  id="input-num-rooms"
                  type="number"
                  className="form-input"
                  min="1"
                  max="20"
                  value={numRooms}
                  onChange={(e) => setNumRooms(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="input-budget">Est. Budget (₹)</label>
                <input
                  id="input-budget"
                  type="number"
                  className="form-input"
                  min="50000"
                  step="25000"
                  value={estimatedBudget}
                  onChange={(e) => setEstimatedBudget(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Budget range selector (₹)</label>
              <input
                type="range"
                className="w-full cursor-pointer"
                min="100000"
                max="5000000"
                step="50000"
                value={estimatedBudget}
                onChange={(e) => setEstimatedBudget(e.target.value)}
                style={{ accentColor: 'var(--color-gold)' }}
              />
              <div className="flex justify-between text-xs text-muted mt-1">
                <span>₹1 Lakh</span>
                <span>₹25 Lakhs</span>
                <span>₹50 Lakhs</span>
              </div>
            </div>

            {/* AI Priority Box overlay */}
            <div className="card bg-surface-2 p-3 border border-border rounded flex flex-col gap-1 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-muted font-bold uppercase tracking-wider">AI Priority Engine</span>
                {detectingPriority ? (
                  <span className="spinner sm inline-block"></span>
                ) : (
                  <StatusBadge status={aiPriority} />
                )}
              </div>
              <p className="m-0 text-muted mt-1">{aiExplanation}</p>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="input-desc">Requirements Details (Optional)</label>
              <textarea
                id="input-desc"
                className="form-textarea"
                placeholder="Briefly describe your design goals, preferences, or dimensions..."
                rows="4"
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
              ></textarea>
            </div>

          </div>
        </div>

        {/* Right Side: Date/Slot Picker & Location */}
        <div className="flex flex-col gap-6">
          
          {/* Location */}
          <div className="card bg-surface p-6 border border-border rounded-xl flex flex-col gap-4">
            <h3 className="heading-md text-gold border-b pb-2 mb-2 m-0" style={{ fontFamily: 'var(--font-heading)' }}>Site Location</h3>
            
            <div className="form-group">
              <label className="form-label" htmlFor="input-address">Site Address</label>
              <textarea
                id="input-address"
                className="form-textarea"
                placeholder="Door number, apartment block, street..."
                rows="2"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
              ></textarea>
            </div>

            <div className="grid grid-cols-2 gap-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="input-city">City</label>
                <input
                  id="input-city"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Mumbai"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="input-pincode">Pincode</label>
                <input
                  id="input-pincode"
                  type="text"
                  className="form-input"
                  maxLength="6"
                  placeholder="400001"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                  required
                />
              </div>
            </div>
          </div>

          {/* Slot Picker Component */}
          <div className="card bg-surface p-6 border border-border rounded-xl">
            <h3 className="heading-md text-gold border-b pb-2 mb-2 m-0" style={{ fontFamily: 'var(--font-heading)' }}>Schedule Visit</h3>
            <SlotPicker
              selectedDate={selectedDate}
              onDateChange={(d) => { setSelectedDate(d); setSelectedSlotId(''); }}
              selectedSlotId={selectedSlotId}
              onSlotSelect={setSelectedSlotId}
            />
          </div>

          {/* Form Submit Button */}
          <button type="submit" className="btn btn-primary py-3 font-semibold mt-2" disabled={submitting}>
            {submitting ? 'Booking Visit...' : 'Submit Booking Request'}
          </button>
        </div>

      </form>
    </div>
  );
};

export default BookingForm;
