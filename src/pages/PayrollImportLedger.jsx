import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, AlertCircle, CheckCircle2, RotateCcw, Loader2, ChevronLeft, Clock, DollarSign } from "lucide-react";
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
  const [step, setStep] = useState("upload"); // upload | preview | confirm | history
  const [parsedData, setParsedData] = useState(null);
  const [allocations, setAllocations] = useState(null);
  const [formData, setFormData] = useState({
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
    staleTime: 0,
  });

  // Upload and parse file
  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const { data } = await base44.functions.invoke("parsePayrollExcel", {
        file_url,
        file_name: file.name,
      });
      return data;
    },
    onSuccess: (data) => {
      setParsedData(data);
      setStep("preview");
      toast.success("Excel parsed successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to parse file");
    },
  });

  // Calculate allocations
  const calculateMutation = useMutation({
    mutationFn: async () => {
      const total = parseFloat(formData.total_paid) || 0;
      const { allocations } = await base44.functions.invoke(
        "calculatePayrollAllocations",
        {
          total_paid: total,
          jobs: parsedData.jobs,
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
        employee_id: user.id,
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
      toast.success("Payroll batch confirmed and applied");
      setStep("history");
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to confirm batch");
    },
  });

  // Reverse batch
  const reverseMutation = useMutation({
    mutationFn: async (batch_id) => {
      await base44.functions.invoke("reversePayrollBatch", {
        batch_id,
        reason: `Reversed by ${user.email}`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payrollBatches"] });
      toast.success("Batch reversed successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to reverse batch");
    },
  });

  const resetForm = () => {
    setUploadedFile(null);
    setParsedData(null);
    setAllocations(null);
    setFormData({
      employee_name: "",
      period_start: "",
      period_end: "",
      total_paid: "",
      notes: "",
    });
    setStep("history");
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
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
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileUpload}
                  disabled={uploadMutation.isPending}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="inline-block">
                  <Button
                    asChild
                    disabled={uploadMutation.isPending}
                    className="cursor-pointer"
                  >
                    <span>
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
                    </span>
                  </Button>
                </label>
                {uploadedFile && (
                  <p className="mt-4 text-sm text-slate-600">
                    📄 {uploadedFile.name}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* PREVIEW STEP */}
        {step === "preview" && parsedData && (
          <div className="space-y-6">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Payroll Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Employee Name *</Label>
                    <Input
                      value={formData.employee_name}
                      onChange={(e) =>
                        setFormData({ ...formData, employee_name: e.target.value })
                      }
                      placeholder="Full name"
                      className="mt-1"
                    />
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
                <CardTitle>Jobs Found ({parsedData.jobs.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {parsedData.jobs.map((job, idx) => (
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
                  Total: {parsedData.total_hours} hours
                </p>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setStep("upload");
                  setParsedData(null);
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
                        {!alloc.job_found && (
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
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded flex gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                    <div className="text-sm text-red-700">
                      Some jobs were not found in the system. They will be created with empty job_id.
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
                  <Card key={batch.id} className="shadow">
                    <CardContent className="p-6">
                      <div className="grid md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <div className="text-sm text-slate-600">Employee</div>
                          <div className="font-semibold">{batch.employee_name}</div>
                        </div>
                        <div>
                          <div className="text-sm text-slate-600">Period</div>
                          <div className="font-semibold">
                            {batch.period_start} to {batch.period_end}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-slate-600">Total Paid</div>
                          <div className="font-semibold">
                            ${batch.total_paid.toFixed(2)}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-slate-600">Status</div>
                          <div className={`font-semibold uppercase text-xs py-1 px-2 rounded w-fit ${
                            batch.status === "confirmed"
                              ? "bg-emerald-100 text-emerald-700"
                              : batch.status === "reversed"
                              ? "bg-red-100 text-red-700"
                              : "bg-amber-100 text-amber-700"
                          }`}>
                            {batch.status}
                          </div>
                        </div>
                      </div>

                      {batch.notes && (
                        <p className="text-sm text-slate-600 mb-4">📝 {batch.notes}</p>
                      )}

                      <div className="mb-4 text-sm text-slate-600">
                        {batch.allocation_count} allocations • Created by {batch.created_by}
                      </div>

                      {batch.status === "confirmed" && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            if (window.confirm("Reverse this batch? This will undo all cost allocations.")) {
                              reverseMutation.mutate(batch.id);
                            }
                          }}
                          disabled={reverseMutation.isPending}
                        >
                          <RotateCcw className="w-4 h-4 mr-2" />
                          Reverse
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}