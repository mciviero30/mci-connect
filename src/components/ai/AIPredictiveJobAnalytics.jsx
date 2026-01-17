import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, TrendingUp, AlertTriangle, DollarSign, Clock } from 'lucide-react';
import { toast } from 'sonner';

export default function AIPredictiveJobAnalytics({ job, timeEntries, expenses }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [predictions, setPredictions] = useState(null);

  const analyzePredictions = async () => {
    setAnalyzing(true);
    try {
      const totalHours = timeEntries.reduce((sum, e) => sum + (e.hours_worked || 0), 0);
      const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
      const budgetUsed = ((totalHours * 60) + totalExpenses) / (job.contract_amount || 1);

      const prompt = `Analyze this construction project and predict completion metrics:

PROJECT: ${job.name}
Contract Amount: $${job.contract_amount?.toLocaleString() || 0}
Estimated Hours: ${job.estimated_hours || 0}
Status: ${job.status}

CURRENT PROGRESS:
- Hours Worked: ${totalHours.toFixed(1)} / ${job.estimated_hours || 0} (${((totalHours / (job.estimated_hours || 1)) * 100).toFixed(1)}%)
- Labor Cost: $${(totalHours * 60).toFixed(2)}
- Material Expenses: $${totalExpenses.toFixed(2)}
- Budget Used: ${(budgetUsed * 100).toFixed(1)}%

TIME ENTRIES (last 10):
${timeEntries.slice(0, 10).map(e => `${e.date}: ${e.employee_name} - ${e.hours_worked}h`).join('\n')}

Predict and provide JSON:
1. completion_probability: number (0-100) - likelihood to complete on time/budget
2. predicted_total_cost: number - final project cost
3. predicted_overrun: number - expected cost overrun (if any)
4. predicted_completion_date: string - estimated completion
5. risk_factors: [{factor, severity, mitigation}] - identified risks
6. cost_breakdown_prediction: {labor, materials, overhead}
7. recommendations: [{action, impact, priority}]`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            completion_probability: { type: 'number' },
            predicted_total_cost: { type: 'number' },
            predicted_overrun: { type: 'number' },
            predicted_completion_date: { type: 'string' },
            risk_factors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  factor: { type: 'string' },
                  severity: { type: 'string' },
                  mitigation: { type: 'string' }
                }
              }
            },
            cost_breakdown_prediction: {
              type: 'object',
              properties: {
                labor: { type: 'number' },
                materials: { type: 'number' },
                overhead: { type: 'number' }
              }
            },
            recommendations: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  action: { type: 'string' },
                  impact: { type: 'string' },
                  priority: { type: 'string' }
                }
              }
            }
          }
        }
      });

      setPredictions(response);
      toast.success('Predictive analysis complete');
    } catch (error) {
      console.error('AI prediction error:', error);
      toast.error('Failed to generate predictions');
    } finally {
      setAnalyzing(false);
    }
  };

  const getCompletionColor = (probability) => {
    if (probability >= 80) return 'soft-green-gradient';
    if (probability >= 60) return 'soft-amber-gradient';
    return 'soft-red-gradient';
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-xl">
            <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">AI Predictive Analytics</h3>
            <p className="text-sm text-slate-500">Forecast project completion and costs</p>
          </div>
        </div>
        <Button
          onClick={analyzePredictions}
          disabled={analyzing}
          className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          {analyzing ? 'Analyzing...' : 'Run Analysis'}
        </Button>
      </div>

      {predictions && (
        <div className="space-y-4 mt-6">
          {/* Completion Probability */}
          <div className={`${getCompletionColor(predictions.completion_probability)} rounded-xl p-5`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold uppercase tracking-wide">Completion Probability</span>
              <span className="text-3xl font-bold">{predictions.completion_probability}%</span>
            </div>
            <div className="w-full bg-white/30 rounded-full h-3">
              <div 
                className="bg-white/60 h-3 rounded-full transition-all"
                style={{ width: `${predictions.completion_probability}%` }}
              />
            </div>
          </div>

          {/* Cost Predictions */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="soft-blue-gradient rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-5 h-5 text-blue-600" />
                <span className="text-xs font-bold text-blue-700 uppercase">Predicted Total Cost</span>
              </div>
              <p className="text-2xl font-bold text-blue-800">
                ${predictions.predicted_total_cost?.toLocaleString()}
              </p>
              {predictions.predicted_overrun > 0 && (
                <p className="text-xs text-red-600 mt-1">
                  +${predictions.predicted_overrun.toLocaleString()} overrun
                </p>
              )}
            </div>

            <div className="soft-purple-gradient rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-purple-600" />
                <span className="text-xs font-bold text-purple-700 uppercase">Predicted Completion</span>
              </div>
              <p className="text-lg font-bold text-purple-800">
                {predictions.predicted_completion_date ? format(new Date(predictions.predicted_completion_date), 'MMM dd, yyyy') : 'TBD'}
              </p>
            </div>
          </div>

          {/* Risk Factors */}
          {predictions.risk_factors?.length > 0 && (
            <div className="soft-red-gradient rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <h4 className="font-bold text-red-700">Risk Factors</h4>
              </div>
              <div className="space-y-3">
                {predictions.risk_factors.map((risk, idx) => (
                  <div key={idx} className="text-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={
                        risk.severity === 'high' ? 'soft-red-bg' : 
                        risk.severity === 'medium' ? 'soft-amber-bg' : 'soft-blue-bg'
                      }>
                        {risk.severity}
                      </Badge>
                      <span className="font-bold text-red-800">{risk.factor}</span>
                    </div>
                    <p className="text-red-700 ml-2">→ {risk.mitigation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {predictions.recommendations?.length > 0 && (
            <div className="soft-green-gradient rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <h4 className="font-bold text-green-700">AI Recommendations</h4>
              </div>
              <div className="space-y-3">
                {predictions.recommendations.map((rec, idx) => (
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
                    <p className="text-green-700 ml-2">{rec.impact}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}