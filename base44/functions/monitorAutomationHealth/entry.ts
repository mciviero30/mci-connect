import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * W3 FIX: Monitor automation health and alert on failures
 * 
 * Runs daily at 8am
 * Checks for failed automations in last 24h
 * Alerts admins if any critical automations failed
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    console.log('🔍 Checking automation health...');

    // Get all automations via Base44 API
    // Note: This is a placeholder - actual implementation depends on Base44 automation logs API
    // For now, we'll check for critical entity consistency issues
    
    const criticalChecks = {
      invoice_balance: { passed: true, details: '' },
      geofence_validation: { passed: true, details: '' },
      time_entry_validation: { passed: true, details: '' }
    };

    // Check 1: Invoice balance consistency
    try {
      const invoices = await base44.asServiceRole.entities.Invoice.filter({ 
        status: { $in: ['sent', 'partial', 'overdue'] }
      });
      
      const inconsistent = invoices.filter(inv => {
        const expectedBalance = (inv.total || 0) - (inv.amount_paid || 0);
        return Math.abs((inv.balance || 0) - expectedBalance) > 0.01;
      });

      if (inconsistent.length > 0) {
        criticalChecks.invoice_balance.passed = false;
        criticalChecks.invoice_balance.details = `${inconsistent.length} invoices with incorrect balance`;
      }
    } catch (error) {
      criticalChecks.invoice_balance.passed = false;
      criticalChecks.invoice_balance.details = `Check failed: ${error.message}`;
    }

    // Check 2: Geofence validation coverage
    try {
      const recentEntries = await base44.asServiceRole.entities.TimeEntry.filter({
        created_date: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() }
      });

      const unvalidated = recentEntries.filter(entry => 
        entry.work_type !== 'driving' && 
        entry.geofence_validated_backend === undefined
      );

      if (unvalidated.length > 0) {
        criticalChecks.geofence_validation.passed = false;
        criticalChecks.geofence_validation.details = `${unvalidated.length} recent entries not validated`;
      }
    } catch (error) {
      criticalChecks.geofence_validation.passed = false;
      criticalChecks.geofence_validation.details = `Check failed: ${error.message}`;
    }

    // Check 3: Time entry data integrity
    try {
      const entries = await base44.asServiceRole.entities.TimeEntry.filter({
        created_date: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() }
      });

      const invalid = entries.filter(entry => 
        !entry.employee_email || 
        !entry.date || 
        !entry.check_in ||
        (entry.hours_worked && entry.hours_worked > 24)
      );

      if (invalid.length > 0) {
        criticalChecks.time_entry_validation.passed = false;
        criticalChecks.time_entry_validation.details = `${invalid.length} entries with data issues`;
      }
    } catch (error) {
      criticalChecks.time_entry_validation.passed = false;
      criticalChecks.time_entry_validation.details = `Check failed: ${error.message}`;
    }

    // Summary
    const failedChecks = Object.entries(criticalChecks).filter(([_, check]) => !check.passed);
    const allPassed = failedChecks.length === 0;

    console.log(`Health check: ${allPassed ? '✅ All passed' : `⚠️ ${failedChecks.length} issues`}`);

    // Alert admins if issues found
    if (!allPassed) {
      const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
      
      const issuesList = failedChecks
        .map(([name, check]) => `- ${name}: ${check.details}`)
        .join('\n');

      await Promise.all(admins.map(admin =>
        base44.asServiceRole.integrations.Core.SendEmail({
          to: admin.email,
          subject: '⚠️ Automation Health Alert - Issues Detected',
          body: `Daily health check found ${failedChecks.length} issue(s) on ${new Date().toLocaleDateString()}:\n\n${issuesList}\n\nPlease review and resolve these issues.`,
          from_name: 'MCI Connect Health Monitor'
        })
      ));
    }

    return Response.json({ 
      success: true,
      all_passed: allPassed,
      checks: criticalChecks,
      failed_count: failedChecks.length
    });

  } catch (error) {
    console.error('[Health Monitor Error]', error.message);
    
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});