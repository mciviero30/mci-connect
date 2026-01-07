/**
 * Production-Ready PDF Generator for Field Dimensions
 * 
 * Generates immutable, version-locked PDFs for production/purchasing/QA
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { dimension_set_id, format = 'letter', unit_system = 'imperial' } = await req.json();
    
    if (!dimension_set_id) {
      return Response.json({ error: 'dimension_set_id required' }, { status: 400 });
    }
    
    // Fetch dimension set
    const dimensionSets = await base44.asServiceRole.entities.DimensionSet.filter({ id: dimension_set_id });
    if (dimensionSets.length === 0) {
      return Response.json({ error: 'Dimension set not found' }, { status: 404 });
    }
    
    const dimensionSet = dimensionSets[0];
    
    // Check if locked/approved for production
    if (!['production_approved', 'locked'].includes(dimensionSet.approval_status)) {
      return Response.json({ 
        error: 'Dimension set must be production_approved or locked for PDF generation',
        current_status: dimensionSet.approval_status
      }, { status: 400 });
    }
    
    // Fetch dimensions
    const dimensions = await base44.asServiceRole.entities.FieldDimension.filter({
      id: { $in: dimensionSet.dimension_ids || [] }
    });
    
    // Fetch benchmarks
    const benchmarks = await base44.asServiceRole.entities.Benchmark.filter({
      job_id: dimensionSet.job_id
    });
    
    // Fetch job details
    const jobs = await base44.asServiceRole.entities.Job.filter({ id: dimensionSet.job_id });
    const job = jobs[0];
    
    // Generate PDF
    const pdfBytes = generateDimensionsPDF({
      dimensionSet,
      dimensions,
      benchmarks,
      job,
      unit_system,
      format,
      generated_by: user.full_name
    });
    
    // Convert to base64
    const base64PDF = btoa(String.fromCharCode(...new Uint8Array(pdfBytes)));
    
    // Generate version hash
    const hash = await generateVersionHash(dimensionSet, dimensions);
    
    return Response.json({
      success: true,
      pdf_base64: base64PDF,
      version_hash: hash,
      dimension_set_id: dimensionSet.id,
      version_number: dimensionSet.version_number || 1,
      generated_at: new Date().toISOString(),
      generated_by: user.full_name
    });
    
  } catch (error) {
    console.error('PDF generation error:', error);
    return Response.json({ 
      error: 'PDF generation failed', 
      details: error.message 
    }, { status: 500 });
  }
});

/**
 * Generate PDF document
 */
function generateDimensionsPDF(data) {
  const { dimensionSet, dimensions, benchmarks, job, unit_system, format, generated_by } = data;
  
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'in',
    format: format || 'letter'
  });
  
  let yPos = 0.5;
  
  // SECTION 1: Header
  yPos = addHeader(doc, dimensionSet, job, yPos);
  
  // SECTION 2: Approval Status
  yPos = addApprovalSection(doc, dimensionSet, yPos);
  
  // SECTION 3: Measurement Table
  yPos = addMeasurementTable(doc, dimensions, unit_system, yPos);
  
  // SECTION 4: Legend
  if (yPos > 7) {
    doc.addPage();
    yPos = 0.5;
  }
  yPos = addLegend(doc, yPos);
  
  // SECTION 5: Benchmark Reference
  if (benchmarks.length > 0) {
    yPos = addBenchmarkSection(doc, benchmarks, yPos);
  }
  
  // SECTION 6: Evidence References
  yPos = addEvidenceSection(doc, dimensions, yPos);
  
  // SECTION 7: Validation Summary
  if (dimensionSet.validation_snapshot) {
    yPos = addValidationSummary(doc, dimensionSet.validation_snapshot, yPos);
  }
  
  // SECTION 8: Footer with disclaimer
  addFooter(doc, dimensionSet, generated_by);
  
  return doc.output('arraybuffer');
}

/**
 * Add header section
 */
function addHeader(doc, dimensionSet, job, yPos) {
  doc.setFontSize(18);
  doc.setFont(undefined, 'bold');
  doc.text('FIELD DIMENSIONS - PRODUCTION SHEET', 0.5, yPos);
  
  yPos += 0.3;
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  
  // Project info
  doc.text(`Project: ${job?.name || 'N/A'}`, 0.5, yPos);
  yPos += 0.2;
  doc.text(`Area: ${dimensionSet.area}`, 0.5, yPos);
  yPos += 0.2;
  doc.text(`Dimension Set: ${dimensionSet.name}`, 0.5, yPos);
  yPos += 0.2;
  
  // Version info
  doc.setFont(undefined, 'bold');
  doc.text(`Version: ${dimensionSet.version_number || 1}`, 0.5, yPos);
  doc.setFont(undefined, 'normal');
  
  if (dimensionSet.parent_version_id) {
    doc.text(`(Revision of v${dimensionSet.parent_version_number || 1})`, 2, yPos);
  }
  
  yPos += 0.2;
  doc.text(`Set ID: ${dimensionSet.id}`, 0.5, yPos);
  
  yPos += 0.4;
  doc.setLineWidth(0.01);
  doc.line(0.5, yPos, 8, yPos);
  
  return yPos + 0.2;
}

/**
 * Add approval section
 */
function addApprovalSection(doc, dimensionSet, yPos) {
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('APPROVAL STATUS', 0.5, yPos);
  yPos += 0.25;
  
  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  
  const status = dimensionSet.approval_status || 'draft';
  const statusDisplay = {
    'draft': 'DRAFT',
    'field_verified': 'FIELD VERIFIED',
    'supervisor_approved': 'SUPERVISOR APPROVED',
    'production_approved': 'PRODUCTION APPROVED',
    'locked': 'LOCKED'
  }[status];
  
  doc.setFillColor(status === 'locked' ? 200 : 220, 220, 220);
  doc.rect(0.5, yPos - 0.15, 7.5, 0.2, 'F');
  doc.text(`Status: ${statusDisplay}`, 0.6, yPos);
  
  yPos += 0.3;
  
  if (dimensionSet.approval_history && dimensionSet.approval_history.length > 0) {
    dimensionSet.approval_history.forEach(approval => {
      doc.text(`✓ ${approval.state} by ${approval.approver} (${approval.role}) - ${new Date(approval.at).toLocaleString()}`, 0.7, yPos);
      yPos += 0.18;
    });
  }
  
  if (dimensionSet.locked_at) {
    yPos += 0.1;
    doc.setFont(undefined, 'bold');
    doc.text(`🔒 LOCKED: ${new Date(dimensionSet.locked_at).toLocaleString()} by ${dimensionSet.locked_by_name}`, 0.5, yPos);
    doc.setFont(undefined, 'normal');
  }
  
  yPos += 0.3;
  doc.setLineWidth(0.01);
  doc.line(0.5, yPos, 8, yPos);
  
  return yPos + 0.2;
}

/**
 * Add measurement table
 */
function addMeasurementTable(doc, dimensions, unit_system, yPos) {
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('MEASUREMENTS', 0.5, yPos);
  yPos += 0.25;
  
  doc.setFontSize(8);
  
  // Table header
  const colWidths = [0.4, 1.5, 1.2, 2, 1.5, 1];
  const colX = [0.5, 0.9, 2.4, 3.6, 5.6, 7.1];
  
  doc.setFillColor(230, 230, 230);
  doc.rect(0.5, yPos - 0.12, 7.5, 0.18, 'F');
  
  doc.setFont(undefined, 'bold');
  doc.text('#', colX[0], yPos);
  doc.text('Type', colX[1], yPos);
  doc.text('Value', colX[2], yPos);
  doc.text('Notes', colX[3], yPos);
  doc.text('Device', colX[4], yPos);
  doc.text('Status', colX[5], yPos);
  
  yPos += 0.2;
  doc.setFont(undefined, 'normal');
  
  // Sort dimensions by area and type
  const sortedDims = [...dimensions].sort((a, b) => {
    if (a.area !== b.area) return a.area.localeCompare(b.area);
    return a.measurement_type.localeCompare(b.measurement_type);
  });
  
  sortedDims.forEach((dim, index) => {
    if (yPos > 10) {
      doc.addPage();
      yPos = 0.5;
      
      // Re-add header on new page
      doc.setFillColor(230, 230, 230);
      doc.rect(0.5, yPos - 0.12, 7.5, 0.18, 'F');
      doc.setFont(undefined, 'bold');
      doc.text('#', colX[0], yPos);
      doc.text('Type', colX[1], yPos);
      doc.text('Value', colX[2], yPos);
      doc.text('Notes', colX[3], yPos);
      doc.text('Device', colX[4], yPos);
      doc.text('Status', colX[5], yPos);
      yPos += 0.2;
      doc.setFont(undefined, 'normal');
    }
    
    // Row data
    doc.text(`${index + 1}`, colX[0], yPos);
    doc.text(dim.measurement_type, colX[1], yPos);
    
    // Format value
    const value = formatDimensionValue(dim, unit_system);
    doc.text(value, colX[2], yPos);
    
    // Notes (truncate if too long)
    const notes = dim.production_notes || '-';
    doc.text(notes.substring(0, 30), colX[3], yPos);
    
    // Device
    const device = dim.device_type || 'manual';
    doc.text(device, colX[4], yPos);
    
    // Status
    const status = dim.status || 'draft';
    doc.text(status, colX[5], yPos);
    
    yPos += 0.18;
  });
  
  yPos += 0.2;
  doc.setLineWidth(0.01);
  doc.line(0.5, yPos, 8, yPos);
  
  return yPos + 0.2;
}

/**
 * Add legend section
 */
function addLegend(doc, yPos) {
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('MEASUREMENT TYPE LEGEND', 0.5, yPos);
  yPos += 0.25;
  
  doc.setFontSize(8);
  doc.setFont(undefined, 'normal');
  
  const legend = [
    { type: 'FF-FF', desc: 'Finish Face to Finish Face - Actual opening dimension' },
    { type: 'FF-CL', desc: 'Finish Face to Center Line - Half opening reference' },
    { type: 'CL-FF', desc: 'Center Line to Finish Face - Half opening reference' },
    { type: 'CL-CL', desc: 'Center Line to Center Line - Structural reference' },
    { type: 'BM-C', desc: 'Benchmark to Ceiling - Vertical reference from datum' },
    { type: 'BM-F', desc: 'Benchmark to Floor - Vertical reference from datum' },
    { type: 'F-C', desc: 'Floor to Ceiling - Total height measurement' },
    { type: 'BM', desc: 'Benchmark - Reference datum point' }
  ];
  
  legend.forEach(item => {
    doc.setFont(undefined, 'bold');
    doc.text(item.type, 0.7, yPos);
    doc.setFont(undefined, 'normal');
    doc.text(`- ${item.desc}`, 1.5, yPos);
    yPos += 0.18;
  });
  
  yPos += 0.2;
  doc.setLineWidth(0.01);
  doc.line(0.5, yPos, 8, yPos);
  
  return yPos + 0.2;
}

/**
 * Add benchmark section
 */
function addBenchmarkSection(doc, benchmarks, yPos) {
  if (yPos > 9) {
    doc.addPage();
    yPos = 0.5;
  }
  
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('BENCHMARK REFERENCES', 0.5, yPos);
  yPos += 0.25;
  
  doc.setFontSize(8);
  doc.setFont(undefined, 'normal');
  
  benchmarks.forEach(bm => {
    doc.setFont(undefined, 'bold');
    doc.text(bm.label, 0.7, yPos);
    doc.setFont(undefined, 'normal');
    
    doc.text(`Type: ${bm.type}`, 2, yPos);
    if (bm.elevation) {
      doc.text(`Elevation: ${bm.elevation}${bm.elevation_unit || 'in'}`, 3.5, yPos);
    }
    
    yPos += 0.15;
    if (bm.description) {
      doc.text(`Location: ${bm.description}`, 0.9, yPos);
      yPos += 0.15;
    }
    
    yPos += 0.1;
  });
  
  yPos += 0.1;
  doc.setLineWidth(0.01);
  doc.line(0.5, yPos, 8, yPos);
  
  return yPos + 0.2;
}

/**
 * Add evidence section
 */
function addEvidenceSection(doc, dimensions, yPos) {
  if (yPos > 9) {
    doc.addPage();
    yPos = 0.5;
  }
  
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('EVIDENCE REFERENCES', 0.5, yPos);
  yPos += 0.25;
  
  doc.setFontSize(8);
  doc.setFont(undefined, 'normal');
  
  const withPhotos = dimensions.filter(d => d.photo_urls && d.photo_urls.length > 0);
  
  if (withPhotos.length === 0) {
    doc.text('No photo evidence attached', 0.7, yPos);
    yPos += 0.2;
  } else {
    doc.text(`${withPhotos.length} measurements have photo evidence`, 0.7, yPos);
    yPos += 0.2;
  }
  
  yPos += 0.1;
  doc.setLineWidth(0.01);
  doc.line(0.5, yPos, 8, yPos);
  
  return yPos + 0.2;
}

/**
 * Add validation summary
 */
function addValidationSummary(doc, validationSnapshot, yPos) {
  if (yPos > 8.5) {
    doc.addPage();
    yPos = 0.5;
  }
  
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('PRE-FLIGHT VALIDATION', 0.5, yPos);
  yPos += 0.25;
  
  doc.setFontSize(8);
  doc.setFont(undefined, 'normal');
  
  const passed = validationSnapshot.passed;
  doc.setFillColor(passed ? 200 : 255, passed ? 255 : 200, 200);
  doc.rect(0.5, yPos - 0.12, 7.5, 0.18, 'F');
  doc.text(passed ? '✓ VALIDATION PASSED' : '⚠ VALIDATION WARNINGS', 0.7, yPos);
  
  yPos += 0.3;
  doc.text(`Critical: ${validationSnapshot.critical_count}`, 0.7, yPos);
  doc.text(`Warnings: ${validationSnapshot.warning_count}`, 2.5, yPos);
  doc.text(`Info: ${validationSnapshot.info_count}`, 4.5, yPos);
  
  yPos += 0.25;
  doc.text(`Validated: ${new Date(validationSnapshot.validated_at).toLocaleString()}`, 0.7, yPos);
  
  yPos += 0.3;
  doc.setLineWidth(0.01);
  doc.line(0.5, yPos, 8, yPos);
  
  return yPos + 0.2;
}

/**
 * Add footer with disclaimer
 */
function addFooter(doc, dimensionSet, generated_by) {
  const pageCount = doc.internal.getNumberOfPages();
  
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    
    doc.setFontSize(7);
    doc.setFont(undefined, 'normal');
    
    const yPos = 10.5;
    
    doc.setLineWidth(0.005);
    doc.line(0.5, yPos, 8, yPos);
    
    doc.text(`Page ${i} of ${pageCount}`, 0.5, yPos + 0.15);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 3, yPos + 0.15);
    doc.text(`By: ${generated_by}`, 6, yPos + 0.15);
    
    doc.setFont(undefined, 'italic');
    doc.text('This document is a production snapshot. Dimensions are locked and cannot be modified.', 0.5, yPos + 0.3);
    doc.text('For revisions, a new version must be created through the approval workflow.', 0.5, yPos + 0.42);
    
    // Version hash (bottom right)
    doc.setFont(undefined, 'normal');
    doc.setFontSize(6);
    doc.text(`v${dimensionSet.version_number || 1} | ${dimensionSet.id.substring(0, 8)}`, 6.5, yPos + 0.55);
  }
}

/**
 * Format dimension value
 */
function formatDimensionValue(dimension, unit_system) {
  if (unit_system === 'metric' || dimension.unit_system === 'metric') {
    return `${dimension.value_mm}mm`;
  }
  
  const parts = [];
  if (dimension.value_feet > 0) parts.push(`${dimension.value_feet}'`);
  
  const fraction = dimension.value_fraction !== '0' ? ` ${dimension.value_fraction}` : '';
  parts.push(`${dimension.value_inches}${fraction}"`);
  
  return parts.join(' ');
}

/**
 * Generate version hash for immutability
 */
async function generateVersionHash(dimensionSet, dimensions) {
  const data = JSON.stringify({
    set_id: dimensionSet.id,
    version: dimensionSet.version_number,
    approval: dimensionSet.approval_status,
    locked_at: dimensionSet.locked_at,
    dimension_count: dimensions.length,
    dimension_ids: dimensions.map(d => d.id).sort()
  });
  
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex.substring(0, 16);
}