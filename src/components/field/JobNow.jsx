import React from 'react';
import { Card } from '@/components/ui/card';
import { CheckSquare, AlertTriangle, Camera, Clock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function JobNow({ tasks = [], incidents = [], photos = [], onNavigate }) {
  // Analyze actionable items
  const pendingTasks = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress');
  const openIncidents = incidents.filter(i => i.status === 'open' || i.status === 'investigating');
  const requiredPhotos = tasks.filter(t => t.requires_photo && !t.photo_url);

  const actionableItems = [
    {
      id: 'tasks',
      icon: CheckSquare,
      label: 'Pending Tasks',
      count: pendingTasks.length,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/40',
      panel: 'tasks',
      items: pendingTasks.slice(0, 3).map(t => t.title || t.description)
    },
    {
      id: 'incidents',
      icon: AlertTriangle,
      label: 'Open Incidents',
      count: openIncidents.length,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/40',
      panel: 'activity',
      items: openIncidents.slice(0, 3).map(i => i.description)
    },
    {
      id: 'photos',
      icon: Camera,
      label: 'Required Photos',
      count: requiredPhotos.length,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/40',
      panel: 'photos',
      items: requiredPhotos.slice(0, 3).map(p => p.title || 'Photo needed')
    }
  ].filter(item => item.count > 0);

  if (actionableItems.length === 0) {
    return (
      <Card className="p-6 bg-slate-800 border-slate-700">
        <div className="flex items-center gap-3 text-green-400">
          <CheckSquare className="w-5 h-5" />
          <p className="font-medium">All caught up! No pending actions.</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {actionableItems.map((item) => {
        const Icon = item.icon;
        return (
          <Card 
            key={item.id} 
            className={`p-4 bg-slate-800 border ${item.borderColor} hover:border-opacity-60 transition-all cursor-pointer`}
            onClick={() => onNavigate(item.panel)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1">
                <div className={`p-2 rounded-lg ${item.bgColor}`}>
                  <Icon className={`w-5 h-5 ${item.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className={`font-bold ${item.color}`}>{item.label}</h3>
                    <Badge className={`${item.bgColor} ${item.color} border-0 text-xs`}>
                      {item.count}
                    </Badge>
                  </div>
                  <ul className="space-y-1">
                    {item.items.map((text, idx) => (
                      <li key={idx} className="text-sm text-slate-400 truncate flex items-center gap-2">
                        <Clock className="w-3 h-3 flex-shrink-0" />
                        {text}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <ArrowRight className={`w-5 h-5 ${item.color} flex-shrink-0 mt-2`} />
            </div>
          </Card>
        );
      })}
    </div>
  );
}