# UI Visibility Policy - Global Standard

**Objective**: Prevent "laboratory mode" from appearing to end users. Ensure clean, professional UI in production.

---

## Component Classification

### 1. PRODUCTION UI (Always Visible)
- **Purpose**: Clean, user-facing, production-ready
- **Visibility**: All users, all contexts
- **Examples**:
  - Dashboards (employee/manager views)
  - Tasks, Jobs, Calendar
  - Quotes, Invoices, Expenses
  - Time Tracking, Chat
  - Field Work Mode (Tasks, Dimensions, Photos, Checklists)
  - Profile, Directory, Recognitions

**Rules**:
- Minimal, focused interfaces
- No technical jargon
- Mobile-first design
- Clear navigation

---

### 2. DEBUG UI (Admin or ?debug=true Only)
- **Purpose**: Monitoring, testing, validation, troubleshooting
- **Visibility**: Only when `user.role === 'admin'` OR `?debug=true` in URL
- **Examples**:
  - Field Lifecycle Monitor
  - Field Data Loss Validator
  - Field Stress Test
  - Offline Sync Validator
  - Performance Monitor
  - AI Quality Panel
  - Measurement Intelligence
  - System Health Monitor
  - Query Cache Inspector

**Rules**:
- NEVER shown to regular users
- Can show technical details
- Used for troubleshooting
- Can be verbose

---

### 3. ADMIN-ONLY UI (Role-Based)
- **Purpose**: Sensitive operations, executive access, system configuration
- **Visibility**: Only when `user.role === 'admin'`
- **Examples**:
  - Executive Dashboard
  - Control Tower
  - System Readiness
  - Bank Sync
  - Payroll Auto-Flow
  - Commission Review
  - Approval Hub
  - Role Management
  - Employee Delete
  - Codebase Export
  - Compliance Hub (full view)

**Rules**:
- Requires admin authentication
- Can expose sensitive data
- Can perform destructive operations
- Audit logged

---

## Implementation

### Using Wrappers
```jsx
import { ProductionUI, DebugUI, AdminOnlyUI } from '@/components/policies/UIVisibilityWrapper';

// Production UI - always visible
<ProductionUI>
  <TaskList />
</ProductionUI>

// Debug UI - admin or ?debug=true
<DebugUI>
  <PerformanceMonitor />
</DebugUI>

// Admin-only UI
<AdminOnlyUI>
  <SystemControls />
</AdminOnlyUI>
```

### Using Hook
```jsx
import { useUIVisibility } from '@/components/policies/UIVisibilityWrapper';

function MyComponent() {
  const { canSeeDebug, canSeeAdmin } = useUIVisibility();

  return (
    <>
      {/* Always visible */}
      <TaskList />

      {/* Debug only */}
      {canSeeDebug && <PerformanceMonitor />}

      {/* Admin only */}
      {canSeeAdmin && <AdminControls />}
    </>
  );
}
```

---

## Context-Specific Rules

### Dashboard
- **Production**: Stats cards, quick actions, recent activity
- **Debug**: Query inspector, cache viewer
- **Admin**: System health, executive metrics

### Field Mode
- **Production (Work Mode)**: Overview, Tasks, Dimensions, Photos, Checklists
- **Debug**: Intelligence, Completeness, AI Quality, Lifecycle monitors
- **Admin**: Analytics, Budget, Advanced Reports

### Finance
- **Production**: Transaction lists, expense forms, invoice views
- **Debug**: AI categorizer, reconciliation engine diagnostics
- **Admin**: Bank sync, cash flow forecasting, budget controls

### Admin Section
- **Production**: None (admin section is inherently admin-only)
- **Debug**: System logs, performance metrics
- **Admin**: All admin features (control tower, role management, audit trail)

---

## Enforcement Checklist

- [ ] No monitoring panels visible to regular users
- [ ] No technical metrics in production UI
- [ ] No debug toggles in user-facing interfaces
- [ ] Admin operations require role check
- [ ] Debug mode requires explicit activation
- [ ] All sensitive operations are admin-gated
- [ ] Clean, minimal UI for field workers
- [ ] No laboratory/testing UI in production views

---

## Migration Guide

**Before** (Laboratory mode visible):
```jsx
<Dashboard>
  <Stats />
  <PerformanceMonitor />  {/* ❌ Visible to everyone */}
  <SystemHealth />        {/* ❌ Visible to everyone */}
</Dashboard>
```

**After** (Clean production):
```jsx
<Dashboard>
  <Stats />
  <DebugUI>
    <PerformanceMonitor />  {/* ✅ Admin/debug only */}
  </DebugUI>
  <AdminOnlyUI>
    <SystemHealth />        {/* ✅ Admin only */}
  </AdminOnlyUI>
</Dashboard>
```

---

## Testing

**Regular User** (role: 'employee'):
- Should see: Dashboard, Tasks, Time Tracking, Profile
- Should NOT see: Performance monitors, admin controls, debug panels

**Manager** (role: 'manager'):
- Should see: Same as employee + team views
- Should NOT see: Debug panels, admin-only features

**Admin** (role: 'admin'):
- Should see: Everything (production + debug + admin)
- Can enable debug mode for troubleshooting

**Debug Mode** (?debug=true):
- Admin sees debug panels
- Regular users still blocked from admin-only features