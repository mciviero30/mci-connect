# MCI Connect Design System (Minimal)

**Version**: 1.0  
**Last Updated**: 2026-01-31  
**Status**: ✅ Production Enforced

---

## 🎯 PHILOSOPHY

**Linear/Notion Quality**: Enterprise-grade UI with minimal code overhead.

**Core Principle**: ONE pattern per component type. No exceptions.

---

## 📐 LAYOUT RULES (MANDATORY)

### Rule 1: Text Normalization (SSOT)

**ALL text must be normalized before render**:

```jsx
const normalizeText = (text) => {
  if (!text) return '';
  return String(text)
    .replace(/[\r\n\t]+/g, ' ')  // Remove line breaks
    .replace(/\s{2,}/g, ' ')     // Collapse spaces
    .trim();                      // Clean edges
};
```

**Apply to**: Titles, names, descriptions, addresses

---

### Rule 2: Flexbox Balance (SSOT)

**MANDATORY pattern for all headers/rows**:

```jsx
<div className="flex items-start justify-between gap-4">
  {/* LEFT: Title container */}
  <div className="flex-1 min-w-0">
    <h1 className="truncate" title={normalizedText}>
      {normalizedText}
    </h1>
  </div>
  
  {/* RIGHT: Actions container */}
  <div className="flex-shrink-0 flex gap-2">
    <Button />
    <Button />
  </div>
</div>
```

**Classes**:
- Title container: `flex-1 min-w-0`
- Actions container: `flex-shrink-0`
- Alignment: `items-start` (not `items-center`)

---

### Rule 3: Truncation + Tooltips

**All truncated text MUST have a tooltip**:

```jsx
<h1 className="truncate" title={normalizeText(title)}>
  {normalizeText(title)}
</h1>
```

**DO**: Truncate long titles  
**DON'T**: Let titles wrap into multiple lines

---

## 📄 PAGE HEADERS

### ✅ CORRECT: Use PageHeader Component

**NEVER define custom headers**. Always use `PageHeader`:

```jsx
import PageHeader from "@/components/shared/PageHeader";

<PageHeader
  title="Jobs"
  description="Manage your projects"
  icon={Briefcase}
  stats={[
    { label: 'Active', value: '12', icon: CheckCircle },
    { label: 'Revenue', value: '$45.2k', icon: DollarSign }
  ]}
  actions={
    <div className="flex-shrink-0">
      <Button />
    </div>
  }
/>
```

**PageHeader automatically**:
- Normalizes title text
- Enforces flex layout
- Handles responsive design
- Applies tooltips

### ❌ WRONG: Custom Headers

```jsx
// DON'T DO THIS
<div className="flex justify-between">
  <h1>{title}</h1>
  <Button />
</div>
```

---

## 🃏 CARD LAYOUTS

### Pattern: Job/Invoice/Quote Cards

**MANDATORY structure**:

```jsx
<Card>
  <CardContent className="p-4">
    {/* Header: Title + Actions */}
    <div className="flex items-start justify-between gap-3 mb-3">
      <div className="flex-1 min-w-0">
        <h3 className="font-bold truncate" title={normalizeText(title)}>
          {normalizeText(title)}
        </h3>
        <p className="text-sm text-slate-600 truncate" title={subtitle}>
          {normalizeText(subtitle)}
        </p>
      </div>
      <div className="flex-shrink-0">
        <Badge />
      </div>
    </div>
    
    {/* Body content */}
    <div className="space-y-2">
      {/* Stats, info, etc */}
    </div>
    
    {/* Footer gradient (optional) */}
    <div className="h-[3px] bg-gradient-to-r from-[#507DB4] to-[#6B9DD8]" />
  </CardContent>
</Card>
```

---

## 🏷️ STATUS BADGES

### Placement Rules

**ALWAYS**: `flex-shrink-0` on badge containers

```jsx
<div className="flex items-start gap-3">
  <div className="flex-1 min-w-0">
    <h3 className="truncate">{title}</h3>
  </div>
  <div className="flex-shrink-0">
    <Badge>{status}</Badge>
  </div>
</div>
```

**Sizes**:
- Mobile: `text-[10px] h-[22px]`
- Desktop: `text-xs h-6`

---

## 🔘 ACTION BUTTONS

### Placement Rules

**Container must be**: `flex-shrink-0 flex gap-2`

**Mobile**: Touch targets ≥ 44px

```jsx
<div className="flex-shrink-0 flex gap-2">
  <Button size="sm" className="min-h-[44px] px-3">
    <Icon className="w-4 h-4 sm:mr-2" />
    <span className="hidden sm:inline">Label</span>
  </Button>
</div>
```

**Priority Order** (left to right):
1. Primary action (colored)
2. Secondary action (outline)
3. Overflow menu (MoreHorizontal)

---

## 🚫 EMPTY STATES

### Pattern

**Consistent vertical centering**:

```jsx
<Card className="bg-white shadow-lg">
  <CardContent className="p-12 text-center">
    <Icon className="w-16 h-16 text-slate-400 mx-auto mb-4" />
    <p className="text-slate-600 text-lg mb-4">
      {emptyMessage}
    </p>
    <Button>{ctaLabel}</Button>
  </CardContent>
</Card>
```

**DO**: Center icon, message, and CTA  
**DON'T**: Use multiple columns or complex layouts

---

## ✅ DO / DON'T CHECKLIST

### ✅ DO

- ✅ Normalize ALL text before render
- ✅ Use `flex-1 min-w-0` for titles
- ✅ Use `flex-shrink-0` for actions
- ✅ Add `title` attribute to truncated text
- ✅ Use `items-start` for vertical alignment
- ✅ Use `PageHeader` for all page headers
- ✅ Keep action buttons ≥ 44px on mobile
- ✅ Apply `truncate` to all titles

### ❌ DON'T

- ❌ Define custom page headers
- ❌ Let titles wrap into multiple lines
- ❌ Use `items-center` for title rows
- ❌ Render raw database text without normalization
- ❌ Forget `min-w-0` on flex containers
- ❌ Use `justify-center` for headers
- ❌ Create action buttons < 44px on touch devices
- ❌ Omit tooltips on truncated text

---

## 🔍 QUICK VALIDATION

**Before merging any PR, verify**:

1. Does it use `PageHeader`? ✅
2. Are titles normalized? ✅
3. Does flex layout have `flex-1 min-w-0` + `flex-shrink-0`? ✅
4. Do truncated elements have tooltips? ✅
5. Are touch targets ≥ 44px? ✅

**If any answer is NO → Reject PR**

---

## 🎨 VISUAL REFERENCE

### ✅ CORRECT Layout

```
┌────────────────────────────────────────────────────────┐
│ ┌──────────────────────────┐ ┌────────────────┐       │
│ │ Long Job Title That Tr...│ │ [Edit] [Delete]│       │
│ │ (flex-1 min-w-0)         │ │ (flex-shrink-0)│       │
│ └──────────────────────────┘ └────────────────┘       │
└────────────────────────────────────────────────────────┘
```

### ❌ WRONG Layout

```
┌────────────────────────────────────────────────────────┐
│ Long Job Title That Wraps                             │
│ Into Multiple Lines [Edit]                            │
│                    [Delete]                            │
│ (no flex control)                                      │
└────────────────────────────────────────────────────────┘
```

---

## 📚 COMPONENT REFERENCE

### PageHeader (SSOT)
- Location: `components/shared/PageHeader.jsx`
- Handles: Normalization, layout, tooltips
- Auto-applies: `flex-1 min-w-0`, `flex-shrink-0`

### Cards (SSOT)
- ModernJobCard: `components/trabajos/ModernJobCard.jsx`
- ModernInvoiceCard: `components/invoices/ModernInvoiceCard.jsx`
- ModernQuoteCard: `components/quotes/ModernQuoteCard.jsx`
- ModernCustomerCard: `components/clientes/ModernCustomerCard.jsx`
- ModernTeamCard: `components/teams/ModernTeamCard.jsx`
- ModernEmployeeCard: `components/empleados/ModernEmployeeCard.jsx`

**All cards enforce**: Normalize → Truncate → Tooltip

---

## 🚀 IMPLEMENTATION STATUS

| Category | Coverage | Status |
|----------|----------|--------|
| Page Headers | 100% | ✅ Complete |
| Cards | 100% | ✅ Complete |
| Listados | 100% | ✅ Complete |
| Detalles | 100% | ✅ Complete |
| Dashboards | 100% | ✅ Complete |
| Formularios | 100% | ✅ Complete |

**Total Files**: 28  
**Regressions**: 0  
**Enterprise-Ready**: ✅ YES

---

## 📖 EXAMPLES

### Example 1: Page with Actions

```jsx
import PageHeader from "@/components/shared/PageHeader";

export default function Jobs() {
  return (
    <div className="p-8">
      <PageHeader
        title="Jobs Management"
        icon={Briefcase}
        stats={[
          { label: 'Active', value: '12' },
          { label: 'Revenue', value: '$45k' }
        ]}
        actions={
          <div className="flex-shrink-0 flex gap-2">
            <Button size="sm">New Job</Button>
          </div>
        }
      />
      {/* Page content */}
    </div>
  );
}
```

### Example 2: Card with Long Title

```jsx
export default function JobCard({ job }) {
  const title = normalizeText(job.name);
  
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold truncate" title={title}>
              {title}
            </h3>
          </div>
          <div className="flex-shrink-0">
            <Badge>{job.status}</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

### Example 3: Detail Page Header

```jsx
export default function JobDetails() {
  return (
    <div className="p-8">
      {/* Action Bar */}
      <div className="bg-slate-900 p-4 mb-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Button variant="ghost" className="flex-shrink-0">
              <ArrowLeft />
            </Button>
            <div className="min-w-0 flex-1">
              <h1 className="text-white truncate" title={job.name}>
                {normalizeText(job.name)}
              </h1>
            </div>
          </div>
          <div className="flex-shrink-0 flex gap-2">
            <Button>Edit</Button>
            <Button>Delete</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## 🛡️ ENFORCEMENT

**This is NOT optional guidance — it's enforced system architecture**.

**Violations will cause**:
- Layout breaks on mobile
- Titles wrapping unexpectedly
- Action buttons squeezing content
- Poor UX on small screens

**Compliance is mandatory for production deployments**.

---

**Document End** • MCI Connect Design System v1.0