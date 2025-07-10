/**
 * Letter Templates for Nikagenyx PDF Generator
 */

const LETTER_TEMPLATES = {
  // Blank template with minimal content
  blank: `<p>Date: ${new Date().toLocaleDateString('en-GB')}</p>
<p>&nbsp;</p>
<p><strong>To Whom It May Concern</strong></p>
<p>&nbsp;</p>
<p>Dear {{name}},</p>
<p>&nbsp;</p>
<p>Your content here...</p>
<p>&nbsp;</p>
<p>Sincerely,</p>
<p>&nbsp;</p>
<p>Human Resources</p>
<p>Nikagenyx Vision Tech Private Limited</p>`,

  // Offer Letter Template
  offer_letter: `<p style="text-align: right;">Date: ${new Date().toLocaleDateString('en-GB')}</p>
<p style="text-align: right;">Ref: NVTPL/OL/{{emp_id}}</p>
<p>&nbsp;</p>
<p><strong>OFFER LETTER</strong></p>
<p>&nbsp;</p>
<p>Dear {{name}},</p>
<p>&nbsp;</p>
<p>We are pleased to offer you employment with <strong>Nikagenyx Vision Tech Private Limited</strong> in the position of <strong>{{role}}</strong> in our <strong>{{department}}</strong> department, reporting to <strong>{{reporting_manager}}</strong>.</p>
<p>&nbsp;</p>
<p>Your annual compensation will be ₹{{base_salary}}/- (Rupees [Amount in words] Only) per annum. The breakdown of your compensation package will be detailed in your appointment letter.</p>
<p>&nbsp;</p>
<p>This offer is contingent upon:</p>
<ol>
    <li>Satisfactory background verification</li>
    <li>Submission of all required documents</li>
    <li>Signing of the confidentiality and non-disclosure agreement</li>
</ol>
<p>&nbsp;</p>
<p>Your tentative joining date will be [Joining Date]. Please confirm your acceptance of this offer by signing below and returning this letter to us by [Response Date].</p>
<p>&nbsp;</p>
<p>We look forward to welcoming you to our team.</p>
<p>&nbsp;</p>
<p>Sincerely,</p>
<p>&nbsp;</p>
<p><strong>Nik D'Costa</strong></p>
<p>Chief Executive Officer</p>
<p>Nikagenyx Vision Tech Private Limited</p>
<p>&nbsp;</p>
<p>----------------------------------------------------------------------------------</p>
<p>&nbsp;</p>
<p><strong>Acceptance of Offer</strong></p>
<p>&nbsp;</p>
<p>I, {{name}}, accept the offer as described above.</p>
<p>&nbsp;</p>
<p>Signature: ________________ &nbsp; &nbsp; &nbsp; Date: ________________</p>`,

  // Appointment Letter Template
  appointment: `<p style="text-align: right;">Date: ${new Date().toLocaleDateString('en-GB')}</p>
<p style="text-align: right;">Ref: NVTPL/AL/{{emp_id}}</p>
<p>&nbsp;</p>
<p style="text-align: center;"><strong>APPOINTMENT LETTER</strong></p>
<p>&nbsp;</p>
<p>Dear {{name}},</p>
<p>&nbsp;</p>
<p>We are pleased to confirm your appointment as <strong>{{role}}</strong> with Nikagenyx Vision Tech Private Limited effective <strong>{{joining_date}}</strong>.</p>
<p>&nbsp;</p>
<p><strong>1. Compensation</strong></p>
<p>Your annual compensation package will be ₹{{base_salary}}/- (Rupees [Amount in words] Only), paid monthly.</p>
<p>&nbsp;</p>
<p><strong>2. Working Hours</strong></p>
<p>Standard working hours are 9:00 AM to 6:00 PM, Monday to Friday.</p>
<p>&nbsp;</p>
<p><strong>3. Probation Period</strong></p>
<p>You will be on probation for a period of three months from your date of joining.</p>
<p>&nbsp;</p>
<p><strong>4. Leave Policy</strong></p>
<p>You are entitled to 21 days of paid leave per annum as per company policy.</p>
<p>&nbsp;</p>
<!-- PAGEBREAK -->
<p><strong>5. Notice Period</strong></p>
<p>Either party may terminate this employment by giving one month's notice in writing or payment in lieu thereof.</p>
<p>&nbsp;</p>
<p><strong>6. Confidentiality</strong></p>
<p>You shall maintain the highest level of confidentiality with respect to the company's proprietary information.</p>
<p>&nbsp;</p>
<p>Please sign and return a copy of this letter as acknowledgment of your acceptance.</p>
<p>&nbsp;</p>
<p>We welcome you to the Nikagenyx family and look forward to a mutually rewarding association.</p>
<p>&nbsp;</p>
<p>Yours sincerely,</p>
<p>&nbsp;</p>
<p><strong>Human Resources Department</strong></p>
<p>Nikagenyx Vision Tech Private Limited</p>
<p>&nbsp;</p>
<p>----------------------------------------------------------------------------------</p>
<p>&nbsp;</p>
<p><strong>Acceptance</strong></p>
<p>I have read, understood, and accept the terms and conditions of my employment as set out in this letter.</p>
<p>&nbsp;</p>
<p>Name: {{name}}</p>
<p>&nbsp;</p>
<p>Signature: ________________ &nbsp; &nbsp; &nbsp; Date: ________________</p>`,

  // Experience Certificate Template
  experience: `<p style="text-align: right;">Date: ${new Date().toLocaleDateString('en-GB')}</p>
<p style="text-align: right;">Ref: NVTPL/EXP/{{emp_id}}</p>
<p>&nbsp;</p>
<p style="text-align: center;"><strong>EXPERIENCE CERTIFICATE</strong></p>
<p>&nbsp;</p>
<p><strong>TO WHOMSOEVER IT MAY CONCERN</strong></p>
<p>&nbsp;</p>
<p>This is to certify that <strong>{{name}}</strong> (Employee ID: {{emp_id}}) was employed with Nikagenyx Vision Tech Private Limited from <strong>{{joining_date}}</strong> to [Relieving Date] as <strong>{{role}}</strong> in our <strong>{{department}}</strong> department.</p>
<p>&nbsp;</p>
<p>During their tenure with us, {{name}} demonstrated exceptional skills in [Key Skills] and was responsible for [Key Responsibilities].</p>
<p>&nbsp;</p>
<p>{{name}} has been an asset to the organization with their professional approach, dedication, and teamwork. We wish them the very best for all their future endeavors.</p>
<p>&nbsp;</p>
<p>For Nikagenyx Vision Tech Private Limited,</p>
<p>&nbsp;</p>
<p>&nbsp;</p>
<p><strong>Nik D'Costa</strong></p>
<p>Chief Executive Officer</p>
<p>Nikagenyx Vision Tech Private Limited</p>`
};

// Function to load a template into the TinyMCE editor
function loadLetterTemplate(templateName) {
  const editor = tinymce.get('letterBody');
  if (!editor) return false;
  
  const template = LETTER_TEMPLATES[templateName];
  if (!template) return false;
  
  editor.setContent(template);
  updateEnhancedPDFPreview();
  return true;
}

// Setup template loader button
document.addEventListener('DOMContentLoaded', function() {
  const loadTemplateBtn = document.getElementById('loadTemplate');
  if (loadTemplateBtn) {
    loadTemplateBtn.addEventListener('click', function() {
      const templateSelect = document.getElementById('pdfTemplate');
      const templateName = templateSelect?.value || 'blank';
      
      if (loadLetterTemplate(templateName)) {
        showToast(`Loaded ${templateName.replace('_', ' ')} template`);
      } else {
        showToast('Failed to load template', 'error');
      }
    });
  }
  
  // Initialize PDF preview on modal open
  const openPdfButton = document.getElementById('openPDFLetterBtn');
  if (openPdfButton) {
    openPdfButton.addEventListener('click', function() {
      setTimeout(updateEnhancedPDFPreview, 500); // Slight delay to ensure modal is visible
    });
  }
  
  // Replace the default PDF generation with enhanced version
  const generateBtn = document.getElementById('generatePDFLetter');
  if (generateBtn) {
    generateBtn.addEventListener('click', generateEnhancedPDFLetters);
  }
});
