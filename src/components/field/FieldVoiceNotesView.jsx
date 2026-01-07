import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mic, Play, Loader2, MapPin, Clock, AlertCircle, CheckCircle2, Trash2, ListTodo, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { FIELD_STABLE_QUERY_CONFIG, FIELD_QUERY_KEYS } from './config/fieldQueryConfig';

export default function FieldVoiceNotesView({ jobId }) {
  const [selectedNote, setSelectedNote] = useState(null);
  const queryClient = useQueryClient();

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['field-voice-notes', jobId],
    queryFn: () => base44.entities.FieldNote.filter({ job_id: jobId }, '-created_date'),
    enabled: !!jobId,
    ...FIELD_STABLE_QUERY_CONFIG,
  });

  const deleteMutation = useMutation({
    mutationFn: (noteId) => base44.entities.FieldNote.delete(noteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['field-voice-notes', jobId] });
      setSelectedNote(null);
      toast.success('Voice note deleted');
    },
  });

  const playAudio = (audioUrl) => {
    const audio = new Audio(audioUrl);
    audio.play();
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      recording: { color: 'bg-yellow-500', label: 'Recording' },
      processing: { color: 'bg-blue-500', label: 'Processing' },
      completed: { color: 'bg-green-500', label: 'Completed' },
      error: { color: 'bg-red-500', label: 'Error' },
    };

    const config = statusConfig[status] || statusConfig.processing;
    return (
      <Badge className={`${config.color} text-white`}>
        {config.label}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
          <Mic className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
          No voice notes yet
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Start recording site observations with AI analysis
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {notes.map((note) => (
        <Card key={note.id} className="bg-white dark:bg-slate-800 hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <CardTitle className="text-base">{note.area || 'Site Note'}</CardTitle>
                  {getStatusBadge(note.processing_status)}
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {format(new Date(note.created_date), 'MMM d, h:mm a')}
                  </span>
                  {note.latitude && note.longitude && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      GPS
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                {note.audio_url && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => playAudio(note.audio_url)}
                    className="h-8 w-8 p-0"
                  >
                    <Play className="w-4 h-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteMutation.mutate(note.id)}
                  className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Transcript */}
            {note.transcript && (
              <div>
                <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  Transcript
                </h4>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {note.transcript}
                </p>
              </div>
            )}

            {/* AI Analysis */}
            {note.ai_analysis && note.processing_status === 'completed' && (
              <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                {/* Tasks */}
                {note.ai_analysis.tasks?.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1">
                      <ListTodo className="w-3 h-3" />
                      Extracted Tasks ({note.ai_analysis.tasks.length})
                    </h4>
                    <div className="space-y-2">
                      {note.ai_analysis.tasks.map((task, idx) => (
                        <div key={idx} className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-2">
                          <div className="flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-900 dark:text-white">
                                {task.title}
                              </p>
                              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                                {task.description}
                              </p>
                              <Badge className="mt-1 text-xs" variant="outline">
                                {task.priority} priority
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Issues */}
                {note.ai_analysis.issues?.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Issues Found ({note.ai_analysis.issues.length})
                    </h4>
                    <div className="space-y-2">
                      {note.ai_analysis.issues.map((issue, idx) => (
                        <div key={idx} className="bg-red-50 dark:bg-red-950/30 rounded-lg p-2">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-slate-900 dark:text-white">
                                {issue.description}
                              </p>
                              {issue.suggested_action && (
                                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                                  → {issue.suggested_action}
                                </p>
                              )}
                              <Badge 
                                className={`mt-1 text-xs ${
                                  issue.severity === 'critical' ? 'bg-red-500 text-white' :
                                  issue.severity === 'high' ? 'bg-orange-500 text-white' :
                                  issue.severity === 'medium' ? 'bg-yellow-500 text-white' :
                                  'bg-blue-500 text-white'
                                }`}
                              >
                                {issue.severity}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Measurements */}
                {note.ai_analysis.measurements?.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      Measurements
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {note.ai_analysis.measurements.map((m, idx) => (
                        <div key={idx} className="bg-slate-50 dark:bg-slate-900 rounded p-2">
                          <p className="text-xs text-slate-600 dark:text-slate-400">{m.item}</p>
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">
                            {m.value} {m.unit}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Observations */}
                {note.ai_analysis.observations?.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      Observations
                    </h4>
                    <ul className="space-y-1">
                      {note.ai_analysis.observations.map((obs, idx) => (
                        <li key={idx} className="text-sm text-slate-600 dark:text-slate-400 flex gap-2">
                          <span className="text-slate-400">•</span>
                          <span>{obs}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Processing Error */}
            {note.processing_status === 'error' && note.error_message && (
              <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-3">
                <p className="text-sm text-red-700 dark:text-red-400">
                  {note.error_message}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}