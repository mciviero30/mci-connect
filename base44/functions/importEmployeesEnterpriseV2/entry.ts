import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Admin-only access
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { employees, mode } = await req.json();

    if (!employees || !Array.isArray(employees)) {
      return Response.json({ error: 'Invalid input: employees must be an array' }, { status: 400 });
    }

    if (!['create_only', 'update_existing', 'overwrite_existing'].includes(mode)) {
      return Response.json({ error: 'Invalid mode: must be create_only, update_existing, or overwrite_existing' }, { status: 400 });
    }

    // Initialize counters and tracking
    const result = {
      mode,
      total_processed: employees.length,
      created_users: 0,
      created_profiles: 0,
      updated_profiles: 0,
      skipped: 0,
      failed: 0,
      errors: [],
      rollback_data: { created_user_ids: [], created_profile_ids: [] },
      timestamp: new Date().toISOString(),
      final_status: 'success'
    };

    // Pre-validation: Check for SSN and employee_code duplicates globally
    const ssnMap = new Map();
    const codeMap = new Map();
    const existingSsns = new Set();
    const existingCodes = new Set();

    try {
      const allProfiles = await base44.asServiceRole.entities.EmployeeProfile.list('', 1000);
      for (const profile of allProfiles) {
        if (profile.ssn_encrypted) existingSsns.add(profile.ssn_encrypted);
        if (profile.employee_code) existingCodes.add(profile.employee_code);
      }
    } catch (err) {
      console.error('Failed to fetch existing profiles:', err.message);
    }

    // Process each employee
    for (let i = 0; i < employees.length; i++) {
      const emp = employees[i];

      try {
        // STEP A: Check/Create User
        let userId;
        let userCreated = false;

        if (!emp.email) {
          throw new Error('Email is required');
        }

        // Search for existing user by email
        const existingUsers = await base44.asServiceRole.entities.User.filter({ email: emp.email });
        
        if (existingUsers.length > 0) {
          userId = existingUsers[0].id;
        } else {
          // Create new user
          const newUser = await base44.asServiceRole.entities.User.create({
            email: emp.email,
            full_name: `${emp.first_name || ''} ${emp.last_name || ''}`.trim(),
            role: 'employee'
          });
          userId = newUser.id;
          userCreated = true;
          result.created_users++;
          result.rollback_data.created_user_ids.push(userId);
        }

        // Validate employee_code for duplicates
        if (emp.employee_code) {
          if (existingCodes.has(emp.employee_code) || codeMap.has(emp.employee_code)) {
            throw new Error(`Duplicate employee_code: ${emp.employee_code}`);
          }
          codeMap.set(emp.employee_code, userId);
        }

        // Validate SSN for duplicates (if provided)
        const ssnHash = emp.ssn ? `SSN_${emp.ssn}` : null;
        if (ssnHash) {
          if (existingSsns.has(ssnHash) || ssnMap.has(ssnHash)) {
            throw new Error(`Duplicate SSN detected`);
          }
          ssnMap.set(ssnHash, userId);
        }

        // STEP B: Check/Create/Update EmployeeProfile
        const existingProfiles = await base44.asServiceRole.entities.EmployeeProfile.filter({ user_id: userId });
        const profileExists = existingProfiles.length > 0;
        const existingProfile = profileExists ? existingProfiles[0] : null;

        if (!profileExists) {
          // Create new profile
          const fullName = `${emp.first_name || ''} ${emp.last_name || ''}`.trim();
          
          const profileData = {
            user_id: userId,
            first_name: emp.first_name,
            last_name: emp.last_name,
            full_name: fullName,
            employee_code: emp.employee_code,
            ssn_encrypted: emp.ssn ? `ENCRYPTED_${emp.ssn}` : null,
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
          result.created_profiles++;
          result.rollback_data.created_profile_ids.push(newProfile.id);
          
        } else {
          // Profile exists - handle based on mode
          if (mode === 'create_only') {
            result.skipped++;
          } else if (mode === 'update_existing') {
            // Update only provided fields (skip nulls)
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

            // Recompute full_name if first or last name updated
            if (emp.first_name !== undefined && emp.first_name !== null || emp.last_name !== undefined && emp.last_name !== null) {
              const fn = emp.first_name || existingProfile.first_name || '';
              const ln = emp.last_name || existingProfile.last_name || '';
              updateData.full_name = `${fn} ${ln}`.trim();
            }

            if (Object.keys(updateData).length > 0) {
              await base44.asServiceRole.entities.EmployeeProfile.update(existingProfile.id, updateData);
              result.updated_profiles++;
            } else {
              result.skipped++;
            }

          } else if (mode === 'overwrite_existing') {
            // Overwrite all fields except user_id
            const fullName = `${emp.first_name || ''} ${emp.last_name || ''}`.trim();
            const overwriteData = {
              first_name: emp.first_name,
              last_name: emp.last_name,
              full_name: fullName,
              employee_code: emp.employee_code,
              ssn_encrypted: emp.ssn ? `ENCRYPTED_${emp.ssn}` : null,
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

      } catch (err) {
        console.error(`Error processing employee ${i}:`, err.message);
        result.errors.push({
          index: i,
          email: emp.email,
          error: err.message
        });
        result.failed++;
        result.final_status = 'hard_fail';
      }
    }

    // If any HARD FAIL occurred, rollback
    if (result.final_status === 'hard_fail') {
      console.log('⚠️ Hard fail detected - rolling back created records...');
      
      // Rollback created profiles
      for (const profileId of result.rollback_data.created_profile_ids) {
        try {
          await base44.asServiceRole.entities.EmployeeProfile.delete(profileId);
        } catch (err) {
          console.error(`Failed to rollback profile ${profileId}:`, err.message);
        }
      }

      // Rollback created users
      for (const userId of result.rollback_data.created_user_ids) {
        try {
          await base44.asServiceRole.entities.User.delete(userId);
        } catch (err) {
          console.error(`Failed to rollback user ${userId}:`, err.message);
        }
      }

      result.rollback_status = 'completed';
    } else {
      result.rollback_status = 'not_needed';
    }

    return Response.json(result);

  } catch (error) {
    console.error('Function error:', error.message);
    return Response.json({ 
      error: error.message,
      status: 'failed',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
});