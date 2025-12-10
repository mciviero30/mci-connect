import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileText, AlertTriangle, CheckCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "@/components/i18n/LanguageContext";

export default function ItemPDFImporter({ onSuccess, onClose, open }) {
  const { language } = useLanguage();
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedItems, setExtractedItems] = useState([]);
  const [errors, setErrors] = useState([]);
  const [step, setStep] = useState('upload'); // 'upload', 'preview', 'importing', 'complete'

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setErrors([]);
    } else {
      setErrors([language === 'es' ? 'Por favor seleccione un archivo PDF válido' : 'Please select a valid PDF file']);
      setFile(null);
    }
  };

  const extractItemsFromPDF = async () => {
    if (!file) return;

    setIsProcessing(true);
    setErrors([]);

    try {
      // Upload file first
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Extract data using AI with specific schema
      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: {
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { 
                    type: "string",
                    description: "Item name or product name"
                  },
                  category: { 
                    type: "string",
                    enum: ["materials", "labor", "equipment", "services", "other"],
                    description: "Item category: materials, labor, equipment, services, or other"
                  },
                  unit_price: { 
                    type: "number",
                    description: "Sale price per unit (precio de venta)"
                  },
                  supplier: { 
                    type: "string",
                    description: "Supplier or vendor name"
                  },
                  status: { 
                    type: "string",
                    enum: ["active", "inactive"],
                    description: "Item status: active or inactive"
                  }
                },
                required: ["name", "category", "unit_price", "supplier", "status"]
              }
            }
          }
        }
      });

      if (result.status === 'success' && result.output?.items) {
        const items = result.output.items;
        
        // Validate extracted items
        const validItems = [];
        const itemErrors = [];

        items.forEach((item, index) => {
          if (!item.name || !item.unit_price || !item.supplier) {
            itemErrors.push(`${language === 'es' ? 'Fila' : 'Row'} ${index + 1}: ${language === 'es' ? 'Faltan campos requeridos (nombre, precio, o proveedor)' : 'Missing required fields (name, price, or supplier)'}`);
          } else {
            validItems.push({
              name: item.name,
              category: item.category || 'materials',
              unit_price: parseFloat(item.unit_price) || 0,
              supplier: item.supplier,
              status: item.status === 'inactive' ? 'inactive' : 'active',
              unit: 'pcs', // Default unit
              cost_per_unit: 0, // Will need to be set manually later
              in_stock_quantity: 0,
              min_stock_quantity: 5
            });
          }
        });

        if (validItems.length === 0) {
          setErrors([language === 'es' ? 'No se encontraron items válidos en el PDF' : 'No valid items found in PDF']);
          setStep('upload');
        } else {
          setExtractedItems(validItems);
          setErrors(itemErrors);
          setStep('preview');
        }
      } else {
        setErrors([result.details || (language === 'es' ? 'Error al extraer datos del PDF' : 'Failed to extract data from PDF')]);
      }
    } catch (error) {
      setErrors([error.message || (language === 'es' ? 'Error al procesar PDF' : 'Failed to process PDF')]);
    } finally {
      setIsProcessing(false);
    }
  };

  const importItems = async () => {
    setIsProcessing(true);
    setStep('importing');

    try {
      await base44.entities.QuoteItem.bulkCreate(extractedItems);
      
      setStep('complete');
      
      setTimeout(() => {
        if (onSuccess) onSuccess();
        handleClose();
      }, 2000);
    } catch (error) {
      setErrors([error.message || (language === 'es' ? 'Error al importar items' : 'Failed to import items')]);
      setStep('preview');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setExtractedItems([]);
    setErrors([]);
    setStep('upload');
    if (onClose) onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-w-4xl bg-white dark:bg-[#282828] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-600" />
            {language === 'es' ? 'Importar Items desde PDF' : 'Import Items from PDF'}
          </DialogTitle>
          <DialogDescription>
            {language === 'es' 
              ? 'Sube un PDF con tu catálogo de items. Extraeremos: nombre, categoría, precio de venta, proveedor, y estado.'
              : 'Upload a PDF with your item catalog. We will extract: name, category, sale price, supplier, and status.'}
          </DialogDescription>
        </DialogHeader>

        {/* UPLOAD STEP */}
        {step === 'upload' && (
          <div className="space-y-4 py-6">
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
              <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <Label htmlFor="pdf-upload" className="cursor-pointer">
                <div className="space-y-2">
                  <p className="text-lg font-semibold text-slate-700">
                    {language === 'es' ? 'Haz clic para seleccionar un archivo PDF' : 'Click to select a PDF file'}
                  </p>
                  <p className="text-sm text-slate-500">
                    {language === 'es' ? 'o arrastra y suelta aquí' : 'or drag and drop here'}
                  </p>
                </div>
                <Input
                  id="pdf-upload"
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </Label>
            </div>

            {file && (
              <Alert className="bg-blue-50 border-blue-300">
                <FileText className="h-4 w-4" />
                <AlertDescription className="text-blue-900">
                  <strong>{language === 'es' ? 'Archivo seleccionado:' : 'Selected file:'}</strong> {file.name}
                </AlertDescription>
              </Alert>
            )}

            {errors.length > 0 && (
              <Alert className="bg-red-50 border-red-300">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-red-900">
                  {errors.map((error, idx) => (
                    <div key={idx}>{error}</div>
                  ))}
                </AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={handleClose}>
                {language === 'es' ? 'Cancelar' : 'Cancel'}
              </Button>
              <Button
                onClick={extractItemsFromPDF}
                disabled={!file || isProcessing}
                className="bg-gradient-to-r from-blue-600 to-blue-700 text-white"
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    {language === 'es' ? 'Procesando...' : 'Processing...'}
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 mr-2" />
                    {language === 'es' ? 'Extraer Items' : 'Extract Items'}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* PREVIEW STEP */}
        {step === 'preview' && (
          <div className="space-y-4 py-4">
            <Alert className="bg-green-50 border-green-300">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription className="text-green-900">
                <strong>{extractedItems.length}</strong> {language === 'es' ? 'items encontrados' : 'items found'}
              </AlertDescription>
            </Alert>

            {errors.length > 0 && (
              <Alert className="bg-amber-50 border-amber-300">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-amber-900">
                  <p className="font-semibold mb-2">{language === 'es' ? 'Advertencias:' : 'Warnings:'}</p>
                  {errors.map((error, idx) => (
                    <div key={idx} className="text-sm">{error}</div>
                  ))}
                </AlertDescription>
              </Alert>
            )}

            <div className="border rounded-lg overflow-hidden max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 sticky top-0">
                  <tr>
                    <th className="text-left p-2">{language === 'es' ? 'Nombre' : 'Name'}</th>
                    <th className="text-left p-2">{language === 'es' ? 'Categoría' : 'Category'}</th>
                    <th className="text-right p-2">{language === 'es' ? 'Precio' : 'Price'}</th>
                    <th className="text-left p-2">{language === 'es' ? 'Proveedor' : 'Supplier'}</th>
                    <th className="text-center p-2">{language === 'es' ? 'Estado' : 'Status'}</th>
                  </tr>
                </thead>
                <tbody>
                  {extractedItems.map((item, idx) => (
                    <tr key={idx} className="border-t hover:bg-slate-50">
                      <td className="p-2 font-medium">{item.name}</td>
                      <td className="p-2">
                        <Badge className="bg-blue-100 text-blue-700 text-xs">
                          {item.category}
                        </Badge>
                      </td>
                      <td className="p-2 text-right font-semibold text-blue-600">
                        ${item.unit_price.toFixed(2)}
                      </td>
                      <td className="p-2 text-slate-600">{item.supplier}</td>
                      <td className="p-2 text-center">
                        <Badge className={item.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}>
                          {item.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Alert className="bg-amber-50 border-amber-300">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-amber-900 text-sm">
                <strong>{language === 'es' ? 'Nota:' : 'Note:'}</strong> {language === 'es' 
                  ? 'Los costos internos (cost_per_unit) se establecerán en $0 y deberán actualizarse manualmente después de la importación.'
                  : 'Internal costs (cost_per_unit) will be set to $0 and must be updated manually after import.'}
              </AlertDescription>
            </Alert>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setStep('upload')}>
                {language === 'es' ? 'Volver' : 'Back'}
              </Button>
              <Button
                onClick={importItems}
                disabled={isProcessing || extractedItems.length === 0}
                className="bg-gradient-to-r from-green-600 to-green-700 text-white"
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    {language === 'es' ? 'Importando...' : 'Importing...'}
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {language === 'es' ? `Importar ${extractedItems.length} Items` : `Import ${extractedItems.length} Items`}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* IMPORTING STEP */}
        {step === 'importing' && (
          <div className="py-12 text-center">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-lg font-semibold text-slate-700">
              {language === 'es' ? 'Importando items...' : 'Importing items...'}
            </p>
          </div>
        )}

        {/* COMPLETE STEP */}
        {step === 'complete' && (
          <div className="py-12 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <p className="text-lg font-semibold text-green-700 mb-2">
              {language === 'es' ? '¡Importación Exitosa!' : 'Import Successful!'}
            </p>
            <p className="text-slate-600">
              {extractedItems.length} {language === 'es' ? 'items importados' : 'items imported'}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}