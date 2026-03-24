import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const GOOGLE_MAPS_API_KEY = Deno.env.get("GOOGLE_MAPS_API_KEY");

async function geocodeAddress(address) {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_MAPS_API_KEY}`;
  const response = await fetch(url);
  const data = await response.json();
  
  if (data.status === 'OK' && data.results.length > 0) {
    const result = data.results[0];
    return {
      latitude: result.geometry.location.lat,
      longitude: result.geometry.location.lng,
      formatted_address: result.formatted_address
    };
  }
  
  throw new Error(`Geocoding failed: ${data.status}`);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
    }

    // Get all jobs with address but no coordinates
    const allJobs = await base44.asServiceRole.entities.Job.list('', 500);
    const jobsNeedingGPS = allJobs.filter(job => 
      job.address && 
      job.address.trim() !== '' && 
      (!job.latitude || !job.longitude)
    );

    console.log(`Found ${jobsNeedingGPS.length} jobs needing GPS coordinates`);

    const results = {
      total: jobsNeedingGPS.length,
      success: [],
      failed: []
    };

    // Process each job
    for (const job of jobsNeedingGPS) {
      try {
        console.log(`Geocoding job: ${job.name} - ${job.address}`);
        
        const gpsData = await geocodeAddress(job.address);
        
        await base44.asServiceRole.entities.Job.update(job.id, {
          latitude: gpsData.latitude,
          longitude: gpsData.longitude,
          address: gpsData.formatted_address
        });
        
        results.success.push({
          id: job.id,
          name: job.name,
          address: job.address,
          coordinates: `${gpsData.latitude}, ${gpsData.longitude}`
        });
        
        console.log(`✓ Updated ${job.name}`);
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`✗ Failed to geocode ${job.name}:`, error.message);
        results.failed.push({
          id: job.id,
          name: job.name,
          address: job.address,
          error: error.message
        });
      }
    }

    return Response.json({
      message: `Processed ${results.total} jobs: ${results.success.length} successful, ${results.failed.length} failed`,
      results
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});