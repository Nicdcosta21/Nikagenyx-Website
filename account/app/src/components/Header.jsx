import React from 'react';

export default function Header() {
  return (
    <header className="bg-white shadow p-4 flex justify-between items-center">
      <h1 className="text-xl font-semibold">Nikagenyx Accounting</h1>
      <button
        onClick={() => {
          localStorage.removeItem('emp_session');
          window.location.href = '/employee_portal.html';
        }}
        className="bg-red-600 text-white px-4 py-1 rounded"
      >
        Logout
      </button>
    </header>
  );
}
