/**
 * Factory PDF Generator
 * 
 * Generates production-grade PDFs for fabrication
 */

import { jsPDF } from 'jspdf';
import { formatDate } from '@/lib/utils';

export async function generateFactoryPDF(factoryData, options = {}) {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter'
  });

  const pageWidth = pdf.internal.pageSize.width;
  const pageHeight = pdf.internal.pageSize.height;
  const margin = 15;
  let y = margin;

  // Cover page
  renderFactoryCoverPage(pdf, factoryData, pageWidth, pageHeight, margin);

  // Production groups
  pdf.addPage();
  y = margin;
  renderProductionGroups(pdf, factoryData, pageWidth, pageHeight, margin);

  // Benchmarks
  pdf.addPage();
  y = margin;
  renderBenchmarks(pdf, factoryData.benchmarks, pageWidth, pageHeight, margin);

  // Legal footer on all pages
  const totalPages = pdf.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    renderLegalFooter(pdf, factoryData, i, totalPages, pageWidth, pageHeight);
  }

  const blob = pdf.output('blob');
  
  return {
    pdf,
    blob,
    metadata: {
      document_id: `FACTORY-${factoryData.dimension_set.id}`,
      revision: factoryData.dimension_set.version_number,
      production_status: factoryData.dimension_set.production_status,
      generated_at: new Date().toISOString()
    }
  };
}

function renderFactoryCoverPage(pdf, data, pageWidth, pageHeight, margin) {
  let y = margin + 20;

  // Title
  pdf.setFontSize(24);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(20, 20, 20);
  pdf.text('FABRICATION PACKET', pageWidth / 2, y, { align: 'center' });
  y += 15;

  // Revision stamp (prominent)
  pdf.setFontSize(16);
  pdf.setTextColor(220, 38, 38);
  pdf.setFillColor(254, 242, 242);
  pdf.rect(margin, y, pageWidth - 2 * margin, 20, 'F');
  pdf.text(`REVISION ${data.dimension_set.version_number}`, pageWidth / 2, y + 12, { align: 'center' });
  y += 30;

  // Project details
  pdf.setFontSize(12);
  pdf.setTextColor(20, 20, 20);
  pdf.setFont('helvetica', 'bold');
  pdf.text('PROJECT:', margin, y);
  pdf.setFont('helvetica', 'normal');
  pdf.text(data.job?.name || 'N/A', margin + 40, y);
  y += 8;

  pdf.setFont('helvetica', 'bold');
  pdf.text('SET:', margin, y);
  pdf.setFont('helvetica', 'normal');
  pdf.text(data.dimension_set.name, margin + 40, y);
  y += 8;

  pdf.setFont('helvetica', 'bold');
  pdf.text('AREA:', margin, y);
  pdf.setFont('helvetica', 'normal');
  pdf.text(data.dimension_set.area || 'N/A', margin + 40, y);
  y += 15;

  // Production status
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.setFillColor(219, 234, 254);
  pdf.rect(margin, y, pageWidth - 2 * margin, 12, 'F');
  pdf.text('PRODUCTION STATUS', pageWidth / 2, y + 8, { align: 'center' });
  y += 15;

  pdf.setFontSize(11);
  pdf.text(`Status: ${data.dimension_set.production_status?.toUpperCase() || 'PENDING'}`, margin, y);
  y += 8;

  if (data.dimension_set.is_locked) {
    pdf.setTextColor(34, 197, 94);
    pdf.text('✓ LOCKED FOR PRODUCTION', margin, y);
  } else {
    pdf.setTextColor(239, 68, 68);
    pdf.text('⚠ NOT LOCKED', margin, y);
  }
  y += 15;

  // Production summary
  if (data.production_summary) {
    pdf.setFontSize(10);
    pdf.setTextColor(20, 20, 20);
    pdf.text(`Total Groups: ${data.production_summary.total_groups}`, margin, y);
    y += 6;
    pdf.text(`Fabricable Units: ${data.production_summary.fabricable_groups}`, margin, y);
    y += 6;
    pdf.text(`Total Dimensions: ${data.production_summary.total_dimensions}`, margin, y);
    y += 15;
  }

  // Legal notice
  y = pageHeight - 40;
  pdf.setFontSize(8);
  pdf.setTextColor(100, 100, 100);
  pdf.text('LEGAL PRODUCTION DOCUMENT - MAINTAIN TRACEABILITY', pageWidth / 2, y, { align: 'center' });
  y += 5;
  pdf.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, y, { align: 'center' });
}

function renderProductionGroups(pdf, data, pageWidth, pageHeight, margin) {
  let y = margin;

  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('CUT-READY DIMENSIONS', margin, y);
  y += 10;

  const groups = data.production_groups || [];

  groups.forEach((group, groupIdx) => {
    if (y > pageHeight - 40) {
      pdf.addPage();
      y = margin;
    }

    // Group header
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setFillColor(243, 244, 246);
    pdf.rect(margin, y - 5, pageWidth - 2 * margin, 10, 'F');
    pdf.text(`${group.area} - ${group.unit_type}`, margin + 2, y + 2);
    y += 12;

    // Dimensions table
    group.dimensions.forEach((dim, dimIdx) => {
      if (y > pageHeight - 40) {
        pdf.addPage();
        y = margin;
      }

      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');

      // Index
      pdf.text(`${dimIdx + 1}`, margin, y);

      // Type
      pdf.setFont('helvetica', 'bold');
      pdf.text(dim.measurement_type, margin + 10, y);

      // Imperial (primary)
      pdf.setFontSize(11);
      const imperial = formatImperial(dim);
      pdf.text(imperial, margin + 35, y);

      // Metric
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`(${dim.value_mm}mm)`, margin + 80, y);

      // Benchmark
      if (dim.benchmark_label) {
        pdf.setTextColor(59, 130, 246);
        pdf.text(`BM: ${dim.benchmark_label}`, margin + 110, y);
        pdf.setTextColor(20, 20, 20);
      }

      y += 6;

      // Factory annotations (critical for production)
      if (dim.factory_cut_instructions || dim.factory_production_notes || dim.factory_material_constraints) {
        pdf.setFontSize(8);
        pdf.setFillColor(255, 237, 213);
        pdf.rect(margin + 10, y - 3, pageWidth - 2 * margin - 10, 2, 'F');
        
        if (dim.factory_cut_instructions) {
          pdf.setTextColor(194, 65, 12);
          pdf.setFont('helvetica', 'bold');
          pdf.text('CUT: ', margin + 12, y);
          pdf.setFont('helvetica', 'normal');
          pdf.text(dim.factory_cut_instructions, margin + 25, y);
          y += 4;
        }

        if (dim.factory_production_notes) {
          pdf.setTextColor(194, 65, 12);
          pdf.setFont('helvetica', 'bold');
          pdf.text('NOTE: ', margin + 12, y);
          pdf.setFont('helvetica', 'normal');
          pdf.text(dim.factory_production_notes, margin + 25, y);
          y += 4;
        }

        if (dim.factory_material_constraints) {
          pdf.setTextColor(194, 65, 12);
          pdf.setFont('helvetica', 'bold');
          pdf.text('MAT: ', margin + 12, y);
          pdf.setFont('helvetica', 'normal');
          pdf.text(dim.factory_material_constraints, margin + 25, y);
          y += 4;
        }

        pdf.setTextColor(20, 20, 20);
      }

      y += 4;
    });

    y += 6;
  });
}

function renderBenchmarks(pdf, benchmarks, pageWidth, pageHeight, margin) {
  let y = margin;

  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('REFERENCE BENCHMARKS', margin, y);
  y += 10;

  if (!benchmarks || benchmarks.length === 0) {
    pdf.setFontSize(10);
    pdf.text('No benchmarks in this set', margin, y);
    return;
  }

  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.text('LABEL', margin, y);
  pdf.text('ELEVATION', margin + 40, y);
  pdf.text('AREA', margin + 80, y);
  pdf.text('ESTABLISHED', margin + 120, y);
  y += 8;

  benchmarks.forEach(bm => {
    if (y > pageHeight - 40) {
      pdf.addPage();
      y = margin;
    }

    pdf.setFont('helvetica', 'normal');
    pdf.text(bm.label || 'N/A', margin, y);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${bm.elevation}" ${bm.unit || ''}`, margin + 40, y);
    pdf.setFont('helvetica', 'normal');
    pdf.text(bm.area || 'N/A', margin + 80, y);
    pdf.text(bm.established_date ? formatDate(bm.established_date) : 'N/A', margin + 120, y);
    y += 6;
  });
}

function renderLegalFooter(pdf, data, pageNum, totalPages, pageWidth, pageHeight) {
  const y = pageHeight - 10;

  pdf.setFontSize(7);
  pdf.setTextColor(100, 100, 100);

  // Left: Revision
  pdf.text(`REV ${data.dimension_set.version_number}`, 15, y);

  // Center: Legal
  pdf.text('PRODUCTION DOCUMENT - OFFICIAL RECORD', pageWidth / 2, y, { align: 'center' });

  // Right: Page number
  pdf.text(`Page ${pageNum}/${totalPages}`, pageWidth - 15, y, { align: 'right' });
}

function formatImperial(dim) {
  let result = '';
  if (dim.value_feet) result += `${dim.value_feet}'`;
  if (dim.value_inches) result += ` ${dim.value_inches}`;
  if (dim.value_fraction && dim.value_fraction !== '0') result += ` ${dim.value_fraction}`;
  result += '"';
  return result.trim();
}