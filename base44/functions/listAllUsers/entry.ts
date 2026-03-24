import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * List all users with email normalization for duplicate detection
 * Admin-only function
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized: Admin only' }, { status: 403 });
    }

    const users = await base44.asServiceRole.entities.User.list('-created_date', 200);
    
    // Group by normalized email to detect duplicates
    const emailGroups = {};
    const duplicates = [];
    
    users.forEach(u => {
      const normalizedEmail = u.email?.toLowerCase().trim() || 'no-email';
      
      if (!emailGroups[normalizedEmail]) {
        emailGroups[normalizedEmail] = [];
      }
      emailGroups[normalizedEmail].push({
        id: u.id,
        email: u.email,
        full_name: u.full_name,
        employment_status: u.employment_status,
        created_date: u.created_date,
        onboarding_completed: u.onboarding_completed
      });
    });
    
    // Find duplicates
    Object.entries(emailGroups).forEach(([email, group]) => {
      if (group.length > 1) {
        duplicates.push({
          email,
          count: group.length,
          users: group
        });
      }
    });

    return Response.json({
      total_users: users.length,
      unique_emails: Object.keys(emailGroups).length,
      duplicates_found: duplicates.length,
      duplicates,
      all_users: users.map(u => ({
        id: u.id,
        email: u.email,
        full_name: u.full_name,
        employment_status: u.employment_status,
        role: u.role,
        created_date: u.created_date
      }))
    });

  } catch (error) {
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});