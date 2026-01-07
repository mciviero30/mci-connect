import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.2';

/**
 * Export Field plan with measurement overlays to PDF
 * Includes automatic legend
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { planId, jobId } = await req.json();

    if (!planId || !jobId) {
      return Response.json({ error: 'Missing planId or jobId' }, { status: 400 });
    }

    // Fetch plan and measurements
    const [plan, horizontalMeasurements, verticalMeasurements, benchmarks, job] = await Promise.all([
      base44.entities.Plan.filter({ id: planId }).then(p => p[0]),
      base44.entities.FieldDimension.filter({ project_id: jobId }),
      base44.entities.VerticalMeasurement.filter({ project_id: jobId }),
      base44.entities.Benchmark.filter({ project_id: jobId }),
      base44.entities.Job.filter({ id: jobId }).then(j => j[0])
    ]);

    if (!plan || !job) {
      return Response.json({ error: 'Plan or job not found' }, { status: 404 });
    }

    // Create PDF
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Add title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(plan.name || 'Field Plan', 15, 15);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Job: ${job.name}`, 15, 22);
    doc.text(`Exported: ${new Date().toLocaleDateString()}`, 15, 27);

    // Add plan image (simplified - real implementation would need canvas rendering)
    let imageY = 35;
    const imageHeight = pageHeight - imageY - 60;

    // Note: Actual image rendering would require fetching and converting the image
    doc.setDrawColor(200);
    doc.rect(15, imageY, pageWidth - 30, imageHeight);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text('Plan Image', pageWidth / 2, imageY + imageHeight / 2, { align: 'center' });

    // Add Legend at bottom
    const legendY = pageHeight - 50;
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text('Measurement Legend', 15, legendY);

    let currentX = 15;
    let currentY = legendY + 8;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');

    // Horizontal measurements
    if (horizontalMeasurements.length > 0) {
      doc.setTextColor(0);
      doc.text('HORIZONTAL:', currentX, currentY);
      currentY += 5;

      const horizontalTypes = {
        FF_FF: { label: 'FF to FF', color: [59, 130, 246] },
        FF_CL: { label: 'FF to CL', color: [16, 185, 129] },
        CL_FF: { label: 'CL to FF', color: [245, 158, 11] },
        CL_CL: { label: 'CL to CL', color: [239, 68, 68] }
      };

      Object.entries(horizontalTypes).forEach(([key, config]) => {
        doc.setFillColor(...config.color);
        doc.circle(currentX + 2, currentY - 1, 1.5, 'F');
        doc.setTextColor(0);
        doc.text(config.label, currentX + 6, currentY);
        currentX += 25;
      });

      currentX = 15;
      currentY += 6;
    }

    // Vertical measurements
    if (verticalMeasurements.length > 0) {
      doc.setTextColor(0);
      doc.text('VERTICAL:', currentX, currentY);
      currentY += 5;

      const verticalTypes = {
        BM_C: { label: 'BM to C', color: [139, 92, 246] },
        BM_F: { label: 'BM to F', color: [236, 72, 153] },
        F_C: { label: 'F to C', color: [6, 182, 212] }
      };

      Object.entries(verticalTypes).forEach(([key, config]) => {
        doc.setFillColor(...config.color);
        doc.circle(currentX + 2, currentY - 1, 1.5, 'F');
        doc.setTextColor(0);
        doc.text(config.label, currentX + 6, currentY);
        currentX += 25;
      });

      currentX = 15;
      currentY += 6;
    }

    // Benchmarks
    if (benchmarks.length > 0) {
      doc.setTextColor(0);
      doc.text('BENCHMARKS:', currentX, currentY);
      currentY += 5;

      const benchmarkTypes = {
        LASER: { label: 'Laser Level', color: [239, 68, 68] },
        FLOOR_MARK: { label: 'Floor Mark', color: [59, 130, 246] }
      };

      Object.entries(benchmarkTypes).forEach(([key, config]) => {
        doc.setFillColor(...config.color);
        doc.circle(currentX + 2, currentY - 1, 1.5, 'F');
        doc.setTextColor(0);
        doc.text(config.label, currentX + 6, currentY);
        currentX += 30;
      });
    }

    // Generate PDF buffer
    const pdfBuffer = doc.output('arraybuffer');

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="plan_${plan.name}_measurements.pdf"`
      }
    });

  } catch (error) {
    console.error('[exportPlanWithOverlays] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});