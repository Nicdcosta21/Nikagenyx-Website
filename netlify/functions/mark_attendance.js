const { Pool } = require("pg");

// Initialize database connection pool
const pool = new Pool({
  connectionString: process.env.NETLIFY_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Configuration
const CONFIG = {
  workingHours: {
    start: "09:00:00", // 9 AM
    end: "18:00:00",   // 6 PM
  },
  // Set to false to disable working hours validation
  enforceWorkingHours: false,
  timezone: "UTC",     // Or configure from environment variable
};

/**
 * Helper to check if the current time is within working hours
 */
function isWithinWorkingHours(timeStr) {
  if (!CONFIG.enforceWorkingHours) return true;
  
  const [hours, minutes, seconds] = timeStr.split(':').map(Number);
  const timeValue = hours * 3600 + minutes * 60 + seconds;
  
  const [startHours, startMinutes, startSeconds] = CONFIG.workingHours.start.split(':').map(Number);
  const startValue = startHours * 3600 + startMinutes * 60 + startSeconds;
  
  const [endHours, endMinutes, endSeconds] = CONFIG.workingHours.end.split(':').map(Number);
  const endValue = endHours * 3600 + endMinutes * 60 + endSeconds;
  
  return timeValue >= startValue && timeValue <= endValue;
}

/**
 * Main handler function for the Netlify serverless function
 */
exports.handler = async (event) => {
  // Standard headers for all responses
  const headers = {
    "Content-Type": "application/json",
    "Cache-Control": "no-cache, no-store, must-revalidate"
  };
  
  // Validate HTTP method
  if (event.httpMethod !== "POST") {
    return { 
      statusCode: 405, 
      headers,
      body: JSON.stringify({ 
        success: false,
        message: "Method Not Allowed" 
      }) 
    };
  }

  let client;
  try {
    // Parse request body
    const { emp_id, type } = JSON.parse(event.body);
    
    // Validate required parameters
    if (!emp_id || !type) {
      return { 
        statusCode: 400, 
        headers,
        body: JSON.stringify({ 
          success: false,
          message: "Missing required parameters. Both 'emp_id' and 'type' are required." 
        }) 
      };
    }
    
    // Validate action type
    if (type !== "in" && type !== "out") {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          success: false,
          message: "Invalid action type. Must be 'in' or 'out'." 
        })
      };
    }

    // Get current date and time
    const now = new Date();
    const today = now.toISOString().split("T")[0];  // YYYY-MM-DD
    const timeNow = now.toTimeString().split(" ")[0]; // HH:MM:SS
    
    // Check if time is within working hours
    if (!isWithinWorkingHours(timeNow)) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({
          success: false,
          message: `Attendance marking is only allowed between ${CONFIG.workingHours.start} and ${CONFIG.workingHours.end}.`,
          current_time: timeNow
        })
      };
    }

    // Get a client from the pool
    client = await pool.connect();
    
    // Verify the employee exists
    const empCheck = await client.query(
      "SELECT * FROM employees WHERE emp_id = $1",
      [emp_id]
    );
    
    if (empCheck.rows.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          success: false,
          message: "Employee not found."
        })
      };
    }

    // Check existing attendance record for today
    const existing = await client.query(
      "SELECT * FROM attendance WHERE emp_id = $1 AND date = $2",
      [emp_id, today]
    );

    // Process clock-in request
    if (type === "in") {
      console.log(`Processing clock-in for employee: ${emp_id} at ${timeNow}`);
      
      if (existing.rows.length > 0 && existing.rows[0].clock_in) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: "Already clocked in for today.",
            timestamp: existing.rows[0].clock_in,
            type: "in",
            employee_name: empCheck.rows[0].name
          })
        };
      }

      // Begin transaction
      await client.query('BEGIN');
      
      try {
        // Insert or update attendance record
        const dbResult = await client.query(
          `INSERT INTO attendance (emp_id, date, clock_in, created_at, updated_at) 
           VALUES ($1, $2, $3, NOW(), NOW())
           ON CONFLICT (emp_id, date) DO UPDATE SET clock_in = $3, updated_at = NOW()
           RETURNING *`,
          [emp_id, today, timeNow]
        );
        
        // Commit transaction
        await client.query('COMMIT');
        
        console.log(`Clock-in successful for employee ${emp_id} (${empCheck.rows[0].name})`);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: "Clocked in successfully.",
            timestamp: timeNow,
            type: "in",
            employee_name: empCheck.rows[0].name,
            attendance_record: {
              date: today,
              clock_in: timeNow
            }
          })
        };
      } catch (error) {
        // Rollback in case of error
        await client.query('ROLLBACK');
        throw error;
      }
    }

    // Process clock-out request
    if (type === "out") {
      console.log(`Processing clock-out for employee: ${emp_id} at ${timeNow}`);
      
      if (existing.rows.length === 0) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            message: "Cannot clock out without clocking in first.",
            type: "out"
          })
        };
      }
      
      if (existing.rows[0].clock_out) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: "Already clocked out for today.",
            timestamp: existing.rows[0].clock_out,
            type: "out",
            employee_name: empCheck.rows[0].name
          })
        };
      }

      // Begin transaction
      await client.query('BEGIN');
      
      try {
        // Calculate work duration if clock-in exists
        let workDuration = null;
        if (existing.rows[0].clock_in) {
          const clockInParts = existing.rows[0].clock_in.split(':').map(Number);
          const clockOutParts = timeNow.split(':').map(Number);
          
          const clockInSeconds = clockInParts[0] * 3600 + clockInParts[1] * 60 + (clockInParts[2] || 0);
          const clockOutSeconds = clockOutParts[0] * 3600 + clockOutParts[1] * 60 + (clockOutParts[2] || 0);
          
          workDuration = clockOutSeconds - clockInSeconds;
          // Handle negative duration (like overnight shifts) if needed
          if (workDuration < 0) {
            workDuration += 24 * 3600;
          }
        }

        // Update attendance record
        const dbResult = await client.query(
          `UPDATE attendance 
           SET clock_out = $1, updated_at = NOW(), 
               work_duration_seconds = $2
           WHERE emp_id = $3 AND date = $4
           RETURNING *`,
          [timeNow, workDuration, emp_id, today]
        );
        
        // Commit transaction
        await client.query('COMMIT');
        
        console.log(`Clock-out successful for employee ${emp_id} (${empCheck.rows[0].name})`);
        
        // Format work duration for display
        let formattedDuration = null;
        if (workDuration !== null) {
          const hours = Math.floor(workDuration / 3600);
          const minutes = Math.floor((workDuration % 3600) / 60);
          const seconds = workDuration % 60;
          formattedDuration = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: "Clocked out successfully.",
            timestamp: timeNow,
            type: "out",
            employee_name: empCheck.rows[0].name,
            attendance_record: {
              date: today,
              clock_in: existing.rows[0].clock_in,
              clock_out: timeNow,
              work_duration: formattedDuration
            }
          })
        };
      } catch (error) {
        // Rollback in case of error
        await client.query('ROLLBACK');
        throw error;
      }
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
      body: JSON.stringify({ 
        success: false,
        message: "Server encountered an error processing your request",
        error: err.message 
      })
    };
  } finally {
    // Release the client back to the pool
    if (client) {
      client.release();
    }
  }
};
