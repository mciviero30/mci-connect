import React, { useMemo } from 'react';
import { format, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { User, Plus } from 'lucide-react';

export default function WeekResourceView({ employees, assignments, days, onAdd, onSelectAssignment }) {
    
    const assignmentsByEmployeeAndDate = useMemo(() => {
        const grid = {};
        employees.forEach(emp => {
            grid[emp.email] = {};
            days.forEach(day => {
                const dayKey = format(day, 'yyyy-MM-dd');
                grid[emp.email][dayKey] = assignments.filter(a => 
                    a.employee_email === emp.email && isSameDay(new Date(a.date.replace(/-/g, '/')), day)
                );
            });
        });
        return grid;
    }, [employees, assignments, days]);

    if (!employees || employees.length === 0) {
        return <div className="flex items-center justify-center h-full text-slate-500">No hay empleados para mostrar.</div>;
    }

    return (
        <div className="flex-1 overflow-auto border-t">
            <div className="grid min-w-[1200px]" style={{ gridTemplateColumns: `200px repeat(${days.length}, 1fr)` }}>
                {/* Header */}
                <div className="sticky top-0 z-10 p-2 font-semibold text-slate-700 bg-slate-50 border-b border-r">Empleado</div>
                {days.map(day => (
                    <div key={day.toString()} className="sticky top-0 z-10 p-2 text-center font-semibold text-slate-700 bg-slate-50 border-b">
                        <p className="capitalize">{format(day, 'EEE', { locale: es })}</p>
                        <p className="text-2xl font-bold">{format(day, 'd')}</p>
                    </div>
                ))}

                {/* Body */}
                {employees.map(employee => (
                    <React.Fragment key={employee.email}>
                        <div className="flex items-center gap-2 p-2 border-r border-b font-medium text-slate-800 text-sm">
                            <User className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate">{employee.full_name}</span>
                        </div>
                        {days.map(day => {
                            const dayKey = format(day, 'yyyy-MM-dd');
                            const cellAssignments = assignmentsByEmployeeAndDate[employee.email]?.[dayKey] || [];
                            return (
                                <div key={day.toString()} className="relative p-1 border-r border-b min-h-[80px] group">
                                    <Button variant="ghost" size="icon" onClick={() => onAdd(day, employee)} className="absolute top-1 right-1 w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                        <Plus className="w-4 h-4" />
                                    </Button>
                                    <div className="space-y-1">
                                        {cellAssignments.map(a => (
                                            <button 
                                                key={a.id} 
                                                onClick={() => onSelectAssignment(a)} 
                                                className={`w-full text-left p-1.5 rounded-md text-xs truncate bg-${a.job_color}-100 text-${a.job_color}-900 border-l-4 border-${a.job_color}-500 hover:bg-${a.job_color}-200`}
                                            >
                                                <p className="font-bold">{a.start_time} - {a.job_name}</p>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
}