import React from 'react';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';

/**
 * I5 - Universal Excel Export Hook
 * Standardized export for all reports and data views
 */

export function exportToExcel(data, filename, sheetName = 'Data') {
  try {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    
    // Auto-size columns
    const maxWidth = 50;
    const colWidths = Object.keys(data[0] || {}).map(key => {
      const maxLen = Math.max(
        key.length,
        ...data.map(row => String(row[key] || '').length)
      );
      return { wch: Math.min(maxLen + 2, maxWidth) };
    });
    worksheet['!cols'] = colWidths;

    XLSX.writeFile(workbook, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
    return true;
  } catch (error) {
    console.error('Excel export failed:', error);
    return false;
  }
}

export function ExcelExportButton({ data, filename, sheetName, buttonText = 'Export Excel', className = '' }) {
  const handleExport = () => {
    const success = exportToExcel(data, filename, sheetName);
    if (!success) {
      alert('Export failed. Please try again.');
    }
  };

  return (
    <Button
      onClick={handleExport}
      variant="outline"
      size="sm"
      className={`border-green-200 text-green-600 hover:bg-green-50 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-900/20 ${className}`}
      disabled={!data || data.length === 0}
    >
      <FileSpreadsheet className="w-4 h-4 mr-2" />
      {buttonText}
    </Button>
  );
}