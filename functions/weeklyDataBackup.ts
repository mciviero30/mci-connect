import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * W2 FIX: Weekly automated backup of critical data
 * 
 * Exports Jobs, Invoices, Quotes to JSON and uploads to Drive
 * Runs every Sunday at midnight
 * Prevents data loss
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    console.log('🔄 Starting weekly backup...');

    // Fetch all critical data
    const [jobs, invoices, quotes] = await Promise.all([
      base44.asServiceRole.entities.Job.filter({}),
      base44.asServiceRole.entities.Invoice.filter({}),
      base44.asServiceRole.entities.Quote.filter({})
    ]);

    // Create backup JSON
    const backup = {
      backup_date: new Date().toISOString(),
      app_id: Deno.env.get('BASE44_APP_ID'),
      counts: {
        jobs: jobs.length,
        invoices: invoices.length,
        quotes: quotes.length
      },
      data: {
        jobs,
        invoices,
        quotes
      }
    };

    // Convert to JSON blob
    const jsonBlob = JSON.stringify(backup, null, 2);
    const filename = `mci_backup_${new Date().toISOString().split('T')[0]}.json`;

    // Upload to Core (Base44 file storage)
    const uploadResult = await base44.asServiceRole.integrations.Core.UploadFile({
      file: new File([jsonBlob], filename, { type: 'application/json' })
    });

    console.log(`✅ Backup saved: ${uploadResult.file_url}`);

    // Notify admins
    const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
    
    await Promise.all(admins.map(admin =>
      base44.asServiceRole.integrations.Core.SendEmail({
        to: admin.email,
        subject: '✅ Weekly Data Backup Completed',
        body: `Backup completed successfully on ${new Date().toLocaleDateString()}.\n\nBacked up:\n- Jobs: ${jobs.length}\n- Invoices: ${invoices.length}\n- Quotes: ${quotes.length}\n\nBackup file: ${filename}\n\nThis backup is stored securely and can be restored if needed.`,
        from_name: 'MCI Connect Backup System'
      })
    ));

    return Response.json({ 
      success: true,
      backup_file: filename,
      file_url: uploadResult.file_url,
      counts: backup.counts
    });

  } catch (error) {
    console.error('[Backup Error]', error.message);
    
    // Notify admins of failure
    try {
      const base44 = createClientFromRequest(req);
      const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
      
      await Promise.all(admins.map(admin =>
        base44.asServiceRole.integrations.Core.SendEmail({
          to: admin.email,
          subject: '🚨 Weekly Backup Failed',
          body: `Weekly backup failed on ${new Date().toLocaleDateString()}.\n\nError: ${error.message}\n\nPlease investigate immediately.`,
          from_name: 'MCI Connect Backup System'
        })
      ));
    } catch (notifyError) {
      console.error('Failed to notify admins:', notifyError);
    }
    
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});