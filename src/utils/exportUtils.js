import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { saveAs } from 'file-saver';

// Export data to CSV
export const exportToCsv = (data) => {
  // Generate CSV content
  const headerRow = data.headers.join(',');
  const contentRows = data.data.map(row => row.join(',')).join('\n');
  const csvContent = `${headerRow}\n${contentRows}`;
  
  // Create blob and trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
  const fileName = `${data.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
  saveAs(blob, fileName);
};

// Export data to Excel (actually CSV that Excel can open)
export const exportToExcel = (data) => {
  // For simplicity, we're using CSV that Excel can open
  // In a real app, you might want to use a library like xlsx
  exportToCsv(data);
};

// Export data to PDF
export const exportToPdf = (data) => {
  // Create PDF document
  const doc = new jsPDF();
  
  // Add title and date range
  doc.setFontSize(16);
  doc.text(data.title, 14, 15);
  doc.setFontSize(10);
  doc.text(`Date Range: ${data.dateRange}`, 14, 22);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 27);
  
  // Add table
  doc.autoTable({
    head: [data.headers],
    body: data.data,
    startY: 35,
    theme: 'grid',
    headStyles: {
      fillColor: [63, 81, 181],
      textColor: 255,
      fontStyle: 'bold'
    },
    alternateRowStyles: {
      fillColor: [240, 240, 240]
    },
    margin: { top: 35 }
  });
  
  // If there's summary data, add it
  if (data.summary) {
    const summaryY = doc.autoTable.previous.finalY + 5;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    
    if (data.summary.totalDebit && data.summary.totalCredit) {
      doc.text(`Total Debit: ${data.summary.totalDebit}`, 14, summaryY);
      doc.text(`Total Credit: ${data.summary.totalCredit}`, 14, summaryY + 5);
    }
  }
  
  // Save the PDF
  const fileName = `${data.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};
