import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Download,
  Eye,
  Trash2,
  Sparkles,
  FolderOpen,
  FileSpreadsheet,
  Copy
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLanguage } from '@/components/i18n/LanguageContext';

export default function InvoicePDFImporter({ onComplete }) {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const [files, setFiles] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [currentFile, setCurrentFile] = useState(0);
  const [extractedInvoices, setExtractedInvoices] = useState([]);
  const [errors, setErrors] = useState([]);

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list(),
    initialData: []
  });

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    console.log('📁 Files selected:', selectedFiles.length);
    setFiles(selectedFiles);
    setExtractedInvoices([]);
    setErrors([]);
    setCurrentFile(0);
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const exportToExcel = () => {
    if (extractedInvoices.length === 0) {
      alert(language === 'es' ? '⚠️ No hay datos para exportar' : '⚠️ No data to export');
      return;
    }

    const headers = [
      'Archivo',
      'Número de Factura',
      'Cliente',
      'Email Cliente',
      'Teléfono Cliente',
      'Proyecto',
      'Dirección',
      'Fecha Factura',
      'Vencimiento',
      'Subtotal',
      'Impuesto %',
      'Monto Impuesto',
      'Total',
      'Notas'
    ];

    const rows = extractedInvoices.map(invoice => [
      invoice.fileName || '',
      invoice.invoice_number || '',
      invoice.customer_name || '',
      invoice.customer_email || '',
      invoice.customer_phone || '',
      invoice.job_name || '',
      invoice.job_address || '',
      invoice.invoice_date || '',
      invoice.due_date || '',
      invoice.subtotal || 0,
      invoice.tax_rate || 0,
      invoice.tax_amount || 0,
      invoice.total || 0,
      (invoice.notes || '').replace(/\n/g, ' ')
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => {
        const cellStr = String(cell);
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(','))
    ].join('\n');

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `facturas-extraidas-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    alert('✅ ' + (language === 'es' 
      ? 'Archivo CSV descargado! Ábrelo con Excel.' 
      : 'CSV file downloaded! Open it with Excel.'));
  };

  const copyToClipboard = () => {
    if (extractedInvoices.length === 0) {
      alert(language === 'es' ? '⚠️ No hay datos para copiar' : '⚠️ No data to copy');
      return;
    }

    const headers = [
      'Archivo',
      'Número',
      'Cliente',
      'Email',
      'Teléfono',
      'Proyecto',
      'Dirección',
      'Fecha',
      'Total'
    ];

    const rows = extractedInvoices.map(invoice => [
      invoice.fileName || '',
      invoice.invoice_number || '',
      invoice.customer_name || '',
      invoice.customer_email || '',
      invoice.customer_phone || '',
      invoice.job_name || '',
      invoice.job_address || '',
      invoice.invoice_date || '',
      `$${invoice.total?.toFixed(2) || '0.00'}`
    ]);

    const tsvContent = [
      headers.join('\t'),
      ...rows.map(row => row.join('\t'))
    ].join('\n');

    navigator.clipboard.writeText(tsvContent).then(() => {
      alert('✅ ' + (language === 'es' 
        ? 'Datos copiados! Ahora pégalos en Excel con Ctrl+V' 
        : 'Data copied! Now paste in Excel with Ctrl+V'));
    }).catch(err => {
      console.error('Failed to copy:', err);
      alert('❌ ' + (language === 'es' ? 'Error al copiar' : 'Failed to copy'));
    });
  };

  const processFiles = async () => {
    if (files.length === 0) {
      alert(language === 'es' ? '⚠️ No hay archivos seleccionados' : '⚠️ No files selected');
      return;
    }

    setProcessing(true);
    setExtractedInvoices([]);
    setErrors([]);
    
    const invoices = [];
    const fileErrors = [];

    for (let i = 0; i < files.length; i++) {
      setCurrentFile(i + 1);
      const file = files[i];

      console.log(`📄 Processing file ${i + 1}/${files.length}: ${file.name}`);

      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        console.log(`✅ Uploaded: ${file.name}`);

        const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
          file_url,
          json_schema: {
            type: "object",
            properties: {
              invoice_number: { type: "string", description: "Invoice number" },
              customer_name: { type: "string", description: "Customer full name or company name" },
              customer_email: { type: "string", description: "Customer email address" },
              customer_phone: { type: "string", description: "Customer phone number" },
              job_name: { type: "string", description: "Project or job name" },
              job_address: { type: "string", description: "Project address" },
              invoice_date: { type: "string", description: "Date of invoice in YYYY-MM-DD format" },
              due_date: { type: "string", description: "Due date in YYYY-MM-DD format" },
              items: {
                type: "array",
                description: "List of items/services in the invoice",
                items: {
                  type: "object",
                  properties: {
                    description: { type: "string" },
                    quantity: { type: "number" },
                    unit: { type: "string" },
                    unit_price: { type: "number" },
                    total: { type: "number" }
                  }
                }
              },
              subtotal: { type: "number", description: "Subtotal amount" },
              tax_rate: { type: "number", description: "Tax rate percentage" },
              tax_amount: { type: "number", description: "Tax amount" },
              total: { type: "number", description: "Total amount" },
              amount_paid: { type: "number", description: "Amount already paid" },
              notes: { type: "string", description: "Additional notes or terms" }
            }
          }
        });

        if (result.status === 'success' && result.output) {
          console.log(`✅ Extracted: ${file.name}`, result.output);
          
          const invoice = {
            ...result.output,
            fileName: file.name,
            status: 'extracted',
            originalFile: file_url,
            balance: (result.output.total || 0) - (result.output.amount_paid || 0)
          };
          
          invoices.push(invoice);
        } else {
          console.error(`❌ Failed to extract: ${file.name}`, result);
          fileErrors.push({
            fileName: file.name,
            error: result.details || 'Failed to extract data'
          });
        }
      } catch (error) {
        console.error(`❌ Error processing ${file.name}:`, error);
        fileErrors.push({
          fileName: file.name,
          error: error.message
        });
      }
    }

    console.log(`✅ Processing complete. Success: ${invoices.length}, Errors: ${fileErrors.length}`);
    setExtractedInvoices(invoices);
    setErrors(fileErrors);
    setProcessing(false);
    setCurrentFile(0);
  };

  const importMutation = useMutation({
    mutationFn: async () => {
      const results = {
        success: 0,
        failed: 0,
        errors: []
      };

      for (const invoice of extractedInvoices) {
        try {
          let customer = customers.find(c => 
            c.email?.toLowerCase() === invoice.customer_email?.toLowerCase() ||
            c.first_name?.toLowerCase() === invoice.customer_name?.toLowerCase() ||
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

          const invoiceStatus = (invoice.amount_paid >= invoice.total) ? 'paid' : 
                                (invoice.amount_paid > 0) ? 'partial' : 'sent';

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
            amount_paid: invoice.amount_paid || 0,
            balance: invoice.balance || invoice.total || 0,
            notes: invoice.notes || '',
            status: invoiceStatus
          });

          results.success++;
        } catch (error) {
          console.error('Error importing invoice:', error);
          results.failed++;
          results.errors.push({
            invoice: invoice.invoice_number || invoice.fileName,
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
      setExtractedInvoices([]);
      setFiles([]);
      setErrors([]);
    }
  });

  const removeInvoice = (index) => {
    setExtractedInvoices(prev => prev.filter((_, i) => i !== index));
  };

  const progress = files.length > 0 ? (currentFile / files.length) * 100 : 0;

  return (
    <div className="space-y-6">
      <Card className="bg-white shadow-xl border-slate-200">
        <CardHeader className="border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardTitle className="flex items-center gap-2 text-slate-900">
            <Sparkles className="w-5 h-5 text-blue-500" />
            {language === 'es' ? 'Importar desde PDFs (con IA)' : 'Import from PDFs (with AI)'}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div>
              <Label className="text-slate-700 font-medium mb-2 block">
                {language === 'es' ? 'Selecciona archivos PDF' : 'Select PDF files'}
              </Label>
              <Input
                type="file"
                accept=".pdf"
                multiple
                onChange={handleFileSelect}
                disabled={processing}
                className="bg-white border-slate-300 text-slate-900 cursor-pointer"
              />
              <p className="text-xs text-slate-500 mt-2">
                {language === 'es' 
                  ? '💡 Puedes seleccionar TODOS los archivos a la vez (Ctrl+A o Cmd+A)'
                  : '💡 You can select ALL files at once (Ctrl+A or Cmd+A)'}
              </p>
            </div>

            {files.length > 0 && !processing && extractedInvoices.length === 0 && (
              <Alert className="bg-blue-50 border-blue-200">
                <FolderOpen className="w-4 h-4 text-blue-600" />
                <AlertTitle className="text-blue-900 font-bold">
                  ✅ {files.length} {language === 'es' ? 'archivos cargados' : 'files loaded'}
                </AlertTitle>
                <AlertDescription className="text-blue-900 text-sm">
                  {language === 'es' 
                    ? 'Haz clic en "Procesar con IA" para extraer los datos'
                    : 'Click "Process with AI" to extract data'}
                </AlertDescription>
              </Alert>
            )}

            {files.length > 0 && !processing && extractedInvoices.length === 0 && (
              <Button
                onClick={processFiles}
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg"
                size="lg"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                {language === 'es' ? `Procesar ${files.length} Archivos con IA` : `Process ${files.length} Files with AI`}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {processing && (
        <Card className="bg-white shadow-xl border-slate-200">
          <CardHeader className="border-b border-slate-200">
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
              {language === 'es' ? 'Procesando...' : 'Processing...'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm text-slate-700 mb-2">
                  <span>{language === 'es' ? 'Progreso' : 'Progress'}</span>
                  <span className="font-bold">{currentFile} / {files.length}</span>
                </div>
                <Progress value={progress} className="h-3" />
                <p className="text-xs text-slate-500 mt-1">
                  {progress.toFixed(0)}% {language === 'es' ? 'completado' : 'complete'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {extractedInvoices.length > 0 && (
        <Card className="bg-white shadow-xl border-slate-200">
          <CardHeader className="border-b border-slate-200 bg-gradient-to-r from-green-50 to-emerald-50">
            <CardTitle className="flex items-center justify-between text-slate-900">
              <span className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                {language === 'es' ? 'Datos Extraídos' : 'Extracted Data'}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  onClick={copyToClipboard}
                  variant="outline"
                  size="sm"
                  className="bg-white border-blue-300 text-blue-700 hover:bg-blue-50"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  {language === 'es' ? 'Copiar' : 'Copy'}
                </Button>
                <Button
                  onClick={exportToExcel}
                  variant="outline"
                  size="sm"
                  className="bg-white border-green-300 text-green-700 hover:bg-green-50"
                >
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Excel
                </Button>
                <Badge className="bg-green-100 text-green-700 border-green-300">
                  {extractedInvoices.length} {language === 'es' ? 'extraídos' : 'extracted'}
                </Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 border-slate-200">
                    <TableHead className="text-slate-700 font-semibold">{language === 'es' ? 'Archivo' : 'File'}</TableHead>
                    <TableHead className="text-slate-700 font-semibold">{language === 'es' ? 'Cliente' : 'Customer'}</TableHead>
                    <TableHead className="text-slate-700 font-semibold">{language === 'es' ? 'Proyecto' : 'Project'}</TableHead>
                    <TableHead className="text-right text-slate-700 font-semibold">{language === 'es' ? 'Total' : 'Total'}</TableHead>
                    <TableHead className="text-right text-slate-700 font-semibold">{language === 'es' ? 'Acciones' : 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {extractedInvoices.map((invoice, index) => (
                    <TableRow key={index} className="hover:bg-slate-50 border-slate-200">
                      <TableCell className="text-slate-900 text-sm font-medium max-w-xs truncate">{invoice.fileName}</TableCell>
                      <TableCell className="text-slate-700">{invoice.customer_name || '-'}</TableCell>
                      <TableCell className="text-slate-700">{invoice.job_name || '-'}</TableCell>
                      <TableCell className="text-right font-bold text-[#3B9FF3]">
                        ${invoice.total?.toFixed(2) || '0.00'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(invoice.originalFile, '_blank')}
                            className="text-slate-600 hover:text-blue-600 hover:bg-blue-50"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeInvoice(index)}
                            className="text-slate-600 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            <div className="p-6 border-t border-slate-200 bg-slate-50">
              <Button
                onClick={() => importMutation.mutate()}
                disabled={importMutation.isPending}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg"
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
                    {language === 'es' ? `Importar ${extractedInvoices.length} Facturas` : `Import ${extractedInvoices.length} Invoices`}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {errors.length > 0 && (
        <Card className="bg-white shadow-xl border-red-300">
          <CardHeader className="border-b border-slate-200 bg-red-50">
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <XCircle className="w-5 h-5 text-red-500" />
              {language === 'es' ? 'Errores' : 'Errors'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-2">
              {errors.map((err, index) => (
                <Alert key={index} className="bg-red-50 border-red-200">
                  <AlertDescription className="text-red-900">
                    <strong>{err.fileName}:</strong> {err.error}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}