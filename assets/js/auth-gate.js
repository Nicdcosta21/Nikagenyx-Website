(async function authGate() {
  try {
    // Check for session cookie
    const cookies = document.cookie.split("; ").map(c => c.trim());
    const hasSessionCookie = cookies.some(c => c.startsWith("nikagenyx_session="));
    if (!hasSessionCookie) {
      localStorage.removeItem("emp_session");
      if (window.location.pathname !== "/employee_portal.html") {
        window.location.replace("/employee_portal.html");
      }
      return;
    }

    // Check localStorage session
    const sessionStr = localStorage.getItem("emp_session");
    if (!sessionStr) {
      localStorage.removeItem("emp_session");
      if (window.location.pathname !== "/employee_portal.html") {
        window.location.replace("/employee_portal.html");
      }
      return;
    }

    const session = JSON.parse(sessionStr);

    // Admin page protection
    if (window.location.pathname.includes("admin_dashboard")) {
      if (!session.role || !session.role.includes("admin")) {
        if (window.location.pathname !== "/employee_dashboard.html") {
          window.location.replace("/employee_dashboard.html");
        }
        return;
      }
    }

    // Prevent logged-in user from accessing login page again
    if (
      window.location.pathname === "/employee_portal.html" ||
      window.location.pathname === "/login.html"
    ) {
      if (session && session.emp_id) {
        // Redirect admins to admin dashboard
        if (session.role && session.role.includes("admin")) {
          window.location.replace("/admin_dashboard.html");
        } else {
          window.location.replace("/employee_dashboard.html");
        }
      }
    }
  } catch (err) {
    // On error, clear session and redirect to login
    localStorage.removeItem("emp_session");
    if (window.location.pathname !== "/employee_portal.html") {
      window.location.replace("/employee_portal.html");
    }
  }
})();
