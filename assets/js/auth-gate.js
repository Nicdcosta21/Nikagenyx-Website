(function authGate() {
  const currentPath = window.location.pathname.toLowerCase();

  // Early exit: skip gate on login page — let login complete
  if (currentPath === "/employee_portal.html" || currentPath === "/login.html") {
    const sessionStr = localStorage.getItem("emp_session");

    if (sessionStr) {
      try {
        const parsed = JSON.parse(sessionStr);
        if (parsed && parsed.role) {
          setTimeout(() => {
            if (parsed.role.includes("admin")) {
              window.location.href = "/admin_dashboard.html";
            } else {
              window.location.href = "/employee_dashboard.html";
            }
          }, 200); // allow localStorage to finish writing
        }
      } catch (e) {
        console.error("Session parse error on login page:", e);
      }
    }

    // Don’t run full auth gate
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

  const cookies = document.cookie.toLowerCase().split(";").map(c => c.trim());
  const hasSessionCookie = cookies.some(c => c.startsWith("nikagenyx_session="));

  function redirect(path) {
    if (window.location.pathname !== path) {
      window.location.replace(path);
      return true;
    }
    return false;
  }

  function clearSessionAndRedirect() {
    localStorage.removeItem("emp_session");
    localStorage.removeItem("mfa_verified");
    document.cookie = "nikagenyx_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    redirect("/employee_portal.html");
  }

  try {
    if (PUBLIC_PAGES.includes(currentPath)) return;

    console.log("auth-gate.js running");
console.log("localStorage sessionStr:", sessionStr);
console.log("hasSessionCookie:", hasSessionCookie);


    if (!sessionStr) {
  clearSessionAndRedirect();
  return;
}

    const session = JSON.parse(sessionStr);
    if (!session || !session.emp_id) {
      clearSessionAndRedirect();
      return;
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
})();
