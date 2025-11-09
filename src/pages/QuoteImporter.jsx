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
import PageHeader from '../components/shared/PageHeader';
import { useLanguage } from '@/components/i18n/LanguageContext';

export default function QuoteImporter() {
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();
  const [files, setFiles] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [currentFile, setCurrentFile] = useState(0);
  const [extractedQuotes, setExtractedQuotes] = useState([]);
  const [errors, setErrors] = useState([]);

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list(),
    initialData: []
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list(),
    initialData: []
  });

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    console.log('📁 Files selected:', selectedFiles.length);
    setFiles(selectedFiles);
    setExtractedQuotes([]);
    setErrors([]);
    setCurrentFile(0);
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const exportToExcel = () => {
    if (extractedQuotes.length === 0) {
      alert(language === 'es' ? '⚠️ No hay datos para exportar' : '⚠️ No data to export');
      return;
    }

    // Create CSV content
    const headers = [
      'Archivo',
      'Número de Estimado',
      'Cliente',
      'Email Cliente',
      'Teléfono Cliente',
      'Proyecto',
      'Dirección',
      'Fecha Estimado',
      'Válido Hasta',
      'Subtotal',
      'Impuesto %',
      'Monto Impuesto',
      'Total',
      'Notas'
    ];

    const rows = extractedQuotes.map(quote => [
      quote.fileName || '',
      quote.quote_number || '',
      quote.customer_name || '',
      quote.customer_email || '',
      quote.customer_phone || '',
      quote.job_name || '',
      quote.job_address || '',
      quote.quote_date || '',
      quote.valid_until || '',
      quote.subtotal || 0,
      quote.tax_rate || 0,
      quote.tax_amount || 0,
      quote.total || 0,
      (quote.notes || '').replace(/\n/g, ' ')
    ]);

    // Convert to CSV
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => {
        // Escape commas and quotes
        const cellStr = String(cell);
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(','))
    ].join('\n');

    // Add BOM for Excel UTF-8 support
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `estimados-extraidos-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    alert('✅ ' + (language === 'es' 
      ? 'Archivo CSV descargado! Ábrelo con Excel.' 
      : 'CSV file downloaded! Open it with Excel.'));
  };

  const copyToClipboard = () => {
    if (extractedQuotes.length === 0) {
      alert(language === 'es' ? '⚠️ No hay datos para copiar' : '⚠️ No data to copy');
      return;
    }

    // Create tab-separated text for Excel paste
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

    const rows = extractedQuotes.map(quote => [
      quote.fileName || '',
      quote.quote_number || '',
      quote.customer_name || '',
      quote.customer_email || '',
      quote.customer_phone || '',
      quote.job_name || '',
      quote.job_address || '',
      quote.quote_date || '',
      `$${quote.total?.toFixed(2) || '0.00'}`
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
    setExtractedQuotes([]);
    setErrors([]);
    
    const quotes = [];
    const fileErrors = [];

    for (let i = 0; i < files.length; i++) {
      setCurrentFile(i + 1);
      const file = files[i];

      console.log(`📄 Processing file ${i + 1}/${files.length}: ${file.name}`);

      try {
        // Upload file first
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        console.log(`✅ Uploaded: ${file.name}`);

        // Extract data with AI
        const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
          file_url,
          json_schema: {
            type: "object",
            properties: {
              quote_number: { type: "string", description: "Quote or estimate number" },
              customer_name: { type: "string", description: "Customer full name or company name" },
              customer_email: { type: "string", description: "Customer email address" },
              customer_phone: { type: "string", description: "Customer phone number" },
              job_name: { type: "string", description: "Project or job name" },
              job_address: { type: "string", description: "Project address" },
              quote_date: { type: "string", description: "Date of quote in YYYY-MM-DD format" },
              valid_until: { type: "string", description: "Valid until date in YYYY-MM-DD format" },
              items: {
                type: "array",
                description: "List of items/services in the quote",
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
              notes: { type: "string", description: "Additional notes or terms" }
            }
          }
        });

        if (result.status === 'success' && result.output) {
          console.log(`✅ Extracted: ${file.name}`, result.output);
          quotes.push({
            ...result.output,
            fileName: file.name,
            status: 'extracted',
            originalFile: file_url
          });
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

    console.log(`✅ Processing complete. Success: ${quotes.length}, Errors: ${fileErrors.length}`);
    setExtractedQuotes(quotes);
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

      for (const quote of extractedQuotes) {
        try {
          // Find or create customer
          let customer = customers.find(c => 
            c.email?.toLowerCase() === quote.customer_email?.toLowerCase() ||
            c.first_name?.toLowerCase() === quote.customer_name?.toLowerCase() ||
            c.company?.toLowerCase() === quote.customer_name?.toLowerCase()
          );

          let customer_id = customer?.id;

          if (!customer && quote.customer_name) {
            // Create new customer
            const nameParts = quote.customer_name.split(' ');
            const newCustomer = await base44.entities.Customer.create({
              first_name: nameParts[0] || '',
              last_name: nameParts.slice(1).join(' ') || '',
              email: quote.customer_email || '',
              phone: quote.customer_phone || '',
              company: quote.customer_name,
              status: 'active'
            });
            customer_id = newCustomer.id;
          }

          // Create quote
          await base44.entities.Quote.create({
            quote_number: quote.quote_number || `EST-${Date.now()}`,
            customer_id,
            customer_name: quote.customer_name || '',
            customer_email: quote.customer_email || '',
            customer_phone: quote.customer_phone || '',
            job_name: quote.job_name || '',
            job_address: quote.job_address || '',
            quote_date: quote.quote_date || new Date().toISOString().split('T')[0],
            valid_until: quote.valid_until || '',
            items: quote.items || [],
            subtotal: quote.subtotal || 0,
            tax_rate: quote.tax_rate || 0,
            tax_amount: quote.tax_amount || 0,
            total: quote.total || 0,
            notes: quote.notes || '',
            status: 'sent' // Assuming historical quotes were sent
          });

          results.success++;
        } catch (error) {
          console.error('Error importing quote:', error);
          results.failed++;
          results.errors.push({
            quote: quote.quote_number || quote.fileName,
            error: error.message
          });
        }
      }

      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      
      alert(`✅ ${language === 'es' ? 'Importación completada' : 'Import completed'}!\n\n${language === 'es' ? 'Exitosos' : 'Success'}: ${results.success}\n${language === 'es' ? 'Fallidos' : 'Failed'}: ${results.failed}`);
      
      if (results.failed > 0) {
        console.log('Import errors:', results.errors);
      }
    }
  });

  const removeQuote = (index) => {
    setExtractedQuotes(prev => prev.filter((_, i) => i !== index));
  };

  const progress = files.length > 0 ? (currentFile / files.length) * 100 : 0;

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title={language === 'es' ? 'Importador de Estimados' : 'Quote Importer'}
          description={language === 'es' ? 'Importa múltiples estimados desde PDFs usando IA' : 'Import multiple quotes from PDFs using AI'}
          icon={Upload}
        />

        {/* Upload Section */}
        <Card className="bg-white shadow-xl border-slate-200 mb-6">
          <CardHeader className="border-b border-slate-200 bg-gradient-to-r from-purple-50 to-blue-50">
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <Sparkles className="w-5 h-5 text-purple-500" />
              {language === 'es' ? 'Paso 1: Subir PDFs' : 'Step 1: Upload PDFs'}
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
                    ? '💡 Puedes seleccionar TODOS los archivos a la vez (Ctrl+A o Cmd+A en la ventana de selección)'
                    : '💡 You can select ALL files at once (Ctrl+A or Cmd+A in the file picker)'}
                </p>
              </div>

              {files.length > 0 && (
                <Alert className="bg-blue-50 border-blue-200">
                  <FolderOpen className="w-4 h-4 text-blue-600" />
                  <AlertTitle className="text-blue-900 font-bold">
                    ✅ {files.length} {language === 'es' ? 'archivos cargados' : 'files loaded'}
                  </AlertTitle>
                  <AlertDescription className="text-blue-900 text-sm">
                    {language === 'es' 
                      ? 'Revisa la lista abajo y luego haz clic en "Procesar con IA"'
                      : 'Review the list below then click "Process with AI"'}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Files List BEFORE Processing */}
        {files.length > 0 && !processing && extractedQuotes.length === 0 && (
          <Card className="bg-white shadow-xl border-slate-200 mb-6">
            <CardHeader className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50">
              <CardTitle className="flex items-center justify-between text-slate-900">
                <span className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-500" />
                  {language === 'es' ? 'Archivos Seleccionados' : 'Selected Files'}
                </span>
                <Badge className="bg-blue-100 text-blue-700 border-blue-300">
                  {files.length} {language === 'es' ? 'archivos' : 'files'}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 border-slate-200">
                      <TableHead className="text-slate-700 font-semibold">#</TableHead>
                      <TableHead className="text-slate-700 font-semibold">{language === 'es' ? 'Nombre del Archivo' : 'File Name'}</TableHead>
                      <TableHead className="text-slate-700 font-semibold">{language === 'es' ? 'Tamaño' : 'Size'}</TableHead>
                      <TableHead className="text-right text-slate-700 font-semibold">{language === 'es' ? 'Acciones' : 'Actions'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {files.map((file, index) => (
                      <TableRow key={index} className="hover:bg-slate-50 border-slate-200">
                        <TableCell className="text-slate-700 font-mono">{index + 1}</TableCell>
                        <TableCell className="text-slate-900">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-blue-500" />
                            <span className="truncate">{file.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-600 text-sm">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(index)}
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
                  onClick={processFiles}
                  className="w-full bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg"
                  size="lg"
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  {language === 'es' ? `Procesar ${files.length} Archivos con IA` : `Process ${files.length} Files with AI`}
                </Button>
                <p className="text-xs text-slate-500 text-center mt-2">
                  {language === 'es' 
                    ? '⏱️ Esto puede tomar varios minutos dependiendo del número de archivos'
                    : '⏱️ This may take several minutes depending on the number of files'}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Processing Progress */}
        {processing && (
          <Card className="bg-white shadow-xl border-slate-200 mb-6">
            <CardHeader className="border-b border-slate-200">
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <Loader2 className="w-5 h-5 animate-spin text-purple-500" />
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
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-900">
                    🤖 {language === 'es' 
                      ? 'La IA está extrayendo datos de los PDFs. Esto puede tomar varios minutos...'
                      : 'AI is extracting data from PDFs. This may take several minutes...'}
                  </p>
                  <p className="text-xs text-blue-700 mt-2">
                    {language === 'es' 
                      ? 'No cierres esta ventana hasta que termine el proceso'
                      : 'Do not close this window until the process is complete'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Extracted Quotes Preview */}
        {extractedQuotes.length > 0 && (
          <Card className="bg-white shadow-xl border-slate-200 mb-6">
            <CardHeader className="border-b border-slate-200 bg-gradient-to-r from-green-50 to-emerald-50">
              <CardTitle className="flex items-center justify-between text-slate-900">
                <span className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  {language === 'es' ? 'Paso 2: Revisar Datos Extraídos' : 'Step 2: Review Extracted Data'}
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
                    {extractedQuotes.length} {language === 'es' ? 'extraídos' : 'extracted'}
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
                      <TableHead className="text-slate-700 font-semibold">{language === 'es' ? 'Fecha' : 'Date'}</TableHead>
                      <TableHead className="text-right text-slate-700 font-semibold">{language === 'es' ? 'Acciones' : 'Actions'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {extractedQuotes.map((quote, index) => (
                      <TableRow key={index} className="hover:bg-slate-50 border-slate-200">
                        <TableCell className="text-slate-900 text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-blue-500" />
                            <span className="truncate max-w-xs">{quote.fileName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-700">{quote.customer_name || '-'}</TableCell>
                        <TableCell className="text-slate-700">{quote.job_name || '-'}</TableCell>
                        <TableCell className="text-right font-bold text-[#3B9FF3]">
                          ${quote.total?.toFixed(2) || '0.00'}
                        </TableCell>
                        <TableCell className="text-slate-700">{quote.quote_date || '-'}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(quote.originalFile, '_blank')}
                              className="text-slate-600 hover:text-blue-600 hover:bg-blue-50"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeQuote(index)}
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
                      {language === 'es' ? `Importar ${extractedQuotes.length} Estimados a la Base de Datos` : `Import ${extractedQuotes.length} Quotes to Database`}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Errors */}
        {errors.length > 0 && (
          <Card className="bg-white shadow-xl border-slate-200 border-red-300">
            <CardHeader className="border-b border-slate-200 bg-red-50">
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <XCircle className="w-5 h-5 text-red-500" />
                {language === 'es' ? 'Errores de Procesamiento' : 'Processing Errors'}
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

        {/* Instructions */}
        {files.length === 0 && (
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
                    ? 'Haz clic en "Selecciona archivos PDF" arriba'
                    : 'Click "Select PDF files" above'}
                </li>
                <li>
                  {language === 'es'
                    ? '🔑 IMPORTANTE: En la ventana que se abre, presiona Ctrl+A (Windows) o Cmd+A (Mac) para seleccionar TODOS los archivos'
                    : '🔑 IMPORTANT: In the file picker window, press Ctrl+A (Windows) or Cmd+A (Mac) to select ALL files'}
                </li>
                <li>
                  {language === 'es'
                    ? 'Verás una tabla con TODOS los archivos seleccionados - revisa que estén todos'
                    : 'You will see a table with ALL selected files - verify they are all there'}
                </li>
                <li>
                  {language === 'es'
                    ? 'Haz clic en "Procesar con IA" - la inteligencia artificial extraerá los datos automáticamente'
                    : 'Click "Process with AI" - artificial intelligence will extract data automatically'}
                </li>
                <li>
                  {language === 'es'
                    ? 'Revisa los datos extraídos - puedes eliminar cualquier registro que no se vea correcto'
                    : 'Review extracted data - you can remove any record that doesn\'t look correct'}
                </li>
                <li>
                  {language === 'es'
                    ? '📊 OPCIONAL: Exporta a Excel o copia los datos para revisarlos en Excel antes de importar'
                    : '📊 OPTIONAL: Export to Excel or copy data to review in Excel before importing'}
                </li>
                <li>
                  {language === 'es'
                    ? 'Haz clic en "Importar Todos" para guardar todo en la base de datos'
                    : 'Click "Import All" to save everything to the database'}
                </li>
              </ol>

              <Alert className="mt-6 bg-amber-50 border-amber-200">
                <AlertTitle className="text-amber-900 font-bold">
                  ⚠️ {language === 'es' ? 'Importante' : 'Important'}
                </AlertTitle>
                <AlertDescription className="text-amber-900">
                  {language === 'es'
                    ? 'Si subes muchos archivos (400-600), el proceso puede tomar 30-60 minutos. No cierres la ventana durante el proceso.'
                    : 'If you upload many files (400-600), the process may take 30-60 minutes. Do not close the window during the process.'}
                </AlertDescription>
              </Alert>

              <Alert className="mt-4 bg-blue-50 border-blue-200">
                <AlertTitle className="text-blue-900 font-bold">
                  💡 {language === 'es' ? 'Consejo' : 'Tip'}
                </AlertTitle>
                <AlertDescription className="text-blue-900">
                  {language === 'es'
                    ? 'La IA creará automáticamente clientes nuevos si no existen en el sistema. Después puedes editar manualmente cualquier dato que necesite corrección.'
                    : 'AI will automatically create new customers if they don\'t exist in the system. You can manually edit any data that needs correction afterwards.'}
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}