import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Brain, Users, Clock, Target, TrendingUp, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

export default function SmartTaskAssignment({ task, jobId, onAssign }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [suggestions, setSuggestions] = useState([]);

  const { data: members = [] } = useQuery({
    queryKey: ['field-members', jobId],
    queryFn: () => base44.entities.ProjectMember.filter({ project_id: jobId }),
  });

  const { data: allTasks = [] } = useQuery({
    queryKey: ['field-tasks', jobId],
    queryFn: () => base44.entities.Task.filter({ job_id: jobId }),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: employeeSkills = [] } = useQuery({
    queryKey: ['employee-skills'],
    queryFn: () => base44.entities.EmployeeSkill.list(),
  });

  const analyzeBestMatch = async () => {
    setAnalyzing(true);
    try {
      // Calculate workload for each member
      const workloadByMember = {};
      members.forEach(member => {
        const memberTasks = allTasks.filter(t => 
          t.assigned_to === member.user_email && 
          t.status !== 'completed'
        );
        workloadByMember[member.user_email] = memberTasks.length;
      });

      // Get skills for task category
      const categorySkills = employeeSkills.filter(s => 
        s.skill_category === task.category || 
        s.skill_name?.toLowerCase().includes(task.category?.toLowerCase())
      );

      // Build prompt for AI analysis
      const prompt = `Analyze and recommend the best team member to assign this task:

TASK:
- Title: ${task.title}
- Category: ${task.category}
- Priority: ${task.priority}
- Description: ${task.description}

AVAILABLE TEAM MEMBERS:
${members.map(m => {
  const emp = employees.find(e => e.email === m.user_email);
  const memberSkills = categorySkills.filter(s => s.employee_email === m.user_email);
  const workload = workloadByMember[m.user_email] || 0;
  
  return `- ${m.user_name || m.user_email}
  Role: ${m.role}
  Position: ${emp?.position || 'N/A'}
  Current Workload: ${workload} active tasks
  Skills: ${memberSkills.map(s => `${s.skill_name} (Level ${s.skill_level}/5)`).join(', ') || 'None specified'}`;
}).join('\n\n')}

Recommend the TOP 3 best candidates and explain why. Consider:
1. Skill match for ${task.category}
2. Current workload balance
3. Task priority and complexity
4. Team member availability

Return JSON array with this exact structure:
[
  {
    "email": "member@email.com",
    "name": "Member Name",
    "match_score": 95,
    "reason": "Expert in category, low workload",
    "pros": ["Relevant experience", "Available capacity"],
    "cons": ["None"]
  }
]`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            recommendations: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  email: { type: 'string' },
                  name: { type: 'string' },
                  match_score: { type: 'number' },
                  reason: { type: 'string' },
                  pros: { type: 'array', items: { type: 'string' } },
                  cons: { type: 'array', items: { type: 'string' } }
                }
              }
            }
          }
        }
      });

      setSuggestions(result.recommendations || []);
    } catch (error) {
      console.error('Error analyzing assignment:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <Brain className="w-5 h-5 text-[#FFB800]" />
          AI Assignment Suggestions
        </h4>
        <Button
          onClick={analyzeBestMatch}
          disabled={analyzing || members.length === 0}
          size="sm"
          className="bg-[#FFB800] hover:bg-[#E5A600] text-white"
        >
          {analyzing ? (
            <>
              <Zap className="w-4 h-4 mr-2 animate-pulse" />
              Analyzing...
            </>
          ) : (
            <>
              <Brain className="w-4 h-4 mr-2" />
              Analyze
            </>
          )}
        </Button>
      </div>

      {suggestions.length > 0 && (
        <div className="space-y-2">
          {suggestions.map((suggestion, idx) => (
            <Card 
              key={suggestion.email}
              className="p-4 bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50 hover:border-[#FFB800]/50 transition-all cursor-pointer"
              onClick={() => onAssign(suggestion.email)}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                    idx === 0 ? 'bg-gradient-to-br from-[#FFB800] to-orange-500' :
                    idx === 1 ? 'bg-gradient-to-br from-blue-500 to-blue-600' :
                    'bg-gradient-to-br from-slate-500 to-slate-600'
                  }`}>
                    {suggestion.name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">{suggestion.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{suggestion.email}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge className={`${
                    suggestion.match_score >= 90 ? 'bg-green-500/20 text-green-400' :
                    suggestion.match_score >= 70 ? 'bg-[#FFB800]/20 text-[#FFB800]' :
                    'bg-blue-500/20 text-blue-400'
                  }`}>
                    {suggestion.match_score}% Match
                  </Badge>
                  {idx === 0 && (
                    <Badge className="bg-[#FFB800] text-white text-xs">
                      Best Match
                    </Badge>
                  )}
                </div>
              </div>

              <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">{suggestion.reason}</p>

              <div className="grid grid-cols-2 gap-2 text-xs">
                {suggestion.pros && suggestion.pros.length > 0 && (
                  <div className="bg-green-50 dark:bg-green-900/20 rounded p-2">
                    <p className="font-semibold text-green-700 dark:text-green-400 mb-1">Pros:</p>
                    <ul className="text-green-600 dark:text-green-500 space-y-0.5">
                      {suggestion.pros.map((pro, i) => (
                        <li key={i}>• {pro}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {suggestion.cons && suggestion.cons.length > 0 && suggestion.cons[0] !== 'None' && (
                  <div className="bg-amber-50 dark:bg-amber-900/20 rounded p-2">
                    <p className="font-semibold text-amber-700 dark:text-amber-400 mb-1">Cons:</p>
                    <ul className="text-amber-600 dark:text-amber-500 space-y-0.5">
                      {suggestion.cons.map((con, i) => (
                        <li key={i}>• {con}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <Progress value={suggestion.match_score} className="mt-3 h-2" />
            </Card>
          ))}
        </div>
      )}

      {suggestions.length === 0 && !analyzing && (
        <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-sm">
          Click "Analyze" to get AI-powered assignment recommendations
        </div>
      )}
    </div>
  );
}