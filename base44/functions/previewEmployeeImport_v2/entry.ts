import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * previewEmployeeImport_v2 — READ-ONLY
 *
 * Analyzes hourly_rows + driving_rows from a payroll Excel import,
 * extracts unique employee names, and attempts to match each against
 * EmployeeDirectory.full_name.
 *
 * NO writes. NO entity creation. Pure preview/analysis.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!['admin', 'ceo'].includes(user.role)) {
      return Response.json({ error: 'Forbidden: Only Admin or CEO can preview employee imports' }, { status: 403 });
    }

    const body = await req.json();
    const { hourly_rows = [], driving_rows = [] } = body;

    if (!Array.isArray(hourly_rows) || !Array.isArray(driving_rows)) {
      throw new Error('hourly_rows and driving_rows must be arrays');
    }

    console.log(`[previewEmployeeImport_v2] Received ${hourly_rows.length} hourly rows, ${driving_rows.length} driving rows`);

    // ========================================================================
    // STEP 1 — Extract unique employee names from both row sets
    // ========================================================================
    const rawNameSet = new Set();

    for (const row of [...hourly_rows, ...driving_rows]) {
      const name = row?.employee_name || row?.name || row?.connecteam_name || '';
      if (name.trim()) {
        rawNameSet.add(name.trim());
      }
    }

    const rawNames = Array.from(rawNameSet);
    console.log(`[previewEmployeeImport_v2] ${rawNames.length} unique raw names extracted`);

    // ========================================================================
    // STEP 2 — Normalize helper
    // Trim, collapse spaces, remove trailing dots, lowercase
    // ========================================================================
    const normalize = (str) =>
      str
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/\.+$/, '')
        .toLowerCase();

    // ========================================================================
    // STEP 3 — Load EmployeeDirectory and build match indexes
    // ========================================================================
    const allEmployees = await base44.asServiceRole.entities.EmployeeDirectory.list();
    console.log(`[previewEmployeeImport_v2] Loaded ${allEmployees.length} EmployeeDirectory records`);

    // exact (trimmed) → employee
    const exactIndex = new Map();
    // normalized → employee
    const normalizedIndex = new Map();

    for (const emp of allEmployees) {
      const fullName = emp.full_name || '';
      if (!fullName.trim()) continue;

      const trimmed = fullName.trim();
      const norm = normalize(fullName);

      if (!exactIndex.has(trimmed)) {
        exactIndex.set(trimmed, emp);
      }
      if (!normalizedIndex.has(norm)) {
        normalizedIndex.set(norm, emp);
      }
    }

    // ========================================================================
    // STEP 4 — Match each unique name and build result
    // ========================================================================
    let exact_match = 0;
    let normalized_match = 0;
    let not_found = 0;

    const details = rawNames.map((excelName) => {
      const trimmed = excelName.trim();
      const norm = normalize(excelName);

      // Exact match (trimmed, case-sensitive)
      if (exactIndex.has(trimmed)) {
        const emp = exactIndex.get(trimmed);
        exact_match++;
        return {
          excel_name: excelName,
          match_status: 'exact',
          employee_id: emp.id,
          matched_to: emp.full_name
        };
      }

      // Normalized match (case-insensitive, collapsed spaces, no trailing dots)
      if (normalizedIndex.has(norm)) {
        const emp = normalizedIndex.get(norm);
        normalized_match++;
        return {
          excel_name: excelName,
          match_status: 'normalized',
          employee_id: emp.id,
          matched_to: emp.full_name
        };
      }

      // No match
      not_found++;
      return {
        excel_name: excelName,
        match_status: 'not_found',
        employee_id: null,
        matched_to: null
      };
    });

    console.log(`[previewEmployeeImport_v2] Results — exact: ${exact_match}, normalized: ${normalized_match}, not_found: ${not_found}`);

    return Response.json({
      success: true,
      summary: {
        total_unique_employees_in_excel: rawNames.length,
        exact_match,
        normalized_match,
        not_found
      },
      details
    });

  } catch (error) {
    console.error('[previewEmployeeImport_v2] Error:', error.message);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});