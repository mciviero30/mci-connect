import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * PHASE 6: Payroll Preview with Enterprise v2 (user_id SSOT)
 * Matching: SSN → email → name
 * Works with User + EmployeeProfile architecture
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { payrollRows } = await req.json();

    if (!Array.isArray(payrollRows) || payrollRows.length === 0) {
      return Response.json({ error: 'Invalid payroll rows' }, { status: 400 });
    }

    const results = {
      preview: [],
      newMatches: 0,
      updates: 0,
      conflicts: [],
      invalidRows: [],
      totalCost: 0,
      timestamp: new Date().toISOString()
    };

    try {
      // Fetch data for matching
      const profiles = await base44.entities.EmployeeProfile.list();
      const users = await base44.entities.User.list();
      const timeEntries = await base44.entities.TimeEntry.filter({ status: 'approved' });

      for (const row of payrollRows) {
        // Required fields
        if (!row.hours && !row.amount) {
          results.invalidRows.push(`Row missing hours/amount`);
          continue;
        }

        let matchedProfile = null;
        let matchedUser = null;
        let matchMethod = null;

        // 1. Match by SSN
        if (row.ssn_tax_id) {
          matchedProfile = profiles.find(p => p.ssn_tax_id === row.ssn_tax_id);
          if (matchedProfile) {
            matchedUser = users.find(u => u.id === matchedProfile.user_id);
            matchMethod = 'SSN';
          }
        }

        // 2. Match by email
        if (!matchedUser && row.email) {
          matchedUser = users.find(u => u.email?.toLowerCase() === row.email?.toLowerCase());
          if (matchedUser) {
            matchedProfile = profiles.find(p => p.user_id === matchedUser.id);
            matchMethod = 'Email';
          }
        }

        // 3. Match by name
        if (!matchedUser && row.first_name && row.last_name) {
          const fullName = `${row.first_name} ${row.last_name}`.toLowerCase();
          matchedUser = users.find(u => u.full_name?.toLowerCase() === fullName);
          if (matchedUser) {
            matchedProfile = profiles.find(p => p.user_id === matchedUser.id);
            matchMethod = 'Name';
          }
        }

        if (!matchedUser) {
          results.conflicts.push({
            email: row.email,
            name: `${row.first_name} ${row.last_name}`,
            reason: 'No employee match found'
          });
          continue;
        }

        // Calculate hours & cost
        const hours = parseFloat(row.hours) || 0;
        const hourlyRate = matchedProfile?.hourly_rate || 25;
        const amount = hours * hourlyRate;

        results.preview.push({
          user_id: matchedUser.id,
          email: matchedUser.email,
          name: matchedUser.full_name,
          hours,
          rate: hourlyRate,
          amount,
          matchMethod,
          status: matchedProfile?.status || 'active'
        });

        results.totalCost += amount;
        results.newMatches++;
      }

      results.status = results.conflicts.length === 0 ? 'ready' : 'has_conflicts';
      results.summary = `${results.newMatches} matched, ${results.conflicts.length} conflicts, Total: $${results.totalCost.toFixed(2)}`;

      console.log('✅ Payroll Preview v2 Complete:', results);
      return Response.json(results);

    } catch (err) {
      console.error('❌ Preview failed:', err);
      return Response.json({ error: err.message }, { status: 500 });
    }

  } catch (err) {
    console.error('Auth error:', err);
    return Response.json({ error: 'Authentication failed' }, { status: 401 });
  }
});