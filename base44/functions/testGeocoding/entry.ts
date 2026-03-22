/**
 * Test geocoding for a specific address
 */
Deno.serve(async (req) => {
  try {
    const { address = "2414 Meadow Isle Lane, Lawrenceville, GA 30043" } = await req.json();
    
    const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'GOOGLE_MAPS_API_KEY not set' }, { status: 500 });
    }
    
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
    console.log('Testing geocoding for:', address);
    console.log('URL:', url);
    
    const res = await fetch(url);
    const data = await res.json();
    
    console.log('Google Maps Response:', JSON.stringify(data, null, 2));
    
    if (data.status === 'OK' && data.results.length > 0) {
      const result = data.results[0];
      const loc = result.geometry.location;
      
      return Response.json({
        ok: true,
        address: address,
        formatted_address: result.formatted_address,
        latitude: loc.lat,
        longitude: loc.lng,
        place_id: result.place_id,
        location_type: result.geometry.location_type,
        full_result: result
      });
    }
    
    return Response.json({
      ok: false,
      status: data.status,
      error_message: data.error_message,
      results: data.results
    });
    
  } catch (error) {
    console.error('Geocoding test error:', error);
    return Response.json({ 
      ok: false,
      error: error.message
    }, { status: 500 });
  }
});