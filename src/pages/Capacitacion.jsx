import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GraduationCap, Play, CheckCircle, Clock, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import PageHeader from "../components/shared/PageHeader";
import StatsSummaryGrid from "../components/shared/StatsSummaryGrid";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { useLanguage } from "@/components/i18n/LanguageContext";

export default function Capacitacion() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [selectedCourse, setSelectedCourse] = useState(null);

  const { data: user } = useQuery({ 
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: 300000,
    refetchOnMount: false,
    refetchOnWindowFocus: false
  });
  const { data: courses, isLoading } = useQuery({
    queryKey: ['courses'],
    queryFn: () => base44.entities.Course.list(),
    initialData: [],
  });

  const { data: myProgress } = useQuery({
    queryKey: ['myProgress', user?.email],
    queryFn: () => user ? base44.entities.CourseProgress.filter({ employee_email: user.email }) : [],
    initialData: [],
    enabled: !!user,
  });

  const startCourseMutation = useMutation({
    mutationFn: (courseId) => base44.entities.CourseProgress.create({
      course_id: courseId,
      course_title: courses.find(c => c.id === courseId)?.title,
      employee_email: user.email,
      employee_name: user.full_name,
      status: 'in_progress',
      started_date: new Date().toISOString(),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myProgress'] });
      toast.success(t('courseStarted'));
    }
  });

  const completeCourseMutation = useMutation({
    mutationFn: ({ progressId }) => base44.entities.CourseProgress.update(progressId, {
      status: 'completed',
      completed_date: new Date().toISOString(),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myProgress'] });
      toast.success(t('courseCompleted'));
      setSelectedCourse(null);
    }
  });

  const getProgress = (courseId) => {
    return myProgress.find(p => p.course_id === courseId);
  };

  const availableCourses = courses.filter(c =>
    c.active && (!c.assigned_to || c.assigned_to.includes(user?.email) || user?.role === 'admin')
  );

  const completedCount = myProgress.filter(p => p.status === 'completed').length;
  const inProgressCount = myProgress.filter(p => p.status === 'in_progress').length;

  return (
    <div className="min-h-screen bg-[#F1F5F9] dark:bg-[#181818] pb-20 md:pb-0">
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        <PageHeader
          title="Training Modules / Módulos de Capacitación"
          description={`${completedCount} ${t('coursesCompleted')}`}
          icon={GraduationCap}
        />

        <StatsSummaryGrid 
          stats={[
            { label: t('available'), value: availableCourses.length, icon: GraduationCap },
            { label: t('inProgress'), value: inProgressCount, icon: Play },
            { label: t('completed'), value: completedCount, icon: CheckCircle }
          ]}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
          {availableCourses.map(course => {
            const progress = getProgress(course.id);
            const isRequired = course.required;

            return (
              <Card key={course.id} className="bg-white dark:bg-[#282828] shadow-lg hover:shadow-xl transition-all border-slate-200 dark:border-slate-700">
                <CardContent className="p-6">
                  {course.thumbnail_url && (
                    <img src={course.thumbnail_url} alt={course.title} className="w-full h-40 object-cover rounded-lg mb-4" />
                  )}

                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-bold text-xl text-slate-900 dark:text-white mb-2">{course.title}</h3>
                      <div className="flex gap-2 mb-2">
                        {isRequired && (
                          <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                            {t('required')}
                          </Badge>
                        )}
                        {progress && (
                          <Badge className={
                            progress.status === 'completed' ? 'bg-[#3B9FF3]/20 border-[#3B9FF3] text-[#3B9FF3]' :
                            progress.status === 'in_progress' ? 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400' :
                            'bg-slate-700/50 border-slate-600 text-slate-300'
                          }>
                            {progress.status === 'completed' ? t('completed') : progress.status === 'in_progress' ? t('inProgress') : t('pending')}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {course.description && (
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-3">{course.description}</p>
                  )}

                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 mb-4">
                    <Clock className="w-4 h-4" />
                    <span>{course.duration_minutes} {t('minutes')}</span>
                  </div>

                  {progress && progress.status === 'in_progress' && (
                    <Progress value={50} className="mb-4" />
                  )}

                  <Button
                    onClick={() => {
                      if (!progress) {
                        startCourseMutation.mutate(course.id);
                      }
                      setSelectedCourse(course);
                    }}
                    className={`w-full ${
                      progress?.status === 'completed' 
                        ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' 
                        : 'bg-gradient-to-r from-[#3B9FF3] to-[#2A8FE3] text-white shadow-lg shadow-blue-500/30'
                    }`}
                  >
                    {progress?.status === 'completed' ? (
                      <><CheckCircle className="w-5 h-5 mr-2" />{t('viewCertificate')}</>
                    ) : progress?.status === 'in_progress' ? (
                      <><Play className="w-5 h-5 mr-2" />{t('continueCourse')}</>
                    ) : (
                      <><Play className="w-5 h-5 mr-2" />{t('startCourse')}</>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {availableCourses.length === 0 && (
          <Card className="bg-white dark:bg-[#282828] shadow-lg border-slate-200 dark:border-slate-700">
            <CardContent className="p-12 text-center">
              <GraduationCap className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <p className="text-slate-500 dark:text-slate-400">{t('noCoursesAvailable')}</p>
            </CardContent>
          </Card>
        )}

        <Dialog open={!!selectedCourse} onOpenChange={() => setSelectedCourse(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-800">
            <DialogHeader>
              <DialogTitle className="text-2xl text-white">{selectedCourse?.title}</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              {selectedCourse?.video_url && (
                <div className="mb-6">
                  <video src={selectedCourse.video_url} controls className="w-full rounded-lg" />
                </div>
              )}

              <div className="prose prose-invert max-w-none mb-6">
                <div className="text-slate-300" dangerouslySetInnerHTML={{ __html: selectedCourse?.content }} />
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-800">
                <Button variant="outline" onClick={() => setSelectedCourse(null)} className="bg-slate-800 border-slate-700 text-slate-300">
                  {t('close')}
                </Button>
                {getProgress(selectedCourse?.id)?.status !== 'completed' && (
                  <Button
                    onClick={() => {
                      const progress = getProgress(selectedCourse.id);
                      if (progress) {
                        completeCourseMutation.mutate({ progressId: progress.id });
                      }
                    }}
                    className="bg-gradient-to-r from-[#3B9FF3] to-[#2A8FE3] text-white shadow-lg shadow-blue-500/30"
                  >
                    <CheckCircle className="w-5 h-5 mr-2" />
                    {t('completeCourse')}
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}