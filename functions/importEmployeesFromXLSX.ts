import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || (user.role !== 'admin' && user.position !== 'CEO')) {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { file_url } = await req.json();

    if (!file_url) {
      return Response.json({ error: 'file_url is required' }, { status: 400 });
    }

    // Expected schema for employee import
    const schema = {
      type: "array",
      items: {
        type: "object",
        properties: {
          email: { type: "string" },
          first_name: { type: "string" },
          last_name: { type: "string" },
          phone: { type: "string" },
          position: { type: "string" },
          department: { type: "string" },
          team_name: { type: "string" },
          address: { type: "string" },
          dob: { type: "string" },
          ssn_tax_id: { type: "string" },
          tshirt_size: { type: "string" },
          hourly_rate: { type: "number" }
        },
        required: ["email", "first_name", "last_name"]
      }
    };

    // Extract data from file using Core integration
    const extractResult = await base44.asServiceRole.integrations.Core.ExtractDataFromUploadedFile({
      file_url,
      json_schema: schema
    });

    if (extractResult.status !== 'success') {
      return Response.json({ 
        error: 'Failed to extract data from file',
        details: extractResult.details 
      }, { status: 400 });
    }

    const employees = extractResult.output;

    if (!Array.isArray(employees) || employees.length === 0) {
      return Response.json({ 
        error: 'No valid employee data found in file' 
      }, { status: 400 });
    }

    // Get existing teams to match by name
    const teams = await base44.asServiceRole.entities.Team.list();
    const teamMap = {};
    teams.forEach(t => {
      if (t.team_name) {
        teamMap[t.team_name.toLowerCase()] = { id: t.id, name: t.team_name };
      }
    });

    // Create pending employees
    const created = [];
    const errors = [];

    for (const emp of employees) {
      try {
        // Clean and capitalize names
        const firstName = emp.first_name ? 
          emp.first_name.trim().charAt(0).toUpperCase() + emp.first_name.trim().slice(1).toLowerCase() : '';
        const lastName = emp.last_name ? 
          emp.last_name.trim().charAt(0).toUpperCase() + emp.last_name.trim().slice(1).toLowerCase() : '';
        const fullName = `${firstName} ${lastName}`.trim();

        // Match team by name
        let teamId = '';
        let teamName = '';
        if (emp.team_name) {
          const teamKey = emp.team_name.toLowerCase();
          if (teamMap[teamKey]) {
            teamId = teamMap[teamKey].id;
            teamName = teamMap[teamKey].name;
          }
        }

        const pendingEmployee = await base44.asServiceRole.entities.PendingEmployee.create({
          email: emp.email.toLowerCase().trim(),
          first_name: firstName,
          last_name: lastName,
          full_name: fullName,
          phone: emp.phone || '',
          position: emp.position || '',
          department: emp.department || '',
          team_id: teamId,
          team_name: teamName,
          address: emp.address || '',
          dob: emp.dob || '',
          ssn_tax_id: emp.ssn_tax_id || '',
          tshirt_size: emp.tshirt_size || '',
          hourly_rate: emp.hourly_rate || null,
          status: 'pending'
        });

        created.push(pendingEmployee);
      } catch (error) {
        errors.push({ 
          email: emp.email, 
          error: error.message 
        });
      }
    }

    return Response.json({
      success: true,
      total_processed: employees.length,
      created: created.length,
      errors: errors.length > 0 ? errors : null,
      employees: created
    });

  } catch (error) {
    console.error('Import error:', error);
    return Response.json({ 
      error: 'Import failed',
      details: error.message 
    }, { status: 500 });
  }
});