import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Award, Heart, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { getDisplayName } from '@/components/utils/nameHelpers';
import { motion, AnimatePresence } from 'framer-motion';

const RECOGNITION_STYLES = {
  teamwork: { color: 'from-blue-500 to-cyan-500', icon: '🤝' },
  innovation: { color: 'from-purple-500 to-pink-500', icon: '💡' },
  customer_service: { color: 'from-yellow-500 to-orange-500', icon: '⭐' },
  leadership: { color: 'from-indigo-500 to-purple-500', icon: '👑' },
  quality_work: { color: 'from-green-500 to-emerald-500', icon: '✨' },
  problem_solving: { color: 'from-red-500 to-pink-500', icon: '🎯' },
  going_extra_mile: { color: 'from-orange-500 to-red-500', icon: '🚀' },
  mentorship: { color: 'from-teal-500 to-cyan-500', icon: '🎓' },
  safety_excellence: { color: 'from-green-500 to-lime-500', icon: '🛡️' },
  positive_attitude: { color: 'from-yellow-500 to-amber-500', icon: '😊' },
};

export default function RecognitionFeed({ limit = 10, showTitle = true }) {
  const { data: recognitions = [], isLoading } = useQuery({
    queryKey: ['recognitions', limit],
    queryFn: () => base44.entities.Recognition.list('-created_date', limit),
    staleTime: 30000,
    initialData: [],
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-slate-100 dark:bg-slate-800/50 rounded-xl p-4 animate-pulse">
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  if (recognitions.length === 0) {
    return (
      <Card className="bg-white dark:bg-gradient-to-br dark:from-slate-800 dark:to-slate-900 border-slate-200 dark:border-slate-700">
        <CardContent className="p-8 text-center">
          <Award className="w-16 h-16 text-slate-400 dark:text-slate-600 mx-auto mb-4" />
          <p className="text-slate-500 dark:text-slate-400">No recognitions yet. Be the first to give kudos!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {showTitle && (
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-blue-500" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Recognition Feed</h3>
        </div>
      )}
      
      <AnimatePresence>
        {recognitions.map((recognition, index) => {
          const style = RECOGNITION_STYLES[recognition.recognition_type] || RECOGNITION_STYLES.quality_work;
          
          return (
            <motion.div
              key={recognition.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <Card className="bg-white dark:bg-gradient-to-br dark:from-slate-800/90 dark:to-slate-900/90 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-all backdrop-blur-sm shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={`p-3 bg-gradient-to-br ${style.color} rounded-xl shadow-lg flex-shrink-0`}>
                      <span className="text-2xl">{style.icon}</span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1">
                          <p className="text-slate-900 dark:text-white font-semibold text-sm">
                            {recognition.given_by_name}
                            <span className="text-slate-500 dark:text-slate-400 font-normal"> recognized </span>
                            {recognition.employee_name}
                          </p>
                        </div>
                        <Badge className={`bg-gradient-to-br ${style.color} text-white border-none shadow-md flex-shrink-0`}>
                          +{recognition.points} pts
                        </Badge>
                      </div>

                      <Badge variant="outline" className="mb-2 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600">
                        {recognition.title}
                      </Badge>

                      <p className="text-slate-600 dark:text-slate-300 text-sm mb-3 line-clamp-3">
                        "{recognition.message}"
                      </p>

                      <div className="flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
                        <span>{format(new Date(recognition.created_date), 'MMM dd, yyyy')}</span>
                        <span>•</span>
                        <span>{format(new Date(recognition.created_date), 'h:mm a')}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}