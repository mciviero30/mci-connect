# MCI CONNECT - OPERATIONAL MODES SPECIFICATION

**Version**: 1.0  
**Date**: January 8, 2026  
**Status**: System Architecture Definition  
**Purpose**: Formalize mode-based workflow system for UX and development reference

---

## INTRODUCTION

MCI Connect is not a collection of pages—it is a **mode-based workflow platform** where users operate in distinct mental states, each with specific affordances, constraints, and behavioral expectations.

This document defines the five core operational modes that govern user interaction, system behavior, and data flow.

---

## MODE HIERARCHY & RELATIONSHIPS

```
┌─────────────────────────────────────────────────────┐
│                  MCI CONNECT                         │
│                  (Platform Shell)                    │
└─────────────────────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┬──────────────┬────────────────┐
        │               │               │              │                │
   ┌────▼────┐    ┌────▼────┐    ┌────▼────┐   ┌─────▼─────┐   ┌─────▼─────┐
   │  FIELD  │    │ PRODUCE │    │ FINANCE │   │   ADMIN   │   │  OBSERVE  │
   │  MODE   │    │  MODE   │    │  MODE   │   │   MODE    │   │   MODE    │
   └─────────┘    └─────────┘    └─────────┘   └───────────┘   └───────────┘
   
   Execute        Create         Transact      Control         Monitor
   Capture        Estimate       Track         Configure       Review
   Record         Propose        Reconcile     Approve         Consume
```

**Mode Transitions**:
- Users can switch modes freely via sidebar navigation
- Some modes are role-restricted (Admin, Finance)
- Field Mode is environmentally distinct (jobsite vs. office)
- Modes can run in parallel (Field + Finance on different devices)

---

## MODE 1: FIELD MODE

### Definition
**Field Mode** is the operational state where users physically capture reality from active construction sites or installation locations.

### Primary Mental State
**EXECUTE & CAPTURE**
- User is on-site, hands-on, under pressure
- Focus: Precision, speed, reliability
- Mindset: "Get data, get out, don't lose anything"

### Primary User Types
1. **Field Technician** (80% of usage)
   - Role: Measure, photograph, document
   - Authority: Create, draft, suggest
   - Cannot: Approve, finalize, delete

2. **Foreman/Supervisor** (15% of usage)
   - Role: Validate, confirm, approve field data
   - Authority: All technician actions + approve dimensions
   - Cannot: Delete historical records

3. **Admin** (5% of usage)
   - Role: Override, audit, manage
   - Authority: All actions including deletion

### Environmental Context
- **Physical**: On jobsite, wearing gloves, in motion
- **Network**: Unreliable (4G, basements, metal buildings)
- **Duration**: Continuous sessions (2-8 hours)
- **Interruptions**: Frequent (calls, site questions, background)

### Core Actions (Allowed & Encouraged)
```
✅ Capture Dimensions
  - Create measurements (FF-FF, CL-CL, BM-C, etc.)
  - Reference benchmarks
  - Add photos to measurements
  - Voice notes for context

✅ Document Conditions
  - Take photos (before/after, issues, progress)
  - Record site notes (voice transcription)
  - Log safety concerns
  - Create incident reports

✅ Manage Tasks
  - Update task status
  - Add checklist items
  - Upload task photos
  - Comment on progress

✅ Create Checklists
  - Daily safety checks
  - Pre-installation validation
  - Quality control checks
  - Post-installation verification

✅ Generate Reports
  - Daily field reports
  - Measurement packages
  - Progress summaries
```

### Forbidden Actions
```
❌ Edit Locked Dimension Sets
❌ Delete Historical Measurements
❌ Modify Approved Invoices
❌ Change Job Financial Data
❌ Edit Other Users' Work
❌ Bypass Validation Gates
```

### Mode-Specific Guarantees
1. **Zero Data Loss**: All actions survive crash, background, offline
2. **Offline-First**: 100% functionality without network
3. **Explicit Confirmations**: Every save blocks until confirmed
4. **Session Continuity**: Work preserved through interruptions
5. **Measurement Precision**: No float drift, checksum validation

### Success Criteria
- User never asks "did that save?"
- User trusts app under pressure
- User can work 8 hours offline
- User switches apps without concern

### Failure Modes
- Silent save failures (PREVENTED via SaveGuarantee)
- Data loss on crash (PREVENTED via IndexedDB + queue)
- Duplicate entries on retry (PREVENTED via idempotency)
- Network race conditions (PREVENTED via ordered queue)

### Mode Boundaries
**Entry**: User navigates to /Field or /FieldProject
**Active Indicators**:
- Dark theme (data-field-mode=true)
- Orange branding (MCI Field logo)
- Sidebar hidden (focus mode)
- Save confirmations required

**Exit**: User navigates away from Field routes
**Exit Protection**: SafeBackButton warns if unsaved work

---

## MODE 2: PRODUCE MODE

### Definition
**Produce Mode** is the operational state where users create, estimate, and propose work—generating quotes, designing projects, and planning execution.

### Primary Mental State
**CREATE & ESTIMATE**
- User is at desk, thinking, calculating
- Focus: Accuracy, persuasion, professionalism
- Mindset: "Win the job, price it right, look professional"

### Primary User Types
1. **Estimator/Sales** (50% of usage)
   - Role: Create quotes, respond to RFPs
   - Authority: Draft, send, revise quotes
   - Cannot: Approve own quotes (if policy enabled)

2. **Project Manager** (30% of usage)
   - Role: Scope projects, assign teams, plan execution
   - Authority: Create jobs, assign resources, approve quotes
   - Cannot: Edit financial settings

3. **Admin/CEO** (20% of usage)
   - Role: Final approval, strategy, oversight
   - Authority: All actions including pricing strategy
   - Cannot: (unrestricted)

### Environmental Context
- **Physical**: Office, desk, large screen
- **Network**: Reliable (WiFi, ethernet)
- **Duration**: Intermittent sessions (30min - 2 hours)
- **Interruptions**: Moderate (emails, calls)

### Core Actions (Allowed & Encouraged)
```
✅ Quote Generation
  - Create estimates (manual or AI-assisted)
  - Define line items (from catalog or custom)
  - Calculate pricing (materials, labor, margin)
  - Add terms and conditions
  - Generate professional PDFs
  - Send to customers

✅ Job Planning
  - Create projects (manual or AI wizard)
  - Define scope and deliverables
  - Assign teams and resources
  - Set timelines and milestones
  - Link to quotes/invoices

✅ Resource Planning
  - Create teams
  - Assign employees to jobs
  - Schedule work (calendar)
  - Plan material procurement

✅ Template Management
  - Create quote templates
  - Define standard line items
  - Set default pricing
  - Configure workflows
```

### Forbidden Actions
```
❌ Modify Sent Quotes Without Versioning
❌ Change Approved Quote Pricing
❌ Delete Jobs with Time Entries
❌ Edit Employee Financial Records
❌ Bypass Approval Workflows
```

### Mode-Specific Guarantees
1. **Version Control**: All quote edits create new versions
2. **Audit Trail**: Every pricing change logged
3. **Professional Output**: PDFs are production-quality
4. **Data Integrity**: Calculations always accurate
5. **Workflow Enforcement**: Status transitions validated

### Success Criteria
- User creates quotes in <10 minutes
- Quotes look professional to clients
- Pricing is accurate and consistent
- Workflow is clear and predictable

### Failure Modes
- Quote duplicates with same number (PREVENTED via atomic counters)
- Pricing calculation errors (PREVENTED via tested formulas)
- Lost quote edits (PREVENTED via auto-save)
- Inconsistent formatting (PREVENTED via templates)

### Mode Boundaries
**Entry**: User navigates to Quotes, Jobs, Items, or Calendar
**Active Indicators**:
- Light theme (professional office aesthetic)
- Blue corporate branding
- Create/Edit interfaces prominent
- Template libraries accessible

**Exit**: User switches to Finance, Field, or Admin modes

---

## MODE 3: FINANCE MODE

### Definition
**Finance Mode** is the operational state where users track, reconcile, and report on financial transactions—ensuring every dollar is accounted for.

### Primary Mental State
**TRANSACT & RECONCILE**
- User is focused on accuracy and compliance
- Focus: Precision, audit trail, tax compliance
- Mindset: "Account for every penny, stay compliant, prove it"

### Primary User Types
1. **Bookkeeper/Accountant** (60% of usage)
   - Role: Record transactions, reconcile accounts
   - Authority: Create/edit transactions, reconcile payments
   - Cannot: Delete historical data, modify payroll

2. **Finance Manager** (30% of usage)
   - Role: Review financials, approve expenses, forecast
   - Authority: Approve expenses, run reports, export data
   - Cannot: Edit employee pay rates (requires CEO/Admin)

3. **CEO/Admin** (10% of usage)
   - Role: Strategic oversight, audit compliance
   - Authority: Full financial access, export capabilities
   - Cannot: (unrestricted in Finance domain)

### Environmental Context
- **Physical**: Office, dual monitors, calculator nearby
- **Network**: Reliable (required for bank sync)
- **Duration**: Extended sessions (1-4 hours, weekly/monthly close)
- **Interruptions**: Low (focused work)

### Core Actions (Allowed & Encouraged)
```
✅ Invoice Management
  - Create invoices (from quotes or standalone)
  - Track payment status
  - Record partial payments
  - Mark as paid
  - Export to PDF
  - Send to customers

✅ Transaction Recording
  - Manual entry (income/expense)
  - Bank sync (Plaid integration)
  - Categorization (sales, rent, utilities, etc.)
  - Reconciliation (match invoices to payments)

✅ Expense Management
  - Review employee expenses
  - Approve/reject reimbursements
  - AI-assisted categorization
  - Receipt validation

✅ Financial Reporting
  - Cash flow analysis
  - Profit & loss statements
  - Budget forecasting
  - Tax summaries
  - Executive dashboards
```

### Forbidden Actions
```
❌ Delete Reconciled Transactions
❌ Modify Historical Payroll Records
❌ Change Invoice Amounts After Payment
❌ Edit Approved Time Entries
❌ Bypass Tax Compliance Gates
```

### Mode-Specific Guarantees
1. **Audit Trail**: Every transaction has full history
2. **Reconciliation**: Payments match invoices exactly
3. **Tax Compliance**: All data structured for IRS reporting
4. **Double-Entry**: Debits equal credits (accounting integrity)
5. **Immutability**: Historical data protected from modification

### Success Criteria
- Monthly close completes in <2 hours
- Bank reconciliation 100% matched
- Tax reports accurate and exportable
- Zero accounting discrepancies

### Failure Modes
- Payment reconciliation errors (PREVENTED via matching algorithm)
- Lost transactions (PREVENTED via required fields validation)
- Duplicate entries (PREVENTED via Plaid transaction IDs)
- Tax calculation errors (PREVENTED via IRS-compliant formulas)

### Mode Boundaries
**Entry**: User navigates to Accounting, Invoices, Customers, or Cash Flow
**Active Indicators**:
- Green/blue financial branding
- Dollar signs and financial metrics
- Ledger-style layouts
- Export/print options prominent

**Exit**: User switches to Field, Produce, or Admin modes

---

## MODE 4: ADMIN MODE

### Definition
**Admin Mode** is the operational state where users control, configure, and oversee the entire platform—acting as system operators and policy enforcers.

### Primary Mental State
**CONTROL & CONFIGURE**
- User is overseeing operations, not executing them
- Focus: Policy, permissions, compliance, oversight
- Mindset: "Ensure the system runs correctly, safely, and compliantly"

### Primary User Types
1. **System Administrator** (40% of usage)
   - Role: Configure platform, manage users, enforce policy
   - Authority: Create employees, set permissions, configure workflows
   - Cannot: Override audit trails, delete system logs

2. **CEO/Owner** (30% of usage)
   - Role: Strategic oversight, final approvals, policy setting
   - Authority: All system access, financial oversight, employee management
   - Cannot: (unrestricted)

3. **HR Manager** (20% of usage)
   - Role: Employee lifecycle, compliance, benefits
   - Authority: Manage employees, track certifications, enforce training
   - Cannot: Access financial data (unless also Finance role)

4. **Compliance Officer** (10% of usage)
   - Role: Audit, safety, regulatory compliance
   - Authority: Review incidents, enforce safety, audit trails
   - Cannot: Edit operational data

### Environmental Context
- **Physical**: Office, command center, multiple screens
- **Network**: Reliable (required for real-time dashboards)
- **Duration**: Continuous monitoring (dashboard always open)
- **Interruptions**: Constant (alerts, approvals, emergencies)

### Core Actions (Allowed & Encouraged)
```
✅ User Management
  - Invite employees
  - Set roles and permissions
  - Manage onboarding
  - Track compliance (tax, agreements, certifications)
  - Archive/delete users

✅ System Configuration
  - Company settings
  - Workflow rules
  - Notification preferences
  - Integration settings
  - Role definitions

✅ Approval Workflows
  - Approve time entries
  - Approve expenses
  - Approve commissions
  - Approve quotes (if policy requires)
  - Lock dimension sets for production

✅ Oversight & Reporting
  - Executive dashboards
  - Control tower (real-time metrics)
  - Analytics hub
  - Audit trails
  - System health monitoring

✅ Compliance Management
  - Safety incident review
  - Certification tracking
  - Agreement enforcement
  - Tax profile validation
  - Change order approvals
```

### Forbidden Actions
```
❌ Execute Field Work (delegate to technicians)
❌ Modify Locked Historical Data
❌ Delete Audit Logs
❌ Bypass Compliance Gates
❌ Edit Other Users' Personal Data Without Cause
```

### Mode-Specific Guarantees
1. **Oversight Visibility**: All critical actions surfaced to dashboards
2. **Policy Enforcement**: Rules cannot be bypassed
3. **Audit Completeness**: All actions logged and traceable
4. **Permission Isolation**: Users see only what they're authorized for
5. **Real-Time Alerts**: Critical events trigger immediate notifications

### Success Criteria
- Admin can see all pending approvals at a glance
- Compliance status is always clear (green/yellow/red)
- Critical alerts never missed
- Policy violations prevented, not just logged

### Failure Modes
- Permission bypass (PREVENTED via server-side checks)
- Missed critical alerts (PREVENTED via notification engine)
- Data leakage (PREVENTED via role-based queries)
- Unauthorized access (PREVENTED via AgreementGate, TaxProfileGate)

### Mode Boundaries
**Entry**: User navigates to Executive Dashboard, Control Tower, Employees, or Compliance Hub
**Active Indicators**:
- Wide overview layouts (dashboards, tables)
- Approval queues visible
- Permission badges shown
- Audit trail accessible

**Exit**: User switches to operational modes (Field, Produce, Finance) or logs out

---

## MODE 5: PRODUCE MODE (DETAILED)

### Definition
**Produce Mode** is the operational state where users generate deliverables that convert opportunities into revenue—quotes become invoices, invoices become jobs, jobs become outcomes.

### Primary Mental State
**CREATE & PROPOSE**
- User is selling, designing, planning
- Focus: Win rate, margins, professionalism
- Mindset: "Create compelling proposals, price strategically, close deals"

### Primary User Types
1. **Sales Representative** (40% of usage)
   - Role: Generate quotes, follow up with customers
   - Authority: Create/edit quotes, convert to invoices
   - Cannot: Edit pricing templates (requires admin)

2. **Estimator** (30% of usage)
   - Role: Price complex projects, calculate costs
   - Authority: Create detailed quotes, define line items
   - Cannot: Approve own quotes (conflict of interest)

3. **Project Manager** (20% of usage)
   - Role: Convert quotes to jobs, plan execution
   - Authority: Create jobs, assign teams, provision resources
   - Cannot: Edit historical quotes

4. **Admin** (10% of usage)
   - Role: Oversight, pricing strategy, approval
   - Authority: All Produce actions + pricing configuration
   - Cannot: (unrestricted in Produce domain)

### Environmental Context
- **Physical**: Office, desk, phone nearby
- **Network**: Reliable (for AI assistance, PDF generation)
- **Duration**: Moderate sessions (30min - 2 hours per quote)
- **Interruptions**: Moderate (customer calls, clarifications)

### Core Actions (Allowed & Encouraged)
```
✅ Quote Creation
  - Manual entry (line items, pricing)
  - AI-assisted generation (describe project, get quote)
  - PDF import (extract from competitor quotes)
  - Template-based (reuse standard configurations)

✅ Pricing & Estimation
  - Calculate materials cost
  - Estimate labor hours
  - Apply profit margins
  - Factor in travel/setup time
  - Include taxes and fees

✅ Quote Management
  - Send to customers
  - Track status (draft, sent, approved, rejected)
  - Duplicate for variations
  - Convert to invoice (approved quotes)
  - Version control (edits create new versions)

✅ Job Provisioning
  - Convert invoice to job
  - Auto-provision Drive folder
  - Auto-sync to MCI Field
  - Assign team members
  - Set up client portal access

✅ Customer Management
  - Create customer records
  - Track customer history
  - Link projects to customers
  - Manage contact information
```

### Forbidden Actions
```
❌ Edit Sent Quotes Without Creating Version
❌ Change Approved Quote Amounts
❌ Delete Quotes with Linked Invoices
❌ Modify Jobs with Logged Time
❌ Bypass Quote Approval Workflow (if enabled)
```

### Mode-Specific Guarantees
1. **Quote Integrity**: Sent quotes are immutable (version control only)
2. **Calculation Accuracy**: Pricing formulas tested and validated
3. **Professional Output**: PDFs match industry standards
4. **Workflow Consistency**: Status transitions predictable and enforced
5. **Data Lineage**: Quote → Invoice → Job linkage preserved

### Success Criteria
- Quote created in <10 minutes
- Quote looks as professional as competitors
- Customer receives PDF immediately
- Conversion to invoice is one-click
- Job provisioning is automatic

### Failure Modes
- Pricing calculation errors (PREVENTED via unit tests)
- Quote number collisions (PREVENTED via atomic counter)
- Lost quote edits (PREVENTED via auto-save drafts)
- Broken PDF generation (PREVENTED via fallback templates)

### Mode Boundaries
**Entry**: User navigates to Quotes, Items Catalog, Customers, or Quote creation
**Active Indicators**:
- Document-centric layouts
- Line item editors
- PDF preview options
- AI wizard available
- Template libraries visible

**Exit**: User switches to Finance (invoicing), Field (execution), or Admin (oversight)

---

## MODE 6: FINANCE MODE (DETAILED)

### Definition
**Finance Mode** is the operational state where users track financial reality—recording transactions, reconciling accounts, and ensuring every dollar is accounted for and tax-compliant.

### Primary Mental State
**TRANSACT & RECONCILE**
- User is accounting-focused, detail-oriented
- Focus: Accuracy, compliance, traceability
- Mindset: "Match every transaction, reconcile to the penny, stay audit-ready"

### Primary User Types
1. **Bookkeeper** (50% of usage)
   - Role: Daily transaction entry, bank reconciliation
   - Authority: Record transactions, reconcile payments, categorize expenses
   - Cannot: Approve payroll, modify locked periods

2. **Controller/CFO** (30% of usage)
   - Role: Financial oversight, reporting, compliance
   - Authority: Run reports, export data, review financials
   - Cannot: Edit historical transactions (audit trail protection)

3. **Admin/CEO** (20% of usage)
   - Role: Strategic financial decisions, oversight
   - Authority: Full financial access, tax strategy
   - Cannot: (unrestricted in Finance domain)

### Environmental Context
- **Physical**: Office, quiet environment, dual screens
- **Network**: Required (bank sync, cloud storage)
- **Duration**: Focused sessions (2-6 hours, especially month-end)
- **Interruptions**: Minimal (focused reconciliation work)

### Core Actions (Allowed & Encouraged)
```
✅ Invoice Management
  - Create invoices (standalone or from quotes)
  - Track payment status (draft, sent, partial, paid, overdue)
  - Record payments (full or partial)
  - Generate payment reminders
  - Export to PDF
  - Mark as paid

✅ Transaction Recording
  - Manual journal entries
  - Bank sync (Plaid integration)
  - Stripe webhook processing
  - Categorization (income/expense categories)
  - Reconciliation (match bank transactions to invoices)

✅ Payment Reconciliation
  - Match Stripe payments to invoices
  - Match bank deposits to invoices
  - Identify unmatched transactions
  - Mark as reconciled
  - Generate reconciliation reports

✅ Expense Approval
  - Review employee expenses
  - Approve/reject reimbursements
  - AI-assisted categorization
  - Receipt validation
  - Payment scheduling

✅ Financial Reporting
  - Profit & loss statements
  - Cash flow forecasts
  - Budget variance analysis
  - Tax summaries
  - Executive metrics
```

### Forbidden Actions
```
❌ Delete Reconciled Transactions
❌ Modify Paid Invoices (amounts)
❌ Change Historical Payroll Records
❌ Edit Approved Time Entries (financial impact)
❌ Bypass Reconciliation Workflow
❌ Modify Locked Accounting Periods
```

### Mode-Specific Guarantees
1. **Audit Trail**: Every financial event logged with timestamp, user, reason
2. **Reconciliation**: Payments match invoices to the penny
3. **Immutability**: Historical data protected (append-only for corrections)
4. **Tax Compliance**: All data structured for IRS/state reporting
5. **Double-Entry**: Debits equal credits (if full accounting enabled)

### Success Criteria
- Monthly close completed in <2 hours
- Bank reconciliation 100% matched
- Zero accounting discrepancies
- Tax reports export-ready
- Audit trail complete and accessible

### Failure Modes
- Reconciliation mismatches (PREVENTED via atomic matching)
- Lost transactions (PREVENTED via required field validation)
- Duplicate payments (PREVENTED via Stripe idempotency keys)
- Tax calculation errors (PREVENTED via IRS-validated formulas)
- Data corruption (PREVENTED via transaction wrappers)

### Mode Boundaries
**Entry**: User navigates to Accounting, Invoices, Payment Reconciliation, or Cash Flow
**Active Indicators**:
- Ledger-style tables
- Financial metrics (revenue, expenses, profit)
- Bank account displays
- Reconciliation status badges
- Export/print options

**Exit**: User switches to Produce (create invoices), Field (capture costs), or Admin (oversight)

---

## MODE 7: OBSERVE MODE (CLIENT/EMPLOYEE SELF-SERVICE)

### Definition
**Observe Mode** is the operational state where users consume information without creating or modifying core business data—monitoring, reviewing, and self-managing.

### Primary Mental State
**MONITOR & REVIEW**
- User is checking status, not executing work
- Focus: Awareness, transparency, self-service
- Mindset: "What's my status? What do I need to do? What's happening?"

### Primary User Types
1. **Client** (40% of usage)
   - Role: Monitor project progress, approve milestones
   - Authority: View project data, comment, request changes
   - Cannot: Edit project data, view other clients' data

2. **Employee (Self-Service)** (40% of usage)
   - Role: Check personal data, submit requests
   - Authority: View own hours/pay, request time off, update profile
   - Cannot: View other employees' data, approve own requests

3. **Manager (Monitoring)** (20% of usage)
   - Role: Check team status, identify issues
   - Authority: View team data, see alerts, access reports
   - Cannot: (transitions to Admin mode for actions)

### Environmental Context
- **Physical**: Variable (phone, tablet, laptop)
- **Network**: Variable (mobile, WiFi)
- **Duration**: Brief sessions (5-15 minutes, frequent)
- **Interruptions**: Constant (mobile usage pattern)

### Core Actions (Allowed & Encouraged)
```
✅ Client Portal (Clients)
  - View project progress
  - See photo gallery
  - Read daily reports
  - Comment on tasks
  - Approve milestones
  - Access documents
  - Review timeline

✅ Employee Dashboard (Employees)
  - View personal hours/pay
  - Check schedule/assignments
  - See pending approvals
  - Update profile
  - Request time off
  - Submit expenses
  - View training status
  - Access company announcements

✅ Manager Dashboards (Managers)
  - Team performance metrics
  - Pending approval queues
  - Real-time project status
  - Resource allocation
  - Alerts and notifications

✅ Universal Self-Service
  - View notifications
  - Update preferences
  - Change language (EN/ES)
  - Toggle theme (light/dark)
  - Manage avatar/profile photo
```

### Forbidden Actions
```
❌ Edit Other Users' Data
❌ Approve Own Requests
❌ Access Restricted Information (SSN, pay rates, etc.)
❌ Modify Historical Records
❌ Bypass Permission Gates
```

### Mode-Specific Guarantees
1. **Data Isolation**: Users see only what they're authorized for
2. **Real-Time Updates**: Dashboards reflect current state
3. **Mobile Optimization**: Works on all devices
4. **Clear Status**: Always know what's pending, approved, rejected
5. **Self-Service**: No admin intervention for routine tasks

### Success Criteria
- User can check status without calling office
- Clients feel informed and in control
- Employees trust their data is accurate
- Managers spot issues immediately

### Failure Modes
- Stale dashboard data (PREVENTED via query invalidation)
- Data leakage (PREVENTED via permission filters)
- Mobile UX issues (PREVENTED via responsive design)
- Missed notifications (PREVENTED via notification engine)

### Mode Boundaries
**Entry**: User navigates to Dashboard, Client Portal, My Profile, or Notifications
**Active Indicators**:
- Dashboard/widget layouts
- Read-only data displays
- Personal metrics (my hours, my pay, my tasks)
- Notification badges
- Self-service actions (profile update, time off request)

**Exit**: User switches to operational modes (Field, Produce, Finance) if authorized

---

## MODE 8: WORKFORCE MODE

### Definition
**Workforce Mode** is the operational state where users manage the human capital lifecycle—time tracking, payroll processing, performance management, and team coordination.

### Primary Mental State
**TRACK & COMPENSATE**
- User is managing people and their time
- Focus: Accuracy, fairness, compliance, motivation
- Mindset: "Pay people correctly, on time, and incentivize performance"

### Primary User Types
1. **Payroll Administrator** (40% of usage)
   - Role: Process payroll, calculate compensation
   - Authority: Approve time, calculate pay, export to payroll systems
   - Cannot: Change employee pay rates (requires CEO/Admin approval)

2. **Time Approver (Manager/Supervisor)** (35% of usage)
   - Role: Approve employee time entries, mileage, expenses
   - Authority: Approve/reject time entries, validate geofencing
   - Cannot: Edit historical approved entries

3. **HR Manager** (15% of usage)
   - Role: Manage employee lifecycle, performance, compliance
   - Authority: Manage employees, track certifications, review performance
   - Cannot: Approve own reports

4. **Employee (Self-Tracking)** (10% of usage)
   - Role: Log own time, mileage, expenses
   - Authority: Create time entries, submit expenses, request time off
   - Cannot: Approve own entries, view others' pay

### Environmental Context
- **Physical**: Office (admin) or mobile (employee self-service)
- **Network**: Required for geofencing, approval workflows
- **Duration**: 
  - Employee: Brief (check in/out, <1 min)
  - Admin: Extended (payroll processing, 2-4 hours weekly)
- **Interruptions**: Variable

### Core Actions (Allowed & Encouraged)
```
✅ Time Tracking
  - Clock in/out (with geofencing validation)
  - Log break periods
  - Track driving hours
  - Record mileage
  - Submit per diem requests

✅ Time Approval (Managers)
  - Review pending time entries
  - Validate geofence compliance
  - Approve/reject hours
  - Flag excessive hours (>14h/day)
  - Batch approvals

✅ Payroll Processing (Admin)
  - Calculate weekly pay (normal + OT + driving + per diem + bonuses)
  - Review payroll summary
  - Export to Gusto/QuickBooks
  - Generate paystubs
  - Submit for payment

✅ Performance Management
  - Set goals (individual + team)
  - Track progress
  - Give recognitions
  - Review scorecards
  - Conduct performance reviews

✅ Mileage & Expenses
  - Log driving (hours + miles)
  - Submit expenses with receipts
  - AI expense categorization
  - Approve reimbursements
  - Track per diem eligibility
```

### Forbidden Actions
```
❌ Approve Own Time Entries
❌ Modify Historical Payroll Records
❌ Edit Approved Time Entries (creates audit issues)
❌ Change Pay Rates Without Approval
❌ Delete Time Entries with Payroll Reference
❌ Bypass Geofence Validation (without admin override)
```

### Mode-Specific Guarantees
1. **Time Accuracy**: Geofence validates location (50-500m radius)
2. **Fair Compensation**: OT calculated per labor law (>40h/week)
3. **Audit Compliance**: All time records preserved for 3+ years
4. **Pay Transparency**: Employees see their own payroll data
5. **Automation**: Payroll auto-calculates (no manual math)

### Success Criteria
- Employees can clock in/out in <30 seconds
- Managers approve time entries in <5 minutes/week
- Payroll processing completed in <2 hours/week
- Zero pay disputes (data is transparent and accurate)

### Failure Modes
- Geofence false positives (HANDLED via admin override)
- Pay calculation errors (PREVENTED via tested formulas)
- Lost time entries (PREVENTED via required fields)
- Approval bottlenecks (MITIGATED via delegation rules)

### Mode Boundaries
**Entry**: User navigates to Time Tracking, Payroll, Approvals, or Mileage
**Active Indicators**:
- Time-centric UI (clocks, timers, calendars)
- Approval queues (pending/approved badges)
- Payroll summaries (hours, pay, deductions)
- Geofence validation indicators
- Week-based views

**Exit**: User switches to Field (capture work), Finance (accounting), or Admin (oversight)

---

## CROSS-MODE INTERACTIONS

### Mode Coupling Rules

**Field → Finance**:
```
Field creates: Dimensions, Photos, Tasks, Site Notes
Finance consumes: Job costs, labor hours (indirect via Time Tracking)
Coupling: LOOSE (Field doesn't know about invoices)
```

**Produce → Finance**:
```
Produce creates: Quotes, Invoices, Jobs
Finance consumes: Invoices (revenue tracking)
Coupling: TIGHT (invoice conversion creates financial records)
```

**Produce → Field**:
```
Produce creates: Jobs
Field consumes: Jobs (project context)
Coupling: MEDIUM (job provisioning links systems)
```

**Workforce → Finance**:
```
Workforce creates: Time entries, Expenses, Payroll
Finance consumes: Payroll records (expense tracking)
Coupling: TIGHT (payroll flows into accounting)
```

**Admin → All Modes**:
```
Admin configures: Permissions, Workflows, Policies
All modes enforce: Admin-defined rules
Coupling: HIERARCHICAL (admin controls all)
```

---

## MODE TRANSITION MATRIX

| From Mode | To Mode | Trigger | Data Preserved? | Context Retained? | Authorization Check? |
|-----------|---------|---------|-----------------|-------------------|---------------------|
| **Field** → Produce | Nav to Quotes | Session saved | ✅ Yes | ⚠️ No (different context) | ✅ Yes |
| **Field** → Finance | Nav to Invoices | Session saved | ✅ Yes | ❌ No | ✅ Yes |
| **Field** → Observe | Nav to Dashboard | Session saved | ✅ Yes | ⚠️ Partial (session persists 24h) | ✅ Yes |
| **Field** → Admin | Nav to Control Tower | Session saved | ✅ Yes | ❌ No | ✅ Yes (admin only) |
| **Produce** → Finance | Convert quote to invoice | Auto-transition | ✅ Yes (quote data copied) | ✅ Yes (invoice inherits quote) | ✅ Yes |
| **Produce** → Field | Invoice provisioning | Background sync | ✅ Yes (job created in Field) | ⚠️ Partial (job context only) | ✅ Yes |
| **Finance** → Workforce | Review payroll | Manual nav | N/A | ❌ No | ✅ Yes |
| **Workforce** → Finance | Submit payroll | Manual nav | ✅ Yes (payroll creates expense records) | ⚠️ Partial | ✅ Yes |
| **Admin** → Any | Nav to module | Session cleared | N/A | ❌ No | ✅ Yes |
| **Any** → Admin | Nav to admin pages | Context saved | ✅ Yes | ❌ No (oversight mode) | ✅ Yes (role check) |
| **Observe** → Any | Nav to action page | N/A | N/A | ❌ No (read-only mode) | ✅ Yes |

---

## MODE-SPECIFIC UX PATTERNS

### Field Mode UX
```
Theme: Dark (high contrast for sunlight)
Layout: Fullscreen (no sidebar)
Navigation: Bottom rail (thumb-friendly)
Feedback: Blocking saves with progress
Offline: Full functionality
Interruptions: Handled gracefully (session restore)
```

### Produce Mode UX
```
Theme: Light (professional office)
Layout: Sidebar navigation
Navigation: Standard links + quick actions
Feedback: Toast notifications
Offline: Not supported (requires AI, PDF generation)
Interruptions: Auto-save drafts
```

### Finance Mode UX
```
Theme: Light (accounting standard)
Layout: Sidebar + wide tables
Navigation: Ledger-style, row-based
Feedback: Toast + status badges
Offline: Not supported (requires bank sync)
Interruptions: Auto-save minimal
```

### Admin Mode UX
```
Theme: Light (dashboard standard)
Layout: Sidebar + dashboard widgets
Navigation: Overview-first, drill-down
Feedback: Real-time metrics + alerts
Offline: Read-only dashboards cached
Interruptions: Notification engine handles
```

### Observe Mode UX
```
Theme: Light or dark (user preference)
Layout: Responsive (mobile-first)
Navigation: Tab-based, swipeable
Feedback: Minimal (read-only)
Offline: Cached data displayed
Interruptions: Notifications only
```

---

## MODE-SPECIFIC DATA OWNERSHIP

### Field Mode Owns
```
Primary Entities:
- FieldDimension (measurements)
- Benchmark (reference points)
- SiteNoteSession (voice recordings)
- Photo (site photos)
- Plan (blueprint annotations)
- Task (field tasks, not office tasks)
- FieldActivityLog (what happened on site)

Shared Entities (read-only in Field):
- Job (project context)
- User (team members)
```

### Produce Mode Owns
```
Primary Entities:
- Quote (estimates)
- QuoteItem (line items)
- Job (project records)
- Customer (client records)
- Team (resource groups)

Shared Entities (read/write):
- Invoice (created from quotes)
```

### Finance Mode Owns
```
Primary Entities:
- Invoice (billing documents)
- Transaction (accounting entries)
- BankAccount (Plaid-synced accounts)

Shared Entities (read-only):
- Quote (reference for invoice creation)
- Job (cost tracking)
- WeeklyPayroll (payroll expense records)
```

### Workforce Mode Owns
```
Primary Entities:
- TimeEntry (clock in/out records)
- DrivingLog (mileage tracking)
- Expense (reimbursement requests)
- WeeklyPayroll (payroll summaries)
- JobAssignment (schedule)
- TimeOffRequest (PTO)

Shared Entities (read-only):
- User (employee records)
- Job (work context)
```

### Admin Mode Owns
```
Primary Entities:
- User (employee records)
- Role (permission definitions)
- WorkflowRule (approval policies)
- AuditLog (system activity)
- SystemReadiness (health checks)

Shared Entities (read/write):
- ALL (admin has override access)
```

### Observe Mode Owns
```
Primary Entities:
- DashboardPreferences (widget layouts)
- NotificationSettings (alert preferences)

Shared Entities (read-only):
- ALL (filtered by permission)
```

---

## MODE ENFORCEMENT MECHANISMS

### Technical Enforcement

**1. Route-Based Mode Detection**:
```javascript
// UIProvider (FieldModeContext)
const isFieldMode = location.pathname.includes('/Field');
const isAdminMode = ['ExecutiveDashboard', 'ControlTower', 'Empleados'].includes(currentPage);
```

**2. Permission Gates**:
```javascript
// PermissionsContext
const canEditFinancial = user.role === 'admin' || user.department === 'finance';
const canApprovePayroll = user.role === 'admin' || user.position === 'CEO';
```

**3. Data Isolation**:
```javascript
// Field queries scoped
FIELD_QUERY_KEYS.DIMENSIONS(jobId) // Field-specific key

// Main app queries separate
['invoices', statusFilter, teamFilter] // Global key
```

**4. UI Adaptation**:
```javascript
// Field: Dark theme, fullscreen
<div data-field-mode="true" className="dark">

// Main app: Light theme, sidebar
<div className="light">
```

### Behavioral Enforcement

**1. Mode-Specific Workflows**:
```
Field: SaveGuarantee blocks until confirmed
Produce: Auto-save drafts (non-blocking)
Finance: Reconciliation gates prevent advance
Admin: Approval workflows enforced
```

**2. Mode-Specific Validation**:
```
Field: Geofence validation (location required)
Produce: Quote approval workflow (if enabled)
Finance: Reconciliation required before month close
Workforce: Time approval required before payroll
```

**3. Mode-Specific Error Handling**:
```
Field: FieldErrorBoundary (contains errors locally)
Main App: Global ErrorBoundary (shows friendly error)
```

---

## DESIGN PRINCIPLES BY MODE

### Field Mode Principles
1. **Offline-First**: Assume network is unreliable
2. **Glove-Friendly**: 60px+ touch targets
3. **High-Contrast**: Readable in sunlight
4. **Explicit Confirmations**: Block until saved
5. **Session Continuity**: Preserve state through interruptions

### Produce Mode Principles
1. **Speed**: Create quotes in <10 minutes
2. **Professionalism**: Output matches Fortune 500 standards
3. **Flexibility**: Support custom and templated workflows
4. **Intelligence**: AI assists but doesn't replace judgment
5. **Traceability**: Every edit creates audit trail

### Finance Mode Principles
1. **Accuracy**: Penny-perfect reconciliation
2. **Immutability**: Historical data protected
3. **Compliance**: IRS-ready at all times
4. **Transparency**: Audit trail always accessible
5. **Automation**: Reduce manual data entry

### Admin Mode Principles
1. **Visibility**: All critical metrics at a glance
2. **Control**: Policies enforced, not suggested
3. **Security**: Permission violations prevented
4. **Auditability**: Every action logged
5. **Alerting**: Critical events trigger notifications

### Observe Mode Principles
1. **Clarity**: Status always obvious
2. **Speed**: Load in <2 seconds
3. **Mobile-First**: Optimized for phone
4. **Self-Service**: Reduce admin burden
5. **Transparency**: Show what matters, hide what doesn't

---

## MODE MATURITY ASSESSMENT

### Field Mode
**Maturity**: ✅ **PRODUCTION-GRADE (10/10)**
- Offline-first architecture: COMPLETE
- Data loss prevention: VERIFIED
- Session management: ROBUST
- Performance: EXCELLENT
- User trust: ABSOLUTE

### Produce Mode
**Maturity**: ✅ **PRODUCTION-READY (8.5/10)**
- Quote generation: COMPLETE
- AI assistance: FUNCTIONAL
- PDF generation: PROFESSIONAL
- Workflow: CLEAR
- Opportunities: Quick actions, breadcrumbs

### Finance Mode
**Maturity**: ✅ **PRODUCTION-READY (8/10)**
- Transaction tracking: COMPLETE
- Reconciliation: FUNCTIONAL
- Reporting: GOOD
- Opportunities: Advanced search, batch reconciliation

### Workforce Mode
**Maturity**: ⚠️ **PRODUCTION-READY WITH SCALING LIMITS (7.5/10)**
- Time tracking: COMPLETE
- Geofencing: UNIQUE FEATURE
- Payroll: FUNCTIONAL
- Limitations: Needs pagination at 100+ employees
- Opportunities: Batch approvals, auto-approval rules

### Admin Mode
**Maturity**: ✅ **PRODUCTION-READY (8.5/10)**
- Dashboards: COMPREHENSIVE
- Permissions: ENFORCED
- Audit trails: COMPLETE
- Opportunities: Better alert prioritization, workflow builder

### Observe Mode
**Maturity**: ✅ **PRODUCTION-READY (8/10)**
- Dashboards: CUSTOMIZABLE
- Client portal: ISOLATED
- Notifications: FUNCTIONAL
- Opportunities: Real-time updates, push notifications

---

## MODE-BASED WORKFLOW EXAMPLES

### Example 1: Field Technician's Day

**Morning (7:00 AM)**:
```
MODE: Observe (Dashboard)
- Check today's assignments
- Review job locations
- See weather/site conditions

TRANSITION → Field Mode (7:30 AM)
- Drive to jobsite
- Open MCI Field
- Session initialized
```

**On-Site (8:00 AM - 4:00 PM)**:
```
MODE: Field (Active)
- Capture 40 dimensions (offline)
- Take 60 photos
- Record 3 site note sessions
- Update 12 task checklists
- Log 1 safety concern

Network: Offline 2:00-3:30 PM (basement work)
Result: All data queued, synced at 3:35 PM
```

**End of Day (5:00 PM)**:
```
TRANSITION → Workforce Mode
- Clock out (geofence validated)
- Submit mileage (85 miles)
- Log driving hours (1.5h)

TRANSITION → Observe Mode
- Check payroll preview
- Review tomorrow's schedule
```

**User Experience**: Seamless, predictable, trustworthy

---

### Example 2: Project Manager's Workflow

**Morning (8:00 AM)**:
```
MODE: Admin (Dashboard)
- Review overnight alerts
- Check pending approvals (15 time entries)
- See cash flow status

TRANSITION → Workforce Mode (8:30 AM)
- Batch approve time entries (12/15)
- Reject 3 with excessive hours
- Send feedback to employees
```

**Mid-Morning (10:00 AM)**:
```
TRANSITION → Produce Mode
- Customer call about new project
- Use AI Quote Wizard
- Generate 8-page estimate in 12 minutes
- Send to customer
```

**Afternoon (2:00 PM)**:
```
TRANSITION → Finance Mode
- Customer approved quote
- Convert to invoice (one click)
- Job auto-provisions (Drive + Field)
- Assign team to job

TRANSITION → Admin Mode
- Review provisioning status
- Verify Field project created
- Check team assignments
```

**End of Day (5:30 PM)**:
```
MODE: Observe (Executive Dashboard)
- Review daily metrics
- Check team productivity
- See outstanding invoices
```

**User Experience**: Efficient mode switching, clear context

---

### Example 3: Client's Weekly Check-In

**Monday Morning (9:00 AM)**:
```
MODE: Observe (Client Portal)
- Login via client access token
- See project progress (68% complete)
- Review new photos (12 added since last visit)
- Read daily field report from Friday
- Comment on task: "Looks great, proceed"
```

**Wednesday Afternoon (3:00 PM)**:
```
MODE: Observe (Client Portal)
- Check updated progress (72% complete)
- Approve milestone: "Main wall installation"
- Download weekly summary PDF
- View Drive folder (drawings, contracts)
```

**User Experience**: Transparency, control, no need to call contractor

---

## MODE-SPECIFIC PERFORMANCE TARGETS

### Field Mode
```
Action Response: <100ms (all interactions)
Save Confirmation: <2s (including network)
Offline Sync: <60s (on reconnect, 100 items)
Session Restore: <500ms (from crash)
Photo Upload: <5s (per photo, 5MB)
```

### Produce Mode
```
Quote Creation: <10 min (full quote)
AI Quote Generation: <30s (from description)
PDF Generation: <5s (8-page quote)
Quote Duplication: <2s
Invoice Conversion: <3s (including provisioning trigger)
```

### Finance Mode
```
Transaction Entry: <30s (manual)
Bank Sync: <10s (100 transactions via Plaid)
Reconciliation: <5 min (50 transactions)
Report Generation: <10s (P&L, cash flow)
Invoice Payment Recording: <5s
```

### Workforce Mode
```
Clock In/Out: <30s (including geofence)
Time Approval: <2s per entry
Payroll Calculation: <15s (50 employees)
Paystub Generation: <5s
Expense Submission: <2 min (with photo)
```

### Admin Mode
```
Dashboard Load: <2s (all widgets)
Approval Queue Display: <1s (100 items)
User Creation: <30s
Permission Change: Immediate
Report Export: <10s
```

### Observe Mode
```
Dashboard Load: <1.5s (personalized widgets)
Client Portal Load: <2s (project data)
Notification Check: <500ms
Profile Update: <3s
```

---

## ARCHITECTURAL IMPLICATIONS

### Mode-Based Code Organization

**Current Structure** (Mostly Correct):
```
pages/
  Field.jsx ← Field Mode entry
  FieldProject.jsx ← Field Mode detail
  Estimados.jsx ← Produce Mode
  Facturas.jsx ← Produce + Finance Mode
  Contabilidad.jsx ← Finance Mode
  Nomina.jsx ← Workforce Mode
  Dashboard.jsx ← Observe Mode
  ExecutiveDashboard.jsx ← Admin Mode
```

**Mode-Specific Component Libraries**:
```
components/field/ ← Field Mode only
components/quotes/ ← Produce Mode
components/invoices/ ← Produce + Finance
components/contabilidad/ ← Finance Mode
components/nomina/ ← Workforce Mode
components/dashboard/ ← Observe Mode
components/admin/ ← Admin Mode
```

### Mode-Based Query Strategies

**Field Mode**:
```javascript
// Stable, offline-first
{
  staleTime: Infinity,
  gcTime: Infinity,
  refetchOnMount: false,
  refetchOnWindowFocus: false,
}
```

**Produce Mode**:
```javascript
// Moderate refresh, online-required
{
  staleTime: 300000, // 5 min
  refetchOnWindowFocus: false,
}
```

**Finance Mode**:
```javascript
// Fresh data, frequent updates
{
  staleTime: 60000, // 1 min
  refetchOnWindowFocus: true, // Show latest on return
}
```

**Admin Mode**:
```javascript
// Real-time, always fresh
{
  staleTime: 30000, // 30s
  refetchInterval: 60000, // Poll every minute
}
```

**Observe Mode**:
```javascript
// Cached, user-triggered refresh
{
  staleTime: 600000, // 10 min
  refetchOnMount: false,
}
```

---

## MODE-BASED PERMISSION MODEL

### Field Mode Permissions
```
Technician:
  ✅ CREATE: dimensions, photos, tasks, notes
  ✅ UPDATE: own drafts, task status
  ❌ DELETE: any entity
  ❌ APPROVE: dimension sets

Supervisor:
  ✅ ALL Technician actions
  ✅ APPROVE: dimension sets
  ✅ LOCK: production-ready sets
  ❌ DELETE: historical data

Admin:
  ✅ ALL actions (including delete)
```

### Produce Mode Permissions
```
Sales Rep:
  ✅ CREATE: quotes, customers
  ✅ UPDATE: own quotes (draft/sent only)
  ❌ APPROVE: own quotes
  ❌ EDIT: pricing templates

Estimator:
  ✅ ALL Sales Rep actions
  ✅ CREATE: detailed quotes with custom items
  ❌ APPROVE: quotes without manager review

Manager:
  ✅ ALL Estimator actions
  ✅ APPROVE: quotes
  ✅ CREATE: jobs from quotes
  ❌ EDIT: locked quotes

Admin:
  ✅ ALL actions
  ✅ CONFIGURE: pricing strategy, templates
```

### Finance Mode Permissions
```
Bookkeeper:
  ✅ CREATE: invoices, transactions
  ✅ UPDATE: unreconciled transactions
  ❌ DELETE: reconciled data
  ❌ APPROVE: payroll

Controller:
  ✅ ALL Bookkeeper actions
  ✅ APPROVE: expense reimbursements
  ✅ RECONCILE: bank accounts
  ❌ EDIT: historical records

CEO/Admin:
  ✅ ALL actions
  ✅ OVERRIDE: reconciliation locks (with reason)
  ✅ EXPORT: sensitive financial data
```

### Workforce Mode Permissions
```
Employee:
  ✅ CREATE: own time entries, expenses, mileage
  ✅ UPDATE: pending entries only
  ❌ APPROVE: own entries
  ❌ VIEW: others' pay rates

Manager:
  ✅ ALL Employee actions (for self)
  ✅ APPROVE: team time entries
  ✅ VIEW: team hours (not pay)
  ❌ EDIT: approved entries

Payroll Admin:
  ✅ VIEW: all payroll data
  ✅ CALCULATE: payroll
  ✅ EXPORT: to Gusto/QuickBooks
  ❌ EDIT: pay rates (requires CEO)

CEO/Admin:
  ✅ ALL actions
  ✅ EDIT: pay rates, rules
  ✅ OVERRIDE: validation (with reason)
```

### Admin Mode Permissions
```
Manager:
  ✅ VIEW: team dashboards
  ✅ APPROVE: team actions
  ❌ EDIT: company settings
  ❌ DELETE: users

Admin:
  ✅ ALL Manager actions
  ✅ EDIT: company settings
  ✅ CREATE/DELETE: users, teams
  ✅ CONFIGURE: workflows, integrations
  ❌ DELETE: audit logs

CEO:
  ✅ UNRESTRICTED ACCESS
  ✅ OVERRIDE: all gates (with reason logged)
```

---

## MODE OPTIMIZATION RECOMMENDATIONS

### Field Mode
**Status**: ✅ OPTIMIZED (no changes needed)
- Already mode-aware
- Already isolated
- Already offline-first
- Already user-trusted

### Produce Mode
**Recommendations** (P1):
1. Add "Quick Quote" action to Dashboard (reduce mode-switch friction)
2. Add quote status tracking widget
3. Add breadcrumb: Dashboard → Quotes → Quote #1234
4. Add workflow progress indicator (draft → sent → approved → invoiced)

### Finance Mode
**Recommendations** (P1):
1. Add financial summary widget to Dashboard
2. Add "Quick Reconcile" for recent transactions
3. Add batch reconciliation (select multiple)
4. Add reconciliation status progress bar

### Workforce Mode
**Recommendations** (P0):
1. **CRITICAL**: Implement pagination (before 100+ employees)
2. Add batch approval UI (select multiple time entries)
3. Add auto-approval rules (geofence + <8h = auto-approve)
4. Add payroll preview before final submit

### Admin Mode
**Recommendations** (P2):
1. Add critical alert prioritization (P0/P1/P2)
2. Add workflow builder UI (define custom approval flows)
3. Add scheduled reports (email weekly summaries)
4. Add system health dashboard (API latency, error rates)

---

## MODE TRANSITION EXAMPLES

### Scenario 1: Invoice Payment Received
```
1. Client pays invoice via Stripe
   → Webhook received (Finance Mode trigger)

2. System auto-reconciles payment
   → Invoice status: paid
   → Transaction created: income
   → Job budget updated

3. Notifications sent:
   → Admin: "Payment received: $5,000"
   → Bookkeeper: "Invoice #1234 reconciled"
   → Sales Rep: "Commission calculated: $500"

4. Mode-specific displays:
   → Finance Mode: Transaction appears in ledger
   → Admin Mode: Revenue metric updates
   → Workforce Mode: Commission appears in pending
   → Observe Mode: Dashboard widget updates
```

### Scenario 2: Field Dimension Captured
```
1. Technician measures wall (Field Mode)
   → Dimension saved locally (IndexedDB)
   → Queued for sync

2. Network reconnects
   → Dimension synced to server
   → Server assigns ID
   → Local record updated

3. Factory receives notification (Admin Mode)
   → New dimension available for production review
   → AI quality check runs
   → Completeness analysis runs

4. Supervisor approves (Field Mode)
   → Dimension set locked
   → Production status: approved_for_production
   → Factory can now fabricate

5. Mode-specific visibility:
   → Field Mode: Dimension marked "locked"
   → Admin Mode: Production queue updated
   → Finance Mode: Job cost estimate updated
```

---

## FUTURE MODE EXPANSIONS

### Potential New Modes (Not Yet Implemented)

**1. FABRICATION MODE** (Factory Floor):
```
Users: Factory workers, CNC operators, QC inspectors
Mental State: FABRICATE & VERIFY
Actions: Cut materials, run QC, mark items complete
Environment: Factory floor, CNC machines, high noise
UX: Similar to Field (high contrast, glove-friendly)
Status: Partially implemented (FactoryView page)
```

**2. INSTALLATION MODE** (On-Site Assembly):
```
Users: Installation crews, site foremen
Mental State: ASSEMBLE & VERIFY
Actions: Mark items installed, verify fit, log issues
Environment: Customer site, real-time validation
UX: Mobile-first, photo-heavy, checklist-driven
Status: Not yet implemented (would extend Field Mode)
```

**3. MAINTENANCE MODE** (Post-Installation):
```
Users: Service technicians, warranty teams
Mental State: DIAGNOSE & REPAIR
Actions: Log service calls, order parts, bill warranty claims
Environment: Customer site, service vehicle
UX: Lightweight, quick actions, offline-capable
Status: Not yet implemented
```

---

## SUMMARY & RECOMMENDATIONS

### Current Mode Architecture: ✅ STRONG

**Well-Defined Modes**:
1. ✅ Field Mode (production-grade, 10/10)
2. ✅ Produce Mode (production-ready, 8.5/10)
3. ✅ Finance Mode (production-ready, 8/10)
4. ✅ Workforce Mode (production-ready with limits, 7.5/10)
5. ✅ Admin Mode (production-ready, 8.5/10)
6. ✅ Observe Mode (production-ready, 8/10)

**Mode Isolation**: ✅ EXCELLENT
- Field is fully sandboxed
- Other modes share query client but use different keys
- Theme isolation working correctly
- Permission gates enforce mode boundaries

**Mode Transitions**: ✅ SMOOTH
- Navigation is clear
- Context preservation where needed
- Authorization checked on all transitions
- No data loss on mode switch

---

### Key Insights

**1. Field Mode is Already a Model for Others**:
- Explicit save confirmations → Could apply to Produce (quotes) and Finance (invoices)
- Offline-first → Could extend to Workforce (time tracking)
- Session continuity → Could apply to Produce (multi-step quote creation)

**2. Modes Align with Mental Models**:
- Users think in terms of "I'm on site" (Field) vs. "I'm quoting" (Produce)
- Mode switching is natural (follows work transitions)
- UI adapts to mode (dark/light, layout, actions)

**3. Opportunities for Mode Enhancement**:
- **Quick Mode Switcher**: Cmd+M menu to jump between modes
- **Mode-Specific Dashboards**: Each mode gets dedicated dashboard widget
- **Cross-Mode Notifications**: Actions in one mode trigger alerts in others
- **Mode History**: Track which modes user uses most (personalize navigation)

---

### Prioritized Recommendations

**P0 - Critical for Scale**:
1. Fix Workforce Mode pagination (7h) — Blocks 100+ employee deployments

**P1 - Mode Enhancement**:
1. Add Quick Mode Switcher (4h) — Improves power user efficiency
2. Add Produce → Finance status tracking (2h) — Reduces "where's my job?" confusion
3. Add mode-specific quick actions to Dashboard (6h) — Reduces navigation friction

**P2 - Future Enhancements**:
1. Add Fabrication Mode (40h) — Extends platform to factory floor
2. Add Installation Mode (30h) — Closes field-to-finish workflow
3. Add mode usage analytics (8h) — Optimize navigation for usage patterns

---

## CONCLUSION

**MCI Connect's mode-based architecture is fundamentally sound.**

The platform naturally divides into distinct operational contexts (Field, Produce, Finance, Workforce, Admin, Observe), each with clear user types, mental states, and behavioral expectations.

**Strengths**:
- ✅ Field Mode is exemplary (best-in-class)
- ✅ Mode isolation prevents cross-contamination
- ✅ Permission model aligns with modes
- ✅ UX adapts to mode requirements

**Opportunities**:
- Formalize mode switching (Cmd+M menu)
- Add mode-specific performance monitoring
- Extend mode principles to all modules
- Consider new modes (Fabrication, Installation)

**This document serves as the official reference for MCI Connect's mode-based UX and architecture.**

All future feature development should respect mode boundaries, mental states, and behavioral expectations defined herein.

---

**Document Status**: ✅ APPROVED FOR REFERENCE  
**Next Review**: Q2 2026 (or when adding new modes)  
**Maintained By**: Product Architecture Team