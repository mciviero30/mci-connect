import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck, AlertCircle, Plus, Download, Calendar } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function LiveAuditsTab({ isAdmin, user }) {
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState({
    audit_type: 'JHA',
    title: '',
    site_location: '',
    performed_by: user?.full_name || '',
    findings: '',
    corrective_actions: '',
    status: 'pending'
  });

  const queryClient = useQueryClient();

  const { data: audits = [] } = useQuery({
    queryKey: ['safety-audits'],
    queryFn: () => base44.entities.FormSubmission.filter({ 
      template_name: { $in: ['JHA', 'THA', 'Incident Report', 'Weekly Safety Checklist'] } 
    })
  });

  const createAuditMutation = useMutation({
    mutationFn: (data) => base44.entities.FormSubmission.create({
      template_name: data.audit_type,
      submitted_by_email: user?.email,
      submitted_by_name: user?.full_name,
      submission_date: new Date().toISOString(),
      responses: {
        title: data.title,
        site_location: data.site_location,
        findings: data.findings,
        corrective_actions: data.corrective_actions,
        status: data.status
      }
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['safety-audits'] });
      setShowDialog(false);
      setFormData({
        audit_type: 'JHA',
        title: '',
        site_location: '',
        performed_by: user?.full_name || '',
        findings: '',
        corrective_actions: '',
        status: 'pending'
      });
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createAuditMutation.mutate(formData);
  };

  const getAuditTypeBadge = (type) => {
    const badges = {
      'JHA': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'THA': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      'Incident Report': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      'Weekly Safety Checklist': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    };
    return badges[type] || 'bg-slate-100 text-slate-800';
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Live Safety Audits</h2>
          <p className="text-slate-600 dark:text-slate-400">JHA, THA, incident reports, and weekly safety checklists</p>
        </div>
        <Button onClick={() => setShowDialog(true)} className="bg-gradient-to-r from-red-600 to-orange-600 text-white">
          <Plus className="w-4 h-4 mr-2" />
          New Audit
        </Button>
      </div>

      <div className="grid gap-4">
        {audits.length === 0 ? (
          <Card className="bg-white dark:bg-slate-800">
            <CardContent className="p-12 text-center">
              <ClipboardCheck className="w-16 h-16 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No audits recorded yet</h3>
              <p className="text-slate-600 dark:text-slate-400 mb-4">Start documenting safety audits and inspections</p>
              <Button onClick={() => setShowDialog(true)} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Create First Audit
              </Button>
            </CardContent>
          </Card>
        ) : (
          audits.map((audit) => (
            <Card key={audit.id} className="bg-white dark:bg-slate-800 hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={getAuditTypeBadge(audit.template_name)}>
                        {audit.template_name}
                      </Badge>
                      <span className="text-sm text-slate-500 dark:text-slate-400">
                        {new Date(audit.submission_date).toLocaleDateString()}
                      </span>
                    </div>
                    <CardTitle className="text-slate-900 dark:text-white">
                      {audit.responses?.title || 'Untitled Audit'}
                    </CardTitle>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      {audit.responses?.site_location || 'No location specified'} • By {audit.submitted_by_name}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon">
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              {audit.responses?.findings && (
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Findings:</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{audit.responses.findings}</p>
                    {audit.responses?.corrective_actions && (
                      <>
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mt-3">Corrective Actions:</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">{audit.responses.corrective_actions}</p>
                      </>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          ))
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl bg-white dark:bg-slate-900">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
              <ClipboardCheck className="w-5 h-5 text-red-600" />
              Create Safety Audit
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Audit Type</Label>
              <Select value={formData.audit_type} onValueChange={(v) => setFormData({...formData, audit_type: v})}>
                <SelectTrigger className="bg-slate-50 dark:bg-slate-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-900">
                  <SelectItem value="JHA">Job Hazard Analysis (JHA)</SelectItem>
                  <SelectItem value="THA">Task Hazard Analysis (THA)</SelectItem>
                  <SelectItem value="Incident Report">Incident Report</SelectItem>
                  <SelectItem value="Weekly Safety Checklist">Weekly Safety Checklist</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Title</Label>
              <Input 
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="e.g., Fall Protection Inspection - Site A"
                className="bg-slate-50 dark:bg-slate-800"
                required
              />
            </div>

            <div>
              <Label>Site Location</Label>
              <Input 
                value={formData.site_location}
                onChange={(e) => setFormData({...formData, site_location: e.target.value})}
                placeholder="Job site address or name"
                className="bg-slate-50 dark:bg-slate-800"
                required
              />
            </div>

            <div>
              <Label>Findings / Observations</Label>
              <Textarea 
                value={formData.findings}
                onChange={(e) => setFormData({...formData, findings: e.target.value})}
                placeholder="Describe what was observed or found during the audit..."
                className="bg-slate-50 dark:bg-slate-800 h-32"
                required
              />
            </div>

            <div>
              <Label>Corrective Actions (if any)</Label>
              <Textarea 
                value={formData.corrective_actions}
                onChange={(e) => setFormData({...formData, corrective_actions: e.target.value})}
                placeholder="Actions taken or needed to address findings..."
                className="bg-slate-50 dark:bg-slate-800 h-24"
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-gradient-to-r from-red-600 to-orange-600 text-white">
                Submit Audit
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}