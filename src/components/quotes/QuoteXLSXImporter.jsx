
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
  AlertTriangle // Added AlertTriangle import
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLanguage } from '@/components/i18n/LanguageContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function QuoteXLSXImporter({ onComplete }) {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const [file, setFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [extractedQuotes, setExtractedQuotes] = useState([]);
  const [error, setError] = useState(null);

  // Filter states
  const [statusFilter, setStatusFilter] = useState('all');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [notesKeyword, setNotesKeyword] = useState(''); // NEW: Notes keyword filter state

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list(),
    initialData: []
  });

  const downloadTemplate = () => {
    // Create CSV template
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
      'status' // Added status to the template
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
      'draft' // Example status
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

  // NEW: File validation logic
  const validateFile = (selectedFile) => {
    // Check file extension
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

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (selectedFile.size > maxSize) {
      return {
        valid: false,
        error: language === 'es'
          ? '⚠️ El archivo es muy grande. Máximo 10MB'
          : '⚠️ File is too large. Maximum 10MB'
      };
    }

    // Check for problematic characters in filename
    // Allows letters, numbers, underscore, hyphen, and dot.
    // Excludes the extension for the check, as dots are needed there.
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
      // Validate file
      const validation = validateFile(selectedFile);
      if (!validation.valid) {
        setError(validation.error);
        setFile(null);
        e.target.value = ''; // Reset input to allow re-selection of the same (or corrected) file
        return;
      }

      setFile(selectedFile);
      setExtractedQuotes([]);
      setError(null);
      // Reset filters when a new file is selected
      setStatusFilter('all');
      setMinAmount('');
      setMaxAmount('');
      setNotesKeyword(''); // NEW: Reset notesKeyword
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
      // Create a new File object with sanitized name before uploading
      // This helps prevent issues with special characters in the filename when interacting with backend systems.
      const sanitizedName = file.name
        .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace problematic chars with underscore
        .replace(/_{2,}/g, '_'); // Replace multiple underscores with a single one
      
      const sanitizedFile = new File([file], sanitizedName, { type: file.type });

      console.log('📤 Uploading file with sanitized name:', sanitizedName);
      
      // Upload file
      const { file_url } = await base44.integrations.Core.UploadFile({ file: sanitizedFile });

      console.log('✅ File uploaded:', file_url);

      // Extract data with AI
      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
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
                      required: ["description", "quantity", "unit_price"] // Ensure basic item data
                    }
                  },
                  tax_rate: { type: "number" },
                  notes: { type: "string" },
                  status: { type: "string", enum: ["draft", "sent", "approved", "rejected", "expired"], default: "draft" }
                },
                required: ["customer_name", "quote_date"] // Ensure basic quote data
              }
            }
          }
        }
      });

      if (result.status === 'success' && result.output?.quotes) {
        console.log('✅ Extracted quotes:', result.output.quotes);

        // Calculate totals for each quote
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
            status: quote.status || 'draft' // Ensure status defaults if not provided
          };
        });

        setExtractedQuotes(quotesWithTotals);
      } else {
        throw new Error(result.details || 'Failed to extract data from file');
      }
    } catch (err) {
      console.error('❌ Error processing file:', err);
      
      // Provide more user-friendly error messages based on common issues
      let errorMessage = err.message;
      
      if (errorMessage.includes('Unsupported file type')) {
        errorMessage = language === 'es'
          ? '⚠️ Error al procesar el archivo. Por favor, asegúrate de que el archivo sea .xlsx o .csv válido y que no esté dañado. Prueba renombrar el archivo a algo simple (ej: estimados.xlsx) e intenta de nuevo.'
          : '⚠️ Error processing file. Please ensure the file is a valid .xlsx or .csv and not corrupted. Try renaming the file to something simple (e.g. quotes.xlsx) and try again.';
      } else if (errorMessage.includes('Failed to extract')) {
        errorMessage = language === 'es'
          ? '⚠️ No se pudieron extraer datos del archivo. Verifica que el archivo tenga datos y que use el formato de la plantilla. Intenta no usar caracteres especiales en los nombres de las columnas.'
          : '⚠️ Could not extract data from file. Verify the file has data and uses the template format. Try to avoid special characters in column names.';
      } else if (errorMessage.includes('File already exists') || errorMessage.includes('filename')) {
        errorMessage = language === 'es'
          ? '⚠️ Problema con el nombre del archivo. Por favor, renombra el archivo a algo simple (ej: estimados.xlsx) usando solo letras, números y guiones.'
          : '⚠️ Issue with filename. Please rename the file to something simple (e.g. quotes.xlsx) using only letters, numbers, and hyphens.';
      }
      
      setError(errorMessage);
    } finally {
      setProcessing(false);
    }
  };

  // Apply filters to extracted quotes
  const filteredQuotes = extractedQuotes.filter(quote => {
    // Status filter
    if (statusFilter !== 'all' && quote.status !== statusFilter) return false;

    // Amount filters
    const quoteTotal = quote.total || 0;
    if (minAmount && quoteTotal < parseFloat(minAmount)) return false;
    if (maxAmount && quoteTotal > parseFloat(maxAmount)) return false;

    // NEW: Notes keyword filter
    if (notesKeyword && quote.notes && !quote.notes.toLowerCase().includes(notesKeyword.toLowerCase())) return false;

    return true;
  });

  const importMutation = useMutation({
    mutationFn: async (quotesToImport) => { // Accept quotesToImport as an argument
      const results = {
        success: 0,
        failed: 0,
        errors: []
      };

      for (const quote of quotesToImport) { // Iterate over quotesToImport
        try {
          // Find or create customer
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
            status: quote.status || 'draft' // Use status from extracted data or default
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
      setExtractedQuotes([]); // Clear extracted quotes after successful import
      setFile(null); // Clear the file after import
      // Reset filters after import
      setStatusFilter('all');
      setMinAmount('');
      setMaxAmount('');
      setNotesKeyword(''); // NEW: Reset notesKeyword after import
    }
  });

  const removeQuote = (quoteToRemove) => {
    setExtractedQuotes(prev => prev.filter(quote => quote !== quoteToRemove));
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
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
                  ? '💡 Usa nombres de archivo simples (solo letras, números, guiones). Ejemplo: estimados.xlsx'
                  : '💡 Use simple filenames (only letters, numbers, hyphens). Example: quotes.xlsx'}
              </p>
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

      {/* Error Display - UPDATED icon and title */}
      {error && (
        <Alert className="bg-red-50 border-red-200">
          <AlertTriangle className="w-4 h-4 text-red-600" /> {/* Changed icon to AlertTriangle */}
          <AlertTitle className="text-red-900 font-bold">
            {language === 'es' ? 'Error al procesar archivo' : 'File Processing Error'} {/* More specific title */}
          </AlertTitle>
          <AlertDescription className="text-red-900 whitespace-pre-line"> {/* Added whitespace-pre-line */}
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Filters Section */}
      {extractedQuotes.length > 0 && (
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

            {/* NEW: Notes Keyword Filter */}
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
                  setNotesKeyword(''); // NEW: Clear notesKeyword
                }}
                className="bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                {language === 'es' ? 'Limpiar Filtros' : 'Clear Filters'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Extracted Quotes - UPDATED to use filteredQuotes */}
      {extractedQuotes.length > 0 && (
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
                          onClick={() => removeQuote(quote)} // Pass the quote object directly
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
                  // Import only filtered quotes
                  importMutation.mutate(filteredQuotes);
                }}
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
      )}

      {/* Instructions */}
      {!file && extractedQuotes.length === 0 && (
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
                  ? 'IMPORTANTE: Guarda el archivo con un nombre simple (ej: estimados.xlsx) - solo usa letras, números y guiones.' // NEW instruction
                  : 'IMPORTANT: Save the file with a simple name (e.g. quotes.xlsx) - only use letters, numbers and hyphens.'}
              </li>
              <li>
                {language === 'es'
                  ? 'Puedes agregar hasta 3 items por estimado (labor, materiales, etc.)'
                  : 'You can add up to 3 items per quote (labor, materials, etc.)'}
              </li>
              <li>
                {language === 'es'
                  ? 'Sube el archivo usando el botón "Selecciona archivo"'
                  : 'Upload the file using the "Select file" button'}
              </li>
              <li>
                {language === 'es'
                  ? 'Haz clic en "Procesar Archivo" para extraer los datos'
                  : 'Click "Process File" to extract the data'}
              </li>
              <li>
                {language === 'es'
                  ? 'Revisa los datos y haz clic en "Importar"'
                  : 'Review the data and click "Import"'}
              </li>
            </ol>

            {/* UPDATED Alert message and style */}
            <Alert className="mt-6 bg-amber-50 border-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <AlertTitle className="text-amber-900 font-bold">
                ⚠️ {language === 'es' ? 'Importante' : 'Important'}
              </AlertTitle>
              <AlertDescription className="text-amber-900">
                {language === 'es'
                  ? 'Si tienes problemas al subir o procesar el archivo, asegúrate de que el nombre del archivo sea simple y solo contenga letras, números, guiones y puntos (ejemplo: estimados.xlsx). Evita caracteres especiales.'
                  : 'If you have trouble uploading or processing the file, make sure the filename is simple and only contains letters, numbers, hyphens, and dots (example: quotes.xlsx). Avoid special characters.'}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
