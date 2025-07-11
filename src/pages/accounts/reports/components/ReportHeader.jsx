import React from 'react';

const ReportHeader = ({ title, subtitle, company, logoUrl }) => {
  return (
    <div className="text-center mb-8">
      {logoUrl && (
        <div className="mb-4">
          <img 
            src={logoUrl} 
            alt={`${company} logo`} 
            className="h-12 mx-auto" 
          />
        </div>
      )}
      <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
      <p className="text-lg text-gray-700">{company}</p>
      <p className="text-sm text-gray-500">{subtitle}</p>
    </div>
  );
};

export default ReportHeader;
