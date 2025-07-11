const { Pool } = require("pg");
const pool = new Pool({
  connectionString: process.env.NETLIFY_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { 
      statusCode: 405, 
      headers: { 
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate"
      },
      body: JSON.stringify({ message: "Method Not Allowed" }) 
    };
  }

  let client;
  try {
    const requestBody = JSON.parse(event.body);
    const { emp_id, type, client_date } = requestBody;
    
    if (!emp_id || !type) {
      return { 
        statusCode: 400, 
        headers: { 
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate" 
        },
        body: JSON.stringify({ message: "Missing parameters" }) 
      };
    }

    // Get the current time in server's timezone
    const now = new Date();
    // Use client date if provided, otherwise use server date
    const today = client_date || now.toISOString().split("T")[0]; // YYYY-MM-DD
    const timeNow = now.toTimeString().split(" ")[0];        // HH:MM:SS
    
    console.log(`Processing attendance for emp_id: ${emp_id}, type: ${type}, date: ${today}, time: ${timeNow}`);

    client = await pool.connect();
    
    // Verify employee exists
    const empCheck = await client.query(
      "SELECT * FROM employees WHERE emp_id = $1",
      [emp_id]
    );
    
    if (empCheck.rows.length === 0) {
      return {
        statusCode: 404,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate"
        },
        body: JSON.stringify({
          success: false,
          message: "Employee not found."
        })
      };
    }

    // Get the latest attendance entry for today
    const latestEntry = await client.query(
      `SELECT * FROM attendance_log 
       WHERE emp_id = $1 AND date = $2 
       ORDER BY timestamp DESC, id DESC 
       LIMIT 1`,
      [emp_id, today]
    );
    
    // Begin transaction
    await client.query('BEGIN');
    
    try {
      const lastAction = latestEntry.rows.length > 0 ? latestEntry.rows[0].action_type : null;

      // If trying to clock in while already clocked in, or clock out while already clocked out
      if ((type === "in" && lastAction === "in") || (type === "out" && lastAction === "out")) {
        await client.query('COMMIT');
        return {
          statusCode: 200,
          headers: { 
            "Content-Type": "application/json",
            "Cache-Control": "no-cache, no-store, must-revalidate"
          },
          body: JSON.stringify({
            message: `Already clocked ${type}.`,
            timestamp: timeNow,
            type: type,
            employee_name: empCheck.rows[0].name,
            last_action: lastAction
          })
        };
      }

      // If trying to clock out without clocking in first
      if (type === "out" && !lastAction) {
        await client.query('COMMIT');
        return {
          statusCode: 400,
          headers: { 
            "Content-Type": "application/json",
            "Cache-Control": "no-cache, no-store, must-revalidate"
          },
          body: JSON.stringify({
            message: "Cannot clock out without clocking in first.",
            type: "out"
          })
        };
      }

      // Calculate duration if clocking out after a clock in
      let sessionDuration = null;
      if (type === "out" && lastAction === "in" && latestEntry.rows.length > 0) {
        const clockInTime = latestEntry.rows[0].timestamp;
        const clockInParts = clockInTime.split(':').map(Number);
        const clockOutParts = timeNow.split(':').map(Number);
        
        const clockInSeconds = clockInParts[0] * 3600 + clockInParts[1] * 60 + (clockInParts[2] || 0);
        const clockOutSeconds = clockOutParts[0] * 3600 + clockOutParts[1] * 60 + (clockOutParts[2] || 0);
        
        sessionDuration = clockOutSeconds - clockInSeconds;
        if (sessionDuration < 0) sessionDuration += 24 * 3600; // Handle overnight shifts
      }

      // Insert the new attendance log entry
      const result = await client.query(
        `INSERT INTO attendance_log (emp_id, date, timestamp, action_type, session_duration, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         RETURNING id`,
        [emp_id, today, timeNow, type, sessionDuration]
      );

      // Also update the main attendance table to track daily totals
      // This is for backward compatibility with existing reports
      const dailyStats = await client.query(
        `SELECT 
           SUM(CASE WHEN action_type = 'in' THEN 1 ELSE 0 END) as clock_ins,
           SUM(CASE WHEN action_type = 'out' THEN 1 ELSE 0 END) as clock_outs,
           SUM(session_duration) as total_duration
         FROM attendance_log
         WHERE emp_id = $1 AND date = $2`,
        [emp_id, today]
      );
      
      const stats = dailyStats.rows[0] || { clock_ins: 0, clock_outs: 0, total_duration: 0 };

      // Update or insert daily summary
      await client.query(
        `INSERT INTO attendance (emp_id, date, first_clock_in, last_clock_out, work_duration_seconds, 
                               clock_cycles, updated_at)
         VALUES ($1, $2, 
                (SELECT MIN(timestamp) FROM attendance_log WHERE emp_id = $1 AND date = $2 AND action_type = 'in'), 
                $3, 
                $4, 
                $5, 
                NOW())
         ON CONFLICT (emp_id, date) 
         DO UPDATE SET 
           last_clock_out = $3,
           work_duration_seconds = $4,
           clock_cycles = $5,
           updated_at = NOW()`,
        [
          emp_id, 
          today, 
          type === 'out' ? timeNow : null, 
          stats.total_duration, 
          Math.min(stats.clock_ins, stats.clock_outs)
        ]
      );
      
      // Commit transaction
      await client.query('COMMIT');
      
      return {
        statusCode: 200,
        headers: { 
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate"
        },
        body: JSON.stringify({
          success: true,
          message: `Clocked ${type} successfully.`,
          timestamp: timeNow,
          type: type,
          last_action: type,
          employee_name: empCheck.rows[0].name,
          duration: sessionDuration ? formatDuration(sessionDuration) : null
        })
      };
    } catch (error) {
      // Rollback in case of error
      await client.query('ROLLBACK');
      throw error;
    }

  } catch (err) {
    console.error("❌ Error in mark_attendance:", err);
    
    // Ensure transaction is rolled back in case of error
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackErr) {
        console.error("Error rolling back transaction:", rollbackErr);
      }
    }
    
    return {
      statusCode: 500,
      headers: { 
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate"
      },
      body: JSON.stringify({ message: "Internal error", error: err.message })
    };
  } finally {
    // Release the client back to the pool
    if (client) {
      client.release();
    }
  }
};

// Helper function to format duration in HH:MM:SS
function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  
  return [
    hours.toString().padStart(2, '0'),
    minutes.toString().padStart(2, '0'),
    remainingSeconds.toString().padStart(2, '0')
  ].join(':');
}
