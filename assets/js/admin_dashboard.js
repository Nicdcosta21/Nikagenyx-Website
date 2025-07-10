/**
 * Nikagenyx Admin Dashboard
 * Complete corrected version with fixed PDF generation
 */

// =====================================================
// INITIALIZATION & CORE FUNCTIONS
// =====================================================

document.addEventListener("DOMContentLoaded", async () => {
  // Session check
  const session = localStorage.getItem("emp_session");
  if (!session) {
    window.location.href = "/employee_portal.html";
    return;
  }

  const currentUser = JSON.parse(session);
  
  // Initialize UI components
  await loadPayrollMode();
  initProfileSection(currentUser);
  initSearchFunctionality();
  await fetchEmployees(currentUser);
  initTinyMCE();
  
  // Setup event listeners for bulk actions
  setupBulkActionListeners();
});

function initProfileSection(currentUser) {
  document.getElementById("p_name").textContent = currentUser.name || "-";
  document.getElementById("p_phone").textContent = currentUser.phone || "-";
  document.getElementById("p_dob").textContent = formatDate(currentUser.dob);
  document.getElementById("p_dept").textContent = currentUser.department || "-";
  document.getElementById("p_role").textContent = currentUser.employment_role || "-";
}

function initSearchFunctionality() {
  const searchInput = document.getElementById("search");
  if (searchInput) {
    searchInput.addEventListener("input", function() {
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
}

function setupBulkActionListeners() {
  // Select all checkbox
  const selectAll = document.getElementById("selectAllCheckbox");
  if (selectAll) {
    selectAll.addEventListener("change", (e) => toggleSelectAll(e.target));
  }
  
  // Bulk email button
  const bulkEmailBtn = document.getElementById("openBulkEmailBtn");
  if (bulkEmailBtn) {
    bulkEmailBtn.addEventListener("click", openEmailModal);
  }
  
  // PDF Letter button
  const pdfLetterBtn = document.getElementById("openPDFLetterBtn");
  if (pdfLetterBtn) {
    pdfLetterBtn.addEventListener("click", openPDFLetterModal);
  }
  
  // Generate PDF button
  const generateBtn = document.getElementById("generatePDFLetter");
  if (generateBtn) {
    generateBtn.addEventListener("click", generatePDFLetters);
  }
}

function logout() {
  localStorage.removeItem("emp_session");
  window.location.href = "employee_portal.html";
}

function showToast(msg, type = "success") {
  const toast = document.createElement("div");
  const bgColor = type === "success" ? "bg-green-600" : "bg-red-600";
  toast.className = `fixed bottom-4 right-4 ${bgColor} text-white px-4 py-2 rounded shadow-lg z-50`;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function formatDate(date) {
  if (!date) return "-";
  const d = new Date(date);
  if (isNaN(d)) return date;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

// =====================================================
// EMPLOYEE DATA MANAGEMENT
// =====================================================

async function fetchEmployees(currentUser) {
  console.log("🔍 fetchEmployees triggered");
  try {
    const res = await fetch("/.netlify/functions/get_employees", { credentials: "include" });
    if (!res.ok) {
      console.warn("❌ get_employees failed:", res.status);
      return;
    }

    const data = await res.json();
    const employees = data.employees;
    const tbody = document.getElementById("employeeTable");
    if (!tbody) return;
    
    tbody.innerHTML = "";

    employees.forEach(emp => {
      const tr = document.createElement("tr");
      tr.className = "border-b border-gray-700";

      tr.innerHTML = `
        <td class="p-2 border"><input type="checkbox" class="employeeCheckbox" name="employeeCheckbox" data-emp-id="${emp.emp_id}" value="${emp.emp_id}" /></td>
        <td class="p-2 border text-blue-400 underline cursor-pointer" onclick="showEmployeeDetails('${emp.emp_id}')">${emp.emp_id}</td>
        <td class="p-2 border wrap">${emp.name}</td>
        <td class="p-2 border">${emp.phone || "-"}</td>
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
    showToast("Failed to load employee data.", "error");
  }
}

async function loadPayrollMode() {
  try {
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

        try {
          const res = await fetch("/.netlify/functions/set_payroll_mode", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mode: selected })
          });

          const data = await res.json();
          showToast(data.message || "Payroll mode updated");
          await loadPayrollMode();
        } catch (err) {
          showToast("Failed to update payroll mode.", "error");
        }
      };
    }
  } catch (err) {
    console.error("Failed to load payroll mode:", err);
  }
}

function setupRowListeners(tr, emp, currentUser) {
  // Reset PIN Button
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
    }
  }

  // Reset MFA Button
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
          showToast("Failed to reset MFA. Please try again.", "error");
        }
      };
    }
  }

  // Edit Button
  const editBtn = tr.querySelector(".edit");
  if (editBtn) {
    editBtn.onclick = () => showEditModal(emp, tr);
  }

  // Delete Button
  const deleteBtn = tr.querySelector(".delete");
  if (deleteBtn) {
    deleteBtn.onclick = async () => {
      if (emp.emp_id === currentUser.emp_id) {
        showToast("You cannot delete your own account.", "error");
        return;
      }
      
      if (!confirm(`Are you sure you want to delete ${emp.name} (${emp.emp_id})?`)) return;

      try {
        // For admin verification except super admin
        if (currentUser.emp_id !== "NGX001") {
          const token = prompt("Enter your MFA token for verification:");
          if (!token) return;

          const verify = await fetch("/.netlify/functions/verify_mfa_token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ admin_id: currentUser.emp_id, token })
          });
          
          const result = await verify.json();
          if (!result.valid) {
            showToast("MFA verification failed.", "error");
            return;
          }
        }

        // Delete employee
        const res = await fetch("/.netlify/functions/delete_employee", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ emp_id: emp.emp_id })
        });
        
        const data = await res.json();
        tr.remove();
        showToast(data.message || "Employee deleted successfully");
      } catch (err) {
        console.error("Delete employee error:", err);
        showToast("Failed to delete employee. Please try again.", "error");
      }
    };
  }

  // Privilege dropdown logic
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
        
        if (!res.ok) throw new Error("Failed to update privileges");
        showToast("Privileges updated successfully.");
      } catch (err) {
        console.error("Update privilege error:", err);
        showToast("Failed to update privileges.", "error");
      }
    };
  }
}

function triggerReset(type, empId, message) {
  fetch(`/.netlify/functions/${type}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ emp_id: empId })
  })
    .then(res => res.json())
    .then(() => showToast(message))
    .catch(err => {
      console.error(`${type} failed:`, err);
      showToast(`Failed to ${type.replace("_", " ")}. Please try again.`, "error");
    });
}

// =====================================================
// EMPLOYEE EDIT FUNCTIONALITY
// =====================================================

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
            showToast("Upload failed. Try again.", "error");
            return;
          }
        }

        submitEdit(emp.emp_id, modal, row, uploadedFileUrl);
      };
    })
    .catch(err => {
      console.error("Error fetching employee profile:", err);
      showToast("Failed to load employee profile.", "error");
    });
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

  // Validate fields
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showToast("Invalid email format.", "error");
    return;
  }
  
  if (phone && !/^\d{10}$/.test(phone)) {
    showToast("Phone must be 10 digits.", "error");
    return;
  }

  try {
    const currentUser = JSON.parse(localStorage.getItem("emp_session") || "{}");
    const updateData = {
      emp_id: empId,
      admin_id: currentUser.emp_id
    };

    // Only include fields that have values
    if (email) updateData.email = email;
    if (phone) updateData.phone = phone;
    if (department) updateData.department = department;
    if (role) updateData.employment_role = role;
    if (base_salary) updateData.base_salary = base_salary;
    if (reporting_manager) updateData.reporting_manager = reporting_manager;
    if (joining_date) updateData.joining_date = joining_date;
    if (uploadedFileUrl) updateData.new_document = uploadedFileUrl;

    // Admin MFA verification for changes
    if (currentUser.emp_id !== "NGX001") {
      const token = prompt("Enter MFA token to confirm changes:");
      if (!token) return;

      const verify = await fetch("/.netlify/functions/verify_mfa_token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admin_id: currentUser.emp_id, token })
      });
      
      const result = await verify.json();
      if (!result.valid) {
        showToast("MFA verification failed.", "error");
        return;
      }

      updateData.token = token;
    }

    // Submit the update
    const res = await fetch("/.netlify/functions/update_employee_profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updateData)
    });

    const result = await res.json();
    if (res.ok) {
      showToast(result.message || "Profile updated successfully");
      modal.remove();
      setTimeout(() => location.reload(), 800);
    } else {
      showToast(result.message || "Update failed", "error");
      console.error(result);
    }
  } catch (err) {
    console.error("Submit edit error:", err);
    showToast("Failed to update employee profile.", "error");
  }
}

// =====================================================
// EMPLOYEE DETAILS MODAL
// =====================================================

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
    if (modalEmpId) {
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
    }

    // Fill in personal and job details
    const modalDetails = document.getElementById('modalDetails');
    if (modalDetails) {
      modalDetails.innerHTML = `
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
    }

    // Show documents
    const docList = document.getElementById("docLinks");
    if (docList) {
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
    }

    const employeeModal = document.getElementById("employeeModal");
    if (employeeModal) {
      employeeModal.classList.remove("hidden");
    }
  } catch (error) {
    console.error('Error fetching employee details:', error);
    showToast('Failed to load employee details', "error");
  }
};

window.closeModal = function() {
  const modal = document.getElementById("employeeModal");
  if (modal) modal.classList.add("hidden");
};

window.printModalContent = function() {
  const modalContent = document.getElementById("modalDetails")?.innerHTML;
  const empId = document.getElementById("modalEmpId")?.textContent;
  if (!modalContent || !empId) return;
  
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    showToast("Please allow pop-ups to print content.", "error");
    return;
  }
  
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
  const modalContent = document.getElementById("modalDetails")?.innerHTML;
  const empId = document.getElementById("modalEmpId")?.textContent;
  if (!modalContent || !empId) return;
  
  const pdfWindow = window.open('', '_blank');
  if (!pdfWindow) {
    showToast("Please allow pop-ups to export PDF.", "error");
    return;
  }
  
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

// =====================================================
// EXPORT FUNCTIONALITY
// =====================================================

window.exportCSV = async function() {
  try {
    const res = await fetch("/.netlify/functions/get_employees");
    if (!res.ok) throw new Error(`Failed to fetch employees: ${res.status}`);
    
    const { employees } = await res.json();

    // Fetch full profile for each employee
    const employeeDetails = await Promise.all(
      employees.map(async (emp) => {
        try {
          const profileRes = await fetch(`/.netlify/functions/get_employee_profile?emp_id=${emp.emp_id}`);
          if (!profileRes.ok) throw new Error(`Failed to fetch profile for ${emp.emp_id}`);
          const profile = await profileRes.json();
          return { ...emp, ...profile };
        } catch (error) {
          console.error(`Error fetching profile for ${emp.emp_id}:`, error);
          return emp;
        }
      })
    );

    // CSV Header
    const headers = [
      'ID', 'Name', 'Email', 'Phone', 'DOB', 'Department', 'Role',
      'Reporting Manager', 'Joining Date', 'Base Salary', 'Total Pay', 'Total Hours', 'Document Names'
    ];

    const csvRows = employeeDetails.map(emp => {
      // Format dates
      const dob = emp.dob ? new Date(emp.dob).toLocaleDateString('en-GB') : '';
      const joining = emp.joining_date ? new Date(emp.joining_date).toLocaleDateString('en-GB') : '';
      
      // Format currency
      const totalPay = emp.total_pay ? `₹${Number(emp.total_pay).toLocaleString('en-IN')}` : '';
      
      // Handle documents
      const docs = Array.isArray(emp.documents) 
        ? emp.documents.map(doc => doc.name || 'Document').join('; ')
        : '';

      // Return CSV row with proper escaping for CSV format
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
        docs
      ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(',');
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
    
    showToast('Employee data exported to CSV successfully');
  } catch (error) {
    console.error('Export failed:', error);
    showToast('Export failed. Please try again.', "error");
  }
};

// =====================================================
// BULK SELECTION FUNCTIONALITY
// =====================================================

function toggleSelectAll(mainCheckbox) {
  document.querySelectorAll('input[name="employeeCheckbox"]').forEach(cb => {
    cb.checked = mainCheckbox.checked;
  });
}

document.addEventListener('change', (e) => {
  if (e.target.classList.contains('employeeCheckbox')) {
    const all = document.querySelectorAll('.employeeCheckbox');
    const checked = document.querySelectorAll('.employeeCheckbox:checked');
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    if (selectAllCheckbox) {
      selectAllCheckbox.checked = all.length > 0 && all.length === checked.length;
    }
  }
});

function getSelectedEmployeeIds() {
  return Array.from(document.querySelectorAll('input[name="employeeCheckbox"]:checked'))
    .map(cb => cb.value);
}

// =====================================================
// BULK EMAIL FUNCTIONALITY
// =====================================================

function openEmailModal() {
  const selectedIds = getSelectedEmployeeIds();
  if (selectedIds.length === 0) {
    showToast("Please select at least one employee.", "error");
    return;
  }

  localStorage.setItem("selected_emp_ids", JSON.stringify(selectedIds));

  const session = JSON.parse(localStorage.getItem("emp_session") || "{}");
  const bulkEmailModal = document.getElementById("bulkEmailModal");
  const emailFromInput = document.getElementById("emailFrom");
  
  if (bulkEmailModal && emailFromInput) {
    emailFromInput.value = session.email || "n.dcosta@nikagenyx.com";
    bulkEmailModal.classList.remove("hidden");
  }
}

function closeBulkEmailModal() {
  const modal = document.getElementById("bulkEmailModal");
  const form = document.getElementById("bulkEmailForm");
  const filePreview = document.getElementById("filePreview");
  
  if (modal) modal.classList.add("hidden");
  if (form) form.reset();
  if (filePreview) filePreview.innerHTML = "";
}

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

document.addEventListener("DOMContentLoaded", () => {
  setupAttachmentPreview();
  
  const bulkEmailForm = document.getElementById("bulkEmailForm");
  if (bulkEmailForm) {
    bulkEmailForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const selectedIds = JSON.parse(localStorage.getItem("selected_emp_ids") || "[]");
      if (selectedIds.length === 0) {
        showToast("No employees selected", "error");
        return;
      }

      const session = JSON.parse(localStorage.getItem("emp_session") || "{}");
      const empId = session.emp_id;
      let smtpPassword = session.smtp_password;

      // Get SMTP password if needed
      if (!smtpPassword || smtpPassword === "undefined") {
        try {
          const res = await fetch(`/.netlify/functions/get_smtp_password?emp_id=${empId}`);
          const data = await res.json();
          if (data.smtp_password && data.smtp_password !== "undefined") {
            smtpPassword = data.smtp_password;
          } else {
            smtpPassword = prompt("Enter your email password to send:");
            if (!smtpPassword || smtpPassword.trim() === "") {
              showToast("Sending cancelled – no password entered.", "error");
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
          console.error("Error loading SMTP password:", err);
          showToast("Could not retrieve your SMTP credentials.", "error");
          return;
        }
      }

      // Build email
      const from = "n.dcosta@nikagenyx.com";
      const fromName = session.name || "Nik D'Costa";
      const subject = document.getElementById("emailSubject").value;
      const rawBody = document.getElementById("emailBody").value;
      const attachments = document.getElementById("emailAttachment").files;

      const formData = new FormData();
      formData.append("from", from);
      formData.append("from_name", fromName);
      formData.append("smtp_password", smtpPassword);
      formData.append("subject", subject);
      formData.append("body", rawBody);
      formData.append("recipients", JSON.stringify(selectedIds));
      
      if (attachments && attachments.length > 0) {
        Array.from(attachments).forEach(file => formData.append("attachment", file));
      }

      // Send email
      try {
        const res = await fetch("/.netlify/functions/send_bulk_email", {
          method: "POST",
          body: formData,
        });

        const contentType = (res.headers.get("content-type") || "").toLowerCase();
        
        if (!res.ok) {
          const errorText = await res.text();
          console.error("Email failed:", errorText);
          try {
            const errorJson = JSON.parse(errorText);
            showToast(errorJson.message || "Email sending failed.", "error");
          } catch {
            showToast("Email sending failed.", "error");
          }
          return;
        }

        const result = contentType.includes("application/json") ? await res.json() : {};
        if (result.failed?.length) {
          showToast(`Emails sent with some failures: ${result.failed.join(", ")}`, "error");
        } else {
          showToast(result.message || "Emails sent successfully");
        }

        closeBulkEmailModal();
      } catch (err) {
        console.error("Exception during email send:", err);
        showToast("Unexpected error occurred while sending emails.", "error");
      }
    });
  }
});

// =====================================================
// PDF LETTER GENERATION
// =====================================================

function initTinyMCE() {
  if (typeof tinymce === "undefined") {
    console.warn("TinyMCE not loaded");
    return;
  }
  
  const textarea = document.getElementById('letterBody');
  if (!textarea) return;

  tinymce.init({
    selector: '#letterBody',
    height: 300,
    menubar: false,
    plugins: 'lists link table',
    toolbar: 'undo redo | bold italic underline | fontsize | alignleft aligncenter alignright | bullist numlist | table',
    setup: function(editor) {
      editor.on('input', updatePDFPreview);
      editor.on('change', updatePDFPreview);
    }
  });
}

function openPDFLetterModal() {
  const selectedIds = getSelectedEmployeeIds();
  if (selectedIds.length === 0) {
    showToast("Please select at least one employee.", "error");
    return;
  }
  
  const modal = document.getElementById("pdfLetterModal");
  if (modal) {
    modal.classList.remove("hidden");
    updatePDFPreview();
  }
}

function closePDFLetterModal() {
  const modal = document.getElementById("pdfLetterModal");
  if (modal) {
    modal.classList.add("hidden");
  }
}

async function generatePDFLetters() {
  const selectedIds = getSelectedEmployeeIds();
  if (!selectedIds.length) {
    showToast("Please select employees.", "error");
    return;
  }

  try {
    // Show loading indicator
    showToast("Generating PDFs. Please wait...");
    
    const rawHTML = tinymce.get("letterBody")?.getContent() || "";
    
    // jsPDF configuration
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "pt",
      format: "a4"
    });
    
    // Page dimensions
    const pageWidth = doc.internal.pageSize.getWidth();   // 595.28pt
    const pageHeight = doc.internal.pageSize.getHeight(); // 841.89pt
    
    // Header and footer dimensions
    const headerHeight = 90;  // Height in pt
    const footerHeight = 60;  // Height in pt
    const sideMargin = 48;    // Left/right margin in pt
    
    // Load header/footer images
    const headerURL = "https://raw.githubusercontent.com/Nicdcosta21/Nikagenyx-Website/main/assets/HEADER.png";
    const footerURL = "https://raw.githubusercontent.com/Nicdcosta21/Nikagenyx-Website/main/assets/FOOTER.png";
    
    const [headerImg, footerImg] = await Promise.all([
      loadImageAsDataURL(headerURL),
      loadImageAsDataURL(footerURL)
    ]);
    
    // Get employee data
    const res = await fetch("/.netlify/functions/get_employees");
    const { employees } = await res.json();
    const selectedEmployees = employees.filter(emp => selectedIds.includes(emp.emp_id));
    
    // Generate PDF for each selected employee
    for (const emp of selectedEmployees) {
      // Replace placeholders with employee data
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
      
      // Create container for rendering HTML to PDF
      const container = document.createElement("div");
      
      // CRITICAL FIX: Set explicit width to match PDF page width minus margins
      container.style.width = (pageWidth - 2 * sideMargin) + "pt";
      container.style.minHeight = "100pt";  // Just needs to be enough to render
      container.style.background = "#fff";
      container.style.overflow = "visible";  // IMPORTANT: Don't hide overflow
      
      // Add styling and content
      container.innerHTML = `
        <style>
          * { box-sizing: border-box; }
          body, div, p, span, table, td { 
            font-family: Arial !important; 
            font-size: 13pt !important; 
            color: #000 !important;
          }
          h1, h2 { font-weight: bold; }
          p { margin: 0 0 10pt 0; }
          table { width: 100%; border-collapse: collapse; }
          td, th { padding: 4pt; }
          .signature-line { 
            display: inline-block; 
            border-bottom: 1px solid #000; 
            min-width: 120pt; 
            height: 14pt; 
            vertical-align: bottom;
          }
        </style>
        <div id="pdfContent">
          ${personalizedHTML}
        </div>
      `;
      
      // Add container to document but hide it
      container.style.position = "fixed";
      container.style.left = "-9999px";
      document.body.appendChild(container);
      
      // Create PDF document for this employee
      const empDoc = new jsPDF({
        orientation: "portrait",
        unit: "pt",
        format: "a4"
      });
      
      // Render HTML to PDF
      await empDoc.html(container, {
        // CRITICAL FIX: Set the correct margins that account for header/footer
        margin: [
          headerHeight + 16,  // Top margin including header
          sideMargin,         // Right margin
          footerHeight + 16,  // Bottom margin including footer
          sideMargin          // Left margin
        ],
        autoPaging: "text",
        width: pageWidth - (2 * sideMargin),  // Important: set explicit width
        html2canvas: {
          scale: 1.33,        // Higher scale for sharper text
          useCORS: true,
          backgroundColor: "#fff"
        },
        callback: function(doc) {
          const totalPages = doc.internal.getNumberOfPages();
          
          // Add header and footer to each page
          for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            
            // Add header at the top of the page
            doc.addImage(headerImg, "PNG", 0, 0, pageWidth, headerHeight);
            
            // Add footer at the bottom of the page
            doc.addImage(footerImg, "PNG", 0, pageHeight - footerHeight, pageWidth, footerHeight);
            
            // Add copyright text
            doc.setFontSize(9);
            doc.setTextColor(150);
            doc.text(
              "© 2025 Nikagenyx Vision Tech Private Limited. All rights reserved.",
              pageWidth / 2,
              pageHeight - 14,
              { align: "center" }
            );
          }
          
          // Generate filename
          const cleanName = emp.name?.trim().replace(/\s+/g, "_") || "Employee";
          const cleanRole = emp.employment_role?.trim().replace(/\s+/g, "_").replace(/[^\w()_]/g, "") || "Role";
          const filename = `${cleanName}_${emp.emp_id}_${cleanRole}.pdf`;
          
          // Save PDF
          doc.save(filename);
          
          // Clean up
          container.remove();
        }
      });
    }
    
    showToast(`Successfully generated ${selectedEmployees.length} PDF(s)`);
    closePDFLetterModal();
  } catch (err) {
    console.error("PDF Generation Error:", err);
    showToast("Error generating PDFs: " + err.message, "error");
  }
}

// Utility to load images as data URLs
async function loadImageAsDataURL(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to load image: ${res.status}`);
    
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.error("Image loading error:", err);
    throw err;
  }
}

function updatePDFPreview() {
  const preview = document.getElementById("pdfPreview");
  if (!preview) return;

  const selectedIds = getSelectedEmployeeIds();
  if (selectedIds.length === 0) {
    preview.innerHTML = "<p class='text-center text-gray-500'>(Select an employee to see preview)</p>";
    return;
  }

  // Get TinyMCE content
  const rawContent = tinymce.get("letterBody")?.getContent() || "";

  // Fetch employee data
  fetch("/.netlify/functions/get_employees")
    .then(res => res.json())
    .then(({ employees }) => {
      const emp = employees.find(e => selectedIds.includes(e.emp_id));
      if (!emp) {
        preview.innerHTML = "<p class='text-center text-gray-500'>(Employee data not found)</p>";
        return;
      }

      // Replace placeholders
      let mergedContent = rawContent
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

      // Replace page breaks with visual separator
      const paginatedContent = mergedContent.replace(/<!--\s*PAGEBREAK\s*-->/gi, 
        '<div class="my-4 border-b-2 border-dashed border-gray-400 text-center text-gray-400">[Page Break]</div>');

      // Show preview with header and footer
      preview.innerHTML = `
        <div style="text-align:center; padding-bottom: 10px;">
          <img src="https://raw.githubusercontent.com/Nicdcosta21/Nikagenyx-Website/main/assets/HEADER.png" 
               style="width:100%; max-height:80px;" alt="Header" />
        </div>
        <div style="padding: 15px; font-size: 14px; line-height: 1.6; color: #333;">
          ${paginatedContent}
        </div>
        <div style="text-align:center; padding-top: 10px;">
          <img src="https://raw.githubusercontent.com/Nicdcosta21/Nikagenyx-Website/main/assets/FOOTER.png" 
               style="width:100%; max-height:60px;" alt="Footer" />
        </div>
      `;
    })
    .catch(err => {
      console.error("Error generating preview:", err);
      preview.innerHTML = "<p class='text-center text-red-500'>Error generating preview</p>";
    });
}

// Make sure fetchEmployees is available globally
window.fetchEmployees = fetchEmployees;
