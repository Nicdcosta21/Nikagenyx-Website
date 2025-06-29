exports.handler = async (event) => {
  // Sample data — fetch from your database in real scenario
  const attendanceRecords = [
    {
      emp_id: "NGX001",
      name: "Nikolas D'Costa",
      role: "Photo Manager",
      from: "2025-02-21",
      data: {
        "2025-06-01": "P", "2025-06-02": "P", "2025-06-03": "A",
        "2025-06-04": "L", "2025-06-05": "P", "2025-06-06": "H"
      }
    },
    {
      emp_id: "NGX002",
      name: "Pinkson Barbosa",
      role: "Photographer",
      from: "2025-04-01",
      data: {
        "2025-06-01": "P", "2025-06-02": "P", "2025-06-03": "P",
        "2025-06-04": "P", "2025-06-05": "L", "2025-06-06": "P"
      }
    }
  ];

  return {
    statusCode: 200,
    body: JSON.stringify(attendanceRecords),
    headers: { 'Content-Type': 'application/json' }
  };
};
