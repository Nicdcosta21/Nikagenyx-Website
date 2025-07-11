/**
 * Toast Manager Module
 * Handles notification display
 */

const ToastManager = (function() {
  // Initialize styles
  function initStyles() {
    // Add animation styles if they don't exist
    if (!document.getElementById('toast-animations')) {
      document.head.insertAdjacentHTML("beforeend", `
        <style id="toast-animations">
          @keyframes fade-in {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes fade-out {
            from { opacity: 1; transform: translateY(0); }
            to { opacity: 0; transform: translateY(10px); }
          }
          .toast-fade-in { animation: fade-in 0.3s ease-out; }
          .toast-fade-out { animation: fade-out 0.3s ease-in; }
        </style>
      `);
    }
  }
  
  // Show a toast notification
  function show(message, isError = false) {
    initStyles();
    
    // Create toast element
    const toast = document.createElement("div");
    toast.className = `fixed bottom-4 right-4 px-4 py-2 rounded-lg shadow-lg z-50 ${
      isError ? "bg-red-600" : "bg-green-600"
    } text-white toast-fade-in`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // Hide after delay
    setTimeout(() => {
      toast.classList.remove("toast-fade-in");
      toast.classList.add("toast-fade-out");
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
  
  // Public API
  return {
    show
  };
})();

// Export for use in main file
window.ToastManager = ToastManager;
