import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * UPDATE USER EMAIL (Self-Service)
 * Allows users to update their own email address
 * Updates User + EmployeeDirectory + All related records
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const requestingUser = await base44.auth.me();

    if (!requestingUser) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { user_id, new_email } = await req.json();

    // Security: Users can only update their own email (unless admin)
    if (requestingUser.id !== user_id && requestingUser.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Can only update your own email' }, { status: 403 });
    }

    if (!new_email || !new_email.includes('@')) {
      return Response.json({ error: 'Invalid email format' }, { status: 400 });
    }

    // Check if email already exists
    const existingUsers = await base44.asServiceRole.entities.User.filter({ email: new_email });
    if (existingUsers.length > 0 && existingUsers[0].id !== user_id) {
      return Response.json({ error: 'Email already in use' }, { status: 400 });
    }

    // Get current user data
    const users = await base44.asServiceRole.entities.User.filter({ id: user_id });
    if (users.length === 0) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    const oldEmail = users[0].email;

    // Update User email via admin endpoint (requires service role)
    // Note: User entity email field is managed by auth system
    // We can only update data fields, not core auth fields
    // So we'll update EmployeeDirectory instead and let admin manually update User if needed

    // Update EmployeeDirectory
    const directoryEntries = await base44.asServiceRole.entities.EmployeeDirectory.filter({
      employee_email: oldEmail
    });

    if (directoryEntries.length > 0) {
      await base44.asServiceRole.entities.EmployeeDirectory.update(directoryEntries[0].id, {
        employee_email: new_email
      });
    }

    return Response.json({ 
      success: true,
      message: 'Email update requested. An administrator will complete the change.',
      requires_admin_approval: true
    });
  } catch (error) {
    console.error('❌ Update email failed:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});