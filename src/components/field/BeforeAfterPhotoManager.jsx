import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Camera, ArrowLeftRight } from 'lucide-react';

export default function BeforeAfterPhotoManager({ jobId }) {
  const queryClient = useQueryClient();
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  const { data: photos = [] } = useQuery({
    queryKey: ['job-photos', jobId],
    queryFn: () => base44.entities.Photo.filter({ job_id: jobId }),
    enabled: !!jobId
  });

  const updatePhotoTypeMutation = useMutation({
    mutationFn: ({ photoId, photoType }) => 
      base44.entities.Photo.update(photoId, { photo_type: photoType }),
    onSuccess: () => {
      queryClient.invalidateQueries(['job-photos', jobId]);
      setSelectedPhoto(null);
    }
  });

  const beforePhotos = photos.filter(p => p.photo_type === 'before');
  const afterPhotos = photos.filter(p => p.photo_type === 'after');
  const generalPhotos = photos.filter(p => !p.photo_type || p.photo_type === 'general' || p.photo_type === 'progress');

  const handleSetType = (photo, type) => {
    updatePhotoTypeMutation.mutate({ photoId: photo.id, photoType: type });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 p-4 bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600 rounded-xl shadow-lg">
        <ArrowLeftRight className="w-6 h-6 text-orange-500" />
        <div>
          <h3 className="font-bold text-white">Before & After Photos</h3>
          <p className="text-sm text-slate-400">Tag photos for web portfolio and PDF reports</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Before Section */}
        <div className="bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-bold text-white flex items-center gap-2">
              <span className="w-3 h-3 bg-red-500 rounded-full"></span>
              Before Photos
            </h4>
            <Badge className="bg-red-500 text-white">{beforePhotos.length}</Badge>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {beforePhotos.map(photo => (
              <div key={photo.id} className="relative group">
                <img 
                  src={photo.thumbnail_url || photo.file_url} 
                  alt="Before"
                  className="w-full h-32 object-cover rounded-lg border-2 border-red-500"
                />
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleSetType(photo, 'general')}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* After Section */}
        <div className="bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-bold text-white flex items-center gap-2">
              <span className="w-3 h-3 bg-green-500 rounded-full"></span>
              After Photos
            </h4>
            <Badge className="bg-green-500 text-white">{afterPhotos.length}</Badge>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {afterPhotos.map(photo => (
              <div key={photo.id} className="relative group">
                <img 
                  src={photo.thumbnail_url || photo.file_url} 
                  alt="After"
                  className="w-full h-32 object-cover rounded-lg border-2 border-green-500"
                />
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleSetType(photo, 'general')}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Untagged Photos */}
      {generalPhotos.length > 0 && (
        <div className="bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600 rounded-xl p-4 shadow-lg">
          <h4 className="font-bold text-white mb-3">General Photos (Click to tag)</h4>
          <div className="grid grid-cols-4 gap-2">
            {generalPhotos.map(photo => (
              <div key={photo.id} className="relative group">
                <img 
                  src={photo.thumbnail_url || photo.file_url} 
                  alt="General"
                  className="w-full h-24 object-cover rounded-lg border border-slate-500 cursor-pointer hover:border-orange-500"
                  onClick={() => setSelectedPhoto(photo)}
                />
                {selectedPhoto?.id === photo.id && (
                  <div className="absolute inset-0 bg-slate-900/80 rounded-lg flex items-center justify-center gap-2">
                    <Button
                      size="sm"
                      className="bg-red-500 hover:bg-red-600"
                      onClick={() => handleSetType(photo, 'before')}
                    >
                      Before
                    </Button>
                    <Button
                      size="sm"
                      className="bg-green-500 hover:bg-green-600"
                      onClick={() => handleSetType(photo, 'after')}
                    >
                      After
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}