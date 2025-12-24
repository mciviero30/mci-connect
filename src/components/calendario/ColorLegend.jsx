import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Palette } from 'lucide-react';

export default function ColorLegend({ jobs, language = 'en' }) {
  const projectsWithColors = jobs.filter(j => j.color).slice(0, 8);

  if (projectsWithColors.length === 0) return null;

  return (
    <Card className="bg-white shadow-sm border-slate-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2 text-slate-700">
          <Palette className="w-4 h-4" />
          {language === 'es' ? 'Leyenda de Proyectos' : 'Project Legend'}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {projectsWithColors.map(job => (
            <div key={job.id} className="flex items-center gap-2">
              <div
                className={`w-4 h-4 rounded border-2 ${
                  job.color === 'blue' ? 'bg-blue-500 border-blue-600' :
                  job.color === 'green' ? 'bg-green-500 border-green-600' :
                  job.color === 'purple' ? 'bg-purple-500 border-purple-600' :
                  job.color === 'orange' ? 'bg-orange-500 border-orange-600' :
                  job.color === 'amber' ? 'bg-amber-500 border-amber-600' :
                  job.color === 'pink' ? 'bg-pink-500 border-pink-600' :
                  job.color === 'cyan' ? 'bg-cyan-500 border-cyan-600' :
                  job.color === 'red' ? 'bg-red-500 border-red-600' :
                  'bg-slate-500 border-slate-600'
                }`}
              />
              <span className="text-xs text-slate-700 truncate">{job.name}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}