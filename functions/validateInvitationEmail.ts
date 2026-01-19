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

    // Check if admin/CEO - they bypass validation
    if (user.role === 'admin' || user.role === 'ceo') {
      return Response.json({ 
        valid: true,
        reason: 'Admin/CEO bypass',
        email: userEmail
      });
    }

    // Check PendingEmployee invitations
    const allPending = await base44.asServiceRole.entities.PendingEmployee.list();
    const pendingMatch = allPending.find(p => 
      p.email?.toLowerCase().trim() === userEmail
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
      m.user_email?.toLowerCase().trim() === userEmail && 
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

    // No invitation found - BLOCK ACCESS
    console.error(`🚫 SECURITY: No invitation found for ${userEmail}`);
    return Response.json({ 
      valid: false,
      email: userEmail,
      error: 'No invitation found for this email',
      message: 'You must be invited with this specific email address to access the system.'
    });

  } catch (error) {
    console.error('Validation error:', error);
    return Response.json({ 
      valid: false,
      error: error.message 
    }, { status: 500 });
  }
});