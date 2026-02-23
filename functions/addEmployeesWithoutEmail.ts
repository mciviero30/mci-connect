import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const employees = [
      { firstName: "Eduardo", lastName: "Rodriguez Perez" },
      { firstName: "Daniel", lastName: "Mazzei Quintero" },
      { firstName: "Fernando", lastName: "Arciniegas" },
      { firstName: "Jesus", lastName: "Pacheco" },
      { firstName: "Dallas", lastName: "1" },
      { firstName: "Dallas", lastName: "2" },
      { firstName: "Wilfredo", lastName: "Vera" },
      { firstName: "Adrian", lastName: "Guedez Sanabria" },
      { firstName: "Henry", lastName: "Quintana" },
      { firstName: "Jose", lastName: "Bermudez" },
      { firstName: "Giovanni", lastName: "Caraballo" },
      { firstName: "Edgar", lastName: "vergara" },
      { firstName: "Ivan", lastName: "Ozuna" },
      { firstName: "Felix", lastName: "Rierra Oyarde" },
      { firstName: "Jorge", lastName: "Alvarado Alvarado" },
      { firstName: "Rogers", lastName: "Cesped Lopez" }
    ];

    const result = {
      created: 0,
      failed: 0,
      errors: [],
      timestamp: new Date().toISOString()
    };

    for (const emp of employees) {
      try {
        const fullName = `${emp.firstName} ${emp.lastName}`.trim();
        
        // Create as EmployeeProfile with placeholder hire_date
        const created = await base44.asServiceRole.entities.EmployeeProfile.create({
          first_name: emp.firstName,
          last_name: emp.lastName,
          full_name: fullName,
          hire_date: new Date().toISOString().split('T')[0], // Today's date
          employment_status: "active",
          is_active: true,
          user_id: null // No user yet - will be added when invited
        });

        result.created++;
        console.log(`✅ Created: ${fullName}`);
      } catch (err) {
        result.failed++;
        result.errors.push({
          name: `${emp.firstName} ${emp.lastName}`,
          error: err.message
        });
        console.error(`❌ Failed ${emp.firstName} ${emp.lastName}:`, err.message);
      }
    }

    return Response.json(result);

  } catch (error) {
    console.error('Function error:', error.message);
    return Response.json({
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
});