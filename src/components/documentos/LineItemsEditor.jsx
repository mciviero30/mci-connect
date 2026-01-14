import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, ChevronUp, ChevronDown, ChevronsUpDown, Check, Info, Plus, Package, Clock, DollarSign, Grid3x3, Layers, Zap } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { calculateLineItemQuantity } from "@/components/domain/calculations/quantityCalculations";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { getDerivedQuantity } from "@/components/domain/quotes/computeQuoteDerived";

/**
 * ============================================================================
 * CAPA 4 & 8 - LINE ITEMS EDITOR (NO DERIVED CALCULATIONS)
 * ============================================================================
 * 
 * ⚠️ WARNING: This component does NOT calculate derived quantities.
 * It receives derivedValues from parent and uses getDerivedQuantity helper.
 * 
 * DO NOT add calculation logic here.
 * DO NOT manually set quantities for auto-calculated items.
 * 
 * Features:
 * - Catalog selection (if catalogItems provided)
 * - Manual editing (item_name + description)
 * - Travel items support (read-only if is_travel_item)
 * - Auto-calculated items display (hotel, per diem) - READ-ONLY
 * 
 * @param {Array} items - Current items array
 * @param {Function} onItemsChange - Callback when items change: (newItems) => void
 * @param {Array} catalogItems - Catalog items to select from (optional)
 * @param {boolean} allowCatalogSelect - Show catalog selector (default: true)
 * @param {boolean} allowReorder - Show up/down arrows (default: true)
 * @param {Function} onToast - Toast notification function (optional)
 * @param {Object} derivedValues - Derived values from computeQuoteDerived (CAPA 3)
 * @param {Function} onAddItem - Callback to add new item (optional)
 * @param {boolean} pricesLocked - Lock prices (read-only for unit_price)
 */
export default function LineItemsEditor({
  items = [],
  onItemsChange,
  catalogItems = [],
  allowCatalogSelect = true,
  allowReorder = true,
  onToast,
  derivedValues, // CAPA 3 - Receive derived values from parent
  onAddItem, // NEW: Callback to add item
  pricesLocked = false // NEW: Lock prices
}) {
  
  // Helper: Get catalog item name (supports both QuoteItem.name and ItemCatalog.item_name)
  const getCatalogName = (ci) => String(ci?.name || ci?.item_name || '').trim();

  // ============================================================================
  // CAPA 8 - ANTI FUTURO DEV WARNING
  // ============================================================================
  // Helper: Check if item is auto-calculated
  const isAutoCalculatedItem = (item) => {
    return item.auto_calculated === true && !item.manual_override;
  };
  
  const updateItem = (index, field, value) => {
    // Guard: Never allow clearing item_name
    if (field === 'item_name' && (value === null || value === undefined)) return;
    
    const newItems = [...items];
    const itemBefore = { ...newItems[index] };
    
    // ⚠️ WARNING (CAPA 8): If editing quantity on auto-calculated item, enable manual override
    // This breaks automatic synchronization - user is taking control
    if (field === 'quantity' && isAutoCalculatedItem(newItems[index]) && !newItems[index].manual_override) {
      newItems[index].manual_override = true;
      
      if (onToast) {
        onToast({
          title: '⚠️ Manual Override Enabled',
          description: 'This value will no longer update automatically with project changes.',
          variant: 'warning'
        });
      }
    }
    
    newItems[index][field] = value;
    
    // Auto-calculate quantity for special items
    if (field === 'tech_count' || field === 'duration_value' || field === 'calculation_type') {
      newItems[index].quantity = calculateLineItemQuantity(newItems[index]);
      newItems[index].total = (newItems[index].quantity || 0) * (newItems[index].unit_price || 0);
    }
    
    if (field === 'quantity' || field === 'unit_price' || field === 'round_trips') {
      const qty = newItems[index].quantity || 0;
      const trips = newItems[index].round_trips || 1;
      const price = newItems[index].unit_price || 0;
      
      // Apply round trips multiplier for travel items
      const finalQty = newItems[index].is_travel_item ? qty * trips : qty;
      newItems[index].total = finalQty * price;
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
          newItems[index].quantity = calculateLineItemQuantity(newItems[index]);
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
    if (items.length === 1) return;
    
    const newItems = items.filter((_, i) => i !== index);
    onItemsChange(newItems);
  };

  const moveItem = (index, direction) => {
    const newItems = [...items];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    // Check boundaries
    if (targetIndex < 0 || targetIndex >= newItems.length) return;
    
    // Swap items
    [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
    
    onItemsChange(newItems);
  };

  return (
    <>
      {/* Table Header - Dynamic based on travel items */}
      {items.some(i => i.is_travel_item) ? (
        <div className="hidden md:grid md:grid-cols-[1fr,0.6fr,0.6fr,0.4fr,0.6fr,0.5fr,0.8fr,0.4fr] gap-2 px-3 py-2 bg-gradient-to-r from-slate-50 to-slate-100 border-b-2 border-slate-200 text-[10px] font-bold text-slate-600 uppercase tracking-wide">
          <div>ITEM DETAILS</div>
          <div className="text-center">TRIPS</div>
          <div className="text-center">QTY</div>
          <div className="text-center">UNIT</div>
          <div className="text-center">RATE</div>
          <div className="text-center">HOURS</div>
          <div className="text-right">AMOUNT</div>
          <div></div>
        </div>
      ) : (
        <div className="hidden md:grid md:grid-cols-[1fr,0.8fr,0.5fr,0.7fr,0.5fr,0.9fr,0.4fr] gap-2 px-3 py-2 bg-gradient-to-r from-slate-50 to-slate-100 border-b-2 border-slate-200 text-[10px] font-bold text-slate-600 uppercase tracking-wide">
          <div>ITEM DETAILS</div>
          <div className="text-center">QUANTITY</div>
          <div className="text-center">UNIT</div>
          <div className="text-center">RATE</div>
          <div className="text-center">HOURS</div>
          <div className="text-right">AMOUNT</div>
          <div></div>
        </div>
      )}

      {items.map((item, index) => {
        // ============================================================================
        // CAPA 4 - USE DERIVED VALUES (NO RECALCULATION)
        // ============================================================================
        const isAutoCalc = isAutoCalculatedItem(item);
        const baseQuantity = isAutoCalc && !item.manual_override && derivedValues
          ? getDerivedQuantity(derivedValues, item.calculation_type)
          : item.quantity;
        
        // Apply round trips multiplier for travel items
        const roundTrips = item.round_trips || 1;
        const displayQuantity = item.is_travel_item ? baseQuantity * roundTrips : baseQuantity;
        const displayTotal = displayQuantity * (item.unit_price || 0);
        
        return (
        <div 
          key={index} 
          className={`border-b border-slate-200 ${item.is_travel_item ? 'bg-blue-50/30' : 'bg-white'} relative`}
        >
          {/* CAPA 6 - Auto-calculated badge (VISUAL INDICATOR) */}
          {isAutoCalc && (
            <div className="absolute top-2 left-2 z-10 flex gap-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge className="bg-blue-100 text-blue-700 border border-blue-300 text-[9px] px-2 py-0.5 cursor-help">
                      {item.calculation_type === 'hotel' && '🏨 🔒 Auto'}
                      {item.calculation_type === 'per_diem' && '🍽️ 🔒 Auto'}
                      {item.calculation_type === 'hours' && '⏱️ 🔒 Auto'}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent className="bg-slate-900 text-white text-xs max-w-xs">
                    <p>
                      🔒 <strong>Auto-calculated value.</strong>
                    </p>
                    <p className="mt-1">
                      This quantity is automatically synchronized with project changes to prevent estimation errors.
                    </p>
                    <p className="mt-1 text-amber-400">
                      Click the quantity field to enable manual override (not recommended).
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              {item.manual_override && (
                <Badge className="bg-amber-100 text-amber-700 border border-amber-300 text-[9px] px-2 py-0.5">
                  ⚠️ Manual Override
                </Badge>
              )}
            </div>
          )}
          {/* Row 1: Select Item and aligned fields */}
          <div className={`grid ${item.is_travel_item ? 'md:grid-cols-[1fr,0.6fr,0.6fr,0.4fr,0.6fr,0.5fr,0.8fr,0.4fr]' : 'md:grid-cols-[1fr,0.8fr,0.5fr,0.7fr,0.5fr,0.9fr,0.4fr]'} gap-2 px-3 pt-8 pb-1 hover:bg-slate-50/50 transition-colors`}>
            {/* Select Item / Item Name */}
            <div>
              {allowCatalogSelect && catalogItems.length > 0 ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between h-9 font-semibold text-xs bg-white border-slate-300 text-slate-900 hover:bg-slate-50"
                    >
                      <span className="truncate">{item.item_name || "Select item"}</span>
                      <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-70" />
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
                  className="h-9 font-semibold text-xs bg-white border-slate-300 text-slate-900"
                />
              )}
            </div>

            {/* Round Trips (only for travel items) */}
            {item.is_travel_item && (
              <div className="flex items-center justify-center">
                <Input
                  type="number"
                  value={item.round_trips || 1}
                  onChange={(e) => updateItem(index, 'round_trips', parseFloat(e.target.value) || 1)}
                  min="1"
                  step="1"
                  className="h-9 text-sm text-center font-semibold bg-white border-slate-200 text-slate-900"
                />
              </div>
            )}

            {/* Quantity */}
             <div className="flex items-center justify-center gap-1">
               <Grid3x3 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
               <Input
                 type="number"
                 value={baseQuantity}
                 onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                 min="0"
                 step="0.01"
                 required
                 disabled={isAutoCalc && !item.manual_override}
                 className={`h-9 text-sm text-center font-semibold flex-1 ${
                   isAutoCalc && !item.manual_override
                     ? 'bg-blue-50 border-blue-200 text-blue-900 cursor-not-allowed'
                     : 'bg-white border-slate-200 text-slate-900'
                 }`}
               />
             </div>

            {/* Unit */}
            <div className="flex items-center justify-center">
              <Input
                value={item.unit}
                onChange={(e) => updateItem(index, 'unit', e.target.value)}
                className="h-9 text-xs text-center bg-white border-slate-200 text-slate-900"
              />
            </div>

            {/* Rate */}
             <div className="flex items-center justify-center gap-1">
               <DollarSign className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
               <Input
                 type="number"
                 value={item.unit_price}
                 onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                 min="0"
                 step="0.01"
                 required
                 disabled={pricesLocked}
                 className={`h-9 text-sm text-center font-semibold flex-1 ${
                   pricesLocked
                     ? 'bg-amber-50 border-amber-200 text-amber-900 cursor-not-allowed'
                     : 'bg-white border-slate-200 text-slate-900'
                 }`}
               />
             </div>

            {/* Hours (MCI Internal Only) */}
             <div className="flex items-center justify-center gap-1">
               <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
               <Input
                 type="number"
                 value={item.installation_time || 0}
                 onChange={(e) => updateItem(index, 'installation_time', parseFloat(e.target.value) || 0)}
                 min="0"
                 step="0.1"
                 className="h-9 text-sm text-center bg-slate-50 border-slate-200 text-slate-700 flex-1"
                 placeholder="0"
               />
             </div>

            {/* Amount */}
             <div className="flex items-center justify-end gap-1">
               <DollarSign className="w-4 h-4 text-slate-600 flex-shrink-0" />
               <div className="text-right space-y-0.5">
                 <div className="text-slate-900 font-bold text-base">
                   {displayTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                 </div>
                {(isAutoCalc || (item.is_travel_item && roundTrips > 1)) && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="text-[9px] text-blue-600 font-medium flex items-center gap-1 justify-end cursor-help">
                          <Info className="w-2.5 h-2.5" />
                          = {displayQuantity} {item.unit}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="bg-slate-900 text-white text-xs max-w-xs">
                        {isAutoCalc ? (
                          <>
                            <p>
                              🔒 <strong>Derived Value</strong>
                            </p>
                            {item.calculation_type === 'hotel' && (
                              <p className="mt-1">Hotel rooms = roomsPerNight × nights</p>
                            )}
                            {item.calculation_type === 'per_diem' && (
                              <p className="mt-1">Per diem = techs × totalCalendarDays</p>
                            )}
                            {item.manual_override && (
                              <p className="text-amber-400 mt-1">⚠️ Manual override active - auto-sync disabled</p>
                            )}
                          </>
                        ) : (
                          <p>
                            <strong>Round trips calculation:</strong><br />
                            {baseQuantity} {item.unit} × {roundTrips} trips = {displayQuantity} {item.unit}
                          </p>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-0.5 items-center">
              {allowReorder && index > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => moveItem(index, 'up')}
                  className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 h-7 w-7"
                >
                  <ChevronUp className="w-3 h-3" />
                </Button>
              )}
              {allowReorder && index < items.length - 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => moveItem(index, 'down')}
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
              required
              placeholder="Description"
              className="min-h-[60px] text-xs text-slate-600 resize-none bg-white border-slate-200"
            />
          </div>
        </div>
        );
        })}

        {/* Add Item Button - After Last Item */}
        {onAddItem && (
        <div className="border-t border-slate-200 bg-slate-50/30 p-4">
        <Button
          type="button"
          onClick={onAddItem}
          variant="outline"
          className="w-full border-2 border-dashed border-slate-300 text-slate-600 hover:border-[#507DB4] hover:text-[#507DB4] hover:bg-blue-50/30 transition-all"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Another Item
        </Button>
        </div>
        )}
        </>
        );
        }