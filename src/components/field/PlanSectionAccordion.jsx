import React, { useState } from 'react';
import { ChevronDown, Edit2, X } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Wand2, Trash2, MoreVertical } from 'lucide-react';
import EditPlanDialog from './EditPlanDialog';
import { Input } from '@/components/ui/input';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export default function PlanSectionAccordion({ plans, tasks, setSelectedPlan, setAnalyzePlan, deletePlanMutation, jobId, selectedForDelete = new Set(), setSelectedForDelete = () => {} }) {
  const [editingPlan, setEditingPlan] = useState(null);
  const [editingSection, setEditingSection] = useState(null);
  const [editingSectionValue, setEditingSectionValue] = useState('');

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

  const queryClient = useQueryClient();

  const updateSectionMutation = useMutation({
    mutationFn: async (data) => {
      const { oldSection, newSection } = data;
      const sectionPlans = grouped[oldSection];
      
      // Batch update all plans in this section
      for (const plan of Object.values(sectionPlans).flat()) {
        await base44.entities.Plan.update(plan.id, {
          section: newSection || null,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['field-job-final-plans', jobId] });
      setEditingSection(null);
    },
  });

  const handleSectionRename = (oldSection, newSection) => {
    if (!newSection.trim()) return;
    updateSectionMutation.mutate({ oldSection, newSection: newSection.trim() });
  };

  return (
    <Accordion type="single" collapsible defaultValue={sections[0]} className="space-y-3">
      {sections.map((section) => (
        <AccordionItem 
          key={section} 
          value={section}
          className="bg-slate-800/50 border border-slate-700 rounded-xl px-4 data-[state=open]:bg-slate-800 transition-colors"
        >
          <AccordionTrigger className="text-white font-bold text-lg hover:no-underline hover:text-orange-400 py-4 flex justify-between items-center">
            <span className="flex items-center gap-3">
              {editingSection === section ? (
                <div 
                  className="flex items-center gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Input
                    autoFocus
                    value={editingSectionValue}
                    onChange={(e) => setEditingSectionValue(e.target.value)}
                    onBlur={() => handleSectionRename(section, editingSectionValue)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSectionRename(section, editingSectionValue);
                      if (e.key === 'Escape') setEditingSection(null);
                    }}
                    className="h-8 bg-black/40 border-orange-500/30 text-white text-sm w-40"
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingSection(null);
                    }}
                    className="p-1 hover:bg-red-500/20 rounded"
                  >
                    <X className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              ) : (
                <>
                  {section}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingSection(section);
                      setEditingSectionValue(section);
                    }}
                    className="p-1 opacity-0 group-hover:opacity-100 hover:bg-orange-500/20 rounded transition-all"
                    title="Edit section name"
                  >
                    <Edit2 className="w-4 h-4 text-orange-400" />
                  </button>
                </>
              )}
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
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                      {folderPlans.map((plan) => {
                        const isPdf = plan.file_url?.toLowerCase().includes('.pdf');
                        const taskCount = tasks.filter(t => t.blueprint_id === plan.id).length;

                        const isSelected = selectedForDelete.has(plan.id);
                        return (
                           <div
                             key={plan.id}
                             className={`bg-slate-800 border rounded-lg overflow-hidden transition-all group cursor-pointer active:scale-95 relative text-xs ${
                               isSelected 
                                 ? 'border-red-500 shadow-lg shadow-red-500/30' 
                                 : 'border-slate-700 hover:border-orange-500 hover:shadow-lg hover:shadow-orange-500/30'
                             }`}
                           >
                             {/* Checkbox overlay */}
                             <div className="absolute top-0.5 left-0.5 z-30">
                               <input
                                 type="checkbox"
                                 checked={isSelected}
                                 onChange={(e) => {
                                   e.stopPropagation();
                                   const newSet = new Set(selectedForDelete);
                                   if (isSelected) {
                                     newSet.delete(plan.id);
                                   } else {
                                     newSet.add(plan.id);
                                   }
                                   setSelectedForDelete(newSet);
                                 }}
                                 className="w-2 h-2 cursor-pointer accent-orange-500 scale-50 origin-top-left"
                                 onClick={(e) => e.stopPropagation()}
                               />
                             </div>

                             {/* Action menu */}
                             <div className="absolute top-1 right-1 z-30">
                               <DropdownMenu>
                                 <DropdownMenuTrigger asChild>
                                   <button
                                     onClick={(e) => e.stopPropagation()}
                                     className="p-1 bg-black/70 backdrop-blur-md rounded hover:bg-black/90 transition-all shadow-md min-h-[32px] min-w-[32px] active:scale-95"
                                     title="Opciones"
                                   >
                                     <MoreVertical className="w-3 h-3 text-white" />
                                   </button>
                                 </DropdownMenuTrigger>
                                 <DropdownMenuContent className="bg-slate-900 border-slate-700 text-xs">
                                   <DropdownMenuItem
                                     onClick={(e) => {
                                       e.stopPropagation();
                                       setEditingPlan(plan);
                                     }}
                                     className="text-white hover:bg-blue-500/20 cursor-pointer text-xs"
                                   >
                                     <Edit2 className="w-3 h-3 mr-1 text-blue-400" />
                                     Edit
                                   </DropdownMenuItem>
                                   <DropdownMenuItem
                                     onClick={(e) => {
                                       e.stopPropagation();
                                       setAnalyzePlan(plan);
                                     }}
                                     className="text-white hover:bg-orange-500/20 cursor-pointer text-xs"
                                   >
                                     <Wand2 className="w-3 h-3 mr-1 text-orange-400" />
                                     Analyze
                                   </DropdownMenuItem>
                                   <DropdownMenuItem
                                     onClick={(e) => {
                                       e.stopPropagation();
                                       if (window.confirm('Delete this plan?')) {
                                         deletePlanMutation.mutate(plan.id);
                                       }
                                     }}
                                     className="text-red-400 hover:bg-red-500/20 cursor-pointer text-xs"
                                   >
                                     <Trash2 className="w-3 h-3 mr-1" />
                                     Delete
                                   </DropdownMenuItem>
                                 </DropdownMenuContent>
                               </DropdownMenu>
                             </div>

                             <div onClick={() => setSelectedPlan(plan)}>
                               {/* Image */}
                               <div className="aspect-square bg-slate-950 flex items-center justify-center relative overflow-hidden">
                                 {isPdf ? (
                                   <div className="text-center">
                                     <div className="text-2xl mb-1">📄</div>
                                     <p className="text-slate-400 text-[10px]">PDF</p>
                                   </div>
                                 ) : (
                                   <img
                                     src={plan.file_url}
                                     alt={plan.name}
                                     className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                     onError={(e) => {
                                       e.target.src = '';
                                       e.target.parentElement.innerHTML = '<div class="text-center"><div class="text-lg mb-0.5">🖼️</div><p class="text-[10px] text-slate-400">No preview</p></div>';
                                     }}
                                   />
                                 )}

                                 {/* Overlay + Task count */}
                                 <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
                                 {taskCount > 0 && (
                                   <div className="absolute top-1 right-1 bg-orange-500 text-black text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-lg">
                                     {taskCount}
                                   </div>
                                 )}
                               </div>

                               {/* Info */}
                               <div className="p-1.5 bg-slate-800/80">
                                 <h3 className="font-bold text-white text-xs group-hover:text-orange-400 transition-colors truncate leading-tight">
                                   {plan.name}
                                 </h3>
                                 {plan.is_locked && (
                                   <p className="text-[9px] text-red-400 mt-0.5">🔒 Locked</p>
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