import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Get pending time-off requests
    const requests = await base44.asServiceRole.entities.TimeOffRequest.filter({
      status: 'pending'
    });

    if (requests.length === 0) {
      return Response.json({ message: 'No pending time-off requests', sent: 0 });
    }

    // Get admins/managers who need to approve
    const admins = await base44.asServiceRole.entities.EmployeeDirectory.filter({
      status: 'active'
    });

    const managersAndAdmins = admins.filter(e => 
      e.position?.toLowerCase().includes('manager') || 
      e.position?.toLowerCase().includes('supervisor') ||
      e.position?.toLowerCase().includes('admin')
    );

    let sentCount = 0;

    // Send alert to each manager
    for (const manager of managersAndAdmins) {
      if (!manager.phone) continue;

      const message = `MCI: You have ${requests.length} pending time-off request${requests.length > 1 ? 's' : ''} awaiting approval. Please review in MCI Connect.`;

      try {
        await base44.asServiceRole.functions.invoke('sendSMS', {
          to: manager.phone,
          message: message
        });
        sentCount++;
      } catch (error) {
        console.error(`Failed to send SMS to ${manager.employee_email}:`, error);
      }
    }

    return Response.json({ 
      message: `Sent ${sentCount} time-off alerts`,
      pendingRequests: requests.length,
      sent: sentCount
    });

  } catch (error) {
    console.error('Time-off alert error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});