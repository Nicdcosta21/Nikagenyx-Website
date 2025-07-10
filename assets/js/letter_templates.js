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
<p>We are pleased to offer you employment with <strong>Nikagenyx Vision Tech Private Limited</strong> in the position of <strong>{{role}}</strong> in our <strong>{{department}}</strong> department.</p>
<p>&nbsp;</p>
<p>Your annual compensation will be ₹{{base_salary}}/- per annum. The breakdown of your compensation package will be detailed in your appointment letter.</p>
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
<p>Your annual compensation package will be ₹{{base_salary}}/-, paid monthly.</p>
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
<p>This is to certify that <strong>{{name}}</strong> (Employee ID: {{emp_id}}) was employed with Nikagenyx Vision Tech Private Limited from <strong>{{joining_date}}</strong> to [Relieving Date] as <strong>{{role}}</strong>.</p>
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
<p>Nikagenyx Vision Tech Private Limited</p>`,

  // EMPLOYMENT AGREEMENT Template
  employment_agreement: `<h1 style="text-align:center; font-size:18pt; font-weight:bold; margin-bottom:15pt;">EMPLOYMENT AGREEMENT</h1>

<p style="text-align:justify;">This EMPLOYMENT AGREEMENT ("Agreement") is made and entered into on ${new Date().toLocaleDateString('en-GB')}, by and between <strong>Nikagenyx Vision Tech Private Limited</strong>, a company incorporated under the Companies Act, 2013, having its registered office at Unit No. B-02, Navkaar 4 Building, Navsari, Gujarat 396445 (hereinafter referred to as the "Company") AND <strong>{{name}}</strong>, with Employee ID {{emp_id}} (hereinafter referred to as the "Employee").</p>

<p style="text-align:center; font-weight:bold; margin-top:15pt;">TERMS AND CONDITIONS OF EMPLOYMENT</p>

<ol style="text-align:justify;">
  <li>
    <strong>APPOINTMENT</strong>
    <p>The Company hereby employs the Employee, and the Employee hereby accepts employment with the Company, as <strong>{{role}}</strong> in the <strong>{{department}}</strong> of the Company, upon the terms and conditions set forth herein.</p>
  </li>

  <li>
    <strong>COMMENCEMENT AND TERM</strong>
    <p>The employment under this Agreement shall commence on {{joining_date}} and shall continue until terminated pursuant to the terms of this Agreement.</p>
  </li>

  <li>
    <strong>PROBATION</strong>
    <p>The first 90 days of employment shall constitute a probationary period. During this period, the Company may terminate the employment without notice. After successful completion of the probation period, the Employee shall be confirmed in writing.</p>
  </li>

  <li>
    <strong>DUTIES AND RESPONSIBILITIES</strong>
    <p>The Employee shall perform all duties and accept all responsibilities incidental to the position or as may be assigned from time to time. The Employee agrees to devote full professional time, attention, and energies to the business of the Company during the term of this Agreement.</p>
  </li>

  <li>
    <strong>COMPENSATION</strong>
    <p>In consideration of the services to be rendered by the Employee, the Company shall pay the Employee a gross annual salary of INR {{base_salary}}/- (Indian Rupees Only), payable in equal monthly installments, subject to statutory deductions and withholdings.</p>
  </li>

  <!-- PAGEBREAK -->

  <li>
    <strong>WORK LOCATION AND HOURS</strong>
    <p>The Employee shall primarily work remotely, but may be required to work at the Company's office or client locations as needed. Standard working hours shall be 9:00 AM to 6:00 PM, Monday through Friday, with a 60-minute break for lunch. The Employee may be required to work additional hours based on business needs.</p>
  </li>

  <li>
    <strong>LEAVE ENTITLEMENT</strong>
    <p>The Employee shall be entitled to the following leave benefits:</p>
    <ul>
      <li>Casual Leave: 12 days per annum</li>
      <li>Sick Leave: 7 days per annum</li>
      <li>National and Festival Holidays: As per Company policy</li>
    </ul>
    <p>Leave cannot be encashed or carried forward to the next year except as per Company policy.</p>
  </li>

  <li>
    <strong>CONFIDENTIAL INFORMATION</strong>
    <p>The Employee acknowledges that during the course of employment, the Employee will have access to confidential and proprietary information of the Company. The Employee agrees to maintain the confidentiality of such information during and after the term of employment.</p>
  </li>

  <li>
    <strong>INTELLECTUAL PROPERTY</strong>
    <p>Any invention, improvement, concept, discovery, work of authorship or other intellectual property, whether or not patentable or copyrightable, developed by the Employee during the term of employment that relates to the Company's business shall be the sole and exclusive property of the Company.</p>
  </li>

  <li>
    <strong>NON-COMPETITION AND NON-SOLICITATION</strong>
    <p>During the term of employment and for a period of one year thereafter, the Employee shall not:</p>
    <ul>
      <li>Engage in any business that competes with the Company</li>
      <li>Solicit or attempt to solicit any employee or customer of the Company</li>
      <li>Interfere with any business relationship of the Company</li>
    </ul>
  </li>

  <!-- PAGEBREAK -->

  <li>
    <strong>TERMINATION</strong>
    <p>This Agreement may be terminated:</p>
    <ul>
      <li>By the Company, with cause, effective immediately upon written notice to the Employee</li>
      <li>By the Company, without cause, upon 30 days' written notice to the Employee</li>
      <li>By the Employee, upon 30 days' written notice to the Company</li>
    </ul>
  </li>

  <li>
    <strong>GOVERNING LAW</strong>
    <p>This Agreement shall be governed by and construed in accordance with the laws of India. Any dispute arising out of or in connection with this Agreement shall be referred to arbitration in accordance with the Arbitration and Conciliation Act, 1996.</p>
  </li>

  <li>
    <strong>ENTIRE AGREEMENT</strong>
    <p>This Agreement constitutes the entire understanding between the parties and supersedes all prior agreements, understandings, or negotiations.</p>
  </li>
</ol>

<p style="margin-top:20pt;">IN WITNESS WHEREOF, the parties hereto have executed this Agreement as of the date first written above.</p>

<div style="display:flex; justify-content:space-between; margin-top:40pt;">
  <div style="width:45%;">
    <p><strong>For Nikagenyx Vision Tech Private Limited</strong></p>
    <div style="height:60pt;"></div>
    <p>____________________________</p>
    <p>Nik D'Costa</p>
    <p>Chief Executive Officer</p>
  </div>
  
  <div style="width:45%;">
    <p><strong>Employee</strong></p>
    <div style="height:60pt;"></div>
    <p>____________________________</p>
    <p>{{name}} ({{emp_id}})</p>
  </div>
</div>`
};

// Function to load a template into the TinyMCE editor
function loadLetterTemplate(templateName) {
  const editor = tinymce.get('letterBody');
  if (!editor) {
    console.error("TinyMCE editor not found!");
    return false;
  }
  
  const template = LETTER_TEMPLATES[templateName];
  if (!template) {
    console.error("Template not found:", templateName);
    return false;
  }
  
  editor.setContent(template);
  
  // Update the preview after loading the template
  if (typeof updateEnhancedPDFPreview === 'function') {
    setTimeout(updateEnhancedPDFPreview, 100);
  } else if (typeof updatePDFPreview === 'function') {
    setTimeout(updatePDFPreview, 100);
  }
  
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
        // Double check that preview updates
        setTimeout(function() {
          if (typeof updateEnhancedPDFPreview === 'function') {
            updateEnhancedPDFPreview();
          }
        }, 200);
      } else {
        showToast('Failed to load template', 'error');
      }
    });
  }
  
  // Initialize PDF preview on modal open
  const openPdfButton = document.getElementById('openPDFLetterBtn');
  if (openPdfButton) {
    openPdfButton.addEventListener('click', function() {
      setTimeout(function() {
        if (typeof updateEnhancedPDFPreview === 'function') {
          updateEnhancedPDFPreview();
        } else if (typeof updatePDFPreview === 'function') {
          updatePDFPreview();
        }
      }, 500); // Slight delay to ensure modal is visible
    });
  }
});

// Export functions for global use
window.loadLetterTemplate = loadLetterTemplate;
window.LETTER_TEMPLATES = LETTER_TEMPLATES;
