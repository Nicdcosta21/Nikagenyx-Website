import React, { useState, useEffect } from 'react';
import { fetchTaxCalendar } from '../../../../services/taxService';

const TaxCalendarWidget = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [calendar, setCalendar] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  
  // Month names
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  useEffect(() => {
    const loadCalendar = async () => {
      try {
        setLoading(true);
        const data = await fetchTaxCalendar(currentMonth + 1, currentYear);
        setCalendar(data);
        setError(null);
      } catch (err) {
        setError('Failed to load tax calendar.');
        console.error('Error loading tax calendar:', err);
        setCalendar([]);
      } finally {
        setLoading(false);
      }
    };

    loadCalendar();
  }, [currentMonth, currentYear]);

  const previousMonth = () => {
    setCurrentMonth(prev => {
      if (prev === 0) {
        setCurrentYear(currentYear - 1);
        return 11;
      } else {
        return prev - 1;
      }
    });
  };

  const nextMonth = () => {
    setCurrentMonth(prev => {
      if (prev === 11) {
        setCurrentYear(currentYear + 1);
        return 0;
      } else {
        return prev + 1;
      }
    });
  };

  // Generate days for current month
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  
  // Add empty slots for days before first day of month
  const emptyDays = Array.from({ length: firstDay }, (_, i) => i);
  
  // Check if a date has tax events
  const hasEvent = (day) => {
    const date = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return calendar.some(event => event.date === date);
  };
  
  // Get events for a specific day
  const getEvents = (day) => {
    const date = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return calendar.filter(event => event.date === date);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-md font-medium text-gray-900">
          {monthNames[currentMonth]} {currentYear}
        </h3>
        <div className="flex space-x-2">
          <button
            type="button"
            onClick={previousMonth}
            className="inline-flex items-center p-1 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
          >
            <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </button>
          <button
            type="button"
            onClick={nextMonth}
            className="inline-flex items-center p-1 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
          >
            <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-56">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
        </div>
      ) : error ? (
        <div className="text-red-600 text-sm">{error}</div>
      ) : (
        <div>
          <div className="grid grid-cols-7 gap-1 text-xs text-gray-500 text-center">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>
          <div className="grid grid-cols-7 gap-1 mt-1">
            {emptyDays.map((day, index) => (
              <div key={`empty-${index}`} className="h-10 border border-gray-100 bg-gray-50"></div>
            ))}
            
            {days.map((day) => {
              const today = new Date();
              const isToday = 
                today.getDate() === day && 
                today.getMonth() === currentMonth && 
                today.getFullYear() === currentYear;
              
              const events = getEvents(day);
              
              return (
                <div 
                  key={`day-${day}`} 
                  className={`h-10 border text-sm flex flex-col items-center justify-center relative
                    ${isToday ? 'bg-indigo-50 border-indigo-300' : 'border-gray-100'}
                    ${hasEvent(day) ? 'font-semibold' : ''}
                  `}
                >
                  {day}
                  
                  {events.length > 0 && (
                    <div className="absolute bottom-0 inset-x-0 flex justify-center">
                      <div 
                        className={`h-1 w-1 rounded-full ${
                          events.some(e => e.type === 'GST') ? 'bg-red-400' : 'bg-blue-400'
                        }`}
                      ></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          {/* List upcoming events */}
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Upcoming Tax Dates</h4>
            <ul className="space-y-1 text-sm">
              {calendar.length === 0 ? (
                <li className="text-gray-500">No tax events this month</li>
              ) : (
                calendar.map((event, index) => {
                  const eventDate = new Date(event.date);
                  const day = eventDate.getDate();
                  
                  return (
                    <li key={index} className="flex items-start">
                      <div 
                        className={`h-2 w-2 mt-1.5 mr-2 rounded-full flex-shrink-0 ${
                          event.type === 'GST' ? 'bg-red-400' : 'bg-blue-400'
                        }`}
                      ></div>
                      <div>
                        <span className="font-medium">{day} {monthNames[currentMonth]}</span>: {event.description}
                      </div>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaxCalendarWidget;
