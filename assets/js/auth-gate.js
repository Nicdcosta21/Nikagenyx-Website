(async function () {
  const cookies = document.cookie.split("; ");
  const sessionExists = cookies.some(p => p.startsWith("nikagenyx_session="));

  if (!sessionExists) {
    localStorage.removeItem("emp_session");
    window.location.replace("/employee_portal.html");
    return;
  }

  let session = localStorage.getItem("emp_session");

  // 🛠️ If localStorage was wiped, fetch user again
  if (!session) {
    try {
      const res = await fetch("/.netlify/functions/get_employees", {
        credentials: "include"
      });
      if (res.status === 200) {
        const user = await res.json();
        session = JSON.stringify(user);
        localStorage.setItem("emp_session", session);
      } else {
        throw new Error("Session invalid");
      }
    } catch {
      window.location.replace("/employee_portal.html");
      return;
    }
  }

  const user = JSON.parse(session);

  if (window.location.pathname.includes("admin_dashboard")) {
    if (!user || !user.role?.includes("admin")) {
      window.location.replace("/employee_dashboard.html");
    }
  }
})();
