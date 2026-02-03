import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  ArrowLeft,
  Ruler,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { useLanguage } from '@/components/i18n/LanguageContext';
import { SkeletonFieldProject } from '@/components/shared/SkeletonComponents';
import MeasurementWorkspace from '@/components/measurement/MeasurementWorkspace';
import { FIELD_STABLE_QUERY_CONFIG } from '@/components/field/config/fieldQueryConfig';

export default function Measurement() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['measurement-currentUser'],
    queryFn: () => base44.auth.me(),
    ...FIELD_STABLE_QUERY_CONFIG,
  });

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['measurement-jobs', user?.email],
    queryFn: async () => {
      let allJobs = [];
      
      if (user?.role === 'admin' || user?.position === 'CEO' || user?.position === 'administrator') {
        allJobs = await base44.entities.Job.list('-created_date');
      } else {
        allJobs = await base44.entities.Job.list('-created_date');
      }
      
      return allJobs.filter(job => !job.deleted_at && job.status !== 'archived');
    },
    enabled: !!user,
    ...FIELD_STABLE_QUERY_CONFIG,
  });

  useEffect(() => {
    if (!isLoading && jobs) {
      setInitialLoadComplete(true);
    }
  }, [isLoading, jobs]);

  const filteredJobs = jobs.filter(job =>
    job.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.job_name_field?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.customer_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // If a job is selected, show MeasurementWorkspace
  if (selectedJobId) {
    const selectedJob = jobs.find(j => j.id === selectedJobId);
    return (
      <MeasurementWorkspace
        jobId={selectedJobId}
        jobName={selectedJob?.name || selectedJob?.job_name_field}
      />
    );
  }

  // Loading state
  if (isLoading && !initialLoadComplete) {
    return (
      <div data-field-mode="true" className="min-h-screen bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900 pb-20 md:pb-0 overflow-y-auto dark">
        <div className="px-3 sm:px-4 md:px-6 pt-0 pb-3 sm:py-4 md:py-6">
          <SkeletonFieldProject />
          <div className="text-center mt-8">
            <div className="inline-flex items-center gap-3 px-4 py-2 bg-slate-800 rounded-full border border-slate-700">
              <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm text-slate-300 font-medium">
                {language === 'es' ? 'Cargando trabajos...' : 'Loading jobs...'}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div data-field-mode="true" className="min-h-screen bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900 pb-20 md:pb-0 overflow-y-auto dark">
      <div className="px-3 sm:px-4 md:px-6 pt-0 pb-3 sm:py-4 md:py-6">
        {/* HEADER */}
        <div className="px-3 sm:px-6 md:px-10 py-6 sm:py-8 -mx-3 sm:-mx-4 md:-mx-6 -mt-3 sm:-mt-4 md:-mt-6 mb-6 relative" style={{ background: 'linear-gradient(to right, #000000 0%, #000000 35%, #4a4a4a 100%)' }}>
          {/* Back Button */}
          <Button 
            onClick={() => window.location.href = createPageUrl('Dashboard')}
            className="absolute top-3 left-3 sm:top-4 sm:left-4 z-10 bg-slate-700/80 hover:bg-slate-600 text-white border border-slate-500/50 shadow-lg backdrop-blur-sm min-h-[40px] sm:min-h-[44px] px-3 sm:px-4 rounded-lg touch-manipulation transition-all"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5 sm:mr-2" />
            <span className="hidden sm:inline text-sm font-medium">Back to MCI Connect</span>
            <span className="sm:hidden text-sm font-medium">Back</span>
          </Button>

          <div className="flex flex-col items-center justify-center text-white gap-3">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-2xl">
              <Ruler className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
            </div>
            <div className="text-center">
              <h1 className="text-2xl sm:text-4xl font-bold tracking-wide text-white mb-1" style={{ letterSpacing: '0.05em' }}>
                MEASUREMENT
              </h1>
              <p className="text-sm sm:text-base text-slate-300 font-medium">
                {language === 'es' ? 'Mediciones y levantamientos de sitio' : 'Takeoffs & site measurements'}
              </p>
            </div>
          </div>
        </div>

        {/* PURPOSE BANNER */}
        <Card className="mb-6 bg-gradient-to-r from-orange-900/40 to-amber-900/40 border-2 border-orange-500/50 shadow-xl backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                <Ruler className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-bold text-orange-200 text-base mb-1">
                  {language === 'es' ? '📐 Precisión en Mediciones' : '📐 Measurement Precision'}
                </p>
                <p className="text-sm text-orange-300">
                  {language === 'es' 
                    ? 'Selecciona un trabajo y captura mediciones precisas con comandos estándar de construcción.'
                    : 'Select a job and capture precise measurements using standard construction commands.'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SEARCH */}
        <div className="mb-6 flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              placeholder={language === 'es' ? 'Buscar trabajo...' : 'Search jobs...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-slate-800 border-slate-700 text-white placeholder-slate-500 min-h-[48px] rounded-xl"
            />
          </div>
        </div>

        {/* JOBS LIST */}
        {filteredJobs.length === 0 ? (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 text-center shadow-md">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-500/20 to-yellow-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Ruler className="w-8 h-8 text-orange-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">
              {language === 'es' ? 'Sin trabajos disponibles' : 'No jobs available'}
            </h3>
            <p className="text-sm text-slate-400">
              {language === 'es' 
                ? 'No hay trabajos para medir en este momento'
                : 'No jobs available for measurement right now'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredJobs.map((job) => (
              <button
                key={job.id}
                onClick={() => setSelectedJobId(job.id)}
                className="w-full text-left bg-slate-800 border border-slate-700 rounded-xl p-4 hover:bg-slate-700 active:scale-[0.98] transition-all shadow-md hover:shadow-lg"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-white truncate mb-1">
                      {job.name || job.job_name_field}
                    </h3>
                    <p className="text-xs text-slate-400 truncate mb-2">
                      {job.customer_name || job.client_name_field || 'No customer'}
                    </p>
                    {job.address && (
                      <p className="text-xs text-slate-500 truncate flex items-center gap-1">
                        📍 {job.address}
                      </p>
                    )}
                  </div>
                  <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 border px-2.5 py-1 rounded-full text-[10px] font-bold flex-shrink-0">
                    SELECT
                  </Badge>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}