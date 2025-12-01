import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Users, X, Check, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/toast";

export default function JobChatMembers({ 
  jobId, 
  jobName,
  isOpen, 
  onClose,
  language = 'en'
}) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);

  // Fetch all active employees
  const { data: employees = [] } = useQuery({
    queryKey: ['employees-active'],
    queryFn: () => base44.entities.User.filter({ employment_status: 'active' }),
    staleTime: 300000,
  });

  // Fetch current job chat members
  const { data: jobChatMembers = [], isLoading } = useQuery({
    queryKey: ['jobChatMembers', jobId],
    queryFn: async () => {
      try {
        const groups = await base44.entities.ChatGroup.filter({ 
          job_id: jobId,
          group_type: 'job_channel'
        });
        return groups.length > 0 ? groups[0].members || [] : [];
      } catch (error) {
        // If no ChatGroup exists for this job, return empty array
        return [];
      }
    },
    enabled: !!jobId && isOpen,
  });

  // Initialize selected members when dialog opens
  React.useEffect(() => {
    if (isOpen && jobChatMembers.length > 0) {
      setSelectedMembers(jobChatMembers);
    }
  }, [isOpen, jobChatMembers]);

  // Save members mutation
  const saveMembersMutation = useMutation({
    mutationFn: async (members) => {
      // Check if a ChatGroup already exists for this job
      const existingGroups = await base44.entities.ChatGroup.filter({ 
        job_id: jobId,
        group_type: 'job_channel'
      });

      if (existingGroups.length > 0) {
        // Update existing group
        await base44.entities.ChatGroup.update(existingGroups[0].id, {
          members: members
        });
      } else {
        // Create new group for job chat
        await base44.entities.ChatGroup.create({
          job_id: jobId,
          group_name: jobName,
          members: members,
          is_active: true,
          group_type: 'job_channel'
        });
      }
      return members;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobChatMembers', jobId] });
      toast.success(language === 'es' ? 'Miembros actualizados' : 'Members updated');
      onClose();
    },
    onError: (error) => {
      toast.error(language === 'es' ? 'Error al guardar' : 'Error saving members');
      console.error('Error saving job chat members:', error);
    }
  });

  const toggleMember = (email) => {
    setSelectedMembers(prev => 
      prev.includes(email) 
        ? prev.filter(e => e !== email)
        : [...prev, email]
    );
  };

  const selectAll = () => {
    setSelectedMembers(employees.map(e => e.email));
  };

  const clearAll = () => {
    setSelectedMembers([]);
  };

  const handleSave = () => {
    saveMembersMutation.mutate(selectedMembers);
  };

  const filteredEmployees = employees.filter(emp => 
    emp.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.position?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700 max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
            <UserPlus className="w-5 h-5 text-blue-500" />
            {language === 'es' ? 'Invitar al Chat' : 'Invite to Chat'}
          </DialogTitle>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {jobName}
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder={language === 'es' ? 'Buscar empleados...' : 'Search employees...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-600"
            />
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={selectAll}
              className="text-xs"
            >
              <Check className="w-3 h-3 mr-1" />
              {language === 'es' ? 'Todos' : 'Select All'}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={clearAll}
              className="text-xs"
            >
              <X className="w-3 h-3 mr-1" />
              {language === 'es' ? 'Ninguno' : 'Clear'}
            </Button>
            <Badge className="ml-auto bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
              {selectedMembers.length} {language === 'es' ? 'seleccionados' : 'selected'}
            </Badge>
          </div>

          {/* Employee List */}
          <ScrollArea className="h-[300px] border rounded-lg border-slate-200 dark:border-slate-700">
            <div className="p-2 space-y-1">
              {isLoading ? (
                <div className="text-center py-8 text-slate-500">
                  {language === 'es' ? 'Cargando...' : 'Loading...'}
                </div>
              ) : filteredEmployees.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  {language === 'es' ? 'No se encontraron empleados' : 'No employees found'}
                </div>
              ) : (
                filteredEmployees.map(emp => {
                  const isSelected = selectedMembers.includes(emp.email);
                  return (
                    <div
                      key={emp.email}
                      onClick={() => toggleMember(emp.email)}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                        isSelected 
                          ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800' 
                          : 'hover:bg-slate-100 dark:hover:bg-slate-700 border border-transparent'
                      }`}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleMember(emp.email)}
                        className="data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                      />
                      <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-bold text-sm">
                          {emp.full_name?.[0]?.toUpperCase() || '?'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-slate-900 dark:text-white truncate">
                          {emp.full_name || emp.email}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {emp.position || emp.email}
                        </p>
                      </div>
                      {isSelected && (
                        <Check className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            {language === 'es' ? 'Cancelar' : 'Cancel'}
          </Button>
          <Button 
            onClick={handleSave}
            disabled={saveMembersMutation.isPending}
            className="bg-blue-500 hover:bg-blue-600 text-white"
          >
            {saveMembersMutation.isPending 
              ? (language === 'es' ? 'Guardando...' : 'Saving...') 
              : (language === 'es' ? 'Guardar' : 'Save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}