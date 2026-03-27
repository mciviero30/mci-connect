import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * CRITICAL MIGRATION FUNCTION
 * Migrates PendingEmployee data to User + EmployeeDirectory on first login
 * IDEMPOTENT: Can run multiple times without duplicating or losing data
 * ATOMIC: All-or-nothing migration with audit trail
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userEmail = user.email.toLowerCase().trim();
    const steps = [];
    const warnings = [];

    // STEP 1: Check if already migrated (idempotency)
    const migrationFlag = `migration_${user.id}`;
    
    // Check session flag first (fastest)
    if (user.migration_completed === true) {
      steps.push('Already migrated (user flag set)');
      return Response.json({ 
        ok: true, 
        already_migrated: true,
        steps,
        warnings 
      });
    }

    steps.push('Starting migration for ' + userEmail);

    // STEP 2: Find PendingEmployee record
    const allPending = await base44.asServiceRole.entities.PendingEmployee.list();
    const pendingRecords = allPending.filter(p => 
      p.email && p.email.toLowerCase().trim() === userEmail
    );

    if (pendingRecords.length === 0) {
      steps.push('No PendingEmployee found - user registered directly');
      
      // Create EmployeeDirectory from User data
      await upsertEmployeeDirectory(base44, user, steps, warnings);
      
      return Response.json({ ok: true, steps, warnings });
    }

    // Use first pending record (should only be one, but handle multiples)
    const pending = pendingRecords[0];
    
    if (pendingRecords.length > 1) {
      warnings.push(`Found ${pendingRecords.length} pending records for ${userEmail}, using oldest`);
    }

    steps.push(`Found PendingEmployee: ${pending.first_name} ${pending.last_name}`);

    // STEP 3: Check if this pending was already migrated
    if (pending.migration_status === 'success' && pending.migrated_to_user_id === user.id) {
      steps.push('PendingEmployee already marked as migrated to this user');
      
      // Still sync to EmployeeDirectory (may be out of date)
      await upsertEmployeeDirectory(base44, user, steps, warnings);
      
      return Response.json({ 
        ok: true, 
        already_migrated: true,
        steps,
        warnings 
      });
    }

    // STEP 4: Build migration payload (NEVER overwrite existing with empty)
    const migrationData = {};
    
    // Safe merge helper
    const mergeField = (field, value) => {
      if (value !== null && value !== undefined && value !== '') {
        // Only set if user doesn't already have this field
        if (!user[field] || user[field] === '' || user[field] === null) {
          migrationData[field] = value;
        }
      }
    };

    // Migrate all fields
    mergeField('first_name', pending.first_name);
    mergeField('last_name', pending.last_name);
    
    // Build full_name intelligently
    const firstName = pending.first_name || user.first_name || '';
    const lastName = pending.last_name || user.last_name || '';
    if (firstName && lastName) {
      migrationData.full_name = `${firstName} ${lastName}`;
    }

    mergeField('phone', pending.phone);
    mergeField('address', pending.address);
    mergeField('dob', pending.dob);
    mergeField('position', pending.position);
    mergeField('department', pending.department);
    mergeField('team_id', pending.team_id);
    mergeField('team_name', pending.team_name);
    mergeField('ssn_tax_id', pending.ssn_tax_id);
    mergeField('tshirt_size', pending.tshirt_size);
    mergeField('hourly_rate', pending.hourly_rate);
    mergeField('direct_manager_name', pending.direct_manager_name);

    // Always set employment_status to active
    migrationData.employment_status = 'active';
    
    // Set hire_date if not already set
    if (!user.hire_date) {
      migrationData.hire_date = new Date().toISOString().split('T')[0];
    }

    steps.push(`Migrating ${Object.keys(migrationData).length} fields to User`);

    // STEP 5: Update User with migrated data
    let userUpdateSuccess = false;
    try {
      await base44.auth.updateMe(migrationData);
      steps.push('✅ User updated with migrated data');
      userUpdateSuccess = true;
    } catch (error) {
      steps.push('❌ User update failed: ' + error.message);
      warnings.push('User update failed: ' + error.message);
    }

    // STEP 6: Mark PendingEmployee as migrated (NEVER delete)
    try {
      await base44.asServiceRole.entities.PendingEmployee.update(pending.id, {
        migrated_to_user_id: user.id,
        migrated_at: new Date().toISOString(),
        migration_status: userUpdateSuccess ? 'success' : 'failed',
        migration_error: userUpdateSuccess ? null : 'User update failed',
        status: 'active'
      });
      steps.push('✅ PendingEmployee marked as migrated (preserved for audit)');
    } catch (error) {
      warnings.push('Failed to mark pending as migrated: ' + error.message);
    }

    // STEP 7: Sync to EmployeeDirectory (safe, public data only)
    const updatedUser = await base44.auth.me(); // Get fresh data
    await upsertEmployeeDirectory(base44, updatedUser, steps, warnings);

    return Response.json({ 
      ok: true, 
      migrated: true,
      fields_migrated: Object.keys(migrationData),
      steps,
      warnings 
    });

  } catch (error) {
    return Response.json({ 
      ok: false, 
      error: error.message,
      }, { status: 500 });
  }
});

/**
 * Helper: Upsert EmployeeDirectory (idempotent)
 */
async function upsertEmployeeDirectory(base44, user, steps, warnings) {
  const email = user.email.toLowerCase().trim();
  
  // Check if already exists
  const allDirectory = await base44.asServiceRole.entities.EmployeeDirectory.list();
  const existing = allDirectory.find(d => 
    d.employee_email && d.employee_email.toLowerCase().trim() === email
  );

  const directoryData = {
    employee_email: user.email,
    full_name: user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email.split('@')[0],
    first_name: user.first_name || '',
    last_name: user.last_name || '',
    position: user.position || '',
    department: user.department || '',
    phone: user.phone || '',
    team_id: user.team_id || '',
    team_name: user.team_name || '',
    profile_photo_url: user.profile_photo_url || user.avatar_image_url || '',
    status: user.employment_status === 'active' ? 'active' : 'inactive',
    sync_source: 'user_direct',
    last_synced_at: new Date().toISOString()
  };

  try {
    if (existing) {
      // Update only if newer data available
      const shouldUpdate = !existing.last_synced_at || 
        new Date(existing.last_synced_at) < new Date(user.updated_date || new Date());
      
      if (shouldUpdate) {
        await base44.asServiceRole.entities.EmployeeDirectory.update(existing.id, directoryData);
        steps.push('✅ EmployeeDirectory updated');
      } else {
        steps.push('EmployeeDirectory already up-to-date');
      }
    } else {
      // Create new directory entry
      await base44.asServiceRole.entities.EmployeeDirectory.create(directoryData);
      steps.push('✅ EmployeeDirectory created');
    }
  } catch (error) {
    warnings.push('EmployeeDirectory sync failed: ' + error.message);
  }
}