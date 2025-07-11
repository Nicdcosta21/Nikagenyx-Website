import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import InvoiceList from './InvoiceList';
import InvoiceForm from './InvoiceForm';
import InvoiceDetails from './InvoiceDetails';
import InvoiceSettings from './InvoiceSettings';

const InvoicingModule = () => {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Invoicing</h1>
        <p className="mt-2 text-sm text-gray-500">
          Manage your sales and purchase invoices with GST calculations.
        </p>
      </div>
      
      <Routes>
        <Route path="/" element={<InvoiceList />} />
        <Route path="/new/:type" element={<InvoiceForm />} />
        <Route path="/edit/:id" element={<InvoiceForm />} />
        <Route path="/:id" element={<InvoiceDetails />} />
        <Route path="/settings" element={<InvoiceSettings />} />
        <Route path="*" element={<Navigate to="/accounts/invoicing" replace />} />
      </Routes>
    </div>
  );
};

export default InvoicingModule;
