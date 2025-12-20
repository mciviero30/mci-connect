import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Award, Plus, Trophy, Star, TrendingUp, Info, Shield, AlertTriangle, Edit, Trash2, Target } from "lucide-react";
import PageHeader from "../components/shared/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/components/ui/toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const recognitionTypes = [
  { value: 'employee_of_month', label: 'Employee of the Month', points: 100, icon: '🏆' },
  { value: 'safety_award', label: 'Safety Award', points: 50, icon: '⚠️' },
  { value: 'quality_work', label: 'Quality Work', points: 30, icon: '✨' },
  { value: 'teamwork', label: 'Teamwork', points: 25, icon: '🤝' },
  { value: 'innovation', label: 'Innovation', points: 40, icon: '💡' },
  { value: 'attendance', label: 'Perfect Attendance', points: 20, icon: '📅' },
  { value: 'customer_service', label: 'Customer Service', points: 35, icon: '😊' },
  { value: 'leadership', label: 'Leadership', points: 45, icon: '👑' }
];

// Helper function to get proper display name
const getDisplayName = (employee) => {
  // FIRST: Try first_name + last_name (the correct way)
  if (employee.first_name || employee.last_name) {
    const fullName = `${employee.first_name || ''} ${employee.last_name || ''}`.trim();
    if (fullName) return fullName;
  }
  
  // SECOND: If full_name exists and doesn't look like an email
  if (employee.full_name && !employee.full_name.includes('@') && !employee.full_name.includes('.')) {
    return employee.full_name;
  }
  
  // LAST RESORT: Extract from email and capitalize
  if (employee.email) {
    const emailName = employee.email.split('@')[0];
    return emailName
      .split('.')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }
  
  return 'Unknown Employee';
};

export default function PerformanceManagement() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [editingRecognition, setEditingRecognition] = useState(null);
  const [formData, setFormData] = useState({
    employee_email: '',
    recognition_type: '',
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  const { data: user } = useQuery({ 
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.User.list(),
    initialData: [],
  });

  const { data: recognitions } = useQuery({
    queryKey: ['recognitions'],
    queryFn: () => base44.entities.Recognition.list('-date'),
    initialData: [],
  });

  const { data: timeEntries = [] } = useQuery({
    queryKey: ['allTimeEntries'],
    queryFn: () => base44.entities.TimeEntry.list('-date', 500),
    initialData: []
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => base44.entities.Job.list('-created_date', 200),
    initialData: []
  });

  const { data: goals = [] } = useQuery({
    queryKey: ['allGoals'],
    queryFn: () => base44.entities.Goal.list('-created_date', 100),
    initialData: []
  });

  // ============================================
  // CREATE MUTATION - Standard creation
  // ============================================
  const createMutation = useMutation({
    mutationFn: async (data) => {
      const selectedType = recognitionTypes.find(t => t.value === data.recognition_type);
      const recognition = await base44.entities.Recognition.create({
        ...data,
        given_by_email: user.email,
        given_by_name: user.full_name,
        points: selectedType?.points || 0,
        message: data.description
      });

      // Create notification for the employee
      if (data.employee_email !== user.email) {
        await base44.entities.Notification.create({
          recipient_email: data.employee_email,
          recipient_name: data.employee_name,
          type: 'recognition',
          priority: 'medium',
          title: `🏆 You received a ${selectedType?.label}!`,
          message: `${user.full_name} recognized you: "${data.title}" (+${selectedType?.points} points)`,
          link: null,
          is_read: false
        });
      }

      return recognition;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recognitions'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      setShowDialog(false);
      setEditingRecognition(null);
      setFormData({
        employee_email: '',
        recognition_type: '',
        title: '',
        description: '',
        date: new Date().toISOString().split('T')[0]
      });
      toast.success('Recognition created successfully');
    }
  });

  // ============================================
  // UPDATE MUTATION - PROTECTED (Admin only after creation)
  // ============================================
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => {
      // Validation: Only admin can update after creation
      if (user?.role !== 'admin') {
        throw new Error('Only administrators can modify existing recognitions');
      }

      const selectedType = recognitionTypes.find(t => t.value === data.recognition_type);
      return base44.entities.Recognition.update(id, {
        ...data,
        points: selectedType?.points || data.points || 0,
        message: data.description
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recognitions'] });
      setShowDialog(false);
      setEditingRecognition(null);
      setFormData({
        employee_email: '',
        recognition_type: '',
        title: '',
        description: '',
        date: new Date().toISOString().split('T')[0]
      });
      toast.success('Recognition updated successfully');
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  // ============================================
  // DELETE MUTATION - PROTECTED (Admin only)
  // ============================================
  const deleteMutation = useMutation({
    mutationFn: (recognitionId) => {
      // Validation: Only admin can delete
      if (user?.role !== 'admin') {
        throw new Error('Only administrators can delete recognitions');
      }

      return base44.entities.Recognition.delete(recognitionId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recognitions'] });
      toast.success('Recognition deleted successfully');
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const employee = employees.find(emp => emp.email === formData.employee_email);
    if (!employee) return;

    const submitData = {
      ...formData,
      employee_name: getDisplayName(employee)
    };

    if (editingRecognition) {
      updateMutation.mutate({ id: editingRecognition.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleEdit = (recognition) => {
    if (user?.role !== 'admin') {
      toast.error('Only administrators can modify recognitions');
      return;
    }

    setEditingRecognition(recognition);
    setFormData({
      employee_email: recognition.employee_email,
      recognition_type: recognition.recognition_type,
      title: recognition.title,
      description: recognition.message || recognition.description || '',
      date: recognition.date
    });
    setShowDialog(true);
  };

  const handleDelete = (recognition) => {
    if (user?.role !== 'admin') {
      toast.error('Only administrators can delete recognitions');
      return;
    }

    if (window.confirm(`Are you sure you want to delete the recognition "${recognition.title}" for ${recognition.employee_name}?`)) {
      deleteMutation.mutate(recognition.id);
    }
  };

  // Enhanced stats with more performance data + Goals
  const employeeStats = employees.map(emp => {
    const empRecognitions = recognitions.filter(r => r.employee_email === emp.email);
    const empTimeEntries = timeEntries.filter(e => e.employee_email === emp.email && e.status === 'approved');
    const empJobs = [...new Set(empTimeEntries.map(e => e.job_id))].length;
    const empGoals = goals.filter(g => g.owner_email === emp.email);
    const completedGoals = empGoals.filter(g => g.status === 'completed').length;
    const activeGoals = empGoals.filter(g => ['on_track', 'at_risk', 'behind', 'not_started'].includes(g.status)).length;
    const goalCompletionRate = empGoals.length > 0 ? (completedGoals / empGoals.length) * 100 : 0;
    
    const totalPoints = empRecognitions.reduce((sum, r) => sum + (r.points || 0), 0);
    const totalHours = empTimeEntries.reduce((sum, e) => sum + (e.hours_worked || 0), 0);
    const latestRecognition = empRecognitions[0];
    
    return {
      ...emp,
      displayName: getDisplayName(emp),
      recognitionCount: empRecognitions.length,
      totalPoints,
      totalHours,
      uniqueJobs: empJobs,
      latestRecognition,
      totalGoals: empGoals.length,
      completedGoals,
      activeGoals,
      goalCompletionRate
    };
  }).sort((a, b) => b.totalPoints - a.totalPoints);

  const topPerformers = employeeStats.slice(0, 5);

  const isAdmin = user?.role === 'admin';

  return (
    <div className="p-4 md:p-8 min-h-screen bg-[#F1F5F9] dark:bg-[#181818]">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Performance & Recognition"
          description="Track employee achievements and recognition"
          icon={Award}
          actions={
            isAdmin && (
              <Button onClick={() => {
                setEditingRecognition(null);
                setFormData({
                  employee_email: '',
                  recognition_type: '',
                  title: '',
                  description: '',
                  date: new Date().toISOString().split('T')[0]
                });
                setShowDialog(true);
              }} size="lg" className="bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] hover:from-[#507DB4]/90 hover:to-[#6B9DD8]/90 text-white shadow-md">
                <Plus className="w-5 h-5 mr-2" />
                Add Recognition
              </Button>
            )
          }
        />

        {/* IMMUTABILITY NOTICE */}
        {isAdmin && (
          <Alert className="mb-6 bg-blue-50 border-blue-300">
            <Shield className="w-4 h-4" />
            <AlertDescription className="text-blue-900 text-sm">
              <strong>Recognition Immutability:</strong> Only administrators can modify or delete recognitions to maintain audit integrity and prevent point manipulation.
            </AlertDescription>
          </Alert>
        )}

        {/* Top Performers */}
        <Card className="bg-white/90 dark:bg-[#282828] backdrop-blur-sm shadow-xl mb-8 border-slate-200 dark:border-slate-700">
          <CardHeader className="border-b border-slate-200 dark:border-slate-700">
            <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
              <Trophy className="w-5 h-5 text-yellow-400" />
              Top Performers
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {topPerformers.map((emp, idx) => (
                <Link key={emp.id} to={createPageUrl(`EmployeeProfile?id=${emp.id}`)}>
                  <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-[#3B9FF3]/30 dark:hover:border-blue-500/50 transition-all cursor-pointer">
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 text-white font-bold text-lg shadow-lg">
                      #{idx + 1}
                    </div>
                    
                    {emp.profile_photo_url ? (
                      <img src={emp.profile_photo_url} alt={emp.displayName} className="w-12 h-12 rounded-full object-cover border-2 border-[#3B9FF3]" />
                    ) : (
                      <div className="w-12 h-12 bg-gradient-to-br from-[#3B9FF3] to-[#2A8FE3] rounded-full flex items-center justify-center text-white font-bold">
                        {emp.displayName?.[0]?.toUpperCase()}
                      </div>
                    )}

                    <div className="flex-1">
                      <h3 className="font-bold text-slate-900 dark:text-white">{emp.displayName}</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{emp.position}</p>
                      <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
                        <span>{emp.totalHours.toFixed(1)}h worked</span>
                        <span>•</span>
                        <span>{emp.uniqueJobs} jobs</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="flex items-center gap-2 text-yellow-400 font-bold text-xl">
                        <Star className="w-5 h-5" />
                        {emp.totalPoints}
                      </div>
                      <p className="text-xs text-slate-500">{emp.recognitionCount} awards</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* All Employee Stats with TRANSPARENT CALCULATION */}
        <Card className="bg-white/90 dark:bg-[#282828] backdrop-blur-sm shadow-xl mb-8 border-slate-200 dark:border-slate-700">
          <CardHeader className="border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
                <TrendingUp className="w-5 h-5 text-[#507DB4] dark:text-[#6B9DD8]" />
                All Employee Stats
              </CardTitle>
              
              {/* TRANSPARENT CALCULATION LEGEND */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-slate-500 hover:text-[#507DB4]">
                      <Info className="w-5 h-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-slate-900 text-white border-slate-700 max-w-md p-4">
                    <h4 className="font-bold mb-2 text-[#507DB4]">Total Points Calculation</h4>
                    <p className="text-sm mb-2">
                      <strong>Formula:</strong> Sum of all 'points' values from Recognition entity for this employee
                    </p>
                    <div className="text-xs text-slate-300 space-y-1">
                      <p>• Each recognition type has a predefined point value</p>
                      <p>• Points are immutable once assigned</p>
                      <p>• Only admins can modify recognitions for audit integrity</p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {employeeStats.map(emp => (
                <Link key={emp.id} to={createPageUrl(`EmployeeProfile?id=${emp.id}`)}>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-[#3B9FF3]/30 dark:hover:border-blue-500/50 transition-all cursor-pointer">
                    <div className="flex items-center gap-3 mb-3">
                      {emp.profile_photo_url ? (
                        <img src={emp.profile_photo_url} alt={emp.displayName} className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 bg-gradient-to-br from-[#507DB4] to-[#6B9DD8] rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md">
                          {emp.displayName?.[0]?.toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-slate-900 dark:text-white truncate">{emp.displayName}</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{emp.position}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1 text-yellow-400">
                        <Star className="w-4 h-4" />
                        <span className="font-bold">{emp.totalPoints}</span>
                      </div>
                      <Badge variant="outline" className="text-xs border-slate-300 text-slate-600">
                        {emp.recognitionCount} awards
                      </Badge>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                      <span>{emp.totalHours.toFixed(0)}h</span>
                      <span>•</span>
                      <span>{emp.uniqueJobs} jobs</span>
                    </div>

                    {emp.totalGoals > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <Target className="w-3 h-3" />
                            Goals: {emp.completedGoals}/{emp.totalGoals}
                          </span>
                          <span className="text-xs font-medium text-blue-600">{emp.goalCompletionRate.toFixed(0)}%</span>
                        </div>
                        <Progress value={emp.goalCompletionRate} className="h-1.5" />
                      </div>
                    )}

                    {emp.latestRecognition && (
                      <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                        <p className="text-xs text-slate-500 dark:text-slate-400">Latest: {emp.latestRecognition.title}</p>
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Recognitions with EDIT/DELETE (Admin only) */}
        <Card className="bg-white/90 dark:bg-[#282828] shadow-xl border-slate-200 dark:border-slate-700">
          <CardHeader className="border-b border-slate-200 dark:border-slate-700">
            <CardTitle className="text-slate-900 dark:text-white">All Recognitions</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3">
              {recognitions.map(rec => {
                const typeInfo = recognitionTypes.find(t => t.value === rec.recognition_type);
                return (
                  <div key={rec.id} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-2xl">{typeInfo?.icon}</span>
                          <h4 className="font-bold text-slate-900 dark:text-white">{rec.title}</h4>
                          <Badge className="bg-yellow-500/20 text-yellow-700 border-yellow-500/30">
                            +{rec.points} pts
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">{rec.message || rec.description}</p>
                        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                          <span>👤 {rec.employee_name}</span>
                          <span>•</span>
                          <span>🎁 By: {rec.given_by_name}</span>
                          <span>•</span>
                          <span>📅 {format(new Date(rec.date), 'MMM dd, yyyy')}</span>
                        </div>
                      </div>
                      
                      {isAdmin && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
                              <Shield className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
                            <DropdownMenuItem onClick={() => handleEdit(rec)} className="cursor-pointer dark:text-white dark:hover:bg-slate-700">
                              <Edit className="w-4 h-4 mr-2" />
                              Edit (Admin)
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(rec)} className="cursor-pointer text-red-600 dark:text-red-400 focus:text-red-700 dark:hover:bg-red-900/20">
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete (Admin)
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {recognitions.length === 0 && (
              <div className="text-center py-12">
                <Award className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                <p className="text-slate-500 dark:text-slate-400">No recognitions yet. Start rewarding your team!</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add/Edit Recognition Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-lg bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-slate-900 dark:text-white">
                {editingRecognition ? 'Edit Recognition (Admin)' : 'Add Recognition'}
              </DialogTitle>
              {editingRecognition && (
                <DialogDescription className="text-amber-600 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Modifying existing recognition - changes will be logged
                </DialogDescription>
              )}
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-700">Employee</Label>
                <Select 
                  value={formData.employee_email} 
                  onValueChange={(value) => setFormData({...formData, employee_email: value})}
                  disabled={!!editingRecognition}
                >
                  <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-900">
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    {employees.map(emp => (
                      <SelectItem key={emp.id} value={emp.email} className="text-slate-900 hover:bg-slate-100">
                        {getDisplayName(emp)} - {emp.position}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-700">Recognition Type</Label>
                <Select value={formData.recognition_type} onValueChange={(value) => {
                  const selected = recognitionTypes.find(t => t.value === value);
                  setFormData({
                    ...formData, 
                    recognition_type: value,
                    title: selected?.label || ''
                  });
                }}>
                  <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-900">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    {recognitionTypes.map(type => (
                      <SelectItem key={type.value} value={type.value} className="text-slate-900 hover:bg-slate-100">
                        {type.icon} {type.label} (+{type.points} points)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-700">Title</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="bg-slate-50 border-slate-200 text-slate-900"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-700">Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="bg-slate-50 border-slate-200 text-slate-900 h-24"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-700">Date</Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  className="bg-slate-50 border-slate-200 text-slate-900"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowDialog(false)} className="bg-slate-50 border-slate-200 text-slate-700">
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] hover:from-[#507DB4]/90 hover:to-[#6B9DD8]/90 text-white shadow-md">
                  {editingRecognition ? 'Update Recognition' : 'Add Recognition'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}