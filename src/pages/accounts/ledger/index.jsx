import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import GeneralLedger from './GeneralLedger';
import AccountLedger from './AccountLedger';
import TrialBalance from './TrialBalance';

const LedgerModule = () => {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Ledger</h1>
        <p className="mt-2 text-sm text-gray-500">
          View transaction history and account balances in the general ledger.
        </p>
      </div>
      
      <Routes>
        <Route path="/" element={<GeneralLedger />} />
        <Route path="/account/:accountId" element={<AccountLedger />} />
        <Route path="/trial-balance" element={<TrialBalance />} />
        <Route path="*" element={<Navigate to="/accounts/ledger" replace />} />
      </Routes>
    </div>
  );
};

export default LedgerModule;
