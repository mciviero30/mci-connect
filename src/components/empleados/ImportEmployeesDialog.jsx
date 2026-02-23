import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, CheckCircle2, XCircle, FileSpreadsheet, AlertTriangle } from "lucide-react";
import * as XLSX from "xlsx";

export default function ImportEmployeesDialog({ open, onClose }) {
  const queryClient = useQueryClient();
  const fileRef = useRef();
  const [preview, setPreview] = useState(null); // array of parsed rows
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null); // { success, failed }

  const handleFile = (e) => {
    setError(null);
    setPreview(null);
    setResults(null);
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];

        // Read raw rows with no header inference — we'll detect headers manually
        const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

        if (!rawRows.length) {
          setError("No data found in file.");
          return;
        }

        // Find the header row: first row where any cell contains "first name", "email", "name", etc.
        const headerKeywords = ["first name", "firstname", "first_name", "email", "nombre"];
        let headerRowIdx = 0;
        for (let i = 0; i < Math.min(5, rawRows.length); i++) {
          const cells = rawRows[i].map(c => String(c).toLowerCase().trim());
          if (cells.some(c => headerKeywords.some(k => c.includes(k)))) {
            headerRowIdx = i;
            break;
          }
        }

        const headers = rawRows[headerRowIdx].map(c => String(c).toLowerCase().trim());
        const dataRows = rawRows.slice(headerRowIdx + 1).filter(r => r.some(c => c !== ""));

        if (!dataRows.length) {
          setError("No data rows found after the header row.");
          return;
        }

        // Flexible column finder
        const colIdx = (...keywords) => {
          for (const kw of keywords) {
            const idx = headers.findIndex(h => h.includes(kw));
            if (idx !== -1) return idx;
          }
          return -1;
        };

        const firstNameIdx = colIdx("first name", "firstname", "first_name");
        const lastNameIdx = colIdx("last name", "lastname", "last_name");
        const emailIdx = colIdx("email");
        const phoneIdx = colIdx("mobile", "phone");
        const titleIdx = colIdx("title", "position", "job title");
        const ssnIdx = colIdx("ssn", "tax");
        const addressIdx = colIdx("address");
        const birthdayIdx = colIdx("birthday", "dob", "birth");
        const tshirtIdx = colIdx("t-shirt", "tshirt", "shirt");

        const getCell = (row, idx) => idx !== -1 && row[idx] !== undefined && row[idx] !== "" 
          ? String(row[idx]).trim() 
          : "";

        const normalized = dataRows.map(row => {
          const firstName = getCell(row, firstNameIdx);
          const lastName = getCell(row, lastNameIdx);
          const fullName = firstName && lastName 
            ? `${firstName} ${lastName}` 
            : firstName || lastName;

          return {
            first_name: firstName,
            last_name: lastName,
            full_name: fullName,
            employee_email: getCell(row, emailIdx).toLowerCase(),
            phone: getCell(row, phoneIdx),
            position: getCell(row, titleIdx),
            ssn_tax_id: getCell(row, ssnIdx),
            address: getCell(row, addressIdx),
            dob: getCell(row, birthdayIdx),
            tshirt_size: getCell(row, tshirtIdx),
          };
        });

        // Filter rows that have at least a name
        const valid = normalized.filter((r) => r.full_name || r.first_name);
        if (!valid.length) {
          setError("No valid rows found. Make sure the file has name columns.");
          return;
        }

        setPreview(valid);
      } catch (err) {
        setError("Could not parse file: " + err.message);
      }
    };
    reader.readAsBinaryString(file);
  };

  const { mutate: doImport, isPending } = useMutation({
    mutationFn: async () => {
      // Load existing to avoid duplicates
      const existing = await base44.entities.EmployeeDirectory.list();
      const existingEmails = new Set(
        existing.map((e) => e.employee_email?.toLowerCase().trim()).filter(Boolean)
      );

      const success = [];
      const failed = [];

      for (const row of preview) {
        const emailKey = row.employee_email?.toLowerCase().trim();
        if (emailKey && existingEmails.has(emailKey)) {
          failed.push({ ...row, reason: "Already exists" });
          continue;
        }

        try {
          // Validate required fields
          if (!row.first_name && !row.last_name && !row.full_name) {
            throw new Error("Missing name (first or last name required)");
          }

          // Save full data to PendingEmployee (SSN, DOB, t-shirt, address, etc.)
          await base44.entities.PendingEmployee.create({
            first_name: row.first_name || row.full_name.split(" ")[0] || "Unknown",
            last_name: row.last_name || row.full_name.split(" ").slice(1).join(" ") || "",
            email: row.employee_email?.trim() || "",
            phone: row.phone?.trim() || "",
            position: row.position?.trim() || "",
            ssn_tax_id: row.ssn_tax_id?.trim() || "",
            address: row.address?.trim() || "",
            dob: row.dob?.trim() || "",
            tshirt_size: row.tshirt_size?.trim() || "",
            status: "pending",
          });

          // Also save to EmployeeDirectory for directory visibility
          await base44.entities.EmployeeDirectory.create({
            employee_email: row.employee_email?.trim() || "",
            full_name: row.full_name,
            first_name: row.first_name || row.full_name.split(" ")[0] || "Unknown",
            last_name: row.last_name || row.full_name.split(" ").slice(1).join(" ") || "",
            position: row.position?.trim() || "",
            phone: row.phone?.trim() || "",
            status: "pending",
            sync_source: "manual",
            last_synced_at: new Date().toISOString(),
          });

          success.push(row);
          if (emailKey) existingEmails.add(emailKey);
        } catch (err) {
          console.error("Import error for", row.full_name, ":", err);
          failed.push({ ...row, reason: err.message });
        }
      }

      return { success, failed };
    },
    onSuccess: (data) => {
      setResults(data);
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
  });

  const handleClose = () => {
    setPreview(null);
    setError(null);
    setResults(null);
    if (fileRef.current) fileRef.current.value = "";
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-blue-600" />
            Import Employees from Excel
          </DialogTitle>
        </DialogHeader>

        {/* Instructions */}
        {!results && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800 space-y-1">
            <p className="font-semibold">Compatible with your MCI Excel format:</p>
            <p className="font-mono text-xs">First name, Last name, Email, Mobile phone, Title, Birthday, SSN, Address, T-shirt size</p>
            <p className="text-xs text-blue-600 mt-1">Employees will be added to the directory with status <strong>Pending</strong>. You can invite them from the Pending tab.</p>
          </div>
        )}

        {/* File picker */}
        {!results && (
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
          >
            <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-700">Click to select Excel file (.xlsx)</p>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Preview */}
        {preview && !results && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-700">{preview.length} employees ready to import</p>
              <Button variant="outline" size="sm" onClick={() => { setPreview(null); if (fileRef.current) fileRef.current.value = ""; }}>
                Change file
              </Button>
            </div>

            <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
              {preview.map((row, i) => (
                <div key={i} className="px-4 py-2 flex items-center gap-3 hover:bg-slate-50">
                  <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {row.full_name?.[0]?.toUpperCase() || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{row.full_name}</p>
                    <p className="text-xs text-slate-500 truncate">{row.employee_email || "no email"} {row.position ? `· ${row.position}` : ""}</p>
                  </div>
                  {!row.employee_email && (
                    <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" title="No email — cannot invite later" />
                  )}
                </div>
              ))}
            </div>

            <Button
              className="w-full bg-green-600 hover:bg-green-700 text-white"
              onClick={() => doImport()}
              disabled={isPending}
            >
              {isPending ? `Importing ${preview.length} employees...` : `Import ${preview.length} Employees`}
            </Button>
          </div>
        )}

        {/* Results */}
        {results && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-green-700">{results.success.length}</p>
                <p className="text-sm text-green-600">Imported</p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                <XCircle className="w-8 h-8 text-red-500 mx-auto mb-1" />
                <p className="text-2xl font-bold text-red-700">{results.failed.length}</p>
                <p className="text-sm text-red-600">Skipped</p>
              </div>
            </div>

            {results.failed.length > 0 && (
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-700">Skipped:</p>
                {results.failed.map((r, i) => (
                  <div key={i} className="text-xs text-slate-600 flex gap-2">
                    <span className="font-medium">{r.full_name}</span>
                    <span className="text-red-500">— {r.reason}</span>
                  </div>
                ))}
              </div>
            )}

            <Button className="w-full" onClick={handleClose}>Done — Go to Pending Tab</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}