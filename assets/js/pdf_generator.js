/**
 * Enhanced PDF Letter Generator for Nikagenyx
 * Preserves formatting from Word documents and properly applies letterhead
 */

// Prevent duplicate PDF generation
window.pdfGenerationInProgress = false;
window.pdfGenerationCalled = false;

// Helper function to get consistent image paths
function getImagePath(imageName) {
  // Try the local path first
  return `/assets/${imageName}`;
}

// Helper function to load images with fallback
async function loadImageWithFallback(imageName) {
  try {
    // Try local path first
    return await loadImageAsDataURL(getImagePath(imageName));
  } catch (error) {
    console.log("Couldn't load image locally, trying GitHub...");
    // If local fails, try GitHub path
    return await loadImageAsDataURL(`https://raw.githubusercontent.com/Nicdcosta21/Nikagenyx-Website/main/assets/${imageName}`);
  }
}

// Initialize TinyMCE with better MS Word paste support
function initEnhancedTinyMCE() {
  if (typeof tinymce === "undefined") {
    console.warn("TinyMCE not loaded");
    return;
  }
  
  tinymce.init({
    selector: '#letterBody',
    height: 400,
    menubar: true, // Enable menu for more formatting options
    plugins: [
      'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
      'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
      'insertdatetime', 'media', 'table', 'code', 'help', 'wordcount',
      'paste', 'pagebreak'
    ],
    toolbar: 'undo redo | formatselect | ' +
      'bold italic underline strikethrough | alignleft aligncenter ' +
      'alignright alignjustify | bullist numlist outdent indent | ' +
      'removeformat | table | pagebreak | help',
    paste_data_images: true,
    paste_word_valid_elements: "p,b,strong,i,em,h1,h2,h3,h4,h5,h6,table,tr,td,th,tbody,thead,tfoot,hr,br,a,ul,ol,li,span,div",
    paste_webkit_styles: true,
    paste_merge_formats: true,
    browser_spellcheck: true,
    content_style: `
      body { font-family: Arial, sans-serif; font-size: 12pt; line-height: 1.5; }
      table { border-collapse: collapse; width: 100%; }
      table td, table th { border: 1px solid #ccc; padding: 5px; }
      p { margin: 0 0 10px 0; }
    `,
    setup: function(editor) {
      editor.on('input change paste', function() {
        if (typeof updateEnhancedPDFPreview === 'function') {
          setTimeout(updateEnhancedPDFPreview, 100);
        }
      });
    }
  });
}

// Create a direct-to-PDF approach without using HTML conversion
async function generateDirectPDF(emp, personalizedHTML, headerImage, footerImage) {
  // Generate unique timestamp for filename to identify duplicates
  const timestamp = new Date().toISOString().replace(/[-:.]/g, "").substring(0, 14);
  console.log(`Generating PDF at ${timestamp} for ${emp.name}`);
  
  const { jsPDF } = window.jspdf;
  
  // Create PDF with A4 dimensions
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });
  
  // A4 dimensions
  const pageWidth = 210;
  const pageHeight = 297;
  const topMargin = 40;
  const bottomMargin = 30;
  const sideMargin = 20;
  
  // Add header to first page
  doc.addImage(headerImage, "PNG", 0, 0, pageWidth, topMargin - 5);
  
  // Parse the HTML content
  const parser = new DOMParser();
  const htmlDoc = parser.parseFromString(personalizedHTML, 'text/html');
  
  // Extract all paragraphs, headings, lists and tables
  const elements = htmlDoc.body.querySelectorAll('p, h1, h2, h3, h4, h5, h6, ul, ol, li, table');
  
  // Current Y position
  let y = topMargin + 10;
  
  // Process each element
  for (let element of elements) {
    const nodeName = element.nodeName.toLowerCase();
    let fontSize = 12;
    let isBold = false;
    let text = element.textContent.trim();
    
    // Skip empty elements
    if (!text) continue;
    
    // Check for page breaks
    if ((element.style && (element.style.pageBreakAfter === 'always' || element.style.breakAfter === 'page')) ||
        (element.className && element.className.includes('page-break'))) {
      doc.addPage();
      doc.addImage(headerImage, "PNG", 0, 0, pageWidth, topMargin - 5);
      doc.addImage(footerImage, "PNG", 0, pageHeight - bottomMargin, pageWidth, bottomMargin - 2);
      y = topMargin + 10;
      continue;
    }
    
    // Set text style based on element type
    if (nodeName === 'h1') {
      fontSize = 20;
      isBold = true;
    } else if (nodeName === 'h2') {
      fontSize = 18;
      isBold = true;
    } else if (nodeName === 'h3') {
      fontSize = 16;
      isBold = true;
    } else if (nodeName.match(/^h[4-6]$/)) {
      fontSize = 14;
      isBold = true;
    } else if (nodeName === 'li') {
      text = `• ${text}`;
    }
    
    // Apply text formatting
    doc.setFontSize(fontSize);
    if (isBold) {
      doc.setFont("helvetica", "bold");
    } else {
      doc.setFont("helvetica", "normal");
    }
    
    // Always ensure text is black
    doc.setTextColor(0, 0, 0);
    
    // Split text to fit width
    const lines = doc.splitTextToSize(text, pageWidth - (2 * sideMargin));
    
    // Check if we need to add a new page
    if (y + (lines.length * (fontSize/2 + 2)) > pageHeight - bottomMargin) {
      doc.addPage();
      doc.addImage(headerImage, "PNG", 0, 0, pageWidth, topMargin - 5);
      doc.addImage(footerImage, "PNG", 0, pageHeight - bottomMargin, pageWidth, bottomMargin - 2);
      y = topMargin + 10;
    }
    
    // Add the text
    doc.text(lines, sideMargin, y);
    y += (lines.length * (fontSize/2 + 2)) + 5;
  }
  
  // Add footer to all pages
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.addImage(footerImage, "PNG", 0, pageHeight - bottomMargin, pageWidth, bottomMargin - 2);
    
    // Add page numbers
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - sideMargin, pageHeight - 5, { align: 'right' });
  }
  
  // Generate filename with timestamp to ensure uniqueness
  const cleanName = emp.name?.replace(/[^\w]/g, "_") || "Employee";
  const filename = `${cleanName}_${emp.emp_id}_${timestamp}.pdf`;
  
  // Save the PDF
  doc.save(filename);
}

// Generate PDF with proper A4 dimensions and letterhead
async function generateEnhancedPDFLetters() {
  console.log("PDF generation function called");
  
  // Prevent multiple executions
  if (window.pdfGenerationCalled === true) {
    console.warn("PDF generation already in progress - preventing duplicate call");
    return;
  }
  
  // Set flags to prevent multiple executions
  window.pdfGenerationCalled = true;
  window.pdfGenerationInProgress = true;
  
  console.log("PDF generation started - locked to prevent duplicates");

  const selectedIds = getSelectedEmployeeIds();
  if (!selectedIds.length) {
    showToast("Please select employees first.", "error");
    // Reset flag if no PDFs will be generated
    setTimeout(() => {
      window.pdfGenerationCalled = false;
      window.pdfGenerationInProgress = false;
    }, 500);
    return;
  }

  // Show loading indicator
  const pdfLoading = document.getElementById("pdfLoading");
  const pdfStatus = document.getElementById("pdfStatus");
  
  if (pdfLoading) pdfLoading.style.display = "block";
  if (pdfStatus) pdfStatus.textContent = `Preparing PDFs for ${selectedIds.length} employee(s)...`;
  
  try {
    // Get content from TinyMCE
    let rawHTML = tinymce.get("letterBody").getContent();
    
    // Clean up Word-specific styling issues
    rawHTML = cleanupWordContent(rawHTML);
    
    // Get font settings
    const fontFamily = document.getElementById("pdfFont")?.value || "helvetica";
    const fontSize = parseInt(document.getElementById("pdfFontSize")?.value || "12");
    
    // Get employee data
    const res = await fetch("/.netlify/functions/get_employees");
    const { employees } = await res.json();
    const selectedEmployees = employees.filter(emp => selectedIds.includes(emp.emp_id));
    
    // Fetch extended employee data for better variable replacement
    const employeeDetailsPromises = selectedEmployees.map(emp => 
      fetch(`/.netlify/functions/get_employee_profile?emp_id=${emp.emp_id}`)
        .then(res => res.json())
        .catch(() => emp)
    );
    
    const employeeDetails = await Promise.all(employeeDetailsPromises);
    
    // Load header and footer images
    let headerImage, footerImage;
    
    try {
      headerImage = await loadImageWithFallback("HEADER.png");
      footerImage = await loadImageWithFallback("FOOTER.png");
    } catch (err) {
      console.error("Failed to load letterhead images:", err);
      showToast("Failed to load letterhead images. Please try again.", "error");
      
      if (pdfLoading) pdfLoading.style.display = "none";
      // Reset the flags
      setTimeout(() => {
        window.pdfGenerationCalled = false;
        window.pdfGenerationInProgress = false;
      }, 500);
      return;
    }
    
    // Process each employee
    for (let i = 0; i < employeeDetails.length; i++) {
      const emp = employeeDetails[i];
      
      // Update status
      if (pdfStatus) {
        pdfStatus.textContent = `Generating PDF ${i + 1} of ${employeeDetails.length} for ${emp.name}...`;
      }
      
      // Personalize content by replacing variables
      let personalizedHTML = rawHTML;
      
      // Replace all possible employee fields
      const fields = [
        "name", "emp_id", "email", "phone", "dob", "department", 
        "employment_role", "reporting_manager", "joining_date", "base_salary"
      ];
      
      fields.forEach(field => {
        const value = emp[field] || "";
        const formattedValue = field === "dob" || field === "joining_date" 
          ? formatDate(value) 
          : value;
        
        // Use global flag to replace all occurrences
        const regex = new RegExp(`{{${field}}}`, "gi");
        personalizedHTML = personalizedHTML.replace(regex, formattedValue);
      });
      
      // Handle role special case (some templates use role instead of employment_role)
      personalizedHTML = personalizedHTML.replace(/{{role}}/gi, emp.employment_role || "");
      
      // Format dates nicely if applicable
      personalizedHTML = personalizedHTML.replace(/\d{4}-\d{2}-\d{2}/g, function(date) {
        return formatDate(date);
      });
      
      // Use the direct PDF generation method for reliable output
      await generateDirectPDF(emp, personalizedHTML, headerImage, footerImage);
    }
    
    showToast(`Successfully generated ${employeeDetails.length} PDF(s)!`);
  } catch (error) {
    console.error("PDF Generation Error:", error);
    if (pdfStatus) pdfStatus.textContent = "Error: " + error.message;
    showToast("Error generating PDFs. See console for details.", "error");
  } finally {
    // Always clean up
    if (pdfLoading) pdfLoading.style.display = "none";
    closePDFLetterModal();
    
    // Reset the flags with a small delay to prevent double-clicks
    setTimeout(() => {
      window.pdfGenerationCalled = false;
      window.pdfGenerationInProgress = false;
      console.log("PDF generation unlocked");
    }, 1000);
  }
}

// Helper function to load images as data URLs
async function loadImageAsDataURL(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load image (${response.status}): ${url}`);
    }
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Failed to load image:", url, error);
    throw error;
  }
}

// Enhanced PDF Preview function
function updateEnhancedPDFPreview() {
  const preview = document.getElementById("pdfPreview");
  if (!preview) return;
  
  const selectedIds = getSelectedEmployeeIds();
  if (selectedIds.length === 0) {
    preview.innerHTML = '<p class="text-gray-500 italic text-center">Select at least one employee to preview</p>';
    return;
  }
  
  // Get content from TinyMCE
  let content = tinymce.get("letterBody")?.getContent() || "";
  
  // Clean up Word content for preview
  content = cleanupWordContent(content);
  
  if (!content.trim()) {
    preview.innerHTML = '<p class="text-gray-500 italic text-center">Add content to the editor to see preview</p>';
    return;
  }
  
  // Get first selected employee for preview
  fetch("/.netlify/functions/get_employees")
    .then(res => res.json())
    .then(({ employees }) => {
      const selectedEmp = employees.find(emp => emp.emp_id === selectedIds[0]);
      if (!selectedEmp) {
        preview.innerHTML = '<p class="text-red-500">Selected employee not found</p>';
        return;
      }
      
      // Get full employee details
      fetch(`/.netlify/functions/get_employee_profile?emp_id=${selectedEmp.emp_id}`)
        .then(res => res.json())
        .then(emp => {
          // Replace variables in content
          let personalizedContent = content;
          
          const fields = [
            "name", "emp_id", "email", "phone", "dob", "department", 
            "employment_role", "reporting_manager", "joining_date", "base_salary"
          ];
          
          fields.forEach(field => {
            const value = emp[field] || "";
            const formattedValue = field === "dob" || field === "joining_date" 
              ? formatDate(value) 
              : value;
            
            // Use global flag to replace all occurrences
            const regex = new RegExp(`{{${field}}}`, "gi");
            personalizedContent = personalizedContent.replace(regex, formattedValue);
          });
          
          // Handle role special case (some templates use role instead of employment_role)
          personalizedContent = personalizedContent.replace(/{{role}}/gi, emp.employment_role || "");
          
          // Handle page breaks for preview (both formats)
          personalizedContent = personalizedContent
            .replace(/<!--\s*PAGEBREAK\s*-->/gi, '<div class="page-break my-6 border-b-2 border-dashed border-gray-400 text-center text-xs text-gray-500 py-1">--- Page Break ---</div>')
            .replace(/<!-- pagebreak -->/gi, '<div class="page-break my-6 border-b-2 border-dashed border-gray-400 text-center text-xs text-gray-500 py-1">--- Page Break ---</div>');
          
          // Set preview content with letterhead
          preview.innerHTML = `
            <div class="letterhead-preview">
              <div class="header-preview mb-4">
                <img src="${getImagePath("HEADER.png")}" alt="Nikagenyx Header" style="width:100%; height:auto; max-height:80px" onerror="this.src='https://raw.githubusercontent.com/Nicdcosta21/Nikagenyx-Website/main/assets/HEADER.png'">
              </div>
              
              <div class="content-preview min-h-[200px] text-black">
                ${personalizedContent}
              </div>
              
              <div class="footer-preview mt-4">
                <img src="${getImagePath("FOOTER.png")}" alt="Nikagenyx Footer" style="width:100%; height:auto; max-height:60px" onerror="this.src='https://raw.githubusercontent.com/Nicdcosta21/Nikagenyx-Website/main/assets/FOOTER.png'">
              </div>
            </div>
          `;
        })
        .catch(err => {
          console.error("Error fetching employee details:", err);
          preview.innerHTML = '<p class="text-red-500">Error loading employee details</p>';
        });
    })
    .catch(err => {
      console.error("Error fetching employees:", err);
      preview.innerHTML = '<p class="text-red-500">Error loading employees</p>';
    });
}

// Clean up Word-specific styling issues
function cleanupWordContent(html) {
  if (!html) return '';
  
  return html
    // Fix Word-specific style issues
    .replace(/<!--[\s\S]*?-->/g, '') // Remove Word comments
    .replace(/<o:p>\s*<\/o:p>/g, '') // Remove empty paragraphs
    .replace(/\s+class="MsoNormal"/g, '') // Remove MsoNormal class
    // Additional cleanups as needed
    .replace(/<!\[if !supportLists\]>[\s\S]*?<!\[endif\]>/g, '') // Remove list supports
    .replace(/style="[^"]*mso-[^"]*"/g, '') // Remove MSO specific styles
    .replace(/style="[^"]*color:\s*black[^"]*"/g, 'style="color: #000000;"') // Fix black color explicitly
    .replace(/style="[^"]*background:\s*black[^"]*"/g, 'style="background-color: #ffffff;"') // Fix black background
    .replace(/<!--StartFragment-->|<!--EndFragment-->/g, '') // Remove fragments
    .replace(/<span\s+style="[^"]*font-family:[^"]*Wingdings[^"]*"[^>]*>.<\/span>/g, '•') // Replace wingdings bullets
    .replace(/color:\s*window/g, 'color: #000000') // Fix window color
    .replace(/color:\s*windowtext/g, 'color: #000000') // Fix windowtext color
    .replace(/background:\s*window/g, 'background-color: #FFFFFF') // Fix window background
    .replace(/<span[^>]*>([\s\S]*?)<\/span>/g, '$1'); // Remove unnecessary spans
}

// Export functions for global use
window.initEnhancedTinyMCE = initEnhancedTinyMCE;
window.updateEnhancedPDFPreview = updateEnhancedPDFPreview;
window.generateEnhancedPDFLetters = generateEnhancedPDFLetters;
window.loadImageWithFallback = loadImageWithFallback;
window.getImagePath = getImagePath;
