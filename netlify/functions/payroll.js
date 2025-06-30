// netlify/functions/payroll.js
const { Pool } = require('pg');
const { format } = require('date-fns');
const ExcelJS = require('exceljs');


const verify = require('./verifySession');
try { verify(event); } catch { return { statusCode: 401 }; }

const pool = new Pool({
  connectionString: process.env.NETLIFY_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: 'Method Not Allowed' })
    };
  }

  try {
    const result = await pool.query(`
      SELECT e.emp_id, e.name, e.role, e.department, a.date, a.clock_in, a.clock_out
      FROM employees e
      LEFT JOIN attendance a ON e.emp_id = a.emp_id
      ORDER BY e.emp_id, a.date
    `);

    const records = result.rows;
    const salaryMap = {
      'Frontend Developer (Jr. Developer)': 50000,
      'Backend Developer (Jr. Developer)': 50000,
      'Full Stack Developer / Mobile App Developer (Sr. Developer)': 75000,
      'QA Engineer (Sr. Developer)': 75000,
      'White labelling (UI/UX Designer)': 30000,
      'DevOps Engineer (Infrastructure Engineer)': 75000,
      'Data Analyst': 50000,
      'Cybersecurity & Risk Analyst': 150000,
      'IT Systems Administrator': 40000,
      'IT Support Specialist': 30000,
      'Human Resources Manager': 40000,
      'Finance & Accounts Officer': 30000,
      'Managing Director (MD)': 110000,
      'Regulatory Compliance Officer': 30000,
      'Client Relations Consultant': 650000,
      'Administrative Coordinator': 31000,
      'Customer Success Executive': 34000
    };

    // Organize data for Excel
    const grouped = {};
    for (const r of records) {
      if (!grouped[r.emp_id]) grouped[r.emp_id] = [];
      grouped[r.emp_id].push(r);
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Payroll');
    sheet.columns = [
      { header: 'Emp ID', key: 'emp_id', width: 15 },
      { header: 'Name', key: 'name', width: 25 },
      { header: 'Role', key: 'role', width: 30 },
      { header: 'Department', key: 'department', width: 25 },
      { header: 'Total Days', key: 'days', width: 15 },
      { header: 'Base Salary', key: 'salary', width: 20 },
      { header: 'Total Payable', key: 'payable', width: 20 }
    ];

    for (const [emp_id, logs] of Object.entries(grouped)) {
      const emp = logs[0];
      const uniqueDates = new Set(logs.filter(l => l.clock_in).map(l => l.date));
      const baseSalary = salaryMap[emp.role] || 0;
      const perDay = baseSalary / 26;
      const payable = Math.round(perDay * uniqueDates.size);

      sheet.addRow({
        emp_id: emp.emp_id,
        name: emp.name,
        role: emp.role,
        department: emp.department,
        days: uniqueDates.size,
        salary: baseSalary,
        payable
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="payroll.xlsx"'
      },
      body: buffer.toString('base64'),
      isBase64Encoded: true
    };
  } catch (err) {
    console.error("❌ Payroll Generation Error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Server error', error: err.message })
    };
  }
};
