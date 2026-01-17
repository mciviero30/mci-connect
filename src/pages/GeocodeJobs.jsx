import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Play, CheckCircle, XCircle, Loader } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';

export default function GeocodeJobs() {
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState(null);

  const handleGeocode = async () => {
    setProcessing(true);
    setResults(null);
    
    try {
      const { geocodeExistingJobs } = await import('@/functions/geocodeExistingJobs');
      const response = await geocodeExistingJobs({});
      setResults(response.data.results);
    } catch (error) {
      setResults({
        success: [],
        failed: [{ error: error.message }]
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-4xl mx-auto">
        <PageHeader
          title="Geocode Existing Jobs"
          description="Auto-configure GPS coordinates for jobs with addresses"
          icon={MapPin}
        />

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Auto-Geocode Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600 mb-4">
              This will automatically add GPS coordinates to all jobs that have an address but no latitude/longitude set.
            </p>
            <Button
              onClick={handleGeocode}
              disabled={processing}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {processing ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Start Geocoding
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {results && (
          <div className="space-y-4">
            {results.success.length > 0 && (
              <Card className="border-green-300">
                <CardHeader className="bg-green-50">
                  <CardTitle className="text-green-900 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    Successfully Geocoded ({results.success.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-2">
                    {results.success.map((job, idx) => (
                      <div key={idx} className="p-3 bg-white rounded-lg border border-green-200">
                        <p className="font-semibold text-slate-900">{job.name}</p>
                        <p className="text-sm text-slate-600">{job.address}</p>
                        <p className="text-xs text-green-600 mt-1">
                          📍 {job.coordinates}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {results.failed.length > 0 && (
              <Card className="border-red-300">
                <CardHeader className="bg-red-50">
                  <CardTitle className="text-red-900 flex items-center gap-2">
                    <XCircle className="w-5 h-5" />
                    Failed ({results.failed.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-2">
                    {results.failed.map((job, idx) => (
                      <div key={idx} className="p-3 bg-white rounded-lg border border-red-200">
                        <p className="font-semibold text-slate-900">{job.name || 'Unknown'}</p>
                        <p className="text-sm text-slate-600">{job.address || 'No address'}</p>
                        <p className="text-xs text-red-600 mt-1">{job.error}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}