import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || (user.role !== 'admin' && user.position !== 'CEO')) {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { employeeId, type, first_name, last_name, full_name } = await req.json();

    if (!employeeId || !type) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Capitalize and clean names
    const cleanFirstName = first_name ? 
      first_name.trim().charAt(0).toUpperCase() + first_name.trim().slice(1).toLowerCase() : '';
    const cleanLastName = last_name ? 
      last_name.trim().charAt(0).toUpperCase() + last_name.trim().slice(1).toLowerCase() : '';
    const cleanFullName = full_name || (cleanFirstName && cleanLastName ? 
      `${cleanFirstName} ${cleanLastName}`.trim() : '');

    const updateData = {
      first_name: cleanFirstName,
      last_name: cleanLastName,
      full_name: cleanFullName
    };

    if (type === 'User') {
      await base44.asServiceRole.entities.User.update(employeeId, updateData);
    } else if (type === 'PendingEmployee') {
      await base44.asServiceRole.entities.PendingEmployee.update(employeeId, updateData);
    } else {
      return Response.json({ error: 'Invalid type' }, { status: 400 });
    }

    return Response.json({
      success: true,
      message: 'Employee data fixed',
      updated: updateData
    });

  } catch (error) {
    console.error('Fix error:', error);
    return Response.json({ 
      error: 'Fix failed',
      details: error.message 
    }, { status: 500 });
  }
});