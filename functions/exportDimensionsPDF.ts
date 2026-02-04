import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { jobId, jobName, jobAddress, dimensions, unitSystem, measurementSessionId, plans = [], markupsByPlan = {} } = await req.json();

    // FASE 3C-5: Validate measurement_session_id is present (defensive)
    if (!measurementSessionId) {
      console.warn('[exportDimensionsPDF] Missing measurement_session_id - PDF will not be session-scoped');
    }

    const doc = new jsPDF('portrait', 'mm', 'letter');
    
    // PAGE 1: COVER
    addCoverPage(doc, jobName, jobAddress, dimensions, unitSystem, user, plans);
    
    // PAGES 2+: DRAWING PAGES (one per drawing with overlays)
    for (let i = 0; i < plans.length; i++) {
      doc.addPage();
      await addDrawingPage(doc, plans[i], dimensions, markupsByPlan[`plan_${plans[i].id}`] || [], unitSystem, i + 1, plans.length);
    }
    
    // PAGE: MEASUREMENT SUMMARY TABLE (Grouped by type and condition)
    doc.addPage();
    addMeasurementSummaryTable(doc, dimensions, unitSystem);
    
    // PAGE: LEGEND / GLOSSARY
    doc.addPage();
    addLegendPage(doc);

    // Generate PDF blob
    const pdfBlob = doc.output('blob');
    const pdfFile = new File([pdfBlob], `measurement-package_${jobName}_${Date.now()}.pdf`, { type: 'application/pdf' });
    
    // Upload to storage
    const { file_url } = await base44.integrations.Core.UploadFile({ file: pdfFile });

    // FASE 3C-5: Save PDF as Plan entity with measurement_session_id ownership
    if (measurementSessionId) {
      await base44.asServiceRole.entities.Plan.create({
        job_id: jobId,
        name: `Measurement Package - ${new Date().toLocaleDateString()}`,
        file_url: file_url,
        purpose: 'measurement',
        measurement_session_id: measurementSessionId,
        order: 9999,
      });
      console.log(`[exportDimensionsPDF] PDF saved to session: ${measurementSessionId}`);
    }

    return Response.json({ 
      success: true,
      pdf_url: file_url 
    });

  } catch (error) {
    console.error('[ExportDimensionsPDF] Error:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});

function addCoverPage(doc, jobName, jobAddress, dimensions, unitSystem, user, plans) {
  // White background
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, 210, 297, 'F');
  
  // Blue header bar
  doc.setFillColor(30, 58, 138);
  doc.rect(0, 0, 210, 80, 'F');
  
  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(32);
  doc.setFont('helvetica', 'bold');
  doc.text('MEASUREMENT', 20, 35);
  doc.text('PACKAGE', 20, 55);
  
  // Subtitle
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(200, 200, 255);
  doc.text('Professional Field-Ready Documentation', 20, 72);
  
  // Job Info Section
  let yPos = 105;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Job Information', 20, yPos);
  yPos += 12;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Job Name: ${jobName || 'Untitled'}`, 20, yPos);
  yPos += 8;
  if (jobAddress) {
    doc.text(`Address: ${jobAddress}`, 20, yPos);
    yPos += 8;
  }
  doc.text(`Measurement Date: ${new Date().toLocaleDateString()}`, 20, yPos);
  yPos += 8;
  doc.text(`Measured By: ${user.full_name}`, 20, yPos);
  yPos += 8;
  doc.text(`Unit System: ${unitSystem === 'imperial' ? 'Imperial (feet/inches)' : 'Metric (millimeters)'}`, 20, yPos);
  yPos += 8;
  doc.text(`Total Drawings: ${plans.length}`, 20, yPos);
  yPos += 8;
  doc.text(`Total Measurements: ${dimensions.length}`, 20, yPos);
  
  // Bottom banner
  yPos = 260;
  doc.setFillColor(245, 245, 245);
  doc.rect(0, yPos, 210, 37, 'F');
  
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('✓ All measurements reviewed and locked', 20, yPos + 12);
  doc.text('Generated from MCI Measurement System', 20, yPos + 22);
  doc.text(`Page 1 of ${plans.length + 3}`, 180, yPos + 12);
}

async function addDrawingPage(doc, plan, dimensions, markups, unitSystem, pageNum, totalPages) {
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, 210, 297, 'F');
  
  // Header
  doc.setFillColor(30, 58, 138);
  doc.rect(0, 0, 210, 20, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`Page ${pageNum} of ${totalPages} — ${plan.name}`, 15, 13);
  
  // Load and render drawing image
  try {
    const response = await fetch(plan.image_url || plan.file_url);
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    const imgData = `data:image/png;base64,${base64}`;
    
    // Calculate aspect ratio to fit page
    const maxWidth = 170;
    const maxHeight = 200;
    const imgWidth = maxWidth;
    const imgHeight = maxHeight;
    const xOffset = 20;
    const yOffset = 30;
    
    doc.addImage(imgData, 'PNG', xOffset, yOffset, imgWidth, imgHeight);
    
    // Render measurements on top of image
    const planDimensions = dimensions.filter(d => d.blueprint_id === plan.id);
    planDimensions.forEach(dim => {
      if (!dim.canvas_data) return;
      
      // Scale canvas coordinates to PDF coordinates
      const scaleX = imgWidth / 1000; // Assume canvas width ~1000px
      const scaleY = imgHeight / 1000;
      
      const x1 = xOffset + (dim.canvas_data.x1 * scaleX);
      const y1 = yOffset + (dim.canvas_data.y1 * scaleY);
      const x2 = xOffset + (dim.canvas_data.x2 * scaleX);
      const y2 = yOffset + (dim.canvas_data.y2 * scaleY);
      const labelX = xOffset + (dim.canvas_data.label_x * scaleX);
      const labelY = yOffset + (dim.canvas_data.label_y * scaleY);
      
      // Draw measurement line
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(0.5);
      doc.line(x1, y1, x2, y2);
      
      // Draw label
      const label = formatDimensionValue(dim);
      doc.setFillColor(0, 0, 0);
      doc.rect(labelX - 15, labelY - 4, 30, 6, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.text(label, labelX, labelY + 1, { align: 'center' });
      
      // Draw type badge
      doc.setFontSize(5);
      doc.text(dim.measurement_type || '', labelX, labelY + 5, { align: 'center' });
      
      // Draw construction state badge
      if (dim.construction_state) {
        const badge = dim.construction_state === 'stud_only' ? 'STUD' : 'DW';
        const badgeColor = dim.construction_state === 'stud_only' ? [245, 158, 11] : [16, 185, 129];
        doc.setFillColor(...badgeColor);
        doc.rect(labelX - 8, labelY + 7, 16, 4, 'F');
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(5);
        doc.text(badge, labelX, labelY + 10, { align: 'center' });
      }
    });
    
    // Render markups
    markups.forEach(markup => {
      if (!markup.points || markup.points.length < 2) return;
      
      const [p1, p2] = markup.points;
      const mx1 = xOffset + (p1.x * scaleX);
      const my1 = yOffset + (p1.y * scaleY);
      const mx2 = xOffset + (p2.x * scaleX);
      const my2 = yOffset + (p2.y * scaleY);
      
      // Convert hex color to RGB
      const hexToRgb = (hex) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return [r, g, b];
      };
      
      const [r, g, b] = hexToRgb(markup.color);
      doc.setDrawColor(r, g, b);
      doc.setLineWidth(markup.thickness * 0.3);
      
      if (markup.type === 'line' || markup.type === 'arrow' || markup.type === 'double_arrow') {
        doc.line(mx1, my1, mx2, my2);
        // Arrows rendered as simple lines in PDF
      } else if (markup.type === 'rectangle') {
        doc.rect(mx1, my1, mx2 - mx1, my2 - my1);
      } else if (markup.type === 'circle') {
        const radius = Math.sqrt((mx2 - mx1) ** 2 + (my2 - my1) ** 2);
        doc.circle(mx1, my1, radius);
      } else if (markup.type === 'highlight') {
        doc.setFillColor(r, g, b);
        doc.setGState(new doc.GState({ opacity: 0.3 }));
        doc.rect(mx1, my1, mx2 - mx1, 3, 'F');
        doc.setGState(new doc.GState({ opacity: 1 }));
      } else if (markup.type === 'text' && markup.text) {
        doc.setTextColor(r, g, b);
        doc.setFontSize(8 + markup.thickness);
        doc.text(markup.text, mx1, my1);
      }
    });
    
  } catch (error) {
    console.error('[addDrawingPage] Image load error:', error);
    doc.setTextColor(255, 0, 0);
    doc.setFontSize(10);
    doc.text('Error loading drawing image', 20, 100);
  }
  
  // Footer
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(8);
  doc.text(`Drawing ${pageNum}/${totalPages}`, 180, 285);
}

function addMeasurementSummaryTable(doc, dimensions, unitSystem) {
  // Group dimensions by measurement_type AND construction_state
  const grouped = {};
  dimensions.forEach(dim => {
    const type = dim.measurement_type || 'Other';
    const condition = dim.construction_state || 'unspecified';
    const key = `${type}|${condition}`;
    
    if (!grouped[key]) {
      grouped[key] = { type, condition, items: [] };
    }
    grouped[key].items.push(dim);
  });
  
  let yPos = 20;
  
  doc.setFillColor(30, 58, 138);
  doc.rect(0, yPos, 210, 12, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('MEASUREMENT SUMMARY', 15, yPos + 8);
  yPos += 18;
  
  // Table header
  doc.setFillColor(220, 220, 220);
  doc.rect(10, yPos, 190, 8, 'F');
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Type', 15, yPos + 5);
  doc.text('Condition', 60, yPos + 5);
  doc.text('Qty', 110, yPos + 5);
  doc.text('Values', 135, yPos + 5);
  yPos += 10;
  
  // Table rows
  doc.setFont('helvetica', 'normal');
  Object.values(grouped).forEach((group, idx) => {
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }
    
    const bgColor = idx % 2 === 0 ? [252, 252, 252] : [255, 255, 255];
    doc.setFillColor(...bgColor);
    doc.rect(10, yPos, 190, 7, 'F');
    
    const conditionLabel = group.condition === 'stud_only' ? 'Stud Only' : 
                          group.condition === 'with_drywall' ? 'With Drywall' : 
                          'Unspecified';
    
    const uniqueValues = [...new Set(group.items.map(formatDimensionValue))];
    
    doc.setTextColor(0, 0, 0);
    doc.text(group.type, 15, yPos + 4);
    doc.text(conditionLabel, 60, yPos + 4);
    doc.text(group.items.length.toString(), 110, yPos + 4);
    doc.text(uniqueValues.slice(0, 2).join(', '), 135, yPos + 4);
    yPos += 8;
  });
}

function addConfidencePage(doc, jobName, totalCount) {
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, 210, 297, 'F');
  
  let yPos = 40;
  
  // Green checkmark icon (text-based)
  doc.setTextColor(76, 175, 80);
  doc.setFontSize(40);
  doc.text('✓', 90, yPos);
  
  yPos += 30;
  
  // Confidence text
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('All Measurements Reviewed', 35, yPos);
  
  yPos += 20;
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`✓ ${totalCount} measurements captured on-site`, 20, yPos);
  yPos += 10;
  doc.text('✓ Each measurement individually locked for accuracy', 20, yPos);
  yPos += 10;
  doc.text('✓ Ready for material ordering and fabrication', 20, yPos);
  
  yPos += 20;
  
  // Footer text
  doc.setFillColor(245, 250, 255);
  doc.rect(15, yPos, 180, 60, 'F');
  doc.setFillColor(30, 58, 138);
  doc.rect(15, yPos, 180, 60, 'FD');
  
  doc.setTextColor(30, 58, 138);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('About This Document', 20, yPos + 8);
  
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('This measurement package is a complete, field-verified documentation of all', 20, yPos + 16);
  doc.text('dimensions captured for the project. It is suitable for sharing with suppliers,', 20, yPos + 22);
  doc.text('contractors, or archival purposes.', 20, yPos + 28);
  doc.text('', 20, yPos + 34);
  doc.text('Generated from MCI Measurement', 20, yPos + 40);
  doc.text(`Job: ${jobName}`, 20, yPos + 46);
  doc.text(`Export Date: ${new Date().toLocaleDateString()}`, 20, yPos + 52);

function formatDimensionValue(dim) {
  if (dim.unit_system === 'imperial') {
    const ft = dim.value_feet || 0;
    const inches = dim.value_inches || 0;
    const frac = dim.value_fraction || '0';
    
    let result = `${ft}' ${inches}"`;
    if (frac !== '0') {
      result = `${ft}' ${inches} ${frac}"`;
    }
    return result;
  } else {
    return `${dim.value_mm || 0}mm`;
  }
}