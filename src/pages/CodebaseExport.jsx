import React, { useState } from 'react';
import { Download, FileArchive, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/toast';

export default function CodebaseExport() {
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState(null);
  const { success, error: showError } = useToast();

  const handleExport = async () => {
    setIsExporting(true);
    setExportStatus('generating');

    try {
      const response = await base44.functions.invoke('exportCodebaseZip', {});
      
      // Create blob from response
      const blob = new Blob([response.data], { type: 'application/zip' });
      const url = window.URL.createObjectURL(blob);
      
      // Trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = `mci-connect-export-${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setExportStatus('success');
      success('Export downloaded successfully!');
    } catch (err) {
      console.error('Export failed:', err);
      setExportStatus('error');
      showError('Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Codebase Export
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Download complete MCI Connect codebase as ZIP archive
          </p>
        </div>

        <div className="grid gap-6">
          {/* Main Export Card */}
          <Card className="border-2 border-slate-200 dark:border-slate-700 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-700 border-b">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-600 rounded-xl">
                  <FileArchive className="w-6 h-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-2xl">Complete Project Export</CardTitle>
                  <CardDescription className="text-base">
                    Includes entities, functions, pages, components, and documentation
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6">
                {/* What's Included */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                      📦 Included Content
                    </h3>
                    <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        84 Entity JSON schemas
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        All backend functions (Deno)
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        React pages & components
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        Layout & global styles
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        Documentation & audit reports
                      </li>
                    </ul>
                  </div>

                  <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                    <h3 className="font-bold text-amber-900 dark:text-amber-100 mb-3 flex items-center gap-2">
                      ⚠️ Important Notes
                    </h3>
                    <ul className="space-y-2 text-sm text-amber-800 dark:text-amber-200">
                      <li className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        Export includes structure & schemas
                      </li>
                      <li className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        Some large files are placeholders
                      </li>
                      <li className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        Complete code in Base44 dashboard
                      </li>
                      <li className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        Admin access required
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Export Button */}
                <div className="pt-4 border-t">
                  <Button
                    onClick={handleExport}
                    disabled={isExporting}
                    size="lg"
                    className="w-full md:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg"
                  >
                    {isExporting ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Generating Export...
                      </>
                    ) : (
                      <>
                        <Download className="w-5 h-5 mr-2" />
                        Download Complete Export (ZIP)
                      </>
                    )}
                  </Button>
                </div>

                {/* Status Message */}
                {exportStatus === 'success' && (
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
                      <CheckCircle2 className="w-5 h-5" />
                      <p className="font-medium">Export completed successfully!</p>
                    </div>
                    <p className="text-sm text-green-700 dark:text-green-300 mt-1 ml-7">
                      Check your downloads folder for the ZIP file.
                    </p>
                  </div>
                )}

                {exportStatus === 'error' && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
                      <AlertCircle className="w-5 h-5" />
                      <p className="font-medium">Export failed</p>
                    </div>
                    <p className="text-sm text-red-700 dark:text-red-300 mt-1 ml-7">
                      Please try again or contact support if the issue persists.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* File Structure Preview */}
          <Card>
            <CardHeader>
              <CardTitle>ZIP Structure Preview</CardTitle>
              <CardDescription>Folder organization in exported archive</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="font-mono text-sm space-y-1 text-slate-600 dark:text-slate-400">
                <div>📦 mci-connect-export-YYYY-MM-DD.zip</div>
                <div className="ml-4">├── 📄 README.md</div>
                <div className="ml-4">├── 📄 INSTRUCTIONS.md</div>
                <div className="ml-4">├── 📄 Layout.js</div>
                <div className="ml-4">├── 📄 globals.css</div>
                <div className="ml-4">├── 📁 entities/ (84 .json files)</div>
                <div className="ml-4">├── 📁 functions/ (backend handlers)</div>
                <div className="ml-4">├── 📁 pages/ (React pages)</div>
                <div className="ml-4">├── 📁 components/ (React components)</div>
                <div className="ml-4">└── 📁 docs/ (documentation)</div>
              </div>
            </CardContent>
          </Card>

          {/* Alternative Access */}
          <Card className="bg-slate-50 dark:bg-slate-800 border-dashed">
            <CardHeader>
              <CardTitle className="text-lg">Alternative: Dashboard Access</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                For complete, runnable source code with all implementations:
              </p>
              <ol className="text-sm space-y-2 text-slate-600 dark:text-slate-400">
                <li>1. Open Base44 Dashboard in new tab</li>
                <li>2. Navigate to: <strong>Code → Files</strong></li>
                <li>3. Browse and copy individual files as needed</li>
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}