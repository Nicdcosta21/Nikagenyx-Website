import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { getSchedules, createSchedule, updateSchedule, deleteSchedule } from '../../../services/scheduleService';
import ScheduleForm from './ScheduleForm';
import ScheduleList from './ScheduleList';
import ScheduleMonitor from './ScheduleMonitor';
import BatchScheduler from './BatchScheduler';

const ScheduleManager = () => {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [view, setView] = useState('list'); // list, monitor, batch

  useEffect(() => {
    loadSchedules();
  }, []);

  const loadSchedules = async () => {
    try {
      setLoading(true);
      const data = await getSchedules();
      setSchedules(data);
    } catch (err) {
      console.error('Error loading schedules:', err);
      setError('Failed to load schedules');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSchedule = async (scheduleData) => {
    try {
      const newSchedule = await createSchedule(scheduleData);
      setSchedules(prev => [...prev, newSchedule]);
      setShowForm(false);
    } catch (err) {
      console.error('Error creating schedule:', err);
      setError('Failed to create schedule');
    }
  };

  const handleUpdateSchedule = async (id, scheduleData) => {
    try {
      const updatedSchedule = await updateSchedule(id, scheduleData);
      setSchedules(prev => prev.map(s => s.id === id ? updatedSchedule : s));
      setSelectedSchedule(null);
      setShowForm(false);
    } catch (err) {
      console.error('Error updating schedule:', err);
      setError('Failed to update schedule');
    }
  };

  const handleDeleteSchedule = async (id) => {
    if (window.confirm('Are you sure you want to delete this schedule?')) {
      try {
        await deleteSchedule(id);
        setSchedules(prev => prev.filter(s => s.id !== id));
      } catch (err) {
        console.error('Error deleting schedule:', err);
        setError('Failed to delete schedule');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
        <div className="md:flex md:items-center md:justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
              Report Schedules
            </h2>
          </div>
          <div className="mt-4 flex-shrink-0 flex md:mt-0 md:ml-4">
            <select
              value={view}
              onChange={(e) => setView(e.target.value)}
              className="mr-4 inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <option value="list">Schedule List</option>
              <option value="monitor">Schedule Monitor</option>
              <option value="batch">Batch Scheduler</option>
            </select>

            <button
              type="button"
              onClick={() => {
                setSelectedSchedule(null);
                setShowForm(true);
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Create Schedule
            </button>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <svg className="animate-spin h-10 w-10 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        ) : (
          <>
            {showForm && (
              <ScheduleForm
                schedule={selectedSchedule}
                onSubmit={selectedSchedule ? handleUpdateSchedule : handleCreateSchedule}
                onCancel={() => {
                  setSelectedSchedule(null);
                  setShowForm(false);
                }}
              />
            )}

            {!showForm && view === 'list' && (
              <ScheduleList
                schedules={schedules}
                onEdit={(schedule) => {
                  setSelectedSchedule(schedule);
                  setShowForm(true);
                }}
                onDelete={handleDeleteSchedule}
              />
            )}

            {!showForm && view === 'monitor' && (
              <ScheduleMonitor
                schedules={schedules}
                onRefresh={loadSchedules}
              />
            )}

            {!showForm && view === 'batch' && (
              <BatchScheduler
                onSchedulesCreated={(newSchedules) => {
                  setSchedules(prev => [...prev, ...newSchedules]);
                }}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ScheduleManager;
