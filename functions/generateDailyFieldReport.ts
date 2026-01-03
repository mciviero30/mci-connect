import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { job_id, report_date, manager_note, weather, crew_size } = await req.json();
    
    const targetDate = report_date || new Date().toISOString().split('T')[0];
    const startOfDay = new Date(targetDate + 'T00:00:00Z');
    const endOfDay = new Date(targetDate + 'T23:59:59Z');

    // Fetch job details
    const job = await base44.asServiceRole.entities.Job.filter({ id: job_id }, '', 1);
    if (!job || job.length === 0) {
      return Response.json({ error: 'Job not found' }, { status: 404 });
    }

    const jobData = job[0];

    // Fetch all activity for the day
    const [allTasks, allPhotos, allComments, allActivityLogs] = await Promise.all([
      base44.asServiceRole.entities.Task.filter({ job_id }),
      base44.asServiceRole.entities.Photo.filter({ job_id }),
      base44.asServiceRole.entities.ClientTaskComment.filter({ job_id }),
      base44.asServiceRole.entities.FieldActivityLog.filter({ job_id }).catch(() => [])
    ]);

    // Filter by date - tasks updated today
    const tasksWorkedToday = allTasks.filter(t => {
      const updated = new Date(t.updated_date);
      return updated >= startOfDay && updated <= endOfDay;
    });

    const tasksCompletedToday = tasksWorkedToday.filter(t => t.status === 'completed');

    // Punch items
    const punchItemsCreatedToday = allTasks.filter(t => {
      if (t.task_type !== 'punch_item' || !t.created_by_client) return false;
      const created = new Date(t.created_date);
      return created >= startOfDay && created <= endOfDay;
    });

    const punchItemsResolvedToday = allTasks.filter(t => {
      if (t.task_type !== 'punch_item') return false;
      const updated = new Date(t.updated_date);
      return updated >= startOfDay && updated <= endOfDay && 
             ['completed', 'accepted'].includes(t.punch_status || t.status);
    });

    // Photos uploaded today
    const photosUploadedToday = allPhotos.filter(p => {
      const created = new Date(p.created_date);
      return created >= startOfDay && created <= endOfDay;
    });

    // Client comments today
    const clientCommentsToday = allComments.filter(c => {
      const created = new Date(c.created_date);
      return created >= startOfDay && created <= endOfDay && c.is_client;
    });

    // Create snapshots
    const tasksSnapshot = tasksWorkedToday.map(t => ({
      id: t.id,
      title: t.title,
      status: t.status,
      assigned_to: t.assigned_to,
      completed_today: t.status === 'completed'
    }));

    const punchItemsSnapshot = [...punchItemsCreatedToday, ...punchItemsResolvedToday].map(p => ({
      id: p.id,
      title: p.title,
      status: p.punch_status || p.status,
      created_by_client: p.created_by_client
    }));

    const photosSnapshot = photosUploadedToday.slice(0, 10).map(p => ({
      id: p.id,
      file_url: p.file_url,
      caption: p.caption || '',
      uploaded_by: p.uploaded_by
    }));

    const commentsSnapshot = clientCommentsToday.map(c => ({
      task_id: c.task_id,
      comment: c.comment,
      author_name: c.author_name,
      is_client: c.is_client
    }));

    // Check if report already exists
    const existingReports = await base44.asServiceRole.entities.DailyFieldReport.filter({
      job_id,
      report_date: targetDate
    });

    const reportData = {
      job_id,
      job_name: jobData.job_name_field || jobData.name,
      report_date: targetDate,
      summary: {
        tasks_worked: tasksWorkedToday.length,
        tasks_completed: tasksCompletedToday.length,
        punch_items_created: punchItemsCreatedToday.length,
        punch_items_resolved: punchItemsResolvedToday.length,
        photos_uploaded: photosUploadedToday.length,
        client_comments: clientCommentsToday.length
      },
      tasks_snapshot: tasksSnapshot,
      punch_items_snapshot: punchItemsSnapshot,
      photos_snapshot: photosSnapshot,
      comments_snapshot: commentsSnapshot,
      manager_note: manager_note || '',
      weather: weather || '',
      crew_size: crew_size || 0,
      client_visible: true,
      generated_by: 'auto'
    };

    let report;
    if (existingReports.length > 0) {
      // Update existing
      report = await base44.asServiceRole.entities.DailyFieldReport.update(
        existingReports[0].id,
        reportData
      );
    } else {
      // Create new
      report = await base44.asServiceRole.entities.DailyFieldReport.create(reportData);
    }

    return Response.json({ 
      success: true, 
      report,
      message: `Daily report generated for ${targetDate}`
    });

  } catch (error) {
    console.error('Error generating daily report:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});