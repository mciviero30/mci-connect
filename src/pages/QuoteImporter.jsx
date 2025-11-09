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
  Sparkles
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
    setFiles(selectedFiles);
    setExtractedQuotes([]);
    setErrors([]);
    setCurrentFile(0);
  };

  const processFiles = async () => {
    setProcessing(true);
    setExtractedQuotes([]);
    setErrors([]);
    
    const quotes = [];
    const fileErrors = [];

    for (let i = 0; i < files.length; i++) {
      setCurrentFile(i + 1);
      const file = files[i];

      try {
        // Upload file first
        const { file_url } = await base44.integrations.Core.UploadFile({ file });

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
          quotes.push({
            ...result.output,
            fileName: file.name,
            status: 'extracted',
            originalFile: file_url
          });
        } else {
          fileErrors.push({
            fileName: file.name,
            error: result.details || 'Failed to extract data'
          });
        }
      } catch (error) {
        console.error(`Error processing ${file.name}:`, error);
        fileErrors.push({
          fileName: file.name,
          error: error.message
        });
      }
    }

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
                  className="bg-white border-slate-300 text-slate-900"
                />
                <p className="text-xs text-slate-500 mt-2">
                  {language === 'es' 
                    ? 'Puedes seleccionar múltiples archivos a la vez (Ctrl+Click o Cmd+Click)'
                    : 'You can select multiple files at once (Ctrl+Click or Cmd+Click)'}
                </p>
              </div>

              {files.length > 0 && (
                <Alert className="bg-blue-50 border-blue-200">
                  <AlertDescription className="text-blue-900">
                    <strong>{files.length}</strong> {language === 'es' ? 'archivos seleccionados' : 'files selected'}
                  </AlertDescription>
                </Alert>
              )}

              {files.length > 0 && !processing && extractedQuotes.length === 0 && (
                <Button
                  onClick={processFiles}
                  className="w-full bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg"
                  size="lg"
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  {language === 'es' ? 'Procesar con IA' : 'Process with AI'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

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
                    <span>{currentFile} / {files.length}</span>
                  </div>
                  <Progress value={progress} className="h-3" />
                </div>
                <p className="text-sm text-slate-600">
                  {language === 'es' 
                    ? 'La IA está extrayendo datos de los PDFs. Esto puede tomar varios minutos...'
                    : 'AI is extracting data from PDFs. This may take several minutes...'}
                </p>
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
                <Badge className="bg-green-100 text-green-700 border-green-300">
                  {extractedQuotes.length} {language === 'es' ? 'extraídos' : 'extracted'}
                </Badge>
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
                            {quote.fileName}
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
                      {language === 'es' ? 'Importar Todos a la Base de Datos' : 'Import All to Database'}
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
                    ? 'Selecciona todos los PDFs de estimados (puedes seleccionar múltiples a la vez)'
                    : 'Select all quote PDFs (you can select multiple at once)'}
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
                    ? 'Haz clic en "Importar Todos" para guardar todo en la base de datos'
                    : 'Click "Import All" to save everything to the database'}
                </li>
              </ol>

              <Alert className="mt-6 bg-blue-50 border-blue-200">
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