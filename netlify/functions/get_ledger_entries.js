exports.handler = async () => {
  const fs = require('fs');
  const path = './ledger.json';
  let ledger = [];

  if (fs.existsSync(path)) {
    ledger = JSON.parse(fs.readFileSync(path));
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ entries: ledger })
  };
};
