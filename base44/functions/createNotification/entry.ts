import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const {
      recipientEmail,
      recipientName,
      type,
      category,
      priority = 'medium',
      title,
      message,
      actionUrl,
      relatedEntityType,
      relatedEntityId,
      metadata = {}
    } = await req.json();

    if (!recipientEmail || !type || !category || !title || !message) {
      return Response.json({ 
        error: 'Missing required fields: recipientEmail, type, category, title, message' 
      }, { status: 400 });
    }

    // Check if similar notification already exists (avoid duplicates)
    const recentNotifications = await base44.asServiceRole.entities.Notification.filter({
      recipient_email: recipientEmail,
      type: type,
      related_entity_id: relatedEntityId,
      created_date: { $gte: new Date(Date.now() - 3600000).toISOString() } // Last 1 hour
    }).catch(() => []);

    if (recentNotifications.length > 0) {
      return Response.json({ 
        success: true, 
        message: 'Notification already exists',
        notification: recentNotifications[0]
      });
    }

    // Normalize action URL (remove #!/ prefix if present)
    const normalizedUrl = actionUrl ? actionUrl.replace('#!/', '') : null;

    // Create notification
    const notification = await base44.asServiceRole.entities.Notification.create({
      recipient_email: recipientEmail,
      recipient_name: recipientName || recipientEmail,
      type,
      category,
      priority,
      title,
      message,
      action_url: normalizedUrl,
      related_entity_type: relatedEntityType,
      related_entity_id: relatedEntityId,
      metadata,
      is_read: false
    });

    return Response.json({ 
      success: true, 
      notification 
    });

  } catch (error) {
    console.error('Error creating notification:', error);
    return Response.json({ 
      error: 'Failed to create notification'
    }, { status: 500 });
  }
});
