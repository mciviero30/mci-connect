import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || (user.role !== 'admin' && user.position !== 'CEO')) {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get all users and pending employees
    const users = await base44.asServiceRole.entities.User.list();
    const pending = await base44.asServiceRole.entities.PendingEmployee.list();

    const issues = [];

    // Audit Users
    for (const emp of users) {
      const emailLocal = emp.email?.split('@')[0] || '';
      const problems = [];

      // Check if full_name looks like email
      if (emp.full_name?.includes('@') || emp.full_name?.includes('.')) {
        problems.push('full_name_is_email');
      }

      // Check if first/last names are missing
      if (!emp.first_name || !emp.last_name) {
        problems.push('missing_names');
      }

      // Check if names look suspicious (all lowercase, email-like)
      if (emp.first_name && emp.first_name === emp.first_name.toLowerCase()) {
        problems.push('first_name_not_capitalized');
      }
      if (emp.last_name && emp.last_name === emp.last_name.toLowerCase()) {
        problems.push('last_name_not_capitalized');
      }

      // Check if full_name doesn't match first + last
      const expectedFullName = emp.first_name && emp.last_name 
        ? `${emp.first_name} ${emp.last_name}`.trim()
        : '';
      if (expectedFullName && emp.full_name !== expectedFullName) {
        problems.push('full_name_mismatch');
      }

      if (problems.length > 0) {
        issues.push({
          type: 'User',
          id: emp.id,
          email: emp.email,
          first_name: emp.first_name || '',
          last_name: emp.last_name || '',
          full_name: emp.full_name || '',
          position: emp.position || '',
          problems,
          suggested_fix: {
            first_name: emp.first_name ? emp.first_name.charAt(0).toUpperCase() + emp.first_name.slice(1).toLowerCase() : '',
            last_name: emp.last_name ? emp.last_name.charAt(0).toUpperCase() + emp.last_name.slice(1).toLowerCase() : '',
            full_name: expectedFullName || emp.full_name
          }
        });
      }
    }

    // Audit PendingEmployees
    for (const emp of pending) {
      const problems = [];

      if (emp.full_name?.includes('@') || emp.full_name?.includes('.')) {
        problems.push('full_name_is_email');
      }

      if (!emp.first_name || !emp.last_name) {
        problems.push('missing_names');
      }

      if (problems.length > 0) {
        const expectedFullName = emp.first_name && emp.last_name 
          ? `${emp.first_name} ${emp.last_name}`.trim()
          : '';

        issues.push({
          type: 'PendingEmployee',
          id: emp.id,
          email: emp.email,
          first_name: emp.first_name || '',
          last_name: emp.last_name || '',
          full_name: emp.full_name || '',
          position: emp.position || '',
          problems,
          suggested_fix: {
            first_name: emp.first_name ? emp.first_name.charAt(0).toUpperCase() + emp.first_name.slice(1).toLowerCase() : '',
            last_name: emp.last_name ? emp.last_name.charAt(0).toUpperCase() + emp.last_name.slice(1).toLowerCase() : '',
            full_name: expectedFullName || emp.full_name
          }
        });
      }
    }

    return Response.json({
      success: true,
      total_users: users.length,
      total_pending: pending.length,
      issues_found: issues.length,
      issues: issues.sort((a, b) => b.problems.length - a.problems.length)
    });

  } catch (error) {
    console.error('Audit error:', error);
    return Response.json({ 
      error: 'Audit failed',
      details: error.message 
    }, { status: 500 });
  }
});