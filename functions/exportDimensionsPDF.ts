import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { jobId, jobName, dimensions, unitSystem } = await req.json();

    const doc = new jsPDF('landscape', 'mm', 'letter');
    let yPos = 20;

    // Header
    doc.setFillColor(0, 0, 0);
    doc.rect(0, 0, 297, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('FIELD DIMENSIONS REPORT', 15, 20);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Project: ${jobName || 'Untitled'}`, 15, 28);
    doc.text(`Unit System: ${unitSystem === 'imperial' ? 'Imperial (ft/in)' : 'Metric (mm)'}`, 15, 34);
    doc.text(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 200, 28);
    doc.text(`By: ${user.full_name}`, 200, 34);

    yPos = 50;

    // Legend Box
    doc.setFillColor(255, 248, 220);
    doc.rect(15, yPos, 267, 45, 'FD');
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('MEASUREMENT LEGEND', 20, yPos + 8);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('FF = Finish Face  |  CL = Center Line  |  BM = Bench Mark (laser reference line)', 20, yPos + 16);
    doc.setTextColor(0, 150, 0);
    doc.text('● Above BM = Green', 20, yPos + 24);
    doc.setTextColor(200, 0, 0);
    doc.text('● Below BM = Red', 70, yPos + 24);
    doc.setTextColor(255, 184, 0);
    doc.text('● Benchmark = Yellow (dashed)', 120, yPos + 24);
    
    doc.setTextColor(0, 0, 0);
    doc.text('Horizontal dimensions shown with arrows. All measurements verified on-site.', 20, yPos + 32);
    doc.text('This document is for fabrication and installation verification.', 20, yPos + 40);

    yPos = 105;

    // Dimensions Table
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('DIMENSIONS RECORD', 15, yPos);
    yPos += 10;

    // Table header
    doc.setFillColor(30, 58, 138);
    doc.rect(15, yPos, 267, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Type', 20, yPos + 7);
    doc.text('Measurement', 50, yPos + 7);
    doc.text('Value', 100, yPos + 7);
    doc.text('Area/Location', 140, yPos + 7);
    doc.text('Measured By', 200, yPos + 7);
    doc.text('Date', 250, yPos + 7);
    yPos += 10;

    // Table rows
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    
    dimensions.forEach((dim, index) => {
      if (yPos > 180) {
        doc.addPage();
        yPos = 20;
      }

      const bgColor = index % 2 === 0 ? [245, 245, 245] : [255, 255, 255];
      doc.setFillColor(...bgColor);
      doc.rect(15, yPos, 267, 8, 'F');

      doc.setFontSize(8);
      doc.text(dim.dimension_type || 'N/A', 20, yPos + 5);
      doc.text(dim.measurement_type || 'N/A', 50, yPos + 5);
      
      const value = formatDimensionValue(dim);
      doc.text(value, 100, yPos + 5);
      
      doc.text(dim.area || 'N/A', 140, yPos + 5);
      doc.text(dim.measured_by_name || 'N/A', 200, yPos + 5);
      doc.text(new Date(dim.created_date).toLocaleDateString(), 250, yPos + 5);
      
      yPos += 8;
    });

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('This document is generated from MCI Field - Professional Field Management System', 15, 200);
    doc.text('All dimensions are field-verified and traceable to individual technicians.', 15, 205);

    // Generate PDF blob
    const pdfBlob = doc.output('blob');
    const pdfFile = new File([pdfBlob], `dimensions_${jobName}_${Date.now()}.pdf`, { type: 'application/pdf' });
    
    // Upload to storage
    const { file_url } = await base44.integrations.Core.UploadFile({ file: pdfFile });

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