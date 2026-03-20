import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { destination, origin } = await req.json();

    if (!destination || !origin) {
      return Response.json({ error: 'Both origin and destination addresses required' }, { status: 400 });
    }

    const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origin)}&destinations=${encodeURIComponent(destination)}&key=${apiKey}`;
    
    console.log('🗺️ Calculating distance to:', destination);
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.rows?.[0]?.elements?.[0]?.status === 'OK') {
      const element = data.rows[0].elements[0];
      const distanceMeters = element.distance.value;
      const durationSeconds = element.duration.value;
      
      // Calculate with 10% buffer (same as main quote calculator)
      const oneWayMiles = distanceMeters * 0.000621371;
      const roundTripMiles = oneWayMiles * 2;
      const totalMilesWithBuffer = roundTripMiles * 1.1;
      
      const oneWayHours = durationSeconds / 3600;
      const roundTripHours = oneWayHours * 2;
      const hoursWithBuffer = roundTripHours * 1.1;
      const roundedHours = Math.ceil(hoursWithBuffer * 2) / 2; // Round to nearest 0.5
      
      console.log('✅ Distance calculated:', { 
        oneWayMiles: oneWayMiles.toFixed(1),
        roundTripMiles: roundTripMiles.toFixed(1),
        totalMilesWithBuffer: totalMilesWithBuffer.toFixed(1),
        oneWayHours: oneWayHours.toFixed(2),
        roundTripHours: roundTripHours.toFixed(2),
        finalRoundedHours: roundedHours
      });
      
      return Response.json({ 
        success: true,
        miles: Math.round(totalMilesWithBuffer / 2), // one-way with buffer
        hours: parseFloat((roundedHours / 2).toFixed(2)), // one-way with buffer
        roundTripMiles: Math.round(totalMilesWithBuffer),
        roundTripHours: roundedHours,
        distanceText: element.distance.text,
        durationText: element.duration.text
      });
    } else {
      console.error('❌ Google Maps API error:', data.rows?.[0]?.elements?.[0]?.status);
      return Response.json({ 
        error: 'Unable to calculate distance',
        status: data.rows?.[0]?.elements?.[0]?.status 
      }, { status: 400 });
    }
  } catch (error) {
    console.error('❌ Error calculating distance:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});