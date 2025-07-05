// admin_dashboard.js (Final Version with MFA + Modal Logic)

document.addEventListener("DOMContentLoaded", async () => {
  const session = localStorage.getItem("emp_session");
  if (!session) return (window.location.href = "/employee_portal.html");
  const currentUser = JSON.parse(session);
  await loadPayrollMode();
  await fetchEmployees(currentUser);
  const searchInput = document.getElementById("search");
  if (searchInput) {
    searchInput.addEventListener("input", filterEmployeeTable);
  }
});
...

window.exportCSV = async function() {
  try {
    const res = await fetch("/.netlify/functions/get_employees");
    const { employees } = await res.json();

    const csvContent = [
      ['ID', 'Name', 'Email', 'Phone', 'DOB', 'Role', 'Department', 'Base Salary'].join(','),
      ...employees.map(emp => [
        emp.emp_id,
        emp.name,
        emp.email || '',
        emp.phone || '',
        emp.dob ? formatDate(emp.dob) : '',
        emp.role || '',
        emp.department || '',
        emp.base_salary || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `employees_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    showToast('✅ CSV exported successfully');
  } catch (error) {
    console.error('Export failed:', error);
    showToast('❌ Export failed');
  }
};