// admin_dashboard.js (Final Version with MFA + Modal Logic)

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
  status.textContent = `${toggle.value.charAt(0).toUpperCase() + toggle.value.slice(1)} payroll mode is active`;
  status.className = toggle.value === "freelance"
    ? "ml-4 px-3 py-1 rounded text-sm font-semibold bg-yellow-500 text-black"
    : "ml-4 px-3 py-1 rounded text-sm font-semibold bg-green-600 text-white";

  document.getElementById("confirmPayroll").onclick = async () => {
    const selected = toggle.value;
    if (!selected) return showToast("Please select a payroll mode first.");

    const res = await fetch("/.netlify/functions/set_payroll_mode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: selected })
    });

    const data = await res.json();
    showToast(data.message || `Payroll mode updated`);
    loadPayrollMode();
  };
}

async function fetchEmployees(currentUser) {
  const res = await fetch("/.netlify/functions/get_employees", { credentials: "include" });
  if (!res.ok) return console.warn("❌ get_employees failed:", res.status);

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
      <td class="border p-2 flex items-center gap-2 justify-center">
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

  const resetPinBtn = tr.querySelector(".reset-pin");
  if (emp.failed_pin_attempts >= 3) {
    resetPinBtn.disabled = false;
    resetPinBtn.onclick = () => triggerReset("reset_pin", emp.emp_id, "PIN reset by admin. Please refresh.");
  }

  const resetMfaBtn = tr.querySelector(".reset-mfa");
  if (emp.failed_mfa_attempts >= 3) {
    resetMfaBtn.disabled = false;
    resetMfaBtn.onclick = async () => {
      const res = await fetch("/.netlify/functions/reset_mfa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emp_id: emp.emp_id })
      });
      const data = await res.json();
      showToast("MFA reset by admin. Please refresh and scan QR.");

      const modal = document.createElement("div");
      modal.innerHTML = `
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div class="bg-white text-black p-6 rounded shadow-lg max-w-sm">
            <h2 class="text-lg font-bold mb-2">Scan MFA QR Code</h2>
            <img src="${data.qr_code_url}" class="w-40 h-40 mx-auto mb-2" />
            <p class="text-sm break-all mb-2"><strong>Key:</strong> ${data.secret_key}</p>
            <button onclick="navigator.clipboard.writeText('${data.secret_key}')" class="bg-blue-600 text-white px-3 py-1 rounded">Copy Key</button>
            <button onclick="this.closest('.fixed').remove()" class="mt-3 bg-red-600 text-white px-4 py-1 rounded block w-full">Close</button>
          </div>
        </div>`;
      document.body.appendChild(modal);
    };
  }

  tr.querySelector(".edit").onclick = async () => {
    const modal = document.createElement("div");
    modal.innerHTML = `
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white text-black p-6 rounded shadow-lg w-full max-w-md">
          <h2 class="text-lg font-semibold mb-4">Edit - ${emp.name}</h2>
          <label>Email: <input id="editEmail" value="${emp.email}" type="email" class="w-full border px-2 py-1 mb-2" /></label>
          <label>Phone: <input id="editPhone" value="${emp.phone}" type="tel" maxlength="10" class="w-full border px-2 py-1 mb-2" /></label>
          <label>Department:
            <select id="editDept" class="w-full border px-2 py-1 mb-2">
              <option value="">-- Select --</option>
              <option value="Tech Team" ${emp.department === "Tech Team" ? "selected" : ""}>Tech Team</option>
              <option value="Admin Team" ${emp.department === "Admin Team" ? "selected" : ""}>Admin Team</option>
            </select>
          </label>
          <label>Role:
            <select id="editRole" class="w-full border px-2 py-1 mb-2">
              <option value="">-- Select Role --</option>
            </select>
          </label>
          <label>Salary (INR): <input id="editSalary" value="${emp.base_salary}" type="number" class="w-full border px-2 py-1 mb-4" /></label>
          <div class="flex justify-between">
            <button class="bg-gray-600 text-white px-4 py-1 rounded" onclick="this.closest('.fixed').remove()">Cancel</button>
            <button class="bg-blue-700 text-white px-4 py-1 rounded" onclick="submitEdit('${emp.emp_id}', this)">Save</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(modal);

    const dept = modal.querySelector("#editDept");
    const role = modal.querySelector("#editRole");

    const roles = {
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
        "Finance & Accounts Officer",
        "Managing Director (MD)",
        "Regulatory Compliance Officer",
        "Client Relations Consultant",
        "Administrative Coordinator",
        "Customer Success Executive"
      ]
    };

    function updateRoleOptions(deptVal) {
      role.innerHTML = '<option value="">-- Select Role --</option>';
      if (roles[deptVal]) {
        roles[deptVal].forEach(r => {
          const opt = document.createElement("option");
          opt.value = r;
          opt.textContent = r;
          if (r === emp.role) opt.selected = true;
          role.appendChild(opt);
        });
      }
    }

    dept.addEventListener("change", () => updateRoleOptions(dept.value));
    updateRoleOptions(emp.department);
  };

  tr.querySelector(".delete").onclick = async () => {
    if (emp.emp_id === currentUser.emp_id) return;
    if (!confirm(`Delete ${emp.emp_id}?`)) return;

    const token = prompt("Enter your MFA token:");
    if (!token) return;

    const verify = await fetch("/.netlify/functions/verify_mfa_token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ admin_id: currentUser.emp_id, token })
    });
    const result = await verify.json();
    if (!result.valid) return showToast("❌ MFA failed");

    const res = await fetch("/.netlify/functions/delete_employee", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emp_id: emp.emp_id })
    });
    const data = await res.json();
    tr.remove();
    showToast(data.message || "Deleted");
  };
}

function triggerReset(type, empId, message) {
  fetch(`/.netlify/functions/${type}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ emp_id: empId })
  })
    .then(res => res.json())
    .then(() => showToast(message))
    .catch(err => console.error(`${type} failed:`, err));
}

async function submitEdit(empId, btn) {
  const parent = btn.closest(".fixed");

  // Collect values from form inputs
  const email = parent.querySelector("#editEmail")?.value.trim();
  const phone = parent.querySelector("#editPhone")?.value.trim();
  const dob = parent.querySelector("#editDob")?.value;
  const department = parent.querySelector("#editDept")?.value;
  const role = parent.querySelector("#editRole")?.value;
  const base_salary = parent.querySelector("#editSalary")?.value;

  // Basic validation
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return showToast("❌ Invalid email format");
  }

  if (!/^\d{10}$/.test(phone)) {
    return showToast("❌ Phone must be 10 digits");
  }

  // MFA verification (unless NGX001)
  const currentUser = JSON.parse(localStorage.getItem("emp_session") || "{}");
  if (currentUser.emp_id !== "NGX001") {
    const token = prompt("Enter your MFA token to confirm changes:");
    if (!token) return;

    const verify = await fetch("/.netlify/functions/verify_mfa_token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        admin_id: currentUser.emp_id,
        token
      })
    });

    const result = await verify.json();
    if (!result.valid) {
      return showToast("❌ MFA verification failed.");
    }
  }

  // Proceed with profile update
  const res = await fetch("/.netlify/functions/update_employee_profile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      emp_id: empId,
      email,
      phone,
      dob,
      department,
      role,
      base_salary
    })
  });

  const result = await res.json();
  if (res.ok) {
    showToast(result.message || "✅ Profile updated");
    parent.remove();
    setTimeout(() => window.location.reload(), 800);
  } else {
    showToast("❌ Failed to update profile");
    console.error(result);
  }
}


window.showEmployeeDetails = async function(empId) {
  const res = await fetch(`/.netlify/functions/get_employee_profile?emp_id=${empId}`);
  const data = await res.json();
  document.getElementById('modalEmpId').textContent = `Employee ID: ${empId}`;
  document.getElementById('modalDetails').innerHTML = `
    <p><strong>Name:</strong> ${data.name}</p>
    <p><strong>Email:</strong> ${data.email}</p>
    <p><strong>Phone:</strong> ${data.phone}</p>
    <p><strong>DOB:</strong> ${data.dob}</p>
    <p><strong>Department:</strong> ${data.department}</p>
    <p><strong>Role:</strong> ${data.role}</p>
    <p><strong>Total Pay:</strong> ₹${data.total_pay}</p>
    <p><strong>Total Hours:</strong> ${data.total_hours} hrs</p>
  `;
  const docList = document.getElementById("docLinks");
  docList.innerHTML = '';
  if (data.documents?.length > 0) {
    data.documents.forEach(doc => {
      const li = document.createElement("li");
      li.innerHTML = `<a href="${doc.url}" class="text-blue-600 underline" target="_blank">View ${doc.name}</a> | 
                      <a href="${doc.url}" download class="text-green-600 underline">Download</a>`;
      docList.appendChild(li);
    });
  } else {
    docList.innerHTML = '<li>No documents uploaded</li>';
  }
  document.getElementById("employeeModal").classList.remove("hidden");
};

window.closeModal = function () {
  document.getElementById("employeeModal").classList.add("hidden");
};
