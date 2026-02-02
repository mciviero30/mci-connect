import React, { useState } from 'react';
import { AlertTriangle, ChevronDown, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import PlanConfirmationDialog from './PlanConfirmationDialog';

export default function PendingPlansAlert({ plans }) {
  const [expandedPending, setExpandedPending] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const pendingPlans = plans.filter(p => p.needs_confirmation);

  if (!pendingPlans.length) return null;

  return (
    <>
      <div className="mb-4">
        <button
          onClick={() => setExpandedPending(!expandedPending)}
          className="w-full flex items-center gap-3 bg-gradient-to-r from-amber-500/20 to-amber-600/10 border border-amber-500/30 rounded-lg p-4 hover:border-amber-500/50 transition-all"
        >
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
          <div className="flex-1 text-left">
            <p className="font-bold text-amber-300">
              {pendingPlans.length} plano{pendingPlans.length > 1 ? 's' : ''} requiere{pendingPlans.length > 1 ? 'n' : ''} confirmación
            </p>
            <p className="text-xs text-amber-300/70">OCR no pudo detectar los nombres automáticamente</p>
          </div>
          <ChevronDown
            className={`w-5 h-5 text-amber-400 transition-transform flex-shrink-0 ${
              expandedPending ? 'rotate-180' : ''
            }`}
          />
        </button>

        {/* Expanded List */}
        {expandedPending && (
          <div className="mt-2 space-y-2 bg-slate-900/40 border border-slate-700 rounded-lg p-3">
            {pendingPlans.map(plan => (
              <button
                key={plan.id}
                onClick={() => setSelectedPlan(plan)}
                className="w-full flex items-center justify-between p-3 bg-slate-800 border border-slate-700 rounded-lg hover:border-amber-500/50 hover:bg-slate-700/50 transition-all text-left group"
              >
                <div>
                  <p className="text-sm font-mono text-slate-300 group-hover:text-amber-300">
                    {plan.name || '(sin nombre)'}
                  </p>
                  {plan.folder && (
                    <p className="text-xs text-slate-500">{plan.folder}</p>
                  )}
                </div>
                <Badge className="bg-amber-500/30 text-amber-300 border-amber-500/50">
                  Editar
                </Badge>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      {selectedPlan && (
        <PlanConfirmationDialog
          plan={selectedPlan}
          open={!!selectedPlan}
          onOpenChange={(open) => !open && setSelectedPlan(null)}
        />
      )}
    </>
  );
}