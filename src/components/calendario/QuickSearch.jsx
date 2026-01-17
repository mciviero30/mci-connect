import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Calendar, Briefcase, User, Clock } from 'lucide-react';
import { format } from 'date-fns';

export default function QuickSearch({ 
  open, 
  onOpenChange, 
  shifts, 
  employees, 
  jobs,
  onShiftSelect,
  language 
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const searchTerm = query.toLowerCase();
    const filtered = shifts.filter(shift => {
      const employee = employees.find(e => e.email === shift.employee_email);
      const job = jobs.find(j => j.id === shift.job_id);
      
      return (
        shift.title?.toLowerCase().includes(searchTerm) ||
        shift.job_name?.toLowerCase().includes(searchTerm) ||
        shift.notes?.toLowerCase().includes(searchTerm) ||
        employee?.full_name?.toLowerCase().includes(searchTerm) ||
        job?.name?.toLowerCase().includes(searchTerm) ||
        shift.date?.includes(searchTerm) ||
        shift.start_time?.includes(searchTerm)
      );
    });

    setResults(filtered.slice(0, 10)); // Limit to 10 results
  }, [query, shifts, employees, jobs]);

  const handleSelect = (shift) => {
    onShiftSelect(shift);
    onOpenChange(false);
    setQuery('');
  };

  const getEmployee = (email) => employees.find(e => e.email === email);
  const getJob = (jobId) => jobs.find(j => j.id === jobId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            {language === 'es' ? 'Búsqueda Rápida' : 'Quick Search'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Input
            placeholder={language === 'es' ? 'Buscar por empleado, trabajo, fecha...' : 'Search by employee, job, date...'}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="text-lg"
            autoFocus
          />

          {results.length > 0 && (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {results.map(shift => {
                const employee = getEmployee(shift.employee_email);
                const job = getJob(shift.job_id);

                return (
                  <div
                    key={shift.id}
                    className="p-3 bg-slate-50 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
                    onClick={() => handleSelect(shift)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="font-semibold text-slate-900 mb-1">
                          {shift.title || shift.job_name || 'Untitled'}
                        </div>
                        
                        <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                          {employee && (
                            <div className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {employee.full_name}
                            </div>
                          )}
                          
                          {shift.date && (
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {format(new Date(shift.date), 'MMM d, yyyy')}
                            </div>
                          )}
                          
                          {shift.start_time && (
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {shift.start_time} - {shift.end_time}
                            </div>
                          )}
                          
                          {job && (
                            <div className="flex items-center gap-1">
                              <Briefcase className="w-3 h-3" />
                              {job.name}
                            </div>
                          )}
                        </div>

                        {shift.notes && (
                          <div className="text-xs text-slate-500 mt-1 line-clamp-1">
                            {shift.notes}
                          </div>
                        )}
                      </div>

                      <Badge variant="outline" className="text-xs">
                        {shift.shift_type === 'job_work' ? (language === 'es' ? 'Trabajo' : 'Work') :
                         shift.shift_type === 'appointment' ? (language === 'es' ? 'Cita' : 'Appt') :
                         (language === 'es' ? 'Ausencia' : 'Off')}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {query.trim() && results.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              {language === 'es' ? 'No se encontraron resultados' : 'No results found'}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}