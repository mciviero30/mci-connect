import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { 
  Plus, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  Trash2,
  Receipt
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const categoryLabels = {
  labor: 'Mano de Obra',
  materials: 'Materiales',
  equipment: 'Equipos',
  subcontractor: 'Subcontratistas',
  permits: 'Permisos',
  other: 'Otros',
};

const categoryColors = {
  labor: 'bg-blue-500',
  materials: 'bg-amber-500',
  equipment: 'bg-purple-500',
  subcontractor: 'bg-green-500',
  permits: 'bg-red-500',
  other: 'bg-slate-500',
};

export default function FieldBudgetView({ jobId }) {
  const [showAddBudget, setShowAddBudget] = useState(false);
  const [showAddCost, setShowAddCost] = useState(false);
  const [selectedBudgetId, setSelectedBudgetId] = useState(null);
  const [newBudget, setNewBudget] = useState({ category: 'materials', name: '', budgeted_amount: '' });
  const [newCost, setNewCost] = useState({ category: 'materials', description: '', amount: '', vendor: '' });

  const queryClient = useQueryClient();

  const { data: budgets = [] } = useQuery({
    queryKey: ['project-budgets', jobId],
    queryFn: () => base44.entities.ProjectBudget.filter({ job_id: jobId }),
  });

  const { data: costs = [] } = useQuery({
    queryKey: ['project-costs', jobId],
    queryFn: () => base44.entities.ProjectCost.filter({ job_id: jobId }, '-created_date'),
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const createBudgetMutation = useMutation({
    mutationFn: (data) => base44.entities.ProjectBudget.create({ ...data, job_id: jobId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-budgets', jobId] });
      setShowAddBudget(false);
      setNewBudget({ category: 'materials', name: '', budgeted_amount: '' });
    },
  });

  const createCostMutation = useMutation({
    mutationFn: (data) => base44.entities.ProjectCost.create({
      ...data,
      job_id: jobId,
      budget_id: selectedBudgetId,
      recorded_by_email: user?.email,
      recorded_by_name: user?.full_name,
      date: new Date().toISOString().split('T')[0],
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-costs', jobId] });
      queryClient.invalidateQueries({ queryKey: ['project-budgets', jobId] });
      setShowAddCost(false);
      setNewCost({ category: 'materials', description: '', amount: '', vendor: '' });
    },
  });

  // Calculate totals
  const totalBudgeted = budgets.reduce((acc, b) => acc + (b.budgeted_amount || 0), 0);
  const totalSpent = costs.reduce((acc, c) => acc + (c.amount || 0), 0);
  const remaining = totalBudgeted - totalSpent;
  const percentUsed = totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0;

  // Group costs by category
  const costsByCategory = costs.reduce((acc, cost) => {
    acc[cost.category] = (acc[cost.category] || 0) + cost.amount;
    return acc;
  }, {});

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#D4C85C]">Presupuesto</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowAddBudget(true)}
            className="border-slate-700 text-slate-300"
          >
            <Plus className="w-4 h-4 mr-2" />
            Categoría
          </Button>
          <Button
            onClick={() => setShowAddCost(true)}
            className="bg-amber-500 hover:bg-amber-600"
          >
            <Receipt className="w-4 h-4 mr-2" />
            Registrar Gasto
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 uppercase">Presupuesto Total</p>
              <p className="text-2xl font-bold text-white mt-1">
                ${totalBudgeted.toLocaleString()}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-blue-400 opacity-50" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-500/20 to-amber-600/20 border border-amber-500/30 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 uppercase">Gastado</p>
              <p className="text-2xl font-bold text-white mt-1">
                ${totalSpent.toLocaleString()}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-amber-400 opacity-50" />
          </div>
          <Progress value={percentUsed} className="mt-3 h-2" />
          <p className="text-xs text-slate-400 mt-1">{percentUsed.toFixed(1)}% utilizado</p>
        </div>

        <div className={`bg-gradient-to-br ${
          remaining >= 0 
            ? 'from-green-500/20 to-green-600/20 border-green-500/30' 
            : 'from-red-500/20 to-red-600/20 border-red-500/30'
        } border rounded-xl p-5`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 uppercase">Restante</p>
              <p className={`text-2xl font-bold mt-1 ${remaining >= 0 ? 'text-white' : 'text-red-400'}`}>
                ${Math.abs(remaining).toLocaleString()}
                {remaining < 0 && ' (excedido)'}
              </p>
            </div>
            {remaining >= 0 ? (
              <TrendingDown className="w-8 h-8 text-green-400 opacity-50" />
            ) : (
              <AlertTriangle className="w-8 h-8 text-red-400 opacity-50" />
            )}
          </div>
        </div>
      </div>

      {/* Budget Categories */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <h3 className="font-semibold text-white mb-4">Por Categoría</h3>
          <div className="space-y-3">
            {budgets.map(budget => {
              const spent = costsByCategory[budget.category] || 0;
              const percent = budget.budgeted_amount > 0 ? (spent / budget.budgeted_amount) * 100 : 0;
              const isOver = percent > 100;

              return (
                <div key={budget.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${categoryColors[budget.category]}`} />
                      <span className="text-sm text-white">{budget.name || categoryLabels[budget.category]}</span>
                    </div>
                    <div className="text-right">
                      <span className={`text-sm ${isOver ? 'text-red-400' : 'text-white'}`}>
                        ${spent.toLocaleString()}
                      </span>
                      <span className="text-sm text-slate-500">
                        {' / $'}{budget.budgeted_amount.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <Progress 
                    value={Math.min(percent, 100)} 
                    className={`h-2 ${isOver ? '[&>div]:bg-red-500' : ''}`} 
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Costs */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <h3 className="font-semibold text-white mb-4">Gastos Recientes</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {costs.slice(0, 10).map(cost => (
              <div key={cost.id} className="flex items-center justify-between p-2 bg-slate-900/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${categoryColors[cost.category]}`} />
                  <div>
                    <p className="text-sm text-white">{cost.description}</p>
                    <p className="text-xs text-slate-500">{cost.vendor}</p>
                  </div>
                </div>
                <span className="text-sm font-medium text-amber-400">
                  ${cost.amount.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add Budget Dialog */}
      <Dialog open={showAddBudget} onOpenChange={setShowAddBudget}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Añadir Categoría de Presupuesto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label className="text-slate-300">Categoría</Label>
              <Select value={newBudget.category} onValueChange={(v) => setNewBudget({ ...newBudget, category: v })}>
                <SelectTrigger className="mt-1.5 bg-slate-800 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {Object.entries(categoryLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key} className="text-white">{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-slate-300">Nombre (opcional)</Label>
              <Input
                value={newBudget.name}
                onChange={(e) => setNewBudget({ ...newBudget, name: e.target.value })}
                placeholder="Ej: Materiales eléctricos"
                className="mt-1.5 bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div>
              <Label className="text-slate-300">Monto Presupuestado</Label>
              <Input
                type="number"
                value={newBudget.budgeted_amount}
                onChange={(e) => setNewBudget({ ...newBudget, budgeted_amount: e.target.value })}
                placeholder="0.00"
                className="mt-1.5 bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowAddBudget(false)} className="border-slate-700">
                Cancelar
              </Button>
              <Button
                onClick={() => createBudgetMutation.mutate({
                  ...newBudget,
                  budgeted_amount: parseFloat(newBudget.budgeted_amount) || 0,
                })}
                disabled={!newBudget.budgeted_amount}
                className="bg-amber-500 hover:bg-amber-600"
              >
                Añadir
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Cost Dialog */}
      <Dialog open={showAddCost} onOpenChange={setShowAddCost}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Registrar Gasto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label className="text-slate-300">Categoría</Label>
              <Select value={newCost.category} onValueChange={(v) => setNewCost({ ...newCost, category: v })}>
                <SelectTrigger className="mt-1.5 bg-slate-800 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {Object.entries(categoryLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key} className="text-white">{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-slate-300">Descripción</Label>
              <Input
                value={newCost.description}
                onChange={(e) => setNewCost({ ...newCost, description: e.target.value })}
                placeholder="Ej: Compra de cables"
                className="mt-1.5 bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div>
              <Label className="text-slate-300">Monto</Label>
              <Input
                type="number"
                value={newCost.amount}
                onChange={(e) => setNewCost({ ...newCost, amount: e.target.value })}
                placeholder="0.00"
                className="mt-1.5 bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div>
              <Label className="text-slate-300">Proveedor</Label>
              <Input
                value={newCost.vendor}
                onChange={(e) => setNewCost({ ...newCost, vendor: e.target.value })}
                placeholder="Ej: Home Depot"
                className="mt-1.5 bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowAddCost(false)} className="border-slate-700">
                Cancelar
              </Button>
              <Button
                onClick={() => createCostMutation.mutate({
                  ...newCost,
                  amount: parseFloat(newCost.amount) || 0,
                })}
                disabled={!newCost.description || !newCost.amount}
                className="bg-amber-500 hover:bg-amber-600"
              >
                Registrar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}