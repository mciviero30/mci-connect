import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { requireAdmin, safeJsonError } from './_auth.js';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await requireAdmin(base44);
    
    // Get all pending employees
    const pendingEmployees = await base44.asServiceRole.entities.PendingEmployee.list();
    
    // Get all active users
    const activeUsers = await base44.asServiceRole.entities.User.filter({ 
      employment_status: 'active' 
    });
    
    let syncedCount = 0;
    let deletedCount = 0;
    
    for (const pending of pendingEmployees) {
      // Check if there's a matching active user (case-insensitive email comparison)
      const matchingUser = activeUsers.find(u => u.email?.toLowerCase() === pending.email?.toLowerCase());
      
      if (matchingUser) {
        console.log(`✅ Found active user for pending employee: ${pending.email}`);
        
        // Sync data from PendingEmployee to User (only if User data is missing)
        const updateData = {};
        
        if (pending.first_name && !matchingUser.first_name) {
          updateData.first_name = pending.first_name;
        }
        if (pending.last_name && !matchingUser.last_name) {
          updateData.last_name = pending.last_name;
        }
        if (pending.phone && !matchingUser.phone) {
          updateData.phone = pending.phone;
        }
        if (pending.position && !matchingUser.position) {
          updateData.position = pending.position;
        }
        if (pending.department && !matchingUser.department) {
          updateData.department = pending.department;
        }
        if (pending.team_id && !matchingUser.team_id) {
          updateData.team_id = pending.team_id;
        }
        if (pending.team_name && !matchingUser.team_name) {
          updateData.team_name = pending.team_name;
        }
        if (pending.address && !matchingUser.address) {
          updateData.address = pending.address;
        }
        if (pending.dob && !matchingUser.dob) {
          updateData.dob = pending.dob;
        }
        if (pending.ssn_tax_id && !matchingUser.ssn_tax_id) {
          updateData.ssn_tax_id = pending.ssn_tax_id;
        }
        if (pending.tshirt_size && !matchingUser.tshirt_size) {
          updateData.tshirt_size = pending.tshirt_size;
        }
        if (pending.hourly_rate && !matchingUser.hourly_rate) {
          updateData.hourly_rate = pending.hourly_rate;
        }
        
        // Update full_name if we have better data
        if (pending.first_name && pending.last_name) {
          const fullName = `${pending.first_name} ${pending.last_name}`.trim();
          if (!matchingUser.full_name || matchingUser.full_name.includes('@')) {
            updateData.full_name = fullName;
          }
        }
        
        // Update user if there's data to sync
        if (Object.keys(updateData).length > 0) {
          await base44.asServiceRole.entities.User.update(matchingUser.id, updateData);
          console.log(`📝 Updated user ${matchingUser.email} with pending employee data`);
          syncedCount++;
        }
        
        // Delete the pending employee record
        await base44.asServiceRole.entities.PendingEmployee.delete(pending.id);
        console.log(`🗑️ Deleted pending employee: ${pending.email}`);
        deletedCount++;
      }
    }
    
    return Response.json({
      success: true,
      message: `Synced ${syncedCount} users, deleted ${deletedCount} pending records`,
      synced: syncedCount,
      deleted: deletedCount
    });
    
  } catch (error) {
    if (error instanceof Response) throw error;
    if (import.meta.env?.DEV) {
      console.error('Error syncing pending employees:', error);
    }
    return safeJsonError('Sync failed', 500, error.message);
  }
});