/**
 * Geocoding utility using Google Maps API
 * Converts address to latitude/longitude coordinates
 * Auto-geocodes addresses for job locations
 */

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

export const geocodeAddress = async (address) => {
  // Debug check
  console.log('🗺️ Geocoding API Key Check:', {
    isConfigured: !!GOOGLE_MAPS_API_KEY,
    keyPrefix: GOOGLE_MAPS_API_KEY ? `${GOOGLE_MAPS_API_KEY.substring(0, 15)}...` : 'NOT SET',
    address: address
  });

  if (!address || address.trim().length === 0) {
    throw new Error('Address is required');
  }

  if (!GOOGLE_MAPS_API_KEY) {
    console.error('❌ VITE_GOOGLE_MAPS_API_KEY not found in environment');
    throw new Error('Google Maps API key not configured');
  }

  try {
    const encodedAddress = encodeURIComponent(address);
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${GOOGLE_MAPS_API_KEY}`
    );

    if (!response.ok) {
      throw new Error('Failed to geocode address');
    }

    const data = await response.json();

    if (data.status === 'ZERO_RESULTS') {
      throw new Error('Address not found');
    }

    if (data.status !== 'OK') {
      throw new Error(data.error_message || 'Geocoding failed');
    }

    const location = data.results[0].geometry.location;
    return {
      latitude: location.lat,
      longitude: location.lng,
      formatted_address: data.results[0].formatted_address
    };
  } catch (error) {
    console.error('Geocoding error:', error);
    throw error;
  }
};