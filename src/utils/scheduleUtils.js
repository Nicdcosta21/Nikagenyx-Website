import { addDays, addMonths, setHours, setMinutes, parse } from 'date-fns';

export const calculateNextRunTime = (schedule) => {
  const now = new Date();
  const [hours, minutes] = schedule.time.split(':').map(Number);
  let nextRun = setMinutes(setHours(now, hours), minutes);

  if (nextRun <= now) {
    nextRun = addDays(nextRun, 1);
  }

  switch (schedule.frequency) {
    case 'daily':
      return nextRun;

    case 'weekly':
      while (!schedule.days.includes(nextRun.getDay())) {
        nextRun = addDays(nextRun, 1);
      }
      return nextRun;

    case 'monthly':
      let monthRun = setHours(
        setMinutes(new Date(now.getFullYear(), now.getMonth(), schedule.monthDay), minutes),
        hours
      );
      
      if (monthRun <= now) {
        monthRun = setHours(
          setMinutes(new Date(now.getFullYear(), now.getMonth() + 1, schedule.monthDay), minutes),
          hours
        );
      }
      return monthRun;

    case 'quarterly':
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const nextQuarter = (currentQuarter + 1) % 4;
      const nextQuarterMonth = nextQuarter * 3;
      
      return setHours(
        setMinutes(new Date(now.getFullYear(), nextQuarterMonth, 1), minutes),
        hours
      );

    default:
      throw new Error(`Invalid schedule frequency: ${schedule.frequency}`);
  }
};

export const formatSchedule = (schedule) => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  switch (schedule.frequency) {
    case 'daily':
      return `Daily at ${schedule.time}`;

    case 'weekly':
      const dayNames = schedule.days.map(d => days[d]).join(', ');
      return `Weekly on ${dayNames} at ${schedule.time}`;

    case 'monthly':
      return `Monthly on day ${schedule.monthDay} at ${schedule.time}`;

    case 'quarterly':
      return `Quarterly on the 1st at ${schedule.time}`;

    default:
      return 'Invalid schedule';
  }
};

export const validateSchedule = (schedule) => {
  const errors = {};

  if (!schedule.frequency) {
    errors.frequency = 'Frequency is required';
  }

  if (!schedule.time) {
    errors.time = 'Time is required';
  }

  if (schedule.frequency === 'weekly' && (!schedule.days || schedule.days.length === 0)) {
    errors.days = 'At least one day must be selected for weekly schedules';
  }

  if (schedule.frequency === 'monthly') {
    if (!schedule.monthDay) {
      errors.monthDay = 'Day of month is required';
    } else if (schedule.monthDay < 1 || schedule.monthDay > 31) {
      errors.monthDay = 'Day of month must be between 1 and 31';
    }
  }

  return errors;
};
