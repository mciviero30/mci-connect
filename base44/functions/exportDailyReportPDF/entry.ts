import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { jsPDF } from 'npm:jspdf';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // AUTH: require authenticated user
    let currentUser;
    try {
      currentUser = await base44.auth.me();
    } catch {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const allowedRoles = ['admin', 'ceo', 'manager', 'field_supervisor', 'foreman', 'employee'];
    if (!allowedRoles.includes(currentUser?.role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { report_id } = await req.json();

    // Fetch report
    const reports = await base44.asServiceRole.entities.DailyFieldReport.filter({ id: report_id });
    if (!reports || reports.length === 0) {
      return Response.json({ error: 'Report not found' }, { status: 404 });
    }

    const report = reports[0];
    const doc = new jsPDF();
    
    // Header
    doc.setFillColor(80, 125, 180);
    doc.rect(0, 0, 220, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont(undefined, 'bold');
    doc.text('Daily Field Report', 20, 20);
    
    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    doc.text(report.job_name, 20, 30);
    doc.text(new Date(report.report_date).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }), 20, 37);

    // Reset color for body
    doc.setTextColor(0, 0, 0);
    let yPos = 55;

    // Weather & Crew
    if (report.weather || report.crew_size) {
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.text('Site Conditions', 20, yPos);
      yPos += 7;
      doc.setFont(undefined, 'normal');
      if (report.weather) {
        doc.text(`Weather: ${report.weather}`, 25, yPos);
        yPos += 5;
      }
      if (report.crew_size) {
        doc.text(`Crew Size: ${report.crew_size} members`, 25, yPos);
        yPos += 5;
      }
      yPos += 3;
    }

    // Summary Stats
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text('Summary', 20, yPos);
    yPos += 7;
    
    doc.setFont(undefined, 'normal');
    const summary = report.summary || {};
    doc.text(`Tasks Worked: ${summary.tasks_worked || 0}`, 25, yPos);
    yPos += 5;
    doc.text(`Tasks Completed: ${summary.tasks_completed || 0}`, 25, yPos);
    yPos += 5;
    doc.text(`Punch Items Created: ${summary.punch_items_created || 0}`, 25, yPos);
    yPos += 5;
    doc.text(`Punch Items Resolved: ${summary.punch_items_resolved || 0}`, 25, yPos);
    yPos += 5;
    doc.text(`Photos Uploaded: ${summary.photos_uploaded || 0}`, 25, yPos);
    yPos += 5;
    doc.text(`Client Comments: ${summary.client_comments || 0}`, 25, yPos);
    yPos += 10;

    // Manager Note
    if (report.manager_note) {
      doc.setFont(undefined, 'bold');
      doc.text('Manager Note', 20, yPos);
      yPos += 7;
      doc.setFont(undefined, 'normal');
      const noteLines = doc.splitTextToSize(report.manager_note, 170);
      doc.text(noteLines, 25, yPos);
      yPos += noteLines.length * 5 + 5;
    }

    // Tasks
    if (report.tasks_snapshot && report.tasks_snapshot.length > 0) {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      doc.setFont(undefined, 'bold');
      doc.text('Tasks Worked', 20, yPos);
      yPos += 7;
      doc.setFont(undefined, 'normal');
      
      report.tasks_snapshot.forEach((task, idx) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        doc.text(`${idx + 1}. ${task.title}`, 25, yPos);
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(9);
        doc.text(`Status: ${task.status}`, 30, yPos + 4);
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        yPos += 9;
      });
      yPos += 5;
    }

    // Client Comments
    if (report.comments_snapshot && report.comments_snapshot.length > 0) {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      doc.setFont(undefined, 'bold');
      doc.text('Client Comments', 20, yPos);
      yPos += 7;
      doc.setFont(undefined, 'normal');
      
      report.comments_snapshot.forEach((comment, idx) => {
        if (yPos > 260) {
          doc.addPage();
          yPos = 20;
        }
        doc.setFont(undefined, 'bold');
        doc.text(`${comment.author_name}:`, 25, yPos);
        doc.setFont(undefined, 'normal');
        yPos += 5;
        const commentLines = doc.splitTextToSize(comment.comment, 165);
        doc.text(commentLines, 30, yPos);
        yPos += commentLines.length * 5 + 3;
      });
    }

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Generated on ${new Date().toLocaleString()} • MCI Field Management`,
      20,
      doc.internal.pageSize.height - 10
    );

    const pdfBytes = doc.output('arraybuffer');
    return new Response(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="daily-report-${report.report_date}.pdf"`
      }
    });

  } catch (error) {
    console.error('PDF generation error:', error);
    return Response.json({ 
      error: 'Internal server error'
    }, { status: 500 });
  }
});
