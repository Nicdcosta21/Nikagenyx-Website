const { Pool } = require("pg");
const pool = new Pool({ connectionString: process.env.NETLIFY_DATABASE_URL, ssl: { rejectUnauthorized: false } });

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
    const { emp_id, month, year, range } = JSON.parse(event.body);
    if (!emp_id) return { 
      statusCode: 400, 
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate"
      },
      body: JSON.stringify({ message: "emp_id required" }) 
    };

    client = await pool.connect();
    
    // Check if we're using the new attendance_log table schema
    const schemaCheck = await client.query(
      "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'attendance_log')"
    );
    const useNewSchema = schemaCheck.rows[0].exists;
    
    let query, params;
    let attendanceData = [];
    
    if (month && year) {
      // Month-specific query
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`;
      
      if (useNewSchema) {
        // Using new schema with attendance_log
        const dateResults = await client.query(
          `SELECT DISTINCT date 
           FROM attendance_log 
           WHERE emp_id = $1 AND date BETWEEN $2 AND $3
           ORDER BY date DESC`,
          [emp_id, startDate, endDate]
        );
        
        const dates = dateResults.rows.map(r => r.date);
        
        for (const date of dates) {
          // Get first clock-in and last clock-out for each date
          const firstClockIn = await client.query(
            `SELECT timestamp 
             FROM attendance_log 
             WHERE emp_id = $1 AND date = $2 AND action_type = 'in' 
             ORDER BY timestamp ASC LIMIT 1`,
            [emp_id, date]
          );
          
          const lastClockOut = await client.query(
            `SELECT timestamp 
             FROM attendance_log 
             WHERE emp_id = $1 AND date = $2 AND action_type = 'out' 
             ORDER BY timestamp DESC LIMIT 1`,
            [emp_id, date]
          );
          
          // Get total duration for the date
          const duration = await client.query(
            `SELECT COALESCE(SUM(session_duration), 0) as total_seconds 
             FROM attendance_log 
             WHERE emp_id = $1 AND date = $2 AND session_duration IS NOT NULL`,
            [emp_id, date]
          );
          
          // Get all entries for the day
          const allEntries = await client.query(
            `SELECT action_type, timestamp, session_duration
             FROM attendance_log
             WHERE emp_id = $1 AND date = $2
             ORDER BY timestamp ASC`,
            [emp_id, date]
          );
          
          // Build entry sessions (in/out pairs)
          const sessions = [];
          let currentSession = null;
          
          allEntries.rows.forEach(entry => {
            if (entry.action_type === 'in') {
              currentSession = { in: entry.timestamp, out: null };
            } else if (entry.action_type === 'out' && currentSession) {
              currentSession.out = entry.timestamp;
              currentSession.duration = entry.session_duration;
              sessions.push(currentSession);
              currentSession = null;
            }
          });
          
          // Add incomplete session if any
          if (currentSession) {
            sessions.push(currentSession);
          }
          
          // Generate half-hour blocks data (P/A/L)
          const blocks = await generateBlocksData(client, emp_id, date);
          
          attendanceData.push({
            date: date,
            clock_in: firstClockIn.rows[0]?.timestamp || null,
            clock_out: lastClockOut.rows[0]?.timestamp || null,
            total_seconds: parseInt(duration.rows[0]?.total_seconds || 0),
            sessions: sessions,
            blocks: blocks
          });
        }
      } else {
        // Using original schema
        query = `
          SELECT date, clock_in, clock_out, work_duration_seconds,
          CASE 
            WHEN work_duration_seconds IS NOT NULL THEN work_duration_seconds / 3600.0
            WHEN clock_in IS NOT NULL AND clock_out IS NOT NULL 
              THEN EXTRACT(EPOCH FROM (clock_out::time - clock_in::time)) / 3600
            ELSE NULL
          END AS total_hours
          FROM attendance
          WHERE emp_id = $1 AND date BETWEEN $2 AND $3
          ORDER BY date DESC
        `;
        params = [emp_id, startDate, endDate];
        
        const result = await client.query(query, params);
        attendanceData = result.rows.map(row => ({
          date: row.date,
          clock_in: row.clock_in,
          clock_out: row.clock_out,
          total_seconds: row.work_duration_seconds || 
                        (row.clock_in && row.clock_out ? 
                         calculateSeconds(row.clock_in, row.clock_out) : 0),
          sessions: row.clock_in ? [{ 
            in: row.clock_in, 
            out: row.clock_out,
            duration: row.work_duration_seconds || 
                    (row.clock_in && row.clock_out ? 
                     calculateSeconds(row.clock_in, row.clock_out) : 0)
          }] : [],
          blocks: await generateBlocksData(client, emp_id, row.date)
        }));
      }
    } else {
      // Default to range-based query (last X days)
      const limit = range || 30;
      
      if (useNewSchema) {
        // Using new schema with attendance_log
        const dateResults = await client.query(
          `SELECT DISTINCT date 
           FROM attendance_log 
           WHERE emp_id = $1 
           ORDER BY date DESC 
           LIMIT $2`,
          [emp_id, limit]
        );
        
        const dates = dateResults.rows.map(r => r.date);
        
        for (const date of dates) {
          const firstClockIn = await client.query(
            `SELECT timestamp 
             FROM attendance_log 
             WHERE emp_id = $1 AND date = $2 AND action_type = 'in' 
             ORDER BY timestamp ASC LIMIT 1`,
            [emp_id, date]
          );
          
          const lastClockOut = await client.query(
            `SELECT timestamp 
             FROM attendance_log 
             WHERE emp_id = $1 AND date = $2 AND action_type = 'out' 
             ORDER BY timestamp DESC LIMIT 1`,
            [emp_id, date]
          );
          
          const duration = await client.query(
            `SELECT COALESCE(SUM(session_duration), 0) as total_seconds 
             FROM attendance_log 
             WHERE emp_id = $1 AND date = $2 AND session_duration IS NOT NULL`,
            [emp_id, date]
          );
          
          const allEntries = await client.query(
            `SELECT action_type, timestamp, session_duration
             FROM attendance_log
             WHERE emp_id = $1 AND date = $2
             ORDER BY timestamp ASC`,
            [emp_id, date]
          );
          
          const sessions = [];
          let currentSession = null;
          
          allEntries.rows.forEach(entry => {
            if (entry.action_type === 'in') {
              currentSession = { in: entry.timestamp, out: null };
            } else if (entry.action_type === 'out' && currentSession) {
              currentSession.out = entry.timestamp;
              currentSession.duration = entry.session_duration;
              sessions.push(currentSession);
              currentSession = null;
            }
          });
          
          if (currentSession) {
            sessions.push(currentSession);
          }
          
          const blocks = await generateBlocksData(client, emp_id, date);
          
          attendanceData.push({
            date: date,
            clock_in: firstClockIn.rows[0]?.timestamp || null,
            clock_out: lastClockOut.rows[0]?.timestamp || null,
            total_seconds: parseInt(duration.rows[0]?.total_seconds || 0),
            sessions: sessions,
            blocks: blocks
          });
        }
      } else {
        // Using original schema
        query = `
          SELECT date, clock_in, clock_out, work_duration_seconds,
          CASE 
            WHEN work_duration_seconds IS NOT NULL THEN work_duration_seconds / 3600.0
            WHEN clock_in IS NOT NULL AND clock_out IS NOT NULL 
              THEN EXTRACT(EPOCH FROM (clock_out::time - clock_in::time)) / 3600
            ELSE NULL
          END AS total_hours
          FROM attendance
          WHERE emp_id = $1
          ORDER BY date DESC
          LIMIT $2
        `;
        params = [emp_id, limit];
        
        const result = await client.query(query, params);
        attendanceData = result.rows.map(row => ({
          date: row.date,
          clock_in: row.clock_in,
          clock_out: row.clock_out,
          total_seconds: row.work_duration_seconds || 
                        (row.clock_in && row.clock_out ? 
                         calculateSeconds(row.clock_in, row.clock_out) : 0),
          sessions: row.clock_in ? [{ 
            in: row.clock_in, 
            out: row.clock_out,
            duration: row.work_duration_seconds || 
                    (row.clock_in && row.clock_out ? 
                     calculateSeconds(row.clock_in, row.clock_out) : 0)
          }] : [],
          blocks: await generateBlocksData(client, emp_id, row.date)
        }));
      }
    }
    
    // Calculate summary statistics
    const totalHours = attendanceData.reduce((sum, day) => sum + (day.total_seconds / 3600), 0);
    const presentDays = attendanceData.filter(day => day.total_seconds >= 25200).length; // 7 hours
    const lateDays = attendanceData.filter(day => day.total_seconds >= 18000 && day.total_seconds < 25200).length;
    const partialDays = attendanceData.filter(day => day.total_seconds > 0 && day.total_seconds < 18000).length;
    const absentDays = attendanceData.filter(day => day.total_seconds === 0).length;
    
    return { 
      statusCode: 200, 
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate"
      },
      body: JSON.stringify({ 
        attendance: attendanceData,
        summary: {
          total_hours: totalHours,
          present_days: presentDays,
          late_days: lateDays,
          partial_days: partialDays,
          absent_days: absentDays,
          total_days: attendanceData.length
        }
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
      body: JSON.stringify({ message: "Server error", error: err.message }) 
    };
  } finally {
    if (client) client.release();
  }
};

// Helper function to calculate seconds between two time strings (HH:MM:SS)
function calculateSeconds(timeStart, timeEnd) {
  if (!timeStart || !timeEnd) return 0;
  
  const [h1, m1, s1 = 0] = timeStart.split(':').map(Number);
  const [h2, m2, s2 = 0] = timeEnd.split(':').map(Number);
  
  const startSeconds = h1 * 3600 + m1 * 60 + s1;
  const endSeconds = h2 * 3600 + m2 * 60 + s2;
  
  let diff = endSeconds - startSeconds;
  if (diff < 0) diff += 24 * 3600; // Handle overnight shifts
  
  return diff;
}

// Helper function to generate blocks data
async function generateBlocksData(client, empId, date) {
  try {
    // Try to get blocks data from attendance_blocks table if it exists
    const blockCheck = await client.query(
      "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'attendance_blocks')"
    );
    
    if (blockCheck.rows[0].exists) {
      const blocksResult = await client.query(
        "SELECT status FROM attendance_blocks WHERE emp_id = $1 AND date = $2 ORDER BY slot_index ASC",
        [empId, date]
      );
      
      if (blocksResult.rows.length > 0) {
        return blocksResult.rows.map(r => r.status);
      }
    }
    
    // If no specific blocks data, generate from attendance records
    const blocks = Array(48).fill("A"); // Default all to absent
    
    // Check if using new schema
    const schemaCheck = await client.query(
      "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'attendance_log')"
    );
    
    if (schemaCheck.rows[0].exists) {
      // Using new schema
      const sessions = await client.query(
        `SELECT action_type, timestamp
         FROM attendance_log
         WHERE emp_id = $1 AND date = $2
         ORDER BY timestamp ASC`,
        [empId, date]
      );
      
      let isClockIn = false;
      let clockInTime = null;
      
      sessions.rows.forEach(log => {
        if (log.action_type === 'in') {
          isClockIn = true;
          clockInTime = log.timestamp;
        } else if (log.action_type === 'out' && isClockIn && clockInTime) {
          // Mark blocks between clock-in and clock-out as present
          const [inHours, inMinutes] = clockInTime.split(':').map(Number);
          const [outHours, outMinutes] = log.timestamp.split(':').map(Number);
          
          const startBlock = Math.floor(inHours * 2 + inMinutes / 30);
          const endBlock = Math.floor(outHours * 2 + outMinutes / 30);
          
          for (let i = startBlock; i <= endBlock && i < 48; i++) {
            blocks[i] = "P";
          }
          
          isClockIn = false;
          clockInTime = null;
        }
      });
    } else {
      // Using old schema
      const attendance = await client.query(
        "SELECT clock_in, clock_out FROM attendance WHERE emp_id = $1 AND date = $2",
        [empId, date]
      );
      
      if (attendance.rows.length > 0 && attendance.rows[0].clock_in) {
        const clockIn = attendance.rows[0].clock_in;
        const clockOut = attendance.rows[0].clock_out;
        
        if (clockIn && clockOut) {
          const [inHours, inMinutes] = clockIn.split(':').map(Number);
          const [outHours, outMinutes] = clockOut.split(':').map(Number);
          
          const startBlock = Math.floor(inHours * 2 + inMinutes / 30);
          const endBlock = Math.floor(outHours * 2 + outMinutes / 30);
          
          for (let i = startBlock; i <= endBlock && i < 48; i++) {
            blocks[i] = "P";
          }
        }
      }
    }
    
    return blocks;
  } catch (error) {
    console.error("Error generating blocks data:", error);
    return Array(48).fill("A"); // Default to all absent if error
  }
}
