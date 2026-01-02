/**
 * Export commission data to CSV
 * Read-only utility function
 */

export const exportCommissionCSV = (data, filename = 'commissions.csv') => {
  if (!data || data.length === 0) {
    alert('No data to export');
    return;
  }

  // Define CSV headers
  const headers = [
    'ID',
    'Job Name',
    'Employee Name',
    'Employee Email',
    'Calculation Date',
    'Job Revenue',
    'Job Expenses',
    'Net Profit',
    'Commission Rate (%)',
    'Commission Amount',
    'Status',
    'Approved By',
    'Approved Date',
    'Paid By',
    'Paid Date',
    'Notes',
  ];

  // Map data to CSV rows
  const rows = data.map(result => [
    result.id || '',
    result.job_name || '',
    result.employee_name || '',
    result.employee_email || '',
    result.calculation_date ? new Date(result.calculation_date).toLocaleDateString() : '',
    result.job_revenue?.toFixed(2) || '0.00',
    result.job_expenses?.toFixed(2) || '0.00',
    result.net_profit?.toFixed(2) || '0.00',
    result.adjusted_commission_rate?.toFixed(2) || result.base_commission_rate?.toFixed(2) || '0.00',
    result.commission_amount?.toFixed(2) || '0.00',
    result.status || '',
    result.approved_by || '',
    result.approved_at ? new Date(result.approved_at).toLocaleDateString() : '',
    result.paid_by || '',
    result.paid_at ? new Date(result.paid_at).toLocaleDateString() : '',
    (result.notes || '').replace(/"/g, '""'), // Escape quotes in notes
  ]);

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(field => `"${field}"`).join(','))
  ].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};