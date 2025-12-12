import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify user is authenticated
    const currentUser = await base44.auth.me();
    if (!currentUser) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { employee } = await req.json();

    if (!employee || !employee.email) {
      return Response.json({ error: 'Employee email is required' }, { status: 400 });
    }

    const fullName = `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || 
      employee.full_name || 'Employee';

    // Create/update user in EmployeeDirectory with service role
    const directoryEntries = await base44.asServiceRole.entities.EmployeeDirectory.filter({
      employee_email: employee.email
    });

    if (directoryEntries.length === 0) {
      await base44.asServiceRole.entities.EmployeeDirectory.create({
        employee_email: employee.email,
        full_name: fullName,
        first_name: employee.first_name || '',
        last_name: employee.last_name || '',
        phone: employee.phone || '',
        position: employee.position || '',
        department: employee.department || '',
        team_id: employee.team_id || '',
        team_name: employee.team_name || '',
        status: 'active'
      });
    }

    return Response.json({ 
      success: true,
      message: 'User invited successfully' 
    });
  } catch (error) {
    console.error('Error inviting employee:', error);
    return Response.json({ 
      error: error.message || 'Failed to invite employee' 
    }, { status: 500 });
  }
});