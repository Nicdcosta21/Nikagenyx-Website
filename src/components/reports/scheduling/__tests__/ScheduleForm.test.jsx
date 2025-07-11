import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ScheduleForm from '../ScheduleForm';
import { getReportTemplates } from '../../../../services/reportService';
import { getScheduleTemplates } from '../../../../services/scheduleService';

jest.mock('../../../../services/reportService');
jest.mock('../../../../services/scheduleService');

describe('ScheduleForm', () => {
  const mockReportTemplates = [
    { id: '1', name: 'Sales Report' },
    { id: '2', name: 'Inventory Report' }
  ];

  const mockScheduleTemplates = [
    { id: '1', name: 'Daily Morning', config: {} },
    { id: '2', name: 'Weekly Summary', config: {} }
  ];

  const defaultProps = {
    onSubmit: jest.fn(),
    onCancel: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    getReportTemplates.mockResolvedValue(mockReportTemplates);
    getScheduleTemplates.mockResolvedValue(mockScheduleTemplates);
  });

  it('renders form with empty values for new schedule', () => {
    render(<ScheduleForm {...defaultProps} />);
    
    expect(screen.getByLabelText('Schedule Name')).toHaveValue('');
    expect(screen.getByLabelText('Report Template')).toBeInTheDocument();
  });

  it('renders form with existing values for edit', () => {
    const schedule = {
      name: 'Existing Schedule',
      reportId: '1',
      schedule: {
        frequency: 'daily',
        time: '09:00'
      },
      format: 'pdf',
      recipients: ['test@example.com']
    };

    render(<ScheduleForm {...defaultProps} schedule={schedule} />);
    
    expect(screen.getByLabelText('Schedule Name')).toHaveValue('Existing Schedule');
  });

  it('validates required fields', async () => {
    render(<ScheduleForm {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(screen.getByText('Name is required')).toBeInTheDocument();
      expect(screen.getByText('Report template is required')).toBeInTheDocument();
    });
  });

  it('loads schedule template when selected', async () => {
    render(<ScheduleForm {...defaultProps} />);
    
    await waitFor(() => {
      const templateSelect = screen.getByLabelText('Schedule Template');
      fireEvent.change(templateSelect, { target: { value: '1' } });
    });

    expect(screen.getByLabelText('Schedule Name')).toHaveValue('Daily Morning');
  });

  it('handles weekly schedule configuration', () => {
    render(<ScheduleForm {...defaultProps} />);
    
    const frequencySelect = screen.getByLabelText('Frequency');
    fireEvent.change(frequencySelect, { target: { value: 'weekly' } });

    expect(screen.getByText('Days of Week')).toBeInTheDocument();
  });

  it('handles monthly schedule configuration', () => {
    render(<ScheduleForm {...defaultProps} />);
    
    const frequencySelect = screen.getByLabelText('Frequency');
    fireEvent.change(frequencySelect, { target: { value: 'monthly' } });

    expect(screen.getByText('Day of Month')).toBeInTheDocument();
  });

  it('submits form with valid data', async () => {
    render(<ScheduleForm {...defaultProps} />);
    
    // Fill out the form
    fireEvent.change(screen.getByLabelText('Schedule Name'), {
      target: { value: 'Test Schedule' }
    });

    fireEvent.change(screen.getByLabelText('Report Template'), {
      target: { value: '1' }
    });

    fireEvent.change(screen.getByLabelText('Time'), {
      target: { value: '09:00' }
    });

    fireEvent.change(screen.getByPlaceholderText('Email address'), {
      target: { value: 'test@example.com' }
    });

    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(defaultProps.onSubmit).toHaveBeenCalled();
    });
  });
});
