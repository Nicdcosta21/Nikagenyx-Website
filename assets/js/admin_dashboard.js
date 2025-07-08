console.log("✅ admin_dashboard.js loaded");

async function fetchEmployees(currentUser) {
  console.log("🔍 fetchEmployees triggered");

  const res = await fetch("/.netlify/functions/get_employees");
  const data = await res.json();
  console.log("👥", data.employees);

  const tbody = document.getElementById("employeeTable");
  tbody.innerHTML = "";

  data.employees.forEach(emp => {
    const tr = document.createElement("tr");
    tr.className = "border-b border-gray-700";

    tr.innerHTML = `
      <td class="p-2 border">${emp.emp_id}</td>
      <td class="p-2 border">${emp.name}</td>
      <td class="p-2 border">${emp.phone}</td>
    `;

    tbody.appendChild(tr);
  });
}

window.fetchEmployees = fetchEmployees;
