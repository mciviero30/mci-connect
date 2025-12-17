import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Play, CheckCircle, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function TrainingVaultTab({ isAdmin, user }) {
  const navigate = useNavigate();

  const { data: courses = [] } = useQuery({
    queryKey: ['training-courses'],
    queryFn: () => base44.entities.Course.filter({ active: true })
  });

  const { data: progress = [] } = useQuery({
    queryKey: ['my-course-progress', user?.email],
    queryFn: () => base44.entities.CourseProgress.filter({ employee_email: user?.email }),
    enabled: !!user?.email
  });

  const getProgressForCourse = (courseId) => {
    return progress.find(p => p.course_id === courseId);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Training Vault</h2>
          <p className="text-slate-600 dark:text-slate-400">Educational videos and mandatory safety courses</p>
        </div>
        <Button onClick={() => navigate(createPageUrl('Capacitacion'))} variant="outline">
          View All Courses
        </Button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {courses.slice(0, 6).map((course) => {
          const courseProgress = getProgressForCourse(course.id);
          const isCompleted = courseProgress?.status === 'completed';
          const isInProgress = courseProgress?.status === 'in_progress';

          return (
            <Card key={course.id} className="bg-white dark:bg-slate-800 hover:shadow-xl transition-all">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    {course.required && (
                      <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 mb-2">
                        Required
                      </Badge>
                    )}
                    <CardTitle className="text-lg text-slate-900 dark:text-white">
                      {course.title}
                    </CardTitle>
                  </div>
                  {isCompleted && <CheckCircle className="w-5 h-5 text-green-600" />}
                  {isInProgress && <Clock className="w-5 h-5 text-yellow-600" />}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">
                  {course.description}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    {course.duration_minutes} min
                  </span>
                  <Button 
                    size="sm" 
                    onClick={() => navigate(createPageUrl('Capacitacion'))}
                    className="bg-gradient-to-r from-green-600 to-emerald-600 text-white"
                  >
                    <Play className="w-3 h-3 mr-1" />
                    {isCompleted ? 'Review' : isInProgress ? 'Continue' : 'Start'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {courses.length === 0 && (
        <Card className="bg-white dark:bg-slate-800">
          <CardContent className="p-12 text-center">
            <GraduationCap className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No training courses available</h3>
            <p className="text-slate-600 dark:text-slate-400">Courses will appear here when added by administrators</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}