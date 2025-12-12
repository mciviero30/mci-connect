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

    // Just prepare the data - invitation must be done via Dashboard
    // This function only validates and prepares the employee data
    return Response.json({ 
      success: true,
      message: 'Employee data prepared',
      requiresDashboardInvite: true,
      email: employee.email
    });
  } catch (error) {
    console.error('Error preparing employee:', error);
    return Response.json({ 
      error: error.message || 'Failed to prepare employee' 
    }, { status: 500 });
  }
});