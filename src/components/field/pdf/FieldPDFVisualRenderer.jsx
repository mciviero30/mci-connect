/**
 * Field PDF Visual Renderer
 * 
 * Renders drawings and photos with proper labeling and references
 */

/**
 * Render drawings page with overlays
 */
export function renderDrawingsPage(doc, plans, dimensions) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  plans.forEach((plan, planIdx) => {
    doc.addPage();
    
    let y = 100;
    
    // Page header
    doc.setFillColor(59, 130, 246); // Blue background
    doc.rect(0, 80, pageWidth, 35, 'F');
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(`DRAWING: ${plan.name}`, 40, y);
    doc.setTextColor(0, 0, 0);
    y += 35;
    
    // Plan metadata
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`Area: ${plan.area}`, 40, y);
    if (plan.dimension_overlays.length > 0) {
      doc.text(`Dimensions Referenced: ${plan.dimension_overlays.length}`, 200, y);
    }
    doc.setTextColor(0, 0, 0);
    y += 20;
    
    // Placeholder for drawing image (would be rendered from plan.url)
    doc.setFillColor(245, 245, 245);
    doc.rect(40, y, pageWidth - 80, 400, 'F');
    
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text('[Drawing Image]', pageWidth / 2, y + 200, { align: 'center' });
    doc.setFontSize(8);
    doc.text(plan.url, pageWidth / 2, y + 220, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    
    y += 420;
    
    // Dimension overlay legend
    if (plan.dimension_overlays.length > 0) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Dimension References on Drawing:', 40, y);
      y += 15;
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      
      plan.dimension_overlays.forEach((overlay, idx) => {
        const dimension = dimensions.find(d => 
          d.id === overlay.dimension_id || d.local_id === overlay.dimension_id
        );
        
        if (dimension) {
          doc.text(`• ${dimension.measurement_type}: ${dimension.display_value_imperial}`, 50, y);
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(7);
          doc.text(`(${dimension.area})`, 150, y);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          y += 12;
        }
      });
    }
  });
  
  return plans.length;
}

/**
 * Render photos page (dimension photos)
 */
export function renderDimensionPhotosPage(doc, dimensionPhotos, dimensions) {
  if (dimensionPhotos.length === 0) return 0;
  
  doc.addPage();
  
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 100;
  
  // Page header
  doc.setFillColor(16, 185, 129); // Green background
  doc.rect(0, 80, pageWidth, 35, 'F');
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('DIMENSION PHOTOS', 40, y);
  doc.setTextColor(0, 0, 0);
  y += 45;
  
  // Group by area
  const byArea = {};
  dimensionPhotos.forEach(photo => {
    const area = photo.area || 'Unspecified';
    if (!byArea[area]) byArea[area] = [];
    byArea[area].push(photo);
  });
  
  Object.entries(byArea).forEach(([area, photos]) => {
    // Area header
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`Area: ${area}`, 40, y);
    y += 18;
    
    photos.forEach((photo, idx) => {
      if (y > 700) {
        doc.addPage();
        y = 100;
      }
      
      const dimension = dimensions.find(d => 
        d.id === photo.dimension_id || d.local_id === photo.dimension_id
      );
      
      // Photo box
      doc.setFillColor(250, 250, 250);
      doc.rect(40, y - 5, pageWidth - 80, 100, 'F');
      doc.setDrawColor(200, 200, 200);
      doc.rect(40, y - 5, pageWidth - 80, 100, 'S');
      
      // Photo placeholder
      doc.setFillColor(230, 230, 230);
      doc.rect(50, y + 5, 150, 80, 'F');
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text('[Photo]', 125, y + 45, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      
      // Photo details
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(`Dimension: ${dimension?.measurement_type || 'Unknown'}`, 220, y + 15);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(`Value: ${dimension?.display_value_imperial || 'N/A'}`, 220, y + 28);
      doc.text(`Taken: ${photo.taken_at}`, 220, y + 40);
      
      if (photo.caption) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7);
        const captionLines = doc.splitTextToSize(photo.caption, 250);
        doc.text(captionLines, 220, y + 52);
      }
      
      y += 110;
    });
    
    y += 10;
  });
  
  return 1;
}

/**
 * Render benchmark photos page
 */
export function renderBenchmarkPhotosPage(doc, benchmarkPhotos, benchmarks) {
  if (benchmarkPhotos.length === 0) return 0;
  
  doc.addPage();
  
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 100;
  
  // Page header
  doc.setFillColor(239, 68, 68); // Red background
  doc.rect(0, 80, pageWidth, 35, 'F');
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('BENCHMARK PHOTOS', 40, y);
  doc.setTextColor(0, 0, 0);
  y += 45;
  
  benchmarkPhotos.forEach((photo, idx) => {
    if (y > 650) {
      doc.addPage();
      y = 100;
    }
    
    const benchmark = benchmarks.find(b => 
      b.id === photo.benchmark_id || b.local_id === photo.benchmark_id
    );
    
    // Photo box
    doc.setFillColor(254, 242, 242);
    doc.rect(40, y - 5, pageWidth - 80, 120, 'F');
    doc.setDrawColor(239, 68, 68);
    doc.rect(40, y - 5, pageWidth - 80, 120, 'S');
    
    // Photo placeholder
    doc.setFillColor(230, 230, 230);
    doc.rect(50, y + 5, 180, 100, 'F');
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('[Photo]', 140, y + 55, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    
    // Benchmark details
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Benchmark: ${photo.benchmark_label}`, 250, y + 15);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Type: ${benchmark?.type || 'N/A'}`, 250, y + 30);
    doc.text(`Elevation: ${benchmark?.elevation || 0} ${benchmark?.elevation_unit || 'in'}`, 250, y + 43);
    doc.text(`Area: ${photo.area}`, 250, y + 56);
    doc.text(`Taken: ${photo.taken_at}`, 250, y + 69);
    
    if (photo.caption) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7);
      const captionLines = doc.splitTextToSize(photo.caption, 200);
      doc.text(captionLines, 250, y + 82);
    }
    
    y += 130;
  });
  
  return 1;
}

/**
 * Render area photos page
 */
export function renderAreaPhotosPage(doc, areaPhotos) {
  if (areaPhotos.length === 0) return 0;
  
  doc.addPage();
  
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 100;
  
  // Page header
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('AREA REFERENCE PHOTOS', 40, y);
  y += 30;
  
  // Group by area
  const byArea = {};
  areaPhotos.forEach(photo => {
    const area = photo.area || 'Unspecified';
    if (!byArea[area]) byArea[area] = [];
    byArea[area].push(photo);
  });
  
  Object.entries(byArea).forEach(([area, photos]) => {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`${area} (${photos.length} photos)`, 40, y);
    y += 15;
    
    photos.forEach(photo => {
      if (y > 700) {
        doc.addPage();
        y = 100;
      }
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`• ${photo.caption || 'No caption'} - ${photo.taken_at}`, 50, y);
      y += 12;
    });
    
    y += 8;
  });
  
  return 1;
}