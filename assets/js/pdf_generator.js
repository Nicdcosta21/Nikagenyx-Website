/**
 * Enhanced PDF Letter Generator for Nikagenyx
 * Produces professional formatted documents with letterhead
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

// Professional PDF generation with precise formatting
async function generateProfessionalPDF(emp, personalizedHTML, headerImage, footerImage) {
  console.log(`Generating professional PDF for ${emp.name}`);
  
  const { jsPDF } = window.jspdf;
  
  // Create PDF with A4 dimensions
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });
  
  // A4 dimensions and margins
  const pageWidth = 210;
  const pageHeight = 297;
  const topMargin = 40;   // Space for header
  const bottomMargin = 30; // Space for footer
  const sideMargin = 20;
  
  // Content styling
  const titleFontSize = 14;
  const sectionTitleFontSize = 12;
  const normalFontSize = 11;
  const lineHeight = 6;
  const paragraphSpacing = 6;
  const sectionSpacing = 10;
  
  // Add header to first page
  doc.addImage(headerImage, "PNG", 0, 0, pageWidth, topMargin - 5);
  
  // Parse the HTML content
  const parser = new DOMParser();
  const htmlDoc = parser.parseFromString(personalizedHTML, 'text/html');
  
  // Track our current position
  let y = topMargin + 10;
  let currentPage = 1;
  
  // Get all section divs and title
  const title = htmlDoc.querySelector('h1');
  const sections = htmlDoc.querySelectorAll('div.section, h1');
  
  // Process title if it exists
  if (title) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(titleFontSize);
    doc.setTextColor(0, 0, 0);
    
    const titleText = title.textContent.trim();
    const titleLines = doc.splitTextToSize(titleText, pageWidth - (2 * sideMargin));
    
    // Center the title
    for (let i = 0; i < titleLines.length; i++) {
      doc.text(titleLines[i], pageWidth / 2, y, { align: 'center' });
      y += lineHeight;
    }
    
    // Add extra space after title
    y += paragraphSpacing * 2;
    
    // Process the intro paragraphs before the sections
    let currentElement = title.nextElementSibling;
    while (currentElement && !currentElement.classList.contains('section')) {
      if (currentElement.tagName.toLowerCase() === 'p') {
        doc.setFont("helvetica", currentElement.querySelector('strong') ? "bold" : "normal");
        doc.setFontSize(normalFontSize);
        
        const text = currentElement.textContent.trim();
        const lines = doc.splitTextToSize(text, pageWidth - (2 * sideMargin));
        
        // Check if we need a new page
        if (y + (lines.length * lineHeight) > pageHeight - bottomMargin) {
          doc.addPage();
          currentPage++;
          doc.addImage(headerImage, "PNG", 0, 0, pageWidth, topMargin - 5);
          doc.addImage(footerImage, "PNG", 0, pageHeight - bottomMargin, pageWidth, bottomMargin - 2);
          y = topMargin + 10;
        }
        
        doc.text(lines, sideMargin, y);
        y += (lines.length * lineHeight) + paragraphSpacing;
      }
      currentElement = currentElement.nextElementSibling;
    }
  }
  
  // Process each section
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    if (section.tagName.toLowerCase() === 'h1') continue; // Skip title, already processed
    
    // Check for page breaks before section titles
    if (section.previousElementSibling && section.previousElementSibling.classList.contains('page-break')) {
      doc.addPage();
      currentPage++;
      doc.addImage(headerImage, "PNG", 0, 0, pageWidth, topMargin - 5);
      doc.addImage(footerImage, "PNG", 0, pageHeight - bottomMargin, pageWidth, bottomMargin - 2);
      y = topMargin + 10;
    }
    
    // Check if we need a new page for a new section (if near bottom of page)
    if (y > pageHeight - bottomMargin - 50) {
      doc.addPage();
      currentPage++;
      doc.addImage(headerImage, "PNG", 0, 0, pageWidth, topMargin - 5);
      doc.addImage(footerImage, "PNG", 0, pageHeight - bottomMargin, pageWidth, bottomMargin - 2);
      y = topMargin + 10;
    }
    
    // Process section title
    const sectionTitle = section.querySelector('.section-title');
    if (sectionTitle) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(sectionTitleFontSize);
      
      const titleText = sectionTitle.textContent.trim();
      const titleLines = doc.splitTextToSize(titleText, pageWidth - (2 * sideMargin));
      
      doc.text(titleLines, sideMargin, y);
      y += (titleLines.length * lineHeight) + (paragraphSpacing/2);
    }
    
    // Process paragraphs and lists in this section
    const contentElements = section.querySelectorAll('p, ul, ol');
    
    for (const element of contentElements) {
      const tagName = element.tagName.toLowerCase();
      
      // Process paragraphs
      if (tagName === 'p') {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(normalFontSize);
        
        const text = element.textContent.trim();
        if (!text) continue;
        
        const lines = doc.splitTextToSize(text, pageWidth - (2 * sideMargin));
        
        // Check if we need a new page
        if (y + (lines.length * lineHeight) > pageHeight - bottomMargin) {
          doc.addPage();
          currentPage++;
          doc.addImage(headerImage, "PNG", 0, 0, pageWidth, topMargin - 5);
          doc.addImage(footerImage, "PNG", 0, pageHeight - bottomMargin, pageWidth, bottomMargin - 2);
          y = topMargin + 10;
        }
        
        doc.text(lines, sideMargin, y);
        y += (lines.length * lineHeight) + paragraphSpacing;
      }
      
      // Process lists
      else if (tagName === 'ul' || tagName === 'ol') {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(normalFontSize);
        
        const listItems = element.querySelectorAll('li');
        const indent = 5; // Indent for list items
        
        for (const item of listItems) {
          const itemText = item.textContent.trim();
          if (!itemText) continue;
          
          // Format for bullet points
          const bulletText = tagName === 'ul' ? '• ' + itemText : '  ' + itemText;
          const lines = doc.splitTextToSize(bulletText, pageWidth - (2 * sideMargin) - indent);
          
          // Check if we need a new page
          if (y + (lines.length * lineHeight) > pageHeight - bottomMargin) {
            doc.addPage();
            currentPage++;
            doc.addImage(headerImage, "PNG", 0, 0, pageWidth, topMargin - 5);
            doc.addImage(footerImage, "PNG", 0, pageHeight - bottomMargin, pageWidth, bottomMargin - 2);
            y = topMargin + 10;
          }
          
          doc.text(lines, sideMargin + indent, y);
          y += (lines.length * lineHeight) + (paragraphSpacing/2);
        }
        
        // Add space after the list
        y += paragraphSpacing/2;
      }
    }
    
    // Add spacing between sections
    y += sectionSpacing - paragraphSpacing;
  }
  
  // Process the signature block section at the end
  const signatureBlock = htmlDoc.querySelector('.signature-block');
  if (signatureBlock) {
    // Check if we need a new page for signatures
    if (y > pageHeight - bottomMargin - 120) {
      doc.addPage();
      currentPage++;
      doc.addImage(headerImage, "PNG", 0, 0, pageWidth, topMargin - 5);
      doc.addImage(footerImage, "PNG", 0, pageHeight - bottomMargin, pageWidth, bottomMargin - 2);
      y = topMargin + 10;
    }
    
    // First process the main signature title paragraph
    const titlePara = signatureBlock.querySelector('p:first-child');
    if (titlePara) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(normalFontSize);
      
      const text = titlePara.textContent.trim();
      const lines = doc.splitTextToSize(text, pageWidth - (2 * sideMargin));
      
      doc.text(lines, sideMargin, y);
      y += (lines.length * lineHeight) + paragraphSpacing * 2;
    }
    
    // Process company signature block
    const companyDiv = signatureBlock.querySelector('div:nth-child(2)');
    if (companyDiv) {
      // Process paragraphs in company signature block
      const companyParagraphs = companyDiv.querySelectorAll('p');
      for (const paragraph of companyParagraphs) {
        const hasStrong = paragraph.querySelector('strong');
        
        doc.setFont("helvetica", hasStrong ? "bold" : "normal");
        doc.setFontSize(normalFontSize);
        
        const text = paragraph.textContent.trim();
        if (!text) continue;
        
        const lines = doc.splitTextToSize(text, pageWidth - (2 * sideMargin));
        
        doc.text(lines, sideMargin, y);
        y += (lines.length * lineHeight) + (paragraphSpacing/2);
      }
      
      // Add space for signature (represented by div with height)
      const signatureSpace = companyDiv.querySelector('div[style*="height"]');
      if (signatureSpace) {
        const heightStyle = signatureSpace.getAttribute('style');
        const heightMatch = heightStyle.match(/height:(\d+)pt/);
        if (heightMatch && heightMatch[1]) {
          const height = parseInt(heightMatch[1]) / 2.83; // Convert pt to mm approximately
          y += height;
        } else {
          y += 20; // Default signature space
        }
      }
    }
    
    // Add extra spacing between signature blocks
    y += paragraphSpacing * 2;
    
    // Process employee signature block - Check if we need a new page
    const employeeDiv = signatureBlock.querySelector('div:nth-child(3)');
    if (employeeDiv) {
      if (y > pageHeight - bottomMargin - 100) {
        doc.addPage();
        currentPage++;
        doc.addImage(headerImage, "PNG", 0, 0, pageWidth, topMargin - 5);
        doc.addImage(footerImage, "PNG", 0, pageHeight - bottomMargin, pageWidth, bottomMargin - 2);
        y = topMargin + 10;
      }
      
      // Process paragraphs in employee signature block
      const employeeParagraphs = employeeDiv.querySelectorAll('p');
      for (const paragraph of employeeParagraphs) {
        const hasStrong = paragraph.querySelector('strong');
        
        doc.setFont("helvetica", hasStrong ? "bold" : "normal");
        doc.setFontSize(normalFontSize);
        
        const text = paragraph.textContent.trim();
        if (!text) continue;
        
        const lines = doc.splitTextToSize(text, pageWidth - (2 * sideMargin));
        
        doc.text(lines, sideMargin, y);
        y += (lines.length * lineHeight) + (paragraphSpacing/2);
      }
      
      // Add space for signature (represented by div with height)
      const signatureSpace = employeeDiv.querySelector('div[style*="height"]');
      if (signatureSpace) {
        const heightStyle = signatureSpace.getAttribute('style');
        const heightMatch = heightStyle.match(/height:(\d+)pt/);
        if (heightMatch && heightMatch[1]) {
          const height = parseInt(heightMatch[1]) / 2.83; // Convert pt to mm approximately
          y += height;
        } else {
          y += 20; // Default signature space
        }
      }
    }
  }
  
  // Add footer to all pages
  for (let i = 1; i <= doc.internal.getNumberOfPages(); i++) {
    doc.setPage(i);
    
    // Add footer image
    doc.addImage(footerImage, "PNG", 0, pageHeight - bottomMargin, pageWidth, bottomMargin - 2);
    
    // Add page number
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(`Page ${i} of ${doc.internal.getNumberOfPages()}`, pageWidth - sideMargin, pageHeight - 5, { align: 'right' });
  }
  
  // Generate filename
  const timestamp = new Date().toISOString().replace(/[-:.]/g, "").substring(0, 14);
  const cleanName = emp.name?.replace(/[^\w]/g, "_") || "Employee";
  const filename = `${cleanName}_${emp.emp_id}_${timestamp}.pdf`;
  
  // Save the PDF
  doc.save(filename);
}

// Helper function to extract structured content from HTML document
function extractDocumentSections(htmlDoc) {
  const sections = [];
  let currentSection = { heading: "", content: [] };
  
  // Get all block elements that might contain content
  const elements = Array.from(htmlDoc.body.children);
  
  // Skip the first h1 as it's the document title
  let skipNextH1 = true;
  
  for (let element of elements) {
    const tagName = element.tagName.toLowerCase();
    const content = element.textContent.trim();
    
    // Skip empty elements
    if (!content) continue;
    
    // Handle headings - start a new section
    if (tagName.match(/^h[1-6]$/)) {
      // Skip the first h1 if it exists
      if (tagName === 'h1' && skipNextH1) {
        skipNextH1 = false;
        continue;
      }
      
      // Save the previous section if it has any content
      if (currentSection.heading || currentSection.content.length > 0) {
        sections.push({ ...currentSection });
      }
      
      // Start a new section
      currentSection = { heading: content, content: [] };
    } 
    // Handle page breaks
    else if ((element.className && element.className.includes('page-break')) ||
             (element.style && (element.style.pageBreakAfter === 'always' || element.style.breakAfter === 'page'))) {
      currentSection.content.push("<!-- PAGEBREAK -->");
    }
    // Process paragraph content
    else if (tagName === 'p') {
      currentSection.content.push(content);
    }
    // Handle lists
    else if (tagName === 'ul' || tagName === 'ol') {
      // Extract each list item
      const items = Array.from(element.querySelectorAll('li')).map(li => {
        // Prefix bullet for unordered lists
        if (tagName === 'ul') {
          return `• ${li.textContent.trim()}`;
        } 
        // For ordered lists, we'll rely on the browser's numbering
        else {
          return li.textContent.trim();
        }
      });
      
      // Add each item as separate paragraph for better formatting
      currentSection.content.push(...items);
    }
    // Handle div containers (check for page breaks and content)
    else if (tagName === 'div') {
      if (element.style && (element.style.pageBreakAfter === 'always' || element.style.breakAfter === 'page')) {
        currentSection.content.push("<!-- PAGEBREAK -->");
      } else if (content) {
        currentSection.content.push(content);
      }
    }
  }
  
  // Add the final section if it has content
  if (currentSection.heading || currentSection.content.length > 0) {
    sections.push(currentSection);
  }
  
  return sections;
}

// Preprocess HTML to improve formatting
function enhanceHTMLForPDF(html) {
  return html
    // Fix headings
    .replace(/<h1/gi, '<h1 style="text-align:center; font-size:16pt; font-weight:bold; margin-bottom:10pt;"')
    .replace(/<h2/gi, '<h2 style="font-size:14pt; font-weight:bold; margin-top:15pt; margin-bottom:5pt;"')
    .replace(/<h3/gi, '<h3 style="font-size:13pt; font-weight:bold; margin-top:10pt; margin-bottom:5pt;"')
    
    // Improve paragraph spacing
    .replace(/<p>/gi, '<p style="margin-bottom:8pt;">')
    
    // Format lists better
    .replace(/<ul>/gi, '<ul style="margin-left:20pt; margin-bottom:10pt;">')
    .replace(/<ol>/gi, '<ol style="margin-left:20pt; margin-bottom:10pt;">')
    .replace(/<li>/gi, '<li style="margin-bottom:5pt;">')
    
    // Ensure page breaks are standardized
    .replace(/<!--\s*PAGEBREAK\s*-->/gi, '<div class="page-break"></div>')
    .replace(/<!-- pagebreak -->/gi, '<div class="page-break"></div>');
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
    
    // Enhance HTML for better PDF formatting
    rawHTML = enhanceHTMLForPDF(rawHTML);
    
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
      
      // Use the professional PDF generation method for better layout
      await generateProfessionalPDF(emp, personalizedHTML, headerImage, footerImage);
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
  // Enhance HTML formatting for preview
  content = enhanceHTMLForPDF(content);
  
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
            .replace(/<div class="page-break"><\/div>/gi, '<div class="page-break my-6 border-b-2 border-dashed border-gray-400 text-center text-xs text-gray-500 py-1">--- Page Break ---</div>');
          
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
