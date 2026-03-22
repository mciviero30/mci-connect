import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const normalizeEmail = (email) => {
  if (!email) return null;
  return email.trim().toLowerCase();
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Admin-only operation
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    console.log('🔄 Starting user_id backfill migration...');

    // Step 1: Build email → user_id map
    const allUsers = await base44.asServiceRole.entities.User.list('', 10000);
    const emailToUserId = {};
    const duplicateEmails = new Set();

    for (const u of allUsers) {
      const normalizedEmail = normalizeEmail(u.email);
      if (!normalizedEmail) continue;

      if (emailToUserId[normalizedEmail]) {
        duplicateEmails.add(normalizedEmail);
        console.warn(`⚠️ Duplicate email detected: ${normalizedEmail}`);
      } else {
        emailToUserId[normalizedEmail] = u.id;
      }
    }

    // Remove duplicates from map (cannot safely backfill)
    for (const dupEmail of duplicateEmails) {
      delete emailToUserId[dupEmail];
    }

    console.log(`✅ Built user map: ${Object.keys(emailToUserId).length} unique users`);
    console.log(`⚠️ Skipped ${duplicateEmails.size} duplicate emails`);

    const results = {
      totalBackfilled: 0,
      totalSkipped: 0,
      totalConflicts: duplicateEmails.size,
      byEntity: {}
    };

    // Step 2: Backfill each entity
    const entityMappings = [
      { entity: 'TimeEntry', emailField: 'employee_email', userIdField: 'user_id' },
      { entity: 'DrivingLog', emailField: 'employee_email', userIdField: 'user_id' },
      { entity: 'WeeklyPayroll', emailField: 'employee_email', userIdField: 'user_id' },
      { entity: 'JobAssignment', emailField: 'employee_email', userIdField: 'user_id' },
      { entity: 'Expense', emailField: 'employee_email', userIdField: 'user_id' },
      { entity: 'Task', emailField: 'assigned_to', userIdField: 'assigned_to_user_id' },
      { entity: 'ChatMessage', emailField: 'sender_email', userIdField: 'sender_user_id' },
      { entity: 'Quote', emailField: 'assigned_to', userIdField: 'assigned_to_user_id' },
      { entity: 'FormSubmission', emailField: 'submitted_by_email', userIdField: 'submitted_by_user_id' },
      { entity: 'Post', emailField: 'author_email', userIdField: 'author_user_id' },
      { entity: 'ProjectMember', emailField: 'user_email', userIdField: 'user_id' },
      { entity: 'TimeOffRequest', emailField: 'employee_email', userIdField: 'user_id' },
      { entity: 'CourseProgress', emailField: 'employee_email', userIdField: 'user_id' },
      { entity: 'EmployeeDirectory', emailField: 'employee_email', userIdField: 'user_id' },
      { entity: 'FieldNote', emailField: 'recorded_by', userIdField: 'recorded_by_user_id' },
      { entity: 'PendingEmployee', emailField: 'email', userIdField: 'user_id' },
    ];

    // Multi-field entities
    const multiFieldEntities = [
      { 
        entity: 'Recognition', 
        mappings: [
          { emailField: 'employee_email', userIdField: 'employee_user_id' },
          { emailField: 'given_by_email', userIdField: 'given_by_user_id' }
        ]
      },
      {
        entity: 'ChangeOrder',
        mappings: [
          { emailField: 'requested_by', userIdField: 'requested_by_user_id' },
          { emailField: 'approved_by_internal', userIdField: 'approved_by_internal_user_id' }
        ]
      },
      {
        entity: 'RFI',
        mappings: [
          { emailField: 'requested_by', userIdField: 'requested_by_user_id' },
          { emailField: 'assigned_to', userIdField: 'assigned_to_user_id' },
          { emailField: 'answered_by', userIdField: 'answered_by_user_id' }
        ]
      },
      {
        entity: 'Submittal',
        mappings: [
          { emailField: 'submitted_by', userIdField: 'submitted_by_user_id' },
          { emailField: 'reviewed_by', userIdField: 'reviewed_by_user_id' }
        ]
      },
      {
        entity: 'SafetyIncident',
        mappings: [
          { emailField: 'reported_by', userIdField: 'reported_by_user_id' },
          { emailField: 'affected_person_email', userIdField: 'affected_person_user_id' }
        ]
      },
      {
        entity: 'DailyFieldReport',
        mappings: [
          { emailField: 'captured_by', userIdField: 'captured_by_user_id' },
          { emailField: 'reviewed_by', userIdField: 'reviewed_by_user_id' }
        ]
      }
    ];

    // Process single-field entities
    for (const mapping of entityMappings) {
      try {
        console.log(`\n🔍 Processing ${mapping.entity}...`);
        
        const records = await base44.asServiceRole.entities[mapping.entity].list('', 10000);
        let backfilled = 0;
        let skipped = 0;

        for (const record of records) {
          // Skip if user_id already set
          if (record[mapping.userIdField]) {
            continue;
          }

          const email = record[mapping.emailField];
          const normalizedEmail = normalizeEmail(email);

          if (!normalizedEmail || !emailToUserId[normalizedEmail]) {
            skipped++;
            continue;
          }

          // Backfill user_id
          await base44.asServiceRole.entities[mapping.entity].update(record.id, {
            [mapping.userIdField]: emailToUserId[normalizedEmail]
          });
          backfilled++;
        }

        results.byEntity[mapping.entity] = { backfilled, skipped };
        results.totalBackfilled += backfilled;
        results.totalSkipped += skipped;

        console.log(`✅ ${mapping.entity}: ${backfilled} backfilled, ${skipped} skipped`);
      } catch (error) {
        console.error(`❌ Error processing ${mapping.entity}:`, error.message);
        results.byEntity[mapping.entity] = { error: error.message };
      }
    }

    // Process multi-field entities
    for (const entityConfig of multiFieldEntities) {
      try {
        console.log(`\n🔍 Processing ${entityConfig.entity} (multi-field)...`);
        
        const records = await base44.asServiceRole.entities[entityConfig.entity].list('', 10000);
        let backfilled = 0;
        let skipped = 0;

        for (const record of records) {
          const updates = {};
          let hasUpdate = false;

          for (const mapping of entityConfig.mappings) {
            // Skip if user_id already set
            if (record[mapping.userIdField]) {
              continue;
            }

            const email = record[mapping.emailField];
            const normalizedEmail = normalizeEmail(email);

            if (!normalizedEmail || !emailToUserId[normalizedEmail]) {
              continue;
            }

            updates[mapping.userIdField] = emailToUserId[normalizedEmail];
            hasUpdate = true;
          }

          if (hasUpdate) {
            await base44.asServiceRole.entities[entityConfig.entity].update(record.id, updates);
            backfilled++;
          } else {
            skipped++;
          }
        }

        results.byEntity[entityConfig.entity] = { backfilled, skipped };
        results.totalBackfilled += backfilled;
        results.totalSkipped += skipped;

        console.log(`✅ ${entityConfig.entity}: ${backfilled} backfilled, ${skipped} skipped`);
      } catch (error) {
        console.error(`❌ Error processing ${entityConfig.entity}:`, error.message);
        results.byEntity[entityConfig.entity] = { error: error.message };
      }
    }

    // Special handling for Invoice and Photo (use created_by)
    try {
      console.log(`\n🔍 Processing Invoice (created_by → created_by_user_id)...`);
      const invoices = await base44.asServiceRole.entities.Invoice.list('', 10000);
      let backfilled = 0;
      let skipped = 0;

      for (const invoice of invoices) {
        if (invoice.created_by_user_id) continue;

        const normalizedEmail = normalizeEmail(invoice.created_by);
        if (!normalizedEmail || !emailToUserId[normalizedEmail]) {
          skipped++;
          continue;
        }

        await base44.asServiceRole.entities.Invoice.update(invoice.id, {
          created_by_user_id: emailToUserId[normalizedEmail]
        });
        backfilled++;
      }

      results.byEntity['Invoice'] = { backfilled, skipped };
      results.totalBackfilled += backfilled;
      results.totalSkipped += skipped;

      console.log(`✅ Invoice: ${backfilled} backfilled, ${skipped} skipped`);
    } catch (error) {
      console.error(`❌ Error processing Invoice:`, error.message);
      results.byEntity['Invoice'] = { error: error.message };
    }

    try {
      console.log(`\n🔍 Processing Photo (created_by → uploaded_by_user_id)...`);
      const photos = await base44.asServiceRole.entities.Photo.list('', 10000);
      let backfilled = 0;
      let skipped = 0;

      for (const photo of photos) {
        if (photo.uploaded_by_user_id) continue;

        const normalizedEmail = normalizeEmail(photo.created_by);
        if (!normalizedEmail || !emailToUserId[normalizedEmail]) {
          skipped++;
          continue;
        }

        await base44.asServiceRole.entities.Photo.update(photo.id, {
          uploaded_by_user_id: emailToUserId[normalizedEmail]
        });
        backfilled++;
      }

      results.byEntity['Photo'] = { backfilled, skipped };
      results.totalBackfilled += backfilled;
      results.totalSkipped += skipped;

      console.log(`✅ Photo: ${backfilled} backfilled, ${skipped} skipped`);
    } catch (error) {
      console.error(`❌ Error processing Photo:`, error.message);
      results.byEntity['Photo'] = { error: error.message };
    }

    console.log('\n📊 BACKFILL SUMMARY:', results);

    return Response.json({
      success: true,
      message: 'User ID backfill completed',
      results
    });

  } catch (error) {
    console.error('❌ Backfill error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});