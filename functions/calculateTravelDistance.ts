import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { destination } = await req.json();

    if (!destination) {
      return Response.json({ error: 'Destination address required' }, { status: 400 });
    }

    const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    const origin = '4870 Golden Parkway, Suite B-124, Buford, GA 30518';
    
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origin)}&destinations=${encodeURIComponent(destination)}&key=${apiKey}`;
    
    console.log('🗺️ Calculating distance to:', destination);
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.rows?.[0]?.elements?.[0]?.status === 'OK') {
      const element = data.rows[0].elements[0];
      const distanceMeters = element.distance.value;
      const durationSeconds = element.duration.value;
      
      const miles = Math.round(distanceMeters / 1609.34);
      const hours = parseFloat((durationSeconds / 3600).toFixed(1));
      
      console.log('✅ Distance calculated:', { miles, hours });
      
      return Response.json({ 
        success: true,
        miles,
        hours,
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