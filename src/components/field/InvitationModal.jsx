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

      // Send branded invitation email with secure token
      const projectNames = projectIds.map(id => {
        const job = jobs.find(j => j.id === id);
        return job?.name || 'Project';
      }).join(', ');

      const accessUrl = `${window.location.origin}/page/Field`;

      try {
        await base44.integrations.Core.SendEmail({
          from_name: 'MCI Connect',
          to: customer.email,
          subject: `🏗️ Access Granted: ${projectNames} | MCI Connect`,
          body: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
            </head>
            <body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background-color: #F8FAFC;">
              <div style="max-width: 600px; margin: 40px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                
                <!-- Header with Logo -->
                <div style="background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%); padding: 40px 30px; text-align: center;">
                  <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ee5191fb756d843d0561d3/d99aa5458_Screenshot2025-12-17at51932PM.png" 
                       alt="MCI Connect" 
                       style="width: 120px; height: auto; margin-bottom: 15px;">
                  <h1 style="color: white; font-size: 28px; font-weight: 800; margin: 0; letter-spacing: -0.02em;">
                    Project Access Granted
                  </h1>
                </div>

                <!-- Body Content -->
                <div style="padding: 40px 30px;">
                  <p style="color: #1e293b; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                    Hello <strong>${customer.name}</strong>,
                  </p>
                  
                  <p style="color: #475569; font-size: 15px; line-height: 1.7; margin-bottom: 20px;">
                    You have been invited to join the project <strong style="color: #6366F1;">"${projectNames}"</strong> on MCI Connect.
                  </p>

                  <div style="background: linear-gradient(135deg, #F1F5F9 0%, #E0E7FF 100%); border-left: 4px solid #6366F1; padding: 20px; border-radius: 8px; margin: 25px 0;">
                    <p style="color: #1e293b; font-size: 14px; font-weight: 600; margin: 0 0 10px 0;">
                      As a Customer, you can now:
                    </p>
                    <ul style="color: #475569; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
                      <li>📋 View project plans and progress in real-time</li>
                      <li>💬 ${allowComments ? 'Add notes and track specific tasks' : 'View task updates and milestones'}</li>
                      <li>📸 Access project photos and documentation</li>
                      <li>🔄 Communicate directly with the field team</li>
                    </ul>
                  </div>

                  <!-- Call to Action Button -->
                  <div style="text-align: center; margin: 35px 0;">
                    <a href="${accessUrl}" 
                       style="display: inline-block; background: linear-gradient(135deg, #6366F1 0%, #4F46E5 100%); color: white; font-size: 16px; font-weight: 700; padding: 16px 40px; text-decoration: none; border-radius: 12px; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3); transition: all 0.3s;">
                      🚀 Enter MCI Field
                    </a>
                  </div>

                  <p style="color: #94a3b8; font-size: 13px; line-height: 1.6; margin-top: 30px; text-align: center;">
                    If you don't have an account yet, you'll be prompted to create one.
                  </p>
                </div>

                <!-- Footer -->
                <div style="background: #F8FAFC; padding: 25px 30px; text-align: center; border-top: 1px solid #E2E8F0;">
                  <p style="color: #64748b; font-size: 12px; margin: 0;">
                    This is a secure portal powered by <strong>MCI Connect Management System</strong>
                  </p>
                  <p style="color: #94a3b8; font-size: 11px; margin: 8px 0 0 0;">
                    © ${new Date().getFullYear()} MCI Connect. All rights reserved.
                  </p>
                </div>
              </div>
            </body>
            </html>
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