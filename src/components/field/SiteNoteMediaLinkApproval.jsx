import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Image, Video, Clock } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function SiteNoteMediaLinkApproval({ session, onApproved }) {
  const [processing, setProcessing] = useState(false);

  if (!session.suggested_media_links || session.suggested_media_links.length === 0) {
    return null;
  }

  const handleApprove = async (mediaId, noteCategory, noteIndex) => {
    setProcessing(true);
    try {
      const updatedMedia = session.captured_media.map(m => {
        if (m.media_id === mediaId) {
          return {
            ...m,
            linked_to_notes: [...(m.linked_to_notes || []), `${noteCategory}:${noteIndex}`],
            link_approved: true
          };
        }
        return m;
      });

      const updatedSuggestions = session.suggested_media_links.filter(s => s.media_id !== mediaId);

      await base44.entities.SiteNoteSession.update(session.id, {
        captured_media: updatedMedia,
        suggested_media_links: updatedSuggestions
      });

      toast.success('Media linked to note');
      onApproved();
    } catch (error) {
      console.error('Failed to approve link:', error);
      toast.error('Failed to link media');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (mediaId) => {
    setProcessing(true);
    try {
      const updatedSuggestions = session.suggested_media_links.filter(s => s.media_id !== mediaId);

      await base44.entities.SiteNoteSession.update(session.id, {
        suggested_media_links: updatedSuggestions
      });

      toast.info('Link suggestion dismissed');
      onApproved();
    } catch (error) {
      console.error('Failed to reject link:', error);
      toast.error('Failed to dismiss');
    } finally {
      setProcessing(false);
    }
  };

  const getMedia = (mediaId) => {
    return session.captured_media?.find(m => m.media_id === mediaId);
  };

  const getNote = (noteCategory, noteIndex) => {
    return session.structured_notes?.[noteCategory]?.[noteIndex];
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-blue-600" />
          Approve Media Links ({session.suggested_media_links.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {session.suggested_media_links.map((suggestion, idx) => {
          const media = getMedia(suggestion.media_id);
          const note = getNote(suggestion.note_category, suggestion.note_index);
          
          if (!media || !note) return null;

          return (
            <div key={idx} className="p-3 bg-white dark:bg-slate-800 rounded-lg border">
              <div className="flex gap-3 mb-3">
                <div className="w-24 h-24 flex-shrink-0">
                  {media.media_type === 'photo' ? (
                    <img src={media.media_url} alt="Evidence" className="w-full h-full object-cover rounded" />
                  ) : (
                    <video src={media.media_url} className="w-full h-full object-cover rounded" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    {media.media_type === 'photo' ? (
                      <Image className="w-4 h-4 text-blue-600" />
                    ) : (
                      <Video className="w-4 h-4 text-blue-600" />
                    )}
                    <Badge variant="outline" className="text-xs">
                      <Clock className="w-3 h-3 mr-1" />
                      {formatTime(media.timestamp_seconds)}
                    </Badge>
                  </div>
                  <div className="text-xs text-slate-600 mb-2">
                    <span className="font-semibold">Suggested link:</span> {suggestion.reason}
                  </div>
                  <div className="text-sm bg-slate-50 dark:bg-slate-900 p-2 rounded">
                    "{note.content}"
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleApprove(suggestion.media_id, suggestion.note_category, suggestion.note_index)}
                  disabled={processing}
                  className="flex-1 bg-green-600 text-white"
                >
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                  Approve Link
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleReject(suggestion.media_id)}
                  disabled={processing}
                  className="flex-1"
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  Dismiss
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}