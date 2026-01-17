import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Calendar, Users, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function AIScheduleOptimizer({ jobs, employees, assignments }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [suggestions, setSuggestions] = useState(null);

  const analyzeSchedule = async () => {
    setAnalyzing(true);
    try {
      const activeJobs = jobs.filter(j => j.status === 'active');
      const availableEmployees = employees.filter(e => e.employment_status === 'active');
      
      const prompt = `Analyze this construction schedule and provide optimization recommendations:

ACTIVE JOBS (${activeJobs.length}):
${activeJobs.map(j => `- ${j.name}: ${j.estimated_hours || 0}h estimated, Team: ${j.team_name || 'Unassigned'}`).join('\n')}

AVAILABLE EMPLOYEES (${availableEmployees.length}):
${availableEmployees.map(e => `- ${e.full_name}: ${e.position || 'Worker'}`).join('\n')}

CURRENT ASSIGNMENTS (${assignments.length}):
${assignments.slice(0, 20).map(a => `- ${a.employee_name}: ${a.job_name} on ${a.date}`).join('\n')}

Provide JSON response with:
1. conflicts: [{employee, date, reason}] - scheduling conflicts
2. underutilized: [employee_name] - employees with low utilization
3. overloaded: [{employee, hours, recommendation}] - overworked employees
4. recommendations: [{action, priority, impact}] - optimization suggestions
5. efficiency_score: number (0-100) - current schedule efficiency`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            conflicts: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  employee: { type: 'string' },
                  date: { type: 'string' },
                  reason: { type: 'string' }
                }
              }
            },
            underutilized: {
              type: 'array',
              items: { type: 'string' }
            },
            overloaded: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  employee: { type: 'string' },
                  hours: { type: 'number' },
                  recommendation: { type: 'string' }
                }
              }
            },
            recommendations: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  action: { type: 'string' },
                  priority: { type: 'string' },
                  impact: { type: 'string' }
                }
              }
            },
            efficiency_score: { type: 'number' }
          }
        }
      });

      setSuggestions(response);
      toast.success('Schedule analysis complete');
    } catch (error) {
      console.error('AI analysis error:', error);
      toast.error('Failed to analyze schedule');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-xl">
              <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">AI Schedule Optimizer</h3>
              <p className="text-sm text-slate-500">Optimize team assignments and workload</p>
            </div>
          </div>
          <Button
            onClick={analyzeSchedule}
            disabled={analyzing}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {analyzing ? 'Analyzing...' : 'Analyze Schedule'}
          </Button>
        </div>

        {suggestions && (
          <div className="space-y-4 mt-6">
            {/* Efficiency Score */}
            <div className="p-4 soft-blue-gradient rounded-xl">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-blue-700">Efficiency Score</span>
                <span className="text-3xl font-bold text-blue-800">{suggestions.efficiency_score}%</span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${suggestions.efficiency_score}%` }}
                />
              </div>
            </div>

            {/* Conflicts */}
            {suggestions.conflicts?.length > 0 && (
              <div className="soft-red-gradient rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <h4 className="font-bold text-red-700">Scheduling Conflicts ({suggestions.conflicts.length})</h4>
                </div>
                <div className="space-y-2">
                  {suggestions.conflicts.map((conflict, idx) => (
                    <div key={idx} className="text-sm text-red-700">
                      <strong>{conflict.employee}</strong> on {conflict.date}: {conflict.reason}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Overloaded */}
            {suggestions.overloaded?.length > 0 && (
              <div className="soft-amber-gradient rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-5 h-5 text-amber-600" />
                  <h4 className="font-bold text-amber-700">Overloaded Employees ({suggestions.overloaded.length})</h4>
                </div>
                <div className="space-y-3">
                  {suggestions.overloaded.map((item, idx) => (
                    <div key={idx} className="text-sm">
                      <div className="font-bold text-amber-800">{item.employee} - {item.hours}h/week</div>
                      <div className="text-amber-700">{item.recommendation}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Underutilized */}
            {suggestions.underutilized?.length > 0 && (
              <div className="soft-cyan-gradient rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-5 h-5 text-cyan-600" />
                  <h4 className="font-bold text-cyan-700">Underutilized Resources</h4>
                </div>
                <div className="flex flex-wrap gap-2">
                  {suggestions.underutilized.map((name, idx) => (
                    <Badge key={idx} className="soft-cyan-bg">{name}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {suggestions.recommendations?.length > 0 && (
              <div className="soft-green-gradient rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <h4 className="font-bold text-green-700">Optimization Recommendations</h4>
                </div>
                <div className="space-y-3">
                  {suggestions.recommendations.map((rec, idx) => (
                    <div key={idx} className="text-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={
                          rec.priority === 'high' ? 'soft-red-bg' : 
                          rec.priority === 'medium' ? 'soft-amber-bg' : 'soft-blue-bg'
                        }>
                          {rec.priority}
                        </Badge>
                        <span className="font-bold text-green-800">{rec.action}</span>
                      </div>
                      <div className="text-green-700">{rec.impact}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}