import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * EMPLOYEE SSOT ENFORCEMENT - Backend Authority
 * 
 * Ensures User and EmployeeDirectory remain synchronized
 * Triggered on User entity updates
 * 
 * SSOT Rules:
 * - EmployeeDirectory = canonical employee roster
 * - User = identity + auth + sensitive data only
 * - Any employment status, position, team change MUST sync both
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data, old_data } = await req.json();

    // Only process User updates
    if (event.entity_name !== 'User') {
      return Response.json({ success: true, message: 'Not a User event' });
    }

    const user = data;
    
    // Skip if no employment-related fields changed
    const employmentFields = ['employment_status', 'position', 'department', 'team_id', 'team_name', 'hourly_rate'];
    const hasEmploymentChange = event.type === 'create' || 
      (event.type === 'update' && employmentFields.some(field => user[field] !== old_data?.[field]));

    if (!hasEmploymentChange) {
      return Response.json({ success: true, message: 'No employment fields changed' });
    }

    // SYNC TO EMPLOYEE DIRECTORY
    console.log('[EMPLOYEE SSOT] Syncing User → EmployeeDirectory', {
      user_id: user.id,
      email: user.email,
      employment_status: user.employment_status
    });

    // Find existing directory entry
    const existingDirectory = await base44.asServiceRole.entities.EmployeeDirectory.filter({
      user_id: user.id
    });

    const directoryData = {
      user_id: user.id,
      employee_email: user.email,
      full_name: user.full_name,
      first_name: user.first_name,
      last_name: user.last_name,
      position: user.position || '',
      department: user.department || '',
      phone: user.phone || '',
      team_id: user.team_id || '',
      team_name: user.team_name || '',
      profile_photo_url: user.profile_photo_url || '',
      status: mapEmploymentStatusToDirectoryStatus(user.employment_status),
      sync_source: 'user_direct',
      last_synced_at: new Date().toISOString()
    };

    if (existingDirectory.length > 0) {
      // Update existing
      await base44.asServiceRole.entities.EmployeeDirectory.update(
        existingDirectory[0].id,
        directoryData
      );
      console.log('[EMPLOYEE SSOT] ✅ Updated EmployeeDirectory', { directory_id: existingDirectory[0].id });
    } else {
      // Create new directory entry
      await base44.asServiceRole.entities.EmployeeDirectory.create(directoryData);
      console.log('[EMPLOYEE SSOT] ✅ Created EmployeeDirectory entry');
    }

    return Response.json({
      success: true,
      synced: true,
      directory_status: directoryData.status,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[EMPLOYEE SSOT] Error:', error.message);
    // Don't block User updates on sync failure - log and continue
    return Response.json({
      success: false,
      error: error.message
    }, { status: 200 }); // Return 200 to prevent automation retry
  }
});

/**
 * Map User.employment_status to EmployeeDirectory.status
 */
function mapEmploymentStatusToDirectoryStatus(employmentStatus) {
  const mapping = {
    'pending_invitation': 'pending',
    'invited': 'invited',
    'active': 'active',
    'inactive': 'inactive',
    'temporarily_out': 'inactive',
    'archived': 'archived',
    'deleted': 'archived'
  };
  
  return mapping[employmentStatus] || 'pending';
}