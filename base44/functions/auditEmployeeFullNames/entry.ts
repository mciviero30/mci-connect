import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

/**
 * Auditoría de nombres de empleados
 * Detecta empleados donde full_name = email username (problema de sincronización)
 * Incluye: activos, pending_registration y futuros
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Solo admin puede ejecutar auditoría
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Obtener todos los empleados (activos + pending + todos los estados)
    const allProfiles = await base44.entities.EmployeeProfile.list('-created_date', 500);
    const allUsers = await base44.entities.User.list('-created_date', 500);

    const issues = [];
    const healthy = [];

    // Auditar EmployeeProfile
    for (const profile of allProfiles) {
      const emailUsername = profile.user_id 
        ? allUsers.find(u => u.id === profile.user_id)?.email?.split('@')[0]
        : null;

      const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
      const hasIssue = profile.full_name === emailUsername || 
                       (emailUsername && !fullName && profile.full_name === emailUsername);

      const record = {
        user_id: profile.user_id,
        email: allUsers.find(u => u.id === profile.user_id)?.email || 'unknown',
        full_name: profile.full_name,
        first_name: profile.first_name,
        last_name: profile.last_name,
        employment_status: profile.employment_status,
        position: profile.position,
        email_username: emailUsername,
        created_date: profile.created_date,
        issue: hasIssue ? 'full_name equals email username' : null
      };

      if (hasIssue) {
        issues.push(record);
      } else {
        healthy.push(record);
      }
    }

    return Response.json({
      summary: {
        total_employees: allProfiles.length,
        with_issues: issues.length,
        healthy: healthy.length,
        issue_percentage: ((issues.length / allProfiles.length) * 100).toFixed(2) + '%'
      },
      issues_found: issues,
      healthy_employees: healthy.slice(0, 20) // Mostrar primeros 20 sanos
    });

  } catch (error) {
    console.error('Audit failed:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});