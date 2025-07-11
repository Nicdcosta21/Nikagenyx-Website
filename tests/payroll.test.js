import { calculatePayroll } from '../assets/js/payroll';

describe('Payroll Calculation Tests', () => {
  test('calculates correct pay for full attendance', () => {
    const attendance = [
      { date: '2025-07-01', status: 'P' },
      { date: '2025-07-02', status: 'P' },
      { date: '2025-07-03', status: 'P' }
    ];
    
    const result = calculatePayroll(attendance, 1000); // Base salary per day: 1000
    
    expect(result.daysPresent).toBe(3);
    expect(result.daysHalf).toBe(0);
    expect(result.daysAbsent).toBe(0);
    expect(result.totalPay).toBe(3000);
  });
  
  test('calculates correct pay with mixed attendance', () => {
    const attendance = [
      { date: '2025-07-01', status: 'P' }, // Full day
      { date: '2025-07-02', status: 'L' }, // Half day
      { date: '2025-07-03', status: 'A' }  // Absent
    ];
    
    const result = calculatePayroll(attendance, 1000);
    
    expect(result.daysPresent).toBe(1);
    expect(result.daysHalf).toBe(1);
    expect(result.daysAbsent).toBe(1);
    expect(result.totalPay).toBe(1500); // 1000 + 500 + 0
  });
  
  test('handles empty attendance array', () => {
    const result = calculatePayroll([], 1000);
    
    expect(result.daysPresent).toBe(0);
    expect(result.daysHalf).toBe(0);
    expect(result.daysAbsent).toBe(0);
    expect(result.totalPay).toBe(0);
  });
  
  test('applies overtime multiplier correctly', () => {
    const attendance = [
      { date: '2025-07-01', status: 'P', hours: 9 }, // 1 hour overtime
      { date: '2025-07-02', status: 'P', hours: 10 } // 2 hours overtime
    ];
    
    const result = calculatePayroll(attendance, 1000, 1.5); // Overtime rate: 1.5x
    
    // Base pay: 2000 + Overtime: (1*1000/8*1.5) + (2*1000/8*1.5) = 562.5
    expect(result.totalPay).toBe(2562.5);
    expect(result.overtimeHours).toBe(3);
    expect(result.overtimePay).toBe(562.5);
  });
});
