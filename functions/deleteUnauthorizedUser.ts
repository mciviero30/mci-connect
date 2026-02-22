import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Policy: Admin-only deletion of any user
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Admin-only gate
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { user_id, reason } = await req.json();
    
    if (!user_id) {
      return Response.json({ error: 'user_id is required' }, { status: 400 });
    }

    // Delete user using service role - use fetch directly to Base44 API
    const response = await fetch(`https://api.base44.com/v1/apps/${Deno.env.get('BASE44_APP_ID')}/users/${user_id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('BASE44_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Failed to delete user: ${response.status} - ${errorData}`);
    }

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