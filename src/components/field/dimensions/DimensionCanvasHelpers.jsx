// ============================================
// FASE D5: Canvas Rendering Helpers
// Separated for clarity and reusability
// ============================================

// FASE D5.1: Legible Measurement Labels with anti-collision
// FASE D5.4: Added warning indicator for unlocked measurements
export function drawMeasurementLabel(ctx, dim, baseX, baseY, labelBounds, isLocked = false) {
  ctx.save();
  
  // D5.1: Separate components
  const valueText = formatDimensionValueForLabel(dim);
  const typeText = dim.measurement_type || '';
  const stateText = dim.construction_state === 'stud_only' ? 'STUD' : 'DRYWALL';
  const stateColor = dim.construction_state === 'stud_only' ? '#F59E0B' : '#10B981';
  
  // D5.4: Warning indicator if not locked
  const needsReview = !isLocked;
  
  // D5.1: Measure for sizing
  ctx.font = '700 18px Arial';
  const valueWidth = ctx.measureText(valueText).width;
  ctx.font = '700 12px Arial';
  const typeWidth = ctx.measureText(typeText).width;
  
  const labelWidth = Math.max(valueWidth, typeWidth) + 16;
  const labelHeight = 70;
  
  // D5.2: Anti-collision offset
  let offsetY = 0;
  let attempts = 0;
  while (detectCollision(baseX, baseY + offsetY, labelWidth, labelHeight, labelBounds) && attempts < 6) {
    if (attempts === 0) offsetY = 12;
    else if (attempts === 1) offsetY = -12;
    else if (attempts === 2) offsetY = 24;
    else if (attempts === 3) offsetY = -24;
    else if (attempts === 4) offsetY = 36;
    else offsetY = -36;
    attempts++;
  }
  
  const finalY = baseY + offsetY;
  
  // Register this label's bounds
  labelBounds.push({
    x: baseX - labelWidth/2,
    y: finalY - 40,
    width: labelWidth,
    height: labelHeight
  });
  
  // D5.4: Warning icon if needs review (top-left corner)
  if (needsReview) {
    const iconX = baseX - labelWidth/2 - 8;
    const iconY = finalY - 48;
    
    // Pulsing warning triangle
    const pulse = Math.abs(Math.sin(Date.now() / 400)) * 0.3 + 0.7;
    ctx.fillStyle = `rgba(255, 140, 0, ${pulse})`;
    ctx.beginPath();
    ctx.moveTo(iconX, iconY - 6);
    ctx.lineTo(iconX + 6, iconY + 6);
    ctx.lineTo(iconX - 6, iconY + 6);
    ctx.closePath();
    ctx.fill();
    
    ctx.fillStyle = '#000000';
    ctx.font = '700 10px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('!', iconX, iconY + 1);
  }
  
  // D5.1: Value label (primary, top)
  ctx.fillStyle = needsReview ? 'rgba(255, 140, 0, 0.95)' : 'rgba(0, 0, 0, 0.85)';
  roundRect(ctx, baseX - labelWidth/2, finalY - 40, labelWidth, 30, 15);
  ctx.fill();
  
  // D5.5: Add white border for contrast
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2;
  ctx.stroke();
  
  ctx.fillStyle = needsReview ? '#000000' : '#FFFFFF';
  ctx.font = '700 18px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(valueText, baseX, finalY - 25);
  
  // D5.1: Type label
  ctx.fillStyle = 'rgba(255, 184, 0, 0.95)';
  roundRect(ctx, baseX - labelWidth/2, finalY - 8, labelWidth, 22, 11);
  ctx.fill();
  
  ctx.fillStyle = '#000000';
  ctx.font = '700 12px Arial';
  ctx.fillText(typeText, baseX, finalY + 3);
  
  // D5.1: Construction state badge
  if (dim.construction_state) {
    const stateWidth = 90;
    ctx.fillStyle = stateColor;
    roundRect(ctx, baseX - stateWidth/2, finalY + 16, stateWidth, 24, 12);
    ctx.fill();
    
    // D5.5: Border for contrast
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    
    ctx.fillStyle = '#000000';
    ctx.font = '700 11px Arial';
    ctx.fillText(stateText, baseX, finalY + 28);
  }
  
  ctx.restore();
}

function formatDimensionValueForLabel(dim) {
  if (dim.unit_system === 'imperial') {
    const ft = dim.value_feet || 0;
    const inches = dim.value_inches || 0;
    const frac = dim.value_fraction || '0';
    
    if (frac !== '0') {
      return `${ft}' ${inches} ${frac}"`;
    }
    return `${ft}' ${inches}"`;
  } else {
    const mm = dim.value_mm || 0;
    return `${mm}mm`;
  }
}

function roundRect(ctx, x, y, width, height, radius) {
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

// D5.2: Collision detection
function detectCollision(x, y, width, height, existingBounds) {
  const testBox = { x: x - width/2, y: y - height/2, width, height };
  
  for (const box of existingBounds) {
    if (!(testBox.x + testBox.width < box.x || 
          testBox.x > box.x + box.width ||
          testBox.y + testBox.height < box.y || 
          testBox.y > box.y + box.height)) {
      return true;
    }
  }
  
  return false;
}