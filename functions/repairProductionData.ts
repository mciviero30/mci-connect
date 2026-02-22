import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * EMERGENCY PRODUCTION DATA REPAIR
 * 
 * Executes all critical backfills in sequence:
 * 1. WorkAuthorizations for Jobs
 * 2. Rate snapshots for TimeEntries
 * 3. User IDs for Expenses
 * 
 * Run with dry_run: true first to preview changes
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Admin-only operation (critical data repair)
    if (!user || user.role !== 'admin') {
      console.warn(`[Permission Denied] Attempt to repair production data denied for ${user?.email} (${user?.role})`);
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { dry_run = true } = await req.json();

    const report = {
      started_at: new Date().toISOString(),
      dry_run,
      steps: []
    };

    // STEP 1: Backfill WorkAuthorizations
    console.log('📋 STEP 1: Backfilling Work Authorizations...');
    try {
      const authResult = await base44.asServiceRole.functions.invoke('backfillWorkAuthorizations', { dry_run });
      report.steps.push({
        step: 'work_authorizations',
        success: true,
        result: authResult
      });
    } catch (error) {
      report.steps.push({
        step: 'work_authorizations',
        success: false,
        error: error.message
      });
    }

    // STEP 2: Backfill TimeEntry rate_snapshot
    console.log('📋 STEP 2: Backfilling TimeEntry Rates...');
    try {
      const rateResult = await base44.asServiceRole.functions.invoke('backfillTimeEntryRates', { dry_run });
      report.steps.push({
        step: 'time_entry_rates',
        success: true,
        result: rateResult
      });
    } catch (error) {
      report.steps.push({
        step: 'time_entry_rates',
        success: false,
        error: error.message
      });
    }

    // STEP 3: Backfill Expense user_id
    console.log('📋 STEP 3: Backfilling Expense User IDs...');
    try {
      const expenseResult = await base44.asServiceRole.functions.invoke('backfillExpenseUserIds', { dry_run });
      report.steps.push({
        step: 'expense_user_ids',
        success: true,
        result: expenseResult
      });
    } catch (error) {
      report.steps.push({
        step: 'expense_user_ids',
        success: false,
        error: error.message
      });
    }

    report.completed_at = new Date().toISOString();
    report.all_success = report.steps.every(s => s.success);

    return Response.json(report);

  } catch (error) {
    console.error('[REPAIR ERROR]', error.message);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});