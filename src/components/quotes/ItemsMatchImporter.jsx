import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2, Plus } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/toast';

export default function ItemsMatchImporter({ isOpen, onClose, onAddItems }) {
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [extractedItems, setExtractedItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch Item Catalog
  const { data: catalogItems = [] } = useQuery({
    queryKey: ['itemCatalog'],
    queryFn: () => base44.entities.ItemCatalog.list(),
    initialData: []
  });

  // Create new catalog item mutation
  const createCatalogItemMutation = useMutation({
    mutationFn: (itemData) => base44.entities.ItemCatalog.create(itemData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['itemCatalog'] });
    }
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Upload file to get URL
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setUploadedFile(file_url);
      
      // Auto-analyze
      analyzeImage(file_url);
    } catch (error) {
      toast.error('Error uploading file');
      console.error(error);
    }
  };

  const analyzeImage = async (fileUrl) => {
    setIsAnalyzing(true);
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Extract ALL line items from this construction/installation quote or estimate image. 
        
Return a JSON array with this exact structure for each item:
[
  {
    "description": "exact item description from image",
    "quantity": number,
    "unit": "unit of measure (ft, sf, Count, etc)"
  }
]

Rules:
- Extract EVERY line item, even if it has notes in parentheses
- Keep original descriptions exactly as shown
- Parse quantities as numbers (remove commas)
- Use exact unit labels from image
- Return ONLY the JSON array, no other text`,
        file_urls: [fileUrl],
        response_json_schema: {
          type: "object",
          properties: {
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  description: { type: "string" },
                  quantity: { type: "number" },
                  unit: { type: "string" }
                }
              }
            }
          }
        }
      });

      const items = response.items || [];
      
      // Match with catalog
      const matchedItems = items.map(item => {
        const match = findBestMatch(item.description, catalogItems);
        return {
          ...item,
          match: match,
          isMatched: !!match,
          catalogItem: match
        };
      });

      setExtractedItems(matchedItems);
      
      // Auto-select matched items
      const autoSelected = {};
      matchedItems.forEach((item, index) => {
        if (item.isMatched) {
          autoSelected[index] = true;
        }
      });
      setSelectedItems(autoSelected);

    } catch (error) {
      toast.error('Error analyzing image');
      console.error(error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const findBestMatch = (description, catalog) => {
    const cleanDesc = description.toLowerCase().trim();
    
    // Try exact match
    let match = catalog.find(item => 
      item.name.toLowerCase().trim() === cleanDesc
    );
    if (match) return match;

    // Try partial match (80% similarity)
    const words = cleanDesc.split(/\s+/);
    match = catalog.find(item => {
      const catalogWords = item.name.toLowerCase().split(/\s+/);
      const matchedWords = words.filter(w => catalogWords.some(cw => cw.includes(w) || w.includes(cw)));
      return matchedWords.length / words.length >= 0.6;
    });

    return match;
  };

  const handleAddToCatalog = async (item, index) => {
    try {
      const newItem = await createCatalogItemMutation.mutateAsync({
        name: item.description,
        uom: item.unit || 'unit',
        unit_price: 0,
        active: true
      });

      // Update extracted item with new catalog match
      const updated = [...extractedItems];
      updated[index] = {
        ...updated[index],
        isMatched: true,
        catalogItem: newItem,
        match: newItem
      };
      setExtractedItems(updated);
      
      toast.success('Item added to catalog');
    } catch (error) {
      toast.error('Error adding to catalog');
      console.error(error);
    }
  };

  const handleAddToQuote = () => {
    const itemsToAdd = extractedItems
      .filter((_, index) => selectedItems[index])
      .map(item => ({
        item_name: item.catalogItem?.name || item.description,
        description: item.description,
        quantity: item.quantity || 0,
        unit: item.catalogItem?.uom || item.unit || 'unit',
        unit_price: item.catalogItem?.unit_price || 0,
        total: (item.quantity || 0) * (item.catalogItem?.unit_price || 0)
      }));

    onAddItems(itemsToAdd);
    handleClose();
  };

  const handleClose = () => {
    setUploadedFile(null);
    setExtractedItems([]);
    setSelectedItems({});
    onClose();
  };

  const matchedItems = extractedItems.filter(item => item.isMatched);
  const unmatchedItems = extractedItems.filter(item => !item.isMatched);
  const selectedCount = Object.values(selectedItems).filter(Boolean).length;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Items Match Importer
          </DialogTitle>
          <DialogDescription>
            Upload an image of a quote/estimate to extract and match items with your catalog
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Upload Section */}
          {!uploadedFile && (
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
              <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <p className="text-sm text-slate-600 mb-4">
                Upload a quote or estimate image (PNG, JPG, PDF)
              </p>
              <Input
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileUpload}
                className="max-w-xs mx-auto"
              />
            </div>
          )}

          {/* Analyzing */}
          {isAnalyzing && (
            <div className="text-center py-8">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
              <p className="text-sm text-slate-600">Analyzing image and matching items...</p>
            </div>
          )}

          {/* Results */}
          {!isAnalyzing && extractedItems.length > 0 && (
            <>
              {/* Summary */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-4">
                  <Badge className="bg-green-100 text-green-700">
                    {matchedItems.length} Matched
                  </Badge>
                  <Badge className="bg-amber-100 text-amber-700">
                    {unmatchedItems.length} Unmatched
                  </Badge>
                  <Badge className="bg-blue-100 text-blue-700">
                    {selectedCount} Selected
                  </Badge>
                </div>
                <Button
                  onClick={handleAddToQuote}
                  disabled={selectedCount === 0}
                  className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white"
                >
                  Add {selectedCount} Items to Quote
                </Button>
              </div>

              {/* Matched Items */}
              {matchedItems.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    Matched Items ({matchedItems.length})
                  </h3>
                  {matchedItems.map((item, originalIndex) => {
                    const index = extractedItems.indexOf(item);
                    return (
                      <div key={index} className="border border-green-200 rounded-lg p-4 bg-green-50/30">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={selectedItems[index]}
                            onCheckedChange={(checked) =>
                              setSelectedItems(prev => ({ ...prev, [index]: checked }))
                            }
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-slate-900">{item.description}</span>
                              <Badge className="bg-green-100 text-green-700 text-xs">
                                ${item.catalogItem?.unit_price || 0} / {item.catalogItem?.uom}
                              </Badge>
                            </div>
                            <div className="text-sm text-slate-600">
                              Qty: {item.quantity} {item.unit} → Catalog: {item.catalogItem?.name}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Unmatched Items */}
              {unmatchedItems.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-amber-600" />
                    Unmatched Items ({unmatchedItems.length})
                  </h3>
                  {unmatchedItems.map((item, originalIndex) => {
                    const index = extractedItems.indexOf(item);
                    return (
                      <div key={index} className="border border-amber-200 rounded-lg p-4 bg-amber-50/30">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={selectedItems[index]}
                            onCheckedChange={(checked) =>
                              setSelectedItems(prev => ({ ...prev, [index]: checked }))
                            }
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-slate-900">{item.description}</span>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleAddToCatalog(item, index)}
                                className="text-xs"
                              >
                                <Plus className="w-3 h-3 mr-1" />
                                Add to Catalog
                              </Button>
                            </div>
                            <div className="text-sm text-slate-600">
                              Qty: {item.quantity} {item.unit} • Price: $0.00 (add to catalog to set price)
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Upload New Image */}
              <Button
                variant="outline"
                onClick={() => {
                  setUploadedFile(null);
                  setExtractedItems([]);
                  setSelectedItems({});
                }}
                className="w-full"
              >
                Upload Different Image
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}