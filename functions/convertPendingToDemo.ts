import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Admin only
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { email } = await req.json();

    if (!email) {
      return Response.json({ error: 'Email is required' }, { status: 400 });
    }

    // Find the user
    const users = await base44.asServiceRole.entities.User.filter({ email });
    
    if (users.length === 0) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    const targetUser = users[0];

    // Check if they have a demo_user PendingEmployee record
    const pending = await base44.asServiceRole.entities.PendingEmployee.filter({ 
      email,
      position: 'demo_user'
    });

    if (pending.length === 0) {
      return Response.json({ 
        error: 'No demo user record found for this email' 
      }, { status: 404 });
    }

    // Update user role to demo
    await base44.asServiceRole.entities.User.update(targetUser.id, {
      role: 'demo'
    });

    return Response.json({ 
      success: true,
      message: `User ${email} converted to demo role`,
      user_id: targetUser.id
    });

  } catch (error) {
    console.error('Convert to demo error:', error);
    return Response.json({ 
      error: error.message || 'Failed to convert user to demo' 
    }, { status: 500 });
  }
});