import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import JournalList from './JournalList';
import JournalForm from './JournalForm';
import JournalDetails from './JournalDetails';

const JournalModule = () => {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Journal Entries</h1>
        <p className="mt-2 text-sm text-gray-500">
          Record and manage financial transactions using double-entry accounting.
        </p>
      </div>
      
      <Routes>
        <Route path="/" element={<JournalList />} />
        <Route path="/new" element={<JournalForm />} />
        <Route path="/edit/:id" element={<JournalForm />} />
        <Route path="/:id" element={<JournalDetails />} />
        <Route path="*" element={<Navigate to="/accounts/journal" replace />} />
      </Routes>
    </div>
  );
};

export default JournalModule;
