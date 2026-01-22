import { useMemo } from 'react';

/**
 * FASE A2.5: Change Impact Context Hook
 * Detects elements (tasks, photos, measurements) within or near a change region.
 * 
 * READ-ONLY: No DB writes, no persistence, pure spatial calculations.
 */

export function useChangeImpactContext(activeChangeBlock, tasks, photos, measurements, threshold = 5) {
  const impactData = useMemo(() => {
    if (!activeChangeBlock) {
      return {
        impactedTasks: [],
        impactedPhotos: [],
        impactedMeasurements: [],
        counts: { tasks: 0, photos: 0, measurements: 0 }
      };
    }

    // Expand bounding box with threshold padding
    const bbox = {
      x1: activeChangeBlock.x - threshold,
      y1: activeChangeBlock.y - threshold,
      x2: activeChangeBlock.x + activeChangeBlock.width + threshold,
      y2: activeChangeBlock.y + activeChangeBlock.height + threshold
    };

    // Filter tasks within bbox
    const impactedTasks = (tasks || []).filter(task => {
      if (!task.pin_x || !task.pin_y) return false;
      return isPointInsideBBox(task.pin_x, task.pin_y, bbox);
    });

    // Filter photos within bbox
    const impactedPhotos = (photos || []).filter(photo => {
      if (!photo.plan_x || !photo.plan_y) return false;
      return isPointInsideBBox(photo.plan_x, photo.plan_y, bbox);
    });

    // Filter measurements (check if line/segment intersects bbox)
    const impactedMeasurements = (measurements || []).filter(measurement => {
      if (!measurement.start_x || !measurement.start_y || !measurement.end_x || !measurement.end_y) {
        // For benchmarks (single point)
        if (measurement.x && measurement.y) {
          return isPointInsideBBox(measurement.x, measurement.y, bbox);
        }
        return false;
      }
      return lineIntersectsBBox(
        measurement.start_x,
        measurement.start_y,
        measurement.end_x,
        measurement.end_y,
        bbox
      );
    });

    return {
      impactedTasks,
      impactedPhotos,
      impactedMeasurements,
      counts: {
        tasks: impactedTasks.length,
        photos: impactedPhotos.length,
        measurements: impactedMeasurements.length
      }
    };
  }, [activeChangeBlock, tasks, photos, measurements, threshold]);

  return impactData;
}

// Helper: Check if point is inside bounding box
function isPointInsideBBox(x, y, bbox) {
  return x >= bbox.x1 && x <= bbox.x2 && y >= bbox.y1 && y <= bbox.y2;
}

// Helper: Check if line segment intersects bounding box
function lineIntersectsBBox(x1, y1, x2, y2, bbox) {
  // Check if either endpoint is inside
  if (isPointInsideBBox(x1, y1, bbox) || isPointInsideBBox(x2, y2, bbox)) {
    return true;
  }

  // Check if line crosses any edge of bbox
  // Simplified: check if line min/max overlaps with bbox
  const lineMinX = Math.min(x1, x2);
  const lineMaxX = Math.max(x1, x2);
  const lineMinY = Math.min(y1, y2);
  const lineMaxY = Math.max(y1, y2);

  return !(lineMaxX < bbox.x1 || lineMinX > bbox.x2 || lineMaxY < bbox.y1 || lineMinY > bbox.y2);
}