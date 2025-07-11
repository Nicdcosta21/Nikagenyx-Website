window.addEventListener("DOMContentLoaded", async function authGate() {
  const currentPath = window.location.pathname.toLowerCase();
  const PUBLIC_PAGES = ["/employee_portal.html", "/register_employee.html"];
  const ADMIN_PAGES = ["/admin_dashboard.html", "/view_payroll.html", "/attendance_view.html"];
  const EMPLOYEE_PAGES = [
    "/employee_dashboard.html", "/update_profile.html", "/view_attendance.html",
    "/view_payroll.html", "/clock_attendance.html"
  ];

  function redirect(path) {
    if (window.location.pathname !== path) {
      window.location.replace(path);
    }
  }

  try {
    if (PUBLIC_PAGES.includes(currentPath)) return;

    const res = await fetch("/.netlify/functions/verify-session");
    const data = await res.json();
    if (!data.ok) {
      redirect("/employee_portal.html");
      return;
    }

    const role = data.role || "employee";

    if (ADMIN_PAGES.includes(currentPath) && role !== "admin") {
      redirect("/employee_dashboard.html");
    }

    if (EMPLOYEE_PAGES.includes(currentPath) && role === "admin") {
      redirect("/admin_dashboard.html");
    }

  } catch (err) {
    console.error("🔐 Auth Gate Error:", err);
    redirect("/employee_portal.html");
  }
});