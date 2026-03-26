import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Upload, FileText, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useLanguage } from '@/components/i18n/LanguageContext';
import { useToast } from '@/components/ui/toast';

export default function QuotePDFImporter({ onSuccess }) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [file, setFile] = useState(null);
  const { language } = useLanguage();
  const navigate = useNavigate();
  const toast = useToast();

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
    } else {
      toast.error('Please select a PDF file');
    }
  };

  const handleImport = async () => {
    if (!file) return;

    try {
      setUploading(true);
      
      // Upload PDF
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      setUploading(false);
      setExtracting(true);

      // Extract data with AI
      const extractedData = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an expert at extracting quote/estimate data from PDFs. Extract ALL information from this quote/estimate PDF and convert it to MCI Connect format.

CRITICAL RULES:
1. Keep ALL quantities and prices EXACTLY as shown in the PDF - DO NOT modify them
2. Only translate/adapt item names and descriptions to match MCI Connect format
3. Extract EVERY line item, do not skip anything

Item name mappings (use these when you see similar items):
- "millas" or "miles" → "Miles Per Vehicle"
- "hotel" or "habitaciones" → "Hotel Rooms"
- "per diem" or "viáticos" → "Per-Diem"
- "horas de manejo" or "driving hours" → "Driving Time"
- "paredes sólidas" or "solid wall" → "Solid Wall Installation"
- "paredes de vidrio" or "glass wall" → "Glass Wall Installation"

Extract and return this EXACT JSON structure:`,
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: {
            customer_name: { type: "string" },
            customer_email: { type: "string" },
            customer_phone: { type: "string" },
            job_name: { type: "string" },
            job_address: { type: "string" },
            quote_date: { type: "string" },
            valid_until: { type: "string" },
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  item_name: { type: "string" },
                  description: { type: "string" },
                  quantity: { type: "number" },
                  unit: { type: "string" },
                  unit_price: { type: "number" },
                  total: { type: "number" }
                }
              }
            },
            tax_rate: { type: "number" },
            notes: { type: "string" },
            terms: { type: "string" }
          }
        }
      });


      // Create quote with extracted data
      const quotes = await base44.entities.Quote.list();
      const existingNumbers = quotes
        .map(q => q.quote_number)
        .filter(n => n?.startsWith('EST-'))
        .map(n => parseInt(n.replace('EST-', '')))
        .filter(n => !isNaN(n));

      const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
      const quote_number = `EST-${String(nextNumber).padStart(5, '0')}`;

      const subtotal = extractedData.items.reduce((sum, item) => sum + (item.total || 0), 0);
      const tax_amount = subtotal * ((extractedData.tax_rate || 0) / 100);
      const total = subtotal + tax_amount;

      const quoteData = {
        quote_number,
        customer_name: extractedData.customer_name || '',
        customer_email: extractedData.customer_email || '',
        customer_phone: extractedData.customer_phone || '',
        job_name: extractedData.job_name || 'Imported Job',
        job_address: extractedData.job_address || '',
        quote_date: extractedData.quote_date || new Date().toISOString().split('T')[0],
        valid_until: extractedData.valid_until || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        items: extractedData.items.map(item => ({
          item_name: item.item_name || '',
          description: item.description || '',
          quantity: item.quantity || 0,
          unit: item.unit || 'pcs',
          unit_price: item.unit_price || 0,
          total: item.total || 0,
          installation_time: 0
        })),
        subtotal,
        tax_rate: extractedData.tax_rate || 0,
        tax_amount,
        total,
        estimated_hours: 0,
        notes: extractedData.notes || '',
        terms: extractedData.terms || '• Approval: PO required to schedule work.\n• Offload: Standard offload only. Excludes stairs/windows/special equipment. Client provides equipment. Site access issues may require revised quote.\n• Hours: Regular hours only. OT/after-hours billed separately via Change Order.',
        status: 'draft',
        team_ids: [],
        team_names: []
      };

      const newQuote = await base44.entities.Quote.create(quoteData);

      setExtracting(false);
      toast.success(language === 'es' ? '✅ Estimado importado exitosamente' : '✅ Quote imported successfully');
      
      if (onSuccess) {
        onSuccess(newQuote);
      }
      
      setTimeout(() => {
        navigate(createPageUrl(`VerEstimado?id=${newQuote.id}`));
      }, 500);

    } catch (error) {
      console.error('Import error:', error);
      toast.error(`Error: ${error.message}`);
      setUploading(false);
      setExtracting(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        variant="outline"
        className="border-[#507DB4]/30 text-[#507DB4] hover:bg-blue-50/30"
      >
        <Upload className="w-4 h-4 mr-2" />
        {language === 'es' ? 'Importar PDF' : 'Import PDF'}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-[#282828]">
          <DialogHeader>
            <DialogTitle className="text-xl text-slate-900 dark:text-white">
              {language === 'es' ? 'Importar Estimado desde PDF' : 'Import Quote from PDF'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {!uploading && !extracting && (
              <>
                <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-8 text-center">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-slate-400" />
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                    {language === 'es' 
                      ? 'Selecciona el PDF de tu otro software. La AI lo convertirá automáticamente al formato MCI Connect.'
                      : 'Select the PDF from your other software. AI will automatically convert it to MCI Connect format.'}
                  </p>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="pdf-upload"
                  />
                  <label htmlFor="pdf-upload">
                    <Button variant="outline" className="cursor-pointer" asChild>
                      <span>
                        <Upload className="w-4 h-4 mr-2" />
                        {language === 'es' ? 'Seleccionar PDF' : 'Select PDF'}
                      </span>
                    </Button>
                  </label>
                </div>

                {file && (
                  <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-sm text-green-800 dark:text-green-300 font-medium">
                      {file.name}
                    </span>
                  </div>
                )}

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <p className="text-xs text-blue-800 dark:text-blue-300">
                    <strong>{language === 'es' ? '⚠️ Importante:' : '⚠️ Important:'}</strong>
                    {' '}
                    {language === 'es'
                      ? 'Las cantidades y precios se mantendrán EXACTOS. Solo se adaptarán los nombres de items al formato MCI Connect.'
                      : 'Quantities and prices will remain EXACT. Only item names will be adapted to MCI Connect format.'}
                  </p>
                </div>
              </>
            )}

            {uploading && (
              <div className="text-center py-8">
                <Loader2 className="w-12 h-12 animate-spin mx-auto mb-3 text-blue-600" />
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {language === 'es' ? 'Subiendo PDF...' : 'Uploading PDF...'}
                </p>
              </div>
            )}

            {extracting && (
              <div className="text-center py-8">
                <Loader2 className="w-12 h-12 animate-spin mx-auto mb-3 text-purple-600" />
                <p className="text-sm text-slate-600 dark:text-slate-400 font-medium mb-1">
                  {language === 'es' ? 'Extrayendo datos con AI...' : 'Extracting data with AI...'}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-500">
                  {language === 'es' ? 'Esto puede tomar 10-20 segundos' : 'This may take 10-20 seconds'}
                </p>
              </div>
            )}
          </div>

          {!uploading && !extracting && (
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                {language === 'es' ? 'Cancelar' : 'Cancel'}
              </Button>
              <Button
                onClick={handleImport}
                disabled={!file}
                className="bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] text-white"
              >
                <Upload className="w-4 h-4 mr-2" />
                {language === 'es' ? 'Importar' : 'Import'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}