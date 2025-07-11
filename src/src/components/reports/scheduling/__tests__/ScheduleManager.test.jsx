import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import ScheduleManager from '../ScheduleManager';
import { getSchedules, createSchedule, updateSchedule, deleteSchedule } from '../../../../services/scheduleService';

// Mock the services
jest.mock('../../../../services/scheduleService');

describe('ScheduleManager', () => {
  const mockSchedules = [
    {
      id: '1',
      name: 'Daily Sales Report',
      frequency: 'daily',
      time: '09:00',
      status: 'active'
    },
    {
      id: '2',
      name: 'Weekly Inventory',
      frequency: 'weekly',
      time: '08:00',
      status: 'active'
    }
  ];

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Setup default mock implementations
    getSchedules.mockResolvedValue(mockSchedules);
    createSchedule.mockImplementation((data) => Promise.resolve({ id: '3', ...data }));
    updateSchedule.mockImplementation((id, data) => Promise.resolve({ id, ...data }));
    deleteSchedule.mockResolvedValue();
  });

  it('renders loading state initially', () => {
    render(<ScheduleManager />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders schedule list after loading', async () => {
    render(<ScheduleManager />);
    
    await waitFor(() => {
      expect(screen.getByText('Daily Sales Report')).toBeInTheDocument();
      expect(screen.getByText('Weekly Inventory')).toBeInTheDocument();
    });
  });

  it('opens create form when clicking create button', async () => {
    render(<ScheduleManager />);
    
    await waitFor(() => {
      const createButton = screen.getByText('Create Schedule');
      fireEvent.click(createButton);
    });

    expect(screen.getByText('Create Schedule')).toBeInTheDocument();
    expect(screen.getByLabelText('Schedule Name')).toBeInTheDocument();
  });

  it('creates new schedule successfully', async () => {
    render(<ScheduleManager />);
    
    await waitFor(() => {
      const createButton = screen.getByText('Create Schedule');
      fireEvent.click(createButton);
    });

    // Fill out the form
    fireEvent.change(screen.getByLabelText('Schedule Name'), {
      target: { value: 'New Schedule' }
    });

    // Submit the form
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(createSchedule).toHaveBeenCalled();
      expect(screen.queryByText('Create Schedule')).not.toBeInTheDocument();
    });
  });

  it('updates existing schedule successfully', async () => {
    render(<ScheduleManager />);
    
    await waitFor(() => {
      const editButton = screen.getAllByText('Edit')[0];
      fireEvent.click(editButton);
    });

    // Update the name
    fireEvent.change(screen.getByLabelText('Schedule Name'), {
      target: { value: 'Updated Schedule' }
    });

    // Submit the form
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(updateSchedule).toHaveBeenCalled();
      expect(screen.queryByText('Edit Schedule')).not.toBeInTheDocument();
    });
  });

  it('deletes schedule after confirmation', async () => {
    window.confirm = jest.fn(() => true);

    render(<ScheduleManager />);
    
    await waitFor(() => {
      const deleteButton = screen.getAllByText('Delete')[0];
      fireEvent.click(deleteButton);
    });

    expect(window.confirm).toHaveBeenCalled();
    expect(deleteSchedule).toHaveBeenCalledWith('1');
  });

  it('shows error message when loading fails', async () => {
    const error = new Error('Failed to load schedules');
    getSchedules.mockRejectedValueOnce(error);

    render(<ScheduleManager />);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to load schedules')).toBeInTheDocument();
    });
  });

  it('switches between different views', async () => {
    render(<ScheduleManager />);
    
    await waitFor(() => {
      const monitorButton = screen.getByText('Schedule Monitor');
      fireEvent.click(monitorButton);
    });

    expect(screen.getByText('Schedule Runs')).toBeInTheDocument();

    const batchButton = screen.getByText('Batch Scheduler');
    fireEvent.click(batchButton);

    expect(screen.getByText('Batch Schedule Creation')).toBeInTheDocument();
  });
});
