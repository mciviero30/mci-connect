import React, { useState } from 'react';
import { Layout, Plus, Copy, Trash2, Clock, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';

const DEFAULT_TEMPLATES = [
  { id: 'morning', name: 'Morning Shift', start_time: '06:00', end_time: '14:00', shift_type: 'job_work' },
  { id: 'afternoon', name: 'Afternoon Shift', start_time: '14:00', end_time: '22:00', shift_type: 'job_work' },
  { id: 'full_day', name: 'Full Day', start_time: '08:00', end_time: '17:00', shift_type: 'job_work' },
  { id: 'half_day_am', name: 'Half Day (AM)', start_time: '08:00', end_time: '12:00', shift_type: 'job_work' },
  { id: 'half_day_pm', name: 'Half Day (PM)', start_time: '13:00', end_time: '17:00', shift_type: 'job_work' },
  { id: 'meeting', name: '1h Meeting', start_time: '10:00', end_time: '11:00', shift_type: 'appointment' },
];

export default function ShiftTemplates({ 
  open, 
  onOpenChange, 
  onApplyTemplate,
  language = 'en'
}) {
  const toast = useToast();
  const [templates, setTemplates] = useState(() => {
    const saved = localStorage.getItem('shift_templates');
    return saved ? JSON.parse(saved) : DEFAULT_TEMPLATES;
  });
  const [showCreate, setShowCreate] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    start_time: '08:00',
    end_time: '17:00',
    shift_type: 'job_work'
  });

  const saveTemplates = (newTemplates) => {
    setTemplates(newTemplates);
    localStorage.setItem('shift_templates', JSON.stringify(newTemplates));
  };

  const handleCreate = () => {
    if (!newTemplate.name.trim()) {
      toast.error(language === 'es' ? 'Ingresa un nombre' : 'Enter a name');
      return;
    }

    const template = {
      ...newTemplate,
      id: `custom_${Date.now()}`
    };

    saveTemplates([...templates, template]);
    setNewTemplate({ name: '', start_time: '08:00', end_time: '17:00', shift_type: 'job_work' });
    setShowCreate(false);
    toast.success(language === 'es' ? 'Plantilla creada' : 'Template created');
  };

  const handleDelete = (id) => {
    saveTemplates(templates.filter(t => t.id !== id));
    toast.success(language === 'es' ? 'Plantilla eliminada' : 'Template deleted');
  };

  const handleApply = (template) => {
    onApplyTemplate(template);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
            <Layout className="w-5 h-5 text-[#3B9FF3]" />
            {language === 'es' ? 'Plantillas de Turnos' : 'Shift Templates'}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-96">
          <div className="space-y-2 py-4">
            {templates.map(template => (
              <div
                key={template.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 dark:text-white text-sm">
                    {template.name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {template.start_time} - {template.end_time}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleApply(template)}
                  className="h-8 text-[#3B9FF3]"
                >
                  <Copy className="w-4 h-4" />
                </Button>
                {template.id.startsWith('custom_') && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(template.id)}
                    className="h-8 text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        {showCreate ? (
          <div className="space-y-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <Input
              placeholder={language === 'es' ? 'Nombre de la plantilla' : 'Template name'}
              value={newTemplate.name}
              onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
              className="bg-white dark:bg-slate-800"
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">{language === 'es' ? 'Inicio' : 'Start'}</Label>
                <Input
                  type="time"
                  value={newTemplate.start_time}
                  onChange={(e) => setNewTemplate({ ...newTemplate, start_time: e.target.value })}
                  className="bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <Label className="text-xs">{language === 'es' ? 'Fin' : 'End'}</Label>
                <Input
                  type="time"
                  value={newTemplate.end_time}
                  onChange={(e) => setNewTemplate({ ...newTemplate, end_time: e.target.value })}
                  className="bg-white dark:bg-slate-800"
                />
              </div>
            </div>
            <Select 
              value={newTemplate.shift_type} 
              onValueChange={(v) => setNewTemplate({ ...newTemplate, shift_type: v })}
            >
              <SelectTrigger className="bg-white dark:bg-slate-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="job_work">{language === 'es' ? 'Trabajo' : 'Job Work'}</SelectItem>
                <SelectItem value="appointment">{language === 'es' ? 'Cita' : 'Appointment'}</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowCreate(false)} className="flex-1">
                {language === 'es' ? 'Cancelar' : 'Cancel'}
              </Button>
              <Button size="sm" onClick={handleCreate} className="flex-1 bg-[#3B9FF3]">
                <Save className="w-3 h-3 mr-1" />
                {language === 'es' ? 'Guardar' : 'Save'}
              </Button>
            </div>
          </div>
        ) : (
          <Button onClick={() => setShowCreate(true)} className="w-full bg-[#3B9FF3]">
            <Plus className="w-4 h-4 mr-2" />
            {language === 'es' ? 'Nueva Plantilla' : 'New Template'}
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}