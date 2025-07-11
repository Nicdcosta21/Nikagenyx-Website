// Format a date string to display format (DD-MM-YYYY or with time)
export const formatDate = (dateString, includeTime = false) => {
  if (!dateString) return '-';
  
  const date = new Date(dateString);
  
  // Check if date is valid
  if (isNaN(date.getTime())) return dateString;
  
  // Format date as DD-MM-YYYY
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  
  if (!includeTime) {
    return `${day}-${month}-${year}`;
  }
  
  // Add time if requested
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  
  return `${day}-${month}-${year} ${hours}:${minutes}`;
};

// Format a number as currency (₹)
export const formatCurrency = (amount, currency = '₹') => {
  if (amount === null || amount === undefined) return `${currency} 0.00`;
  
  const num = parseFloat(amount);
  
  // Check if number is valid
  if (isNaN(num)) return `${currency} 0.00`;
  
  // Format with Indian numbering system (1,23,456.78)
  const parts = num.toFixed(2).toString().split('.');
  const integerPart = parts[0];
  const decimalPart = parts[1];
  
  let formattedIntegerPart = '';
  
  // Format according to Indian numbering system
  if (integerPart.length <= 3) {
    formattedIntegerPart = integerPart;
  } else {
    // First group is last 3 digits
    let lastThree = integerPart.substring(integerPart.length - 3);
    // Rest of the digits with commas
    let remaining = integerPart.substring(0, integerPart.length - 3);
    
    // Insert commas every 2 digits in the remaining part
    if (remaining) {
      // Split in groups of 2 from right to left
      let i = remaining.length;
      while (i > 0) {
        const group = remaining.substring(Math.max(0, i - 2), i);
        formattedIntegerPart = (i > 2 ? ',' : '') + group + formattedIntegerPart;
        i -= 2;
      }
    }
    
    formattedIntegerPart = formattedIntegerPart + ',' + lastThree;
  }
  
  return `${currency} ${formattedIntegerPart}.${decimalPart}`;
};
