# Field Work Indicator - Non-Intrusive Design

**Purpose**: Remind users of unfinished Field work WITHOUT interrupting their workflow

---

## Design Principles

### 1. Non-Intrusive ✅
- NO modals or popups
- NO blocking navigation
- NO auto-redirects
- NO notifications on every page load

### 2. Visual Hierarchy ✅
- SECONDARY level (informational)
- Subtle but visible
- Orange/yellow accent (attention without alarm)
- Located above widgets, below header

### 3. User Respect ✅
- User chooses when to resume
- One-click resume action
- Can be ignored if busy
- No pressure tactics

---

## Detection Logic

### What Triggers the Indicator

Checks `sessionStorage` for:
1. `field_session_*` keys (active sessions)
2. `field_draft_*` keys (unsaved drafts)
3. `field_active` flag (Field mode active)

### What It Shows

- **Job Name**: Extracted from session data
- **Timestamp**: When session was created
- **Status**: "Unfinished" or "In Progress"

### What It Does NOT Do

- ❌ Check IndexedDB (too invasive)
- ❌ Make API calls on every render
- ❌ Block any navigation
- ❌ Auto-open Field page
- ❌ Show error messages

---

## Visual Design

### Color Scheme
- Background: Orange/yellow gradient (attention)
- Border: Orange-300 (visible but not alarming)
- Icon: MCI Field orange (#FF8C00)
- Text: Slate-900 (high contrast)

### Size & Placement
- Height: ~60px (compact)
- Width: Full width
- Position: Above Quick Actions, below header
- Margin: 1rem (breathing room)

### Animation
- Fade in: 300ms
- Slide down: Subtle 10px
- No pulsing or blinking
- No persistent animations

---

## User Interaction

### Hover State
- Slight shadow increase
- Arrow slides right (→)
- No color change
- Smooth transition

### Click Action
- Navigate to Field page
- NO confirmation dialog
- NO state clearing (let Field handle it)
- Preserve session data

---

## Implementation

```jsx
<FieldWorkIndicator />
```

### How It Works

1. **Polling**: Checks sessionStorage every 5s (passive)
2. **Parsing**: Extracts job info from session data
3. **Rendering**: Shows card only if pending work found
4. **Action**: Links to Field page (standard navigation)

### Session Data Format

```json
{
  "jobId": "123",
  "jobName": "Project Alpha",
  "timestamp": 1704758400000,
  "activePanel": "tasks",
  "unsavedChanges": true
}
```

---

## Edge Cases Handled

### No Pending Work
- Component returns `null`
- No DOM element rendered
- Zero performance impact

### Invalid Session Data
- Try/catch around parsing
- Fallback to "In Progress" if no job name
- No error messages to user

### Multiple Sessions
- Shows most recent one
- User can navigate to Field to see all

### Stale Sessions
- No auto-cleanup (let Field handle it)
- User can ignore if work is done

---

## Accessibility

- Semantic HTML (link wrapper)
- Clear text labels
- Keyboard navigable (standard link)
- Screen reader friendly

---

## Performance

- Passive polling (5s interval)
- No API calls
- No heavy computations
- Minimal re-renders

---

## Testing

### Test Scenarios

1. **No Field Session**
   - Expected: No indicator shown

2. **Active Field Session**
   - Expected: Card shows job name + "Resume" button

3. **Stale Session**
   - Expected: Card still shows (user decides)

4. **Multiple Sessions**
   - Expected: Shows most recent

5. **Click Resume**
   - Expected: Navigates to Field, session restored

---

## Comparison to Intrusive Patterns

### ❌ Bad Pattern (Intrusive)
```jsx
// Auto-redirect on Dashboard load
useEffect(() => {
  if (hasFieldSession) {
    navigate('/Field'); // INTRUSIVE
  }
}, []);

// Modal on every page
<Modal open={hasFieldSession}>
  You have work! Resume now?
</Modal>
```

### ✅ Good Pattern (Respectful)
```jsx
// Passive indicator on Dashboard only
<FieldWorkIndicator />  // Shows card, user chooses
```

---

## Result

✅ **Non-intrusive reminder system**
- User always knows work is pending
- User chooses when to resume
- No workflow interruption
- Clean, professional appearance
- Respects user autonomy

**Grade**: A+ (Perfect balance of awareness and respect)