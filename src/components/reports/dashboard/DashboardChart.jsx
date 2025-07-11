import React from 'react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

const DashboardChart = ({ title, type, data, options }) => {
  const ChartComponent = {
    line: Line,
    bar: Bar,
    doughnut: Doughnut
  }[type];

  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="p-5">
        <h3 className="text-lg leading-6 font-medium text-gray-900">
          {title}
        </h3>
        <div className="mt-5" style={{ height: '300px' }}>
          <ChartComponent
            data={data}
            options={{
              ...options,
              maintainAspectRatio: false,
              responsive: true
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default DashboardChart;
