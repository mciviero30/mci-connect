import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Brain, TrendingUp, CheckCircle2, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';

export default function AILearningEngine({ jobId, planId }) {
  const [learningStats, setLearningStats] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const queryClient = useQueryClient();

  // Monitor completed tasks to learn patterns
  const { data: completedTasks = [] } = useQuery({
    queryKey: ['completed-tasks-for-learning', jobId],
    queryFn: async () => {
      const tasks = await base44.entities.Task.filter({
        job_id: jobId,
        status: 'completed'
      });
      return tasks.filter(t => t.pin_x && t.pin_y && t.blueprint_id);
    },
    refetchInterval: 10000, // Check every 10 seconds
  });

  // Get existing patterns
  const { data: existingPatterns = [] } = useQuery({
    queryKey: ['task-patterns'],
    queryFn: () => base44.entities.TaskLocationPattern.list('-times_seen', 100),
  });

  const learnPatternMutation = useMutation({
    mutationFn: (data) => base44.entities.TaskLocationPattern.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-patterns'] });
    },
  });

  // Learn from completed tasks
  useEffect(() => {
    if (completedTasks.length === 0) return;

    completedTasks.forEach(async (task) => {
      // Check if we already learned from this task
      const existingPattern = existingPatterns.find(p => 
        p.source_job_id === task.job_id && 
        p.task_category === task.category &&
        Math.abs(p.pin_x - task.pin_x) < 5 &&
        Math.abs(p.pin_y - task.pin_y) < 5
      );

      if (existingPattern) {
        // Update existing pattern - increase confidence
        await base44.entities.TaskLocationPattern.update(existingPattern.id, {
          times_seen: existingPattern.times_seen + 1,
          confidence_score: Math.min(existingPattern.confidence_score + 0.1, 1),
          last_learned_date: new Date().toISOString()
        });
      } else {
        // Extract keywords from task title
        const keywords = task.title.toLowerCase().split(/\s+/)
          .filter(w => w.length > 2 && !['the', 'and', 'for', 'with'].includes(w))
          .slice(0, 5);

        // Create new pattern
        await learnPatternMutation.mutateAsync({
          task_category: task.category || 'general',
          task_title_keywords: keywords,
          plan_type: 'layout', // Could be enhanced to detect plan type
          pin_x: task.pin_x,
          pin_y: task.pin_y,
          task_description: task.description?.substring(0, 200) || '',
          wall_type: task.wall_type,
          source_job_id: task.job_id,
          source_plan_id: task.blueprint_id,
          confidence_score: 0.5,
          times_seen: 1,
          last_learned_date: new Date().toISOString()
        });
      }
    });

    // Update stats
    setLearningStats({
      patternsLearned: existingPatterns.length,
      tasksProcessed: completedTasks.length,
      avgConfidence: existingPatterns.reduce((acc, p) => acc + p.confidence_score, 0) / (existingPatterns.length || 1)
    });
  }, [completedTasks]);

  if (!learningStats && existingPatterns.length === 0) return null;

  return (
    <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-xl overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-3 flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-500/20 rounded-lg">
            <Brain className="w-4 h-4 text-blue-400" />
          </div>
          <span className="font-medium text-white text-sm">AI Learning Active</span>
          <Badge className="bg-blue-500 text-white text-xs">
            {existingPatterns.length} patterns
          </Badge>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-3 pt-0 space-y-3">
              <div className="text-xs text-slate-300 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Patterns Learned:</span>
                  <span className="font-medium text-blue-400">{existingPatterns.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Tasks Analyzed:</span>
                  <span className="font-medium text-green-400">{completedTasks.length}</span>
                </div>
                {learningStats && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Avg Confidence:</span>
                    <span className="font-medium text-purple-400">
                      {Math.round(learningStats.avgConfidence * 100)}%
                    </span>
                  </div>
                )}
              </div>

              <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <div className="flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-300">
                    AI is continuously learning from completed tasks across all projects to improve task positioning accuracy.
                  </p>
                </div>
              </div>

              {/* Top Patterns */}
              {existingPatterns.slice(0, 3).map((pattern, idx) => (
                <div key={pattern.id} className="p-2 bg-slate-800/50 rounded-lg border border-slate-700/50">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-white font-medium">
                      {pattern.task_category}
                    </span>
                    <Badge className="bg-green-500/20 text-green-400 text-[10px]">
                      {pattern.times_seen}x seen
                    </Badge>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Position: ({pattern.pin_x}, {pattern.pin_y}) • 
                    {Math.round(pattern.confidence_score * 100)}% confidence
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}