import React, { useState } from 'react';
import { Camera, X, ChevronLeft, ChevronRight, Calendar, Tag } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

export default function PhotoGalleryEnhanced({ photos }) {
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const openLightbox = (photo, index) => {
    setSelectedPhoto(photo);
    setCurrentIndex(index);
  };

  const closeLightbox = () => {
    setSelectedPhoto(null);
  };

  const goToPrevious = (e) => {
    e.stopPropagation();
    const newIndex = currentIndex > 0 ? currentIndex - 1 : photos.length - 1;
    setCurrentIndex(newIndex);
    setSelectedPhoto(photos[newIndex]);
  };

  const goToNext = (e) => {
    e.stopPropagation();
    const newIndex = currentIndex < photos.length - 1 ? currentIndex + 1 : 0;
    setCurrentIndex(newIndex);
    setSelectedPhoto(photos[newIndex]);
  };

  if (photos.length === 0) {
    return (
      <div className="text-center py-16 bg-slate-50 rounded-2xl">
        <Camera className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <p className="text-slate-500 text-lg">No hay fotos disponibles</p>
        <p className="text-sm text-slate-400 mt-2">Las fotos aparecerán aquí a medida que avanza el proyecto</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {photos.map((photo, index) => (
          <div 
            key={photo.id}
            onClick={() => openLightbox(photo, index)}
            className="group relative aspect-square rounded-xl overflow-hidden cursor-pointer bg-slate-100 hover:shadow-xl transition-all duration-300"
          >
            <img 
              src={photo.thumbnail_url || photo.file_url}
              alt={photo.caption || 'Foto del proyecto'}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              loading="lazy"
            />
            
            {/* Overlay on hover */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="absolute bottom-0 left-0 right-0 p-4">
                {photo.photo_type && (
                  <Badge className="mb-2 bg-white/20 text-white backdrop-blur-sm border-white/30">
                    {photo.photo_type === 'before' ? 'Antes' :
                     photo.photo_type === 'after' ? 'Después' :
                     photo.photo_type === 'progress' ? 'Progreso' : 'General'}
                  </Badge>
                )}
                {photo.caption && (
                  <p className="text-white text-sm font-medium line-clamp-2">{photo.caption}</p>
                )}
              </div>
            </div>

            {/* Date badge */}
            <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm rounded-lg px-2 py-1 text-xs text-white font-medium">
              {format(new Date(photo.created_date), 'dd MMM')}
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox Modal */}
      {selectedPhoto && (
        <div 
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
          onClick={closeLightbox}
        >
          {/* Navigation Arrows */}
          {photos.length > 1 && (
            <>
              <button
                onClick={goToPrevious}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full transition-all z-10"
              >
                <ChevronLeft className="w-6 h-6 text-white" />
              </button>
              <button
                onClick={goToNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full transition-all z-10"
              >
                <ChevronRight className="w-6 h-6 text-white" />
              </button>
            </>
          )}

          {/* Close Button */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full transition-all z-10"
          >
            <X className="w-6 h-6 text-white" />
          </button>

          {/* Image Container */}
          <div className="max-w-6xl max-h-[85vh] relative" onClick={(e) => e.stopPropagation()}>
            <img 
              src={selectedPhoto.file_url}
              alt={selectedPhoto.caption || 'Foto'}
              className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl"
            />
            
            {/* Photo Info */}
            <div className="mt-6 bg-white/10 backdrop-blur-md rounded-xl p-6 text-white">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  {selectedPhoto.caption && (
                    <h3 className="text-xl font-semibold mb-3">{selectedPhoto.caption}</h3>
                  )}
                  <div className="flex flex-wrap gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>{format(new Date(selectedPhoto.created_date), 'dd MMMM yyyy, HH:mm')}</span>
                    </div>
                    {selectedPhoto.photo_type && (
                      <div className="flex items-center gap-2">
                        <Tag className="w-4 h-4" />
                        <span>
                          {selectedPhoto.photo_type === 'before' ? 'Foto de Antes' :
                           selectedPhoto.photo_type === 'after' ? 'Foto de Después' :
                           selectedPhoto.photo_type === 'progress' ? 'Foto de Progreso' : 'Foto General'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <Badge className="bg-white/20 text-white border-white/30 text-sm px-3 py-1">
                  {currentIndex + 1} / {photos.length}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}