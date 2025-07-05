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
  const empId = event.queryStringParameters?.emp_id;
  if (!empId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Employee ID is required" }),
    };
  }

  try {
    // Get employee basic info
    const empRes = await pool.query("SELECT * FROM employees WHERE emp_id = $1", [empId]);
    if (empRes.rowCount === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Employee not found" }),
      };
    }

    const employee = empRes.rows[0];

    // Calculate total hours and pay from attendance
    const attRes = await pool.query(
      "SELECT date, clock_in, clock_out FROM attendance WHERE emp_id = $1",
      [empId]
    );

    let totalHours = 0;
    let totalPay = 0;
    const baseSalary = parseFloat(employee.base_salary) || 0;
    const dailyRate = baseSalary / 30; // assuming 30 working days per month

    for (const row of attRes.rows) {
      const hours = calculateHours(row.clock_in, row.clock_out);
      totalHours += hours;
      
      // Calculate pay based on hours worked
      if (hours >= 7) {
        totalPay += dailyRate; // full day
      } else if (hours >= 4) {
        totalPay += dailyRate / 2; // half day
      }
      // No pay for less than 4 hours
    }

    // Prepare documents array
    const documents = [];
    if (employee.profile_photo_url) {
      documents.push({
        name: "Profile Photo",
        url: employee.profile_photo_url
      });
    }

    // Add calculated fields to employee data
    const enrichedEmployee = {
      ...employee,
      total_hours: Math.round(totalHours * 100) / 100, // round to 2 decimal places
      total_pay: Math.round(totalPay * 100) / 100,
      documents: documents
    };

    return {
      statusCode: 200,
      body: JSON.stringify(enrichedEmployee),
    };
  } catch (err) {
    console.error("Error:", err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Server error", error: err.message }),
    };
  }
};

