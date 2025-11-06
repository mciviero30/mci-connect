
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Award, Plus, Trophy, Star, TrendingUp } from "lucide-react";
import PageHeader from "../components/shared/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";

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
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState({
    employee_email: '',
    recognition_type: '',
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  const { data: user } = useQuery({ queryKey: ['currentUser'] });
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

  const createMutation = useMutation({
    mutationFn: (data) => {
      const selectedType = recognitionTypes.find(t => t.value === data.recognition_type);
      return base44.entities.Recognition.create({
        ...data,
        given_by_email: user.email,
        given_by_name: user.full_name,
        points: selectedType?.points || 0
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recognitions'] });
      setShowDialog(false);
      setFormData({
        employee_email: '',
        recognition_type: '',
        title: '',
        description: '',
        date: new Date().toISOString().split('T')[0]
      });
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const employee = employees.find(emp => emp.email === formData.employee_email);
    if (!employee) return;

    createMutation.mutate({
      ...formData,
      employee_name: getDisplayName(employee)
    });
  };

  // Enhanced stats with more performance data
  const employeeStats = employees.map(emp => {
    const empRecognitions = recognitions.filter(r => r.employee_email === emp.email);
    const empTimeEntries = timeEntries.filter(e => e.employee_email === emp.email && e.status === 'approved');
    const empJobs = [...new Set(empTimeEntries.map(e => e.job_id))].length;
    
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
      latestRecognition
    };
  }).sort((a, b) => b.totalPoints - a.totalPoints);

  const topPerformers = employeeStats.slice(0, 5);

  const isAdmin = user?.role === 'admin';

  return (
    <div className="p-4 md:p-8 min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Performance & Recognition"
          description="Track employee achievements and recognition with AI insights"
          icon={Award}
          actions={
            isAdmin && (
              <Button onClick={() => setShowDialog(true)} size="lg" className="bg-gradient-to-r from-[#3B9FF3] to-[#2A8FE3] text-white shadow-lg shadow-blue-500/30">
                <Plus className="w-5 h-5 mr-2" />
                Add Recognition
              </Button>
            )
          }
        />

        {/* Top Performers */}
        <Card className="bg-white/90 backdrop-blur-sm shadow-xl mb-8 border-slate-200">
          <CardHeader className="border-b border-slate-200">
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <Trophy className="w-5 h-5 text-yellow-400" />
              Top Performers
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {topPerformers.map((emp, idx) => (
                <Link key={emp.id} to={createPageUrl(`EmployeeProfile?id=${emp.id}`)}>
                  <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-[#3B9FF3]/30 transition-all cursor-pointer">
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
                      <h3 className="font-bold text-slate-900">{emp.displayName}</h3>
                      <p className="text-sm text-slate-500">{emp.position}</p>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
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

        {/* All Employee Stats */}
        <Card className="bg-white/90 backdrop-blur-sm shadow-xl mb-8 border-slate-200">
          <CardHeader className="border-b border-slate-200">
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <TrendingUp className="w-5 h-5 text-[#3B9FF3]" />
              All Employee Stats
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {employeeStats.map(emp => (
                <Link key={emp.id} to={createPageUrl(`EmployeeProfile?id=${emp.id}`)}>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-[#3B9FF3]/30 transition-all cursor-pointer">
                    <div className="flex items-center gap-3 mb-3">
                      {emp.profile_photo_url ? (
                        <img src={emp.profile_photo_url} alt={emp.displayName} className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 bg-gradient-to-br from-[#3B9FF3] to-[#2A8FE3] rounded-full flex items-center justify-center text-white font-bold text-sm">
                          {emp.displayName?.[0]?.toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-slate-900 truncate">{emp.displayName}</h4>
                        <p className="text-xs text-slate-500 truncate">{emp.position}</p>
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

                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span>{emp.totalHours.toFixed(0)}h</span>
                      <span>•</span>
                      <span>{emp.uniqueJobs} jobs</span>
                    </div>

                    {emp.latestRecognition && (
                      <div className="mt-3 pt-3 border-t border-slate-200">
                        <p className="text-xs text-slate-500">Latest: {emp.latestRecognition.title}</p>
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Recognitions */}
        <Card className="glass-card shadow-xl">
          <CardHeader className="border-b border-slate-800">
            <CardTitle className="text-white">All Recognitions</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3">
              {recognitions.map(rec => {
                const typeInfo = recognitionTypes.find(t => t.value === rec.recognition_type);
                return (
                  <div key={rec.id} className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-2xl">{typeInfo?.icon}</span>
                          <h4 className="font-bold text-white">{rec.title}</h4>
                        </div>
                        <p className="text-sm text-slate-400 mb-2">{rec.description}</p>
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          <span>👤 {rec.employee_name}</span>
                          <span>•</span>
                          <span>🎁 By: {rec.given_by_name}</span>
                          <span>•</span>
                          <span>📅 {format(new Date(rec.date), 'MMM dd, yyyy')}</span>
                        </div>
                      </div>
                      <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                        +{rec.points} pts
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>

            {recognitions.length === 0 && (
              <div className="text-center py-12">
                <Award className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-500">No recognitions yet. Start rewarding your team!</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add Recognition Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-lg bg-slate-900 border-slate-800">
            <DialogHeader>
              <DialogTitle className="text-white">Add Recognition</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Employee</Label>
                <Select value={formData.employee_email} onValueChange={(value) => setFormData({...formData, employee_email: value})}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800">
                    {employees.map(emp => (
                      <SelectItem key={emp.id} value={emp.email} className="text-white hover:bg-slate-800">
                        {getDisplayName(emp)} - {emp.position}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Recognition Type</Label>
                <Select value={formData.recognition_type} onValueChange={(value) => {
                  const selected = recognitionTypes.find(t => t.value === value);
                  setFormData({
                    ...formData, 
                    recognition_type: value,
                    title: selected?.label || ''
                  });
                }}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800">
                    {recognitionTypes.map(type => (
                      <SelectItem key={type.value} value={type.value} className="text-white hover:bg-slate-800">
                        {type.icon} {type.label} (+{type.points} points)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Title</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="bg-slate-800 border-slate-700 text-white"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="bg-slate-800 border-slate-700 text-white h-24"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Date</Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  className="bg-slate-800 border-slate-700 text-white"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowDialog(false)} className="bg-slate-800 border-slate-700 text-slate-300">
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending} className="bg-gradient-to-r from-[#3B9FF3] to-[#2A8FE3] text-white">
                  Add Recognition
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
