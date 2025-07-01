(function authGate() {
  const PUBLIC_PAGES = ["/employee_portal.html", "/register_employee.html"];
  const ADMIN_PAGES = ["/admin_dashboard.html", "/view_payroll.html", "/attendance_view.html"];
  const EMPLOYEE_PAGES = ["/employee_dashboard.html", "/update_profile.html", "/view_attendance.html", "/view_payroll.html", "/clock_attendance.html"];


  const currentPath = window.location.pathname.toLowerCase();
  const sessionStr = localStorage.getItem("emp_session");
  const mfaVerified = localStorage.getItem("mfa_verified") === "true";

  // Normalize cookie names to lowercase to avoid case sensitivity issues
  const cookies = document.cookie.toLowerCase().split(";").map(c => c.trim());
  const hasSessionCookie = cookies.some(c => c.startsWith("nikagenyx_session="));

  function redirect(path) {
    if (currentPath !== path) {
      window.location.replace(path);
      return true; // indicate redirected
    }
    return false;
  }

  function clearSessionAndRedirect() {
    localStorage.removeItem("emp_session");
    localStorage.removeItem("mfa_verified");
    // Expire the session cookie
    document.cookie = "nikagenyx_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    redirect("/employee_portal.html");
  }

  try {
    // Skip validation on public pages
    if (PUBLIC_PAGES.includes(currentPath)) return;

    // Require session cookie presence
    if (!hasSessionCookie) {
      clearSessionAndRedirect();
      return;
    }

    // Session must exist
    if (!sessionStr) {
      clearSessionAndRedirect();
      return;
    }

    const session = JSON.parse(sessionStr);

    // Basic session integrity check
    if (!session || !session.emp_id) {
      clearSessionAndRedirect();
      return;
    }

    // Bypass MFA for super admin NGX001 (case insensitive)
    const isSuperAdmin = session.emp_id && session.emp_id.toUpperCase() === "NGX001";

    if (!isSuperAdmin && !mfaVerified) {
      if (redirect("/employee_portal.html")) return;
    }

    // Admin page access check
    if (ADMIN_PAGES.includes(currentPath)) {
      if (!session.role || !session.role.includes("admin")) {
        if (redirect("/employee_dashboard.html")) return;
      }
    }


    // Employee-only page access check
if (EMPLOYEE_PAGES.includes(currentPath)) {
  if (!session.role || session.role === "admin") {
    if (redirect("/admin_dashboard.html")) return;
  }
}

    // Redirect logged-in users away from public login pages
    if (currentPath === "/employee_portal.html" || currentPath === "/login.html") {
      if (session.role && session.role.includes("admin")) {
        if (redirect("/admin_dashboard.html")) return;
      } else {
        if (redirect("/employee_dashboard.html")) return;
      }
    }

  } catch (err) {
    console.error("🔐 Auth Gate Error:", err);
    clearSessionAndRedirect();
  }
})();
