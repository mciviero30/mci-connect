import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Sparkles, 
  Loader2, 
  User, 
  MapPin, 
  Award,
  Briefcase,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AIService from '@/components/services/AIService';

const rankColors = {
  1: 'bg-amber-500 text-white',
  2: 'bg-slate-400 text-white',
  3: 'bg-orange-700 text-white',
};

const rankLabels = {
  1: '🥇 Best Match',
  2: '🥈 2nd Best',
  3: '🥉 3rd Best',
};

export default function OptimalAssigneeSuggestor({ workUnitId, jobId, currentAssignee, onAssign }) {
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState(null);
  const queryClient = useQueryClient();

  // Fetch suggestions
  const suggestMutation = useMutation({
    mutationFn: () => AIService.suggestOptimalAssignee(workUnitId),
    onSuccess: (result) => {
      setSuggestions(result);
    },
  });

  // Assign employee
  const assignMutation = useMutation({
    mutationFn: async ({ userId, userName, userEmail }) => {
      await base44.entities.WorkUnit.update(workUnitId, {
        assignee_email: userEmail,
        assignee_name: userName,
      });
      return { userId, userName };
    },
    onSuccess: ({ userName }) => {
      queryClient.invalidateQueries({ queryKey: ['work-units', jobId] });
      queryClient.invalidateQueries({ queryKey: ['field-tasks', jobId] });
      onAssign?.();
      setOpen(false);
    },
  });

  const handleOpen = () => {
    setOpen(true);
    if (!suggestions) {
      suggestMutation.mutate();
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleOpen}
        className="bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200 text-purple-700 hover:from-purple-100 hover:to-indigo-100"
      >
        <Sparkles className="w-4 h-4 mr-2" />
        AI Assign
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
              <Sparkles className="w-5 h-5 text-purple-500" />
              Optimal Assignment
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Loading State */}
            {suggestMutation.isPending && (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="w-8 h-8 text-purple-500 animate-spin mb-3" />
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Analyzing employees...
                </p>
              </div>
            )}

            {/* Error State */}
            {suggestMutation.isError && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-center">
                <p className="text-red-600 dark:text-red-400 text-sm">
                  Failed to get suggestions. Please try again.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => suggestMutation.mutate()}
                  className="mt-2"
                >
                  Retry
                </Button>
              </div>
            )}

            {/* Results */}
            {suggestions && (
              <>
                {/* Task Info */}
                <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {suggestions.work_unit_title}
                  </p>
                  {suggestions.job_address && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3" />
                      {suggestions.job_address}
                    </p>
                  )}
                </div>

                {/* Ranked List */}
                <div className="space-y-3">
                  {suggestions.ranked_list.map((candidate) => (
                    <Card 
                      key={candidate.user_id}
                      className={`border-slate-200 dark:border-slate-700 hover:shadow-md transition-all ${
                        candidate.rank === 1 ? 'ring-2 ring-amber-400' : ''
                      }`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className={rankColors[candidate.rank]}>
                                #{candidate.rank}
                              </Badge>
                              <span className="font-semibold text-slate-900 dark:text-white truncate">
                                {candidate.user_name}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                              {candidate.rationale}
                            </p>
                            {candidate.score && (
                              <div className="mt-2">
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full"
                                      style={{ width: `${Math.min(candidate.score, 100)}%` }}
                                    />
                                  </div>
                                  <span className="text-xs text-slate-500 dark:text-slate-400">
                                    {candidate.score?.toFixed(0)}%
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                          <Button
                            size="sm"
                            onClick={() => assignMutation.mutate({
                              userId: candidate.user_id,
                              userName: candidate.user_name,
                              userEmail: candidate.user_email || candidate.user_name,
                            })}
                            disabled={assignMutation.isPending}
                            className={`flex-shrink-0 ${
                              candidate.rank === 1
                                ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                            }`}
                          >
                            {assignMutation.isPending ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                Assign
                                <ChevronRight className="w-4 h-4 ml-1" />
                              </>
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {suggestions.ranked_list.length === 0 && (
                  <div className="text-center py-6 text-slate-500 dark:text-slate-400">
                    <User className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No suitable employees found</p>
                  </div>
                )}

                {/* Refresh Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => suggestMutation.mutate()}
                  disabled={suggestMutation.isPending}
                  className="w-full text-slate-500"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Refresh Suggestions
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}