import { saveAs } from 'file-saver';
import { formatDate, formatCurrency } from './formatters';
import { reportTemplates, formatOptions } from '../config/reportTemplates';

export const exportReport = async (data, format, options = {}) => {
  try {
    // Validate format
    const formatConfig = formatOptions.find(f => f.id === format);
    if (!formatConfig) {
      throw new Error('Invalid export format');
    }
    
    // Get content based on format
    let content;
    switch (format) {
      case 'pdf':
        content = await generatePDF(data, options);
        break;
      case 'excel':
        content = await generateExcel(data, options);
        break;
      case 'csv':
        content = await generateCSV(data, options);
        break;
      default:
        throw new Error('Unsupported export format');
    }
    
    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${data.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${timestamp}.${format}`;
    
    // Download file
    const blob = new Blob([content], { type: formatConfig.mimeType });
    saveAs(blob, filename);
    
    return { success: true, filename };
  } catch (error) {
    console.error('Error exporting report:', error);
    throw error;
  }
};

const generatePDF = async (data, options) => {
  const pdfmake = await import('pdfmake/build/pdfmake');
  const pdfFonts = await import('pdfmake/build/vfs_fonts');
  pdfmake.vfs = pdfFonts.pdfMake.vfs;
  
  // Get template configuration
  const template = reportTemplates[data.type];
  if (!template) {
    throw new Error('Invalid report type');
  }
  
  // Build document definition
  const docDefinition = {
    content: [
      // Header
      {
        text: data.title,
        style: 'header'
      },
      {
        text: data.subtitle || '',
        style: 'subheader'
      },
      
      // Content
      ...buildPDFContent(data, template, options),
      
      // Footer
      {
        text: `Generated on ${formatDate(new Date())}`,
        style: 'footer'
      }
    ],
    styles: {
      header: {
        fontSize: 18,
        bold: true,
        margin: [0, 0, 0, 10]
      },
      subheader: {
        fontSize: 14,
        margin: [0, 0, 0, 20]
      },
      sectionHeader: {
        fontSize: 14,
        bold: true,
        margin: [0, 20, 0, 10]
      },
      tableHeader: {
        bold: true,
        fillColor: '#f3f4f6'
      },
      footer: {
        fontSize: 10,
        margin: [0, 20, 0, 0],
        alignment: 'right'
      }
    },
    defaultStyle: {
      fontSize: 10
    },
    pageSize: options.pageSize || 'A4',
    pageOrientation: options.orientation || 'portrait',
    pageMargins: [40, 60, 40, 60]
  };
  
  // Generate PDF
  return new Promise((resolve, reject) => {
    try {
      const pdfDoc = pdfmake.createPdf(docDefinition);
      pdfDoc.getBuffer((buffer) => {
        resolve(buffer);
      });
    } catch (error) {
      reject(error);
    }
  });
};

const generateExcel = async (data, options) => {
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(data.title);
  
  // Get template configuration
  const template = reportTemplates[data.type];
  if (!template) {
    throw new Error('Invalid report type');
  }
  
  // Add header
  worksheet.mergeCells('A1:E1');
  worksheet.getCell('A1').value = data.title;
  worksheet.getCell('A1').font = { size: 14, bold: true };
  worksheet.getCell('A1').alignment = { horizontal: 'center' };
  
  // Add content based on template
  let currentRow = 3;
  template.sections.forEach(section => {
    // Add section header
    worksheet.getCell(`A${currentRow}`).value = section.title;
    worksheet.getCell(`A${currentRow}`).font = { bold: true };
    currentRow++;
    
    // Add data rows
    const sectionData = data[section.accountTypes[0]] || [];
    sectionData.forEach(item => {
      worksheet.getCell(`B${currentRow}`).value = item.name;
      worksheet.getCell(`C${currentRow}`).value = item.balance;
      worksheet.getCell(`C${currentRow}`).numFmt = '#,##0.00';
      currentRow++;
    });
    
    // Add section total
    worksheet.getCell(`B${currentRow}`).value = section.totalLabel;
    worksheet.getCell(`C${currentRow}`).value = {
      formula: `SUM(C${currentRow - sectionData.length}:C${currentRow - 1})`
    };
    worksheet.getCell(`B${currentRow}`).font = { bold: true };
    worksheet.getCell(`C${currentRow}`).font = { bold: true };
    worksheet.getCell(`C${currentRow}`).numFmt = '#,##0.00';
    currentRow += 2;
  });
  
  // Auto-fit columns
  worksheet.columns.forEach(column => {
    column.width = 15;
  });
  
  // Generate buffer
  return await workbook.xlsx.writeBuffer();
};

const generateCSV = async (data, options) => {
  const { parse } = await import('json2csv');
  
  // Get template configuration
  const template = reportTemplates[data.type];
  if (!template) {
    throw new Error('Invalid report type');
  }
  
  // Prepare data for CSV
  const csvData = [];
  template.sections.forEach(section => {
    // Add section header
    csvData.push({
      name: section.title,
      balance: '',
      type: ''
    });
    
    // Add data rows
    const sectionData = data[section.accountTypes[0]] || [];
    sectionData.forEach(item => {
      csvData.push({
        name: item.name,
        balance: item.balance,
        type: section.accountTypes[0]
      });
    });
    
    // Add section total
    const sectionTotal = sectionData.reduce((sum, item) => sum + item.balance, 0);
    csvData.push({
      name: section.totalLabel,
      balance: sectionTotal,
      type: ''
    });
    
    // Add empty row between sections
    csvData.push({
      name: '',
      balance: '',
      type: ''
    });
  });
  
  // Generate CSV
  const fields = ['name', 'balance', 'type'];
  const opts = {
    fields,
    header: true,
    quote: '"',
    delimiter: ',',
    defaultValue: ''
  };
  
  return parse(csvData, opts);
};

const buildPDFContent = (data, template, options) => {
  const content = [];
  
  template.sections.forEach(section => {
    // Add section header
    content.push({
      text: section.title,
      style: 'sectionHeader'
    });
    
    // Add table
    const sectionData = data[section.accountTypes[0]] || [];
    content.push({
      table: {
        headerRows: 1,
        widths: ['*', 'auto'],
        body: [
          // Table header
          [
            { text: 'Account', style: 'tableHeader' },
            { text: 'Balance', style: 'tableHeader' }
          ],
          // Data rows
          ...sectionData.map(item => [
            item.name,
            { text: formatCurrency(item.balance), alignment: 'right' }
          ]),
          // Section total
          [
            { text: section.totalLabel, bold: true },
            {
              text: formatCurrency(
                sectionData.reduce((sum, item) => sum + item.balance, 0)
              ),
              bold: true,
              alignment: 'right'
            }
          ]
        ]
      },
      margin: [0, 0, 0, 20]
    });
  });
  
  return content;
};
