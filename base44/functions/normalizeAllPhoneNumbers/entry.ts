import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

/**
 * Universal Phone Number Normalization Service
 * Normalizes ALL phone numbers across all entities to XXX-XXX-XXXX format
 */

function formatPhone(phone) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length !== 10) return phone; // Keep invalid as-is
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const results = {
      users: 0,
      employeeProfiles: 0,
      employeeDirectory: 0,
      employeeInvitations: 0,
      customers: 0,
      errors: []
    };

    // 1. Normalize User.phone
    try {
      const users = await base44.asServiceRole.entities.User.list('', 500);
      for (const u of users) {
        if (u.phone) {
          const formatted = formatPhone(u.phone);
          if (formatted !== u.phone) {
            await base44.asServiceRole.entities.User.update(u.id, { phone: formatted });
            results.users++;
          }
        }
      }
    } catch (err) {
      results.errors.push(`Users: ${err.message}`);
    }

    // 2. Normalize EmployeeProfile.phone + emergency_contact_phone
    try {
      const profiles = await base44.asServiceRole.entities.EmployeeProfile.list('', 500);
      for (const p of profiles) {
        const updates = {};
        if (p.phone) {
          const formatted = formatPhone(p.phone);
          if (formatted !== p.phone) updates.phone = formatted;
        }
        if (p.emergency_contact_phone) {
          const formatted = formatPhone(p.emergency_contact_phone);
          if (formatted !== p.emergency_contact_phone) updates.emergency_contact_phone = formatted;
        }
        if (Object.keys(updates).length > 0) {
          await base44.asServiceRole.entities.EmployeeProfile.update(p.id, updates);
          results.employeeProfiles++;
        }
      }
    } catch (err) {
      results.errors.push(`EmployeeProfile: ${err.message}`);
    }

    // 3. Normalize EmployeeDirectory.phone
    try {
      const directory = await base44.asServiceRole.entities.EmployeeDirectory.list('', 500);
      for (const d of directory) {
        if (d.phone) {
          const formatted = formatPhone(d.phone);
          if (formatted !== d.phone) {
            await base44.asServiceRole.entities.EmployeeDirectory.update(d.id, { phone: formatted });
            results.employeeDirectory++;
          }
        }
      }
    } catch (err) {
      results.errors.push(`EmployeeDirectory: ${err.message}`);
    }

    // 4. Normalize EmployeeInvitation.phone
    try {
      const invitations = await base44.asServiceRole.entities.EmployeeInvitation.list('', 500);
      for (const inv of invitations) {
        if (inv.phone) {
          const formatted = formatPhone(inv.phone);
          if (formatted !== inv.phone) {
            await base44.asServiceRole.entities.EmployeeInvitation.update(inv.id, { phone: formatted });
            results.employeeInvitations++;
          }
        }
      }
    } catch (err) {
      results.errors.push(`EmployeeInvitation: ${err.message}`);
    }

    // 5. Normalize Customer.phone + secondary_phone + mobile
    try {
      const customers = await base44.asServiceRole.entities.Customer.list('', 500);
      for (const c of customers) {
        const updates = {};
        if (c.phone) {
          const formatted = formatPhone(c.phone);
          if (formatted !== c.phone) updates.phone = formatted;
        }
        if (c.secondary_phone) {
          const formatted = formatPhone(c.secondary_phone);
          if (formatted !== c.secondary_phone) updates.secondary_phone = formatted;
        }
        if (c.mobile) {
          const formatted = formatPhone(c.mobile);
          if (formatted !== c.mobile) updates.mobile = formatted;
        }
        if (Object.keys(updates).length > 0) {
          await base44.asServiceRole.entities.Customer.update(c.id, updates);
          results.customers++;
        }
      }
    } catch (err) {
      results.errors.push(`Customer: ${err.message}`);
    }

    return Response.json({ 
      success: true, 
      results,
      message: `Normalized ${results.users + results.employeeProfiles + results.employeeDirectory + results.employeeInvitations + results.customers} phone numbers`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});