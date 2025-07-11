/**
 * Enhanced PDF generation that preserves Word document formatting
 * Works with any content copied from Word/Office documents
 */

// Configure TinyMCE to better handle Word paste operations
function initEnhancedTinyMCE() {
  if (typeof tinymce === "undefined") {
    console.warn("TinyMCE not loaded");
    return;
  }
  
  tinymce.init({
    selector: '#letterBody',
    height: 500,
    menubar: true,
    plugins: [
      'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
      'searchreplace', 'visualblocks', 'code', 'fullscreen',
      'insertdatetime', 'media', 'table', 'help', 'wordcount', 'paste'
    ],
    toolbar: 'undo redo | formatselect | ' +
      'bold italic backcolor | alignleft aligncenter ' +
      'alignright alignjustify | bullist numlist outdent indent | ' +
      'removeformat | table | help',
    content_style: `
      body { font-family: Arial, Helvetica, sans-serif; font-size: 14px; }
      /* Preserve special formatting classes from Word */
      .MsoNormal, .MsoListParagraph { margin-bottom: 8pt; }
      .MsoTitle { font-size: 26pt; font-weight: bold; }
      .MsoHeader, .MsoFooter { font-size: 8pt; }
    `,
    paste_data_images: true,
    paste_as_text: false,
    paste_word_valid_elements: "b,strong,i,em,h1,h2,h3,h4,h5,h6,p,ol,ul,li,table,tr,td,th,br,hr,div,span",
    paste_merge_formats: false,
    paste_webkit_styles: true,
    paste_retain_style_properties: "all",
    paste_postprocess: function(plugin, args) {
      // You can add custom post-processing for Word pasted content here
      console.log("Content pasted from Word/Office document");
    },
    setup: function(editor) {
      editor.on('PastePreProcess', function(e) {
        // Further processing can be done here if needed
        console.log("Paste preprocessing");
      });
      
      editor.on('input', updatePDFPreview);
      editor.on('change', updatePDFPreview);
      
      // Add a paste from Word button
      editor.ui.registry.addButton('pasteword', {
        text: 'Paste from Word',
        tooltip: 'Paste content from Word with formatting',
        onAction: function() {
          editor.execCommand('mceTogglePlainTextPaste');
        }
      });
    }
  });
}

/**
 * Generate PDFs that precisely match Word formatting
 */
async function generateUniversalPDF() {
  const selectedIds = getSelectedEmployeeIds();
  if (!selectedIds.length) {
    showToast("Please select at least one employee.", "error");
    return;
  }

  try {
    // Show loading indicator
    showToast("Generating documents with Word formatting. Please wait...");
    
    // Get the formatted content from TinyMCE
    let wordFormattedContent = tinymce.get("letterBody").getContent();
    if (!wordFormattedContent) {
      showToast("Please paste your Word document content first.", "error");
      return;
    }
    
    // Get employee data for mail merge
    const res = await fetch("/.netlify/functions/get_employees");
    const { employees } = await res.json();
    const selectedEmployees = employees.filter(emp => selectedIds.includes(emp.emp_id));
    
    // Enhanced employees data (with additional profile information)
    const enhancedEmployees = await Promise.all(selectedEmployees.map(async (emp) => {
      try {
        const profileRes = await fetch(`/.netlify/functions/get_employee_profile?emp_id=${emp.emp_id}`);
        if (profileRes.ok) {
          const profile = await profileRes.json();
          return { ...emp, ...profile };
        }
        return emp;
      } catch (err) {
        console.warn(`Failed to get detailed profile for ${emp.emp_id}:`, err);
        return emp;
      }
    }));
    
    // Load header/footer images
    const headerURL = "https://raw.githubusercontent.com/Nicdcosta21/Nikagenyx-Website/main/assets/HEADER.png";
    const footerURL = "https://raw.githubusercontent.com/Nicdcosta21/Nikagenyx-Website/main/assets/FOOTER.png";
    
    const [headerImg, footerImg] = await Promise.all([
      loadImageAsDataURL(headerURL),
      loadImageAsDataURL(footerURL)
    ]);

    // Format dates helper function 
    const formatDate = (dateString) => {
      if (!dateString) return "";
      try {
        const date = new Date(dateString);
        if (isNaN(date)) return dateString;
        
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        
        return `${day}-${month}-${year}`;
      } catch (e) {
        return dateString;
      }
    };
    
    // Helper for salary in words
    const numberToWords = (num) => {
      if (!num) return "";
      // Basic implementation for numbers
      const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
      const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
      const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
      
      num = parseInt(num);
      if (isNaN(num)) return "";
      
      if (num === 0) return 'Zero Only';
      if (num < 0) return 'Negative ' + numberToWords(Math.abs(num));
      
      let words = '';
      
      // Handle lakhs (100,000s in Indian numbering)
      if (num >= 100000) {
        words += numberToWords(Math.floor(num / 100000)) + ' Lakh ';
        num %= 100000;
      }
      
      // Handle thousands
      if (num >= 1000) {
        words += numberToWords(Math.floor(num / 1000)) + ' Thousand ';
        num %= 1000;
      }
      
      // Handle hundreds
      if (num >= 100) {
        words += numberToWords(Math.floor(num / 100)) + ' Hundred ';
        num %= 100;
      }
      
      // Handle tens and units
      if (num > 0) {
        if (words !== '') words += 'and ';
        
        if (num < 10) {
          words += units[num];
        } else if (num < 20) {
          words += teens[num - 10];
        } else {
          words += tens[Math.floor(num / 10)];
          if (num % 10 > 0) words += '-' + units[num % 10];
        }
      }
      
      return words + ' Only';
    };
    
    // Generate PDF for each selected employee
    for (const emp of enhancedEmployees) {
      // Create comprehensive set of replacement tokens
      const replacements = {
        // Basic info
        "{{name}}": emp.name || "",
        "{{emp_id}}": emp.emp_id || "",
        "{{email}}": emp.email || "",
        "{{phone}}": emp.phone || "",
        "{{dob}}": formatDate(emp.dob) || "",
        "{{address}}": emp.address || "",
        
        // Job info
        "{{department}}": emp.department || "",
        "{{role}}": emp.employment_role || "",
        "{{designation}}": emp.employment_role || "",
        "{{reporting_manager}}": emp.reporting_manager || "",
        "{{joining_date}}": formatDate(emp.joining_date) || "",
        
        // Financial info
        "{{base_salary}}": emp.base_salary ? Number(emp.base_salary).toLocaleString('en-IN') : "",
        "{{base_salary_words}}": numberToWords(emp.base_salary),
        
        // Current date
        "{{current_date}}": formatDate(new Date()),
        
        // Company info
        "{{company_name}}": "Nikagenyx Vision Tech Private Limited",
        "{{company_address}}": "Unit No. B-02, Navkaar 4 Building, Navsari, Gujarat 396445",
        
        // Special formatting
        "<!--PAGEBREAK-->": '<div style="page-break-after: always;"></div>'
      };
      
      // Replace all tokens in content
      let personalizedContent = wordFormattedContent;
      for (const [token, value] of Object.entries(replacements)) {
        personalizedContent = personalizedContent.replace(new RegExp(token, 'gi'), value);
      }
      
      // Configure jsPDF
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "pt",
        format: "a4"
      });
      
      // Page dimensions
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const headerHeight = 90;
      const footerHeight = 60;
      const sideMargin = 48;
      
      // Create container for rendering HTML to PDF with Word formatting preserved
      const container = document.createElement("div");
      container.style.width = (pageWidth - 2 * sideMargin) + "pt";
      container.style.fontFamily = "Arial, Helvetica, sans-serif";
      
      // CSS to better preserve Word formatting
      container.innerHTML = `
        <style>
          /* Base styles */
          body { font-family: Arial, Helvetica, sans-serif; }
          
          /* Preserve Word formatting */
          .MsoNormal { margin-bottom: 8pt; line-height: 1.5; }
          .MsoTitle { font-size: 24pt; font-weight: bold; margin-bottom: 12pt; }
          .MsoSubtitle { font-size: 18pt; margin-bottom: 10pt; }
          .MsoHeader { font-size: 10pt; }
          .MsoFooter { font-size: 10pt; }
          .MsoListParagraph { margin-left: 36pt; }
          
          /* Table styles */
          table { border-collapse: collapse; width: 100%; }
          td, th { padding: 6pt; }
          
          /* Preserve alignment */
          .align-left { text-align: left; }
          .align-center { text-align: center; }
          .align-right { text-align: right; }
          .align-justify { text-align: justify; }
          
          /* Lists */
          ol, ul { margin-left: 20pt; padding-left: 0; }
          li { margin-bottom: 6pt; }
        </style>
        <div id="pdfContent">
          ${personalizedContent}
        </div>
      `;
      
      // Add container to document but hide it
      container.style.position = "fixed";
      container.style.left = "-9999px";
      document.body.appendChild(container);
      
      // Render HTML to PDF with enhanced settings to preserve Word formatting
      await doc.html(container, {
        margin: [
          headerHeight + 20,  // Top margin including header
          sideMargin,         // Right margin
          footerHeight + 20,  // Bottom margin including footer
          sideMargin          // Left margin
        ],
        autoPaging: "text",
        width: pageWidth - (2 * sideMargin),
        html2canvas: {
          scale: 2.0,         // Higher scale for sharper text and better formatting
          useCORS: true,
          backgroundColor: "#fff",
          allowTaint: true,   // Allow cross-origin images
          logging: false,     // Disable logging for better performance
          letterRendering: true, // Better letter spacing preservation
          windowWidth: pageWidth - (2 * sideMargin) + 100, // Extra width to prevent wrapping issues
        },
        callback: function(doc) {
          const totalPages = doc.internal.getNumberOfPages();
          
          // Add header and footer to each page
          for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            
            // Add header at the top of the page
            doc.addImage(headerImg, "PNG", 0, 0, pageWidth, headerHeight);
            
            // Add footer at the bottom of the page
            doc.addImage(footerImg, "PNG", 0, pageHeight - footerHeight, pageWidth, footerHeight);
            
            // Add page number
            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text(
              `Page ${i} of ${totalPages}`,
              pageWidth / 2,
              pageHeight - 25,
              { align: "center" }
            );
          }
          
          // Clean up container
          container.remove();
          
          // Generate filename
          const cleanName = emp.name?.trim().replace(/\s+/g, "_") || "Employee";
          const today = new Date().toISOString().split('T')[0];
          const filename = `${cleanName}_${emp.emp_id}_Document_${today}.pdf`;
          
          // Save PDF
          doc.save(filename);
        }
      });
    }
    
    showToast(`Successfully generated ${enhancedEmployees.length} document(s)`);
    closePDFLetterModal();
  } catch (err) {
    console.error("PDF Generation Error:", err);
    showToast("Error generating documents: " + err.message, "error");
  }
}

/**
 * Replace your existing generatePDFLetters function
 * This will handle Word-formatted content universally
 */
async function generatePDFLetters() {
  await generateUniversalPDF();
}
