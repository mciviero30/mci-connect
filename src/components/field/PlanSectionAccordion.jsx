import React, { useState } from 'react';
import { ChevronDown, Edit2 } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Wand2, Trash2, MoreVertical } from 'lucide-react';
import EditPlanDialog from './EditPlanDialog';

export default function PlanSectionAccordion({ plans, tasks, setSelectedPlan, setAnalyzePlan, deletePlanMutation, jobId }) {
  const [editingPlan, setEditingPlan] = useState(null);

  // Group plans by section > folder
  const grouped = plans.reduce((acc, plan) => {
    const section = plan.section || 'Unassigned';
    const folder = plan.folder || 'General';
    
    if (!acc[section]) acc[section] = {};
    if (!acc[section][folder]) acc[section][folder] = [];
    acc[section][folder].push(plan);
    return acc;
  }, {});

  const sections = Object.keys(grouped).sort((a, b) => {
    if (a === 'Unassigned') return 1;
    if (b === 'Unassigned') return -1;
    return a.localeCompare(b);
  });

  return (
    <Accordion type="single" collapsible defaultValue={sections[0]} className="space-y-3">
      {sections.map((section) => (
        <AccordionItem 
          key={section} 
          value={section}
          className="bg-slate-800/50 border border-slate-700 rounded-xl px-4 data-[state=open]:bg-slate-800 transition-colors"
        >
          <AccordionTrigger className="text-white font-bold text-lg hover:no-underline hover:text-orange-400 py-4">
            <span className="flex items-center gap-3">
              {section}
              <span className="text-xs font-normal text-slate-400 bg-slate-900 px-2 py-1 rounded-full">
                {Object.values(grouped[section]).flat().length} planes
              </span>
            </span>
          </AccordionTrigger>
          
          <AccordionContent className="pt-0 pb-4">
            <div className="space-y-4">
              {Object.keys(grouped[section]).sort().map((folder) => {
                const folderPlans = grouped[section][folder];
                return (
                  <div key={folder} className="ml-2">
                    {/* Folder label - only if not "General" or multiple folders */}
                    {Object.keys(grouped[section]).length > 1 && folder !== 'General' && (
                      <div className="flex items-center gap-2 mb-3 px-2">
                        <div className="text-sm font-semibold text-slate-300">📁 {folder}</div>
                        <div className="flex-1 h-px bg-slate-700" />
                      </div>
                    )}

                    {/* Plans grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {folderPlans.map((plan) => {
                        const isPdf = plan.file_url?.toLowerCase().includes('.pdf');
                        const taskCount = tasks.filter(t => t.blueprint_id === plan.id).length;

                        return (
                          <div
                            key={plan.id}
                            className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden hover:border-orange-500 hover:shadow-xl hover:shadow-orange-500/30 transition-all group cursor-pointer active:scale-95"
                          >
                            {/* Action menu */}
                            <div className="absolute top-2 right-2 z-30">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button
                                    onClick={(e) => e.stopPropagation()}
                                    className="p-2.5 bg-black/70 backdrop-blur-md rounded-lg hover:bg-black/90 transition-all shadow-lg min-h-[44px] min-w-[44px] active:scale-95"
                                    title="Opciones"
                                  >
                                    <MoreVertical className="w-4 h-4 text-white" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="bg-slate-900 border-slate-700">
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingPlan(plan);
                                    }}
                                    className="text-white hover:bg-blue-500/20 cursor-pointer"
                                  >
                                    <Edit2 className="w-4 h-4 mr-2 text-blue-400" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setAnalyzePlan(plan);
                                    }}
                                    className="text-white hover:bg-orange-500/20 cursor-pointer"
                                  >
                                    <Wand2 className="w-4 h-4 mr-2 text-orange-400" />
                                    Analyze
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (window.confirm('Delete this plan?')) {
                                        deletePlanMutation.mutate(plan.id);
                                      }
                                    }}
                                    className="text-red-400 hover:bg-red-500/20 cursor-pointer"
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>

                            <div onClick={() => setSelectedPlan(plan)}>
                              {/* Image */}
                              <div className="aspect-video bg-slate-950 flex items-center justify-center relative overflow-hidden">
                                {isPdf ? (
                                  <div className="text-center">
                                    <div className="text-4xl mb-2">📄</div>
                                    <p className="text-slate-400 text-xs">PDF</p>
                                  </div>
                                ) : (
                                  <img
                                    src={plan.file_url}
                                    alt={plan.name}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                    onError={(e) => {
                                      e.target.src = '';
                                      e.target.parentElement.innerHTML = '<div class="text-center"><div class="text-2xl mb-1">🖼️</div><p class="text-xs text-slate-400">No preview</p></div>';
                                    }}
                                  />
                                )}
                                
                                {/* Overlay + Task count */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
                                {taskCount > 0 && (
                                  <div className="absolute top-2 right-2 bg-orange-500 text-black text-xs font-bold px-2.5 py-1 rounded-full shadow-lg">
                                    {taskCount} tasks
                                  </div>
                                )}
                              </div>

                              {/* Info */}
                              <div className="p-3 bg-slate-800/80">
                                <h3 className="font-bold text-white text-sm group-hover:text-orange-400 transition-colors truncate">
                                  {plan.name}
                                </h3>
                                {plan.is_locked && (
                                  <p className="text-xs text-red-400 mt-1">🔒 Locked</p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}

      {/* Edit Dialog */}
      {editingPlan && (
        <EditPlanDialog
          open={!!editingPlan}
          onOpenChange={(open) => !open && setEditingPlan(null)}
          plan={editingPlan}
          jobId={jobId}
        />
      )}
    </Accordion>
  );
}