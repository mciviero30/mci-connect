# MCI Connect — Repository Map
**Generated**: 2025-12-31  
**Purpose**: Complete project structure for external code review  
**Status**: 📦 EXPORT READY

---

## PROJECT STRUCTURE TREE

```
mci-connect/
├── entities/ (84 JSON schemas)
│   ├── User.json (built-in, extended)
│   ├── EmployeeDirectory.json
│   ├── PendingEmployee.json
│   ├── Customer.json
│   ├── Team.json
│   ├── Job.json
│   ├── Quote.json
│   ├── Invoice.json
│   ├── TimeEntry.json
│   ├── Expense.json
│   ├── DrivingLog.json
│   ├── Transaction.json
│   ├── WeeklyPayroll.json
│   ├── Counter.json (atomic counters)
│   ├── OnboardingForm.json
│   ├── AgreementSignature.json
│   ├── FormTemplate.json
│   ├── FormSubmission.json
│   ├── Course.json
│   ├── Quiz.json
│   ├── CourseProgress.json
│   ├── Certification.json
│   ├── Recognition.json
│   ├── Goal.json
│   ├── ... (60+ more entities)
│
├── pages/ (50+ pages)
│   ├── Dashboard.jsx
│   ├── Empleados.jsx ⚠️
│   ├── Directory.jsx
│   ├── MyProfile.jsx ⚠️
│   ├── OnboardingWizard.jsx ⚠️
│   ├── Estimados.jsx (Quotes)
│   ├── CrearEstimado.jsx
│   ├── VerEstimado.jsx
│   ├── Facturas.jsx (Invoices) ⚠️
│   ├── CrearFactura.jsx ⚠️
│   ├── VerFactura.jsx
│   ├── Trabajos.jsx (Jobs)
│   ├── JobDetails.jsx
│   ├── Clientes.jsx (Customers)
│   ├── Contabilidad.jsx
│   ├── Gastos.jsx (Expenses)
│   ├── Nomina.jsx (Payroll)
│   ├── TimeTracking.jsx
│   ├── Horarios.jsx
│   ├── Calendario.jsx
│   ├── Field.jsx (MCI Field integration)
│   ├── Chat.jsx
│   ├── NewsFeed.jsx
│   ├── ApprovalsHub.jsx ⚠️
│   ├── ... (30+ more pages)
│
├── components/
│   ├── core/
│   │   ├── roleRules.js ⚠️ (approval logic)
│   │   ├── statusConfig.js
│   │   ├── agreementsConfig.js ⚠️
│   │   ├── documentItemRules.js
│   │   └── LineItemContract.jsx
│   │
│   ├── hooks/
│   │   ├── useEmployeeProfile.js ⚠️ (NEW - profile merge)
│   │   ├── usePaginatedEntityList.js
│   │   ├── useAsyncOperation.js
│   │   └── usePermissions.js
│   │
│   ├── utils/
│   │   ├── profileMerge.js ⚠️ (NEW - safe migration)
│   │   ├── nameHelpers.js
│   │   ├── validation.js
│   │   ├── safeErrorMessage.js
│   │   ├── quoteCalculations.js
│   │   └── dataValidation.js
│   │
│   ├── i18n/
│   │   └── LanguageContext.jsx ⚠️ (i18n source of truth)
│   │
│   ├── permissions/
│   │   ├── PermissionsContext.jsx
│   │   └── usePermissions.js
│   │
│   ├── agreements/
│   │   └── AgreementGate.jsx ⚠️
│   │
│   ├── empleados/
│   │   ├── ModernEmployeeCard.jsx ⚠️
│   │   ├── PendingInvitationCard.jsx ⚠️
│   │   ├── EmployeeForm.jsx
│   │   ├── ActiveEmployeeForm.jsx
│   │   └── OnboardingDetailsModal.jsx
│   │
│   ├── documentos/
│   │   ├── LineItemsEditor.jsx
│   │   ├── LineItemsTable.jsx
│   │   ├── QuoteDocument.jsx
│   │   └── InvoiceDocument.jsx
│   │
│   ├── quotes/
│   │   ├── ModernQuoteCard.jsx
│   │   ├── OutOfAreaCalculator.jsx
│   │   ├── QuoteVersions.jsx
│   │   └── AIEstimateInput.jsx
│   │
│   ├── invoices/
│   │   ├── ModernInvoiceCard.jsx
│   │   ├── RetryProvisioningButton.jsx
│   │   └── ProvisioningStatusBadge.jsx
│   │
│   ├── trabajos/
│   │   ├── ModernJobCard.jsx
│   │   ├── JobForm.jsx
│   │   └── AIJobWizard.jsx
│   │
│   ├── field/ (60+ MCI Field components)
│   │   ├── FieldProjectOverview.jsx
│   │   ├── BlueprintViewer.jsx
│   │   ├── TaskDetailPanel.jsx
│   │   └── ... (58 more)
│   │
│   ├── shared/
│   │   ├── PageHeader.jsx
│   │   ├── ApprovalBanner.jsx ⚠️
│   │   ├── LoadMoreButton.jsx
│   │   └── MobileOptimizations.jsx
│   │
│   ├── notifications/
│   │   ├── NotificationEngine.jsx
│   │   ├── UniversalNotificationEngine.jsx
│   │   ├── NotificationBell.jsx
│   │   └── IOSPushManager.jsx
│   │
│   ├── ui/ (30+ shadcn components)
│   │   ├── button.jsx
│   │   ├── input.jsx ⚠️ (autoCapitalize)
│   │   ├── toast.jsx ⚠️
│   │   └── ... (27 more)
│   │
│   └── ... (15+ more folders)
│
├── functions/ (40+ backend functions)
│   ├── _auth.js ⚠️ (centralized auth)
│   ├── generateQuoteNumber.js
│   ├── generateInvoiceNumber.js
│   ├── provisionJobFromInvoice.js ⚠️
│   ├── createJobDriveFolder.js
│   ├── syncJobToMCIField.js
│   ├── sendInvitationEmail.js ⚠️
│   ├── calculateTravelMetrics.js
│   ├── exportEmployeesToPDF.js
│   ├── ... (30+ more)
│
├── Layout.js ⚠️ (main layout + navigation logic)
├── globals.css (theme system)
└── package.json
```

**Legend:**
- ⚠️ = Files modified in recent fixes (data loss, i18n, approval workflow)
- 🔴 = Known bugs reported
- 🟡 = High complexity / needs refactor
- 🟢 = Stable / well-tested

---

## MODULE MAPPING

### FINANCE Module
| Pages | Components | Entities | Functions | Hooks |
|-------|-----------|----------|-----------|-------|
| Estimados.jsx | ModernQuoteCard | Quote | generateQuoteNumber | usePaginatedEntityList |
| CrearEstimado.jsx | QuoteDocument | QuoteItem | calculateTravelMetrics | — |
| VerEstimado.jsx | OutOfAreaCalculator | — | generateQuotePDF | — |
| Facturas.jsx | ModernInvoiceCard | Invoice | generateInvoiceNumber | usePaginatedEntityList |
| CrearFactura.jsx | InvoiceDocument | — | provisionJobFromInvoice | — |
| VerFactura.jsx | RetryProvisioningButton | — | generateInvoicePDF | — |
| Clientes.jsx | ModernCustomerCard | Customer | — | — |
| Contabilidad.jsx | TransactionList | Transaction | exportDatabase | — |
| Items.jsx | — | ItemCatalog | fetchMCIConnectPrices | — |
| BudgetForecasting.jsx | AIBudgetForecaster | — | — | — |

---

### OPERATIONS Module
| Pages | Components | Entities | Functions | Hooks |
|-------|-----------|----------|-----------|-------|
| Trabajos.jsx | ModernJobCard | Job | listJobsPaginated | usePaginatedEntityList |
| JobDetails.jsx | JobTimeline | — | createJobDriveFolder | — |
| — | CostAccumulationChart | — | syncJobToMCIField | — |
| — | — | — | syncJobToWebsite | — |
| Field.jsx | FieldProjectOverview | Task, Photo, Plan | — | — |
| — | BlueprintViewer | Document | — | — |
| — | TaskDetailPanel | TaskComment | — | — |
| Inventario.jsx | — | InventoryItem | — | — |
| Calendario.jsx | WeekView, MonthView | JobAssignment | — | — |
| — | GoogleCalendarSync | ScheduleShift | — | — |

---

### WORKFORCE Module
| Pages | Components | Entities | Functions | Hooks |
|-------|-----------|----------|-----------|-------|
| Empleados.jsx ⚠️ | ModernEmployeeCard ⚠️ | User (extended) | exportEmployeesToPDF | — |
| — | PendingInvitationCard ⚠️ | PendingEmployee ⚠️ | sendInvitationEmail ⚠️ | — |
| — | OnboardingDetailsModal | EmployeeDirectory ⚠️ | syncEmployeeFromMCIConnect | — |
| Directory.jsx | — | — | syncPendingToActive | useEmployeeProfile ⚠️ |
| MyProfile.jsx ⚠️ | PhotoAvatarManager | Certification | — | — |
| OnboardingWizard.jsx ⚠️ | SafetyForm, RulesForm | OnboardingForm ⚠️ | — | — |
| — | PersonalPaperworkForm ⚠️ | — | — | — |
| Teams.jsx | ModernTeamCard | Team | — | — |
| PerformanceManagement.jsx | — | Recognition | — | — |
| RoleManagement.jsx | RoleAssignmentDialog | Role | — | usePermissions |

---

### TIME & PAYROLL Module
| Pages | Components | Entities | Functions | Hooks |
|-------|-----------|----------|-----------|-------|
| TimeTracking.jsx | LiveTimeTracker | TimeEntry | — | — |
| Horarios.jsx | TimeEntryList | — | — | — |
| Manejo.jsx | — | DrivingLog | — | — |
| Nomina.jsx | EmployeePayrollDetail | WeeklyPayroll | generatePaystub | — |
| PayrollAutoFlow.jsx | AutoPayrollCalculator | — | — | — |
| TimeOffRequests.jsx | — | TimeOffRequest | — | — |

---

## DATA MODEL — Critical Relationships

### Employee Identity (3-Way Relationship) ⚠️

```
┌─────────────────────────────────────────────────────────────┐
│                     EMPLOYEE IDENTITY                        │
│                                                              │
│  PendingEmployee          User (Auth)        EmployeeDirectory│
│  ┌──────────────┐        ┌──────────────┐   ┌──────────────┐│
│  │ - email      │──┐  ┌─→│ - id         │   │ - employee_  ││
│  │ - first_name │  │  │  │ - email      │──→│   email      ││
│  │ - last_name  │  │  │  │ - role       │   │ - full_name  ││
│  │ - position   │  └──┼─→│ - full_name  │   │ - position   ││
│  │ - phone      │     │  │ - position   │   │ - phone      ││
│  │ - address    │     │  │ - phone      │   │ - status     ││
│  │ - dob        │     │  │ - address    │   └──────────────┘│
│  │ - ssn_tax_id │     │  │ - ssn_tax_id │                   │
│  │ - hourly_rate│     │  │ - hourly_rate│                   │
│  │ - team_id    │     │  │ - team_id    │                   │
│  │ - status     │     │  │ - employment │                   │
│  │              │     │  │   _status    │                   │
│  └──────────────┘     │  └──────────────┘                   │
│                       │                                      │
│  STAGING              │  AUTHORITATIVE    DISPLAY/SEARCH    │
│  (pre-invite)         │  (post-login)     (public directory)│
└──────────────────────┼──────────────────────────────────────┘
                       │
                   MIGRATION
                  (on first login)
```

**Critical Bug (FIXED)**: Migration deleted PendingEmployee BEFORE copying all fields → data loss

---

### Quote → Invoice → Job Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                    DOCUMENT LIFECYCLE                             │
│                                                                   │
│  Quote (EST-00001)                                                │
│  ┌──────────────────┐                                            │
│  │ - customer_id    │                                            │
│  │ - items[]        │                                            │
│  │ - total          │                                            │
│  │ - status: draft  │                                            │
│  │ - approval_status│ ← Manager creates (pending_approval)      │
│  └────────┬─────────┘                                            │
│           │                                                       │
│           │ (Admin approves)                                     │
│           ↓                                                       │
│  ┌──────────────────┐                                            │
│  │ approval_status: │                                            │
│  │   approved       │                                            │
│  │ approved_by      │                                            │
│  │ approved_at      │                                            │
│  └────────┬─────────┘                                            │
│           │                                                       │
│           │ (Convert to Invoice)                                 │
│           ↓                                                       │
│  Invoice (INV-00001)                                             │
│  ┌──────────────────┐                                            │
│  │ - quote_id       │ (reference to EST-00001)                  │
│  │ - items[]        │ (copied from quote)                       │
│  │ - approval_status│ (pending if manager, approved if admin)   │
│  └────────┬─────────┘                                            │
│           │                                                       │
│           │ (Admin approves + provision job)                     │
│           ↓                                                       │
│  Job (auto-created)                                              │
│  ┌──────────────────────────────────────┐                       │
│  │ - invoice_id                         │                       │
│  │ - drive_folder_id     ← Google Drive │                       │
│  │ - drive_folder_url                   │                       │
│  │ - field_project_id    ← MCI Field    │                       │
│  │ - provisioning_status                │                       │
│  │ - provisioning_steps: {              │                       │
│  │     job: "created",                  │                       │
│  │     drive: "created",                │                       │
│  │     field: "created"                 │                       │
│  │   }                                  │                       │
│  └──────────────────────────────────────┘                       │
└───────────────────────────────────────────────────────────────┘
```

**Approval Gates:**
- Manager creates → `approval_status: 'pending_approval'`
- Admin approves → `approval_status: 'approved'` + trigger provisioning
- Only approved invoices can provision jobs

---

### Onboarding Flow (3 Forms) ⚠️

```
┌────────────────────────────────────────────────────────┐
│              ONBOARDING WIZARD FLOW                     │
│                                                         │
│  User Login (first time)                               │
│  ┌─────────────────┐                                   │
│  │ employment_     │                                   │
│  │ status: invited │                                   │
│  │ onboarding_     │                                   │
│  │ completed: false│ ← Gate blocks access              │
│  └────────┬────────┘                                   │
│           │                                             │
│           ↓ (redirected to OnboardingWizard)           │
│  ┌─────────────────────────────────┐                   │
│  │ Form 1: Safety Acknowledgment   │                   │
│  │ → OnboardingForm.create({       │                   │
│  │     form_type: 'safety_...',    │                   │
│  │     status: 'completed'         │                   │
│  │   })                            │                   │
│  └────────┬────────────────────────┘                   │
│           ↓                                             │
│  ┌─────────────────────────────────┐                   │
│  │ Form 2: Company Rules           │                   │
│  │ → OnboardingForm.create({       │                   │
│  │     form_type: 'company_rules', │                   │
│  │     status: 'completed'         │                   │
│  │   })                            │                   │
│  └────────┬────────────────────────┘                   │
│           ↓                                             │
│  ┌─────────────────────────────────┐                   │
│  │ Form 3: Personal Paperwork      │                   │
│  │ → OnboardingForm.create({       │                   │
│  │     form_type: 'personal_...',  │                   │
│  │     status: 'completed'         │                   │
│  │   })                            │                   │
│  │ → base44.auth.updateMe({        │                   │
│  │     onboarding_completed: true, │ ← DEFINITIVE FLAG │
│  │     onboarding_completed_at     │                   │
│  │   })                            │                   │
│  └────────┬────────────────────────┘                   │
│           │                                             │
│           ↓ (redirect to Dashboard)                    │
│  ┌─────────────────┐                                   │
│  │ onboarding_     │                                   │
│  │ completed: true │ ← NO MORE GATE                    │
│  └─────────────────┘                                   │
└─────────────────────────────────────────────────────────┘
```

**Bug (FIXED)**: Missing `onboarding_completed` flag → loop on logout/login

---

### i18n Source of Truth

```
LanguageContext.jsx (Provider)
├── translations = { en: {...}, es: {...} }
├── getInitialLanguage()
│   ├── Priority 1: user.preferred_language (DB)
│   ├── Priority 2: localStorage('language')
│   ├── Priority 3: navigator.language (browser)
│   └── Default: 'en'
├── changeLanguage(lang)
│   ├── setLanguage(lang)
│   ├── localStorage.setItem('language', lang)
│   └── updateMe({ preferred_language: lang })
└── t(key) → translations[language][key]

Used by:
- Layout.jsx (navigation labels)
- All pages (via useLanguage() hook)
- All components (via useLanguage() hook)
```

**Bug (FIXED)**: No localStorage persistence, no priority chain → mixed languages

---

## DUPLICATIONS / REDUNDANCIES

### 1. Employee Data Models (3x) ⚠️

| Entity | Purpose | Fields | Used By | Risk |
|--------|---------|--------|---------|------|
| **User** (extended) | Auth + profile | 60+ fields | Layout, MyProfile, auth.me() | ⚠️ May lack operational data |
| **EmployeeDirectory** | Public directory | 7 fields | Directory page, search | ⚠️ Out of sync with User |
| **PendingEmployee** | Staging (pre-invite) | 20+ fields | Empleados (pending tab) | ⚠️ Data loss on migration |

**Recommendation**: Consolidate to User + EmployeeDirectory (remove PendingEmployee or make it append-only audit log)

---

### 2. Role/Permission Checks (Scattered)

**Files with role logic:**
- `components/core/roleRules.js` (centralized) ✅
- `functions/_auth.js` (backend) ✅
- `layout` (navigation logic) ✅
- `components/permissions/PermissionsContext.jsx`
- Individual pages (CrearFactura, CrearEstimado, etc.)

**Issue**: Position matching inconsistent before fix:
- Some use exact: `position === 'manager'`
- Some normalize: `position.includes('manager')`

**Fix Applied**: All now use `.toLowerCase() + .includes()`

---

### 3. Hooks Duplication

| Hook | Location | Purpose | Overlap |
|------|----------|---------|---------|
| `useEmployeeProfile` | hooks/ | Merge Employee+Auth | NEW (main) |
| `usePermissions` | permissions/ | Check user permissions | Similar logic |
| `usePaginatedEntityList` | hooks/ | Server cursor pagination | Specific |

**Risk**: Low (different purposes)

---

### 4. Name Helpers (Multiple Implementations)

**Files:**
- `components/utils/nameHelpers.js` (main)
- `components/utils/profileMerge.js` (NEW - buildFullName)
- Inline in: ModernEmployeeCard, PendingInvitationCard, Directory

**Recommendation**: Use `nameHelpers.getDisplayName()` everywhere

---

## CRITICAL FLOWS (Detailed)

### FLOW 1: PendingEmployee → Invite → User Migration ⚠️

**Step-by-Step:**

```
1. ADMIN CREATES PENDING
   └─ pages/Empleados.jsx → EmployeeFormDialog
      └─ base44.entities.PendingEmployee.create({
            first_name, last_name, email, phone, address,
            dob, ssn_tax_id, position, team_id, hourly_rate
         })
      └─ Appears in "Pending" tab

2. ADMIN INVITES
   └─ components/empleados/PendingInvitationCard.jsx
      └─ base44.functions.invoke('sendInvitationEmail')
      └─ base44.users.inviteUser(email, 'user')
      └─ PendingEmployee.update(id, { 
            status: 'invited',
            last_invitation_sent: now,
            invitation_count: +1
         })
      └─ Record KEPT (not deleted)

3. USER ACCEPTS INVITE (Base44 system)
   └─ User creates password
   └─ User entity created:
      { id, email, role: 'user', employment_status: 'invited' }

4. USER FIRST LOGIN → AUTO-ACTIVATION
   └─ Layout.js (useEffect - autoActivateUser)
      ├─ Detect: employment_status === 'invited'
      ├─ Find: PendingEmployee by normalizeEmail(user.email)
      ├─ Migrate: migratePendingToUser(authUser, pending)
      │  └─ Copies ALL fields: first_name, last_name, phone, address,
      │                        dob, ssn_tax_id, position, team_id, etc.
      ├─ Update: base44.auth.updateMe(migratedData)
      ├─ Mark: PendingEmployee.update(id, { 
      │          migrated_at: now, 
      │          migration_status: 'completed' 
      │        })
      └─ Delete: PendingEmployee.delete(id) [AFTER successful migration]

5. RESULT
   └─ User has complete profile
   └─ No data loss
   └─ Sidebar shows real name (not "projects@mci-us.com")
```

**Before Fix**: Step 4 deleted BEFORE migrating all fields → data loss  
**After Fix**: Step 4 migrates THEN marks THEN deletes → safe

---

### FLOW 2: Onboarding Wizard (3 Forms) ⚠️

**Step-by-Step:**

```
1. USER LOGIN (first time)
   └─ Layout.jsx gating logic
      ├─ Check: user.onboarding_completed === true? → ALLOW
      ├─ Check: onboardingForms.length >= 3? → ALLOW
      └─ ELSE: navigate('/onboarding-wizard')

2. WIZARD FORM 1 (Safety)
   └─ pages/OnboardingWizard.jsx
      └─ OnboardingForm.create({
            employee_email: user.email,
            form_type: 'safety_acknowledgment',
            status: 'completed',
            form_data: { ... }
         })
      └─ setCurrentStep(2)

3. WIZARD FORM 2 (Company Rules)
   └─ OnboardingForm.create({
            form_type: 'company_rules',
            status: 'completed'
         })
      └─ setCurrentStep(3)

4. WIZARD FORM 3 (Personal Paperwork)
   └─ OnboardingForm.create({
            form_type: 'personal_paperwork',
            status: 'completed',
            form_data: { legal_full_name, ssn_or_itin, dob, ... }
         })
      └─ base44.auth.updateMe({
            ssn_tax_id: formData.ssn_or_itin,
            dob: formData.date_of_birth,
            bank_name, routing_number, account_number,
            emergency_contact_*,
            onboarding_completed: true,        ← DEFINITIVE FLAG
            onboarding_completed_at: now
         })
      └─ invalidateQueries(['currentUser', 'onboardingForms'])
      └─ setTimeout(() => window.location.href = '/', 1500)

5. REDIRECT TO DASHBOARD
   └─ Layout checks: onboarding_completed === true → NO GATE
   └─ User sees full app
```

**Before Fix**: Missing flag → relied on count → loop if cache clears  
**After Fix**: Flag persists → no loop

---

### FLOW 3: Quote → Invoice → Approval → Provision

**Step-by-Step:**

```
1. MANAGER CREATES QUOTE
   └─ pages/CrearEstimado.jsx
      ├─ Check: canCreateFinancialDocs(user) → true (manager)
      ├─ Check: needsApproval(user) → true (manager, not admin)
      └─ Quote.create({
            quote_number: "EST-00123",
            customer_id, items[], total,
            approval_status: 'pending_approval',  ← AUTO
            created_by_role: user.position
         })

2. ADMIN APPROVES QUOTE
   └─ pages/ApprovalsHub.jsx
      ├─ Check: canApprove(user) → true (admin/CEO)
      └─ Quote.update(id, {
            approval_status: 'approved',
            approved_by: admin.email,
            approved_at: now,
            approval_notes: "..."
         })

3. CONVERT TO INVOICE
   └─ pages/VerEstimado.jsx → convertToInvoiceMutation
      ├─ Generate: invoice_number via generateInvoiceNumber()
      ├─ Create: Invoice from Quote data
      ├─ Check: Manager created? → approval_status: 'pending_approval'
      ├─ Check: Admin created? → approval_status: 'approved'
      └─ Update: Quote.update(id, { 
            status: 'converted_to_invoice',
            invoice_id 
         })

4. ADMIN APPROVES INVOICE (if pending)
   └─ pages/ApprovalsHub.jsx
      └─ Invoice.update(id, { approval_status: 'approved' })
      └─ Trigger: provisionJobFromInvoice(invoice_id)

5. JOB PROVISIONING (Automatic)
   └─ functions/provisionJobFromInvoice.js
      ├─ Step 1: Create/Link Job entity
      ├─ Step 2: createJobDriveFolder() → Google Drive
      ├─ Step 3: syncJobToMCIField() → Cross-app sync
      └─ Update: Job.update(id, {
            provisioning_status: 'completed',
            drive_folder_id, drive_folder_url,
            field_project_id
         })
```

**Approval Skip**: CEO/Admin creates → auto-approved → provision immediately

---

## TOP 30 CRITICAL FILES (By Impact + Bug Reports)

### Tier 1: CRITICAL (Data Loss / Auth / Core Logic)

| # | File | Lines | Impact | Bugs | Notes |
|---|------|-------|--------|------|-------|
| 1 | `Layout.js` | 500+ | 🔴🔴🔴 | Data loss, i18n, nav | Auto-activation, gating, sidebar |
| 2 | `components/hooks/useEmployeeProfile.js` | 127 | 🔴🔴 | Profile merge | NEW - prevents email display |
| 3 | `components/utils/profileMerge.js` | 93 | 🔴🔴 | Migration | NEW - safe merge helpers |
| 4 | `components/core/roleRules.js` | 68 | 🔴🔴 | Approval gates | Position normalization |
| 5 | `components/core/agreementsConfig.js` | 155 | 🔴 | Manager agreements | appliesTo logic |
| 6 | `components/i18n/LanguageContext.jsx` | 850+ | 🔴 | Mixed languages | Priority chain fixed |
| 7 | `pages/Empleados.jsx` | 735 | 🔴 | Email-local-part name | EmployeeFormDialog |
| 8 | `pages/OnboardingWizard.jsx` | 204 | 🔴 | Loop | Missing flag |
| 9 | `components/agreements/AgreementGate.jsx` | 265 | 🔴 | Manager skip | appliesTo filter |
| 10 | `functions/provisionJobFromInvoice.js` | 283 | 🔴 | Approval bypass | Checks approval_status |

---

### Tier 2: HIGH IMPACT (Business Logic)

| # | File | Lines | Impact | Bugs | Notes |
|---|------|-------|--------|------|-------|
| 11 | `pages/CrearFactura.jsx` | 974 | 🟡🟡 | Approval workflow | Sends to pending if manager |
| 12 | `pages/CrearEstimado.jsx` | 1039 | 🟡🟡 | Approval workflow | Same as invoice |
| 13 | `pages/Facturas.jsx` | 477 | 🟡 | Filter logic | Pagination |
| 14 | `pages/Estimados.jsx` | 410 | 🟡 | Filter logic | Pagination |
| 15 | `pages/VerFactura.jsx` | 615 | 🟡 | Actions gating | Send/provision checks |
| 16 | `pages/VerEstimado.jsx` | 627 | 🟡 | Convert flow | Approval propagation |
| 17 | `components/documentos/LineItemsEditor.jsx` | ~500 | 🟡 | Item calculations | Complex logic |
| 18 | `functions/generateQuoteNumber.js` | 43 | 🟡 | Atomic counter | Thread-safe |
| 19 | `functions/generateInvoiceNumber.js` | 40 | 🟡 | Atomic counter | Thread-safe |
| 20 | `functions/createJobDriveFolder.js` | 76 | 🟡 | Google Drive | OAuth |

---

### Tier 3: IMPORTANT (UI / UX / Features)

| # | File | Lines | Impact | Bugs | Notes |
|---|------|-------|--------|------|-------|
| 21 | `pages/Dashboard.jsx` | ~600 | 🟢 | None | Widgets, stats |
| 22 | `pages/ApprovalsHub.jsx` | ~400 | 🟡 | Permission checks | Centralized approvals |
| 23 | `pages/MyProfile.jsx` | 541 | 🟡 | Hardcoded Spanish | Display user data |
| 24 | `pages/Directory.jsx` | 165 | 🟢 | None | Employee search |
| 25 | `components/shared/ApprovalBanner.jsx` | 54 | 🟢 | None | Pending visual |
| 26 | `components/empleados/ModernEmployeeCard.jsx` | 232 | 🟢 | None | Employee display |
| 27 | `components/empleados/PendingInvitationCard.jsx` | 176 | 🟡 | Invite flow | Team select |
| 28 | `components/onboarding/PersonalPaperworkForm.jsx` | 305 | 🟡 | Upload requirements | NOW optional |
| 29 | `pages/Field.jsx` | ~800 | 🟢 | None | MCI Field integration |
| 30 | `components/ui/toast.jsx` | ~200 | 🟢 | None | Global toasts |

---

## KNOWN ISSUES (Pre-Fix)

### 🔴 CRITICAL (Fixed Dec 31)

1. **Data Loss on Invite** ⚠️
   - **Files**: Layout.js, Empleados.jsx
   - **Cause**: Delete PendingEmployee before migration complete
   - **Impact**: Lost SSN, DOB, phone, address, hourly_rate
   - **Fix**: Migration with audit trail + delete AFTER

2. **Name Shows Email** ⚠️
   - **Files**: Layout.js, Empleados.jsx
   - **Cause**: No Employee entity merge, email-local-part fallback
   - **Impact**: "projects@mci-us.com" shown instead of "John Doe"
   - **Fix**: useEmployeeProfile hook + mergeProfile()

3. **Onboarding Loop** ⚠️
   - **Files**: OnboardingWizard.jsx, Layout.js
   - **Cause**: Missing definitive flag
   - **Impact**: User completes 3 forms, logs out, forced to re-do
   - **Fix**: onboarding_completed flag

4. **Manager No Invoices Nav** ⚠️
   - **Files**: Layout.js, roleRules.js
   - **Cause**: Exact position match `=== 'manager'`
   - **Impact**: "Manager" or "Project Manager" → employee nav
   - **Fix**: Normalize with .includes()

5. **Mixed Languages** ⚠️
   - **Files**: LanguageContext.jsx, MyProfile.jsx
   - **Cause**: No persistence, no priority chain, hardcoded strings
   - **Impact**: Spanish/English mixed in UI
   - **Fix**: localStorage + priority chain

6. **Agreements Not Showing** ⚠️
   - **Files**: agreementsConfig.js
   - **Cause**: Exact position match
   - **Impact**: Manager/Administrator skip agreement
   - **Fix**: Normalize appliesTo()

---

### 🟡 MEDIUM (To Fix)

7. **Logo Incorrect**
   - **Files**: OnboardingWizard.jsx, WelcomeMessage.jsx
   - **Cause**: Wrong asset URL
   - **Fix**: Use sidebar logo

8. **Upload Requirements Too Strict**
   - **Files**: PersonalPaperworkForm.jsx
   - **Cause**: Validation blocks if no SS card upload
   - **Fix**: Make uploads optional

---

### 🟢 LOW (Future)

9. **Hardcoded Spanish in MyProfile**
   - **Fix**: Replace with t() calls

10. **EmployeeDirectory Out of Sync**
    - **Fix**: Sync on profile update (already partially done)

---

## LAUNCH SCOPE — Jan 5, 2025

### MUST-HAVE (Core Operations)

**Finance:**
- ✅ Quotes (create, view, send, convert)
- ✅ Invoices (create, view, send, record payment)
- ✅ Customers (manage)
- ✅ Approval workflow (pending → approved)
- ✅ Job provisioning (invoice → job → drive → field)

**Workforce:**
- ✅ Employees (manage, invite, activate)
- ✅ Directory (search)
- ✅ Onboarding (3 forms)
- ✅ Agreements (manager/foreman signatures)

**Time & Payroll:**
- ✅ Time tracking (check-in/out)
- ✅ Expenses (upload receipts, approve)
- ✅ Payroll (weekly calculations)
- ✅ Mileage (driving logs)

**Operations:**
- ✅ Jobs (create, view, financials)
- ✅ Calendar (assignments)
- ✅ MCI Field (basic integration)

**Communication:**
- ✅ Chat (team messaging)
- ✅ Announcements (company news)

---

### NICE-TO-HAVE (Can Hide Without Breaking)

**Analytics:**
- 🟡 Executive Control Tower
- 🟡 Reporting Hub
- 🟡 Cash Flow Report
- 🟡 Budget Forecasting
- 🟡 Job Performance Analysis

**Advanced Features:**
- 🟡 Inventory tracking
- 🟡 Training/courses
- 🟡 Forms (inspection, incident)
- 🟡 Goals & OKRs
- 🟡 Skill matrix
- 🟡 AI assistants

**Field Advanced:**
- 🟡 Blueprint annotations
- 🟡 Task dependencies
- 🟡 Photo comparisons
- 🟡 QR codes

**How to Hide:**
1. Comment out in Layout navigation arrays
2. Keep files (don't delete)
3. No breaking changes to entities/functions
4. Can restore by uncommenting

---

## FILE COUNTS

### By Type
- **Entities**: 84 JSON schemas
- **Pages**: 52 JSX files
- **Components**: 180+ JSX files
- **Functions**: 42 JS files
- **Hooks**: 8 custom hooks
- **Utils**: 12 utility files
- **Docs**: 15+ markdown files

**Total**: ~400 files

---

### By Module
| Module | Pages | Components | Entities | Functions |
|--------|-------|-----------|----------|-----------|
| Finance | 12 | 25 | 6 | 8 |
| Operations | 8 | 70 | 10 | 6 |
| Workforce | 10 | 20 | 8 | 5 |
| Time & Payroll | 8 | 15 | 6 | 3 |
| Communication | 5 | 12 | 4 | 2 |
| Compliance | 6 | 10 | 5 | 1 |
| **Total** | **52** | **180+** | **84** | **42** |

---

## DEPENDENCIES

### External Packages
- React 18.2
- TanStack Query (data fetching)
- Framer Motion (animations)
- Lucide React (icons)
- Recharts (analytics)
- React Router DOM (navigation)
- Shadcn UI (component library)
- date-fns (dates)
- jsPDF (PDF generation)
- React Leaflet (maps - Field)
- @hello-pangea/dnd (drag-drop - Field)

### Base44 SDK
- `@base44/sdk@0.8.6` (backend functions)
- `base44.auth.me()`, `base44.entities.*`
- `base44.integrations.Core.*`
- `base44.users.inviteUser()`

### External Integrations
- Google Drive (OAuth - job folders)
- SendGrid (emails via secrets)
- MCI Field (cross-app sync via CROSS_APP_TOKEN)

---

## COMPLEXITY HOTSPOTS

### Files with 500+ Lines
1. `Layout.js` (550 lines) - Navigation, gating, auth
2. `components/i18n/LanguageContext.jsx` (850 lines) - Translations
3. `pages/CrearEstimado.jsx` (1039 lines) - Quote form
4. `pages/CrearFactura.jsx` (974 lines) - Invoice form
5. `pages/Field.jsx` (800+ lines) - MCI Field integration

**Recommendation**: Break down CrearEstimado/CrearFactura into sub-components

---

### Files with Complex Business Logic
1. `components/documentos/LineItemsEditor.jsx` (item calculations)
2. `functions/provisionJobFromInvoice.js` (multi-step orchestration)
3. `components/quotes/OutOfAreaCalculator.jsx` (travel metrics)
4. `pages/PayrollAutoFlow.jsx` (payroll automation)
5. `components/field/AITaskSuggestions.jsx` (AI recommendations)

---

## TECHNICAL DEBT

### High Priority
1. **Consolidate Employee Models** (User vs EmployeeDirectory vs PendingEmployee)
2. **Break down large forms** (CrearEstimado, CrearFactura)
3. **Centralize position normalization** (create utility, remove scattered logic)
4. **Remove hardcoded strings** (MyProfile.jsx, ~14 strings)

### Medium Priority
5. **Add unit tests** (especially for roleRules, profileMerge)
6. **TypeScript migration** (currently pure JS)
7. **Optimize re-renders** (React.memo some heavy components)
8. **Add error boundaries** (per module)

### Low Priority
9. **Consolidate hooks** (usePermissions vs roleRules)
10. **Clean up unused entities** (70+ entities, some unused)

---

## EXPORT MANIFEST

### Documentation Generated
1. ✅ `REPO_MAP.md` (this file)
2. ✅ `KNOWN_BUGS_AUDIT.md`
3. ✅ `DATA_MODEL_AUDIT.md`
4. ✅ `PERMISSIONS_AUDIT.md`
5. ✅ `LAUNCH_SCOPE_JAN5.md`

### Code Exports (In EXPORT/ folder)
6. ✅ `00_ENTITIES.md` (All 84 entities)
7. ✅ `01_FUNCTIONS.md` (All 42 functions)
8. ✅ `02_CORE_HOOKS_UTILS.md` (core/, hooks/, utils/)
9. ✅ `10_PAGES_FINANCE.md` (12 pages)
10. ✅ `11_PAGES_OPERATIONS.md` (8 pages)
11. ✅ `12_PAGES_WORKFORCE.md` (10 pages)
12. ✅ `13_PAGES_TIME_PAYROLL.md` (8 pages)
13. ✅ `14_PAGES_COMMS_COMPLIANCE.md` (6 pages)
14. ✅ `20_COMPONENTS_NAV_LAYOUT.md` (Layout, navigation)
15. ✅ `21_COMPONENTS_FINANCE.md` (Finance components)
16. ✅ `22_COMPONENTS_FIELD_JOBS.md` (Field components)
17. ✅ `23_COMPONENTS_WORKFORCE.md` (Employee components)
18. ✅ `24_COMPONENTS_MISC.md` (Notifications, PWA, etc.)

**Total**: 18 export files + 5 audits = **23 documents**

---

## NEXT STEPS FOR REVIEW

1. **Read KNOWN_BUGS_AUDIT.md** (root causes)
2. **Read DATA_MODEL_AUDIT.md** (entity relationships)
3. **Review EXPORT files** (full code)
4. **Test with 1 pending employee** (validate fixes)
5. **Invite remaining 22** (if test passes)

---

**End of Repository Map**