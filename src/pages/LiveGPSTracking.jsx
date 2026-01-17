import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Users, Clock, RefreshCw, Navigation } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import { format } from 'date-fns';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

export default function LiveGPSTracking() {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: activeTimeEntries = [], refetch } = useQuery({
    queryKey: ['activeGPSTracking'],
    queryFn: async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      const entries = await base44.entities.TimeEntry.filter({ 
        date: today,
      }, '-check_in', 200);
      
      // Only show entries that have GPS coordinates and are active (checked in but not out)
      return entries.filter(e => 
        e.check_in && 
        !e.check_out && 
        (e.check_in_latitude && e.check_in_longitude)
      );
    },
    refetchInterval: autoRefresh ? 30000 : false, // Refresh every 30s if enabled
    initialData: [],
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ['jobs-for-gps'],
    queryFn: () => base44.entities.Job.filter({ status: 'active' }),
    initialData: [],
  });

  // Calculate center point for map
  const mapCenter = activeTimeEntries.length > 0
    ? [
        activeTimeEntries.reduce((sum, e) => sum + e.check_in_latitude, 0) / activeTimeEntries.length,
        activeTimeEntries.reduce((sum, e) => sum + e.check_in_longitude, 0) / activeTimeEntries.length
      ]
    : [40.7128, -74.0060]; // Default to NYC if no data

  const isAdmin = user?.role === 'admin';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Live GPS Tracking"
          description="Real-time location tracking of field teams"
          icon={MapPin}
          actions={
            <div className="flex gap-2">
              <Button
                onClick={() => refetch()}
                variant="outline"
                className="border-blue-300 text-blue-700 hover:bg-blue-50"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={autoRefresh ? 'bg-green-600 hover:bg-green-700' : 'bg-slate-600 hover:bg-slate-700'}
              >
                {autoRefresh ? '🟢 Auto-Refresh ON' : '⚪ Auto-Refresh OFF'}
              </Button>
            </div>
          }
        />

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Map */}
          <div className="lg:col-span-2">
            <Card className="overflow-hidden shadow-xl">
              <CardHeader className="border-b">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Navigation className="w-5 h-5 text-blue-600" />
                    Live Map
                  </div>
                  <Badge className="bg-green-500 text-white animate-pulse">
                    {activeTimeEntries.length} Active
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div style={{ height: '600px', width: '100%' }}>
                  <MapContainer
                    center={mapCenter}
                    zoom={12}
                    style={{ height: '100%', width: '100%' }}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    
                    {/* Employee markers */}
                    {activeTimeEntries.map((entry) => (
                      <Marker
                        key={entry.id}
                        position={[entry.check_in_latitude, entry.check_in_longitude]}
                        eventHandlers={{
                          click: () => setSelectedEmployee(entry),
                        }}
                      >
                        <Popup>
                          <div className="p-2">
                            <p className="font-bold text-slate-900">{entry.employee_name}</p>
                            <p className="text-sm text-slate-600">{entry.job_name || 'No job assigned'}</p>
                            <p className="text-xs text-slate-500 mt-1">
                              Checked in: {entry.check_in}
                            </p>
                          </div>
                        </Popup>
                      </Marker>
                    ))}

                    {/* Job geofences */}
                    {jobs.map((job) => {
                      if (!job.latitude || !job.longitude) return null;
                      return (
                        <Circle
                          key={job.id}
                          center={[job.latitude, job.longitude]}
                          radius={job.geofence_radius || 100}
                          pathOptions={{
                            color: '#3B82F6',
                            fillColor: '#3B82F6',
                            fillOpacity: 0.1,
                            weight: 2,
                            dashArray: '5, 5'
                          }}
                        >
                          <Popup>
                            <div className="p-2">
                              <p className="font-bold text-blue-900">{job.name}</p>
                              <p className="text-xs text-slate-500">Geofence: {job.geofence_radius}m radius</p>
                            </div>
                          </Popup>
                        </Circle>
                      );
                    })}
                  </MapContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Team List Sidebar */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="w-5 h-5 text-blue-600" />
                  Active Field Teams ({activeTimeEntries.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 max-h-[600px] overflow-y-auto">
                {activeTimeEntries.length === 0 ? (
                  <div className="text-center py-12">
                    <MapPin className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">No active field teams</p>
                    <p className="text-xs text-slate-400 mt-1">Teams will appear when they check in</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activeTimeEntries.map((entry) => {
                      const job = jobs.find(j => j.id === entry.job_id);
                      const isSelected = selectedEmployee?.id === entry.id;
                      
                      return (
                        <div
                          key={entry.id}
                          onClick={() => setSelectedEmployee(entry)}
                          className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-500'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-blue-300'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="font-bold text-slate-900 dark:text-white">{entry.employee_name}</p>
                              <p className="text-sm text-slate-600 dark:text-slate-400">{entry.job_name || 'No job'}</p>
                            </div>
                            <Badge className="bg-green-500 text-white">
                              <div className="w-2 h-2 rounded-full bg-white mr-1 animate-pulse" />
                              Active
                            </Badge>
                          </div>
                          
                          <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {entry.check_in}
                            </div>
                            {entry.geofence_validated ? (
                              <Badge className="bg-green-100 text-green-700 text-xs">
                                ✓ On-site
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-100 text-amber-700 text-xs">
                                ⚠ Location Review
                              </Badge>
                            )}
                          </div>

                          {job && (
                            <div className="mt-2 p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                              <p className="text-xs text-slate-600 dark:text-slate-400">
                                <MapPin className="w-3 h-3 inline mr-1" />
                                {job.address || 'No address'}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Legend */}
            <Card>
              <CardHeader className="border-b">
                <CardTitle className="text-sm">Map Legend</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-6 h-6 bg-blue-500 rounded-full" />
                  <span className="text-slate-700 dark:text-slate-300">Employee Location</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-6 h-6 border-2 border-blue-500 rounded-full" />
                  <span className="text-slate-700 dark:text-slate-300">Job Geofence</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-slate-700 dark:text-slate-300">Currently Active</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}