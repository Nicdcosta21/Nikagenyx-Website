const { Client } = require('pg');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const client = new Client({
    connectionString: process.env.NETLIFY_DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const body = JSON.parse(event.body);
    const { emp_id, month, year, status, slots, day } = body;

    console.log("📥 Incoming body:", body);
    console.log("📥 EMP ID:", emp_id);
    console.log("📆 Year:", year, "Month:", month);

    if (!emp_id || !month || !year || (!status && !slots)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing parameters in request.' }),
      };
    }

    // 🔁 Convert slot format into status{} format if needed
    let processedStatus = status;

    if (!processedStatus && Array.isArray(slots) && typeof day === 'number') {
      console.log("⚙️ Detected slot-format payload, converting to status{} format");
      const blocks = Array(48).fill("A");

      slots.forEach(({ slot, status }) => {
        blocks[slot] = status === "P" ? "P" : "A"; // Treat "NA" as "A" by default
      });

      const dayKey = String(day).padStart(2, '0');
      processedStatus = { [dayKey]: blocks };
    }

    if (!processedStatus || typeof processedStatus !== 'object') {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid status format after processing.' }),
      };
    }

    console.log("🧩 Status Object Keys:", Object.keys(processedStatus));
    console.log("🧩 Day 02 Block Sample:", processedStatus["02"]);

    await client.connect();
    const daysInMonth = new Date(year, month, 0).getDate();

    for (let d = 0; d < daysInMonth; d++) {
      const dayKey = String(d + 1).padStart(2, '0');
      const blocks = processedStatus[dayKey] || [];

      console.log(`🔍 Processing ${dayKey}:`, blocks);

      const presentSlots = blocks.filter(b => b === 'P').length;
const date = `${year}-${String(month).padStart(2, '0')}-${dayKey}`;

const exists = await client.query(
  `SELECT id FROM attendance WHERE emp_id = $1 AND date = $2`,
  [emp_id, date]
);

if (presentSlots === 0) {
  // Delete attendance if exists and no 'P' blocks
  if (exists.rowCount > 0) {
    console.log(`🗑 Deleting ${date}, all blocks are 'A'`);
    await client.query(`DELETE FROM attendance WHERE emp_id = $1 AND date = $2`, [emp_id, date]);
  } else {
    console.log(`⏩ Nothing to delete for ${date}`);
  }
  continue;
}


      const clockInSlot = blocks.findIndex(b => b === 'P');
      const clockOutSlot = blocks.lastIndexOf('P');
      if (clockInSlot === -1 || clockOutSlot === -1) continue;

      const clockInMinutes = clockInSlot * 30;
      const clockOutMinutes = (clockOutSlot + 1) * 30;
      const clock_in = minutesToTime(clockInMinutes);
      const clock_out = minutesToTime(clockOutMinutes);
      const date = `${year}-${String(month).padStart(2, '0')}-${dayKey}`;

      const exists = await client.query(
        `SELECT id FROM attendance WHERE emp_id = $1 AND date = $2`,
        [emp_id, date]
      );

      if (exists.rowCount > 0) {
        console.log(`📝 Updating attendance for ${date}`);
        await client.query(
          `UPDATE attendance SET clock_in = $1, clock_out = $2, updated_at = NOW() WHERE emp_id = $3 AND date = $4`,
          [clock_in, clock_out, emp_id, date]
        );
      } else {
        console.log(`➕ Inserting attendance for ${date}`);
        await client.query(
          `INSERT INTO attendance (emp_id, date, clock_in, clock_out, created_at, updated_at)
           VALUES ($1, $2, $3, $4, NOW(), NOW())`,
          [emp_id, date, clock_in, clock_out]
        );
      }
    }

    await client.end();

    console.log("✅ Attendance updated successfully.");
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Attendance updated successfully.' }),
    };
  } catch (err) {
    console.error("❌ update_attendance error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};

function minutesToTime(totalMinutes) {
  const h = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
  const m = String(totalMinutes % 60).padStart(2, '0');
  return `${h}:${m}:00`;
}
