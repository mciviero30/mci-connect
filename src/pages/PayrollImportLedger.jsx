import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, AlertCircle, CheckCircle2, RotateCcw, Loader2, ChevronLeft, Clock, DollarSign, ExternalLink } from "lucide-react";
import { useLanguage } from "@/components/i18n/LanguageContext";
import PageHeader from "@/components/shared/PageHeader";
import { toast } from "sonner";
import { createPageUrl } from "@/utils";
import { useNavigate } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function PayrollImportLedger() {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const [uploadedFile, setUploadedFile] = useState(null);
  const [step, setStep] = useState("history"); // upload | select_employee | preview | history | detail
  const [parsedData, setParsedData] = useState(null);  // full parsed result with all employees
  const [selectedEmployee, setSelectedEmployee] = useState(null); // chosen employee from list
  const [allocations, setAllocations] = useState(null);
  const [selectedBatchId, setSelectedBatchId] = useState(null);
  const [reverseDialogOpen, setReverseDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    employee_id: "",
    employee_name: "",
    period_start: "",
    period_end: "",
    total_paid: "",
    notes: "",
  });

  // Get existing batches
  const { data: batches = [] } = useQuery({
    queryKey: ["payrollBatches"],
    queryFn: () => base44.entities.PayrollBatch.list(),
    staleTime: 300000,
    refetchOnMount: false,
  });

  // Get employees
  const { data: employees = [] } = useQuery({
    queryKey: ["employeeDirectory"],
    queryFn: () => base44.entities.EmployeeDirectory.list(),
    staleTime: 600000,
    refetchOnMount: false,
  });

  // Get allocations for selected batch
  const { data: batchAllocations = [] } = useQuery({
    queryKey: ["batchAllocations", selectedBatchId],
    queryFn: () =>
      base44.entities.PayrollAllocation.filter({
        payroll_batch_id: selectedBatchId,
      }),
    enabled: !!selectedBatchId,
  });

  // Get audit log for selected batch
  const { data: auditLogs = [] } = useQuery({
    queryKey: ["auditLogs", selectedBatchId],
    queryFn: () =>
      base44.entities.AuditLog.filter({
        entity_id: selectedBatchId,
        entity_type: "PayrollBatch",
      }, "-created_date"),
    enabled: !!selectedBatchId,
  });

  // Upload and parse file
  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      // Convert to base64 — avoids file URL fetch issues in Deno
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      const chunkSize = 8192;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
      }
      const file_base64 = btoa(binary);

      const response = await base44.functions.invoke("parsePayrollExcel", {
        file_base64,
        file_name: file.name,
      });
      const body = response.data;
      if (!body?.success) throw new Error(body?.error || "Failed to parse file");
      return body.data;
    },
    onSuccess: (data) => {
      setParsedData(data);
      // If only one employee, skip selection and go straight to preview
      if (data.employees?.length === 1) {
        const emp = data.employees[0];
        setSelectedEmployee(emp);
        setFormData(prev => ({
          ...prev,
          employee_name: emp.match?.full_name || emp.connecteam_name,
          employee_id: emp.match?.pending_employee_id || "",
          total_paid: emp.total_pay > 0 ? String(emp.total_pay) : prev.total_paid,
        }));
        setStep("preview");
      } else {
        setStep("select_employee");
      }
      toast.success(`Parsed ${data.employee_count} employees`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to parse file");
    },
  });

  // Calculate allocations
  const calculateMutation = useMutation({
    mutationFn: async () => {
      const total = parseFloat(formData.total_paid) || 0;
      const jobs = selectedEmployee?.jobs || parsedData.jobs;
      const { allocations } = await base44.functions.invoke(
        "calculatePayrollAllocations",
        {
          total_paid: total,
          jobs,
        }
      );
      return allocations;
    },
    onSuccess: (data) => {
      setAllocations(data);
      toast.success("Allocations calculated");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to calculate allocations");
    },
  });

  // Confirm batch
  const confirmMutation = useMutation({
    mutationFn: async () => {
      const { batch_id } = await base44.functions.invoke("confirmPayrollBatch", {
        employee_id: formData.employee_id || user.id,
        employee_name: formData.employee_name,
        period_start: formData.period_start,
        period_end: formData.period_end,
        total_paid: parseFloat(formData.total_paid),
        allocations: allocations.map((a) => ({
          ...a,
          job_id: a.job_id || "",
        })),
        notes: formData.notes,
      });
      return batch_id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payrollBatches"] });
      queryClient.invalidateQueries({ queryKey: ["Jobs"] });
      queryClient.invalidateQueries({ queryKey: ["Invoices"] });
      toast.success("✅ Payroll batch confirmed and locked");
      setStep("history");
      resetForm();
    },
    onError: (error) => {
      if (error.message?.includes("Duplicate")) {
        toast.error("Duplicate batch detected - file already imported");
      } else {
        toast.error(error.message || "Failed to confirm batch");
      }
    },
  });

  // Reverse batch
  const reverseMutation = useMutation({
    mutationFn: async (batch_id) => {
      const batch = batches.find(b => b.id === batch_id);
      await base44.functions.invoke("reversePayrollBatch", {
        batch_id,
        reason: `Reversed by ${user.full_name || user.email}`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payrollBatches"] });
      queryClient.invalidateQueries({ queryKey: ["batchAllocations"] });
      queryClient.invalidateQueries({ queryKey: ["Jobs"] });
      queryClient.invalidateQueries({ queryKey: ["Invoices"] });
      toast.success("✅ Batch reversed and unlocked");
      setReverseDialogOpen(false);
      setStep("history");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to reverse batch");
    },
  });

  const resetForm = () => {
    setUploadedFile(null);
    setParsedData(null);
    setSelectedEmployee(null);
    setAllocations(null);
    setFormData({
      employee_id: "",
      employee_name: "",
      period_start: "",
      period_end: "",
      total_paid: "",
      notes: "",
    });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      toast.info(`Parsing ${file.name}...`);
      setStep("upload"); // ensure we're on upload step so spinner shows
      uploadMutation.mutate(file);
    }
  };

  // SECURITY: Only Admin, CEO, Accountant
  const isAuthorized =
    ["admin", "ceo"].includes(user?.role) ||
    ["CEO", "Accountant"].includes(user?.position);

  if (!isAuthorized) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <h2 className="text-xl font-bold text-red-900 mb-2">Access Denied</h2>
            <p className="text-red-700">
              Only Admin, CEO, or Accountant can access Payroll Import Ledger.
            </p>
            <Button
              className="mt-4"
              onClick={() => navigate(createPageUrl("Dashboard"))}
            >
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Always-mounted file input so it works from any step */}
      <input
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleFileUpload}
        disabled={uploadMutation.isPending}
        className="hidden"
        id="file-upload"
      />
      <div className="max-w-6xl mx-auto">
        <PageHeader title="Payroll Import Ledger" showBack={true} />

        {/* UPLOAD STEP */}
        {step === "upload" && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Upload Connecteam Payroll</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="border-2 border-dashed border-blue-300 rounded-xl p-8 text-center">
                <Upload className="w-12 h-12 mx-auto mb-4 text-blue-600" />
                <Label className="text-lg font-semibold mb-4 block">
                  Upload Excel file (Connecteam timesheet)
                </Label>
                <Button
                  disabled={uploadMutation.isPending}
                  className="cursor-pointer relative"
                  onClick={() => document.getElementById('file-upload').click()}
                >
                  {uploadMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Parsing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Select File
                    </>
                  )}
                </Button>

                {uploadedFile && (
                  <p className="mt-4 text-sm text-slate-600">
                    📄 {uploadedFile.name}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* SELECT EMPLOYEE STEP */}
        {step === "select_employee" && parsedData && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Select Employee to Import</h2>
              <Button variant="outline" size="sm" onClick={() => { setStep("upload"); resetForm(); }}>Back</Button>
            </div>
            <p className="text-slate-500 text-sm">
              Found {parsedData.employee_count} employees. {parsedData.matched_count} matched in system.
              Select one to import.
            </p>
            <div className="space-y-3">
              {parsedData.employees.map((emp, idx) => (
                <Card
                  key={idx}
                  className={`cursor-pointer hover:shadow-md transition-shadow border-2 ${
                    emp.match ? "border-emerald-200" : "border-amber-200"
                  }`}
                  onClick={() => {
                    setSelectedEmployee(emp);
                    setFormData(prev => ({
                      ...prev,
                      employee_name: emp.match?.full_name || emp.connecteam_name,
                      employee_id: emp.match?.pending_employee_id || "",
                      total_paid: emp.total_pay > 0 ? String(emp.total_pay) : prev.total_paid,
                    }));
                    setStep("preview");
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-bold text-base">{emp.connecteam_name}</div>
                        {emp.match ? (
                          <div className="text-xs text-emerald-600 font-medium mt-0.5">
                            ✅ Matched: {emp.match.full_name} {emp.match_method === 'ssn' ? '(SSN)' : '(name)'}
                            {emp.match.email && <span className="text-slate-500 ml-1">· {emp.match.email}</span>}
                          </div>
                        ) : (
                          <div className="text-xs text-amber-600 font-medium mt-0.5">
                            ⚠️ Not found in system — will create new employee
                          </div>
                        )}
                        <div className="text-xs text-slate-500 mt-1">
                          {emp.jobs.length} jobs · {emp.total_hours} hrs
                          {emp.title && <span> · {emp.title}</span>}
                        </div>
                      </div>
                      <div className="text-right">
                        {emp.total_pay > 0 && (
                          <div className="font-bold text-emerald-700">${emp.total_pay.toFixed(2)}</div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* PREVIEW STEP */}
         {step === "preview" && parsedData && selectedEmployee && (
           <div className="space-y-6">
             <Card className="shadow-lg">
               <CardHeader>
                 <CardTitle>Payroll Details</CardTitle>
               </CardHeader>
               <CardContent className="space-y-4">
                 <div className="grid md:grid-cols-2 gap-4">
                   <div>
                     <Label>Employee *</Label>
                     <Select
                       value={formData.employee_id}
                       onValueChange={(value) => {
                         const emp = employees.find(e => e.id === value);
                         setFormData({
                           ...formData,
                           employee_id: value,
                           employee_name: emp?.full_name || emp?.employee_name || ""
                         });
                       }}
                     >
                       <SelectTrigger className="mt-1">
                         <SelectValue placeholder="Select employee" />
                       </SelectTrigger>
                       <SelectContent>
                         {employees.map((emp) => (
                           <SelectItem key={emp.id} value={emp.id}>
                             {emp.full_name || emp.employee_name}
                           </SelectItem>
                         ))}
                       </SelectContent>
                     </Select>
                   </div>
                  <div>
                    <Label>Total Paid *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.total_paid}
                      onChange={(e) =>
                        setFormData({ ...formData, total_paid: e.target.value })
                      }
                      placeholder="0.00"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Period Start *</Label>
                    <Input
                      type="date"
                      value={formData.period_start}
                      onChange={(e) =>
                        setFormData({ ...formData, period_start: e.target.value })
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Period End *</Label>
                    <Input
                      type="date"
                      value={formData.period_end}
                      onChange={(e) =>
                        setFormData({ ...formData, period_end: e.target.value })
                      }
                      className="mt-1"
                    />
                  </div>
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    placeholder="Additional notes..."
                    className="h-20 mt-1"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-blue-200 bg-blue-50">
             <CardHeader>
               <CardTitle>Jobs Found ({selectedEmployee.jobs.length})</CardTitle>
             </CardHeader>
             <CardContent>
               <div className="space-y-2">
                 {selectedEmployee.jobs.map((job, idx) => (
                   <div
                     key={idx}
                     className="flex justify-between p-3 bg-white rounded border"
                   >
                     <span className="font-medium">{job.name}</span>
                     <span className="text-slate-600">{job.hours} hours</span>
                   </div>
                 ))}
               </div>
               <p className="text-sm text-slate-600 mt-4">
                 Total: {selectedEmployee.total_hours} hours
               </p>
             </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setAllocations(null);
                  setStep(parsedData?.employee_count > 1 ? "select_employee" : "upload");
                }}
              >
                Back
              </Button>
              <Button
                onClick={() => calculateMutation.mutate()}
                disabled={
                  calculateMutation.isPending ||
                  !formData.employee_name ||
                  !formData.total_paid ||
                  !formData.period_start ||
                  !formData.period_end
                }
                className="bg-blue-600"
              >
                {calculateMutation.isPending ? "Calculating..." : "Calculate Allocations"}
              </Button>
            </div>
          </div>
        )}

        {/* CONFIRM STEP */}
        {step === "preview" && allocations && (
          <div className="space-y-6">
            <Card className="shadow-lg border-emerald-200 bg-emerald-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  Allocation Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {allocations.map((alloc, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center p-4 bg-white rounded-lg border"
                    >
                      <div>
                        <div className="font-semibold">{alloc.job_name}</div>
                        <div className="text-sm text-slate-600">
                          {alloc.hours_worked} hours • {alloc.allocation_percentage.toFixed(1)}%
                        </div>
                        {alloc.is_rounding_adjustment && (
                          <div className="text-xs text-amber-600 font-medium">
                            ⚠️ Absorbs rounding delta
                          </div>
                        )}
                        {alloc.is_placeholder && (
                          <div className="text-xs text-amber-600 font-medium flex items-center gap-1">
                            🆕 Placeholder job created — needs to be linked
                          </div>
                        )}
                        {!alloc.job_found && !alloc.is_placeholder && (
                          <div className="text-xs text-red-600 font-medium">
                            ❌ Job not found in system
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold">
                          ${alloc.allocated_amount.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 p-4 bg-white rounded-lg border-2 border-emerald-300">
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>Total:</span>
                    <span className="text-emerald-700">
                      ${allocations.reduce((sum, a) => sum + a.allocated_amount, 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                {allocations.some((a) => !a.job_found) && (
                  <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded flex gap-2">
                    <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                    <div className="text-sm text-amber-700">
                      <strong>{allocations.filter(a => !a.job_found).length} job(s) not found</strong> — placeholder jobs will be auto-created with a draft invoice ($0). Go to <strong>Jobs</strong> → filter by <em>"payroll_placeholder"</em> to complete them later.
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setAllocations(null);
                }}
              >
                Back to Details
              </Button>
              <Button
                onClick={() => confirmMutation.mutate()}
                disabled={confirmMutation.isPending}
                className="bg-emerald-600"
              >
                {confirmMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Confirming...
                  </>
                ) : (
                  "Confirm & Apply"
                )}
              </Button>
            </div>
          </div>
        )}

        {/* DETAIL VIEW */}
         {step === "detail" && selectedBatchId && batches.find(b => b.id === selectedBatchId) && (
           <div className="space-y-6">
             <div className="flex items-center gap-3 mb-6">
               <Button
                 variant="ghost"
                 size="sm"
                 onClick={() => {
                   setStep("history");
                   setSelectedBatchId(null);
                 }}
               >
                 <ChevronLeft className="w-4 h-4 mr-1" />
                 Back
               </Button>
             </div>

             {(() => {
               const batch = batches.find(b => b.id === selectedBatchId);
               return (
                 <>
                   {/* Header Card */}
                   <Card className="shadow-lg border-blue-200 bg-gradient-to-r from-blue-50 to-slate-50">
                     <CardContent className="p-6">
                       <div className="grid md:grid-cols-5 gap-4">
                         <div>
                           <div className="text-xs font-semibold text-slate-600 uppercase">Batch ID</div>
                           <div className="font-mono text-sm mt-1">{batch.id.substring(0, 8)}...</div>
                         </div>
                         <div>
                           <div className="text-xs font-semibold text-slate-600 uppercase">Employee</div>
                           <div className="font-semibold mt-1">{batch.employee_name}</div>
                         </div>
                         <div>
                           <div className="text-xs font-semibold text-slate-600 uppercase">Period</div>
                           <div className="font-semibold text-sm mt-1">{batch.period_start} → {batch.period_end}</div>
                         </div>
                         <div>
                           <div className="text-xs font-semibold text-slate-600 uppercase">Total Paid</div>
                           <div className="font-bold text-lg text-emerald-700 mt-1">${batch.total_paid.toFixed(2)}</div>
                         </div>
                         <div>
                           <div className="text-xs font-semibold text-slate-600 uppercase">Status</div>
                           <div className={`text-xs font-bold py-1 px-2 rounded mt-1 w-fit ${
                             batch.status === "confirmed"
                               ? "bg-emerald-100 text-emerald-700"
                               : batch.status === "reversed"
                               ? "bg-red-100 text-red-700"
                               : "bg-amber-100 text-amber-700"
                           }`}>
                             {batch.status.toUpperCase()}
                           </div>
                         </div>
                       </div>
                     </CardContent>
                   </Card>

                   {/* Allocation Breakdown */}
                   <Card className="shadow-lg">
                     <CardHeader>
                       <CardTitle className="flex items-center gap-2">
                         <DollarSign className="w-5 h-5" />
                         Allocation Breakdown ({batchAllocations.length})
                       </CardTitle>
                     </CardHeader>
                     <CardContent>
                       <div className="space-y-2">
                         {batchAllocations.map((alloc) => (
                           <div key={alloc.id} className="flex justify-between items-center p-3 bg-slate-50 rounded border">
                             <div>
                               <div className="font-semibold">{alloc.job_name}</div>
                               <div className="text-sm text-slate-600">{alloc.hours_worked} hrs • {alloc.allocation_percentage.toFixed(1)}%</div>
                               {alloc.is_rounding_adjustment && <div className="text-xs text-amber-600">⚠️ Rounding adjustment</div>}
                             </div>
                             <div className="text-right">
                               <div className="font-bold">${alloc.allocated_amount.toFixed(2)}</div>
                             </div>
                           </div>
                         ))}
                       </div>
                     </CardContent>
                   </Card>

                   {/* Audit Trail */}
                   <Card className="shadow-lg">
                     <CardHeader>
                       <CardTitle className="flex items-center gap-2">
                         <Clock className="w-5 h-5" />
                         Audit Trail
                       </CardTitle>
                     </CardHeader>
                     <CardContent>
                       {auditLogs.length === 0 ? (
                         <p className="text-slate-500 text-sm">No audit events</p>
                       ) : (
                         <div className="space-y-3">
                           {auditLogs.map((log) => (
                             <div key={log.id} className="p-3 bg-slate-50 rounded border-l-4 border-blue-400">
                               <div className="text-sm font-semibold">{log.event_type.replace(/_/g, ' ').toUpperCase()}</div>
                               <div className="text-xs text-slate-600 mt-1">By {log.performed_by_name || log.performed_by}</div>
                               <div className="text-xs text-slate-600">{new Date(log.created_date).toLocaleString()}</div>
                             </div>
                           ))}
                         </div>
                       )}
                     </CardContent>
                   </Card>

                   {/* Actions */}
                   {batch.status === "confirmed" && (
                     <div className="flex gap-3">
                       <Button
                         variant="destructive"
                         onClick={() => setReverseDialogOpen(true)}
                         disabled={reverseMutation.isPending}
                       >
                         <RotateCcw className="w-4 h-4 mr-2" />
                         Reverse Batch
                       </Button>
                     </div>
                   )}
                 </>
               );
             })()}
           </div>
         )}

         {/* HISTORY STEP */}
         {step === "history" && (
           <div className="space-y-6">
             <div className="flex justify-between items-center">
               <h2 className="text-2xl font-bold">Payroll Batch History</h2>
               <Button
                 onClick={() => {
                   setStep("upload");
                   resetForm();
                 }}
                 className="bg-blue-600"
               >
                 <Upload className="w-4 h-4 mr-2" />
                 New Import
               </Button>
             </div>

             {batches.length === 0 ? (
               <Card>
                 <CardContent className="p-8 text-center text-slate-600">
                   No payroll batches yet. Start by uploading a file.
                 </CardContent>
               </Card>
             ) : (
               <div className="space-y-4">
                 {batches.map((batch) => (
                   <Card key={batch.id} className="shadow hover:shadow-lg transition-shadow cursor-pointer" onClick={() => {
                     setSelectedBatchId(batch.id);
                     setStep("detail");
                   }}>
                     <CardContent className="p-6">
                       <div className="grid md:grid-cols-5 gap-4">
                         <div>
                           <div className="text-sm text-slate-600">Employee</div>
                           <div className="font-semibold">{batch.employee_name}</div>
                         </div>
                         <div>
                           <div className="text-sm text-slate-600">Period</div>
                           <div className="font-semibold text-sm">{batch.period_start} → {batch.period_end}</div>
                         </div>
                         <div>
                           <div className="text-sm text-slate-600">Total Paid</div>
                           <div className="font-semibold">${batch.total_paid.toFixed(2)}</div>
                         </div>
                         <div>
                           <div className="text-sm text-slate-600">Allocations</div>
                           <div className="font-semibold">{batch.allocation_count}</div>
                         </div>
                         <div>
                           <div className="text-sm text-slate-600">Status</div>
                           <div className={`text-xs font-bold py-1 px-2 rounded w-fit ${
                             batch.status === "confirmed"
                               ? "bg-emerald-100 text-emerald-700"
                               : batch.status === "reversed"
                               ? "bg-red-100 text-red-700"
                               : "bg-amber-100 text-amber-700"
                           }`}>
                             {batch.status.toUpperCase()}
                           </div>
                         </div>
                       </div>
                     </CardContent>
                   </Card>
                 ))}
               </div>
             )}
           </div>
         )}

         {/* Reverse Confirmation Dialog */}
         <AlertDialog open={reverseDialogOpen} onOpenChange={setReverseDialogOpen}>
           <AlertDialogContent>
             <AlertDialogHeader>
               <AlertDialogTitle>Reverse Payroll Batch?</AlertDialogTitle>
               <AlertDialogDescription>
                 This will subtract all allocated amounts from Job total_cost and recalculate profits & commissions. Allocations will be marked as 'reversed' but not deleted.
               </AlertDialogDescription>
             </AlertDialogHeader>
             <AlertDialogAction
               onClick={() => reverseMutation.mutate(selectedBatchId)}
               disabled={reverseMutation.isPending}
               className="bg-red-600"
             >
               {reverseMutation.isPending ? "Reversing..." : "Reverse Batch"}
             </AlertDialogAction>
             <AlertDialogCancel>Cancel</AlertDialogCancel>
           </AlertDialogContent>
         </AlertDialog>
      </div>
    </div>
  );
}