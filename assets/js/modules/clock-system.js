/**
 * Clock System Module
 * Handles employee clock in/out functionality
 */

const ClockSystem = (function() {
  // Private variables
  let empId = null;
  let lastAction = null;
  let lastActivity = null;
  
  // DOM elements cache
  let elements = {
    inBtn: null,
    outBtn: null,
    statusMsg: null
  };
  
  // Initialize the module
  async function init(employeeId) {
    empId = employeeId;
    cacheElements();
    setupEventListeners();
    await checkInitialState();
    
    return {
      updateClockState,
      verifyClockStatus
    };
  }
  
  // Cache DOM elements
  function cacheElements() {
    elements.inBtn = document.getElementById("clockInBtn");
    elements.outBtn = document.getElementById("clockOutBtn");
    elements.statusMsg = document.getElementById("statusMessage");
    
    // Clear existing event listeners using clone technique
    const newClockInBtn = elements.inBtn.cloneNode(true);
    const newClockOutBtn = elements.outBtn.cloneNode(true);
    
    elements.inBtn.parentNode.replaceChild(newClockInBtn, elements.inBtn);
    elements.outBtn.parentNode.replaceChild(newClockOutBtn, elements.outBtn);
    
    elements.inBtn = newClockInBtn;
    elements.outBtn = newClockOutBtn;
  }
  
  // Set up event listeners
  function setupEventListeners() {
    elements.inBtn.addEventListener("click", handleClockIn);
    elements.outBtn.addEventListener("click", handleClockOut);
  }
  
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
  
  // Update clock state
  function updateClockState(state) {
    console.log("Setting clock state to:", state);
    localStorage.setItem("last_action", state);
    
    if (state === "in") {
      disableButton(elements.inBtn);
      enableButton(elements.outBtn);
      if (!localStorage.getItem("last_activity")) {
        localStorage.setItem("last_activity", Date.now());
      }
    } else {
      enableButton(elements.inBtn);
      disableButton(elements.outBtn);
    }
  }
  
  // Handler for Clock In
  async function handleClockIn() {
    if (elements.inBtn.disabled) return;
    
    // Disable both buttons during operation
    disableButton(elements.inBtn);
    disableButton(elements.outBtn);
    elements.statusMsg.textContent = "Clocking in...";
    
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
          timestamp: timestamp
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
      disableButton(elements.inBtn);
      enableButton(elements.outBtn);
      elements.statusMsg.textContent = data.message || "Successfully clocked in";
      
      // Trigger dashboard refresh
      document.dispatchEvent(new CustomEvent('dashboard:refresh'));
    } catch (error) {
      console.error("Error clocking in:", error);
      elements.statusMsg.textContent = "Error clocking in. Please try again.";
      
      // Verify with server to get true state
      verifyClockStatus();
    }
  }
  
  // Handler for Clock Out
  async function handleClockOut() {
    if (elements.outBtn.disabled) return;
    
    // Disable both buttons during operation
    disableButton(elements.inBtn);
    disableButton(elements.outBtn);
    elements.statusMsg.textContent = "Clocking out...";
    
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
          timestamp: timestamp
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
      enableButton(elements.inBtn);
      disableButton(elements.outBtn);
      elements.statusMsg.textContent = data.message || "Successfully clocked out";
      
      // Trigger dashboard refresh
      document.dispatchEvent(new CustomEvent('dashboard:refresh'));
    } catch (error) {
      console.error("Error clocking out:", error);
      elements.statusMsg.textContent = "Error clocking out. Please try again.";
      
      // Verify with server to get true state
      verifyClockStatus();
    }
  }
  
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
      elements.statusMsg.textContent = data.message || "Status verified";
      
    } catch (error) {
      console.error("Error verifying clock status:", error);
      
      // Fallback to localStorage state if verification fails
      const lastAction = localStorage.getItem("last_action") || "out";
      updateClockState(lastAction);
    }
  }
  
  // Check initial state on load
  async function checkInitialState() {
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
      console.log("Initial clock status:", data);
      
      // Update state based on verification
      updateClockState(data.last_action);
      elements.statusMsg.textContent = data.message || "Status verified";
      
    } catch (error) {
      console.error("Error checking initial clock status:", error);
      
      // Default to allowing clock in if there's an error
      enableButton(elements.inBtn);
      disableButton(elements.outBtn);
      elements.statusMsg.textContent = "Error checking status. Please refresh.";
    }
  }
  
  // Public API
  return {
    init
  };
})();

// Export for use in main dashboard file
window.ClockSystem = ClockSystem;
