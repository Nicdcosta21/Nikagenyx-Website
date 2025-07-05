// admin_dashboard.js (Refactored for Modals, MFA Security, and Dynamic Updates)

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
  if (!dob) return '-';
  return new Date(dob).toISOString().split("T")[0];
}

function showToast(msg, isError = false) {
  const toast = document.createElement("div");
  const bgColor = isError ? "bg-red-600" : "bg-green-600";
  toast.className = `fixed bottom-4 right-4 ${bgColor} text-white px-4 py-2 rounded shadow-lg z-50`;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

//--- DATA FETCHING & INITIALIZATION ---//

async function loadPayrollMode() {
  try {
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
      if (!selected) return showToast("Please select a payroll mode first.", true);

      const res = await fetch("/.netlify/functions/set_payroll_mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: selected }),
      });
      const result = await res.json();
      showToast(result.message || `Payroll mode updated`);
      loadPayrollMode();
    };
  } catch (err) {
    console.error("Failed to load payroll mode:", err);
  }
}

async function fetchEmployees(currentUser) {
  try {
    const res = await fetch("/.netlify/functions/get_employees", { credentials: "include" });
    if (!res.ok) throw new Error(`Failed to fetch employees: ${res.status}`);
    
    const { employees } = await res.json();
    const table = document.getElementById("employeeTable");
    table.innerHTML = ''; // Clear existing table

    employees.forEach(emp => {
      const tr = document.createElement("tr");
      tr.id = `row-${emp.emp_id}`;
      tr.innerHTML = `
        <td class="border p-2 cursor-pointer text-blue-400 hover:underline" title="View full profile" onclick="showEmployeeDetails('${emp.emp_id}')">${emp.emp_id}</td>
        <td class="border p-2" data-field="name">${emp.name}</td>
        <td class="border p-2" data-field="phone">${emp.phone || '-'}</td>
        <td class="border p-2" data-field="dob">${formatDate(emp.dob)}</td>
        <td class="border p-2 flex items-center gap-2 justify-center">
          <select class="bg-gray-700 border border-gray-600 px-2 py-1 rounded role-select text-sm text-white" data-field="role-select">
            <option value="employee" ${emp.role === 'employee' ? 'selected' : ''}>User</option>
            <option value="admin" ${emp.role === 'admin' ? 'selected' : ''}>Admin</option>
          </select>
          <button class="confirm-role bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded text-xs">Confirm</button>
        </td>
        <td class="border p-2" data-field="department">${emp.department || '-'}</td>
        <td class="border p-2 space-x-1">
          <button class="reset-pin bg-blue-500 px-2 py-1 rounded text-xs" data-text="Reset PIN" ${emp.failed_pin_attempts < 3 ? 'disabled' : ''}>Reset PIN</button>
          <button class="reset-mfa bg-yellow-500 px-2 py-1 rounded text-xs" data-text="Reset MFA" ${emp.failed_mfa_attempts < 3 ? 'disabled' : ''}>Reset MFA</button>
          <button class="edit bg-purple-500 hover:bg-purple-600 px-2 py-1 rounded text-xs">Edit</button>
          <button class="delete bg-red-500 hover:bg-red-600 px-2 py-1 rounded text-xs" ${emp.emp_id === currentUser.emp_id ? 'disabled' : ''}>Delete</button>
        </td>`;

      table.appendChild(tr);
      
      // Explicitly set disabled state for buttons
      const resetPinBtn = tr.querySelector('.reset-pin');
      const resetMfaBtn = tr.querySelector('.reset-mfa');
      resetPinBtn.disabled = emp.failed_pin_attempts < 3;
      resetMfaBtn.disabled = emp.failed_mfa_attempts < 3;
      
      setupRowListeners(tr, emp, currentUser);
    });

    const me = employees.find(e => e.emp_id === currentUser.emp_id);
    if (me) {
      document.getElementById("p_name").textContent = me.name || "-";
      document.getElementById("p_phone").textContent = me.phone || "-";
      document.getElementById("p_dob").textContent = formatDate(me.dob);
      document.getElementById("p_dept").textContent = me.department || "-";
      document.getElementById("p_role").textContent = me.role || "-";
      document.getElementById("adminName").textContent = me.name || "Admin";
    }
  } catch (err) {
    console.warn("❌ Error fetching employees:", err);
    showToast("Failed to load employee data.", true);
  }
}

//--- ROW ACTION LISTENERS ---//

function setupRowListeners(tr, emp, currentUser) {
  // ROLE CHANGE
  tr.querySelector(".confirm-role").onclick = () => {
    const newRole = tr.querySelector(".role-select").value;
    fetch("/.netlify/functions/update_role", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emp_id: emp.emp_id, role: newRole })
    })
    .then(res => res.json())
    .then(data => showToast(data.message || `Role updated for ${emp.emp_id}`))
    .catch(err => showToast("Role change failed.", true));
  };

  // RESET PIN
  tr.querySelector(".reset-pin").onclick = () => showPinResetModal(emp.emp_id);
  
  // RESET MFA
  tr.querySelector(".reset-mfa").onclick = () => showMfaResetModal(emp.emp_id);

  // EDIT
  tr.querySelector(".edit").onclick = () => showEditModal(tr, emp, currentUser);

  // DELETE
  tr.querySelector(".delete").onclick = async () => {
    if (emp.emp_id === currentUser.emp_id) return;
    if (!confirm(`Are you sure you want to delete ${emp.name} (${emp.emp_id})? This action is irreversible.`)) return;

    let token = '';
    const isSuperAdmin = currentUser.emp_id === 'NGX001';

    if (!isSuperAdmin) {
      token = prompt("To confirm deletion, please enter your MFA token:");
      if (token === null) return; // User cancelled prompt
      if (!token) return showToast("MFA token is required for deletion.", true);
    }

    try {
        const res = await fetch("/.netlify/functions/delete_employee", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                emp_id_to_delete: emp.emp_id,
                admin_id: currentUser.emp_id,
                admin_token: token
            })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Deletion failed.');
        
        tr.remove();
        showToast(data.message || "Employee deleted successfully.");
    } catch (error) {
        showToast(error.message, true);
    }
  };
}

//--- ACTION MODALS ---//

// Replace the existing showPinResetModal function with this
function showPinResetModal(empId) {
  const modal = document.createElement("div");
  modal.className = "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50";
  modal.innerHTML = `
    <div class="bg-white text-black p-6 rounded shadow-lg max-w-sm w-full">
      <h2 class="text-lg font-bold mb-4">Reset PIN for ${empId}</h2>
      <div class="space-y-4">
        <div>
          <label class="block mb-1">Enter New 4-digit PIN:</label>
          <input type="password" id="newPin" class="w-full border px-3 py-2 rounded" maxlength="4" pattern="\\d{4}" inputmode="numeric">
        </div>
        <div>
          <label class="block mb-1">Confirm New PIN:</label>
          <input type="password" id="confirmPin" class="w-full border px-3 py-2 rounded" maxlength="4" pattern="\\d{4}" inputmode="numeric">
        </div>
        <div class="flex justify-end gap-2 mt-4">
          <button class="cancel-btn bg-gray-600 text-white px-4 py-2 rounded">Cancel</button>
          <button id="confirmPinReset" class="bg-blue-600 text-white px-4 py-2 rounded">Confirm Reset</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(modal);

  modal.querySelector(".cancel-btn").onclick = () => modal.remove();
  
  modal.querySelector("#confirmPinReset").onclick = async () => {
    const newPin = modal.querySelector("#newPin").value;
    const confirmPin = modal.querySelector("#confirmPin").value;

    // Enhanced validation
    if (!/^\d{4}$/.test(newPin)) {
      return showToast("PIN must be exactly 4 digits", true);
    }
    
    if (newPin !== confirmPin) {
      return showToast("PINs do not match", true);
    }

    try {
      const res = await fetch("/.netlify/functions/reset_pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emp_id: empId, new_pin: newPin })
      });
      
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || 'PIN reset failed');
      
      // Show countdown toast and redirect
      showCountdownToast("PIN reset successfully. Logging in 3...", () => {
        modal.remove();
        window.location.href = "/employee_portal.html"; // Redirect to login
      });
    } catch (error) {
      showToast(error.message, true);
    }
  };
}

// Replace the existing showMfaResetModal function with this
function showMfaResetModal(empId) {
  const modal = document.createElement("div");
  modal.className = "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50";
  modal.innerHTML = `
  <div class="bg-white text-black p-6 rounded shadow-lg max-w-sm w-full">
    <h2 class="text-lg font-bold mb-4">Reset MFA for ${empId}</h2>
    <div id="mfaInstructions">
      <p class="mb-4">MFA token reset by admin. Please keep your authenticator app (Google Authenticator recommended) ready.</p>
      <button id="continueMfaBtn" class="bg-blue-600 text-white px-4 py-2 rounded w-full">Continue</button>
      <button class="cancel-btn mt-2 bg-gray-600 text-white px-4 py-2 rounded w-full">Cancel</button>
    </div>
    <div id="mfaSetup" class="hidden">
      <div class="text-center mb-4">
        <p class="mb-2">Scan this QR code with an authenticator app:</p>
        <div id="qrCodeContainer" class="flex justify-center items-center mb-4 bg-gray-100 w-48 h-48 mx-auto">Loading...</div>
        <p class="mb-1">Or enter this key manually:</p>
        <div class="flex items-center justify-center">
            <code id="mfaSecret" class="bg-gray-100 p-2 rounded mr-2"></code>
            <button id="copySecretBtn" class="bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded text-sm">Copy</button>
        </div>
      </div>
      <div class="mt-4">
        <label class="block mb-2">Enter 6-digit token:</label>
        <input type="text" id="mfaToken" class="w-full border px-3 py-2 rounded" placeholder="123456" maxlength="6">
      </div>
      <div class="flex justify-end gap-2 mt-4">
        <button class="cancel-btn bg-gray-600 text-white px-4 py-2 rounded">Cancel</button>
        <button id="confirmMfaReset" class="bg-blue-600 text-white px-4 py-2 rounded">Confirm Setup</button>
      </div>
    </div>
  </div>`;
  document.body.appendChild(modal);

  modal.querySelector(".cancel-btn").onclick = () => modal.remove();
  
  modal.querySelector("#continueMfaBtn").onclick = async () => {
    try {
      const res = await fetch("/.netlify/functions/reset_mfa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emp_id: empId })
      });
      
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Failed to initiate MFA reset.");

      modal.querySelector("#mfaInstructions").classList.add("hidden");
      modal.querySelector("#mfaSetup").classList.remove("hidden");
      
      const qrContainer = modal.querySelector("#qrCodeContainer");
      qrContainer.innerHTML = `<img src="${result.qr_code_url}" alt="MFA QR Code" class="w-48 h-48">`;
      modal.querySelector("#mfaSecret").textContent = result.secret_key;
      
      modal.querySelector("#copySecretBtn").onclick = () => {
        navigator.clipboard.writeText(result.secret_key);
        showToast("Secret key copied!");
      };

      // Updated confirm button handler using verify_mfa.js
      modal.querySelector("#confirmMfaReset").onclick = async () => {
        const token = modal.querySelector("#mfaToken").value;
        if (!token || !/^\d{6}$/.test(token)) {
          return showToast("Please enter a valid 6-digit token", true);
        }

        try {
          const verifyRes = await fetch("/.netlify/functions/verify-mfa", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              emp_id: empId,
              token: token,
              secret: result.secret_key,
              is_reset_flow: true
            })
          });
          
          const verifyData = await verifyRes.json();
          if (!verifyRes.ok || !verifyData.verified) {
            throw new Error(verifyData.message || "Token verification failed");
          }
          
          showCountdownToast("MFA setup complete. Logging in 3...", () => {
            modal.remove();
            window.location.href = "/employee_portal.html";
          });
        } catch (error) {
          showToast(error.message, true);
        }
      };
    } catch(error) {
      showToast(error.message, true);
    }
  };
}

function showEditModal(tr, emp, currentUser) {
  const isSuperAdmin = currentUser.emp_id === 'NGX001';
  const modal = document.createElement("div");
  modal.className = "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50";
  modal.innerHTML = `
    <div class="bg-white text-black p-6 rounded shadow-lg max-w-md w-full">
      <h2 class="text-lg font-bold mb-4">Edit Profile - ${emp.name} (${emp.emp_id})</h2>
      <div class="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
          <label class="block">Email: <input type="email" id="editEmail" class="w-full border px-2 py-1 rounded" value="${emp.email || ''}"/></label>
          <label class="block">Phone: <input type="tel" id="editPhone" class="w-full border px-2 py-1 rounded" value="${emp.phone || ''}"/></label>
          <label class="block">Department:
            <select id="editDept" class="w-full border px-2 py-1 bg-white rounded">
              <option value="">Select Department</option>
              <option value="Tech Team">Tech Team</option>
              <option value="Admin Team">Admin Team</option>
            </select>
          </label>
          <label class="block">Role:
            <select id="editRole" class="w-full border px-2 py-1 bg-white rounded">
              <option value="">Select Role</option>
            </select>
          </label>
          <label class="block">Base Salary (INR):
            <input type="number" id="editSalary" class="w-full border px-2 py-1 rounded" value="${emp.base_salary || ''}" placeholder="e.g., 50000">
          </label>
          ${isSuperAdmin ? '' : `
          <label class="block mt-4 pt-2 border-t">Your MFA Token (for verification):
            <input type="text" id="adminMfaToken" class="w-full border px-2 py-1 rounded" placeholder="Enter your 6-digit token" required>
          </label>
          `}
      </div>
      <div class="flex justify-end gap-2 mt-4">
        <button class="cancel-btn bg-gray-600 text-white px-4 py-1 rounded">Cancel</button>
        <button id="saveEditBtn" class="bg-purple-600 text-white px-4 py-1 rounded">Save Changes</button>
      </div>
    </div>`;
  document.body.appendChild(modal);

  const deptSelect = modal.querySelector("#editDept");
  const roleSelect = modal.querySelector("#editRole");

  const roleOptions = {
      "Tech Team": ["Frontend Developer (Jr. Developer)", "Backend Developer (Jr. Developer)", "Full Stack Developer / Mobile App Developer (Sr. Developer)", "QA Engineer (Sr. Developer)", "White labelling (UI/UX Designer)", "DevOps Engineer (Infrastructure Engineer)", "Data Analyst", "Cybersecurity & Risk Analyst", "IT Systems Administrator", "IT Support Specialist"],
      "Admin Team": ["Human Resources Manager", "Chief Executive Officer", "Finance & Accounts Officer", "Managing Director (MD)", "Regulatory Compliance Officer", "Client Relations Consultant", "Administrative Coordinator", "Customer Success Executive"]
  };
  
  function updateRoleDropdown(dept) {
      roleSelect.innerHTML = '<option value="">Select Role</option>';
      if (roleOptions[dept]) {
        roleOptions[dept].forEach(role => {
            roleSelect.innerHTML += `<option value="${role}">${role}</option>`;
        });
      }
  }

  deptSelect.value = emp.department || "";
  updateRoleDropdown(deptSelect.value);
  roleSelect.value = emp.role || "";
  
  deptSelect.addEventListener("change", () => updateRoleDropdown(deptSelect.value));
  modal.querySelector(".cancel-btn").onclick = () => modal.remove();

  modal.querySelector("#saveEditBtn").onclick = async () => {
      const payload = {
          emp_id: emp.emp_id,
          email: modal.querySelector("#editEmail").value,
          phone: modal.querySelector("#editPhone").value,
          department: modal.querySelector("#editDept").value,
          role: modal.querySelector("#editRole").value,
          base_salary: modal.querySelector("#editSalary").value,
          admin_id: currentUser.emp_id,
          admin_token: isSuperAdmin ? '' : modal.querySelector("#adminMfaToken").value,
      };

      if (!isSuperAdmin && !payload.admin_token) {
        return showToast("Your MFA token is required to save changes.", true);
      }
      
      try {
        const res = await fetch("/.netlify/functions/update_employee_profile", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Update failed.');

        // Update UI dynamically without reload
        tr.querySelector('[data-field="name"]').textContent = data.updated.name || emp.name;
        tr.querySelector('[data-field="phone"]').textContent = payload.phone || '-';
        tr.querySelector('[data-field="department"]').textContent = payload.department || '-';
        // Note: Full role title update requires another fetch or returning it from the endpoint.
        // This simplified approach updates what we can. A reload would be simpler if full data sync is needed.
        
        showToast(data.message || "Profile updated successfully.");
        modal.remove();
        // Optional: reload for full data consistency
        // location.reload(); 
      } catch (error) {
        showToast(error.message, true);
      }
  };
}


//--- UTILITY & MODAL HELPERS ---//

function showCountdownToast(message, callback) {
  const toast = document.createElement("div");
  toast.className = "fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded shadow-lg z-50";
  document.body.appendChild(toast);
  
  let count = 3;
  const updateToast = () => {
    toast.textContent = message.replace('3...', `${count}...`);
  };
  
  updateToast();
  const interval = setInterval(() => {
    count--;
    if (count > 0) {
      updateToast();
    } else {
      clearInterval(interval);
      toast.remove();
      if (callback) callback();
    }
  }, 1000);
}

window.showEmployeeDetails = async function(empId) {
  try {
    const res = await fetch(`/.netlify/functions/get_employee_profile?emp_id=${empId}`);
    if (!res.ok) throw new Error('Failed to fetch data.');
    const data = await res.json();

    document.getElementById('modalEmpId').textContent = `Employee Profile: ${data.name} (${empId})`;
    const detailsHTML = `
      <p><strong>Email:</strong> ${data.email || '-'}</p>
      <p><strong>Phone:</strong> ${data.phone || '-'}</p>
      <p><strong>DOB:</strong> ${formatDate(data.dob)}</p>
      <p><strong>Department:</strong> ${data.department || '-'}</p>
      <p><strong>Role:</strong> ${data.role || '-'}</p>
      <p><strong>Base Salary:</strong> ${data.base_salary ? `₹${Number(data.base_salary).toLocaleString('en-IN')}` : '-'}</p>
      <hr class="my-2">
      <p><strong>Total Pay (All Time):</strong> ${data.total_pay ? `₹${Number(data.total_pay).toLocaleString('en-IN')}` : '-'}</p>
      <p><strong>Total Hours (All Time):</strong> ${data.total_hours || '0'} hrs</p>
    `;
    document.getElementById('modalDetails').innerHTML = detailsHTML;

    const docList = document.getElementById('docLinks');
    docList.innerHTML = '';
    if (data.documents?.length) {
      data.documents.forEach(doc => {
        const li = document.createElement('li');
        li.innerHTML = `<a href="${doc.url}" class="text-blue-600 underline" target="_blank">${doc.name}</a> 
                        (<a href="${doc.url}" download class="text-green-600 underline">Download</a>)`;
        docList.appendChild(li);
      });
    } else {
      docList.innerHTML = '<li>No documents uploaded.</li>';
    }
    document.getElementById('employeeModal').classList.remove('hidden');
  } catch (err) {
    showToast("Failed to fetch employee details.", true);
    console.error(err);
  }
};

window.closeModal = function () {
  document.getElementById('employeeModal').classList.add('hidden');
};
