import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// SHA-256 hash helper
async function sha256Hash(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { employees, mode } = await req.json();

    if (!employees || !Array.isArray(employees)) {
      return Response.json({ error: 'Invalid input: employees must be an array' }, { status: 400 });
    }

    if (!['create_only', 'update_existing', 'overwrite_existing'].includes(mode)) {
      return Response.json({ error: 'Invalid mode' }, { status: 400 });
    }

    const result = {
      mode,
      total_processed: employees.length,
      created_users: 0,
      created_profiles: 0,
      updated_profiles: 0,
      skipped: 0,
      failed: 0,
      final_status: 'success',
      timestamp: new Date().toISOString()
    };

    const rollback = {
      created_users: [],
      created_profiles: [],
      updated_profiles: [],
      updated_users: []
    };

    // PHASE 1: PRE-VALIDATION (NO WRITES)
    console.log('🔍 Phase 1: Pre-validation...');

    const validationErrors = [];
    const ssn_hashes = new Map();
    const employee_codes = new Set();
    const emails = new Set();

    // Validate each employee
    for (let i = 0; i < employees.length; i++) {
      const emp = employees[i];
      const empErrors = [];

      // Required fields
      if (!emp.email) empErrors.push('Email required');
      if (!emp.hire_date) empErrors.push('Hire date required');

      // Conditional required fields
      if (emp.pay_type === 'hourly' && !emp.hourly_rate) {
        empErrors.push('Hourly rate required for hourly employees');
      }
      if (emp.pay_type === 'salary' && !emp.salary_annual) {
        empErrors.push('Annual salary required for salaried employees');
      }

      // Normalize and hash SSN
      let ssn_hash = null;
      if (emp.ssn) {
        const normalized = emp.ssn.replace(/\D/g, '');
        ssn_hash = await sha256Hash(normalized);

        // Check for duplicate SSN in same batch
        if (ssn_hashes.has(ssn_hash) && ssn_hashes.get(ssn_hash) !== emp.email) {
          empErrors.push('Duplicate SSN detected');
        }
        ssn_hashes.set(ssn_hash, emp.email);
      }

      // Check for duplicate employee_code in batch
      if (emp.employee_code) {
        if (employee_codes.has(emp.employee_code)) {
          empErrors.push('Duplicate employee code in batch');
        }
        employee_codes.add(emp.employee_code);
      }

      // Check for duplicate email in batch
      if (emails.has(emp.email)) {
        empErrors.push('Duplicate email in batch');
      }
      emails.add(emp.email);

      if (empErrors.length > 0) {
        validationErrors.push({ index: i, email: emp.email, errors: empErrors });
      }
    }

    // Abort if batch validation failed
    if (validationErrors.length > 0) {
      result.final_status = 'validation_failed';
      result.validation_errors = validationErrors;
      return Response.json(result, { status: 400 });
    }

    // Fetch and check for conflicts via targeted queries (no bulk list)
    console.log('🔍 Checking database for existing records...');
    const dbConflicts = [];

    for (const emp of employees) {
      try {
        // Check email
        const userByEmail = await base44.asServiceRole.entities.User.filter({ email: emp.email });
        
        // Check SSN if provided
        if (emp.ssn) {
          const normalized = emp.ssn.replace(/\D/g, '');
          const hash = await sha256Hash(normalized);
          const profileBySsn = await base44.asServiceRole.entities.EmployeeProfile.filter({ ssn_encrypted: hash });
          
          if (profileBySsn.length > 0 && userByEmail.length > 0) {
            if (profileBySsn[0].user_id !== userByEmail[0].id) {
              dbConflicts.push({ email: emp.email, conflict: 'SSN already exists for different user' });
            }
          } else if (profileBySsn.length > 0 && userByEmail.length === 0) {
            dbConflicts.push({ email: emp.email, conflict: 'SSN already exists for different user' });
          }
        }

        // Check employee_code if provided
        if (emp.employee_code) {
          const profileByCode = await base44.asServiceRole.entities.EmployeeProfile.filter({ employee_code: emp.employee_code });
          
          if (profileByCode.length > 0 && userByEmail.length > 0) {
            if (profileByCode[0].user_id !== userByEmail[0].id) {
              dbConflicts.push({ email: emp.email, conflict: 'Employee code already exists for different user' });
            }
          } else if (profileByCode.length > 0 && userByEmail.length === 0) {
            dbConflicts.push({ email: emp.email, conflict: 'Employee code already exists for different user' });
          }
        }
      } catch (err) {
        console.error(`Failed to check conflicts for ${emp.email}:`, err.message);
        return Response.json({ error: 'Failed to check duplicates', status: 'failed' }, { status: 500 });
      }
    }

    if (dbConflicts.length > 0) {
      result.final_status = 'hard_fail';
      result.conflicts = dbConflicts;
      return Response.json(result, { status: 400 });
    }

    // PHASE 2: APPLY WRITES
    console.log('✍️  Phase 2: Applying writes...');

    for (let i = 0; i < employees.length; i++) {
      const emp = employees[i];

      try {
        // STEP A: Find or create User
        let userId;
        let existingUser = null;
        const usersByEmail = await base44.asServiceRole.entities.User.filter({ email: emp.email });
        
        if (usersByEmail.length > 0) {
          existingUser = usersByEmail[0];
          userId = existingUser.id;
        } else {
          const fullName = `${emp.first_name || ''} ${emp.last_name || ''}`.trim();
          const newUser = await base44.asServiceRole.entities.User.create({
            email: emp.email,
            full_name: fullName,
            role: 'employee'
          });
          userId = newUser.id;
          rollback.created_users.push(userId);
          result.created_users++;
        }

        // STEP B: Find or handle EmployeeProfile
        const profilesByUserId = await base44.asServiceRole.entities.EmployeeProfile.filter({ user_id: userId });
        const profileExists = profilesByUserId.length > 0;
        const existingProfile = profileExists ? profilesByUserId[0] : null;
        const fullName = `${emp.first_name || ''} ${emp.last_name || ''}`.trim();

        if (!profileExists) {
          // Create new profile
          const ssn_hash = emp.ssn ? await sha256Hash(emp.ssn.replace(/\D/g, '')) : null;

          const profileData = {
            user_id: userId,
            first_name: emp.first_name,
            last_name: emp.last_name,
            full_name: fullName,
            employee_code: emp.employee_code,
            ssn_encrypted: ssn_hash,
            hire_date: emp.hire_date,
            department: emp.department,
            position: emp.position,
            employment_type: emp.employment_type || 'full_time',
            pay_type: emp.pay_type || 'hourly',
            hourly_rate: emp.hourly_rate,
            salary_annual: emp.salary_annual,
            tax_classification: emp.tax_classification,
            filing_status: emp.filing_status,
            state_of_residence: emp.state_of_residence,
            work_state: emp.work_state,
            phone: emp.phone,
            personal_email: emp.personal_email,
            address_line_1: emp.address_line_1,
            city: emp.city,
            state: emp.state,
            zip: emp.zip,
            is_active: true,
            employment_status: 'active'
          };

          const newProfile = await base44.asServiceRole.entities.EmployeeProfile.create(profileData);
          rollback.created_profiles.push(newProfile.id);
          result.created_profiles++;
          existingProfiles.set(userId, newProfile);

        } else {
          const existingProfile = existingProfiles.get(userId);

          if (mode === 'create_only') {
            result.skipped++;

          } else if (mode === 'update_existing') {
            // Save snapshot and update only provided fields
            const snapshot = JSON.parse(JSON.stringify(existingProfile));
            rollback.updated_profiles.push({ profileId: existingProfile.id, snapshot });

            const updateData = {};
            if (emp.first_name !== undefined && emp.first_name !== null) updateData.first_name = emp.first_name;
            if (emp.last_name !== undefined && emp.last_name !== null) updateData.last_name = emp.last_name;
            if (emp.employee_code !== undefined && emp.employee_code !== null) updateData.employee_code = emp.employee_code;
            if (emp.department !== undefined && emp.department !== null) updateData.department = emp.department;
            if (emp.position !== undefined && emp.position !== null) updateData.position = emp.position;
            if (emp.employment_type !== undefined && emp.employment_type !== null) updateData.employment_type = emp.employment_type;
            if (emp.pay_type !== undefined && emp.pay_type !== null) updateData.pay_type = emp.pay_type;
            if (emp.hourly_rate !== undefined && emp.hourly_rate !== null) updateData.hourly_rate = emp.hourly_rate;
            if (emp.salary_annual !== undefined && emp.salary_annual !== null) updateData.salary_annual = emp.salary_annual;
            if (emp.tax_classification !== undefined && emp.tax_classification !== null) updateData.tax_classification = emp.tax_classification;
            if (emp.filing_status !== undefined && emp.filing_status !== null) updateData.filing_status = emp.filing_status;
            if (emp.state_of_residence !== undefined && emp.state_of_residence !== null) updateData.state_of_residence = emp.state_of_residence;
            if (emp.work_state !== undefined && emp.work_state !== null) updateData.work_state = emp.work_state;
            if (emp.phone !== undefined && emp.phone !== null) updateData.phone = emp.phone;
            if (emp.personal_email !== undefined && emp.personal_email !== null) updateData.personal_email = emp.personal_email;
            if (emp.address_line_1 !== undefined && emp.address_line_1 !== null) updateData.address_line_1 = emp.address_line_1;
            if (emp.city !== undefined && emp.city !== null) updateData.city = emp.city;
            if (emp.state !== undefined && emp.state !== null) updateData.state = emp.state;
            if (emp.zip !== undefined && emp.zip !== null) updateData.zip = emp.zip;

            // Recompute full_name
            updateData.full_name = fullName;

            if (Object.keys(updateData).length > 0) {
              await base44.asServiceRole.entities.EmployeeProfile.update(existingProfile.id, updateData);
              result.updated_profiles++;
            } else {
              result.skipped++;
            }

          } else if (mode === 'overwrite_existing') {
            // Save snapshot and overwrite all fields except user_id
            const snapshot = JSON.parse(JSON.stringify(existingProfile));
            rollback.updated_profiles.push({ profileId: existingProfile.id, snapshot });

            // SSN: Only update if provided, otherwise keep existing
            let ssn_hash = existingProfile.ssn_encrypted;
            if (emp.ssn) {
              const normalized = emp.ssn.replace(/\D/g, '');
              ssn_hash = await sha256Hash(normalized);

              // Validate SSN change - check for conflicts
              if (ssn_hash !== existingProfile.ssn_encrypted) {
                const profilesBySsn = await base44.asServiceRole.entities.EmployeeProfile.filter({ ssn_encrypted: ssn_hash });
                if (profilesBySsn.length > 0 && profilesBySsn[0].id !== existingProfile.id) {
                  throw new Error(`SSN conflict: New SSN already exists for different employee`);
                }
              }
            }

            const overwriteData = {
              first_name: emp.first_name,
              last_name: emp.last_name,
              full_name: fullName,
              employee_code: emp.employee_code,
              ssn_encrypted: ssn_hash,
              hire_date: emp.hire_date,
              department: emp.department,
              position: emp.position,
              employment_type: emp.employment_type || 'full_time',
              pay_type: emp.pay_type || 'hourly',
              hourly_rate: emp.hourly_rate,
              salary_annual: emp.salary_annual,
              tax_classification: emp.tax_classification,
              filing_status: emp.filing_status,
              state_of_residence: emp.state_of_residence,
              work_state: emp.work_state,
              phone: emp.phone,
              personal_email: emp.personal_email,
              address_line_1: emp.address_line_1,
              city: emp.city,
              state: emp.state,
              zip: emp.zip
            };

            await base44.asServiceRole.entities.EmployeeProfile.update(existingProfile.id, overwriteData);
            result.updated_profiles++;
          }
        }

        // Update User.full_name to match EmployeeProfile (save snapshot first)
        if (existingUser) {
          const userSnapshot = JSON.parse(JSON.stringify(existingUser));
          rollback.updated_users.push({ userId, snapshot: userSnapshot });
        }
        await base44.asServiceRole.entities.User.update(userId, { full_name: fullName });

      } catch (err) {
        console.error(`Error processing employee ${i}:`, err.message);
        result.failed++;
        result.final_status = 'hard_fail';

        // PHASE 3: ROLLBACK
        console.log('🔄 Phase 3: Rolling back...');

        for (const profileId of rollback.created_profiles) {
          try {
            await base44.asServiceRole.entities.EmployeeProfile.delete(profileId);
          } catch (e) {
            console.error(`Rollback failed for profile ${profileId}`);
          }
        }

        for (const userId of rollback.created_users) {
          try {
            await base44.asServiceRole.entities.User.delete(userId);
          } catch (e) {
            console.error(`Rollback failed for user ${userId}`);
          }
        }

        for (const { profileId, snapshot } of rollback.updated_profiles) {
          try {
            await base44.asServiceRole.entities.EmployeeProfile.update(profileId, snapshot);
          } catch (e) {
            console.error(`Rollback failed for profile ${profileId}`);
          }
        }

        return Response.json(result);
      }
    }

    return Response.json(result);

  } catch (error) {
    console.error('Function error:', error.message);
    return Response.json({
      error: error.message,
      final_status: 'failed',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
});