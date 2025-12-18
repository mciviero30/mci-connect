import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { X, Send, Loader2, CheckSquare } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';

export default function InvitationModal({ open, onOpenChange, selectedCustomers = [] }) {
  const [selectedProjects, setSelectedProjects] = useState([]);
  const [allowTaskComments, setAllowTaskComments] = useState(true);
  const queryClient = useQueryClient();

  const { data: jobs = [], isLoading: loadingJobs } = useQuery({
    queryKey: ['active-jobs'],
    queryFn: () => base44.entities.Job.filter({ status: 'active' }),
    enabled: open,
  });

  const inviteMutation = useMutation({
    mutationFn: async ({ customer, projectIds, allowComments }) => {
      // Create job assignments for each project
      const assignments = [];
      for (const projectId of projectIds) {
        const job = jobs.find(j => j.id === projectId);
        const assignment = await base44.entities.JobAssignment.create({
          employee_email: customer.email,
          employee_name: customer.name,
          job_id: projectId,
          job_name: job?.name || 'Project',
          date: new Date().toISOString().split('T')[0],
          event_type: 'job_milestone',
          event_title: 'Project Access Granted',
          allow_task_comments: allowComments,
        });
        assignments.push(assignment);
      }

      // Send invitation email via SendGrid
      try {
        await base44.integrations.Core.SendEmail({
          to: customer.email,
          subject: 'Invitation to MCI Field - Project Access',
          body: `
            <h2>Welcome to MCI Field</h2>
            <p>Hello ${customer.name},</p>
            <p>You have been invited to access the following projects on MCI Field:</p>
            <ul>
              ${projectIds.map(id => {
                const job = jobs.find(j => j.id === id);
                return `<li>${job?.name || 'Project'}</li>`;
              }).join('')}
            </ul>
            <p>You can now access these projects by logging into MCI Field.</p>
            <p><a href="${window.location.origin}/page/Field" style="background: #FFB800; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">Access MCI Field</a></p>
            <p>If you don't have an account yet, you'll be prompted to create one.</p>
          `,
        });
      } catch (error) {
        console.error('Email send failed:', error);
      }

      return assignments;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-assignments'] });
      toast.success('Invitations sent successfully!');
    },
    onError: (error) => {
      toast.error(`Failed to send invitations: ${error.message}`);
    },
  });

  const handleInvite = async () => {
    if (selectedProjects.length === 0) {
      toast.error('Please select at least one project');
      return;
    }

    if (selectedCustomers.length === 0) {
      toast.error('No customers selected');
      return;
    }

    try {
      for (const customer of selectedCustomers) {
        await inviteMutation.mutateAsync({
          customer,
          projectIds: selectedProjects,
          allowComments: allowTaskComments,
        });
      }
      setSelectedProjects([]);
      setAllowTaskComments(true);
      onOpenChange(false);
    } catch (error) {
      console.error('Bulk invite failed:', error);
    }
  };

  const toggleProject = (projectId) => {
    setSelectedProjects(prev =>
      prev.includes(projectId)
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-slate-900 dark:text-white">
            Invite Customers to MCI Field
          </DialogTitle>
          <DialogDescription className="text-slate-600 dark:text-slate-400">
            Grant project access to {selectedCustomers.length} selected customer{selectedCustomers.length !== 1 ? 's' : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Selected Customers */}
          <div>
            <Label className="text-slate-700 dark:text-slate-300 font-semibold mb-2 block">
              Selected Customers ({selectedCustomers.length})
            </Label>
            <div className="flex flex-wrap gap-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 max-h-32 overflow-y-auto">
              {selectedCustomers.map(customer => (
                <Badge key={customer.email} className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">
                  {customer.name}
                </Badge>
              ))}
            </div>
          </div>

          {/* Project Selection */}
          <div>
            <Label className="text-slate-700 dark:text-slate-300 font-semibold mb-2 block">
              Select Projects to Grant Access
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start h-auto min-h-10 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                  <CheckSquare className="w-4 h-4 mr-2" />
                  {selectedProjects.length === 0 ? (
                    <span className="text-slate-500">Select projects...</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {selectedProjects.map(projectId => {
                        const job = jobs.find(j => j.id === projectId);
                        return (
                          <Badge key={projectId} variant="secondary" className="bg-[#FFB800]/20 text-[#FFB800]">
                            {job?.name || 'Project'}
                            <X
                              className="ml-1 h-3 w-3 cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleProject(projectId);
                              }}
                            />
                          </Badge>
                        );
                      })}
                    </div>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700" align="start">
                <Command>
                  <CommandInput placeholder="Search projects..." className="text-slate-900 dark:text-white" />
                  <CommandEmpty className="text-slate-500 dark:text-slate-400 p-4 text-sm text-center">
                    No projects found.
                  </CommandEmpty>
                  <CommandGroup className="max-h-64 overflow-y-auto">
                    {loadingJobs ? (
                      <div className="p-4 text-sm text-center text-slate-500">Loading projects...</div>
                    ) : (
                      jobs.map(job => (
                        <CommandItem
                          key={job.id}
                          onSelect={() => toggleProject(job.id)}
                          className={`cursor-pointer ${
                            selectedProjects.includes(job.id)
                              ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                              : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          <Checkbox
                            checked={selectedProjects.includes(job.id)}
                            className="mr-2"
                          />
                          <span className="flex-1">{job.name}</span>
                          {job.address && (
                            <span className="text-xs text-slate-500 dark:text-slate-400 ml-2 truncate max-w-xs">
                              {job.address}
                            </span>
                          )}
                        </CommandItem>
                      ))
                    )}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Permissions */}
          <div className="flex items-start space-x-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
            <Checkbox
              id="allow-comments"
              checked={allowTaskComments}
              onCheckedChange={setAllowTaskComments}
              className="mt-1"
            />
            <div className="flex-1">
              <Label
                htmlFor="allow-comments"
                className="text-slate-900 dark:text-white font-medium cursor-pointer"
              >
                Allow Task Comments
              </Label>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Customers can add comments to tasks and participate in project discussions
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
          >
            Cancel
          </Button>
          <Button
            onClick={handleInvite}
            disabled={inviteMutation.isPending || selectedProjects.length === 0}
            className="bg-[#FFB800] hover:bg-[#E5A600] text-white"
          >
            {inviteMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending Invitations...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send Invitations ({selectedCustomers.length})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}