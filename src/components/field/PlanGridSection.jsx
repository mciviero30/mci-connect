import React from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Wand2, Trash2, MoreVertical } from 'lucide-react';

export default function PlanGridSection({ plans, tasks, setSelectedPlan, setAnalyzePlan, deletePlanMutation }) {
  // Group plans by section
  const grouped = plans.reduce((acc, plan) => {
    const key = plan.section || 'Unassigned';
    if (!acc[key]) acc[key] = [];
    acc[key].push(plan);
    return acc;
  }, {});

  const sections = Object.keys(grouped).sort((a, b) => {
    if (a === 'Unassigned') return 1;
    if (b === 'Unassigned') return -1;
    return a.localeCompare(b);
  });

  return sections.map(section => {
    // Inline task count calculation per plan
    const sectionPlans = grouped[section].map(plan => ({
      ...plan,
      taskCount: tasks.filter(t => t.blueprint_id === plan.id).length,
      clientPunchCount: tasks.filter(t => 
        t.blueprint_id === plan.id && 
        t.created_by_client && 
        t.punch_status === 'client_submitted'
      ).length
    }));
    
    return (
      <div key={section} className="mb-6">
        {/* Section headers */}
        {sections.length > 1 && (
          <div className="flex items-center gap-3 mb-4">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
              {section}
            </h3>
            <div className="flex-1 h-px bg-slate-700" />
          </div>
        )}

        {/* Plan grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {sectionPlans.map((plan) => {
            const isPdf = plan.file_url?.toLowerCase().includes('.pdf');
            return (
              <div 
                key={plan.id}
                className="bg-slate-800 border-2 border-slate-700 rounded-2xl overflow-hidden hover:border-orange-500 hover:shadow-2xl hover:shadow-orange-500/30 transition-all duration-200 group relative cursor-pointer active:scale-[0.98]"
              >
                {/* Action menu */}
                <div className="absolute top-3 left-3 z-20">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button 
                        onClick={(e) => e.stopPropagation()}
                        className="p-2.5 bg-black/60 backdrop-blur-md rounded-xl hover:bg-black/80 transition-all shadow-lg min-h-[44px] min-w-[44px] active:scale-95"
                        title="Options"
                      >
                        <MoreVertical className="w-5 h-5 text-white" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-slate-900 border-slate-700 shadow-2xl min-w-[200px]">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          setAnalyzePlan(plan);
                        }}
                        className="text-white hover:bg-orange-500/20 focus:bg-orange-500/20 cursor-pointer min-h-[48px] touch-manipulation"
                      >
                        <Wand2 className="w-5 h-5 mr-3 text-orange-400" />
                        Analyze & Create Tasks
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm('Delete this plan and all its tasks?')) {
                            deletePlanMutation.mutate(plan.id);
                          }
                        }}
                        className="text-red-400 hover:bg-red-500/20 focus:bg-red-500/20 cursor-pointer min-h-[48px] touch-manipulation"
                      >
                        <Trash2 className="w-5 h-5 mr-3" />
                        Delete Plan
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div 
                  onClick={() => setSelectedPlan(plan)}
                  className="cursor-pointer touch-manipulation"
                >
                  {/* Image container */}
                  <div className="aspect-video relative overflow-hidden bg-slate-950">
                    {isPdf ? (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-5xl mb-2">📄</div>
                          <p className="text-slate-600 dark:text-white text-sm">PDF</p>
                        </div>
                      </div>
                    ) : (
                      <img 
                        src={plan.file_url}
                        alt={plan.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = '';
                          e.target.parentElement.innerHTML = '<div class="w-full h-full flex items-center justify-center"><div class="text-center"><div class="text-4xl mb-2">🖼️</div><p class="text-slate-400 text-sm">Preview unavailable</p></div></div>';
                        }}
                      />
                    )}
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none" />
                    
                    {/* Task count */}
                    {plan.taskCount > 0 && (
                      <div className="absolute top-3 right-3">
                        <div className="bg-gradient-to-r from-orange-600 to-yellow-500 text-black text-sm font-bold px-4 py-2 rounded-full shadow-2xl">
                          {plan.taskCount}
                        </div>
                      </div>
                    )}
                    
                    {/* Status badges */}
                    <div className="absolute bottom-3 left-3 flex gap-2">
                      {plan.is_active && (
                        <div className="bg-green-500 text-white text-xs px-3 py-1.5 rounded-full font-bold shadow-lg">
                          ✓ Active
                        </div>
                      )}
                      {plan.is_locked && (
                        <div className="bg-red-500 text-white text-xs px-3 py-1.5 rounded-full font-bold shadow-lg">
                          🔒 Locked
                        </div>
                      )}
                      {!plan.is_active && (
                        <div className="bg-slate-700 text-slate-300 text-xs px-3 py-1.5 rounded-full font-bold">
                          V{plan.version_number || plan.version || 1}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Plan info footer */}
                  <div className="p-4 bg-slate-800/80">
                    <h3 className="font-bold text-white text-base group-hover:text-orange-400 transition-colors truncate">
                      {plan.name}
                    </h3>
                    {plan.folder && (
                      <p className="text-xs text-slate-500 mt-1 truncate">{plan.folder}</p>
                    )}
                    {plan.needs_confirmation && (
                      <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 bg-amber-500/20 border border-amber-500/50 rounded-lg text-[10px] text-amber-400 font-bold">
                        ⚠️ Needs Review
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  });
}