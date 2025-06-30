const { Pool } = require("pg");
const pool = new Pool({
  connectionString: process.env.NETLIFY_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

function calculateHours(clockIn, clockOut) {
  if (!clockIn || !clockOut) return 0;
  const [h1, m1, s1] = clockIn.split(":").map(Number);
  const [h2, m2, s2] = clockOut.split(":").map(Number);
  const start = h1 * 3600 + m1 * 60 + s1;
  const end = h2 * 3600 + m2 * 60 + s2;
  const diff = (end - start) / 3600;
  return diff > 0 ? diff : 0;
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ message: "Method Not Allowed" }) };
  }

  try {
    const { emp_id } = JSON.parse(event.body);
    if (!emp_id) return { statusCode: 400, body: JSON.stringify({ message: "emp_id is required" }) };

    const empRes = await pool.query("SELECT name, role, base_salary FROM employees WHERE emp_id = $1", [emp_id]);
    if (empRes.rowCount === 0) return { statusCode: 404, body: JSON.stringify({ message: "Employee not found" }) };
    const employee = empRes.rows[0];

    const attRes = await pool.query(
      "SELECT date, clock_in, clock_out FROM attendance WHERE emp_id = $1 ORDER BY date DESC LIMIT 30",
      [emp_id]
    );

    let present = 0, half = 0, absent = 0;
    for (const row of attRes.rows) {
      const hrs = calculateHours(row.clock_in, row.clock_out);
      if (hrs >= 7) present++;
      else if (hrs >= 5) half++;
      else absent++;
    }

    const perDay = employee.base_salary / 30;
    const totalPay = present * perDay + half * (perDay / 2);

    return {
      statusCode: 200,
      body: JSON.stringify({
        emp_id,
        name: employee.name,
        role: employee.role,
        base_salary: employee.base_salary,
        days_present: present,
        half_days: half,
        absent_days: absent,
        final_salary: Math.round(totalPay),
      })
    };

  } catch (err) {
    console.error("Payroll error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal server error", error: err.message })
    };
  }
};
