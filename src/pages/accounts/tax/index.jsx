import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import TaxDashboard from './TaxDashboard';
import GstReturns from './gst/GstReturns';
import Gstr1 from './gst/Gstr1';
import Gstr2 from './gst/Gstr2';
import Gstr3b from './gst/Gstr3b';
import TdsReturns from './tds/TdsReturns';
import TdsForm from './tds/TdsForm';
import TaxSettings from './TaxSettings';

const TaxModule = () => {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Tax Filing</h1>
        <p className="mt-2 text-sm text-gray-500">
          Manage your GST and TDS returns, generate reports and prepare filings.
        </p>
      </div>
      
      <Routes>
        <Route path="/" element={<TaxDashboard />} />
        <Route path="/gst" element={<GstReturns />} />
        <Route path="/gst/gstr1" element={<Gstr1 />} />
        <Route path="/gst/gstr2" element={<Gstr2 />} />
        <Route path="/gst/gstr3b" element={<Gstr3b />} />
        <Route path="/tds" element={<TdsReturns />} />
        <Route path="/tds/form/:id?" element={<TdsForm />} />
        <Route path="/settings" element={<TaxSettings />} />
        <Route path="*" element={<Navigate to="/accounts/tax" replace />} />
      </Routes>
    </div>
  );
};

export default TaxModule;
