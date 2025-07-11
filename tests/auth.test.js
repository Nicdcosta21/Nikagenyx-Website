tests/auth.test.jsimport { validateLogin } from '../assets/js/auth';

describe('Authentication Tests', () => {
  beforeEach(() => {
    // Reset mocks before each test
    fetch.mockClear();
    localStorage.clear();
  });
  
  test('login validation rejects empty employee ID', () => {
    expect(() => validateLogin('', '1234')).toThrow('Employee ID is required');
  });
  
  test('login validation rejects invalid PIN format', () => {
    expect(() => validateLogin('NGX001', '123')).toThrow('PIN must be 4 digits');
    expect(() => validateLogin('NGX001', 'abcd')).toThrow('PIN must be 4 digits');
  });
  
  test('successful login sets session data', async () => {
    // Mock successful login response
    fetch.mockImplementationOnce(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          ok: true,
          user: {
            emp_id: 'NGX001',
            name: 'John Doe',
            role: 'admin'
          }
        })
      })
    );
    
    await expect(validateLogin('NGX001', '1234')).resolves.toEqual({
      success: true,
      emp_id: 'NGX001',
      name: 'John Doe',
      role: 'admin'
    });
    
    // Check if localStorage was set correctly
    const storedSession = JSON.parse(localStorage.getItem('emp_session'));
    expect(storedSession).toEqual({
      emp_id: 'NGX001',
      name: 'John Doe',
      role: 'admin'
    });
  });
  
  test('failed login returns error message', async () => {
    // Mock failed login response
    fetch.mockImplementationOnce(() => 
      Promise.resolve({
        ok: false,
        status: 401,
        json: () => Promise.resolve({
          message: 'Invalid ID or PIN'
        })
      })
    );
    
    await expect(validateLogin('NGX001', '5678')).resolves.toEqual({
      success: false,
      message: 'Invalid ID or PIN'
    });
    
    // Check that no session was stored
    expect(localStorage.getItem('emp_session')).toBeNull();
  });
});
