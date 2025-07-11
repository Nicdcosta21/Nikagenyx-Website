import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ScheduleManager from './components/reports/scheduling/ScheduleManager';
import ExportTemplateManager from './components/reports/templates/ExportTemplateManager';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <Routes>
          <Route path="/reports/schedules" element={<ScheduleManager />} />
          <Route path="/reports/templates" element={<ExportTemplateManager />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
