/**
 * Nikagenyx Date Utilities
 * Handles consistent date formatting and timezone conversions
 */

// Format date to local format based on user's locale
function formatLocalDate(dateString, options = {}) {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return "Invalid date";
  }
  
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...options
  });
}

// Format date to ISO format (YYYY-MM-DD)
function formatISODate(dateString) {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return "";
  }
  
  return date.toISOString().split('T')[0];
}

// Get current date in user's timezone as YYYY-MM-DD
function getCurrentLocalDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

// Convert UTC date to user's local timezone
function utcToLocal(utcDateString) {
  const date = new Date(utcDateString);
  if (isNaN(date.getTime())) {
    return "Invalid date";
  }
  
  return new Date(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds()
  );
}

// Calculate age from date of birth
function calculateAge(dobString) {
  const dob = new Date(dobString);
  if (isNaN(dob.getTime())) {
    return "Unknown";
  }
  
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  
  return age;
}

// Get number of days in a month
function getDaysInMonth(year, month) {
  // month is 1-indexed (January is 1, February is 2, etc)
  return new Date(year, month, 0).getDate();
}

// Export all functions
window.dateUtils = {
  formatLocalDate,
  formatISODate,
  getCurrentLocalDate,
  utcToLocal,
  calculateAge,
  getDaysInMonth
};
