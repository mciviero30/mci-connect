
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  Loader2,
  Download,
  Trash2,
  FileDown
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLanguage } from '@/components/i18n/LanguageContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function InvoiceXLSXImporter({ onComplete }) {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const [file, setFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [extractedInvoices, setExtractedInvoices] = useState([]);
  const [error, setError] = useState(null);

  // NEW: Filter states
  const [statusFilter, setStatusFilter] = useState('all');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list(),
    initialData: []
  });

  const downloadTemplate = () => {
    const headers = [
      'invoice_number',
      'customer_name',
      'customer_email',
      'customer_phone',
      'job_name',
      'job_address',
      'invoice_date',
      'due_date',
      'item_1_description',
      'item_1_quantity',
      'item_1_unit',
      'item_1_unit_price',
      'item_2_description',
      'item_2_quantity',
      'item_2_unit',
      'item_2_unit_price',
      'item_3_description',
      'item_3_quantity',
      'item_3_unit',
      'item_3_unit_price',
      'tax_rate',
      'notes',
      'status'
    ];

    const example = [
      'INV-001',
      'John Doe Inc',
      'john@example.com',
      '(555) 123-4567',
      'Kitchen Remodel',
      '123 Main St, Atlanta, GA',
      '2024-01-15',
      '2024-02-15',
      'Labor',
      '40',
      'hours',
      '50',
      'Materials',
      '1',
      'lot',
      '2500',
      'Equipment Rental',
      '5',
      'days',
      '100',
      '7',
      'Net 30',
      'sent'
    ];

    const csvContent = [
      headers.join(','),
      example.join(',')
    ].join('\n');

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'plantilla-facturas.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setExtractedInvoices([]);
      setError(null);
      // Reset filters when a new file is selected
      setStatusFilter('all');
      setMinAmount('');
      setMaxAmount('');
    }
  };

  const processFile = async () => {
    if (!file) {
      alert(language === 'es' ? '⚠️ No hay archivo seleccionado' : '⚠️ No file selected');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: {
            invoices: {
              type: "array",
              description: "List of invoices from the spreadsheet",
              items: {
                type: "object",
                properties: {
                  invoice_number: { type: "string" },
                  customer_name: { type: "string" },
                  customer_email: { type: "string" },
                  customer_phone: { type: "string" },
                  job_name: { type: "string" },
                  job_address: { type: "string" },
                  invoice_date: { type: "string", description: "YYYY-MM-DD format" },
                  due_date: { type: "string", description: "YYYY-MM-DD format" },
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        description: { type: "string" },
                        quantity: { type: "number" },
                        unit: { type: "string" },
                        unit_price: { type: "number" },
                        total: { type: "number" } // total added for consistency with calculations
                      }
                    }
                  },
                  tax_rate: { type: "number" },
                  notes: { type: "string" },
                  status: { type: "string", enum: ["draft", "sent", "paid", "partial", "overdue"] }
                }
              }
            }
          }
        }
      });

      if (result.status === 'success' && result.output?.invoices) {
        console.log('✅ Extracted invoices:', result.output.invoices);

        const invoicesWithTotals = result.output.invoices.map(invoice => {
          const items = invoice.items || [];
          const subtotal = items.reduce((sum, item) => {
            const itemTotal = (item.quantity || 0) * (item.unit_price || 0);
            return sum + itemTotal;
          }, 0);

          const tax_amount = subtotal * ((invoice.tax_rate || 0) / 100);
          const total = subtotal + tax_amount;

          return {
            ...invoice,
            items: items.map(item => ({
              ...item,
              total: (item.quantity || 0) * (item.unit_price || 0)
            })),
            subtotal,
            tax_amount,
            total,
            balance: total
          };
        });

        setExtractedInvoices(invoicesWithTotals);
      } else {
        throw new Error(result.details || 'Failed to extract data from file');
      }
    } catch (err) {
      console.error('Error processing file:', err);
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  // NEW: Apply filters
  const filteredInvoices = extractedInvoices.filter(invoice => {
    // Status filter
    if (statusFilter !== 'all' && invoice.status !== statusFilter) return false;

    // Min Amount filter
    if (minAmount !== '' && invoice.total < parseFloat(minAmount)) return false;

    // Max Amount filter
    if (maxAmount !== '' && invoice.total > parseFloat(maxAmount)) return false;

    return true;
  });

  const importMutation = useMutation({
    mutationFn: async (invoicesToImport) => { // Accept invoices as an argument
      const results = {
        success: 0,
        failed: 0,
        errors: []
      };

      for (const invoice of invoicesToImport) { // Iterate over the provided invoices
        try {
          let customer = customers.find(c =>
            c.email?.toLowerCase() === invoice.customer_email?.toLowerCase() ||
            c.company?.toLowerCase() === invoice.customer_name?.toLowerCase()
          );

          let customer_id = customer?.id;

          if (!customer && invoice.customer_name) {
            const nameParts = invoice.customer_name.split(' ');
            const newCustomer = await base44.entities.Customer.create({
              first_name: nameParts[0] || '',
              last_name: nameParts.slice(1).join(' ') || '',
              email: invoice.customer_email || '',
              phone: invoice.customer_phone || '',
              company: invoice.customer_name,
              status: 'active'
            });
            customer_id = newCustomer.id;
          }

          await base44.entities.Invoice.create({
            invoice_number: invoice.invoice_number || `INV-${Date.now()}`,
            customer_id,
            customer_name: invoice.customer_name || '',
            customer_email: invoice.customer_email || '',
            customer_phone: invoice.customer_phone || '',
            job_name: invoice.job_name || '',
            job_address: invoice.job_address || '',
            invoice_date: invoice.invoice_date || new Date().toISOString().split('T')[0],
            due_date: invoice.due_date || '',
            items: invoice.items || [],
            subtotal: invoice.subtotal || 0,
            tax_rate: invoice.tax_rate || 0,
            tax_amount: invoice.tax_amount || 0,
            total: invoice.total || 0,
            balance: invoice.balance || invoice.total || 0,
            amount_paid: 0,
            notes: invoice.notes || '',
            status: invoice.status || 'sent'
          });

          results.success++;
        } catch (error) {
          console.error('Error importing invoice:', error);
          results.failed++;
          results.errors.push({
            invoice: invoice.invoice_number || invoice.customer_name,
            error: error.message
          });
        }
      }

      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });

      alert(`✅ ${language === 'es' ? 'Importación completada' : 'Import completed'}!\n\n${language === 'es' ? 'Exitosos' : 'Success'}: ${results.success}\n${language === 'es' ? 'Fallidos' : 'Failed'}: ${results.failed}`);

      if (onComplete) onComplete();
      setExtractedInvoices([]); // Clear extracted invoices after import
      setFile(null); // Clear file as well
      // Reset filters
      setStatusFilter('all');
      setMinAmount('');
      setMaxAmount('');
    }
  });

  const removeInvoice = (indexToRemove) => {
    // If filtering is active, we need to find the original index of the invoice in extractedInvoices
    const actualInvoice = filteredInvoices[indexToRemove];
    const originalIndex = extractedInvoices.indexOf(actualInvoice);

    if (originalIndex > -1) {
      setExtractedInvoices(prev => prev.filter((_, i) => i !== originalIndex));
    }
  };


  return (
    <div className="space-y-6">
      <Card className="bg-white shadow-xl border-slate-200">
        <CardHeader className="border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardTitle className="flex items-center gap-2 text-slate-900">
            <FileSpreadsheet className="w-5 h-5 text-blue-500" />
            {language === 'es' ? 'Importar desde Excel/CSV' : 'Import from Excel/CSV'}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div>
              <Label className="text-slate-700 font-medium mb-2 block">
                {language === 'es' ? 'Selecciona archivo Excel o CSV' : 'Select Excel or CSV file'}
              </Label>
              <Input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileSelect}
                disabled={processing}
                className="bg-white border-slate-300 text-slate-900 cursor-pointer"
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={downloadTemplate}
                variant="outline"
                className="bg-white border-blue-300 text-blue-700 hover:bg-blue-50"
              >
                <FileDown className="w-4 h-4 mr-2" />
                {language === 'es' ? 'Descargar Plantilla' : 'Download Template'}
              </Button>

              {file && (
                <Button
                  onClick={processFile}
                  disabled={processing}
                  className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white"
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {language === 'es' ? 'Procesando...' : 'Processing...'}
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      {language === 'es' ? 'Procesar Archivo' : 'Process File'}
                    </>
                  )}
                </Button>
              )}
            </div>

            {file && (
              <Alert className="bg-blue-50 border-blue-200">
                <AlertDescription className="text-blue-900">
                  📄 <strong>{file.name}</strong> - {(file.size / 1024).toFixed(2)} KB
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert className="bg-red-50 border-red-200">
          <XCircle className="w-4 h-4 text-red-600" />
          <AlertTitle className="text-red-900 font-bold">
            {language === 'es' ? 'Error' : 'Error'}
          </AlertTitle>
          <AlertDescription className="text-red-900">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* NEW: Filters */}
      {extractedInvoices.length > 0 && (
        <Card className="bg-white shadow-xl border-slate-200">
          <CardHeader className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50">
            <CardTitle className="text-slate-900 text-lg">
              {language === 'es' ? '🔍 Filtros Avanzados' : '🔍 Advanced Filters'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label className="text-slate-700 font-medium mb-2 block">
                  {language === 'es' ? 'Estado' : 'Status'}
                </Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="bg-white border-slate-300 text-slate-900">
                    <SelectValue placeholder={language === 'es' ? 'Selecciona estado' : 'Select status'}/>
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    <SelectItem value="all" className="text-slate-900">
                      {language === 'es' ? 'Todos' : 'All'}
                    </SelectItem>
                    <SelectItem value="draft" className="text-slate-900">
                      {language === 'es' ? 'Borrador' : 'Draft'}
                    </SelectItem>
                    <SelectItem value="sent" className="text-slate-900">
                      {language === 'es' ? 'Enviado' : 'Sent'}
                    </SelectItem>
                    <SelectItem value="paid" className="text-slate-900">
                      {language === 'es' ? 'Pagado' : 'Paid'}
                    </SelectItem>
                    <SelectItem value="partial" className="text-slate-900">
                      {language === 'es' ? 'Parcial' : 'Partial'}
                    </SelectItem>
                    <SelectItem value="overdue" className="text-slate-900">
                      {language === 'es' ? 'Vencido' : 'Overdue'}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-slate-700 font-medium mb-2 block">
                  {language === 'es' ? 'Monto Mínimo' : 'Min Amount'}
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={minAmount}
                  onChange={(e) => setMinAmount(e.target.value)}
                  placeholder="$0.00"
                  className="bg-white border-slate-300 text-slate-900"
                />
              </div>

              <div>
                <Label className="text-slate-700 font-medium mb-2 block">
                  {language === 'es' ? 'Monto Máximo' : 'Max Amount'}
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={maxAmount}
                  onChange={(e) => setMaxAmount(e.target.value)}
                  placeholder="$999,999.99"
                  className="bg-white border-slate-300 text-slate-900"
                />
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-slate-600">
                {language === 'es'
                  ? `Mostrando ${filteredInvoices.length} de ${extractedInvoices.length} facturas`
                  : `Showing ${filteredInvoices.length} of ${extractedInvoices.length} invoices`}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setStatusFilter('all');
                  setMinAmount('');
                  setMaxAmount('');
                }}
                className="bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                {language === 'es' ? 'Limpiar Filtros' : 'Clear Filters'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Extracted Invoices - UPDATED */}
      {extractedInvoices.length > 0 && (
        <Card className="bg-white shadow-xl border-slate-200">
          <CardHeader className="border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardTitle className="flex items-center justify-between text-slate-900">
              <span className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-blue-500" />
                {language === 'es' ? 'Datos Extraídos' : 'Extracted Data'}
              </span>
              <Badge className="bg-blue-100 text-blue-700 border-blue-300">
                {filteredInvoices.length} {language === 'es' ? 'facturas' : 'invoices'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 border-slate-200">
                    <TableHead className="text-slate-700 font-semibold">#</TableHead>
                    <TableHead className="text-slate-700 font-semibold">{language === 'es' ? 'Cliente' : 'Customer'}</TableHead>
                    <TableHead className="text-slate-700 font-semibold">{language === 'es' ? 'Proyecto' : 'Project'}</TableHead>
                    <TableHead className="text-slate-700 font-semibold">{language === 'es' ? 'Fecha' : 'Date'}</TableHead>
                    <TableHead className="text-slate-700 font-semibold">{language === 'es' ? 'Estado' : 'Status'}</TableHead>
                    <TableHead className="text-right text-slate-700 font-semibold">{language === 'es' ? 'Total' : 'Total'}</TableHead>
                    <TableHead className="text-right text-slate-700 font-semibold">{language === 'es' ? 'Acciones' : 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((invoice, index) => (
                    <TableRow key={index} className="hover:bg-slate-50 border-slate-200">
                      <TableCell className="text-slate-700">{invoice.invoice_number || '-'}</TableCell>
                      <TableCell className="text-slate-900">{invoice.customer_name || '-'}</TableCell>
                      <TableCell className="text-slate-700">{invoice.job_name || '-'}</TableCell>
                      <TableCell className="text-slate-700">{invoice.invoice_date || '-'}</TableCell>
                      <TableCell>
                        <Badge className="bg-blue-100 text-blue-700 border-blue-300">
                          {invoice.status || 'sent'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold text-[#3B9FF3]">
                        ${invoice.total?.toFixed(2) || '0.00'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeInvoice(index)}
                          className="text-slate-600 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="p-6 border-t border-slate-200 bg-slate-50">
              <Button
                onClick={() => {
                  // Only import the currently filtered invoices
                  importMutation.mutate(filteredInvoices);
                }}
                disabled={importMutation.isPending || filteredInvoices.length === 0}
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg"
                size="lg"
              >
                {importMutation.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    {language === 'es' ? 'Importando...' : 'Importing...'}
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5 mr-2" />
                    {language === 'es' ? `Importar ${filteredInvoices.length} Facturas` : `Import ${filteredInvoices.length} Invoices`}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!file && extractedInvoices.length === 0 && (
        <Card className="bg-white shadow-xl border-slate-200">
          <CardHeader className="border-b border-slate-200">
            <CardTitle className="text-slate-900">
              {language === 'es' ? '📋 Instrucciones' : '📋 Instructions'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <ol className="list-decimal list-inside space-y-3 text-slate-700">
              <li>
                {language === 'es'
                  ? 'Descarga la plantilla haciendo clic en "Descargar Plantilla"'
                  : 'Download the template by clicking "Download Template"'}
              </li>
              <li>
                {language === 'es'
                  ? 'Abre la plantilla en Excel y completa tus facturas'
                  : 'Open the template in Excel and complete your invoices'}
              </li>
              <li>
                {language === 'es'
                  ? 'Puedes agregar múltiples facturas en el mismo archivo (una por fila)'
                  : 'You can add multiple invoices in the same file (one per row)'}
              </li>
              <li>
                {language === 'es'
                  ? 'Guarda el archivo como .xlsx o .csv'
                  : 'Save the file as .xlsx or .csv'}
              </li>
              <li>
                {language === 'es'
                  ? 'Sube el archivo y haz clic en "Procesar Archivo"'
                  : 'Upload the file and click "Process File"'}
              </li>
              <li>
                {language === 'es'
                  ? 'Revisa los datos extraídos y haz clic en "Importar"'
                  : 'Review extracted data and click "Import"'}
              </li>
            </ol>

            <Alert className="mt-6 bg-blue-50 border-blue-200">
              <AlertTitle className="text-blue-900 font-bold">
                💡 {language === 'es' ? 'Nota' : 'Note'}
              </AlertTitle>
              <AlertDescription className="text-blue-900">
                {language === 'es'
                  ? 'Los estados válidos para facturas son: draft, sent, paid, partial, overdue'
                  : 'Valid invoice statuses are: draft, sent, paid, partial, overdue'}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
