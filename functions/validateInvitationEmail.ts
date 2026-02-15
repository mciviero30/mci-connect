import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * SECURITY: Validate that user email matches an invitation
 * Blocks access if email doesn't match any pending invitation
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ 
        valid: false,
        error: 'No authenticated user' 
      }, { status: 401 });
    }

    const userEmail = user.email.toLowerCase().trim();
    console.log(`🔒 Validating invitation for: ${userEmail}`);
    console.log(`👤 User role: ${user.role}, position: ${user.position}, status: ${user.employment_status}`);

    // App owner bypass
    if (userEmail === 'mciviero30@gmail.com') {
      console.log(`✅ App owner bypass triggered for ${userEmail}`);
      return Response.json({ 
        valid: true,
        reason: 'App owner',
        email: userEmail
      });
    }

    // Check if admin/CEO - they bypass validation
    if (user.role === 'admin' || user.role === 'ceo' || user.position === 'CEO') {
      return Response.json({ 
        valid: true,
        reason: 'Admin/CEO bypass',
        email: userEmail
      });
    }

    // STRICT VALIDATION: Check EmployeeDirectory by user_id
    // If user exists but no EmployeeDirectory record -> BLOCK
    const directoryRecords = await base44.asServiceRole.entities.EmployeeDirectory.filter({
      user_id: user.id
    });

    if (directoryRecords.length > 0) {
      console.log(`✅ User ${userEmail} found in EmployeeDirectory (user_id: ${user.id})`);
      return Response.json({ 
        valid: true,
        reason: 'Active employee with directory record',
        email: userEmail
      });
    }

    // Check if user's employment_status is 'active' AND has directory record
    if (user.employment_status === 'active') {
      console.log(`⚠️ User ${userEmail} has employment_status: active but NO EmployeeDirectory record`);
      // Continue validation - they need invitation or directory record
    }

    // Check PendingEmployee invitations
    const allPending = await base44.asServiceRole.entities.PendingEmployee.list();
    const pendingMatch = allPending.find(p => 
      p.email?.toLowerCase().trim() === userEmail || p.user_id === user.id
    );

    if (pendingMatch) {
      console.log(`✅ Valid employee invitation found for ${userEmail}`);
      return Response.json({ 
        valid: true,
        type: 'employee',
        email: userEmail,
        invitation_found: true
      });
    }

    // Check ProjectMember (client) invitations
    const allMembers = await base44.asServiceRole.entities.ProjectMember.list();
    const clientMatch = allMembers.find(m => 
      (m.user_email?.toLowerCase().trim() === userEmail || m.user_id === user.id) && 
      m.role === 'client'
    );

    if (clientMatch) {
      console.log(`✅ Valid client invitation found for ${userEmail}`);
      return Response.json({ 
        valid: true,
        type: 'client',
        email: userEmail,
        invitation_found: true
      });
    }

    // No invitation or directory record found - BLOCK ACCESS
    console.error(`🚫 SECURITY BLOCK: No invitation or EmployeeDirectory record for ${userEmail} (user_id: ${user.id})`);
    return Response.json({ 
      valid: false,
      email: userEmail,
      error: 'Account not onboarded',
      message: 'Your account is not onboarded. Please contact your administrator.'
    });

  } catch (error) {
    console.error('Validation error:', error);
    return Response.json({ 
      valid: false,
      error: error.message 
    }, { status: 500 });
  }
});