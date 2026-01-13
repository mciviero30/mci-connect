import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || (user.role !== 'admin' && user.position?.toLowerCase() !== 'ceo')) {
      return Response.json({ error: 'Forbidden: Admin/CEO access required' }, { status: 403 });
    }

    // Get all pending employees
    const allPending = await base44.asServiceRole.entities.PendingEmployee.list();
    console.log(`Total pending employees: ${allPending.length}`);

    // Delete all "Unknown" or invalid employees
    const unknownEmployees = allPending.filter(e => 
      e.email === 'noemail@unknown.com' || 
      e.first_name === 'Unknown' || 
      !e.email || 
      e.email.includes('unknown')
    );
    
    console.log(`Found ${unknownEmployees.length} unknown/invalid employees to delete`);
    
    for (const emp of unknownEmployees) {
      await base44.asServiceRole.entities.PendingEmployee.delete(emp.id);
      console.log(`Deleted unknown employee: ${emp.id}`);
    }

    // Find duplicates by email (keep newest)
    const validEmployees = allPending.filter(e => 
      e.email !== 'noemail@unknown.com' && 
      e.first_name !== 'Unknown' && 
      e.email && 
      !e.email.includes('unknown')
    );

    const emailMap = new Map();
    const duplicates = [];

    // Group by email, keep newest
    validEmployees.forEach(emp => {
      const email = emp.email.toLowerCase();
      if (emailMap.has(email)) {
        const existing = emailMap.get(email);
        // Keep newer one, delete older
        if (new Date(emp.created_date) > new Date(existing.created_date)) {
          duplicates.push(existing);
          emailMap.set(email, emp);
        } else {
          duplicates.push(emp);
        }
      } else {
        emailMap.set(email, emp);
      }
    });

    console.log(`Found ${duplicates.length} duplicate employees to delete`);

    for (const dup of duplicates) {
      await base44.asServiceRole.entities.PendingEmployee.delete(dup.id);
      console.log(`Deleted duplicate: ${dup.email} (${dup.id})`);
    }

    const remaining = await base44.asServiceRole.entities.PendingEmployee.list();

    return Response.json({
      success: true,
      deleted_unknown: unknownEmployees.length,
      deleted_duplicates: duplicates.length,
      total_deleted: unknownEmployees.length + duplicates.length,
      remaining: remaining.length,
      remaining_employees: remaining.map(e => ({
        email: e.email,
        name: `${e.first_name} ${e.last_name}`,
        position: e.position
      }))
    });

  } catch (error) {
    console.error('Cleanup error:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});