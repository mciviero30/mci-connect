
import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import PageHeader from "../components/shared/PageHeader";
import { Users, Award, AlertCircle, Calendar, Clock, CheckCircle, TrendingUp, Target, Shield } from "lucide-react";
import { useLanguage } from "@/components/i18n/LanguageContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { Bar, Line, Radar } from 'recharts';
import { BarChart, LineChart, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, differenceInDays, addMonths } from 'date-fns';
import { es } from 'date-fns/locale';

export default function HRAdvancedDashboard() {
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();
  const toast = useToast();

  const [performanceDialog, setPerformanceDialog] = useState(false);
  const [onboardingDialog, setOnboardingDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  // Fetch data
  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.User.list(),
    initialData: []
  });

  const { data: timeEntries } = useQuery({
    queryKey: ['timeEntries'],
    queryFn: () => base44.entities.TimeEntry.list(),
    initialData: []
  });

  const { data: certifications } = useQuery({
    queryKey: ['certifications'],
    queryFn: () => base44.entities.Certification.list(),
    initialData: []
  });

  const { data: recognitions } = useQuery({
    queryKey: ['recognitions'],
    queryFn: () => base44.entities.Recognition.list(),
    initialData: []
  });

  const { data: timeOffRequests } = useQuery({
    queryKey: ['timeOffRequests'],
    queryFn: () => base44.entities.TimeOffRequest.list(),
    initialData: []
  });

  // NEW: Store in localStorage for demo
  const [skills, setSkills] = useState(() => {
    const saved = localStorage.getItem('employeeSkills');
    return saved ? JSON.parse(saved) : [];
  });

  const [performanceReviews, setPerformanceReviews] = useState(() => {
    const saved = localStorage.getItem('performanceReviews');
    return saved ? JSON.parse(saved) : [];
  });

  const [onboardingTasks, setOnboardingTasks] = useState(() => {
    const saved = localStorage.getItem('onboardingTasks');
    return saved ? JSON.parse(saved) : [
      { id: '1', name: 'Complete I-9 Form', required: true, completed: false },
      { id: '2', name: 'Complete W-4 Form', required: true, completed: false },
      { id: '3', name: 'Safety Training', required: true, completed: false },
      { id: '4', name: 'Company Policy Review', required: true, completed: false },
      { id: '5', name: 'Tool Assignment', required: false, completed: false },
      { id: '6', name: 'Meet Team Members', required: false, completed: false }
    ];
  });

  // 25. EMPLOYEE SCORECARD
  const employeeScorecard = useMemo(() => {
    return employees.filter(e => e.employment_status === 'active').map(emp => {
      const empTimeEntries = timeEntries.filter(t => t.employee_email === emp.email);
      const empRecognitions = recognitions.filter(r => r.employee_email === emp.email);
      const empCertifications = certifications.filter(c => c.employee_email === emp.email);
      
      const totalHours = empTimeEntries.reduce((sum, t) => sum + (t.hours_worked || 0), 0);
      const overtimeHours = empTimeEntries.filter(t => t.hour_type === 'overtime').reduce((sum, t) => sum + (t.hours_worked || 0), 0);
      const approvedHours = empTimeEntries.filter(t => t.status === 'approved').reduce((sum, t) => sum + (t.hours_worked || 0), 0);
      
      const totalPoints = empRecognitions.reduce((sum, r) => sum + (r.points || 0), 0);
      const recognitionsCount = empRecognitions.length;
      
      const activeCerts = empCertifications.filter(c => c.status === 'active').length;
      const expiringCerts = empCertifications.filter(c => c.status === 'expiring_soon').length;
      
      const attendanceRate = empTimeEntries.length > 0 ? ((approvedHours / totalHours) * 100) : 100;
      
      return {
        ...emp,
        metrics: {
          totalHours,
          overtimeHours,
          approvedHours,
          attendanceRate,
          totalPoints,
          recognitionsCount,
          activeCerts,
          expiringCerts
        },
        overallScore: (attendanceRate * 0.3) + (Math.min(totalPoints / 10, 100) * 0.4) + (activeCerts * 10 * 0.3)
      };
    }).sort((a, b) => b.overallScore - a.overallScore);
  }, [employees, timeEntries, recognitions, certifications]);

  // 26. SKILLS MATRIX
  const skillsMatrix = useMemo(() => {
    const skillCategories = ['OSHA', 'Equipment', 'Technical', 'Leadership', 'Safety'];
    
    return employees.filter(e => e.employment_status === 'active').map(emp => {
      const empSkills = skills.filter(s => s.employee_email === emp.email);
      const empCerts = certifications.filter(c => c.employee_email === emp.email && c.status === 'active');
      
      const skillsByCategory = skillCategories.map(category => {
        const categorySkills = empSkills.filter(s => s.category === category);
        const categoryCerts = empCerts.filter(c => c.certification_type?.includes(category));
        
        return {
          category,
          skills: categorySkills.length,
          certifications: categoryCerts.length,
          level: categorySkills.length + categoryCerts.length
        };
      });
      
      return {
        name: emp.full_name,
        email: emp.email,
        skills: skillsByCategory,
        totalSkills: empSkills.length + empCerts.length
      };
    });
  }, [employees, skills, certifications]);

  // 27. CERTIFICATION EXPIRATION ALERTS
  const certificationAlerts = useMemo(() => {
    const today = new Date();
    const alerts = [];
    
    certifications.forEach(cert => {
      if (!cert.expiration_date) return;
      
      const expDate = new Date(cert.expiration_date);
      const daysUntilExpiry = differenceInDays(expDate, today);
      
      let priority = 'normal';
      if (daysUntilExpiry < 0) priority = 'expired';
      else if (daysUntilExpiry <= 30) priority = 'urgent';
      else if (daysUntilExpiry <= 60) priority = 'high';
      else if (daysUntilExpiry <= 90) priority = 'medium';
      
      if (priority !== 'normal') {
        alerts.push({
          ...cert,
          daysUntilExpiry,
          priority
        });
      }
    });
    
    return alerts.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
  }, [certifications]);

  // 28. PERFORMANCE REVIEW SYSTEM
  const upcomingReviews = useMemo(() => {
    const today = new Date();
    
    return employees.filter(e => e.employment_status === 'active').map(emp => {
      const lastReview = performanceReviews
        .filter(r => r.employee_email === emp.email)
        .sort((a, b) => new Date(b.review_date) - new Date(a.review_date))[0];
      
      const hireDate = emp.hire_date ? new Date(emp.hire_date) : today;
      const monthsSinceHire = Math.floor((today - hireDate) / (1000 * 60 * 60 * 24 * 30));
      
      let nextReviewDate;
      if (lastReview) {
        nextReviewDate = addMonths(new Date(lastReview.review_date), 3);
      } else {
        nextReviewDate = addMonths(hireDate, 3);
      }
      
      const daysUntilReview = differenceInDays(nextReviewDate, today);
      
      return {
        employee: emp,
        lastReview,
        nextReviewDate,
        daysUntilReview,
        isDue: daysUntilReview <= 0,
        isUpcoming: daysUntilReview > 0 && daysUntilReview <= 30
      };
    }).filter(r => r.isDue || r.isUpcoming).sort((a, b) => a.daysUntilReview - b.daysUntilReview);
  }, [employees, performanceReviews]);

  // 29. OVERTIME ALERTS
  const overtimeAlerts = useMemo(() => {
    const weeklyLimit = 40;
    const monthlyLimit = 160;
    const today = new Date();
    
    return employees.filter(e => e.employment_status === 'active').map(emp => {
      const empTimeEntries = timeEntries.filter(t => t.employee_email === emp.email);
      
      // This week
      const thisWeekEntries = empTimeEntries.filter(t => {
        const entryDate = new Date(t.date);
        const daysDiff = differenceInDays(today, entryDate);
        return daysDiff <= 7;
      });
      
      const weeklyHours = thisWeekEntries.reduce((sum, t) => sum + (t.hours_worked || 0), 0);
      
      // This month
      const thisMonthEntries = empTimeEntries.filter(t => {
        const entryDate = new Date(t.date);
        return entryDate.getMonth() === today.getMonth() && entryDate.getFullYear() === today.getFullYear();
      });
      
      const monthlyHours = thisMonthEntries.reduce((sum, t) => sum + (t.hours_worked || 0), 0);
      
      const weeklyOvertime = Math.max(0, weeklyHours - weeklyLimit);
      const monthlyOvertime = Math.max(0, monthlyHours - monthlyLimit);
      
      return {
        employee: emp,
        weeklyHours,
        monthlyHours,
        weeklyOvertime,
        monthlyOvertime,
        weeklyAlert: weeklyHours >= weeklyLimit * 0.9,
        monthlyAlert: monthlyHours >= monthlyLimit * 0.9
      };
    }).filter(a => a.weeklyAlert || a.monthlyAlert);
  }, [employees, timeEntries]);

  // 30. TIME OFF CALENDAR
  const timeOffCalendar = useMemo(() => {
    const next30Days = [];
    const today = new Date();
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      
      const dayRequests = timeOffRequests.filter(req => {
        if (req.status !== 'approved') return false;
        
        const startDate = new Date(req.start_date);
        const endDate = new Date(req.end_date);
        
        return date >= startDate && date <= endDate;
      });
      
      next30Days.push({
        date: format(date, 'MMM dd', { locale: language === 'es' ? es : undefined }),
        fullDate: date,
        employeesOff: dayRequests.length,
        requests: dayRequests
      });
    }
    
    return next30Days;
  }, [timeOffRequests, language]);

  // 31. ONBOARDING PROGRESS
  const onboardingProgress = useMemo(() => {
    return employees.filter(e => e.employment_status === 'pending_registration' || e.employment_status === 'active').map(emp => {
      const empOnboardingData = JSON.parse(localStorage.getItem(`onboarding_${emp.email}`) || '{}');
      const completedTasks = Object.values(empOnboardingData).filter(Boolean).length;
      const totalTasks = onboardingTasks.length;
      const progress = totalTasks > 0 ? (completedTasks / totalTasks * 100) : 0;
      
      return {
        employee: emp,
        completedTasks,
        totalTasks,
        progress,
        isComplete: progress === 100
      };
    }).filter(o => o.progress < 100);
  }, [employees, onboardingTasks]);

  // 32. SELF-SERVICE PORTAL DATA
  const selfServiceStats = useMemo(() => {
    const updatesThisMonth = employees.filter(e => {
      if (!e.updated_date) return false;
      const updateDate = new Date(e.updated_date);
      const today = new Date();
      return updateDate.getMonth() === today.getMonth() && updateDate.getFullYear() === today.getFullYear();
    }).length;
    
    return {
      totalEmployees: employees.filter(e => e.employment_status === 'active').length,
      updatesThisMonth,
      avgUpdatesPerEmployee: employees.length > 0 ? (updatesThisMonth / employees.length) : 0
    };
  }, [employees]);

  const priorityColors = {
    expired: 'bg-red-100 text-red-800 border-red-300',
    urgent: 'bg-orange-100 text-orange-800 border-orange-300',
    high: 'bg-amber-100 text-amber-800 border-amber-300',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-300'
  };

  return (
    <div className="p-4 md:p-8 min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title={language === 'es' ? "HR Dashboard Avanzado" : "Advanced HR Dashboard"}
          description={language === 'es' ? "Gestión completa de recursos humanos y desarrollo" : "Complete human resources and development management"}
          icon={Users}
        />

        {/* KEY METRICS - FIXED TEXT COLORS */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-white text-sm font-medium">
                  {language === 'es' ? 'Empleados Activos' : 'Active Employees'}
                </p>
                <Users className="w-5 h-5 text-white" />
              </div>
              <p className="text-3xl font-bold text-white">{selfServiceStats.totalEmployees}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-white text-sm font-medium">
                  {language === 'es' ? 'Alertas Certificaciones' : 'Cert Alerts'}
                </p>
                <AlertCircle className="w-5 h-5 text-white" />
              </div>
              <p className="text-3xl font-bold text-white">{certificationAlerts.length}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-white text-sm font-medium">
                  {language === 'es' ? 'Reviews Pendientes' : 'Reviews Due'}
                </p>
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
              <p className="text-3xl font-bold text-white">{upcomingReviews.length}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-white text-sm font-medium">
                  {language === 'es' ? 'Onboarding Activo' : 'Active Onboarding'}
                </p>
                <Target className="w-5 h-5 text-white" />
              </div>
              <p className="text-3xl font-bold text-white">{onboardingProgress.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* EMPLOYEE SCORECARD */}
        <Card className="mb-8 bg-white/90 backdrop-blur-sm shadow-lg border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <Award className="w-5 h-5 text-blue-600" />
              {language === 'es' ? 'Top 10 Employee Scorecard' : 'Top 10 Employee Scorecard'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {employeeScorecard.slice(0, 10).map((emp, idx) => (
                <div key={emp.email} className="border-b border-slate-200 pb-4 last:border-0">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-bold text-slate-400">#{idx + 1}</span>
                      <div>
                        <h4 className="font-semibold text-slate-900">{emp.full_name}</h4>
                        <div className="flex gap-3 text-sm text-slate-600 mt-1">
                          <span>{emp.metrics.totalHours.toFixed(0)}h</span>
                          <span>•</span>
                          <span>{emp.metrics.recognitionsCount} {language === 'es' ? 'reconocimientos' : 'recognitions'}</span>
                          <span>•</span>
                          <span>{emp.metrics.activeCerts} {language === 'es' ? 'certs' : 'certs'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg text-blue-600">
                        {emp.overallScore.toFixed(0)}
                      </p>
                      <p className="text-xs text-slate-600">{language === 'es' ? 'Score' : 'Score'}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    <div className="bg-blue-50 rounded p-2 border border-blue-200">
                      <p className="text-xs text-blue-600">{language === 'es' ? 'Asistencia' : 'Attendance'}</p>
                      <p className="font-semibold text-blue-900">{emp.metrics.attendanceRate.toFixed(0)}%</p>
                    </div>
                    <div className="bg-green-50 rounded p-2 border border-green-200">
                      <p className="text-xs text-green-600">{language === 'es' ? 'Puntos' : 'Points'}</p>
                      <p className="font-semibold text-green-900">{emp.metrics.totalPoints}</p>
                    </div>
                    <div className="bg-purple-50 rounded p-2 border border-purple-200">
                      <p className="text-xs text-purple-600">{language === 'es' ? 'Certs' : 'Certs'}</p>
                      <p className="font-semibold text-purple-900">{emp.metrics.activeCerts}</p>
                    </div>
                    <div className="bg-amber-50 rounded p-2 border border-amber-200">
                      <p className="text-xs text-amber-600">OT</p>
                      <p className="font-semibold text-amber-900">{emp.metrics.overtimeHours.toFixed(0)}h</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* SKILLS MATRIX */}
        <Card className="mb-8 bg-white/90 backdrop-blur-sm shadow-lg border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <Shield className="w-5 h-5 text-green-600" />
              {language === 'es' ? 'Matriz de Habilidades' : 'Skills Matrix'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <RadarChart data={skillsMatrix.slice(0, 5).map(sm => ({
                employee: sm.name.split(' ')[0],
                ...sm.skills.reduce((acc, skill) => {
                  acc[skill.category] = skill.level;
                  return acc;
                }, {})
              }))}>
                <PolarGrid />
                <PolarAngleAxis dataKey="employee" />
                <PolarRadiusAxis />
                <Radar name="OSHA" dataKey="OSHA" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                <Radar name="Equipment" dataKey="Equipment" stroke="#22c55e" fill="#22c55e" fillOpacity={0.3} />
                <Radar name="Technical" dataKey="Technical" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.3} />
                <Radar name="Leadership" dataKey="Leadership" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} />
                <Radar name="Safety" dataKey="Safety" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* CERTIFICATION ALERTS */}
        {certificationAlerts.length > 0 && (
          <Card className="mb-8 bg-red-50 border-red-200 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-900">
                <AlertCircle className="w-5 h-5" />
                {language === 'es' ? 'Alertas de Certificaciones' : 'Certification Alerts'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {certificationAlerts.slice(0, 10).map(alert => (
                  <div key={alert.id} className={`rounded-lg p-3 border ${priorityColors[alert.priority]}`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-slate-900">{alert.employee_name}</p>
                        <p className="text-sm text-slate-700">{alert.certification_name}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-slate-900">
                          {alert.daysUntilExpiry < 0 
                            ? (language === 'es' ? 'VENCIDO' : 'EXPIRED')
                            : `${alert.daysUntilExpiry} ${language === 'es' ? 'días' : 'days'}`
                          }
                        </p>
                        <p className="text-xs text-slate-600">
                          {format(new Date(alert.expiration_date), 'MMM dd, yyyy', { locale: language === 'es' ? es : undefined })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* PERFORMANCE REVIEWS DUE */}
        {upcomingReviews.length > 0 && (
          <Card className="mb-8 bg-white/90 backdrop-blur-sm shadow-lg border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <CheckCircle className="w-5 h-5 text-green-600" />
                {language === 'es' ? 'Reviews Pendientes' : 'Performance Reviews Due'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingReviews.map(review => (
                  <div key={review.employee.email} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div>
                      <p className="font-semibold text-slate-900">{review.employee.full_name}</p>
                      <p className="text-sm text-slate-600">
                        {language === 'es' ? 'Próximo review' : 'Next review'}: {format(review.nextReviewDate, 'MMM dd, yyyy', { locale: language === 'es' ? es : undefined })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${review.isDue ? 'text-red-600' : 'text-amber-600'}`}>
                        {review.isDue 
                          ? (language === 'es' ? 'VENCIDO' : 'DUE')
                          : `${review.daysUntilReview} ${language === 'es' ? 'días' : 'days'}`
                        }
                      </p>
                      <Button size="sm" className="mt-1 bg-blue-600 hover:bg-blue-700">
                        {language === 'es' ? 'Iniciar Review' : 'Start Review'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* OVERTIME ALERTS */}
        {overtimeAlerts.length > 0 && (
          <Card className="mb-8 bg-amber-50 border-amber-200 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-900">
                <Clock className="w-5 h-5" />
                {language === 'es' ? 'Alertas de Overtime' : 'Overtime Alerts'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {overtimeAlerts.map(alert => (
                  <div key={alert.employee.email} className="bg-white rounded-lg p-3 border border-amber-300">
                    <div className="flex justify-between items-start mb-2">
                      <p className="font-semibold text-slate-900">{alert.employee.full_name}</p>
                      <div className="text-right">
                        <p className="text-sm text-amber-700 font-semibold">
                          {alert.weeklyOvertime.toFixed(1)}h OT {language === 'es' ? 'esta semana' : 'this week'}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-sm">
                        <p className="text-slate-600">{language === 'es' ? 'Semanal' : 'Weekly'}: {alert.weeklyHours.toFixed(1)}h</p>
                      </div>
                      <div className="text-sm">
                        <p className="text-slate-600">{language === 'es' ? 'Mensual' : 'Monthly'}: {alert.monthlyHours.toFixed(1)}h</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* TIME OFF CALENDAR */}
        <Card className="mb-8 bg-white/90 backdrop-blur-sm shadow-lg border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <Calendar className="w-5 h-5 text-purple-600" />
              {language === 'es' ? 'Calendario de Ausencias (Próximos 30 días)' : 'Time Off Calendar (Next 30 days)'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={timeOffCalendar}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="employeesOff" fill="#8b5cf6" name={language === 'es' ? 'Empleados Fuera' : 'Employees Off'} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* ONBOARDING PROGRESS */}
        {onboardingProgress.length > 0 && (
          <Card className="bg-white/90 backdrop-blur-sm shadow-lg border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <Target className="w-5 h-5 text-blue-600" />
                {language === 'es' ? 'Progreso de Onboarding' : 'Onboarding Progress'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {onboardingProgress.map(onboarding => (
                  <div key={onboarding.employee.email} className="border-b border-slate-200 pb-4 last:border-0">
                    <div className="flex justify-between items-center mb-2">
                      <p className="font-semibold text-slate-900">{onboarding.employee.full_name}</p>
                      <p className="font-bold text-blue-600">{onboarding.progress.toFixed(0)}%</p>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-3">
                      <div 
                        className="h-3 rounded-full bg-blue-500 transition-all"
                        style={{ width: `${onboarding.progress}%` }}
                      />
                    </div>
                    <p className="text-sm text-slate-600 mt-1">
                      {onboarding.completedTasks}/{onboarding.totalTasks} {language === 'es' ? 'tareas completadas' : 'tasks completed'}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
