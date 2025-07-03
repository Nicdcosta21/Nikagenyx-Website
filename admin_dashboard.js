
// admin_dashboard.js (Final version with Edit modal, PIN/MFA lock, secure delete)

document.addEventListener("DOMContentLoaded", async () => {
  const session = localStorage.getItem("emp_session");
  if (!session) return (window.location.href = "/employee_portal.html");

  console.log("🚀 admin_dashboard.js loaded");
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
  toast.className =
    "fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded shadow-lg z-50";
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
      body: JSON.stringify({ mode: selected }),
    });

    const result = await res.json();
    showToast(result.message || `Payroll mode updated`);
    loadPayrollMode();
  };
}

async function fetchEmployees(currentUser) {
  const res = await fetch("/.netlify/functions/get_employees", { credentials: "include" });
  if (!res.ok) return console.warn("❌ get_employees failed:", res.status);

  const { employees } = await res.json();
  const table = document.getElementById("employeeTable");

  employees.forEach(emp => {
    // Determine if buttons should be disabled
    const pinDisabled = emp.failed_pin_attempts < 3;
    const mfaDisabled = emp.failed_mfa_attempts < 3;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="border p-2 cursor-pointer text-blue-400 hover:underline" title="View full profile" onclick="showEmployeeDetails('${emp.emp_id}')">${emp.emp_id}</td>
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
        <button class="reset-pin bg-blue-500 px-2 py-1 rounded text-xs" ${pinDisabled ? 'disabled' : ''}>
          Reset PIN
        </button>
        <button class="reset-mfa bg-yellow-500 px-2 py-1 rounded text-xs" ${mfaDisabled ? 'disabled' : ''}>
          Reset MFA
        </button>
        <button class="edit bg-purple-500 px-2 py-1 rounded text-xs">Edit</button>
        <button class="delete bg-red-500 px-2 py-1 rounded text-xs">Delete</button>
      </td>`;

    // Apply visual styling based on disabled state
    const pinBtn = tr.querySelector('.reset-pin');
    const mfaBtn = tr.querySelector('.reset-mfa');
    
    if (pinDisabled) {
        pinBtn.classList.add('reset-btn-disabled');
    }
    if (mfaDisabled) {
        mfaBtn.classList.add('reset-btn-disabled');
    }

    table.appendChild(tr);
    setupRowListeners(tr, emp, currentUser);
});


}

  const me = employees.find(e => e.emp_id === currentUser.emp_id);
  if (me) {
    document.getElementById("p_name").textContent = me.name || "-";
    document.getElementById("p_phone").textContent = me.phone || "-";
    document.getElementById("p_dob").textContent = me.dob ? formatDate(me.dob) : "-";
    document.getElementById("p_dept").textContent = me.department || "-";
    document.getElementById("p_role").textContent = me.role || "-";
    document.getElementById("adminName").textContent = me.name || "Admin";
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
    .then(data => showToast(data.message || `Role updated`))
    .catch(err => console.error("Role change failed:", err));
  };

  if (emp.failed_pin_attempts >= 3) {
    tr.querySelector(".reset-pin").onclick = () =>
      triggerReset("reset_pin", emp.emp_id, "PIN reset by admin. Please refresh the page to continue.");
  }

  if (emp.failed_mfa_attempts >= 3) {
    tr.querySelector(".reset-mfa").onclick = () =>
      triggerReset("reset_mfa", emp.emp_id, "MFA token reset by admin. Please refresh the page to continue.");
  }

  tr.querySelector(".edit").onclick = () => {
    const modal = document.createElement("div");
    modal.innerHTML = `
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white text-black p-6 rounded shadow-lg max-w-sm w-full">
        <h2 class="text-lg font-bold mb-2">Edit Profile - ${emp.name}</h2>
        <label class="block mb-2">Email: <input id="editEmail" class="w-full border px-2 py-1" value="${emp.email || ''}" /></label>
        <label class="block mb-2">Phone: <input id="editPhone" class="w-full border px-2 py-1" value="${emp.phone || ''}" /></label>
        <label class="block mb-2">Department:
          <select id="editDept" class="w-full border px-2 py-1">
            <option value="Tech Team">Tech Team</option>
            <option value="Admin Team">Admin Team</option>
          </select>
        </label>
        <label class="block mb-2">Role:
          <select id="editRole" class="w-full border px-2 py-1">
            <option value="">Select Role</option>
          </select>
        </label>
        <label class="block mb-2">Base Salary:
          <input type="number" id="editSalary" class="w-full border px-2 py-1" value="${emp.base_salary || ''}">
        </label>
        <label class="block mb-2">MFA Token:
          <input type="text" id="editMfaToken" class="w-full border px-2 py-1" placeholder="Enter your MFA token">
        </label>
        <div class="flex justify-end gap-2 mt-4">
          <button onclick="this.closest('.fixed').remove()" class="bg-gray-600 text-white px-4 py-1 rounded">Cancel</button>
          <button id="saveEditBtn" class="bg-blue-600 text-white px-4 py-1 rounded">Save</button>
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
    deptSelect.value = emp.department || "";
    updateRoleDropdown(emp.department || "");

    function updateRoleDropdown(dept) {
      roleSelect.innerHTML = '<option value="">Select Role</option>';
      if (roleOptions[dept]) {
        roleOptions[dept].forEach(role => {
          const opt = document.createElement("option");
          opt.value = role;
          opt.textContent = role;
          roleSelect.appendChild(opt);
        });
      }
      roleSelect.value = emp.role || "";
    }

    deptSelect.addEventListener("change", () => updateRoleDropdown(deptSelect.value));

    modal.querySelector("#saveEditBtn").onclick = async () => {
      const email = modal.querySelector("#editEmail").value;
      const phone = modal.querySelector("#editPhone").value;
      const department = modal.querySelector("#editDept").value;
      const role = modal.querySelector("#editRole").value;
      const base_salary = modal.querySelector("#editSalary").value;
      const token = modal.querySelector("#editMfaToken").value;

      const res = await fetch("/.netlify/functions/verify_mfa_token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admin_id: currentUser.emp_id, token })
      });

      const verify = await res.json();
      if (!verify.valid) return showToast("❌ Invalid MFA token");

      await fetch("/.netlify/functions/update_employee_profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emp_id: emp.emp_id, email, phone, department, role, base_salary })
      })
        .then(res => res.json())
        .then(data => {
          showToast(data.message || "Profile updated");
          modal.remove();
          setTimeout(() => location.reload(), 1000);
        });
    };
  };

  tr.querySelector(".delete").onclick = async () => {
    if (emp.emp_id === currentUser.emp_id) return;
    if (!confirm(`Delete ${emp.emp_id}?`)) return;

    const token = prompt("Enter your MFA token to confirm deletion:");
    if (!token) return;

    const res = await fetch("/.netlify/functions/verify_mfa_token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ admin_id: currentUser.emp_id, token })
    });

    const verified = await res.json();
    if (!verified.valid) return showToast("❌ MFA verification failed.");

    fetch("/.netlify/functions/delete_employee", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emp_id: emp.emp_id })
    })
    .then(res => res.json())
    .then(data => {
      tr.remove();
      showToast(data.message || "Employee deleted");
    });
  };
}

// Updated admin_dashboard.js with Reset PIN and Reset MFA modals

// ... (previous code remains the same until the triggerReset function)

function triggerReset(type, empId, message) {
  if (type === "reset_pin") {
    showPinResetModal(empId);
  } else if (type === "reset_mfa") {
    showMfaResetModal(empId);
  } else {
    fetch(`/.netlify/functions/${type}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emp_id: empId })
    })
    .then(res => res.json())
    .then(() => showToast(message))
    .catch(err => console.error(`${type} failed:`, err));
  }
}

function showPinResetModal(empId) {
  const modal = document.createElement("div");
  modal.innerHTML = `
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white text-black p-6 rounded shadow-lg max-w-sm w-full">
      <h2 class="text-lg font-bold mb-4">Reset PIN for Employee ${empId}</h2>
      <div class="space-y-4">
        <div>
          <label class="block mb-1">Enter New 4-digit PIN:</label>
          <input type="password" id="newPin" class="w-full border px-3 py-2 rounded" maxlength="4" pattern="\d{4}" inputmode="numeric">
        </div>
        <div>
          <label class="block mb-1">Confirm New PIN:</label>
          <input type="password" id="confirmPin" class="w-full border px-3 py-2 rounded" maxlength="4" pattern="\d{4}" inputmode="numeric">
        </div>
        <div class="flex justify-end gap-2 mt-4">
          <button onclick="this.closest('.fixed').remove()" class="bg-gray-600 text-white px-4 py-2 rounded">Cancel</button>
          <button id="confirmPinReset" class="bg-blue-600 text-white px-4 py-2 rounded">Confirm</button>
        </div>
      </div>
    </div>
  </div>`;
  document.body.appendChild(modal);

  modal.querySelector("#confirmPinReset").onclick = async () => {
    const newPin = modal.querySelector("#newPin").value;
    const confirmPin = modal.querySelector("#confirmPin").value;

    if (!newPin || !confirmPin) {
      return showToast("❌ Please enter and confirm your PIN");
    }
    if (newPin.length !== 4 || !/^\d+$/.test(newPin)) {
      return showToast("❌ PIN must be exactly 4 digits");
    }
    if (newPin !== confirmPin) {
      return showToast("❌ PINs do not match");
    }

    const res = await fetch("/.netlify/functions/reset_pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emp_id: empId, new_pin: newPin })
    });

    const result = await res.json();
    if (result.success) {
      showCountdownToast("PIN reset successfully. Logging in 3... 2... 1...", () => {
        modal.remove();
      });
    } else {
      showToast(result.message || "❌ PIN reset failed");
    }
  };
}

function showMfaResetModal(empId) {
  const modal = document.createElement("div");
  modal.innerHTML = `
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white text-black p-6 rounded shadow-lg max-w-sm w-full">
      <h2 class="text-lg font-bold mb-4">Reset MFA for Employee ${empId}</h2>
      <div class="space-y-4">
        <div id="mfaInstructions">
          <p class="mb-4">MFA token reset by admin. Please keep your authenticator app (Google Authenticator recommended) ready.</p>
          <button id="continueMfaBtn" class="bg-blue-600 text-white px-4 py-2 rounded w-full">Continue</button>
        </div>
        <div id="mfaSetup" class="hidden">
          <div class="text-center mb-4">
            <p class="mb-2">Scan this QR code with your authenticator app:</p>
            <div id="qrCodeContainer" class="flex justify-center mb-4"></div>
            <div class="mb-4">
              <p class="mb-1">Or enter this key manually:</p>
              <div class="flex items-center justify-center">
                <code id="mfaSecret" class="bg-gray-100 p-2 rounded mr-2"></code>
                <button id="copySecretBtn" class="bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded text-sm">Copy</button>
              </div>
            </div>
            <div>
              <label class="block mb-1">Enter 6-digit token from your app:</label>
              <input type="text" id="mfaToken" class="w-full border px-3 py-2 rounded text-center" maxlength="6" pattern="\d{6}" inputmode="numeric">
            </div>
          </div>
          <div class="flex justify-end gap-2 mt-4">
            <button onclick="this.closest('.fixed').remove()" class="bg-gray-600 text-white px-4 py-2 rounded">Cancel</button>
            <button id="confirmMfaBtn" class="bg-blue-600 text-white px-4 py-2 rounded">Confirm</button>
          </div>
        </div>
      </div>
    </div>
  </div>`;
  document.body.appendChild(modal);

  modal.querySelector("#continueMfaBtn").onclick = async () => {
    const res = await fetch("/.netlify/functions/reset_mfa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emp_id: empId })
    });

    const result = await res.json();
    if (result.success) {
      modal.querySelector("#mfaInstructions").classList.add("hidden");
      modal.querySelector("#mfaSetup").classList.remove("hidden");
      
      // Display QR code (assuming the function returns a QR code URL or data)
      const qrContainer = modal.querySelector("#qrCodeContainer");
      qrContainer.innerHTML = `<img src="${result.qr_code_url}" alt="MFA QR Code" class="w-48 h-48">`;
      
      modal.querySelector("#mfaSecret").textContent = result.secret_key;
      
      modal.querySelector("#copySecretBtn").onclick = () => {
        navigator.clipboard.writeText(result.secret_key);
        showToast("Secret key copied to clipboard");
      };
    } else {
      showToast(result.message || "❌ MFA reset failed");
    }
  };

  modal.querySelector("#confirmMfaBtn").onclick = async () => {
    const token = modal.querySelector("#mfaToken").value;
    
    if (!token || token.length !== 6 || !/^\d+$/.test(token)) {
      return showToast("❌ Please enter a valid 6-digit token");
    }

    const res = await fetch("/.netlify/functions/verify_mfa_token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emp_id: empId, token })
    });

    const result = await res.json();
    if (result.valid) {
      showCountdownToast("MFA setup complete. Logging in 3... 2... 1...", () => {
        modal.remove();
      });
    } else {
      showToast("❌ Invalid token. Please try again.");
    }
  };
}

function showCountdownToast(message, callback) {
  const toast = document.createElement("div");
  toast.className = "fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded shadow-lg z-50";
  toast.textContent = message;
  document.body.appendChild(toast);
  
  let count = 3;
  const interval = setInterval(() => {
    count--;
    if (count > 0) {
      toast.textContent = message.replace(/\d+/, count);
    } else {
      clearInterval(interval);
      toast.remove();
      if (callback) callback();
      // Here you would typically redirect or trigger login
      // For now we'll just refresh
      setTimeout(() => window.location.reload(), 500);
    }
  }, 1000);
}

// ... (rest of the existing code remains the same)

window.showEmployeeDetails = async function(empId) {
  try {
    const res = await fetch(`/.netlify/functions/get_employee_profile?emp_id=${empId}`);
    const data = await res.json();

    document.getElementById('modalEmpId').textContent = `Employee ID: ${empId}`;
    const detailsHTML = `
      <p><strong>Name:</strong> ${data.name}</p>
      <p><strong>Email:</strong> ${data.email}</p>
      <p><strong>Phone:</strong> ${data.phone}</p>
      <p><strong>DOB:</strong> ${data.dob}</p>
      <p><strong>Department:</strong> ${data.department}</p>
      <p><strong>Role:</strong> ${data.role}</p>
      <p><strong>Total Pay:</strong> ₹${data.total_pay}</p>
      <p><strong>Total Hours:</strong> ${data.total_hours} hrs</p>
    `;
    document.getElementById('modalDetails').innerHTML = detailsHTML;

    const docList = document.getElementById('docLinks');
    docList.innerHTML = '';
    if (data.documents?.length) {
      data.documents.forEach(doc => {
        const li = document.createElement('li');
        li.innerHTML = `<a href="${doc.url}" class="text-blue-600 underline" target="_blank">View ${doc.name}</a> | 
                        <a href="${doc.url}" download class="text-green-600 underline">Download</a>`;
        docList.appendChild(li);
      });
    } else {
      docList.innerHTML = '<li>No documents uploaded</li>';
    }

    document.getElementById('employeeModal').classList.remove('hidden');
  } catch (err) {
    alert("❌ Failed to fetch employee details.");
    console.error(err);
  }
};

window.closeModal = function () {
  document.getElementById('employeeModal').classList.add('hidden');
};
