/**
 * Enhanced PDF Letter Generator for Nikagenyx
 * Preserves formatting from Word documents and properly applies letterhead
 */

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
      'paste'
    ],
    toolbar: 'undo redo | formatselect | ' +
      'bold italic underline strikethrough | alignleft aligncenter ' +
      'alignright alignjustify | bullist numlist outdent indent | ' +
      'removeformat | table | help',
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
        updatePDFPreview();
      });
    }
  });
}

// Generate PDF with proper A4 dimensions and letterhead
async function generateEnhancedPDFLetters() {
  const selectedIds = getSelectedEmployeeIds();
  if (!selectedIds.length) {
    showToast("Please select employees first.", "error");
    return;
  }

  // Show loading indicator
  document.getElementById("pdfLoading").style.display = "block";
  document.getElementById("pdfStatus").textContent = `Preparing PDFs for ${selectedIds.length} employee(s)...`;
  
  try {
    // Get content from TinyMCE
    const rawHTML = tinymce.get("letterBody").getContent();
    
    // Get font settings
    const fontFamily = document.getElementById("pdfFont").value || "helvetica";
    const fontSize = parseInt(document.getElementById("pdfFontSize").value) || 12;
    
    // Configure jsPDF for A4 size (210mm × 297mm = 595.28pt × 841.89pt)
    const { jsPDF } = window.jspdf;
    
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
    const headerImage = await loadImageAsDataURL("/assets/HEADER.png");
    const footerImage = await loadImageAsDataURL("/assets/FOOTER.png");
    
    // Process each employee
    for (let i = 0; i < employeeDetails.length; i++) {
      const emp = employeeDetails[i];
      
      // Update status
      document.getElementById("pdfStatus").textContent = 
        `Generating PDF ${i + 1} of ${employeeDetails.length} for ${emp.name}...`;
      
      // Create new PDF document with A4 dimensions
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        putOnlyUsedFonts: true,
        compress: true
      });
      
      // A4 dimensions in mm
      const pageWidth = 210;
      const pageHeight = 297;
      
      // Margins in mm
      const topMargin = 40; // Space for header
      const bottomMargin = 30; // Space for footer
      const sideMargin = 20;
      
      // Content width
      const contentWidth = pageWidth - (2 * sideMargin);
      
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
        personalizedHTML = personalizedHTML.replace(
          new RegExp(`{{${field}}}`, "gi"), 
          formattedValue
        );
      });
      
      // Format dates nicely if applicable
      personalizedHTML = personalizedHTML.replace(/\d{4}-\d{2}-\d{2}/g, function(date) {
        return formatDate(date);
      });
      
      // Create HTML container for content
      const container = document.createElement("div");
      container.style.width = `${contentWidth}mm`;
      container.style.fontFamily = fontFamily;
      container.style.fontSize = `${fontSize}pt`;
      container.innerHTML = personalizedHTML;
      
      // Add the container to the document body temporarily
      container.style.position = "fixed";
      container.style.left = "-9999px";
      document.body.appendChild(container);
      
      try {
        // Add header image to first page
        doc.addImage(
          headerImage, 
          "PNG", 
          0, 
          0, 
          pageWidth, 
          topMargin - 5
        );
        
        // Convert HTML to PDF
        await doc.html(container, {
          callback: function(pdf) {
            const pageCount = pdf.internal.getNumberOfPages();
            
            // Add header and footer to each page
            for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
              pdf.setPage(pageNum);
              
              // Add header to every page
              if (pageNum > 1) { // Already added to first page
                pdf.addImage(
                  headerImage, 
                  "PNG", 
                  0, 
                  0, 
                  pageWidth, 
                  topMargin - 5
                );
              }
              
              // Add footer to every page
              pdf.addImage(
                footerImage, 
                "PNG", 
                0, 
                pageHeight - bottomMargin, 
                pageWidth, 
                bottomMargin - 2
              );
              
              // Add page number
              pdf.setFontSize(8);
              pdf.setTextColor(100);
              pdf.text(
                `Page ${pageNum} of ${pageCount}`, 
                pageWidth - sideMargin, 
                pageHeight - 5, 
                { align: "right" }
              );
            }
          },
          x: sideMargin,
          y: topMargin,
          width: contentWidth,
          autoPaging: "text",
          margin: [topMargin, sideMargin, bottomMargin, sideMargin],
          html2canvas: {
            scale: 2, // Higher quality
            useCORS: true,
            letterRendering: true
          }
        });
        
        // Generate filename based on employee data
        const cleanName = emp.name?.replace(/[^\w]/g, "_") || "Employee";
        const cleanDept = emp.department?.replace(/[^\w]/g, "_") || "Dept";
        const filename = `${cleanName}_${emp.emp_id}_${cleanDept}.pdf`;
        
        // Save the PDF
        doc.save(filename);
      } finally {
        // Clean up
        container.remove();
      }
    }
    
    showToast(`Successfully generated ${selectedEmployees.length} PDF(s)!`);
    document.getElementById("pdfLoading").style.display = "none";
    closePDFLetterModal();
  } catch (error) {
    console.error("PDF Generation Error:", error);
    document.getElementById("pdfStatus").textContent = "Error: " + error.message;
    showToast("Error generating PDFs. See console for details.", "error");
    document.getElementById("pdfLoading").style.display = "none";
  }
}

// Helper function to load images as data URLs
async function loadImageAsDataURL(url) {
  try {
    const response = await fetch(url);
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
  const content = tinymce.get("letterBody")?.getContent() || "";
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
            personalizedContent = personalizedContent.replace(
              new RegExp(`{{${field}}}`, "gi"), 
              formattedValue
            );
          });
          
          // Handle page breaks for preview
          personalizedContent = personalizedContent.replace(
            /<!--\s*PAGEBREAK\s*-->/gi, 
            '<div class="page-break my-6 border-b-2 border-dashed border-gray-400 text-center text-xs text-gray-500 py-1">--- Page Break ---</div>'
          );
          
          // Set preview content with letterhead
          preview.innerHTML = `
            <div class="letterhead-preview">
              <div class="header-preview mb-4">
                <img src="/assets/HEADER.png" alt="Nikagenyx Header" style="width:100%; height:auto; max-height:80px">
              </div>
              
              <div class="content-preview min-h-[200px]">
                ${personalizedContent}
              </div>
              
              <div class="footer-preview mt-4">
                <img src="/assets/FOOTER.png" alt="Nikagenyx Footer" style="width:100%; height:auto; max-height:60px">
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
