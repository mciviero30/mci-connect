import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  FileSpreadsheet, 
  Download, 
  FileText, 
  Users, 
  Receipt,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { exportToQuickBooks } from '@/functions/exportToQuickBooks';

export default function QuickBooksExport() {
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleExport = async (type) => {
    setLoading(true);
    try {
      const response = await exportToQuickBooks({ 
        type,
        start_date: startDate || undefined,
        end_date: endDate || undefined
      });

      // Download file
      const blob = new Blob([response.data], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `QuickBooks_${type}_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const exportOptions = [
    {
      type: 'invoices',
      title: 'Invoices',
      description: 'Export all invoices with line items',
      icon: FileText,
      color: 'from-blue-500 to-blue-600',
      borderColor: 'border-blue-200 dark:border-blue-800',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20'
    },
    {
      type: 'customers',
      title: 'Customers',
      description: 'Export customer contact information',
      icon: Users,
      color: 'from-green-500 to-green-600',
      borderColor: 'border-green-200 dark:border-green-800',
      bgColor: 'bg-green-50 dark:bg-green-900/20'
    },
    {
      type: 'expenses',
      title: 'Expenses',
      description: 'Export approved expenses (approved only)',
      icon: Receipt,
      color: 'from-purple-500 to-purple-600',
      borderColor: 'border-purple-200 dark:border-purple-800',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20'
    },
    {
      type: 'all',
      title: 'Complete Export',
      description: 'All data in one file (3 sheets)',
      icon: FileSpreadsheet,
      color: 'from-orange-500 to-orange-600',
      borderColor: 'border-orange-200 dark:border-orange-800',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 pb-20 md:pb-0">
      <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
              <FileSpreadsheet className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                QuickBooks Export
              </h1>
              <p className="text-slate-600 dark:text-slate-400">
                Export your data to Excel format compatible with QuickBooks
              </p>
            </div>
          </div>

          {/* Date Range Filter */}
          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 mt-6">
            <CardHeader>
              <CardTitle className="text-lg">Date Range Filter (Optional)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-white dark:bg-slate-700"
                  />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-white dark:bg-slate-700"
                  />
                </div>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                Leave empty to export all records
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Export Options */}
        <div className="grid md:grid-cols-2 gap-6">
          {exportOptions.map(option => (
            <Card 
              key={option.type}
              className={`bg-white dark:bg-slate-800 border-2 ${option.borderColor} hover:shadow-xl transition-all`}
            >
              <CardHeader className={option.bgColor}>
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 bg-gradient-to-br ${option.color} rounded-xl flex items-center justify-center shadow-lg`}>
                    <option.icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">{option.title}</CardTitle>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      {option.description}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <Button
                  onClick={() => handleExport(option.type)}
                  disabled={loading}
                  className={`w-full bg-gradient-to-r ${option.color} text-white shadow-lg hover:shadow-xl transition-all`}
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Export {option.title}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Instructions */}
        <Card className="mt-8 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-blue-600" />
              How to Import to QuickBooks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                  1
                </div>
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">Export Data</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Click the export button above to download your data
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                  2
                </div>
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">Open QuickBooks</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Go to File → Utilities → Import → Excel Files
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                  3
                </div>
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">Select File</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Choose the downloaded Excel file
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                  4
                </div>
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">Map Fields</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    QuickBooks will auto-map most fields. Review and confirm.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-semibold text-green-700 dark:text-green-400">Import Complete</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Your data is now in QuickBooks!
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <p className="text-sm text-amber-900 dark:text-amber-200">
                <strong>Note:</strong> Always backup your QuickBooks file before importing data. 
                Review the imported records to ensure accuracy.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Export Stats */}
        <div className="mt-8 grid md:grid-cols-3 gap-4">
          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Format</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">Excel (.xlsx)</p>
                </div>
                <FileSpreadsheet className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Compatible With</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">QuickBooks</p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Data Included</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">All Fields</p>
                </div>
                <ArrowRight className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}