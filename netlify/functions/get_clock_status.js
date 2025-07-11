const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.NETLIFY_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

exports.handler = async (event) => {
  const empId = event.queryStringParameters?.emp_id;
  
  if (!empId) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Missing employee ID" })
    };
  }

  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    const res = await pool.query(
      "SELECT clock_in, clock_out FROM attendance WHERE emp_id = $1 AND date = $2",
      [empId, today]
    );

    if (res.rows.length === 0) {
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          last_action: "out",
          message: "Ready to clock in"
        })
      };
    }

    const row = res.rows[0];
    
    if (row.clock_in && !row.clock_out) {
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          last_action: "in",
          message: "You are currently clocked in"
        })
      };
    } else if (row.clock_in && row.clock_out) {
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          last_action: "out",
          message: "You have completed your shift today"
        })
      };
    } else {
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          last_action: "out",
          message: "Ready to clock in"
        })
      };
    }
  } catch (error) {
    console.error("Clock status error:", error);
    
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        error: "Server error", 
        message: error.message,
        last_action: "out" // Default fallback
      })
    };
  }
};
