// ======================
// MAIN DASHBOARD CONTROLLER
// ======================
document.addEventListener("DOMContentLoaded", async () => {
  console.log("Initializing dashboard...");
  
  // 1. Check session and get employee ID
  const empSession = JSON.parse(localStorage.getItem("emp_session"));
  const empId = empSession?.emp_id;
  
  if (!empId) {
    window.location.href = "employee_portal.html";
    return;
  }

  // 2. Set employee name in header
  document.getElementById("empName").textContent = empSession?.name || "Employee";

  // 3. Initialize clock system FIRST to ensure buttons are properly set
  await initClockSystem(empId);
  
  // 4. Check birthday 
  await checkBirthday(empId, empSession.name);

  // 5. Initialize remaining dashboard components
  loadDashboardData(empId);
  setupAutoClockOutCheck(empId);
  setupEventListeners();
  
  console.log("Dashboard initialization complete");
});

// ======================
// FIXED CLOCK IN/OUT SYSTEM WITH CACHE BUSTING
// ======================
async function initClockSystem(empId) {
  console.log("Initializing clock system for employee:", empId);
  
  const clockInBtn = document.getElementById("clockInBtn");
  const clockOutBtn = document.getElementById("clockOutBtn");
  const statusMsg = document.getElementById("statusMessage");
  
  // Remove onclick handlers to prevent duplicates
  clockInBtn.removeAttribute("onclick");
  clockOutBtn.removeAttribute("onclick");
  
  // Clear existing event listeners using clone technique
  const newClockInBtn = clockInBtn.cloneNode(true);
  const newClockOutBtn = clockOutBtn.cloneNode(true);
  
  clockInBtn.parentNode.replaceChild(newClockInBtn, clockInBtn);
  clockOutBtn.parentNode.replaceChild(newClockOutBtn, clockOutBtn);
  
  // Re-assign variables to new elements
  const inBtn = document.getElementById("clockInBtn");
  const outBtn = document.getElementById("clockOutBtn");
  
  // Helper functions for button state
  function enableButton(button) {
    button.disabled = false;
    button.classList.remove("clock-btn-disabled");
    button.classList.add("clock-btn-active");
  }
  
  function disableButton(button) {
    button.disabled = true;
    button.classList.remove("clock-btn-active");
    button.classList.add("clock-btn-disabled");
  }
  
  // Helper function to update clock state
  function updateClockState(state) {
    console.log("Setting clock state to:", state);
    localStorage.setItem("last_action", state);
    
    if (state === "in") {
      disableButton(inBtn);
      enableButton(outBtn);
      if (!localStorage.getItem("last_activity")) {
        localStorage.setItem("last_activity", Date.now());
      }
    } else {
      enableButton(inBtn);
      disableButton(outBtn);
    }
  }
  
  // Initially disable both buttons until we check the actual status
  disableButton(inBtn);
  disableButton(outBtn);
  statusMsg.textContent = "Checking your clock status...";
  
  // Verification function
  async function verifyClockStatus() {
    try {
      const timestamp = Date.now();
      const response = await fetch(`/.netlify/functions/get_clock_status?emp_id=${empId}&_t=${timestamp}`, {
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
          "Expires": "0"
        },
        cache: "no-store"
      });
      
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Verified clock status:", data);
      
      // Update state based on verification
      updateClockState(data.last_action);
      statusMsg.textContent = data.message || "Status verified";
      
    } catch (error) {
      console.error("Error verifying clock status:", error);
      
      // Fallback to localStorage state if verification fails
      const lastAction = localStorage.getItem("last_action") || "out";
      updateClockState(lastAction);
    }
  }
  
  // Handler for Clock In
  async function handleClockIn() {
    if (inBtn.disabled) return;
    
    // Disable both buttons during operation
    disableButton(inBtn);
    disableButton(outBtn);
    statusMsg.textContent = "Clocking in...";
    
    try {
      const timestamp = Date.now();
      const response = await fetch("/.netlify/functions/mark_attendance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
          "Pragma": "no-cache"
        },
        body: JSON.stringify({ 
          emp_id: empId, 
          type: "in",
          timestamp: timestamp // Include timestamp for cache busting
        }),
        cache: "no-store"
      });
      
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Clock in result:", data);
      
      // Update state
      localStorage.setItem("last_action", "in");
      localStorage.setItem("last_activity", Date.now());
      
      // Update UI
      disableButton(inBtn);
      enableButton(outBtn);
      statusMsg.textContent = data.message || "Successfully clocked in";
      
      // Refresh dashboard data
      loadDashboardData(empId);
    } catch (error) {
      console.error("Error clocking in:", error);
      statusMsg.textContent = "Error clocking in. Please try again.";
      
      // Verify with server to get true state
      verifyClockStatus();
    }
  }
  
  // Handler for Clock Out
  async function handleClockOut() {
    if (outBtn.disabled) return;
    
    // Disable both buttons during operation
    disableButton(inBtn);
    disableButton(outBtn);
    statusMsg.textContent = "Clocking out...";
    
    try {
      const timestamp = Date.now();
      const response = await fetch("/.netlify/functions/mark_attendance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
          "Pragma": "no-cache"
        },
        body: JSON.stringify({ 
          emp_id: empId, 
          type: "out",
          timestamp: timestamp // Include timestamp for cache busting
        }),
        cache: "no-store"
      });
      
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Clock out result:", data);
      
      // Update state
      localStorage.setItem("last_action", "out");
      
      // Update UI
      enableButton(inBtn);
      disableButton(outBtn);
      statusMsg.textContent = data.message || "Successfully clocked out";
      
      // Refresh dashboard data
      loadDashboardData(empId);
    } catch (error) {
      console.error("Error clocking out:", error);
      statusMsg.textContent = "Error clocking out. Please try again.";
      
      // Verify with server to get true state
      verifyClockStatus();
    }
  }
  
  // Set up event listeners with the newly created buttons
  inBtn.addEventListener("click", handleClockIn);
  outBtn.addEventListener("click", handleClockOut);
  
  // Determine initial state from server with cache busting
  try {
    const timestamp = Date.now();
    const response = await fetch(`/.netlify/functions/get_clock_status?emp_id=${empId}&_t=${timestamp}`, {
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
      },
      cache: "no-store" // For fetch API cache control
    });
    
    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log("Clock status response:", data);
    
    // Update localStorage and UI based on server response
    updateClockState(data.last_action);
    statusMsg.textContent = data.message || "Ready to clock in";
    
  } catch (error) {
    console.error("Error checking clock status:", error);
    statusMsg.textContent = "Error checking status. Please refresh.";
    
    // Default to allowing clock in if there's an error
    enableButton(inBtn);
    disableButton(outBtn);
  }
  
  // Make handlers available globally for compatibility
  window.clockIn = handleClockIn;
  window.clockOut = handleClockOut;
  
  // Export functions for auto-clockout
  window.clockSystemFunctions = {
    updateClockState,
    enableButton,
    disableButton,
    verifyClockStatus
  };
  
  return {
    updateClockState,
    verifyClockStatus
  };
}

// ======================
// BIRTHDAY CELEBRATION
// ======================
async function checkBirthday(empId, fallbackName) {
  try {
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
  } catch (err) {
    console.warn("Could not check birthday:", err);
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
        .then(res => res.json())
        .catch(() => ({ last_action: lastAction }))
        .then(data => {
          if (data.last_action === "in") {
            // If truly clocked in, perform auto clock-out
            fetch("/.netlify/functions/mark_attendance", {
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
            .then(res => res.json())
            .then(() => {
              localStorage.setItem("last_action", "out");
              document.getElementById("statusMessage").textContent = 
                "Auto clocked out due to 5 minutes of inactivity";
              
              // Update button states using our helper functions
              if (window.clockSystemFunctions) {
                window.clockSystemFunctions.updateClockState("out");
              } else {
                // Fallback if clock system functions aren't available
                const clockInBtn = document.getElementById("clockInBtn");
                const clockOutBtn = document.getElementById("clockOutBtn");
                
                clockInBtn.disabled = false;
                clockOutBtn.disabled = true;
                clockInBtn.classList.remove("clock-btn-disabled");
                clockInBtn.classList.add("clock-btn-active");
                clockOutBtn.classList.remove("clock-btn-active");
                clockOutBtn.classList.add("clock-btn-disabled");
              }
              
              showToast("You've been automatically clocked out due to 5 minutes of inactivity", true);
              
              // Refresh dashboard data
              loadDashboardData(empId);
            })
            .catch(err => {
              console.error("Error auto-clocking out:", err);
            });
          }
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
// DASHBOARD DATA LOADER WITH CACHE BUSTING
// ======================
async function loadDashboardData(empId) {
  document.getElementById('activityFeed').innerHTML = `<li class="text-center text-gray-400 py-4">Loading activities...</li>`;
  
  try {
    const timestamp = Date.now();
    const res = await fetch(`/.netlify/functions/get_dashboard_data?emp_id=${empId}&_t=${timestamp}`, {
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
      },
      cache: "no-store" // For fetch API cache control
    });
    
    if (!res.ok) {
      throw new Error(`Failed to fetch data: ${res.status}`);
    }
    
    const contentType = res.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      throw new Error("Invalid response format");
    }
    
    const data = await res.json();
    console.log("Dashboard data loaded:", data);
    
    // Update UI with actual data
    updateTodaySummary(data.today);
    updatePerformanceMetrics(data.metrics);
    updateActivityFeed(data.activities);
  } catch (err) {
    console.error("Dashboard data error:", err);
    showToast("Error loading dashboard data. Please refresh.", true);
    
    // Show error in activity feed
    document.getElementById('activityFeed').innerHTML = 
      `<li class="text-center text-red-400 py-4">Failed to load activities. Please refresh.</li>`;
  }
}

function updateTodaySummary(todayData) {
  if (!todayData) return;
  
  document.getElementById('todayClockIn').textContent = todayData.clock_in || '--:--';
  document.getElementById('todayClockOut').textContent = todayData.clock_out || '--:--';
  document.getElementById('todayHours').textContent = todayData.hours_worked || '0h 0m';
  
  // Set status with color coding
  const statusElem = document.getElementById('todayStatus');
  statusElem.textContent = todayData.status || '-';
  statusElem.className = "font-bold text-xl mt-1 " + (
    todayData.status === "Late" ? "text-yellow-400" :
    todayData.status === "Absent" ? "text-red-400" :
    "text-green-400"
  );
}

function updatePerformanceMetrics(metrics) {
  if (!metrics) return;
  
  // Attendance - Handle division by zero
  let attendancePercent = 0;
  if (metrics.working_days > 0) {
    attendancePercent = Math.min(
      100,
      Math.round((metrics.attendance_days / metrics.working_days) * 100) || 0
    );
  }
  
  document.getElementById('attendanceRatio').textContent = 
    `${metrics.attendance_days}/${metrics.working_days} days`;
  document.getElementById('attendanceBar').style.width = `${attendancePercent}%`;
  
  // Productivity
  const productivity = Math.min(100, metrics.productivity || 0);
  document.getElementById('productivityScore').textContent = `${productivity}%`;
  document.getElementById('productivityBar').style.width = `${productivity}%`;
}

function updateActivityFeed(activities) {
  const feed = document.getElementById('activityFeed');
  
  if (!activities?.length) {
    feed.innerHTML = `<li class="text-center text-gray-400 py-4">No recent activities</li>`;
    return;
  }

  feed.innerHTML = activities.map(activity => `
    <li class="flex items-start gap-3 p-3 hover:bg-gray-700 rounded-lg transition-colors">
      <div class="mt-1.5 flex-shrink-0 w-2 h-2 rounded-full ${
        activity.type === 'clock' ? 'bg-green-500' : 
        activity.type === 'profile' ? 'bg-blue-500' : 
        activity.type === 'leave' ? 'bg-yellow-500' : 'bg-purple-500'
      }"></div>
      <div class="flex-grow">
        <p class="text-sm">${activity.message}</p>
        <p class="text-xs text-gray-400">${formatActivityTime(activity.timestamp)}</p>
      </div>
    </li>
  `).join('');
}

// ======================
// UTILITY FUNCTIONS
// ======================
function formatActivityTime(timestamp) {
  const now = new Date();
  const activityDate = new Date(timestamp);
  const diffHours = Math.floor((now - activityDate) / (1000 * 60 * 60));
  
  if (diffHours < 1) {
    return "Just now";
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  } else if (diffHours < 48) {
    return "Yesterday";
  } else {
    return activityDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
}

// ======================
// EVENT LISTENERS
// ======================
function setupEventListeners() {
  // Leave Application Modal
  window.showLeaveModal = () => {
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
        const res = await fetch("/.netlify/functions/apply_leave", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Cache-Control": "no-cache"
          },
          body: JSON.stringify({
            emp_id: JSON.parse(localStorage.getItem("emp_session")).emp_id,
            ...Object.fromEntries(formData)
          })
        });
        
        if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
        
        const result = await res.json();
        showToast(result.message || "Leave application submitted");
        modal.remove();
        
        // Refresh dashboard to show new activity
        const empSession = JSON.parse(localStorage.getItem("emp_session"));
        loadDashboardData(empSession.emp_id);
        
      } catch (err) {
        console.error("Leave application error:", err);
        showToast("Error submitting leave application", true);
        modal.remove();
      }
    });
  };

  // Logout function
  window.logout = () => {
    localStorage.removeItem("emp_session");
    localStorage.removeItem("last_action");
    localStorage.removeItem("last_activity");
    window.location.href = "employee_portal.html";
  };
}

// ======================
// TOAST NOTIFICATIONS
// ======================
function showToast(message, isError = false) {
  const toast = document.createElement("div");
  toast.className = `fixed bottom-4 right-4 px-4 py-2 rounded-lg shadow-lg z-50 ${
    isError ? "bg-red-600" : "bg-green-600"
  } text-white animate-fade-in`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add("animate-fade-out");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Add animation styles
document.head.insertAdjacentHTML("beforeend", `
  <style>
    @keyframes fade-in {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes fade-out {
      from { opacity: 1; transform: translateY(0); }
      to { opacity: 0; transform: translateY(10px); }
    }
    .animate-fade-in { animation: fade-in 0.3s ease-out; }
    .animate-fade-out { animation: fade-out 0.3s ease-in; }
  </style>
`);

// Dark mode toggler
function toggleDarkMode() {
  const body = document.body;
  body.classList.toggle('bg-gray-900');
  body.classList.toggle('bg-white');
  body.classList.toggle('text-white');
  body.classList.toggle('text-black');
}
