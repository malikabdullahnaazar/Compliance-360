# Compliance 360 – Hospice Clinical Chart Review System
## Project Flow, Scope of Work (SOW), and Implementation Strategy

---

### 1. Introduction & Project Goal
**Compliance 360** is an AI-powered compliance auditor designed for hospice agencies. The system automates the review of patient clinical charts (PDFs) to detect regulatory deficiencies, map them to specific citations (CMS, CHAP, HHSC, etc.), and provide structured correction guidance.

**Objective:** Ensure hospice agencies are "survey-ready" by identifying high-risk documentation gaps before official audits occur.

---

### 2. User Roles & Authentication

#### **Authentication System**
*   **Secure Login:** Email + Password with secure session management.
*   **Role-Based Access Control (RBAC):**
    *   **Superadmin (Private Use):** If the software is private, the Superadmin has the sole authority to create and manage users.
    *   **QA/Compliance (Primary User):** Runs audits, manages findings, and produces reports.
    *   **Clinical Leadership:** Reviews trends and signs off on corrective actions.
    *   **Clinicians:** View and resolve assigned correction tasks (addendums/clarifications).

> **Question for Approval:** Should we allow public signup (SaaS model), or is this for private use only?
> *   **If Private:** Only a Superadmin can create accounts.

---

### 3. The Full Flow (End-to-End)

**Persona:** **Sarah**, a QA & Compliance Officer at a Hospice Agency in Texas.

1.  **Initial Setup:** Sarah logs in and configures the agency profile, selecting **CMS Hospice CoPs** and **CHAP** as the primary frameworks, with the **Texas HHSC Overlay** enabled.
2.  **Audit Creation:** Sarah starts a new "Admission Audit" for a recently admitted patient.
3.  **File Upload:** She uploads a bundle of PDFs (Election Statement, CTI, RN Initial Assessment, POC).
4.  **AI Processing:**
    *   The system performs **OCR & Text Extraction** on the PDFs.
    *   The **AI Layer** (powered by **OpenAI API**) analyzes the text against the **Common Requirement Library (CRL)**.
    *   It looks for "Red Flags" (e.g., missing signature on the Election Statement, or a clinical narrative that doesn't support terminal prognosis).
5.  **Reviewing Results:** The system generates a **Findings Dashboard**. Sarah sees a **Critical Deficiency**: "Missing Physician Narrative for CTI."
6.  **Citation & Guidance:** Sarah clicks the finding to see the exact regulation (e.g., CMS §418.22) and safe **Correction Guidance** (e.g., "Request a signed addendum from Dr. Smith specifically addressing the terminal prognosis indicators").
7.  **Correction Workflow:** Sarah assigns the correction task to the admitting RN.
8.  **Report Generation:** Once reviewed, Sarah exports a **Survey-Ready Audit Report (PDF)** to show the agency is compliant.

---

### 4. Core Functionality & "Red Flags" (AI Checklist)

The AI will strictly monitor the following **40 High-Risk Checks** (derived from client requirements):

#### **A. Admission – Election & Rights**
1.  Hospice election statement present.
2.  Election includes all required elements (e.g., palliative vs. curative acknowledgment).
3.  Patient/representative signature present.
4.  Election effective date documented.
5.  Attending physician selection documented.
6.  Patient rights acknowledgment present.
7.  Notice of hospice election provided timely (within 5 days).

#### **B. Certification of Terminal Illness (CTI)**
8.  Initial CTI present.
9.  CTI signed by the appropriate physician (Medical Director + Attending).
10. CTI dated timely relative to admission.
11. Diagnosis on CTI matches the clinical record.
12. Prognosis timeframe documented (≤ 6 months).

#### **C. Eligibility & Clinical Support (AI Narrative Analysis)**
13. Clinical narrative supports terminal prognosis (Wait! Is there proof of decline?).
14. Supporting documentation present (Weight loss, ADL decline, falls, etc.).
15. **Red Flag:** No contradictory documentation (e.g., notes saying "patient is improving" while on hospice).

#### **D. Assessments & Plan of Care (POC)**
16. Initial RN assessment completed timely (within 48 hours).
17. Comprehensive assessment completed (within 5 days).
18. Pain assessment documented.
19. Symptom assessment present.
20. Psychosocial/Spiritual assessments present or declined.
21. Initial Plan of Care created and addresses assessed problems.
22. Visit frequencies align with the POC.

#### **E. Recertification & Face-to-Face (F2F)**
23. Recertification CTI present for the specific benefit period.
24. **F2F Encounter:** Completed for 3rd benefit period and subsequent periods.
25. F2F performed by an eligible practitioner and within the required window.
26. F2F attestation language is complete and signed.

---

### 5. Technical Requirements

*   **OpenAI API Integration:** Required for deep semantic analysis of clinical narratives and regulation mapping.
*   **PDF Extraction Engine:** Must handle both digital PDFs and scanned (OCR) documents.
*   **Standards Engine:** A structured database (JSON/PostgreSQL) storing the CRL mappings (CMS, CHAP, Joint Commission, ACHC, HHSC).
*   **Security:** PHI-compliant storage (Encryption at rest/transit).

---

### 6. Scope of Work (SOW) Approval

| Phase | Deliverables | Status |
| :--- | :--- | :--- |
| **Phase 1** | **Foundation:** Auth System (Superadmin + QA), PDF Upload, Secure Storage. | Pending |
| **Phase 2** | **AI Audit Engine:** 25 Core Admission Rules, OpenAI Integration, OCR Pipeline. | Pending |
| **Phase 3** | **Recertification & F2F:** Benefit period tracking, F2F timing rules, 15 Recert rules. | Pending |
| **Phase 4** | **Reporting:** Deficiency Dashboard, PDF Report Export, Correction Tasks. | Pending |

---

### 7. Critical Questions for the Client

1.  **Signup Process:** Is this software for **Private Use** (Superadmin creates users) or **Public Use** (SaaS signup)?
2.  **EMR Integration:** For Phase 1, are we strictly doing **PDF Uploads**, or do you need a direct sync with systems like Homecare Homebase or MatrixCare?
3.  **OpenAI Model:** Do you have a preferred OpenAI model (e.g., GPT-4o for high accuracy) or a budget/token limit we should design around?
4.  **Texas HHSC:** Should the Texas-specific rules be a "toggle" that adds extra flags to the standard CMS audit?

---
**Prepared by:** Senior Developer / AI Architect
**Project:** Compliance 360
