import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { 
  Building2, 
  CheckCircle2, 
  Clock, 
  Camera, 
  FileText, 
  BarChart3,
  MapPin,
  Calendar,
  TrendingUp,
  AlertCircle,
  Download,
  ChevronRight,
  LogOut
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import AvatarCreator from '@/components/avatar/AvatarCreator';

export default function ClientPortal() {
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [showAvatarCreator, setShowAvatarCreator] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Get projects where user is a client member
  const { data: memberships = [] } = useQuery({
    queryKey: ['client-memberships', user?.email],
    queryFn: () => base44.entities.ProjectMember.filter({ 
      user_email: user?.email,
      role: 'client'
    }),
    enabled: !!user?.email,
  });

  const projectIds = memberships.map(m => m.project_id);

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['client-jobs', projectIds],
    queryFn: async () => {
      if (projectIds.length === 0) return [];
      const allJobs = await base44.entities.Job.list();
      return allJobs.filter(j => projectIds.includes(j.id));
    },
    enabled: projectIds.length > 0,
  });

  // For single project view
  const [selectedJobId, setSelectedJobId] = useState(null);
  const selectedJob = jobs.find(j => j.id === selectedJobId) || jobs[0];

  const { data: tasks = [] } = useQuery({
    queryKey: ['client-tasks', selectedJob?.id],
    queryFn: () => base44.entities.Task.filter({ job_id: selectedJob.id }),
    enabled: !!selectedJob?.id,
  });

  const { data: photos = [] } = useQuery({
    queryKey: ['client-photos', selectedJob?.id],
    queryFn: () => base44.entities.Photo.filter({ job_id: selectedJob.id }, '-created_date'),
    enabled: !!selectedJob?.id,
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['client-documents', selectedJob?.id],
    queryFn: () => base44.entities.Document.filter({ job_id: selectedJob.id }, '-created_date'),
    enabled: !!selectedJob?.id,
  });

  const { data: reports = [] } = useQuery({
    queryKey: ['client-reports', selectedJob?.id],
    queryFn: () => base44.entities.Report.filter({ job_id: selectedJob.id }, '-created_date'),
    enabled: !!selectedJob?.id,
  });

  // Calculate progress
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const totalTasks = tasks.length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const pendingTasks = tasks.filter(t => t.status === 'pending').length;
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-xl p-12 text-center max-w-md">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Sin Proyectos Asignados</h2>
          <p className="text-slate-600 mb-6">
            Aún no tienes proyectos asignados como cliente. Contacta a tu contratista para obtener acceso.
          </p>
          <Button onClick={() => base44.auth.logout()} variant="outline">
            <LogOut className="w-4 h-4 mr-2" />
            Cerrar Sesión
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setShowAvatarCreator(true)}
                className="w-10 h-10 rounded-xl overflow-hidden ring-2 ring-blue-100 hover:ring-blue-300 transition-all"
              >
                {user?.avatar_image_url ? (
                  <img src={user.avatar_image_url} alt={user.full_name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-white" />
                  </div>
                )}
              </button>
              <div>
                <h1 className="font-bold text-slate-900">Portal del Cliente</h1>
                <p className="text-sm text-slate-500">Bienvenido, {user?.full_name}</p>
              </div>
            </div>
            <Button onClick={() => base44.auth.logout()} variant="ghost" size="sm">
              <LogOut className="w-4 h-4 mr-2" />
              Salir
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Project Selector (if multiple) */}
        {jobs.length > 1 && (
          <div className="mb-6 flex gap-3 overflow-x-auto pb-2">
            {jobs.map((job) => (
              <button
                key={job.id}
                onClick={() => setSelectedJobId(job.id)}
                className={`flex-shrink-0 px-4 py-2 rounded-lg border transition-all ${
                  selectedJob?.id === job.id
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300'
                }`}
              >
                {job.name}
              </button>
            ))}
          </div>
        )}

        {/* Project Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">{selectedJob?.name}</h2>
              {selectedJob?.address && (
                <div className="flex items-center gap-2 text-slate-500 mt-1">
                  <MapPin className="w-4 h-4" />
                  <span>{selectedJob.address}</span>
                </div>
              )}
            </div>
            <Badge className={`${
              selectedJob?.status === 'active' 
                ? 'bg-green-100 text-green-700 border-green-200' 
                : 'bg-blue-100 text-blue-700 border-blue-200'
            } text-sm px-3 py-1`}>
              {selectedJob?.status === 'active' ? 'En Progreso' : 'Completado'}
            </Badge>
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700">Progreso General</span>
              <span className="text-sm font-bold text-blue-600">{progressPercent}%</span>
            </div>
            <Progress value={progressPercent} className="h-3" />
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="flex items-center gap-2 text-slate-600 mb-1">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span className="text-sm">Completadas</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">{completedTasks}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="flex items-center gap-2 text-slate-600 mb-1">
                <TrendingUp className="w-4 h-4 text-blue-500" />
                <span className="text-sm">En Progreso</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">{inProgressTasks}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="flex items-center gap-2 text-slate-600 mb-1">
                <Clock className="w-4 h-4 text-amber-500" />
                <span className="text-sm">Pendientes</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">{pendingTasks}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="flex items-center gap-2 text-slate-600 mb-1">
                <Camera className="w-4 h-4 text-purple-500" />
                <span className="text-sm">Fotos</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">{photos.length}</p>
            </div>
          </div>
        </div>

        {/* Tabs Content */}
        <Tabs defaultValue="progress" className="space-y-6">
          <TabsList className="bg-white border border-slate-200 p-1 rounded-xl">
            <TabsTrigger value="progress" className="rounded-lg">
              <BarChart3 className="w-4 h-4 mr-2" />
              Progreso
            </TabsTrigger>
            <TabsTrigger value="photos" className="rounded-lg">
              <Camera className="w-4 h-4 mr-2" />
              Fotos ({photos.length})
            </TabsTrigger>
            <TabsTrigger value="documents" className="rounded-lg">
              <FileText className="w-4 h-4 mr-2" />
              Documentos
            </TabsTrigger>
            <TabsTrigger value="reports" className="rounded-lg">
              <BarChart3 className="w-4 h-4 mr-2" />
              Reportes
            </TabsTrigger>
          </TabsList>

          {/* Progress Tab */}
          <TabsContent value="progress">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Tareas del Proyecto</h3>
              {tasks.length === 0 ? (
                <div className="text-center py-12">
                  <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">No hay tareas registradas aún</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tasks.map((task) => (
                    <div 
                      key={task.id}
                      className="flex items-center justify-between p-4 bg-slate-50 rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${
                          task.status === 'completed' ? 'bg-green-500' :
                          task.status === 'in_progress' ? 'bg-blue-500' :
                          task.status === 'blocked' ? 'bg-red-500' :
                          'bg-amber-500'
                        }`} />
                        <div>
                          <p className="font-medium text-slate-900">{task.title}</p>
                          {task.category && (
                            <p className="text-sm text-slate-500">{task.category}</p>
                          )}
                        </div>
                      </div>
                      <Badge className={`${
                        task.status === 'completed' ? 'bg-green-100 text-green-700' :
                        task.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                        task.status === 'blocked' ? 'bg-red-100 text-red-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {task.status === 'completed' ? 'Completada' :
                         task.status === 'in_progress' ? 'En Progreso' :
                         task.status === 'blocked' ? 'Bloqueada' : 'Pendiente'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Photos Tab */}
          <TabsContent value="photos">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Galería de Fotos</h3>
              {photos.length === 0 ? (
                <div className="text-center py-12">
                  <Camera className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">No hay fotos disponibles</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {photos.map((photo) => (
                    <div 
                      key={photo.id}
                      onClick={() => setSelectedPhoto(photo)}
                      className="aspect-square rounded-xl overflow-hidden cursor-pointer group relative"
                    >
                      <img 
                        src={photo.file_url}
                        alt={photo.caption || 'Foto del proyecto'}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
                        <p className="text-xs text-white">
                          {format(new Date(photo.created_date), 'dd MMM yyyy')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Documentos Compartidos</h3>
              {documents.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">No hay documentos disponibles</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <a 
                      key={doc.id}
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <FileText className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{doc.name}</p>
                          <p className="text-sm text-slate-500">
                            {format(new Date(doc.created_date), 'dd MMM yyyy')}
                          </p>
                        </div>
                      </div>
                      <Download className="w-5 h-5 text-slate-400" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Reportes Generados</h3>
              {reports.length === 0 ? (
                <div className="text-center py-12">
                  <BarChart3 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">No hay reportes disponibles</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {reports.map((report) => (
                    <div 
                      key={report.id}
                      className="flex items-center justify-between p-4 bg-slate-50 rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          report.type === 'excel' ? 'bg-green-100' : 'bg-red-100'
                        }`}>
                          <FileText className={`w-5 h-5 ${
                            report.type === 'excel' ? 'text-green-600' : 'text-red-600'
                          }`} />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{report.name}</p>
                          <p className="text-sm text-slate-500">
                            {report.type === 'excel' ? 'Excel' : 'PDF'} • {format(new Date(report.created_date), 'dd MMM yyyy')}
                          </p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-2" />
                        Descargar
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Photo Modal */}
      {selectedPhoto && (
        <div 
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="max-w-4xl max-h-[90vh] relative">
            <img 
              src={selectedPhoto.file_url}
              alt={selectedPhoto.caption || 'Foto'}
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
            />
            {selectedPhoto.caption && (
              <p className="text-white text-center mt-4">{selectedPhoto.caption}</p>
            )}
          </div>
        </div>
      )}

      {/* Avatar Creator Modal */}
      {showAvatarCreator && (
        <AvatarCreator 
          open={showAvatarCreator}
          onClose={() => setShowAvatarCreator(false)}
          readOnly={true}
        />
      )}
    </div>
  );
}