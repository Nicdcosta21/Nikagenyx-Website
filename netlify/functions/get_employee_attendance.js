const { Pool } = require("pg");
const pool = new Pool({ connectionString: process.env.NETLIFY_DATABASE_URL, ssl: { rejectUnauthorized: false } });

exports.handler = async (event) => {
  // Set consistent headers for all responses to prevent caching
  const headers = {
    "Content-Type": "application/json",
    "Cache-Control": "no-cache, no-store, must-revalidate"
  };

  if (event.httpMethod !== "POST") {
    return { 
      statusCode: 405, 
      headers, 
      body: JSON.stringify({ message: "Method Not Allowed" }) 
    };
  }

  let client;
  try {
    // Parse request body
    const requestBody = JSON.parse(event.body);
    const emp_id = requestBody.emp_id;
    const range = requestBody.range || 30; // Default to 30 days if not specified
    
    if (!emp_id) {
      return { 
        statusCode: 400, 
        headers, 
        body: JSON.stringify({ message: "emp_id required" }) 
      };
    }

    client = await pool.connect();
    
    // Check which schema we're using
    const schemaCheck = await client.query(
      "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'attendance_log')"
    );
    
    // Determine if we're using the new schema with attendance_log table
    const useNewSchema = schemaCheck.rows[0].exists;
    
    let attendanceData;
    let summaryStats = {
      present_days: 0,
      late_days: 0,
      partial_days: 0,
      absent_days: 0,
      total_hours: 0
    };
    
    if (useNewSchema) {
      // Get dates with attendance records
      const datesResult = await client.query(
        `SELECT DISTINCT date
         FROM attendance_log
         WHERE emp_id = $1
         ORDER BY date DESC
         LIMIT $2`,
        [emp_id, range]
      );
      
      attendanceData = [];
      
      // Process each date
      for (const dateRow of datesResult.rows) {
        const date = dateRow.date;
        
        // Get first clock in
        const firstIn = await client.query(
          `SELECT timestamp
           FROM attendance_log
           WHERE emp_id = $1 AND date = $2 AND action_type = 'in'
           ORDER BY timestamp ASC LIMIT 1`,
          [emp_id, date]
        );
        
        // Get last clock out
        const lastOut = await client.query(
          `SELECT timestamp
           FROM attendance_log
           WHERE emp_id = $1 AND date = $2 AND action_type = 'out'
           ORDER BY timestamp DESC LIMIT 1`,
          [emp_id, date]
        );
        
        // Get total duration
        const durationResult = await client.query(
          `SELECT COALESCE(SUM(session_duration), 0) as total_seconds
           FROM attendance_log
           WHERE emp_id = $1 AND date = $2 AND session_duration IS NOT NULL`,
          [emp_id, date]
        );
        
        // Calculate hours
        const totalSeconds = parseInt(durationResult.rows[0]?.total_seconds || 0);
        const totalHours = totalSeconds / 3600;
        
        // Get all entries for the day to create session details
        const allEntries = await client.query(
          `SELECT action_type, timestamp, session_duration
           FROM attendance_log
           WHERE emp_id = $1 AND date = $2
           ORDER BY timestamp ASC`,
          [emp_id, date]
        );
        
        // Create session pairs
        const entries = [];
        let currentEntry = null;
        
        for (const record of allEntries.rows) {
          if (record.action_type === 'in') {
            currentEntry = { in: record.timestamp, out: null };
          } else if (record.action_type === 'out' && currentEntry) {
            currentEntry.out = record.timestamp;
            currentEntry.duration = record.session_duration;
            entries.push(currentEntry);
            currentEntry = null;
          }
        }
        
        // Add any incomplete entry
        if (currentEntry) {
          entries.push(currentEntry);
        }
        
        // Create the attendance record
        const attendanceRecord = {
          date: date,
          clock_in: firstIn.rows[0]?.timestamp || null,
          clock_out: lastOut.rows[0]?.timestamp || null,
          total_hours: totalHours,
          work_duration_seconds: totalSeconds,
          entries: entries
        };
        
        // Update summary statistics
        updateSummaryStats(summaryStats, totalSeconds);
        
        attendanceData.push(attendanceRecord);
      }
    } else {
      // Using original attendance table
      const result = await client.query(
        `SELECT date, clock_in, clock_out,
         CASE
           WHEN work_duration_seconds IS NOT NULL THEN work_duration_seconds / 3600.0
           WHEN clock_in IS NOT NULL AND clock_out IS NOT NULL 
             THEN EXTRACT(EPOCH FROM (clock_out::time - clock_in::time)) / 3600
           ELSE NULL
         END AS total_hours,
         CASE
           WHEN work_duration_seconds IS NOT NULL THEN work_duration_seconds
           WHEN clock_in IS NOT NULL AND clock_out IS NOT NULL 
             THEN EXTRACT(EPOCH FROM (clock_out::time - clock_in::time))
           ELSE NULL
         END AS work_duration_seconds
         FROM attendance
         WHERE emp_id = $1 ORDER BY date DESC LIMIT $2`,
        [emp_id, range]
      );
      
      // Process rows to add entries for accordion view
      attendanceData = result.rows.map(row => {
        const seconds = row.work_duration_seconds || 0;
        
        // Update summary statistics
        updateSummaryStats(summaryStats, seconds);
        
        return {
          ...row,
          // Add entries for accordion compatibility
          entries: row.clock_in ? [{
            in: row.clock_in,
            out: row.clock_out,
            duration: seconds
          }] : []
        };
      });
    }
    
    return { 
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        attendance: attendanceData,
        summary: summaryStats
      }) 
    };
    
  } catch (err) {
    console.error("Error in get_employee_attendance:", err);
    
    return { 
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate"
      },
      body: JSON.stringify({ 
        message: "Server error", 
        error: err.message 
      }) 
    };
  } finally {
    if (client) client.release();
  }
};

// Helper function to update summary statistics
function updateSummaryStats(stats, seconds) {
  // Update total hours
  stats.total_hours += seconds / 3600;
  
  // Update day counts based on duration
  if (seconds >= 25200) { // 7 hours = 25200 seconds
    stats.present_days++;
  } else if (seconds >= 18000) { // 5 hours = 18000 seconds
    stats.late_days++;
  } else if (seconds > 0) {
    stats.partial_days++;
  } else {
    stats.absent_days++;
  }
}
