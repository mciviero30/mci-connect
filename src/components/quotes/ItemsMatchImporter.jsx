import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Upload, Loader2, Check, X, Plus, FileText, AlertCircle, Link as LinkIcon } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";

export default function ItemsMatchImporter({ isOpen, onClose, onAddItems }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [file, setFile] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [extractedItems, setExtractedItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState(new Set());

  // Fetch catalog
  const { data: catalogItems = [] } = useQuery({
    queryKey: ['itemCatalog'],
    queryFn: () => base44.entities.ItemCatalog.list('-created_date', 300),
    enabled: isOpen,
  });

  // Create catalog item mutation
  const createCatalogMutation = useMutation({
    mutationFn: (itemData) => base44.entities.ItemCatalog.create(itemData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['itemCatalog'] });
    },
  });

  // Update catalog item mutation (for adding alternate names)
  const updateCatalogMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ItemCatalog.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['itemCatalog'] });
    },
  });

  // Upload file and extract items
  const handleFileUpload = async (e) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setAnalyzing(true);
    setExtractedItems([]);
    setSelectedItems(new Set());

    try {
      // Step 1: Upload file
      const { file_url } = await base44.integrations.Core.UploadFile({ file: uploadedFile });

      // Step 2: Extract items with AI
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze this quote/estimate image and extract ALL line items.

For each item, provide:
- item_name: Short product/service name (e.g., "Vinyl Flooring", "Labor - Installation")
- description: Detailed description
- quantity: Numeric quantity
- unit: Unit of measure (e.g., sqft, hour, unit, lnft, each)
- unit_price: Price per unit (numeric, no $ symbol)

Return ONLY a JSON array of items:
[
  {
    "item_name": "...",
    "description": "...",
    "quantity": 0,
    "unit": "...",
    "unit_price": 0
  }
]`,
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: {
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  item_name: { type: "string" },
                  description: { type: "string" },
                  quantity: { type: "number" },
                  unit: { type: "string" },
                  unit_price: { type: "number" }
                },
                required: ["item_name", "description", "quantity", "unit", "unit_price"]
              }
            }
          },
          required: ["items"]
        }
      });

      const items = response?.items || [];
      
      if (items.length === 0) {
        toast({
          title: 'No items found',
          description: 'Could not extract any items from the image',
          variant: 'destructive'
        });
        setAnalyzing(false);
        return;
      }

      // Step 3: Match against catalog
      const matchedItems = items.map(extracted => {
        const match = findBestMatch(extracted.item_name, catalogItems);
        if (match) {
          // Auto-select matched items
          setSelectedItems(prev => new Set([...prev, extracted.item_name]));
        }
        return {
          ...extracted,
          catalog_match: match,
          is_matched: !!match
        };
      });

      setExtractedItems(matchedItems);
      toast({
        title: `✓ ${items.length} items extracted`,
        description: `${matchedItems.filter(i => i.is_matched).length} matched with catalog`,
        variant: 'success'
      });
    } catch (error) {
      console.error('Error analyzing image:', error);
      toast({
        title: 'Error',
        description: 'Failed to analyze image. Please try again.',
        variant: 'destructive'
      });
    }

    setAnalyzing(false);
  };

  // Find best matching catalog item (includes alternate_names)
  const findBestMatch = (extractedName, catalog) => {
    const nameLower = extractedName.toLowerCase().trim();
    
    // Exact match on name
    const exact = catalog.find(ci => ci.name?.toLowerCase().trim() === nameLower);
    if (exact) return exact;
    
    // Exact match on alternate_names
    const exactAlias = catalog.find(ci => {
      const aliases = ci.alternate_names || [];
      return aliases.some(alias => alias.toLowerCase().trim() === nameLower);
    });
    if (exactAlias) return exactAlias;
    
    // Partial match on name
    const partial = catalog.find(ci => {
      const catName = ci.name?.toLowerCase().trim() || '';
      return nameLower.includes(catName) || catName.includes(nameLower);
    });
    if (partial) return partial;
    
    // Partial match on alternate_names
    const partialAlias = catalog.find(ci => {
      const aliases = ci.alternate_names || [];
      return aliases.some(alias => {
        const aliasLower = alias.toLowerCase().trim();
        return nameLower.includes(aliasLower) || aliasLower.includes(nameLower);
      });
    });
    
    return partialAlias || null;
  };

  // Add unmatched item to catalog
  const handleAddToCatalog = async (item) => {
    try {
      const newItem = await createCatalogMutation.mutateAsync({
        name: item.item_name,
        description: item.description,
        unit_price: item.unit_price,
        uom: item.unit,
        category: 'materials',
        active: true
      });

      // Update extracted items to show match
      setExtractedItems(prev => prev.map(i => 
        i.item_name === item.item_name 
          ? { ...i, catalog_match: newItem, is_matched: true }
          : i
      ));

      toast({
        title: 'Added to catalog',
        description: `"${item.item_name}" is now in your catalog`,
        variant: 'success'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add item to catalog',
        variant: 'destructive'
      });
    }
  };

  // Match unmatched item with existing catalog item
  const handleMatchWithCatalog = async (extractedItem, catalogItem) => {
    try {
      // Add extracted name as alternate name (alias)
      const existingAlternates = catalogItem.alternate_names || [];
      const extractedNameTrimmed = extractedItem.item_name.trim();
      
      // Don't add if already exists
      if (existingAlternates.includes(extractedNameTrimmed) || 
          catalogItem.name === extractedNameTrimmed) {
        // Just update UI
        setExtractedItems(prev => prev.map(i => 
          i.item_name === extractedItem.item_name 
            ? { ...i, catalog_match: catalogItem, is_matched: true }
            : i
        ));
        return;
      }

      // Update catalog item with new alternate name
      await updateCatalogMutation.mutateAsync({
        id: catalogItem.id,
        data: {
          alternate_names: [...existingAlternates, extractedNameTrimmed]
        }
      });

      // Update extracted items to show match
      setExtractedItems(prev => prev.map(i => 
        i.item_name === extractedItem.item_name 
          ? { ...i, catalog_match: catalogItem, is_matched: true }
          : i
      ));

      toast({
        title: 'Matched successfully',
        description: `"${extractedItem.item_name}" will now match with "${catalogItem.name}"`,
        variant: 'success'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to match with catalog',
        variant: 'destructive'
      });
    }
  };

  // Toggle item selection
  const toggleSelection = (itemName) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemName)) {
        newSet.delete(itemName);
      } else {
        newSet.add(itemName);
      }
      return newSet;
    });
  };

  // Add selected items to quote
  const handleAddToQuote = () => {
    const itemsToAdd = extractedItems
      .filter(item => selectedItems.has(item.item_name))
      .map(item => ({
        item_name: item.catalog_match?.name || item.item_name,
        description: item.catalog_match?.description || item.description,
        quantity: item.quantity,
        unit: item.catalog_match?.uom || item.unit,
        unit_price: item.catalog_match?.unit_price || item.unit_price,
        total: item.quantity * (item.catalog_match?.unit_price || item.unit_price),
        installation_time: item.catalog_match?.installation_time || 0
      }));

    onAddItems(itemsToAdd);
    
    toast({
      title: `${itemsToAdd.length} items added`,
      variant: 'success'
    });

    // Reset and close
    setFile(null);
    setExtractedItems([]);
    setSelectedItems(new Set());
    onClose();
  };

  const matchedCount = extractedItems.filter(i => i.is_matched).length;
  const unmatchedCount = extractedItems.filter(i => !i.is_matched).length;
  const selectedCount = selectedItems.size;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Items Match - Import from Image
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Upload Section */}
          {!file && (
            <Card className="border-2 border-dashed border-slate-300 p-8 text-center">
              <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">Upload Quote/Estimate Image</h3>
              <p className="text-sm text-slate-600 mb-4">
                Take a photo or upload an image of a competitor's quote
              </p>
              <Input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="max-w-xs mx-auto"
              />
            </Card>
          )}

          {/* Analyzing */}
          {analyzing && (
            <Card className="p-8 text-center">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">Analyzing image...</h3>
              <p className="text-sm text-slate-600">
                AI is extracting line items and matching them with your catalog
              </p>
            </Card>
          )}

          {/* Results */}
          {!analyzing && extractedItems.length > 0 && (
            <>
              {/* Summary */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-4">
                  <Badge className="bg-green-100 text-green-700">
                    <Check className="w-3 h-3 mr-1" />
                    {matchedCount} Matched
                  </Badge>
                  <Badge className="bg-amber-100 text-amber-700">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {unmatchedCount} Unmatched
                  </Badge>
                  <Badge className="bg-blue-100 text-blue-700">
                    {selectedCount} Selected
                  </Badge>
                </div>
                <Button
                  onClick={() => {
                    setFile(null);
                    setExtractedItems([]);
                    setSelectedItems(new Set());
                  }}
                  variant="outline"
                  size="sm"
                >
                  Upload Different Image
                </Button>
              </div>

              {/* Matched Items */}
              {matchedCount > 0 && (
                <div>
                  <h3 className="font-semibold mb-2 text-green-700 flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    Matched Items ({matchedCount})
                  </h3>
                  <div className="space-y-2">
                    {extractedItems
                      .filter(item => item.is_matched)
                      .map((item, idx) => (
                        <Card key={idx} className="p-3 border-green-200 bg-green-50/30">
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={selectedItems.has(item.item_name)}
                              onCheckedChange={() => toggleSelection(item.item_name)}
                            />
                            <div className="flex-1">
                              <div className="font-semibold text-sm">{item.item_name}</div>
                              <div className="text-xs text-slate-600">{item.description}</div>
                              <div className="flex items-center gap-4 mt-1 text-xs">
                                <span className="text-slate-500">
                                  Qty: {item.quantity} {item.unit}
                                </span>
                                <span className="font-semibold text-green-700">
                                  ${item.catalog_match.unit_price} / {item.catalog_match.uom}
                                </span>
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))}
                  </div>
                </div>
              )}

              {/* Unmatched Items */}
              {unmatchedCount > 0 && (
                <div>
                  <h3 className="font-semibold mb-2 text-amber-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Unmatched Items ({unmatchedCount})
                  </h3>
                  <div className="space-y-2">
                    {extractedItems
                      .filter(item => !item.is_matched)
                      .map((item, idx) => (
                        <Card key={idx} className="p-3 border-amber-200 bg-amber-50/30">
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={selectedItems.has(item.item_name)}
                              onCheckedChange={() => toggleSelection(item.item_name)}
                            />
                            <div className="flex-1">
                              <div className="font-semibold text-sm">{item.item_name}</div>
                              <div className="text-xs text-slate-600">{item.description}</div>
                              <div className="flex items-center gap-4 mt-1 text-xs">
                                <span className="text-slate-500">
                                  Qty: {item.quantity} {item.unit}
                                </span>
                                <span className="font-semibold text-amber-700">
                                  ${item.unit_price} / {item.unit}
                                </span>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-green-600 border-green-300 hover:bg-green-50"
                                  >
                                    <LinkIcon className="w-3 h-3 mr-1" />
                                    Match with Catalog
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-80 p-0 bg-white" align="end">
                                  <Command>
                                    <CommandInput placeholder="Search catalog..." />
                                    <CommandEmpty>No items found</CommandEmpty>
                                    <CommandGroup className="max-h-60 overflow-y-auto">
                                      {catalogItems.map(catalogItem => (
                                        <CommandItem
                                          key={catalogItem.id}
                                          onSelect={() => handleMatchWithCatalog(item, catalogItem)}
                                          className="cursor-pointer"
                                        >
                                          <div className="flex-1">
                                            <div className="font-semibold text-xs">{catalogItem.name}</div>
                                            <div className="text-[10px] text-slate-500">{catalogItem.description}</div>
                                            <div className="text-[10px] text-blue-600 font-bold">
                                              ${catalogItem.unit_price} / {catalogItem.uom}
                                            </div>
                                          </div>
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </Command>
                                </PopoverContent>
                              </Popover>
                              
                              <Button
                                onClick={() => handleAddToCatalog(item)}
                                size="sm"
                                variant="outline"
                                className="text-blue-600 border-blue-300 hover:bg-blue-50"
                              >
                                <Plus className="w-3 h-3 mr-1" />
                                Add to Catalog
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button onClick={onClose} variant="outline">
                  Cancel
                </Button>
                <Button
                  onClick={handleAddToQuote}
                  disabled={selectedCount === 0}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add {selectedCount} Items to Quote
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}