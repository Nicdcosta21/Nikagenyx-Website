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

  // UPDATED Employment Agreement Template
  employment_agreement: `<h1 style="text-align:center; font-size:18pt; font-weight:bold; margin-bottom:15pt;">EMPLOYMENT AGREEMENT</h1>

<p style="text-align:justify;">This Employment Agreement ("Agreement") is made and entered into on this ${new Date().toLocaleDateString('en-GB', {day: 'numeric', month: 'long', year: 'numeric'})} day, by and between:</p>

<p style="text-align:justify;"><strong>Nikagenyx Vision Tech Private Limited</strong>, a company incorporated under the Companies Act, 2013, with its registered office in Pune, Maharashtra (hereinafter referred to as the "Company"),</p>

<p style="text-align:center; font-weight:bold;">AND</p>

<p style="text-align:justify;"><strong>{{name}}</strong> (Employee ID: {{emp_id}}) (hereinafter referred to as the "Employee").</p>

<ol style="text-align:justify;">
  <li>
    <strong>APPOINTMENT</strong>
    <p>The Employee is hereby appointed to the position of <strong>{{role}}</strong> in the <strong>{{department}}</strong> of the Company and shall report to <strong>{{reporting_manager}}</strong> or such other person as may be designated from time to time.</p>
  </li>

  <li>
    <strong>COMMENCEMENT AND PROBATION</strong>
    <p>The employment shall commence on <strong>{{joining_date}}</strong>. The first sixty (60) days of employment shall constitute a probationary period during which the Employee's performance and conduct shall be assessed.</p>
  </li>

  <li>
    <strong>LOCATION AND WORKING MODE</strong>
    <p>The Employee shall perform their duties remotely unless otherwise agreed in writing. Official travel, if any, will be approved in advance and reimbursed as per the Company's policy.</p>
  </li>

  <li>
    <strong>COMPENSATION AND SALARY</strong>
    <p>The Employee shall be entitled to a gross monthly salary of INR <strong>{{base_salary}}</strong>, payable in accordance with the Company's standard payroll schedule. All statutory deductions and applicable taxes shall be made in accordance with applicable laws.</p>
  </li>

  <li>
    <strong>BONUS AND INCENTIVES</strong>
    <p>The Employee may be eligible for performance-based bonuses and incentive programs as determined by the Company from time to time.</p>
  </li>

  <!-- PAGEBREAK -->

  <li>
    <strong>WORK HOURS AND ATTENDANCE</strong>
    <p>
      <ul>
        <li>Less than 5 hours: Absent (no pay)</li>
        <li>5 to 7 hours: Half-Day (50% pay)</li>
        <li>7 to 10 hours: Full-Day (100% pay)</li>
      </ul>
      The maximum work limit is 10 hours per day. Two days off per week shall be granted. Indian public holidays shall be treated as paid holidays.
    </p>
  </li>

  <li>
    <strong>LEAVE</strong>
    <p>The Employee shall be entitled to two (2) days of paid leave per month, subject to prior approval and proper justification. Leave applications must be submitted in advance through the designated channel. In addition, the Employee is entitled to six (6) paid sick leave days per calendar year. Sick leave may require submission of a valid medical certificate if requested by the Company. Up to five (5) last-moment or emergency leaves (without prior notice) will be permitted in a calendar year. Any additional unnotified absences may result in deduction of salary or disciplinary review.</p>
  </li>

  <li>
    <strong>CONDUCT AND CONFIDENTIALITY</strong>
    <p>The Employee shall maintain professional conduct and ensure confidentiality of all proprietary data and internal communications. Breach of confidentiality shall result in disciplinary action or termination.</p>
  </li>

  <li>
    <strong>INTELLECTUAL PROPERTY</strong>
    <p>All inventions, developments, work products, designs, documents, software, or other materials created during the course of employment shall be the exclusive property of the Company.</p>
  </li>

  <li>
    <strong>OUTSIDE WORK RESTRICTION</strong>
    <p>The Employee shall not undertake any freelance, part-time, or full-time work for any third party during the term of employment without the express written permission of the Company.</p>
  </li>

  <li>
    <strong>DATA SECURITY AND COMPANY PROPERTY</strong>
    <p>The Employee shall:
      <ul>
        <li>Not share, distribute, or misuse Company data, systems, tools, or software.</li>
        <li>Treat any unauthorized distribution or duplication as piracy.</li>
        <li>Be financially liable for any damage or theft involving Company property or data.</li>
        <li>Acknowledge that all work output and data remain under Company ownership and copyright.</li>
      </ul>
    </p>
  </li>

  <!-- PAGEBREAK -->

  <li>
    <strong>TERMINATION</strong>
    <p>This Agreement may be terminated by either party with thirty (30) days' written notice. The Company reserves the right to terminate employment without notice in case of gross misconduct, fraud, negligence, or breach of policy.</p>
  </li>

  <li>
    <strong>GOVERNING LAW AND JURISDICTION</strong>
    <p>This Agreement shall be governed by and construed in accordance with the laws of India. The courts of Pune, Maharashtra shall have exclusive jurisdiction over any disputes.</p>
  </li>

  <li>
    <strong>TRANSITION FROM FREELANCE MODE TO FULL-TIME PAYROLL</strong>
    <p>Until the Company secures its first primary international contract in the cruise line industry, all employment under this Agreement shall operate in freelance mode. In this mode:
      <ul>
        <li>Employees shall continue to log working hours through the Company's designated systems.</li>
        <li>All worked hours will be recorded and stored securely for future payroll processing.</li>
        <li>No immediate monthly salary disbursals will be made during this freelance phase.</li>
      </ul>
    </p>
    <p>Upon signing the first primary foreign client in the cruise line industry, the Company shall:
      <ul>
        <li>Transition all current freelance employees to full-time payroll status with retrospective compensation.</li>
        <li>Calculate and disburse salaries based on the accumulated working hours, applying the following rates:
          <ul>
            <li>Less than 5 hours/day: No pay</li>
            <li>5 to 7 hours/day: 50% daily pay</li>
            <li>7 to 10 hours/day: 100% daily pay</li>
          </ul>
        </li>
      </ul>
    </p>
    <p>This transition shall not apply to contracts obtained from domestic or secondary clients, which are considered developmental and are meant to build project portfolios and credibility.</p>
    <p>Employees shall be formally notified of this transition in writing, and a revised salary structure will be shared at that time.</p>
  </li>

  <li>
    <strong>ACKNOWLEDGEMENT OF DEFERRED COMPENSATION</strong>
    <p>The Employee acknowledges that the Company is currently in a pre-revenue, startup phase, and that this employment arrangement is made between close associates under mutual understanding. It is further agreed that the Employee's salary shall accrue based on hours worked, as recorded in the Company's designated system, and shall be payable retrospectively upon commencement of full-time payroll, as described in Clause 14.</p>
    <p>This deferred-pay arrangement has been discussed transparently and agreed upon voluntarily by both parties, without any coercion, and in accordance with the provisions of the Indian Contract Act, 1872. Both parties understand and intend to create legally binding obligations through this Agreement.</p>
  </li>
</ol>

<p style="margin-top:30pt;">IN WITNESS WHEREOF, the parties hereto have executed this Agreement on the date first above written.</p>

<div style="margin-top:30pt;">
  <p><strong>For Nikagenyx Vision Tech Private Limited</strong></p>
  <div style="height:60pt;"></div>
  <p>Signature: _________________________</p>
  <p>Name: Nikolas D'Costa</p>
  <p>Designation: Managing Director</p>
</div>

<div style="margin-top:30pt;">
  <p><strong>Employee Acknowledgement</strong></p>
  <p>I, {{name}}, acknowledge that I have read and understood the contents of this Agreement and voluntarily accept the terms and conditions herein.</p>
  <div style="height:40pt;"></div>
  <p>Signature: _________________________</p>
  <p>Date: _________________________</p>
  <p>Place: _________________________</p>
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
