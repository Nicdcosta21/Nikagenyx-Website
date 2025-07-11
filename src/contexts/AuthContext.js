// src/contexts/AuthContext.js
import React, { createContext, useState, useEffect } from "react";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const storedSession = localStorage.getItem("emp_session");
    if (storedSession) {
      try {
        setCurrentUser(JSON.parse(storedSession));
      } catch (e) {
        console.error("Failed to parse session:", e);
      }
    }
  }, []);

  const logout = () => {
    localStorage.removeItem("emp_session");
    setCurrentUser(null);
    window.location.href = "/account/login"; // Redirect on logout
  };

  return (
    <AuthContext.Provider value={{ currentUser, setCurrentUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
