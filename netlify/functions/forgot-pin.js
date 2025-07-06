exports.handler = async (event) => {
  const { emp_id } = JSON.parse(event.body || '{}');

  if (!emp_id) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Employee ID is required" }),
    };
  }

  // Optionally reset `failed_pin_attempts` or trigger a secure flow
  return {
    statusCode: 200,
    body: JSON.stringify({ message: `PIN reset request received for ${emp_id}` }),
  };
};
