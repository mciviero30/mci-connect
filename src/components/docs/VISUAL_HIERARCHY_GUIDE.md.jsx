# Visual Hierarchy System - Implementation Guide

**Objective**: Reduce visual fatigue, increase clarity through clear priority levels

---

## Core Principle

**ONE dominant element per screen**

Every screen should have exactly ONE primary action that's immediately obvious. Everything else supports or informs that action.

---

## Hierarchy Levels

### 1. PRIMARY - Main Action (ONE per screen)

**Purpose**: The most important action the user can take

**Visual Weight**: 5/5 (Most dominant)

**Examples**:
- "Create Job" button
- "Submit Quote" button  
- "Clock In" button
- "Save Changes" button

**Rules**:
- ✅ ONE primary action per screen maximum
- ✅ Always above the fold on mobile
- ✅ Uses MCI blue gradient (brand color)
- ✅ Large, prominent placement
- ❌ NEVER multiple primary buttons competing

**Implementation**:
```jsx
// Primary action button
<Button className="hierarchy-primary px-6 py-3 text-lg">
  Create Job
</Button>

// OR use inline gradient
<Button className="bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] text-white shadow-lg font-semibold">
  Submit Quote
</Button>
```

---

### 2. SECONDARY - Information & Support

**Purpose**: Display information, secondary actions, navigation

**Visual Weight**: 3-4/5 (Supporting)

**Examples**:
- Data cards (stats, job cards, employee cards)
- Secondary action buttons (Edit, View Details)
- Navigation items
- Lists and tables

**Rules**:
- ✅ Should NOT compete with primary action
- ✅ Use subtle colors (white/slate backgrounds)
- ✅ Consistent spacing and grouping
- ✅ Multiple secondary elements are OK

**Implementation**:
```jsx
// Information card
<Card className="hierarchy-secondary">
  <CardContent>
    <StatsDisplay />
  </CardContent>
</Card>

// Secondary button
<Button variant="outline" className="border-slate-300 dark:border-slate-700">
  View Details
</Button>
```

---

### 3. TERTIARY - Status & Metadata

**Purpose**: Passive information that doesn't require action

**Visual Weight**: 1-2/5 (Minimal)

**Examples**:
- Status badges ("Active", "Pending", "Completed")
- Timestamps ("2 hours ago", "Last updated")
- Read receipts
- Tooltips and help text

**Rules**:
- ✅ Should blend into background
- ✅ Small text (text-xs)
- ✅ Muted colors (slate/gray)
- ❌ NO bright colors unless critical alert

**Implementation**:
```jsx
// Status badge (passive)
<Badge className="hierarchy-tertiary px-2 py-0.5 rounded">
  Completed
</Badge>

// Timestamp
<span className="text-xs text-slate-500 dark:text-slate-400">
  Last updated: 2h ago
</span>
```

---

### 4. DEBUG - Technical Monitoring (Hidden)

**Purpose**: Technical information for troubleshooting

**Visual Weight**: 0/5 (Hidden by default)

**Examples**:
- Performance monitors
- Query cache inspectors
- Validation panels
- Stress test tools

**Rules**:
- ✅ MUST use `<DebugUI>` wrapper
- ✅ Only visible with ?debug=true or admin
- ✅ When visible, should not compete with production UI
- ❌ NEVER visible to regular users

**Implementation**:
```jsx
import { DebugUI } from '@/components/policies/UIVisibilityWrapper';

// Debug panel (hidden by default)
<DebugUI>
  <div className="hierarchy-debug p-4 rounded-lg">
    <PerformanceMonitor />
  </div>
</DebugUI>
```

---

## Alert Color Rules

**CRITICAL**: Only use alert colors for REAL alerts

### When to Use Alert Colors

| Color | When to Use | Example |
|-------|-------------|---------|
| **Red** | System failure, data loss risk | "Payment failed", "Connection lost" |
| **Amber** | Potential issue, needs attention | "Certification expiring", "Pending approval" |
| **Green** | Success confirmation | "Save successful", "Payment received" |
| **Blue** | Neutral information | "New feature", "Maintenance scheduled" |

### When NOT to Use Alert Colors

❌ Status badges (use tertiary hierarchy)
❌ Navigation states
❌ Debug information
❌ Decorative purposes

**Implementation**:
```jsx
// Critical alert (red)
<Alert className="alert-critical p-4 rounded-lg mb-4">
  <AlertTriangle className="w-5 h-5" />
  <AlertTitle>Payment Failed</AlertTitle>
  <AlertDescription>Your credit card was declined</AlertDescription>
</Alert>

// Warning (amber)
<Alert className="alert-warning p-4 rounded-lg mb-4">
  <Clock className="w-5 h-5" />
  <AlertTitle>Certification Expiring</AlertTitle>
  <AlertDescription>Renew within 7 days</AlertDescription>
</Alert>
```

---

## Screen Composition Rules

### Rule #1: One Dominant Element

Every screen should answer: **"What's the most important thing I can do here?"**

**Bad Example** (Multiple primaries):
```jsx
<Dashboard>
  <Button className="hierarchy-primary">Create Job</Button>
  <Button className="hierarchy-primary">Add Employee</Button>
  <Button className="hierarchy-primary">Generate Report</Button>
</Dashboard>
```

**Good Example** (One primary):
```jsx
<Dashboard>
  {/* ONE primary action */}
  <Button className="hierarchy-primary">Create Job</Button>
  
  {/* Supporting actions are secondary */}
  <Button variant="outline">Add Employee</Button>
  <Button variant="outline">View Reports</Button>
</Dashboard>
```

---

### Rule #2: Clear Visual Separation

Different hierarchy levels should be visually distinct.

**Visual Weight Scale**:
- Primary = Bold, colorful, large
- Secondary = Neutral, medium
- Tertiary = Muted, small
- Debug = Hidden

---

### Rule #3: Consistent Application

Apply hierarchy consistently across the app:

- **Dashboards**: Primary = Main action (Create, Add, Start)
- **Forms**: Primary = Submit button
- **Details pages**: Primary = Main edit/update action
- **Lists**: Primary = Create new item
- **Field Mode**: Primary = Complete task, Capture photo

---

## Migration Checklist

To apply visual hierarchy to existing pages:

1. **Identify primary action** - What's the most important thing?
2. **Style primary action** - Use `.hierarchy-primary` or blue gradient
3. **Demote competing elements** - Make secondary actions `variant="outline"`
4. **Update status indicators** - Use `.hierarchy-tertiary` for badges
5. **Wrap debug UI** - Use `<DebugUI>` wrapper for technical panels
6. **Test alert colors** - Ensure red/amber only for real alerts

---

## Before/After Examples

### Before (Visual Chaos)
```jsx
<Dashboard>
  <Button className="bg-red-500">Create</Button>
  <Button className="bg-blue-500">Edit</Button>
  <Button className="bg-green-500">Delete</Button>
  <Badge className="bg-yellow-500">Status</Badge>
  <PerformanceMonitor /> {/* Always visible */}
</Dashboard>
```

### After (Clear Hierarchy)
```jsx
<Dashboard>
  {/* PRIMARY - One dominant action */}
  <Button className="hierarchy-primary">Create Job</Button>
  
  {/* SECONDARY - Supporting actions */}
  <Button variant="outline">Edit</Button>
  <Button variant="outline">Delete</Button>
  
  {/* TERTIARY - Passive status */}
  <Badge className="hierarchy-tertiary">Active</Badge>
  
  {/* DEBUG - Hidden by default */}
  <DebugUI>
    <PerformanceMonitor />
  </DebugUI>
</Dashboard>
```

---

## CSS Classes Reference

```css
/* Primary (ONE per screen) */
.hierarchy-primary

/* Secondary (Information) */
.hierarchy-secondary

/* Tertiary (Status) */
.hierarchy-tertiary

/* Debug (Hidden) */
.hierarchy-debug

/* Alerts (Real alerts only) */
.alert-critical  /* Red - System failure */
.alert-warning   /* Amber - Needs attention */
.alert-success   /* Green - Confirmation */
.alert-info      /* Blue - Neutral */
```

---

## Result

✅ Reduced visual fatigue
✅ Clear focus on primary actions
✅ Clean, professional appearance
✅ Easier for users to understand what to do
✅ Technical UI doesn't compete with production