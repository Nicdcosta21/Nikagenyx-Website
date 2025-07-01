window.addEventListener("DOMContentLoaded", function authGate() {
  const currentPath = window.location.pathname.toLowerCase();

  if (currentPath === "/employee_portal.html" || currentPath === "/login.html") {
    console.log("🔐 On login page — gate exiting early");
    return;
  }

  const PUBLIC_PAGES = ["/employee_portal.html", "/register_employee.html"];
  const ADMIN_PAGES = ["/admin_dashboard.html", "/view_payroll.html", "/attendance_view.html"];
  const EMPLOYEE_PAGES = [
    "/employee_dashboard.html",
    "/update_profile.html",
    "/view_attendance.html",
    "/view_payroll.html",
    "/clock_attendance.html"
  ];

  const sessionStr = localStorage.getItem("emp_session");
  const mfaVerified = localStorage.getItem("mfa_verified") === "true";

  function redirect(path) {
    if (window.location.pathname !== path) {
      console.warn("🔁 Redirecting to:", path);
      window.location.replace(path);
    }
  }

  function clearSessionAndRedirect() {
    console.warn("❌ Clearing session & redirecting");
    localStorage.removeItem("emp_session");
    localStorage.removeItem("mfa_verified");
    redirect("/employee_portal.html");
  }

  try {
    console.log("auth-gate.js running");
    console.log("🔍 localStorage sessionStr:", sessionStr);

    if (!sessionStr) {
      console.warn("⚠️ sessionStr not found");
      return; // <-- Don't redirect, just skip gate
    }

    const session = JSON.parse(sessionStr);
    console.log("✅ Parsed session:", session);

    if (!session || !session.emp_id) {
      console.warn("⚠️ Invalid session structure");
      return; // <-- Again, don't redirect immediately
    }

    const isSuperAdmin = session.emp_id.toUpperCase() === "NGX001";

    if (!isSuperAdmin && !mfaVerified) {
      redirect("/employee_portal.html");
      return;
    }

    if (ADMIN_PAGES.includes(currentPath)) {
      if (!session.role || !session.role.includes("admin")) {
        redirect("/employee_dashboard.html");
        return;
      }
    }

    if (EMPLOYEE_PAGES.includes(currentPath)) {
      if (!session.role || session.role === "admin") {
        redirect("/admin_dashboard.html");
        return;
      }
    }

  } catch (err) {
    console.error("🔐 Auth Gate Error:", err);
    clearSessionAndRedirect();
  }
});
