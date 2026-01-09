import React from 'react';
import { AlertTriangle, CheckSquare, FileText, MapPin, ClipboardCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import FieldProjectOverview from './FieldProjectOverview.jsx';
import FieldTasksView from './FieldTasksView.jsx';
import FieldChecklistsView from './FieldChecklistsView.jsx';
import FieldPlansView from './FieldPlansView.jsx';

export default function FieldInstallation({ job, tasks, plans, jobId, currentUser }) {
  return (
    <>
      {/* CRITICAL WARNING BANNER - FIXED */}
      <div className="flex-shrink-0 bg-blue-500/10 border-b-2 border-blue-500 px-4 py-3">
        <div className="flex items-start gap-3 max-w-4xl">
          <AlertTriangle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-blue-300 font-bold text-sm">
              📄 Installation must follow FINAL APPROVED DRAWINGS ONLY.
            </p>
            <p className="text-blue-200 text-xs mt-1">
              Measurements are NOT installation instructions. Do not deviate from approved drawings.
            </p>
          </div>
        </div>
      </div>

      {/* INSTALLATION CONTENT */}
      <div className="space-y-5 px-3 sm:px-4 md:px-6 py-6 pb-32">
        
        {/* 1. Progress Summary */}
        <section className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <FieldProjectOverview job={job} tasks={tasks} plans={plans} compact={true} />
        </section>

        {/* 2. Installation Tasks */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-orange-400" />
              Installation Tasks
            </h2>
            <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/40 px-2 py-0.5 text-xs">
              {tasks.filter(t => t.status !== 'completed').length}
            </Badge>
          </div>
          <FieldTasksView jobId={jobId} tasks={tasks} plans={plans} currentUser={currentUser} />
        </section>

        {/* 3. Final Approved Drawings Section */}
        {plans.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-400" />
                Final Approved Drawings
              </h2>
              <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/40 px-2 py-0.5 text-xs">
                {plans.length}
              </Badge>
            </div>
            <FieldPlansView jobId={jobId} plans={plans} tasks={tasks} />
          </section>
        )}

        {/* 4. Installation Checklists */}
        <section>
          <h2 className="text-base font-bold text-white mb-3 flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-green-400" />
            Installation Checklists
          </h2>
          <FieldChecklistsView jobId={jobId} />
        </section>
      </div>
    </>
  );
}