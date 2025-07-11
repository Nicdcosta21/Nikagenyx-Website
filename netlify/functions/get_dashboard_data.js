const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.NETLIFY_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

exports.handler = async (event) => {
  // Extract employee ID from query parameters
  const empId = event.queryStringParameters?.emp_id;
  
  if (!empId) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
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
      productivity: Math.round(Math.random() * 30) + 70 // Mock value between 70-100
    };
    
    // Get recent activities
    const activitiesRes = await pool.query(
      `SELECT action as type, timestamp, 
       CASE 
         WHEN action = 'clock_in' THEN 'Clocked in' 
         WHEN action = 'clock_out' THEN 'Clocked out' 
         ELSE action 
       END as message 
       FROM attendance 
       WHERE emp_id = $1 
       ORDER BY timestamp DESC 
       LIMIT 5`,
      [empId]
    );
    
    const activities = activitiesRes.rows.map(row => ({
      type: row.type === 'clock_in' || row.type === 'clock_out' ? 'clock' : 'profile',
      message: row.message,
      timestamp: row.timestamp
    }));
    
    // Return all data
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        today: todayData,
        metrics: metrics,
        activities: activities.length ? activities : [
          {
            type: "profile",
            message: "No recent activities",
            timestamp: new Date().toISOString()
          }
        ]
      })
    };
    
  } catch (error) {
    console.error("Dashboard data error:", error);
    
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        error: "Server error", 
        message: error.message 
      })
    };
  }
};
