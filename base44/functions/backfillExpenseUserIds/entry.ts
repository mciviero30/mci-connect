import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * BACKFILL EXPENSE USER IDS
 * 
 * Populates employee_user_id for existing Expenses
 * Matches by employee_email to User.email
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { dry_run = true } = await req.json();

    // Load all expenses
    const allExpenses = await base44.asServiceRole.entities.Expense.list('-date', 10000);
    
    // Load all users for matching
    const allUsers = await base44.asServiceRole.entities.User.list('-created_date', 500);
    const userByEmail = allUsers.reduce((acc, u) => ({ ...acc, [u.email]: u }), {});

    const needsBackfill = allExpenses.filter(exp => !exp.user_id && exp.employee_email);

    const results = {
      total_expenses: allExpenses.length,
      needs_backfill: needsBackfill.length,
      backfilled: 0,
      no_match: 0,
      errors: []
    };

    if (!dry_run && needsBackfill.length > 0) {
      for (const expense of needsBackfill) {
        try {
          const matchedUser = userByEmail[expense.employee_email];
          
          if (!matchedUser) {
            results.no_match++;
            console.warn(`⚠️ No User match for expense ${expense.id} (${expense.employee_email})`);
            continue;
          }

          // Update with user_id
          await base44.asServiceRole.entities.Expense.update(expense.id, {
            user_id: matchedUser.id
          });

          results.backfilled++;
          console.log(`✅ Backfilled user_id for Expense ${expense.id}: ${matchedUser.email}`);

        } catch (error) {
          results.errors.push({
            expense_id: expense.id,
            employee_email: expense.employee_email,
            error: error.message
          });
          console.error(`❌ Failed to backfill Expense ${expense.id}:`, error.message);
        }
      }
    }

    return Response.json({
      success: true,
      dry_run,
      summary: results,
      sample_expenses: needsBackfill.slice(0, 10).map(exp => ({
        id: exp.id,
        employee_email: exp.employee_email,
        job: exp.job_name,
        amount: exp.amount,
        current_user_id: exp.user_id,
        has_match: !!userByEmail[exp.employee_email]
      }))
    });

  } catch (error) {
    console.error('[BACKFILL ERROR]', error.message);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});