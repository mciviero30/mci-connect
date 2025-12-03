import React, { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { 
  Sparkles, 
  Plus, 
  Check, 
  X, 
  Loader2, 
  AlertTriangle,
  MessageSquare,
  Image,
  FileText,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';

export default function AITaskSuggestions({ jobId, planId, tasks = [], comments = [], annotations = [] }) {
  const [suggestions, setSuggestions] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [error, setError] = useState(null);
  
  const queryClient = useQueryClient();

  // Fetch recent comments for this job/plan
  const { data: recentComments = [] } = useQuery({
    queryKey: ['task-comments-for-suggestions', jobId],
    queryFn: async () => {
      const allComments = await base44.entities.TaskComment.filter({}, '-created_date', 50);
      // Filter comments from tasks in this job
      const jobTaskIds = tasks.map(t => t.id);
      return allComments.filter(c => jobTaskIds.includes(c.task_id));
    },
    enabled: !!jobId && tasks.length > 0,
  });

  // Fetch plan annotations
  const { data: planAnnotations = [] } = useQuery({
    queryKey: ['plan-annotations', planId],
    queryFn: () => base44.entities.PlanAnnotation.filter({ plan_id: planId }),
    enabled: !!planId,
  });

  const createTaskMutation = useMutation({
    mutationFn: (taskData) => base44.entities.Task.create(taskData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['field-tasks', jobId] });
    },
  });

  const analyzeAndSuggest = async () => {
    setIsAnalyzing(true);
    setError(null);
    
    try {
      // Prepare context for AI
      const existingTaskTitles = tasks.map(t => t.title).join(', ');
      const commentTexts = recentComments.map(c => `- ${c.author_name}: "${c.comment}"`).join('\n');
      const annotationTexts = planAnnotations.map(a => `- ${a.type}: "${a.content || a.label || 'No description'}"`).join('\n');
      
      const prompt = `You are a construction project assistant analyzing a job site plan. Based on the following information, suggest NEW tasks that should be created. Do NOT suggest tasks that already exist.

EXISTING TASKS (do not duplicate):
${existingTaskTitles || 'No existing tasks'}

RECENT COMMENTS FROM TEAM:
${commentTexts || 'No recent comments'}

PLAN ANNOTATIONS/MARKUPS:
${annotationTexts || 'No annotations'}

Based on this context, identify:
1. Issues or problems mentioned in comments that need follow-up tasks
2. Action items implied by annotations (e.g., "needs inspection", "fix", "check", "install")
3. Safety concerns that require tasks
4. Quality control items
5. Missing or unclear items that need RFIs

For each suggestion, provide:
- title: Clear, actionable task title (max 60 chars)
- description: Brief explanation of why this task is needed
- priority: "low", "medium", "high", or "urgent"
- category: "general", "installation", "inspection", "issue", "rfi", or "change_order"
- reason: Why you're suggesting this (e.g., "Mentioned in comment by John")

Return 3-5 suggestions maximum. If no clear tasks are needed, return an empty array.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  priority: { type: "string" },
                  category: { type: "string" },
                  reason: { type: "string" }
                }
              }
            }
          }
        }
      });

      setSuggestions(result.suggestions || []);
    } catch (err) {
      console.error('AI analysis failed:', err);
      setError('Failed to analyze. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAcceptSuggestion = async (suggestion, index) => {
    try {
      await createTaskMutation.mutateAsync({
        title: suggestion.title,
        description: suggestion.description,
        priority: suggestion.priority,
        category: suggestion.category,
        status: 'pending',
        job_id: jobId,
        blueprint_id: planId,
        ai_suggested: true,
      });
      
      // Remove from suggestions
      setSuggestions(prev => prev.filter((_, i) => i !== index));
    } catch (err) {
      console.error('Failed to create task:', err);
    }
  };

  const handleRejectSuggestion = (index) => {
    setSuggestions(prev => prev.filter((_, i) => i !== index));
  };

  const priorityColors = {
    urgent: 'bg-red-500/20 text-red-400 border-red-500/30',
    high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    medium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    low: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  };

  const categoryIcons = {
    general: FileText,
    installation: Plus,
    inspection: Check,
    issue: AlertTriangle,
    rfi: MessageSquare,
    change_order: RefreshCw,
  };

  return (
    <div className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-3 flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-purple-500/20 rounded-lg">
            <Sparkles className="w-4 h-4 text-purple-400" />
          </div>
          <span className="font-medium text-white text-sm">AI Task Suggestions</span>
          {suggestions.length > 0 && (
            <Badge className="bg-purple-500 text-white text-xs">
              {suggestions.length}
            </Badge>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>

      {/* Content */}
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
              {/* Analyze Button */}
              <Button
                onClick={analyzeAndSuggest}
                disabled={isAnalyzing}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                size="sm"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Lightbulb className="w-4 h-4 mr-2" />
                    Analyze & Suggest Tasks
                  </>
                )}
              </Button>

              {/* Error */}
              {error && (
                <div className="p-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs">
                  {error}
                </div>
              )}

              {/* Context Info */}
              <div className="flex items-center gap-2 text-[10px] text-slate-400">
                <span className="flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" />
                  {recentComments.length} comments
                </span>
                <span className="flex items-center gap-1">
                  <Image className="w-3 h-3" />
                  {planAnnotations.length} annotations
                </span>
              </div>

              {/* Suggestions List */}
              {suggestions.length > 0 && (
                <div className="space-y-2">
                  {suggestions.map((suggestion, idx) => {
                    const CategoryIcon = categoryIcons[suggestion.category] || FileText;
                    return (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <CategoryIcon className="w-4 h-4 text-purple-400 flex-shrink-0" />
                            <span className="text-sm text-white font-medium truncate">
                              {suggestion.title}
                            </span>
                          </div>
                          <Badge className={`${priorityColors[suggestion.priority]} text-[10px] flex-shrink-0`}>
                            {suggestion.priority}
                          </Badge>
                        </div>
                        
                        <p className="text-xs text-slate-400 mb-2 line-clamp-2">
                          {suggestion.description}
                        </p>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-purple-400 italic">
                            💡 {suggestion.reason}
                          </span>
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleRejectSuggestion(idx)}
                              className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              onClick={() => handleAcceptSuggestion(suggestion, idx)}
                              disabled={createTaskMutation.isPending}
                              className="h-7 w-7 bg-green-600 hover:bg-green-700 text-white"
                            >
                              {createTaskMutation.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Check className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {/* Empty State */}
              {suggestions.length === 0 && !isAnalyzing && (
                <div className="text-center py-4">
                  <Sparkles className="w-8 h-8 text-purple-400/50 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">
                    Click analyze to get AI-powered task suggestions based on comments and annotations
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}