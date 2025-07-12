exports.handler = async (event) => {
  const data = JSON.parse(event.body || '{}');
  if (!data.date || !data.account || !data.amount || !data.type) {
    return { statusCode: 400, body: JSON.stringify({ success: false, message: "Missing fields" }) };
  }

  const fs = require('fs');
  const path = './ledger.json';
  let ledger = [];

  if (fs.existsSync(path)) {
    ledger = JSON.parse(fs.readFileSync(path));
  }

  ledger.push(data);
  fs.writeFileSync(path, JSON.stringify(ledger, null, 2));

  return { statusCode: 200, body: JSON.stringify({ success: true }) };
};
