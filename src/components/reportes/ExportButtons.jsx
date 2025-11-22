import React from 'react';
import { Button } from '@/components/ui/button';
import { FileDown, FileText } from 'lucide-react';
import { format } from 'date-fns';

export default function ExportButtons({ 
  onExportCSV, 
  onExportPDF, 
  isExporting = false,
  fileName = 'report'
}) {
  return (
    <div className="flex gap-2">
      <Button
        onClick={onExportCSV}
        disabled={isExporting}
        variant="outline"
        className="border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        <FileDown className="w-4 h-4 mr-2" />
        Export CSV
      </Button>
      <Button
        onClick={onExportPDF}
        disabled={isExporting}
        variant="outline"
        className="border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        <FileText className="w-4 h-4 mr-2" />
        Export PDF
      </Button>
    </div>
  );
}

// Utility function to export data to CSV
export function exportToCSV(data, fileName) {
  if (!data || data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Handle values that contain commas or quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    )
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${fileName}_${format(new Date(), 'yyyy-MM-dd')}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Utility function to export data to PDF
export function exportToPDF(htmlContent, fileName) {
  const printWindow = window.open('', '_blank');
  
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${fileName}</title>
        <style>
          @media print {
            body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f3f4f6; font-weight: bold; }
            h1 { color: #1e293b; margin-bottom: 10px; }
            .report-header { margin-bottom: 20px; }
            .report-date { color: #64748b; font-size: 14px; }
          }
        </style>
      </head>
      <body>
        <div class="report-header">
          <h1>${fileName}</h1>
          <div class="report-date">Generated on ${format(new Date(), 'MMMM dd, yyyy')}</div>
        </div>
        ${htmlContent}
      </body>
    </html>
  `);
  
  printWindow.document.close();
  
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 250);
}