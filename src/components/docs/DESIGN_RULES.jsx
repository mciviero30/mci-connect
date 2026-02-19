# MCI Connect Design Rules
## MANDATORY — Apply to ALL new pages & components (except MCI Field)

---

## 🎨 Colors

### Page Background
```jsx
<div className="min-h-screen bg-[#F1F5F9] dark:bg-slate-900 pb-20 md:pb-0">
```

### Cards
```jsx
// ✅ CORRECT
<Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">

// ❌ WRONG — custom hex in dark mode
<Card className="dark:bg-[#282828]">
```

### Dialogs / Modals
```jsx
// ✅ CORRECT
<DialogContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">

// ❌ WRONG
<DialogContent className="bg-white dark:bg-[#282828]">
```

### Primary Buttons (MCI Blue gradient)
```jsx
<Button className="h-10 bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] hover:from-[#507DB4]/90 hover:to-[#6B9DD8]/90 text-white shadow-md">
```

### Secondary / Outline Buttons
```jsx
<Button variant="outline" className="h-10 border-[#507DB4]/30 text-[#507DB4] dark:text-[#6B9DD8] hover:bg-blue-50/30">
```

### Danger Buttons
```jsx
<Button variant="outline" className="h-10 border-red-200 text-red-600 hover:bg-red-50">
```

### Excel/Export Buttons
```jsx
<Button variant="outline" className="h-10 border-green-200 text-green-600 hover:bg-green-50">
```

---

## 📐 Button Sizes

| Context | Height | Class |
|---------|--------|-------|
| Page header actions | `h-10` | Always `h-10` |
| Form actions (Save/Cancel) | `h-10` | Always `h-10` |
| Inline/table actions | `h-8` / `size="sm"` | `h-8` |
| Large CTA (empty states) | `h-10` | `h-10` |

**NEVER use `size="lg"`, `min-h-[44px]`, `min-h-[48px]` on header buttons.**

---

## 📱 Mobile Responsiveness

### Page containers must use responsive padding
```jsx
<div className="max-w-7xl mx-auto p-3 sm:p-4 md:p-6 lg:p-8">
```

### Grids must be mobile-first
```jsx
// ✅ Correct
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">

// ❌ Wrong
<div className="grid grid-cols-3 gap-6">
```

### Tables must have overflow wrapper
```jsx
<div className="w-full overflow-x-auto">
  <table>...</table>
</div>
```

### Text that is too wide on mobile — use truncate or responsive text
```jsx
<h1 className="text-xl md:text-2xl lg:text-3xl font-bold truncate">
```

### Button text — hide long labels on mobile
```jsx
<Button>
  <Plus className="w-4 h-4 mr-2" />
  <span className="hidden sm:inline">New Customer</span>
  <span className="sm:hidden">New</span>
</Button>
```

---

## 🏗️ Page Structure Template

```jsx
export default function MyPage() {
  return (
    <div className="min-h-screen bg-[#F1F5F9] dark:bg-slate-900 pb-20 md:pb-0">
      <div className="max-w-7xl mx-auto p-3 sm:p-4 md:p-6 lg:p-8">
        
        {/* Header */}
        <PageHeader
          title="Page Title"
          description="Description"
          icon={SomeIcon}
          actions={
            <div className="flex gap-2 flex-shrink-0">
              <Button className="h-10 bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] text-white">
                <Plus className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">New Item</span>
                <span className="sm:hidden">New</span>
              </Button>
            </div>
          }
        />

        {/* Content */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
          {/* Cards */}
        </div>

      </div>
    </div>
  );
}
```

---

## ❌ FORBIDDEN Patterns

```jsx
// NEVER use custom dark hex backgrounds
dark:bg-[#282828]   // → use dark:bg-slate-800
dark:bg-[#181818]   // → use dark:bg-slate-900

// NEVER use non-standard button heights in headers
size="lg"           // → use h-10
min-h-[48px]        // → use h-10
min-h-[44px]        // → use h-10

// NEVER use hardcoded colors outside MCI palette
bg-indigo-600       // → use from-[#507DB4] to-[#6B9DD8]
```

---

## ✅ MCI Color Palette

| Name | Light | Dark |
|------|-------|------|
| Primary Blue | `#507DB4` | `#6B9DD8` |
| Primary Dark Blue | `#1E3A8A` | same |
| Page BG | `#F1F5F9` | `slate-900` |
| Card BG | `white` | `slate-800` |
| Border | `slate-200` | `slate-700` |
| Text Primary | `slate-900` | `slate-100` |
| Text Secondary | `slate-600` | `slate-400` |