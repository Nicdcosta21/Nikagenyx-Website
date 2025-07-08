console.log("✅ admin_dashboard.js loaded");

async function fetchEmployees(currentUser) {
  console.log("🔍 fetchEmployees triggered");

  const res = await fetch("/.netlify/functions/get_employees");
  const data = await res.json();
  console.log("👥", data.employees);
}

// Expose globally
window.fetchEmployees = fetchEmployees;
