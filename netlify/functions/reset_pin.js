// netlify/functions/reset_pin.js
exports.handler = async (event) => {
  const { emp_id } = JSON.parse(event.body || '{}');
  console.log(`Reset PIN for: ${emp_id}`);
  return { statusCode: 200, body: JSON.stringify({ message: `PIN reset for ${emp_id}` }) };
};
