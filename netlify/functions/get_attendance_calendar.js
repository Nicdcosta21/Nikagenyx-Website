const { Client } = require('pg');

exports.handler = async (event, context) => {
  const client = new Client({
    connectionString: process.env.NETLIFY_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    const params = event.queryStringParameters || {};
    const year = params.year || '2025';
    const month = params.month || '6';
    const paddedMonth = month.toString().padStart(2, '0');
    const targetMonth = `${year}-${paddedMonth}`;
    const daysInMonth = new Date(year, month, 0).getDate();

    const empRes = await client.query(`
      SELECT emp_id, name, role, department FROM employees
    `);
    const employees = empRes.rows;

    const attRes = await client.query(`
      SELECT emp_id, date, clock_in, clock_out
      FROM attendance
      WHERE to_char(date, 'YYYY-MM') = $1
    `, [targetMonth]);

    // Placeholder for holidays (can replace with DB in future)
    const holidays = ['2025-07-04', '2025-07-15'];
    const dayMeta = [];

    // Tag weekends and holidays
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${paddedMonth}-${String(d).padStart(2, '0')}`;
      const dateObj = new Date(dateStr);
      const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
      const isHoliday = holidays.includes(dateStr);

      dayMeta.push({
        date: dateStr,
        isWeekend,
        isHoliday
      });
    }

    // Default map: all employees have NA blocks
    const logsByEmp = {};
    employees.forEach(emp => {
      logsByEmp[emp.emp_id] = Array.from({ length: daysInMonth }, () => ({
        blocks: Array(48).fill("NA"),
        hours: 0
      }));
    });

    attRes.rows.forEach(({ emp_id, date, clock_in, clock_out }) => {
      if (!logsByEmp[emp_id]) return;

      const dayIndex = new Date(date).getDate() - 1;
      const log = logsByEmp[emp_id][dayIndex];

      if (clock_in && clock_out) {
        const [h1, m1] = clock_in.split(":").map(Number);
        const [h2, m2] = clock_out.split(":").map(Number);
        const startSlot = Math.floor((h1 * 60 + m1) / 30);
        const endSlot = Math.ceil((h2 * 60 + m2) / 30);

        for (let i = startSlot; i < endSlot && i < 48; i++) {
          log.blocks[i] = "P";
        }
      } else if (clock_in && !clock_out) {
        const [h1, m1] = clock_in.split(":").map(Number);
        const startSlot = Math.floor((h1 * 60 + m1) / 30);
        log.blocks[startSlot] = "L";
      }

      // Convert untouched NA to A (explicit absence)
      log.blocks = log.blocks.map(b => b === "NA" ? "A" : b);

      const pCount = log.blocks.filter(b => b === "P").length;
      const lCount = log.blocks.filter(b => b === "L").length;
      log.hours = (pCount * 0.5 + lCount * 0.25).toFixed(2);
    });

   const result = employees.map(emp => ({
  emp_id: emp.emp_id,
  name: emp.name,
  role: emp.role,
  department: emp.department,
  from: "2025-01-01",
  status: logsByEmp[emp.emp_id].map(day =>
    day && Array.isArray(day.blocks)
      ? { blocks: day.blocks, hours: day.hours || 0 }
      : { blocks: Array(48).fill("A"), hours: 0 }
  )
}));


    await client.end();

    return {
      statusCode: 200,
      body: JSON.stringify({ data: result, meta: dayMeta })
    };

  } catch (err) {
    console.error("❌ DB ERROR:", err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
