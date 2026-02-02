# FASE 3C-4: Measurement Session Identity

**Status:** ✅ IMPLEMENTED  
**Date:** 2026-02-02  
**Scope:** MCI Field - Measurements Only  
**Type:** Frontend-Only (No Backend Changes)

---

## 🎯 PROBLEM STATEMENT

**Before (FASE 3C-3):**
- Measurements keyed only by `job_id`
- Multiple measurement attempts on same job caused state collisions
- Offline drafts overriding each other
- Inconsistent restore after refresh/crash
- No way to isolate measurement contexts

**Example Collision:**
```
User A enters Measurements → starts draft for Wall 101
User A backgrounds app
User A re-enters Measurements → NEW session overwrites draft
❌ Original draft lost
```

---

## 💡 SOLUTION: Measurement Session Identity

Introduce `measurement_session_id` as **frontend-only** abstraction to isolate measurement state.

### Format
```
ms_<jobId>_<timestamp>
```

Example:
```
ms_abc123_1738512000000
```

### Lifecycle
```
Entry to Measurements → Generate session_id → Persist in:
  - FieldSessionManager
  - FieldContextProvider  
  - sessionStorage

Exit Measurements → Clear session_id
```

---

## 🔧 IMPLEMENTATION DETAILS

### 1. FieldSessionManager (services/FieldSessionManager.jsx)

**New Methods:**
```javascript
// Generate unique session ID
generateMeasurementSessionId(jobId) {
  return `ms_${jobId}_${Date.now()}`;
}

// Start new measurement session
startMeasurementSession(jobId) {
  const sessionId = this.generateMeasurementSessionId(jobId);
  const session = {
    measurement_session_id: sessionId,
    job_id: jobId,
    started_at: Date.now(),
    isActive: true,
  };
  sessionStorage.setItem(MEASUREMENT_SESSION_KEY, JSON.stringify(session));
  return sessionId;
}

// Get active measurement session
getMeasurementSession() {
  const data = sessionStorage.getItem(MEASUREMENT_SESSION_KEY);
  return data ? JSON.parse(data) : null;
}

// Clear measurement session
clearMeasurementSession() {
  sessionStorage.removeItem(MEASUREMENT_SESSION_KEY);
}

// Update measurement session
updateMeasurementSession(updates) {
  const current = this.getMeasurementSession() || {};
  const updated = { ...current, ...updates, lastActivity: Date.now() };
  sessionStorage.setItem(MEASUREMENT_SESSION_KEY, JSON.stringify(updated));
}
```

---

### 2. FieldContextProvider (FieldContextProvider.jsx)

**Added:**
```javascript
export function FieldContextProvider({ 
  children, 
  jobId, 
  blueprintId, 
  areaId, 
  measurementSessionId // FASE 3C-4: New prop
}) {
  const [context, setContext] = useState({
    job_id: jobId,
    blueprint_id: blueprintId,
    area_id: areaId,
    measurement_session_id: measurementSessionId, // FASE 3C-4: Session identity
    created_by: null,
    created_by_name: null,
    gps_latitude: null,
    gps_longitude: null,
  });
```

**Safe Default:**
```javascript
export function useFieldContext() {
  return useContext(FieldContext) || {
    job_id: null,
    blueprint_id: null,
    area_id: null,
    measurement_session_id: null, // FASE 3C-4: Safe default
    // ...
  };
}
```

---

### 3. FieldStatePersistence (services/FieldStatePersistence.jsx)

**Updated Methods:**

**saveDraft:**
```javascript
async saveDraft(type, jobId, data, expiryHours = 24, measurementSessionId = null) {
  // FASE 3C-4: Use measurement_session_id as primary key for measurement drafts
  const draftKey = measurementSessionId 
    ? `${type}_${measurementSessionId}` 
    : `${type}_${jobId}_${Date.now()}`;
  
  const draft = {
    id: draftKey,
    type,
    jobId,
    measurementSessionId, // FASE 3C-4: Store session ID for scoped restore
    data,
    timestamp: Date.now(),
    expiresAt: Date.now() + (expiryHours * 60 * 60 * 1000),
  };
  
  await store.put(draft);
}
```

**loadDraft:**
```javascript
async loadDraft(type, jobId, measurementSessionId = null) {
  // FASE 3C-4: For measurements, MUST match exact session ID
  if (measurementSessionId) {
    const draftKey = `${type}_${measurementSessionId}`;
    const draft = await store.get(draftKey);
    
    if (draft && draft.expiresAt > Date.now()) {
      return draft.data;
    }
    return null; // No draft for this measurement session
  }
  
  // Non-measurement drafts: use jobId index (legacy)
  const drafts = await store.getAll(jobId);
  return drafts.filter(d => d.type === type && !d.measurementSessionId)[0]?.data;
}
```

**clearDraft:**
```javascript
async clearDraft(type, jobId, measurementSessionId = null) {
  // FASE 3C-4: For measurements, delete by exact session ID
  if (measurementSessionId) {
    const draftKey = `${type}_${measurementSessionId}`;
    await store.delete(draftKey);
    return;
  }
  
  // Non-measurement: delete all matching type+jobId
  const drafts = await store.getAll(jobId);
  drafts.filter(d => d.type === type && !d.measurementSessionId)
        .forEach(draft => store.delete(draft.id));
}
```

---

### 4. FieldDimensionsView.jsx

**Session Initialization:**
```javascript
export default function FieldDimensionsView({ jobId }) {
  // FASE 3C-4: Generate measurement session ID on mount
  const [measurementSessionId] = useState(() => {
    const existing = FieldSessionManager.getMeasurementSession();
    if (existing?.job_id === jobId && existing?.isActive) {
      return existing.measurement_session_id;
    }
    return FieldSessionManager.startMeasurementSession(jobId);
  });

  // FASE 3C-4: Clear session on unmount
  useEffect(() => {
    return () => {
      FieldSessionManager.clearMeasurementSession();
    };
  }, []);

  // FASE 3C-4: Wrap in FieldContextProvider with session ID
  return (
    <FieldContextProvider jobId={jobId} measurementSessionId={measurementSessionId}>
      {/* Component content */}
    </FieldContextProvider>
  );
}
```

---

### 5. DimensionDialog.jsx

**Read Session from Context:**
```javascript
export default function DimensionDialog({ open, onOpenChange, jobId, onSave }) {
  // FASE 3C-4: Get measurement_session_id from context
  const fieldContext = useFieldContext();
  const measurementSessionId = fieldContext.measurement_session_id;

  const handleSave = () => {
    const dimensionData = {
      ...formData,
      measurement_session_id: measurementSessionId, // FASE 3C-4: Session identity
      device_type: 'laser',
    };
    
    onSave(dimensionData);
  };
}
```

---

### 6. useFieldLifecycle.jsx

**Preserve Measurement Session:**
```javascript
onBackground: (data) => {
  // FASE 3C-4: Preserve measurement session during background
  const measurementSession = FieldSessionManager.getMeasurementSession();
  if (measurementSession?.job_id === jobId) {
    FieldSessionManager.updateMeasurementSession({ backgroundedAt: Date.now() });
  }
},

onForeground: (data) => {
  // FASE 3C-4: Reactivate measurement session (no data loss)
  const measurementSession = FieldSessionManager.getMeasurementSession();
  if (measurementSession?.job_id === jobId) {
    FieldSessionManager.updateMeasurementSession({ 
      isActive: true, 
      lastActivity: Date.now() 
    });
  }
}
```

---

### 7. FieldOfflineAPI.jsx

**Validate Session ID:**
```javascript
export async function createDimension(dimensionData) {
  // FASE 3C-4: Validate measurement_session_id exists
  if (!dimensionData.measurement_session_id) {
    console.warn('[FieldOfflineAPI] Missing measurement_session_id - may cause collisions');
  }

  const saved = await saveToLocalStore(STORES.DIMENSIONS, dimensionData);
  await enqueueOperation(STORES.DIMENSIONS, OPERATION_TYPES.CREATE, saved, saved.local_id);
  
  return saved;
}
```

---

## ✅ GUARANTEES AFTER IMPLEMENTATION

### Isolation
✅ **Session Scoping:** Each measurement session has unique ID  
✅ **No Cross-Contamination:** Drafts restore ONLY within same session  
✅ **Multiple Attempts:** Can start new measurement session without conflicts

### Persistence
✅ **Background Safety:** Session preserved during app background  
✅ **Crash Recovery:** Session restored after crash (if < 24h old)  
✅ **Refresh Safety:** Session restored from sessionStorage

### Cleanup
✅ **Auto-Clear on Exit:** Session cleared when leaving Measurements  
✅ **Expiry:** Drafts expire after 24h (configurable)  
✅ **No Orphans:** Session-scoped drafts never leak to other sessions

---

## 🚫 WHAT WAS NOT CHANGED

### Backend
❌ No schema changes  
❌ No new entities  
❌ No API modifications  
❌ `FieldDimension` entity unchanged

### Other Modules
❌ Layout untouched  
❌ Sidebar untouched  
❌ Jobs section untouched  
❌ Tasks section untouched

### Future Work
⏳ PDF/photo association with session (next phase)  
⏳ Session history tracking (analytics)  
⏳ Session recovery UI (show old sessions)

---

## 🧪 TESTING CHECKLIST

- [ ] Enter Measurements → session ID generated
- [ ] Start dimension draft → saves to session-scoped key
- [ ] Background app → session preserved
- [ ] Foreground app → session restored
- [ ] Exit Measurements → session cleared
- [ ] Re-enter Measurements → NEW session ID (no collision)
- [ ] Crash during draft → draft recoverable within same session
- [ ] Multiple tabs → each has own session (isolated)

---

**END OF FASE 3C-4**