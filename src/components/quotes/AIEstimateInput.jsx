import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  Loader2, 
  Plus,
  Trash2,
  Search,
  ArrowRight
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import AIService from '@/components/services/AIService';

export default function AIEstimateInput({ onQuoteGenerated, language = 'en' }) {
  const [clientText, setClientText] = useState('');
  const [draftResult, setDraftResult] = useState(null);
  const [showCatalogSearch, setShowCatalogSearch] = useState(null); // index of item being edited
  const [catalogSearch, setCatalogSearch] = useState('');

  // Fetch catalog items
  const { data: catalogItems = [] } = useQuery({
    queryKey: ['item-catalog'],
    queryFn: () => base44.entities.ItemCatalog.filter({ active: true }),
  });

  // Generate draft mutation
  const generateMutation = useMutation({
    mutationFn: async () => {
      return AIService.draftQuoteFromText(clientText, catalogItems);
    },
    onSuccess: (result) => {
      setDraftResult(result);
    },
  });

  // Update item in draft
  const updateItem = (index, field, value) => {
    if (!draftResult) return;
    
    const updatedItems = [...draftResult.items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    // Recalculate total
    if (field === 'quantity' || field === 'unit_price') {
      const qty = field === 'quantity' ? value : updatedItems[index].quantity;
      const price = field === 'unit_price' ? value : updatedItems[index].unit_price;
      updatedItems[index].total = (qty || 0) * (price || 0);
    }
    
    // Recalculate subtotal
    const subtotal = updatedItems.reduce((sum, item) => sum + (item.total || 0), 0);
    
    setDraftResult({
      ...draftResult,
      items: updatedItems,
      subtotal,
    });
  };

  // Assign catalog item to draft item
  const assignCatalogItem = (itemIndex, catalogItem) => {
    const updatedItems = [...draftResult.items];
    updatedItems[itemIndex] = {
      ...updatedItems[itemIndex],
      unit_price: catalogItem.unit_price,
      unit: catalogItem.uom,
      total: (updatedItems[itemIndex].quantity || 1) * catalogItem.unit_price,
      validated: true,
      catalog_item_id: catalogItem.id,
      catalog_item_name: catalogItem.name,
      match_confidence: 100,
      match_type: 'manual',
    };
    
    const subtotal = updatedItems.reduce((sum, item) => sum + (item.total || 0), 0);
    
    setDraftResult({
      ...draftResult,
      items: updatedItems,
      subtotal,
    });
    
    setShowCatalogSearch(null);
    setCatalogSearch('');
  };

  // Remove item
  const removeItem = (index) => {
    const updatedItems = draftResult.items.filter((_, i) => i !== index);
    const subtotal = updatedItems.reduce((sum, item) => sum + (item.total || 0), 0);
    
    setDraftResult({
      ...draftResult,
      items: updatedItems,
      subtotal,
    });
  };

  // Add manual item
  const addItem = () => {
    setDraftResult({
      ...draftResult,
      items: [
        ...draftResult.items,
        {
          description: '',
          quantity: 1,
          unit: 'unit',
          unit_price: 0,
          total: 0,
          validated: false,
          catalog_item_id: null,
        }
      ],
    });
  };

  // Submit final quote
  const handleSubmit = () => {
    if (!draftResult) return;
    
    // Convert to quote format
    const quoteData = {
      customer_name: draftResult.customer_name,
      job_name: draftResult.job_name,
      job_address: draftResult.job_address,
      items: draftResult.items.map(item => ({
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.unit_price,
        total: item.total,
      })),
      subtotal: draftResult.subtotal,
      notes: draftResult.notes,
    };
    
    onQuoteGenerated?.(quoteData);
  };

  const filteredCatalog = catalogItems.filter(item =>
    item.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
    item.description?.toLowerCase().includes(catalogSearch.toLowerCase())
  );

  const hasUnvalidatedItems = draftResult?.items?.some(i => !i.validated);

  return (
    <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
          <Sparkles className="w-5 h-5 text-amber-500" />
          {language === 'es' ? 'Generar Estimado con IA' : 'AI Quote Generator'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Input Phase */}
        {!draftResult && (
          <>
            <div>
              <Label className="text-slate-700 dark:text-slate-300 mb-2 block">
                {language === 'es' 
                  ? 'Describe el trabajo o pega el mensaje del cliente' 
                  : 'Describe the job or paste client message'}
              </Label>
              <Textarea
                value={clientText}
                onChange={(e) => setClientText(e.target.value)}
                placeholder={language === 'es'
                  ? 'Ej: Necesito instalar 500 pies cuadrados de drywall en el sótano, incluir mano de obra y materiales...'
                  : 'E.g.: Need to install 500 sqft of drywall in basement, include labor and materials...'}
                className="min-h-[120px] bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white"
              />
            </div>
            <Button
              onClick={() => generateMutation.mutate()}
              disabled={!clientText.trim() || generateMutation.isPending}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
            >
              {generateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {language === 'es' ? 'Analizando...' : 'Analyzing...'}
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  {language === 'es' ? 'Generar Estimado' : 'Generate Quote'}
                </>
              )}
            </Button>
          </>
        )}

        {/* Results Phase */}
        {draftResult && (
          <>
            {/* Validation Summary */}
            <div className="flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-900 rounded-lg">
              <div className="flex items-center gap-2">
                {draftResult.validation_summary.needs_review_count > 0 ? (
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                )}
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  {draftResult.validation_summary.validated_count}/{draftResult.validation_summary.total_items} 
                  {' '}
                  {language === 'es' ? 'ítems con precio validado' : 'items with validated price'}
                </span>
              </div>
              <Badge className={
                draftResult.validation_summary.validation_percentage === 100
                  ? 'bg-green-100 text-green-700'
                  : 'bg-amber-100 text-amber-700'
              }>
                {draftResult.validation_summary.validation_percentage}%
              </Badge>
            </div>

            {/* Customer/Job Info */}
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label className="text-slate-600 dark:text-slate-400 text-xs">
                  {language === 'es' ? 'Cliente' : 'Customer'}
                </Label>
                <Input
                  value={draftResult.customer_name}
                  onChange={(e) => setDraftResult({ ...draftResult, customer_name: e.target.value })}
                  className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600"
                />
              </div>
              <div>
                <Label className="text-slate-600 dark:text-slate-400 text-xs">
                  {language === 'es' ? 'Proyecto' : 'Job Name'}
                </Label>
                <Input
                  value={draftResult.job_name}
                  onChange={(e) => setDraftResult({ ...draftResult, job_name: e.target.value })}
                  className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600"
                />
              </div>
              <div>
                <Label className="text-slate-600 dark:text-slate-400 text-xs">
                  {language === 'es' ? 'Dirección' : 'Address'}
                </Label>
                <Input
                  value={draftResult.job_address}
                  onChange={(e) => setDraftResult({ ...draftResult, job_address: e.target.value })}
                  className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600"
                />
              </div>
            </div>

            {/* Items Table */}
            <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 dark:bg-slate-900">
                  <tr>
                    <th className="text-left p-3 text-slate-600 dark:text-slate-400 font-medium">
                      {language === 'es' ? 'Descripción' : 'Description'}
                    </th>
                    <th className="text-center p-3 text-slate-600 dark:text-slate-400 font-medium w-20">
                      {language === 'es' ? 'Cant.' : 'Qty'}
                    </th>
                    <th className="text-center p-3 text-slate-600 dark:text-slate-400 font-medium w-20">
                      {language === 'es' ? 'Unidad' : 'Unit'}
                    </th>
                    <th className="text-right p-3 text-slate-600 dark:text-slate-400 font-medium w-28">
                      {language === 'es' ? 'Precio' : 'Price'}
                    </th>
                    <th className="text-right p-3 text-slate-600 dark:text-slate-400 font-medium w-28">
                      {language === 'es' ? 'Total' : 'Total'}
                    </th>
                    <th className="w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {draftResult.items.map((item, index) => (
                    <tr 
                      key={index}
                      className={`border-t border-slate-200 dark:border-slate-700 ${
                        !item.validated ? 'bg-red-50 dark:bg-red-900/20' : ''
                      }`}
                    >
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {!item.validated && (
                            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                          )}
                          <Input
                            value={item.description}
                            onChange={(e) => updateItem(index, 'description', e.target.value)}
                            className="border-0 bg-transparent p-0 h-auto text-slate-900 dark:text-white"
                          />
                        </div>
                        {item.catalog_item_name && (
                          <span className="text-xs text-green-600 dark:text-green-400">
                            ✓ {item.catalog_item_name}
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                          className="text-center w-16 mx-auto bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600"
                        />
                      </td>
                      <td className="p-3">
                        <Select
                          value={item.unit}
                          onValueChange={(v) => updateItem(index, 'unit', v)}
                        >
                          <SelectTrigger className="w-20 mx-auto bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-white dark:bg-slate-800">
                            <SelectItem value="unit">unit</SelectItem>
                            <SelectItem value="hour">hour</SelectItem>
                            <SelectItem value="sqft">sqft</SelectItem>
                            <SelectItem value="lnft">lnft</SelectItem>
                            <SelectItem value="day">day</SelectItem>
                            <SelectItem value="each">each</SelectItem>
                            <SelectItem value="lot">lot</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-end gap-1">
                          <Input
                            type="number"
                            step="0.01"
                            value={item.unit_price || ''}
                            onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                            placeholder="$0.00"
                            className={`text-right w-24 ${
                              !item.validated 
                                ? 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700' 
                                : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600'
                            }`}
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setShowCatalogSearch(index)}
                            className="h-8 w-8 text-slate-400 hover:text-cyan-600"
                            title={language === 'es' ? 'Buscar en catálogo' : 'Search catalog'}
                          >
                            <Search className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                      <td className="p-3 text-right font-medium text-slate-900 dark:text-white">
                        ${(item.total || 0).toFixed(2)}
                      </td>
                      <td className="p-3">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => removeItem(index)}
                          className="h-8 w-8 text-red-400 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-100 dark:bg-slate-900">
                  <tr>
                    <td colSpan="4" className="p-3 text-right font-semibold text-slate-700 dark:text-slate-300">
                      Subtotal:
                    </td>
                    <td className="p-3 text-right font-bold text-lg text-cyan-600">
                      ${(draftResult.subtotal || 0).toFixed(2)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Add Item */}
            <Button
              variant="outline"
              onClick={addItem}
              className="w-full border-dashed border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400"
            >
              <Plus className="w-4 h-4 mr-2" />
              {language === 'es' ? 'Agregar Ítem' : 'Add Item'}
            </Button>

            {/* Warning for unvalidated items */}
            {hasUnvalidatedItems && (
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  {language === 'es'
                    ? 'Algunos ítems no tienen precio asignado. Revisa y asigna precios antes de continuar.'
                    : 'Some items have no price assigned. Review and assign prices before continuing.'}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setDraftResult(null)}
                className="flex-1"
              >
                {language === 'es' ? 'Cancelar' : 'Cancel'}
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={hasUnvalidatedItems}
                className="flex-1 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white"
              >
                <ArrowRight className="w-4 h-4 mr-2" />
                {language === 'es' ? 'Usar Este Estimado' : 'Use This Quote'}
              </Button>
            </div>
          </>
        )}

        {/* Catalog Search Dialog */}
        <Dialog open={showCatalogSearch !== null} onOpenChange={() => setShowCatalogSearch(null)}>
          <DialogContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-slate-900 dark:text-white">
                {language === 'es' ? 'Seleccionar del Catálogo' : 'Select from Catalog'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder={language === 'es' ? 'Buscar ítem...' : 'Search item...'}
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                className="bg-slate-50 dark:bg-slate-900"
              />
              <div className="max-h-64 overflow-y-auto space-y-2">
                {filteredCatalog.length === 0 ? (
                  <p className="text-center text-slate-500 py-4">
                    {language === 'es' ? 'No se encontraron ítems' : 'No items found'}
                  </p>
                ) : (
                  filteredCatalog.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => assignCatalogItem(showCatalogSearch, item)}
                      className="w-full text-left p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 hover:border-cyan-300 dark:hover:border-cyan-700 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">{item.name}</p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            {item.category} • {item.uom}
                          </p>
                        </div>
                        <span className="font-bold text-cyan-600">
                          ${item.unit_price.toFixed(2)}
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}