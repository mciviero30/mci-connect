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
    // Process in chunks for large datasets
    const chunkSize = 1000;
    const chunks = [];
    
    for (let i = 0; i < data.length; i += chunkSize) {
      chunks.push(data.slice(i, i + chunkSize));
    }

    // Process first chunk to create worksheet
    const worksheet = XLSX.utils.json_to_sheet(chunks[0] || []);
    
    // Append remaining chunks
    for (let i = 1; i < chunks.length; i++) {
      XLSX.utils.sheet_add_json(worksheet, chunks[i], { skipHeader: true, origin: -1 });
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    
    // Auto-size columns (optimized)
    const maxWidth = 50;
    const sampleSize = Math.min(100, data.length); // Only check first 100 rows for performance
    const colWidths = Object.keys(data[0] || {}).map(key => {
      const maxLen = Math.max(
        key.length,
        ...data.slice(0, sampleSize).map(row => String(row[key] || '').length)
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