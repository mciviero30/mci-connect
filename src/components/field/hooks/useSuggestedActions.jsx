import { useMemo } from 'react';

/**
 * FASE A2.6: Suggested Actions Hook
 * Generates actionable suggestions based on change impact analysis.
 * 
 * READ-ONLY: No DB writes, no task creation, pure inference.
 */

export function useSuggestedActions(changeBlock, impactContext) {
  const suggestions = useMemo(() => {
    if (!changeBlock || !impactContext) {
      return [];
    }

    const actions = [];

    // Rule 1: Tasks within change block
    impactContext.impactedTasks.forEach(task => {
      actions.push({
        id: `task-${task.id}`,
        type: 'task',
        label: `Review task: ${task.title || 'Untitled'}`,
        severity: task.status === 'completed' ? 'high' : 'medium',
        targetId: task.id,
        targetX: task.pin_x,
        targetY: task.pin_y,
        suggestedAction: task.status === 'completed' 
          ? 'Verify if completed task needs revision due to plan changes'
          : 'Review task scope against updated plan'
      });
    });

    // Rule 2: Measurements intersecting change
    impactContext.impactedMeasurements.forEach(measurement => {
      const isHorizontal = measurement.start_x !== undefined;
      const isVertical = measurement.elevation !== undefined;
      const isBenchmark = measurement.x !== undefined && !isHorizontal && !isVertical;

      let label = 'Verify measurement';
      if (isBenchmark) {
        label = `Confirm benchmark: ${measurement.label || 'Unlabeled'}`;
      } else if (isVertical) {
        label = `Verify vertical measurement: ${measurement.label || 'Unlabeled'}`;
      } else {
        label = `Verify horizontal dimension: ${measurement.label || 'Unlabeled'}`;
      }

      actions.push({
        id: `measurement-${measurement.id}`,
        type: isBenchmark ? 'benchmark' : isVertical ? 'vertical' : 'horizontal',
        label,
        severity: 'medium',
        targetId: measurement.id,
        targetX: isBenchmark ? measurement.x : (measurement.start_x + measurement.end_x) / 2,
        targetY: isBenchmark ? measurement.y : (measurement.start_y + measurement.end_y) / 2,
        suggestedAction: isBenchmark
          ? 'Confirm reference point is still valid'
          : 'Re-measure to ensure accuracy with updated plan'
      });
    });

    // Rule 3: Photos anchored in change area
    impactContext.impactedPhotos.forEach(photo => {
      actions.push({
        id: `photo-${photo.id}`,
        type: 'photo',
        label: `Update photo evidence${photo.caption ? `: ${photo.caption}` : ''}`,
        severity: 'low',
        targetId: photo.id,
        targetX: photo.plan_x,
        targetY: photo.plan_y,
        suggestedAction: 'Capture updated photo to reflect plan changes'
      });
    });

    // Rule 4: High severity if many impacts
    const totalImpacts = actions.length;
    if (totalImpacts > 3) {
      actions.forEach(action => {
        if (action.severity === 'medium') {
          action.severity = 'high';
        }
      });
    }

    // Sort by severity
    const severityOrder = { high: 0, medium: 1, low: 2 };
    actions.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    return actions;
  }, [changeBlock, impactContext]);

  return suggestions;
}