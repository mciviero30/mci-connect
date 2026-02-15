import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Play, Clock, MapPin, AlertTriangle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { calculateDistance, getCurrentLocation } from '@/components/utils/geolocation';
import { toast } from 'sonner';

/**
 * Clock In/Out Testing Suite
 * Tests geofencing, GPS accuracy, and time tracking functionality
 */
export default function ClockInTestSuite({ user }) {
  const [results, setResults] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);

  const addResult = (test, status, message, details = {}) => {
    setResults(prev => [...prev, {
      test,
      status,
      message,
      details,
      timestamp: new Date().toISOString()
    }]);
  };

  const runTests = async () => {
    setIsRunning(true);
    setResults([]);
    toast.info('Running clock in/out tests...');

    try {
      // TEST 1: GPS Permission Check
      addResult('GPS Permissions', 'running', 'Checking geolocation permissions...');
      try {
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        if (permission.state === 'granted') {
          addResult('GPS Permissions', 'pass', '✅ GPS permission granted');
        } else if (permission.state === 'prompt') {
          addResult('GPS Permissions', 'warn', '⚠️ GPS permission not yet requested');
        } else {
          addResult('GPS Permissions', 'fail', '❌ GPS permission denied');
        }
      } catch (error) {
        addResult('GPS Permissions', 'fail', `❌ Permission check failed: ${error.message}`);
      }

      // TEST 2: Get Current Location
      addResult('GPS Location', 'running', 'Getting current location...');
      try {
        const location = await getCurrentLocation('en');
        setCurrentLocation(location);
        addResult('GPS Location', 'pass', `✅ Location obtained: ${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`, {
          accuracy: location.accuracy,
          lat: location.lat,
          lng: location.lng
        });

        if (location.accuracy > 100) {
          addResult('GPS Accuracy', 'warn', `⚠️ Low accuracy: ${Math.round(location.accuracy)}m (should be <100m)`);
        } else {
          addResult('GPS Accuracy', 'pass', `✅ Good accuracy: ${Math.round(location.accuracy)}m`);
        }
      } catch (error) {
        addResult('GPS Location', 'fail', `❌ Failed to get location: ${error}`);
        setCurrentLocation(null);
      }

      // TEST 3: Fetch Active Jobs
      addResult('Job Data', 'running', 'Fetching active jobs...');
      try {
        const jobs = await base44.entities.Job.filter({ status: 'active' });
        if (jobs.length === 0) {
          addResult('Job Data', 'warn', '⚠️ No active jobs found');
        } else {
          addResult('Job Data', 'pass', `✅ Found ${jobs.length} active jobs`);

          // TEST 4: Check Jobs with GPS Coordinates
          const jobsWithGPS = jobs.filter(j => j.latitude && j.longitude);
          if (jobsWithGPS.length === 0) {
            addResult('Job GPS Config', 'fail', '❌ No jobs have GPS coordinates configured');
          } else {
            addResult('Job GPS Config', 'pass', `✅ ${jobsWithGPS.length}/${jobs.length} jobs have GPS coordinates`);

            // TEST 5: Calculate Distance to Nearest Job
            if (currentLocation) {
              const distances = jobsWithGPS.map(job => ({
                job,
                distance: calculateDistance(
                  currentLocation.lat,
                  currentLocation.lng,
                  job.latitude,
                  job.longitude
                )
              }));

              distances.sort((a, b) => a.distance - b.distance);
              const nearest = distances[0];

              addResult('Geofence Distance', 'pass', `✅ Nearest job: "${nearest.job.name}" - ${Math.round(nearest.distance)}m away`, {
                jobName: nearest.job.name,
                distance: Math.round(nearest.distance),
                geofenceRadius: nearest.job.geofence_radius || 100
              });

              if (nearest.distance <= (nearest.job.geofence_radius || 100)) {
                addResult('Geofence Validation', 'pass', `✅ WITHIN RANGE - Can clock in to "${nearest.job.name}"`);
              } else {
                addResult('Geofence Validation', 'fail', `❌ OUT OF RANGE - Too far from "${nearest.job.name}" (${Math.round(nearest.distance)}m > ${nearest.job.geofence_radius || 100}m)`);
              }
            }
          }
        }
      } catch (error) {
        addResult('Job Data', 'fail', `❌ Failed to fetch jobs: ${error.message}`);
      }

      // TEST 6: Check Today's Time Entries
      addResult('Time Entries', 'running', 'Checking today\'s time entries...');
      try {
        const today = new Date().toISOString().split('T')[0];
        const todayEntries = await base44.entities.TimeEntry.filter({
          employee_email: user.email,
          date: today
        });

        if (todayEntries.length === 0) {
          addResult('Time Entries', 'pass', '✅ No entries today - ready to clock in');
        } else {
          const openEntry = todayEntries.find(e => !e.check_out);
          if (openEntry) {
            addResult('Time Entries', 'warn', `⚠️ You have an open clock (${openEntry.check_in}) for ${openEntry.job_name}`);
          } else {
            addResult('Time Entries', 'pass', `✅ ${todayEntries.length} completed entries today`);
          }
        }
      } catch (error) {
        addResult('Time Entries', 'fail', `❌ Failed to check entries: ${error.message}`);
      }

      // TEST 7: localStorage Session Check
      addResult('Local Storage', 'running', 'Checking localStorage session...');
      try {
        const sessionKeys = Object.keys(localStorage).filter(k => k.startsWith('liveTimeTracker_'));
        if (sessionKeys.length === 0) {
          addResult('Local Storage', 'pass', '✅ No active localStorage sessions');
        } else {
          addResult('Local Storage', 'warn', `⚠️ Found ${sessionKeys.length} localStorage sessions`, {
            keys: sessionKeys
          });
        }
      } catch (error) {
        addResult('Local Storage', 'fail', `❌ localStorage check failed: ${error.message}`);
      }

      toast.success('Tests completed!');

    } catch (error) {
      addResult('Test Suite', 'fail', `❌ Test suite failed: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pass': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'fail': return <XCircle className="w-5 h-5 text-red-600" />;
      case 'warn': return <AlertTriangle className="w-5 h-5 text-amber-600" />;
      case 'running': return <Clock className="w-5 h-5 text-blue-600 animate-spin" />;
      default: return null;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pass': return <Badge className="bg-green-100 text-green-700 border-green-300">PASS</Badge>;
      case 'fail': return <Badge className="bg-red-100 text-red-700 border-red-300">FAIL</Badge>;
      case 'warn': return <Badge className="bg-amber-100 text-amber-700 border-amber-300">WARN</Badge>;
      case 'running': return <Badge className="bg-blue-100 text-blue-700 border-blue-300">RUNNING</Badge>;
      default: return null;
    }
  };

  const passCount = results.filter(r => r.status === 'pass').length;
  const failCount = results.filter(r => r.status === 'fail').length;
  const warnCount = results.filter(r => r.status === 'warn').length;

  return (
    <div className="max-w-4xl mx-auto p-4">
      <Card className="mb-6 border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Clock className="w-6 h-6 text-blue-600" />
            Clock In/Out Test Suite
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Button
                onClick={runTests}
                disabled={isRunning}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
              >
                <Play className="w-4 h-4 mr-2" />
                {isRunning ? 'Running Tests...' : 'Run All Tests'}
              </Button>

              {results.length > 0 && (
                <div className="flex gap-2">
                  {passCount > 0 && <Badge className="bg-green-100 text-green-700">{passCount} Pass</Badge>}
                  {failCount > 0 && <Badge className="bg-red-100 text-red-700">{failCount} Fail</Badge>}
                  {warnCount > 0 && <Badge className="bg-amber-100 text-amber-700">{warnCount} Warn</Badge>}
                </div>
              )}
            </div>

            {currentLocation && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-blue-900">
                  <MapPin className="w-4 h-4" />
                  <span className="font-mono">
                    {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
                  </span>
                  <Badge variant="outline" className="ml-auto">
                    ±{Math.round(currentLocation.accuracy)}m
                  </Badge>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Test Results */}
      <div className="space-y-3">
        {results.map((result, idx) => (
          <Card key={idx} className={`border ${
            result.status === 'pass' ? 'border-green-200 bg-green-50/50' :
            result.status === 'fail' ? 'border-red-200 bg-red-50/50' :
            result.status === 'warn' ? 'border-amber-200 bg-amber-50/50' :
            'border-blue-200 bg-blue-50/50'
          }`}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  {getStatusIcon(result.status)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h4 className="font-semibold text-slate-900">{result.test}</h4>
                    {getStatusBadge(result.status)}
                  </div>
                  <p className="text-sm text-slate-700">{result.message}</p>
                  {result.details && Object.keys(result.details).length > 0 && (
                    <div className="mt-2 p-2 bg-white/50 rounded border border-slate-200">
                      <pre className="text-xs text-slate-600 overflow-x-auto">
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
                    </div>
                  )}
                  <p className="text-xs text-slate-500 mt-1">
                    {new Date(result.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}