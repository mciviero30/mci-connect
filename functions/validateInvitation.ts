import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * CRITICAL SECURITY: Validate that email has been invited before allowing signup/login
 * 
 * Used by:
 * - Frontend signup/login flows
 * - Pre-auth check before user creation
 * 
 * Returns:
 * - { allowed: true, role, position } if invitation found and valid
 * - { allowed: false, reason } if no invitation or revoked
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { email } = await req.json();

    if (!email) {
      return Response.json(
        { allowed: false, reason: 'Email is required' },
        { status: 400 }
      );
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Check PendingEmployee table for invitation
    const pending = await base44.asServiceRole.entities.PendingEmployee.filter({
      email: normalizedEmail,
    });

    if (!pending || pending.length === 0) {
      console.log(`[validateInvitation] ❌ No invitation found for ${normalizedEmail}`);
      return Response.json({
        allowed: false,
        reason: 'You are not authorized to access this company. Please contact your administrator for an invitation.',
      });
    }

    const invitation = pending[0];

    // Check invitation status
    if (invitation.status === 'revoked') {
      console.log(`[validateInvitation] ❌ Invitation revoked for ${normalizedEmail}`);
      return Response.json({
        allowed: false,
        reason: 'Your invitation has been revoked. Contact your administrator.',
      });
    }

    // Status: pending, invited, or active = allowed
    console.log(`[validateInvitation] ✅ Invitation valid for ${normalizedEmail}`, {
      status: invitation.status,
      position: invitation.position,
    });

    return Response.json({
      allowed: true,
      status: invitation.status,
      role: invitation.position === 'CEO' ? 'ceo' : invitation.position === 'administrator' ? 'admin' : 'user',
      position: invitation.position,
    });
  } catch (error) {
    console.error('[validateInvitation] Error:', error);
    return Response.json(
      { allowed: false, reason: 'Server error. Please try again.' },
      { status: 500 }
    );
  }
});