/**
 * Nikagenyx Employee Dashboard
 * Main controller that integrates all dashboard modules
 */

// ======================
// MAIN DASHBOARD CONTROLLER
// ======================
document.addEventListener("DOMContentLoaded", async () => {
  console.log("Initializing dashboard...");
  
  try {
    // 1. Check session and get employee ID
    const empSession = JSON.parse(localStorage.getItem("emp_session"));
    const empId = empSession?.emp_id;
    
    if (!empId) {
      window.location.href = "employee_portal.html";
      return;
    }

    // 2. Set employee name in header
document.getElementById("empName").textContent = empSession?.name || "Employee";
// Set employee ID in header
document.getElementById("empIdDisplay").textContent = empId
  ? `(ID: ${empId})`
  : "";
    
    // 3. Initialize clock system
    try {
      await window.ClockSystem.init(empId);
    } catch (clockError) {
      console.error("Clock system initialization error:", clockError);
      window.ToastManager.show("Error initializing clock system. Some features may not work correctly.", true);
    }
    
    // 4. Check birthday 
    try {
      await checkBirthday(empId, empSession.name);
    } catch (birthdayError) {
      console.warn("Birthday check failed:", birthdayError);
      // Non-critical error, continue initialization
    }

    // 5. Initialize dashboard data
    window.DashboardData.init(empId);
    
    // 6. Setup auto-clockout
    setupAutoClockOutCheck(empId);
    
    // 7. Setup event listeners
    setupEventListeners();
    
    console.log("Dashboard initialization complete");
  } catch (error) {
    console.error("Critical dashboard initialization error:", error);
    
    // Show error message to user
    const errorMessage = document.createElement("div");
    errorMessage.className = "fixed inset-0 bg-red-900 bg-opacity-90 flex items-center justify-center z-50";
    errorMessage.innerHTML = `
      <div class="bg-gray-800 p-6 rounded-lg max-w-md text-center">
        <h2 class="text-xl font-bold text-red-400 mb-4">Dashboard Initialization Failed</h2>
        <p class="text-white mb-6">
          We encountered a problem while loading your dashboard. This could be due to:
          <ul class="list-disc text-left pl-5 mt-2 text-gray-300 space-y-1">
            <li>Connection issues</li>
            <li>Session expired</li>
            <li>Server maintenance</li>
          </ul>
        </p>
        <div class="flex justify-center space-x-4">
          <button onclick="window.location.reload()" class="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded">
            Retry
          </button>
          <button onclick="window.location.href='employee_portal.html'" class="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded">
            Back to Login
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(errorMessage);
  }
});

// ======================
// BIRTHDAY CELEBRATION
// ======================
async function checkBirthday(empId, fallbackName) {
  // Check if we've already shown the birthday modal today
  const today = new Date().toISOString().split('T')[0];
  if (localStorage.getItem("birthday_shown_" + today)) {
    return; // Don't show again today
  }
  
  // Fetch employee profile to get date of birth
  const res = await fetch(`/.netlify/functions/get_employee_profile?emp_id=${empId}`);
  if (!res.ok) throw new Error("Failed to fetch profile");
  
  const profile = await res.json();
  const dob = profile.dob;
  const name = profile.name || fallbackName || "Employee";
  
  if (!dob) return; // No birthday set
  
  // Check if today matches the birth date (ignoring year)
  const todayDate = new Date();
  const birthDate = new Date(dob);
  
  // Compare month and day
  if (todayDate.getMonth() === birthDate.getMonth() && 
      todayDate.getDate() === birthDate.getDate()) {
    // It's their birthday! Show celebration
    showBirthdayCelebration(name);
  }
}

function showBirthdayCelebration(name) {
  // Create celebration modal
  const modal = document.createElement("div");
  modal.className = "fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50";
  modal.id = "birthdayModal";
  
  modal.innerHTML = `
    <div class="bg-gradient-to-r from-purple-600 to-blue-600 p-8 rounded-lg shadow-xl w-full max-w-md text-center animate-bounce-in">
      <h2 class="text-3xl font-bold mb-4">🎉 Happy Birthday! 🎂</h2>
      <p class="text-xl mb-6">Wishing you a fantastic day, ${name}!</p>
      <p class="text-lg mb-8">May your day be filled with joy, success, and great achievements!</p>
      <button onclick="closeBirthdayModal()" class="px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-white font-bold rounded-full shadow-lg transform transition hover:scale-105">
        Thank You! 🎈
      </button>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Add confetti animation
  launchConfetti();
  
  // Add animation styles
  document.head.insertAdjacentHTML("beforeend", `
    <style>
      @keyframes bounce-in {
        0% { transform: scale(0.8); opacity: 0; }
        50% { transform: scale(1.05); opacity: 1; }
        100% { transform: scale(1); opacity: 1; }
      }
      .animate-bounce-in {
        animation: bounce-in 0.5s ease-out forwards;
      }
    </style>
  `);
  
  // Flag that we've shown the birthday modal today
  localStorage.setItem("birthday_shown_" + new Date().toISOString().split('T')[0], "true");
}

function launchConfetti() {
  try {
    // Check if confetti is available
    if (typeof confetti !== 'function') {
      console.warn("Confetti library not loaded, skipping animation");
      return;
    }
    
    // Launch intense confetti
    const count = 200;
    const defaults = {
      origin: { y: 0.7 },
      zIndex: 1051
    };
  
    function fire(particleRatio, opts) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio)
      });
    }
  
    fire(0.25, {
      spread: 26,
      startVelocity: 55,
    });
    
    fire(0.2, {
      spread: 60,
    });
    
    fire(0.35, {
      spread: 100,
      decay: 0.91,
      scalar: 0.8
    });
    
    fire(0.1, {
      spread: 120,
      startVelocity: 25,
      decay: 0.92,
      scalar: 1.2
    });
    
    fire(0.1, {
      spread: 120,
      startVelocity: 45,
    });
    
    // Add periodic confetti for as long as the modal is open
    const confettiInterval = setInterval(() => {
      if (!document.getElementById('birthdayModal')) {
        clearInterval(confettiInterval);
        return;
      }
      
      confetti({
        particleCount: 50,
        startVelocity: 30,
        spread: 100,
        origin: {
          x: Math.random(),
          y: Math.random() - 0.2
        },
        zIndex: 1051
      });
    }, 2000);
  } catch (error) {
    console.error("Confetti error:", error);
    // Non-critical error, continue without animation
  }
}

// Function to close birthday modal
window.closeBirthdayModal = function() {
  const modal = document.getElementById('birthdayModal');
  if (modal) {
    // Add the animation style if it doesn't exist
    if (!document.getElementById('fadeOutStyle')) {
      document.head.insertAdjacentHTML("beforeend", `
        <style id="fadeOutStyle">
          @keyframes fade-out {
            from { opacity: 1; transform: translateY(0); }
            to { opacity: 0; transform: translateY(10px); }
          }
          .fade-out {
            animation: fade-out 0.5s ease-in forwards;
          }
        </style>
      `);
    }
    
    modal.classList.add('fade-out');
    setTimeout(() => modal.remove(), 500);
  }
};

// ======================
// AUTO CLOCK-OUT SYSTEM - 5 MINUTES INACTIVITY
// ======================
function setupAutoClockOutCheck(empId) {
  // Clear any existing interval when initializing
  if (window.inactivityInterval) {
    clearInterval(window.inactivityInterval);
  }
  
  function checkInactivity() {
    const lastAction = localStorage.getItem("last_action");
    const lastActivity = parseInt(localStorage.getItem("last_activity"), 10) || 0;
    
    // Check if 5 minutes (300000 ms) of inactivity and currently clocked in
    if (lastAction === "in" && Date.now() - lastActivity > 300000) {
      console.log("Auto clock-out triggered after 5 minutes inactivity");
      
      // Verify with server that user is actually clocked in
      const timestamp = Date.now();
      fetch(`/.netlify/functions/get_clock_status?emp_id=${empId}&_t=${timestamp}`, {
        headers: {
          "Cache-Control": "no-cache",
          "Pragma": "no-cache"
        }
      })
        .then(res => {
          if (!res.ok) throw new Error(`Server error: ${res.status}`);
          return res.json();
        })
        .catch(() => ({ last_action: lastAction }))
        .then(data => {
          if (data.last_action === "in") {
            // If truly clocked in, perform auto clock-out
            return fetch("/.netlify/functions/mark_attendance", {
              method: "POST",
              headers: { 
                "Content-Type": "application/json",
                "Cache-Control": "no-cache"
              },
              body: JSON.stringify({ 
                emp_id: empId, 
                type: "out",
                auto: true,
                timestamp: Date.now()
              })
            })
            .then(res => {
              if (!res.ok) throw new Error(`Auto-clockout server error: ${res.status}`);
              return res.json();
            })
            .then(() => {
              localStorage.setItem("last_action", "out");
              const statusMsg = document.getElementById("statusMessage");
              if (statusMsg) {
                statusMsg.textContent = "Auto clocked out due to 5 minutes of inactivity";
              }
              
              // Update button states using our helper functions
              if (window.clockSystemFunctions) {
                window.clockSystemFunctions.updateClockState("out");
              } else {
                // Fallback if clock system functions aren't available
                const clockInBtn = document.getElementById("clockInBtn");
                const clockOutBtn = document.getElementById("clockOutBtn");
                
                if (clockInBtn && clockOutBtn) {
                  clockInBtn.disabled = false;
                  clockOutBtn.disabled = true;
                  clockInBtn.classList.remove("clock-btn-disabled");
                  clockInBtn.classList.add("clock-btn-active");
                  clockOutBtn.classList.remove("clock-btn-active");
                  clockOutBtn.classList.add("clock-btn-disabled");
                }
              }
              
              window.ToastManager.show("You've been automatically clocked out due to 5 minutes of inactivity", true);
              
              // Refresh dashboard data
              document.dispatchEvent(new CustomEvent('dashboard:refresh'));
            });
          }
        })
        .catch(err => {
          console.error("Error during auto clock-out check:", err);
        });
    }
  }

  // Track user activity - mouse, keyboard, touch
  ['mousemove', 'keydown', 'click', 'touchstart', 'touchmove'].forEach(event => {
    document.addEventListener(event, () => {
      // Only update if currently clocked in
      if (localStorage.getItem("last_action") === "in") {
        localStorage.setItem("last_activity", Date.now());
      }
    });
  });

  // Check every 30 seconds
  window.inactivityInterval = setInterval(checkInactivity, 30000);
}

// ======================
// EVENT LISTENERS
// ======================
function setupEventListeners() {
  // Leave Application Modal
  window.showLeaveModal = () => {
    try {
      const modal = document.createElement("div");
      modal.className = "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50";
      modal.id = "leaveModal"; // Add ID for easy removal
      
      modal.innerHTML = `
        <div class="bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md">
          <h3 class="text-xl font-semibold mb-4">Apply for Leave</h3>
          <form id="leaveForm" class="space-y-4">
            <div>
              <label class="block mb-1 text-sm">Leave Type</label>
              <select name="type" class="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600">
                <option value="sick">Sick Leave</option>
                <option value="casual">Casual Leave</option>
                <option value="emergency">Emergency Leave</option>
              </select>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block mb-1 text-sm">From Date</label>
                <input type="date" name="from" class="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600">
              </div>
              <div>
                <label class="block mb-1 text-sm">To Date</label>
                <input type="date" name="to" class="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600">
              </div>
            </div>
            <div>
              <label class="block mb-1 text-sm">Reason</label>
              <textarea name="reason" rows="3" class="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600"></textarea>
            </div>
            <div class="flex justify-end gap-2 mt-4">
              <button type="button" onclick="document.getElementById('leaveModal').remove()" 
                class="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded">Cancel</button>
              <button type="submit" 
                class="px-4 py-2 bg-green-600 hover:bg-green-700 rounded">Submit</button>
            </div>
          </form>
        </div>
      `;
      
      document.body.appendChild(modal);
      
      // Set minimum date to today
      const today = new Date().toISOString().split('T')[0];
      modal.querySelector("input[name='from']").min = today;
      modal.querySelector("input[name='to']").min = today;
      
      modal.querySelector("#leaveForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        try {
          const empSession = JSON.parse(localStorage.getItem("emp_session"));
          const empId = empSession?.emp_id;
          
          if (!empId) {
            throw new Error("Session expired");
          }
          
          const fromDate = formData.get("from");
          const toDate = formData.get("to");
          const reason = formData.get("reason");
          const type = formData.get("type");
          
          // Validate inputs
          if (!fromDate || !toDate || !reason || !type) {
            throw new Error("Please fill all required fields");
          }
          
          // Validate dates
          if (new Date(fromDate) > new Date(toDate)) {
            throw new Error("From date cannot be after To date");
          }
          
          const res = await fetch("/.netlify/functions/apply_leave", {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              "Cache-Control": "no-cache"
            },
            body: JSON.stringify({
              emp_id: empId,
              ...Object.fromEntries(formData)
            })
          });
          
          if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.message || `HTTP error! Status: ${res.status}`);
          }
          
          const result = await res.json();
          window.ToastManager.show(result.message || "Leave application submitted");
          modal.remove();
          
          // Refresh dashboard to show new activity
          document.dispatchEvent(new CustomEvent('dashboard:refresh'));
          
        } catch (err) {
          console.error("Leave application error:", err);
          window.ToastManager.show(err.message || "Error submitting leave application", true);
          modal.remove();
        }
      });
    } catch (error) {
      console.error("Error displaying leave modal:", error);
      window.ToastManager.show("Error displaying leave application form", true);
    }
  };

  // Logout function with confirmation
  window.logout = () => {
    try {
      // Create confirmation dialog
      const modal = document.createElement("div");
      modal.className = "fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50";
      modal.innerHTML = `
        <div class="bg-gray-800 p-6 rounded-lg shadow-xl max-w-sm w-full text-center">
          <h3 class="text-xl font-semibold mb-6">Confirm Logout</h3>
          <p class="mb-8">Are you sure you want to logout?</p>
          <div class="flex justify-center gap-4">
            <button id="cancelLogout" class="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded">Cancel</button>
            <button id="confirmLogout" class="px-4 py-2 bg-red-600 hover:bg-red-700 rounded">Logout</button>
          </div>
        </div>
      `;
      
      document.body.appendChild(modal);
      
      // Add event listeners
      document.getElementById("cancelLogout").addEventListener("click", () => {
        modal.remove();
      });
      
      document.getElementById("confirmLogout").addEventListener("click", async () => {
        try {
          // Try to call the logout endpoint
          await fetch("/.netlify/functions/logout");
        } catch (error) {
          console.warn("Error during server logout:", error);
          // Continue with client-side logout anyway
        }
        
        // Clean up local storage
        localStorage.removeItem("emp_session");
        localStorage.removeItem("last_action");
        localStorage.removeItem("last_activity");
        
        // Redirect to login
        window.location.href = "employee_portal.html";
      });
    } catch (error) {
      console.error("Error during logout:", error);
      
      // Fallback to direct logout
      localStorage.removeItem("emp_session");
      localStorage.removeItem("last_action");
      localStorage.removeItem("last_activity");
      window.location.href = "employee_portal.html";
    }
  };

  // Dark mode toggler
  window.toggleDarkMode = function() {
    try {
      const body = document.body;
      const isDarkMode = body.classList.contains('bg-gray-900');
      
      // Toggle classes for dark/light mode
      body.classList.toggle('bg-gray-900');
      body.classList.toggle('bg-white');
      body.classList.toggle('text-white');
      body.classList.toggle('text-black');
      
      // Store preference in localStorage
      localStorage.setItem('darkMode', isDarkMode ? 'light' : 'dark');
      
      // Notify user
      window.ToastManager.show(`${isDarkMode ? 'Light' : 'Dark'} mode enabled`);
    } catch (error) {
      console.error("Error toggling dark mode:", error);
    }
  };
  
  // Apply stored dark mode preference
  const storedDarkMode = localStorage.getItem('darkMode');
  if (storedDarkMode === 'light') {
    // Toggle from default dark to light
    window.toggleDarkMode();
  }
}
