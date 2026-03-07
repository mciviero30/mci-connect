import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { jsPDF } from 'npm:jspdf@2.5.2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { packageData } = await req.json();

    if (!packageData) {
      return Response.json({ error: 'Package data required' }, { status: 400 });
    }

    // Generate PDF
    const doc = new jsPDF('p', 'mm', 'letter');
    let yPos = 20;

    // Cover Page
    doc.setFontSize(24);
    doc.setFont(undefined, 'bold');
    doc.text('MCI Measurement Package', 105, yPos, { align: 'center' });
    
    yPos += 15;
    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    doc.text(packageData.metadata.package_id, 105, yPos, { align: 'center' });
    
    yPos += 20;
    doc.setFontSize(10);
    doc.text(`Job: ${packageData.job_info.name}`, 20, yPos);
    yPos += 7;
    doc.text(`Client: ${packageData.job_info.client || 'N/A'}`, 20, yPos);
    yPos += 7;
    doc.text(`Area: ${packageData.metadata.area}`, 20, yPos);
    yPos += 7;
    doc.text(`Generated: ${new Date(packageData.metadata.generated_date).toLocaleString()}`, 20, yPos);
    
    // Disclaimer Box
    yPos += 15;
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(245, 245, 245);
    doc.rect(20, yPos, 170, 30, 'FD');
    doc.setFontSize(8);
    doc.setFont(undefined, 'bold');
    doc.text('DISCLAIMER', 25, yPos + 6);
    doc.setFont(undefined, 'normal');
    const disclaimerLines = doc.splitTextToSize(packageData.metadata.disclaimer, 160);
    doc.text(disclaimerLines, 25, yPos + 12);

    // Summary
    doc.addPage();
    yPos = 20;
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text('Package Summary', 20, yPos);
    
    yPos += 15;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Total Measurements: ${packageData.summary.total_dimensions}`, 20, yPos);
    yPos += 7;
    doc.text(`Total Benchmarks: ${packageData.summary.total_benchmarks}`, 20, yPos);
    yPos += 7;
    doc.text(`Total Photos: ${packageData.summary.total_photos}`, 20, yPos);
    yPos += 7;
    doc.text(`Confirmation Rate: ${packageData.summary.confirmation_rate}%`, 20, yPos);
    yPos += 7;
    doc.text(`Areas Covered: ${packageData.summary.areas_covered.join(', ')}`, 20, yPos);

    // Human Confirmations Summary
    yPos += 15;
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Human Confirmations', 20, yPos);
    
    yPos += 10;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Verified: ${packageData.human_confirmations.by_status.verified}`, 20, yPos);
    yPos += 7;
    doc.text(`Irregular Conditions: ${packageData.human_confirmations.by_status.irregular}`, 20, yPos);
    yPos += 7;
    doc.text(`Re-measure Required: ${packageData.human_confirmations.by_status.remeasure}`, 20, yPos);
    yPos += 7;
    doc.text(`Pending: ${packageData.human_confirmations.pending_count}`, 20, yPos);

    // Measurements Table
    doc.addPage();
    yPos = 20;
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text('Measurements', 20, yPos);
    
    yPos += 15;
    packageData.measurements.dimensions.forEach((dim, idx) => {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.text(`${idx + 1}. ${dim.measurement_type}`, 20, yPos);
      
      yPos += 6;
      doc.setFont(undefined, 'normal');
      doc.text(`Area: ${dim.area}`, 25, yPos);
      
      yPos += 5;
      const value = dim.unit_system === 'imperial' 
        ? `${dim.value_feet || 0}' ${dim.value_inches || 0} ${dim.value_fraction !== '0' ? dim.value_fraction : ''}"`.trim()
        : `${dim.value_mm}mm`;
      doc.text(`Value: ${value}`, 25, yPos);
      
      yPos += 5;
      if (dim.benchmark_label) {
        doc.text(`Benchmark: ${dim.benchmark_label}`, 25, yPos);
        yPos += 5;
      }
      
      if (dim.human_confirmation_status && dim.human_confirmation_status !== 'pending') {
        doc.setTextColor(0, 128, 0);
        doc.text(`✓ Confirmed: ${getConfirmationLabel(dim.human_confirmation_status)}`, 25, yPos);
        yPos += 5;
        doc.text(`  By: ${dim.human_confirmation_by} (${dim.human_confirmation_role})`, 25, yPos);
        yPos += 5;
        doc.setTextColor(0, 0, 0);
      }
      
      yPos += 7;
    });

    // Benchmarks
    if (packageData.benchmarks.total_count > 0) {
      doc.addPage();
      yPos = 20;
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.text('Benchmarks', 20, yPos);
      
      yPos += 15;
      packageData.benchmarks.data.forEach((bm, idx) => {
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(9);
        doc.setFont(undefined, 'bold');
        doc.text(`${idx + 1}. ${bm.label}`, 20, yPos);
        
        yPos += 6;
        doc.setFont(undefined, 'normal');
        doc.text(`Elevation: ${bm.elevation_mm}mm`, 25, yPos);
        
        yPos += 5;
        doc.text(`Area: ${bm.area || 'N/A'}`, 25, yPos);
        
        yPos += 5;
        doc.text(`Established: ${new Date(bm.established_date).toLocaleDateString()}`, 25, yPos);
        
        yPos += 10;
      });
    }

    // Laser Heights
    if (packageData.laser_heights.total_count > 0) {
      doc.addPage();
      yPos = 20;
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.text('Laser Heights', 20, yPos);
      
      yPos += 15;
      packageData.laser_heights.measurements.forEach((lh, idx) => {
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(9);
        doc.text(`${lh.measurement_type}: ${lh.value_imperial} (${lh.value_mm}mm)`, 20, yPos);
        yPos += 6;
        doc.setFontSize(8);
        doc.text(`  Benchmark: ${lh.benchmark_label} | Area: ${lh.area}`, 25, yPos);
        yPos += 8;
      });
    }

    // Footer on all pages
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(`${packageData.metadata.package_id}`, 20, 270);
      doc.text(`Page ${i} of ${pageCount}`, 195, 270, { align: 'right' });
      doc.text('MCI Measurement Package', 105, 270, { align: 'center' });
    }

    const pdfBytes = doc.output('arraybuffer');
    const pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(pdfBytes)));

    return Response.json({
      success: true,
      pdf_base64: pdfBase64,
      package_id: packageData.metadata.package_id,
      filename: `MCI_Package_${packageData.metadata.package_id}.pdf`
    });

  } catch (error) {
    console.error('PDF generation failed:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function getConfirmationLabel(status) {
  const labels = {
    verified_conditions_existing: 'Verified – Conditions Existing',
    irregular_conditions_noted: 'Irregular Conditions Noted',
    remeasure_required: 'Re-measure Required'
  };
  return labels[status] || status;
}