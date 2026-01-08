/**
 * Site Notes Linking Service
 * 
 * Links AI-extracted data to areas, drawings, and media
 */

/**
 * Link dimension to area
 */
export async function linkDimensionToArea(dimensionId, areaName, base44Client) {
  try {
    await base44Client.entities.FieldDimension.update(dimensionId, {
      area: areaName
    });
    
    return { success: true };
  } catch (error) {
    console.error('Failed to link dimension to area:', error);
    throw error;
  }
}

/**
 * Link dimension to drawing/plan
 */
export async function linkDimensionToDrawing(dimensionId, planId, coordinates, base44Client) {
  try {
    await base44Client.entities.FieldDimension.update(dimensionId, {
      plan_id: planId,
      plan_coordinates: coordinates
    });
    
    return { success: true };
  } catch (error) {
    console.error('Failed to link dimension to drawing:', error);
    throw error;
  }
}

/**
 * Link dimension to photos
 */
export async function linkDimensionToPhotos(dimensionId, photoUrls, base44Client) {
  try {
    await base44Client.entities.FieldDimension.update(dimensionId, {
      photo_urls: photoUrls
    });
    
    return { success: true };
  } catch (error) {
    console.error('Failed to link dimension to photos:', error);
    throw error;
  }
}

/**
 * Link benchmark to location
 */
export async function linkBenchmarkToLocation(benchmarkId, location, base44Client) {
  try {
    const updateData = {
      area: location.area
    };
    
    if (location.coordinates) {
      updateData.coordinates = location.coordinates;
    }
    
    if (location.photo_url) {
      updateData.photo_url = location.photo_url;
    }
    
    await base44Client.entities.Benchmark.update(benchmarkId, updateData);
    
    return { success: true };
  } catch (error) {
    console.error('Failed to link benchmark to location:', error);
    throw error;
  }
}

/**
 * Auto-link extracted entities to context
 */
export async function autoLinkToContext(entityId, entityType, sessionMetadata, base44Client) {
  try {
    const links = {
      area_linked: false,
      drawing_linked: false,
      media_linked: false
    };
    
    // Link to area
    if (sessionMetadata.area) {
      if (entityType === 'FieldDimension') {
        await linkDimensionToArea(entityId, sessionMetadata.area, base44Client);
        links.area_linked = true;
      }
    }
    
    // Link to GPS coordinates if available
    if (sessionMetadata.latitude && sessionMetadata.longitude && entityType === 'Benchmark') {
      await linkBenchmarkToLocation(entityId, {
        area: sessionMetadata.area,
        coordinates: {
          latitude: sessionMetadata.latitude,
          longitude: sessionMetadata.longitude
        }
      }, base44Client);
      links.area_linked = true;
    }
    
    return links;
  } catch (error) {
    console.error('Auto-linking failed:', error);
    return {
      area_linked: false,
      drawing_linked: false,
      media_linked: false,
      error: error.message
    };
  }
}

/**
 * Batch link entities to plan
 */
export async function batchLinkToPlan(entityIds, entityType, planId, base44Client) {
  const results = {
    success: [],
    failed: []
  };
  
  for (const entityId of entityIds) {
    try {
      if (entityType === 'FieldDimension') {
        await base44Client.entities.FieldDimension.update(entityId, {
          plan_id: planId
        });
        results.success.push(entityId);
      }
    } catch (error) {
      results.failed.push({ id: entityId, error: error.message });
    }
  }
  
  return results;
}

/**
 * Smart area detection from transcript
 */
export function detectAreaFromTranscript(transcript) {
  const text = transcript.toLowerCase();
  
  // Common area patterns
  const patterns = {
    'hallway': /hallway|pasillo|corredor/i,
    'conference room': /conference|sala de conferencias|meeting room/i,
    'lobby': /lobby|vestíbulo|entrance|entrada/i,
    'restroom': /restroom|bathroom|baño/i,
    'office': /office|oficina/i,
    'kitchen': /kitchen|cocina|break room/i,
    'stairwell': /stair|escalera/i,
    'elevator': /elevator|ascensor/i
  };
  
  for (const [area, pattern] of Object.entries(patterns)) {
    if (pattern.test(text)) {
      return area.charAt(0).toUpperCase() + area.slice(1);
    }
  }
  
  return null;
}

/**
 * Suggest related entities
 */
export async function suggestRelatedEntities(entityData, entityType, base44Client) {
  try {
    if (entityType === 'FieldDimension' && entityData.measurement_type?.startsWith('BM')) {
      // Suggest related benchmarks
      const benchmarks = await base44Client.entities.Benchmark.filter({
        job_id: entityData.job_id,
        is_active: true
      });
      
      return {
        has_suggestions: benchmarks.length > 0,
        suggestions: benchmarks.map(b => ({
          type: 'benchmark',
          id: b.id,
          label: b.label,
          reason: 'Related to benchmark measurement'
        }))
      };
    }
    
    return { has_suggestions: false, suggestions: [] };
  } catch (error) {
    console.error('Failed to suggest related entities:', error);
    return { has_suggestions: false, suggestions: [] };
  }
}