import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { format, subDays } from 'npm:date-fns';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify this is an admin or scheduled job
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { job_id } = await req.json();
    
    if (!job_id) {
      return Response.json({ error: 'job_id required' }, { status: 400 });
    }

    // Get job details
    const jobs = await base44.asServiceRole.entities.Job.filter({ id: job_id });
    const job = jobs[0];
    
    if (!job) {
      return Response.json({ error: 'Job not found' }, { status: 404 });
    }

    // Get yesterday's date
    const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
    const today = format(new Date(), 'yyyy-MM-dd');

    // Get yesterday's activities
    const [tasks, comments, photos] = await Promise.all([
      base44.asServiceRole.entities.Task.filter({ 
        job_id: job_id,
        status: 'completed',
        updated_date: { $gte: yesterday, $lt: today }
      }),
      base44.asServiceRole.entities.Comment.filter({ 
        project_id: job_id,
        created_date: { $gte: yesterday, $lt: today }
      }),
      base44.asServiceRole.entities.Photo.filter({ 
        job_id: job_id,
        created_date: { $gte: yesterday, $lt: today }
      })
    ]);

    // Get project members who want daily digests
    const members = await base44.asServiceRole.entities.ProjectMember.filter({ 
      project_id: job_id 
    });

    // Build digest email
    const subject = `📊 Daily Digest: ${job.name} - ${format(new Date(yesterday), 'MMMM dd, yyyy')}`;
    
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #FFB800; padding: 20px; text-align: center;">
          <h1 style="color: #1a1a1a; margin: 0;">MCI FIELD</h1>
          <p style="color: #1a1a1a; margin: 5px 0 0 0;">Daily Progress Digest</p>
        </div>
        
        <div style="padding: 20px; background: #f8fafc;">
          <h2 style="color: #1a1a1a; margin-top: 0;">${job.name}</h2>
          <p style="color: #64748b; margin-bottom: 20px;">${format(new Date(yesterday), 'EEEE, MMMM dd, yyyy')}</p>
          
          <div style="background: white; border-radius: 8px; padding: 15px; margin-bottom: 15px;">
            <h3 style="color: #22c55e; margin-top: 0;">✅ ${tasks.length} Tasks Completed</h3>
            ${tasks.slice(0, 5).map(task => `
              <div style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                <strong>${task.title}</strong>
              </div>
            `).join('')}
            ${tasks.length > 5 ? `<p style="color: #64748b; font-size: 14px;">...and ${tasks.length - 5} more</p>` : ''}
          </div>
          
          <div style="background: white; border-radius: 8px; padding: 15px; margin-bottom: 15px;">
            <h3 style="color: #3b82f6; margin-top: 0;">💬 ${comments.length} Comments Added</h3>
            ${comments.slice(0, 3).map(comment => `
              <div style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                <strong>${comment.author_name}</strong>
                <p style="color: #64748b; margin: 5px 0 0 0;">${comment.content.substring(0, 100)}${comment.content.length > 100 ? '...' : ''}</p>
              </div>
            `).join('')}
          </div>
          
          <div style="background: white; border-radius: 8px; padding: 15px;">
            <h3 style="color: #a855f7; margin-top: 0;">📷 ${photos.length} Photos Uploaded</h3>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
              ${photos.slice(0, 6).map(photo => `
                <img src="${photo.photo_url}" style="width: 100%; height: 100px; object-fit: cover; border-radius: 4px;" />
              `).join('')}
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 20px;">
            <a href="${Deno.env.get('APP_URL')}/field-project/${job_id}" 
               style="display: inline-block; background: #FFB800; color: #1a1a1a; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              View Full Project
            </a>
          </div>
        </div>
        
        <div style="padding: 20px; text-align: center; color: #94a3b8; font-size: 12px;">
          <p>You're receiving this because you're a member of this project.</p>
          <p>© ${new Date().getFullYear()} MCI Field. All rights reserved.</p>
        </div>
      </div>
    `;

    // Send email to each member
    const emailPromises = members.map(member => 
      base44.asServiceRole.integrations.Core.SendEmail({
        from_name: 'MCI Field',
        to: member.user_email,
        subject: subject,
        body: htmlBody
      })
    );

    await Promise.all(emailPromises);

    return Response.json({ 
      success: true, 
      recipients: members.length,
      summary: {
        tasks: tasks.length,
        comments: comments.length,
        photos: photos.length
      }
    });

  } catch (error) {
    console.error('Error sending daily digest:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});