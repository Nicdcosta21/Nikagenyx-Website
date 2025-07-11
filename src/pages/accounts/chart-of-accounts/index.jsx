import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import AccountList from './AccountList';
import AccountForm from './AccountForm';
import AccountDetails from './AccountDetails';
import { useAccounting } from '../../../hooks/useAccounting';

const ChartOfAccounts = () => {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Chart of Accounts</h1>
        <p className="mt-2 text-sm text-gray-500">
          Manage your organization's accounts structure and hierarchy.
        </p>
      </div>
      
      <Routes>
        <Route path="/" element={<AccountList />} />
        <Route path="/new" element={<AccountForm />} />
        <Route path="/edit/:id" element={<AccountForm />} />
        <Route path="/:id" element={<AccountDetails />} />
      </Routes>
    </div>
  );
};

export default ChartOfAccounts;
