
import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import PageHeader from "../components/shared/PageHeader";
import { Briefcase, Calendar, Package, Users, FileText, Image, DollarSign, Plus, Edit, Trash2 } from "lucide-react";
import { useLanguage } from "@/components/i18n/LanguageContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function JobsAdvanced() {
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();
  const toast = useToast();

  const [milestoneDialog, setMilestoneDialog] = useState(false);
  const [changeOrderDialog, setChangeOrderDialog] = useState(false);
  const [materialDialog, setMaterialDialog] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);

  // Fetch data
  const { data: jobs } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => base44.entities.Job.list(),
    initialData: []
  });

  const { data: timeEntries } = useQuery({
    queryKey: ['timeEntries'],
    queryFn: () => base44.entities.TimeEntry.list(),
    initialData: []
  });

  const { data: expenses } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => base44.entities.Expense.list(),
    initialData: []
  });

  const { data: invoices } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => base44.entities.Invoice.list(),
    initialData: []
  });

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.User.list(),
    initialData: []
  });

  // NEW ENTITIES - would need to be created
  // For demo purposes, using localStorage simulation
  const [jobMilestones, setJobMilestones] = useState(() => {
    const saved = localStorage.getItem('jobMilestones');
    return saved ? JSON.parse(saved) : [];
  });

  const [changeOrders, setChangeOrders] = useState(() => {
    const saved = localStorage.getItem('changeOrders');
    return saved ? JSON.parse(saved) : [];
  });

  const [materials, setMaterials] = useState(() => {
    const saved = localStorage.getItem('materials');
    return saved ? JSON.parse(saved) : [];
  });

  // 17. JOB TIMELINE - Calculated from milestones
  const jobTimelines = useMemo(() => {
    return jobs.filter(j => j.status === 'active').map(job => {
      const jobMilestonesList = jobMilestones.filter(m => m.job_id === job.id);
      const totalMilestones = jobMilestonesList.length;
      const completedMilestones = jobMilestonesList.filter(m => m.completed).length;
      const progress = totalMilestones > 0 ? (completedMilestones / totalMilestones * 100) : 0;
      
      return {
        ...job,
        milestones: jobMilestonesList,
        totalMilestones,
        completedMilestones,
        progress
      };
    });
  }, [jobs, jobMilestones]);

  // 19. CHANGE ORDERS
  const jobChangeOrders = useMemo(() => {
    return jobs.map(job => ({
      ...job,
      changeOrders: changeOrders.filter(co => co.job_id === job.id),
      totalChangeOrderValue: changeOrders
        .filter(co => co.job_id === job.id && co.status === 'approved')
        .reduce((sum, co) => sum + (co.amount || 0), 0)
    }));
  }, [jobs, changeOrders]);

  // 22. MATERIALS TRACKING
  const jobMaterials = useMemo(() => {
    return jobs.map(job => ({
      ...job,
      materials: materials.filter(m => m.job_id === job.id),
      totalMaterialsCost: materials
        .filter(m => m.job_id === job.id)
        .reduce((sum, m) => sum + (m.cost || 0), 0)
    }));
  }, [jobs, materials]);

  // 24. REAL-TIME JOB COSTING
  const realTimeJobCosts = useMemo(() => {
    return jobs.filter(j => j.status === 'active').map(job => {
      const jobExpenses = expenses.filter(e => e.job_id === job.id);
      const jobTimeEntries = timeEntries.filter(t => t.job_id === job.id);
      const jobMaterialsList = materials.filter(m => m.job_id === job.id);
      
      const expensesCost = jobExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
      const laborCost = jobTimeEntries.reduce((sum, t) => {
        const emp = employees.find(e => e.email === t.employee_email);
        return sum + ((t.hours_worked || 0) * (emp?.hourly_rate || 25));
      }, 0);
      const materialsCost = jobMaterialsList.reduce((sum, m) => sum + (m.cost || 0), 0);
      
      const totalCost = expensesCost + laborCost + materialsCost;
      const budget = job.contract_amount || 0;
      const variance = budget - totalCost;
      
      return {
        ...job,
        expensesCost,
        laborCost,
        materialsCost,
        totalCost,
        budget,
        variance,
        costBreakdown: {
          labor: laborCost,
          materials: materialsCost,
          expenses: expensesCost
        }
      };
    }).sort((a, b) => a.variance - b.variance);
  }, [jobs, expenses, timeEntries, materials, employees]);

  // Add Milestone
  const addMilestone = (milestoneData) => {
    const newMilestone = {
      id: Date.now().toString(),
      ...milestoneData,
      completed: false,
      created_date: new Date().toISOString()
    };
    
    const updated = [...jobMilestones, newMilestone];
    setJobMilestones(updated);
    localStorage.setItem('jobMilestones', JSON.stringify(updated));
    toast.success(language === 'es' ? 'Hito agregado' : 'Milestone added');
    setMilestoneDialog(false);
  };

  // Add Change Order
  const addChangeOrder = (coData) => {
    const newCO = {
      id: Date.now().toString(),
      ...coData,
      status: 'pending',
      created_date: new Date().toISOString()
    };
    
    const updated = [...changeOrders, newCO];
    setChangeOrders(updated);
    localStorage.setItem('changeOrders', JSON.stringify(updated));
    toast.success(language === 'es' ? 'Change order agregado' : 'Change order added');
    setChangeOrderDialog(false);
  };

  // Add Material
  const addMaterial = (materialData) => {
    const newMaterial = {
      id: Date.now().toString(),
      ...materialData,
      created_date: new Date().toISOString()
    };
    
    const updated = [...materials, newMaterial];
    setMaterials(updated);
    localStorage.setItem('materials', JSON.stringify(updated));
    toast.success(language === 'es' ? 'Material agregado' : 'Material added');
    setMaterialDialog(false);
  };

  return (
    <div className="p-4 md:p-8 min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title={language === 'es' ? "Gestión Avanzada de Proyectos" : "Advanced Job Management"}
          description={language === 'es' ? "Timeline, hitos, change orders, materiales y costos en tiempo real" : "Timeline, milestones, change orders, materials, and real-time costing"}
          icon={Briefcase}
        />

        {/* SUMMARY CARDS */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-white text-sm font-medium">
                  {language === 'es' ? 'Total Hitos' : 'Total Milestones'}
                </p>
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <p className="text-3xl font-bold text-white">{jobMilestones.length}</p>
              <p className="text-white text-xs mt-1">
                {jobMilestones.filter(m => m.completed).length} {language === 'es' ? 'completados' : 'completed'}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-white text-sm font-medium">
                  {language === 'es' ? 'Change Orders' : 'Change Orders'}
                </p>
                <FileText className="w-5 h-5 text-white" />
              </div>
              <p className="text-3xl font-bold text-white">{changeOrders.length}</p>
              <p className="text-white text-xs mt-1">
                ${changeOrders.filter(co => co.status === 'approved').reduce((sum, co) => sum + (co.amount || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 0 })}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-white text-sm font-medium">
                  {language === 'es' ? 'Materiales' : 'Materials'}
                </p>
                <Package className="w-5 h-5 text-white" />
              </div>
              <p className="text-3xl font-bold text-white">{materials.length}</p>
              <p className="text-white text-xs mt-1">
                ${materials.reduce((sum, m) => sum + (m.cost || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 0 })}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* REAL-TIME JOB COSTING */}
        <Card className="mb-8 bg-white/90 backdrop-blur-sm shadow-lg border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <DollarSign className="w-5 h-5 text-green-600" />
              {language === 'es' ? 'Costos en Tiempo Real' : 'Real-Time Job Costing'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {realTimeJobCosts.map(job => (
                <div key={job.id} className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-semibold text-slate-900">{job.name}</h4>
                      <p className="text-sm text-slate-600">
                        Budget: ${job.budget.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg text-slate-900">
                        ${job.totalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </p>
                      <p className={`text-sm font-semibold ${job.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {job.variance >= 0 ? '+' : ''}${job.variance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div className="bg-white rounded p-2 border border-slate-200">
                      <p className="text-xs text-slate-600">{language === 'es' ? 'Labor' : 'Labor'}</p>
                      <p className="font-semibold text-blue-600">
                        ${job.laborCost.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                      </p>
                    </div>
                    <div className="bg-white rounded p-2 border border-slate-200">
                      <p className="text-xs text-slate-600">{language === 'es' ? 'Materiales' : 'Materials'}</p>
                      <p className="font-semibold text-green-600">
                        ${job.materialsCost.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                      </p>
                    </div>
                    <div className="bg-white rounded p-2 border border-slate-200">
                      <p className="text-xs text-slate-600">{language === 'es' ? 'Gastos' : 'Expenses'}</p>
                      <p className="font-semibold text-amber-600">
                        ${job.expensesCost.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                      </p>
                    </div>
                  </div>

                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${job.variance >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                      style={{ width: `${Math.min((job.totalCost / job.budget) * 100, 100)}%` }}
                    />
                  </div>

                  <div className="flex gap-2 mt-3">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        setSelectedJob(job);
                        setMilestoneDialog(true);
                      }}
                      className="flex-1 text-slate-700"
                    >
                      <Calendar className="w-3 h-3 mr-1" />
                      {language === 'es' ? 'Hito' : 'Milestone'}
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        setSelectedJob(job);
                        setChangeOrderDialog(true);
                      }}
                      className="flex-1 text-slate-700"
                    >
                      <FileText className="w-3 h-3 mr-1" />
                      Change Order
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        setSelectedJob(job);
                        setMaterialDialog(true);
                      }}
                      className="flex-1 text-slate-700"
                    >
                      <Package className="w-3 h-3 mr-1" />
                      {language === 'es' ? 'Material' : 'Material'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* JOB TIMELINES */}
        <Card className="bg-white/90 backdrop-blur-sm shadow-lg border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <Calendar className="w-5 h-5 text-blue-600" />
              {language === 'es' ? 'Timeline de Proyectos' : 'Job Timelines'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {jobTimelines.map(job => (
                <div key={job.id} className="border-b border-slate-200 pb-6 last:border-0">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-semibold text-slate-900">{job.name}</h4>
                      <p className="text-sm text-slate-600">
                        {job.completedMilestones}/{job.totalMilestones} {language === 'es' ? 'hitos completados' : 'milestones completed'}
                      </p>
                    </div>
                    <p className="font-bold text-blue-600">{job.progress.toFixed(0)}%</p>
                  </div>

                  <div className="w-full bg-slate-200 rounded-full h-3 mb-3">
                    <div 
                      className="h-3 rounded-full bg-blue-500 transition-all"
                      style={{ width: `${job.progress}%` }}
                    />
                  </div>

                  {job.milestones.length > 0 && (
                    <div className="space-y-2 mt-3">
                      {job.milestones.map(milestone => (
                        <div 
                          key={milestone.id} 
                          className={`flex items-center gap-2 p-2 rounded ${
                            milestone.completed ? 'bg-green-50 text-green-900' : 'bg-slate-50 text-slate-700'
                          }`}
                        >
                          <input 
                            type="checkbox" 
                            checked={milestone.completed}
                            onChange={() => {
                              const updated = jobMilestones.map(m => 
                                m.id === milestone.id ? { ...m, completed: !m.completed } : m
                              );
                              setJobMilestones(updated);
                              localStorage.setItem('jobMilestones', JSON.stringify(updated));
                            }}
                            className="w-4 h-4"
                          />
                          <span className="text-sm flex-1">{milestone.name}</span>
                          {milestone.due_date && (
                            <span className="text-xs text-slate-600">
                              {format(new Date(milestone.due_date), 'MMM dd', { locale: language === 'es' ? es : undefined })}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* MILESTONE DIALOG */}
        <Dialog open={milestoneDialog} onOpenChange={setMilestoneDialog}>
          <DialogContent className="bg-white">
            <DialogHeader>
              <DialogTitle className="text-slate-900">{language === 'es' ? 'Agregar Hito' : 'Add Milestone'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              addMilestone({
                job_id: selectedJob?.id,
                job_name: selectedJob?.name,
                name: formData.get('name'),
                description: formData.get('description'),
                due_date: formData.get('due_date')
              });
            }}>
              <div className="space-y-4 py-4">
                <div>
                  <Label className="text-slate-700">{language === 'es' ? 'Nombre' : 'Name'}</Label>
                  <Input name="name" required className="text-slate-900" />
                </div>
                <div>
                  <Label className="text-slate-700">{language === 'es' ? 'Descripción' : 'Description'}</Label>
                  <Textarea name="description" className="text-slate-900" />
                </div>
                <div>
                  <Label className="text-slate-700">{language === 'es' ? 'Fecha límite' : 'Due Date'}</Label>
                  <Input name="due_date" type="date" className="text-slate-900" />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setMilestoneDialog(false)}>
                  {t('cancel')}
                </Button>
                <Button type="submit">{t('save')}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* CHANGE ORDER DIALOG */}
        <Dialog open={changeOrderDialog} onOpenChange={setChangeOrderDialog}>
          <DialogContent className="bg-white">
            <DialogHeader>
              <DialogTitle className="text-slate-900">{language === 'es' ? 'Agregar Change Order' : 'Add Change Order'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              addChangeOrder({
                job_id: selectedJob?.id,
                job_name: selectedJob?.name,
                description: formData.get('description'),
                amount: parseFloat(formData.get('amount')),
                reason: formData.get('reason')
              });
            }}>
              <div className="space-y-4 py-4">
                <div>
                  <Label className="text-slate-700">{language === 'es' ? 'Descripción' : 'Description'}</Label>
                  <Input name="description" required className="text-slate-900" />
                </div>
                <div>
                  <Label className="text-slate-700">{language === 'es' ? 'Monto' : 'Amount'}</Label>
                  <Input name="amount" type="number" step="0.01" required className="text-slate-900" />
                </div>
                <div>
                  <Label className="text-slate-700">{language === 'es' ? 'Razón' : 'Reason'}</Label>
                  <Textarea name="reason" className="text-slate-900" />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setChangeOrderDialog(false)}>
                  {t('cancel')}
                </Button>
                <Button type="submit">{t('save')}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* MATERIAL DIALOG */}
        <Dialog open={materialDialog} onOpenChange={setMaterialDialog}>
          <DialogContent className="bg-white">
            <DialogHeader>
              <DialogTitle className="text-slate-900">{language === 'es' ? 'Agregar Material' : 'Add Material'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              addMaterial({
                job_id: selectedJob?.id,
                job_name: selectedJob?.name,
                name: formData.get('name'),
                quantity: parseFloat(formData.get('quantity')),
                unit: formData.get('unit'),
                cost: parseFloat(formData.get('cost'))
              });
            }}>
              <div className="space-y-4 py-4">
                <div>
                  <Label className="text-slate-700">{language === 'es' ? 'Nombre' : 'Name'}</Label>
                  <Input name="name" required className="text-slate-900" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-700">{language === 'es' ? 'Cantidad' : 'Quantity'}</Label>
                    <Input name="quantity" type="number" step="0.01" required className="text-slate-900" />
                  </div>
                  <div>
                    <Label className="text-slate-700">{language === 'es' ? 'Unidad' : 'Unit'}</Label>
                    <Input name="unit" placeholder="ft, sqft, etc" required className="text-slate-900" />
                  </div>
                </div>
                <div>
                  <Label className="text-slate-700">{language === 'es' ? 'Costo' : 'Cost'}</Label>
                  <Input name="cost" type="number" step="0.01" required className="text-slate-900" />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setMaterialDialog(false)}>
                  {t('cancel')}
                </Button>
                <Button type="submit">{t('save')}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
