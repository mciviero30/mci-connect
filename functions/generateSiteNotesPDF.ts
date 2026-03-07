import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { jsPDF } from 'npm:jspdf@2.5.2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { session_id } = await req.json();

    if (!session_id) {
      return Response.json({ error: 'Session ID required' }, { status: 400 });
    }

    const sessions = await base44.entities.SiteNoteSession.filter({ id: session_id });
    
    if (sessions.length === 0) {
      return Response.json({ error: 'Session not found' }, { status: 404 });
    }

    const session = sessions[0];
    const doc = new jsPDF();

    // Helper
    const formatTime = (seconds) => {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Cover Page
    doc.setFontSize(24);
    doc.text('AI Site Notes Report', 20, 30);
    
    doc.setFontSize(12);
    doc.text(`Job: ${session.job_name || 'Unknown'}`, 20, 45);
    doc.text(`Area: ${session.area || 'Unassigned'}`, 20, 52);
    doc.text(`Date: ${new Date(session.session_start).toLocaleDateString()}`, 20, 59);
    doc.text(`Recorded by: ${session.recorded_by_name}`, 20, 66);
    doc.text(`Duration: ${formatTime(session.duration_seconds)}`, 20, 73);
    
    if (session.review_status) {
      doc.setFontSize(10);
      doc.text(`Review Status: ${session.review_status}`, 20, 83);
      doc.text(`Reviewed by: ${session.reviewed_by_name} on ${new Date(session.reviewed_at).toLocaleDateString()}`, 20, 90);
    }

    // Structured Notes
    doc.addPage();
    doc.setFontSize(16);
    doc.text('Structured Notes', 20, 20);
    
    let y = 35;
    const categories = [
      { key: 'general_observations', label: 'General Observations' },
      { key: 'area_specific', label: 'Area-Specific Notes' },
      { key: 'measurement_comments', label: 'Measurement Comments' },
      { key: 'condition_issues', label: 'Condition Issues' },
      { key: 'safety_concerns', label: 'Safety Concerns' },
      { key: 'installation_constraints', label: 'Installation Constraints' }
    ];

    const notes = session.structured_notes || {};

    for (const cat of categories) {
      const items = notes[cat.key] || [];
      if (items.length === 0) continue;

      if (y > 250) {
        doc.addPage();
        y = 20;
      }

      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text(`${cat.label} (${items.length})`, 20, y);
      y += 8;

      doc.setFont(undefined, 'normal');
      doc.setFontSize(10);

      for (const item of items) {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }

        doc.text(`@ ${formatTime(item.timestamp_seconds)}`, 25, y);
        y += 5;

        const content = item.area ? `[${item.area}] ${item.content}` : item.content;
        const lines = doc.splitTextToSize(content, 160);
        doc.text(lines, 25, y);
        y += (lines.length * 5) + 3;

        if (item.severity) {
          doc.text(`Severity: ${item.severity}`, 25, y);
          y += 5;
        }

        y += 3;
      }

      y += 5;
    }

    // Raw Transcript
    doc.addPage();
    doc.setFontSize(16);
    doc.text('Raw Transcription', 20, 20);
    
    doc.setFontSize(10);
    const transcriptLines = doc.splitTextToSize(session.transcript_raw || 'N/A', 170);
    doc.text(transcriptLines, 20, 35);

    // Media Evidence
    if (session.captured_media && session.captured_media.length > 0) {
      doc.addPage();
      doc.setFontSize(16);
      doc.text('Captured Evidence', 20, 20);
      
      y = 35;
      doc.setFontSize(10);
      session.captured_media.forEach((media, idx) => {
        doc.text(`${idx + 1}. ${media.media_type.toUpperCase()} @ ${formatTime(media.timestamp_seconds)}`, 25, y);
        y += 6;
        doc.text(`   URL: ${media.media_url}`, 25, y);
        y += 8;
      });
    }

    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=site-note-${session.id}.pdf`
      }
    });

  } catch (error) {
    console.error('PDF generation failed:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});