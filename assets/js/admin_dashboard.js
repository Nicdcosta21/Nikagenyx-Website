document.addEventListener("DOMContentLoaded", async () => {
  const session = localStorage.getItem("emp_session");
  if (!session) return (window.location.href = "/employee_portal.html");

  const currentUser = JSON.parse(session);
  await loadPayrollMode();
  await fetchEmployees(currentUser);
});

function logout() {
  localStorage.removeItem("emp_session");
  window.location.href = "employee_portal.html";
}

function formatDate(dob) {
  return new Date(dob).toISOString().split("T")[0];
}

function showToast(msg) {
  const toast = document.createElement("div");
  toast.className = "fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded shadow-lg z-50";
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

async function loadPayrollMode() {
  const res = await fetch("/.netlify/functions/get_payroll_mode");
  const data = await res.json();
  const toggle = document.getElementById("payrollToggle");
  const status = document.getElementById("toggleStatus");

  toggle.value = data.mode || "freelance";
  status.textContent = `${toggle.value.toUpperCase()} payroll mode is active`;
  status.className = toggle.value === "freelance"
    ? "ml-4 px-3 py-1 rounded text-sm font-semibold bg-yellow-500 text-black"
    : "ml-4 px-3 py-1 rounded text-sm font-semibold bg-green-600 text-white";

  document.getElementById("confirmPayroll").onclick = async () => {
    const selected = toggle.value;
    if (!selected) return showToast("Please select a payroll mode first.");
    const res = await fetch("/.netlify/functions/set_payroll_mode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: selected }),
    });
    const data = await res.json();
    showToast(data.message || `Payroll mode updated`);
    loadPayrollMode();
  };
}

async function fetchEmployees(currentUser) {
  const res = await fetch("/.netlify/functions/get_employees", { credentials: "include" });
  if (!res.ok) return;

  const { employees } = await res.json();
  const table = document.getElementById("employeeTable");

  employees.forEach(emp => {
    const pinDisabled = emp.failed_pin_attempts < 3 ? 'opacity-50 cursor-not-allowed' : '';
    const mfaDisabled = emp.failed_mfa_attempts < 3 ? 'opacity-50 cursor-not-allowed' : '';

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="border p-2 cursor-pointer text-blue-400 hover:underline" onclick="showEmployeeDetails('${emp.emp_id}')">${emp.emp_id}</td>
      <td class="border p-2">${emp.name}</td>
      <td class="border p-2">${emp.phone || '-'}</td>
      <td class="border p-2">${emp.dob ? formatDate(emp.dob) : '-'}</td>
      <td class="border p-2">
        <select class="bg-gray-700 border border-gray-600 px-2 py-1 rounded role-select text-sm text-white">
          <option value="employee" ${emp.role === 'employee' ? 'selected' : ''}>User</option>
          <option value="admin" ${emp.role === 'admin' ? 'selected' : ''}>Admin</option>
        </select>
        <button class="confirm-role bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded text-xs">Confirm</button>
      </td>
      <td class="border p-2">${emp.department || '-'}</td>
      <td class="border p-2 space-x-1">
        <button class="reset-pin bg-blue-500 px-2 py-1 rounded text-xs ${pinDisabled}" ${emp.failed_pin_attempts < 3 ? 'disabled' : ''}>Reset PIN</button>
        <button class="reset-mfa bg-yellow-500 px-2 py-1 rounded text-xs ${mfaDisabled}" ${emp.failed_mfa_attempts < 3 ? 'disabled' : ''}>Reset MFA</button>
        <button class="edit bg-purple-500 px-2 py-1 rounded text-xs">Edit</button>
        <button class="delete bg-red-500 px-2 py-1 rounded text-xs">Delete</button>
      </td>`;
    table.appendChild(tr);

    setupRowListeners(tr, emp, currentUser);
  });

  const me = employees.find(e => e.emp_id === currentUser.emp_id);
  if (me) {
    document.getElementById("p_name").textContent = me.name;
    document.getElementById("p_phone").textContent = me.phone;
    document.getElementById("p_dob").textContent = formatDate(me.dob);
    document.getElementById("p_dept").textContent = me.department;
    document.getElementById("p_role").textContent = me.role;
    document.getElementById("adminName").textContent = me.name;
  }
}

function setupRowListeners(tr, emp, currentUser) {
  tr.querySelector(".confirm-role").onclick = () => {
    const newRole = tr.querySelector(".role-select").value;
    fetch("/.netlify/functions/update_role", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emp_id: emp.emp_id, role: newRole })
    })
      .then(res => res.json())
      .then(data => showToast(data.message || `Role updated`));
  };

  if (emp.failed_pin_attempts >= 3) {
    tr.querySelector(".reset-pin").onclick = () => {
      fetch("/.netlify/functions/reset_pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emp_id: emp.emp_id })
      })
      .then(res => res.json())
      .then(() => showToast("PIN reset by admin. Please refresh the page to continue."));
    };
  }

  if (emp.failed_mfa_attempts >= 3) {
    tr.querySelector(".reset-mfa").onclick = async () => {
      const res = await fetch("/.netlify/functions/reset_mfa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emp_id: emp.emp_id })
      });
      const data = await res.json();
      showToast("MFA token reset by admin. Please refresh the page to continue.");

      const modal = document.createElement("div");
      modal.innerHTML = `
        <div class="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50">
          <div class="bg-white text-black p-6 rounded-lg max-w-md shadow-xl">
            <h2 class="text-lg font-bold mb-4">MFA Reset for ${emp.name}</h2>
            <img src="${data.qr_code_url}" class="mx-auto mb-4 w-40 h-40" />
            <p class="text-sm mb-2"><strong>Secure Key:</strong> <span id="secureKey">${data.secret_key}</span></p>
            <button onclick="navigator.clipboard.writeText('${data.secret_key}')" class="bg-gray-800 text-white px-3 py-1 rounded">Copy Key</button>
            <button onclick="this.closest('.fixed').remove()" class="bg-red-600 text-white px-4 py-2 rounded ml-4">Close</button>
          </div>
        </div>`;
      document.body.appendChild(modal);
    };
  }

  tr.querySelector(".edit").onclick = async () => {
    const token = prompt("Enter your MFA token to edit:");
    if (!token) return;

    const res = await fetch("/.netlify/functions/verify_mfa_token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ admin_id: currentUser.emp_id, token })
    });
    const result = await res.json();
    if (!result.valid) return showToast("❌ Invalid MFA token.");

    const modal = document.createElement("div");
    modal.innerHTML = `
      <div class="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
        <div class="bg-white text-black p-6 rounded shadow max-w-md w-full">
          <h2 class="text-lg font-bold mb-4">Edit Profile - ${emp.name}</h2>
          <label>Email: <input type="email" class="w-full border p-1" id="editEmail" value="${emp.email}"></label>
          <label>Phone: <input type="text" class="w-full border p-1" id="editPhone" value="${emp.phone}"></label>
          <label>DOB: <input type="date" class="w-full border p-1" id="editDob" value="${formatDate(emp.dob)}"></label>
          <label>Department:
            <select id="editDept" class="w-full border p-1">
              <option value="Tech Team">Tech Team</option>
              <option value="Admin Team">Admin Team</option>
            </select>
          </label>
          <label>Role:
            <select id="editRole" class="w-full border p-1"></select>
          </label>
          <label>Salary (INR): <input type="number" id="editSalary" class="w-full border p-1" value="${emp.base_salary || ''}"></label>
          <div class="flex justify-end gap-2 mt-4">
            <button onclick="this.closest('.fixed').remove()" class="bg-gray-600 text-white px-4 py-1 rounded">Cancel</button>
            <button class="bg-blue-600 text-white px-4 py-1 rounded" id="saveEditBtn">Save</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(modal);

    const roleOptions = {
      "Tech Team": [
        "Frontend Developer (Jr. Developer)",
        "Backend Developer (Jr. Developer)",
        "Full Stack Developer / Mobile App Developer (Sr. Developer)",
        "QA Engineer (Sr. Developer)",
        "White labelling (UI/UX Designer)",
        "DevOps Engineer (Infrastructure Engineer)",
        "Data Analyst",
        "Cybersecurity & Risk Analyst",
        "IT Systems Administrator",
        "IT Support Specialist"
      ],
      "Admin Team": [
        "Human Resources Manager",
        "Chief Executive Officer",
        "Finance & Accounts Officer",
        "Managing Director (MD)",
        "Regulatory Compliance Officer",
        "Client Relations Consultant",
        "Administrative Coordinator",
        "Customer Success Executive"
      ]
    };

    const deptSelect = modal.querySelector("#editDept");
    const roleSelect = modal.querySelector("#editRole");
    deptSelect.value = emp.department;

    function populateRoles(dept) {
      roleSelect.innerHTML = `<option value="">Select Role</option>`;
      (roleOptions[dept] || []).forEach(role => {
        const opt = document.createElement("option");
        opt.value = role;
        opt.textContent = role;
        roleSelect.appendChild(opt);
      });
    }

    deptSelect.onchange = () => populateRoles(deptSelect.value);
    populateRoles(deptSelect.value);
    roleSelect.value = emp.role;

    modal.querySelector("#saveEditBtn").onclick = async () => {
      const payload = {
        emp_id: emp.emp_id,
        email: modal.querySelector("#editEmail").value,
        phone: modal.querySelector("#editPhone").value,
        dob: modal.querySelector("#editDob").value,
        department: modal.querySelector("#editDept").value,
        role: modal.querySelector("#editRole").value,
        base_salary: modal.querySelector("#editSalary").value
      };

      const saveRes = await fetch("/.netlify/functions/update_employee_profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const result = await saveRes.json();
      if (result.success) {
        showToast("✅ Profile updated");
        modal.remove();
        setTimeout(() => location.reload(), 1000);
      } else {
        alert("❌ Failed to update profile");
      }
    };
  };

  tr.querySelector(".delete").onclick = async () => {
    if (emp.emp_id === currentUser.emp_id) return;
    if (!confirm(`Delete ${emp.emp_id}?`)) return;

    const token = prompt("Enter your MFA token:");
    const res = await fetch("/.netlify/functions/verify_mfa_token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ admin_id: currentUser.emp_id, token })
    });

    const result = await res.json();
    if (!result.valid) return showToast("❌ MFA verification failed.");

    const delRes = await fetch("/.netlify/functions/delete_employee", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emp_id: emp.emp_id })
    });

    const final = await delRes.json();
    tr.remove();
    showToast(final.message || "Employee deleted");
  };
}
