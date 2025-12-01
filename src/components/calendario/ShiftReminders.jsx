import React, { useState } from 'react';
import { Bell, Clock, Plus, Trash2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';

const DEFAULT_REMINDERS = [
  { id: '1', minutes_before: 15, enabled: true },
  { id: '2', minutes_before: 60, enabled: false },
  { id: '3', minutes_before: 1440, enabled: false }, // 1 day
];

export default function ShiftReminders({ 
  open, 
  onOpenChange, 
  shiftId,
  existingReminders,
  onSaveReminders,
  language = 'en'
}) {
  const toast = useToast();
  const [reminders, setReminders] = useState(existingReminders || DEFAULT_REMINDERS);

  const getTimeLabel = (minutes) => {
    if (minutes < 60) return `${minutes} ${language === 'es' ? 'minutos' : 'minutes'}`;
    if (minutes < 1440) return `${minutes / 60} ${language === 'es' ? 'hora(s)' : 'hour(s)'}`;
    return `${minutes / 1440} ${language === 'es' ? 'día(s)' : 'day(s)'}`;
  };

  const toggleReminder = (id) => {
    setReminders(prev => 
      prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r)
    );
  };

  const addReminder = () => {
    setReminders(prev => [
      ...prev,
      { id: `custom_${Date.now()}`, minutes_before: 30, enabled: true }
    ]);
  };

  const updateReminder = (id, minutes) => {
    setReminders(prev => 
      prev.map(r => r.id === id ? { ...r, minutes_before: parseInt(minutes) } : r)
    );
  };

  const removeReminder = (id) => {
    setReminders(prev => prev.filter(r => r.id !== id));
  };

  const handleSave = () => {
    onSaveReminders(reminders.filter(r => r.enabled));
    toast.success(language === 'es' ? 'Recordatorios guardados' : 'Reminders saved');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
            <Bell className="w-5 h-5 text-[#3B9FF3]" />
            {language === 'es' ? 'Recordatorios' : 'Reminders'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {reminders.map(reminder => (
            <div
              key={reminder.id}
              className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800"
            >
              <Switch
                checked={reminder.enabled}
                onCheckedChange={() => toggleReminder(reminder.id)}
              />
              <div className="flex-1">
                <Select
                  value={String(reminder.minutes_before)}
                  onValueChange={(v) => updateReminder(reminder.id, v)}
                >
                  <SelectTrigger className="bg-white dark:bg-slate-700 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 {language === 'es' ? 'min' : 'min'}</SelectItem>
                    <SelectItem value="15">15 {language === 'es' ? 'min' : 'min'}</SelectItem>
                    <SelectItem value="30">30 {language === 'es' ? 'min' : 'min'}</SelectItem>
                    <SelectItem value="60">1 {language === 'es' ? 'hora' : 'hour'}</SelectItem>
                    <SelectItem value="120">2 {language === 'es' ? 'horas' : 'hours'}</SelectItem>
                    <SelectItem value="1440">1 {language === 'es' ? 'día' : 'day'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {language === 'es' ? 'antes' : 'before'}
              </span>
              {reminder.id.startsWith('custom_') && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeReminder(reminder.id)}
                  className="h-7 w-7 p-0 text-red-500"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              )}
            </div>
          ))}

          <Button
            variant="outline"
            size="sm"
            onClick={addReminder}
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-1" />
            {language === 'es' ? 'Agregar Recordatorio' : 'Add Reminder'}
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {language === 'es' ? 'Cancelar' : 'Cancel'}
          </Button>
          <Button onClick={handleSave} className="bg-[#3B9FF3]">
            <Save className="w-4 h-4 mr-2" />
            {language === 'es' ? 'Guardar' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}