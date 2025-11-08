import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Download, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function JobImporter({ onJobImported }) {
  const [importData, setImportData] = useState(null);
  const [error, setError] = useState('');

  const handlePaste = async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      const data = JSON.parse(clipboardText);

      // Validate required fields
      if (!data.id) {
        setError('❌ Missing Job ID - cannot import');
        return;
      }

      if (!data.name) {
        setError('❌ Missing Job Name - cannot import');
        return;
      }

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(data.id)) {
        setError('❌ Invalid Job ID format. Must be UUID v4.');
        return;
      }

      setImportData(data);
      setError('');
    } catch (err) {
      setError('❌ Invalid data format. Make sure you copied job data from Modern Components.');
    }
  };

  const handleImport = () => {
    if (importData && onJobImported) {
      onJobImported(importData);
      setImportData(null);
    }
  };

  const handleCancel = () => {
    setImportData(null);
    setError('');
  };

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-300 shadow-lg mb-6">
      <CardContent className="p-6">
        <h3 className="font-bold text-blue-900 mb-3 text-lg flex items-center gap-2">
          <Download className="w-5 h-5" />
          📥 Import Job from Modern Components
        </h3>

        {error && (
          <Alert className="mb-4 bg-red-50 border-red-300">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {!importData ? (
          <div>
            <p className="text-sm text-blue-800 mb-4">
              After copying job data from Modern Components, click the button below to import:
            </p>
            <Button
              onClick={handlePaste}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
              size="lg"
            >
              <Download className="w-5 h-5 mr-2" />
              📋 Paste Job Data from Clipboard
            </Button>
            
            <div className="mt-4 p-3 bg-blue-100 rounded-lg border border-blue-200">
              <p className="text-xs text-blue-900 font-semibold mb-2">💡 TIP:</p>
              <p className="text-xs text-blue-800">
                In Modern Components, after creating a job, click "Copy & Open MCI Connect" or "Copy & Open MCI Field" to copy the job data to your clipboard automatically.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Alert className="bg-green-50 border-green-300">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <AlertTitle className="text-green-900 font-bold">
                ✅ Job Data Loaded Successfully!
              </AlertTitle>
              <AlertDescription className="text-green-800 text-sm mt-2">
                Review the data below and click "Import Job" to create it in this system.
              </AlertDescription>
            </Alert>

            <div className="p-4 bg-white rounded-lg border-2 border-green-300 shadow-sm">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="text-slate-600 font-semibold">Job ID:</span>
                  <span className="font-mono font-bold text-blue-600 text-xs">{importData.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Name:</span>
                  <span className="font-semibold text-slate-900">{importData.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Customer:</span>
                  <span className="font-semibold text-slate-900">{importData.customer_name || 'N/A'}</span>
                </div>
                {importData.address && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Address:</span>
                    <span className="font-semibold text-slate-900 text-right">{importData.address}</span>
                  </div>
                )}
                {importData.contract_amount && (
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="text-slate-600">Contract Amount:</span>
                    <span className="font-bold text-green-600 text-lg">
                      ${(importData.contract_amount || 0).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleImport}
                className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg"
                size="lg"
              >
                <CheckCircle2 className="w-5 h-5 mr-2" />
                ✅ Import Job
              </Button>
              <Button
                onClick={handleCancel}
                variant="outline"
                className="flex-1 bg-white"
                size="lg"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}