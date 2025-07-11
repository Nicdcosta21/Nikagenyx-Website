/**
 * Nikagenyx Security Utilities
 * Implements CSRF protection and other security features
 */

// Generate a CSRF token
function generateCSRFToken() {
  const random = new Uint8Array(16);
  window.crypto.getRandomValues(random);
  return Array.from(random, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Set up CSRF protection
function setupCSRFProtection() {
  // Create or retrieve CSRF token
  let csrfToken = localStorage.getItem('csrfToken');
  if (!csrfToken) {
    csrfToken = generateCSRFToken();
    localStorage.setItem('csrfToken', csrfToken);
  }
  
  // Add CSRF token to all fetch requests
  const originalFetch = window.fetch;
  window.fetch = function(url, options = {}) {
    // Only add for same-origin requests
    if (url.startsWith('/') || url.startsWith(window.location.origin)) {
      options = options || {};
      options.headers = options.headers || {};
      options.headers['X-CSRF-Token'] = csrfToken;
    }
    
    return originalFetch(url, options);
  };
  
  // Add token to forms
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('form').forEach(form => {
      const tokenInput = document.createElement('input');
      tokenInput.type = 'hidden';
      tokenInput.name = 'csrf_token';
      tokenInput.value = csrfToken;
      form.appendChild(tokenInput);
    });
  });
  
  return csrfToken;
}

// Check if origin is trusted
function isTrustedOrigin(origin) {
  const trustedOrigins = [
    window.location.origin,
    'https://nikagenyx.com',
    'https://www.nikagenyx.com'
  ];
  return trustedOrigins.includes(origin);
}

// Sanitize input to prevent XSS
function sanitizeInput(input) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return input.replace(/[&<>"']/g, m => map[m]);
}

window.securityUtils = {
  setupCSRFProtection,
  isTrustedOrigin,
  sanitizeInput
};

// Initialize CSRF protection when script loads
setupCSRFProtection();
