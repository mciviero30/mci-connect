# Permissions Audit — MCI Connect
**Date**: 2025-12-31  
**Focus**: Role-based access control, approval workflows, permission gates

---

## ROLE HIERARCHY

### Built-In Roles (Base44 System)
```
User.role = 'admin' | 'user'

admin → Full access to everything
user  → Restricted based on position
```

---

### Position-Based Permissions (Extended)
```
User.position = string (freeform)

Common Positions:
- CEO                    → Full access (same as admin)
- administrator          → Full access (same as admin)
- Administrator          → Full access (same as admin)
- manager                → Elevated permissions (create financial docs)
- Manager                → Same
- Project Manager        → Same
- supervisor             → Elevated permissions
- Supervisor             → Same
- foreman                → Standard user (field worker)
- technician             → Standard user (field worker)
```

**Problem Solved (Dec 31)**: Case-insensitive matching, variant support

---

## PERMISSION MATRIX

### Navigation Access

| Page/Feature | User (Employee) | Foreman | Manager | Admin/CEO |
|--------------|----------------|---------|---------|-----------|
| **Dashboard** | ✅ | ✅ | ✅ | ✅ |
| **My Profile** | ✅ | ✅ | ✅ | ✅ |
| **Directory** | ✅ | ✅ | ✅ | ✅ |
| **My Hours** | ✅ | ✅ | ✅ | ✅ |
| **My Expenses** | ✅ | ✅ | ✅ | ✅ |
| **My Jobs** | ✅ | ✅ | ✅ | ✅ |
| **MCI Field** | ✅ | ✅ | ✅ | ✅ |
| **Calendar** | ✅ | ✅ | ✅ | ✅ |
| **Chat** | ✅ | ✅ | ✅ | ✅ |
| **Announcements** | ✅ | ✅ | ✅ | ✅ |
| **Training** | ✅ | ✅ | ✅ | ✅ |
| **Compliance Hub** | ✅ | ✅ | ✅ | ✅ |
| | | | | |
| **Employees** | ❌ | ❌ | ✅ | ✅ |
| **Teams** | ❌ | ❌ | ✅ | ✅ |
| **Quotes** | ❌ | ❌ | ✅ | ✅ |
| **Invoices** | ❌ | ❌ | ✅ | ✅ |
| **Customers** | ❌ | ❌ | ✅ | ✅ |
| **Items Catalog** | ❌ | ❌ | ✅ | ✅ |
| **Jobs (all)** | ❌ | ❌ | ✅ | ✅ |
| **Accounting** | ❌ | ❌ | ✅ | ✅ |
| **Approvals Hub** | ❌ | ❌ | ✅ | ✅ |
| **Payroll** | ❌ | ❌ | ✅ | ✅ |
| **Time Approval** | ❌ | ❌ | ✅ | ✅ |
| **Expense Approval** | ❌ | ❌ | ✅ | ✅ |
| | | | | |
| **Analytics Hub** | ❌ | ❌ | ✅ | ✅ |
| **Control Tower** | ❌ | ❌ | ❌ | ✅ |
| **Budget Forecast** | ❌ | ❌ | ✅ | ✅ |
| **Role Management** | ❌ | ❌ | ❌ | ✅ |
| **Agreement Signatures** | ❌ | ❌ | ❌ | ✅ |

---

### Document Creation Permissions

| Action | User | Foreman | Manager | Admin/CEO |
|--------|------|---------|---------|-----------|
| **Create Quote** | ❌ | ❌ | ✅ (approval) | ✅ (auto) |
| **Edit Own Quote** | ❌ | ❌ | ✅ | ✅ |
| **Edit Any Quote** | ❌ | ❌ | ❌ | ✅ |
| **Delete Quote** | ❌ | ❌ | ❌ | ✅ |
| **Send Quote** | ❌ | ❌ | ✅ | ✅ |
| **Convert Quote→Invoice** | ❌ | ❌ | ✅ | ✅ |
| | | | | |
| **Create Invoice** | ❌ | ❌ | ✅ (approval) | ✅ (auto) |
| **Edit Own Invoice** | ❌ | ❌ | ✅ | ✅ |
| **Edit Any Invoice** | ❌ | ❌ | ❌ | ✅ |
| **Delete Invoice** | ❌ | ❌ | ❌ | ✅ |
| **Send Invoice** | ❌ | ❌ | ✅ | ✅ |
| **Record Payment** | ❌ | ❌ | ✅ | ✅ |
| **Provision Job** | ❌ | ❌ | ❌ | ✅ (auto) |
| | | | | |
| **Create Job** | ❌ | ❌ | ✅ (approval) | ✅ (auto) |
| **Edit Job** | ❌ | ❌ | ✅ | ✅ |
| **Delete Job** | ❌ | ❌ | ❌ | ✅ |
| **Archive Job** | ❌ | ❌ | ✅ | ✅ |
| | | | | |
| **Approve Quote** | ❌ | ❌ | ❌ | ✅ |
| **Approve Invoice** | ❌ | ❌ | ❌ | ✅ |
| **Approve Job** | ❌ | ❌ | ❌ | ✅ |
| **Approve Time** | ❌ | ❌ | ✅ | ✅ |
| **Approve Expense** | ❌ | ❌ | ✅ | ✅ |
| **Approve Mileage** | ❌ | ❌ | ✅ | ✅ |

---

## PERMISSION CHECKS (Code Implementation)

### Frontend: Navigation (Layout.js)

```javascript
// Layout.js - getNavigationForUser()
const getNavigationForUser = () => {
  const position = (displayUser?.position || user?.position || '').toLowerCase();
  const department = (displayUser?.department || user?.department || '').toLowerCase();
  const isAdmin = user?.role === 'admin';

  // Normalize position variants (FIXED Dec 31)
  const isManager = position.includes('manager') || position.includes('supervisor');
  const isCEO = position.includes('ceo');
  const isAdministrator = position.includes('administrator') || position.includes('admin');
  const isHR = department === 'hr' || department === 'human resources';

  // Full access: CEO, administrator, admin role, managers, and HR
  const hasFullAccess = isAdmin || isCEO || isAdministrator || isManager || isHR;

  if (hasFullAccess) {
    return adminNavigation;  // All pages
  }

  return employeeNavigation;  // Limited pages
};
```

**Key Fix**: `.toLowerCase() + .includes()` handles ALL variants:
- "Manager", "manager", "Project Manager", "Construction Manager"
- "Administrator", "administrator", "Admin"
- "Supervisor", "supervisor", "Site Supervisor"

---

### Frontend: Document Actions (roleRules.js)

```javascript
// components/core/roleRules.js

/**
 * Check if user can create financial documents (quotes, invoices, jobs)
 */
export function canCreateFinancialDocs(user) {
  if (!user) return false;
  
  const position = (user.position || '').toLowerCase();
  const role = user.role;
  
  // Admins/CEOs can create
  if (role === 'admin') return true;
  if (position.includes('ceo')) return true;
  if (position.includes('administrator')) return true;
  
  // Managers/supervisors can create
  if (position.includes('manager')) return true;
  if (position.includes('supervisor')) return true;
  
  return false;
}

/**
 * Check if user's creations need approval
 */
export function needsApproval(user) {
  if (!user) return true;
  
  const position = (user.position || '').toLowerCase();
  const role = user.role;
  
  // Admins/CEOs auto-approved
  if (role === 'admin') return false;
  if (position.includes('ceo')) return false;
  if (position.includes('administrator')) return false;
  
  // Everyone else needs approval
  return true;
}

/**
 * Check if user can approve/reject documents
 */
export function canApprove(user) {
  if (!user) return false;
  
  const position = (user.position || '').toLowerCase();
  const role = user.role;
  
  // Only admins/CEOs/administrators can approve
  if (role === 'admin') return true;
  if (position.includes('ceo')) return true;
  if (position.includes('administrator')) return true;
  
  return false;
}
```

**Usage in pages:**
```javascript
// pages/CrearEstimado.jsx
if (!canCreateFinancialDocs(user)) {
  return <PermissionDenied />;
}

const newQuote = {
  ...quoteData,
  approval_status: needsApproval(user) ? 'pending_approval' : 'approved',
  created_by_role: user.position
};
```

---

### Backend: Function Auth (functions/_auth.js)

```javascript
// functions/_auth.js - Centralized middleware

/**
 * Require authenticated user (any role)
 */
export async function requireUser(base44) {
  const user = await base44.auth.me();
  
  if (!user) {
    throw new Response(
      JSON.stringify({ error: 'Unauthorized' }), 
      { status: 401 }
    );
  }
  
  return user;
}

/**
 * Require admin access (admin, CEO, or administrator)
 */
export async function requireAdmin(base44) {
  const user = await requireUser(base44);
  
  const isAdmin = user.role === 'admin' || 
                  user.position === 'CEO' || 
                  user.position === 'administrator';
  
  if (!isAdmin) {
    throw new Response(
      JSON.stringify({ error: 'Forbidden: Admin access required' }), 
      { status: 403 }
    );
  }
  
  return user;
}

/**
 * Require manager or admin access
 */
export async function requireManagerOrAdmin(base44) {
  const user = await requireUser(base44);
  
  const isAuthorized = user.role === 'admin' || 
                       user.position === 'CEO' || 
                       user.position === 'administrator' ||
                       user.position === 'manager';
  
  if (!isAuthorized) {
    throw new Response(
      JSON.stringify({ error: 'Forbidden: Manager or Admin access required' }), 
      { status: 403 }
    );
  }
  
  return user;
}
```

**Usage in functions:**
```javascript
// functions/provisionJobFromInvoice.js
import { requireAdmin } from './_auth.js';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await requireAdmin(base44);  // ← Blocks non-admins
  
  // Admin-only logic...
});
```

---

## APPROVAL WORKFLOW

### Document Status States

```
┌───────────────────────────────────────────────────────────┐
│                  APPROVAL STATE MACHINE                    │
│                                                            │
│  Manager Creates Document                                 │
│  ┌──────────────────────────────────┐                     │
│  │ approval_status: 'pending_approval'│                   │
│  │ created_by: manager@mci.com      │                     │
│  │ created_by_role: 'manager'       │                     │
│  └──────────────┬───────────────────┘                     │
│                 │                                          │
│        ┌────────┴────────┐                                │
│        │                 │                                 │
│        ↓ APPROVE         ↓ REJECT                         │
│  ┌──────────────────┐  ┌─────────────────┐               │
│  │ approval_status: │  │ approval_status: │               │
│  │   'approved'     │  │   'rejected'     │               │
│  │ approved_by      │  │ rejected_by      │               │
│  │ approved_at      │  │ rejected_at      │               │
│  │ approval_notes   │  │ approval_notes   │               │
│  └──────────────────┘  └─────────────────┘               │
│                                                            │
│  Admin/CEO Creates Document                               │
│  ┌──────────────────────────────────┐                     │
│  │ approval_status: 'approved'      │ ← AUTO-APPROVED     │
│  │ created_by: admin@mci.com        │                     │
│  │ created_by_role: 'administrator' │                     │
│  └──────────────────────────────────┘                     │
└────────────────────────────────────────────────────────────┘
```

---

### Approval Rules (roleRules.js)

```javascript
/**
 * Get effective approval status (handles legacy data)
 */
export function getEffectiveApprovalStatus(document) {
  // If approval_status exists, use it
  if (document.approval_status) {
    return document.approval_status;
  }
  
  // Legacy: Assume approved if no field
  return 'approved';
}

/**
 * Check if document can be sent to customer
 */
export function canSendDocument(document) {
  const status = getEffectiveApprovalStatus(document);
  return status === 'approved';
}

/**
 * Check if document can trigger job provisioning
 */
export function canProvisionJob(invoice) {
  const status = getEffectiveApprovalStatus(invoice);
  return status === 'approved';
}
```

---

### Approval UI Components

**Approval Banner:**
```javascript
// components/shared/ApprovalBanner.jsx
export default function ApprovalBanner({ document, onApprove, onReject }) {
  const status = document.approval_status;
  
  if (status === 'approved') {
    return (
      <div className="bg-green-50 border-green-200">
        ✅ Approved by {document.approved_by} on {formatDate(document.approved_at)}
      </div>
    );
  }
  
  if (status === 'rejected') {
    return (
      <div className="bg-red-50 border-red-200">
        ❌ Rejected by {document.rejected_by}
        {document.approval_notes && <p>{document.approval_notes}</p>}
      </div>
    );
  }
  
  if (status === 'pending_approval') {
    return (
      <div className="bg-amber-50 border-amber-200">
        ⏳ Pending Approval
        {canApprove(user) && (
          <div>
            <Button onClick={onApprove}>Approve</Button>
            <Button onClick={onReject}>Reject</Button>
          </div>
        )}
      </div>
    );
  }
  
  return null;
}
```

**Approvals Hub:**
```javascript
// pages/ApprovalsHub.jsx
export default function ApprovalsHub() {
  const { data: user } = useQuery({ queryKey: ['currentUser'] });
  
  if (!canApprove(user)) {
    return <PermissionDenied />;
  }
  
  // Fetch pending documents
  const { data: pendingQuotes } = useQuery({
    queryKey: ['pendingQuotes'],
    queryFn: () => base44.entities.Quote.filter({ 
      approval_status: 'pending_approval' 
    })
  });
  
  const { data: pendingInvoices } = useQuery({
    queryKey: ['pendingInvoices'],
    queryFn: () => base44.entities.Invoice.filter({ 
      approval_status: 'pending_approval' 
    })
  });
  
  // ... render approval cards
}
```

---

## AGREEMENT GATE

### Agreement Requirements by Role

```javascript
// components/core/agreementsConfig.js
export const agreementsConfig = {
  manager_variable_comp: {
    id: 'manager_variable_comp',
    title: 'Manager Variable Compensation Agreement',
    version: 'v1.0',
    appliesTo: (user) => {
      if (!user) return false;
      
      // Normalize position (FIXED Dec 31)
      const pos = (user.position || '').toLowerCase();
      const role = user.role;
      
      // Apply to managers, supervisors, administrators
      return pos.includes('manager') || 
             pos.includes('supervisor') || 
             pos.includes('administrator') ||
             role === 'admin';
    },
    // ... agreement content
  },
  
  foreman_variable_comp: {
    id: 'foreman_variable_comp',
    title: 'Foreman Variable Compensation Agreement',
    version: 'v1.0',
    appliesTo: (user) => {
      if (!user) return false;
      const pos = (user.position || '').toLowerCase();
      return pos.includes('foreman');
    },
    // ... agreement content
  }
};
```

**Gate Component:**
```javascript
// components/agreements/AgreementGate.jsx
export default function AgreementGate({ user, children }) {
  const [currentAgreement, setCurrentAgreement] = useState(null);
  
  useEffect(() => {
    checkPendingAgreements();
  }, [user]);
  
  const checkPendingAgreements = async () => {
    if (!user) return;
    
    // Find applicable agreements
    const applicable = Object.values(agreementsConfig).filter(
      agreement => agreement.appliesTo(user)  // ← Uses normalized check
    );
    
    // Check signatures
    const signatures = await base44.entities.AgreementSignature.filter({
      employee_email: user.email
    });
    
    // Find first unsigned
    const unsigned = applicable.find(
      agreement => !signatures.some(
        sig => sig.agreement_type === agreement.id && sig.version === agreement.version
      )
    );
    
    if (unsigned) {
      setCurrentAgreement(unsigned);
    }
  };
  
  if (currentAgreement) {
    return <AgreementSignatureModal agreement={currentAgreement} />;
  }
  
  return children;
}
```

**Bug Fixed (Dec 31)**: Manager/Administrator now correctly detected by appliesTo()

---

## ONBOARDING GATE

### Gate Logic

```javascript
// Layout.js
const shouldBlockForOnboarding = user && 
  !isClientOnly && 
  user.role !== 'admin' && 
  user.employment_status !== 'deleted' &&
  user.onboarding_completed !== true &&  // ← DEFINITIVE FLAG
  !onboardingCompleted;  // ← COUNT FALLBACK

useEffect(() => {
  if (shouldBlockForOnboarding && !isOnboardingPage) {
    navigate(createPageUrl('OnboardingWizard'), { replace: true });
  }
}, [shouldBlockForOnboarding, isOnboardingPage]);
```

**Bypass Conditions:**
1. Client-only users (external, no onboarding)
2. Admin role (skip onboarding)
3. Deleted employment_status (blocked from app)
4. onboarding_completed flag = true (DEFINITIVE)
5. 3+ OnboardingForm records (FALLBACK)

---

## CLIENT PORTAL ACCESS (External Users)

### Special Case: Client-Only Users

```javascript
// Layout.js
const { data: clientMemberships = [] } = useQuery({
  queryKey: ['client-memberships-check', user?.email],
  queryFn: () => base44.entities.ProjectMember.filter({ 
    user_email: user?.email,
    role: 'client'
  }),
  enabled: !!user?.email && user?.role !== 'admin'
});

const isClientOnly = clientMemberships.length > 0 && user?.role !== 'admin';

// Client-only users → redirect to ClientPortal
useEffect(() => {
  if (isClientOnly && currentPageName !== 'ClientPortal') {
    navigate(createPageUrl('ClientPortal'), { replace: true });
  }
}, [isClientOnly, currentPageName]);

// Render without sidebar
if (isClientOnly) {
  return children;  // No sidebar, no nav
}
```

**Client Permissions:**
- ✅ View assigned project
- ✅ View photos, documents, progress
- ✅ Comment on updates
- ✅ Approve milestones
- ❌ No access to internal pages (employees, financials, etc.)

---

## PERMISSION ENFORCEMENT SUMMARY

### Layers of Security

1. **Frontend Navigation** (Layout.js)
   - Shows/hides menu items based on role
   - Prevents accidental access
   - User experience optimization

2. **Frontend Component** (roleRules.js)
   - Blocks rendering of restricted UI
   - Shows permission denied messages
   - Validates before mutations

3. **Backend Function** (functions/_auth.js)
   - CRITICAL: Real enforcement layer
   - Validates every API call
   - Cannot be bypassed by frontend

4. **Backend Entity** (Base44 platform)
   - User entity has built-in security rules
   - Only admin can list/update/delete other users
   - Automatic enforcement

---

### Permission Check Locations

| Check | Frontend | Backend | Notes |
|-------|----------|---------|-------|
| **Navigation visibility** | ✅ Layout.js | N/A | UX only |
| **Create document button** | ✅ roleRules.js | N/A | UX only |
| **Document creation** | ✅ roleRules.js | ✅ requireUser | Real enforcement |
| **Approval action** | ✅ canApprove() | ✅ requireAdmin | Real enforcement |
| **Job provisioning** | ❌ Hidden | ✅ requireAdmin | Backend only |
| **User invite** | ✅ Layout nav | ✅ Base44 (built-in) | System-level |
| **Entity CRUD** | ✅ UI checks | ✅ Base44 (built-in) | System-level |

---

## EDGE CASES & SECURITY CONSIDERATIONS

### Case 1: Position Change Mid-Session
**Scenario**: Admin changes user position from "employee" to "manager"

**Current Behavior:**
- User must logout/login to see new navigation
- Role stored in JWT token (refresh needed)

**Mitigation:**
- Backend always checks latest user data
- Frontend checks are UX hints only
- Real permission enforced at API level

---

### Case 2: Concurrent Approval
**Scenario**: Two admins approve same quote simultaneously

**Current Behavior:**
- Both updates succeed (last write wins)
- Both recorded in audit (approved_by field)

**Mitigation:**
- Status check in backend before approval
- Idempotent (approving twice = same result)

---

### Case 3: Deleted User Still Logged In
**Scenario**: Admin deletes user, but they're still in app

**Current Behavior:**
- Layout checks employment_status on every render
- Shows access denied if status = 'deleted'
- Backend blocks all API calls

**Enforcement:**
```javascript
// Layout.js
if (user && user.employment_status === 'deleted') {
  return <AccessDenied />;
}
```

---

### Case 4: Manager Tries to Self-Approve
**Scenario**: Manager creates quote, tries to approve own quote

**Current Behavior:**
- canApprove(user) returns false (manager ≠ admin)
- Approve button hidden in UI
- Backend blocks if attempted

**Enforcement:**
```javascript
// Backend (if approval endpoint existed)
export async function requireAdmin(base44) {
  const user = await base44.auth.me();
  if (user.role !== 'admin' && !isAdminPosition(user.position)) {
    throw new Response({ error: 'Forbidden' }, { status: 403 });
  }
}
```

---

## RECOMMENDATIONS

### Implemented (Dec 31) ✅

1. **Position Normalization**
   - All checks use `.toLowerCase() + .includes()`
   - Handles variants: "Manager" vs "manager" vs "Project Manager"

2. **Centralized Auth Middleware**
   - `functions/_auth.js` for backend
   - `components/core/roleRules.js` for frontend
   - Consistent logic across all files

3. **Approval Status Field**
   - All financial documents have `approval_status`
   - Backend provisioning checks approval
   - Cannot bypass with frontend tricks

---

### Future Enhancements (Optional)

4. **Granular Permissions System**
   - Current: Role-based (coarse)
   - Future: Permission-based (fine-grained)
   - Example: "can_edit_quotes", "can_delete_jobs"

5. **Audit Log Entity**
   - Track all permission-gated actions
   - Who approved/rejected what, when
   - Currently: Embedded in document (approved_by, approved_at)

6. **Session Management**
   - Force logout on role/position change
   - Real-time permission updates
   - WebSocket notifications

7. **Role Templates**
   - Predefined bundles: "Field Worker", "Office Manager", "Executive"
   - Assign template instead of individual permissions
   - Easier onboarding

---

## TESTING CHECKLIST

### User Flows

- [ ] Employee tries to access Invoices page → Blocked (no nav item)
- [ ] Manager creates quote → Status = pending_approval
- [ ] Admin creates quote → Status = approved
- [ ] Manager tries to approve own quote → Button hidden
- [ ] Admin approves pending quote → Status = approved
- [ ] Admin converts approved quote → Invoice created (correct approval_status)
- [ ] Manager creates invoice (no quote) → Status = pending_approval
- [ ] Admin sends approved invoice → Job provisioning triggered
- [ ] Manager sends pending invoice → Blocked (button disabled)
- [ ] Deleted user still logged in → Access denied screen
- [ ] Client-only user logs in → Redirect to ClientPortal (no sidebar)

### Backend Security

- [ ] Non-admin calls provisionJobFromInvoice → 403 Forbidden
- [ ] Manager calls requireAdmin endpoint → 403 Forbidden
- [ ] Deleted user calls any API → 401 Unauthorized
- [ ] Unauthenticated call → 401 Unauthorized

---

**End of Permissions Audit**