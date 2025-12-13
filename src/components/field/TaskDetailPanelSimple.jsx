import React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function TaskDetailPanelSimple({ task, onClose, jobId }) {
  if (!task) return null;

  return (
    <div className="w-80 h-full bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 flex flex-col z-50 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          Task Details
        </h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            console.log('❌ Close button clicked');
            onClose();
          }}
          className="h-8 w-8 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {/* Title */}
          <div>
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
              Title
            </label>
            <p className="text-lg font-semibold text-slate-900 dark:text-white mt-1">
              {task.title}
            </p>
          </div>

          {/* Status */}
          <div>
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
              Status
            </label>
            <div className="mt-1">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                task.status === 'completed' ? 'bg-green-100 text-green-800' :
                task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                task.status === 'blocked' ? 'bg-red-100 text-red-800' :
                'bg-amber-100 text-amber-800'
              }`}>
                {task.status}
              </span>
            </div>
          </div>

          {/* Priority */}
          {task.priority && (
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                Priority
              </label>
              <div className="mt-1">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  task.priority === 'high' ? 'bg-red-100 text-red-800' :
                  task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {task.priority}
                </span>
              </div>
            </div>
          )}

          {/* Description */}
          {task.description && (
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                Description
              </label>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                {task.description}
              </p>
            </div>
          )}

          {/* Pin Position */}
          <div>
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
              Pin Position
            </label>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
              X: {task.pin_x}%, Y: {task.pin_y}%
            </p>
          </div>

          {/* Job ID */}
          <div>
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
              Job ID
            </label>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
              {jobId}
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-700">
        <Button
          onClick={onClose}
          variant="outline"
          className="w-full"
        >
          Close Panel
        </Button>
      </div>
    </div>
  );
}