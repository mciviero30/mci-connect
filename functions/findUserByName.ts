import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify admin
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { searchTerm } = await req.json();
    
    // Get all users
    const allUsers = await base44.asServiceRole.entities.User.list();
    
    // Filter by search term
    const matchingUsers = searchTerm 
      ? allUsers.filter(u => 
          u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          u.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          u.last_name?.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : allUsers;

    return Response.json({ 
      users: matchingUsers,
      total: allUsers.length 
    });
  } catch (error) {
    console.error('Error finding user:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});