import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Layout from './components/Layout';
import Login from './components/auth/Login';
import Dashboard from './components/app/Dashboard';
import NotFound from './components/NotFound';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Redirect root to /account/app */}
          <Route 
            path="/" 
            element={<Navigate to="/account/app" replace />} 
          />

          {/* Public routes */}
          <Route path="/login" element={<Login />} />

          {/* Protected app routes */}
          <Route path="/account/app" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="reports" element={<Reports />} />
            <Route path="schedules" element={<Schedules />} />
            <Route path="templates" element={<Templates />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* 404 route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
