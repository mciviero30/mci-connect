import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  DollarSign, 
  Clock, 
  FileText, 
  CheckCircle, 
  AlertCircle,
  TrendingUp,
  Package,
  Users
} from 'lucide-react';
import { format } from 'date-fns';

const EVENT_TYPES = {
  job_created: { 
    icon: FileText, 
    color: 'bg-blue-500', 
    label: 'Job Created' 
  },
  milestone: { 
    icon: CheckCircle, 
    color: 'bg-purple-500', 
    label: 'Milestone' 
  },
  status_change: { 
    icon: AlertCircle, 
    color: 'bg-amber-500', 
    label: 'Status Update' 
  },
  expense_added: { 
    icon: DollarSign, 
    color: 'bg-red-500', 
    label: 'Expense Added' 
  },
  time_logged: { 
    icon: Clock, 
    color: 'bg-green-500', 
    label: 'Time Logged' 
  },
  inventory_used: { 
    icon: Package, 
    color: 'bg-teal-500', 
    label: 'Inventory Used' 
  },
  team_assigned: { 
    icon: Users, 
    color: 'bg-indigo-500', 
    label: 'Team Assigned' 
  }
};

export default function JobTimeline({ 
  job, 
  timeEntries = [], 
  expenses = [], 
  inventoryTransactions = [],
  assignments = [],
  language = 'en' 
}) {
  // Build timeline events
  const events = [];

  // Job creation
  if (job.created_date) {
    events.push({
      id: `job_created_${job.id}`,
      type: 'job_created',
      date: job.created_date,
      title: language === 'es' ? 'Trabajo Creado' : 'Job Created',
      description: `${language === 'es' ? 'Contrato:' : 'Contract:'} $${(job.contract_amount || 0).toLocaleString()}`
    });
  }

  // Team assignment
  if (job.team_name && job.created_date) {
    events.push({
      id: `team_${job.id}`,
      type: 'team_assigned',
      date: job.created_date,
      title: language === 'es' ? 'Equipo Asignado' : 'Team Assigned',
      description: job.team_name
    });
  }

  // Milestones from assignments
  assignments
    .filter(a => a.event_type === 'job_milestone')
    .forEach(assignment => {
      events.push({
        id: `milestone_${assignment.id}`,
        type: 'milestone',
        date: assignment.date,
        title: assignment.event_title || assignment.job_name,
        description: assignment.notes || '',
        employee: assignment.employee_name
      });
    });

  // Time entries (aggregate by week to avoid clutter)
  const weeklyTimeEntries = timeEntries.reduce((acc, entry) => {
    const weekStart = format(new Date(entry.date), 'yyyy-ww');
    if (!acc[weekStart]) {
      acc[weekStart] = {
        date: entry.date,
        hours: 0,
        employees: new Set()
      };
    }
    acc[weekStart].hours += entry.hours_worked || 0;
    acc[weekStart].employees.add(entry.employee_name);
    return acc;
  }, {});

  Object.values(weeklyTimeEntries).forEach((week, idx) => {
    events.push({
      id: `time_${idx}`,
      type: 'time_logged',
      date: week.date,
      title: language === 'es' ? 'Horas Registradas' : 'Hours Logged',
      description: `${week.hours.toFixed(1)}h ${language === 'es' ? 'por' : 'by'} ${week.employees.size} ${language === 'es' ? 'empleado(s)' : 'employee(s)'}`
    });
  });

  // Significant expenses (> $100)
  expenses
    .filter(exp => exp.amount > 100)
    .forEach(expense => {
      events.push({
        id: `expense_${expense.id}`,
        type: 'expense_added',
        date: expense.date,
        title: `${language === 'es' ? 'Gasto' : 'Expense'}: ${expense.category}`,
        description: `$${expense.amount.toFixed(2)} - ${expense.employee_name}`,
        amount: expense.amount
      });
    });

  // Inventory transactions
  inventoryTransactions.forEach(transaction => {
    events.push({
      id: `inventory_${transaction.id}`,
      type: 'inventory_used',
      date: transaction.created_date,
      title: `${language === 'es' ? 'Inventario' : 'Inventory'}: ${transaction.item_name}`,
      description: `${transaction.type === 'add' ? '+' : '-'}${transaction.quantity} ${language === 'es' ? 'unidades' : 'units'}`
    });
  });

  // Status changes
  if (job.status === 'completed' && job.completed_date) {
    events.push({
      id: `completed_${job.id}`,
      type: 'status_change',
      date: job.completed_date,
      title: language === 'es' ? 'Trabajo Completado' : 'Job Completed',
      description: language === 'es' ? '✅ Proyecto finalizado exitosamente' : '✅ Project completed successfully'
    });
  }

  // Sort events by date (newest first)
  const sortedEvents = events.sort((a, b) => new Date(b.date) - new Date(a.date));

  if (sortedEvents.length === 0) {
    return (
      <Card className="bg-white dark:bg-[#282828] shadow-lg border-slate-200 dark:border-slate-700">
        <CardContent className="p-12 text-center">
          <Calendar className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <p className="text-slate-500 dark:text-slate-400">
            {language === 'es' ? 'No hay eventos registrados aún' : 'No events recorded yet'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white dark:bg-[#282828] shadow-lg border-slate-200 dark:border-slate-700">
      <CardContent className="p-6">
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-[23px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-500 to-blue-200 dark:from-blue-400 dark:to-blue-700"></div>

          {/* Events */}
          <div className="space-y-6">
            {sortedEvents.map((event, idx) => {
              const eventConfig = EVENT_TYPES[event.type];
              const Icon = eventConfig.icon;

              return (
                <div key={event.id} className="relative pl-16">
                  {/* Icon bubble */}
                  <div className={`absolute left-0 ${eventConfig.color} w-12 h-12 rounded-full flex items-center justify-center shadow-lg`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>

                  {/* Event card */}
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 border-l-4 border-blue-500 dark:border-blue-400 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="font-bold text-slate-900 dark:text-white">{event.title}</h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400">{event.description}</p>
                        {event.employee && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            👤 {event.employee}
                          </p>
                        )}
                      </div>
                      <div className="text-right ml-4">
                        <Badge className="bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600">
                          {format(new Date(event.date), 'MMM dd, yyyy')}
                        </Badge>
                        {event.amount && (
                          <p className="text-sm font-bold text-red-600 dark:text-red-400 mt-1">
                            ${event.amount.toFixed(2)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}