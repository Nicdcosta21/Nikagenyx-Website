const { Client } = require('pg');

exports.handler = async (event, context) => {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    const params = event.queryStringParameters || {};
    const year = params.year || '2025';
    const month = params.month || '6';
    const paddedMonth = month.toString().padStart(2, '0');
    const targetMonth = `${year}-${paddedMonth}`;
    const daysInMonth = new Date(year, month, 0).getDate();

    // ✅ FIXED: Removed `join_date`
    const empRes = await client.query(`
      SELECT emp_id, name, role, department FROM employees
    `);
    const employees = empRes.rows;

    console.log("✅ Total employees found:", employees.length);

    const attRes = await client.query(`
      SELECT emp_id, date, clock_in, clock_out
      FROM attendance
      WHERE to_char(date, 'YYYY-MM') = $1
    `, [targetMonth]);

    console.log("✅ Attendance entries found:", attRes.rows.length);

    const logsByEmp = {};
    employees.forEach(emp => {
      logsByEmp[emp.emp_id] = Array.from({ length: daysInMonth }, () =>
        Array(48).fill("NA")
      );
    });

    attRes.rows.forEach(({ emp_id, date, clock_in, clock_out }) => {
      if (!logsByEmp[emp_id] || !clock_in || !clock_out) return;

      const dayIndex = new Date(date).getDate() - 1;
      const [h1, m1] = clock_in.split(":").map(Number);
      const [h2, m2] = clock_out.split(":").map(Number);
      const startSlot = Math.floor((h1 * 60 + m1) / 30);
      const endSlot = Math.ceil((h2 * 60 + m2) / 30);

      for (let i = startSlot; i < endSlot && i < 48; i++) {
        logsByEmp[emp_id][dayIndex][i] = "P";
      }
    });

    const result = employees.map(emp => ({
      emp_id: emp.emp_id,
      name: emp.name,
      role: emp.role,
      department: emp.department,
      from: "2025-01-01", // placeholder
      status: logsByEmp[emp.emp_id]
    }));

    await client.end();

    return {
      statusCode: 200,
      body: JSON.stringify({ data: result })
    };

  } catch (err) {
    console.error("❌ DB ERROR:", err.message, err.stack);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
