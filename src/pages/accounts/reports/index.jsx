import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ReportsDashboard from './ReportsDashboard';
import BalanceSheet from './financial-statements/BalanceSheet';
import ProfitLossStatement from './financial-statements/ProfitLossStatement';
import CashFlowStatement from './financial-statements/CashFlowStatement';
import CustomReportBuilder from './custom/CustomReportBuilder';
import CustomReportView from './custom/CustomReportView';
import MISReports from './mis/MISReports';
import ScheduledReports from './scheduled/ScheduledReports';
import ScheduleReportForm from './scheduled/ScheduleReportForm';
import SavedReports from './saved/SavedReports';

const ReportsModule = () => {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Financial Reports</h1>
        <p className="mt-2 text-sm text-gray-500">
          View and generate financial statements and custom reports for your business.
        </p>
      </div>
      
      <Routes>
        <Route path="/" element={<ReportsDashboard />} />
        <Route path="/balance-sheet" element={<BalanceSheet />} />
        <Route path="/profit-loss" element={<ProfitLossStatement />} />
        <Route path="/cash-flow" element={<CashFlowStatement />} />
        <Route path="/custom/builder" element={<CustomReportBuilder />} />
        <Route path="/custom/view/:id" element={<CustomReportView />} />
        <Route path="/mis" element={<MISReports />} />
        <Route path="/scheduled" element={<ScheduledReports />} />
        <Route path="/scheduled/new" element={<ScheduleReportForm />} />
        <Route path="/scheduled/:id" element={<ScheduleReportForm />} />
        <Route path="/saved" element={<SavedReports />} />
        <Route path="*" element={<Navigate to="/accounts/reports" replace />} />
      </Routes>
    </div>
  );
};

export default ReportsModule;
