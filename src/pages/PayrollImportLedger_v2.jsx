import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, ChevronDown, ChevronRight, CheckCircle2, AlertTriangle, XCircle, Clock, Users, DollarSign, Briefcase } from "lucide-react";

// ─── Auth Guard ────────────────────────────────────────────────────────────────
function useAuthorizedUser() {
  return useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
}

function isAuthorized(user) {
  if (!user) return false;
  return ["admin", "ceo"].includes(user.role) || user.position === "Accountant";
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const fmt = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n ?? 0);

const statusBadge = (status) => {
  const map = {
    exact_match: { label: "Exact Match", cls: "bg-green-100 text-green-800" },
    alias_match: { label: "Alias Match", cls: "bg-blue-100 text-blue-800" },
    email_match: { label: "Email Match", cls: "bg-blue-100 text-blue-800" },
    name_match: { label: "Name Match", cls: "bg-yellow-100 text-yellow-800" },
    ssn_match: { label: "SSN Match", cls: "bg-purple-100 text-purple-800" },
    not_found: { label: "Not Found", cls: "bg-red-100 text-red-800" },
  };
  const cfg = map[status] || { label: status, cls: "bg-slate-100 text-slate-700" };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
};

// ─── Step 1: Upload ────────────────────────────────────────────────────────────
function UploadStep({ onPreviewReady }) {
  const [hourlyFile, setHourlyFile] = useState(null);
  const [drivingFile, setDrivingFile] = useState(null);
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [error, setError] = useState(null);

  const hourlyRef = useRef();
  const drivingRef = useRef();

  const { mutate: runUpload, isPending } = useMutation({
    mutationFn: async () => {
      setError(null);
      const [hourly_file_base64, driving_file_base64] = await Promise.all([
        fileToBase64(hourlyFile),
        fileToBase64(drivingFile),
      ]);

      // Step 1: Parse Excel
      const parseResult = await base44.functions.invoke("parsePayrollExcel", {
        hourly_file_base64,
        driving_file_base64,
      });

      // Handle both direct response and wrapped response
      const parsed = parseResult?.data || parseResult;

      if (!parsed?.employees?.length) {
        throw new Error(
          parsed?.error ||
          `No employee data found in the uploaded files. (success=${parsed?.success}, count=${parsed?.employee_count})`
        );
      }

      // Step 2: Preview
      const previewResult = await base44.functions.invoke("previewPayrollImport", {
        employees: parsed.employees,
        period_start: periodStart,
        period_end: periodEnd,
      });
      const preview = previewResult?.data || previewResult;

      if (!preview?.success) {
        throw new Error(preview?.error || "Preview generation failed.");
      }

      return preview;
    },
    onSuccess: (data) => {
      onPreviewReady({
        preview_id: data.preview_id,
        preview_payload: data.preview_payload,
        expires_at: data.expires_at,
        period_start: periodStart,
        period_end: periodEnd,
      });
    },
    onError: (err) => setError(err.message),
  });

  const canRun = hourlyFile && drivingFile && periodStart && periodEnd && !isPending;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Step 1 — Upload Payroll Files</h2>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Period Start</label>
            <input
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Period End</label>
            <input
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="space-y-3">
          {[
            { label: "Hourly Excel", ref: hourlyRef, file: hourlyFile, set: setHourlyFile },
            { label: "Driving Excel", ref: drivingRef, file: drivingFile, set: setDrivingFile },
          ].map(({ label, ref, file, set }) => (
            <div
              key={label}
              onClick={() => ref.current?.click()}
              className="flex items-center gap-3 border-2 border-dashed border-slate-300 rounded-lg px-4 py-3 cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
            >
              <Upload className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700">{label}</p>
                {file ? (
                  <p className="text-xs text-green-600 truncate">{file.name}</p>
                ) : (
                  <p className="text-xs text-slate-400">Click to select .xlsx file</p>
                )}
              </div>
              {file && <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />}
              <input
                ref={ref}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => set(e.target.files[0] || null)}
              />
            </div>
          ))}
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <Button
          className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white"
          disabled={!canRun}
          onClick={() => runUpload()}
        >
          {isPending ? "Parsing & Generating Preview..." : "Generate Preview"}
        </Button>
      </div>
    </div>
  );
}

// ─── Step 2: Preview ───────────────────────────────────────────────────────────
function EmployeeRow({ emp }) {
  const [expanded, setExpanded] = useState(false);
  const hasUnmatchedJobs = emp.jobs?.some((j) => j.match_status === "not_found");

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <div
        className="flex items-center gap-3 px-4 py-3 bg-white cursor-pointer hover:bg-slate-50"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="text-slate-400">
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900">{emp.connecteam_name}</p>
          <p className="text-xs text-slate-500">{emp.total_hours}h · {fmt(emp.total_pay)}</p>
        </div>
        <div className="flex items-center gap-2">
          {statusBadge(emp.employee_match_status)}
          {hasUnmatchedJobs && (
            <AlertTriangle className="w-4 h-4 text-amber-500" title="Some jobs unmatched" />
          )}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50 px-4 py-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Jobs</p>
          <div className="space-y-1.5">
            {emp.jobs?.map((job, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <Briefcase className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <span className="flex-1 text-slate-700 truncate">{job.excel_job_name}</span>
                <span className="text-slate-500 text-xs">{job.total_hours}h</span>
                <span className="text-slate-700 text-xs font-medium">{fmt(job.total_pay)}</span>
                {statusBadge(job.match_status)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PreviewStep({ previewData, onConfirmed, onBack }) {
  const { preview_id, preview_payload, period_start, period_end } = previewData;
  const summary = preview_payload?.summary || {};
  const employees = preview_payload?.employees || [];

  const [error, setError] = useState(null);

  const hasUnmatchedEmployees = summary.employees_not_found > 0;
  const hasUnmatchedJobs = summary.jobs_not_found > 0;
  const canConfirm = !hasUnmatchedEmployees && !hasUnmatchedJobs;

  const { mutate: confirm, isPending } = useMutation({
    mutationFn: async () => {
      setError(null);
      const result = await base44.functions.invoke("confirmPayrollImportFromPreview", {
        preview_id,
      });
      if (result?.status === "failed" || result?.error) {
        throw new Error(result?.error_message || result?.error || "Confirmation failed.");
      }
      return result;
    },
    onSuccess: (data) => onConfirmed(data),
    onError: (err) => {
      const msg = err.message || "Unexpected error during confirmation.";
      // Surface 409 (duplicate) clearly
      if (msg.includes("409") || msg.toLowerCase().includes("duplicate") || msg.toLowerCase().includes("already")) {
        setError(`⚠️ Duplicate detected: ${msg}`);
      } else {
        setError(msg);
      }
    },
  });

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Summary */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Step 2 — Review Preview</h2>
          <span className="text-xs text-slate-400">{period_start} → {period_end}</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { icon: Users, label: "Employees", val: summary.total_employees, sub: `${summary.employees_matched} matched` },
            { icon: DollarSign, label: "Total Pay", val: fmt(summary.total_pay_amount) },
            { icon: Briefcase, label: "Jobs", val: summary.total_jobs, sub: `${summary.jobs_matched} matched` },
          ].map(({ icon: Icon, label, val, sub }) => (
            <div key={label} className="bg-slate-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Icon className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs text-slate-500">{label}</span>
              </div>
              <p className="text-lg font-bold text-slate-900">{val}</p>
              {sub && <p className="text-xs text-slate-500">{sub}</p>}
            </div>
          ))}
        </div>
      </div>

      {/* Warnings */}
      {hasUnmatchedEmployees && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
          <XCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-800">
              {summary.employees_not_found} employee(s) not found in directory
            </p>
            <p className="text-xs text-red-600 mt-0.5">All employees must be matched before confirmation is allowed.</p>
          </div>
        </div>
      )}
      {hasUnmatchedJobs && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800">
              {summary.jobs_not_found} job(s) not matched in system
            </p>
            <p className="text-xs text-amber-600 mt-0.5">All jobs must be matched before confirmation is allowed.</p>
          </div>
        </div>
      )}

      {/* Employee List */}
      <div className="space-y-2">
        {employees.map((emp, i) => (
          <EmployeeRow key={i} emp={emp} />
        ))}
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} disabled={isPending}>
          ← Back
        </Button>
        <Button
          className="flex-1 bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
          disabled={!canConfirm || isPending}
          onClick={() => confirm()}
          title={!canConfirm ? "Resolve all unmatched employees and jobs first" : undefined}
        >
          {isPending
            ? "Confirming..."
            : `Confirm Payroll (${employees.length} Employee${employees.length !== 1 ? "s" : ""})`}
        </Button>
      </div>
    </div>
  );
}

// ─── Step 3: History ───────────────────────────────────────────────────────────
function HistoryStep({ confirmationResult, onNewImport }) {
  const { data: batches = [], isLoading } = useQuery({
    queryKey: ["payrollBatches_v2"],
    queryFn: () =>
      base44.entities.PayrollBatch.list("-created_date", 50),
    staleTime: 0,
  });

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {confirmationResult && (
        <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
          <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-800">
              Payroll confirmed — {confirmationResult.employees_confirmed} employee(s), {confirmationResult.total_batches_created} batch(es) created
            </p>
            {confirmationResult.financial_summary && (
              <p className="text-xs text-green-700 mt-0.5">
                Total payroll: {fmt(confirmationResult.financial_summary.total_payroll_imported)} ·
                Profit delta: {fmt(confirmationResult.financial_summary.profit_delta)}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">Payroll Batch History</h2>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white text-sm" onClick={onNewImport}>
            + New Import
          </Button>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading...</div>
        ) : batches.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">No payroll batches found.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {batches.map((b) => (
              <div key={b.id} className="flex items-center gap-4 px-5 py-3">
                <div className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900">{b.employee_name}</p>
                  <p className="text-xs text-slate-500">{b.period_start} → {b.period_end}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-900">{fmt(b.total_paid)}</p>
                  <p className="text-xs text-slate-400">{b.allocation_count} alloc{b.allocation_count !== 1 ? "s" : ""}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${b.status === "confirmed" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                  {b.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Root Page ─────────────────────────────────────────────────────────────────
export default function PayrollImportLedger_v2() {
  const { data: user, isLoading: userLoading } = useAuthorizedUser();
  const [step, setStep] = useState("upload"); // upload | preview | history
  const [previewData, setPreviewData] = useState(null);
  const [confirmationResult, setConfirmationResult] = useState(null);

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthorized(user)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-sm p-8 bg-white border border-red-200 rounded-xl shadow-sm">
          <XCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-900 mb-1">Access Denied</h2>
          <p className="text-sm text-slate-500">Only Admin, CEO, or Accountant roles can access the Payroll Import module.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      {/* Header */}
      <div className="max-w-3xl mx-auto mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Payroll Import — v2</h1>
        <p className="text-sm text-slate-500 mt-1">Multi-employee payroll import powered by the v2 financial engine.</p>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mt-4">
          {["upload", "preview", "history"].map((s, i) => (
            <React.Fragment key={s}>
              <div className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full ${step === s ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-500"}`}>
                <span>{i + 1}</span>
                <span className="capitalize">{s}</span>
              </div>
              {i < 2 && <div className="h-px flex-1 bg-slate-200" />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {step === "upload" && (
        <UploadStep
          onPreviewReady={(data) => {
            setPreviewData(data);
            setStep("preview");
          }}
        />
      )}

      {step === "preview" && previewData && (
        <PreviewStep
          previewData={previewData}
          onBack={() => setStep("upload")}
          onConfirmed={(result) => {
            setConfirmationResult(result);
            setStep("history");
          }}
        />
      )}

      {step === "history" && (
        <HistoryStep
          confirmationResult={confirmationResult}
          onNewImport={() => {
            setPreviewData(null);
            setConfirmationResult(null);
            setStep("upload");
          }}
        />
      )}
    </div>
  );
}