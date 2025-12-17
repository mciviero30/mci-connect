import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Plus, Edit, Trash2, Building2, Users, Briefcase, MoreVertical, AlertTriangle } from "lucide-react";
import PageHeader from "../components/shared/PageHeader";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import ModernTeamCard from "@/components/teams/ModernTeamCard";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Teams() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [showCapacityDialog, setShowCapacityDialog] = useState(false);
  const [selectedTeamForCapacity, setSelectedTeamForCapacity] = useState(null);
  const [newCapacity, setNewCapacity] = useState(10);

  const { data: teams, isLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list('team_name'),
    initialData: [],
  });

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.User.list(),
    initialData: [],
  });

  const { data: jobs } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => base44.entities.Job.list(),
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Team.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      setShowDialog(false);
      setEditingTeam(null);
      toast.success("Team created successfully");
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Team.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      setShowDialog(false);
      setEditingTeam(null);
      setShowCapacityDialog(false);
      toast.success("Team updated successfully");
    }
  });

  // ============================================
  // ROBUST DELETE WITH VALIDATION
  // ============================================
  const deleteMutation = useMutation({
    mutationFn: async (team) => {
      // VALIDATION: Check for associated employees
      const associatedEmployees = employees.filter(e => 
        (e.team_id === team.id || e.team_name === team.team_name) &&
        e.employment_status !== 'deleted' &&
        e.employment_status !== 'archived'
      );

      // VALIDATION: Check for associated jobs
      const associatedJobs = jobs.filter(j =>
        (j.team_id === team.id || j.team_name === team.team_name) &&
        j.status !== 'archived'
      );

      // Throw validation error if dependencies exist
      if (associatedEmployees.length > 0 || associatedJobs.length > 0) {
        throw new Error(
          `Cannot delete: ${associatedEmployees.length} employee(s) and ${associatedJobs.length} job(s) associated with this team. Please reassign them first.`
        );
      }

      // If validation passes, proceed with deletion
      return base44.entities.Team.delete(team.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      toast.success("Team deleted successfully");
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  // Quick capacity update mutation
  const updateCapacityMutation = useMutation({
    mutationFn: ({ teamId, capacity }) => {
      return base44.entities.Team.update(teamId, {
        maximum_headcount: capacity
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      setShowCapacityDialog(false);
      toast.success("Team capacity updated");
    }
  });

  const [formData, setFormData] = useState({
    team_name: '',
    location: '',
    state: '',
    is_headquarters: false,
    maximum_headcount: 10,
    status: 'active',
    description: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingTeam) {
      updateMutation.mutate({ id: editingTeam.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (team) => {
    setEditingTeam(team);
    setFormData({
      ...team,
      maximum_headcount: team.maximum_headcount || 10
    });
    setShowDialog(true);
  };

  const handleDelete = (team) => {
    if (window.confirm(`Are you sure you want to delete ${team.team_name}?`)) {
      deleteMutation.mutate(team);
    }
  };

  const handleOpenDialog = () => {
    setEditingTeam(null);
    setFormData({
      team_name: '',
      location: '',
      state: '',
      is_headquarters: false,
      maximum_headcount: 10,
      status: 'active',
      description: ''
    });
    setShowDialog(true);
  };

  const handleQuickCapacityEdit = (team, currentEmployees) => {
    setSelectedTeamForCapacity(team);
    setNewCapacity(team.maximum_headcount || 10);
    setShowCapacityDialog(true);
  };

  const getTeamStats = (teamId, teamName) => {
    const teamEmployees = employees.filter(e => {
      const isInTeam = (e.team_id === teamId || e.team_name === teamName);
      const isActive = !e.employment_status || e.employment_status === 'active' || e.employment_status === 'pending_registration';
      return isInTeam && isActive;
    });

    const teamJobs = jobs.filter(j =>
      (j.team_id === teamId || j.team_name === teamName) &&
      j.status === 'active'
    );

    return {
      employees: teamEmployees.length,
      jobs: teamJobs.length
    };
  };

  const activeTeams = teams.filter(t => t.status === 'active');

  return (
    <div className="p-4 md:p-8 min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 dark:from-[#181818] dark:via-[#1a1a1a] dark:to-[#1e1e1e]">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Teams Management"
          description={`${activeTeams.length} active teams`}
          icon={MapPin}
          actions={
            <Button onClick={handleOpenDialog} size="lg" className="bg-gradient-to-r from-[#3B9FF3] to-[#2A8FE3] text-white shadow-lg">
              <Plus className="w-5 h-5 mr-2" />
              New Team
            </Button>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map(team => {
            const stats = getTeamStats(team.id, team.team_name);
            
            return (
              <ModernTeamCard
                key={team.id}
                team={team}
                stats={stats}
                onViewDetails={handleEdit}
              />
            );
          })}
        </div>

        {/* MAIN TEAM FORM DIALOG */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl text-slate-900 dark:text-white">{editingTeam ? 'Edit Team' : 'New Team'}</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-700">Team Name *</Label>
                  <Input
                    required
                    value={formData.team_name}
                    onChange={(e) => setFormData({...formData, team_name: e.target.value})}
                    placeholder="e.g., Atlanta, Orlando"
                    className="bg-slate-50 border-slate-200 text-slate-900"
                  />
                </div>

                <div>
                  <Label className="text-slate-700">Location *</Label>
                  <Input
                    required
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    placeholder="City"
                    className="bg-slate-50 border-slate-200 text-slate-900"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-700">State *</Label>
                  <Select value={formData.state} onValueChange={(value) => setFormData({...formData, state: value})}>
                    <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-900">
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      <SelectItem value="Georgia" className="hover:bg-slate-100">Georgia</SelectItem>
                      <SelectItem value="Florida" className="hover:bg-slate-100">Florida</SelectItem>
                      <SelectItem value="North Carolina" className="hover:bg-slate-100">North Carolina</SelectItem>
                      <SelectItem value="Tennessee" className="hover:bg-slate-100">Tennessee</SelectItem>
                      <SelectItem value="Alabama" className="hover:bg-slate-100">Alabama</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-slate-700">Maximum Headcount *</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.maximum_headcount}
                    onChange={(e) => setFormData({...formData, maximum_headcount: parseInt(e.target.value) || 1})}
                    className="bg-slate-50 border-slate-200 text-slate-900"
                    required
                  />
                  <p className="text-xs text-slate-500 mt-1">Maximum number of employees in this team</p>
                </div>
              </div>

              <div>
                <Label className="text-slate-700">Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                  <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    <SelectItem value="active" className="hover:bg-slate-100">Active</SelectItem>
                    <SelectItem value="inactive" className="hover:bg-slate-100">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-slate-700">Description</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Optional description"
                  className="bg-slate-50 border-slate-200 text-slate-900"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_headquarters"
                  checked={formData.is_headquarters}
                  onChange={(e) => setFormData({...formData, is_headquarters: e.target.checked})}
                  className="w-4 h-4 accent-[#3B9FF3] cursor-pointer"
                />
                <Label htmlFor="is_headquarters" className="cursor-pointer text-slate-700">Mark as Headquarters (HQ)</Label>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowDialog(false)} className="bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100">
                  Cancel
                </Button>
                <Button type="submit" className="bg-gradient-to-r from-[#3B9FF3] to-[#2A8FE2] text-white">
                  {editingTeam ? 'Update Team' : 'Create Team'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* QUICK CAPACITY EDIT DIALOG */}
        <Dialog open={showCapacityDialog} onOpenChange={setShowCapacityDialog}>
          <DialogContent className="bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-slate-900 dark:text-white">Update Team Capacity</DialogTitle>
              <DialogDescription className="text-slate-600 dark:text-slate-400">
                {selectedTeamForCapacity?.team_name}
              </DialogDescription>
            </DialogHeader>

            {selectedTeamForCapacity && (
              <div className="space-y-4 py-4">
                <Alert className="bg-blue-50 border-blue-200">
                  <AlertDescription className="text-blue-900 text-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-4 h-4" />
                      <span className="font-semibold">
                        Current: {getTeamStats(selectedTeamForCapacity.id, selectedTeamForCapacity.team_name).employees} employees
                      </span>
                    </div>
                    <p className="text-xs text-blue-700">
                      Set the maximum number of employees for this team.
                    </p>
                  </AlertDescription>
                </Alert>

                <div>
                  <Label className="text-slate-700">Maximum Headcount</Label>
                  <Input
                    type="number"
                    min="1"
                    value={newCapacity}
                    onChange={(e) => setNewCapacity(parseInt(e.target.value) || 1)}
                    className="bg-slate-50 border-slate-200 text-slate-900 text-2xl font-bold text-center"
                  />
                  
                  {newCapacity < getTeamStats(selectedTeamForCapacity.id, selectedTeamForCapacity.team_name).employees && (
                    <Alert className="mt-3 bg-amber-50 border-amber-300">
                      <AlertTriangle className="w-4 h-4" />
                      <AlertDescription className="text-amber-800 text-xs">
                        Warning: New capacity is lower than current employee count. Consider reassigning employees.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>
            )}

            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setShowCapacityDialog(false)}
                className="border-slate-300"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (selectedTeamForCapacity) {
                    updateCapacityMutation.mutate({
                      teamId: selectedTeamForCapacity.id,
                      capacity: newCapacity
                    });
                  }
                }}
                className="bg-[#3B9FF3] hover:bg-[#2A8FE3] text-white"
              >
                Update Capacity
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}