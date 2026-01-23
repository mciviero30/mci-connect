import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Admin verification
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
    }

    const { user_id, reason } = await req.json();
    
    if (!user_id) {
      return Response.json({ error: 'user_id is required' }, { status: 400 });
    }

    // Delete user using service role
    await base44.asServiceRole.users.delete(user_id);

    console.log(`[SECURITY] User deleted: ${user_id} by ${user.email}. Reason: ${reason || 'No reason provided'}`);

    return Response.json({ 
      success: true, 
      message: 'User deleted successfully',
      deleted_user_id: user_id
    });
    
  } catch (error) {
    console.error('[ERROR] Delete user failed:', error);
    return Response.json({ 
      error: error.message || 'Failed to delete user' 
    }, { status: 500 });
  }
});