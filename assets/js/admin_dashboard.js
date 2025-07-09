// admin_dashboard.js (Fully Corrected Version)

async function fetchEmployees(currentUser) {
  console.log("🔍 fetchEmployees triggered");
  try {
    const res = await fetch("/.netlify/functions/get_employees", { credentials: "include" });
    if (!res.ok) return console.warn("❌ get_employees failed:", res.status);

    const data = await res.json();
    const employees = data.employees;
    const tbody = document.getElementById("employeeTable");
    tbody.innerHTML = "";

    employees.forEach(emp => {
      const tr = document.createElement("tr");
      tr.className = "border-b border-gray-700";

      tr.innerHTML = `
<td class="p-2 border"><input type="checkbox" class="employeeCheckbox" name="emp_checkbox" data-emp-id="${emp.emp_id}" value="${emp.emp_id}" /></td>
        <td class="p-2 border text-blue-400 underline cursor-pointer" onclick="showEmployeeDetails('${emp.emp_id}')">${emp.emp_id}</td>
        <td class="p-2 border wrap">${emp.name}</td>
        <td class="p-2 border">${emp.phone}</td>
        <td class="p-2 border">${formatDate(emp.dob)}</td>
        <td class="p-2 border">
          <span class="font-medium">${emp.privilege === "admin" ? "Admin" : "User"}</span>
          <div class="mt-1 flex items-center gap-1">
            <select class="privilege-select bg-gray-700 text-white border border-gray-500 rounded px-1 py-0.5 text-sm">
              <option value="user" ${emp.privilege === "user" ? "selected" : ""}>User</option>
              <option value="admin" ${emp.privilege === "admin" ? "selected" : ""}>Admin</option>
            </select>
            <button class="confirm-privilege bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded text-xs">Confirm</button>
          </div>
        </td>
        <td class="p-2 border">${emp.department || "-"}</td>
        <td class="p-2 border">
          <div class="flex items-center justify-center gap-1">
            <button class="reset-pin bg-yellow-500 hover:bg-yellow-600 px-2 py-1 rounded text-xs" disabled>Reset PIN</button>
            <button class="reset-mfa bg-blue-500 hover:bg-blue-600 px-2 py-1 rounded text-xs" disabled>Reset MFA</button>
            <button class="edit bg-green-600 hover:bg-green-700 px-2 py-1 rounded text-xs">Edit</button>
            <button class="delete bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-xs">Delete</button>
          </div>
        </td>
      `;

      tbody.appendChild(tr);
      setupRowListeners(tr, emp, currentUser);
    });
  } catch (err) {
    console.error("Error loading employees:", err);
    showToast("Failed to load employee data.");
  }
}

// If table not visible check here

window.fetchEmployees = fetchEmployees;
console.log("✅ fetchEmployees is ready globally");

document.addEventListener("DOMContentLoaded", async () => {
  // ✅ Session check must be inside the function
  const session = localStorage.getItem("emp_session");
  if (!session) {
    window.location.href = "/employee_portal.html";
    return;
  }

  const currentUser = JSON.parse(session);
  await loadPayrollMode();

  // ✅ Fill Admin Profile Section
  document.getElementById("p_name").textContent = currentUser.name || "-";
  document.getElementById("p_phone").textContent = currentUser.phone || "-";
  document.getElementById("p_dob").textContent = formatDate(currentUser.dob);
  document.getElementById("p_dept").textContent = currentUser.department || "-";
  document.getElementById("p_role").textContent = currentUser.employee_role || "-";

  // ✅ Search logic
  const searchInput = document.getElementById("search");
  if (searchInput) {
    searchInput.addEventListener("input", function () {
      const searchTerm = this.value.toLowerCase();
      const rows = document.querySelectorAll("#employeeTable tr");
      rows.forEach(row => {
        const empId = row.cells[1]?.textContent.toLowerCase() || "";
        const empName = row.cells[2]?.textContent.toLowerCase() || "";
        const match = empId.includes(searchTerm) || empName.includes(searchTerm);
        row.style.display = match ? "" : "none";
      });
    });
  }

  // ✅ Initialize employee table
  await fetchEmployees(currentUser);

  // ✅ Initialize TinyMCE *after* updatePDFPreview is defined
 initTinyMCE();

});

function logout() {
  localStorage.removeItem("emp_session");
  window.location.href = "employee_portal.html";
}

function formatDate(dob) {
  const d = new Date(dob);
  if (isNaN(d)) return dob;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

function showToast(msg) {
  const toast = document.createElement("div");
  toast.className = "fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded shadow-lg z-50";
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function filterEmployeeTable() {
  const searchInput = document.getElementById("search");
  if (!searchInput) return;
  const searchTerm = searchInput.value.toLowerCase().trim();
  const table = document.getElementById("employeeTable");
  if (!table) return;
  const rows = table.getElementsByTagName("tr");
  for (let row of rows) {
    const empId = row.cells[0]?.textContent.toLowerCase() || "";
    const empName = row.cells[1]?.textContent.toLowerCase() || "";
    row.style.display = empId.includes(searchTerm) || empName.includes(searchTerm) ? "" : "none";
  }
}

async function loadPayrollMode() {
  const res = await fetch("/.netlify/functions/get_payroll_mode");
  const data = await res.json();
  const toggle = document.getElementById("payrollToggle");
  const status = document.getElementById("toggleStatus");

  if (!toggle || !status) return;

  toggle.value = data.mode || "freelance";
  status.textContent = `${toggle.value.charAt(0).toUpperCase() + toggle.value.slice(1)} payroll mode is active`;
  status.className = toggle.value === "freelance"
    ? "ml-4 px-3 py-1 rounded text-sm font-semibold bg-yellow-500 text-black"
    : "ml-4 px-3 py-1 rounded text-sm font-semibold bg-green-600 text-white";

  const confirmPayroll = document.getElementById("confirmPayroll");
  if (confirmPayroll) {
    confirmPayroll.onclick = async () => {
      const selected = toggle.value;
      if (!selected) return showToast("Please select a payroll mode first.");

      const res = await fetch("/.netlify/functions/set_payroll_mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: selected })
      });

      const data = await res.json();
      showToast(data.message || "Payroll mode updated");
      loadPayrollMode();
    };
  }
}

function setupRowListeners(tr, emp, currentUser) {
  // --- Reset PIN Button ---
  const resetPinBtn = tr.querySelector(".reset-pin");
  if (resetPinBtn) {
    const canResetPin = (emp.failed_pin_attempts && emp.failed_pin_attempts >= 3) || emp.reset_pin_ready === true;
    resetPinBtn.disabled = !canResetPin;
    resetPinBtn.classList.toggle("opacity-40", !canResetPin);
    resetPinBtn.classList.toggle("cursor-not-allowed", !canResetPin);
    resetPinBtn.title = canResetPin
      ? "Click to reset this employee's PIN"
      : "Reset PIN is only available after 3 failed attempts or a request from employee.";
    if (canResetPin) {
      resetPinBtn.onclick = () =>
        triggerReset("reset_pin", emp.emp_id, "PIN reset by admin. Please refresh.");
    } else {
      resetPinBtn.onclick = null;
    }
  }

  // --- Reset MFA Button ---
  const resetMfaBtn = tr.querySelector(".reset-mfa");
  if (resetMfaBtn) {
    const canResetMfa = emp.failed_mfa_attempts && emp.failed_mfa_attempts >= 3;
    resetMfaBtn.disabled = !canResetMfa;
    resetMfaBtn.classList.toggle("opacity-40", !canResetMfa);
    resetMfaBtn.classList.toggle("cursor-not-allowed", !canResetMfa);
    resetMfaBtn.title = canResetMfa
      ? "Click to reset this employee's MFA"
      : "Reset MFA is only available after 3 failed attempts.";
    if (canResetMfa) {
      resetMfaBtn.onclick = async () => {
        try {
          const res = await fetch("/.netlify/functions/reset_mfa", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ emp_id: emp.emp_id })
          });
          if (!res.ok) throw new Error(`Reset failed: ${res.status}`);
          const data = await res.json();
          showToast("MFA reset successfully. Employee can now scan QR code.");
          showMfaModal(data, emp.emp_id);
        } catch (error) {
          console.error("MFA reset error:", error);
          showToast("Failed to reset MFA. Please try again.");
        }
      };
    } else {
      resetMfaBtn.onclick = null;
    }
  }



  const editBtn = tr.querySelector(".edit");
  if (editBtn) {
    editBtn.onclick = () => showEditModal(emp, tr);
  }

const deleteBtn = tr.querySelector(".delete");
if (deleteBtn) {
  deleteBtn.onclick = async () => {
    if (emp.emp_id === currentUser.emp_id) return;
    if (!confirm(`Delete ${emp.emp_id}?`)) return;

    if (currentUser.emp_id !== "NGX001") {
      const token = prompt("Enter your MFA token:");
      if (!token) return;

      const verify = await fetch("/.netlify/functions/verify_mfa_token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admin_id: currentUser.emp_id, token })
      });
      const result = await verify.json();
      if (!result.valid) return showToast("❌ MFA failed");
    }

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


  // ✅ Correct privilege dropdown logic
  const privilegeSelect = tr.querySelector(".privilege-select");
  const confirmBtn = tr.querySelector(".confirm-privilege");

  if (privilegeSelect && confirmBtn) {
    confirmBtn.onclick = async () => {
      const newPrivilege = privilegeSelect.value;
      try {
        const res = await fetch("/.netlify/functions/update_privilege", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ emp_id: emp.emp_id, privilege: newPrivilege }),
  credentials: "include"
});
        if (!res.ok) throw new Error();
        showToast("Privileges updated successfully.");
      } catch {
        showToast("Failed to update privileges.");
      }
    };
  }
}

function showEditModal(emp, row) {
  fetch(`/.netlify/functions/get_employee_profile?emp_id=${emp.emp_id}`)
    .then(res => res.json())
    .then(empData => {
      const modal = document.createElement("div");
      modal.innerHTML = `
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div class="bg-white text-black p-6 rounded shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 class="text-lg font-semibold mb-4">Edit - ${empData.name}</h2>

            <input id="editEmail" value="${!empData.email || empData.email === 'undefined' ? '' : empData.email}" type="email" class="w-full border px-2 py-1 mb-2" placeholder="Email" />

            <label>Phone:
              <input id="editPhone" value="${empData.phone || ''}" type="tel" maxlength="10" class="w-full border px-2 py-1 mb-2" />
            </label>

            <label>Department:
              <select id="editDept" class="w-full border px-2 py-1 mb-2">
                <option value="">-- Select --</option>
                <option value="Tech Team" ${empData.department === "Tech Team" ? "selected" : ""}>Tech Team</option>
                <option value="Admin Team" ${empData.department === "Admin Team" ? "selected" : ""}>Admin Team</option>
              </select>
            </label>

            <label>Role:
              <select id="editRole" class="w-full border px-2 py-1 mb-2">
                <option value="">-- Select Role --</option>
              </select>
            </label>

            <label>Salary (INR):
              <input id="editSalary" value="${empData.base_salary || ''}" type="number" class="w-full border px-2 py-1 mb-4" />
            </label>

            <label>Reporting Manager:
              <input id="edit_reporting_manager" value="${empData.reporting_manager || ''}" type="text" class="w-full border px-2 py-1 mb-2" />
            </label>

            <label>Joining Date:
              <input id="edit_joining_date" value="${empData.joining_date ? empData.joining_date.split('T')[0] : ''}" type="date" class="w-full border px-2 py-1 mb-4" />
            </label>

            <label>Upload New Document:
              <input type="file" id="uploadFile" class="w-full border px-2 py-1 mb-4" />
            </label>

            <div class="flex justify-between">
              <button class="bg-gray-600 text-white px-4 py-1 rounded" onclick="this.closest('.fixed').remove()">Cancel</button>
              <button class="bg-blue-700 text-white px-4 py-1 rounded" id="saveEditBtn">Save</button>
            </div>
          </div>
        </div>
      `;
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
          "Chief Executive Officer",
          "Finance & Accounts Officer",
          "Managing Director (MD)",
          "Regulatory Compliance Officer",
          "Client Relations Consultant",
          "Administrative Coordinator",
          "Customer Success Executive"
        ]
      };

      function updateRoleOptions(deptVal, currentRole) {
        role.innerHTML = '<option value="">-- Select Role --</option>';
        if (roles[deptVal]) {
          roles[deptVal].forEach(r => {
            const opt = document.createElement("option");
            opt.value = r;
            opt.textContent = r;
            if (r === currentRole) opt.selected = true;
            role.appendChild(opt);
          });
        }
      }

      dept.addEventListener("change", () => updateRoleOptions(dept.value, ""));
      updateRoleOptions(empData.department, empData.employment_role);


      modal.querySelector("#saveEditBtn").onclick = async () => {
        const fileInput = modal.querySelector("#uploadFile");
        let uploadedFileUrl = null;

        if (fileInput && fileInput.files.length > 0) {
          const formData = new FormData();
          formData.append("file", fileInput.files[0]);

          try {
            const uploadRes = await fetch("/.netlify/functions/upload_to_dropbox", {
              method: "POST",
              body: formData
            });
            const result = await uploadRes.json();
            uploadedFileUrl = result.url;
          } catch (err) {
            showToast("❌ Upload failed. Try again.");
            return;
          }
        }

        submitEdit(emp.emp_id, modal, row, uploadedFileUrl);
      };
    });
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

async function submitEdit(empId, modal, row, uploadedFileUrl = null) {
  const parent = modal;

  const email = parent.querySelector("#editEmail")?.value.trim();
  const phone = parent.querySelector("#editPhone")?.value.trim();
  const department = parent.querySelector("#editDept")?.value;
  const role = parent.querySelector("#editRole")?.value;
  const base_salary = parent.querySelector("#editSalary")?.value;
  const reporting_manager = parent.querySelector("#edit_reporting_manager")?.value.trim();
  const joining_date = parent.querySelector("#edit_joining_date")?.value;

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showToast("❌ Invalid email format");
  if (phone && !/^\d{10}$/.test(phone)) return showToast("❌ Phone must be 10 digits");

  const currentUser = JSON.parse(localStorage.getItem("emp_session") || "{}");
  const updateData = {
    emp_id: empId,
    admin_id: currentUser.emp_id
  };

  if (email) updateData.email = email;
  if (phone) updateData.phone = phone;
  if (department) updateData.department = department;
  if (role) updateData.employment_role = role;
  if (base_salary) updateData.base_salary = base_salary;
  if (reporting_manager) updateData.reporting_manager = reporting_manager;
  if (joining_date) updateData.joining_date = joining_date;
  if (uploadedFileUrl) updateData.new_document = uploadedFileUrl;

  if (currentUser.emp_id !== "NGX001") {
    const token = prompt("Enter MFA token to confirm changes:");
    if (!token) return;

    const verify = await fetch("/.netlify/functions/verify_mfa_token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ admin_id: currentUser.emp_id, token })
    });
    const result = await verify.json();
    if (!result.valid) return showToast("❌ MFA verification failed.");

    updateData.token = token;
  }

  const res = await fetch("/.netlify/functions/update_employee_profile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updateData)
  });

  const result = await res.json();
  if (res.ok) {
    showToast(result.message || "✅ Profile updated");
    if (row) {
      row.querySelector('[data-field="email"]').textContent = email || "-";
      row.querySelector('[data-field="phone"]').textContent = phone || "-";
      row.querySelector('[data-field="department"]').textContent = department || "-";
      row.querySelector('[data-field="employment_role"]').textContent = role || "-";
    }
    modal.remove();
    setTimeout(() => location.reload(), 800);
  } else {
    showToast(result.message || "❌ Update failed");
    console.error(result);
  }
}


// --- Modal-related global functions ---

window.showEmployeeDetails = async function(empId) {
  try {
    const res = await fetch(`/.netlify/functions/get_employee_profile?emp_id=${empId}`);
    if (!res.ok) throw new Error(`Failed to fetch employee details: ${res.status}`);
    const data = await res.json();

    // Format DOB
    let formattedDOB = '-';
    if (data.dob) {
      try {
        const dobDate = new Date(data.dob);
        formattedDOB = dobDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
      } catch (e) {
        formattedDOB = data.dob.split('T')[0];
      }
    }

    // Format Joining Date
    let formattedJoinDate = '-';
    if (data.joining_date) {
      try {
        const joinDate = new Date(data.joining_date);
        formattedJoinDate = joinDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
      } catch (e) {
        formattedJoinDate = data.joining_date.split('T')[0];
      }
    }

    // Set the employee ID and profile image (thumbnail)
    const modalEmpId = document.getElementById('modalEmpId');
    modalEmpId.innerHTML = `
      <div class="flex justify-between items-start">
        <div class="text-lg font-semibold">Employee ID: ${empId}</div>
        ${
          data.profile_photo_url
            ? `<img src="${data.profile_photo_url}" alt="Profile Photo" class="w-16 h-16 rounded-full object-cover border-2 border-white shadow ml-4" />`
            : ''
        }
      </div>
    `;

    // Fill in personal and job details
    document.getElementById('modalDetails').innerHTML = `
      <p><strong>Name:</strong> ${data.name || '-'}</p>
      <p><strong>Email:</strong> ${data.email && data.email !== 'null' ? data.email : '-'}</p>
      <p><strong>Phone:</strong> ${data.phone || '-'}</p>
      <p><strong>DOB:</strong> ${formattedDOB}</p>
      <p><strong>Department:</strong> ${data.department || '-'}</p>
      <p><strong>Role:</strong> ${data.employment_role || '-'}</p>
      <p><strong>Reporting Manager:</strong> ${data.reporting_manager || '-'}</p>
      <p><strong>Joining Date:</strong> ${formattedJoinDate}</p>
      <p><strong>Total Pay:</strong> ${
        data.total_pay && data.total_pay !== 'undefined'
          ? `₹${Number(data.total_pay).toLocaleString('en-IN')}`
          : '-'
      }</p>
      <p><strong>Total Hours:</strong> ${
        data.total_hours && data.total_hours !== 'undefined' ? `${data.total_hours} hrs` : '0 hrs'
      }</p>
    `;

    // Show documents
    const docList = document.getElementById("docLinks");
    docList.innerHTML = ''; // Clear previous content

    let docShown = false;

    if (data.documents && Array.isArray(data.documents) && data.documents.length > 0) {
      data.documents.forEach(doc => {
        const fileName = decodeURIComponent(doc.url.split('/').pop());
        const li = document.createElement("li");
        li.innerHTML = `
          <p class="mb-1">
            <strong>${doc.name || 'Document'}:</strong> ${fileName} &nbsp;
            <a href="${doc.url}" class="text-blue-600 underline" target="_blank">View</a> |
            <a href="${doc.url}" class="text-green-600 underline" download>Download</a>
          </p>
        `;
        docList.appendChild(li);
        docShown = true;
      });
    }

    // Add passport photo as downloadable doc if available
    if (data.profile_photo_url) {
      const li = document.createElement("li");
      li.innerHTML = `
        <p><strong>Profile Photo:</strong> 
          <a href="${data.profile_photo_url}" class="text-blue-600 underline" target="_blank">View</a> | 
          <a href="${data.profile_photo_url}" download class="text-green-600 underline">Download</a>
        </p>
      `;
      docList.appendChild(li);
      docShown = true;
    }

    if (!docShown) {
      docList.innerHTML = '<li>No documents uploaded</li>';
    }

    document.getElementById("employeeModal").classList.remove("hidden");
  } catch (error) {
    console.error('Error fetching employee details:', error);
    showToast('Failed to load employee details');
  }
};



window.closeModal = function () {
  document.getElementById("employeeModal").classList.add("hidden");
};

window.printModalContent = function() {
  const modalContent = document.getElementById("modalDetails").innerHTML;
  const empId = document.getElementById("modalEmpId").textContent;
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <html>
      <head><title>Employee Details - ${empId}</title></head>
      <body>
        <h2>${empId}</h2>
        ${modalContent}
        <script>window.print();</script>
      </body>
    </html>
  `);
};

window.exportModalToPDF = function() {
  const modalContent = document.getElementById("modalDetails").innerHTML;
  const empId = document.getElementById("modalEmpId").textContent;
  const pdfWindow = window.open('', '_blank');
  pdfWindow.document.write(`
    <html>
      <head>
        <title>Employee Details - ${empId}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h2 { color: #333; }
          p { margin: 8px 0; }
        </style>
      </head>
      <body>
        <h2>${empId}</h2>
        ${modalContent}
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
    </html>
  `);
};

window.exportCSV = async function () {
  try {
    const res = await fetch("/.netlify/functions/get_employees");
    const { employees } = await res.json();

    // Fetch full profile for each employee
    const employeeDetails = await Promise.all(
      employees.map(async (emp) => {
        const profileRes = await fetch(`/.netlify/functions/get_employee_profile?emp_id=${emp.emp_id}`);
        if (!profileRes.ok) throw new Error(`Failed to fetch profile for ${emp.emp_id}`);
        const profile = await profileRes.json();
        return { ...emp, ...profile };
      })
    );

    // CSV Header
    const headers = [
      'ID', 'Name', 'Email', 'Phone', 'DOB', 'Department', 'Role',
      'Reporting Manager', 'Joining Date', 'Base Salary', 'Total Pay', 'Total Hours', 'Document Names'
    ];

    const csvRows = employeeDetails.map(emp => {
      const dob = emp.dob ? new Date(emp.dob).toLocaleDateString('en-GB') : '';
      const joining = emp.joining_date ? new Date(emp.joining_date).toLocaleDateString('en-GB') : '';
      const totalPay = emp.total_pay ? `₹${Number(emp.total_pay).toLocaleString('en-IN')}` : '';
      const docs = (emp.documents || []).map(doc => doc.name || 'Document').join('; ');

      return [
        emp.emp_id,
        emp.name || '',
        emp.email || '',
        emp.phone || '',
        dob,
        emp.department || '',
        emp.employment_role || '',
        emp.reporting_manager || '',
        joining,
        emp.base_salary || '',
        totalPay,
        emp.total_hours || '',
        docs || ''
      ].map(val => `"${val}"`).join(',');
    });

    const csvContent = [headers.join(','), ...csvRows].join('\n');

    // Trigger download
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `employees_full_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('✅ Full employee CSV exported');
  } catch (error) {
    console.error('Export failed:', error);
    showToast('❌ Export failed');
  }
};


// --- Bulk Selection Checkbox Logic ---

function toggleSelectAll(mainCheckbox) {
  document.querySelectorAll('input[name="emp_checkbox"]').forEach(cb => {
    cb.checked = mainCheckbox.checked;
  });
}

// Keep master checkbox in sync when individual checkboxes change
document.addEventListener('change', (e) => {
  if (e.target.classList.contains('employeeCheckbox')) {
    const all = document.querySelectorAll('.employeeCheckbox');
    const checked = document.querySelectorAll('.employeeCheckbox:checked');
    document.getElementById('selectAllCheckbox').checked = all.length === checked.length;
  }
});

window.openEmailModal = function () {
  const selectedCheckboxes = Array.from(document.querySelectorAll('.employeeCheckbox:checked'));
  if (selectedCheckboxes.length === 0) {
    showToast("Please select at least one employee.");
    return;
  }

  const selectedIds = selectedCheckboxes.map(cb => cb.value);
  localStorage.setItem("selected_emp_ids", JSON.stringify(selectedIds));

  const session = localStorage.getItem("emp_session");
  if (session) {
    const { email } = JSON.parse(session);
    document.getElementById("emailFrom").value = email || "n.dcosta@nikagenyx.com";
  }

  document.getElementById("bulkEmailModal").classList.remove("hidden");

};

window.closeEmailModal = function () {
  document.getElementById("emailModal").classList.add("hidden");
};

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("bulkEmailForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const selectedIds = JSON.parse(localStorage.getItem("selected_emp_ids") || "[]");
    if (selectedIds.length === 0) return showToast("No employees selected");

    const session = JSON.parse(localStorage.getItem("emp_session") || "{}");
    const empId = session.emp_id;
    let smtpPassword = session.smtp_password;

    // ✅ Step 1: Get SMTP password
    if (!smtpPassword || smtpPassword === "undefined") {
      try {
        const res = await fetch(`/.netlify/functions/get_smtp_password?emp_id=${empId}`);
        const data = await res.json();
        if (data.smtp_password && data.smtp_password !== "undefined") {
          smtpPassword = data.smtp_password;
        } else {
          smtpPassword = prompt("Enter your email password to send:");
          if (!smtpPassword || smtpPassword.trim() === "") {
            showToast("❌ Sending cancelled – no password entered.");
            return;
          }

          await fetch("/.netlify/functions/save_smtp_password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ emp_id: empId, smtp_password: smtpPassword }),
          });

          session.smtp_password = smtpPassword;
          localStorage.setItem("emp_session", JSON.stringify(session));
        }
      } catch (err) {
        console.error("❌ Error loading SMTP password:", err);
        showToast("❌ Could not retrieve your SMTP credentials.");
        return;
      }
    }

    // ✅ Step 2: Build email
    const from = "n.dcosta@nikagenyx.com";
    const fromName = session.name || "Nik D'Costa";
    const subject = document.getElementById("emailSubject").value;
    const rawBody = document.getElementById("emailBody").value;
    const attachments = document.getElementById("emailAttachment").files;

    // ✅ Only send message entered by the user (NO greeting, NO signature)
    const formData = new FormData();
    formData.append("from", from);
    formData.append("from_name", fromName);
    formData.append("smtp_password", smtpPassword);
    formData.append("subject", subject);
    formData.append("body", rawBody);
    formData.append("recipients", JSON.stringify(selectedIds));
    [...attachments].forEach(file => formData.append("attachment", file));

    // ✅ Step 3: Send
    const res = await fetch("/.netlify/functions/send_bulk_email", {
      method: "POST",
      body: formData,
    });

    // ✅ Response Handling
    try {
      const contentType = (res.headers.get("content-type") || "").toLowerCase();
      if (!res.ok) {
        const errorText = await res.text();
        console.error("❌ Email failed:", errorText);
        try {
          const errorJson = JSON.parse(errorText);
          showToast(errorJson.message || "❌ Email sending failed.");
        } catch {
          showToast("❌ Email sending failed.");
        }
        return;
      }

      const result = contentType.includes("application/json") ? await res.json() : {};
      if (result.failed?.length) {
        showToast(`✅ Sent with some failures: ${result.failed.join(", ")}`);
      } else {
        showToast(result.message || "✅ Emails sent successfully.");
      }

      document.getElementById("bulkEmailModal").classList.add("hidden");

    } catch (err) {
      console.error("❌ Exception during email send:", err);
      showToast("❌ Unexpected error occurred.");
    }
  });
});

// Step 2 — Modal Control & File Preview
function openEmailModal() {
  const modal = document.getElementById("bulkEmailModal");
  const fromInput = document.getElementById("emailFrom");
  const session = JSON.parse(localStorage.getItem("emp_session"));

  if (!modal || !fromInput) {
    console.error("❌ Modal or From input not found in DOM.");
    return;
  }

  if (session) {
    fromInput.value = session?.email || (session?.emp_id ? `${session.emp_id}@nikagenyx.com` : "");
  }

  modal.classList.remove("hidden");
}

function closeBulkEmailModal() {
  document.getElementById("bulkEmailModal").classList.add("hidden");
  document.getElementById("bulkEmailForm").reset();
  document.getElementById("filePreview").innerHTML = "";
}

document.addEventListener("DOMContentLoaded", setupAttachmentPreview);

function setupAttachmentPreview() {
  const attachInput = document.getElementById("emailAttachment");
  const fileList = document.getElementById("filePreview");
  if (!attachInput || !fileList) return;

  let selectedFiles = [];

  attachInput.addEventListener("change", (e) => {
    const newFiles = Array.from(e.target.files);
    for (const file of newFiles) {
      const exists = selectedFiles.some(f => f.name === file.name && f.size === file.size);
      if (!exists) selectedFiles.push(file);
    }
    renderFileList();
  });

  function renderFileList() {
    fileList.innerHTML = "";
    selectedFiles.forEach((file, index) => {
      const li = document.createElement("li");
      li.className = "relative bg-gray-100 text-gray-800 p-2 pl-3 pr-8 rounded shadow text-sm flex items-center justify-between";

      const fileText = document.createElement("span");
      fileText.innerHTML = `<strong>${file.name}</strong> (${Math.round(file.size / 1024)} KB)`;

      const removeBtn = document.createElement("button");
      removeBtn.textContent = "×";
      removeBtn.className = "absolute right-2 top-1 text-red-500 hover:text-red-700 font-bold text-lg";
      removeBtn.onclick = () => {
        selectedFiles.splice(index, 1);
        renderFileList();
      };

      li.appendChild(fileText);
      li.appendChild(removeBtn);
      fileList.appendChild(li);
    });

    const dt = new DataTransfer();
    selectedFiles.forEach(file => dt.items.add(file));
    attachInput.files = dt.files;
  }
}

if (typeof window.fetchEmployees !== "function") {
  window.fetchEmployees = fetchEmployees;
  console.log("✅ fetchEmployees globally exposed");
}

document.getElementById("generatePDFLetter").addEventListener("click", async () => {
  const selectedIds = JSON.parse(localStorage.getItem("selected_emp_ids") || "[]");
  if (selectedIds.length === 0) {
    alert("No employees selected!");
    return;
  }

  // Fetch all employees
  const res = await fetch("/.netlify/functions/get_employees");
  const { employees } = await res.json();
  const selectedEmployees = employees.filter(emp => selectedIds.includes(emp.emp_id));

  // Header/footer image URLs and sizes
  const headerURL = "https://raw.githubusercontent.com/Nicdcosta21/Nikagenyx-Website/main/assets/HEADER.png";
  const footerURL = "https://raw.githubusercontent.com/Nicdcosta21/Nikagenyx-Website/main/assets/FOOTER.png";
  const headerImg = await loadImageAsDataURL(headerURL);
  const footerImg = await loadImageAsDataURL(footerURL);

  // These heights must match your header/footer image heights in px/pt
  const headerHeight = 120; // px/pt
  const footerHeight = 80;  // px/pt

  // Define a default template for PDF letter generation
const bodyTemplate = `
  <p>Dear {{name}},</p>
  <p>Employee ID: {{emp_id}}</p>
  <p>Welcome to the {{department}} team as a {{employment_role}}!</p>
  <p>Your joining date: {{joining_date}}</p>
  <p>Best regards,<br>HR Team</p>
`;

  for (const emp of selectedEmployees) {
    // Use mergeTemplate for all fields
    const personalizedBody = mergeTemplate(bodyTemplate, emp);

    // Container for jsPDF.html rendering
    const container = document.createElement("div");
    container.style.width = "595pt"; // A4 width
    container.style.minHeight = "842pt"; // A4 height
    container.style.background = "#fff";
    container.style.fontFamily = "Arial, Helvetica, sans-serif";
    container.style.fontSize = "12pt";

    // Use semantic HTML, not <br>-inserted text!
    container.innerHTML = `
      <div id="pdfContent" style="padding: ${headerHeight + 24}px 48px ${footerHeight + 24}px 48px; line-height:1.5; color: #000;">
        ${personalizedBody}
      </div>
    `;
    container.style.position = "fixed";
    container.style.left = "-9999px";
    document.body.appendChild(container);

    // Create jsPDF A4, pt units
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4'
    });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    await doc.html(container, {
      margin: [headerHeight + 24, 48, footerHeight + 24, 48], // [top, left, bottom, right]
      autoPaging: 'text',
      html2canvas: {
        scale: 1.25,
        useCORS: true,
        backgroundColor: "#fff"
      },
      callback: function (doc) {
        const totalPages = doc.internal.getNumberOfPages();

        for (let i = 1; i <= totalPages; i++) {
          doc.setPage(i);
          // Header (full width)
          doc.addImage(headerImg, "PNG", 0, 0, pageWidth, headerHeight);
          // Footer (full width)
          doc.addImage(footerImg, "PNG", 0, pageHeight - footerHeight, pageWidth, footerHeight);
          // Footer copyright text
          doc.setFontSize(8);
          doc.setTextColor(150);
          doc.text(
            "© 2025 Nikagenyx Vision Tech Private Limited. All rights reserved.",
            pageWidth / 2,
            pageHeight - 12,
            { align: "center" }
          );
        }

        const cleanName = emp.name?.trim().replace(/\s+/g, "_") || "Employee";
        const cleanRole = emp.employment_role?.trim().replace(/\s+/g, "_").replace(/[^\w()_]/g, "") || "Role";
        const filename = `${cleanName}_${emp.emp_id}_${cleanRole}.pdf`;

        doc.save(filename);
        container.remove();
      }
    });
  }
});
function openPDFLetterModal() {
  document.getElementById("pdfLetterModal").classList.remove("hidden");
  updatePDFPreview();
}

// Simple merge for {{field}} with support for undefined fields
function mergeTemplate(template, emp) {
  return template.replace(/{{(.*?)}}/g, (_, key) => emp[key.trim()] ?? "");
}

// Utility: Fetch image as DataURL
async function loadImageAsDataURL(url) {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}
function closePDFLetterModal() {
  document.getElementById("pdfLetterModal").classList.add("hidden");
}

function getSelectedEmployeeIds() {
  return Array.from(document.querySelectorAll('input[name="emp_checkbox"]:checked'))
    .map(cb => cb.dataset.empId);
}

async function generatePDFLetters() {
  const selectedIds = getSelectedEmployeeIds();
  if (!selectedIds.length) return alert("Please select employees.");

  const rawHTML = tinymce.get("letterBody")?.getContent() || "";
  const font = "Arial";
  const fontSize = 14;

  // A4 size at 96dpi
  const pageWidthPx = 794;
  const pageHeightPx = 1123;

  // Content margins
  const sideMargin = 48; // pixels
  const headerHeight = 110; // actual header image px
  const footerHeight = 80;  // actual footer image px

  const headerURL = "https://raw.githubusercontent.com/Nicdcosta21/Nikagenyx-Website/main/assets/HEADER.png";
  const footerURL = "https://raw.githubusercontent.com/Nicdcosta21/Nikagenyx-Website/main/assets/FOOTER.png";
  const headerImg = await loadImageAsDataURL(headerURL);
  const footerImg = await loadImageAsDataURL(footerURL);

  const res = await fetch("/.netlify/functions/get_employees");
  const { employees } = await res.json();
  const selectedEmployees = employees.filter(emp => selectedIds.includes(emp.emp_id));

  for (const emp of selectedEmployees) {
    const personalizedHTML = rawHTML
      .replace(/{{name}}/gi, emp.name || "")
      .replace(/{{emp_id}}/gi, emp.emp_id || "")
      .replace(/{{email}}/gi, emp.email || "")
      .replace(/{{phone}}/gi, emp.phone || "")
      .replace(/{{dob}}/gi, emp.dob || "")
      .replace(/{{department}}/gi, emp.department || "")
      .replace(/{{role}}/gi, emp.employment_role || "")
      .replace(/{{reporting_manager}}/gi, emp.reporting_manager || "")
      .replace(/{{joining_date}}/gi, emp.joining_date || "")
      .replace(/{{base_salary}}/gi, emp.base_salary || "")
      .replace(/<!--\s*PAGEBREAK\s*-->/gi, '<div style="page-break-after: always;"></div>');

    const container = document.createElement("div");
    container.style.width = pageWidthPx + "px";
    container.style.minHeight = pageHeightPx + "px";
    container.style.background = "#fff";
    container.style.fontFamily = font;
    container.style.fontSize = fontSize + "px";
    container.innerHTML = `
      <style>
        body, div, p, span, table, td { font-family: ${font} !important; font-size: ${fontSize}px !important; }
        h1, h2 { font-weight: bold; }
        p { margin: 0 0 12px 0; }
        .signature-line { display: inline-block; border-bottom: 1px solid #000; min-width: 200px; height: 18px; vertical-align: bottom;}
      </style>
      <div id="pdfContent" style="padding: ${headerHeight + 20}px ${sideMargin}px ${footerHeight + 20}px ${sideMargin}px; line-height:1.6; color: #000;">
        ${personalizedHTML}
      </div>
    `;
    container.style.position = "fixed";
    container.style.left = "-9999px";
    document.body.appendChild(container);

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "px",
      format: [pageWidthPx, pageHeightPx]
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    await doc.html(container, {
      margin: [headerHeight + 20, sideMargin, footerHeight + 20, sideMargin],
      autoPaging: "text",
      html2canvas: {
        scale: 1,
        useCORS: true,
        backgroundColor: "#fff"
      },
      callback: function (doc) {
        const totalPages = doc.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
          doc.setPage(i);
          doc.addImage(headerImg, "PNG", 0, 0, pageWidth, headerHeight);
          doc.addImage(footerImg, "PNG", 0, pageHeight - footerHeight, pageWidth, footerHeight);
          doc.setFontSize(10);
          doc.setTextColor(150);
          doc.text(
            "© 2025 Nikagenyx Vision Tech Private Limited. All rights reserved.",
            pageWidth / 2,
            pageHeight - 12,
            { align: "center" }
          );
        }
        const cleanName = emp.name?.trim().replace(/\s+/g, "_") || "Employee";
        const cleanRole = emp.employment_role?.trim().replace(/\s+/g, "_").replace(/[^\w()_]/g, "") || "Role";
        const filename = `${cleanName}_${emp.emp_id}_${cleanRole}.pdf`;
        doc.save(filename);
        container.remove();
      }
    });
  }
  closePDFLetterModal();
}
// Utility to fetch image as Data URL
async function loadImageAsDataURL(url) {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

async function getImageDimensions(imgUrl, maxWidth = 600) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const ratio = img.width / img.height;
      const width = maxWidth;
      const height = width / ratio;
      resolve({ width, height });
    };
    img.src = imgUrl;
  });
}

function updatePDFPreview() {
  const preview = document.getElementById("pdfPreview");

  const selectedIds = getSelectedEmployeeIds();
  if (selectedIds.length === 0) {
    preview.innerHTML = "(Select an employee to see preview)";
    return;
  }

  const raw = tinymce.get("letterBody")?.getContent() || "";

  fetch("/.netlify/functions/get_employees")
    .then(res => res.json())
    .then(({ employees }) => {
      const emp = employees.find(e => selectedIds.includes(e.emp_id));
      if (!emp) return;

      // Replace merge tags
      let merged = raw
        .replace(/{{name}}/gi, emp.name || "")
        .replace(/{{emp_id}}/gi, emp.emp_id || "")
        .replace(/{{email}}/gi, emp.email || "")
        .replace(/{{phone}}/gi, emp.phone || "")
        .replace(/{{dob}}/gi, emp.dob || "")
        .replace(/{{department}}/gi, emp.department || "")
        .replace(/{{role}}/gi, emp.employment_role || "")
        .replace(/{{reporting_manager}}/gi, emp.reporting_manager || "")
        .replace(/{{joining_date}}/gi, emp.joining_date || "")
        .replace(/{{base_salary}}/gi, emp.base_salary || "");

      // Replace <!-- PAGEBREAK --> with visual separator
      const paginated = merged.replace(/<!--\s*PAGEBREAK\s*-->/gi, '<div class="page-break"></div>');

      // Final preview
      preview.innerHTML = `
        <div style="text-align:center; padding-bottom: 10px;">
          <img src="https://raw.githubusercontent.com/Nicdcosta21/Nikagenyx-Website/main/assets/HEADER.png" style="width:100%; max-height:80px;" />
        </div>
        <div style="padding: 30px; font-size: 14px; line-height: 1.6; color: #333;">
          ${paginated}
        </div>
        <div style="text-align:center; padding-top: 10px;">
          <img src="https://raw.githubusercontent.com/Nicdcosta21/Nikagenyx-Website/main/assets/FOOTER.png" style="width:100%; max-height:60px;" />
        </div>
      `;
    });
}


function initTinyMCE() {
  if (typeof tinymce === "undefined") return;
  tinymce.init({
  selector: '#letterBody',
  height: 300,
  menubar: false,
  plugins: 'lists link table',
  toolbar: 'undo redo | bold italic underline | fontsize | alignleft aligncenter alignright | bullist numlist | table',
  setup: function (editor) {
    editor.on('input', updatePDFPreview);
  }
});

}

document.addEventListener("DOMContentLoaded", () => {
  const generateBtn = document.getElementById("generatePDFLetter");
  if (generateBtn) {
    generateBtn.addEventListener("click", generatePDFLetters);
  }
});
