import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { jsPDF } from 'npm:jspdf@2.5.2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { jobId, jobName, jobAddress = '', dimensions, unitSystem, measurementSessionId, plans = [], markupsByPlan = {} } = await req.json();

    // FASE 3C-5: Validate measurement_session_id is present (defensive)
    if (!measurementSessionId) {
      console.warn('[exportDimensionsPDF] Missing measurement_session_id - PDF will not be session-scoped');
    }

    const doc = new jsPDF('portrait', 'mm', 'letter');
    
    // PAGE 1: COVER
    const totalPages = 1 + (plans.length > 0 ? plans.length : 0) + 1 + 1; // cover + drawings + summary + legend
    addCoverPage(doc, jobName, jobAddress, dimensions, unitSystem, user, totalPages, plans);
    
    // PAGES 2+: DRAWING PAGES with measurements + markups
    if (plans.length > 0) {
      for (let i = 0; i < plans.length; i++) {
        doc.addPage();
        const plan = plans[i];
        const planDimensions = dimensions.filter(d => d.blueprint_id === plan.id);
        const planMarkups = markupsByPlan[`plan_${plan.id}`] || [];
        await addDrawingPage(doc, plan, planDimensions, planMarkups, i + 1, unitSystem);
      }
    }
    
    // PAGES: MEASUREMENT SUMMARY TABLE (Grouped by type and condition)
    doc.addPage();
    addMeasurementSummaryTable(doc, dimensions, unitSystem);
    
    // PAGES: LEGEND / GLOSSARY
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
      }, { status: 500 });
  }
});

function addCoverPage(doc, jobName, jobAddress, dimensions, unitSystem, user, totalPages, plans) {
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
  doc.text(`Page 1 of ${totalPages}`, 180, yPos + 12);
}

// FASE D4: Add drawing page with image + overlays
async function addDrawingPage(doc, plan, planDimensions, planMarkups, pageNumber, unitSystem) {
  let yPos = 15;
  
  // Page header
  doc.setFillColor(30, 58, 138);
  doc.rect(0, 0, 210, 15, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Drawing ${pageNumber}: ${plan.name}`, 15, 10);
  
  yPos = 25;
  
  // Drawing image with measurements + markups rendered
  try {
    const imageUrl = plan.image_url || plan.file_url;
    if (imageUrl) {
      // CRITICAL: Render drawing with overlays on a temporary canvas
      const canvas = await createDrawingCanvas(imageUrl, planDimensions, planMarkups, unitSystem);
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      
      const imgWidth = 170;
      const imgHeight = (canvas.height / canvas.width) * imgWidth;
      
      doc.addImage(imgData, 'JPEG', 20, yPos, imgWidth, Math.min(imgHeight, 220));
    }
  } catch (error) {
    console.error('[addDrawingPage] Error rendering drawing:', error);
    doc.setTextColor(200, 0, 0);
    doc.setFontSize(10);
    doc.text('⚠ Drawing could not be rendered', 20, yPos + 20);
  }
}

// FASE D4: Create canvas with drawing + measurements + markups
async function createDrawingCanvas(imageUrl, dimensions, markups, unitSystem) {
  // Create offscreen canvas
  const img = await loadImage(imageUrl);
  const canvas = new OffscreenCanvas(img.width, img.height);
  const ctx = canvas.getContext('2d');
  
  // Draw image
  ctx.drawImage(img, 0, 0);
  
  // Draw dimensions
  dimensions.forEach(dim => {
    if (!dim.canvas_data) return;
    drawDimensionOnPDF(ctx, dim, unitSystem);
  });
  
  // Draw markups
  markups.forEach(markup => {
    drawMarkupOnPDF(ctx, markup);
  });
  
  return canvas;
}

async function loadImage(url) {
  const response = await fetch(url);
  const blob = await response.blob();
  const bitmap = await createImageBitmap(blob);
  return bitmap;
}

// FASE D5.5: PDF-optimized dimension rendering (high contrast, solid backgrounds)
function drawDimensionOnPDF(ctx, dim, unitSystem) {
  const { x1, y1, x2, y2, label_x, label_y } = dim.canvas_data;
  
  ctx.save();
  
  // Line style
  if (dim.dimension_type === 'benchmark') {
    ctx.strokeStyle = '#FFB800';
    ctx.setLineDash([10, 5]);
    ctx.lineWidth = 4; // D5.5: Thicker for print
  } else if (dim.dimension_type === 'vertical') {
    ctx.strokeStyle = dim.benchmark_above ? '#00FF00' : '#FF0000';
    ctx.lineWidth = 4;
  } else {
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 4;
  }
  
  // Draw line
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  
  // Arrows for horizontal
  if (dim.dimension_type === 'horizontal') {
    drawArrowOnPDF(ctx, x1, y1, x2, y2);
    drawArrowOnPDF(ctx, x2, y2, x1, y1);
  }
  
  // D5.5: Measure text for proper box sizing
  const valueText = formatDimensionValue(dim);
  const typeText = dim.measurement_type || '';
  
  ctx.font = 'bold 16px Arial';
  const valueWidth = ctx.measureText(valueText).width;
  ctx.font = 'bold 12px Arial';
  const typeWidth = ctx.measureText(typeText).width;
  const labelWidth = Math.max(valueWidth, typeWidth) + 20;
  
  // D5.5: Ensure label stays within canvas bounds
  let finalLabelX = label_x;
  const margin = 30;
  if (finalLabelX - labelWidth/2 < margin) finalLabelX = margin + labelWidth/2;
  if (finalLabelX + labelWidth/2 > ctx.canvas.width - margin) finalLabelX = ctx.canvas.width - margin - labelWidth/2;
  
  let finalLabelY = label_y;
  if (finalLabelY < margin) finalLabelY = margin;
  if (finalLabelY > ctx.canvas.height - margin) finalLabelY = ctx.canvas.height - margin;
  
  // D5.5: Value label with solid background and border
  const valueBoxHeight = 30;
  ctx.fillStyle = '#000000'; // Solid black
  roundRectPDF(ctx, finalLabelX - labelWidth/2, finalLabelY - 40, labelWidth, valueBoxHeight, 15);
  ctx.fill();
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2;
  ctx.stroke();
  
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 16px Arial'; // D5.5: 16px for print
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(valueText, finalLabelX, finalLabelY - 25);
  
  // D5.5: Type label (solid orange background)
  const typeBoxHeight = 22;
  ctx.fillStyle = '#FFB800';
  roundRectPDF(ctx, finalLabelX - labelWidth/2, finalLabelY - 8, labelWidth, typeBoxHeight, 11);
  ctx.fill();
  
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 12px Arial';
  ctx.fillText(typeText, finalLabelX, finalLabelY + 3);
  
  // D5.5: Construction state badge (solid background)
  if (dim.construction_state) {
    const stateText = dim.construction_state === 'stud_only' ? 'STUD' : 'DRYWALL';
    const stateColor = dim.construction_state === 'stud_only' ? '#F59E0B' : '#10B981';
    const stateWidth = 85;
    const stateHeight = 20;
    
    ctx.fillStyle = stateColor;
    roundRectPDF(ctx, finalLabelX - stateWidth/2, finalLabelY + 16, stateWidth, stateHeight, 10);
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 11px Arial';
    ctx.fillText(stateText, finalLabelX, finalLabelY + 26);
  }
  
  ctx.restore();
}

function roundRectPDF(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawArrowOnPDF(ctx, fromX, fromY, toX, toY) {
  const angle = Math.atan2(toY - fromY, toX - fromX);
  const arrowLength = 15;
  
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(
    fromX - arrowLength * Math.cos(angle - Math.PI / 6),
    fromY - arrowLength * Math.sin(angle - Math.PI / 6)
  );
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(
    fromX - arrowLength * Math.cos(angle + Math.PI / 6),
    fromY - arrowLength * Math.sin(angle + Math.PI / 6)
  );
  ctx.stroke();
}

function drawMarkupOnPDF(ctx, markup) {
  if (!markup.points || markup.points.length < 2) return;
  
  ctx.save();
  ctx.strokeStyle = markup.color;
  ctx.fillStyle = markup.color;
  ctx.lineWidth = markup.thickness;
  ctx.globalAlpha = markup.type === 'highlight' ? 0.3 : 1;
  
  const [p1, p2] = markup.points;
  
  ctx.beginPath();
  
  if (markup.type === 'line' || markup.type === 'highlight') {
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  } else if (markup.type === 'arrow') {
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
    drawArrowHeadOnPDF(ctx, p1.x, p1.y, p2.x, p2.y, markup.thickness * 3);
  } else if (markup.type === 'double_arrow') {
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
    drawArrowHeadOnPDF(ctx, p1.x, p1.y, p2.x, p2.y, markup.thickness * 3);
    drawArrowHeadOnPDF(ctx, p2.x, p2.y, p1.x, p1.y, markup.thickness * 3);
  } else if (markup.type === 'circle') {
    const radius = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
    ctx.arc(p1.x, p1.y, radius, 0, Math.PI * 2);
    ctx.stroke();
  } else if (markup.type === 'rectangle') {
    ctx.rect(p1.x, p1.y, p2.x - p1.x, p2.y - p1.y);
    ctx.stroke();
  } else if (markup.type === 'text') {
    ctx.globalAlpha = 1;
    ctx.font = `bold ${24 + (markup.thickness * 4)}px Arial`;
    ctx.fillStyle = markup.color;
    ctx.fillText(markup.text || '', p1.x, p1.y);
  }
  
  ctx.restore();
}

function drawArrowHeadOnPDF(ctx, fromX, fromY, toX, toY, size = 15) {
  const angle = Math.atan2(toY - fromY, toX - fromX);
  
  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(
    toX - size * Math.cos(angle - Math.PI / 6),
    toY - size * Math.sin(angle - Math.PI / 6)
  );
  ctx.moveTo(toX, toY);
  ctx.lineTo(
    toX - size * Math.cos(angle + Math.PI / 6),
    toY - size * Math.sin(angle + Math.PI / 6)
  );
  ctx.stroke();
}

function addMeasurementSummaryTable(doc, dimensions, unitSystem) {
  // FASE D4: Group by measurement_type AND construction_state
  const grouped = {};
  dimensions.forEach(dim => {
    const type = dim.measurement_type || 'Other';
    const state = dim.construction_state || 'with_drywall';
    const key = `${type}|${state}`;
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(dim);
  });
  
  let yPos = 20;
  
  doc.setFillColor(30, 58, 138);
  doc.rect(0, yPos, 210, 12, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('MEASUREMENT SUMMARY', 15, yPos + 8);
  yPos += 18;
  
  // Column headers
  doc.setFillColor(245, 245, 245);
  doc.rect(10, yPos, 190, 7, 'F');
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Type', 15, yPos + 4);
  doc.text('Condition', 70, yPos + 4);
  doc.text('Qty', 130, yPos + 4);
  doc.text('Notes', 160, yPos + 4);
  yPos += 8;
  
  // Iterate over grouped types
  Object.keys(grouped).sort().forEach((key, idx) => {
    const [typeLabel, stateLabel] = key.split('|');
    const items = grouped[key];
    
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }
    
    const bgColor = idx % 2 === 0 ? [252, 252, 252] : [255, 255, 255];
    doc.setFillColor(...bgColor);
    doc.rect(10, yPos, 190, 7, 'F');
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(typeLabel, 15, yPos + 4);
    doc.text(stateLabel === 'stud_only' ? 'Stud Only' : 'With Drywall', 70, yPos + 4);
    doc.text(items.length.toString(), 130, yPos + 4);
    
    // Show sample values
    const sampleValues = items.slice(0, 2).map(d => formatDimensionValue(d)).join(', ');
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.text(sampleValues.substring(0, 30), 160, yPos + 4);
    
    yPos += 8;
  });
}

// FASE D4: Legend / Glossary Page
function addLegendPage(doc) {
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, 210, 297, 'F');
  
  let yPos = 20;
  
  // Header
  doc.setFillColor(30, 58, 138);
  doc.rect(0, yPos, 210, 12, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('MEASUREMENT LEGEND', 15, yPos + 8);
  yPos += 20;
  
  // Measurement Types
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Measurement Types', 15, yPos);
  yPos += 8;
  
  const types = [
    { code: 'FF-FF', desc: 'Finished Floor to Finished Floor (horizontal)' },
    { code: 'CL-CL', desc: 'Center Line to Center Line (horizontal)' },
    { code: 'FF-CL', desc: 'Finished Floor to Center Line (horizontal)' },
    { code: 'CL-FF', desc: 'Center Line to Finished Floor (horizontal)' },
    { code: 'SFF-SFF', desc: 'Sub-Finished Floor to Sub-Finished Floor (horizontal)' },
    { code: 'BM-FF ↑', desc: 'Bench Mark to Finished Floor (UP - vertical)' },
    { code: 'BM-FF ↓', desc: 'Bench Mark to Finished Floor (DOWN - vertical)' },
    { code: 'BM-C', desc: 'Bench Mark to Ceiling (vertical)' },
  ];
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  types.forEach(({ code, desc }) => {
    doc.setFont('helvetica', 'bold');
    doc.text(code, 15, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(desc, 50, yPos);
    yPos += 6;
  });
  
  yPos += 10;
  
  // Construction States
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Construction States', 15, yPos);
  yPos += 8;
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('STUD', 15, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text('Measured with studs only (no drywall installed)', 50, yPos);
  yPos += 6;
  
  doc.setFont('helvetica', 'bold');
  doc.text('DW', 15, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text('Measured with drywall installed (finished condition)', 50, yPos);
  yPos += 10;
  
  // Footer
  yPos = 270;
  doc.setFillColor(245, 245, 245);
  doc.rect(0, yPos, 210, 27, 'F');
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(8);
  doc.text('This legend explains all measurement codes used in this package.', 15, yPos + 10);
  doc.text('Generated from MCI Measurement System', 15, yPos + 18);
}



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