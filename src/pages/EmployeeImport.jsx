import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, Trash2, Users, AlertTriangle, CheckCircle, FileSpreadsheet, Shield } from "lucide-react";

export default function EmployeeImport() {
  const [file, setFile] = useState(null);
  const [uploadedUrl, setUploadedUrl] = useState('');
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: Infinity
  });

  const hasAccess = currentUser?.role === 'admin' || currentUser?.position === 'CEO';

  const cleanupMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('cleanupPendingEmployees');
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['pendingEmployees'] });
      alert(`✅ Deleted: ${data.total_deleted} employees (${data.pending_deleted} pending + ${data.invited_deleted} invited)`);
    }
  });

  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      const result = await base44.integrations.Core.UploadFile({ file });
      return result.file_url;
    },
    onSuccess: (url) => {
      setUploadedUrl(url);
      alert('✅ File uploaded successfully');
    }
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('importEmployeesFromXLSX', {
        file_url: uploadedUrl
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pendingEmployees'] });
      alert(`✅ Imported: ${data.created} employees successfully`);
      setFile(null);
      setUploadedUrl('');
    }
  });

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
            <p className="text-slate-600">Only admins can import employees.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F1F5F9] dark:bg-[#181818] p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-[#507DB4] to-[#6B9DD8] rounded-2xl shadow-md">
              <FileSpreadsheet className="w-7 h-7 text-white" />
            </div>
            Employee Import
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2 ml-[60px]">
            Clean pending employees and import from XLSX
          </p>
        </div>

        {/* Step 1: Cleanup */}
        <Card className="mb-6 border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <Trash2 className="w-5 h-5" />
              Step 1: Clean Up Pending/Invited
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="bg-red-50 border-red-200">
              <AlertDescription className="text-red-800">
                ⚠️ This will permanently delete ALL pending employees and mark invited users as deleted.
              </AlertDescription>
            </Alert>

            <Button
              onClick={() => {
                if (window.confirm('Delete all pending/invited employees? This cannot be undone!')) {
                  cleanupMutation.mutate();
                }
              }}
              disabled={cleanupMutation.isPending}
              className="w-full bg-red-600 hover:bg-red-700"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {cleanupMutation.isPending ? 'Deleting...' : 'Delete All Pending/Invited Employees'}
            </Button>
          </CardContent>
        </Card>

        {/* Step 2: Upload XLSX */}
        <Card className="mb-6 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-700">
              <Upload className="w-5 h-5" />
              Step 2: Upload XLSX File
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="bg-blue-50 border-blue-200">
              <AlertDescription className="text-blue-800">
                📋 Required columns: email, first_name, last_name<br/>
                Optional: phone, position, department, team_name, address, dob, ssn_tax_id, tshirt_size, hourly_rate
              </AlertDescription>
            </Alert>

            <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => setFile(e.target.files[0])}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer flex flex-col items-center gap-3"
              >
                <Upload className="w-12 h-12 text-slate-400" />
                <div>
                  <p className="text-sm font-medium text-slate-700">
                    {file ? file.name : 'Click to upload XLSX file'}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    or drag and drop
                  </p>
                </div>
              </label>
            </div>

            {file && (
              <Button
                onClick={() => uploadMutation.mutate(file)}
                disabled={uploadMutation.isPending}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {uploadMutation.isPending ? 'Uploading...' : 'Upload File'}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Step 3: Import */}
        {uploadedUrl && (
          <Card className="border-green-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700">
                <Users className="w-5 h-5" />
                Step 3: Import Employees
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="bg-green-50 border-green-200">
                <AlertDescription className="text-green-800 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  File uploaded successfully. Ready to import.
                </AlertDescription>
              </Alert>

              <Button
                onClick={() => importMutation.mutate()}
                disabled={importMutation.isPending}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                <Users className="w-4 h-4 mr-2" />
                {importMutation.isPending ? 'Importing...' : 'Import Employees as Pending'}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}