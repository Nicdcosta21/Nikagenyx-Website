import React from 'react';
import { Link } from 'react-router-dom';

export default function Sidebar() {
  return (
    <div className="w-64 bg-gray-800 text-white min-h-screen p-4">
      <h2 className="text-xl font-bold mb-6">Accounting</h2>
      <nav className="space-y-2">
        <Link to="/" className="block hover:bg-gray-700 p-2 rounded">Dashboard</Link>
        <Link to="/ledger" className="block hover:bg-gray-700 p-2 rounded">Ledger</Link>
        <Link to="/reports" className="block hover:bg-gray-700 p-2 rounded">Reports</Link>
      </nav>
    </div>
  );
}
