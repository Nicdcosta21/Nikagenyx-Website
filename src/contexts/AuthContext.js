// src/contexts/AuthContext.js
import React, { createContext, useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';

// Create Context
const AuthContext = createContext();

// Hook to use auth context
export const useAuth = () => useContext(AuthContext);

// Provider Component
export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();
  const [empSession, setEmpSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load session on mount
  useEffect(() => {
    const session = localStorage.getItem('emp_session');
    if (session) {
      try {
        const parsed = JSON.parse(session);
        if (parsed && parsed.emp_id) {
          setEmpSession(parsed);
        } else {
          localStorage.removeItem('emp_session');
        }
      } catch (err) {
        localStorage.removeItem('emp_session');
      }
    }
    setLoading(false);
  }, []);

  // Logout function
  const logout = () => {
    localStorage.removeItem('emp_session');
    setEmpSession(null);
    navigate('/login');
  };

  // Login function (optional use)
  const login = (sessionData) => {
    localStorage.setItem('emp_session', JSON.stringify(sessionData));
    setEmpSession(sessionData);
    navigate('/');
  };

  const value = {
    empSession,
    isLoggedIn: !!empSession,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
