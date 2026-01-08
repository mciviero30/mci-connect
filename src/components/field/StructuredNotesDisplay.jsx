import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Ruler, AlertTriangle, ShieldAlert, Wrench, MessageSquare, Clock, Languages } from 'lucide-react';

export default function StructuredNotesDisplay({ notes, notesTranslated, detectedLanguage, session }) {
  const [viewLanguage, setViewLanguage] = useState(detectedLanguage || 'en');
  const formatTimestamp = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Determine which notes to display
  const displayNotes = viewLanguage === detectedLanguage ? notes : notesTranslated;
  const hasTranslation = !!notesTranslated;

  const categories = [
    {
      key: 'general_observations',
      label: 'General Observations',
      icon: MessageSquare,
      color: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200',
      items: displayNotes?.general_observations || []
    },
    {
      key: 'area_specific',
      label: 'Area-Specific Notes',
      icon: MapPin,
      color: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200',
      items: displayNotes?.area_specific || []
    },
    {
      key: 'measurement_comments',
      label: 'Measurement Comments',
      icon: Ruler,
      color: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200',
      items: displayNotes?.measurement_comments || []
    },
    {
      key: 'condition_issues',
      label: 'Condition Issues',
      icon: AlertTriangle,
      color: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
      items: displayNotes?.condition_issues || []
    },
    {
      key: 'safety_concerns',
      label: 'Safety Concerns',
      icon: ShieldAlert,
      color: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200',
      items: displayNotes?.safety_concerns || []
    },
    {
      key: 'installation_constraints',
      label: 'Installation Constraints',
      icon: Wrench,
      color: 'bg-slate-100 text-slate-800 dark:bg-slate-950 dark:text-slate-200',
      items: displayNotes?.installation_constraints || []
    }
  ];

  const totalNotes = categories.reduce((sum, cat) => sum + cat.items.length, 0);

  if (totalNotes === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold text-slate-600 flex items-center gap-2">
          <MessageSquare className="w-3 h-3" />
          Structured Notes ({totalNotes} items extracted)
        </div>
        
        {hasTranslation && (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setViewLanguage(viewLanguage === 'en' ? 'es' : 'en')}
              className="h-7 text-xs"
            >
              <Languages className="w-3 h-3 mr-1" />
              {viewLanguage === 'en' ? '🇺🇸 EN' : '🇪🇸 ES'}
            </Button>
          </div>
        )}
      </div>
      
      {categories.map(category => {
        if (category.items.length === 0) return null;
        
        const Icon = category.icon;
        
        return (
          <div key={category.key} className={`p-3 rounded-lg ${category.color}`}>
            <div className="flex items-center gap-2 mb-2">
              <Icon className="w-4 h-4" />
              <span className="font-semibold text-sm">{category.label}</span>
              <Badge className="ml-auto bg-white/50 text-xs">
                {category.items.length}
              </Badge>
            </div>
            
            <div className="space-y-2">
              {category.items.map((item, idx) => (
                <div key={idx} className="text-sm bg-white/50 dark:bg-black/20 p-2 rounded">
                  {item.area && (
                    <div className="text-xs font-semibold mb-1">
                      📍 {item.area}
                    </div>
                  )}
                  <div className="flex items-start gap-2">
                    <Clock className="w-3 h-3 mt-0.5 flex-shrink-0 opacity-60" />
                    <div className="flex-1">
                      <div className="text-xs opacity-60 mb-1">
                        @ {formatTimestamp(item.timestamp_seconds)}
                      </div>
                      <div>"{item.content}"</div>
                      {item.severity && (
                        <Badge className={`mt-1 text-xs ${
                          item.severity === 'high' ? 'bg-red-200 text-red-900' :
                          item.severity === 'medium' ? 'bg-amber-200 text-amber-900' :
                          'bg-blue-200 text-blue-900'
                        }`}>
                          {item.severity} severity
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}