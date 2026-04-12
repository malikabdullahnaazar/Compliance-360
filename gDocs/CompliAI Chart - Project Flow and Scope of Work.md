# CompliAI Chart – Hospice Clinical Chart Review System
## Project Flow, Scope of Work (SOW), and Implementation Strategy

---

# 1. Executive Summary

**CompliAI Chart** is an AI-powered compliance auditor designed specifically for hospice agencies. The system automates the review of patient clinical charts (PDFs) to detect regulatory deficiencies, map them to specific citations (CMS, CHAP, HHSC), and provide structured correction guidance.

**Objective:** Ensure hospice agencies are "survey-ready" by identifying high-risk documentation gaps before official audits occur.

**Core Promise:** "Upload a chart(pdf) → Choose Framework (CMS/CHAP/HHSC) → Get a compliant deficiency list with evidence + a safe correction plan (no fabrication)."

---

# 2. User Roles & Authentication

The system supports a secure, role-based environment.

### **Authentication System**
*   **Secure Login:** Email + Password with secure session management.
*   **Role-Based Access Control (RBAC):**

| Role | Description |
| :--- | :--- |
| **Superadmin** | System owner. Has full authority to create and manage agency accounts and users. (Private Use Model). |
| **QA/Compliance Officer** | **Primary User.** Runs audits, reviews findings, assigns correction tasks, and produces survey-ready reports. |
| **Clinical Leadership** | Reviews compliance trends, signs off on reports, and manages Corrective and Preventive Actions (CAPA). |
| **Clinician** | The "Doer" (RN, Social Worker, etc.). Views and resolves assigned correction tasks (addendums/clarifications). |

---

# 3. The Full Project Flow (End-to-End)

**Scenario:** **Sarah**, a QA & Compliance Officer at a Hospice Agency in Texas, needs to audit a new patient's chart(pdf file) to ensure it meets state and federal regulations.

### **Step 1: Login & Setup**
*   Sarah logs in to `compliai.app`.
*   She configures the agency profile, selecting **CMS Hospice CoPs** (Conditions of Participation) and **CHAP** (Community Health Accreditation Partner) as the primary frameworks.
*   She enables the **Texas HHSC Overlay** (Health and Human Services Commission) to catch state-specific requirements.

### **Step 2: Audit Creation**
*   Sarah clicks **"New Audit"**.
*   She selects the **Audit Type**:
    *   **Admission Audit** (Focus on initial eligibility).
    *   **Recertification Audit** (Focus on continued eligibility and Face-to-Face encounters).
*   She enters the **Patient MRN** (Medical Record Number) and **Episode Dates**.

### **Step 3: File Upload & Ingestion**
*   Sarah uploads a bundle of PDF files.
    *   *Includes:* Election Statement, CTI (Certification of Terminal Illness), RN Initial Assessment, Plan of Care (POC), Visit Notes.
*   **System Action:** The system ingests the files, performing **OCR** (Optical Character Recognition) to read scanned documents and identifying document types (e.g., "This is a CTI", "This is an Election Statement").

### **Step 4: AI Analysis (The "Magic")**
*   The **AI Layer** analyzes the extracted text against the **Common Requirement Library (CRL)**.
*   It checks for "Red Flags" based on the selected frameworks.
    *   *Example:* It compares the "Admission Date" on the Election Statement with the "Signature Date" on the CTI to ensure timeliness.
    *   *Example:* It scans clinical narratives for keywords indicating decline (e.g., "weight loss", "increased dependence") vs. contradictions (e.g., "patient improving").

### **Step 5: Findings & Severity**
*   The system generates a **Findings Dashboard**.
*   Sarah sees a list of deficiencies categorized by severity:
    *   🔴 **Critical:** Condition-level risk (e.g., Missing CTI).
    *   🟠 **Major:** Standard-level deficiency (e.g., Late Assessment).
    *   🟡 **Minor:** Documentation cleanup.
*   **Example Finding:**
    *   **Issue:** "Missing Physician Narrative for CTI."
    *   **Regulation:** CMS §418.22 | CHAP HR.xx
    *   **Impact:** "Clinical narrative does not support terminal prognosis."

### **Step 6: Correction Workflow (The "Fix")**
*   Sarah clicks on the finding to open the **Correction Card**.
*   The system provides **Safe Correction Guidance** (Non-fabricating).
    *   *Guidance:* "Request a signed addendum from the Attending Physician specifically addressing the terminal prognosis indicators (e.g., FAST scale, PPS score)."
*   Sarah assigns this task to **Dr. Smith** (Attending Physician) or the **Case Manager**.
*   The assignee  logs in, reviews the guidance, and uploads the required addendum or note.

### **Step 7: Reporting (The "Proof")**
*   Once corrections are complete, Sarah exports a **Survey-Ready Audit Report (PDF)**.
*   The report lists all checks passed, deficiencies corrected, and includes an **Auditor Attestation**.
*   She also downloads a **CAPA Summary** (Corrective and Preventive Action) to track trends for quality improvement.

---

# 4. Core Functionality & "Red Flags" (AI Checklist)

The AI will strictly monitor **High-Risk Checks** mapped to CMS, CHAP, and HHSC.

### **A. Admission – Election & Rights**
1.  **Hospice Election Statement:** Must be present and signed by the patient/representative.
2.  **Required Elements:** Must include palliative vs. curative acknowledgment and effective date.
3.  **Patient Rights:** Acknowledgment of receipt must be present.
4.  **Timeliness:** Notice of election provided within required timeframe (5 days).

### **B. Certification of Terminal Illness (CTI)**
5.  **Initial CTI:** Must be present and signed by the Medical Director AND Attending Physician.
6.  **Timeliness:** Signed and dated within the required window relative to admission.
7.  **Narrative:** Clinical narrative must support the terminal prognosis (life expectancy ≤ 6 months).
8.  **Diagnosis Match:** Diagnosis on CTI must match the clinical record.

### **C. Eligibility & Clinical Support (AI Narrative Analysis)**
9.  **Proof of Decline:** Documentation must support terminal status (e.g., Weight loss, ADL decline [Activities of Daily Living], Palliative Performance Scale [PPS] changes).
10. **Consistency:** No contradictory notes (e.g., "patient is rehabbing well" is a red flag for hospice eligibility).

### **D. Assessments & Plan of Care (POC)**
11. **Initial RN Assessment:** Completed within 48 hours of election.
12. **Comprehensive Assessment:** Completed within 5 days.
13. **Plan of Care (POC):** Created, signed, and addresses all assessed problems (Pain, Spiritual, Psychosocial).
14. **Visit Frequency:** Visit logs must align with the frequency ordered in the POC.

### **E. Recertification & Face-to-Face (F2F)**
15. **Recertification CTI:** Present for the specific benefit period (90-day / 60-day).
16. **Face-to-Face (F2F) Encounter:** Required for the 3rd benefit period and beyond.
    *   Must be performed by an eligible practitioner (NP or Hospice Physician).
    *   Must include specific **Attestation Language**.
    *   Must be timely (within 30 days prior to the start of the benefit period).

---

# 5. Technical Architecture & Data Model

### **System Components**
*   **Web App (Frontend):** React  Role-based dashboards.
*   **Backend API:** Django / Python. Handles auth, upload, and logic.
*   **AI/OCR Service:**
    *   **Ingestion:** Extracts text from PDFs (Scanned & Digital).
    *   **Classification:** Identifies document types (e.g., "This is a signed order").
    *   **Analysis:** OpenAI API (GPT-4o) for semantic analysis and rule checking.
*   **Database:** PostgreSQL for deployment, sqlite for development. Stores users, audits, findings, and the **Common Requirement Library (CRL)**.

### **Data Model (Core Tables)**
*   **Agency:** The hospice organization.
*   **Patient/Episode:** The subject of the audit.
*   **Audit:** The container for a specific review instance.
*   **Requirement (CRL):** The master list of rules (CMS/CHAP/HHSC).
*   **Finding:** A specific instance of a failed requirement linked to evidence.
*   **CorrectionTask:** A workflow item assigned to a user to fix a finding.

---

# 6. Scope of Work (SOW) & Implementation Timeline



### **Phase 1: Foundation & Ingestion **
*   **Deliverables:**
    *   Secure Login & Role-Based Access Control (RBAC).
    *   Agency & User Management (Superadmin).
    *   **PDF Upload Pipeline:** Secure storage (PHI compliant) + Text Extraction (OCR).
    *   **Document Classifier:** AI trained to recognize key hospice forms (CTI, Election, POC).
*   **Goal:** User can log in, create a patient, and upload a chart(PDF). System can read the files.

### **Phase 2: Core Audit Engine - Admission **
*   **Deliverables:**
    *   **Rules Engine v1:** Implementation of **15 Core Admission Checks** (Election, CTI, Initial Assessment).
    *   **Evidence Linking:** System highlights *where* in the document the date/signature was found.
    *   **Findings Dashboard:** UI to view pass/fail status and severity.
*   **Goal:** System can audit an Admission Chart and flag missing documents or dates.

### **Phase 3: Recertification & F2F Logic **
*   **Deliverables:**
    *   **Benefit Period Calculator:** Automatic calculation of 90/90/60 day periods based on admission date.
    *   **F2F Logic:** Rules to enforce Face-to-Face encounter timing and attestation language.
    *   **Recert CTI Checks:** Verifying physician narratives for continued eligibility.
    *   **HHSC Overlay:** Tagging findings with Texas-specific rule references.
*   **Goal:** System successfully audits complex Recertification charts(PDF) (High Value Feature).

### **Phase 4: Corrections, Reporting & Pilot **
*   **Deliverables:**
    *   **Correction Workflow:** Assign tasks, upload addendums, mark as resolved.
    *   **Reporting Engine:** Generate "Survey-Ready" PDF Report and CAPA Summary.
    *   **Pilot Launch:** Deployment to staging for client testing with real charts.
*   **Goal:**  end-to-end product ready.

---

# 7. Critical Technical Questions

To ensure the build matches your exact needs, please clarify the following:

1.  **EMR Integration Strategy:**
    *   Are we strictly sticking to **PDF Uploads** for Phase 1 (as assumed in this SOW), or do you require a direct API integration with EMRs (like Homecare Homebase or MatrixCare) immediately? *Recommendation: Start with PDF Upload for faster time-to-market.*

2.  **OpenAI Model Budget:**
    *   This system requires high-intelligence processing (GPT-4o) for accurate clinical narrative analysis. Do you have a specific budget cap for API costs per audit?

3.  **Texas HHSC Specifics:**
    *   Are there any specific *local* forms or affidavits required by Texas HHSC that we should hard-code into the document classifier beyond the standard federal forms?



---

