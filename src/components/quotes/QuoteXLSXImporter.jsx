
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
  FileDown,
  AlertTriangle,
  FileText,
  RefreshCw,
  Clock
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLanguage } from '@/components/i18n/LanguageContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function QuoteXLSXImporter({ onComplete }) {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const [file, setFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [extractedQuotes, setExtractedQuotes] = useState([]);
  const [error, setError] = useState(null);
  const [processingStep, setProcessingStep] = useState('');

  const [statusFilter, setStatusFilter] = useState('all');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [notesKeyword, setNotesKeyword] = useState('');

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list(),
    initialData: []
  });

  const downloadTemplate = () => {
    const headers = [
      'quote_number',
      'customer_name',
      'customer_email',
      'customer_phone',
      'job_name',
      'job_address',
      'quote_date',
      'valid_until',
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
      'EST-001',
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
      'draft'
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
    link.download = 'plantilla-estimados.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const validateFile = (selectedFile) => {
    const fileName = selectedFile.name.toLowerCase();
    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext));
    
    if (!hasValidExtension) {
      return {
        valid: false,
        error: language === 'es' 
          ? '⚠️ Solo se permiten archivos Excel (.xlsx, .xls) o CSV (.csv)'
          : '⚠️ Only Excel (.xlsx, .xls) or CSV (.csv) files are allowed'
      };
    }

    const maxSize = 10 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      return {
        valid: false,
        error: language === 'es'
          ? '⚠️ El archivo es muy grande. Máximo 10MB'
          : '⚠️ File is too large. Maximum 10MB'
      };
    }

    const problematicChars = /[^a-zA-Z0-9._-]/;
    if (problematicChars.test(fileName.replace(/\.(xlsx|xls|csv)$/, ''))) {
      return {
        valid: false,
        error: language === 'es'
          ? '⚠️ El nombre del archivo contiene caracteres especiales. Por favor renómbralo usando solo letras, números, guiones y puntos (ejemplo: estimados.xlsx)'
          : '⚠️ Filename contains special characters. Please rename it using only letters, numbers, hyphens and dots (example: quotes.xlsx)'
      };
    }

    return { valid: true };
  };

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const validation = validateFile(selectedFile);
      if (!validation.valid) {
        setError(validation.error);
        setFile(null);
        e.target.value = '';
        return;
      }

      setFile(selectedFile);
      setExtractedQuotes([]);
      setError(null);
      setStatusFilter('all');
      setMinAmount('');
      setMaxAmount('');
      setNotesKeyword('');
      setProcessingStep('');
    }
  };

  const processFile = async () => {
    if (!file) {
      alert(language === 'es' ? '⚠️ No hay archivo seleccionado' : '⚠️ No file selected');
      return;
    }

    setProcessing(true);
    setError(null);
    setProcessingStep(language === 'es' ? '📤 Subiendo archivo...' : '📤 Uploading file...');

    try {
      const sanitizedName = file.name
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .replace(/_{2,}/g, '_');
      
      const sanitizedFile = new File([file], sanitizedName, { type: file.type });

      
      const { file_url } = await base44.integrations.Core.UploadFile({ file: sanitizedFile });

      setProcessingStep(language === 'es' ? '🤖 Extrayendo datos con IA... (esto puede tomar 30-60 segundos)' : '🤖 Extracting data with AI... (this may take 30-60 seconds)');

      // Set a longer timeout for AI processing
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('TIMEOUT')), 120000) // 2 minutes
      );

      const extractionPromise = base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: {
            quotes: {
              type: "array",
              description: "List of quotes from the spreadsheet",
              items: {
                type: "object",
                properties: {
                  quote_number: { type: "string" },
                  customer_name: { type: "string" },
                  customer_email: { type: "string" },
                  customer_phone: { type: "string" },
                  job_name: { type: "string" },
                  job_address: { type: "string" },
                  quote_date: { type: "string", description: "YYYY-MM-DD format" },
                  valid_until: { type: "string", description: "YYYY-MM-DD format" },
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        description: { type: "string" },
                        quantity: { type: "number" },
                        unit: { type: "string" },
                        unit_price: { type: "number" },
                        total: { type: "number" }
                      },
                      required: ["description", "quantity", "unit_price"]
                    }
                  },
                  tax_rate: { type: "number" },
                  notes: { type: "string" },
                  status: { type: "string", enum: ["draft", "sent", "approved", "rejected", "expired"], default: "draft" }
                },
                required: ["customer_name", "quote_date"]
              }
            }
          }
        }
      });

      const result = await Promise.race([extractionPromise, timeoutPromise]);

      if (result.status === 'success' && result.output?.quotes) {
        setProcessingStep(language === 'es' ? '✅ Procesando datos...' : '✅ Processing data...');

        const quotesWithTotals = result.output.quotes.map(quote => {
          const items = quote.items || [];
          const subtotal = items.reduce((sum, item) => {
            const itemTotal = (item.quantity || 0) * (item.unit_price || 0);
            return sum + itemTotal;
          }, 0);

          const tax_amount = subtotal * ((quote.tax_rate || 0) / 100);
          const total = subtotal + tax_amount;

          return {
            ...quote,
            items: items.map(item => ({
              ...item,
              total: (item.quantity || 0) * (item.unit_price || 0)
            })),
            subtotal,
            tax_amount,
            total,
            status: quote.status || 'draft'
          };
        });

        setExtractedQuotes(quotesWithTotals);
        setProcessingStep('');
      } else {
        throw new Error(result.details || 'Failed to extract data from file');
      }
    } catch (err) {
      console.error('❌ Error processing file:', err);
      
      let errorMessage;
      
      if (err.message === 'TIMEOUT') {
        errorMessage = language === 'es'
          ? '⏰ El procesamiento tomó demasiado tiempo.\n\n💡 SOLUCIONES:\n\n1️⃣ Tu archivo es muy grande o complejo. Intenta dividirlo en archivos más pequeños (10-20 filas por archivo)\n\n2️⃣ Usa el importador de PDFs en lugar de Excel - es más rápido\n\n3️⃣ Simplifica tu archivo: elimina columnas innecesarias, fórmulas, formato especial\n\n4️⃣ Vuelve a intentar en 1 minuto - a veces el servidor está ocupado'
          : '⏰ Processing took too long.\n\n💡 SOLUTIONS:\n\n1️⃣ Your file is very large or complex. Try splitting it into smaller files (10-20 rows per file)\n\n2️⃣ Use the PDF importer instead of Excel - it\'s faster\n\n3️⃣ Simplify your file: remove unnecessary columns, formulas, special formatting\n\n4️⃣ Try again in 1 minute - sometimes the server is busy';
      } else {
        errorMessage = language === 'es'
          ? '⚠️ No se pudo procesar el archivo.\n\n💡 SOLUCIONES:\n\n✅ Descarga la plantilla y copia tus datos allí\n✅ Guarda el archivo como .CSV desde Excel (Archivo → Guardar Como → CSV)\n✅ Abre el archivo en Excel, verifica que tenga datos, y guárdalo de nuevo\n✅ Si tienes PDFs de estimados, usa el "Importador de PDFs" en su lugar\n✅ Verifica que las fechas estén en formato YYYY-MM-DD (ej: 2024-01-15)'
          : '⚠️ Could not process the file.\n\n💡 SOLUTIONS:\n\n✅ Download the template and copy your data there\n✅ Save the file as .CSV from Excel (File → Save As → CSV)\n✅ Open the file in Excel, verify it has data, and save it again\n✅ If you have PDF quotes, use the "PDF Importer" instead\n✅ Verify dates are in YYYY-MM-DD format (e.g. 2024-01-15)';
      }
      
      setError(errorMessage);
      setProcessingStep('');
    } finally {
      setProcessing(false);
    }
  };

  const filteredQuotes = extractedQuotes.filter(quote => {
    if (statusFilter !== 'all' && quote.status !== statusFilter) return false;

    const quoteTotal = quote.total || 0;
    if (minAmount && quoteTotal < parseFloat(minAmount)) return false;
    if (maxAmount && quoteTotal > parseFloat(maxAmount)) return false;

    if (notesKeyword && quote.notes && !quote.notes.toLowerCase().includes(notesKeyword.toLowerCase())) return false;

    return true;
  });

  const importMutation = useMutation({
    mutationFn: async (quotesToImport) => {
      const results = {
        success: 0,
        failed: 0,
        errors: []
      };

      for (const quote of quotesToImport) {
        try {
          let customer = customers.find(c =>
            c.email?.toLowerCase() === quote.customer_email?.toLowerCase() ||
            c.company?.toLowerCase() === quote.customer_name?.toLowerCase()
          );

          let customer_id = customer?.id;

          if (!customer && quote.customer_name) {
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
            status: quote.status || 'draft'
          });

          results.success++;
        } catch (error) {
          console.error('Error importing quote:', error);
          results.failed++;
          results.errors.push({
            quote: quote.quote_number || quote.customer_name,
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

      if (onComplete) onComplete();
      setExtractedQuotes([]);
      setFile(null);
      setStatusFilter('all');
      setMinAmount('');
      setMaxAmount('');
      setNotesKeyword('');
    }
  });

  const removeQuote = (quoteToRemove) => {
    setExtractedQuotes(prev => prev.filter(quote => quote !== quoteToRemove));
  };

  return (
    <div className="space-y-6">
      <Card className="bg-white shadow-xl border-slate-200">
        <CardHeader className="border-b border-slate-200 bg-gradient-to-r from-green-50 to-emerald-50">
          <CardTitle className="flex items-center gap-2 text-slate-900">
            <FileSpreadsheet className="w-5 h-5 text-green-500" />
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
              <p className="text-xs text-slate-500 mt-1">
                {language === 'es' 
                  ? '💡 Usa nombres de archivo simples (solo letras, números, guiones). Ejemplo: estimados.csv'
                  : '💡 Use simple filenames (only letters, numbers, hyphens). Example: quotes.csv'}
              </p>
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={downloadTemplate}
                variant="outline"
                className="bg-white border-blue-300 text-blue-700 hover:bg-blue-50"
                disabled={processing}
              >
                <FileDown className="w-4 h-4 mr-2" />
                {language === 'es' ? 'Descargar Plantilla' : 'Download Template'}
              </Button>

              {file && (
                <Button
                  onClick={processFile}
                  disabled={processing}
                  className="bg-gradient-to-r from-green-500 to-emerald-500 text-white"
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

              <Link to={createPageUrl("QuoteImporter")}>
                <Button
                  variant="outline"
                  className="bg-white border-purple-300 text-purple-700 hover:bg-purple-50"
                  disabled={processing}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  {language === 'es' ? 'Importar PDFs' : 'Import PDFs'}
                </Button>
              </Link>
            </div>

            {file && (
              <Alert className="bg-blue-50 border-blue-200">
                <AlertDescription className="text-blue-900">
                  📄 <strong>{file.name}</strong> - {(file.size / 1024).toFixed(2)} KB
                </AlertDescription>
              </Alert>
            )}

            {processingStep && (
              <Alert className="bg-indigo-50 border-indigo-200">
                <Clock className="w-4 h-4 text-indigo-600 animate-pulse" />
                <AlertDescription className="text-indigo-900 font-medium">
                  {processingStep}
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert className="bg-red-50 border-red-200">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          <AlertTitle className="text-red-900 font-bold">
            {language === 'es' ? 'Error al procesar archivo' : 'File Processing Error'}
          </AlertTitle>
          <AlertDescription className="text-red-900 whitespace-pre-line">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {extractedQuotes.length > 0 && (
        <>
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
                      <SelectValue />
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
                      <SelectItem value="approved" className="text-slate-900">
                        {language === 'es' ? 'Aprobado' : 'Approved'}
                      </SelectItem>
                      <SelectItem value="rejected" className="text-slate-900">
                        {language === 'es' ? 'Rechazado' : 'Rejected'}
                      </SelectItem>
                      <SelectItem value="expired" className="text-slate-900">
                        {language === 'es' ? 'Expirado' : 'Expired'}
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

              <div className="mt-4">
                <Label className="text-slate-700 font-medium mb-2 block">
                  {language === 'es' ? 'Buscar en Notas' : 'Search in Notes'}
                </Label>
                <Input
                  value={notesKeyword}
                  onChange={(e) => setNotesKeyword(e.target.value)}
                  placeholder={language === 'es' ? 'Palabra clave...' : 'Keyword...'}
                  className="bg-white border-slate-300 text-slate-900"
                />
              </div>

              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-slate-600">
                  {language === 'es'
                    ? `Mostrando ${filteredQuotes.length} de ${extractedQuotes.length} estimados`
                    : `Showing ${filteredQuotes.length} of ${extractedQuotes.length} quotes`}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setStatusFilter('all');
                    setMinAmount('');
                    setMaxAmount('');
                    setNotesKeyword('');
                  }}
                  className="bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  {language === 'es' ? 'Limpiar Filtros' : 'Clear Filters'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-xl border-slate-200">
            <CardHeader className="border-b border-slate-200 bg-gradient-to-r from-green-50 to-emerald-50">
              <CardTitle className="flex items-center justify-between text-slate-900">
                <span className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  {language === 'es' ? 'Datos Extraídos' : 'Extracted Data'}
                </span>
                <Badge className="bg-green-100 text-green-700 border-green-300">
                  {filteredQuotes.length} {language === 'es' ? 'estimados' : 'quotes'}
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
                      <TableHead className="text-right text-slate-700 font-semibold">{language === 'es' ? 'Total' : 'Total'}</TableHead>
                      <TableHead className="text-right text-slate-700 font-semibold">{language === 'es' ? 'Acciones' : 'Actions'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredQuotes.map((quote, index) => (
                      <TableRow key={`filtered-quote-${index}`} className="hover:bg-slate-50 border-slate-200">
                        <TableCell className="text-slate-700">{quote.quote_number || '-'}</TableCell>
                        <TableCell className="text-slate-900">{quote.customer_name || '-'}</TableCell>
                        <TableCell className="text-slate-700">{quote.job_name || '-'}</TableCell>
                        <TableCell className="text-slate-700">{quote.quote_date || '-'}</TableCell>
                        <TableCell className="text-right font-bold text-[#3B9FF3]">
                          ${quote.total?.toFixed(2) || '0.00'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeQuote(quote)}
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
                  onClick={() => importMutation.mutate(filteredQuotes)}
                  disabled={importMutation.isPending || filteredQuotes.length === 0}
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
                      {language === 'es' ? `Importar ${filteredQuotes.length} Estimados` : `Import ${filteredQuotes.length} Quotes`}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {!file && extractedQuotes.length === 0 && !processing && (
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
                  ? 'Haz clic en "Descargar Plantilla" para obtener un archivo de ejemplo'
                  : 'Click "Download Template" to get an example file'}
              </li>
              <li>
                {language === 'es'
                  ? 'Abre la plantilla en Excel y llena tus datos'
                  : 'Open the template in Excel and fill in your data'}
              </li>
              <li>
                {language === 'es'
                  ? 'IMPORTANTE: Guarda el archivo con un nombre simple (ej: estimados.csv)'
                  : 'IMPORTANT: Save the file with a simple name (e.g. quotes.csv)'}
              </li>
              <li>
                {language === 'es'
                  ? 'Sube el archivo CSV - es más rápido y confiable que XLSX'
                  : 'Upload the CSV file - it\'s faster and more reliable than XLSX'}
              </li>
              <li>
                {language === 'es'
                  ? 'Haz clic en "Procesar Archivo" y espera 30-60 segundos'
                  : 'Click "Process File" and wait 30-60 seconds'}
              </li>
            </ol>

            <Alert className="mt-6 bg-purple-50 border-purple-200">
              <FileText className="w-4 h-4 text-purple-600" />
              <AlertTitle className="text-purple-900 font-bold">
                💡 {language === 'es' ? '¿Tienes PDFs de estimados?' : 'Have PDF quotes?'}
              </AlertTitle>
              <AlertDescription className="text-purple-900">
                {language === 'es'
                  ? 'Si tienes estimados en formato PDF, usa el botón "Importar PDFs" arriba. Es más fácil y funciona mejor con archivos PDF escaneados.'
                  : 'If you have quotes in PDF format, use the "Import PDFs" button above. It\'s easier and works better with scanned PDF files.'}
              </AlertDescription>
            </Alert>

            <Alert className="mt-4 bg-amber-50 border-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <AlertTitle className="text-amber-900 font-bold">
                ⚠️ {language === 'es' ? 'Si el proceso toma mucho tiempo' : 'If processing takes too long'}
              </AlertTitle>
              <AlertDescription className="text-amber-900">
                {language === 'es'
                  ? 'Si se queda procesando más de 2 minutos:\n• Divide tu archivo en partes más pequeñas (10-20 filas)\n• Usa el importador de PDFs en su lugar\n• Simplifica el archivo: elimina columnas innecesarias\n• Intenta de nuevo en 1 minuto'
                  : 'If it keeps processing for more than 2 minutes:\n• Split your file into smaller parts (10-20 rows)\n• Use the PDF importer instead\n• Simplify the file: remove unnecessary columns\n• Try again in 1 minute'}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
