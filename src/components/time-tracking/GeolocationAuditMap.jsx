import React, { useEffect, useRef, useState } from 'react';
import { X, MapPin, LogIn, LogOut, Navigation } from 'lucide-react';
import { format } from 'date-fns';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

function loadGoogleMapsScript() {
  return new Promise((resolve, reject) => {
    if (window.google?.maps) { resolve(); return; }
    const existing = document.querySelector('script[data-gmaps]');
    if (existing) { existing.addEventListener('load', resolve); return; }
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}`;
    script.async = true;
    script.dataset.gmaps = 'true';
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export default function GeolocationAuditMap({ entry, onClose, language = 'en' }) {
  const mapRef = useRef(null);
  const [error, setError] = useState(null);

  const hasCheckIn = entry.check_in_latitude && entry.check_in_longitude;
  const hasCheckOut = entry.check_out_latitude && entry.check_out_longitude;

  useEffect(() => {
    if (!hasCheckIn) { setError('No GPS data available for this entry'); return; }

    loadGoogleMapsScript().then(() => {
      const map = new window.google.maps.Map(mapRef.current, {
        zoom: 16,
        center: { lat: entry.check_in_latitude, lng: entry.check_in_longitude },
        mapTypeId: 'roadmap',
        disableDefaultUI: false,
        zoomControl: true,
        streetViewControl: false,
        mapTypeControl: false,
      });

      // Check-in marker (green)
      const checkInMarker = new window.google.maps.Marker({
        position: { lat: entry.check_in_latitude, lng: entry.check_in_longitude },
        map,
        title: `Clock In: ${entry.check_in}`,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#22c55e',
          fillOpacity: 1,
          strokeColor: '#fff',
          strokeWeight: 2,
        },
        label: { text: 'IN', color: '#fff', fontSize: '9px', fontWeight: 'bold' },
      });

      const infoIn = new window.google.maps.InfoWindow({
        content: `
          <div style="font-family:sans-serif;padding:4px 8px;min-width:160px">
            <div style="font-weight:bold;color:#16a34a;margin-bottom:4px">🟢 Clock In</div>
            <div style="font-size:13px"><b>${entry.check_in}</b> · ${entry.job_name || ''}</div>
            <div style="font-size:11px;color:#666;margin-top:2px">${format(new Date(entry.date), 'MMM d, yyyy')}</div>
            ${entry.geofence_distance_backend_meters_checkin != null
              ? `<div style="font-size:11px;color:#888;margin-top:2px">${Math.round(entry.geofence_distance_backend_meters_checkin)}m from job site</div>`
              : entry.geofence_distance_meters != null
              ? `<div style="font-size:11px;color:#888;margin-top:2px">${Math.round(entry.geofence_distance_meters)}m from job site</div>`
              : ''}
          </div>`,
      });
      checkInMarker.addListener('click', () => infoIn.open(map, checkInMarker));

      // Check-out marker (red)
      if (hasCheckOut) {
        const checkOutMarker = new window.google.maps.Marker({
          position: { lat: entry.check_out_latitude, lng: entry.check_out_longitude },
          map,
          title: `Clock Out: ${entry.check_out}`,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: '#ef4444',
            fillOpacity: 1,
            strokeColor: '#fff',
            strokeWeight: 2,
          },
          label: { text: 'OUT', color: '#fff', fontSize: '7px', fontWeight: 'bold' },
        });

        const infoOut = new window.google.maps.InfoWindow({
          content: `
            <div style="font-family:sans-serif;padding:4px 8px;min-width:160px">
              <div style="font-weight:bold;color:#dc2626;margin-bottom:4px">🔴 Clock Out</div>
              <div style="font-size:13px"><b>${entry.check_out}</b> · ${entry.job_name || ''}</div>
              <div style="font-size:11px;color:#666;margin-top:2px">${format(new Date(entry.date), 'MMM d, yyyy')}</div>
              ${entry.geofence_distance_backend_meters_checkout != null
                ? `<div style="font-size:11px;color:#888;margin-top:2px">${Math.round(entry.geofence_distance_backend_meters_checkout)}m from job site</div>`
                : ''}
            </div>`,
        });
        checkOutMarker.addListener('click', () => infoOut.open(map, checkOutMarker));

        // Draw line between in/out
        new window.google.maps.Polyline({
          path: [
            { lat: entry.check_in_latitude, lng: entry.check_in_longitude },
            { lat: entry.check_out_latitude, lng: entry.check_out_longitude },
          ],
          geodesic: true,
          strokeColor: '#6366f1',
          strokeOpacity: 0.6,
          strokeWeight: 2,
          map,
        });

        // Fit bounds to show both markers
        const bounds = new window.google.maps.LatLngBounds();
        bounds.extend({ lat: entry.check_in_latitude, lng: entry.check_in_longitude });
        bounds.extend({ lat: entry.check_out_latitude, lng: entry.check_out_longitude });
        map.fitBounds(bounds);
        // Don't zoom in too much
        window.google.maps.event.addListenerOnce(map, 'bounds_changed', () => {
          if (map.getZoom() > 17) map.setZoom(17);
        });
      }

      // Open info window for check-in by default
      infoIn.open(map, checkInMarker);

    }).catch(() => setError('Failed to load Google Maps'));
  }, []);

  const googleMapsUrl = hasCheckIn
    ? `https://maps.google.com/?q=${entry.check_in_latitude},${entry.check_in_longitude}`
    : null;

  return (
    <div className="fixed inset-0 z-[10002] flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b bg-white shadow-sm flex-shrink-0">
        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5 text-slate-600" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-slate-900 text-sm truncate">
            {entry.employee_name} · {entry.job_name}
          </h2>
          <p className="text-xs text-slate-500">
            {format(new Date(entry.date), 'EEEE, MMM d, yyyy')}
          </p>
        </div>
        {googleMapsUrl && (
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-full"
          >
            <Navigation className="w-3 h-3" />
            Open
          </a>
        )}
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        {error ? (
          <div className="flex items-center justify-center h-full text-slate-400 text-sm">
            <div className="text-center">
              <MapPin className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p>{error}</p>
            </div>
          </div>
        ) : (
          <div ref={mapRef} className="w-full h-full" />
        )}
      </div>

      {/* Legend Footer */}
      <div className="flex items-center justify-around p-3 border-t bg-white flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-green-500 border-2 border-white shadow" />
          <span className="text-xs font-semibold text-slate-700">
            {language === 'es' ? 'Entrada' : 'Clock In'} {entry.check_in && `· ${entry.check_in}`}
          </span>
        </div>
        {hasCheckOut && (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-white shadow" />
            <span className="text-xs font-semibold text-slate-700">
              {language === 'es' ? 'Salida' : 'Clock Out'} {entry.check_out && `· ${entry.check_out}`}
            </span>
          </div>
        )}
        <div className="text-xs font-bold text-indigo-600">
          {entry.hours_worked?.toFixed(2)}h
          {entry.requires_location_review && (
            <span className="ml-1 text-amber-500">⚠️</span>
          )}
        </div>
      </div>
    </div>
  );
}