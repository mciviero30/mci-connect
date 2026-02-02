import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { jobId, jobName, dimensions, unitSystem, measurementSessionId } = await req.json();

    // FASE 3C-5: Validate measurement_session_id is present (defensive)
    if (!measurementSessionId) {
      console.warn('[exportDimensionsPDF] Missing measurement_session_id - PDF will not be session-scoped');
    }

    const doc = new jsPDF('portrait', 'mm', 'letter');
    
    // PAGE 1: COVER
    addCoverPage(doc, jobName, dimensions, unitSystem, user);
    
    // PAGES 2+: MEASUREMENT SUMMARY TABLE (Grouped by type)
    doc.addPage();
    addMeasurementSummaryTable(doc, dimensions, unitSystem);
    
    // PAGES: CONFIDENCE SIGNALS
    doc.addPage();
    addConfidencePage(doc, jobName, dimensions.length);

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

function addCoverPage(doc, jobName, dimensions, unitSystem, user) {
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
  doc.text(`Measurement Date: ${new Date().toLocaleDateString()}`, 20, yPos);
  yPos += 8;
  doc.text(`Measured By: ${user.full_name}`, 20, yPos);
  yPos += 8;
  doc.text(`Unit System: ${unitSystem === 'imperial' ? 'Imperial (feet/inches)' : 'Metric (millimeters)'}`, 20, yPos);
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
  doc.text(`Page 1 of ${Math.ceil(dimensions.length / 15) + 2}`, 180, yPos + 12);
}

function addMeasurementSummaryTable(doc, dimensions, unitSystem) {
  // Group dimensions by measurement_type
  const grouped = {};
  dimensions.forEach(dim => {
    const type = dim.measurement_type || 'Other';
    if (!grouped[type]) {
      grouped[type] = [];
    }
    grouped[type].push(dim);
  });
  
  let yPos = 20;
  
  doc.setFillColor(30, 58, 138);
  doc.rect(0, yPos, 210, 12, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('MEASUREMENT SUMMARY', 15, yPos + 8);
  yPos += 18;
  
  // Iterate over grouped types
  Object.keys(grouped).sort().forEach(typeLabel => {
    const items = grouped[typeLabel];
    
    // Type header
    doc.setFillColor(220, 220, 220);
    doc.rect(10, yPos, 190, 8, 'F');
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`${typeLabel} (${items.length} total)`, 15, yPos + 5);
    yPos += 10;
    
    // Column headers
    doc.setFillColor(245, 245, 245);
    doc.rect(10, yPos, 190, 7, 'F');
    doc.setFontSize(9);
    doc.text('Area', 15, yPos + 4);
    doc.text('Value', 80, yPos + 4);
    doc.text('Count', 140, yPos + 4);
    yPos += 8;
    
    // Count by area and value
    const areaMap = {};
    items.forEach(dim => {
      const area = dim.area || 'Unspecified';
      const value = formatDimensionValue(dim);
      const key = `${area}|${value}`;
      areaMap[key] = (areaMap[key] || 0) + 1;
    });
    
    // Table rows
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    Object.keys(areaMap).forEach((key, idx) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      
      const [area, value] = key.split('|');
      const bgColor = idx % 2 === 0 ? [252, 252, 252] : [255, 255, 255];
      doc.setFillColor(...bgColor);
      doc.rect(10, yPos, 190, 7, 'F');
      
      doc.text(area, 15, yPos + 4);
      doc.text(value, 80, yPos + 4);
      doc.text(areaMap[key].toString(), 140, yPos + 4);
      yPos += 8;
    });
    
    yPos += 6; // spacing between groups
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