import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify token from MCI Connect
    const authHeader = req.headers.get('authorization');
    const expectedToken = Deno.env.get('MCI_CONNECT_TOKEN');
    
    if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      email, 
      first_name, 
      last_name, 
      full_name,
      phone, 
      position, 
      department,
      team_id,
      team_name,
      direct_manager_name,
      hourly_rate,
      hourly_rate_overtime,
      per_diem_amount,
      address,
      dob,
      ssn_tax_id,
      tshirt_size
    } = await req.json();
    
    if (!email) {
      return Response.json({ error: 'Email is required' }, { status: 400 });
    }

    // Check if employee already exists
    const existing = await base44.asServiceRole.entities.PendingEmployee.filter({ email });
    
    if (existing.length > 0) {
      // Update existing
      await base44.asServiceRole.entities.PendingEmployee.update(existing[0].id, {
        first_name: first_name || existing[0].first_name,
        last_name: last_name || existing[0].last_name,
        full_name: full_name || existing[0].full_name,
        phone: phone || existing[0].phone,
        position: position || existing[0].position,
        department: department || existing[0].department,
        team_id: team_id || existing[0].team_id,
        team_name: team_name || existing[0].team_name,
        direct_manager_name: direct_manager_name || existing[0].direct_manager_name,
        hourly_rate: hourly_rate || existing[0].hourly_rate,
        hourly_rate_overtime: hourly_rate_overtime || existing[0].hourly_rate_overtime,
        per_diem_amount: per_diem_amount || existing[0].per_diem_amount,
        address: address || existing[0].address,
        dob: dob || existing[0].dob,
        ssn_tax_id: ssn_tax_id || existing[0].ssn_tax_id,
        tshirt_size: tshirt_size || existing[0].tshirt_size
      });

      return Response.json({ 
        success: true,
        message: 'Employee updated',
        employee_id: existing[0].id
      });
    } else {
      // Create new
      const newEmployee = await base44.asServiceRole.entities.PendingEmployee.create({
        email,
        first_name: first_name || '',
        last_name: last_name || '',
        full_name: full_name || `${first_name || ''} ${last_name || ''}`.trim(),
        phone: phone || '',
        position: position || 'technician',
        department: department || 'operations',
        team_id: team_id || '',
        team_name: team_name || '',
        direct_manager_name: direct_manager_name || '',
        hourly_rate: hourly_rate || 25,
        hourly_rate_overtime: hourly_rate_overtime || 37.5,
        per_diem_amount: per_diem_amount || 50,
        address: address || '',
        dob: dob || '',
        ssn_tax_id: ssn_tax_id || '',
        tshirt_size: tshirt_size || '',
        status: 'pending'
      });

      return Response.json({ 
        success: true,
        message: 'Employee created',
        employee_id: newEmployee.id
      });
    }

  } catch (error) {
    console.error('Error syncing employee:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});