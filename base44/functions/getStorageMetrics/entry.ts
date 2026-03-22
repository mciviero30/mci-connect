import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { requireAdmin, safeJsonError } from './_auth.js';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await requireAdmin(base44);

    // Fetch all files from different sources
    const [expenses, jobFiles, employeeDocuments, aiDocuments] = await Promise.all([
      base44.asServiceRole.entities.Expense.filter({ receipt_url: { $ne: null } }),
      base44.asServiceRole.entities.JobFile.list(),
      base44.asServiceRole.entities.EmployeeDocument.list(),
      base44.asServiceRole.entities.AIDocument.filter({ file_url: { $ne: null } })
    ]);

    const totalFiles = expenses.length + jobFiles.length + employeeDocuments.length + aiDocuments.length;

    // Estimate storage (0.5MB per file average)
    const estimatedSizeMB = (totalFiles * 0.5).toFixed(2);
    const estimatedSizeGB = (estimatedSizeMB / 1024).toFixed(2);

    return Response.json({
      totalFiles,
      estimatedSizeMB,
      estimatedSizeGB,
      breakdown: {
        receipts: expenses.length,
        jobFiles: jobFiles.length,
        employeeDocuments: employeeDocuments.length,
        aiDocuments: aiDocuments.length
      },
      lastScanned: new Date().toISOString()
    });
  } catch (error) {
    if (error instanceof Response) throw error;
    return safeJsonError('Metrics fetch failed', 500, error.message);
  }
});