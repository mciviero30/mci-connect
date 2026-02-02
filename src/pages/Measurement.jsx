import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import MeasurementWorkspace from '@/components/measurement/MeasurementWorkspace';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function Measurement() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const jobId = searchParams.get('jobId');

  const { data: job, isLoading, error } = useQuery({
    queryKey: ['measurement-job', jobId],
    queryFn: () => base44.entities.Job.filter({ id: jobId }),
    enabled: !!jobId,
  });

  if (!jobId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Job Not Found</h1>
          <p className="text-slate-400 mb-6">No job ID provided</p>
          <Button onClick={() => navigate(-1)} className="bg-blue-600 hover:bg-blue-700">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="w-12 h-12 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !job || job.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Job Not Found</h1>
          <p className="text-slate-400 mb-6">Unable to load job data</p>
          <Button onClick={() => navigate(-1)} className="bg-blue-600 hover:bg-blue-700">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const jobData = job[0];

  return (
    <div className="h-screen flex flex-col bg-slate-900">
      <div className="flex-shrink-0 p-3 bg-slate-800 border-b border-slate-700 flex items-center gap-2">
        <Button 
          onClick={() => navigate(-1)}
          variant="ghost"
          size="icon"
          className="text-white hover:bg-slate-700"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <span className="text-sm text-slate-400 font-medium">{jobData.name}</span>
      </div>
      <MeasurementWorkspace jobId={jobId} jobName={jobData.name} />
    </div>
  );
}