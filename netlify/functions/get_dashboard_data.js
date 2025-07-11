const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.NETLIFY_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

exports.handler = async (event) => {
  // Extract employee ID from query parameters
  const empId = event.queryStringParameters?.emp_id;
  const timestamp = event.queryStringParameters?._t || Date.now(); // For cache busting
  const clientDate = event.queryStringParameters?.client_date;
  
  if (!empId) {
    return {
      statusCode: 400,
      headers: { 
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate"
      },
      body: JSON.stringify({ error: "Missing employee ID" })
    };
  }

  let client;
  try {
    client = await pool.connect();
    
    // Get today's date, use client date if provided
    const today = clientDate || new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    console.log(`Getting dashboard data for emp_id ${empId} on date ${today}`);
    
    // Check if we're using the new attendance_log table or the old attendance table
    const tableCheck = await client.query(
      "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'attendance_log')"
    );
    
    const useNewSchema = tableCheck.rows[0].exists;
    let todayData = {
      clock_in: "--:--",
      clock_out: "--:--",
      hours_worked: "0h 0m",
      status: "-",
      is_clocked_in: false
    };
    
    if (useNewSchema) {
      // Using new schema with attendance_log table
      const latestClockIn = await client.query(
        `SELECT timestamp FROM attendance_log 
         WHERE emp_id = $1 AND date = $2 AND action_type = 'in'
         ORDER BY timestamp DESC LIMIT 1`,
        [empId, today]
      );
      
      const latestClockOut = await client.query(
        `SELECT timestamp FROM attendance_log 
         WHERE emp_id = $1 AND date = $2 AND action_type = 'out'
         ORDER BY timestamp DESC LIMIT 1`,
        [empId, today]
      );
      
      // Get latest action to determine if currently clocked in
      const latestAction = await client.query(
        `SELECT action_type FROM attendance_log
         WHERE emp_id = $1 AND date = $2
         ORDER BY timestamp DESC, id DESC LIMIT 1`,
        [empId, today]
      );
      
      // Calculate total work duration for today
      const durationSum = await client.query(
        `SELECT COALESCE(SUM(session_duration), 0) as total_seconds
         FROM attendance_log
         WHERE emp_id = $1 AND date = $2 AND session_duration IS NOT NULL`,
        [empId, today]
      );
      
      const totalSeconds = parseInt(durationSum.rows[0]?.total_seconds || 0);
      
      // Format duration as hours and minutes
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      
      // Update todayData with the fetched information
      todayData.clock_in = latestClockIn.rows[0]?.timestamp || "--:--";
      todayData.clock_out = latestClockOut.rows[0]?.timestamp || "--:--";
      todayData.hours_worked = `${hours}h ${minutes}m ${seconds}s`;
      todayData.is_clocked_in = latestAction.rows[0]?.action_type === 'in';
      
      // Determine status based on hours worked and clocked in status
      if (todayData.is_clocked_in) {
        todayData.status = "Working";
      } else if (totalSeconds >= 25200) { // 7 hours = 25200 seconds
        todayData.status = "Present";
      } else if (totalSeconds >= 18000) { // 5 hours = 18000 seconds
        todayData.status = "Late";
      } else if (totalSeconds > 0) {
        todayData.status = "Partial";
      } else {
        todayData.status = "Absent";
      }
      
      // Get activity logs for today
      const activitiesRes = await client.query(
        `SELECT 
           'clock' as type,
           timestamp,
           date,
           CASE 
             WHEN action_type = 'in' THEN 'Clocked in at ' || timestamp
             WHEN action_type = 'out' THEN 'Clocked out at ' || timestamp
           END as message,
           created_at
         FROM attendance_log 
         WHERE emp_id = $1 
         ORDER BY created_at DESC
         LIMIT 10`,
        [empId]
      );
      
      // Get attendance metrics for month
      const currentMonth = new Date().getMonth() + 1; // 1-12
      const currentYear = new Date().getFullYear();
      
      // Count days with attendance entries
      const attendanceDays = await client.query(
        `SELECT COUNT(DISTINCT date) as attendance_days 
         FROM attendance_log 
         WHERE emp_id = $1 
         AND EXTRACT(MONTH FROM date) = $2
         AND EXTRACT(YEAR FROM date) = $3`,
        [empId, currentMonth, currentYear]
      );
      
      // Calculate working days in month (simplified)
      const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
      const workingDays = Math.min(daysInMonth, 22); // Assume max 22 working days
      
      const metrics = {
        attendance_days: parseInt(attendanceDays.rows[0]?.attendance_days || 0),
        working_days: workingDays,
        productivity: Math.min(100, Math.round((totalSeconds / 28800) * 100)) // Based on 8-hour day
      };
      
      // Use the activities directly
      const activities = activitiesRes.rows.length > 0 ? activitiesRes.rows : [
        {
          type: "profile",
          message: "No recent activities",
          timestamp: new Date().toISOString()
        }
      ];
      
      // Return data
      return {
        statusCode: 200,
        headers: { 
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache"
        },
        body: JSON.stringify({
          today: todayData,
          metrics: metrics,
          activities: activities,
          timestamp: timestamp
        })
      };
    } else {
      // Using old schema - attendance table
      const todayRes = await client.query(
        "SELECT clock_in, clock_out, created_at, updated_at FROM attendance WHERE emp_id = $1 AND date = $2",
        [empId, today]
      );
      
      if (todayRes.rows.length > 0) {
        const row = todayRes.rows[0];
        todayData.clock_in = row.clock_in || "--:--";
        todayData.clock_out = row.clock_out || "--:--";
        
        if (row.clock_in) {
          const clockIn = row.clock_in.split(':').map(Number);
          let totalSeconds = 0;
          
          if (row.clock_out) {
            // Calculate time difference including seconds
            const clockOut = row.clock_out.split(':').map(Number);
            const inSeconds = clockIn[0] * 3600 + clockIn[1] * 60 + (clockIn[2] || 0);
            const outSeconds = clockOut[0] * 3600 + clockOut[1] * 60 + (clockOut[2] || 0);
            totalSeconds = outSeconds - inSeconds;
            
            // Handle negative time (clock out before clock in - shouldn't happen but just in case)
            if (totalSeconds < 0) totalSeconds += 24 * 3600;
            
            // Format time
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;
            todayData.hours_worked = `${hours}h ${minutes}m ${seconds}s`;
            
            todayData.is_clocked_in = false;
          } else {
            // User is still clocked in
            todayData.is_clocked_in = true;
            
            // Calculate time since clock in
            const now = new Date();
            const nowHours = now.getHours();
            const nowMinutes = now.getMinutes();
            const nowSeconds = now.getSeconds();
            
            const inSeconds = clockIn[0] * 3600 + clockIn[1] * 60 + (clockIn[2] || 0);
            const nowTimeSeconds = nowHours * 3600 + nowMinutes * 60 + nowSeconds;
            
            totalSeconds = nowTimeSeconds - inSeconds;
            if (totalSeconds < 0) totalSeconds += 24 * 3600; // Handle day crossing
            
            // Format current duration
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;
            todayData.hours_worked = `${hours}h ${minutes}m ${seconds}s (ongoing)`;
          }
          
          // Determine status
          if (todayData.is_clocked_in) {
            todayData.status = "Working";
          } else if (totalSeconds >= 25200) { // 7 hours = 25200 seconds
            todayData.status = "Present";
          } else if (totalSeconds >= 18000) { // 5 hours = 18000 seconds
            todayData.status = "Late";
          } else if (totalSeconds > 0) {
            todayData.status = "Partial";
          } else {
            todayData.status = "Absent";
          }
        }
      }
      
      // Get attendance metrics
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      
      const metricsRes = await client.query(
        `SELECT COUNT(DISTINCT date) as attendance_days 
         FROM attendance 
         WHERE emp_id = $1 
         AND EXTRACT(MONTH FROM date) = $2
         AND EXTRACT(YEAR FROM date) = $3`,
        [empId, currentMonth, currentYear]
      );
      
      // Calculate working days in month
      const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
      const workingDays = Math.min(daysInMonth, 22);
      
      const metrics = {
        attendance_days: parseInt(metricsRes.rows[0]?.attendance_days || 0),
        working_days: workingDays,
        productivity: 85 // Replace with actual calculation if available
      };
      
      // Get recent activities
      const activitiesRes = await client.query(
        `SELECT 
           'clock' as type,
           CASE 
             WHEN clock_in IS NOT NULL AND clock_out IS NULL THEN clock_in
             WHEN clock_out IS NOT NULL THEN clock_out
             ELSE NULL
           END as timestamp,
           date,
           CASE 
             WHEN clock_in IS NOT NULL AND clock_out IS NULL THEN 'Clocked in at ' || clock_in
             WHEN clock_out IS NOT NULL THEN 'Clocked out at ' || clock_out
             ELSE 'Attendance recorded on ' || date
           END as message,
           updated_at as created_at
         FROM attendance 
         WHERE emp_id = $1 
         ORDER BY date DESC, updated_at DESC 
         LIMIT 5`,
        [empId]
      );
      
      const activities = activitiesRes.rows.length > 0 ? activitiesRes.rows : [
        {
          type: "profile",
          message: "No recent activities",
          timestamp: new Date().toISOString()
        }
      ];
      
      // Return data
      return {
        statusCode: 200,
        headers: { 
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache"
        },
        body: JSON.stringify({
          today: todayData,
          metrics: metrics,
          activities: activities,
          timestamp: timestamp
        })
      };
    }
  } catch (error) {
    console.error("Dashboard data error:", error);
    
    return {
      statusCode: 500,
      headers: { 
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate"
      },
      body: JSON.stringify({ 
        error: "Server error", 
        message: error.message 
      })
    };
  } finally {
    if (client) client.release();
  }
};
