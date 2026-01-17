import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, FileSpreadsheet } from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

export default function ExportCalendar({ 
  open, 
  onOpenChange, 
  shifts, 
  employees,
  jobs,
  currentDate,
  language 
}) {
  const [exportRange, setExportRange] = useState('week');
  const [exportFormat, setExportFormat] = useState('csv');

  const handleExport = () => {
    let filteredShifts = [...shifts];
    
    // Filter by date range
    if (exportRange === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = endOfWeek(currentDate, { weekStartsOn: 1 });
      filteredShifts = filteredShifts.filter(s => {
        const date = new Date(s.date);
        return date >= start && date <= end;
      });
    } else if (exportRange === 'month') {
      const start = startOfMonth(currentDate);
      const end = endOfMonth(currentDate);
      filteredShifts = filteredShifts.filter(s => {
        const date = new Date(s.date);
        return date >= start && date <= end;
      });
    }

    // Sort by date and employee
    filteredShifts.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return (a.employee_name || '').localeCompare(b.employee_name || '');
    });

    // Generate CSV
    const headers = [
      'Date',
      'Employee',
      'Job/Title',
      'Start Time',
      'End Time',
      'Hours',
      'Type',
      'Status',
      'Notes'
    ];

    const rows = filteredShifts.map(shift => {
      const employee = employees.find(e => e.email === shift.employee_email);
      const job = jobs.find(j => j.id === shift.job_id);
      
      let hours = 0;
      if (shift.start_time && shift.end_time) {
        const [startH, startM] = shift.start_time.split(':').map(Number);
        const [endH, endM] = shift.end_time.split(':').map(Number);
        hours = (endH * 60 + endM - startH * 60 - startM) / 60;
      }

      return [
        shift.date || '',
        employee?.full_name || shift.employee_name || '',
        shift.job_name || shift.title || job?.name || '',
        shift.start_time || '',
        shift.end_time || '',
        hours.toFixed(2),
        shift.shift_type || '',
        shift.status || '',
        shift.notes || ''
      ];
    });

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `calendar_export_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            {language === 'es' ? 'Exportar Calendario' : 'Export Calendar'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>{language === 'es' ? 'Rango' : 'Range'}</Label>
            <Select value={exportRange} onValueChange={setExportRange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">
                  {language === 'es' ? 'Esta Semana' : 'This Week'}
                </SelectItem>
                <SelectItem value="month">
                  {language === 'es' ? 'Este Mes' : 'This Month'}
                </SelectItem>
                <SelectItem value="all">
                  {language === 'es' ? 'Todos los Turnos' : 'All Shifts'}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{language === 'es' ? 'Formato' : 'Format'}</Label>
            <Select value={exportFormat} onValueChange={setExportFormat}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV (Excel)</SelectItem>
                <SelectItem value="xlsx" disabled>
                  XLSX {language === 'es' ? '(Próximamente)' : '(Coming Soon)'}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded">
            {language === 'es' 
              ? `Se exportarán ${shifts.length} turnos en formato ${exportFormat.toUpperCase()}`
              : `${shifts.length} shifts will be exported in ${exportFormat.toUpperCase()} format`}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {language === 'es' ? 'Cancelar' : 'Cancel'}
          </Button>
          <Button onClick={handleExport} className="bg-green-600 hover:bg-green-700">
            <Download className="w-4 h-4 mr-2" />
            {language === 'es' ? 'Exportar' : 'Export'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}