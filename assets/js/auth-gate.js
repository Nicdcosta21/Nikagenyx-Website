(function authGate() {
  const PUBLIC_PAGES = ["/login.html", "/employee_portal.html", "/register_employee.html"];
  const ADMIN_PAGES = ["/admin_dashboard.html"];
  const EMPLOYEE_PAGES = ["/employee_dashboard.html"];

  const currentPath = window.location.pathname;
  const sessionStr = localStorage.getItem("emp_session");
  const mfaVerified = localStorage.getItem("mfa_verified") === "true";

  // Optional: Cookie check
  const cookies = document.cookie.split("; ").map(c => c.trim());
  const hasSessionCookie = cookies.some(c => c.startsWith("nikagenyx_session="));

  function redirect(path) {
    if (currentPath !== path) window.location.replace(path);
  }

  function clearSessionAndRedirect() {
    localStorage.removeItem("emp_session");
    localStorage.removeItem("mfa_verified");
    // Optionally clear cookie
    document.cookie = "nikagenyx_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    redirect("/employee_portal.html");
  }

  try {
    // Skip validation on public pages
    if (PUBLIC_PAGES.includes(currentPath)) return;

    // Optional: require cookie
    if (!hasSessionCookie) return clearSessionAndRedirect();

    // Session must exist
    if (!sessionStr) return clearSessionAndRedirect();

    const session = JSON.parse(sessionStr);

    // Basic ID check
    if (!session || !session.emp_id) return clearSessionAndRedirect();

    // MFA required for non-superadmin users
    const isSuperAdmin = session.emp_id === "NGX001";
    if (!isSuperAdmin && !mfaVerified) return redirect("/employee_portal.html");

    // Role validation
    if (ADMIN_PAGES.includes(currentPath)) {
      if (!session.role || !session.role.includes("admin")) return redirect("/employee_dashboard.html");
    }

    // Optional: Redirect logged-in user away from login or employee_portal pages
    if (currentPath === "/employee_portal.html" || currentPath === "/login.html") {
      if (session.role && session.role.includes("admin")) {
        return redirect("/admin_dashboard.html");
      } else {
        return redirect("/employee_dashboard.html");
      }
    }
  } catch (err) {
    console.error("🔐 Auth Gate Error:", err);
    clearSessionAndRedirect();
  }
})();
