import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Geocode an address using Google Maps API
 */
async function geocodeAddress(address) {
  if (!address) return null;
  const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
  if (!apiKey) {
    console.warn('[Geocode] GOOGLE_MAPS_API_KEY not set');
    return null;
  }
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.status === 'OK' && data.results.length > 0) {
      const loc = data.results[0].geometry.location;
      console.log(`[Geocode] ✅ ${address} → lat:${loc.lat}, lng:${loc.lng}`);
      return { latitude: loc.lat, longitude: loc.lng };
    }
    console.warn(`[Geocode] ❌ Status: ${data.status} for address: ${address}`);
    return null;
  } catch (e) {
    console.error('[Geocode] Error:', e.message);
    return null;
  }
}

/**
 * Auto-sync Invoice address changes to linked Job
 * Triggered by Invoice entity automation on update
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { event, data } = await req.json();
    
    // Only process invoice updates
    if (event?.type !== 'update' || event?.entity_name !== 'Invoice') {
      return Response.json({ ok: true, skipped: true, reason: 'Not an invoice update' });
    }
    
    const invoice = data;
    
    // Skip if no linked job
    if (!invoice?.job_id) {
      return Response.json({ ok: true, skipped: true, reason: 'No linked job' });
    }
    
    // Skip if no address to sync
    const addressToSync = invoice.job_address || invoice.address;
    if (!addressToSync) {
      return Response.json({ ok: true, skipped: true, reason: 'No address to sync' });
    }
    
    // Load the job
    const jobs = await base44.asServiceRole.entities.Job.filter({ id: invoice.job_id });
    const job = jobs[0];
    
    if (!job) {
      console.warn(`[Sync] Job ${invoice.job_id} not found for invoice ${invoice.invoice_number}`);
      return Response.json({ ok: false, error: 'Job not found' }, { status: 404 });
    }
    
    // Check if address actually changed
    const currentJobAddress = job.address || '';
    if (currentJobAddress === addressToSync) {
      return Response.json({ ok: true, skipped: true, reason: 'Address unchanged' });
    }
    
    console.log(`[Sync] Address changed for ${invoice.invoice_number} → updating Job ${job.job_number}`);
    console.log(`[Sync] Old: "${currentJobAddress}"`);
    console.log(`[Sync] New: "${addressToSync}"`);
    
    // Geocode the new address
    let newCoords = null;
    const coords = await geocodeAddress(addressToSync);
    if (coords) {
      newCoords = {
        latitude: coords.latitude,
        longitude: coords.longitude
      };
      console.log(`[Sync] ✅ Geocoded: ${newCoords.latitude}, ${newCoords.longitude}`);
    } else {
      console.warn(`[Sync] ⚠️ Could not geocode: ${addressToSync}`);
    }
    
    // Update job with new address and coordinates
    const updateData = {
      address: addressToSync,
      ...(newCoords && newCoords)
    };
    
    await base44.asServiceRole.entities.Job.update(invoice.job_id, updateData);
    
    console.log(`[Sync] ✅ Job ${job.job_number} updated with new address`);
    
    return Response.json({
      ok: true,
      job_id: invoice.job_id,
      job_number: job.job_number,
      old_address: currentJobAddress,
      new_address: addressToSync,
      coordinates_updated: !!newCoords,
      coordinates: newCoords
    });
    
  } catch (error) {
    console.error('[Sync] Error:', error);
    return Response.json({ 
      ok: false,
      error: error.message
    }, { status: 500 });
  }
});