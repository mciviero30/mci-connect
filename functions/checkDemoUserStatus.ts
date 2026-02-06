import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const admin = await base44.auth.me();

    if (admin?.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const { email } = await req.json();

    // Find user
    const users = await base44.asServiceRole.entities.User.filter({ email });
    
    if (users.length === 0) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    const user = users[0];

    // Find pending employee
    const pending = await base44.asServiceRole.entities.PendingEmployee.filter({ 
      email,
      position: 'demo_user'
    });

    return Response.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        full_name: user.full_name,
        position: user.position,
        is_demo_user: user.is_demo_user,
      },
      pending_employee: pending.length > 0 ? {
        id: pending[0].id,
        position: pending[0].position,
        status: pending[0].status
      } : null
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});