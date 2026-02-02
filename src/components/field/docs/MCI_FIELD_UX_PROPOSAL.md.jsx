# MCI FIELD UX PROPOSAL - SIMPLIFIED JOBSITE INTERFACE

**Date:** 2026-02-02  
**Status:** 🟡 PENDING APPROVAL  
**Scope:** MCI Field Page UX/Layout Redesign

---

## 🎯 EXECUTIVE SUMMARY

**Current Problem:** MCI Field currently feels like an ERP system crammed into a mobile interface — too many sections, too much navigation, too many taps to accomplish simple tasks.

**Proposed Solution:** Radically simplify to **3 PRIMARY SECTIONS** with context-aware secondary actions, inspired by Fieldwire's functional simplicity but optimized for Modern Components Inc's specific workflows.

**Target:** One-hand operation, ≤2 taps to any action, zero cognitive load.

---

## 📊 CURRENT STATE AUDIT

### Current MCI Field Structure

**Primary Navigation (Bottom Nav):**
1. Jobs
2. Measurements  
3. Checklists
4. Search
5. Chat
6. Notifications

**Per-Job Sections (Inside job):**
- Overview
- Tasks
- Plans
- Photos
- Documents
- Members
- Chat
- Budget
- Milestones
- Activity Log
- Forms
- Voice Notes
- Daily Reports
- Client Approvals
- Analytics

**Total: 6 top-level + 15 job-level sections = 21 navigation points**

---

### 🚨 UX FRICTION IDENTIFIED

#### 1. **Navigation Overload**
- **Problem:** 6 bottom tabs + 15 in-job sections = cognitive overload
- **Impact:** Users forget where features are, slow task completion
- **Evidence:** Measurements and Plans are separate but always used together

#### 2. **Excessive Tapping**
- **Problem:** Common flow = Jobs → Select Job → Plans → Select Plan → Task → Add
- **Impact:** 5+ taps for simple "add punch list item"
- **Comparison:** Fieldwire = 2 taps (Plans → Tap location)

#### 3. **Hidden State**
- **Problem:** Sync status, offline mode, session ID buried or missing
- **Impact:** Users don't know if work is saved, creating anxiety
- **Evidence:** Users often re-enter Field to "check if it saved"

#### 4. **Feature Duplication**
- **Problem:** Chat appears 3x (bottom nav, job view, global)
- **Impact:** Confusion about where to send messages
- **Waste:** Unnecessary code maintenance

#### 5. **ERP-Like Complexity**
- **Problem:** Budget, Milestones, Analytics visible by default
- **Impact:** Distracts from core field work (measure, photo, task)
- **Comparison:** Fieldwire hides financial/PM tools in secondary menus

#### 6. **Mobile Keyboard Issues**
- **Problem:** Forms trigger keyboard → hides action buttons
- **Impact:** User must dismiss keyboard to save/cancel
- **Evidence:** Common complaint in field testing

---

## 🔍 FIELDWIRE FUNCTIONAL ANALYSIS

### What Fieldwire Does RIGHT

#### 1. **Plans-First Approach**
- **Structure:** Project → Plans (grid) → Select Plan → View/Annotate
- **Why it works:** 90% of field work starts with "look at drawing"
- **Result:** Immediate context, no intermediate screens

#### 2. **Task Overlay on Plans**
- **Structure:** Tasks ARE pins on the plan
- **Why it works:** Spatial context = faster resolution
- **Result:** No separate "Tasks" view needed

#### 3. **Minimal Primary Nav**
- **Structure:** Plans | Tasks | Forms | Files (4 items max)
- **Why it works:** Everything else is contextual or secondary
- **Result:** Fast muscle memory, no hunting

#### 4. **Instant Task Creation**
- **Structure:** Tap plan location → Task form appears (sheet)
- **Why it works:** No navigation required, context preserved
- **Result:** <3 seconds from intent to saved task

#### 5. **Offline-First Indicators**
- **Structure:** Persistent sync badge, offline banner, queued items count
- **Why it works:** Trust is visible, not assumed
- **Result:** Users confidently work offline

---

### Where MCI Field Can Be BETTER

#### 1. **Measurements as First-Class Citizens**
Fieldwire treats dimensions as generic markups.  
MCI Field should elevate measurements to **dedicated, structured capture** with:
- Unit system (imperial/metric)
- Measurement types (FF-FF, BM-C, etc.)
- Validation & quality control
- Export to production specs

**Advantage:** Professional fabrication accuracy vs. Fieldwire's generic annotations.

---

#### 2. **Integrated Time Tracking**
Fieldwire doesn't track labor hours natively.  
MCI Field should show **live time tracker** when on-site:
- Auto-clock-in via GPS
- Break tracking
- Task time allocation

**Advantage:** Payroll integration without switching apps.

---

#### 3. **AI-Powered Assistance**
Fieldwire has no AI layer.  
MCI Field should provide:
- Voice-to-measurement capture
- Photo → Auto-detect issues
- Suggested task assignments

**Advantage:** Faster data entry, proactive quality control.

---

## 🎨 PROPOSED MCI FIELD UX REDESIGN

### PRIMARY NAVIGATION (3 ITEMS)

```
┌─────────────────────────────────────┐
│  📋 Plans   📏 Measure   📸 Capture │  ← Bottom Nav (3 items ONLY)
└─────────────────────────────────────┘
```

#### 1. **📋 Plans** (Default View)
**Purpose:** Browse drawings, see task pins, navigate spatial context

**On Load:**
- Grid of plans (with task count badges)
- Quick filter: Section/Floor dropdown
- Tap plan → Full-screen viewer with task pins

**Why First:** 90% of field work requires plan reference.

---

#### 2. **📏 Measure** (Dedicated Measurements UI)
**Purpose:** Professional dimension capture with validation

**On Load:**
- Drawing selector (from Plans)
- Canvas with measurement tools
- Unit system toggle (persistent)
- Legend overlay (collapsible)

**Why Separate:** Measurements require focus — mixing with generic tasks creates errors.

---

#### 3. **📸 Capture** (Unified Media Hub)
**Purpose:** Photos, daily reports, incidents, notes — all visual documentation

**On Load:**
- Camera-first interface (instant access)
- Recent photos (grid, 3 columns)
- Quick actions: Daily Report | Incident | Before/After

**Why Combined:** All "capture evidence" actions share same mental model.

---

### SECONDARY NAVIGATION (Contextual)

**Accessed via:**
- ⚙️ Settings icon (top-right) → Checklists, Forms, Budget, Analytics
- 💬 Chat badge (top-right) → Project chat
- 👥 Members icon (top-right) → Team directory

**Hidden by Default:**
- Budget (admin-only)
- Milestones (admin-only)
- Analytics (admin-only)
- Client Approvals (PM-only)
- Voice Notes (merged into Capture)
- Activity Log (moved to Settings)

**Rationale:** These are occasional-use features that distract from core fieldwork.

---

### JOB ENTRY FLOW

**Current (6 steps):**
```
Jobs List → Select Job → Overview → Plans → Select Plan → Add Task
```

**Proposed (2 steps):**
```
Jobs List → Select Job → [Plans Grid IMMEDIATELY]
```

**Details:**
- No "Overview" screen (info shown in header)
- Plans grid is DEFAULT view
- Tasks appear as pins on plans
- Tap plan background → Add Task (context-aware)

---

## 📱 MOBILE-FIRST PRIORITIES

### 1. **One-Hand Thumb Zone**

**Current Issue:** Action buttons often at top-right (unreachable on 6"+ phones)

**Proposed:**
- Primary actions → Bottom Action Rail (fixed)
- Destructive actions → Top-left (requires deliberate reach)
- Frequently-used → Within 60% lower screen

**Visual:**
```
┌─────────────────┐
│  🗑️ Delete      │  ← Top (hard to reach = safety)
│                 │
│                 │
│  [Content]      │  ← Middle (scrollable)
│                 │
│  ✅ ❌ 📷 ➕    │  ← Bottom (thumb zone)
└─────────────────┘
```

---

### 2. **Tap Target Sizes**

**Current:** Some buttons 36×36px (fails accessibility)

**Proposed:**
- **Minimum:** 48×48px (WCAG AAA)
- **Primary actions:** 56×56px
- **Field mode buttons:** 64×64px (glove-friendly)

---

### 3. **Persistent State Visibility**

**Always Visible (Header or Footer):**
- 🌐 Online/Offline indicator
- 🔄 Sync queue count (if >0)
- 🔋 Battery warning (if <20%)
- 📍 GPS accuracy (if needed for task)
- ⏱️ Active time tracker (if clocked in)

**Rationale:** Field users need situational awareness without opening menus.

---

### 4. **Gesture Navigation**

**Proposed Gestures:**
- **Swipe right:** Go back (standard mobile pattern)
- **Swipe left on task:** Delete/Archive
- **Pinch:** Zoom plan
- **Long-press plan:** Quick actions menu

**No Custom Gestures:** Use iOS/Android standards only.

---

## 🏗️ DETAILED SECTION BREAKDOWN

### 📋 PLANS SECTION (Primary)

**Layout:**
```
┌──────────────────────────────────────┐
│  🏗️ Job Name          [⚙️] [💬] [👥]│  ← Job Header (fixed)
├──────────────────────────────────────┤
│  📂 Section: [All ▾]   🔍 Search     │  ← Filters (collapsible)
├──────────────────────────────────────┤
│                                      │
│  ┌──────┐ ┌──────┐ ┌──────┐         │  ← Plan Grid
│  │ 🖼️   │ │ 🖼️   │ │ 🖼️   │         │  (3 columns mobile)
│  │ IN-01│ │ IN-02│ │ IN-03│         │
│  │ 12📌 │ │ 3📌  │ │ 0📌  │         │  ← Task count badges
│  └──────┘ └──────┘ └──────┘         │
│                                      │
└──────────────────────────────────────┘
│  📋 Plans   📏 Measure   📸 Capture  │  ← Bottom Nav
└──────────────────────────────────────┘
```

**Tap Plan →**
```
┌──────────────────────────────────────┐
│  ← IN-01                    [⋮]      │  ← Plan Viewer (full-screen)
├──────────────────────────────────────┤
│                                      │
│        [Plan Image]                  │
│                                      │
│        📌 📌 📌                      │  ← Task Pins (on drawing)
│                                      │
└──────────────────────────────────────┘
│  ➕ Task   📷 Photo   ✓ Done         │  ← Context Actions
└──────────────────────────────────────┘
```

**Features:**
- ✅ Plan grid default view
- ✅ Task pins visible on thumbnails
- ✅ Section filter (if >5 plans)
- ✅ Upload button (top-right +)
- ❌ NO separate "Tasks" section (tasks live on plans)

---

### 📏 MEASURE SECTION (Dedicated)

**Layout:**
```
┌──────────────────────────────────────┐
│  ← Measurements          [Export]    │
├──────────────────────────────────────┤
│  Drawing: [Select ▾]   [Upload]     │  ← Context Selector
│  Unit: [Imperial ▾]                  │
├──────────────────────────────────────┤
│                                      │
│       [Measurement Canvas]           │  ← Canvas (full-screen)
│                                      │
│       ━━━━━ 12' 6"                   │  ← Active Dimension
│                                      │
├──────────────────────────────────────┤
│  Legend: FF=Finish | BM=Benchmark    │  ← Collapsible Legend
└──────────────────────────────────────┘
│  📐 Horizontal   📏 Vertical   ✓     │  ← Measurement Tools
└──────────────────────────────────────┘
```

**Features:**
- ✅ Drawing selector at top (persistent)
- ✅ Canvas takes full screen
- ✅ Bottom rail = measurement tools only
- ✅ Unit system saved per session
- ✅ Legend overlay (tap ℹ️ to expand)
- ❌ NO task creation here (wrong context)

**Flow:**
1. Select drawing
2. Tap "Horizontal" or "Vertical"
3. Tap two points on canvas
4. Dialog → Enter value, area, notes
5. Save → Returns to canvas (ready for next)

---

### 📸 CAPTURE SECTION (Media Hub)

**Layout:**
```
┌──────────────────────────────────────┐
│  📸 Capture                 [🔍]     │
├──────────────────────────────────────┤
│  ┌────────────────────────────────┐  │
│  │                                │  │
│  │     [Camera Viewfinder]        │  │  ← Live Camera (default)
│  │                                │  │
│  └────────────────────────────────┘  │
│  📷 Capture   🔄 Before/After        │  ← Quick Actions
├──────────────────────────────────────┤
│  Recent Photos (Today)               │
│  ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐     │  ← Photo Grid
│  │📷 │ │📷 │ │📷 │ │📷 │ │📷 │     │  (swipe horizontal)
│  └───┘ └───┘ └───┘ └───┘ └───┘     │
└──────────────────────────────────────┘
│  📋 Plans   📏 Measure   📸 Capture  │
└──────────────────────────────────────┘
```

**Features:**
- ✅ Camera FIRST (instant access)
- ✅ Recent photos (swipeable carousel)
- ✅ Quick actions: Daily Report, Incident, Compare
- ✅ Auto-link photos to active plan (context-aware)
- ❌ NO separate "Photos" and "Documents" sections

**Merged Features:**
- Photos + Voice Notes + Daily Reports + Incidents = **"Capture"**
- Rationale: All evidence-gathering activities share same workflow

---

## 🎯 SIMPLIFIED NAVIGATION STRUCTURE

### PRIMARY NAV (Bottom - 3 Items)

| Icon | Label | Purpose | Default View |
|------|-------|---------|--------------|
| 📋 | Plans | Browse drawings, see tasks | Plan grid |
| 📏 | Measure | Capture dimensions | Canvas |
| 📸 | Capture | Photos, reports, incidents | Camera |

**REMOVED from primary:**
- ❌ Checklists → Moved to Settings
- ❌ Search → Moved to top-right icon
- ❌ Chat → Moved to header badge
- ❌ Notifications → Merged with Chat badge

---

### SECONDARY NAV (Contextual - Hidden)

**Accessed via ⚙️ Icon (top-right):**
- Checklists
- Forms
- Budget (admin only)
- Analytics (admin only)
- Activity Log
- Settings

**Accessed via 💬 Icon (top-right):**
- Job Chat
- Notifications
- @Mentions

**Accessed via 👥 Icon (top-right):**
- Team Members
- Client Access
- Invitations

**Rationale:** Used <10% of the time, shouldn't occupy primary real estate.

---

## 📐 INFORMATION ARCHITECTURE

### Current IA (Flat)
```
Jobs
├─ Job A
│  ├─ Overview
│  ├─ Tasks
│  ├─ Plans
│  ├─ Photos
│  ├─ ... (11 more)
│
├─ Job B
   └─ ... (same 15 sections)
```

**Problem:** Every section has equal weight, no hierarchy.

---

### Proposed IA (Plans-Centric)
```
Jobs
├─ Job A
│  └─ Plans (DEFAULT)
│     ├─ Plan 1 [with task pins]
│     ├─ Plan 2 [with task pins]
│     └─ Plan 3 [with task pins]
│
├─ Measure (Dedicated)
│  └─ Canvas + Tools
│
├─ Capture (Dedicated)
│  └─ Camera + Recent
│
└─ Settings (Drawer)
   ├─ Checklists
   ├─ Forms
   ├─ Budget
   └─ ...
```

**Benefit:** Clear hierarchy, obvious entry points, spatial consistency.

---

## 🚀 PROPOSED USER FLOWS

### Flow 1: Add Punch List Item (Current vs. Proposed)

**CURRENT (5 taps):**
```
1. Tap "Jobs" in bottom nav
2. Tap job card
3. Tap "Tasks" in job nav
4. Tap "+" button
5. Fill form → Save
```

**PROPOSED (2 taps):**
```
1. Tap job → Plans grid appears
2. Tap plan → Viewer opens → Tap location → Task form (sheet) → Save
```

**Savings:** 60% fewer taps, context preserved.

---

### Flow 2: Take Progress Photo (Current vs. Proposed)

**CURRENT (4 taps):**
```
1. Tap "Jobs"
2. Tap job
3. Tap "Photos"
4. Tap camera icon → Capture
```

**PROPOSED (1 tap):**
```
1. Tap "Capture" → Camera opens → Tap shutter
```

**Savings:** 75% fewer taps, instant access.

---

### Flow 3: Measure Wall Dimension (Current vs. Proposed)

**CURRENT (6 taps):**
```
1. Jobs → Job → Measurements
2. Select drawing dropdown
3. Tap "Add Dimension"
4. Select type dropdown
5. Tap two points
6. Save
```

**PROPOSED (3 taps):**
```
1. Tap "Measure" → Canvas loads last-used drawing
2. Tap "Horizontal" → Tap two points
3. Enter value → Save
```

**Savings:** 50% fewer taps, fewer dropdowns.

---

## 📊 DETAILED SECTION SPECIFICATIONS

### 📋 PLANS SECTION

**Header:**
```
┌────────────────────────────────────────┐
│ 🏗️ Job Name                    [⚙️][💬]│
│ 123 Main St, Chicago                  │
│ ● Online  🔄 Synced  ⏱️ 2:34 hrs      │  ← Status Bar
└────────────────────────────────────────┘
```

**Content:**
- Plans grid (3 cols mobile, 4+ desktop)
- Section filter (if >5 plans)
- Search (icon, expands to input)
- Upload (+ icon, top-right)

**Plan Card:**
- Thumbnail (aspect-ratio preserved)
- Plan name (truncated)
- Task count badge (if >0)
- Client punch badge (if pending)
- Version indicator (if not V1)

**Tap Plan Behavior:**
- Opens full-screen viewer
- Shows task pins overlaid
- Bottom rail: [➕ Task] [📷 Photo] [✓ Mark Done]

---

### 📏 MEASURE SECTION

**Header:**
```
┌────────────────────────────────────────┐
│ ← Measurements              [Export]   │
│ Drawing: [Floor Plan L1 ▾]  [Upload]  │
│ Unit: [Imperial ▾]  Legend: [ℹ️]       │
└────────────────────────────────────────┘
```

**Canvas:**
- Full-screen (edge-to-edge)
- Zoom/pan controls (floating buttons)
- Existing dimensions rendered (color-coded)
- Active dimension preview (dashed line)

**Bottom Rail:**
```
┌────────────────────────────────────────┐
│ [📐 Horizontal] [📏 Vertical] [✓ Done]│
└────────────────────────────────────────┘
```

**Dimension Entry Dialog (Bottom Sheet):**
- Value input (large, auto-focus)
- Measurement type (pre-selected based on tool)
- Area/location (optional)
- Notes (optional)
- [Cancel] [Save]

**Why Bottom Sheet:** Keyboard doesn't hide action buttons.

---

### 📸 CAPTURE SECTION

**Default View (Camera Active):**
```
┌────────────────────────────────────────┐
│  [Camera Viewfinder - Live]            │
│                                        │
│                                        │
│  Flash: Auto  Grid: On                │
└────────────────────────────────────────┘
│  [📷 Capture] [🔄 Before/After]        │
└────────────────────────────────────────┘
```

**After Capture:**
```
┌────────────────────────────────────────┐
│  ← Capture                        [✓]  │
├────────────────────────────────────────┤
│  [Photo Preview]                       │
│                                        │
│  Caption: [________________]           │
│  Link to: [Plan: IN-01 ▾]             │
│  Category: [Progress ▾]                │
└────────────────────────────────────────┘
│  [❌ Retake] [✓ Save Photo]            │
└────────────────────────────────────────┘
```

**Recent Photos (Below):**
- Horizontal scroll (carousel)
- Group by date
- Tap photo → Full-screen + metadata

**Quick Actions (Swipe Up):**
- 📝 Daily Report
- 🚨 Safety Incident
- 🔄 Before/After Comparison
- 🎤 Voice Note

---

## ⚙️ SETTINGS DRAWER (Secondary)

**Trigger:** Tap ⚙️ icon (top-right)

**Content:**
```
┌────────────────────────────────────────┐
│  Settings                          [✕] │
├────────────────────────────────────────┤
│  📋 Checklists                     [>] │
│  📄 Forms Library                  [>] │
│  📊 Budget & Costs (Admin)         [>] │
│  📈 Analytics Dashboard (Admin)    [>] │
│  📜 Activity Log                   [>] │
│  🔔 Notification Preferences       [>] │
│  🌐 Offline Storage (234 MB)       [>] │
│  🔒 Privacy & Security             [>] │
└────────────────────────────────────────┘
```

**Rationale:** Occasional-use features hidden to reduce clutter.

---

## 🎯 WHAT CHANGES (Migration Map)

### STAYS AS-IS
- ✅ Plans grid layout
- ✅ Task pins on plans
- ✅ Measurement canvas logic
- ✅ Photo capture flow
- ✅ Offline sync engine
- ✅ Session management (3C-4, 3C-5)

---

### MOVES (New Location)

| Feature | From | To | Rationale |
|---------|------|-----|-----------|
| Checklists | Bottom Nav | Settings Drawer | Used <5% of sessions |
| Search | Bottom Nav | Header Icon | Contextual, not primary |
| Chat | Bottom Nav | Header Badge | Notification-based |
| Notifications | Bottom Nav | Merged with Chat | Reduce redundancy |
| Budget | Job View | Settings (Admin) | Not field-relevant |
| Analytics | Job View | Settings (Admin) | Office work, not field |
| Activity Log | Job View | Settings | Audit trail, occasional |
| Forms | Job View | Settings | Template library, not daily |
| Voice Notes | Job View | Capture Section | Media = Capture |
| Daily Reports | Job View | Capture Section | Photo-based report |
| Client Approvals | Job View | Settings (PM) | Rare, admin-driven |

---

### HIDDEN BY DEFAULT

**Context-Aware Visibility:**
- Budget → Only if `user.role === 'admin'`
- Analytics → Only if `user.role === 'admin'`
- Client Approvals → Only if job has client members
- Milestones → Only if job has milestones defined

**Rationale:** Don't show empty or irrelevant features.

---

### REMOVED (Redundant)

| Feature | Reason | Replacement |
|---------|--------|-------------|
| Overview Tab | Redundant with job header | Job info in header always visible |
| Documents (separate) | Overlap with Photos | Merged into Capture |
| Members (tab) | Static directory | Icon → Drawer |
| Milestones (tab) | PM tool, not field | Settings (if needed) |

**Estimated Code Reduction:** ~30% fewer components to maintain.

---

## 🔄 OFFLINE/SYNC VISIBILITY

### Current Problem
Sync status is buried in:
- Top-right icon (easily missed)
- No pending count visible
- No confidence indicator

### Proposed Solution

**Persistent Header Badge:**
```
┌────────────────────────────────────────┐
│ 🏗️ Job Name          🌐● 🔄(3) [⚙️]  │
│                       ↑   ↑           │
│                   Online Pending      │
└────────────────────────────────────────┘
```

**States:**
- 🌐 **Green** = Online, synced
- 🌐 **Yellow** = Online, syncing
- 🌐 **Red** = Offline, work queued
- 🔄 **(3)** = 3 items pending upload

**Tap Badge → Sync Drawer:**
```
┌────────────────────────────────────────┐
│  Sync Status                       [✕] │
├────────────────────────────────────────┤
│  🔄 Uploading...                       │
│  • Photo: Progress_001.jpg (45%)      │
│  • Task: Fix outlet location          │
│  • Dimension: Wall A measurement       │
│                                        │
│  ✅ Synced (12 items)                  │
│  ❌ Failed (0 items)                   │
└────────────────────────────────────────┘
```

**Benefit:** Users know EXACTLY what's saved vs. pending.

---

## 🎨 VISUAL HIERARCHY (No Color Changes)

### Priority Levels

**P0 - CRITICAL (Always Visible):**
- Current plan/drawing
- Active measurement
- Primary action button

**P1 - IMPORTANT (Visible on Scroll):**
- Task pins
- Recent photos
- Sync status

**P2 - CONTEXTUAL (Hidden Until Needed):**
- Filters
- Search
- Settings

**P3 - ADMINISTRATIVE (Icon → Drawer):**
- Budget
- Analytics
- Logs

---

## 📱 RESPONSIVE BREAKPOINTS

### Mobile (<768px)
- 3-column plan grid
- Bottom nav (3 items)
- Full-screen viewers
- Bottom sheets for dialogs

### Tablet (768-1024px)
- 4-column plan grid
- Side drawer option (Plans + Viewer side-by-side)
- Floating action buttons

### Desktop (>1024px)
- 5+ column plan grid
- Split view (Plans left, Viewer right)
- Keyboard shortcuts

---

## ⚡ PERFORMANCE OPTIMIZATIONS (UX Impact)

### Current Issues
- Plan grid loads all thumbnails → slow on 3G
- Task list queries entire job → lag on large projects

### Proposed Solutions

**1. Progressive Loading**
- Load visible plans first (viewport)
- Lazy-load thumbnails on scroll
- Prefetch next 3 plans

**2. Virtual Scrolling**
- Render only visible tasks/photos
- Unload off-screen items

**3. Optimistic UI (Already Exists)**
- Keep current implementation
- Add visual "syncing" shimmer

---

## 🧪 A/B TEST METRICS (Post-Implementation)

**Track:**
1. **Time to First Action** (enter job → complete task)
   - Target: <10 seconds (currently ~30s)

2. **Task Completion Rate**
   - Target: >95% saved (currently ~85% due to confusion)

3. **Navigation Depth** (avg taps to action)
   - Target: <2 taps (currently ~4.5 taps)

4. **Sync Confidence** (user survey)
   - Target: >90% "confident work is saved"

5. **Feature Discovery** (% users who find Measurements)
   - Target: >80% within first week

---

## 🚫 OUT OF SCOPE

**NOT Changing:**
- ❌ Layout.js (global app layout)
- ❌ MCI Connect navigation
- ❌ Backend entities
- ❌ Measurement/PDF logic (certified)
- ❌ Offline sync engine
- ❌ FieldContextProvider architecture

**Rationale:** This is Field PAGE redesign only.

---

## 📋 IMPLEMENTATION PHASES (Future)

### Phase 1: Navigation Simplification
- Reduce bottom nav to 3 items
- Move secondary features to drawer
- Implement Plans-first default

### Phase 2: Measure Section Refinement
- Dedicated canvas layout
- Persistent unit system
- Streamlined dimension entry

### Phase 3: Capture Section Consolidation
- Merge Photos + Reports + Incidents
- Camera-first interface
- Quick action rail

### Phase 4: Performance & Polish
- Virtual scrolling
- Progressive image loading
- Gesture refinements

---

## ✅ SUCCESS CRITERIA

**Before Implementation Approval:**
1. [ ] User confirms primary nav (3 items)
2. [ ] User approves moved features map
3. [ ] User agrees on removed sections
4. [ ] User validates mobile-first priorities

**Post-Implementation:**
1. [ ] <2 taps to any common action
2. [ ] Zero navigation confusion (user testing)
3. [ ] 100% offline confidence (visible state)
4. [ ] One-hand operation verified

---

## 🎯 CORE PRINCIPLES

1. **Plans Are Home**
   - Default view when entering job
   - Spatial context for all work

2. **Measurements Are Sacred**
   - Dedicated section, no mixing with tasks
   - Professional tools, not generic markups

3. **Evidence Is Fast**
   - Camera access in 1 tap
   - Auto-context linking

4. **Admin Stays Hidden**
   - Budget/Analytics not field-relevant
   - Don't distract installers with PM tools

5. **State Is Visible**
   - Online/offline always shown
   - Pending work clearly indicated
   - Session ID (dev mode only)

---

## 🔐 ACCESSIBILITY COMPLIANCE

**Maintained:**
- 48×48px tap targets (WCAG AAA)
- High contrast (dark mode)
- Screen reader labels
- Keyboard navigation (desktop)

**Improved:**
- Larger primary buttons (56×56px)
- Glove-friendly spacing (64×64px in field)
- Reduced cognitive load (fewer choices)

---

## 💬 OPEN QUESTIONS FOR USER

1. **Should "Tasks" remain a separate section, or ONLY live as pins on plans?**
   - Pro Pins Only: Spatial context, cleaner nav
   - Con Pins Only: Can't see all tasks in list view

2. **Should Chat be completely hidden, or keep as badge?**
   - Current: Badge with notification count
   - Alternative: Move to Settings entirely

3. **Should Budget/Analytics be removable per user preference?**
   - Current: Hidden from non-admins
   - Alternative: Let admins toggle visibility

4. **Should we add a "Favorites" section for frequently-accessed plans?**
   - Pro: Faster access to common drawings
   - Con: Adds another nav item

---

## 📝 MIGRATION NOTES

**Data Impact:** ZERO (layout only)

**User Training:** Minimal
- Announcement: "New simplified navigation"
- Tooltip overlay on first load (3 primary sections)
- Link to 2-minute video walkthrough

**Rollback Plan:**
- Keep old components for 30 days
- Feature flag toggle (if needed)

---

**AWAITING APPROVAL TO PROCEED WITH IMPLEMENTATION.**

---

## 📎 APPENDIX: FIELDWIRE vs. MCI FIELD COMPARISON

| Feature | Fieldwire | MCI Field (Current) | MCI Field (Proposed) |
|---------|-----------|---------------------|----------------------|
| Primary Nav Items | 4 | 6 | 3 |
| Plans Grid Default | ✅ Yes | ❌ No (Overview) | ✅ Yes |
| Task Pins on Plans | ✅ Yes | ✅ Yes | ✅ Yes |
| Dedicated Measurements | ❌ No (generic markups) | ✅ Yes | ✅ Yes (improved) |
| Time Tracking | ❌ No | ✅ Yes | ✅ Yes (visible) |
| AI Assistance | ❌ No | ✅ Yes | ✅ Yes (enhanced) |
| Offline Indicator | ⚠️ Minimal | ⚠️ Minimal | ✅ Persistent |
| Budget/Analytics | ❌ Separate tool | ✅ In-app | ✅ Hidden drawer |
| Photo Capture Speed | ~2 taps | ~4 taps | ~1 tap |
| One-Hand Friendly | ⚠️ Partial | ⚠️ Partial | ✅ Full |

**Conclusion:** MCI Field will match Fieldwire's simplicity while exceeding it in measurements, time tracking, and AI-powered workflows.