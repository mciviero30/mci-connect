import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return Response.json({ error: 'Missing jobId' }, { status: 400 });
    }

    // Fetch job and client-visible tasks
    const job = await base44.entities.Job.get(jobId);
    const tasks = await base44.entities.Task.filter({ 
      job_id: jobId,
      visible_to_client: true 
    });

    // Create PDF
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text('Task Progress Report', 20, 20);
    
    doc.setFontSize(12);
    doc.text(`Project: ${job.name || 'Unnamed Project'}`, 20, 35);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 42);
    
    // Summary
    const completed = tasks.filter(t => t.status === 'completed').length;
    const total = tasks.length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    doc.setFontSize(14);
    doc.text('Summary', 20, 55);
    doc.setFontSize(10);
    doc.text(`Total Tasks: ${total}`, 20, 63);
    doc.text(`Completed: ${completed} (${percent}%)`, 20, 70);
    doc.text(`In Progress: ${tasks.filter(t => t.status === 'in_progress').length}`, 20, 77);
    doc.text(`Pending: ${tasks.filter(t => t.status === 'pending').length}`, 20, 84);

    // Tasks table
    doc.setFontSize(14);
    doc.text('Task Details', 20, 100);
    
    let y = 110;
    doc.setFontSize(10);
    
    tasks.forEach((task, idx) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }

      // Status indicator
      const statusSymbol = task.status === 'completed' ? '✓' : 
                          task.status === 'in_progress' ? '⚙' : '○';
      
      doc.text(`${statusSymbol} ${task.title}`, 20, y);
      
      if (task.description) {
        y += 7;
        const lines = doc.splitTextToSize(task.description, 170);
        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.text(lines, 25, y);
        doc.setTextColor(0);
        doc.setFontSize(10);
        y += (lines.length * 5);
      }
      
      y += 10;
    });

    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="task-report-${jobId}.pdf"`
      }
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
});