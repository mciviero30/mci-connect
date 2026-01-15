import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    console.log('📥 Import function started');
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || (user.role !== 'admin' && user.position !== 'CEO')) {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { file_url } = body;
    console.log('📄 File URL received:', file_url);

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
    console.log('🔄 Extracting data from file...');
    let extractResult;
    try {
      console.log('🔄 Calling ExtractDataFromUploadedFile integration...');
      extractResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: schema
      });
      console.log('✅ Extract result:', extractResult);
    } catch (extractErr) {
      console.error('❌ Extract error:', extractErr);
      return Response.json({ 
        error: 'Failed to extract data from file',
        details: extractErr.message 
      }, { status: 400 });
    }

    if (extractResult.status !== 'success') {
      console.error('❌ Extract failed:', extractResult.details);
      return Response.json({ 
        error: 'Failed to extract data from file',
        details: extractResult.details 
      }, { status: 400 });
    }

    const employees = extractResult.output;
    console.log('📊 Employees extracted:', employees?.length || 0);

    if (!Array.isArray(employees) || employees.length === 0) {
      return Response.json({ 
        error: 'No valid employee data found in file' 
      }, { status: 400 });
    }

    // Get existing teams to match by name
    console.log('🔄 Loading teams...');
    const teams = await base44.asServiceRole.entities.Team.list();
    console.log('📊 Teams loaded:', teams.length);
    const teamMap = {};
    teams.forEach(t => {
      if (t.team_name) {
        teamMap[t.team_name.toLowerCase()] = { id: t.id, name: t.team_name };
      }
    });

    // FIX #1: AUDIT TRAIL - Use user auth instead of asServiceRole
    // FIX #3: SCHEMA VALIDATION - Validate ENUMs before creating
    const VALID_POSITIONS = ['CEO', 'manager', 'technician', 'supervisor', 'foreman', 'administrator'];
    const VALID_DEPARTMENTS = ['all', 'HR', 'field', 'operations', 'IT', 'administration', 'designer', 'PM', 'marketing', 'sales'];
    const VALID_TSHIRT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
    
    const created = [];
    const errors = [];

    console.log(`🔄 Processing ${employees.length} employees...`);
    for (const emp of employees) {
      try {
        // Clean and capitalize names
        const firstName = emp.first_name ? 
          emp.first_name.trim().charAt(0).toUpperCase() + emp.first_name.trim().slice(1).toLowerCase() : '';
        const lastName = emp.last_name ? 
          emp.last_name.trim().charAt(0).toUpperCase() + emp.last_name.trim().slice(1).toLowerCase() : '';
        const fullName = `${firstName} ${lastName}`.trim();

        // Validate position enum
        const position = emp.position && VALID_POSITIONS.includes(emp.position) ? emp.position : '';
        if (emp.position && !VALID_POSITIONS.includes(emp.position)) {
          console.warn(`⚠️ Invalid position "${emp.position}" for ${emp.email}, skipping`);
          errors.push({ 
            email: emp.email, 
            error: `Invalid position: ${emp.position}` 
          });
          continue;
        }

        // Validate department enum
        const department = emp.department && VALID_DEPARTMENTS.includes(emp.department) ? emp.department : '';
        if (emp.department && !VALID_DEPARTMENTS.includes(emp.department)) {
          console.warn(`⚠️ Invalid department "${emp.department}" for ${emp.email}, skipping`);
          errors.push({ 
            email: emp.email, 
            error: `Invalid department: ${emp.department}` 
          });
          continue;
        }

        // Validate tshirt size enum
        const tshirtSize = emp.tshirt_size && VALID_TSHIRT_SIZES.includes(emp.tshirt_size) ? emp.tshirt_size : '';
        if (emp.tshirt_size && !VALID_TSHIRT_SIZES.includes(emp.tshirt_size)) {
          console.warn(`⚠️ Invalid tshirt_size "${emp.tshirt_size}" for ${emp.email}, skipping`);
          errors.push({ 
            email: emp.email, 
            error: `Invalid tshirt_size: ${emp.tshirt_size}` 
          });
          continue;
        }

        // FIX #4: TEAM ORPHAN - Validate team exists before assigning
        let teamId = '';
        let teamName = '';
        if (emp.team_name) {
          const teamKey = emp.team_name.toLowerCase();
          if (teamMap[teamKey]) {
            teamId = teamMap[teamKey].id;
            teamName = teamMap[teamKey].name;
          } else {
            console.warn(`⚠️ Team "${emp.team_name}" not found for ${emp.email}, leaving empty`);
          }
        }

        console.log(`📝 [${created.length + 1}/${employees.length}] Creating: ${emp.email}`);
        // FIX #1: Use user auth (base44) instead of asServiceRole for audit trail
        const pendingEmployee = await base44.entities.PendingEmployee.create({
          email: emp.email.toLowerCase().trim(),
          first_name: firstName,
          last_name: lastName,
          full_name: fullName,
          phone: emp.phone || '',
          position: position,
          department: department,
          team_id: teamId,
          team_name: teamName,
          address: emp.address || '',
          dob: emp.dob || '',
          ssn_tax_id: emp.ssn_tax_id || '',
          tshirt_size: tshirtSize,
          hourly_rate: emp.hourly_rate || null,
          status: 'pending'
        });

        created.push(pendingEmployee);
        console.log(`✅ Created: ${emp.email} (created_by: ${user.email})`);
      } catch (error) {
        console.error(`❌ Error creating ${emp.email}:`, error.message);
        errors.push({ 
          email: emp.email, 
          error: error.message 
        });
      }
    }
    
    console.log(`📊 Import complete: ${created.length} created, ${errors.length} errors`);

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