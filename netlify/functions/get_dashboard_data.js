const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.NETLIFY_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

exports.handler = async (event) => {
  // Extract employee ID from query parameters
  const empId = event.queryStringParameters?.emp_id;
  const timestamp = event.queryStringParameters?._t || Date.now(); // For cache busting
  
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

  try {
    // Get today's attendance
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const todayRes = await pool.query(
      "SELECT clock_in, clock_out FROM attendance WHERE emp_id = $1 AND date = $2",
      [empId, today]
    );
    
    let todayData = {
      clock_in: "--:--",
      clock_out: "--:--",
      hours_worked: "0h 0m",
      status: "-"
    };
    
    if (todayRes.rows.length > 0) {
      const row = todayRes.rows[0];
      todayData.clock_in = row.clock_in || "--:--";
      todayData.clock_out = row.clock_out || "--:--";
      
      if (row.clock_in) {
        const clockIn = row.clock_in.split(':').map(Number);
        let hoursWorked = 0;
        
        if (row.clock_out) {
          const clockOut = row.clock_out.split(':').map(Number);
          const inMinutes = clockIn[0] * 60 + clockIn[1];
          const outMinutes = clockOut[0] * 60 + clockOut[1];
          hoursWorked = (outMinutes - inMinutes) / 60;
          
          const hours = Math.floor(hoursWorked);
          const minutes = Math.floor((hoursWorked - hours) * 60);
          todayData.hours_worked = `${hours}h ${minutes}m`;
        }
        
        todayData.status = hoursWorked >= 7 ? "Present" : hoursWorked >= 5 ? "Late" : "Absent";
      }
    }
    
    // Get attendance metrics
    const currentMonth = new Date().getMonth() + 1; // 1-12
    const currentYear = new Date().getFullYear();
    
    const metricsRes = await pool.query(
      `SELECT COUNT(DISTINCT date) as attendance_days 
       FROM attendance 
       WHERE emp_id = $1 
       AND EXTRACT(MONTH FROM date) = $2
       AND EXTRACT(YEAR FROM date) = $3`,
      [empId, currentMonth, currentYear]
    );
    
    // Calculate working days in month (simplified)
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    const workingDays = Math.min(daysInMonth, 22); // Assume max 22 working days
    
    const metrics = {
      attendance_days: parseInt(metricsRes.rows[0]?.attendance_days || 0),
      working_days: workingDays,
      productivity: 85 // Can be replaced with actual calculation
    };
    
    // Get recent activities - FIXED QUERY with direct mapping
    const activitiesRes = await pool.query(
      `SELECT 
        'clock' as type,
        created_at AS timestamp,
        CASE 
          WHEN clock_in IS NOT NULL AND clock_out IS NULL THEN 'Clocked in at ' || clock_in
          WHEN clock_out IS NOT NULL THEN 'Clocked out at ' || clock_out
          ELSE 'Attendance recorded on ' || date
        END as message
       FROM attendance 
       WHERE emp_id = $1 
       ORDER BY date DESC, created_at DESC 
       LIMIT 5`,
      [empId]
    );
    
    // Use the activities directly without reprocessing
    const activities = activitiesRes.rows.length > 0 ? activitiesRes.rows : [
      {
        type: "profile",
        message: "No recent activities",
        timestamp: new Date().toISOString()
      }
    ];
    
    // Return all data with cache control headers
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
        timestamp: timestamp // Include timestamp for frontend verification
      })
    };
    
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
  }
};
