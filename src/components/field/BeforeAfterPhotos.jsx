import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Camera, ArrowRight, ZoomIn, Calendar } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { format } from "date-fns";

export default function BeforeAfterPhotos({ jobId }) {
  const [selectedComparison, setSelectedComparison] = useState(null);

  const { data: comparisons = [] } = useQuery({
    queryKey: ['photo-comparisons', jobId],
    queryFn: () => base44.entities.PhotoComparison.filter({ job_id: jobId }),
    enabled: !!jobId
  });

  const { data: photos = [] } = useQuery({
    queryKey: ['photos', jobId],
    queryFn: () => base44.entities.Photo.filter({ job_id: jobId }),
    enabled: !!jobId
  });

  const autoDetectedPairs = photos.reduce((pairs, photo) => {
    if (!photo.location_tag) return pairs;
    
    const existing = pairs.find(p => p.location === photo.location_tag);
    if (!existing) {
      pairs.push({
        location: photo.location_tag,
        before: photo.photo_type === 'before' ? photo : null,
        after: photo.photo_type === 'after' ? photo : null,
        area_name: photo.area_name || photo.location_tag
      });
    } else {
      if (photo.photo_type === 'before') existing.before = photo;
      if (photo.photo_type === 'after') existing.after = photo;
    }
    return pairs;
  }, []);

  const validPairs = autoDetectedPairs.filter(p => p.before && p.after);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Before & After Comparisons</h2>
        <p className="text-slate-600 dark:text-slate-400">Visual progress documentation by area</p>
      </div>

      {validPairs.length === 0 ? (
        <div className="text-center py-12 bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600 rounded-2xl shadow-lg">
          <Camera className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No before/after pairs yet</h3>
          <p className="text-slate-400">Take photos with matching location tags to create comparisons</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {validPairs.map((pair, index) => (
            <Card 
              key={index} 
              className="bg-white dark:bg-slate-800 hover:shadow-2xl transition-all cursor-pointer group"
              onClick={() => setSelectedComparison(pair)}
            >
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-slate-900 dark:text-white">
                  <Camera className="w-5 h-5 text-blue-600" />
                  {pair.area_name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="relative">
                    <img 
                      src={pair.before.photo_url} 
                      alt="Before"
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <Badge className="absolute top-2 left-2 bg-red-500 text-white text-xs">
                      Before
                    </Badge>
                  </div>

                  <div className="relative">
                    <img 
                      src={pair.after.photo_url} 
                      alt="After"
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <Badge className="absolute top-2 left-2 bg-green-500 text-white text-xs">
                      After
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {pair.before.created_date && format(new Date(pair.before.created_date), 'MMM dd')}
                    <ArrowRight className="w-3 h-3" />
                    {pair.after.created_date && format(new Date(pair.after.created_date), 'MMM dd')}
                  </div>
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-blue-600 group-hover:bg-blue-50">
                    <ZoomIn className="w-3 h-3 mr-1" />
                    View
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedComparison && (
        <Dialog open={!!selectedComparison} onOpenChange={() => setSelectedComparison(null)}>
          <DialogContent className="max-w-6xl bg-slate-900 border-slate-700 p-0">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-white mb-6">{selectedComparison.area_name}</h2>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Badge className="mb-3 bg-red-500 text-white">Before</Badge>
                  <img 
                    src={selectedComparison.before.photo_url} 
                    alt="Before"
                    className="w-full rounded-lg shadow-2xl"
                  />
                  {selectedComparison.before.created_date && (
                    <p className="text-sm text-slate-400 mt-2">
                      {format(new Date(selectedComparison.before.created_date), 'MMM dd, yyyy h:mm a')}
                    </p>
                  )}
                </div>

                <div>
                  <Badge className="mb-3 bg-green-500 text-white">After</Badge>
                  <img 
                    src={selectedComparison.after.photo_url} 
                    alt="After"
                    className="w-full rounded-lg shadow-2xl"
                  />
                  {selectedComparison.after.created_date && (
                    <p className="text-sm text-slate-400 mt-2">
                      {format(new Date(selectedComparison.after.created_date), 'MMM dd, yyyy h:mm a')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}