import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageSquare, Languages, Clock, FileAudio } from 'lucide-react';

export default function SiteNotesPackageDisplay({ siteNotes, readOnly = true }) {
  const [viewLanguage, setViewLanguage] = useState('en');

  if (!siteNotes || siteNotes.length === 0) {
    return null;
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-lg">AI Site Notes ({siteNotes.length})</h3>
        {readOnly && (
          <Badge variant="outline" className="text-xs">Read-Only</Badge>
        )}
      </div>

      {siteNotes.map((session, idx) => {
        const notes = session.structured_notes || {};
        const hasTranslation = !!session.structured_notes_translated;
        const displayNotes = viewLanguage === 'en' ? notes : (session.structured_notes_translated || notes);

        return (
          <Card key={idx} className="border-2">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileAudio className="w-4 h-4" />
                    {new Date(session.session_start).toLocaleString()}
                  </CardTitle>
                  <div className="text-xs text-slate-600 mt-1">
                    {session.recorded_by_name} • {formatTime(session.duration_seconds)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {hasTranslation && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setViewLanguage(viewLanguage === 'en' ? 'es' : 'en')}
                      className="h-7 text-xs"
                    >
                      <Languages className="w-3 h-3 mr-1" />
                      {viewLanguage === 'en' ? '🇺🇸' : '🇪🇸'}
                    </Button>
                  )}
                  {session.review_status && (
                    <Badge className={
                      session.review_status === 'approved' ? 'bg-green-100 text-green-800' :
                      session.review_status === 'approved_with_edits' ? 'bg-blue-100 text-blue-800' :
                      'bg-amber-100 text-amber-800'
                    }>
                      {session.review_status === 'approved' ? '✓ Approved' :
                       session.review_status === 'approved_with_edits' ? '✓ Edited' :
                       '⚠ Follow-up'}
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(displayNotes).map(([category, items]) => {
                if (!Array.isArray(items) || items.length === 0) return null;

                const categoryLabels = {
                  general_observations: 'General',
                  area_specific: 'Area-Specific',
                  measurement_comments: 'Measurements',
                  condition_issues: 'Conditions',
                  safety_concerns: 'Safety',
                  installation_constraints: 'Installation'
                };

                return (
                  <div key={category} className="border-l-4 border-slate-300 pl-3">
                    <div className="font-semibold text-sm mb-2">
                      {categoryLabels[category] || category}
                    </div>
                    <div className="space-y-2">
                      {items.map((item, i) => (
                        <div key={i} className="text-sm bg-slate-50 dark:bg-slate-900 p-2 rounded">
                          <div className="flex items-start gap-2">
                            <Clock className="w-3 h-3 mt-0.5 opacity-60 flex-shrink-0" />
                            <div>
                              <div className="text-xs opacity-60">
                                @ {formatTime(item.timestamp_seconds)}
                              </div>
                              <div className="mt-1">"{item.content}"</div>
                              {item.area && (
                                <div className="text-xs text-slate-600 mt-1">
                                  📍 {item.area}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Captured Media */}
              {session.captured_media && session.captured_media.length > 0 && (
                <div className="pt-3 border-t">
                  <div className="font-semibold text-sm mb-2">
                    Evidence ({session.captured_media.length})
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {session.captured_media.map((media, i) => (
                      <div key={i} className="relative aspect-square rounded border">
                        {media.media_type === 'photo' ? (
                          <img src={media.media_url} alt="Evidence" className="w-full h-full object-cover rounded" />
                        ) : (
                          <div className="w-full h-full bg-slate-200 flex items-center justify-center rounded">
                            <span className="text-xs">Video</span>
                          </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-1 text-center">
                          @ {formatTime(media.timestamp_seconds)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}