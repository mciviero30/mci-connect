import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Building2, 
  MapPin, 
  Calendar, 
  DollarSign,
  Clock,
  CheckCircle2,
  AlertCircle,
  Eye,
  Loader2,
  Image as ImageIcon,
  Camera,
  TrendingUp
} from 'lucide-react';
import { format } from 'date-fns';
import BlueprintViewer from '../components/trabajos/BlueprintViewer';
import ClientJobOverview from '../components/client/ClientJobOverview';

export default function ClientPortal() {
  const urlParams = new URLSearchParams(window.location.search);
  const accessToken = urlParams.get('token');
  
  const [activeTab, setActiveTab] = useState('overview');
  const [accessRecord, setAccessRecord] = useState(null);

  // Validate access token and get job
  const { data: accessData, isLoading: accessLoading, error: accessError } = useQuery({
    queryKey: ['clientAccess', accessToken],
    queryFn: async () => {
      if (!accessToken) throw new Error('No access token provided');
      
      const records = await base44.entities.ClientPortalAccess.filter({ 
        access_token: accessToken,
        is_active: true 
      });
      
      if (records.length === 0) {
        throw new Error('Invalid or expired access token');
      }
      
      const record = records[0];
      setAccessRecord(record);
      
      // Update last accessed and count
      await base44.entities.ClientPortalAccess.update(record.id, {
        last_accessed: new Date().toISOString(),
        access_count: (record.access_count || 0) + 1
      });
      
      return record;
    },
    enabled: !!accessToken,
    retry: false
  });

  // Get job details
  const { data: job, isLoading: jobLoading } = useQuery({
    queryKey: ['clientJob', accessData?.job_id],
    queryFn: async () => {
      const jobs = await base44.entities.Job.filter({ id: accessData.job_id });
      return jobs[0] || null;
    },
    enabled: !!accessData?.job_id,
    retry: false
  });

  // Get job photos (visible to client)
  const { data: jobPhotos = [] } = useQuery({
    queryKey: ['clientJobPhotos', accessData?.job_id],
    queryFn: () => base44.entities.JobFile.filter({ job_id: accessData.job_id }),
    enabled: !!accessData?.job_id,
    initialData: []
  });

  // Get blueprints for the job
  const { data: blueprints = [] } = useQuery({
    queryKey: ['clientBlueprints', accessData?.job_id],
    queryFn: () => base44.entities.Blueprint.filter({ 
      job_id: accessData.job_id,
      visible_to_client: true,
      is_current: true 
    }),
    enabled: !!accessData?.job_id,
    initialData: []
  });

  // Get all plan tasks across all blueprints for summary stats
  const { data: allPlanTasks = [] } = useQuery({
    queryKey: ['clientPlanTasks', accessData?.job_id],
    queryFn: async () => {
      if (!accessData?.job_id) return [];
      const tasks = await base44.entities.PlanTask.filter({ 
        job_id: accessData.job_id 
      });
      return tasks;
    },
    enabled: !!accessData?.job_id,
    initialData: []
  });

  // Calculate task statistics
  const taskStats = {
    total: allPlanTasks.length,
    completed: allPlanTasks.filter(t => t.status === 'completed').length,
    inProgress: allPlanTasks.filter(t => t.status === 'in_progress').length,
    pending: allPlanTasks.filter(t => t.status === 'pending').length,
    readyForInspection: allPlanTasks.filter(t => t.status === 'ready_for_inspection').length
  };

  const completionPercentage = taskStats.total > 0 
    ? Math.round((taskStats.completed / taskStats.total) * 100) 
    : 0;

  // Error states
  if (accessLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-white">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-[#3B9FF3] animate-spin mx-auto mb-4" />
          <p className="text-slate-700 font-medium">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (accessError || !accessData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-white p-4">
        <Card className="max-w-md w-full bg-white shadow-2xl">
          <CardContent className="p-12 text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-12 h-12 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h1>
            <p className="text-slate-600 mb-4">
              {accessError?.message || 'Invalid or expired access link. Please contact MCI for assistance.'}
            </p>
            <p className="text-sm text-slate-500">
              If you believe this is an error, please reach out to your project manager.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (jobLoading || !job) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-white">
        <Loader2 className="w-12 h-12 text-[#3B9FF3] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-[#3B9FF3] to-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                <Building2 className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">MCI Client Portal</h1>
                <p className="text-sm text-slate-600">24/7 Project Transparency</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-600">Welcome,</p>
              <p className="font-semibold text-slate-900">{accessData.customer_name}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Project Header */}
        <Card className="bg-white shadow-lg mb-8">
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <h2 className="text-3xl font-bold text-slate-900">{job.name}</h2>
                  <Badge className={
                    job.status === 'completed' ? 'bg-green-500 text-white' :
                    job.status === 'active' ? 'bg-blue-500 text-white' :
                    'bg-slate-500 text-white'
                  }>
                    {job.status}
                  </Badge>
                </div>
                {job.description && (
                  <p className="text-slate-600 mb-4">{job.description}</p>
                )}
                {job.address && (
                  <div className="flex items-start gap-2 text-slate-600">
                    <MapPin className="w-5 h-5 mt-0.5 text-[#3B9FF3]" />
                    <div>
                      <p className="font-medium">{job.address}</p>
                      {job.city && job.state && (
                        <p className="text-sm">{job.city}, {job.state} {job.zip}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-4 md:w-80">
                <div className="bg-gradient-to-br from-[#3B9FF3] to-blue-500 rounded-xl p-4 text-white">
                  <p className="text-sm opacity-90">Progress</p>
                  <p className="text-3xl font-bold">{completionPercentage}%</p>
                </div>
                <div className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl p-4 text-white">
                  <p className="text-sm opacity-90">Tasks Done</p>
                  <p className="text-3xl font-bold">{taskStats.completed}/{taskStats.total}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <div className="mb-6">
          <div className="flex gap-2 border-b border-slate-200 overflow-x-auto">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-6 py-3 font-medium transition-all whitespace-nowrap ${
                activeTab === 'overview'
                  ? 'text-[#3B9FF3] border-b-2 border-[#3B9FF3]'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Overview
              </div>
            </button>
            <button
              onClick={() => setActiveTab('blueprints')}
              className={`px-6 py-3 font-medium transition-all whitespace-nowrap ${
                activeTab === 'blueprints'
                  ? 'text-[#3B9FF3] border-b-2 border-[#3B9FF3]'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                Blueprints & Progress
                {blueprints.length > 0 && (
                  <Badge className="bg-[#3B9FF3] text-white">{blueprints.length}</Badge>
                )}
              </div>
            </button>
            <button
              onClick={() => setActiveTab('photos')}
              className={`px-6 py-3 font-medium transition-all whitespace-nowrap ${
                activeTab === 'photos'
                  ? 'text-[#3B9FF3] border-b-2 border-[#3B9FF3]'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4" />
                Photo Gallery
                {jobPhotos.length > 0 && (
                  <Badge className="bg-[#3B9FF3] text-white">{jobPhotos.length}</Badge>
                )}
              </div>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <ClientJobOverview 
            job={job} 
            taskStats={taskStats}
            completionPercentage={completionPercentage}
            blueprints={blueprints}
            jobPhotos={jobPhotos}
          />
        )}

        {activeTab === 'blueprints' && (
          <div>
            {blueprints.length === 0 ? (
              <Card className="bg-white shadow-lg">
                <CardContent className="p-12 text-center">
                  <ImageIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-slate-900 mb-2">No Blueprints Yet</h3>
                  <p className="text-slate-600">
                    Blueprints and progress tracking will be visible once the project team uploads them.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <BlueprintViewer 
                jobId={job.id} 
                jobName={job.name} 
                isClientView={true}
              />
            )}
          </div>
        )}

        {activeTab === 'photos' && (
          <Card className="bg-white shadow-lg">
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-[#3B9FF3]" />
                Project Photo Gallery
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {jobPhotos.length === 0 ? (
                <div className="text-center py-12">
                  <Camera className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-slate-700 mb-2">No Photos Yet</h3>
                  <p className="text-slate-500">
                    Photos will appear here as the project team uploads progress updates.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {jobPhotos.map((photo, idx) => (
                    <div key={photo.id} className="relative group">
                      <img
                        src={photo.file_url}
                        alt={`Project photo ${idx + 1}`}
                        className="w-full h-48 object-cover rounded-lg border-2 border-slate-200 group-hover:border-[#3B9FF3] transition-all shadow-sm group-hover:shadow-lg"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 rounded-lg transition-all flex items-center justify-center">
                        <a
                          href={photo.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Button size="sm" className="bg-white text-slate-900 hover:bg-slate-100">
                            View Full Size
                          </Button>
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-slate-500">
          <p>
            Questions about your project? Contact your project manager or call MCI directly.
          </p>
          <p className="mt-2">
            © 2025 MCI. This portal provides real-time access to your project information.
          </p>
        </div>
      </div>
    </div>
  );
}