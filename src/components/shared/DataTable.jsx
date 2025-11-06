import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

export default function DataTable({ 
  columns, 
  data, 
  isLoading, 
  emptyMessage = "No hay datos disponibles",
  emptyIcon: EmptyIcon,
  onRowClick 
}) {
  if (isLoading) {
    return (
      <div className="space-y-3 p-6">
        {[1, 2, 3, 4, 5].map(i => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-16">
        {EmptyIcon && <EmptyIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />}
        <p className="text-slate-500 text-lg">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50 hover:bg-slate-50">
            {columns.map((column, idx) => (
              <TableHead 
                key={idx} 
                className={column.className}
                style={{ width: column.width }}
              >
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, rowIdx) => (
            <TableRow 
              key={rowIdx} 
              className={`hover:bg-slate-50/50 ${onRowClick ? 'cursor-pointer' : ''}`}
              onClick={() => onRowClick && onRowClick(row)}
            >
              {columns.map((column, colIdx) => (
                <TableCell key={colIdx} className={column.cellClassName}>
                  {column.render ? column.render(row) : row[column.accessor]}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}