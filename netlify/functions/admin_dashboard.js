window.onload = async () => {
  try {
    const res = await fetch("/.netlify/functions/get_employees", {
      credentials: "include",
    });

    if (!res.ok) {
      console.warn("❌ get_employees failed:", res.status);
      return;
    }

    const data = await res.json();
    const session = localStorage.getItem("emp_session");
    const currentUser = session ? JSON.parse(session) : null;
    const employees = data.employees || data;
    const table = document.getElementById("employeeTable");

    employees.forEach((emp) => {
      const tr = document.createElement("tr");
      tr.id = `row-${emp.emp_id}`;
      tr.innerHTML = `
        <td class="border p-2 cursor-pointer text-blue-400 hover:underline" title="View full profile" onclick="showEmployeeDetails('${emp.emp_id}')">
          ${emp.emp_id}
        </td>
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
          <button class="reset-pin bg-blue-500 px-2 py-1 rounded text-xs">Reset PIN</button>
          <button class="reset-mfa bg-yellow-500 px-2 py-1 rounded text-xs">Reset MFA</button>
          <button class="edit bg-purple-500 px-2 py-1 rounded text-xs">Edit</button>
          <button class="delete bg-red-500 px-2 py-1 rounded text-xs">Delete</button>
          <button class="mark-attendance bg-green-500 px-2 py-1 rounded text-xs">Mark Attendance</button>
        </td>
      `;
      table.appendChild(tr);

      // Event bindings
      tr.querySelector('.confirm-role').addEventListener('click', () => {
        const newRole = tr.querySelector('.role-select').value;
        changeRole(emp.emp_id, newRole);
      });

      tr.querySelector('.reset-pin').addEventListener('click', () => {
        fetch("/.netlify/functions/reset_pin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ emp_id: emp.emp_id }),
        })
          .then((res) => res.json())
          .then((data) => showToast(data.message || `PIN reset for ${emp.emp_id}`))
          .catch((err) => {
            console.error("Reset PIN failed:", err);
            alert("❌ Failed to reset PIN.");
          });
      });

      tr.querySelector('.reset-mfa').addEventListener('click', () => {
        fetch("/.netlify/functions/reset_mfa", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ emp_id: emp.emp_id }),
        })
          .then((res) => res.json())
          .then((data) => {
            showToast(`MFA reset for ${emp.emp_id}`);
            const qrModal = document.createElement('div');
            qrModal.innerHTML = `
              <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div class="bg-white text-black p-6 rounded shadow-lg max-w-sm">
                  <h2 class="text-lg font-bold mb-2">Scan New MFA QR for ${emp.name}</h2>
                  <img src="${data.qr_code_url}" alt="MFA QR Code" class="mx-auto mb-4 w-40 h-40" />
                  <button onclick="this.parentElement.parentElement.remove()" class="mt-2 bg-blue-600 text-white px-4 py-2 rounded">Close</button>
                </div>
              </div>`;
            document.body.appendChild(qrModal);
          })
          .catch((err) => {
            console.error("Reset MFA failed:", err);
            alert("❌ Failed to reset MFA.");
          });
      });

      if (emp.emp_id === currentUser.emp_id) {
        const deleteBtn = tr.querySelector('.delete');
        deleteBtn.disabled = true;
        deleteBtn.classList.add('opacity-50', 'cursor-not-allowed');
      } else {
        tr.querySelector('.delete').addEventListener('click', () => {
          if (confirm(`Are you sure to delete ${emp.emp_id}?`)) {
            fetch("/.netlify/functions/delete_employee", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ emp_id: emp.emp_id }),
            })
              .then((res) => {
                if (!res.ok) throw new Error("Failed to delete");
                return res.json();
              })
              .then((data) => {
                showToast(data.message);
                tr.remove();
              })
              .catch((err) => {
                console.error("Delete failed:", err);
                alert("❌ Failed to delete employee.");
              });
