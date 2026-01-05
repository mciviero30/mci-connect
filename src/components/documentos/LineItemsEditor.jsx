import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, ChevronUp, ChevronDown, ChevronsUpDown, Check } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { calculateQuantity } from "@/components/utils/quantityCalculations";

/**
 * Unified Line Items Editor
 * 
 * Single source of truth for editing line items in Quotes and Invoices.
 * Follows EXACTLY the UI/UX from CrearEstimado.
 * 
 * Features:
 * - Catalog selection (if catalogItems provided)
 * - Manual editing (item_name + description)
 * - Travel items support (read-only if is_travel_item)
 * - Auto-calculation for special calculation_type items
 * 
 * @param {Array} items - Current items array
 * @param {Function} onItemsChange - Callback when items change: (newItems) => void
 * @param {Array} catalogItems - Catalog items to select from (optional)
 * @param {boolean} allowCatalogSelect - Show catalog selector (default: true)
 * @param {boolean} allowReorder - Show up/down arrows (default: true)
 * @param {Function} onToast - Toast notification function (optional)
 */
export default function LineItemsEditor({
  items = [],
  onItemsChange,
  catalogItems = [],
  allowCatalogSelect = true,
  allowReorder = true,
  onToast
}) {
  
  // Helper: Get catalog item name (supports both QuoteItem.name and ItemCatalog.item_name)
  const getCatalogName = (ci) => String(ci?.name || ci?.item_name || '').trim();
  
  const updateItem = (index, field, value) => {
    // Guard: Never allow clearing item_name
    if (field === 'item_name' && (value === null || value === undefined)) return;
    
    const newItems = [...items];
    const itemBefore = { ...newItems[index] };
    newItems[index][field] = value;
    
    // Auto-calculate quantity for special items
    if (field === 'tech_count' || field === 'duration_value' || field === 'calculation_type') {
      newItems[index].quantity = calculateQuantity(newItems[index]);
      newItems[index].total = (newItems[index].quantity || 0) * (newItems[index].unit_price || 0);
    }
    
    if (field === 'quantity' || field === 'unit_price') {
      newItems[index].total = (newItems[index].quantity || 0) * (newItems[index].unit_price || 0);
    }
    
    // If selecting from catalog
    if (field === 'item_name' && catalogItems.length > 0) {
      const v = String(value || '').trim();
      const selectedItem = catalogItems.find(ci => getCatalogName(ci) === v);
      if (selectedItem) {
        const itemName = getCatalogName(selectedItem);
        newItems[index].item_name = itemName;
        newItems[index].description = selectedItem.description || '';
        newItems[index].unit = selectedItem.unit || selectedItem.uom || 'pcs';
        newItems[index].unit_price = selectedItem.unit_price || 0;
        newItems[index].installation_time = selectedItem.installation_time || 0;
        newItems[index].calculation_type = selectedItem.calculation_type || 'none';
        
        if (selectedItem.calculation_type && selectedItem.calculation_type !== 'none') {
          newItems[index].tech_count = 1;
          newItems[index].duration_value = 1;
          newItems[index].quantity = calculateQuantity(newItems[index]);
        }
        
        newItems[index].total = (newItems[index].quantity || 0) * (selectedItem.unit_price || 0);
        
        if (onToast) {
          onToast({
            title: `Item "${itemName}" loaded`,
            description: `Unit price: $${selectedItem.unit_price}${selectedItem.installation_time ? ` • Time: ${selectedItem.installation_time}h` : ''}`,
            variant: 'success',
          });
        }
      }
    }
    
    onItemsChange(newItems);
  };

  const removeItem = (index) => {
    // Prevent removing travel items (if is_travel_item exists)
    if (items[index]?.is_travel_item) {
      if (onToast) {
        onToast({
          title: 'Cannot remove',
          description: 'Disable "Out-of-Area Job" to remove travel items',
          variant: 'destructive'
        });
      }
      return;
    }
    
    if (items.length === 1) return;
    
    const newItems = items.filter((_, i) => i !== index);
    onItemsChange(newItems);
  };

  const moveItem = (index, direction) => {
    const newItems = [...items];
    const item = newItems[index];
    
    // Can't move travel items or move into travel items section
    if (item.is_travel_item) return;
    
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    // Check boundaries and don't move into travel items
    if (targetIndex < 0 || targetIndex >= newItems.length) return;
    if (newItems[targetIndex].is_travel_item) return;
    
    // Swap items
    [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
    
    onItemsChange(newItems);
  };

  return (
    <>
      {/* Table Header */}
      <div className="hidden md:grid md:grid-cols-[1fr,0.8fr,0.5fr,0.7fr,0.9fr,0.4fr] gap-2 px-3 py-2 bg-gradient-to-r from-slate-50 to-slate-100 border-b-2 border-slate-200 text-[10px] font-bold text-slate-600 uppercase tracking-wide">
        <div>ITEM DETAILS</div>
        <div className="text-center">QUANTITY</div>
        <div className="text-center">UNIT</div>
        <div className="text-center">RATE</div>
        <div className="text-right">AMOUNT</div>
        <div></div>
      </div>

      {items.map((item, index) => (
        <div 
          key={index} 
          className={`border-b border-slate-200 ${item.is_travel_item ? 'bg-blue-50/30' : 'bg-white'}`}
        >
          {/* Row 1: Select Item and aligned fields */}
          <div className="grid md:grid-cols-[1fr,0.8fr,0.5fr,0.7fr,0.9fr,0.4fr] gap-2 px-3 pt-3 pb-1 hover:bg-slate-50/50 transition-colors">
            {/* Select Item / Item Name */}
            <div>
              {allowCatalogSelect && catalogItems.length > 0 ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      disabled={item.is_travel_item}
                      className={`w-full justify-between h-9 font-semibold text-xs ${
                        item.is_travel_item 
                          ? 'bg-blue-100 border-blue-200 text-blue-900 cursor-not-allowed' 
                          : 'bg-white border-slate-300 text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <span className="truncate">{item.item_name || "Select item"}</span>
                      {!item.is_travel_item && <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-70" />}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[350px] p-0 bg-white border shadow-xl">
                    <Command className="bg-white">
                      <CommandInput placeholder="Search items..." className="text-slate-900" />
                      <CommandEmpty className="text-slate-500 p-4 text-xs">No items found</CommandEmpty>
                      <CommandGroup className="max-h-[300px] overflow-y-auto">
                        {[...catalogItems]
                          .sort((a, b) => getCatalogName(a).localeCompare(getCatalogName(b)))
                          .map((ci, idx) => {
                            const itemName = getCatalogName(ci);
                            return (
                              <CommandItem
                                key={ci.id || itemName || idx}
                                value={itemName}
                                onSelect={() => updateItem(index, 'item_name', itemName)}
                                className="text-slate-900 cursor-pointer hover:bg-slate-100 py-2 border-b border-slate-100"
                              >
                                <Check className={`mr-2 h-4 w-4 text-blue-600 ${item.item_name === itemName ? 'opacity-100' : 'opacity-0'}`} />
                                <div className="flex-1">
                                  <div className="font-semibold text-xs">{itemName}</div>
                                  <div className="text-[10px] text-slate-500 truncate">{ci.description}</div>
                                  <div className="text-[10px] text-blue-600 font-bold">${ci.unit_price} / {ci.unit || ci.uom}</div>
                                </div>
                              </CommandItem>
                            );
                          })}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              ) : (
                <Input
                  value={item.item_name || ''}
                  onChange={(e) => updateItem(index, 'item_name', e.target.value)}
                  placeholder="Item name"
                  disabled={item.is_travel_item}
                  className={`h-9 font-semibold text-xs ${
                    item.is_travel_item 
                      ? 'bg-blue-100 border-blue-200 text-blue-900 cursor-not-allowed' 
                      : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              )}
            </div>

            {/* Quantity */}
            <div className="flex items-center justify-center">
              <Input
                type="number"
                value={item.quantity}
                onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                min="0"
                step="0.01"
                required
                disabled={item.is_travel_item || (item.calculation_type && item.calculation_type !== 'none')}
                className={`h-9 text-sm text-center font-semibold ${
                  item.is_travel_item || (item.calculation_type && item.calculation_type !== 'none')
                    ? 'bg-slate-50 border-slate-200 text-slate-500 cursor-not-allowed'
                    : 'bg-white border-slate-200 text-slate-900'
                }`}
              />
            </div>

            {/* Unit */}
            <div className="flex items-center justify-center">
              <Input
                value={item.unit}
                onChange={(e) => updateItem(index, 'unit', e.target.value)}
                disabled={item.is_travel_item}
                className={`h-9 text-xs text-center ${
                  item.is_travel_item 
                    ? 'bg-slate-50 border-slate-200 text-slate-500 cursor-not-allowed' 
                    : 'bg-white border-slate-200 text-slate-900'
                }`}
              />
            </div>

            {/* Rate */}
            <div className="flex items-center justify-center">
              <Input
                type="number"
                value={item.unit_price}
                onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                min="0"
                step="0.01"
                required
                disabled={item.is_travel_item}
                className={`h-9 text-sm text-center font-semibold ${
                  item.is_travel_item
                    ? 'bg-slate-50 border-slate-200 text-slate-500 cursor-not-allowed'
                    : 'bg-white border-slate-200 text-slate-900'
                }`}
              />
            </div>

            {/* Amount */}
            <div className="flex items-center justify-end">
              <div className="text-right space-y-0.5">
                <div className="text-slate-900 font-bold text-base">
                  ${item.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                {item.calculation_type !== 'none' && (
                  <div className="text-[9px] text-blue-600 font-medium">
                    = {item.quantity} {item.unit}
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-0.5 items-center">
              {allowReorder && !item.is_travel_item && index > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => moveItem(index, 'up')}
                  disabled={items[index - 1]?.is_travel_item}
                  className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 h-7 w-7"
                >
                  <ChevronUp className="w-3 h-3" />
                </Button>
              )}
              {allowReorder && !item.is_travel_item && index < items.length - 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => moveItem(index, 'down')}
                  disabled={items[index + 1]?.is_travel_item}
                  className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 h-7 w-7"
                >
                  <ChevronDown className="w-3 h-3" />
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeItem(index)}
                disabled={items.length === 1}
                className="text-red-400 hover:text-red-700 hover:bg-red-50 h-7 w-7"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>

          {/* Row 2: Description spanning full width */}
          <div className="px-3 pb-3">
            <Textarea
              value={item.description}
              onChange={(e) => updateItem(index, 'description', e.target.value)}
              required={!item.is_travel_item}
              disabled={item.is_travel_item}
              placeholder="Description"
              className={`min-h-[60px] text-xs text-slate-600 resize-none ${
                item.is_travel_item 
                  ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed' 
                  : 'bg-white border-slate-200'
              }`}
            />
          </div>
        </div>
      ))}
    </>
  );
}