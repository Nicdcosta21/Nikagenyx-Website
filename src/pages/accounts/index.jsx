import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AccountsLayout from '../../components/layout/AccountsLayout';
import Dashboard from './Dashboard';
import ChartOfAccounts from './chart-of-accounts';
import Journal from './journal';
import Ledger from './ledger';
import Invoicing from './invoicing';
import TaxFiling from './tax';
import Reports from './reports';
import AuditLogs from './audit';
import { AuthProvider } from '../../context/AuthContext';
import { AccountingProvider } from '../../context/AccountingContext';

const AccountsModule = () => {
  return (
    <AuthProvider>
      <AccountingProvider>
        <AccountsLayout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/chart-of-accounts/*" element={<ChartOfAccounts />} />
            <Route path="/journal/*" element={<Journal />} />
            <Route path="/ledger/*" element={<Ledger />} />
            <Route path="/invoicing/*" element={<Invoicing />} />
            <Route path="/tax/*" element={<TaxFiling />} />
            <Route path="/reports/*" element={<Reports />} />
            <Route path="/audit/*" element={<AuditLogs />} />
            <Route path="*" element={<Navigate to="/accounts" replace />} />
          </Routes>
        </AccountsLayout>
      </AccountingProvider>
    </AuthProvider>
  );
};

export default AccountsModule;
