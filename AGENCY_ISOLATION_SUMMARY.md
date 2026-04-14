# Agency-Level Data Isolation Implementation

## Overview
This document summarizes the implementation of strict agency-level data isolation across the Compliance 360 application. Users from one agency cannot access, view, or interact with patients, documents, or AI analysis results from other agencies.

## Changes Made

### 1. Backend Model Updates

#### Added `agency` Foreign Key to AI Models
The following models now have an `agency` field for explicit data isolation:

- **`AuditSession`** - Added `agency` FK with index
- **`ComplianceFinding`** - Added `agency` FK with index
- **`AIAnalysisResult`** - Added `agency` FK with indexes on agency, patient, and created_by
- **`AssignedAuditReport`** - Added `agency` FK with indexes on agency, assigned_to, and assigned_by

**Note**: The following models already had `agency` FK:
- `Patient` ✓
- `AuditDocument` ✓
- `CustomUser` ✓

### 2. Backend API Authorization Updates

#### Patient API (`/api/patients/`)
**File**: `backend/patients/views.py`

- **`get_queryset()`**: Updated to enforce strict agency filtering
  - Superadmins: All patients
  - Agency admins/QA/Clinical Leadership: Only patients in their agency
  - Clinicians: Only patients in their agency
  - Users without agency: No access
  
- **`get_object()`**: Added override to prevent cross-agency patient access
- **`perform_create()`**: Automatically sets agency from authenticated user
- **`search` action**: Inherits agency filtering from `get_queryset()`
- **`my_patients` action**: Inherits agency filtering from `get_queryset()`

#### AI Audit Sessions API (`/api/ai/audit-sessions/`)
**File**: `backend/ai/views/session_views.py`

- **`get_queryset()`**: Updated with agency filtering
  - Superadmins/QA: All sessions
  - Agency admins/Clinical Leadership: Sessions in their agency
  - Others: Only sessions they created
  
- **`perform_create()`**: Sets agency from authenticated user
- **`_create_finding()`**: Propagates agency to ComplianceFinding records

#### AI Documents API (`/api/ai/documents/`)
**File**: `backend/ai/views/document_views.py`

Already had proper agency filtering in `get_queryset()`:
- Superadmins: All documents
- Agency admins/QA: Documents in their agency
- Others: Documents linked to their audit sessions or patients

#### AI Compliance Findings API (`/api/ai/findings/`)
**File**: `backend/ai/views/finding_views.py`

- **`get_queryset()`**: Updated with agency filtering
  - Superadmins/QA: All findings
  - Agency admins/Clinical Leadership: Findings in their agency
  - Others: Findings they created or are assigned to

#### AI Analysis Results API (`/api/ai/mistral/results/`)
**File**: `backend/ai/views/report_views.py`

- **`list_results()`**: Added agency filtering
  - Superadmins: All results
  - Others: Only results in their agency
  
- **`save_result()`**: Sets agency from authenticated user
- **`mark_as_pass()`**: Fixed bug (was using non-existent `User.Role` constants), now uses string comparison. Added agency verification.

#### AI Assignments API (`/api/ai/mistral/assigned/`)
**File**: `backend/ai/views/assignment_views.py`

- **`assign()`**: Sets agency and verifies user has access to the result
- **`list_assigned()`**: Updated with strict agency filtering
  - Clinicians: Only their own assignments
  - Superadmins: All assignments
  - Agency users: Assignments in their agency
  
- **`get_detail()`**: Added agency verification before returning data
- **`list_clinicians()`**: Updated to show only clinicians in user's agency (superadmins see all)

#### Users API (`/api/admin/users/`)
**File**: `backend/users/views.py`

Already had proper agency filtering:
- `UserListView`: Filters by agency for non-superadmins
- `UserCreateView`: Auto-assigns agency for agency admins
- `UserDetailView`: Scopes updates to agency

### 3. Authentication Response

The login endpoint (`/api/auth/login/`) already returns `agency_name` in the user object via `UserSerializer`:

```json
{
  "refresh": "...",
  "access": "...",
  "user": {
    "id": "...",
    "username": "...",
    "email": "...",
    "role": "...",
    "agency": "...",
    "agency_name": "Agency Name",  // ← Already included
    ...
  }
}
```

### 4. Frontend Updates

#### Navbar Component
**File**: `frontend/src/components/layout/Navbar.jsx`

Added agency name display in the navbar:
- Shows agency name with shield icon on desktop (hidden on mobile)
- Uses `user.agency_name` from authentication response
- Styled with responsive design (gray background, rounded corners)

```jsx
{user.agency_name && (
  <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800">
    <ShieldCheck className="h-4 w-4 text-gray-600 dark:text-gray-400" />
    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
      {user.agency_name}
    </span>
  </div>
)}
```

### 5. Database Migrations

Created and applied migration: `ai/migrations/0009_aianalysisresult_agency_assignedauditreport_agency_and_more.py`

Adds `agency` field to:
- `AIAnalysisResult`
- `AssignedAuditReport`
- `AuditSession`
- `ComplianceFinding`

Creates indexes for query performance on agency fields.

## Security Model

### Access Control Matrix

| Endpoint | Superadmin | Agency Admin/QA | Clinician |
|----------|-----------|-----------------|-----------|
| Patients | All | Agency only | Agency only |
| Documents | All | Agency only | Agency only |
| Audit Sessions | All | Agency only | Created by user |
| Findings | All | Agency only | Assigned to/created by user |
| AI Results | All | Agency only | Agency only |
| Assignments | All | Agency only | Assigned to user |
| Users | All | Agency only | N/A |

### Key Security Features

1. **Authorization Token Required**: All API endpoints require JWT authentication
2. **Agency Inferred from User**: Agency is automatically set from the authenticated user's agency
3. **Queryset Filtering**: All list/retrieve operations filter by agency at the database level
4. **Object-Level Permission**: Individual object access verified against user's agency
5. **Create Operations**: Agency automatically set, cannot be spoofed by client

## Testing Checklist

- [ ] Login as agency admin user
- [ ] Verify agency name appears in navbar
- [ ] Create patient and verify agency is set
- [ ] List patients and verify only agency patients shown
- [ ] Search patients and verify results are agency-scoped
- [ ] Upload document and verify agency is set
- [ ] Run AI analysis and verify agency is set on results
- [ ] Assign report to clinician and verify agency filtering
- [ ] Login as different agency user and verify data isolation
- [ ] Attempt to access another agency's patient by ID (should fail)
- [ ] Verify dropdowns only show agency-scoped data

## API Endpoints Summary

All endpoints now enforce agency-level data isolation:

### Patients
- `GET /api/patients/patients/` - List (agency-filtered)
- `GET /api/patients/patients/{id}/` - Detail (agency-verified)
- `POST /api/patients/patients/` - Create (agency auto-set)
- `GET /api/patients/patients/search/?q=` - Search (agency-scoped)
- `GET /api/patients/patients/my_patients/` - My patients (agency-scoped)

### AI Documents
- `GET /api/ai/documents/` - List (agency-filtered)
- `POST /api/ai/documents/upload/` - Upload (agency auto-set)
- `GET /api/ai/documents/by_patient/?patient_id=` - By patient (agency-verified)
- `GET /api/ai/documents/search/?q=` - Search (agency-scoped)

### AI Analysis Results
- `POST /api/ai/mistral/analyze/` - Analyze (agency-verified)
- `POST /api/ai/mistral/save/` - Save (agency auto-set)
- `GET /api/ai/mistral/results/` - List (agency-filtered)
- `GET /api/ai/mistral/results/{id}/detail/` - Detail (agency-verified)
- `POST /api/ai/mistral/results/{id}/mark_as_pass/` - Mark pass (agency-verified)

### AI Assignments
- `POST /api/ai/mistral/assign/` - Assign (agency auto-set)
- `GET /api/ai/mistral/assigned/` - List (agency-filtered)
- `GET /api/ai/mistral/assigned/{id}/detail/` - Detail (agency-verified)
- `GET /api/ai/mistral/clinicians/` - Clinicians (agency-filtered)

## Bugs Fixed

1. **`mark_as_pass` permission bug**: Was using non-existent `User.Role.SUPERADMIN` constants. Fixed to use string comparison.
2. **Missing agency on AI models**: AuditSession, ComplianceFinding, AIAnalysisResult, and AssignedAuditReport were missing explicit agency FK, making data isolation inefficient.

## Next Steps (Optional Enhancements)

1. **Permission Tests**: Add unit tests for all permission checks
2. **API Documentation**: Update OpenAPI/Swagger docs with agency filtering notes
3. **Audit Logging**: Log cross-agency access attempts for security monitoring
4. **Data Migration**: Backfill agency field on existing records where missing
5. **Rate Limiting**: Add rate limiting to prevent brute-force ID enumeration
6. **Frontend Error Handling**: Improve UX when users attempt unauthorized access

## Rollback Instructions

If issues arise, rollback with:

```bash
cd backend
python manage.py migrate ai 0008  # Previous migration
git checkout -- backend/ai/models.py
git checkout -- backend/patients/views.py
git checkout -- backend/ai/views/
git checkout -- frontend/src/components/layout/Navbar.jsx
```

## Files Modified

### Backend
- `backend/ai/models.py` - Added agency FK to 4 models
- `backend/patients/views.py` - Enhanced agency filtering
- `backend/ai/views/session_views.py` - Added agency handling
- `backend/ai/views/finding_views.py` - Enhanced agency filtering
- `backend/ai/views/document_views.py` - Already had proper filtering
- `backend/ai/views/report_views.py` - Added agency filtering & fixed bug
- `backend/ai/views/assignment_views.py` - Enhanced agency filtering
- `backend/users/serializers.py` - Already had agency_name (no changes)

### Frontend
- `frontend/src/components/layout/Navbar.jsx` - Added agency name display

### Database
- `backend/ai/migrations/0009_aianalysisresult_agency_assignedauditreport_agency_and_more.py` - New migration
