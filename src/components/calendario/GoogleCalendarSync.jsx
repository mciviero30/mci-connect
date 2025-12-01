import React, { useState } from 'react';
import { Calendar, Download, Upload, ExternalLink, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { format, parseISO } from 'date-fns';
import { useToast } from '@/components/ui/toast';

export default function GoogleCalendarSync({ 
  open, 
  onOpenChange, 
  shifts,
  onImport,
  language = 'en'
}) {
  const toast = useToast();
  const [exporting, setExporting] = useState(false);

  // Generate ICS file content
  const generateICS = () => {
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//MCI Connect//Shift Calendar//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH'
    ];

    shifts.forEach(shift => {
      if (!shift.date || !shift.start_time || !shift.end_time) return;

      const startDate = shift.date.replace(/-/g, '');
      const endDate = shift.date.replace(/-/g, '');
      const startTime = shift.start_time.replace(':', '') + '00';
      const endTime = shift.end_time.replace(':', '') + '00';

      lines.push('BEGIN:VEVENT');
      lines.push(`DTSTART:${startDate}T${startTime}`);
      lines.push(`DTEND:${endDate}T${endTime}`);
      lines.push(`SUMMARY:${shift.title || shift.job_name || 'Shift'}`);
      lines.push(`DESCRIPTION:${shift.notes || ''}`);
      if (shift.location) {
        lines.push(`LOCATION:${shift.location}`);
      }
      lines.push(`UID:${shift.id}@mciconnect`);
      lines.push('END:VEVENT');
    });

    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
  };

  const handleExport = () => {
    setExporting(true);
    
    try {
      const icsContent = generateICS();
      const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `shifts_${format(new Date(), 'yyyy-MM-dd')}.ics`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success(language === 'es' ? 'Calendario exportado' : 'Calendar exported');
    } catch (error) {
      toast.error(language === 'es' ? 'Error al exportar' : 'Export failed');
    }
    
    setExporting(false);
  };

  const handleGoogleCalendarAdd = (shift) => {
    if (!shift.date || !shift.start_time || !shift.end_time) return;

    const startDateTime = `${shift.date.replace(/-/g, '')}T${shift.start_time.replace(':', '')}00`;
    const endDateTime = `${shift.date.replace(/-/g, '')}T${shift.end_time.replace(':', '')}00`;
    
    const title = encodeURIComponent(shift.title || shift.job_name || 'Shift');
    const details = encodeURIComponent(shift.notes || '');
    const location = encodeURIComponent(shift.location || '');

    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDateTime}/${endDateTime}&details=${details}&location=${location}`;
    
    window.open(url, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
            <Calendar className="w-5 h-5 text-[#3B9FF3]" />
            {language === 'es' ? 'Sincronizar Calendario' : 'Calendar Sync'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Export section */}
          <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-2">
              <Download className="w-4 h-4" />
              {language === 'es' ? 'Exportar Turnos' : 'Export Shifts'}
            </h4>
            <p className="text-sm text-blue-600 dark:text-blue-400 mb-3">
              {language === 'es' 
                ? 'Descarga un archivo .ics compatible con Google Calendar, Outlook, y Apple Calendar.'
                : 'Download an .ics file compatible with Google Calendar, Outlook, and Apple Calendar.'}
            </p>
            <Button
              onClick={handleExport}
              disabled={exporting || shifts.length === 0}
              className="w-full bg-[#3B9FF3]"
            >
              <Download className="w-4 h-4 mr-2" />
              {language === 'es' ? 'Descargar .ICS' : 'Download .ICS'} ({shifts.length} {language === 'es' ? 'turnos' : 'shifts'})
            </Button>
          </div>

          {/* Google Calendar direct add */}
          <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <h4 className="font-medium text-green-800 dark:text-green-300 mb-2 flex items-center gap-2">
              <ExternalLink className="w-4 h-4" />
              {language === 'es' ? 'Agregar a Google Calendar' : 'Add to Google Calendar'}
            </h4>
            <p className="text-sm text-green-600 dark:text-green-400 mb-3">
              {language === 'es' 
                ? 'Agrega turnos individuales directamente a tu Google Calendar.'
                : 'Add individual shifts directly to your Google Calendar.'}
            </p>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {shifts.slice(0, 5).map(shift => (
                <button
                  key={shift.id}
                  onClick={() => handleGoogleCalendarAdd(shift)}
                  className="w-full flex items-center justify-between p-2 rounded bg-white dark:bg-slate-800 border border-green-200 dark:border-green-800 hover:border-green-400 transition-colors text-left"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      {shift.title || shift.job_name || 'Shift'}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {shift.date} • {shift.start_time} - {shift.end_time}
                    </p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-green-500" />
                </button>
              ))}
              {shifts.length > 5 && (
                <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                  +{shifts.length - 5} {language === 'es' ? 'más' : 'more'}
                </p>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p>
              {language === 'es' 
                ? 'Los cambios en aplicaciones externas no se sincronizarán de vuelta automáticamente.'
                : 'Changes in external apps will not sync back automatically.'}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {language === 'es' ? 'Cerrar' : 'Close'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}