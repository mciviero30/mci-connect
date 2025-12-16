import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, AlertCircle, FileText, Shield, GraduationCap, FileCheck } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const ONBOARDING_CATEGORIES = {
  safety_forms: {
    label: "Safety Forms",
    icon: Shield,
    color: "text-red-600",
    bgColor: "bg-red-50"
  },
  personal_paperwork: {
    label: "Personal Paperwork",
    icon: FileText,
    color: "text-blue-600",
    bgColor: "bg-blue-50"
  },
  training: {
    label: "Company Training",
    icon: GraduationCap,
    color: "text-purple-600",
    bgColor: "bg-purple-50"
  },
  company_rules: {
    label: "Company Rules & Policies",
    icon: FileCheck,
    color: "text-green-600",
    bgColor: "bg-green-50"
  }
};

export default function OnboardingDetailsModal({ employee, tasks, isOpen, onClose }) {
  if (!employee) return null;

  const displayName = (() => {
    if (employee.first_name && employee.last_name) {
      return `${employee.first_name} ${employee.last_name}`.trim();
    }
    if (employee.full_name && !employee.full_name.includes('@')) {
      return employee.full_name;
    }
    return employee.email.split('@')[0];
  })();

  // Group tasks by category
  const tasksByCategory = tasks.reduce((acc, task) => {
    if (!acc[task.category]) acc[task.category] = [];
    acc[task.category].push(task);
    return acc;
  }, {});

  // Calculate completion for each category
  const categoryProgress = Object.entries(ONBOARDING_CATEGORIES).map(([key, config]) => {
    const categoryTasks = tasksByCategory[key] || [];
    const completed = categoryTasks.filter(t => t.status === 'completed').length;
    const total = categoryTasks.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return {
      key,
      ...config,
      completed,
      total,
      percentage,
      tasks: categoryTasks
    };
  });

  const overallCompleted = tasks.filter(t => t.status === 'completed').length;
  const overallTotal = tasks.length;
  const overallPercentage = overallTotal > 0 ? Math.round((overallCompleted / overallTotal) * 100) : 0;
  const isOfficeReady = overallPercentage >= 100;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            {employee.profile_photo_url ? (
              <img
                src={employee.profile_photo_url}
                alt={displayName}
                className="w-12 h-12 rounded-full object-cover border-2 border-blue-500/30"
              />
            ) : (
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center text-white font-bold text-lg">
                {displayName[0]?.toUpperCase()}
              </div>
            )}
            <div>
              <div>{displayName}</div>
              <p className="text-sm font-normal text-slate-600">{employee.position || 'Employee'}</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Overall Progress */}
        <div className="mb-6 p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl border border-blue-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold text-slate-900">Overall Onboarding Progress</h3>
            {isOfficeReady ? (
              <Badge className="bg-green-500 text-white px-3 py-1.5">
                <CheckCircle2 className="w-4 h-4 mr-1" />
                Office Ready
              </Badge>
            ) : (
              <Badge className="bg-amber-500 text-white px-3 py-1.5">
                <AlertCircle className="w-4 h-4 mr-1" />
                In Progress
              </Badge>
            )}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-slate-700">{overallCompleted} of {overallTotal} tasks completed</span>
              <span className="font-bold text-blue-700">{overallPercentage}%</span>
            </div>
            <Progress value={overallPercentage} className="h-3" />
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Onboarding Checklist</h3>
          
          {categoryProgress.map(category => {
            const Icon = category.icon;
            const isComplete = category.percentage === 100;

            return (
              <div key={category.key} className={`p-5 rounded-xl border-2 ${isComplete ? 'border-green-300 bg-green-50' : 'border-slate-200 bg-slate-50'}`}>
                <div className="flex items-start gap-3 mb-3">
                  <div className={`p-2.5 rounded-lg ${category.bgColor}`}>
                    <Icon className={`w-5 h-5 ${category.color}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bold text-slate-900">{category.label}</h4>
                      {isComplete ? (
                        <Badge className="bg-green-500 text-white">
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                          Complete
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-amber-300 text-amber-700">
                          {category.completed}/{category.total}
                        </Badge>
                      )}
                    </div>
                    <Progress value={category.percentage} className="h-2 mb-3" />
                    
                    {/* Task List */}
                    <div className="space-y-2 mt-3">
                      {category.tasks.length > 0 ? (
                        category.tasks.map(task => (
                          <div key={task.id} className="flex items-center gap-2.5 text-sm">
                            {task.status === 'completed' ? (
                              <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                            ) : (
                              <Circle className="w-4 h-4 text-slate-400 flex-shrink-0" />
                            )}
                            <span className={task.status === 'completed' ? 'text-slate-600 line-through' : 'text-slate-700'}>
                              {task.task_name}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-slate-500 italic">No tasks in this category yet</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Note */}
        {!isOfficeReady && (
          <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-amber-900 mb-1">Onboarding Incomplete</h4>
                <p className="text-sm text-amber-800">
                  This employee needs to complete all onboarding tasks before being assigned to job sites.
                </p>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}