const { Client } = require('pg');

exports.handler = async (event, context) => {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    // Fetch all employees
    const empRes = await client.query('SELECT emp_id, name, role, department FROM employees');
    const employees = empRes.rows;

    // We'll assume June 2025 for now (1st–30th)
    const month = '2025-06';

    // Fetch attendance logs for June
    const attRes = await client.query(`
      SELECT emp_id, date, clock_in, clock_out
      FROM attendance
      WHERE to_char(date, 'YYYY-MM') = $1
    `, [month]);

    // Create a map: { emp_id => [30-day status array] }
    const logsByEmp = {};

    employees.forEach(emp => {
      logsByEmp[emp.emp_id] = Array(30).fill("NA");
    });

    attRes.rows.forEach(log => {
      const empLogs = logsByEmp[log.emp_id];
      if (empLogs) {
        const day = new Date(log.date).getDate() - 1;
        const hoursWorked = calcHours(log.clock_in, log.clock_out);

        empLogs[day] =
          hoursWorked >= 7 ? "P"
          : hoursWorked >= 5 ? "L"
          : "A";
      }
    });

    const result = employees.map(emp => ({
      name: emp.name,
      rank: emp.role,
      from: "", // Optional: can add join date from employee table if stored
      status: logsByEmp[emp.emp_id]
    }));

    await client.end();
    return {
      statusCode: 200,
      body: JSON.stringify({ data: result })
    };

  } catch (err) {
    console.error("Error fetching attendance:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal Server Error" })
    };
  }
};

// Helper to compute duration in hours from HH:MM:SS format
function calcHours(inTime, outTime) {
  try {
    const [h1, m1] = inTime.split(":").map(Number);
    const [h2, m2] = outTime.split(":").map(Number);
    const t1 = h1 * 60 + m1;
    const t2 = h2 * 60 + m2;
    return ((t2 - t1) / 60).toFixed(1);
  } catch {
    return 0;
  }
}
