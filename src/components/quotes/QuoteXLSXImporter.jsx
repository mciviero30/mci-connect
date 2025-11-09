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

export default function QuoteXLSXImporter({ onComplete }) {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const [file, setFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [extractedQuotes, setExtractedQuotes] = useState([]);
  const [error, setError] = useState(null);

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
      'notes'
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
      'Net 30'
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

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setExtractedQuotes([]);
      setError(null);
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
      // Upload file
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

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
                      }
                    }
                  },
                  tax_rate: { type: "number" },
                  notes: { type: "string" }
                }
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
            total
          };
        });
        
        setExtractedQuotes(quotesWithTotals);
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
            status: 'draft'
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
    }
  });

  const removeQuote = (index) => {
    setExtractedQuotes(prev => prev.filter((_, i) => i !== index));
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

      {/* Error Display */}
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

      {/* Extracted Quotes */}
      {extractedQuotes.length > 0 && (
        <Card className="bg-white shadow-xl border-slate-200">
          <CardHeader className="border-b border-slate-200 bg-gradient-to-r from-green-50 to-emerald-50">
            <CardTitle className="flex items-center justify-between text-slate-900">
              <span className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                {language === 'es' ? 'Datos Extraídos' : 'Extracted Data'}
              </span>
              <Badge className="bg-green-100 text-green-700 border-green-300">
                {extractedQuotes.length} {language === 'es' ? 'estimados' : 'quotes'}
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
                  {extractedQuotes.map((quote, index) => (
                    <TableRow key={index} className="hover:bg-slate-50 border-slate-200">
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
                          onClick={() => removeQuote(index)}
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
                    {language === 'es' ? `Importar ${extractedQuotes.length} Estimados` : `Import ${extractedQuotes.length} Quotes`}
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
                  ? 'Puedes agregar hasta 3 items por estimado (labor, materiales, etc.)'
                  : 'You can add up to 3 items per quote (labor, materials, etc.)'}
              </li>
              <li>
                {language === 'es'
                  ? 'Guarda el archivo como .xlsx o .csv'
                  : 'Save the file as .xlsx or .csv'}
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

            <Alert className="mt-6 bg-blue-50 border-blue-200">
              <AlertTitle className="text-blue-900 font-bold">
                💡 {language === 'es' ? 'Consejo' : 'Tip'}
              </AlertTitle>
              <AlertDescription className="text-blue-900">
                {language === 'es'
                  ? 'La plantilla incluye un ejemplo completo. Puedes duplicar la fila y modificarla para agregar más estimados.'
                  : 'The template includes a complete example. You can duplicate the row and modify it to add more quotes.'}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}
    </div>
  );
}