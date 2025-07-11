/**
 * Dashboard Data Module
 * Handles loading and displaying dashboard data
 */

const DashboardData = (function() {
  // Private variables
  let empId = null;
  
  // Initialize the module
  function init(employeeId) {
    empId = employeeId;
    setupEventListeners();
    loadData();
  }
  
  // Set up event listeners
  function setupEventListeners() {
    document.addEventListener('dashboard:refresh', loadData);
  }
  
  // Load dashboard data
  async function loadData() {
    document.getElementById('activityFeed').innerHTML = `<li class="text-center text-gray-400 py-4">Loading activities...</li>`;
    
    try {
      const timestamp = Date.now();
      const res = await fetch(`/.netlify/functions/get_dashboard_data?emp_id=${empId}&_t=${timestamp}`, {
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
          "Expires": "0"
        },
        cache: "no-store"
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
      window.ToastManager.show("Error loading dashboard data. Please refresh.", true);
      
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
  
  // Public API
  return {
    init,
    loadData
  };
})();

// Export for use in main dashboard file
window.DashboardData = DashboardData;
