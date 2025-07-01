(async function () {
  const cookies = document.cookie.split("; ");
  const hasSession = cookies.some(p => p.startsWith("nikagenyx_session="));

  if (!hasSession) {
    localStorage.removeItem("emp_session");
    window.location.replace("/employee_portal.html");
    return;
  }

  let session = localStorage.getItem("emp_session");

  if (!session) {
    try {
      const res = await fetch("/.netlify/functions/get_employees", {
        credentials: "include"
      });

      if (res.status === 200) {
        const user = await res.json();
        localStorage.setItem("emp_session", JSON.stringify(user));
        session = JSON.stringify(user);
      } else {
        throw new Error("Invalid session");
      }
    } catch (err) {
      localStorage.removeItem("emp_session");
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
