import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { 
  ArrowRight, 
  CheckCircle2, 
  Clock,
  Factory,
  PackageCheck,
  ShieldCheck,
  Wrench
} from 'lucide-react';
import { 
  changeProductionStatus, 
  getNextStatuses, 
  getStatusBadgeProps,
  PRODUCTION_STATUS 
} from './FactoryProductionLifecycle';
import { validateProductionGate, requiresGateValidation } from './FactoryValidationGates';

export default function ProductionStatusControl({ dimensionSet, onStatusChanged }) {
  const [changingStatus, setChangingStatus] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [notes, setNotes] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const currentStatus = dimensionSet.production_status || PRODUCTION_STATUS.PENDING;
  const currentBadge = getStatusBadgeProps(currentStatus);
  const nextStatuses = getNextStatuses(currentStatus);
  
  const handleStatusChange = async () => {
    if (!selectedStatus) return;
    
    // Validate gates if required
    if (requiresGateValidation(selectedStatus)) {
      const validation = await validateProductionGate(dimensionSet.id, selectedStatus);
      
      if (!validation.passed) {
        const errorList = validation.errors.join('\n• ');
        alert(
          `❌ PRODUCTION GATE BLOCKED\n\n` +
          `Cannot advance to ${getStatusBadgeProps(selectedStatus).label}\n\n` +
          `Failures:\n• ${errorList}\n\n` +
          `All validation checks must pass before fabrication can begin.`
        );
        setChangingStatus(false);
        return;
      }
      
      if (validation.warnings.length > 0) {
        const proceed = confirm(
          `⚠️ VALIDATION WARNINGS\n\n` +
          validation.warnings.join('\n• ') +
          `\n\nDo you want to proceed?`
        );
        
        if (!proceed) {
          setChangingStatus(false);
          return;
        }
      }
    }
    
    setChangingStatus(true);
    try {
      const user = await base44.auth.me();
      
      await changeProductionStatus(
        dimensionSet.id,
        selectedStatus,
        user,
        notes
      );
      
      setDialogOpen(false);
      setNotes('');
      setSelectedStatus(null);
      
      if (onStatusChanged) {
        onStatusChanged();
      }
      
    } catch (error) {
      console.error('Failed to change status:', error);
      alert('Failed to change status: ' + error.message);
    } finally {
      setChangingStatus(false);
    }
  };
  
  const getStatusIcon = (status) => {
    switch (status) {
      case PRODUCTION_STATUS.APPROVED_FOR_PRODUCTION:
        return <CheckCircle2 className="w-4 h-4" />;
      case PRODUCTION_STATUS.IN_FABRICATION:
        return <Factory className="w-4 h-4" />;
      case PRODUCTION_STATUS.FABRICATED:
        return <PackageCheck className="w-4 h-4" />;
      case PRODUCTION_STATUS.QC_CHECKED:
        return <ShieldCheck className="w-4 h-4" />;
      case PRODUCTION_STATUS.READY_FOR_INSTALL:
        return <Wrench className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Production Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Current Status */}
          <div className="flex items-center gap-3">
            <Badge className={currentBadge.className + ' text-base px-4 py-2'}>
              {getStatusIcon(currentStatus)}
              <span className="ml-2">{currentBadge.label}</span>
            </Badge>
          </div>
          
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {currentBadge.description}
          </p>
          
          {/* Status Change Dialog */}
          {nextStatuses.length > 0 && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full">
                  <ArrowRight className="w-4 h-4 mr-2" />
                  Advance Status
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Change Production Status</DialogTitle>
                  <DialogDescription>
                    Select the next status for this dimension set
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div className="grid gap-2">
                    {nextStatuses.map(status => {
                      const badge = getStatusBadgeProps(status);
                      return (
                        <button
                          key={status}
                          onClick={() => setSelectedStatus(status)}
                          className={`p-4 rounded-lg border-2 text-left transition-all ${
                            selectedStatus === status
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
                              : 'border-slate-200 hover:border-slate-300 dark:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {getStatusIcon(status)}
                            <div>
                              <div className="font-semibold">{badge.label}</div>
                              <div className="text-xs text-slate-600 dark:text-slate-400">
                                {badge.description}
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  
                  <div>
                    <label className="text-sm font-semibold mb-2 block">
                      Notes (Optional)
                    </label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add notes about this status change..."
                      rows={3}
                    />
                  </div>
                  
                  <Button
                    onClick={handleStatusChange}
                    disabled={!selectedStatus || changingStatus}
                    className="w-full"
                  >
                    {changingStatus ? 'Updating...' : 'Confirm Status Change'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
          
          {/* Status History */}
          {dimensionSet.production_status_history?.length > 0 && (
            <div className="pt-4 border-t">
              <h4 className="font-semibold text-sm mb-3">Status History</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {dimensionSet.production_status_history.slice().reverse().map((entry, idx) => (
                  <div key={idx} className="text-xs text-slate-600 dark:text-slate-400 border-l-2 border-slate-300 pl-3">
                    <div className="font-semibold">
                      {getStatusBadgeProps(entry.to_status).label}
                    </div>
                    <div>
                      {entry.changed_by_name} • {new Date(entry.changed_at).toLocaleString()}
                    </div>
                    {entry.notes && <div className="italic mt-1">{entry.notes}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Pending Request from Field */}
          {dimensionSet.production_status_requested && (
            <Alert className="border-blue-200 bg-blue-50">
              <Clock className="h-4 w-4 text-blue-600" />
              <AlertDescription>
                <div className="font-semibold text-blue-900 mb-1">
                  Status Change Requested from Field
                </div>
                <div className="text-sm text-blue-700">
                  Requested: {getStatusBadgeProps(dimensionSet.production_status_requested).label}
                </div>
                {dimensionSet.production_request_notes && (
                  <div className="text-xs text-blue-600 mt-1 italic">
                    "{dimensionSet.production_request_notes}"
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );
}