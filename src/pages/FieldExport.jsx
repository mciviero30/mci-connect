import React, { useState } from 'react';
import { exportFieldCodebase } from '@/functions/exportFieldCodebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, FileJson, Loader2, CheckCircle2, AlertCircle, Package, Code, Database, BookOpen } from 'lucide-react';

export default function FieldExport() {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await exportFieldCodebase({});
      
      if (response.status === 200) {
        // Create downloadable JSON file
        const jsonData = JSON.stringify(response.data, null, 2);
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mci-field-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        
        setSuccess(true);
      } else {
        throw new Error(response.data?.error || 'Export failed');
      }
    } catch (err) {
      setError(err.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-orange-600 to-yellow-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl">
            <Package className="w-10 h-10 text-black" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">MCI Field Export</h1>
          <p className="text-slate-400">Download complete Field module reference</p>
        </div>

        {/* Main Card */}
        <Card className="bg-slate-800 border-slate-700 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <FileJson className="w-5 h-5 text-orange-400" />
              Export Contents
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* What's Included */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <Database className="w-5 h-5 text-blue-400" />
                  </div>
                  <h3 className="font-bold text-white">Entity Schemas</h3>
                </div>
                <p className="text-sm text-slate-400">Complete JSON schemas for all Field entities (Job, Task, Photo, Plan, etc.)</p>
              </div>

              <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <Code className="w-5 h-5 text-purple-400" />
                  </div>
                  <h3 className="font-bold text-white">File Structure</h3>
                </div>
                <p className="text-sm text-slate-400">Complete map of pages, components, and backend functions</p>
              </div>

              <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-green-500/20 rounded-lg">
                    <BookOpen className="w-5 h-5 text-green-400" />
                  </div>
                  <h3 className="font-bold text-white">Documentation</h3>
                </div>
                <p className="text-sm text-slate-400">Architecture, relationships, and setup instructions</p>
              </div>

              <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-orange-500/20 rounded-lg">
                    <Package className="w-5 h-5 text-orange-400" />
                  </div>
                  <h3 className="font-bold text-white">Source Access</h3>
                </div>
                <p className="text-sm text-slate-400">Instructions to access full source code via Dashboard</p>
              </div>
            </div>

            {/* Download Button */}
            <div className="pt-4">
              <Button
                onClick={handleExport}
                disabled={exporting}
                className="w-full bg-gradient-to-r from-orange-600 to-yellow-500 hover:from-orange-700 hover:to-yellow-600 text-black font-bold min-h-[56px] text-base shadow-xl"
              >
                {exporting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Generating Export...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5 mr-2" />
                    Download MCI Field Export
                  </>
                )}
              </Button>
            </div>

            {/* Success Message */}
            {success && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-green-400 font-semibold mb-1">Export Successful!</p>
                  <p className="text-sm text-slate-400">JSON file downloaded. Open it to view entity schemas and file structure.</p>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-400 font-semibold mb-1">Export Failed</p>
                  <p className="text-sm text-slate-400">{error}</p>
                </div>
              </div>
            )}

            {/* Info Box */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg flex-shrink-0">
                  <BookOpen className="w-5 h-5 text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className="text-blue-400 font-semibold mb-2">How to Access Full Source Code</p>
                  <ol className="text-sm text-slate-400 space-y-1 list-decimal list-inside">
                    <li>Open Base44 Dashboard</li>
                    <li>Navigate to: <span className="text-white font-mono">Code → Files</span></li>
                    <li>Browse and download any file from the structure map</li>
                  </ol>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-orange-400">2</p>
              <p className="text-xs text-slate-400 mt-1">Pages</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-orange-400">50+</p>
              <p className="text-xs text-slate-400 mt-1">Components</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-orange-400">35+</p>
              <p className="text-xs text-slate-400 mt-1">Entities</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-orange-400">5</p>
              <p className="text-xs text-slate-400 mt-1">Functions</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}