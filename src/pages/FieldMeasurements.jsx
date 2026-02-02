import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, AlertTriangle, Ruler } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import FieldDimensionsView from '@/components/field/FieldDimensionsView.jsx';
import { FIELD_STABLE_QUERY_CONFIG, FIELD_QUERY_KEYS } from '@/components/field/config/fieldQueryConfig';
import { FieldSessionManager } from '@/components/field/services/FieldSessionManager';
import { useEffect } from 'react';

export default function FieldMeasurements() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const jobId = searchParams.get('id');

  // FASE 3C-4: Start measurement session on page mount
  const [measurementSessionId] = useState(() => {
    const existing = FieldSessionManager.getMeasurementSession();
    if (existing?.job_id === jobId && existing?.isActive) {
      return existing.measurement_session_id;
    }
    return FieldSessionManager.startMeasurementSession(jobId);
  });

  // FASE 3C-4: Clear measurement session on unmount
  useEffect(() => {
    return () => {
      FieldSessionManager.clearMeasurementSession();
    };
  }, []);

  const { data: job, isLoading: jobLoading } = useQuery({
    queryKey: FIELD_QUERY_KEYS.JOB(jobId),
    queryFn: () => base44.entities.Job.filter({ id: jobId }).then(jobs => jobs[0]),
    enabled: !!jobId,
    ...FIELD_STABLE_QUERY_CONFIG,
  });

  if (jobLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-slate-300">Loading measurements...</div>
      </div>
    );
  }

  if (!jobId || !job) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900 flex items-center justify-center p-6">
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 text-center max-w-md">
          <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Job Not Found</h3>
          <Button onClick={() => navigate(createPageUrl('Field'))} className="bg-orange-600 text-white mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Field
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div data-field-scope="true" className="min-h-screen bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900 flex flex-col dark">
      {/* HEADER */}
      <div className="flex-shrink-0 sticky top-0 z-50 bg-gradient-to-br from-black to-slate-900 border-b border-slate-700 shadow-xl">
        <Button 
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 z-10 bg-slate-800/90 hover:bg-slate-700 text-white border border-slate-600 shadow-xl backdrop-blur-sm min-h-[48px] px-3 rounded-xl"
        >
          <ArrowLeft className="w-4 h-4 sm:mr-2" />
          <span className="hidden sm:inline">Back</span>
        </Button>

        <div className="px-6 py-4 pt-16 sm:pt-4">
          <div className="sm:ml-32">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2 mb-1">
              <Ruler className="w-6 h-6 text-purple-400" />
              Field Measurements
            </h1>
            <p className="text-sm text-slate-400">
              {job.name || job.job_name_field}
            </p>
          </div>
        </div>
      </div>

      {/* CRITICAL WARNING BANNER - FIXED */}
      <div className="flex-shrink-0 bg-red-500/10 border-b-2 border-red-500 px-4 py-3">
        <div className="flex items-start gap-3 max-w-4xl">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-300 font-bold text-sm">
              ⚠️ Measurements are a SERVICE INPUT.
            </p>
            <p className="text-red-200 text-xs mt-1">
              They are NOT installation instructions. Installation must follow FINAL APPROVED DRAWINGS ONLY.
            </p>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 sm:p-6">
          <FieldDimensionsView jobId={jobId} jobName={job.name || job.job_name_field} />
        </div>
      </div>
    </div>
  );
}