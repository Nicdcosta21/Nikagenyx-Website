const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.NETLIFY_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

exports.handler = async (event) => {
  const empId = event.queryStringParameters?.emp_id;
  const timestamp = event.queryStringParameters?._t || Date.now(); // Cache-busting
  
  if (!empId) {
    return {
      statusCode: 400,
      headers: { 
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
      },
      body: JSON.stringify({ error: "Missing employee ID" })
    };
  }

  let client;
  try {
    console.log(`Checking clock status for emp_id ${empId} at ${new Date().toISOString()}`);
    
    // Get the current date in server's timezone
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    // Get client's current time if provided
    const clientDate = event.queryStringParameters?.client_date;
    const dateToUse = clientDate || today;
    
    client = await pool.connect();
    
    // First check if employee exists
    const empCheck = await client.query(
      "SELECT * FROM employees WHERE emp_id = $1",
      [empId]
    );
    
    if (empCheck.rows.length === 0) {
      return {
        statusCode: 404,
        headers: { 
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
          "Expires": "0"
        },
        body: JSON.stringify({
          last_action: "out",
          message: "Employee not found",
          timestamp: timestamp
        })
      };
    }
    
    // Get the latest attendance log entry for today
    const latestEntry = await client.query(
      `SELECT * FROM attendance_log 
       WHERE emp_id = $1 AND date = $2 
       ORDER BY timestamp DESC, id DESC 
       LIMIT 1`,
      [empId, dateToUse]
    );
    
    // Get summary for today
    const summary = await client.query(
      `SELECT 
         first_clock_in, 
         last_clock_out, 
         work_duration_seconds, 
         clock_cycles
       FROM attendance 
       WHERE emp_id = $1 AND date = $2`,
      [empId, dateToUse]
    );
    
    // No entries for today
    if (latestEntry.rows.length === 0) {
      return {
        statusCode: 200,
        headers: { 
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
          "Expires": "0"
        },
        body: JSON.stringify({
          last_action: "out",
          message: "Ready to clock in",
          timestamp: timestamp,
          employee_name: empCheck.rows[0].name,
          summary: summary.rows[0] || null
        })
      };
    }
    
    // Get last action
    const lastEntry = latestEntry.rows[0];
    const lastAction = lastEntry.action_type;
    
    // Prepare response
    return {
      statusCode: 200,
      headers: { 
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
      },
      body: JSON.stringify({
        last_action: lastAction,
        message: lastAction === "in" ? 
          "You are currently clocked in" : 
          "Ready to clock in again",
        timestamp: timestamp,
        last_timestamp: lastEntry.timestamp,
        employee_name: empCheck.rows[0].name,
        today_summary: {
          first_clock_in: summary.rows[0]?.first_clock_in || null,
          last_clock_out: summary.rows[0]?.last_clock_out || null,
          total_duration: summary.rows[0]?.work_duration_seconds || 0,
          formatted_duration: formatDuration(summary.rows[0]?.work_duration_seconds || 0),
          cycles: summary.rows[0]?.clock_cycles || 0
        }
      })
    };
  } catch (error) {
    console.error("Clock status error:", error);
    
    return {
      statusCode: 500,
      headers: { 
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
      },
      body: JSON.stringify({ 
        error: "Server error", 
        message: error.message,
        last_action: "out", // Default fallback
        timestamp: timestamp
      })
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

// Helper function to format duration in HH:MM:SS
function formatDuration(seconds) {
  if (!seconds) return "00:00:00";
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  
  return [
    hours.toString().padStart(2, '0'),
    minutes.toString().padStart(2, '0'),
    remainingSeconds.toString().padStart(2, '0')
  ].join(':');
}
