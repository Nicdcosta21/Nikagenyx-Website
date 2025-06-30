const { Client } = require('pg');

exports.handler = async (event, context) => {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    const month = event.queryStringParameters?.month || '6';
    const year = event.queryStringParameters?.year || '2025';
    const monthStr = `${year}-${month.toString().padStart(2, '0')}`;
    const daysInMonth = new Date(year, month, 0).getDate();

    const empRes = await client.query('SELECT emp_id, name, role, join_date FROM employees');
    const employees = empRes.rows;

    const attRes = await client.query(`
      SELECT emp_id, date, clock_in, clock_out
      FROM attendance
      WHERE to_char(date, 'YYYY-MM') = $1
    `, [monthStr]);

    // Prepare blank 48-slot arrays per day
    const logsByEmp = {};
    employees.forEach(emp => {
      logsByEmp[emp.emp_id] = Array.from({ length: daysInMonth }, () =>
        Array(48).fill("NA")
      );
    });

    attRes.rows.forEach(({ emp_id, date, clock_in, clock_out }) => {
      const empLogs = logsByEmp[emp_id];
      if (!empLogs || !clock_in || !clock_out) return;

      const day = new Date(date).getDate() - 1;
      const [h1, m1] = clock_in.split(":").map(Number);
      const [h2, m2] = clock_out.split(":").map(Number);
      const start = Math.floor((h1 * 60 + m1) / 30);
      const end = Math.ceil((h2 * 60 + m2) / 30);

      for (let i = start; i < end; i++) {
        empLogs[day][i] = "P"; // or mark "L" based on duration if needed
      }
    });

    const result = employees.map(emp => ({
      name: emp.name,
      role: emp.role,
      from: emp.join_date || "", // optional if null
      status: logsByEmp[emp.emp_id]
    }));

    await client.end();
    return {
      statusCode: 200,
      body: JSON.stringify(result)
    };

  } catch (err) {
    console.error("Error fetching attendance:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal Server Error" })
    };
  }
};
