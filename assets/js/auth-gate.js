(function () {
  const cookies = document.cookie.split("; ");
  const sessionExists = cookies.some(p => p.startsWith("nikagenyx_session="));
  if (!sessionExists) {
    localStorage.removeItem("emp_session");
    window.location.replace("/employee_portal.html");
    return;
  }

  const session = localStorage.getItem("emp_session");
  if (window.location.pathname.includes("admin_dashboard")) {
    if (!session || !JSON.parse(session).role?.includes("admin")) {
      window.location.replace("/employee_dashboard.html");
    }
  }
})();
