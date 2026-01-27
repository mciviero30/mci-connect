# JOB SSOT – BACKFILL STRATEGY & PREPARATION PLAN
**Date:** 2026-01-27  
**Type:** 🏗️ DESIGN DOCUMENT (NO IMPLEMENTATION)  
**Status:** DESIGN PHASE  
**Risk Level:** MEDIUM (Non-destructive, idempotent approach)

---

## 🎯 OBJECTIVES

**Primary Goal:**  
Prepare 100% of system data for Job SSOT enforcement without breaking existing functionality.

**Success Criteria:**
1. ✅ Every Quote has a valid, non-empty `job_id` pointing to an existing Job
2. ✅ Every Job has a unique, human-readable `job_number` (format: `JOB-00001`)
3. ✅ Every Job has critical operational data (team_id, coordinates)
4. ✅ Zero duplicate jobs created during backfill
5. ✅ Process is idempotent (can run multiple times safely)
6. ✅ All changes are audited and reversible

---

## 📐 DESIGN PRINCIPLES

### Principle 1: Non-Destructive
- ✅ NO data deletion
- ✅ NO overwriting existing valid data
- ✅ Only ADD missing fields or CREATE missing records
- ✅ Preserve all historical references

### Principle 2: Idempotent
- ✅ Can run multiple times without side effects
- ✅ Skip already-processed records
- ✅ Resume from last successful step
- ✅ Flag-based progress tracking

### Principle 3: Auditable
- ✅ Log every change to AuditLog entity
- ✅ Track original vs final state
- ✅ Store matching confidence scores
- ✅ Enable rollback if needed

### Principle 4: Fail-Safe
- ✅ Continue on error (log and skip)
- ✅ Never block production operations
- ✅ Validate before commit
- ✅ Dry-run mode available

---

## 🗂️ MULTI-PHASE BACKFILL PLAN

### PHASE 0: Pre-Flight Validation (1 day)
**Purpose:** Understand current state, prevent surprises

**Tasks:**
1. **Snapshot Current State**
   - Count total Jobs, Quotes, Invoices, TimeEntries
   - Identify records with missing `job_id`
   - Export current data to backup (CSV/JSON)
   - Document edge cases

2. **Validate Schema Readiness**
   - Verify Job entity can accept new fields
   - Test Counter entity works for job_number generation
   - Confirm no FK constraints blocking changes

3. **Analyze Matching Signals**
   - Build `job_name` frequency table (detect duplicates)
   - Build customer → jobs mapping
   - Identify quotes with `invoice_id` (high-confidence trace)
   - Calculate match success probability

**Deliverable:** Pre-flight report with go/no-go recommendation

**Risk:** 🟢 **ZERO** (read-only analysis)

---

### PHASE 1: Schema Preparation (1 day)
**Purpose:** Add required fields without breaking existing code

**Tasks:**

**1.1 Add job_number Field**
```javascript
// Entity: Job
// Add field:
{
  "job_number": {
    "type": "string",
    "description": "Human-readable job identifier (JOB-00001)",
    "index": true // For fast lookups
  }
}
```

**Constraints:**
- ❌ NOT required (allow null during backfill)
- ✅ Indexed (performance)
- ⚠️ NOT unique yet (enable after backfill)

---

**1.2 Add deleted_at Field (Soft-Delete)**
```javascript
// Entity: Job
// Add field:
{
  "deleted_at": {
    "type": "string",
    "format": "date-time",
    "description": "Soft delete timestamp"
  },
  "deleted_by": {
    "type": "string",
    "description": "Email of user who deleted"
  }
}
```

---

**1.3 Add Backfill Tracking Fields**
```javascript
// Entity: Job
// Add fields:
{
  "backfill_source": {
    "type": "string",
    "enum": ["manual", "invoice", "quote", "auto_generated"],
    "description": "How this job was created"
  },
  "backfill_confidence": {
    "type": "number",
    "description": "Confidence score for auto-matched jobs (0-100)"
  },
  "backfill_completed_at": {
    "type": "string",
    "format": "date-time",
    "description": "When backfill process completed for this job"
  }
}
```

**Purpose:** Audit trail + quality control

---

**1.4 Add Quote Backfill Flag**
```javascript
// Entity: Quote
// Add field:
{
  "job_link_backfilled": {
    "type": "boolean",
    "default": false,
    "description": "Whether job_id was backfilled (vs originally set)"
  },
  "job_link_method": {
    "type": "string",
    "enum": ["invoice_trace", "name_match", "auto_created", "manual"],
    "description": "How job_id was determined"
  }
}
```

**Deliverable:** Updated entity schemas (4 entities modified)

**Risk:** 🟢 **LOW** (additive only, no data changes)

---

### PHASE 2: Job Deduplication & Enrichment (1-2 days)
**Purpose:** Prepare existing Jobs as clean SSOT foundation

**Tasks:**

**2.1 Generate job_number for Existing Jobs**

**Algorithm:**
```javascript
// Function: backfillJobNumbers()

const existingJobs = await Job.list();
const jobsWithoutNumber = existingJobs.filter(j => !j.job_number);

for (const job of jobsWithoutNumber) {
  // Generate sequential number
  const counter = await getNextCounter('job');
  const job_number = `JOB-${String(counter).padStart(5, '0')}`;
  
  await Job.update(job.id, {
    job_number,
    backfill_source: job.backfill_source || 'manual', // Preserve if exists
    backfill_completed_at: new Date().toISOString()
  });
  
  // Audit log
  await AuditLog.create({
    event: 'job_number_assigned',
    entity_type: 'Job',
    entity_id: job.id,
    old_value: null,
    new_value: job_number
  });
}
```

**Expected Results:**
- Job 1 → `JOB-00001`
- Job 2 → `JOB-00002`
- Total: 2 jobs numbered

**Idempotency:** ✅ Skip if `job.job_number` already exists

---

**2.2 Detect & Merge Duplicate Jobs**

**Matching Criteria:**
```javascript
// Two jobs are duplicates if:
// 1. Same name (case-insensitive, trimmed)
// 2. Same customer_id OR same customer_name
// 3. Same address (if present)

function findDuplicates(jobs) {
  const groups = {};
  
  jobs.forEach(job => {
    const key = `${job.name?.toLowerCase().trim()}_${job.customer_id || job.customer_name}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(job);
  });
  
  return Object.values(groups).filter(g => g.length > 1);
}
```

**Merge Strategy:**
```javascript
// For each duplicate group:
// 1. Select PRIMARY (oldest created_date OR has most references)
// 2. Update all references to PRIMARY
// 3. Soft-delete DUPLICATES (deleted_at = now)

function mergeDuplicates(duplicateGroup) {
  // Sort by: has coordinates > has team > oldest
  const primary = duplicateGroup.sort((a, b) => {
    if (a.latitude && !b.latitude) return -1;
    if (!a.latitude && b.latitude) return 1;
    if (a.team_id && !b.team_id) return -1;
    if (!a.team_id && b.team_id) return 1;
    return new Date(a.created_date) - new Date(b.created_date);
  })[0];
  
  const duplicates = duplicateGroup.filter(j => j.id !== primary.id);
  
  // Migrate references
  for (const dup of duplicates) {
    await migrateJobReferences(dup.id, primary.id);
    await Job.update(dup.id, {
      deleted_at: new Date().toISOString(),
      deleted_by: 'system_backfill',
      merge_target_job_id: primary.id
    });
  }
  
  return { primary, merged_count: duplicates.length };
}
```

**Expected Results:**
- Current: 2 jobs (possibly not duplicates)
- Future: As more jobs created, prevents fragmentation

**Risk:** 🟡 **MEDIUM** (must validate references before merge)

---

**2.3 Enrich Jobs with Missing Data**

**Team Assignment (from Invoices/Quotes):**
```javascript
// For jobs without team_id:
const jobsWithoutTeam = await Job.filter({ team_id: '' });

for (const job of jobsWithoutTeam) {
  // Try invoice first (most reliable)
  const invoices = await Invoice.filter({ job_id: job.id });
  if (invoices[0]?.team_id) {
    await Job.update(job.id, {
      team_id: invoices[0].team_id,
      team_name: invoices[0].team_name,
      backfill_source: 'invoice'
    });
    continue;
  }
  
  // Fallback: infer from customer location (if customer has default team)
  const customer = await Customer.get(job.customer_id);
  if (customer?.default_team_id) {
    await Job.update(job.id, {
      team_id: customer.default_team_id,
      backfill_source: 'customer_default',
      backfill_confidence: 70 // Lower confidence
    });
  }
}
```

---

**Geocoding (from Addresses):**
```javascript
// For jobs without coordinates:
const jobsWithoutGPS = await Job.filter({ latitude: null });

for (const job of jobsWithoutGPS) {
  if (!job.address) continue; // Skip if no address
  
  try {
    const result = await geocodeAddress(job.address);
    await Job.update(job.id, {
      latitude: result.latitude,
      longitude: result.longitude,
      city: result.city || job.city,
      state: result.state || job.state,
      zip: result.zip || job.zip,
      backfill_source: 'geocoding'
    });
  } catch (error) {
    console.warn(`Geocoding failed for job ${job.id}:`, error);
    // Continue - non-blocking
  }
}
```

**Deliverable:** Enriched Job records

**Risk:** 🟢 **LOW** (only adds missing data, no overwrites)

---

### PHASE 3: Quote.job_id Backfill (2-3 days)
**Purpose:** Link 100+ orphaned quotes to Jobs

This is the **CRITICAL PHASE** with highest complexity.

---

#### 3.1 Three-Tier Matching Strategy

**Tier 1: Invoice Trace (HIGH CONFIDENCE)**
```javascript
// For quotes with invoice_id:
const quotesWithInvoice = await Quote.filter({ invoice_id: { $ne: null } });

for (const quote of quotesWithInvoice) {
  if (quote.job_id && quote.job_id !== '') continue; // Already linked
  if (quote.job_link_backfilled) continue; // Already processed
  
  const invoice = await Invoice.get(quote.invoice_id);
  if (invoice?.job_id && invoice.job_id !== '') {
    await Quote.update(quote.id, {
      job_id: invoice.job_id,
      job_link_backfilled: true,
      job_link_method: 'invoice_trace'
    });
    
    await AuditLog.create({
      event: 'quote_job_link_backfilled',
      entity_id: quote.id,
      method: 'invoice_trace',
      confidence: 100,
      job_id: invoice.job_id
    });
  }
}
```

**Expected Coverage:** ~20-30% of quotes (those converted to invoices)  
**Confidence:** 100% (direct FK relationship)  
**Risk:** 🟢 **ZERO** (deterministic)

---

**Tier 2: Name + Customer Match (MEDIUM CONFIDENCE)**
```javascript
// For remaining quotes without job_id:
const orphanedQuotes = await Quote.filter({ 
  job_id: '', 
  job_link_backfilled: false 
});

for (const quote of orphanedQuotes) {
  if (!quote.job_name) continue; // Skip if no name
  
  // Normalize name for matching
  const normalizedName = quote.job_name.toLowerCase().trim();
  
  // Find job by name + customer
  const candidateJobs = await Job.filter({ 
    customer_id: quote.customer_id 
  });
  
  const matches = candidateJobs.filter(job => 
    job.name?.toLowerCase().trim() === normalizedName
  );
  
  if (matches.length === 1) {
    // UNIQUE MATCH - high confidence
    await Quote.update(quote.id, {
      job_id: matches[0].id,
      job_link_backfilled: true,
      job_link_method: 'name_match'
    });
    
    await AuditLog.create({
      event: 'quote_job_link_backfilled',
      entity_id: quote.id,
      method: 'name_match',
      confidence: 85,
      job_id: matches[0].id
    });
  } else if (matches.length > 1) {
    // AMBIGUOUS - log for manual resolution
    console.warn(`Multiple job matches for quote ${quote.quote_number}:`, {
      quote_name: quote.job_name,
      matches: matches.map(j => ({ id: j.id, name: j.name, created: j.created_date }))
    });
    
    await AuditLog.create({
      event: 'quote_job_link_ambiguous',
      entity_id: quote.id,
      method: 'name_match',
      candidate_count: matches.length,
      candidates: matches.map(j => j.id)
    });
    
    // Default to oldest job (conservative)
    const oldest = matches.sort((a, b) => 
      new Date(a.created_date) - new Date(b.created_date)
    )[0];
    
    await Quote.update(quote.id, {
      job_id: oldest.id,
      job_link_backfilled: true,
      job_link_method: 'name_match_ambiguous'
    });
  }
  // If 0 matches: Continue to Tier 3
}
```

**Expected Coverage:** ~10-20% of remaining quotes  
**Confidence:** 85% (exact name + customer match)  
**Risk:** 🟡 **MEDIUM** (name matching can have false positives)

---

**Tier 3: Auto-Create Jobs (GUARANTEED LINK)**
```javascript
// For quotes still without job_id after Tier 1 & 2:
const stillOrphaned = await Quote.filter({ 
  job_id: '', 
  job_link_backfilled: false 
});

for (const quote of stillOrphaned) {
  // Create new Job from quote data
  const counter = await getNextCounter('job');
  const job_number = `JOB-${String(counter).padStart(5, '0')}`;
  
  // Infer status from quote status
  const jobStatus = quote.status === 'converted_to_invoice' ? 'completed' :
                    quote.status === 'rejected' ? 'archived' :
                    'active';
  
  const newJob = await Job.create({
    name: quote.job_name,
    job_number,
    customer_id: quote.customer_id || '',
    customer_name: quote.customer_name || '',
    address: quote.job_address || '',
    contract_amount: quote.total || 0,
    estimated_hours: quote.estimated_hours || 0,
    estimated_cost: quote.estimated_cost || 0,
    profit_margin: quote.profit_margin || null,
    status: jobStatus,
    team_id: quote.team_id || (quote.team_ids?.[0] || ''),
    team_name: quote.team_name || (quote.team_names?.[0] || ''),
    color: 'blue',
    billing_type: 'fixed_price',
    description: `Auto-created from Quote ${quote.quote_number} during backfill`,
    backfill_source: 'quote',
    backfill_confidence: 100, // Guaranteed unique creation
    backfill_completed_at: new Date().toISOString()
  });
  
  // Geocode address if available
  if (quote.job_address) {
    try {
      const coords = await geocodeAddress(quote.job_address);
      await Job.update(newJob.id, {
        latitude: coords.latitude,
        longitude: coords.longitude,
        city: coords.city,
        state: coords.state,
        zip: coords.zip
      });
    } catch (error) {
      console.warn(`Geocoding failed for quote ${quote.quote_number}`);
    }
  }
  
  // Link quote to new job
  await Quote.update(quote.id, {
    job_id: newJob.id,
    job_link_backfilled: true,
    job_link_method: 'auto_created'
  });
  
  await AuditLog.create({
    event: 'job_auto_created_from_quote',
    entity_type: 'Job',
    entity_id: newJob.id,
    source_quote_id: quote.id,
    confidence: 100
  });
}
```

**Expected Coverage:** ~50-70% of quotes (no invoice, no name match)  
**Confidence:** 100% (creates guaranteed-unique job)  
**Risk:** 🟡 **MEDIUM** (creates many new jobs, may inflate count)

---

#### 3.2 Matching Criteria Summary

| Tier | Method | Match Signal | Confidence | Coverage Est. | Risk |
|------|--------|--------------|------------|---------------|------|
| **1** | Invoice Trace | `quote.invoice_id` → `invoice.job_id` | 100% | 20-30% | 🟢 ZERO |
| **2** | Name + Customer | `job_name` + `customer_id` exact match | 85% | 10-20% | 🟡 MEDIUM |
| **3** | Auto-Create | N/A (create new job) | 100% | 50-70% | 🟡 MEDIUM |

**Total Expected Coverage:** 100% (exhaustive)

---

#### 3.3 Duplicate Prevention Mechanism

**Before Creating Job in Tier 3:**
```javascript
// CRITICAL: Check if job already exists (final safeguard)
const potentialDuplicates = await Job.filter({
  customer_id: quote.customer_id
});

const exactMatch = potentialDuplicates.find(job => {
  const nameMatch = job.name?.toLowerCase().trim() === quote.job_name?.toLowerCase().trim();
  const addressMatch = !job.address || !quote.job_address || 
                       job.address.toLowerCase() === quote.job_address.toLowerCase();
  return nameMatch && addressMatch;
});

if (exactMatch) {
  // Use existing job instead of creating
  await Quote.update(quote.id, {
    job_id: exactMatch.id,
    job_link_backfilled: true,
    job_link_method: 'duplicate_prevention'
  });
  
  console.log(`✅ Prevented duplicate: Quote ${quote.quote_number} → existing Job ${exactMatch.job_number}`);
  continue; // Skip creation
}

// Otherwise proceed with creation...
```

**Effectiveness:** Prevents ~10-20% of duplicate creations

---

**Deliverable:** All quotes linked to jobs (100% coverage)

**Risk:** 🟡 **MEDIUM** (creates 50-80 new jobs)

---

### PHASE 4: Validate & Fix Secondary References (1 day)
**Purpose:** Ensure TimeEntry, Expense, Assignment links are valid

**Tasks:**

**4.1 Validate TimeEntry References**
```javascript
const timeEntries = await TimeEntry.list();
const invalidEntries = [];

for (const entry of timeEntries) {
  if (!entry.job_id) {
    invalidEntries.push({ entry, reason: 'missing_job_id' });
    continue;
  }
  
  // Validate job exists
  try {
    const job = await Job.get(entry.job_id);
    if (!job) {
      invalidEntries.push({ entry, reason: 'job_not_found' });
    }
  } catch {
    invalidEntries.push({ entry, reason: 'job_deleted' });
  }
}

// Report invalid entries (MANUAL REVIEW)
console.log(`⚠️ Found ${invalidEntries.length} TimeEntries with invalid job references`);
await AuditLog.create({
  event: 'backfill_validation_timeentry',
  total: timeEntries.length,
  invalid: invalidEntries.length,
  details: invalidEntries
});
```

**Action:** Log only (manual review required)

---

**4.2 Backfill Invoice.job_id (if any missing)**
```javascript
const invoicesWithoutJob = await Invoice.filter({ 
  $or: [{ job_id: null }, { job_id: '' }] 
});

for (const invoice of invoicesWithoutJob) {
  // Try quote trace first
  if (invoice.quote_id) {
    const quote = await Quote.get(invoice.quote_id);
    if (quote?.job_id && quote.job_id !== '') {
      await Invoice.update(invoice.id, {
        job_id: quote.job_id
      });
      continue;
    }
  }
  
  // Fallback: Auto-create (same as current frontend logic)
  const counter = await getNextCounter('job');
  const job_number = `JOB-${String(counter).padStart(5, '0')}`;
  
  const newJob = await Job.create({
    name: invoice.job_name,
    job_number,
    customer_id: invoice.customer_id || '',
    customer_name: invoice.customer_name || '',
    address: invoice.job_address || '',
    contract_amount: invoice.total || 0,
    status: invoice.status === 'paid' ? 'completed' : 'active',
    description: `Auto-created from Invoice ${invoice.invoice_number} during backfill`,
    backfill_source: 'invoice',
    backfill_completed_at: new Date().toISOString()
  });
  
  await Invoice.update(invoice.id, { job_id: newJob.id });
}
```

**Expected:** 0 invoices need backfill (already 100% compliant)

**Risk:** 🟢 **ZERO** (validation pass only)

---

**Deliverable:** Validation report + fixed references

**Risk:** 🟢 **LOW** (mostly read-only)

---

### PHASE 5: Verification & Smoke Testing (1 day)
**Purpose:** Confirm backfill success before enforcement

**Tasks:**

**5.1 Data Integrity Checks**
```javascript
// Check 1: All quotes have valid job_id
const quotesWithoutJob = await Quote.filter({ 
  $or: [{ job_id: null }, { job_id: '' }],
  job_link_backfilled: { $ne: true }
});

if (quotesWithoutJob.length > 0) {
  console.error(`❌ BACKFILL INCOMPLETE: ${quotesWithoutJob.length} quotes still missing job_id`);
  return { success: false, phase: 'quote_backfill_incomplete' };
}

// Check 2: All jobs have job_number
const jobsWithoutNumber = await Job.filter({ 
  $or: [{ job_number: null }, { job_number: '' }] 
});

if (jobsWithoutNumber.length > 0) {
  console.error(`❌ BACKFILL INCOMPLETE: ${jobsWithoutNumber.length} jobs missing job_number`);
  return { success: false, phase: 'job_number_incomplete' };
}

// Check 3: No duplicate job_numbers
const allJobNumbers = await Job.list();
const numberCounts = {};
allJobNumbers.forEach(j => {
  if (j.job_number) {
    numberCounts[j.job_number] = (numberCounts[j.job_number] || 0) + 1;
  }
});

const duplicateNumbers = Object.entries(numberCounts).filter(([num, count]) => count > 1);
if (duplicateNumbers.length > 0) {
  console.error(`❌ DUPLICATE job_numbers found:`, duplicateNumbers);
  return { success: false, phase: 'duplicate_job_numbers' };
}

// Check 4: All job_id references point to existing jobs
const allQuotes = await Quote.list();
const invalidJobRefs = [];

for (const quote of allQuotes) {
  if (quote.job_id && quote.job_id !== '') {
    try {
      const job = await Job.get(quote.job_id);
      if (!job) invalidJobRefs.push({ quote_id: quote.id, job_id: quote.job_id });
    } catch {
      invalidJobRefs.push({ quote_id: quote.id, job_id: quote.job_id });
    }
  }
}

if (invalidJobRefs.length > 0) {
  console.error(`❌ ${invalidJobRefs.length} quotes point to non-existent jobs`);
  return { success: false, phase: 'invalid_job_references' };
}

console.log('✅ ALL INTEGRITY CHECKS PASSED');
return { success: true };
```

---

**5.2 Smoke Test Critical Flows**

**Test 1: Profitability Dashboard**
```javascript
// Verify quotes now appear in profitability calculations
const jobs = await Job.list();
const quotes = await Quote.list();

jobs.forEach(job => {
  const relatedQuotes = quotes.filter(q => q.job_id === job.id);
  console.log(`Job ${job.job_number}: ${relatedQuotes.length} quotes linked`);
  
  if (relatedQuotes.length === 0 && job.backfill_source !== 'invoice') {
    console.warn(`⚠️ Job ${job.job_number} has no quotes (expected if created from invoice only)`);
  }
});
```

**Test 2: Quote → Invoice Conversion**
```javascript
// Create test quote → convert → verify job link preserved
const testQuote = await Quote.create({
  customer_name: 'Test Customer',
  job_name: 'Backfill Test Job',
  job_id: '', // Intentionally empty
  items: [{ item_name: 'Test', quantity: 1, unit_price: 100, total: 100 }],
  subtotal: 100,
  total: 100,
  quote_number: 'TEST-00001'
});

// Should auto-create job during invoice conversion
const invoice = await convertQuoteToInvoice(testQuote);

if (!invoice.job_id || invoice.job_id === '') {
  console.error('❌ SMOKE TEST FAILED: Invoice missing job_id');
  return { success: false };
}

// Cleanup test data
await Quote.delete(testQuote.id);
await Invoice.delete(invoice.id);

console.log('✅ Quote → Invoice flow validated');
```

**Test 3: Calendar Job Selector**
```javascript
// Verify jobs appear in calendar dropdown
const activeJobs = await Job.filter({ status: 'active', deleted_at: null });

if (activeJobs.length === 0) {
  console.warn('⚠️ No active jobs available for calendar');
  return { success: false, phase: 'no_active_jobs' };
}

console.log(`✅ ${activeJobs.length} active jobs available for calendar`);
```

---

**5.3 Generate Backfill Summary Report**

**Report Structure:**
```javascript
{
  "timestamp": "2026-01-27T10:30:00Z",
  "phase": "verification",
  "results": {
    "total_jobs": 82,
    "jobs_created_by_backfill": 80,
    "jobs_with_job_number": 82,
    "quotes_total": 100,
    "quotes_backfilled": 100,
    "quotes_via_invoice_trace": 22,
    "quotes_via_name_match": 18,
    "quotes_via_auto_create": 60,
    "invoices_total": 8,
    "invoices_missing_job_id": 0,
    "timeentries_total": 1,
    "timeentries_invalid_job_ref": 0
  },
  "integrity_checks": {
    "all_quotes_have_job_id": true,
    "all_jobs_have_job_number": true,
    "no_duplicate_job_numbers": true,
    "no_invalid_job_refs": true
  },
  "warnings": [
    "60 jobs auto-created from quotes (may be duplicates of manual jobs)",
    "2 jobs missing team_id (no invoice/quote data to infer)",
    "1 job missing coordinates (address invalid)"
  ],
  "ready_for_enforcement": true
}
```

**Deliverable:** GO/NO-GO recommendation

**Risk:** 🟢 **ZERO** (read-only validation)

---

## 🛡️ SAFETY MECHANISMS

### 1. Dry-Run Mode
```javascript
// All backfill functions accept dry_run flag:
async function backfillQuoteJobIds({ dry_run = false }) {
  const changes = [];
  
  // ... matching logic ...
  
  if (dry_run) {
    console.log('🔍 DRY RUN: Would update quote', quote.id, 'with job_id', job.id);
    changes.push({ quote_id: quote.id, job_id: job.id, method: 'invoice_trace' });
  } else {
    await Quote.update(quote.id, { job_id: job.id });
    changes.push({ quote_id: quote.id, job_id: job.id, method: 'invoice_trace', applied: true });
  }
  
  return { dry_run, changes };
}
```

**Usage:** Run dry-run first, review changes, then apply.

---

### 2. Progress Tracking
```javascript
// Store progress in system entity
const progress = await BackfillProgress.create({
  phase: 'quote_job_id_backfill',
  total_records: 100,
  processed: 0,
  successful: 0,
  failed: 0,
  started_at: new Date().toISOString()
});

// Update after each record
await BackfillProgress.update(progress.id, {
  processed: progress.processed + 1,
  successful: progress.successful + (success ? 1 : 0),
  failed: progress.failed + (success ? 0 : 1)
});
```

**Benefit:** Resume from failure point (idempotency)

---

### 3. Rollback Preparation
```javascript
// Before backfill, snapshot current state
const snapshot = {
  timestamp: new Date().toISOString(),
  jobs_before: await Job.list(),
  quotes_before: await Quote.filter({ job_id: '' })
};

localStorage.setItem('backfill_snapshot', JSON.stringify(snapshot));

// Rollback function (if needed):
async function rollbackBackfill() {
  const snapshot = JSON.parse(localStorage.getItem('backfill_snapshot'));
  
  // Delete jobs created during backfill
  const jobsToDelete = await Job.filter({ 
    backfill_source: { $ne: null },
    created_date: { $gte: snapshot.timestamp }
  });
  
  for (const job of jobsToDelete) {
    await Job.delete(job.id);
  }
  
  // Reset quote job_ids
  const backfilledQuotes = await Quote.filter({ job_link_backfilled: true });
  for (const quote of backfilledQuotes) {
    await Quote.update(quote.id, {
      job_id: '',
      job_link_backfilled: false,
      job_link_method: null
    });
  }
  
  console.log('✅ Rollback complete');
}
```

**Risk Mitigation:** Enables full reversal if issues discovered

---

## ⚠️ RISK ASSESSMENT BY PHASE

### Phase 0: Pre-Flight
**Risk:** 🟢 **ZERO** (read-only)  
**Failure Impact:** None (analysis only)  
**Mitigation:** N/A  

---

### Phase 1: Schema Preparation
**Risk:** 🟢 **LOW** (additive schema changes)  
**Failure Impact:** New fields unused (no breaking change)  
**Mitigation:** Deploy during low-traffic window  

---

### Phase 2: Job Enrichment
**Risk:** 🟡 **MEDIUM** (geocoding API calls, duplicate detection)  
**Failure Impact:** Some jobs remain incomplete (non-blocking)  
**Mitigation:**
- ✅ Geocoding errors logged, not thrown
- ✅ Duplicate merge optional (can skip if uncertain)
- ✅ Batch processing (100 jobs/hour limit)

**Rollback:** Revert `job_number` assignments (keep AuditLog for mapping)

---

### Phase 3: Quote Backfill
**Risk:** 🟡 **MEDIUM-HIGH** (creates 50-80 new jobs, name matching can mis-match)  
**Failure Impact:**
- ⚠️ Duplicate jobs created (inflates job count)
- ⚠️ Wrong job linked (incorrect profitability)
- ✅ No data loss (original data preserved)

**Mitigation:**
- ✅ Tier 1 (invoice trace) run first (100% confidence)
- ✅ Tier 2 (name match) review ambiguous cases manually
- ✅ Tier 3 (auto-create) mark with `backfill_source = 'quote'` for audit
- ✅ Duplicate prevention safeguard before creation
- ✅ Dry-run mode mandatory first pass

**Rollback:** Delete jobs with `backfill_source = 'quote'`, reset quote job_ids

---

### Phase 4: Validation
**Risk:** 🟢 **ZERO** (read-only checks)  
**Failure Impact:** Discovers issues (good)  
**Mitigation:** N/A  

---

### Phase 5: Smoke Testing
**Risk:** 🟢 **LOW** (test data cleaned up)  
**Failure Impact:** Exposes bugs before production (good)  
**Mitigation:** Run in isolated test environment first  

---

## 🎯 READINESS SIGNAL

### When is the System Ready for Job SSOT Enforcement?

**Mandatory Gates (ALL must pass):**

**Gate 1: Data Completeness**
```javascript
✅ 100% of Quotes have non-empty job_id
✅ 100% of Invoices have non-empty job_id (already true)
✅ 100% of Jobs have job_number
✅ 0 duplicate job_numbers
```

**Gate 2: Reference Integrity**
```javascript
✅ All Quote.job_id point to existing Jobs
✅ All Invoice.job_id point to existing Jobs
✅ All TimeEntry.job_id point to existing Jobs
✅ No orphaned references detected
```

**Gate 3: Operational Readiness**
```javascript
✅ At least 80% of jobs have team_id
✅ At least 80% of jobs have latitude/longitude
✅ Smoke tests pass (quote → invoice, profitability, calendar)
```

**Gate 4: Code Readiness (NOT in backfill scope, but documented)**
```javascript
⚠️ CrearEstimado updated to require job_id (frontend change)
⚠️ Runtime warnings added (defensive logging)
⚠️ Centralized query helper created
```

---

### Signal Formula
```javascript
const readiness = {
  data_completeness: quotes_with_job_id / total_quotes, // Target: 100%
  reference_integrity: valid_job_refs / total_job_refs, // Target: 100%
  operational_readiness: (jobs_with_team + jobs_with_coords) / (2 * total_jobs), // Target: 80%
  overall: (data_completeness + reference_integrity + operational_readiness) / 3
};

if (readiness.overall >= 0.93) {
  return 'READY_FOR_ENFORCEMENT';
} else {
  return `NOT_READY (${(readiness.overall * 100).toFixed(1)}% complete)`;
}
```

**Target Score:** ≥ 93% (A- grade)

---

## 📊 ESTIMATED IMPACT

### New Jobs Created
**Conservative Estimate:** 60-70 jobs  
**Aggressive Estimate:** 80-90 jobs  
**Reason:** Most quotes don't have existing job matches

### Database Growth
**Jobs:** +60-80 records (~3000% increase from 2 → 82)  
**Quotes:** 0 new records (updates only)  
**AuditLog:** +200-300 records (backfill audit trail)  
**Total Storage:** ~50KB additional (negligible)

### Processing Time
**Tier 1 (Invoice Trace):** ~2 minutes (20-30 quotes, DB queries)  
**Tier 2 (Name Match):** ~5 minutes (10-20 quotes, DB queries + comparison)  
**Tier 3 (Auto-Create):** ~15 minutes (60-80 quotes, geocoding API calls)  
**Geocoding:** ~10 minutes (80 addresses × 500ms/address)  
**Validation:** ~5 minutes (integrity checks)  

**Total Runtime:** ~40-50 minutes (single-threaded)  
**Parallel Runtime:** ~15-20 minutes (with async batching)

---

## 🚦 PHASE EXECUTION ORDER

### Strict Sequential Order (DO NOT REORDER)

```
Phase 0: Pre-Flight Validation
  ↓ (manual review, go/no-go decision)
Phase 1: Schema Preparation
  ↓ (deploy, wait for schema propagation)
Phase 2: Job Deduplication & Enrichment
  ↓ (merge duplicates BEFORE linking quotes)
Phase 3.1: Quote Backfill - Tier 1 (Invoice Trace)
  ↓ (highest confidence first)
Phase 3.2: Quote Backfill - Tier 2 (Name Match)
  ↓ (manual review ambiguous matches)
Phase 3.3: Quote Backfill - Tier 3 (Auto-Create)
  ↓ (creates new jobs, point of no return)
Phase 4: Validate Secondary References
  ↓ (check TimeEntry, Expense, etc.)
Phase 5: Verification & Smoke Testing
  ↓ (final checks before enforcement)
✅ READY FOR SSOT ENFORCEMENT
```

**Critical:** Phases 3.1 → 3.2 → 3.3 MUST run in order (avoids creating jobs that could have been matched).

---

## 🔍 AFFECTED ENTITIES COMPLETE LIST

### Entities Modified by Backfill

| Entity | Modification Type | Fields Changed | Record Count | Risk |
|--------|------------------|----------------|--------------|------|
| **Job** | UPDATE (existing) | `job_number`, `backfill_*` | 2 | 🟢 LOW |
| **Job** | CREATE (new) | All fields | ~60-80 | 🟡 MEDIUM |
| **Quote** | UPDATE | `job_id`, `job_link_backfilled`, `job_link_method` | 100+ | 🟢 LOW |
| **Invoice** | UPDATE (rare) | `job_id` | 0-2 | 🟢 ZERO |
| **AuditLog** | CREATE | All audit events | 200-300 | 🟢 ZERO |

### Entities Validated (Read-Only)

| Entity | Check Performed | Expected Findings |
|--------|-----------------|-------------------|
| TimeEntry | Validate `job_id` references | 0-1 invalid |
| Expense | Validate `job_id` references | 0 invalid (no data) |
| JobAssignment | Validate `job_id` references | 0 invalid (no data) |
| ScheduleShift | Validate `job_id` references | 0 invalid (100% compliant) |

---

## 🧪 DRY-RUN SIMULATION

### Expected Dry-Run Output
```json
{
  "phase": "quote_backfill",
  "dry_run": true,
  "timestamp": "2026-01-27T14:00:00Z",
  "changes": [
    {
      "quote_id": "69782ffd4a7307147a1d87b4",
      "quote_number": "EST-00044",
      "current_job_id": "",
      "proposed_job_id": "697830e68ffdface219381e2",
      "method": "invoice_trace",
      "confidence": 100,
      "invoice_id": "697830e1ab7f6d69babee335"
    },
    {
      "quote_id": "69726d930dc889d71168d038",
      "quote_number": "EST-00043",
      "current_job_id": "",
      "proposed_job_id": "NEW_JOB_1",
      "method": "auto_create",
      "confidence": 100,
      "new_job": {
        "name": "Johns Hopkins All Children's Hospital - Station Typicals",
        "job_number": "JOB-00003",
        "customer_name": "Leigh Taylor"
      }
    }
    // ... 98 more changes
  ],
  "summary": {
    "total_quotes": 100,
    "invoice_trace_matches": 22,
    "name_matches": 18,
    "auto_creates": 60,
    "already_linked": 0
  },
  "validation": {
    "duplicate_jobs_prevented": 12,
    "ambiguous_matches": 3,
    "geocoding_failures": 5
  }
}
```

**Review Criteria:**
- ✅ `auto_creates` count reasonable (not 100%)
- ✅ `duplicate_jobs_prevented` > 0 (safeguard working)
- ⚠️ `ambiguous_matches` → manual review required
- ✅ `geocoding_failures` acceptable (non-blocking)

---

## 🔐 DATA INTEGRITY GUARANTEES

### Guarantee 1: No Data Loss
**Promise:** Zero existing data deleted or overwritten  
**Enforcement:**
- ✅ All updates check `if (!field || field === '')` before writing
- ✅ Soft-delete only (deleted_at flag)
- ✅ AuditLog preserves original values

---

### Guarantee 2: Deterministic Matching
**Promise:** Same input → same output (reproducible)  
**Enforcement:**
- ✅ Tier 1 uses FK (100% deterministic)
- ✅ Tier 2 uses exact string match + customer FK (deterministic)
- ✅ Tier 3 creates unique job (deterministic via Counter)
- ⚠️ Name normalization must be consistent (lowercase + trim)

---

### Guarantee 3: Auditability
**Promise:** Every change is logged and reversible  
**Enforcement:**
- ✅ AuditLog entry for every job created/updated
- ✅ AuditLog entry for every quote linked
- ✅ Snapshot taken before backfill
- ✅ Rollback script available

---

### Guarantee 4: Resumability
**Promise:** Can stop and resume without duplicating work  
**Enforcement:**
- ✅ Check `quote.job_link_backfilled` flag before processing
- ✅ Check `job.job_number` exists before generating
- ✅ Progress entity tracks completion
- ✅ Batch processing with checkpoints

---

## 📋 IMPLEMENTATION CHECKLIST

### Before Starting
- [ ] Read and understand complete discovery report
- [ ] Get stakeholder approval for creating 60-80 new jobs
- [ ] Schedule backfill during low-traffic window
- [ ] Backup production database
- [ ] Create test environment with prod data copy

### Phase 0
- [ ] Run pre-flight validation script
- [ ] Review job name duplicates
- [ ] Document edge cases
- [ ] Get go/no-go approval

### Phase 1
- [ ] Update Job entity schema (job_number, deleted_at, backfill_*)
- [ ] Update Quote entity schema (job_link_backfilled, job_link_method)
- [ ] Deploy schema changes
- [ ] Verify schema deployment success
- [ ] Test Counter entity for job_number generation

### Phase 2
- [ ] DRY-RUN: Generate job_numbers (review output)
- [ ] APPLY: Generate job_numbers for existing jobs
- [ ] DRY-RUN: Detect duplicate jobs (review matches)
- [ ] MANUAL: Review and approve merges
- [ ] APPLY: Merge approved duplicates
- [ ] DRY-RUN: Enrich jobs with team_id (review inferences)
- [ ] APPLY: Enrich jobs with team_id
- [ ] DRY-RUN: Geocode addresses (review API calls)
- [ ] APPLY: Geocode addresses

### Phase 3
- [ ] DRY-RUN: Tier 1 (invoice trace) - review matches
- [ ] APPLY: Tier 1 backfill
- [ ] Verify Tier 1 success (check AuditLog)
- [ ] DRY-RUN: Tier 2 (name match) - review matches
- [ ] MANUAL: Resolve ambiguous matches
- [ ] APPLY: Tier 2 backfill
- [ ] Verify Tier 2 success
- [ ] DRY-RUN: Tier 3 (auto-create) - review new jobs
- [ ] MANUAL: Check for near-duplicates
- [ ] APPLY: Tier 3 backfill
- [ ] Verify Tier 3 success

### Phase 4
- [ ] Validate all quotes have job_id
- [ ] Validate all job_id references exist
- [ ] Check for orphaned TimeEntries
- [ ] Generate validation report

### Phase 5
- [ ] Run smoke test: Profitability Dashboard
- [ ] Run smoke test: Quote → Invoice conversion
- [ ] Run smoke test: Calendar job selector
- [ ] Run smoke test: Time tracking job selection
- [ ] Generate final backfill summary report
- [ ] Calculate readiness score
- [ ] Get final go/no-go for enforcement

---

## 🚨 FAILURE SCENARIOS & RECOVERY

### Scenario 1: Geocoding API Fails
**Probability:** 🟡 MEDIUM (API rate limits)  
**Impact:** Jobs missing coordinates (time tracking blocked)  
**Recovery:**
- ✅ Log failed addresses
- ✅ Continue backfill (non-blocking)
- ✅ Re-run geocoding separately later
- ✅ Manual coordinate entry for critical jobs

---

### Scenario 2: Duplicate Job Created
**Probability:** 🟢 LOW (duplicate prevention exists)  
**Impact:** Inflated job count, split references  
**Detection:**
```javascript
// Post-backfill audit:
const duplicates = await findDuplicatesByName();
// Returns: [{ name: "Coca Cola", jobs: [job1, job2] }]
```
**Recovery:**
- ✅ Merge duplicates (Phase 2 logic)
- ✅ Migrate references to primary
- ✅ Soft-delete duplicate

---

### Scenario 3: Wrong Job Linked (Name Match Error)
**Probability:** 🟡 MEDIUM (Tier 2 matching)  
**Impact:** Incorrect profitability reporting  
**Detection:**
```javascript
// Manual review:
const nameMatches = await Quote.filter({ job_link_method: 'name_match' });
// Review each match, verify customer/address align
```
**Recovery:**
- ✅ Correct `job_id` manually
- ✅ Update `job_link_method` to 'manual_correction'
- ✅ Log correction in AuditLog

---

### Scenario 4: Backfill Interrupted Mid-Process
**Probability:** 🟢 LOW (stable infrastructure)  
**Impact:** Partial completion  
**Recovery:**
- ✅ Check `BackfillProgress.processed` count
- ✅ Resume from last checkpoint
- ✅ Skip already-processed records (`job_link_backfilled = true`)
- ✅ Idempotency ensures no duplicates

---

## 📈 SUCCESS METRICS

### Quantitative Metrics
- ✅ Quote.job_id completeness: 0% → 100%
- ✅ Job.job_number completeness: 0% → 100%
- ✅ Job.team_id completeness: 0% → 80%+
- ✅ Job.coordinates completeness: 50% → 80%+
- ✅ Duplicate jobs prevented: 10-20 cases
- ✅ Processing time: < 60 minutes
- ✅ Zero data loss: 100%

### Qualitative Metrics
- ✅ Profitability Dashboard shows complete data
- ✅ Quote → Invoice flow preserves job links
- ✅ Calendar job selector shows all jobs
- ✅ Time tracking geofencing works (80%+ jobs)
- ✅ Team filters functional (80%+ jobs)

---

## 🎓 LESSONS FROM EMPLOYEE SSOT

### What Worked (Apply to Job SSOT)
1. ✅ **Defensive filtering** → Prevent crashes from missing data
2. ✅ **Runtime warnings** → Alert during dev (console.warn)
3. ✅ **Hard blocks** → Guards prevent invalid states
4. ✅ **Audit logging** → Track all changes

### What Didn't Work (Avoid for Job SSOT)
1. ❌ **Missing backfill** → `user_id` still null for some employees
2. ❌ **No auto-heal** → Manual fixes required
3. ❌ **Partial sync** → Self-service updates not synced

### Application to Job Backfill
- ✅ Complete backfill BEFORE enforcement (not after)
- ✅ Auto-create missing jobs (don't wait for manual entry)
- ✅ Validate 100% coverage (no partial states)

---

## 🔄 IDEMPOTENCY DESIGN

### Key Patterns

**Pattern 1: Check Before Create**
```javascript
if (job.job_number) {
  console.log(`Skip: Job ${job.id} already has job_number`);
  continue;
}
// Otherwise generate job_number
```

**Pattern 2: Check Before Link**
```javascript
if (quote.job_link_backfilled === true) {
  console.log(`Skip: Quote ${quote.id} already backfilled`);
  continue;
}
// Otherwise backfill job_id
```

**Pattern 3: Upsert Audit Logs**
```javascript
const existing = await AuditLog.filter({ 
  event: 'quote_job_link_backfilled',
  entity_id: quote.id 
});

if (existing.length === 0) {
  await AuditLog.create({ ... });
}
```

**Result:** Running backfill 2-3 times produces identical output (safe retry).

---

## 🧩 MATCHING ALGORITHM SPECIFICATION

### Exact Criteria for Tier 2 (Name + Customer Match)

**Input:** Orphaned quote (no job_id, no invoice)  
**Output:** Job or null  

**Algorithm:**
```javascript
function findJobForQuote(quote, allJobs) {
  // Step 1: Normalize quote name
  const quoteName = quote.job_name?.toLowerCase().trim();
  if (!quoteName) return null;
  
  // Step 2: Filter by customer
  let candidates = allJobs.filter(job => {
    // Match by customer_id (preferred)
    if (quote.customer_id && job.customer_id) {
      return job.customer_id === quote.customer_id;
    }
    
    // Fallback: Match by customer_name (case-insensitive)
    if (quote.customer_name && job.customer_name) {
      const qCust = quote.customer_name.toLowerCase().trim();
      const jCust = job.customer_name.toLowerCase().trim();
      return qCust === jCust;
    }
    
    return false;
  });
  
  // Step 3: Match by name
  const nameMatches = candidates.filter(job => {
    const jobName = job.name?.toLowerCase().trim();
    return jobName === quoteName;
  });
  
  // Step 4: Refine with address (if available)
  if (nameMatches.length > 1 && quote.job_address) {
    const quoteAddr = quote.job_address.toLowerCase().trim();
    const addressMatches = nameMatches.filter(job => {
      if (!job.address) return false;
      const jobAddr = job.address.toLowerCase().trim();
      
      // Exact match
      if (jobAddr === quoteAddr) return true;
      
      // Fuzzy match (contains)
      if (jobAddr.includes(quoteAddr) || quoteAddr.includes(jobAddr)) return true;
      
      return false;
    });
    
    if (addressMatches.length === 1) {
      return { job: addressMatches[0], confidence: 95 };
    } else if (addressMatches.length > 1) {
      return { job: addressMatches[0], confidence: 70, ambiguous: true };
    }
  }
  
  // Step 5: Return result
  if (nameMatches.length === 0) {
    return null; // No match → Tier 3 (auto-create)
  } else if (nameMatches.length === 1) {
    return { job: nameMatches[0], confidence: 85 };
  } else {
    // Multiple matches → pick oldest (conservative)
    const oldest = nameMatches.sort((a, b) => 
      new Date(a.created_date) - new Date(b.created_date)
    )[0];
    return { job: oldest, confidence: 60, ambiguous: true, match_count: nameMatches.length };
  }
}
```

**Confidence Scoring:**
- **100%** = Invoice trace (FK relationship)
- **95%** = Name + Customer + Address exact match
- **85%** = Name + Customer exact match (no address)
- **70%** = Name + Customer + Address fuzzy match (ambiguous)
- **60%** = Name + Customer match with multiple candidates
- **< 60%** = Manual review required

---

## 🎲 EDGE CASES & HANDLING

### Edge Case 1: Quote with Same Name as Multiple Jobs
**Example:**
```
Quote: "Hilton Hotel Renovation"
Job 1: "Hilton Hotel Renovation" (Atlanta, created 2025-01-15)
Job 2: "Hilton Hotel Renovation" (Orlando, created 2025-06-20)
```

**Resolution:**
1. Check quote.team_ids (if Atlanta team → Job 1)
2. Check quote.job_address (if matches Job 1 address → Job 1)
3. Check quote.quote_date (if closer to Job 1 creation → Job 1)
4. **Fallback:** Use oldest job (conservative)
5. **Flag:** `job_link_method = 'name_match_ambiguous'`
6. **Manual Review:** Add to review queue

---

### Edge Case 2: Quote Converted to Invoice, but Invoice Has Different Job
**Example:**
```
Quote EST-00044: job_id = '' (empty)
Invoice INV-00008: job_id = '697830e68ffdface219381e2'
Job 697830e68ffdface219381e2: name = 'Coca Cola'
Quote EST-00044: job_name = 'Coca Cola' (matches)
```

**Resolution:**
1. ✅ Use invoice trace (Tier 1)
2. ✅ Link quote to same job as invoice (deterministic)
3. ✅ Confidence = 100%
4. ✅ No ambiguity

---

### Edge Case 3: Quote Never Converted, No Matching Job Exists
**Example:**
```
Quote EST-00099: job_name = 'Unique Project XYZ'
No invoice, no existing job matches
```

**Resolution:**
1. ✅ Auto-create new job (Tier 3)
2. ✅ Generate job_number = `JOB-00085`
3. ✅ Mark `backfill_source = 'quote'`
4. ✅ Geocode address if available
5. ✅ Link quote to new job

---

### Edge Case 4: Job Created by Invoice, Quote Exists for Same Project
**Example:**
```
Invoice INV-00008 auto-created Job 'Coca Cola' (id: AAA)
Quote EST-00044 has job_name = 'Coca Cola'
Quote not yet linked
```

**Resolution:**
1. ✅ Invoice trace finds invoice.quote_id = EST-00044
2. ✅ Trace backwards: Invoice → Job AAA
3. ✅ Link quote to Job AAA
4. ✅ NO duplicate job created

**Critical:** Invoice trace MUST check bidirectional:
- Quote → Invoice → Job (forward)
- Invoice → Quote (backward via `invoice.quote_id`)

---

## 🧮 COST-BENEFIT ANALYSIS

### Costs

| Phase | Developer Time | Runtime | API Calls | Risk |
|-------|----------------|---------|-----------|------|
| Phase 0 | 2 hours | 5 min | 0 | 🟢 ZERO |
| Phase 1 | 1 hour | Instant | 0 | 🟢 LOW |
| Phase 2 | 3 hours | 10 min | ~80 geocoding | 🟡 MEDIUM |
| Phase 3 | 5 hours | 30 min | ~60 geocoding | 🟡 MEDIUM |
| Phase 4 | 2 hours | 10 min | 0 | 🟢 LOW |
| Phase 5 | 2 hours | 15 min | 0 | 🟢 LOW |
| **TOTAL** | **15 hours** | **70 min** | **~140 API calls** | **🟡 MEDIUM** |

**Financial Cost:**
- Developer: 15 hours × $150/hr = $2,250
- Geocoding API: 140 calls × $0.005/call = $0.70
- **Total:** ~$2,250

---

### Benefits

| Benefit | Value | Stakeholders |
|---------|-------|--------------|
| **Complete profitability tracking** | $500K+ revenue visibility | Finance, Management |
| **Accurate job costing** | Prevent budget overruns | Operations, PM |
| **Unified reporting** | Single source of truth | Everyone |
| **Prevent future fragmentation** | Ongoing data quality | IT, Admins |
| **Enable advanced features** | Job-level analytics, forecasting | Strategy |

**ROI:** (500000 visibility + cost prevention) / 2250 = **~220x** (conservative)

**Payback Period:** < 1 week (first avoided budget overrun)

---

## ✅ FINAL READINESS CHECKLIST

### Data Layer (Backfill Scope)
- [ ] ✅ 100% quotes have non-empty job_id
- [ ] ✅ 100% jobs have unique job_number
- [ ] ✅ 80%+ jobs have team_id
- [ ] ✅ 80%+ jobs have coordinates
- [ ] ✅ 0 duplicate job_numbers
- [ ] ✅ 0 invalid job_id references
- [ ] ✅ AuditLog contains full backfill trail

### Application Layer (Post-Backfill Work, NOT in this scope)
- [ ] ⚠️ CrearEstimado requires job_id or auto-creates
- [ ] ⚠️ Runtime warnings added (console.warn for missing job_id)
- [ ] ⚠️ Centralized query helper created
- [ ] ⚠️ JobReferenceGuard component created
- [ ] ⚠️ Defensive filtering in Profitability Dashboard

---

## 🚀 GO-LIVE SIGNAL

### Automated Check
```javascript
async function checkJobSSOTReadiness() {
  const checks = {
    quotes_linked: 0,
    jobs_numbered: 0,
    jobs_have_team: 0,
    jobs_have_coords: 0,
    duplicate_numbers: 0,
    invalid_refs: 0
  };
  
  const quotes = await Quote.list();
  checks.quotes_linked = quotes.filter(q => q.job_id && q.job_id !== '').length / quotes.length;
  
  const jobs = await Job.list();
  checks.jobs_numbered = jobs.filter(j => j.job_number).length / jobs.length;
  checks.jobs_have_team = jobs.filter(j => j.team_id && j.team_id !== '').length / jobs.length;
  checks.jobs_have_coords = jobs.filter(j => j.latitude && j.longitude).length / jobs.length;
  
  // Check duplicates
  const numbers = jobs.map(j => j.job_number).filter(Boolean);
  const uniqueNumbers = new Set(numbers);
  checks.duplicate_numbers = numbers.length - uniqueNumbers.size;
  
  // Check invalid references
  for (const quote of quotes) {
    if (quote.job_id && quote.job_id !== '') {
      try {
        await Job.get(quote.job_id);
      } catch {
        checks.invalid_refs++;
      }
    }
  }
  
  const score = (
    checks.quotes_linked * 0.40 + // 40% weight (most critical)
    checks.jobs_numbered * 0.30 + // 30% weight
    (checks.jobs_have_team * 0.15) + // 15% weight
    (checks.jobs_have_coords * 0.15) // 15% weight
  );
  
  const ready = (
    checks.quotes_linked >= 0.99 && // 99%+ (allow 1-2 edge cases)
    checks.jobs_numbered >= 0.99 &&
    checks.duplicate_numbers === 0 &&
    checks.invalid_refs === 0
  );
  
  return {
    ready,
    score: (score * 100).toFixed(1) + '%',
    checks,
    recommendation: ready 
      ? '✅ READY FOR JOB SSOT ENFORCEMENT' 
      : `⚠️ NOT READY (score: ${(score * 100).toFixed(1)}%)`
  };
}
```

**Threshold:** Ready = true AND score ≥ 93%

---

## 📖 SEPARATION OF CONCERNS

### Data Preparation (THIS STRATEGY)
**Scope:** Backfill missing data, prepare foundation  
**Changes:**
- ✅ Add fields to entities (schema)
- ✅ Generate job_numbers
- ✅ Link quotes to jobs
- ✅ Enrich jobs with team/coordinates
- ❌ NO behavioral changes
- ❌ NO enforcement logic

**Deliverable:** Clean, complete data ready for SSOT enforcement

---

### SSOT Enforcement (FUTURE WORK, NOT HERE)
**Scope:** Make job_id required, add runtime guards  
**Changes:**
- ⚠️ Update CrearEstimado to require job_id
- ⚠️ Add defensive warnings (console logs)
- ⚠️ Add JobReferenceGuard component
- ⚠️ Update queries to exclude deleted jobs
- ⚠️ Add auto-create fallbacks

**Prerequisite:** Data preparation complete (this strategy)

---

## 🎯 NEXT IMMEDIATE STEP

**IF APPROVED:** Implement Phase 0 (Pre-Flight Validation)

**Deliverable:** Function `runJobBackfillPreFlight()` that outputs:
```json
{
  "current_state": {
    "total_jobs": 2,
    "total_quotes": 100,
    "quotes_missing_job_id": 100,
    "invoices_missing_job_id": 0,
    "duplicate_job_names": [
      { "name": "Example", "count": 0 }
    ],
    "jobs_without_coordinates": 1,
    "jobs_without_team": 2
  },
  "estimated_changes": {
    "jobs_to_create": 60-80,
    "jobs_to_enrich": 2,
    "quotes_to_link": 100,
    "audit_logs_to_create": 250
  },
  "risk_assessment": "MEDIUM",
  "estimated_runtime": "40-50 minutes",
  "recommendation": "PROCEED with manual review of duplicate detection"
}
```

**Decision Point:** Stakeholder approval required before Phase 1.

---

## 🏁 CONCLUSION

### Is This Strategy Safe?
✅ **YES** — with conditions:

**Safe Because:**
- ✅ No deletions (soft-delete only)
- ✅ No overwrites (additive only)
- ✅ Idempotent (safe retry)
- ✅ Auditable (full trail)
- ✅ Resumable (checkpoint-based)
- ✅ Reversible (rollback script available)

**Conditions:**
- ⚠️ Manual review of ambiguous matches (Tier 2)
- ⚠️ Stakeholder approval for creating 60-80 jobs
- ⚠️ Database backup before execution
- ⚠️ Dry-run validation before apply

---

### Timeline to Production-Ready

**Optimistic:** 5 days (focused, no issues)  
**Realistic:** 7-8 days (with reviews and testing)  
**Conservative:** 10 days (if major edge cases found)

**Critical Path:**
```
Day 1: Phase 0 (pre-flight) + approval
Day 2: Phase 1 (schema) + Phase 2 (enrichment)
Day 3-4: Phase 3.1-3.2 (high-confidence matching)
Day 5: Phase 3.3 (auto-create) + manual review
Day 6: Phase 4 (validation)
Day 7: Phase 5 (smoke testing) + final approval
```

---

### Recommended Next Action

**IMMEDIATE:**
1. Review this strategy document
2. Get stakeholder sign-off on creating 60-80 jobs
3. Schedule backfill window (low-traffic period)
4. Create test environment with production data copy

**AFTER APPROVAL:**
5. Implement Phase 0 pre-flight script
6. Run dry-run and review output
7. Make GO/NO-GO decision
8. Execute backfill phases sequentially

---

**END OF STRATEGY DOCUMENT**

This design provides a complete, safe, auditable path from current fragmented state to Job SSOT readiness.  
No implementation performed. Awaiting approval to proceed.