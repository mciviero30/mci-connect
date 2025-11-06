
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Plus, Edit, Trash2, Building2, Users, Briefcase, MoreVertical } from "lucide-react";
import PageHeader from "../components/shared/PageHeader";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Teams() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);

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
      toast({
        title: "Success",
        description: "Team created successfully",
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Team.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      setShowDialog(false);
      setEditingTeam(null);
      toast({
        title: "Success",
        description: "Team updated successfully",
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Team.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      toast({
        title: "Success",
        description: "Team deleted successfully",
      });
    }
  });

  const [formData, setFormData] = useState({
    team_name: '',
    location: '',
    state: '',
    is_headquarters: false,
    maximum_headcount: 10, // NEW: Prompt #56 - Default capacity
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
    // Ensure maximum_headcount is set, default to 10 if not present
    setFormData({
      ...team,
      maximum_headcount: team.maximum_headcount || 10
    });
    setShowDialog(true);
  };

  const handleDelete = (team) => {
    if (window.confirm(`Are you sure you want to delete ${team.team_name}?`)) {
      deleteMutation.mutate(team.id);
    }
  };

  const handleOpenDialog = () => {
    setEditingTeam(null);
    setFormData({
      team_name: '',
      location: '',
      state: '',
      is_headquarters: false,
      maximum_headcount: 10, // NEW
      status: 'active',
      description: ''
    });
    setShowDialog(true);
  };

  const getTeamStats = (teamId, teamName) => {
    // Filter by both team_id AND team_name for backwards compatibility
    // Also include employees where employment_status is undefined, null, or 'active'
    const teamEmployees = employees.filter(e => {
      const isInTeam = (e.team_id === teamId || e.team_name === teamName);
      const isActive = !e.employment_status || e.employment_status === 'active';
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
    <div className="p-4 md:p-8 min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
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

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.map(team => {
            const stats = getTeamStats(team.id, team.team_name);
            const maxHeadcount = team.maximum_headcount || 10;
            const isAtCapacity = stats.employees >= maxHeadcount;
            const capacityPercentage = (stats.employees / maxHeadcount) * 100;

            return (
              <Card key={team.id} className="bg-slate-50 shadow-lg hover:shadow-xl transition-all duration-300 group border-slate-200">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <Link to={createPageUrl(`TeamDetails?id=${team.id}`)} className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Building2 className="w-6 h-6 text-[#3B9FF3]" />
                        <CardTitle className="text-xl text-slate-900">{team.team_name}</CardTitle>
                        {team.is_headquarters && (
                          <Badge className="bg-amber-100 border-amber-300 text-amber-700">HQ</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <MapPin className="w-4 h-4" />
                        <span>{team.location}, {team.state}</span>
                      </div>
                    </Link>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-slate-600 hover:text-slate-900 hover:bg-slate-200">
                          <MoreVertical className="w-5 h-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-white border-slate-200">
                        <DropdownMenuItem onClick={() => handleEdit(team)} className="text-slate-900 hover:bg-slate-100">
                          <Edit className="w-4 h-4 mr-2" />
                          Edit Team
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(team)} className="text-red-600 hover:bg-red-50">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Team
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>

                <CardContent>
                  <Link to={createPageUrl(`TeamDetails?id=${team.id}`)}>
                    <Badge className={
                      team.status === 'active'
                        ? 'bg-blue-50 border-blue-200 text-blue-700 mb-4'
                        : 'bg-slate-200 border-slate-300 text-slate-600 mb-4'
                    }>
                      {team.status}
                    </Badge>

                    {team.description && (
                      <p className="text-slate-600 text-sm mb-4">{team.description}</p>
                    )}

                    {/* NEW: Prompt #56 - Team Capacity Indicator */}
                    <div className="mb-4 p-3 bg-white rounded-lg border border-slate-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-slate-600 font-medium">Team Capacity</span>
                        <span className={`text-sm font-bold ${
                          isAtCapacity ? 'text-red-600' :
                          capacityPercentage > 80 ? 'text-amber-600' :
                          'text-green-600'
                        }`}>
                          {stats.employees}/{maxHeadcount}
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${
                            isAtCapacity ? 'bg-red-500' :
                            capacityPercentage > 80 ? 'bg-amber-500' :
                            'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(100, capacityPercentage)}%` }}
                        />
                      </div>
                      {isAtCapacity && (
                        <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
                          <span>⚠️</span>
                          <span>Team at full capacity</span>
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white rounded-lg p-3 border border-slate-200">
                        <div className="flex items-center gap-2 mb-1">
                          <Users className="w-4 h-4 text-[#3B9FF3]" />
                          <span className="text-xs text-slate-600">Employees</span>
                        </div>
                        <p className="text-2xl font-bold text-slate-900">{stats.employees}</p>
                      </div>

                      <div className="bg-white rounded-lg p-3 border border-slate-200">
                        <div className="flex items-center gap-2 mb-1">
                          <Briefcase className="w-4 h-4 text-[#3B9FF3]" />
                          <span className="text-xs text-slate-600">Active Jobs</span>
                        </div>
                        <p className="text-2xl font-bold text-slate-900">{stats.jobs}</p>
                      </div>
                    </div>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="bg-white border-slate-200 text-slate-900 max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl text-slate-900">{editingTeam ? 'Edit Team' : 'New Team'}</DialogTitle>
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

                {/* NEW: Prompt #56 - Maximum Headcount field */}
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

              <div> {/* Status field moved to its own row for layout consistency */}
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
                  className="w-4 h-4"
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
      </div>
    </div>
  );
}
