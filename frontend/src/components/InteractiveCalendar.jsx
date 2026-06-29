import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar, User, Clock, MapPin } from 'lucide-react';

export const InteractiveCalendar = ({ events = [] }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState('month'); // 'month', 'week', 'day'

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Helper to get number of days in month
  const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (y, m) => new Date(y, m, 1).getDay();

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Change month handlers
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };
  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Filter events for a specific date (date format YYYY-MM-DD)
  const getEventsForDate = (dateStr) => {
    return events.filter(e => {
      if (!e.preferred_date) return false;
      return e.preferred_date === dateStr && e.status !== 'Cancelled';
    });
  };

  // Generate calendar grid array
  const calendarDays = [];
  // Padding for empty days at start of month
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null);
  }
  // Days of the month
  for (let d = 1; d <= daysInMonth; d++) {
    const formattedD = d < 10 ? `0${d}` : d;
    const formattedM = (month + 1) < 10 ? `0${month + 1}` : (month + 1);
    const dateStr = `${year}-${formattedM}-${formattedD}`;
    calendarDays.push({ dayNum: d, dateStr });
  }

  const selectedDayEvents = getEventsForDate(selectedDate);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Calendar Grid Section */}
      <div className="lg:col-span-2 bg-white border border-borderColor rounded-xl p-5 shadow-sm space-y-4">
        
        {/* Header Controls */}
        <div className="flex items-center justify-between border-b border-borderColor pb-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-accentGold" />
            <h3 className="font-poppins text-base font-semibold text-primary">
              {monthNames[month]} {year}
            </h3>
          </div>

          <div className="flex items-center gap-3">
            {/* View selectors */}
            <div className="flex bg-bgBase p-0.5 rounded-lg border border-borderColor text-xs">
              <button 
                onClick={() => setViewMode('month')}
                className={`px-3 py-1 font-semibold rounded ${viewMode === 'month' ? 'bg-white text-accentGold shadow-sm' : 'text-secondary'}`}
              >
                Month
              </button>
              <button 
                onClick={() => setViewMode('week')}
                className={`px-3 py-1 font-semibold rounded ${viewMode === 'week' ? 'bg-white text-accentGold shadow-sm' : 'text-secondary'}`}
              >
                Week
              </button>
            </div>

            <div className="flex items-center gap-1">
              <button 
                onClick={handlePrevMonth}
                className="p-1 hover:bg-bgBase rounded-lg border border-borderColor text-secondary"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button 
                onClick={handleNextMonth}
                className="p-1 hover:bg-bgBase rounded-lg border border-borderColor text-secondary"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Days of Week Header */}
        <div className="grid grid-cols-7 text-center text-xs font-semibold text-secondary py-1 bg-bgBase rounded-lg">
          <div>Sun</div>
          <div>Mon</div>
          <div>Tue</div>
          <div>Wed</div>
          <div>Thu</div>
          <div>Fri</div>
          <div>Sat</div>
        </div>

        {/* Month Day Grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, idx) => {
            if (!day) return <div key={`empty-${idx}`} className="h-16 bg-transparent"></div>;
            
            const dateEvents = getEventsForDate(day.dateStr);
            const isSelected = selectedDate === day.dateStr;
            const isToday = new Date().toISOString().split('T')[0] === day.dateStr;

            return (
              <div
                key={day.dateStr}
                onClick={() => setSelectedDate(day.dateStr)}
                className={`h-16 p-1 rounded-lg border cursor-pointer flex flex-col justify-between transition-all duration-150 ${
                  isSelected 
                    ? 'border-accentGold bg-accentGold/5' 
                    : isToday 
                    ? 'border-primary bg-bgBase' 
                    : 'border-borderColor/40 hover:bg-bgBase'
                }`}
              >
                <span className={`text-xs font-semibold self-end ${isToday ? 'text-accentGold' : 'text-primary'}`}>
                  {day.dayNum}
                </span>

                {/* Event indications */}
                <div className="flex flex-wrap gap-0.5 mt-1 overflow-hidden max-h-8">
                  {dateEvents.slice(0, 3).map((e, index) => {
                    const role = e.assigned_to_role || e.assigned_role;
                    return (
                      <span 
                        key={index} 
                        className={`w-1.5 h-1.5 rounded-full ${
                          role === 'designer' 
                            ? 'bg-blue-500' 
                            : role === 'engineer' || role === 'site_engineer'
                            ? 'bg-orange-500' 
                            : 'bg-accentGold'
                        }`}
                        title={e.client_name}
                      ></span>
                    );
                  })}
                  {dateEvents.length > 3 && (
                    <span className="text-[8px] font-bold text-secondary">
                      +{dateEvents.length - 3}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Day Agenda Side panel */}
      <div className="bg-white border border-borderColor rounded-xl p-5 shadow-sm flex flex-col">
        <h3 className="font-poppins text-sm font-semibold text-primary border-b border-borderColor pb-3 mb-4 flex items-center justify-between">
          <span>Schedule details</span>
          <span className="text-xs text-accentGold font-inter font-medium">{new Date(selectedDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
        </h3>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {selectedDayEvents.length > 0 ? (
            selectedDayEvents.map((e) => {
              const role = e.assigned_to_role || e.assigned_role;
              return (
                <div 
                  key={e.id}
                  className="p-4 rounded-xl border border-borderColor bg-bgBase space-y-3 hover:border-accentGold transition-all duration-200"
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      role === 'designer' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-orange-100 text-orange-800'
                    }`}>
                      {role === 'designer' ? 'Site Visit: Designer' : 'Site Check: Engineer'}
                    </span>
                    <span className="text-xs text-secondary font-semibold font-mono">
                      {e.booking_id_str || `#${e.id}`}
                    </span>
                  </div>

                <h4 className="font-inter text-sm font-semibold text-primary">
                  {e.client_name}
                </h4>

                <div className="space-y-1.5 text-xs text-secondary">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-accentGold" />
                    <span>{e.preferred_slot}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-accentGold" />
                    <span className="truncate">{e.address}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-accentGold" />
                    <span>Budget: Rs. {e.budget ? e.budget.toLocaleString() : 'N/A'}</span>
                  </div>
                </div>

                {e.assignment_reason && (
                  <p className="text-[10px] text-secondary/70 bg-white p-2 border border-borderColor/40 rounded-lg">
                    {e.assignment_reason}
                  </p>
                )}
              </div>
            );
          })
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center text-secondary py-8">
              <Clock className="w-10 h-10 text-secondary/30 mb-2" />
              <p className="text-xs font-semibold text-primary">No site visits scheduled</p>
              <p className="text-[11px] max-w-[180px] mt-0.5">Click any day with event dots to view site engineer mappings.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
