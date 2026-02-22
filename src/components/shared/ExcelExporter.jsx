import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';

/**
 * Universal Excel Exporter Component
 * Supports Quotes, Invoices, Time Entries, Jobs, Customers, etc.
 */

export const exportToExcel = (data, filename, sheetName = 'Data') => {
  if (!data || data.length === 0) {
    alert('No data to export');
    return;
  }

  // Create worksheet from data
  const ws = XLSX.utils.json_to_sheet(data);
  
  // Create workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  
  // Generate file
  XLSX.writeFile(wb, `${filename}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
};

export default function ExcelExporter({ 
  data, 
  filename, 
  sheetName = 'Data',
  transformData,
  buttonText = 'Export to Excel',
  variant = 'outline',
  size = 'default',
  className = ''
}) {
  const [exporting, setExporting] = React.useState(false);

  const handleExport = async () => {
    try {
      setExporting(true);
      
      // Transform data if function provided
      const exportData = transformData ? transformData(data) : data;
      
      exportToExcel(exportData, filename, sheetName);
      
      setTimeout(() => setExporting(false), 500);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
      setExporting(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleExport}
      disabled={exporting || !data || data.length === 0}
      className={className}
    >
      {exporting ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Exporting...
        </>
      ) : (
        <>
          <Download className="w-4 h-4 mr-2" />
          {buttonText}
        </>
      )}
    </Button>
  );
}

// Transform functions for common entities
export const transformQuotesForExport = (quotes) => {
  return quotes.map(q => ({
    'Quote #': q.quote_number,
    'Customer': q.customer_name,
    'Job Name': q.job_name,
    'Date': q.quote_date,
    'Valid Until': q.valid_until,
    'Total': q.total,
    'Status': q.status,
    'Assigned To': q.assigned_to_name || '',
    'Team': q.team_name || '',
    'Items Count': q.items?.length || 0,
    'Created': format(new Date(q.created_date), 'yyyy-MM-dd HH:mm')
  }));
};

export const transformInvoicesForExport = (invoices) => {
  return invoices.map(inv => ({
    'Invoice #': inv.invoice_number,
    'Customer': inv.customer_name,
    'Job Name': inv.job_name,
    'Invoice Date': inv.invoice_date,
    'Due Date': inv.due_date,
    'Total': inv.total,
    'Amount Paid': inv.amount_paid,
    'Balance': inv.balance,
    'Status': inv.status,
    'Team': inv.team_name || '',
    'Created': format(new Date(inv.created_date), 'yyyy-MM-dd HH:mm')
  }));
};

export const transformTimeEntriesForExport = (entries) => {
  return entries.map(entry => ({
    'Date': entry.date,
    'Employee': entry.employee_name,
    'Job': entry.job_name || 'N/A',
    'Check In': entry.check_in,
    'Check Out': entry.check_out || 'Active',
    'Hours Worked': entry.hours_worked || 0,
    'Hour Type': entry.hour_type,
    'Status': entry.status,
    'Geofence Valid': entry.geofence_validated_backend ? 'Yes' : 'No',
    'Created': format(new Date(entry.created_date), 'yyyy-MM-dd HH:mm')
  }));
};

export const transformJobsForExport = (jobs) => {
  return jobs.map(job => ({
    'Job #': job.job_number,
    'Name': job.name,
    'Customer': job.customer_name,
    'Address': job.address || '',
    'Status': job.status,
    'Contract Amount': job.contract_amount || 0,
    'Real Cost': job.real_cost || 0,
    'Revenue (Real)': job.revenue_real || 0,
    'Profit (Real)': job.profit_real || 0,
    'Commission Amount': job.commission_amount || 0,
    'Commission %': job.commission_percentage || 0,
    'Billing Type': job.billing_type || 'fixed_price',
    'Team': job.team_name || '',
    'Start Date': job.start_date_field || '',
    'Completed Date': job.completed_date || '',
    'Financial Last Updated': job.financial_last_recalculated_at ? format(new Date(job.financial_last_recalculated_at), 'yyyy-MM-dd HH:mm') : '',
    'Created': format(new Date(job.created_date), 'yyyy-MM-dd HH:mm')
  }));
};

export const transformCustomersForExport = (customers) => {
  return customers.map(c => ({
    'Name': c.name || `${c.first_name} ${c.last_name}`,
    'Email': c.email,
    'Phone': c.phone || '',
    'Company': c.company || '',
    'Type': c.customer_type || '',
    'Status': c.status,
    'City': c.billing_city || c.city || '',
    'State': c.billing_state || c.state || '',
    'Customer Since': c.customer_since || '',
    'Created': format(new Date(c.created_date), 'yyyy-MM-dd')
  }));
};