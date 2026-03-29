import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import * as XLSX from 'npm:xlsx@0.18.5';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    if (!caller) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const ADMIN_ROLES = ['admin', 'ceo', 'owner', 'super_admin', 'administrator'];
    if (!ADMIN_ROLES.includes(caller.role?.toLowerCase?.()) && caller.position !== 'CEO') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { file_url } = await req.json();
    if (!file_url) return Response.json({ error: 'file_url required' }, { status: 400 });

    // Download the file
    const fileResp = await fetch(file_url);
    if (!fileResp.ok) return Response.json({ error: 'Failed to download file' }, { status: 400 });

    const buffer = await fileResp.arrayBuffer();
    const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (!rows.length) return Response.json({ error: 'No data rows found in spreadsheet' }, { status: 400 });

    // Normalize column names (handle case variations)
    const normalize = (key) => key?.toString().toLowerCase().trim().replace(/\s+/g, '_');

    let created = 0;
    const errors = [];

    for (const row of rows) {
      const normalized = Object.fromEntries(
        Object.entries(row).map(([k, v]) => [normalize(k), v])
      );

      const email = normalized.email?.toString().trim().toLowerCase();
      if (!email) { errors.push('Row missing email — skipped'); continue; }

      const first_name  = normalized.first_name  || normalized.firstname  || '';
      const last_name   = normalized.last_name   || normalized.lastname   || '';
      const full_name   = normalized.full_name   || normalized.fullname   ||
                          `${first_name} ${last_name}`.trim() || email;
      const position    = normalized.position    || normalized.job_title  || normalized.title || '';
      const department  = normalized.department  || '';
      const hourly_rate = parseFloat(normalized.hourly_rate || normalized.rate || 0) || 0;
      const phone       = normalized.phone?.toString() || '';
      const start_date  = normalized.start_date  || normalized.hire_date  || '';

      try {
        // Check if already exists
        const existing = await base44.asServiceRole.entities.PendingEmployee
          .filter({ email }, '', 1).catch(() => []);

        if (existing.length > 0) {
          // Update existing
          await base44.asServiceRole.entities.PendingEmployee.update(existing[0].id, {
            full_name, first_name, last_name, position, department,
            hourly_rate, phone, start_date, status: 'pending'
          });
        } else {
          await base44.asServiceRole.entities.PendingEmployee.create({
            email, full_name, first_name, last_name, position, department,
            hourly_rate, phone, start_date, status: 'pending', migrated: false
          });
        }
        created++;
      } catch (err) {
        errors.push(`${email}: ${err.message}`);
      }
    }

    console.log(`[importEmployeesFromXLSX] Imported ${created} employees`);
    return Response.json({ ok: true, created, total_rows: rows.length, errors });

  } catch (err) {
    console.error('[importEmployeesFromXLSX] error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
});
