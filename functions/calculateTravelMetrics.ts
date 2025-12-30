import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { jobAddress, teamIds } = await req.json();
    
    if (!jobAddress || !teamIds || teamIds.length === 0) {
      return Response.json({ 
        error: 'Missing jobAddress or teamIds' 
      }, { status: 400 });
    }

    const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (!apiKey) {
      return Response.json({ 
        error: 'GOOGLE_MAPS_API_KEY not configured' 
      }, { status: 500 });
    }

    // Fetch team data
    const teams = await base44.entities.Team.list();
    const selectedTeams = teams.filter(t => teamIds.includes(t.id));

    const results = [];

    for (const team of selectedTeams) {
      if (!team.base_address) {
        results.push({
          teamId: team.id,
          teamName: team.team_name,
          error: 'Team missing base_address'
        });
        continue;
      }

      // Call Google Maps Distance Matrix API
      const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(team.base_address)}&destinations=${encodeURIComponent(jobAddress)}&key=${apiKey}`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.status !== 'OK' || !data.rows?.[0]?.elements?.[0]) {
        results.push({
          teamId: team.id,
          teamName: team.team_name,
          error: 'Failed to calculate distance'
        });
        continue;
      }

      const element = data.rows[0].elements[0];
      
      if (element.status !== 'OK') {
        results.push({
          teamId: team.id,
          teamName: team.team_name,
          error: element.status
        });
        continue;
      }

      // Extract distance and duration
      const distanceMeters = element.distance.value;
      const durationSeconds = element.duration.value;

      // Convert to miles (1 meter = 0.000621371 miles)
      const oneWayMiles = distanceMeters * 0.000621371;
      const roundTripMiles = oneWayMiles * 2;
      
      // Add 10% to miles
      const totalMilesWithBuffer = roundTripMiles * 1.1;

      // Convert duration to hours
      const oneWayHours = durationSeconds / 3600;
      const roundTripHours = oneWayHours * 2;
      
      // Add 10% to hours
      const hoursWithBuffer = roundTripHours * 1.1;
      
      // Round to nearest half hour (0.5)
      // 9.28 (9:17) → 9.5 (9:30)
      // 9.72 (9:43) → 10.0 (10:00)
      const roundedHours = Math.ceil(hoursWithBuffer * 2) / 2;

      results.push({
        teamId: team.id,
        teamName: team.team_name,
        teamLocation: team.location,
        baseAddress: team.base_address,
        oneWayMiles: oneWayMiles.toFixed(1),
        roundTripMiles: roundTripMiles.toFixed(1),
        totalMiles: totalMilesWithBuffer.toFixed(1),
        oneWayHours: oneWayHours.toFixed(2),
        roundTripHours: roundTripHours.toFixed(2),
        drivingHours: roundedHours.toFixed(1),
        success: true
      });
    }

    return Response.json({ results });
  } catch (error) {
    console.error('Error calculating travel metrics:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});