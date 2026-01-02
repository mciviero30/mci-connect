import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Save } from 'lucide-react';

export default function AdminCommissionForm({ agreement, employees, open, onClose, onSave }) {
  const [formData, setFormData] = useState({
    employee_directory_id: '',
    employee_email: '',
    employee_name: '',
    agreement_type: 'manager_variable_comp',
    base_salary: '',
    commission_rate: '',
    bonus_structure: '',
    effective_date: '',
    end_date: '',
    notes: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [willRequireResign, setWillRequireResign] = useState(false);

  useEffect(() => {
    if (agreement) {
      setFormData({
        employee_directory_id: agreement.employee_directory_id || '',
        employee_email: agreement.employee_email || '',
        employee_name: agreement.employee_name || '',
        agreement_type: agreement.agreement_type || 'manager_variable_comp',
        base_salary: agreement.base_salary?.toString() || '',
        commission_rate: agreement.commission_rate?.toString() || '',
        bonus_structure: agreement.bonus_structure ? JSON.stringify(agreement.bonus_structure, null, 2) : '',
        effective_date: agreement.effective_date || '',
        end_date: agreement.end_date || '',
        notes: agreement.notes || '',
      });

      // Check if editing an active agreement will require re-signing
      if (agreement.status === 'active' && agreement.signed) {
        setWillRequireResign(true);
      }
    } else {
      setFormData({
        employee_directory_id: '',
        employee_email: '',
        employee_name: '',
        agreement_type: 'manager_variable_comp',
        base_salary: '',
        commission_rate: '',
        bonus_structure: '',
        effective_date: '',
        end_date: '',
        notes: '',
      });
      setWillRequireResign(false);
    }
  }, [agreement]);

  const handleEmployeeSelect = (employeeId) => {
    const selectedEmployee = employees.find(e => e.id === employeeId);
    if (selectedEmployee) {
      setFormData({
        ...formData,
        employee_directory_id: selectedEmployee.id,
        employee_email: selectedEmployee.email,
        employee_name: selectedEmployee.full_name || selectedEmployee.email,
      });
    }
  };

  const handleSave = async () => {
    if (!formData.employee_directory_id || !formData.base_salary || !formData.commission_rate) {
      return;
    }

    setIsSaving(true);
    try {
      let bonus_structure = null;
      if (formData.bonus_structure.trim()) {
        try {
          bonus_structure = JSON.parse(formData.bonus_structure);
        } catch (e) {
          alert('Invalid JSON in bonus structure');
          setIsSaving(false);
          return;
        }
      }

      const data = {
        employee_directory_id: formData.employee_directory_id,
        employee_email: formData.employee_email,
        employee_name: formData.employee_name,
        agreement_type: formData.agreement_type,
        base_salary: parseFloat(formData.base_salary),
        commission_rate: parseFloat(formData.commission_rate),
        bonus_structure,
        effective_date: formData.effective_date || null,
        end_date: formData.end_date || null,
        notes: formData.notes,
      };

      // If editing an active agreement, reset to pending
      if (agreement && agreement.status === 'active' && agreement.signed) {
        data.status = 'pending';
        data.signed = false;
        data.signed_date = null;
        data.signed_by_employee = null;
        data.signature_data = null;
      }

      await onSave(data);
      onClose();
    } catch (error) {
      console.error('Failed to save agreement:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {agreement ? 'Edit Commission Agreement' : 'Create Commission Agreement'}
          </DialogTitle>
        </DialogHeader>

        {willRequireResign && (
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertCircle className="w-4 h-4 text-yellow-600" />
            <AlertDescription className="text-yellow-900">
              <strong>Important:</strong> Editing this active agreement will reset its status to pending and require the employee to sign again.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          {/* Employee Selection */}
          {!agreement && (
            <div>
              <Label>Employee *</Label>
              <Select 
                value={formData.employee_directory_id} 
                onValueChange={handleEmployeeSelect}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.full_name || emp.email} ({emp.position || 'No position'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {agreement && (
            <div>
              <Label>Employee</Label>
              <Input value={formData.employee_name} disabled className="bg-slate-100" />
            </div>
          )}

          {/* Agreement Type */}
          <div>
            <Label>Agreement Type *</Label>
            <Select 
              value={formData.agreement_type} 
              onValueChange={(value) => setFormData({...formData, agreement_type: value})}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manager_variable_comp">Manager Variable Compensation</SelectItem>
                <SelectItem value="foreman_variable_comp">Foreman Variable Compensation</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Base Salary */}
          <div>
            <Label>Base Salary (Annual) *</Label>
            <Input
              type="number"
              placeholder="e.g., 75000"
              value={formData.base_salary}
              onChange={(e) => setFormData({...formData, base_salary: e.target.value})}
            />
          </div>

          {/* Commission Rate */}
          <div>
            <Label>Commission Rate (%) *</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="e.g., 2.5"
              value={formData.commission_rate}
              onChange={(e) => setFormData({...formData, commission_rate: e.target.value})}
            />
          </div>

          {/* Bonus Structure */}
          <div>
            <Label>Bonus Structure (JSON, optional)</Label>
            <Textarea
              placeholder='{"tier1": {"threshold": 100000, "bonus": 5000}}'
              value={formData.bonus_structure}
              onChange={(e) => setFormData({...formData, bonus_structure: e.target.value})}
              rows={4}
              className="font-mono text-sm"
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Effective Date</Label>
              <Input
                type="date"
                value={formData.effective_date}
                onChange={(e) => setFormData({...formData, effective_date: e.target.value})}
              />
            </div>
            <div>
              <Label>End Date (optional)</Label>
              <Input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({...formData, end_date: e.target.value})}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label>Internal Notes</Label>
            <Textarea
              placeholder="Internal notes about this agreement..."
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !formData.employee_directory_id || !formData.base_salary || !formData.commission_rate}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {isSaving ? (
              'Saving...'
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {agreement ? 'Update Agreement' : 'Create Agreement'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}