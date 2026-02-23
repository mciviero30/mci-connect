import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * SCHEDULED AUTOMATION - Expire Old Invitations
 * 
 * Runs daily to mark invitations as "expired" if:
 * - status = "pending"
 * - invited_date > 30 days ago
 * 
 * This should be scheduled to run once daily.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Get all pending invitations
    const pendingInvitations = await base44.asServiceRole.entities.EmployeeInvitation.filter(
      { status: 'pending' },
      '-invited_date',
      1000
    );

    if (!pendingInvitations || pendingInvitations.length === 0) {
      return Response.json({
        success: true,
        message: 'No pending invitations to expire',
        expired_count: 0
      });
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    let expiredCount = 0;

    for (const inv of pendingInvitations) {
      const invitedDate = new Date(inv.invited_date);
      
      // If invited more than 30 days ago, mark as expired
      if (invitedDate < thirtyDaysAgo) {
        try {
          await base44.asServiceRole.entities.EmployeeInvitation.update(inv.id, {
            status: 'expired'
          });
          expiredCount++;
        } catch (err) {
          console.error(`Failed to expire invitation ${inv.id}:`, err);
        }
      }
    }

    return Response.json({
      success: true,
      message: `Expired ${expiredCount} old invitations`,
      expired_count: expiredCount
    });

  } catch (error) {
    console.error('Expiration error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});